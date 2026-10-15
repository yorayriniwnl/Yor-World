$ErrorActionPreference = 'Stop'
$attemptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$nodeExe = 'C:\Users\ayush\AppData\Local\Temp\yor-world-node-24.19.0\unpacked\node-v24.19.0-win-x64\node.exe'
$env:NODE_PATH = 'C:\p13-iso\app\node_modules'
$env:PORT = '3133'
$runId = 'corrected-02'
$env:CAPTURE_RUN_ID = $runId
$script = Join-Path $attemptDir 'capture-state.cjs'
$stdout = Join-Path $attemptDir "capture-$runId.log"
$stderr = Join-Path $attemptDir "capture-$runId.stderr.log"
$exitFile = Join-Path $attemptDir "capture-$runId.exit.txt"
& $nodeExe $script 1> $stdout 2> $stderr
$code = $LASTEXITCODE
"exit=$code" | Set-Content -LiteralPath $exitFile -NoNewline
exit $code
