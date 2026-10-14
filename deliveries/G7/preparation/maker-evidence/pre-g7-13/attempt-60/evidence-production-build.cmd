@echo off
setlocal
set "APP=C:\Users\ayush\COddexxxxxxxxxxxxxxxx\_worktrees\pre-g7-13\app"
set "LOG=%~dp0evidence-production-build.log"
cd /d "%APP%" || exit /b 2
set "NEXT_PUBLIC_PRE_G7_13_EVIDENCE=1"
>"%LOG%" echo COMMAND=pnpm run build
>>"%LOG%" echo NEXT_PUBLIC_PRE_G7_13_EVIDENCE=%NEXT_PUBLIC_PRE_G7_13_EVIDENCE%
call npx --cache C:\Users\ayush\AppData\Local\Temp\pre-g7-13-npm-cache --yes --package=node@24.19.0 -- node --version >>"%LOG%" 2>&1
if errorlevel 1 exit /b 3
call npx --cache C:\Users\ayush\AppData\Local\Temp\pre-g7-13-npm-cache --yes --package=node@24.19.0 -- pnpm run build >>"%LOG%" 2>&1
set "RESULT=%ERRORLEVEL%"
if exist .next\BUILD_ID set /p BUILD_ID=<.next\BUILD_ID
>>"%LOG%" echo BUILD_ID=%BUILD_ID%
>>"%LOG%" echo BUILD_EXIT=%RESULT%
exit /b %RESULT%
