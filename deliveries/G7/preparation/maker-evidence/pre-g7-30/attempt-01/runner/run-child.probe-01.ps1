param(
  [Parameter(Mandatory=$true)][string]$RequestPath
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$started = [DateTime]::UtcNow.ToString('o')
$runnerPid = $PID
$request = $null
$child = $null
$stdoutFile = $null
$stderrFile = $null
$stdoutTask = $null
$stderrTask = $null
$sampleList = New-Object 'System.Collections.Generic.List[object]'
$monitorErrors = New-Object 'System.Collections.Generic.List[string]'
$metadataCache = @{}
$childExitCode = $null
$runnerExitCode = 70
$childPid = $null
function Quote-WinArg([string]$Value) {
  $b = New-Object System.Text.StringBuilder
  [void]$b.Append('"')
  $slashes = 0
  foreach ($ch in $Value.ToCharArray()) {
    if ([int]$ch -eq 92) { $slashes++; continue }
    if ([int]$ch -eq 34) {
      if ($slashes -gt 0) { [void]$b.Append(('\' * (2 * $slashes + 1))) } else { [void]$b.Append('\') }
      [void]$b.Append('"')
      $slashes = 0
      continue
    }
    if ($slashes -gt 0) { [void]$b.Append(('\' * $slashes)); $slashes = 0 }
    [void]$b.Append($ch)
  }
  if ($slashes -gt 0) { [void]$b.Append(('\' * (2 * $slashes))) }
  [void]$b.Append('"')
  return $b.ToString()
}
function Get-TreeSnapshot([int]$RootPid) {
  $all = @(Get-CimInstance -ClassName Win32_Process -ErrorAction Stop)
  $known = @{ [string]$RootPid = $true }
  $selected = New-Object 'System.Collections.Generic.List[object]'
  $changed = $true
  while ($changed) {
    $changed = $false
    foreach ($item in $all) {
      if ($known.ContainsKey([string]$item.ParentProcessId) -and -not $known.ContainsKey([string]$item.ProcessId)) {
        $known[[string]$item.ProcessId] = $true
        $selected.Add($item)
        $changed = $true
      }
    }
  }
  foreach ($pidKey in @($known.Keys)) {
    $item = $all | Where-Object { [string]$_.ProcessId -eq $pidKey } | Select-Object -First 1
    if ($null -eq $item) { continue }
    $exe = [string]$item.ExecutablePath
    $sha = $null
    $version = $null
    if ($exe -and (Test-Path -LiteralPath $exe)) {
      $cacheKey = $exe.ToLowerInvariant()
      if (-not $metadataCache.ContainsKey($cacheKey)) {
        $fileHash = Get-FileHash -LiteralPath $exe -Algorithm SHA256 -ErrorAction Stop
        $fileVersion = [System.Diagnostics.FileVersionInfo]::GetVersionInfo($exe)
        $metadataCache[$cacheKey] = [ordered]@{ sha256=$fileHash.Hash.ToLowerInvariant(); fileVersion=$fileVersion.FileVersion; productVersion=$fileVersion.ProductVersion }
      }
      $sha = $metadataCache[$cacheKey].sha256
      $version = $metadataCache[$cacheKey].productVersion
    }
    [pscustomobject]@{
      processId = [int]$item.ProcessId
      parentProcessId = [int]$item.ParentProcessId
      executablePath = $exe
      executableSha256 = $sha
      fileVersion = if ($metadataCache.ContainsKey($exe.ToLowerInvariant())) { $metadataCache[$exe.ToLowerInvariant()].fileVersion } else { $null }
      productVersion = $version
      commandLine = [string]$item.CommandLine
    }
  }
}
function Write-Receipt([int]$Status, [string]$ErrorText) {
  if ($null -eq $request -or -not $request.receiptPath) { return }
  $finished = [DateTime]::UtcNow.ToString('o')
  $envNames = @()
  $envObj = $request.environment
  if ($null -ne $envObj) { $envNames = @($envObj.PSObject.Properties | ForEach-Object Name | Sort-Object -Unique) }
  $pathPrefix = $null
  if ($null -ne $envObj -and $envObj.PATH) { $pathPrefix = ([string]$envObj.PATH -split ';' | Select-Object -First 1) }
  $receipt = [ordered]@{
    schemaVersion = 1
    runId = [string]$request.runId
    requestPath = (Resolve-Path -LiteralPath $RequestPath).Path
    runnerScript = (Resolve-Path -LiteralPath $PSCommandPath).Path
    runnerPid = $runnerPid
    runnerStartedUtc = $started
    runnerFinishedUtc = $finished
    runnerExitCode = $Status
    child = [ordered]@{
      filePath = [string]$request.filePath
      arguments = @($request.arguments)
      workingDirectory = [string]$request.workingDirectory
      processId = $childPid
      startedUtc = $request.childStartedUtc
      exitedUtc = $request.childExitedUtc
      exitCode = $childExitCode
    }
    environmentVariableNames = $envNames
    pathPrefix = $pathPrefix
    processTreeMonitoring = [ordered]@{
      method = 'Win32_Process CIM descendant snapshots while System.Diagnostics.Process.HasExited is false; root Process object waited and ExitCode read after exit'
      sampleCount = $sampleList.Count
      samples = @($sampleList.ToArray())
      errors = @($monitorErrors.ToArray())
    }
    streams = [ordered]@{
      stdoutPath = [string]$request.stdoutPath
      stdoutBytes = if (Test-Path -LiteralPath $request.stdoutPath) { (Get-Item -LiteralPath $request.stdoutPath).Length } else { $null }
      stdoutSha256 = if (Test-Path -LiteralPath $request.stdoutPath) { (Get-FileHash -LiteralPath $request.stdoutPath -Algorithm SHA256).Hash.ToLowerInvariant() } else { $null }
      stderrPath = [string]$request.stderrPath
      stderrBytes = if (Test-Path -LiteralPath $request.stderrPath) { (Get-Item -LiteralPath $request.stderrPath).Length } else { $null }
      stderrSha256 = if (Test-Path -LiteralPath $request.stderrPath) { (Get-FileHash -LiteralPath $request.stderrPath -Algorithm SHA256).Hash.ToLowerInvariant() } else { $null }
    }
    error = $ErrorText
  }
  $json = ConvertTo-Json -InputObject $receipt -Depth 30
  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText([string]$request.receiptPath, $json + "`n", $utf8)
}
try {
  $request = Get-Content -LiteralPath $RequestPath -Raw | ConvertFrom-Json
  foreach ($required in @('runId','filePath','arguments','workingDirectory','stdoutPath','stderrPath','receiptPath')) {
    if (-not $request.PSObject.Properties[$required]) { throw "Missing request field: $required" }
  }
  if (-not (Test-Path -LiteralPath $request.filePath)) { throw "Child executable missing: $($request.filePath)" }
  if (-not (Test-Path -LiteralPath $request.workingDirectory -PathType Container)) { throw "Working directory missing: $($request.workingDirectory)" }
  foreach ($streamPath in @($request.stdoutPath,$request.stderrPath,$request.receiptPath)) {
    $parent = Split-Path -Parent $streamPath
    if ($parent) { New-Item -ItemType Directory -Force -Path $parent | Out-Null }
  }
  $startInfo = New-Object System.Diagnostics.ProcessStartInfo
  $startInfo.FileName = [string]$request.filePath
  $startInfo.Arguments = [string]::Join(' ', @($request.arguments | ForEach-Object { Quote-WinArg ([string]$_) }))
  $startInfo.WorkingDirectory = [string]$request.workingDirectory
  $startInfo.UseShellExecute = $false
  $startInfo.CreateNoWindow = $true
  $startInfo.RedirectStandardOutput = $true
  $startInfo.RedirectStandardError = $true
  if ($request.environment) {
    foreach ($entry in $request.environment.PSObject.Properties) { $startInfo.EnvironmentVariables[$entry.Name] = [string]$entry.Value }
  }
  $child = New-Object System.Diagnostics.Process
  $child.StartInfo = $startInfo
  if (-not $child.Start()) { throw 'System.Diagnostics.Process.Start returned false' }
  $childPid = [int]$child.Id
  $request | Add-Member -NotePropertyName childStartedUtc -NotePropertyValue ([DateTime]::UtcNow.ToString('o')) -Force
  $stdoutFile = [System.IO.File]::Open([string]$request.stdoutPath,[System.IO.FileMode]::Create,[System.IO.FileAccess]::Write,[System.IO.FileShare]::Read)
  $stderrFile = [System.IO.File]::Open([string]$request.stderrPath,[System.IO.FileMode]::Create,[System.IO.FileAccess]::Write,[System.IO.FileShare]::Read)
  $stdoutTask = $child.StandardOutput.BaseStream.CopyToAsync($stdoutFile)
  $stderrTask = $child.StandardError.BaseStream.CopyToAsync($stderrFile)
  while (-not $child.HasExited) {
    try {
      $tree = @(Get-TreeSnapshot -RootPid $childPid)
      $sampleList.Add([ordered]@{ sampledUtc=[DateTime]::UtcNow.ToString('o'); processes=$tree })
    } catch { $monitorErrors.Add($_.Exception.Message) }
    Start-Sleep -Milliseconds 100
  }
  $child.WaitForExit()
  $childExitCode = [int]$child.ExitCode
  $request | Add-Member -NotePropertyName childExitedUtc -NotePropertyValue ([DateTime]::UtcNow.ToString('o')) -Force
  $stdoutTask.GetAwaiter().GetResult()
  $stderrTask.GetAwaiter().GetResult()
  $stdoutFile.Flush(); $stderrFile.Flush()
  $stdoutFile.Dispose(); $stderrFile.Dispose()
  $stdoutFile=$null; $stderrFile=$null
  $runnerExitCode=0
  Write-Receipt -Status 0 -ErrorText $null
  exit 0
} catch {
  $failure = $_.Exception.ToString()
  if ($stdoutFile) { try { $stdoutFile.Dispose() } catch {} }
  if ($stderrFile) { try { $stderrFile.Dispose() } catch {} }
  try { Write-Receipt -Status 70 -ErrorText $failure } catch { [Console]::Error.WriteLine($_.Exception.ToString()) }
  [Console]::Error.WriteLine($failure)
  exit 70
}