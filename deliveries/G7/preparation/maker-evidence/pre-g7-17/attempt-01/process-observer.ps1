param(
  [Parameter(Mandatory=$true)][string]$OutputPath,
  [Parameter(Mandatory=$true)][string]$StopPath
)
$ErrorActionPreference = 'SilentlyContinue'
while (-not (Test-Path -LiteralPath $StopPath)) {
  $stamp = [DateTime]::UtcNow.ToString('o')
  $processes = Get-CimInstance Win32_Process -Filter "Name='node.exe' OR Name='cmd.exe'"
  $rows = foreach ($process in $processes) {
    $runtime = Get-Process -Id $process.ProcessId -ErrorAction SilentlyContinue
    [pscustomobject]@{
      timestampUtc = $stamp
      pid = $process.ProcessId
      parentPid = $process.ParentProcessId
      name = $process.Name
      cpuSeconds = if ($runtime) { [Math]::Round($runtime.CPU, 3) } else { $null }
      workingSetBytes = if ($runtime) { $runtime.WorkingSet64 } else { $null }
      commandLine = $process.CommandLine
    }
  }
  if ($rows) { $rows | Export-Csv -LiteralPath $OutputPath -NoTypeInformation -Append -Encoding UTF8 }
  Start-Sleep -Seconds 1
}
