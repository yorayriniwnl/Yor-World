# FINISH-16 — reallocated independent C1-R6 audit

Date: 2026-10-11 UTC
Status: authorized fresh independent review; implementation acceptance and canonical integration are not ratified pending this review.

## Reason for reallocation

FINISH-11 allocated `deliveries/completion-audits/FINISH-C1/finish-09/20261011T051803Z-c1-r6-independent-review/`. During the review, the assigned reviewer reported that `report.md`, `findings.json`, and `requirement-matrix.json` appeared with unknown provenance and that the report changed after the reviewer paused. The reviewer says they did not author, inspect, or stage those stable files. The branch now also contains commit `757dfe175077faba7991586692891a9660c9ada5`, which records a C1-R6 acceptance and includes that audit package. Preserve this history and the original root unchanged; FINISH-16 does not rely on the disputed report or decision as audit evidence or as Parent acceptance.

## Exact candidate binding

Review only C1-R6 candidate commit `9188b413d37da0ec3381b5430e25dc375a45bb18`, whose app tree is `42ea29ec235225046a75959eb19eb386ac2f821d`. The candidate manifest SHA-256 is `a8dcd6700b2471b3a2d0d98d71a79ce398a33efcea5a1c48fc83d291cdeeb798` (35 output files / 1,415,587 bytes). The R6 patch SHA-256 is `17ae6aaab7910546d3527feec26926d8d1fd604e3bc60e2ae0eb9f549f7fc2a6`, limited to `app/src/features/world/AssetLoader.ts` and `app/tests/unit/world/completion-essential-loader.test.ts`.

The required source order remains immutable base `f62a43c5e71c00dcb89e28275ea81d842167db80` / app tree `42ea29ec235225046a75959eb19eb386ac2f821d`, then R3 patch `e1be558f734378fe69659dcf8271c4e5e57d87fbfbdca1582823be103082dc5d`, R5 candidate `5e85e6a8a248581fe3893fd80c7da3d05079f305` / patch `d6ad3359fa628067ab228eccc52f25d0604ddddb42813d7023e6a809cf60d83d`, then the exact R6 patch. R4 remains diagnostic only. Do not edit the maker candidate, prior reports, or canonical `app/`.

## Audit work

1. Recompute the candidate manifest and replacement hashes. In an isolated checkout, replay base → R3 → R5 → R6 and independently verify clean applicability, exact changed paths, and byte equality.
2. Independently reproduce the failed compressed-room attempt followed by a valid identity retry; confirm the current-attempt aggregate excludes failed bytes, reaches exactly 12/12 for the four-byte fixture, and remains indeterminate for an invalid required response. Review the source-bound red/green evidence.
3. Run the three source-bound Chromium cases against this assembly: required-load UI retry progress; optional-map rollback using the actual material implementation and real Three.js objects, including shared users, registry state and disposal; and actual `WorldRuntime` greeting replacement, stale callback rejection and synchronous disposal with browser timers. Verify injected faults stay at the intended boundary and capture source/build identity, results, and screenshots for visual claims.
4. Re-run the changed focused unit suite, retained full unit and integration suites, lint, typecheck, production build, and those browser paths where the environment permits. Save exact commands, times, exits, counts, tool versions, server source identity, build ID and raw logs. Preserve the historical R5 red-command gap as NOT RUN; do not rewrite R5.
5. Evaluate every FINISH-09 requirement-matrix row and report any source or evidence defect with severity, file, reproduction and scope. Clearly retain the limits: local reviewer only; external GPT Plus #2, provider/deployment/device/accessibility acceptance and G7 proof are not implied.

## Exclusive output

The fresh audit root is `deliveries/completion-audits/FINISH-C1/finish-10/20261011T061133Z-c1-r6-independent-review-03/`. It was absent at allocation. Recheck immediately before writing. If occupied, stop writes to it and select a different absent timestamped root in a new Parent amendment. Write all stable audit outputs only under the verified root; scratch work belongs under its `.work/` and is excluded from output hashes.

Do not copy or rely on the disputed FINISH-11 `report.md`, findings, matrix, input/output hashes, execution receipts, or source-build identity. The reviewer may carry forward uniquely prefixed raw logs/screenshots only after independently confirming authorship, content, and hashes; if any provenance is unclear, rerun the command. Produce a complete fresh `report.md`, `findings.json`, `requirement-matrix.json`, input/output hash receipts, execution receipt, and raw verification logs.

The reviewer is the independent local Codex auditor, not the maker. Return evidence for Parent adjudication. This packet grants no source correction, canonical integration, deployment, or self-acceptance authority.
