@echo off
set "PATH=C:\Users\ayush\AppData\Local\Temp\yor-world-node-24.19.0\unpacked\node-v24.19.0-win-x64;%PATH%"
set "NEXT_PUBLIC_PRE_G7_13_EVIDENCE=1"
cd /d C:\p13-iso\app
call pnpm build > "C:\p13-iso\deliveries\G7\preparation\maker-evidence\pre-g7-13\attempt-37\build-retry\build.log" 2>&1
set "buildExit=%ERRORLEVEL%"
echo exit=%buildExit% > "C:\p13-iso\deliveries\G7\preparation\maker-evidence\pre-g7-13\attempt-37\build-retry\build.exit.txt"
exit /b %buildExit%
