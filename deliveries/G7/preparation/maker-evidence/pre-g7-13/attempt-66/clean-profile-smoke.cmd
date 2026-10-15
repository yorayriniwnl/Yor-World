@echo off
setlocal
set "ROOT=C:\Users\ayush\COddexxxxxxxxxxxxxxxx\_worktrees\pre-g7-13"
set "APP=%ROOT%\app"
set "EVIDENCE=%ROOT%\deliveries\G7\preparation\maker-evidence\pre-g7-13\attempt-66"
set "NODE_DIR=C:\Users\ayush\AppData\Local\Temp\pre-g7-13-npm-cache\_npx\09ae5d3560c7b1f2\node_modules\node\bin"
set "NODE24=%NODE_DIR%\node.exe"
set "PNPMCLI=C:\Users\ayush\AppData\Roaming\npm\node_modules\pnpm\bin\pnpm.mjs"
set "PORT=3176"
set "B5_EVIDENCE_DIR=%EVIDENCE%\clean-profile-results"
cd /d "%APP%" || exit /b 2
set /p BUILD_ID=<.next\BUILD_ID
set "PATH=%NODE_DIR%;%PATH%"
set "npm_config_node_execpath=%NODE24%"
>"%EVIDENCE%\clean-profile-smoke.log" echo SOURCE_HEAD=e21901eff03097ab0ecda2278e2949aa2eba5db9
>>"%EVIDENCE%\clean-profile-smoke.log" echo SOURCE_COMMIT=034d87951555731ff03d413b380556471e4ad73a
>>"%EVIDENCE%\clean-profile-smoke.log" echo APP_TREE=0ea10ae3cadb00526e13293248fbef3b3007537e
>>"%EVIDENCE%\clean-profile-smoke.log" echo BUILD_ID_EXPECTED=7fiIu3DKa8U_TUYczP3uR
>>"%EVIDENCE%\clean-profile-smoke.log" echo BUILD_ID_ACTUAL=%BUILD_ID%
>>"%EVIDENCE%\clean-profile-smoke.log" echo COMMAND=node pnpm.mjs exec playwright test tests/e2e/public-shell.spec.ts --project=chrome --workers=1
>>"%EVIDENCE%\clean-profile-smoke.log" echo NODE_EXE=%NODE24%
node --version >>"%EVIDENCE%\clean-profile-smoke.log" 2>&1
>>"%EVIDENCE%\clean-profile-smoke.log" echo PORT=%PORT%
>>"%EVIDENCE%\clean-profile-smoke.log" echo B5_EVIDENCE_DIR=%B5_EVIDENCE_DIR%
node "%PNPMCLI%" exec playwright test tests/e2e/public-shell.spec.ts --project=chrome --workers=1 >>"%EVIDENCE%\clean-profile-smoke.log" 2>&1
set "RESULT=%ERRORLEVEL%"
>>"%EVIDENCE%\clean-profile-smoke.log" echo PLAYWRIGHT_EXIT=%RESULT%
exit /b %RESULT%
