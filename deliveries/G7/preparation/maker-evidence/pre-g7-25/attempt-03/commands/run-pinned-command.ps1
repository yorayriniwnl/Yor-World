param(
  [Parameter(Mandatory=$true)][string]$Name,
  [Parameter(Mandatory=$true)][string]$PnpmArguments,
  [string[]]$Environment = @()
)
$ErrorActionPreference = 'Stop'
$root = 'C:\p25-maker-20261016'
$app = Join-Path $root 'app'
$attempt = Join-Path $root 'deliveries\G7\preparation\maker-evidence\pre-g7-25\attempt-03'
$commands = Join-Path $attempt 'commands'
$stdout = Join-Path $commands ($Name + '.stdout.bin')
$stderr = Join-Path $commands ($Name + '.stderr.bin')
$metadataPath = Join-Path $commands ($Name + '.metadata.json')
foreach ($file in @($stdout, $stderr, $metadataPath)) { if (Test-Path -LiteralPath $file) { throw "Refusing to overwrite $file" } }
$blockedPattern = '\\node_modules\\(vitest|playwright|typescript|eslint|tsx)|world-reference-composition|capture-command\.mjs|capture-required-viewports\.mjs|next\\dist\\build|vite.*(preview|dev)|ms-playwright|(?:node|tsx)(?:\.exe)? .*--test|pnpm\.cjs.*(test|build|lint|typecheck|integration|performance)'
$foreign = @(Get-CimInstance Win32_Process | Where-Object {
  $_.ProcessId -ne $PID -and $_.CommandLine -match $blockedPattern
} | ForEach-Object {
  $category = if ($_.CommandLine -match 'world-reference-composition|capture-command\.mjs|capture-required-viewports\.mjs') {
    'world-browser-capture'
  } elseif ($_.CommandLine -match 'playwright|ms-playwright') {
    'playwright-or-browser-test'
  } elseif ($_.CommandLine -match 'vitest') {
    'vitest-test'
  } elseif ($_.CommandLine -match '(?:node|tsx)(?:\.exe)? .*--test|\\node_modules\\tsx') {
    'node-test-runner'
  } elseif ($_.CommandLine -match 'next\\dist\\build|pnpm\.cjs.*build') {
    'production-build'
  } elseif ($_.CommandLine -match 'vite.*(preview|dev)') {
    'vite-server'
  } elseif ($_.CommandLine -match 'typescript|eslint|pnpm\.cjs.*(lint|typecheck)') {
    'lint-or-typecheck'
  } else {
    'blocked-test-or-build'
  }
  [ordered]@{
    processId = $_.ProcessId
    parentProcessId = $_.ParentProcessId
    name = $_.Name
    executablePath = $_.ExecutablePath
    creationDateUtc = $_.CreationDate.ToUniversalTime().ToString('o')
    commandCategory = $category
    commandLineRecorded = $false
  }
})
if ($foreign.Count -gt 0) { throw "Preflight found another test/build process: $($foreign | ConvertTo-Json -Compress -Depth 3)" }
$node = 'C:\Users\ayush\AppData\Local\Temp\yor-world-node-24.19.0\unpacked\node-v24.19.0-win-x64\node.exe'
$pnpm = 'C:\Users\ayush\AppData\Local\pnpm\store\v11\links\@\pnpm\9.15.9\3d51f653a61d6f9b811790f44bb80b908ca8d24c424e6e53e491ea81b7f96a43\node_modules\pnpm\bin\pnpm.cjs'
$nodeDirectory = Split-Path -Parent $node
$env:Path = $nodeDirectory + [IO.Path]::PathSeparator + $env:Path
$nodeVersion = (& $node --version).Trim()
$pnpmVersion = (& $node $pnpm --version).Trim()
$childNode = (Get-Command node -ErrorAction Stop).Source
$childNodeVersion = (& node --version).Trim()
if (
  $nodeVersion -ne 'v24.19.0' -or
  $pnpmVersion -ne '9.15.9' -or
  $childNodeVersion -ne 'v24.19.0' -or
  [IO.Path]::GetFullPath($childNode) -ne [IO.Path]::GetFullPath($node)
) {
  throw "Pinned tool mismatch: wrapperNode=$nodeVersion childNode=$childNodeVersion childPath=$childNode pnpm=$pnpmVersion"
}
$environmentRecords = @()
foreach ($entry in $Environment) {
  $pair = $entry -split '=', 2
  if ($pair.Count -ne 2) { throw "Environment values must be NAME=VALUE: $entry" }
  [Environment]::SetEnvironmentVariable($pair[0], $pair[1], 'Process')
  $environmentRecords += [ordered]@{ name = $pair[0]; valueRecorded = $false }
}
$sourcePaths = @(
  'app/src/features/world/LowQualityBatch.ts',
  'app/src/features/world/WorldRuntime.ts',
  'app/tests/performance/world.spec.ts',
  'app/tests/unit/inclusive-render-call-counter.test.ts',
  'app/tests/unit/low-quality-batch.test.ts',
  'app/tests/unit/static-batch-production-report.test.ts',
  'app/tests/unit/world-runtime-recovery.test.ts',
  'yorayriniwnl.in/src/features/world/LowQualityBatch.ts',
  'yorayriniwnl.in/src/features/world/WorldRuntime.ts',
  'yorayriniwnl.in/tests/performance/world.spec.ts',
  'yorayriniwnl.in/tests/unit/inclusive-render-call-counter.test.ts',
  'yorayriniwnl.in/tests/unit/low-quality-batch.test.ts',
  'yorayriniwnl.in/tests/unit/static-batch-production-report.test.ts',
  'yorayriniwnl.in/tests/unit/world-runtime-recovery.test.ts'
)
$sourceFiles = @()
foreach ($relative in $sourcePaths) {
  $full = Join-Path $root $relative
  $item = Get-Item -LiteralPath $full
  $blob = (git -C $root rev-parse ":$relative").Trim()
  $sourceFiles += [ordered]@{
    path = $relative
    bytes = $item.Length
    rawSha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $full).Hash.ToLower()
    gitBlob = $blob
  }
}
$rootTree = (git -C $root write-tree).Trim()
$appTree = (git -C $root rev-parse "${rootTree}:app").Trim()
$mirrorTree = (git -C $root rev-parse "${rootTree}:yorayriniwnl.in").Trim()
$head = (git -C $root rev-parse HEAD).Trim()
$started = [DateTime]::UtcNow
$argumentLine = '"' + $pnpm + '" ' + $PnpmArguments
$process = Start-Process -FilePath $node -ArgumentList $argumentLine -WorkingDirectory $app -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru -Wait -WindowStyle Hidden
$finished = [DateTime]::UtcNow
$stdoutItem = Get-Item -LiteralPath $stdout
$stderrItem = Get-Item -LiteralPath $stderr
$metadata = [ordered]@{
  name = $Name
  purpose = 'Packet-mandated pinned command with exact candidate source binding'
  startedAtUtc = $started.ToString('o')
  finishedAtUtc = $finished.ToString('o')
  elapsedMilliseconds = [int64](($finished - $started).TotalMilliseconds)
  workingDirectory = $app
  sourceHead = $head
  acceptedBaseCommit = '500d10fa5901be48d4ff877e608d65ba0e271bb9'
  acceptedBaseAppTree = 'ba0b709192367e1d12a796618f97801a8fcd5a70'
  candidateRootTree = $rootTree
  candidateAppTree = $appTree
  candidateMirrorTree = $mirrorTree
  nodeExecutable = $node
  nodeVersion = $nodeVersion
  childNodeExecutable = $childNode
  childNodeVersion = $childNodeVersion
  pnpmExecutable = $pnpm
  pnpmVersion = $pnpmVersion
  pnpmArguments = $PnpmArguments
  commandLine = $node + ' ' + $pnpm + ' ' + $PnpmArguments
  environment = $environmentRecords
  osProcessId = $process.Id
  osExitCode = $process.ExitCode
  preflightNoConcurrentTestOrBuild = $true
  sourceFiles = $sourceFiles
  stdout = [ordered]@{ path = ($Name + '.stdout.bin'); bytes = $stdoutItem.Length; sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $stdout).Hash.ToLower() }
  stderr = [ordered]@{ path = ($Name + '.stderr.bin'); bytes = $stderrItem.Length; sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $stderr).Hash.ToLower() }
}
$metadata | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $metadataPath -Encoding UTF8
Write-Output "NAME=$Name NODE=$nodeVersion PNPM=$pnpmVersion PID=$($process.Id) EXIT=$($process.ExitCode)"
Write-Output "ROOT_TREE=$rootTree APP_TREE=$appTree MIRROR_TREE=$mirrorTree STDOUT_BYTES=$($stdoutItem.Length) STDERR_BYTES=$($stderrItem.Length)"
exit $process.ExitCode
