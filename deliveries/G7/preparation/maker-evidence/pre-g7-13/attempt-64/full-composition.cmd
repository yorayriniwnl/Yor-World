@echo off
setlocal
set "APP=C:\Users\ayush\COddexxxxxxxxxxxxxxxx\_worktrees\pre-g7-13\app"
set "NODE_DIR=C:\Users\ayush\AppData\Local\Temp\pre-g7-13-npm-cache\_npx\09ae5d3560c7b1f2\node_modules\node\bin"
set "NODE24=%NODE_DIR%\node.exe"
set "PNPMCLI=C:\Users\ayush\AppData\Roaming\npm\node_modules\pnpm\bin\pnpm.mjs"
set "EVIDENCE=%~dp0composition"
set "LOG=%~dp0full-composition.log"
set "PORT=3173"
set "EXPECTED_BUILD_ID=7fiIu3DKa8U_TUYczP3uR"
set "PRE_G7_13_EVIDENCE_MODE=1"
set "PRE_G7_13_EVIDENCE_DIR=%EVIDENCE%"
set "PRE_G7_13_EXPECTED_EVIDENCE_DIR=%EVIDENCE%"
set "PRE_G7_13_REQUIRE_ISOLATED_EVIDENCE=1"
set "B5_EVIDENCE_DIR=%EVIDENCE%\playwright-results"
set "PATH=%NODE_DIR%;%PATH%"
set "npm_config_node_execpath=%NODE24%"
if not exist "%EVIDENCE%\screenshots" mkdir "%EVIDENCE%\screenshots"
if not exist "%EVIDENCE%\measurements" mkdir "%EVIDENCE%\measurements"
if not exist "%B5_EVIDENCE_DIR%" mkdir "%B5_EVIDENCE_DIR%"
cd /d "%APP%" || exit /b 2
set /p BUILD_ID=<.next\BUILD_ID
>"%LOG%" echo COMMAND=node %PNPMCLI% exec playwright test tests/e2e/world-reference-composition.spec.ts --project=chrome --workers=1
>>"%LOG%" echo SOURCE_HEAD=e21901eff03097ab0ecda2278e2949aa2eba5db9
>>"%LOG%" echo SOURCE_COMMIT=034d87951555731ff03d413b380556471e4ad73a
>>"%LOG%" echo APP_TREE=0ea10ae3cadb00526e13293248fbef3b3007537e
>>"%LOG%" echo PORT=%PORT%
>>"%LOG%" echo EXPECTED_BUILD_ID=%EXPECTED_BUILD_ID%
>>"%LOG%" echo SERVED_BUILD_ID=%BUILD_ID%
>>"%LOG%" echo NEXT_PUBLIC_PRE_G7_13_EVIDENCE=1 build-time
>>"%LOG%" echo PRE_G7_13_EVIDENCE_MODE=%PRE_G7_13_EVIDENCE_MODE%
>>"%LOG%" echo PRE_G7_13_EVIDENCE_DIR=%PRE_G7_13_EVIDENCE_DIR%
>>"%LOG%" echo PRE_G7_13_EXPECTED_EVIDENCE_DIR=%PRE_G7_13_EXPECTED_EVIDENCE_DIR%
>>"%LOG%" echo PRE_G7_13_TEST_PANEL_SCALE= unset
>>"%LOG%" echo NODE_EXE=%NODE24%
>>"%LOG%" echo NODE_VERSION=24.19.0
>>"%LOG%" echo B5_EVIDENCE_DIR=%B5_EVIDENCE_DIR%
if not "%BUILD_ID%"=="%EXPECTED_BUILD_ID%" exit /b 3
node "%PNPMCLI%" exec playwright test tests/e2e/world-reference-composition.spec.ts --project=chrome --workers=1 >>"%LOG%" 2>&1
set "RESULT=%ERRORLEVEL%"
>>"%LOG%" echo PLAYWRIGHT_EXIT=%RESULT%
exit /b %RESULT%
