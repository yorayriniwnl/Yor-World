@echo off
setlocal
set "ROOT=C:\Users\ayush\COddexxxxxxxxxxxxxxxx\_worktrees\pre-g7-13"
set "APP=%ROOT%\app"
set "EVIDENCE=%ROOT%\deliveries\G7\preparation\maker-evidence\pre-g7-13\attempt-65"
set "NODE_DIR=C:\Users\ayush\AppData\Local\Temp\pre-g7-13-npm-cache\_npx\09ae5d3560c7b1f2\node_modules\node\bin"
set "NODE24=%NODE_DIR%\node.exe"
set "PNPMCLI=C:\Users\ayush\AppData\Roaming\npm\node_modules\pnpm\bin\pnpm.mjs"
set "SUMMARY=%EVIDENCE%\final-gates.log"
cd /d "%APP%" || exit /b 2
set "PATH=%NODE_DIR%;%PATH%"
set "npm_config_node_execpath=%NODE24%"
set "NEXT_TELEMETRY_DISABLED=1"
>"%SUMMARY%" echo SOURCE_HEAD=e21901eff03097ab0ecda2278e2949aa2eba5db9
>>"%SUMMARY%" echo SOURCE_COMMIT=034d87951555731ff03d413b380556471e4ad73a
>>"%SUMMARY%" echo APP_TREE=0ea10ae3cadb00526e13293248fbef3b3007537e
>>"%SUMMARY%" echo EVIDENCE_BUILD_ID=7fiIu3DKa8U_TUYczP3uR
>>"%SUMMARY%" echo NODE_EXE=%NODE24%
node --version >>"%SUMMARY%" 2>&1
>>"%SUMMARY%" echo PNPM_VERSION=9.15.9
set /p BUILD_ID=<.next\BUILD_ID
>>"%SUMMARY%" echo SERVED_BUILD_ID=%BUILD_ID%

>"%EVIDENCE%\final-lint.log" echo COMMAND=node pnpm.mjs run lint
node "%PNPMCLI%" run lint >>"%EVIDENCE%\final-lint.log" 2>&1
set "RESULT=%ERRORLEVEL%"
>>"%EVIDENCE%\final-lint.log" echo LINT_EXIT=%RESULT%
>>"%SUMMARY%" echo LINT_EXIT=%RESULT%

>"%EVIDENCE%\final-typecheck.log" echo COMMAND=node pnpm.mjs run typecheck
node "%PNPMCLI%" run typecheck >>"%EVIDENCE%\final-typecheck.log" 2>&1
set "RESULT=%ERRORLEVEL%"
>>"%EVIDENCE%\final-typecheck.log" echo TYPECHECK_EXIT=%RESULT%
>>"%SUMMARY%" echo TYPECHECK_EXIT=%RESULT%

>"%EVIDENCE%\final-unit.log" echo COMMAND=node pnpm.mjs run test:unit
node "%PNPMCLI%" run test:unit >>"%EVIDENCE%\final-unit.log" 2>&1
set "RESULT=%ERRORLEVEL%"
>>"%EVIDENCE%\final-unit.log" echo UNIT_EXIT=%RESULT%
>>"%SUMMARY%" echo UNIT_EXIT=%RESULT%

set "PORT=3174"
set "B5_EVIDENCE_DIR=%EVIDENCE%\recovery-fullscreen-results"
set "PRE_G7_11_EVIDENCE_DIR=%EVIDENCE%\recovery-fullscreen-evidence"
if not exist "%B5_EVIDENCE_DIR%" mkdir "%B5_EVIDENCE_DIR%"
if not exist "%PRE_G7_11_EVIDENCE_DIR%" mkdir "%PRE_G7_11_EVIDENCE_DIR%"
>"%EVIDENCE%\recovery-fullscreen.log" echo COMMAND=node pnpm.mjs exec playwright test tests/e2e/renderer-recovery.spec.ts tests/e2e/world-fullscreen.spec.ts --project=chrome --workers=1
>>"%EVIDENCE%\recovery-fullscreen.log" echo PORT=%PORT%
>>"%EVIDENCE%\recovery-fullscreen.log" echo BUILD_ID=%BUILD_ID%
>>"%EVIDENCE%\recovery-fullscreen.log" echo B5_EVIDENCE_DIR=%B5_EVIDENCE_DIR%
>>"%EVIDENCE%\recovery-fullscreen.log" echo PRE_G7_11_EVIDENCE_DIR=%PRE_G7_11_EVIDENCE_DIR%
node "%PNPMCLI%" exec playwright test tests/e2e/renderer-recovery.spec.ts tests/e2e/world-fullscreen.spec.ts --project=chrome --workers=1 >>"%EVIDENCE%\recovery-fullscreen.log" 2>&1
set "RESULT=%ERRORLEVEL%"
>>"%EVIDENCE%\recovery-fullscreen.log" echo PLAYWRIGHT_EXIT=%RESULT%
>>"%SUMMARY%" echo RECOVERY_FULLSCREEN_EXIT=%RESULT%

set "PORT=3175"
set "B5_EVIDENCE_DIR=%EVIDENCE%\candidatex-404-results"
if not exist "%B5_EVIDENCE_DIR%" mkdir "%B5_EVIDENCE_DIR%"
>"%EVIDENCE%\candidatex-404.log" echo COMMAND=node pnpm.mjs exec playwright test tests/e2e/room-project-navigation.spec.ts --project=chrome --grep=candidatex --workers=1
>>"%EVIDENCE%\candidatex-404.log" echo PORT=%PORT%
>>"%EVIDENCE%\candidatex-404.log" echo BUILD_ID=%BUILD_ID%
>>"%EVIDENCE%\candidatex-404.log" echo B5_EVIDENCE_DIR=%B5_EVIDENCE_DIR%
node "%PNPMCLI%" exec playwright test tests/e2e/room-project-navigation.spec.ts --project=chrome --grep=candidatex --workers=1 >>"%EVIDENCE%\candidatex-404.log" 2>&1
set "RESULT=%ERRORLEVEL%"
>>"%EVIDENCE%\candidatex-404.log" echo PLAYWRIGHT_EXIT=%RESULT%
>>"%SUMMARY%" echo CANDIDATEX_404_EXIT=%RESULT%

set "PORT=3176"
set "B5_EVIDENCE_DIR=%EVIDENCE%\clean-profile-results"
if not exist "%B5_EVIDENCE_DIR%" mkdir "%B5_EVIDENCE_DIR%"
>"%EVIDENCE%\clean-profile-smoke.log" echo COMMAND=node pnpm.mjs exec playwright test tests/e2e/public-shell.spec.ts --project=chrome --workers=1
>>"%EVIDENCE%\clean-profile-smoke.log" echo PORT=%PORT%
>>"%EVIDENCE%\clean-profile-smoke.log" echo BUILD_ID=%BUILD_ID%
>>"%EVIDENCE%\clean-profile-smoke.log" echo B5_EVIDENCE_DIR=%B5_EVIDENCE_DIR%
node "%PNPMCLI%" exec playwright test tests/e2e/public-shell.spec.ts --project=chrome --workers=1 >>"%EVIDENCE%\clean-profile-smoke.log" 2>&1
set "RESULT=%ERRORLEVEL%"
>>"%EVIDENCE%\clean-profile-smoke.log" echo PLAYWRIGHT_EXIT=%RESULT%
>>"%SUMMARY%" echo CLEAN_PROFILE_SMOKE_EXIT=%RESULT%

exit /b 0
