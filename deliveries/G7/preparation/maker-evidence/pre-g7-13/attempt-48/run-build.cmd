@echo off
set "PATH=C:\Users\ayush\AppData\Local\Temp\yor-world-node-24.19.0\unpacked\node-v24.19.0-win-x64;%PATH%"
set "NEXT_PUBLIC_PRE_G7_13_EVIDENCE=1"
cd /d C:\p13-iso\app
node --version > "C:\p13-iso\deliveries\G7\preparation\maker-evidence\pre-g7-13\attempt-48\node-version.txt" 2>&1
call pnpm build > "C:\p13-iso\deliveries\G7\preparation\maker-evidence\pre-g7-13\attempt-48\build.log" 2>&1
set "buildExit=%ERRORLEVEL%"
echo exit=%buildExit% > "C:\p13-iso\deliveries\G7\preparation\maker-evidence\pre-g7-13\attempt-48\build.exit.txt"
exit /b %buildExit%






