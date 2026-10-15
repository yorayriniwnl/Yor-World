$ErrorActionPreference = 'Stop'
$repoRoot = (Get-Location).Path
$evidenceRoot = Join-Path $repoRoot 'deliveries/G7/preparation/maker-evidence/pre-g7-19'
$attemptRoot = Join-Path $evidenceRoot 'final-attempt'
$nodeExe = 'C:\Users\ayush\AppData\Local\Temp\yor-world-node-24.19.0\unpacked\node-v24.19.0-win-x64\node.exe'
$samplerScript = Join-Path $attemptRoot 'process-sampler.ps1'
$runnerScript = Join-Path $attemptRoot 'run-default.cjs'
$samplesPath = Join-Path $attemptRoot 'process-observations.jsonl'
$stopPath = Join-Path $attemptRoot 'process-sampler.stop'
$receiptPath = Join-Path $attemptRoot 'sampler-run.json'
$startedUtc = [DateTime]::UtcNow
$clock = [System.Diagnostics.Stopwatch]::StartNew()
$samplerProcess = $null
$runnerExit = $null
$launchError = $null
try {
  if (Test-Path -LiteralPath $stopPath) { Remove-Item -LiteralPath $stopPath -Force }
  $powershellExe = Join-Path $env:SystemRoot 'System32/WindowsPowerShell/v1.0/powershell.exe'
  $samplerArgs = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $samplerScript, '-SamplesPath', $samplesPath, '-StopPath', $stopPath)
  $samplerProcess = Start-Process -FilePath $powershellExe -ArgumentList $samplerArgs -WindowStyle Hidden -PassThru
  $baselineReady = $false
  for ($attempt = 0; $attempt -lt 40; $attempt++) {
    if ((Test-Path -LiteralPath $samplesPath) -and (Get-Item -LiteralPath $samplesPath).Length -gt 0) {
      $baselineReady = $true
      break
    }
    Start-Sleep -Milliseconds 250
  }
  if (-not $baselineReady) { throw 'Process sampler did not publish its baseline within ten seconds.' }
  & $nodeExe $runnerScript
  $runnerExit = $LASTEXITCODE
} catch {
  $launchError = $_.Exception.ToString()
} finally {
  $clock.Stop()
  if ($samplerProcess -and -not $samplerProcess.HasExited) {
    [System.IO.File]::WriteAllText($stopPath, "stop`n", [System.Text.UTF8Encoding]::new($false))
    try { Wait-Process -Id $samplerProcess.Id -Timeout 20 -ErrorAction Stop } catch { $launchError = (($launchError, $_.Exception.Message | Where-Object { $_ }) -join ' | ') }
  }
  $receipt = [ordered]@{
    command = 'pinned node.exe deliveries/G7/preparation/maker-evidence/pre-g7-19/final-attempt/run-default.cjs'
    startedUtc = $startedUtc.ToString('o')
    endedUtc = [DateTime]::UtcNow.ToString('o')
    elapsedSeconds = [Math]::Round($clock.Elapsed.TotalSeconds, 3)
    samplerPid = if ($samplerProcess) { $samplerProcess.Id } else { $null }
    samplerBaselineCaptured = (Test-Path -LiteralPath $samplesPath) -and (Get-Item -LiteralPath $samplesPath).Length -gt 0
    runnerExitCode = $runnerExit
    launchError = $launchError
    processSamples = 'final-attempt/process-observations.jsonl'
  }
  [System.IO.File]::WriteAllText($receiptPath, (ConvertTo-Json -InputObject $receipt -Depth 5) + "`n", [System.Text.UTF8Encoding]::new($false))
}
if ($launchError) { throw $launchError }
