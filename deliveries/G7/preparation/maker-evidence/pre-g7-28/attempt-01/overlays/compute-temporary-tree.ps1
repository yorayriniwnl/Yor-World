param([Parameter(Mandatory=$true)][string]$SourceRoot,[Parameter(Mandatory=$true)][string]$Name,[Parameter(Mandatory=$true)][string]$EvidenceRoot)
$ErrorActionPreference='Stop'
$sourceRoot=(Resolve-Path $SourceRoot).Path
$indexPath=Join-Path $env:TEMP ('p28-temp-index-' + [guid]::NewGuid().ToString('N'))
$oldIndex=$env:GIT_INDEX_FILE
try {
  $env:GIT_INDEX_FILE=$indexPath
  & git -C $sourceRoot read-tree HEAD
  if ($LASTEXITCODE -ne 0) { throw 'git read-tree failed' }
  & git -C $sourceRoot add -f -- app/src/features/world/WorldRuntime.ts app/src/features/world/P28RenderAttribution.ts app/tests/e2e/p28-render-attribution.spec.ts app/p28-render-attribution.config.ts
  if ($LASTEXITCODE -ne 0) { throw 'git add failed for temporary tree index' }
  $rootTree=(& git -C $sourceRoot write-tree).Trim()
  if ($LASTEXITCODE -ne 0) { throw 'git write-tree failed' }
  $rootId=(& git -C $sourceRoot rev-parse HEAD).Trim()
  $appEntry=(& git -C $sourceRoot ls-tree $rootTree app).Trim()
  $mirrorEntry=(& git -C $sourceRoot ls-tree $rootTree yorayriniwnl.in).Trim()
  $appTree=($appEntry -split '\s+')[2]
  $mirrorTree=($mirrorEntry -split '\s+')[2]
  $result=[ordered]@{source=$Name;sourceCommit=$rootId;temporaryRootTree=$rootTree;temporaryAppTree=$appTree;temporaryMirrorTree=$mirrorTree;trackedAndUntrackedOverlayPaths=@('app/src/features/world/WorldRuntime.ts','app/src/features/world/P28RenderAttribution.ts','app/tests/e2e/p28-render-attribution.spec.ts','app/p28-render-attribution.config.ts')}
  $destination=Join-Path $EvidenceRoot ($Name + '.temporary-tree.json')
  [IO.File]::WriteAllText($destination,($result|ConvertTo-Json -Depth 5)+"`n",[Text.UTF8Encoding]::new($false))
  Write-Output ($result|ConvertTo-Json -Depth 5)
} finally {
  if ($null -eq $oldIndex) { Remove-Item Env:GIT_INDEX_FILE -ErrorAction SilentlyContinue } else { $env:GIT_INDEX_FILE=$oldIndex }
  if (Test-Path -LiteralPath $indexPath) { Remove-Item -LiteralPath $indexPath -Force }
}