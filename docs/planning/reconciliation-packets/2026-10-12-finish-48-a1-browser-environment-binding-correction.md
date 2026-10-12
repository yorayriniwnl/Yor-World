# FINISH-48 — A1-R9 browser environment binding correction

Date: 2026-10-12. Status: **Parent-authorized evidence-only maker assignment; no implementation or acceptance claimed.** The exact R8 source and targeted tests passed in Parent reruns, but the candidate's browser binding omits the required isolated PGlite `YOR_TEST_DATABASE_PATH`. This packet allocates fresh, reproducible browser receipts with that environment value recorded.

## Exact candidate input

- Start from FINISH-A1-R8 commit `e377e06c514819ee6dbd82da2216c95813bedd2f`, tree `552cb2618c31fe000ab4fae0a9e5997c6442d084`, branch `codex/finish-45-a1-test-claim-coverage-correction-20261012`.
- Its exact parent is R7 commit `76d679dcb98064152021830b98f16eb456b3ae19`; R8 output manifest SHA-256 is `db6957ef40d2552772dcbf0ab66acffc75222a42f8bad2ec64192cb3266abc1f`.
- Preserve R8 and all earlier candidates byte-for-byte. Create a fresh R9 delivery and branch from R8; do not use unknown `.work/` data.
- Read `AGENTS.md`, `START_HERE.md`, FINISH-45, the R8 report, R8 `evidence/r8/browser-binding.json`, Parent re-audit report and exact R8 browser test/source inputs.

## Authorized evidence correction

Create `deliveries/FINISH-A1-R9/` as an evidence-only supplement. Do not edit `app/`, tests, dependencies, R8, or any prior receipt. Recreate the R8 exact-base source patch in a fresh disposable replay workspace, install only from its frozen lock as already authorized by the prior packet, build the bound candidate, and run:

1. `tests/e2e/platform/completion-authoring-workflow.spec.ts` in Chromium for the absent-private-draft case, with `YOR_E2E_FIXTURE=1`, `YOR_E2E_OMIT_CANDIDATEX_DRAFT=1`, and a fresh isolated temporary PGlite directory in `YOR_TEST_DATABASE_PATH`.
2. The normal-fixture Chromium authoring/publish suite with `YOR_E2E_FIXTURE=1`, the omission flag unset, and a different fresh isolated temporary PGlite directory in `YOR_TEST_DATABASE_PATH`.

Record each exact `YOR_TEST_DATABASE_PATH` or a rigorously bound isolated temporary-directory value in the browser receipt, along with the exact candidate source/app tree, patch and lock hashes, build identity, command, cwd, UTC start, browser/Playwright versions, results, screenshots, raw logs and exit status. Keep the two fixture databases separate. Never use production data or credentials. Do not claim that this fixture proves provider Auth/Storage or a deployed route.

## Required proof and stop condition

Verify the R8 parent, candidate tree, package manifest and all R8 input hashes from raw Git; verify the replayed app tree and lock identity; bind every new receipt and capture hash; and confirm the R9 commit changes only its own delivery package while canonical `app/` and R8 remain unchanged. Run the two scoped browser invocations and an evidence-integrity check. Broader application suites are inherited from R8 and need not be rerun for this receipt-only delta.

Return `report.md`, `candidate-binding.json`, `browser-binding.json`, raw runner receipts/logs, Playwright JSON, captures, `input-hashes.json`, `output-hashes.json`, and a requirement matrix that clearly separates maker reruns from Parent reruns and NOT RUN provider/device scope. Commit and push only the R9 package on the Parent-assigned branch. Stop for exact-candidate independent GPT Plus #2 audit and Parent acceptance; do not integrate or claim A1 acceptance.
