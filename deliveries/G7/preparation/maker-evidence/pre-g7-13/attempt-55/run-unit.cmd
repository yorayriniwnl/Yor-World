@echo off
set "PATH=C:\Users\ayush\AppData\Local\Temp\yor-world-node-24.19.0\unpacked\node-v24.19.0-win-x64;%PATH%"
cd /d C:\p13-iso\app
node --version > "C:\p13-iso\deliveries\G7\preparation\maker-evidence\pre-g7-13\attempt-55\unit-node-version.txt" 2>&1
call pnpm test:unit > "C:\p13-iso\deliveries\G7\preparation\maker-evidence\pre-g7-13\attempt-55\unit.log" 2>&1
set "testExit=%ERRORLEVEL%"
echo exit=%testExit% > "C:\p13-iso\deliveries\G7\preparation\maker-evidence\pre-g7-13\attempt-55\unit.exit.txt"
exit /b %testExit%
