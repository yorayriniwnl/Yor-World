param(
  [string]$RepositoryRoot = 'C:\p30-maker-20261016',
  [string]$EvidenceRelative = 'deliveries/G7/preparation/maker-evidence/pre-g7-30',
  [string]$AcceptedWorktree = 'D:\p30-source-500-install-02',
  [string]$DonorWorktree = 'D:\p30-source-28fb'
)

$ErrorActionPreference = 'Stop'
$RepositoryRoot = (Resolve-Path -LiteralPath $RepositoryRoot).Path
$EvidenceRoot = (Resolve-Path -LiteralPath (Join-Path $RepositoryRoot $EvidenceRelative)).Path
$InventoryPath = Join-Path $EvidenceRoot 'evidence-inventory.json'
$rows = [System.Collections.Generic.List[object]]::new()

function Get-BlobId([string]$Repo, [string]$RelativePath, [string]$FilePath) {
  $blob = (& git -C $Repo hash-object "--path=$RelativePath" -- $FilePath)
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace(($blob -join ''))) {
    throw "git hash-object failed for $RelativePath"
  }
  return ($blob -join '').Trim()
}

function Add-InventoryFile([string]$Scope, [string]$RelativePath, [string]$FilePath, [string]$GitRepo, [string]$GitRelativePath, [string]$SourceCommit) {
  $item = Get-Item -LiteralPath $FilePath
  $rawHash = (Get-FileHash -LiteralPath $FilePath -Algorithm SHA256).Hash.ToLowerInvariant()
  $blob = Get-BlobId $GitRepo $GitRelativePath $FilePath
  $rows.Add([pscustomobject]@{
    scope = $Scope
    relativePath = $RelativePath.Replace('\', '/')
    sourceCommit = $SourceCommit
    rawBytes = [long]$item.Length
    rawSha256 = $rawHash
    gitBlob = $blob
  })
}

$evidenceFiles = Get-ChildItem -LiteralPath $EvidenceRoot -File -Recurse | Where-Object { $_.FullName -ne $InventoryPath }
foreach ($file in $evidenceFiles) {
  $relative = $file.FullName.Substring($EvidenceRoot.Length).TrimStart('\', '/')
  $repoRelative = "$EvidenceRelative/$($relative.Replace('\', '/'))"
  Add-InventoryFile 'p30-evidence' $relative $file.FullName $RepositoryRoot $repoRelative '1ead55e4cb171d746d754328fc9ace310d4acba5'
}

foreach ($source in @(
  [pscustomobject]@{scope='accepted-build-output';worktree=$AcceptedWorktree;commit='500d10fa5901be48d4ff877e608d65ba0e271bb9'},
  [pscustomobject]@{scope='donor-build-output';worktree=$DonorWorktree;commit='28fb4187445206bcc62e2ef0ae2678e44ac6604b'}
)) {
  $appRoot = Join-Path $source.worktree 'app'
  $nextRoot = Join-Path $appRoot '.next'
  if (-not (Test-Path -LiteralPath $nextRoot -PathType Container)) { throw "Missing retained build output $nextRoot" }
  foreach ($file in (Get-ChildItem -LiteralPath $nextRoot -File -Recurse)) {
    $relative = $file.FullName.Substring($nextRoot.Length).TrimStart('\', '/')
    $gitRelative = ".next/$($relative.Replace('\', '/'))"
    Add-InventoryFile $source.scope $relative $file.FullName $appRoot $gitRelative $source.commit
  }
}

$rows.Sort([System.Comparison[object]]{
  param($left, $right)
  $leftKey = "$($left.scope)/$($left.relativePath)"
  $rightKey = "$($right.scope)/$($right.relativePath)"
  return [System.StringComparer]::Ordinal.Compare($leftKey, $rightKey)
})

$manifest = [pscustomobject]@{
  schemaVersion = 1
  generatedUtc = (Get-Date).ToUniversalTime().ToString('o')
  generator = "$EvidenceRelative/attempt-01/create-final-inventory.ps1"
  ordering = 'Ordinal ascending by scope + forward-slash + relativePath; case-sensitive.'
  byteEncoding = 'UTF-8 without BOM; one trailing LF.'
  scopes = @(
    [pscustomobject]@{name='p30-evidence';root=$EvidenceRelative;selfExcluded='evidence-inventory.json'},
    [pscustomobject]@{name='accepted-build-output';root="$AcceptedWorktree/app/.next";sourceCommit='500d10fa5901be48d4ff877e608d65ba0e271bb9'},
    [pscustomobject]@{name='donor-build-output';root="$DonorWorktree/app/.next";sourceCommit='28fb4187445206bcc62e2ef0ae2678e44ac6604b'}
  )
  rowCount = $rows.Count
  rows = $rows.ToArray()
}

$serialized = $manifest | ConvertTo-Json -Depth 6
[System.IO.File]::WriteAllText($InventoryPath, $serialized + "`n", [System.Text.UTF8Encoding]::new($false))
Write-Output "inventory=$InventoryPath"
Write-Output "rows=$($rows.Count)"
Write-Output "evidenceFiles=$(@($rows | Where-Object scope -eq 'p30-evidence').Count)"
Write-Output "acceptedNextFiles=$(@($rows | Where-Object scope -eq 'accepted-build-output').Count)"
Write-Output "donorNextFiles=$(@($rows | Where-Object scope -eq 'donor-build-output').Count)"
Write-Output "inventorySha256=$((Get-FileHash -LiteralPath $InventoryPath -Algorithm SHA256).Hash.ToLowerInvariant())"
