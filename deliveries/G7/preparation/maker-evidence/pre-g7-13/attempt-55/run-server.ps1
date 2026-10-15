$ErrorActionPreference = 'Stop'
$attemptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = (Resolve-Path (Join-Path $attemptDir '..\..\..\..\..\..')).Path
$appDir = Join-Path $repoRoot 'app'
$nodeExe = 'C:\Users\ayush\AppData\Local\Temp\yor-world-node-24.19.0\unpacked\node-v24.19.0-win-x64\node.exe'
$port = 3133

$existing = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue
if ($existing) {
  $owners = @($existing | Select-Object -ExpandProperty OwningProcess -Unique) -join ','
  throw "Port $port already has a listener: $owners"
}

$process = Start-Process -FilePath $nodeExe `
  -ArgumentList @('node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', "$port") `
  -WorkingDirectory $appDir `
  -WindowStyle Hidden `
  -RedirectStandardOutput (Join-Path $attemptDir 'server.log') `
  -RedirectStandardError (Join-Path $attemptDir 'server.err.log') `
  -PassThru
$process.Id | Set-Content -LiteralPath (Join-Path $attemptDir 'server.pid.txt') -NoNewline
"pid=$($process.Id) port=$port node=$nodeExe" | Set-Content -LiteralPath (Join-Path $attemptDir 'server-start.txt')

$ready = $false
for ($i = 0; $i -lt 60; $i++) {
  Start-Sleep -Seconds 1
  if (Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue) {
    $ready = $true
    break
  }
  if ($process.HasExited) { break }
}
if (-not $ready) {
  "server did not become ready; exited=$($process.HasExited)" | Set-Content -LiteralPath (Join-Path $attemptDir 'server-ready.txt')
  Get-Content -LiteralPath (Join-Path $attemptDir 'server.log') -ErrorAction SilentlyContinue
  Get-Content -LiteralPath (Join-Path $attemptDir 'server.err.log') -ErrorAction SilentlyContinue
  exit 1
}
"ready=true url=http://127.0.0.1:$port/" | Set-Content -LiteralPath (Join-Path $attemptDir 'server-ready.txt')
Get-Content -LiteralPath (Join-Path $attemptDir 'server.log') -Tail 20
