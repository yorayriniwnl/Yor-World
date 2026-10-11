$root = (Get-Location).Path.TrimEnd('\')
$names = @{
  sourcePatch = -join ([int[]](115,111,117,114,99,101,46,112,97,116,99,104) | ForEach-Object { [char]$_ })
  patchCheck = -join ([int[]](112,97,116,99,104,45,99,104,101,99,107) | ForEach-Object { [char]$_ })
  packageScript = -join ([int[]](112,97,99,107,97,103,101,45,114,52,46,109,106,115) | ForEach-Object { [char]$_ })
  assemblyFile = -join ([int[]](112,97,116,99,104,45,97,115,115,101,109,98,108,121,46,106,115,111,110) | ForEach-Object { [char]$_ })
  applicationFile = -join ([int[]](112,97,116,99,104,45,97,112,112,108,105,99,97,116,105,111,110,46,106,115,111,110) | ForEach-Object { [char]$_ })
  changedPathsFile = -join ([int[]](99,104,97,110,103,101,100,45,112,97,116,104,115,46,116,120,116) | ForEach-Object { [char]$_ })
}
$targets = @(
  $root,
  (Join-Path $root $names.sourcePatch),
  (Join-Path $root $names.patchCheck),
  (Join-Path $root 'evidence' $names.packageScript),
  (Join-Path $root $names.assemblyFile),
  (Join-Path $root $names.applicationFile),
  (Join-Path $root $names.changedPathsFile)
)
$all = @(Get-CimInstance Win32_Process)
$byId = @{}
foreach ($process in $all) { $byId[[int]$process.ProcessId] = $process }
$matches = @($all | Where-Object {
  $candidate = $_
  $found = $false
  if ($candidate.ProcessId -ne $PID -and $candidate.CommandLine) {
    foreach ($target in $targets) {
      if ($target -and $target.Length -gt 0 -and ([string]$candidate.CommandLine).Contains($target)) { $found = $true; break }
    }
  }
  $found
})
$records = @()
foreach ($process in $matches) {
  $parent = $byId[[int]$process.ParentProcessId]
  $records += [pscustomobject]@{
    processId = [int]$process.ProcessId
    parentProcessId = [int]$process.ParentProcessId
    creationDate = [string]$process.CreationDate
    executablePath = [string]$process.ExecutablePath
    commandLine = [string]$process.CommandLine
    parent = if ($parent) { [pscustomobject]@{ processId = [int]$parent.ProcessId; creationDate = [string]$parent.CreationDate; executablePath = [string]$parent.ExecutablePath; commandLine = [string]$parent.CommandLine } } else { $null }
  }
}
$result = [pscustomobject]@{
  capturedAtUtc = [DateTime]::UtcNow.ToString('o')
  root = $root
  targetPaths = $targets
  matchingProcessCount = $records.Count
  matches = $records
  limitation = 'This is a live process snapshot; exited processes are not recoverable from Win32_Process.'
}
$result | ConvertTo-Json -Depth 7 | Set-Content -LiteralPath 'evidence/r4-concurrent-process-query.json' -Encoding utf8
Get-Content -LiteralPath 'evidence/r4-concurrent-process-query.json'
