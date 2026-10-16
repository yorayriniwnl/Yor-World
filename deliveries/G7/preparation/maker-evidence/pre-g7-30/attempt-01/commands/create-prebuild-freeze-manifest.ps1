Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$repo='C:\p30-maker-20261016'
$evidence=Join-Path $repo 'deliveries\G7\preparation\maker-evidence\pre-g7-30'
$attempt=Join-Path $evidence 'attempt-01'
$manifestPath=Join-Path $attempt 'prebuild-freeze-manifest.json'
$node='C:\Users\ayush\AppData\Local\Temp\yor-world-node-24.19.0\unpacked\node-v24.19.0-win-x64\node.exe'
$pnpm='C:\Users\ayush\AppData\Local\node\corepack\v1\pnpm\9.15.9\bin\pnpm.cjs'
$nodeSha='3602f2bb1a10f2cbab4c36886218a33c1ab3db87290e73b033c46c77147d0237'
$pnpmSha='98e6b99a881d64a1cc982c3e60aa260bf02160386b12e74475e06486dc74b090'
$utf8=New-Object System.Text.UTF8Encoding($false)

function Invoke-GitText([string[]]$Arguments) {
  $output=& git -C $repo @Arguments
  if ($LASTEXITCODE -ne 0) { throw "git command failed ($LASTEXITCODE): git -C $repo $($Arguments -join ' ')" }
  return (($output | Out-String).Trim())
}
function Get-FileProof([string]$FullPath,[string]$RelativePath) {
  $file=Get-Item -LiteralPath $FullPath
  $sha=(Get-FileHash -LiteralPath $FullPath -Algorithm SHA256).Hash.ToLowerInvariant()
  $blobOutput=& git -C $repo hash-object "--path=$RelativePath" -- $FullPath
  if ($LASTEXITCODE -ne 0) { throw "git hash-object failed for $RelativePath ($LASTEXITCODE)" }
  $blob=(($blobOutput | Out-String).Trim())
  if ($blob -notmatch '^[0-9a-f]{40}$') { throw "unexpected Git blob id for ${RelativePath}: $blob" }
  return [ordered]@{path=$RelativePath.Replace('\','/');rawBytes=[long]$file.Length;rawSha256=$sha;pathFilteredGitBlob=$blob}
}
function Get-SourceProof([string]$Name,[string]$Path,[string]$Commit,[string]$RootTree,[string]$AppTree,[string]$MirrorTree) {
  $head=Invoke-GitText @('-C',$Path,'rev-parse','HEAD')
  $tree=Invoke-GitText @('-C',$Path,'write-tree')
  $actualApp=Invoke-GitText @('-C',$Path,'rev-parse',($tree+':app'))
  $actualMirror=Invoke-GitText @('-C',$Path,'rev-parse',($tree+':yorayriniwnl.in'))
  if ($head -ne $Commit -or $tree -ne $RootTree -or $actualApp -ne $AppTree -or $actualMirror -ne $MirrorTree) { throw "$Name active source identity differs from reviewed binding" }
  $diffOutput=& git -C $Path diff --quiet
  $diffExit=$LASTEXITCODE
  if ($diffExit -ne 0) { throw "$Name has unstaged tracked changes" }
  $untracked=@(& git -C $Path ls-files --others --exclude-standard)
  if ($LASTEXITCODE -ne 0 -or $untracked.Count -ne 0) { throw "$Name has untracked nonignored files" }
  $staged=@(& git -C $Path diff --cached --name-only | Sort-Object)
  if ($LASTEXITCODE -ne 0) { throw "$Name staged path query failed" }
  $expected=@('app/p28-render-attribution.config.ts','app/src/features/world/P28RenderAttribution.ts','app/src/features/world/WorldRuntime.ts','app/tests/e2e/p28-render-attribution.spec.ts' | Sort-Object)
  if (Compare-Object -ReferenceObject $expected -DifferenceObject $staged) { throw "$Name staged overlay path set differs" }
  return [ordered]@{name=$Name;path=$Path;head=$head;rootTree=$tree;appTree=$actualApp;mirrorTree=$actualMirror;unstagedDiffExit=$diffExit;untrackedNonignoredCount=$untracked.Count;stagedOverlayPaths=$staged;identityPass=$true}
}

if ((Get-FileHash -LiteralPath $node -Algorithm SHA256).Hash.ToLowerInvariant() -ne $nodeSha) { throw 'Pinned Node binary hash changed' }
if ((Get-FileHash -LiteralPath $pnpm -Algorithm SHA256).Hash.ToLowerInvariant() -ne $pnpmSha) { throw 'Pinned pnpm entry hash changed' }
$nodeVersion=((& $node --version) | Out-String).Trim()
$pnpmVersion=((& $node $pnpm --version) | Out-String).Trim()
if ($nodeVersion -ne 'v24.19.0' -or $pnpmVersion -ne '9.15.9') { throw "Pinned runtime version mismatch: Node=$nodeVersion pnpm=$pnpmVersion" }

$branch=Invoke-GitText @('branch','--show-current')
$head=Invoke-GitText @('rev-parse','HEAD')
if ($branch -ne 'codex/pre-g7-30-maker-20261016' -or $head -ne '1ead55e4cb171d746d754328fc9ace310d4acba5') { throw "P30 evidence worktree branch/HEAD mismatch: $branch $head" }
$trackedDiff=& git -C $repo diff --quiet
$trackedDiffExit=$LASTEXITCODE
$stagedDiff=& git -C $repo diff --cached --quiet
$stagedDiffExit=$LASTEXITCODE
$statusLines=@(& git -C $repo status --porcelain=v1 --untracked-files=all)
if ($trackedDiffExit -ne 0 -or $stagedDiffExit -ne 0) { throw 'P30 evidence worktree contains tracked changes or staged paths' }
$unexpectedStatus=@($statusLines | Where-Object { $_ -notmatch '^\?\? deliveries/G7/preparation/maker-evidence/pre-g7-30/' })
if ($unexpectedStatus.Count -gt 0) { throw "Unrelated worktree changes found: $($unexpectedStatus -join '; ')" }

$accepted=Get-SourceProof 'accepted-root-500' 'D:\p30-source-500-install-02' '500d10fa5901be48d4ff877e608d65ba0e271bb9' '8afcaa76148165caa836ce5cb5e69cfa11f52e61' '15c7a89aab37332d8507f613bc2bd2a94c2a05f5' '34f7ac0731984e50cbb06cf02039911ba65f59a9'
$donor=Get-SourceProof 'p25-donor-28fb' 'D:\p30-source-28fb' '28fb4187445206bcc62e2ef0ae2678e44ac6604b' '0c8539473591271beb91f409f618a168e0487866' '133eb2fe33ea54a15b125fbfe8deccea6cafe68d' 'be03089ce9abae0f487bd829b4f24ddac9bb3dfd'
$restoredHead=Invoke-GitText @('-C','D:\p30-source-500','rev-parse','HEAD')
$restoredAppTree=Invoke-GitText @('-C','D:\p30-source-500','rev-parse','HEAD:app')
$restoredMirrorTree=Invoke-GitText @('-C','D:\p30-source-500','rev-parse','HEAD:yorayriniwnl.in')
if ($restoredHead -ne '500d10fa5901be48d4ff877e608d65ba0e271bb9' -or $restoredAppTree -ne 'ba0b709192367e1d12a796618f97801a8fcd5a70' -or $restoredMirrorTree -ne '34f7ac0731984e50cbb06cf02039911ba65f59a9') { throw 'Abandoned interrupted source worktree is not restored to exact source pin' }

$resolver=Get-Content -LiteralPath (Join-Path $attempt 'commands\runtime-resolver-matrix-attempt-03.json') -Raw | ConvertFrom-Json
$driverValidation=Get-Content -LiteralPath (Join-Path $attempt 'commands\task-driver-validation.json') -Raw | ConvertFrom-Json
if ($driverValidation.status -ne 'PASS' -or $driverValidation.sourceBuildsLaunched -ne 0 -or $driverValidation.browserInvocationsLaunched -ne 0) { throw 'Latest driver validation is not a passing no-launch result' }
$probe=Get-Content -LiteralPath (Join-Path $attempt 'runner-probes-attempt-02\probe-pair-result.json') -Raw | ConvertFrom-Json
if ($probe.status -ne 'PASS') { throw 'Controlled child probe pair is not PASS' }
$p28Bindings=Get-Content -LiteralPath (Join-Path $attempt 'inputs\p28\frozen-artifact-bindings.json') -Raw | ConvertFrom-Json
$p29ReportProof=Get-FileProof (Join-Path $attempt 'inputs\p29\REPORT.md') 'deliveries/G7/preparation/maker-evidence/pre-g7-30/attempt-01/inputs/p29/REPORT.md'

$files=New-Object 'System.Collections.Generic.List[object]'
$relativePaths=@(Get-ChildItem -LiteralPath $evidence -Recurse -File | Where-Object { $_.FullName -ne $manifestPath } | ForEach-Object { $_.FullName.Substring($repo.Length+1).Replace('\','/') })
[Array]::Sort($relativePaths,[System.StringComparer]::Ordinal)
foreach ($relative in $relativePaths) {
  $fullPath=Join-Path $repo $relative.Replace('/','\')
  $files.Add((Get-FileProof $fullPath $relative))
}

$manifest=[ordered]@{
  schemaVersion=1
  freezeId='p30-prebuild-freeze-01'
  generatedUtc=[DateTime]::UtcNow.ToString('o')
  status='READY_FOR_PARENT_READ_ONLY_REVIEW; BUILD_NOT_AUTHORIZED'
  classification='measurement-only pre-build freeze; no source build or browser invocation launched'
  serialization=[ordered]@{encoding='UTF-8 without BOM';newline='one LF after the JSON document';fileOrder='fileInventory sorted ascending by repository-relative path using ordinal path comparison';hashing='per-file raw byte count and SHA-256 plus path-filtered Git blob ID; no aggregate digest'}
  evidenceWorktree=[ordered]@{branch=$branch;head=$head;trackedDiffExit=$trackedDiffExit;stagedDiffExit=$stagedDiffExit;unrelatedStatusRows=@($unexpectedStatus);ownedPath='deliveries/G7/preparation/maker-evidence/pre-g7-30/'}
  governingPacket=[ordered]@{path='docs/planning/reconciliation-packets/2026-10-16-pre-g7-30-build-exit-status.md';status='authorized local-only; measurements only'}
  sourceBindings=[ordered]@{bindingPath='deliveries/G7/preparation/maker-evidence/pre-g7-30/attempt-01/source-worktrees/current-binding-before-build.json';bindingSha256=(Get-FileProof (Join-Path $attempt 'source-worktrees\current-binding-before-build.json') 'deliveries/G7/preparation/maker-evidence/pre-g7-30/attempt-01/source-worktrees/current-binding-before-build.json').rawSha256;activeSources=@($accepted,$donor);abandonedInterruptedAcceptedWorktree=[ordered]@{path='D:\p30-source-500';head=$restoredHead;appTree=$restoredAppTree;mirrorTree=$restoredMirrorTree;restoredToExactPin=$true;ignoredPartialNodeModules='D:\p30-source-500\app\node_modules remains untouched as recorded in the binding'}}
  frozenMeasurementInputs=[ordered]@{p28MakerCommit='7b1729d52b076b4643017eceec302f4654714f0a';p28BindingPath='deliveries/G7/preparation/maker-evidence/pre-g7-30/attempt-01/inputs/p28/frozen-artifact-bindings.json';p28BindingSha256=(Get-FileProof (Join-Path $attempt 'inputs\p28\frozen-artifact-bindings.json') 'deliveries/G7/preparation/maker-evidence/pre-g7-30/attempt-01/inputs/p28/frozen-artifact-bindings.json').rawSha256;p28Artifacts=$p28Bindings;specificFrozenCopies='attempt-01/inputs/p28 contains byte-preserved canonical observer, harness, config, source input binding, and two source-specific overlay patches; raw byte hashes and path-filtered blob IDs are in fileInventory';p29MakerCommit='bd72e9544832351de289d5c5a9cbaefed6b836db';p29FailureInput=$p29ReportProof}
  runtime=[ordered]@{node=[ordered]@{path=$node;version=$nodeVersion;sha256=$nodeSha};pnpm=[ordered]@{path=$pnpm;version=$pnpmVersion;sha256=$pnpmSha};pnpmStore='D:\pnpm-store-p30';buildTaskFlags=[ordered]@{NEXT_PUBLIC_PRE_G7_13_EVIDENCE='1';NEXT_TELEMETRY_DISABLED='1'};taskDriverPath='deliveries/G7/preparation/maker-evidence/pre-g7-30/attempt-01/commands/invoke-pinned-runtime-task.ps1';taskDriverSha256=(Get-FileProof (Join-Path $attempt 'commands\invoke-pinned-runtime-task.ps1') 'deliveries/G7/preparation/maker-evidence/pre-g7-30/attempt-01/commands/invoke-pinned-runtime-task.ps1').rawSha256;runnerPath='deliveries/G7/preparation/maker-evidence/pre-g7-30/attempt-01/runner/run-child.ps1';runnerSha256=(Get-FileProof (Join-Path $attempt 'runner\run-child.ps1') 'deliveries/G7/preparation/maker-evidence/pre-g7-30/attempt-01/runner/run-child.ps1').rawSha256}
  controlledRunnerProbes=[ordered]@{resultPath='deliveries/G7/preparation/maker-evidence/pre-g7-30/attempt-01/runner-probes-attempt-02/probe-pair-result.json';status=$probe.status;resultSha256=(Get-FileProof (Join-Path $attempt 'runner-probes-attempt-02\probe-pair-result.json') 'deliveries/G7/preparation/maker-evidence/pre-g7-30/attempt-01/runner-probes-attempt-02/probe-pair-result.json').rawSha256;childExitCodes=@(0,23);runnerAndOuterExitCodes=@(0,0);streamsByteExact=$true;processMonitorErrors=0}
  resolverMatrix=[ordered]@{path='deliveries/G7/preparation/maker-evidence/pre-g7-30/attempt-01/commands/runtime-resolver-matrix-attempt-03.json';status='PASS';sha256=(Get-FileProof (Join-Path $attempt 'commands\runtime-resolver-matrix-attempt-03.json') 'deliveries/G7/preparation/maker-evidence/pre-g7-30/attempt-01/commands/runtime-resolver-matrix-attempt-03.json').rawSha256;sources=$resolver.activeSources;earlierFailedAttemptsPreserved=@('runtime-resolver-corrected-matrix.attempt-01-invalid.json','runtime-resolver-matrix-generator-attempt-02.stderr.txt')}
  preBuildGates=[ordered]@{validationPath='deliveries/G7/preparation/maker-evidence/pre-g7-30/attempt-01/commands/task-driver-validation.json';validationStatus=$driverValidation.status;validationSha256=(Get-FileProof (Join-Path $attempt 'commands\task-driver-validation.json') 'deliveries/G7/preparation/maker-evidence/pre-g7-30/attempt-01/commands/task-driver-validation.json').rawSha256;syntheticCaseCount=@($driverValidation.syntheticFailClosedCases).Count;syntheticCases=@($driverValidation.syntheticFailClosedCases);sourceTreeChecks=@($driverValidation.sourceTreeChecks);installAndPreflightChecks=@($driverValidation.existingInstallAndPreflightReceiptChecks);ports=$driverValidation.capturePortListeners;freshNext=$driverValidation.freshBuildOutputPrecheck;buildsLaunched=$driverValidation.sourceBuildsLaunched;browserInvocationsLaunched=$driverValidation.browserInvocationsLaunched}
  firstInterruptedInstall=[ordered]@{classification='incomplete setup attempt, no child result or numeric exit; not a completed install failure';oldRequestBytes=2068;oldRequestSha256='813cd91ac683c126879142eb984b7e93ed916bf36b5a57e1991e8db41ee51e0f';oldStdoutBytes=4096;oldStdoutSha256='48abc7a1a15400860953f294f3dc43db3206e3d6ce06f281a539f984adc9ff32';rawStdoutDisposition='Original raw stdout bytes were overwritten when the completed attempt reused the stream path. Only the recorded original byte count and SHA remain; raw bytes are not preserved. Do not infer or claim otherwise.';completedCleanInstall='accepted-root-500 attempt-02 and donor install-attempt-01 are separate passing frozen installs, explicitly using the D: pnpm store.'}
  remainingStatus=[ordered]@{productionBuilds='NOT STARTED; parent review and explicit authorization required';captures='NOT STARTED';physicalDevices='NOT RUN';screenReaders='NOT RUN';mobileSoak='NOT RUN';chromeGpu='NOT RUN';servicesDeploymentAndG7='NOT RUN';selfAcceptance='not permitted; maker substitute only'}
  fileInventory=@($files.ToArray())
  inventoryCount=$files.Count
  manifestSelfReference='Excluded to avoid recursive self-hash. The manifest raw byte length, SHA-256, and Git blob ID must be reported outside this document.'
}
$json=ConvertTo-Json -InputObject $manifest -Depth 60
[IO.File]::WriteAllText($manifestPath,$json+"`n",$utf8)
Write-Output (ConvertTo-Json -InputObject ([ordered]@{path=$manifestPath;bytes=(Get-Item -LiteralPath $manifestPath).Length;sha256=(Get-FileHash -LiteralPath $manifestPath -Algorithm SHA256).Hash.ToLowerInvariant();inventoryCount=$files.Count;status=$manifest.status}) -Depth 8)
