# FINISH-11 — independent C1-R6 runtime correction audit

Date: 2026-10-11 UTC
Status: authorized fresh independent review; implementation acceptance and canonical integration remain pending.

## Exact candidate binding

Audit only the stable candidate committed as `9188b413d37da0ec3381b5430e25dc375a45bb18` on `audit/completion-2026-10-09`. The candidate is `deliveries/FINISH-C1-R6/`. Its output-manifest SHA-256 is `a8dcd6700b2471b3a2d0d98d71a79ce398a33efcea5a1c48fc83d291cdeeb798`; it contains 35 output files / 1,415,587 bytes. Its R6 patch SHA-256 is `17ae6aaab7910546d3527feec26926d8d1fd604e3bc60e2ae0eb9f549f7fc2a6`; the patch declares only `app/src/features/world/AssetLoader.ts` and `app/tests/unit/world/completion-essential-loader.test.ts`.

The required source order is immutable base commit `f62a43c5e71c00dcb89e28275ea81d842167db80` / app tree `42ea29ec235225046a75959eb19eb386ac2f821d`, then C1-R3 patch `e1be558f734378fe69659dcf8271c4e5e57d87fbfbdca1582823be103082dc5d`, C1-R5 candidate commit `5e85e6a8a248581fe3893fd80c7da3d05079f305` / patch `d6ad3359fa628067ab228eccc52f25d0604ddddb42813d7023e6a809cf60d83d`, then the exact C1-R6 patch above. R4 remains diagnostic only. Preserve all prior delivery and audit bytes; do not edit or accept the maker candidate or canonical `app/`.

## Audit requirements

Perform an independent complete-scope and delta review against FINISH-09, the FINISH-08 R5 audit, and the accepted runtime lifecycle contract. Bind all conclusions to the exact commit, base, R3/R5/R6 patch sequence, all 35 output hashes, the two-path R6 allowlist, and source/build/browser identities.

1. Recompute the candidate output manifest and source replacement hashes. In a fresh isolated worktree, replay base → R3 → R5 → R6; verify clean applicability, exact path set, and byte equality of the two R6 replacements plus the retained outputs required by FINISH-09. Do not rely only on the maker's sequence receipt.
2. Inspect the per-attempt progress implementation and test. Reproduce the red case before R6 if it can be done without altering the stable candidate, then prove the corrected aggregate excludes the failed compressed room bytes and is exactly 12/12 for the four-byte diagnostic fixture. Verify invalid representation in a current required attempt remains indeterminate.
3. Inspect the browser harness and results. Re-run the exact source-bound Chromium paths if feasible and verify they execute the candidate modules: (a) actual loader UI after compressed room failure and identity retry, current-attempt aggregate and request/stage details; (b) optional-map rollback through the actual material module with real Three.js objects and shared-material state/disposal checks; (c) actual `WorldRuntime` greeting replacement, stale callback rejection, and disposal through browser timers. Check that injected faults are confined to the failure boundary and that evidence is not a reimplementation or a mock replacing behavior under test.
4. Re-run the changed focused unit suite, retained full unit/integration suites, lint, typecheck, production build, and browser tests against the bound R6 assembly where the local environment permits. Record exact commands, start times, exits, counts, tool versions, server source identity and build ID. Review the source red/green receipts and browser JSON/screenshots. Keep the missing historical R5 command as NOT RUN; do not rewrite R5.
5. Evaluate every row in `deliveries/FINISH-C1-R6/requirements-matrix.json`, including source binding, browser cases, retained regressions, and evidence limits. Record fresh findings for any source or proof defect with path, severity, reproduction, and scope. Preserve the local-review limitation; do not claim external GPT Plus #2 review, Parent acceptance, canonical integration, provider/device acceptance, or G7 proof.

## Exclusive audit output

The fresh audit root is `deliveries/completion-audits/FINISH-C1/finish-09/20261011T051803Z-c1-r6-independent-review/`. Recheck that the exact path is absent immediately before writing. Write stable audit outputs only there; place scratch work only in its `.work/` subdirectory and exclude that subdirectory from output hashes.

Return `report.md`, `findings.json`, a complete `requirement-matrix.json`, exact input/output hash receipts, an execution receipt, and raw logs for each verification command. Parent will review this fresh audit and issue a separate acceptance or REWORK decision. No source correction or maker work is authorized under this audit packet.
