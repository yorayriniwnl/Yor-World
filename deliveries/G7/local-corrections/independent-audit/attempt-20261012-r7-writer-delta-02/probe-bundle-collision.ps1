$ErrorActionPreference = 'Stop'
$repo = (Get-Location).Path
$audit = Join-Path $repo 'deliveries/G7/local-corrections/independent-audit/attempt-20261012-r7-writer-delta-02'
$tempRoot = [IO.Path]::GetTempPath()
$fixture = Join-Path $tempRoot ('yor-r7-bundle-probe-' + [guid]::NewGuid().ToString('N'))
$clone = Join-Path $fixture 'repo'
New-Item -ItemType Directory -Path $fixture | Out-Null
& git clone --shared --no-checkout --quiet $repo $clone
if ($LASTEXITCODE -ne 0) { throw 'git clone failed' }
& git -C $clone -c core.longpaths=true checkout HEAD -- app
if ($LASTEXITCODE -ne 0) { throw 'could not materialize committed app tree in short isolated fixture' }
$releaseSource = Join-Path $repo 'scripts/release'
$releaseTarget = Join-Path $clone 'scripts/release'
New-Item -ItemType Directory -Force -Path $releaseTarget | Out-Null
Copy-Item -LiteralPath (Join-Path $releaseSource 'release-lib.mjs') -Destination $releaseTarget
Copy-Item -LiteralPath (Join-Path $releaseSource 'build-release-bundle.mjs') -Destination $releaseTarget
Copy-Item -LiteralPath (Join-Path $releaseSource 'rc6-policy.json') -Destination $releaseTarget
$policy = Get-Content -Raw -LiteralPath (Join-Path $releaseSource 'rc6-policy.json') | ConvertFrom-Json
$source = (& git -C $clone rev-parse HEAD).Trim()
$receiptRelative = $policy.deliveryRoot + '/bundle-receipt.json'
$receipt = Join-Path $clone ($receiptRelative.Replace('/', [IO.Path]::DirectorySeparatorChar))
$archive = Join-Path $clone ($policy.bundle.path.Replace('/', [IO.Path]::DirectorySeparatorChar))
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $receipt) | Out-Null
$original = [Text.Encoding]::UTF8.GetBytes("preserve this occupied receipt`n")
[IO.File]::WriteAllBytes($receipt, $original)
$buildOutput = & node 'scripts/release/build-release-bundle.mjs' --source-commit $source 2>&1
$buildExit = $LASTEXITCODE
$archiveExists = Test-Path -LiteralPath $archive
$receiptSame = [Convert]::ToBase64String([IO.File]::ReadAllBytes($receipt)) -ceq [Convert]::ToBase64String($original)
$result = [ordered]@{ fixtureRoot=$fixture; sourceCommit=$source; receiptPath=$receiptRelative; archivePath=$policy.bundle.path; exitCode=$buildExit; output=($buildOutput -join "`n"); occupiedReceiptPreserved=$receiptSame; archiveCreatedDespiteReceiptCollision=$archiveExists; archiveBytes=if($archiveExists){(Get-Item -LiteralPath $archive).Length}else{0} }
$result | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $audit 'bundle-collision-probe.json') -Encoding utf8
$result | ConvertTo-Json -Depth 4