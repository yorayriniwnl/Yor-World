@echo off
set "PATH=C:\Users\ayush\AppData\Local\Temp\yor-world-node-24.19.0\unpacked\node-v24.19.0-win-x64;%PATH%"
set "NODE_PATH=C:\p13-iso\app\node_modules"
set "PORT=3133"
cd /d C:\p13-iso\app
node "..\deliveries\G7\preparation\maker-evidence\pre-g7-13\attempt-44\capture-state.cjs" > "C:\p13-iso\deliveries\G7\preparation\maker-evidence\pre-g7-13\attempt-44\capture.log" 2>&1
set "captureExit=%ERRORLEVEL%"
echo exit=%captureExit% > "C:\p13-iso\deliveries\G7\preparation\maker-evidence\pre-g7-13\attempt-44\capture.exit.txt"
exit /b %captureExit%


