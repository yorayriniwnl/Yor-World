$ErrorActionPreference = 'Stop'
$evidenceRoot = 'C:\p28-maker-20261016\deliveries\G7\preparation\maker-evidence\pre-g7-28'
$repo = (& git -C 'C:\p28-maker-20261016' rev-parse --show-toplevel).Trim()
$outputPath = Join-Path $evidenceRoot 'evidence-inventory.json'

function Get-Sha256Hex([byte[]]$Bytes) {
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try { return ([BitConverter]::ToString($sha.ComputeHash($Bytes))).Replace('-', '').ToLowerInvariant() }
  finally { $sha.Dispose() }
}

function Get-LineEndingCounts([byte[]]$Bytes) {
  $crlf = 0
  $lf = 0
  for ($i = 0; $i -lt $Bytes.Length; $i++) {
    if ($Bytes[$i] -eq 10) {
      $lf++
      if ($i -gt 0 -and $Bytes[$i - 1] -eq 13) { $crlf++ }
    }
  }
  return [ordered]@{ lfBytes=$lf; crlfSequences=$crlf }
}

function Get-GitBlobBytes([string]$Oid) {
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = 'git'
  $psi.Arguments = '-C "' + $repo + '" cat-file blob ' + $Oid
  $psi.UseShellExecute = $false
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $process = New-Object System.Diagnostics.Process
  $process.StartInfo = $psi
  if (-not $process.Start()) { throw 'Failed to start git cat-file.' }
  $memory = New-Object System.IO.MemoryStream
  $process.StandardOutput.BaseStream.CopyTo($memory)
  $stderr = $process.StandardError.ReadToEnd()
  $process.WaitForExit()
  if ($process.ExitCode -ne 0) { throw "git cat-file failed for $Oid`: $stderr" }
  $bytes = $memory.ToArray()
  $memory.Dispose()
  $process.Dispose()
  return ,$bytes
}

$entries = @()
$files = Get-ChildItem -LiteralPath $evidenceRoot -File -Recurse -Force | Where-Object { $_.FullName -ne $outputPath } | Sort-Object FullName
foreach ($file in $files) {
  $relative = $file.FullName.Substring($repo.Length).TrimStart([char[]]@([char]92, [char]47)).Replace([char]92, '/')
  $raw = [System.IO.File]::ReadAllBytes($file.FullName)
  $blobId = (& git -C $repo hash-object -w "--path=$relative" -- $file.FullName).Trim()
  if ($LASTEXITCODE -ne 0) { throw "git hash-object failed for $relative" }
  $blob = Get-GitBlobBytes $blobId
  $entries += [ordered]@{
    path=$relative
    worktreeBytes=$raw.Length
    worktreeSha256=(Get-Sha256Hex $raw)
    worktreeLineEndings=(Get-LineEndingCounts $raw)
    gitBlobId=$blobId
    gitBlobBytes=$blob.Length
    gitBlobSha256=(Get-Sha256Hex $blob)
    gitBlobLineEndings=(Get-LineEndingCounts $blob)
  }
}
$record = [ordered]@{
  schemaVersion=1
  generatedAtUtc=(Get-Date).ToUniversalTime().ToString('o')
  scope='deliveries/G7/preparation/maker-evidence/pre-g7-28/'
  repositoryHead=(& git -C $repo rev-parse HEAD).Trim()
  repositoryBranch=(& git -C $repo branch --show-current).Trim()
  entryCount=$entries.Count
  inventorySelfExcluded='evidence-inventory.json is excluded to avoid a self-referential digest; all other regular files in the scoped evidence directory, including this generator, are inventoried.'
  method='For each path, worktree size/SHA-256 use raw filesystem bytes. gitBlobId is generated with git hash-object -w --path=<repo-relative-path>; gitBlob size/SHA-256 and line-ending counts are measured from git cat-file blob bytes, matching the canonical path-filtered object to stage/commit.'
  entries=$entries
}
$record | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $outputPath -Encoding utf8
Write-Output "Inventory written: $outputPath; entries=$($entries.Count)"
