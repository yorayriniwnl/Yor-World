param(
  [Parameter(Mandatory = $true)][ValidateSet('accepted-root-500', 'p25-donor-28fb')][string]$SourceName,
  [Parameter(Mandatory = $true)][string]$SourceRoot,
  [Parameter(Mandatory = $true)][ValidateSet('typecheck', 'playwright-list')][string]$Kind,
  [Parameter(Mandatory = $true)][string]$AttemptRoot
)

$ErrorActionPreference = 'Stop'
$nodeExe = 'C:\Users\ayush\AppData\Local\Temp\yor-world-node-24.19.0\unpacked\node-v24.19.0-win-x64\node.exe'
$pnpmCli = 'C:\Users\ayush\AppData\Local\node\corepack\v1\pnpm\9.15.9\bin\pnpm.cjs'
$nodeDir = Split-Path -Parent $nodeExe
$env:PATH = "$nodeDir;$env:PATH"
$sourceApp = Join-Path $SourceRoot 'app'
Set-Location -LiteralPath $sourceApp
$commandsDir = Join-Path $AttemptRoot 'commands'
$preflightDir = Join-Path $AttemptRoot 'preflight'
New-Item -ItemType Directory -Force -Path $commandsDir, $preflightDir | Out-Null
$runName = if ($Kind -eq 'typecheck') { "$SourceName-typecheck-01" } else { "$SourceName-playwright-list-01" }
$stdoutPath = Join-Path $commandsDir "$runName.stdout.bin"
$stderrPath = Join-Path $commandsDir "$runName.stderr.bin"
$receiptPath = Join-Path $commandsDir "$runName.receipt.json"
$startedUtc = [DateTime]::UtcNow.ToString('o')

