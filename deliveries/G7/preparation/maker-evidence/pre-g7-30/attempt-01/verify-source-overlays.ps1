Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$e='C:\p30-maker-20261016\deliveries\G7\preparation\maker-evidence\pre-g7-30\attempt-01'
$repo='C:\p30-maker-20261016'
$bind=Get-Content (Join-Path $e 'inputs\p28\frozen-artifact-bindings.json') -Raw | ConvertFrom-Json
$pairs=@(
  @{root='D:\p30-source-500';name='accepted-root-500';commit='500d10fa5901be48d4ff877e608d65ba0e271bb9';app='ba0b709192367e1d12a796618f97801a8fcd5a70';mirror='34f7ac0731984e50cbb06cf02039911ba65f59a9'},
  @{root='D:\p30-source-28fb';name='p25-donor-28fb';commit='28fb4187445206bcc62e2ef0ae2678e44ac6604b';app='f68074b41b8d2eea228d7fa964d3db8358a9fea4';mirror='be03089ce9abae0f487bd829b4f24ddac9bb3dfd'}
)
$results=New-Object 'System.Collections.Generic.List[object]'
foreach($pair in $pairs){
  $root=$pair.root
  $head=(git -C $root rev-parse HEAD).Trim()
  $baseApp=(git -C $root rev-parse 'HEAD:app').Trim()
  $baseMirror=(git -C $root rev-parse 'HEAD:yorayriniwnl.in').Trim()
  if($head -ne $pair.commit -or $baseApp -ne $pair.app -or $baseMirror -ne $pair.mirror){throw "Base identity mismatch for $($pair.name)"}
  git -C $root add -- app/src/features/world/WorldRuntime.ts app/src/features/world/P28RenderAttribution.ts app/p28-render-attribution.config.ts app/tests/e2e/p28-render-attribution.spec.ts
  if($LASTEXITCODE -ne 0){throw "Could not stage temporary P28 overlay for $($pair.name)"}
  $rootTree=(git -C $root write-tree).Trim()
  $appTemp=(git -C $root rev-parse ($rootTree+':app')).Trim()
  $worldBlob=(git -C $root rev-parse ':app/src/features/world/WorldRuntime.ts').Trim()
  $bound=$bind.sources | Where-Object { $_.name -eq $pair.name } | Select-Object -First 1
  if($null -eq $bound){throw "Missing P28 source binding for $($pair.name)"}
  $expectedTemp=[string]$bound.temporaryAppTree
  $expectedBlob=[string]$bound.runtimeOverlay.pathFilteredGitBlob
  $observerSha=(Get-FileHash (Join-Path $e 'inputs\p28\P28RenderAttribution.ts') -Algorithm SHA256).Hash.ToLowerInvariant()
  $result=[ordered]@{
    name=$pair.name
    worktree=$root
    sourceCommit=$head
    expectedSourceCommit=$pair.commit
    baseAppTree=$baseApp
    expectedAppTree=$pair.app
    baseMirrorTree=$baseMirror
    expectedMirrorTree=$pair.mirror
    temporaryRootTree=$rootTree
    temporaryAppTree=$appTemp
    expectedP28TemporaryAppTree=$expectedTemp
    worldRuntimeStagedBlob=$worldBlob
    expectedP28WorldRuntimePathFilteredBlob=$expectedBlob
    sourceCommitExact=($head -eq $pair.commit)
    baseAppExact=($baseApp -eq $pair.app)
    baseMirrorExact=($baseMirror -eq $pair.mirror)
    overlayExact=($appTemp -eq $expectedTemp -and $worldBlob -eq $expectedBlob)
    observerRawSha256=$observerSha
  }
  if(-not $result.sourceCommitExact -or -not $result.baseAppExact -or -not $result.baseMirrorExact -or -not $result.overlayExact){throw "Overlay identity mismatch for $($pair.name)"}
  $results.Add($result)
}
$manifest=[ordered]@{schemaVersion=1;capturedUtc=[DateTime]::UtcNow.ToString('o');p28BindingCommit='7b1729d52b076b4643017eceec302f4654714f0a';p28BindingsGitBlob=(git -C $repo rev-parse '7b1729d52b076b4643017eceec302f4654714f0a:deliveries/G7/preparation/maker-evidence/pre-g7-28/attempt-01/frozen-artifact-bindings.json').Trim();sources=@($results.ToArray())}
[IO.File]::WriteAllText((Join-Path $e 'source-overlay-identity.json'),(ConvertTo-Json -InputObject $manifest -Depth 12)+"`n",(New-Object System.Text.UTF8Encoding($false)))
Write-Output (ConvertTo-Json -InputObject $manifest -Depth 12)