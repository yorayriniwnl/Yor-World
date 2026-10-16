param([Parameter(Mandatory=$true)][string]$SourceRoot,[Parameter(Mandatory=$true)][string]$Name,[Parameter(Mandatory=$true)][string]$SourceCommit,[Parameter(Mandatory=$true)][string]$TemporaryAppTree,[Parameter(Mandatory=$true)][string]$EvidenceCommands)
$ErrorActionPreference='Stop'
$root=(Resolve-Path (Join-Path $SourceRoot 'app/.next')).Path
$files=Get-ChildItem -LiteralPath $root -Recurse -File -Force | Sort-Object FullName
$rows=@(foreach($file in $files) {
  $relative=$file.FullName.Substring($root.Length).TrimStart('\','/').Replace('\','/')
  $hash=(Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
  [ordered]@{path=$relative;bytes=$file.Length;sha256=$hash}
})
$totalBytes=0
foreach($row in $rows) { $totalBytes += [int64]$row['bytes'] }
$result=[ordered]@{
  schemaVersion=1;source=$Name;sourceCommit=$SourceCommit;temporaryAppTree=$TemporaryAppTree
  localOutputDirectory=$root;buildReceipt=($Name + '-build-01.receipt.json')
  fileCount=$rows.Count;totalBytes=$totalBytes
  inventory=$rows
  note='Local ignored .next output inventory. Files remain in the isolated source worktree and are not committed; no aggregate digest is asserted.'
}
$destination=Join-Path $EvidenceCommands ($Name + '-build-01-output-inventory.json')
[IO.File]::WriteAllText($destination,($result|ConvertTo-Json -Depth 7)+"`n",[Text.UTF8Encoding]::new($false))
Write-Output ($result | Select-Object schemaVersion,source,sourceCommit,temporaryAppTree,localOutputDirectory,buildReceipt,fileCount,totalBytes,note | ConvertTo-Json -Depth 4)