# Local Codex runtime maker — FINISH-09 / C1-R6

Read AGENTS.md, START_HERE.md, FINISH-09, FINISH-08, FINISH-06, the FINISH-00-R2 ruling, the frozen runtime lifecycle contract, and the exact R5 audit report and requirement matrix. Execute the authorized correction; do not accept your own work.

Workspace: C:/Users/yoray/Projects/Yor World

The reviewed R5 candidate is commit 5e85e6a8a248581fe3893fd80c7da3d05079f305, patch SHA-256 d6ad3359fa628067ab228eccc52f25d0604ddddb42813d7023e6a809cf60d83d. The exact R5 AssetLoader and focused test replacements are bound in FINISH-09. Assemble from immutable base f62a43c5e71c00dcb89e28275ea81d842167db80, apply R3 then R5, then make the R6 delta. Recheck that deliveries/FINISH-C1-R6/ is absent before writing; stop if it is occupied.

Own only deliveries/FINISH-C1-R6/. Preserve all earlier revisions and audit roots. Change only:

- app/src/features/world/AssetLoader.ts
- app/tests/unit/world/completion-essential-loader.test.ts

First add and run a failing regression for a compressed room attempt that reaches EOF, fails parsing, then retries with exact identity bytes while resident and fixture also load successfully. Assert that the final three-current-attempt aggregate becomes determinate and excludes the failed attempt's bytes. Run the failing case before production edits and preserve the exact command and output. Then make the smallest contract-correct change. Keep an invalid current required response indeterminate; do not solve retry recovery by weakening identity/length/EOF checks.

Close FINISH-06-6 by running the retained affected unit and integration suites, lint, typecheck, and production build on the exact assembled candidate. Run source-bound Chromium browser paths that exercise all three R5 runtime changes:

- required-load UI progress after compressed failure and valid identity retry;
- optional-map rollback with actual runtime material code and real Three.js objects, including visible/shared-user/registry/disposal checks;
- greeting replacement, stale timer callback rejection, and synchronous disposal using the actual WorldRuntime class and browser timers.

Use controlled fault injection at the failure boundary. Do not replace the production behavior under test with a mock or a parallel reimplementation. Build and browser-test the sequential R3+R5+R6 assembly, capture exact source and build identity, browser version, commands, exit codes, request/DOM/scene observations, and raw logs/results. Capture a screenshot when claiming a visual result. If a required browser path cannot run, mark it NOT RUN with the exact reason rather than treating unit tests as a substitute.

Record full red/green evidence, each retained check's real count and outcome, source/patch hashes, exact two-path allowlist, and sequential application/byte-equality receipts. The R5 report's original red command lines were not retained; preserve that as a historical evidence gap and do not edit the R5 report. Report all remaining defects and limits.

Do not write canonical app/, edit contracts or previous audits, alter the allowlist, deploy, or claim external GPT Plus #2 review. The source output remains an implementation candidate. Return the complete R6 handoff; Parent commits/pushes it, a separate reviewer audits it, and Parent alone decides acceptance.
