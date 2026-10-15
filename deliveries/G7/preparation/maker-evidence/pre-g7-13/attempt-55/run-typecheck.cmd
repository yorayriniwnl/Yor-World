@echo off
set "PATH=C:\Users\ayush\AppData\Local\Temp\yor-world-node-24.19.0\unpacked\node-v24.19.0-win-x64;%PATH%"
cd /d C:\p13-iso\app
node --version > "C:\p13-iso\deliveries\G7\preparation\maker-evidence\pre-g7-13\attempt-55\typecheck-node-version.txt" 2>&1
call pnpm typecheck > "C:\p13-iso\deliveries\G7\preparation\maker-evidence\pre-g7-13\attempt-55\typecheck.log" 2>&1
set "checkExit=%ERRORLEVEL%"
echo exit=%checkExit% > "C:\p13-iso\deliveries\G7\preparation\maker-evidence\pre-g7-13\attempt-55\typecheck.exit.txt"
exit /b %checkExit%
