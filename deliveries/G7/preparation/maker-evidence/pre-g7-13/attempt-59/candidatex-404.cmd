@echo off
setlocal
set "APP=C:\Users\ayush\COddexxxxxxxxxxxxxxxx\_worktrees\pre-g7-13\app"
set "EVIDENCE=%~dp0candidatex-results"
set "LOG=%~dp0candidatex-404.log"
set "PORT=3164"
set "B5_EVIDENCE_DIR=%EVIDENCE%"
if not exist "%EVIDENCE%" mkdir "%EVIDENCE%"
cd /d "%APP%" || exit /b 2
set /p BUILD_ID=<.next\BUILD_ID
>"%LOG%" echo COMMAND=pnpm exec playwright test tests/e2e/room-project-navigation.spec.ts --project=chrome --grep=candidatex --workers=1
>>"%LOG%" echo PORT=%PORT%
>>"%LOG%" echo SERVED_BUILD_ID=%BUILD_ID%
>>"%LOG%" echo B5_EVIDENCE_DIR=%B5_EVIDENCE_DIR%
call npx --cache C:\Users\ayush\AppData\Local\Temp\pre-g7-13-npm-cache --yes --package=node@24.19.0 -- node --version >>"%LOG%" 2>&1
if errorlevel 1 exit /b 3
call npx --cache C:\Users\ayush\AppData\Local\Temp\pre-g7-13-npm-cache --yes --package=node@24.19.0 -- pnpm exec playwright test tests/e2e/room-project-navigation.spec.ts --project=chrome --grep=candidatex --workers=1 >>"%LOG%" 2>&1
set "RESULT=%ERRORLEVEL%"
>>"%LOG%" echo PLAYWRIGHT_EXIT=%RESULT%
exit /b %RESULT%
