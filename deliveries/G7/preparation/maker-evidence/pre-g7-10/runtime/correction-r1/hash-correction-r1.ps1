param(
  [switch]$Verify
)

$ErrorActionPreference = 'Stop'
$correctionRoot = $PSScriptRoot
$runtimeRoot = Split-Path -Parent $correctionRoot
$manifestPath = Join-Path $correctionRoot 'SHA256SUMS.txt'
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

$files = @(
  Get-ChildItem -LiteralPath $correctionRoot -Recurse -File |
    Where-Object { $_.FullName -ne $manifestPath }
)
$files += Get-Item -LiteralPath (Join-Path $runtimeRoot 'correction-r1-development-browser-chain.mjs')
$files += Get-Item -LiteralPath (Join-Path $runtimeRoot 'correction-r1-production-browser-chain.mjs')

$lines = @(
  foreach ($file in $files) {
    $relativePath = $file.FullName.Substring($runtimeRoot.Length).TrimStart('\').Replace('\', '/')
    $text = [System.IO.File]::ReadAllText($file.FullName)
    $canonicalText = $text.Replace("`r`n", "`n").Replace("`r", "`n")
    $bytes = $utf8NoBom.GetBytes($canonicalText)
    $sha = [System.Security.Cryptography.SHA256]::Create()
    $digest = [System.BitConverter]::ToString($sha.ComputeHash($bytes)).Replace('-', '').ToLowerInvariant()
    $sha.Dispose()
    '{0}  {1}' -f $digest, $relativePath
  }
)
$lines = @($lines | Sort-Object { ($_ -split '  ', 2)[1] })

if ($Verify) {
  if (-not (Test-Path -LiteralPath $manifestPath)) {
    Write-Error 'SHA256SUMS.txt is missing.'
    exit 1
  }
  $expected = @(Get-Content -LiteralPath $manifestPath)
  if ($expected.Count -ne $lines.Count -or (Compare-Object -ReferenceObject $expected -DifferenceObject $lines)) {
    Write-Error 'Correction evidence hashes do not match SHA256SUMS.txt.'
    exit 1
  }
  Write-Output ('PASS: verified {0} correction evidence files using UTF-8/LF-normalized content.' -f $lines.Count)
  exit 0
}

[System.IO.File]::WriteAllLines($manifestPath, [string[]]$lines, $utf8NoBom)
Write-Output ('Wrote SHA256SUMS.txt for {0} correction evidence files using UTF-8/LF-normalized content.' -f $lines.Count)
