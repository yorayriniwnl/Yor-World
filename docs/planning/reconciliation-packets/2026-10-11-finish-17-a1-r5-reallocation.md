# FINISH-17 — Parent reallocation: A1-R5 after FINISH-13 root collision

Date: 2026-10-11 UTC  
Status: authorized A1-R5 maker candidate at a fresh root. Independent audit and separate Parent acceptance remain required.

## Reallocation decision

The owner directed the project to continue through all outstanding work. FINISH-15 independently records that `deliveries/FINISH-A1/r5-02/` is occupied by an uncommitted scratch candidate with 21 changed paths and two red test logs, but has no stable patch, input/output hashes, standalone requirement matrix, or final report. Preserve the entire `r5-02/` root and its worktree/evidence unchanged. Do not use its candidate as source or treat its contents as a return.

The fresh exclusive output root is `deliveries/FINISH-A1/r5-03/`. It was absent at this allocation. Recheck immediately before creation; if occupied, stop and report its exact inventory for another Parent decision. Do not edit or replace FINISH-12, FINISH-13, FINISH-14, FINISH-15, or the occupied `r5/` and `r5-02/` roots.

## Exact source and requirements

- Immutable patch base: `f62a43c5e71c00dcb89e28275ea81d842167db80`; accepted app tree `42ea29ec235225046a75959eb19eb386ac2f821d`.
- Accepted FINISH-00-R2 design output manifest SHA-256: `8038db147824b0a31de1028c330383352177020b2247dd627d1674d6dc14c6af`.
- FINISH-12 correction requirements remain in force, as clarified only for the exact path count by FINISH-14. The frozen A1 table has 26 paths (19 production, 7 test); change only the necessary subset and report every actual changed path. No wildcard expansion.
- A1-R4 remains rejected and diagnostic only. Do not claim it as an accepted base or infer its original author. Preserve all prior R4 and audit bytes.
- This reallocation does not authorize canonical `app/`, SQL/migrations, content contracts, dependencies, auth helpers, public pages, other lanes, or acceptance/integration changes.

## Source reuse disclosure

The isolated candidate prepared by this Codex run under `C:\yw-r5b\app` was constructed from the immutable base by applying the R4 diagnostic patch, then making R5 corrections. A byte comparison against the R4 replacement files found 25 reused paths: 18 remain byte-identical to R4; seven were modified for R5. The maker report must include the full 25-path list and explicitly identify these seven R5 modifications:

- `app/src/app/api/admin/media/route.ts`
- `app/src/app/api/admin/preview/route.ts`
- `app/src/server/content/preview.ts`
- `app/src/server/media/manifest.ts`
- `app/tests/e2e/platform/completion-authoring-workflow.spec.ts`
- `app/tests/integration/platform/canonical-platform.test.ts`
- `app/tests/integration/platform/completion-authoring-preview.test.ts`

The complete reused-path list is the exact list recorded in `deliveries/FINISH-A1/r4/changed-paths.txt`. Package every final replacement from the isolated R5 candidate and verify it against the base-to-candidate patch; do not copy from `r5-02/`. Re-run required checks against the final bytes.

## Required implementation and evidence

Follow all five correction requirements and the test matrix in FINISH-12 unchanged: candidate-content hashing and array-order semantics; streaming 5 MiB storage bound and shared 10-second deadline; strict coherent review DTO validation; actual Chromium picker/save/reopen/private-preview flow using an explicitly synthetic fixture; complete standalone requirement matrix.

Return `source/`, valid UTF-8 `source.patch`, changed-path inventory, input/output hashes, `report.md`, standalone `requirement-matrix.json`, and complete evidence. Recheck exact-base patch application and byte equality. Run focused and full local suites, lint, typecheck, production build, and the source-bound Chromium flow. Bind commands, exits, counts, tool versions, source/build/browser identities, raw logs, and screenshots. Mark provider/native database, deployment/CDN, device, recovery, and manual checks NOT RUN unless actually performed. The synthetic fixture is not provider approval.

The actual worker is local Codex; do not claim Gemini execution. Commit and push only the stable `r5-03/` delivery paths when the package is complete. Stop for a separate independent review and Parent ruling. No self-acceptance or canonical integration is authorized.