function Get-Sha256([string]$Path) { (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant() }
function Get-Descendants([int]$RootPid) {
  $all = @(Get-CimInstance Win32_Process)
  $known = New-Object 'System.Collections.Generic.HashSet[int]'
  [void]$known.Add($RootPid)
  $changed = $true
  while ($changed) {
    $changed = $false
    foreach ($candidate in $all) {
      if ($known.Contains([int]$candidate.ParentProcessId) -and $known.Add([int]$candidate.ProcessId)) { $changed = $true }
    }
  }
  @($all | Where-Object { $known.Contains([int]$_.ProcessId) } | ForEach-Object {
    [ordered]@{
      processId = [int]$_.ProcessId
      parentProcessId = [int]$_.ParentProcessId
      name = $_.Name
      executablePath = $_.ExecutablePath
      commandLine = $_.CommandLine
    }
  })
}

$nodeHash = Get-Sha256 $nodeExe
$pnpmHash = Get-Sha256 $pnpmCli
$directNodePath = (& $nodeExe -p 'process.execPath').Trim()
$directNodeVersion = (& $nodeExe -p 'process.version').Trim()
$firstCommandNode = (Get-Command node -CommandType Application | Select-Object -First 1).Source
$whereNode = (where.exe node | Select-Object -First 1).Trim()
$packageNodePath = (& $nodeExe $pnpmCli exec node -p 'process.execPath').Trim()
$packageNodeVersion = (& $nodeExe $pnpmCli exec node -p 'process.version').Trim()
$pnpmVersion = (& $nodeExe $pnpmCli --version).Trim()
$pathSuffix = $env:PATH.Substring($nodeDir.Length + 1)
$pathSha = [Security.Cryptography.SHA256]::Create()
try { $pathSuffixHash = ([BitConverter]::ToString($pathSha.ComputeHash([Text.Encoding]::UTF8.GetBytes($pathSuffix)))).Replace('-', '').ToLowerInvariant() } finally { $pathSha.Dispose() }
$resolverPass = (($nodeHash -eq '3602f2bb1a10f2cbab4c36886218a33c1ab3db87290e73b033c46c77147d0237') -and
  ($pnpmHash -eq '98e6b99a881d64a1cc982c3e60aa260bf02160386b12e74475e06486dc74b090') -and
  ($directNodePath -eq $nodeExe) -and ($directNodeVersion -eq 'v24.19.0') -and
  ($firstCommandNode -eq $nodeExe) -and ($whereNode -eq $nodeExe) -and
  ($packageNodePath -eq $nodeExe) -and ($packageNodeVersion -eq 'v24.19.0') -and ($pnpmVersion -eq '9.15.9'))
if (-not $resolverPass) { throw "Pinned resolver failed for $SourceName/$Kind; command was not launched." }

if ($Kind -eq 'typecheck') {
  $arguments = "`"$pnpmCli`" exec tsc --noEmit"
  $expectedRows = $null
} else {
  $arguments = "`"$pnpmCli`" exec playwright test --config p28-render-attribution.config.ts --list"
  $expectedRows = 8
}

$process = Start-Process -FilePath $nodeExe -ArgumentList $arguments -WorkingDirectory $sourceApp -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath -PassThru -NoNewWindow
$snapshots = New-Object 'System.Collections.Generic.List[object]'
while (-not $process.HasExited) {
  $process.Refresh()
  $snapshots.Add([ordered]@{ sampledUtc = [DateTime]::UtcNow.ToString('o'); descendants = @(Get-Descendants $process.Id) })
  Start-Sleep -Milliseconds 150
}
$process.WaitForExit()
$exitCode = $process.ExitCode
$endedUtc = [DateTime]::UtcNow.ToString('o')
$tree = @(Get-Descendants $process.Id)
$nodeProcesses = @($tree | Where-Object { $_.name -ieq 'node.exe' })
$browserProcesses = @($tree | Where-Object { $_.name -match '^(chrome|msedge|firefox|chrome-headless-shell)(\.exe)?$' })
$allNodePinned = $true
foreach ($entry in $nodeProcesses) {
  if ([string]::IsNullOrWhiteSpace($entry.executablePath)) {
    $entry['executableSha256'] = $null
    $entry['executableVersion'] = $null
    $allNodePinned = $false
  } else {
    try { $entry['executableSha256'] = Get-Sha256 $entry.executablePath } catch { $entry['executableSha256'] = $null }
    if ($entry.executablePath -eq $nodeExe -and $entry.executableSha256 -eq $nodeHash) { $entry['executableVersion'] = 'v24.19.0' } else { $entry['executableVersion'] = 'UNVERIFIED' }
    if ($entry.executablePath -ne $nodeExe -or $entry.executableSha256 -ne $nodeHash) { $allNodePinned = $false }
  }
}
$stdoutBytes = (Get-Item -LiteralPath $stdoutPath).Length
$stderrBytes = (Get-Item -LiteralPath $stderrPath).Length
$stdoutHash = Get-Sha256 $stdoutPath
$stderrHash = Get-Sha256 $stderrPath
$stdoutText = [IO.File]::ReadAllText($stdoutPath)
$rowCount = if ($Kind -eq 'playwright-list') { @($stdoutText -split "`r?`n" | Where-Object { $_ -match '^\s*\[(chrome|edge)\]\s*›' }).Count } else { $null }
$receipt = [ordered]@{
  sourceName = $SourceName
  sourceRoot = [IO.Path]::GetFullPath($SourceRoot)
  sourceApp = [IO.Path]::GetFullPath($sourceApp)
  sourceCommit = (& git -C $SourceRoot rev-parse HEAD).Trim()
  sourceAppBaseTree = (& git -C $SourceRoot rev-parse 'HEAD:app').Trim()
  temporaryRootTree = (& git -C $SourceRoot write-tree).Trim()
  kind = $Kind
  command = if ($Kind -eq 'typecheck') { 'pnpm exec tsc --noEmit' } else { 'pnpm exec playwright test --config p28-render-attribution.config.ts --list' }
  argv = if ($Kind -eq 'typecheck') { @($nodeExe, $pnpmCli, 'exec', 'tsc', '--noEmit') } else { @($nodeExe, $pnpmCli, 'exec', 'playwright', 'test', '--config', 'p28-render-attribution.config.ts', '--list') }
  startedUtc = $startedUtc
  endedUtc = $endedUtc
  wrapperPid = $PID
  commandNodePid = $process.Id
  exitCode = $exitCode
  nodePath = $nodeExe
  nodeVersion = $directNodeVersion
  nodeSha256 = $nodeHash
  pnpmPath = $pnpmCli
  pnpmVersion = $pnpmVersion
  pnpmSha256 = $pnpmHash
  pathPrefix = $nodeDir
  pathSuffixSha256 = $pathSuffixHash
  packageScriptNodePath = $packageNodePath
  packageScriptNodeVersion = $packageNodeVersion
  getCommandFirstNode = $firstCommandNode
  whereFirstNode = $whereNode
  resolverPass = $resolverPass
  processTreeSnapshots = @($snapshots)
  finalProcessTree = $tree
  nodeProcessesPinned = $allNodePinned
  browserProcessesObserved = ($browserProcesses.Count -gt 0)
  expectedListRows = $expectedRows
  observedListRows = $rowCount
  stdoutPath = $stdoutPath.Substring($AttemptRoot.TrimEnd('\').Length + 1)
  stdoutBytes = $stdoutBytes
  stdoutSha256 = $stdoutHash
  stderrPath = $stderrPath.Substring($AttemptRoot.TrimEnd('\').Length + 1)
  stderrBytes = $stderrBytes
  stderrSha256 = $stderrHash
}
$receipt | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $receiptPath -Encoding UTF8
if ($exitCode -ne 0) { exit $exitCode }
