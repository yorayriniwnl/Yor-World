Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$evidence='C:\p30-maker-20261016\deliveries\G7\preparation\maker-evidence\pre-g7-30\attempt-01'
$driver=Join-Path $evidence 'commands\invoke-pinned-runtime-task.ps1'
$commands=Join-Path $evidence 'commands'
$node='C:\Users\ayush\AppData\Local\Temp\yor-world-node-24.19.0\unpacked\node-v24.19.0-win-x64\node.exe'
$nodeSha='3602f2bb1a10f2cbab4c36886218a33c1ab3db87290e73b033c46c77147d0237'
$pnpm='C:\Users\ayush\AppData\Local\node\corepack\v1\pnpm\9.15.9\bin\pnpm.cjs'
$nodeDir=Split-Path -Parent $node
$driverHash=(Get-FileHash -LiteralPath $driver -Algorithm SHA256).Hash.ToLowerInvariant()
$tokens=$null; $parseErrors=$null
$ast=[System.Management.Automation.Language.Parser]::ParseFile($driver,[ref]$tokens,[ref]$parseErrors)
$synthetic=New-Object 'System.Collections.Generic.List[object]'
$receiptChecks=New-Object 'System.Collections.Generic.List[object]'
$treeChecks=New-Object 'System.Collections.Generic.List[object]'
function Add-Case([System.Collections.Generic.List[object]]$List,[string]$Name,[bool]$Actual,[bool]$Expected) {
  $List.Add([pscustomobject]@{name=$Name;actual=$Actual;expected=$Expected;passed=($Actual -eq $Expected)})
}

foreach ($functionName in @('Get-Hash','Get-NodeTreeAudit','Test-NumericZero','Test-ReceiptProof','Test-BuildReceiptBinding')) {
  $functionAst=$ast.Find({param($item) $item -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $item.Name -eq $functionName},$true)
  if ($null -eq $functionAst) { throw "Required gate function missing: $functionName" }
  Invoke-Expression $functionAst.Extent.Text
}
if ($parseErrors.Count -gt 0) {
  foreach ($item in $parseErrors) { Add-Case $synthetic "PowerShell parser line $($item.Extent.StartLineNumber)" $false $true }
} else { Add-Case $synthetic 'PowerShell parser' $true $true }

$goodProcess=[pscustomobject]@{processId=100;executablePath=$node;executableSha256=$nodeSha;commandLine='node.exe'}
$goodReceipt=[pscustomobject]@{processTreeMonitoring=[pscustomobject]@{sampleCount=1;errors=@();samples=@([pscustomobject]@{processes=@($goodProcess)})}}
$badMonitor=[pscustomobject]@{processTreeMonitoring=[pscustomobject]@{sampleCount=1;errors=@('synthetic monitor error');samples=@([pscustomobject]@{processes=@($goodProcess)})}}
$badPath=[pscustomobject]@{processTreeMonitoring=[pscustomobject]@{sampleCount=1;errors=@();samples=@([pscustomobject]@{processes=@([pscustomobject]@{processId=101;executablePath='C:\Program Files\nodejs\node.exe';executableSha256=$nodeSha;commandLine='node.exe'})})}}
$badHash=[pscustomobject]@{processTreeMonitoring=[pscustomobject]@{sampleCount=1;errors=@();samples=@([pscustomobject]@{processes=@([pscustomobject]@{processId=102;executablePath=$node;executableSha256=('0' * 64);commandLine='node.exe'})})}}
$noNode=[pscustomobject]@{processTreeMonitoring=[pscustomobject]@{sampleCount=1;errors=@();samples=@([pscustomobject]@{processes=@([pscustomobject]@{processId=103;executablePath='C:\Windows\System32\cmd.exe';executableSha256='x';commandLine='cmd.exe'})})}}
$unknownNode=[pscustomobject]@{processTreeMonitoring=[pscustomobject]@{sampleCount=1;errors=@();samples=@([pscustomobject]@{processes=@([pscustomobject]@{processId=104;executablePath='';executableSha256=$null;commandLine='node.exe build.js'})})}}
$noSamples=[pscustomobject]@{processTreeMonitoring=[pscustomobject]@{sampleCount=0;errors=@();samples=@()}}
Add-Case $synthetic 'pinned Node process accepted' (Get-NodeTreeAudit $goodReceipt $node $nodeSha).passed $true
Add-Case $synthetic 'monitor error rejected' (Get-NodeTreeAudit $badMonitor $node $nodeSha).passed $false
Add-Case $synthetic 'wrong Node path rejected' (Get-NodeTreeAudit $badPath $node $nodeSha).passed $false
Add-Case $synthetic 'wrong Node hash rejected' (Get-NodeTreeAudit $badHash $node $nodeSha).passed $false
Add-Case $synthetic 'missing Node observation rejected' (Get-NodeTreeAudit $noNode $node $nodeSha).passed $false
Add-Case $synthetic 'unresolved Node path rejected' (Get-NodeTreeAudit $unknownNode $node $nodeSha).passed $false
Add-Case $synthetic 'missing process samples rejected' (Get-NodeTreeAudit $noSamples $node $nodeSha).passed $false
Add-Case $synthetic 'numeric zero accepted' (Test-NumericZero 0) $true
Add-Case $synthetic 'null child exit rejected' (Test-NumericZero $null) $false
Add-Case $synthetic 'nonzero child exit rejected' (Test-NumericZero 23) $false

