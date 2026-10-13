param([string]$Repository,[string]$AuditRoot)
$ErrorActionPreference='Stop'
$repo=(Resolve-Path -LiteralPath $Repository).Path
$audit=(Resolve-Path -LiteralPath $AuditRoot).Path
$wt=Join-Path $audit '.work\replay-sequential'
$log=Join-Path $audit 'evidence\logs\fin16-local-20261011-0615-sequential-replay.log'
$base='f62a43c5e71c00dcb89e28275ea81d842167db80'
$candidate='9188b413d37da0ec3381b5430e25dc375a45bb18'
$patches=@(
  [pscustomobject]@{Name='R3';Path=Join-Path $repo 'deliveries\FINISH-C1-R3\source.patch';Sha='e1be558f734378fe69659dcf8271c4e5e57d87fbfbdca1582823be103082dc5d';Bytes=157355},
  [pscustomobject]@{Name='R5';Path=Join-Path $repo 'deliveries\FINISH-C1-R5\source.patch';Sha='d6ad3359fa628067ab228eccc52f25d0604ddddb42813d7023e6a809cf60d83d';Bytes=34904},
  [pscustomobject]@{Name='R6';Path=Join-Path $repo 'deliveries\FINISH-C1-R6\source.patch';Sha='17ae6aaab7910546d3527feec26926d8d1fd604e3bc60e2ae0eb9f549f7fc2a6';Bytes=6475}
)
$utf8=New-Object System.Text.UTF8Encoding($false)
$lines=[System.Collections.Generic.List[string]]::new()
$lines.Add('AUDIT: exact candidate R3/R5/R6 sequential replay')
$lines.Add("CANDIDATE=$candidate")
$lines.Add("BASE=$base")
$lines.Add("STARTED_AT_UTC=$([DateTimeOffset]::UtcNow.ToString('o'))")
function RunGit([string]$WorkDir,[string[]]$GitArgs){
  $display='git -C "'+$WorkDir+'" '+($GitArgs -join ' ')
  $lines.Add("COMMAND: $display")
  $result=& git -C $WorkDir @GitArgs 2>&1
  $exit=$LASTEXITCODE
  foreach($item in $result){$lines.Add([string]$item)}
  $lines.Add("EXIT_CODE=$exit")
  if($exit -ne 0){throw "git failed ($exit): $display"}
  return ,$result
}
$null=RunGit $repo @('worktree','add','--detach','--no-checkout',$wt,$base)
$null=RunGit $wt @('sparse-checkout','init','--cone')
$null=RunGit $wt @('sparse-checkout','set','app')
$null=RunGit $wt @('checkout','--detach',$base)
$null=RunGit $wt @('config','core.autocrlf','false')
$head=(RunGit $wt @('rev-parse','HEAD')) -join ''
$appTree=(RunGit $wt @('rev-parse','HEAD:app')) -join ''
$clean=(RunGit $wt @('status','--porcelain')) -join ''
$lines.Add("BASE_HEAD=$head")
$lines.Add("BASE_APP_TREE=$appTree")
$lines.Add("BASE_STATUS_CLEAN=$([string]::IsNullOrEmpty($clean))")
if($head -ne $base -or $appTree -ne '42ea29ec235225046a75959eb19eb386ac2f821d' -or -not [string]::IsNullOrEmpty($clean)){throw 'Base binding/clean check failed'}
$pathSets=@{}
foreach($patch in $patches){
  $hash=(Get-FileHash -LiteralPath $patch.Path -Algorithm SHA256).Hash.ToLowerInvariant()
  $size=(Get-Item -LiteralPath $patch.Path).Length
  $lines.Add("PATCH $($patch.Name) PATH=$($patch.Path) SHA256=$hash BYTES=$size EXPECTED_SHA=$($patch.Sha) EXPECTED_BYTES=$($patch.Bytes)")
  if($hash -ne $patch.Sha -or $size -ne $patch.Bytes){throw "Patch identity failed $($patch.Name)"}
  $numstat=RunGit $wt @('apply','--numstat',$patch.Path)
  $names=@()
  foreach($line in $numstat){if([string]$line -match "^\d+\s+\d+\s+(.+)$"){$names+= $Matches[1]}}
  $pathSets[$patch.Name]=$names
  $null=RunGit $wt @('apply','--check','--whitespace=error',$patch.Path)
  $null=RunGit $wt @('apply','--whitespace=error',$patch.Path)
  $lines.Add("PATCH_PATHS_$($patch.Name)=$($names -join ';')")
  if($patch.Name -eq 'R6'){
    $expected=@('app/src/features/world/AssetLoader.ts','app/tests/unit/world/completion-essential-loader.test.ts')
    if(@(Compare-Object $names $expected).Count -ne 0 -or $names.Count -ne 2){throw 'R6 patch path allowlist mismatch'}
  }
}
$null=RunGit $wt @('diff','--check')
$tracked=@((RunGit $wt @('diff','--name-only')) | ForEach-Object { [string]$_ } | Where-Object {$_ -ne ''})
$untracked=@((RunGit $wt @('ls-files','--others','--exclude-standard')) | ForEach-Object { [string]$_ } | Where-Object {$_ -ne ''})
$actual=@($tracked+$untracked | Sort-Object -Unique)
$allPatchPaths=@($pathSets['R3']+$pathSets['R5']+$pathSets['R6'] | Sort-Object -Unique)
$lines.Add("FINAL_CHANGED_COUNT=$($actual.Count)")
$lines.Add("PATCH_UNION_COUNT=$($allPatchPaths.Count)")
$lines.Add("FINAL_EXACT_PATCH_UNION=$(@(Compare-Object $actual $allPatchPaths).Count -eq 0)")
$lines.Add("FINAL_CHANGED_PATHS=$($actual -join ';')")
if(@(Compare-Object $actual $allPatchPaths).Count -ne 0 -or $actual.Count -ne 28){throw 'Final changed path set not exact'}
$lines.Add("FINISHED_AT_UTC=$([DateTimeOffset]::UtcNow.ToString('o'))")
$lines.Add('REPLAY_STATUS=PASS')
[System.IO.File]::WriteAllLines($log,$lines,$utf8)
Write-Output "REPLAY_STATUS=PASS LOG=$log WORKTREE=$wt"
