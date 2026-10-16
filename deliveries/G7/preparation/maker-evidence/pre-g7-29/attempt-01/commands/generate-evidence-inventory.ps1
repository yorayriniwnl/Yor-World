param(
  [Parameter(Mandatory = $true)][string]$RepoRoot,
  [Parameter(Mandatory = $true)][string]$EvidenceRoot
)

$ErrorActionPreference = 'Stop'
$inventoryPath = Join-Path $EvidenceRoot 'evidence-inventory.json'
$repoPrefix = (Resolve-Path -LiteralPath $RepoRoot).Path.TrimEnd('\') + '\'
$rows = @()
foreach ($file in (Get-ChildItem -LiteralPath $EvidenceRoot -File -Recurse -Force | Where-Object FullName -ne $inventoryPath | Sort-Object FullName)) {
  $relativeRepoPath = $file.FullName.Substring($repoPrefix.Length).Replace('\', '/')
  $gitBlob = (& git -C $RepoRoot hash-object "--path=$relativeRepoPath" $file.FullName).Trim()
  if ($LASTEXITCODE -ne 0) { throw "git hash-object failed for $relativeRepoPath" }
  $rows += [ordered]@{
    path = $relativeRepoPath
    rawBytes = $file.Length
    rawSha256 = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
    pathFilteredGitBlobId = $gitBlob
  }
}
$inventory = [ordered]@{
  schemaVersion = 1
  generatedAtUtc = [DateTime]::UtcNow.ToString('o')
  evidenceRoot = (Resolve-Path -LiteralPath $EvidenceRoot).Path
  generator = 'attempt-01/commands/generate-evidence-inventory.ps1'
  generatorHashing = 'Each file has raw working-tree byte count and SHA-256 plus the path-filtered Git blob ID from `git hash-object --path`; no aggregate digest is computed. evidence-inventory.json is self-excluded to avoid a self-referential hash and is separately hashed after generation.'
  fileCount = $rows.Count
  aggregateDigest = $null
  files = $rows
}
$inventory | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $inventoryPath -Encoding UTF8
