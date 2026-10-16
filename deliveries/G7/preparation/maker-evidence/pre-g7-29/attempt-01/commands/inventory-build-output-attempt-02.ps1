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
$fileRows = @()
foreach ($file in (Get-ChildItem -LiteralPath $outputRoot -File -Recurse -Force | Sort-Object FullName)) {
  $relative = $file.FullName.Substring($outputRoot.TrimEnd('\').Length + 1).Replace('\', '/')
  $blobOutput = @(& git -C $SourceRoot hash-object -- $file.FullName)
  $blobExitCode = $LASTEXITCODE
  if ($blobExitCode -ne 0 -or $blobOutput.Count -ne 1) { throw "git hash-object failed for output file $($file.FullName)" }
  $fileRows += [ordered]@{
    path = $relative
    rawBytes = [long]$file.Length
    rawSha256 = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
    gitBlobId = $blobOutput[0].Trim()
  }
}
$totalBytes = [long](($fileRows | ForEach-Object { [long]$_.rawBytes } | Measure-Object -Sum).Sum)
if ($fileRows.Count -eq 0) { $totalBytes = 0 }
$inventory = [ordered]@{
  schemaVersion = 1
  sourceName = $SourceName
  sourceCommit = $buildState.sourceCommit
  sourceRootTree = $buildState.sourceRootTree
  appTree = $buildState.appTree
  mirrorTree = $buildState.mirrorTree
  outputDirectory = [IO.Path]::GetFullPath($outputRoot)
  buildChildExitCode = $buildState.childExitCode
  buildFormalStatus = 'INDETERMINATE: persisted child exit code is null; stdout indicates normal successful completion.'
  runtimeQualified = $buildState.completeNodeRuntimeQualification
  fileCount = $fileRows.Count
  totalBytes = $totalBytes
  aggregateDigest = $null
  aggregateDigestStatus = 'Not computed; file-by-file sizes, SHA-256, and raw Git blob IDs only.'
  files = $fileRows
}
$outPath = Join-Path (Join-Path $AttemptRoot 'commands') "$SourceName-build-output-inventory-attempt-02.json"
$inventory | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $outPath -Encoding UTF8
