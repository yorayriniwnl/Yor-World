@echo off
setlocal
set "APP=C:\Users\ayush\COddexxxxxxxxxxxxxxxx\_worktrees\pre-g7-13\app"
set "LOG=%~dp0focused-lighting.log"
cd /d "%APP%" || exit /b 2
>"%LOG%" echo COMMAND=pnpm exec vitest run --config vitest.integration.config.ts tests/integration/production-lighting.test.ts
call npx --cache C:\Users\ayush\AppData\Local\Temp\pre-g7-13-npm-cache --yes --package=node@24.19.0 -- node --version >>"%LOG%" 2>&1
if errorlevel 1 exit /b 3
call npx --cache C:\Users\ayush\AppData\Local\Temp\pre-g7-13-npm-cache --yes --package=node@24.19.0 -- pnpm exec vitest run --config vitest.integration.config.ts tests/integration/production-lighting.test.ts >>"%LOG%" 2>&1
set "RESULT=%ERRORLEVEL%"
>>"%LOG%" echo FOCUSED_LIGHTING_EXIT=%RESULT%
exit /b %RESULT%
