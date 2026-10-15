param(
  [Parameter(Mandatory = $true)][string]$SamplesPath,
  [Parameter(Mandatory = $true)][string]$StopPath
)
$ErrorActionPreference = 'Stop'
$baseline = @(Get-Process node -ErrorAction SilentlyContinue | ForEach-Object {
  [pscustomobject]@{
    pid = $_.Id
    cpuSeconds = $_.CPU
    workingSetBytes = $_.WorkingSet64
    startTimeUtc = if ($_.StartTime) { $_.StartTime.ToUniversalTime().ToString('o') } else { $null }
  }
})
$baselineIds = @{}
foreach ($entry in $baseline) { $baselineIds[[string]$entry.pid] = $true }
$startedUtc = [DateTime]::UtcNow
$writer = [System.IO.StreamWriter]::new($SamplesPath, $false, [System.Text.UTF8Encoding]::new($false))
$writer.AutoFlush = $true
$writer.WriteLine((ConvertTo-Json -InputObject ([ordered]@{
  kind = 'baseline'
  timestampUtc = $startedUtc.ToString('o')
  globalNodeCount = $baseline.Count
  processes = $baseline
}) -Depth 8 -Compress))
while (-not (Test-Path -LiteralPath $StopPath)) {
  $rows = @(Get-Process node -ErrorAction SilentlyContinue | ForEach-Object {
    [pscustomobject]@{
      pid = $_.Id
      cpuSeconds = $_.CPU
      workingSetBytes = $_.WorkingSet64
      startTimeUtc = if ($_.StartTime) { $_.StartTime.ToUniversalTime().ToString('o') } else { $null }
    }
  })
  $new = @($rows | Where-Object { -not $baselineIds.ContainsKey([string]$_.pid) })
  $sample = [pscustomobject]@{
    kind = 'sample'
    timestampUtc = [DateTime]::UtcNow.ToString('o')
    globalNodeCount = $rows.Count
    newNodeCountSinceBaseline = $new.Count
    newNodeCpuSecondsSinceBaseline = [Math]::Round((($new | Measure-Object -Property cpuSeconds -Sum).Sum), 3)
    newNodePids = @($new | ForEach-Object { $_.pid })
  }
  $writer.WriteLine((ConvertTo-Json -InputObject $sample -Depth 5 -Compress))
  Start-Sleep -Seconds 5
}
$finalRows = @(Get-Process node -ErrorAction SilentlyContinue | ForEach-Object {
  [pscustomobject]@{
    pid = $_.Id
    cpuSeconds = $_.CPU
    workingSetBytes = $_.WorkingSet64
    startTimeUtc = if ($_.StartTime) { $_.StartTime.ToUniversalTime().ToString('o') } else { $null }
  }
})
$writer.WriteLine((ConvertTo-Json -InputObject ([ordered]@{
  kind = 'final'
  timestampUtc = [DateTime]::UtcNow.ToString('o')
  globalNodeCount = $finalRows.Count
  processes = $finalRows
}) -Depth 8 -Compress))
$writer.Dispose()
$result = [ordered]@{
  sampler = 'Get-Process node snapshots every five seconds; baseline PIDs excluded from new-node counts; no WMI polling'
  baselineUtc = $startedUtc.ToString('o')
  baselineGlobalNodeCount = $baseline.Count
  finalUtc = [DateTime]::UtcNow.ToString('o')
  finalGlobalNodeCount = $finalRows.Count
  sampleFile = $SamplesPath
}
[System.IO.File]::WriteAllText(([System.IO.Path]::ChangeExtension($SamplesPath, '.summary.json')), (ConvertTo-Json -InputObject $result -Depth 8) + "`n", [System.Text.UTF8Encoding]::new($false))
