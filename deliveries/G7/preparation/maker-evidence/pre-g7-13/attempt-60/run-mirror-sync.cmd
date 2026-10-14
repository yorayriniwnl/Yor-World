@echo off
setlocal
set "ROOT=C:\Users\ayush\COddexxxxxxxxxxxxxxxx\_worktrees\pre-g7-13"
set "LOG=%~dp0final-mirror-sync-run.log"
cd /d "%ROOT%" || exit /b 2
>"%LOG%" echo COMMAND=node deliveries/G7/preparation/maker-evidence/pre-g7-13/attempt-60/sync-final-source-mirror.mjs
call npx --cache C:\Users\ayush\AppData\Local\Temp\pre-g7-13-npm-cache --yes --package=node@24.19.0 -- node deliveries\G7\preparation\maker-evidence\pre-g7-13\attempt-60\sync-final-source-mirror.mjs >>"%LOG%" 2>&1
set "RESULT=%ERRORLEVEL%"
>>"%LOG%" echo MIRROR_SYNC_EXIT=%RESULT%
exit /b %RESULT%
