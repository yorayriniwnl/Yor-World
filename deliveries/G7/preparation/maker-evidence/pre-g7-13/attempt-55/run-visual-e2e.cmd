@echo off
set "PATH=C:\Users\ayush\AppData\Local\Temp\yor-world-node-24.19.0\unpacked\node-v24.19.0-win-x64;%PATH%"
set "NEXT_PUBLIC_PRE_G7_13_EVIDENCE=1"
set "PRE_G7_13_EVIDENCE_MODE=1"
set "PRE_G7_13_EVIDENCE_DIR=C:\p13-iso\deliveries\G7\preparation\maker-evidence\pre-g7-13\attempt-55\visual-e2e"
set "B5_EVIDENCE_DIR=C:\p13-iso\deliveries\G7\preparation\maker-evidence\pre-g7-13\attempt-55\visual-e2e\playwright-results"
set "PORT=3133"
cd /d C:\p13-iso\app
node --version > "C:\p13-iso\deliveries\G7\preparation\maker-evidence\pre-g7-13\attempt-55\visual-e2e-node-version.txt" 2>&1
call pnpm exec playwright test tests/e2e/world-reference-composition.spec.ts > "C:\p13-iso\deliveries\G7\preparation\maker-evidence\pre-g7-13\attempt-55\visual-e2e.log" 2>&1
set "testExit=%ERRORLEVEL%"
echo exit=%testExit% > "C:\p13-iso\deliveries\G7\preparation\maker-evidence\pre-g7-13\attempt-55\visual-e2e.exit.txt"
exit /b %testExit%
