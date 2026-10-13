$ErrorActionPreference = 'Stop'
$root = 'C:\Users\yoray\Projects\Yor-World-Local-Corrections'
$revision = 'world-art-local-corrections-20261009-r1'
$baseRel = 'deliveries/production-environment/revisions/local-corrections-r1'
$receiptRel = "$baseRel/evidence/export-inspection-resumed-20261011-attempt-01.json"
$receiptPath = Join-Path $root ($receiptRel -replace '/', '\')
$assetManifestPath = Join-Path $root 'app/public/asset-manifest.json'
$deliveryManifestPath = Join-Path $root ($baseRel + '/manifest.json' -replace '/', '\')
$recordPath = Join-Path $root ($baseRel + '/evidence/continuation-record-attempt-06.json' -replace '/', '\')
$logPath = Join-Path $root ($baseRel + '/evidence/environment-execution-attempt-06.log' -replace '/', '\')
if (!(Test-Path -LiteralPath $receiptPath)) { throw "Missing export receipt: $receiptPath" }
if (!(Test-Path -LiteralPath $assetManifestPath)) { throw "Missing asset manifest: $assetManifestPath" }
if (!(Test-Path -LiteralPath $deliveryManifestPath)) { throw "Missing delivery manifest: $deliveryManifestPath" }
if (Test-Path -LiteralPath $recordPath) { throw "Refusing to overwrite continuation record: $recordPath" }
$receipt = Get-Content -LiteralPath $receiptPath -Raw | ConvertFrom-Json
$assetManifest = Get-Content -LiteralPath $assetManifestPath -Raw | ConvertFrom-Json
$deliveryManifest = Get-Content -LiteralPath $deliveryManifestPath -Raw | ConvertFrom-Json
$publishIds = @('group-a-essential','group-b-props','on-demand-projects','production-room-full','mobile-room-lod')
$results = @()
$publicModelDir = Join-Path $root 'app/public/models/world-art-local-corrections-20261009-r1'
[System.IO.Directory]::CreateDirectory($publicModelDir) | Out-Null
foreach ($id in $publishIds) {
    $r = @($receipt.results | Where-Object { $_.logicalName -eq $id }) | Select-Object -First 1
    if ($null -eq $r) { throw "No export proof for $id" }
    if ($r.status -ne 'PASS' -or $r.gltfValidator.numErrors -ne 0 -or $r.gltfValidator.numWarnings -ne 0) { throw "Export is not validator-clean: $id" }
    $sourcePath = Join-Path $root ($r.path -replace '/', '\')
    $sourceHash = (Get-FileHash -LiteralPath $sourcePath -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($sourceHash -ne $r.sha256) { throw "Receipt SHA mismatch for ${id}: $sourceHash != $($r.sha256)" }
    $fileName = "$id.$sourceHash.glb"
    $destPath = Join-Path $publicModelDir $fileName
    if (Test-Path -LiteralPath $destPath) {
        $destHash = (Get-FileHash -LiteralPath $destPath -Algorithm SHA256).Hash.ToLowerInvariant()
        if ($destHash -ne $sourceHash) { throw "Hash-named collision with different bytes: $destPath" }
    } else {
        [System.IO.File]::Copy($sourcePath, $destPath, $false)
    }
    $url = "/models/$revision/$fileName"
    foreach ($group in @($assetManifest.groups | Where-Object { $_.id -eq $id })) {
        $group.url = $url
        $group.sha256 = $sourceHash
        $group.bytes = [int64]$r.bytes
        $group.triangles = [int64]$r.triangles
        $group.materials = [int]$r.materials
        $group.estimatedGpuBytes = [int64]$r.estimatedGpuBytes
        $group.clips = @($r.clips)
        $group.approved = $false
        $group.status = 'candidate'
        $group.provenanceId = "prov-$revision-continuation-20261011-attempt-06-$id"
    }
    foreach ($group in @($deliveryManifest.groups | Where-Object { $_.id -eq $id })) {
        $group.url = $url
        $group.sha256 = $sourceHash
        $group.bytes = [int64]$r.bytes
        $group.triangles = [int64]$r.triangles
        $group.materials = [int]$r.materials
        $group.estimatedGpuBytes = [int64]$r.estimatedGpuBytes
        $group.clips = @($r.clips)
        $group.approved = $false
        $group.status = 'candidate'
        $group.provenanceId = "prov-$revision-continuation-20261011-attempt-06-$id"
    }
    $results += [pscustomobject]@{id=$id; source=$r.path; publicPath=("app/public/models/world-art-local-corrections-20261009-r1/" + $fileName); url=$url; sha256=$sourceHash; bytes=[int64]$r.bytes; triangles=[int64]$r.triangles; materials=[int]$r.materials; estimatedGpuBytes=[int64]$r.estimatedGpuBytes; gltfValidatorVersion=$r.gltfValidator.version; gltfValidatorErrors=[int]$r.gltfValidator.numErrors; gltfValidatorWarnings=[int]$r.gltfValidator.numWarnings; transformChecks=[int]$r.transformChecks.Count; failedTransformChecks=[int]@($r.transformChecks | Where-Object { $_.status -ne 'PASS' }).Count; approved=$false; status='candidate'}
}
$now = [DateTime]::UtcNow.ToString('yyyy-MM-ddTHH:mm:ss.fffZ')
$assetManifest.generatedAt = $now
$assetManifest.lane = 'Local Codex art worker /root/art_assets continuation; candidate only'
$deliveryManifest.generatedAt = $now
$deliveryManifest.lane = 'Local Codex art worker /root/art_assets continuation; candidate only'
$assetJson = ConvertTo-Json -InputObject $assetManifest -Depth 40
$deliveryJson = ConvertTo-Json -InputObject $deliveryManifest -Depth 40
$tmpAsset = Join-Path $root ($baseRel + '/evidence/asset-manifest-attempt-06.tmp.json' -replace '/', '\')
$tmpDelivery = Join-Path $root ($baseRel + '/evidence/delivery-manifest-attempt-06.tmp.json' -replace '/', '\')
if ((Test-Path -LiteralPath $tmpAsset) -or (Test-Path -LiteralPath $tmpDelivery)) { throw 'Refusing to overwrite a pending manifest temp file' }
[System.IO.File]::WriteAllText($tmpAsset, $assetJson, [System.Text.UTF8Encoding]::new($false))
[System.IO.File]::WriteAllText($tmpDelivery, $deliveryJson, [System.Text.UTF8Encoding]::new($false))
Move-Item -LiteralPath $tmpAsset -Destination $assetManifestPath -Force
Move-Item -LiteralPath $tmpDelivery -Destination $deliveryManifestPath -Force
$fixture = @($receipt.results | Where-Object { $_.logicalName -eq 'fixture-production' }) | Select-Object -First 1
$fixturePath = Join-Path $root 'app/public/models/world-art-local-corrections-20261009-r1/fixture-production.c7ed99092cfc2d71470065099cec2a0d1dac565e149521dff28c588677cbc3a5.glb'
$fixturePublicHash = if (Test-Path -LiteralPath $fixturePath) { (Get-FileHash -LiteralPath $fixturePath -Algorithm SHA256).Hash.ToLowerInvariant() } else { $null }
$sourcePaths = @(
  'deliveries/production-environment/revisions/local-corrections-r1/source/prepare-authoring.py',
  'deliveries/production-environment/revisions/local-corrections-r1/source/art_refinements.py',
  'deliveries/production-environment/revisions/local-corrections-r1/source/environment/build-environment.py',
  'deliveries/production-environment/revisions/local-corrections-r1/source/environment/generate-carpet-texture.py',
  'deliveries/production-environment/revisions/local-corrections-r1/source/environment/textures/floor-carpet-microtexture.png',
  'deliveries/production-environment/revisions/local-corrections-r1/source/resident-fixture/build-resident-production.py'
)
$inputs = foreach ($rel in $sourcePaths) { $p=Join-Path $root ($rel -replace '/', '\'); if (!(Test-Path -LiteralPath $p)) { throw "Missing source fingerprint input $rel" }; $f=Get-Item -LiteralPath $p; [pscustomobject]@{path=$rel;bytes=[int64]$f.Length;sha256=(Get-FileHash -LiteralPath $p -Algorithm SHA256).Hash.ToLowerInvariant()} }
$logRel = "$baseRel/evidence/environment-execution-attempt-06.log"
$record = [pscustomobject]@{
  revision=$revision
  attempt='build-attempt-06 / fixture-attempt-03'
  executor='local Codex /root/art_assets (resumed art lane)'
  generatedAt=$now
  status='candidate; not independently visually reviewed or approved'
  sourceFingerprints=@($inputs)
  environmentExecutionLog=[pscustomobject]@{path=$logRel;bytes=(Get-Item -LiteralPath $logPath).Length;sha256=(Get-FileHash -LiteralPath $logPath -Algorithm SHA256).Hash.ToLowerInvariant();exitCode=0;blender='5.2.2 LTS'}
  exportInspection=[pscustomobject]@{path=$receiptRel;bytes=(Get-Item -LiteralPath $receiptPath).Length;sha256=(Get-FileHash -LiteralPath $receiptPath -Algorithm SHA256).Hash.ToLowerInvariant();allValidatorErrorsZero=@($receipt.results | Where-Object { $_.gltfValidator.numErrors -ne 0 }).Count -eq 0;allValidatorWarningsZero=@($receipt.results | Where-Object { $_.gltfValidator.numWarnings -ne 0 }).Count -eq 0;allTransformsPass=@($receipt.results | Where-Object { $_.status -ne 'PASS' -or @($_.transformChecks | Where-Object { $_.status -ne 'PASS' }).Count -ne 0 }).Count -eq 0}
  outputs=@($results)
  fixture=[pscustomobject]@{sourcePath=$fixture.path;sha256=$fixture.sha256;bytes=$fixture.bytes;publicPath='app/public/models/world-art-local-corrections-20261009-r1/fixture-production.c7ed99092cfc2d71470065099cec2a0d1dac565e149521dff28c588677cbc3a5.glb';publicHash=$fixturePublicHash;checks=@($fixture.transformChecks|Where-Object {$_.status -eq 'PASS'}).Count;failedChecks=@($fixture.transformChecks|Where-Object {$_.status -ne 'PASS'}).Count;approved=$false;status='candidate'}
  priorBrowserEvidence=[pscustomobject]@{path="$baseRel/evidence/browser-art-attempt-02/report.json";manifestSha256='2f846c6ddf5c0a1cb1f85b31c4dbf27a4400d8aca4f0f6009374d3f38e401027';artUrlsUsed=@('/models/world-art-local-corrections-20261009-r1/production-room-full.231859e1cf3a476f6fecf2ca341ee21cc09154d449e2f91e3f2e61efd2eb60c2.glb','/models/world-art-local-corrections-20261009-r1/fixture-production.c7ed99092cfc2d71470065099cec2a0d1dac565e149521dff28c588677cbc3a5.glb');screenshotsCurrentForAttempt06=$false;runtimeSourceFingerprintsStable=$true;visualStatus='parent visual audit found scene still sparse/washed out and mobile crop spends height on ceiling/floor; no pass claimed'}
  currentRender=[pscustomobject]@{status='NOT RUN';reason='Parent requested a revised browser capture only after runtime framing interface settles; runtime owns camera/lighting.'}
  approval=[pscustomobject]@{independentVisualReview='pending';independentProvenanceReview='pending';parentAdmission='pending';selfApproved=$false}
}
[System.IO.File]::WriteAllText($recordPath, (ConvertTo-Json -InputObject $record -Depth 40), [System.Text.UTF8Encoding]::new($false))
$assetHash=(Get-FileHash -LiteralPath $assetManifestPath -Algorithm SHA256).Hash.ToLowerInvariant()
[pscustomobject]@{assetManifestPath='app/public/asset-manifest.json';assetManifestSha256=$assetHash;deliveryManifestSha256=(Get-FileHash -LiteralPath $deliveryManifestPath -Algorithm SHA256).Hash.ToLowerInvariant();recordPath=($recordPath.Substring($root.Length+1) -replace '\','/');recordSha256=(Get-FileHash -LiteralPath $recordPath -Algorithm SHA256).Hash.ToLowerInvariant();published=@($results)} | ConvertTo-Json -Depth 6