param(
  [Parameter(Mandatory=$true)][ValidateSet('accepted-root-500','p25-donor-28fb')][string]$SourceName,
  [Parameter(Mandatory=$true)][ValidateSet('build','capture')][string]$TaskName
)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$root='C:\p30-maker-20261016\deliveries\G7\preparation\maker-evidence\pre-g7-30\attempt-01'
$node='C:\Users\ayush\AppData\Local\Temp\yor-world-node-24.19.0\unpacked\node-v24.19.0-win-x64\node.exe'
$pnpm='C:\Users\ayush\AppData\Local\node\corepack\v1\pnpm\9.15.9\bin\pnpm.cjs'
$nodeDir=Split-Path -Parent $node
$sourceRoot=if($SourceName -eq 'accepted-root-500'){'D:\p30-source-500-install-02'}else{'D:\p30-source-28fb'}
$app=Join-Path $sourceRoot 'app'
$pnpmSha='98e6b99a881d64a1cc982c3e60aa260bf02160386b12e74475e06486dc74b090'
$nodeSha='3602f2bb1a10f2cbab4c36886218a33c1ab3db87290e73b033c46c77147d0237'
$lockSha='8034f04afa8cbdb28fa028ed574117177dfa8a4903c95775ea41405bcabea791'
$packageSha='0867a027648bb13d677c61670e5dd1c13383e17b9fa03e02114fab750c6c71fb'
$expected=if($SourceName -eq 'accepted-root-500'){
  [ordered]@{commit='500d10fa5901be48d4ff877e608d65ba0e271bb9';rootTree='8afcaa76148165caa836ce5cb5e69cfa11f52e61';appTree='15c7a89aab37332d8507f613bc2bd2a94c2a05f5';mirrorTree='34f7ac0731984e50cbb06cf02039911ba65f59a9';baselineAppTree='ba0b709192367e1d12a796618f97801a8fcd5a70';baselineMirrorTree='34f7ac0731984e50cbb06cf02039911ba65f59a9';overlaySha='cbe3bac13a9d4c22e5ce42eca539dc9f4c05bab1c2b2200550e2f7452d2f93a3'}
}else{
  [ordered]@{commit='28fb4187445206bcc62e2ef0ae2678e44ac6604b';rootTree='0c8539473591271beb91f409f618a168e0487866';appTree='133eb2fe33ea54a15b125fbfe8deccea6cafe68d';mirrorTree='be03089ce9abae0f487bd829b4f24ddac9bb3dfd';baselineAppTree='f68074b41b8d2eea228d7fa964d3db8358a9fea4';baselineMirrorTree='be03089ce9abae0f487bd829b4f24ddac9bb3dfd';overlaySha='7e5c0a042ee9382c95ac127fb70909a3c3ca1e2ab5509887eb1424db6092e8b6'}
}
$taskDir=Join-Path $root ('commands\'+$SourceName)
New-Item -ItemType Directory -Force -Path $taskDir | Out-Null
$refusalPath=Join-Path $taskDir ($TaskName+'.prelaunch-refusal.json')
$utf8=New-Object System.Text.UTF8Encoding($false)

function Get-Hash([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { return $null }
  return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}
function Get-NodeTreeAudit($Receipt,[string]$ExpectedNode,[string]$ExpectedHash) {
  $problems=New-Object 'System.Collections.Generic.List[string]'
  $observed=New-Object 'System.Collections.Generic.List[object]'
  if ($null -eq $Receipt -or $null -eq $Receipt.processTreeMonitoring) {
    $problems.Add('processTreeMonitoring missing')
    return [pscustomobject]@{passed=$false;nodeProcessCount=0;observations=@();problems=@($problems.ToArray())}
  }
  $monitorErrors=@()
  if ($null -ne $Receipt.processTreeMonitoring.errors) { $monitorErrors=@($Receipt.processTreeMonitoring.errors | Where-Object { $null -ne $_ -and [string]$_ -ne '' }) }
  foreach ($monitorError in $monitorErrors) { $problems.Add("process monitor error: $monitorError") }
  $samples=@()
  if ($null -ne $Receipt.processTreeMonitoring.samples) { $samples=@($Receipt.processTreeMonitoring.samples) }
  if ($samples.Count -eq 0 -or [int]$Receipt.processTreeMonitoring.sampleCount -le 0) { $problems.Add('process monitor produced no samples') }
  foreach ($sample in $samples) {
    foreach ($process in @($sample.processes)) {
      $exe=[string]$process.executablePath
      $cmd=[string]$process.commandLine
      $leaf=if ($exe) { [System.IO.Path]::GetFileName($exe) } else { '' }
      $looksLikeNode=($leaf -ieq 'node.exe')
      if (-not $exe -and $cmd -match '(?i)(?:^|[\\/"\s])node\.exe(?:["\s]|$)') {
        $problems.Add("Node process lacks an executable path (PID $($process.processId))")
        continue
      }
      if (-not $looksLikeNode) { continue }
      $normalized=$exe
      try { $normalized=[System.IO.Path]::GetFullPath($exe) } catch { $problems.Add("invalid Node executable path (PID $($process.processId)): $exe") }
      $pathMatches=[string]::Equals($normalized,$ExpectedNode,[System.StringComparison]::OrdinalIgnoreCase)
      $hashMatches=([string]$process.executableSha256).ToLowerInvariant() -eq $ExpectedHash
      $observed.Add([pscustomobject]@{processId=$process.processId;path=$exe;sha256=$process.executableSha256;pathMatchesPinned=$pathMatches;hashMatchesPinned=$hashMatches})
      if (-not $pathMatches) { $problems.Add("Node process path is not pinned (PID $($process.processId)): $exe") }
      if (-not $hashMatches) { $problems.Add("Node process hash is not pinned (PID $($process.processId)): $($process.executableSha256)") }
    }
  }
  if ($observed.Count -eq 0) { $problems.Add('no Node executable was observed in the process tree') }
  return [pscustomobject]@{passed=($problems.Count -eq 0);nodeProcessCount=$observed.Count;observations=@($observed.ToArray());problems=@($problems.ToArray())}
}
function Test-NumericZero($Value) {
  if ($null -eq $Value) { return $false }
  $s=[string]$Value
  if ($s -notmatch '^\d+$') { return $false }
  return ([long]$s -eq 0)
}
function Test-BuildReceiptBinding($Request,$Receipt,[string]$ExpectedApp,[string]$ExpectedNode,[string]$ExpectedNodeDir) {
  $problems=New-Object 'System.Collections.Generic.List[string]'
  if (-not [string]::Equals([string]$Request.filePath,$ExpectedNode,[System.StringComparison]::OrdinalIgnoreCase)) { $problems.Add('build request executable path is not pinned') }
  if (-not [string]::Equals([string]$Receipt.child.filePath,$ExpectedNode,[System.StringComparison]::OrdinalIgnoreCase)) { $problems.Add('build child receipt executable path is not pinned') }
  if (-not [string]::Equals([string]$Request.workingDirectory,$ExpectedApp,[System.StringComparison]::OrdinalIgnoreCase)) { $problems.Add('build request working directory is not the source app') }
  if (-not [string]::Equals([string]$Receipt.child.workingDirectory,$ExpectedApp,[System.StringComparison]::OrdinalIgnoreCase)) { $problems.Add('build child receipt working directory is not the source app') }
  if (-not ([string]$Request.environment.PATH).StartsWith($ExpectedNodeDir+';',[System.StringComparison]::OrdinalIgnoreCase)) { $problems.Add('build request PATH does not begin with pinned Node directory') }
  foreach ($streamName in @('stdout','stderr')) {
    $requestPath=[string]$Request.($streamName+'Path')
    $receiptPath=[string]$Receipt.streams.($streamName+'Path')
    $expectedBytes=$Receipt.streams.($streamName+'Bytes')
    $expectedSha=[string]$Receipt.streams.($streamName+'Sha256')
    if (-not $requestPath -or -not $receiptPath -or -not [string]::Equals($requestPath,$receiptPath,[System.StringComparison]::OrdinalIgnoreCase)) { $problems.Add("build $streamName path is missing or differs between request and receipt"); continue }
    if (-not (Test-Path -LiteralPath $requestPath -PathType Leaf)) { $problems.Add("build $streamName stream file is missing"); continue }
    if ($null -eq $expectedBytes -or [string]$expectedBytes -notmatch '^\d+$' -or [string]::IsNullOrWhiteSpace($expectedSha)) { $problems.Add("build $streamName receipt size/hash is missing or invalid"); continue }
    if ((Get-Item -LiteralPath $requestPath).Length -ne [long]$expectedBytes -or (Get-Hash $requestPath) -ne $expectedSha.ToLowerInvariant()) { $problems.Add("build $streamName stream does not match receipt size/hash") }
  }
  return [pscustomobject]@{passed=($problems.Count -eq 0);problems=@($problems.ToArray())}
}
function Add-Problem([System.Collections.Generic.List[string]]$List,[string]$Message) { $List.Add($Message) }
function Write-Refusal([string[]]$Problems,[string]$Phase) {
  $payload=[ordered]@{schemaVersion=1;status='REFUSED_BEFORE_CHILD_LAUNCH';source=$SourceName;task=$TaskName;phase=$Phase;recordedUtc=[DateTime]::UtcNow.ToString('o');sourceRoot=$sourceRoot;sourceCommit=$expected.commit;temporaryRootTree=$expected.rootTree;temporaryAppTree=$expected.appTree;temporaryMirrorTree=$expected.mirrorTree;problems=@($Problems)}
  [IO.File]::WriteAllText($refusalPath,(ConvertTo-Json -InputObject $payload -Depth 12)+"`n",$utf8)
  Write-Output (ConvertTo-Json -InputObject $payload -Depth 8)
}
function Test-ReceiptProof([string]$Label,[string]$RequestPath,[string]$ReceiptPath,[string]$OuterPath,[string[]]$ExpectedArgs,[string]$ExpectedTask) {
  $problems=New-Object 'System.Collections.Generic.List[string]'
  foreach ($path in @($RequestPath,$ReceiptPath,$OuterPath)) { if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { $problems.Add("$Label missing evidence file: $path") } }
  if ($problems.Count -gt 0) { return [pscustomobject]@{passed=$false;problems=@($problems.ToArray());nodeAudit=$null} }
  $request=Get-Content -LiteralPath $RequestPath -Raw | ConvertFrom-Json
  $receipt=Get-Content -LiteralPath $ReceiptPath -Raw | ConvertFrom-Json
  $outer=Get-Content -LiteralPath $OuterPath -Raw | ConvertFrom-Json
  if ($outer.task -ne $ExpectedTask) { $problems.Add("$Label outer task mismatch") }
  if ($outer.sourceCommit -ne $expected.commit -or $outer.temporaryRootTree -ne $expected.rootTree -or $outer.temporaryAppTree -ne $expected.appTree -or $outer.temporaryMirrorTree -ne $expected.mirrorTree) { $problems.Add("$Label source/tree binding mismatch") }
  if (-not (Test-NumericZero $outer.outerPowerShellExitCode)) { $problems.Add("$Label outer PowerShell exit is not numeric zero") }
  if (-not (Test-NumericZero $outer.runnerExitCode) -or -not (Test-NumericZero $receipt.runnerExitCode)) { $problems.Add("$Label runner exit is not numeric zero") }
  if (-not (Test-NumericZero $outer.childExitCode) -or -not (Test-NumericZero $receipt.child.exitCode)) { $problems.Add("$Label child exit is not numeric zero") }
  if (-not [string]::Equals([string]$request.filePath,$node,[System.StringComparison]::OrdinalIgnoreCase) -or -not [string]::Equals([string]$receipt.child.filePath,$node,[System.StringComparison]::OrdinalIgnoreCase)) { $problems.Add("$Label child executable path is not pinned") }
  if (-not [string]::Equals([string]$request.workingDirectory,$app,[System.StringComparison]::OrdinalIgnoreCase)) { $problems.Add("$Label working directory mismatch") }
  if (@($request.arguments).Count -ne $ExpectedArgs.Count) { $problems.Add("$Label argument count mismatch") } else { for ($i=0;$i -lt $ExpectedArgs.Count;$i++) { if ([string]$request.arguments[$i] -cne $ExpectedArgs[$i]) { $problems.Add("$Label argument mismatch at index $i") } } }
  if (-not ([string]$request.environment.PATH).StartsWith($nodeDir+';',[System.StringComparison]::OrdinalIgnoreCase)) { $problems.Add("$Label PATH does not begin with pinned Node directory") }
  if ((Get-Hash $request.stdoutPath) -ne [string]$receipt.streams.stdoutSha256 -or (Get-Item -LiteralPath $request.stdoutPath).Length -ne [long]$receipt.streams.stdoutBytes) { $problems.Add("$Label stdout does not match receipt") }
  if ((Get-Hash $request.stderrPath) -ne [string]$receipt.streams.stderrSha256 -or (Get-Item -LiteralPath $request.stderrPath).Length -ne [long]$receipt.streams.stderrBytes) { $problems.Add("$Label stderr does not match receipt") }
  $nodeAudit=Get-NodeTreeAudit $receipt $node $nodeSha
  foreach ($problem in $nodeAudit.problems) { $problems.Add("$Label $problem") }
  return [pscustomobject]@{passed=($problems.Count -eq 0);problems=@($problems.ToArray());nodeAudit=$nodeAudit}
}

# Bind the temporary worktree and reject any post-freeze source edits.
$commit=(git -C $sourceRoot rev-parse HEAD).Trim()
$rootTree=(git -C $sourceRoot write-tree).Trim()
$appTree=(git -C $sourceRoot rev-parse ($rootTree+':app')).Trim()
$mirrorTree=(git -C $sourceRoot rev-parse ($rootTree+':yorayriniwnl.in')).Trim()
$trackedDiffExit=0
git -C $sourceRoot diff --quiet
$trackedDiffExit=$LASTEXITCODE
$untracked=@(git -C $sourceRoot ls-files --others --exclude-standard)
$stagedPaths=@(git -C $sourceRoot diff --cached --name-only | Sort-Object)
$expectedStaged=@('app/p28-render-attribution.config.ts','app/src/features/world/P28RenderAttribution.ts','app/src/features/world/WorldRuntime.ts','app/tests/e2e/p28-render-attribution.spec.ts' | Sort-Object)
$preflightProblems=New-Object 'System.Collections.Generic.List[string]'
if ($commit -ne $expected.commit -or $rootTree -ne $expected.rootTree -or $appTree -ne $expected.appTree -or $mirrorTree -ne $expected.mirrorTree) { $preflightProblems.Add('temporary source commit/tree identity changed') }
if ($trackedDiffExit -ne 0) { $preflightProblems.Add('temporary source has unstaged tracked changes') }
if ($untracked.Count -gt 0) { $preflightProblems.Add('temporary source has untracked nonignored files') }
if (Compare-Object -ReferenceObject $expectedStaged -DifferenceObject $stagedPaths) { $preflightProblems.Add('temporary source staged overlay path set changed') }
if ((Get-Hash $node) -ne $nodeSha -or (Get-Hash $pnpm) -ne $pnpmSha) { $preflightProblems.Add('pinned runtime binary hash mismatch') }
$env:PATH=$nodeDir+';'+$env:PATH
$parentNodeVersion=((& $node --version)|Out-String).Trim()
$parentPnpmVersion=((& $node $pnpm --version)|Out-String).Trim()
if ($parentNodeVersion -ne 'v24.19.0') { $preflightProblems.Add("parent PowerShell Node version mismatch: $parentNodeVersion") }
if ($parentPnpmVersion -ne '9.15.9') { $preflightProblems.Add("parent PowerShell pnpm version mismatch: $parentPnpmVersion") }

if ($TaskName -eq 'build') {
  if (Test-Path -LiteralPath (Join-Path $app '.next')) { $preflightProblems.Add('build output .next exists before the one-shot build') }
  if (-not (Test-Path -LiteralPath 'D:\pnpm-store-p30' -PathType Container)) { $preflightProblems.Add('explicit D: pnpm store is missing') }
  if ((Get-Hash (Join-Path $app 'pnpm-lock.yaml')) -ne $lockSha -or (Get-Hash (Join-Path $app 'package.json')) -ne $packageSha) { $preflightProblems.Add('lockfile or package.json hash changed after frozen install') }
  # The completed install artifacts live in these separately copied directories.
  if ($SourceName -eq 'accepted-root-500') { $installDir=Join-Path $taskDir 'attempt-02' } else { $installDir=Join-Path $taskDir 'install-attempt-01' }
  $preflightDir=$taskDir
  $preArgs=@{
    install=@($pnpm,'install','--frozen-lockfile','--store-dir','D:\pnpm-store-p30')
    typecheck=@($pnpm,'run','typecheck')
    list=@($pnpm,'exec','playwright','test','--config=p28-render-attribution.config.ts','--list')
  }
  $installProof=Test-ReceiptProof "$SourceName install" (Join-Path $installDir 'install.request.json') (Join-Path $installDir 'install.receipt.json') (Join-Path $installDir 'install.outer.json') $preArgs.install 'install'
  $typeProof=Test-ReceiptProof "$SourceName typecheck" (Join-Path $preflightDir 'typecheck.request.json') (Join-Path $preflightDir 'typecheck.receipt.json') (Join-Path $preflightDir 'typecheck.outer.json') $preArgs.typecheck 'typecheck'
  $listProof=Test-ReceiptProof "$SourceName Playwright --list" (Join-Path $preflightDir 'playwright-list.request.json') (Join-Path $preflightDir 'playwright-list.receipt.json') (Join-Path $preflightDir 'playwright-list.outer.json') $preArgs.list 'playwright-list'
  foreach ($proof in @($installProof,$typeProof,$listProof)) { foreach ($problem in $proof.problems) { $preflightProblems.Add($problem) } }
  $listStdout=Join-Path $preflightDir 'playwright-list.stdout.bin'
  if (Test-Path -LiteralPath $listStdout) {
    $listText=[IO.File]::ReadAllText($listStdout)
    $rows=@([regex]::Matches($listText,'(?m)^\s+\[(?:chrome|edge)\]'))
    if ($rows.Count -ne 8 -or $listText -notmatch '(?m)^Total:\s+8 tests in 1 file\s*$') { $preflightProblems.Add("$SourceName Playwright list is not exactly eight rows") }
    $listReceipt=Get-Content -LiteralPath (Join-Path $preflightDir 'playwright-list.receipt.json') -Raw | ConvertFrom-Json
    foreach ($sample in @($listReceipt.processTreeMonitoring.samples)) { foreach ($proc in @($sample.processes)) { $leaf=[System.IO.Path]::GetFileName([string]$proc.executablePath); if ($leaf -match '^(?i)(chrome|msedge)\.exe$') { $preflightProblems.Add("$SourceName Playwright --list launched a browser process") } } }
  } else { $preflightProblems.Add("$SourceName Playwright list stdout missing") }
  $taskArgs=@($pnpm,'run','build')
} else {
  $buildOuterPath=Join-Path $taskDir 'build.outer.json'
  $buildReceiptPath=Join-Path $taskDir 'build.receipt.json'
  $buildRequestPath=Join-Path $taskDir 'build.request.json'
  if (-not (Test-Path -LiteralPath $buildOuterPath) -or -not (Test-Path -LiteralPath $buildReceiptPath) -or -not (Test-Path -LiteralPath $buildRequestPath)) {
    $preflightProblems.Add('source-bound build proof is missing; capture is forbidden')
  } else {
    $buildOuter=Get-Content -LiteralPath $buildOuterPath -Raw | ConvertFrom-Json
    $buildReceipt=Get-Content -LiteralPath $buildReceiptPath -Raw | ConvertFrom-Json
    $buildRequest=Get-Content -LiteralPath $buildRequestPath -Raw | ConvertFrom-Json
    $buildAudit=Get-NodeTreeAudit $buildReceipt $node $nodeSha
    if ($buildOuter.task -ne 'build' -or $buildOuter.sourceName -ne $SourceName) { $preflightProblems.Add('build receipt source/task mismatch') }
    if ($buildOuter.sourceCommit -ne $expected.commit -or $buildOuter.temporaryRootTree -ne $expected.rootTree -or $buildOuter.temporaryAppTree -ne $expected.appTree -or $buildOuter.temporaryMirrorTree -ne $expected.mirrorTree) { $preflightProblems.Add('build receipt source/tree binding mismatch') }
    if (-not (Test-NumericZero $buildOuter.outerPowerShellExitCode) -or -not (Test-NumericZero $buildOuter.runnerExitCode) -or -not (Test-NumericZero $buildOuter.childExitCode) -or -not (Test-NumericZero $buildReceipt.runnerExitCode) -or -not (Test-NumericZero $buildReceipt.child.exitCode)) { $preflightProblems.Add('build outer, runner, and child exits are not all numeric zero') }
    foreach ($problem in $buildAudit.problems) { $preflightProblems.Add("build $problem") }
    $buildBinding=Test-BuildReceiptBinding $buildRequest $buildReceipt $app $node $nodeDir
    foreach ($problem in $buildBinding.problems) { $preflightProblems.Add($problem) }
    if ($buildRequest.arguments.Count -ne 3 -or $buildRequest.arguments[0] -cne $pnpm -or $buildRequest.arguments[1] -cne 'run' -or $buildRequest.arguments[2] -cne 'build') { $preflightProblems.Add('build command arguments do not match exact pnpm build invocation') }
    $buildFlagNames=@($buildRequest.environment.PSObject.Properties.Name | Where-Object { $_ -ne 'PATH' } | Sort-Object)
    if (Compare-Object -ReferenceObject @('NEXT_PUBLIC_PRE_G7_13_EVIDENCE','NEXT_TELEMETRY_DISABLED' | Sort-Object) -DifferenceObject $buildFlagNames) { $preflightProblems.Add('build environment does not contain exactly the two permitted task flags') }
    if ($buildRequest.environment.NEXT_PUBLIC_PRE_G7_13_EVIDENCE -ne '1' -or $buildRequest.environment.NEXT_TELEMETRY_DISABLED -ne '1') { $preflightProblems.Add('build task flag values are not the required exact values') }
    if (-not (Test-Path -LiteralPath (Join-Path $app '.next') -PathType Container)) { $preflightProblems.Add('successful build output .next is missing') }
  }
  if ((Get-Hash (Join-Path $app 'pnpm-lock.yaml')) -ne $lockSha -or (Get-Hash (Join-Path $app 'package.json')) -ne $packageSha) { $preflightProblems.Add('lockfile or package.json hash changed after build') }
  $taskArgs=@($pnpm,'exec','playwright','test','--config=p28-render-attribution.config.ts','--workers=1','--retries=0')
}

if ($TaskName -eq 'capture') {
  $port=if($SourceName -eq 'accepted-root-500'){3291}else{3292}
  $listeners=@(Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)
  if ($listeners.Count -gt 0) { $preflightProblems.Add("capture port $port already has a listener") }
}
if ($preflightProblems.Count -gt 0) { Write-Refusal @($preflightProblems.ToArray()) 'pre-task'; exit 72 }

$requestPath=Join-Path $taskDir ($TaskName+'.request.json')
$receiptPath=Join-Path $taskDir ($TaskName+'.receipt.json')
$stdoutPath=Join-Path $taskDir ($TaskName+'.stdout.bin')
$stderrPath=Join-Path $taskDir ($TaskName+'.stderr.bin')
$runnerStd=Join-Path $taskDir ($TaskName+'.runner.stdout.bin')
$runnerErr=Join-Path $taskDir ($TaskName+'.runner.stderr.bin')
$outerPath=Join-Path $taskDir ($TaskName+'.outer.json')
$pathValue=$nodeDir+';'+$env:PATH
$environment=[ordered]@{PATH=$pathValue}
$taskMetadata=[ordered]@{}
if ($TaskName -eq 'build') {
  $environment.NEXT_PUBLIC_PRE_G7_13_EVIDENCE='1'
  $environment.NEXT_TELEMETRY_DISABLED='1'
  $taskMetadata.taskFlags=[ordered]@{NEXT_PUBLIC_PRE_G7_13_EVIDENCE='1';NEXT_TELEMETRY_DISABLED='1'}
  $taskMetadata.buildOutputDirectory=Join-Path $app '.next'
}
if ($TaskName -eq 'capture') {
  $captureRoot=Join-Path $root ('captures\'+$SourceName)
  $rowDir=Join-Path $captureRoot 'rows'
  $playwrightDir=Join-Path $captureRoot 'playwright-output'
  New-Item -ItemType Directory -Force -Path $rowDir,$playwrightDir | Out-Null
  $environment.P28_SERVER_PORT=[string]$port
  $environment.P28_PLAYWRIGHT_OUTPUT_DIR=$playwrightDir
  $environment.P28_ATTRIBUTION_OUTPUT_DIR=$rowDir
  $environment.P28_ATTRIBUTION_SOURCE=$SourceName
  $environment.P28_ATTRIBUTION_COMMIT=$expected.commit
  $environment.P28_ATTRIBUTION_APP_TREE=$expected.baselineAppTree
  $environment.P28_ATTRIBUTION_MIRROR_TREE=$expected.baselineMirrorTree
  $environment.P28_ATTRIBUTION_TEMP_APP_TREE=$expected.appTree
  $environment.P28_ATTRIBUTION_OBSERVER_SHA256='136e14ae65b401f7bbf9525aa73bdc93843f37f9167ed175ae6ea4d1f00c756a'
  $environment.P28_ATTRIBUTION_OVERLAY_SHA256=$expected.overlaySha
  $environment.P28_ATTRIBUTION_HARNESS_SHA256='97ed3c2ef63e65c577cfb1ef0f916aac40aaf255f634715f21793df384818e31'
  $taskMetadata.capture=[ordered]@{port=$port;rowsDirectory=$rowDir;playwrightOutputDirectory=$playwrightDir;sourceBinding=$expected}
}
$request=[ordered]@{schemaVersion=1;runId="$SourceName-$TaskName";filePath=$node;arguments=@($taskArgs);workingDirectory=$app;stdoutPath=$stdoutPath;stderrPath=$stderrPath;receiptPath=$receiptPath;environment=$environment}
[IO.File]::WriteAllText($requestPath,(ConvertTo-Json -InputObject $request -Depth 12)+"`n",$utf8)
$runner=Join-Path $root 'runner\run-child.ps1'
$hostPath=(Get-Command powershell.exe).Source
$started=[DateTime]::UtcNow.ToString('o')
$commandLine='"'+$hostPath+'" -NoProfile -ExecutionPolicy Bypass -File "'+$runner+'" -RequestPath "'+$requestPath+'"'
& $hostPath -NoProfile -ExecutionPolicy Bypass -File $runner -RequestPath $requestPath 1> $runnerStd 2> $runnerErr
$outerExit=$LASTEXITCODE
$ended=[DateTime]::UtcNow.ToString('o')
$receipt=$null
if (Test-Path -LiteralPath $receiptPath) { $receipt=Get-Content -LiteralPath $receiptPath -Raw | ConvertFrom-Json }
$nodeAudit=if ($receipt) { Get-NodeTreeAudit $receipt $node $nodeSha } else { [pscustomobject]@{passed=$false;nodeProcessCount=0;observations=@();problems=@('receipt missing')} }
$result=[ordered]@{
  schemaVersion=1;sourceName=$SourceName;sourceRoot=$sourceRoot;sourceCommit=$commit;temporaryRootTree=$rootTree;temporaryAppTree=$appTree;temporaryMirrorTree=$mirrorTree
  task=$TaskName;commandLine=$commandLine;taskMetadata=$taskMetadata;nodePath=$node;nodeSha256=(Get-Hash $node);nodeVersion=$parentNodeVersion;pnpmPath=$pnpm;pnpmSha256=(Get-Hash $pnpm);pnpmVersion=$parentPnpmVersion
  startedUtc=$started;finishedUtc=$ended;outerPowerShellExitCode=$outerExit;childExitCode=if($receipt){$receipt.child.exitCode}else{$null};runnerExitCode=if($receipt){$receipt.runnerExitCode}else{$null};processTreeSamples=if($receipt){$receipt.processTreeMonitoring.sampleCount}else{$null};processTreeErrors=if($receipt){@($receipt.processTreeMonitoring.errors)}else{@('receipt missing')};pinnedNodeProcessValidation=$nodeAudit
  requestPath=$requestPath;receiptPath=$receiptPath;stdoutPath=$stdoutPath;stdoutBytes=if(Test-Path $stdoutPath){(Get-Item $stdoutPath).Length}else{$null};stdoutSha256=(Get-Hash $stdoutPath);stderrPath=$stderrPath;stderrBytes=if(Test-Path $stderrPath){(Get-Item $stderrPath).Length}else{$null};stderrSha256=(Get-Hash $stderrPath);runnerStdoutPath=$runnerStd;runnerStderrPath=$runnerErr
  lockfileSha256=(Get-Hash (Join-Path $app 'pnpm-lock.yaml'));packageJsonSha256=(Get-Hash (Join-Path $app 'package.json'))
}
[IO.File]::WriteAllText($outerPath,(ConvertTo-Json -InputObject $result -Depth 30)+"`n",$utf8)
Write-Output (ConvertTo-Json -InputObject $result -Depth 8)
if ($outerExit -ne 0 -or -not $receipt -or -not (Test-NumericZero $receipt.runnerExitCode) -or -not (Test-NumericZero $receipt.child.exitCode) -or -not $nodeAudit.passed) { exit 70 }
if (-not (Test-NumericZero $receipt.child.exitCode)) { exit 70 }
if ([long]$receipt.child.exitCode -ne 0) { exit ([int]$receipt.child.exitCode) }
exit 0
