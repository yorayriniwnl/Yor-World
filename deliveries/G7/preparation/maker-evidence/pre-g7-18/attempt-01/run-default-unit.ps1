$ErrorActionPreference = 'Stop'
$repo = (Get-Location).Path
$evidence = Join-Path $repo 'deliveries/G7/preparation/maker-evidence/pre-g7-18'
$app = Join-Path $repo 'app'
$node = 'C:\Users\ayush\AppData\Local\Temp\yor-world-node-24.19.0\unpacked\node-v24.19.0-win-x64\node.exe'
$pnpm = 'C:\Users\ayush\AppData\Local\pnpm\store\v11\links\@\pnpm\9.15.9\3d51f653a61d6f9b811790f44bb80b908ca8d24c424e6e53e491ea81b7f96a43\node_modules\pnpm\bin\pnpm.cjs'
$env:Path = (Split-Path -Parent $node) + ';' + $env:Path
$nodeVersion = (& $node --version).Trim()
$pnpmVersion = (& $node $pnpm --version).Trim()
if ($nodeVersion -ne 'v24.19.0' -or $pnpmVersion -ne '9.15.9') { throw "Wrong toolchain: $nodeVersion / $pnpmVersion" }
$testPath = Join-Path $app 'tests/unit/boundaries.test.ts'
$stdout = Join-Path $evidence 'attempt-01/unit-suite.stdout.log'
$stderr = Join-Path $evidence 'attempt-01/unit-suite.stderr.log'
$receipt = Join-Path $evidence 'attempt-01/unit-suite-run.txt'
$observationsPath = Join-Path $evidence 'attempt-01/process-observations.json'
$baselineNodes = @(Get-Process -Name node -ErrorAction SilentlyContinue)
$baselineIds = @($baselineNodes | ForEach-Object { [int]$_.Id })
$baseline = @($baselineNodes | ForEach-Object {
  [pscustomobject]@{ pid = [int]$_.Id; cpuSeconds = [double]$_.CPU; workingSetBytes = [int64]$_.WorkingSet64; startTime = $_.StartTime.ToUniversalTime().ToString('o') }
})
$head = (git rev-parse HEAD).Trim()
$appTree = (git rev-parse 'HEAD:app').Trim()
$testShaBefore = (Get-FileHash -LiteralPath $testPath -Algorithm SHA256).Hash.ToLowerInvariant()
$testBlobBefore = (git hash-object -- app/tests/unit/boundaries.test.ts).Trim()
$startUtc = [DateTime]::UtcNow
$timer = [System.Diagnostics.Stopwatch]::StartNew()
$process = Start-Process -FilePath $node -ArgumentList @($pnpm, 'run', 'test:unit') -WorkingDirectory $app -PassThru -RedirectStandardOutput $stdout -RedirectStandardError $stderr
$observations = [System.Collections.Generic.List[object]]::new()
while (-not $process.HasExited) {
  $process.Refresh()
  if ($process.HasExited) { break }
  $nodes = @(Get-Process -Name node -ErrorAction SilentlyContinue)
  $newNodes = @($nodes | Where-Object { $baselineIds -notcontains [int]$_.Id })
  $newCpu = [double](($newNodes | Measure-Object -Property CPU -Sum).Sum)
  $rootProcess = Get-Process -Id $process.Id -ErrorAction SilentlyContinue
  $observations.Add([pscustomobject]@{
    timestampUtc = [DateTime]::UtcNow.ToString('o')
    commandPid = [int]$process.Id
    commandCpuSeconds = if ($rootProcess) { [double]$rootProcess.CPU } else { $null }
    globalNodeCount = $nodes.Count
    newNodeCountSinceBaseline = $newNodes.Count
    newNodeCpuSecondsSinceBaseline = $newCpu
    newNodePidsSinceBaseline = (@($newNodes | ForEach-Object { [int]$_.Id }) -join ',')
  })
  Start-Sleep -Seconds 5
}
$process.Refresh()
$process.WaitForExit()
$timer.Stop()
$endUtc = [DateTime]::UtcNow
$finalNodes = @(Get-Process -Name node -ErrorAction SilentlyContinue)
$final = @($finalNodes | ForEach-Object {
  [pscustomobject]@{ pid = [int]$_.Id; cpuSeconds = [double]$_.CPU; workingSetBytes = [int64]$_.WorkingSet64; startTime = $_.StartTime.ToUniversalTime().ToString('o') }
})
$testShaAfter = (Get-FileHash -LiteralPath $testPath -Algorithm SHA256).Hash.ToLowerInvariant()
$testBlobAfter = (git hash-object -- app/tests/unit/boundaries.test.ts).Trim()
$observation = [ordered]@{
  sampler = 'Get-Process node snapshots every 5 seconds; baseline PIDs excluded from newNode counts; no test instrumentation or WMI polling'
  baselineUtc = $startUtc.ToString('o')
  baselineGlobalNodeCount = $baseline.Count
  baselineProcesses = @($baseline)
  samples = @($observations)
  finalUtc = $endUtc.ToString('o')
  finalGlobalNodeCount = $final.Count
  finalProcesses = @($final)
}
$json = (ConvertTo-Json -InputObject $observation -Depth 6).Replace([string]([char]13+[char]10), [string][char]10)
[System.IO.File]::WriteAllText($observationsPath, $json + [char]10, [System.Text.UTF8Encoding]::new($false))
$lines = @(
  'Command: pnpm run test:unit (default; no args, filters, or overrides)',
  ('Invoker: node.exe "' + $pnpm + '" run test:unit'),
  "Node: $nodeVersion",
  "pnpm: $pnpmVersion",
  "HEAD: $head",
  "App tree: $appTree",
  "Pre-run test raw SHA-256: $testShaBefore",
  "Pre-run test Git blob: $testBlobBefore",
  "Post-run test raw SHA-256: $testShaAfter",
  "Post-run test Git blob: $testBlobAfter",
  "Started UTC: $($startUtc.ToString('o'))",
  "Ended UTC: $($endUtc.ToString('o'))",
  "Elapsed seconds: $([Math]::Round($timer.Elapsed.TotalSeconds, 3))",
  "Exit code: $($process.ExitCode)",
  'Raw stdout: attempt-01/unit-suite.stdout.log',
  'Raw stderr: attempt-01/unit-suite.stderr.log',
  'External process samples: attempt-01/process-observations.json'
)
[System.IO.File]::WriteAllLines($receipt, $lines, [System.Text.UTF8Encoding]::new($false))
Write-Output ("PRE-G7-18 attempt 01 exited " + $process.ExitCode + "; elapsed " + [Math]::Round($timer.Elapsed.TotalSeconds, 3) + "s; samples=" + $observations.Count)
