$ErrorActionPreference='Stop'
$root='C:\Users\yoray\Projects\Yor-World-Local-Corrections'
$revision='world-art-local-corrections-20261009-r1'
$base='deliveries/production-environment/revisions/local-corrections-r1'
$receiptRel="$base/evidence/export-inspection-resumed-20261011-attempt-04.json"
$comparisonRel="$base/evidence/mobile-lod-comparison-attempt-09.json"
$receiptPath=Join-Path $root $receiptRel.Replace('/','\')
$comparisonPath=Join-Path $root $comparisonRel.Replace('/','\')
$assetPath=Join-Path $root 'app\public\asset-manifest.json'
$deliveryPath=Join-Path $root ($base+'/manifest.json').Replace('/','\')
$recordPath=Join-Path $root ($base+'/evidence/continuation-record-attempt-09.json').Replace('/','\')
if(!(Test-Path -LiteralPath $receiptPath)-or !(Test-Path -LiteralPath $comparisonPath)-or !(Test-Path -LiteralPath $assetPath)-or !(Test-Path -LiteralPath $deliveryPath)){throw 'Missing attempt-09 publication prerequisites'}
if(Test-Path -LiteralPath $recordPath){throw 'Refusing to overwrite attempt-09 continuation record'}
$expectedCurrentManifest='40a901ec5d0cacc89224ad9658c5cb37edeee313aedccb38e9249165160ae063'
$currentHash=(Get-FileHash -LiteralPath $assetPath -Algorithm SHA256).Hash.ToLowerInvariant()
if($currentHash -ne $expectedCurrentManifest){throw "Asset manifest changed concurrently: expected $expectedCurrentManifest, found $currentHash"}
$receipt=Get-Content -LiteralPath $receiptPath -Raw|ConvertFrom-Json
$comparison=Get-Content -LiteralPath $comparisonPath -Raw|ConvertFrom-Json
$asset=Get-Content -LiteralPath $assetPath -Raw|ConvertFrom-Json
$delivery=Get-Content -LiteralPath $deliveryPath -Raw|ConvertFrom-Json
$ids=@('group-a-essential','group-b-props','on-demand-projects','production-room-full','mobile-room-lod')
$results=@()
$publicDir=Join-Path $root 'app\public\models\world-art-local-corrections-20261009-r1'
[IO.Directory]::CreateDirectory($publicDir)|Out-Null
foreach($id in $ids){
  $r=@($receipt.results|Where-Object {$_.logicalName -eq $id})|Select-Object -First 1
  if($null -eq $r-or $r.status -ne 'PASS'-or $r.gltfValidator.numErrors -ne 0-or $r.gltfValidator.numWarnings -ne 0){throw "Invalid or missing attempt-09 export proof: $id"}
  $src=Join-Path $root $r.path.Replace('/','\')
  $hash=(Get-FileHash -LiteralPath $src -Algorithm SHA256).Hash.ToLowerInvariant()
  if($hash -ne $r.sha256){throw "Inspector/source SHA mismatch: $id"}
  $name="$id.$hash.glb"
  $dest=Join-Path $publicDir $name
  if(Test-Path -LiteralPath $dest){if((Get-FileHash -LiteralPath $dest -Algorithm SHA256).Hash.ToLowerInvariant() -ne $hash){throw "Hash-path collision: $dest"}}else{[IO.File]::Copy($src,$dest,$false)}
  $url="/models/$revision/$name"
  $provId="prov-$revision-continuation-20261011-attempt-09-$id"
  foreach($g in @($asset.groups|Where-Object {$_.id -eq $id})){$g.url=$url;$g.sha256=$hash;$g.bytes=[int64]$r.bytes;$g.triangles=[int64]$r.triangles;$g.materials=[int]$r.materials;$g.estimatedGpuBytes=[int64]$r.estimatedGpuBytes;$g.clips=@($r.clips);$g.approved=$false;$g.status='candidate';$g.provenanceId=$provId}
  foreach($g in @($delivery.groups|Where-Object {$_.id -eq $id})){$g.url=$url;$g.sha256=$hash;$g.bytes=[int64]$r.bytes;$g.triangles=[int64]$r.triangles;$g.materials=[int]$r.materials;$g.estimatedGpuBytes=[int64]$r.estimatedGpuBytes;$g.clips=@($r.clips);$g.approved=$false;$g.status='candidate';$g.provenanceId=$provId}
  $results += [pscustomobject]@{id=$id;source=$r.path;publicPath=('app/public/models/world-art-local-corrections-20261009-r1/'+$name);url=$url;sha256=$hash;bytes=[int64]$r.bytes;triangles=[int64]$r.triangles;materials=[int]$r.materials;estimatedGpuBytes=[int64]$r.estimatedGpuBytes;transformChecks=[int]$r.transformChecks.Count;transformFailures=@($r.transformChecks|Where-Object status -ne 'PASS').Count;validatorErrors=[int]$r.gltfValidator.numErrors;validatorWarnings=[int]$r.gltfValidator.numWarnings;provenanceId=$provId;approved=$false;status='candidate'}
}
$now=[DateTime]::UtcNow.ToString('yyyy-MM-ddTHH:mm:ss.fffZ')
$asset.generatedAt=$now;$asset.lane='Local Codex art worker /root/art_assets continuation; candidate only'
$delivery.generatedAt=$now;$delivery.lane='Local Codex art worker /root/art_assets continuation; candidate only'
$tmpAsset=Join-Path $root ($base+'/evidence/asset-manifest-attempt-09.tmp.json').Replace('/','\')
$tmpDelivery=Join-Path $root ($base+'/evidence/delivery-manifest-attempt-09.tmp.json').Replace('/','\')
if((Test-Path -LiteralPath $tmpAsset)-or(Test-Path -LiteralPath $tmpDelivery)){throw 'Pending attempt-09 manifest temp exists'}
[IO.File]::WriteAllText($tmpAsset,(ConvertTo-Json -InputObject $asset -Depth 40),[Text.UTF8Encoding]::new($false))
[IO.File]::WriteAllText($tmpDelivery,(ConvertTo-Json -InputObject $delivery -Depth 40),[Text.UTF8Encoding]::new($false))
Move-Item -LiteralPath $tmpAsset -Destination $assetPath -Force
Move-Item -LiteralPath $tmpDelivery -Destination $deliveryPath -Force
$fixtureHash=(Get-FileHash -LiteralPath (Join-Path $root 'app\public\models\world-art-local-corrections-20261009-r1\fixture-production.c7ed99092cfc2d71470065099cec2a0d1dac565e149521dff28c588677cbc3a5.glb') -Algorithm SHA256).Hash.ToLowerInvariant()
$sourceRel="$base/source/environment/build-environment.py"
$logRel="$base/evidence/environment-execution-attempt-09.log"
$record=[pscustomobject]@{revision=$revision;attempt='build-attempt-09';executor='local Codex /root/art_assets (resumed art lane)';generatedAt=$now;status='candidate only; independent visual/provenance review and parent admission pending';source=[pscustomobject]@{path=$sourceRel;bytes=(Get-Item -LiteralPath (Join-Path $root $sourceRel.Replace('/','\'))).Length;sha256=(Get-FileHash -LiteralPath (Join-Path $root $sourceRel.Replace('/','\')) -Algorithm SHA256).Hash.ToLowerInvariant()};blender=[pscustomobject]@{version='5.2.2 LTS';exitCode=0;logPath=$logRel;logBytes=(Get-Item -LiteralPath (Join-Path $root $logRel.Replace('/','\'))).Length;logSha256=(Get-FileHash -LiteralPath (Join-Path $root $logRel.Replace('/','\')) -Algorithm SHA256).Hash.ToLowerInvariant()};exportInspection=[pscustomobject]@{path=$receiptRel;sha256=(Get-FileHash -LiteralPath $receiptPath -Algorithm SHA256).Hash.ToLowerInvariant();allSixValidatorErrorsZero=@($receipt.results|Where-Object {$_.gltfValidator.numErrors -ne 0}).Count -eq 0;allSixValidatorWarningsZero=@($receipt.results|Where-Object {$_.gltfValidator.numWarnings -ne 0}).Count -eq 0;allTransformsPass=@($receipt.results|Where-Object {$_.status -ne 'PASS'-or @($_.transformChecks|Where-Object {$_.status -ne 'PASS'}).Count -ne 0}).Count -eq 0};mobileLodComparison=[pscustomobject]@{path=$comparisonRel;sha256=(Get-FileHash -LiteralPath $comparisonPath -Algorithm SHA256).Hash.ToLowerInvariant();requestedRatio=$comparison.requestedCollapseRatio;eligibleMeshCount=$comparison.aggregate.eligibleMeshCount;eligibleSourceTriangles=$comparison.aggregate.eligibleSourceTriangles;eligibleMobileTriangles=$comparison.aggregate.eligibleMobileTriangles;eligibleActualAggregateRatio=$comparison.aggregate.eligibleAggregateActualRatio;fullTriangles=$comparison.fullScene.triangles;mobileTriangles=$comparison.mobileLod.triangles;trianglesSaved=$comparison.aggregate.trianglesSaved;fullBytes=$comparison.fullScene.bytes;mobileBytes=$comparison.mobileLod.bytes;bytesSaved=$comparison.aggregate.bytesSaved;protectedMeshes=$comparison.aggregate.protectedBoundsMeshes};outputs=@($results);fixture=[pscustomobject]@{path='app/public/models/world-art-local-corrections-20261009-r1/fixture-production.c7ed99092cfc2d71470065099cec2a0d1dac565e149521dff28c588677cbc3a5.glb';sha256=$fixtureHash;approved=$false;status='candidate; unchanged'};visualEvidence=[pscustomobject]@{attempt02Path="$base/evidence/browser-art-attempt-02";attempt02ManifestSha256='2f846c6ddf5c0a1cb1f85b31c4dbf27a4400d8aca4f0f6009374d3f38e401027';attempt09Capture='NOT RUN';reason='Parent requires coordinated freeze before any shared browser capture';independentVisualReview='pending'};approval=[pscustomobject]@{selfApproved=$false;independentVisualReview='pending';independentProvenanceReview='pending';parentAdmission='pending'}}
[IO.File]::WriteAllText($recordPath,(ConvertTo-Json -InputObject $record -Depth 40),[Text.UTF8Encoding]::new($false))
$manifestHash=(Get-FileHash -LiteralPath $assetPath -Algorithm SHA256).Hash.ToLowerInvariant()
[pscustomobject]@{published=@($results);assetManifestSha256=$manifestHash;deliveryManifestSha256=(Get-FileHash -LiteralPath $deliveryPath -Algorithm SHA256).Hash.ToLowerInvariant();recordSha256=(Get-FileHash -LiteralPath $recordPath -Algorithm SHA256).Hash.ToLowerInvariant()}|ConvertTo-Json -Depth 8