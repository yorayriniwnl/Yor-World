param(
  [Parameter(Mandatory = $true)][ValidateSet('accepted-root-500', 'p25-donor-28fb')][string]$SourceName,
  [Parameter(Mandatory = $true)][string]$SourceRoot,
  [Parameter(Mandatory = $true)][string]$AttemptRoot
)

$ErrorActionPreference = 'Stop'
$sourceApp = Join-Path $SourceRoot 'app'
$outputRoot = Join-Path $sourceApp '.next'
$receiptPath = Join-Path (Join-Path $AttemptRoot 'commands') "$SourceName-build-01.receipt.json"
$buildState = Get-Content -Raw -LiteralPath $receiptPath | ConvertFrom-Json
$rows = @()
if (Test-Path -LiteralPath $outputRoot) {
  foreach ($file in (Get-ChildItem -LiteralPath $outputRoot -File -Recurse -Force | Sort-Object FullName)) {
    $relative = $file.FullName.Substring($outputRoot.TrimEnd('\').Length + 1).Replace('\', '/')
    $rows += [ordered]@{
      path = $relative
      bytes = $file.Length
      sha256 = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
    }
  }
}
$inventory = [ordered]@{
  schemaVersion = 1
  sourceName = $SourceName
  sourceCommit = $buildState.sourceCommit
  sourceRootTree = $buildState.sourceRootTree
  appTree = $buildState.appTree
  mirrorTree = $buildState.mirrorTree
  outputDirectory = [IO.Path]::GetFullPath($outputRoot)
  buildExitCode = $buildState.childExitCode
  runtimeQualified = $buildState.completeNodeRuntimeQualification
  fileCount = $rows.Count
  totalBytes = ($rows | Measure-Object -Property bytes -Sum).Sum
  aggregateDigest = $null
  aggregateDigestStatus = 'Not computed; file-by-file sizes and SHA-256 only.'
  files = $rows
}
$outPath = Join-Path (Join-Path $AttemptRoot 'commands') "$SourceName-build-output-inventory.json"
$inventory | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $outPath -Encoding UTF8