$syntheticProofRoot=Join-Path $commands ('driver-synthetic-proof-'+[Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force -Path $syntheticProofRoot | Out-Null
try {
  $proofOut=Join-Path $syntheticProofRoot 'build.stdout.bin'
  $proofErr=Join-Path $syntheticProofRoot 'build.stderr.bin'
  [IO.File]::WriteAllBytes($proofOut,[Text.Encoding]::ASCII.GetBytes('build stdout proof'))
  [IO.File]::WriteAllBytes($proofErr,[Text.Encoding]::ASCII.GetBytes('build stderr proof'))
  $expectedApp='D:\synthetic-source\app'
  $goodBuildRequest=[pscustomobject]@{filePath=$node;workingDirectory=$expectedApp;stdoutPath=$proofOut;stderrPath=$proofErr;environment=[pscustomobject]@{PATH=$nodeDir+';C:\Windows\System32'}}
  $goodBuildReceipt=[pscustomobject]@{child=[pscustomobject]@{filePath=$node;workingDirectory=$expectedApp};streams=[pscustomobject]@{stdoutPath=$proofOut;stdoutBytes=(Get-Item $proofOut).Length;stdoutSha256=(Get-Hash $proofOut);stderrPath=$proofErr;stderrBytes=(Get-Item $proofErr).Length;stderrSha256=(Get-Hash $proofErr)}}
  Add-Case $synthetic 'build executable, app cwd, PATH, and stream proof accepted' (Test-BuildReceiptBinding $goodBuildRequest $goodBuildReceipt $expectedApp $node $nodeDir).passed $true
  $wrongBuildNode=[pscustomobject]@{filePath='C:\Program Files\nodejs\node.exe';workingDirectory=$expectedApp;stdoutPath=$proofOut;stderrPath=$proofErr;environment=[pscustomobject]@{PATH=$nodeDir+';C:\Windows\System32'}}
  Add-Case $synthetic 'wrong build request executable rejected' (Test-BuildReceiptBinding $wrongBuildNode $goodBuildReceipt $expectedApp $node $nodeDir).passed $false
  $wrongBuildReceipt=[pscustomobject]@{child=[pscustomobject]@{filePath='C:\Program Files\nodejs\node.exe';workingDirectory=$expectedApp};streams=$goodBuildReceipt.streams}
  Add-Case $synthetic 'wrong build child executable rejected' (Test-BuildReceiptBinding $goodBuildRequest $wrongBuildReceipt $expectedApp $node $nodeDir).passed $false
  $wrongBuildCwd=[pscustomobject]@{filePath=$node;workingDirectory='D:\other\app';stdoutPath=$proofOut;stderrPath=$proofErr;environment=$goodBuildRequest.environment}
  Add-Case $synthetic 'wrong build request working directory rejected' (Test-BuildReceiptBinding $wrongBuildCwd $goodBuildReceipt $expectedApp $node $nodeDir).passed $false
  $wrongBuildPath=[pscustomobject]@{filePath=$node;workingDirectory=$expectedApp;stdoutPath=$proofOut;stderrPath=$proofErr;environment=[pscustomobject]@{PATH='C:\Program Files\nodejs;'+$nodeDir}}
  Add-Case $synthetic 'wrong build PATH prefix rejected' (Test-BuildReceiptBinding $wrongBuildPath $goodBuildReceipt $expectedApp $node $nodeDir).passed $false
  $missingBuildStream=[pscustomobject]@{filePath=$node;workingDirectory=$expectedApp;stdoutPath=(Join-Path $syntheticProofRoot 'missing.stdout.bin');stderrPath=$proofErr;environment=$goodBuildRequest.environment}
  Add-Case $synthetic 'missing build stream rejected' (Test-BuildReceiptBinding $missingBuildStream $goodBuildReceipt $expectedApp $node $nodeDir).passed $false
  $badStreamReceipt=[pscustomobject]@{child=$goodBuildReceipt.child;streams=[pscustomobject]@{stdoutPath=$proofOut;stdoutBytes=1;stdoutSha256='00';stderrPath=$proofErr;stderrBytes=$goodBuildReceipt.streams.stderrBytes;stderrSha256=$goodBuildReceipt.streams.stderrSha256}}
  Add-Case $synthetic 'build stream receipt size/hash mismatch rejected' (Test-BuildReceiptBinding $goodBuildRequest $badStreamReceipt $expectedApp $node $nodeDir).passed $false
} finally {
  Remove-Item -LiteralPath $syntheticProofRoot -Recurse -Force
}

$sourceCases=@(
  [ordered]@{name='accepted-root-500';root='D:\p30-source-500-install-02';commit='500d10fa5901be48d4ff877e608d65ba0e271bb9';rootTree='8afcaa76148165caa836ce5cb5e69cfa11f52e61';appTree='15c7a89aab37332d8507f613bc2bd2a94c2a05f5';mirrorTree='34f7ac0731984e50cbb06cf02039911ba65f59a9';evidence=Join-Path $commands 'accepted-root-500';install=Join-Path $commands 'accepted-root-500\attempt-02'},
  [ordered]@{name='p25-donor-28fb';root='D:\p30-source-28fb';commit='28fb4187445206bcc62e2ef0ae2678e44ac6604b';rootTree='0c8539473591271beb91f409f618a168e0487866';appTree='133eb2fe33ea54a15b125fbfe8deccea6cafe68d';mirrorTree='be03089ce9abae0f487bd829b4f24ddac9bb3dfd';evidence=Join-Path $commands 'p25-donor-28fb';install=Join-Path $commands 'p25-donor-28fb\install-attempt-01'}
)
$preArgs=[ordered]@{
  install=@($pnpm,'install','--frozen-lockfile','--store-dir','D:\pnpm-store-p30')
  typecheck=@($pnpm,'run','typecheck')
  list=@($pnpm,'exec','playwright','test','--config=p28-render-attribution.config.ts','--list')
}
foreach ($source in $sourceCases) {
  $rootTree=(git -C $source.root write-tree).Trim()
  $commit=(git -C $source.root rev-parse HEAD).Trim()
  $appTree=(git -C $source.root rev-parse ($rootTree+':app')).Trim()
  $mirrorTree=(git -C $source.root rev-parse ($rootTree+':yorayriniwnl.in')).Trim()
  $unstaged=git -C $source.root diff --quiet; $unstagedExit=$LASTEXITCODE
  $untracked=@(git -C $source.root ls-files --others --exclude-standard)
  $staged=@(git -C $source.root diff --cached --name-only | Sort-Object)
  $expectedStaged=@('app/p28-render-attribution.config.ts','app/src/features/world/P28RenderAttribution.ts','app/src/features/world/WorldRuntime.ts','app/tests/e2e/p28-render-attribution.spec.ts' | Sort-Object)
  $stagedExact=(-not (Compare-Object -ReferenceObject $expectedStaged -DifferenceObject $staged))
  $sourcePass=($commit -eq $source.commit -and $rootTree -eq $source.rootTree -and $appTree -eq $source.appTree -and $mirrorTree -eq $source.mirrorTree -and $unstagedExit -eq 0 -and $untracked.Count -eq 0 -and $stagedExact)
  $treeChecks.Add([pscustomobject]@{source=$source.name;commit=$commit;rootTree=$rootTree;appTree=$appTree;mirrorTree=$mirrorTree;unstagedDiffExit=$unstagedExit;untrackedCount=$untracked.Count;stagedPaths=$staged;passed=$sourcePass})
  $proofDefs=@(
    [pscustomobject]@{name='install';dir=$source.install;args=$preArgs.install},
    [pscustomobject]@{name='typecheck';dir=$source.evidence;args=$preArgs.typecheck},
    [pscustomobject]@{name='playwright-list';dir=$source.evidence;args=$preArgs.list}
  )
  foreach ($proofDef in $proofDefs) {
    $requestPath=Join-Path $proofDef.dir ($proofDef.name+'.request.json')
    $receiptPath=Join-Path $proofDef.dir ($proofDef.name+'.receipt.json')
    $outerPath=Join-Path $proofDef.dir ($proofDef.name+'.outer.json')
    $expected=[ordered]@{commit=$source.commit;rootTree=$source.rootTree;appTree=$source.appTree;mirrorTree=$source.mirrorTree}
    $app=Join-Path $source.root 'app'
    $proof=Test-ReceiptProof "$($source.name) $($proofDef.name)" $requestPath $receiptPath $outerPath $proofDef.args $proofDef.name
    $receiptChecks.Add([pscustomobject]@{source=$source.name;task=$proofDef.name;passed=$proof.passed;problems=$proof.problems;nodeProcessCount=$proof.nodeAudit.nodeProcessCount;requestPath=$requestPath;receiptPath=$receiptPath;outerPath=$outerPath})
  }
  $listStdout=Join-Path $source.evidence 'playwright-list.stdout.bin'
  $listText=[IO.File]::ReadAllText($listStdout)
  $rowCount=@([regex]::Matches($listText,'(?m)^\s+\[(?:chrome|edge)\]')).Count
  $totalEight=($listText -match '(?m)^Total:\s+8 tests in 1 file\s*$')
  $browserLaunches=0
  $listReceipt=Get-Content -LiteralPath (Join-Path $source.evidence 'playwright-list.receipt.json') -Raw | ConvertFrom-Json
  foreach ($sample in @($listReceipt.processTreeMonitoring.samples)) { foreach ($proc in @($sample.processes)) { $leaf=[System.IO.Path]::GetFileName([string]$proc.executablePath); if ($leaf -match '^(?i)(chrome|msedge)\.exe$') { $browserLaunches++ } } }
  $receiptChecks.Add([pscustomobject]@{source=$source.name;task='playwright-list-row-check';passed=($rowCount -eq 8 -and $totalEight -and $browserLaunches -eq 0);rowCount=$rowCount;totalEight=$totalEight;browserProcessObservations=$browserLaunches})
}
$ports=[ordered]@{port3291Listeners=@(Get-NetTCPConnection -LocalPort 3291 -State Listen -ErrorAction SilentlyContinue).Count;port3292Listeners=@(Get-NetTCPConnection -LocalPort 3292 -State Listen -ErrorAction SilentlyContinue).Count}
$freshBuildOutputs=[ordered]@{acceptedNextExists=(Test-Path 'D:\p30-source-500-install-02\app\.next');donorNextExists=(Test-Path 'D:\p30-source-28fb\app\.next')}
$allPass=($parseErrors.Count -eq 0 -and @($synthetic | Where-Object { -not $_.passed }).Count -eq 0 -and @($receiptChecks | Where-Object { -not $_.passed }).Count -eq 0 -and @($treeChecks | Where-Object { -not $_.passed }).Count -eq 0 -and $ports.port3291Listeners -eq 0 -and $ports.port3292Listeners -eq 0 -and -not $freshBuildOutputs.acceptedNextExists -and -not $freshBuildOutputs.donorNextExists)
$result=[ordered]@{schemaVersion=1;recordedUtc=[DateTime]::UtcNow.ToString('o');status=if($allPass){'PASS'}else{'FAIL'};classification='read-only static/parser/synthetic gate validation; no build or browser invocation';driverPath=$driver;driverBytes=(Get-Item -LiteralPath $driver).Length;driverSha256=$driverHash;parserErrors=@($parseErrors | ForEach-Object Message);syntheticFailClosedCases=@($synthetic.ToArray());sourceTreeChecks=@($treeChecks.ToArray());existingInstallAndPreflightReceiptChecks=@($receiptChecks.ToArray());capturePortListeners=$ports;freshBuildOutputPrecheck=$freshBuildOutputs;sourceBuildsLaunched=0;browserInvocationsLaunched=0}
$out=Join-Path $commands 'task-driver-validation.json'
[IO.File]::WriteAllText($out,(ConvertTo-Json -InputObject $result -Depth 24)+"`n",(New-Object System.Text.UTF8Encoding($false)))
Write-Output (ConvertTo-Json -InputObject $result -Depth 8)
if (-not $allPass) { exit 1 }
