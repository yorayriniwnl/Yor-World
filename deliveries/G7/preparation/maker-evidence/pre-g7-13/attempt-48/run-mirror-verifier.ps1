$nodeExe = 'C:\Users\ayush\AppData\Local\Temp\yor-world-node-24.19.0\unpacked\node-v24.19.0-win-x64\node.exe'
$scriptPath = 'C:\p13-iso\deliveries\G7\preparation\maker-evidence\pre-g7-13\attempt-48\verify-mirror.mjs'
$logPath = 'C:\p13-iso\deliveries\G7\preparation\maker-evidence\pre-g7-13\attempt-48\mirror-verification.log'
$exitPath = 'C:\p13-iso\deliveries\G7\preparation\maker-evidence\pre-g7-13\attempt-48\mirror-verification.exit.txt'
& $nodeExe $scriptPath *> $logPath
$exitCode = $LASTEXITCODE
Set-Content -LiteralPath $exitPath -Value $exitCode
exit $exitCode

