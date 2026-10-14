@echo off
set "PATH=C:\Users\ayush\AppData\Local\Temp\yor-world-node-24.19.0\unpacked\node-v24.19.0-win-x64;%PATH%"
set "PRE_G7_13_EVIDENCE_MODE=1"
set "PRE_G7_13_EVIDENCE_DIR=C:\p13-iso\deliveries\G7\preparation\maker-evidence\pre-g7-13\attempt-38\preview"
cd /d C:\p13-iso\app
call pnpm exec playwright test tests/e2e/world-reference-composition.spec.ts --project=chrome --grep "opening desktop room|fresh phone-sized 390x844" --reporter=line > "C:\p13-iso\deliveries\G7\preparation\maker-evidence\pre-g7-13\attempt-38\preview\visual-preview.log" 2>&1
set "testExit=%ERRORLEVEL%"
echo exit=%testExit% > "C:\p13-iso\deliveries\G7\preparation\maker-evidence\pre-g7-13\attempt-38\preview\visual-preview.exit.txt"
exit /b %testExit%
