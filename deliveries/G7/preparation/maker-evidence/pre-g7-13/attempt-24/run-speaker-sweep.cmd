@echo off
set PRE_G7_13_EVIDENCE_MODE=1
set PRE_G7_13_EVIDENCE_DIR=C:\Users\ayush\COddexxxxxxxxxxxxxxxx\_worktrees\pre-g7-13\deliveries\G7\preparation\maker-evidence\pre-g7-13\attempt-24
set B5_EVIDENCE_DIR=C:\Users\ayush\COddexxxxxxxxxxxxxxxx\_worktrees\pre-g7-13\deliveries\G7\preparation\maker-evidence\pre-g7-13\attempt-24
set PORT=3148
npx --cache C:\Users\ayush\AppData\Local\Temp\pre-g7-13-npm-cache --yes --package=node@24.19.0 -- pnpm exec playwright test tests/e2e/pre-g7-13-speaker-transform.probe.spec.ts --project=chrome --workers=1
exit /b %ERRORLEVEL%
