param(
  [Parameter(Mandatory = $true)][string]$RepoRoot,
  [Parameter(Mandatory = $true)][string]$AttemptRoot
)

$ErrorActionPreference = 'Stop'
$nodeExe = 'C:\Users\ayush\AppData\Local\Temp\yor-world-node-24.19.0\unpacked\node-v24.19.0-win-x64\node.exe'
$pnpmCli = 'C:\Users\ayush\AppData\Local\node\corepack\v1\pnpm\9.15.9\bin\pnpm.cjs'
$p28Commit = '7b1729d52b076b4643017eceec302f4654714f0a'
$p28ManifestPath = Join-Path $AttemptRoot 'p28-input-manifest.json'
$p28Manifest = Get-Content -Raw -LiteralPath $p28ManifestPath | ConvertFrom-Json
$verifierPath = Join-Path $AttemptRoot 'commands\verify-p28-canonical.mjs'
$verifierOutput = & $nodeExe $verifierPath $RepoRoot $p28Commit $AttemptRoot
$verifierExit = $LASTEXITCODE
if ($verifierExit -ne 0) { throw "Canonical P28 blob verifier failed with exit $verifierExit; build/capture remain blocked." }
$p28BlobVerification = (($verifierOutput -join [Environment]::NewLine) | ConvertFrom-Json)
if ($p28BlobVerification.status -ne 'PASS' -or $p28BlobVerification.verifiedCanonicalArtifactCount -ne 11 -or $p28BlobVerification.sourceBindingCount -ne 2) {
  throw 'Canonical P28 verification did not cover all 11 artifacts and both committed source bindings.'
}
$sourceSpecs = @(
  [ordered]@{ name='accepted-root-500'; root='C:\p29-source-500'; commit='500d10fa5901be48d4ff877e608d65ba0e271bb9'; appTree='ba0b709192367e1d12a796618f97801a8fcd5a70'; mirrorTree='34f7ac0731984e50cbb06cf02039911ba65f59a9'; expectedTempRoot='8afcaa76148165caa836ce5cb5e69cfa11f52e61'; expectedTempApp='15c7a89aab37332d8507f613bc2bd2a94c2a05f5'; port=3291 },
  [ordered]@{ name='p25-donor-28fb'; root='C:\p29-source-28fb'; commit='28fb4187445206bcc62e2ef0ae2678e44ac6604b'; appTree='f68074b41b8d2eea228d7fa964d3db8358a9fea4'; mirrorTree='be03089ce9abae0f487bd829b4f24ddac9bb3dfd'; expectedTempRoot='0c8539473591271beb91f409f618a168e0487866'; expectedTempApp='133eb2fe33ea54a15b125fbfe8deccea6cafe68d'; port=3292 }
)

