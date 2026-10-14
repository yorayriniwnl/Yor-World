@echo off
setlocal
set "APP=C:\Users\ayush\COddexxxxxxxxxxxxxxxx\_worktrees\pre-g7-13\app"
set "EVIDENCE=%~dp0desktop-focused"
set "LOG=%~dp0desktop-focused.log"
set "PORT=3161"
set "EXPECTED_BUILD_ID=qGpC1825_zT8NNCqLXGxo"
set "PRE_G7_13_EVIDENCE_MODE=1"
set "PRE_G7_13_EVIDENCE_DIR=%EVIDENCE%"
set "PRE_G7_13_EXPECTED_EVIDENCE_DIR=%EVIDENCE%"
set "PRE_G7_13_REQUIRE_ISOLATED_EVIDENCE=1"
set "B5_EVIDENCE_DIR=%EVIDENCE%\playwright-results"
if not exist "%EVIDENCE%\screenshots" mkdir "%EVIDENCE%\screenshots"
if not exist "%EVIDENCE%\measurements" mkdir "%EVIDENCE%\measurements"
if not exist "%B5_EVIDENCE_DIR%" mkdir "%B5_EVIDENCE_DIR%"
cd /d "%APP%" || exit /b 2
set /p BUILD_ID=<.next\BUILD_ID
>"%LOG%" echo COMMAND=pnpm exec playwright test tests/e2e/world-reference-composition.spec.ts --project=chrome --grep=desktop --workers=1
>>"%LOG%" echo PORT=%PORT%
>>"%LOG%" echo EXPECTED_BUILD_ID=%EXPECTED_BUILD_ID%
>>"%LOG%" echo SERVED_BUILD_ID=%BUILD_ID%
if not "%BUILD_ID%"=="%EXPECTED_BUILD_ID%" exit /b 3
>>"%LOG%" echo PRE_G7_13_EVIDENCE_MODE=%PRE_G7_13_EVIDENCE_MODE%
>>"%LOG%" echo PRE_G7_13_EVIDENCE_DIR=%PRE_G7_13_EVIDENCE_DIR%
>>"%LOG%" echo PRE_G7_13_EXPECTED_EVIDENCE_DIR=%PRE_G7_13_EXPECTED_EVIDENCE_DIR%
>>"%LOG%" echo B5_EVIDENCE_DIR=%B5_EVIDENCE_DIR%
call npx --cache C:\Users\ayush\AppData\Local\Temp\pre-g7-13-npm-cache --yes --package=node@24.19.0 -- node --version >>"%LOG%" 2>&1
if errorlevel 1 exit /b %ERRORLEVEL%
call npx --cache C:\Users\ayush\AppData\Local\Temp\pre-g7-13-npm-cache --yes --package=node@24.19.0 -- pnpm exec playwright test tests/e2e/world-reference-composition.spec.ts --project=chrome --grep=desktop --workers=1 >>"%LOG%" 2>&1
set "TEST_EXIT=%ERRORLEVEL%"
>>"%LOG%" echo PLAYWRIGHT_EXIT=%TEST_EXIT%
exit /b %TEST_EXIT%
