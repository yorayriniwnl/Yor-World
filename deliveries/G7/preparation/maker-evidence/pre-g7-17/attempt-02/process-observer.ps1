param(
  [Parameter(Mandatory=$true)][string]$OutputPath,
  [Parameter(Mandatory=$true)][string]$StopPath
)
$ErrorActionPreference = 'SilentlyContinue'
while (-not (Test-Path -LiteralPath $StopPath)) {
  $stamp = [DateTime]::UtcNow.ToString('o')
  $all = @(Get-CimInstance Win32_Process -Filter "Name='node.exe' OR Name='cmd.exe'")
  $roots = @($all | Where-Object { $_.Name -eq 'cmd.exe' -and $_.CommandLine -match 'pnpm run test:unit' })
  $ids = [System.Collections.Generic.HashSet[int]]::new()
  foreach ($root in $roots) { [void]$ids.Add([int]$root.ProcessId) }
  $changed = $true
  while ($changed) {
    $changed = $false
    foreach ($process in $all) {
      $pidValue = [int]$process.ProcessId
      if ($ids.Contains([int]$process.ParentProcessId) -and -not $ids.Contains($pidValue)) {
        [void]$ids.Add($pidValue)
        $changed = $true
      }
    }
  }
  $descendants = @($all | Where-Object { $ids.Contains([int]$_.ProcessId) })
  $nodeCount = @($descendants | Where-Object { $_.Name -eq 'node.exe' }).Count
  $globalNodeCount = @($all | Where-Object { $_.Name -eq 'node.exe' }).Count
  $observer = Get-Process -Id $PID -ErrorAction SilentlyContinue
  if ($descendants.Count -gt 0) {
    $rows = foreach ($process in $descendants) {
      $runtime = Get-Process -Id $process.ProcessId -ErrorAction SilentlyContinue
      [pscustomobject]@{
        timestampUtc = $stamp
        rootCount = $roots.Count
        runNodeCount = $nodeCount
        globalNodeCount = $globalNodeCount
        observerCpuSeconds = if ($observer) { [Math]::Round($observer.CPU, 3) } else { $null }
        pid = $process.ProcessId
        parentPid = $process.ParentProcessId
        name = $process.Name
        cpuSeconds = if ($runtime) { [Math]::Round($runtime.CPU, 3) } else { $null }
        workingSetBytes = if ($runtime) { $runtime.WorkingSet64 } else { $null }
        commandLine = $process.CommandLine
      }
    }
  } else {
    $rows = [pscustomobject]@{
      timestampUtc = $stamp
      rootCount = 0
      runNodeCount = 0
      globalNodeCount = $globalNodeCount
      observerCpuSeconds = if ($observer) { [Math]::Round($observer.CPU, 3) } else { $null }
      pid = $null
      parentPid = $null
      name = 'waiting-for-test-command'
      cpuSeconds = $null
      workingSetBytes = $null
      commandLine = $null
    }
  }
  $rows | Export-Csv -LiteralPath $OutputPath -NoTypeInformation -Append -Encoding UTF8
  Start-Sleep -Seconds 5
}