function Get-Sha256([string]$Path) { (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant() }
function Get-Tree([string]$RootTree, [string]$PathName, [string]$SourceRoot) {
  $line = & git -C $SourceRoot ls-tree $RootTree $PathName
  if ($LASTEXITCODE -ne 0 -or -not $line) { throw "Missing tree entry $PathName in $SourceRoot" }
  (($line -split '\s+')[2]).Trim()
}
function Get-IndexBlob([string]$SourceRoot, [string]$RepoPath) {
  $line = & git -C $SourceRoot ls-files -s -- $RepoPath
  if ($LASTEXITCODE -ne 0 -or -not $line) { throw "Missing staged index path $RepoPath in $SourceRoot" }
  (($line -split '\s+')[1]).Trim()
}
function Get-PathFilteredBlob([string]$SourceRoot, [string]$RepoPath) {
  $value = & git -C $SourceRoot hash-object "--path=$RepoPath" (Join-Path $SourceRoot $RepoPath)
  if ($LASTEXITCODE -ne 0 -or -not $value) { throw "Unable to compute path-filtered Git blob for $RepoPath" }
  $value.Trim()
}

$nodeHashCheck = (Get-FileHash -LiteralPath $nodeExe -Algorithm SHA256).Hash.ToLowerInvariant()
$nodeVersionCheck = (& $nodeExe -p 'process.version').Trim()
$pnpmHashCheck = (Get-FileHash -LiteralPath $pnpmCli -Algorithm SHA256).Hash.ToLowerInvariant()
$pnpmVersionCheck = (& $nodeExe $pnpmCli --version).Trim()
if ($nodeHashCheck -ne '3602f2bb1a10f2cbab4c36886218a33c1ab3db87290e73b033c46c77147d0237' -or $nodeVersionCheck -ne 'v24.19.0' -or $pnpmHashCheck -ne '98e6b99a881d64a1cc982c3e60aa260bf02160386b12e74475e06486dc74b090' -or $pnpmVersionCheck -ne '9.15.9') { throw 'Pinned Node/pnpm verification failed; no build/capture allowed.' }
$sourceRows = @()
$expectedPaths = @(
  'app/p28-render-attribution.config.ts',
  'app/src/features/world/P28RenderAttribution.ts',
  'app/src/features/world/WorldRuntime.ts',
  'app/tests/e2e/p28-render-attribution.spec.ts'
)
foreach ($spec in $sourceSpecs) {
  $sourceRoot = $spec.root
  $head = (& git -C $sourceRoot rev-parse HEAD).Trim()
  $baseApp = (& git -C $sourceRoot rev-parse 'HEAD:app').Trim()
  $baseMirror = (& git -C $sourceRoot rev-parse 'HEAD:yorayriniwnl.in').Trim()
  $tempRoot = (& git -C $sourceRoot write-tree).Trim()
  $tempApp = Get-Tree $tempRoot 'app' $sourceRoot
  $tempMirror = Get-Tree $tempRoot 'yorayriniwnl.in' $sourceRoot
  if ($head -ne $spec.commit -or $baseApp -ne $spec.appTree -or $baseMirror -ne $spec.mirrorTree -or $tempRoot -ne $spec.expectedTempRoot -or $tempApp -ne $spec.expectedTempApp -or $tempMirror -ne $spec.mirrorTree) {
    throw "Source identity or P28 temporary tree mismatch for $($spec.name)."
  }
  $changedPaths = @(& git -C $sourceRoot diff --cached --name-only | ForEach-Object { $_.Replace('\','/') } | Sort-Object)
  if (($changedPaths -join '|') -ne (($expectedPaths | Sort-Object) -join '|')) { throw "Unexpected staged source paths for $($spec.name): $($changedPaths -join ', ')" }
  if (@(& git -C $sourceRoot diff --name-only).Count -ne 0) { throw "Unstaged source changes exist for $($spec.name)." }
  $sourceFiles = @()
  foreach ($repoPath in $expectedPaths) {
    $filePath = Join-Path $sourceRoot $repoPath
    $gitBlob = Get-IndexBlob $sourceRoot $repoPath
    $filteredBlob = Get-PathFilteredBlob $sourceRoot $repoPath
    $sourceFiles += [ordered]@{
      repoPath = $repoPath
      rawBytes = (Get-Item -LiteralPath $filePath).Length
      rawSha256 = Get-Sha256 $filePath
      stagedGitBlobId = $gitBlob
      pathFilteredGitBlobId = $filteredBlob
      stagedAndFilteredBlobMatch = ($gitBlob -eq $filteredBlob)
    }
  }
  $lockPath = Join-Path $sourceRoot 'app\pnpm-lock.yaml'
  $packagePath = Join-Path $sourceRoot 'app\package.json'
  $patchName = if ($spec.name -eq 'accepted-root-500') { 'accepted-root-500.WorldRuntime.patch' } else { 'p25-donor-28fb.WorldRuntime.patch' }
  $canonicalPatchArtifact = @($p28Manifest.artifacts | Where-Object { $_.copyPath -match [regex]::Escape($patchName) } | Select-Object -First 1)[0]
  if ($null -eq $canonicalPatchArtifact) { throw "Canonical P28 patch entry missing: $patchName" }
  $patchPath = Join-Path (Join-Path $AttemptRoot 'inputs\p28-canonical\overlays') $patchName
  $diffPath = Join-Path (Join-Path $AttemptRoot 'overlays') ("$($spec.name).P28-overlay.diff")
  $worldRuntimePath = Join-Path $sourceRoot 'app\src\features\world\WorldRuntime.ts'
  $sourceRows += [ordered]@{
    name = $spec.name
    sourceRoot = $sourceRoot
    sourceCommit = $head
    baseAppTree = $baseApp
    baseMirrorTree = $baseMirror
    temporaryRootTree = $tempRoot
    temporaryAppTree = $tempApp
    temporaryMirrorTree = $tempMirror
    capturePort = $spec.port
    stagedPaths = $changedPaths
    sourceFiles = $sourceFiles
    worldRuntimeRawSha256 = Get-Sha256 $worldRuntimePath
    p28RuntimePatch = [ordered]@{ path = $patchName; bytes = (Get-Item -LiteralPath $patchPath).Length; sha256 = Get-Sha256 $patchPath; gitBlobId = $canonicalPatchArtifact.canonicalGitBlobId }
    appliedOverlayDiff = [ordered]@{ path = (Split-Path -Leaf $diffPath); bytes = (Get-Item -LiteralPath $diffPath).Length; sha256 = Get-Sha256 $diffPath }
    pnpmLockSha256 = Get-Sha256 $lockPath
    packageJsonSha256 = Get-Sha256 $packagePath
  }
}

$p28Copies = @()
foreach ($artifact in $p28Manifest.artifacts) {
  $verifiedArtifact = @($p28BlobVerification.verifiedCanonicalArtifacts | Where-Object { $_.p28Path -eq $artifact.p28Path } | Select-Object -First 1)[0]
  if ($null -eq $verifiedArtifact -or -not $verifiedArtifact.verified) { throw "P28 artifact lacks independent canonical Git verification: $($artifact.p28Path)" }
  $copyPath = Join-Path $RepoRoot ("deliveries/G7/preparation/maker-evidence/pre-g7-29/" + $artifact.copyPath)
  if ((Get-Item -LiteralPath $copyPath).Length -ne $artifact.canonicalBlobBytes -or (Get-Sha256 $copyPath) -ne $artifact.canonicalBlobSha256) { throw "P28 canonical copy mismatch: $($artifact.copyPath)" }
  $p28Copies += [ordered]@{
    role = $artifact.role
    p28Commit = $p28Commit
    p28Path = $artifact.p28Path
    canonicalGitBlobId = $verifiedArtifact.actualGitBlobId
    bytes = (Get-Item -LiteralPath $copyPath).Length
    rawSha256 = Get-Sha256 $copyPath
    copyPath = $artifact.copyPath
    byteIdenticalToCanonical = $verifiedArtifact.exactCopyMatch
  }
}
$observer = @($p28Manifest.artifacts | Where-Object role -eq 'measurement observer' | Select-Object -First 1)[0]
$harness = @($p28Manifest.artifacts | Where-Object role -eq 'Playwright capture spec' | Select-Object -First 1)[0]
$config = @($p28Manifest.artifacts | Where-Object role -eq 'Playwright config' | Select-Object -First 1)[0]

$frozenEvidenceRows = @()
$repoPrefix = (Resolve-Path -LiteralPath $RepoRoot).Path.TrimEnd('\') + '\'
foreach ($file in (Get-ChildItem -LiteralPath $AttemptRoot -File -Recurse -Force | Sort-Object FullName)) {
  $repoPath = $file.FullName.Substring($repoPrefix.Length).Replace('\','/')
  $blob = (& git -C $RepoRoot hash-object "--path=$repoPath" $file.FullName).Trim()
  $frozenEvidenceRows += [ordered]@{
    path = $repoPath
    bytes = $file.Length
    rawSha256 = Get-Sha256 $file.FullName
    pathFilteredGitBlobId = $blob
  }
}
$nodeHash = Get-Sha256 $nodeExe
$pnpmHash = Get-Sha256 $pnpmCli
$manifest = [ordered]@{
  schemaVersion = 1
  frozenAtUtc = [DateTime]::UtcNow.ToString('o')
  task = 'PRE-G7-29 runtime-bound renderer attribution, measurement only'
  maker = 'Local Codex maker substitute; not Gemini #3; no self-audit or acceptance.'
  packetBranch = 'codex/pre-g7-29-maker-20261016'
  packetParentCommit = 'f0c0db7ca7436b4a657f5a5483f90cc94ee2fad9'
  evidenceCommit = 'pending; evidence-only commit after results'
  toolchain = [ordered]@{
    nodePath = $nodeExe
    nodeVersion = (& $nodeExe -p 'process.version').Trim()
    nodeSha256 = $nodeHash
    pnpmPath = $pnpmCli
    pnpmVersion = (& $nodeExe $pnpmCli --version).Trim()
    pnpmSha256 = $pnpmHash
  }
  p28Commit = $p28Commit
  p28CanonicalVerification = $p28BlobVerification
  p28Artifacts = [ordered]@{
    observer = [ordered]@{ path = $observer.p28Path; gitBlobId = $observer.canonicalGitBlobId; bytes = $observer.canonicalBlobBytes; sha256 = $observer.canonicalBlobSha256 }
    harnessSpec = [ordered]@{ path = $harness.p28Path; gitBlobId = $harness.canonicalGitBlobId; bytes = $harness.canonicalBlobBytes; sha256 = $harness.canonicalBlobSha256 }
    config = [ordered]@{ path = $config.p28Path; gitBlobId = $config.canonicalGitBlobId; bytes = $config.canonicalBlobBytes; sha256 = $config.canonicalBlobSha256 }
    copies = $p28Copies
    copyManifestPath = 'attempt-01/p28-input-manifest.json'
    copyManifestSha256 = Get-Sha256 $p28ManifestPath
  }
  sources = $sourceRows
  preBuildRuns = @(
    [ordered]@{ kind='install'; source='accepted-root-500'; exitCode=0; receipt='attempt-01/commands/accepted-root-500-install-01.receipt.json'; status='PASS' },
    [ordered]@{ kind='install'; source='p25-donor-28fb'; exitCode=0; receipt='attempt-01/commands/p25-donor-28fb-install-01.receipt.json'; status='PASS' },
    [ordered]@{ kind='typecheck'; source='accepted-root-500'; exitCode=0; receipt='attempt-01/commands/accepted-root-500-typecheck-02.receipt.json'; status='PASS'; priorWrapper='INDETERMINATE' },
    [ordered]@{ kind='playwright-list'; source='accepted-root-500'; exitCode=0; rows=8; receipt='attempt-01/commands/accepted-root-500-playwright-list-01.receipt.json'; status='PASS' },
    [ordered]@{ kind='typecheck'; source='p25-donor-28fb'; exitCode=0; receipt='attempt-01/commands/p25-donor-28fb-typecheck-01.receipt.json'; status='PASS' },
    [ordered]@{ kind='playwright-list'; source='p25-donor-28fb'; exitCode=0; rows=8; receipt='attempt-01/commands/p25-donor-28fb-playwright-list-01.receipt.json'; status='PASS' }
  )
  frozenEvidenceInputFiles = $frozenEvidenceRows
  frozenEvidenceInputFileCount = $frozenEvidenceRows.Count
  aggregateDigest = $null
  aggregateDigestStatus = 'No aggregate digest; each existing input is bound by raw bytes, SHA-256, and path-filtered Git blob ID.'
  freezeRule = 'No edits to P28 observer, harness, config, source overlays, or the command scripts listed above after this freeze and before the corresponding build/capture.'
}
$frozenPath = Join-Path $AttemptRoot 'frozen-inputs.json'
$manifest | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $frozenPath -Encoding UTF8


