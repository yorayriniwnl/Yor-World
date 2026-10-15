@echo off
setlocal
set "APP=C:\Users\ayush\COddexxxxxxxxxxxxxxxx\_worktrees\pre-g7-13\app"
set "NODE_DIR=C:\Users\ayush\AppData\Local\Temp\pre-g7-13-npm-cache\_npx\09ae5d3560c7b1f2\node_modules\node\bin"
set "NODE24=%NODE_DIR%\node.exe"
set "PNPMCLI=C:\Users\ayush\AppData\Roaming\npm\node_modules\pnpm\bin\pnpm.mjs"
set "LOG=%~dp0evidence-production-build.log"
cd /d "%APP%" || exit /b 2
set "PATH=%NODE_DIR%;%PATH%"
set "npm_config_node_execpath=%NODE24%"
set "NEXT_PUBLIC_PRE_G7_13_EVIDENCE=1"
>"%LOG%" echo COMMAND=node %PNPMCLI% run build
>>"%LOG%" echo SOURCE_HEAD=e21901eff03097ab0ecda2278e2949aa2eba5db9
>>"%LOG%" echo SOURCE_COMMIT=034d87951555731ff03d413b380556471e4ad73a
>>"%LOG%" echo APP_TREE=0ea10ae3cadb00526e13293248fbef3b3007537e
>>"%LOG%" echo NODE_DIR=%NODE_DIR%
>>"%LOG%" echo PNPM_VERSION=9.15.9
>>"%LOG%" echo NEXT_PUBLIC_PRE_G7_13_EVIDENCE=%NEXT_PUBLIC_PRE_G7_13_EVIDENCE%
where node >>"%LOG%" 2>&1
node --version >>"%LOG%" 2>&1
if errorlevel 1 exit /b 3
node "%PNPMCLI%" run build >>"%LOG%" 2>&1
set "RESULT=%ERRORLEVEL%"
if exist .next\BUILD_ID set /p BUILD_ID=<.next\BUILD_ID
>>"%LOG%" echo BUILD_ID=%BUILD_ID%
>>"%LOG%" echo BUILD_EXIT=%RESULT%
exit /b %RESULT%
