$ErrorActionPreference = 'Stop'
$w2Root = $PSScriptRoot
$w2Scratch = Join-Path ([IO.Path]::GetTempPath()) ('yor-w2-r2-' + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $w2Scratch | Out-Null
Copy-Item -LiteralPath (Join-Path $w2Root 'playback/package.json') -Destination $w2Scratch
$w2Lock = Join-Path $w2Root 'playback/package-lock.json'
if (Test-Path -LiteralPath $w2Lock) { Copy-Item -LiteralPath $w2Lock -Destination $w2Scratch }
Push-Location $w2Scratch
try {
    if (Test-Path -LiteralPath (Join-Path $w2Scratch 'package-lock.json')) {
        & npm.cmd ci --ignore-scripts --no-fund --no-audit
    } else {
        & npm.cmd install --ignore-scripts --no-fund --no-audit
    }
    if ($LASTEXITCODE -ne 0) { throw "npm install failed: $LASTEXITCODE" }
} finally { Pop-Location }
Copy-Item -LiteralPath (Join-Path $w2Scratch 'package-lock.json') -Destination (Join-Path $w2Root 'playback/package-lock.json')
Set-Content -Encoding ascii -LiteralPath (Join-Path $w2Root 'evidence/r2/dependency-temp-path.txt') -Value $w2Scratch
$vendorRoot = Join-Path $w2Root 'playback/vendor'
Copy-Item -LiteralPath (Join-Path $w2Scratch 'node_modules/three/LICENSE') -Destination (Join-Path $vendorRoot 'THREE-LICENSE.txt')
Write-Output "W2_DEPENDENCIES=$w2Scratch"
