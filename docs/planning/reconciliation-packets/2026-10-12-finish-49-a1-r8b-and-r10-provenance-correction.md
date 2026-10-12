# FINISH-49 - A1 R8B and R10 provenance correction

Date: 2026-10-12. Status: Parent-authorized, evidence-only maker follow-up. This does not accept A1 or authorize integration.

## Finding and preservation

The Parent-local FINISH-48 review verified R9 package and browser-receipt integrity, but only 13 of the 15 declared R8 inputs exist as raw Git blobs in pinned R8. Two review files exist in the shared C: local workspace and their bytes match R9's recorded SHA-256 and sizes; they have no object in pinned R8. Preserve R8, R9, the original finish-06 review root, and the C: working copy unchanged. Do not claim the files were present in R8.

Pinned inputs:

- R8 commit: e377e06c514819ee6dbd82da2216c95813bedd2f; app tree 42ea29ec235225046a75959eb19eb386ac2f821d.
- R9 commit: a2f0e218f8153ceec311616f49b7b654c9892bb2; R9 remains the current partial candidate.
- Recovered findings copy: C:/Users/yoray/Projects/Yor World/deliveries/completion-audits/FINISH-A1/finish-06/20261011T132805Z-a1-r5-independent-review-01/findings.json; 8,980 bytes; SHA-256 bcb50fae65b6e51fddb561c0a60c7ca0941ef155aed2fb97373892f1ca3e4f9a.
- Recovered report copy: same local root, report.md; 10,043 bytes; SHA-256 cd5930619153ae1fec6b71ac821fdbd92aa2fa5647a24b3805e62dc6f28ea586.

The shared C: workspace has no free space. Read these source files only; write the new candidate from F: and do not write, move, or delete in C:.

## Authorized two-commit correction

Use branch codex/finish-49-a1-r8b-r10-provenance-correction-20261012.

1. Start at exact R8. Add a separate delivery root deliveries/FINISH-A1-R8B/ with copies of the two recovered files, an input-recovery.json and a raw-byte verifier. Record the original local paths, expected and observed lengths/hashes, R8's lack of these paths/blobs, and the new Git blob IDs after commit. Label their historical origin PARENT-LOCAL-COPY; do not backdate or imply original R8 provenance. Change no app, test, R8, R9, or previous audit path. Commit and push this R8B evidence-source supplement.
2. From the exact R8B commit, create deliveries/FINISH-A1-R10/ as a fresh evidence-binding candidate. Bind the 13 original Git-backed R8 inputs plus the two recovered R8B Git blobs. Replay the unchanged R8 app patch and prove the app tree remains the same as R9. Run both scoped Chromium cases from FINISH-48 with separate fresh PGlite paths and exact YOR_TEST_DATABASE_PATH values; bind source, lock, build identity, browser versions, logs, JSON results, screenshots, UTC interval and exits. Recompute all package hashes from raw Git.
3. Commit and push R10 as a separate commit whose parent is the R8B commit. Keep R8, R9, the historical review root and all prior evidence immutable. No canonical app changes.

If either source file is missing or its bytes differ from the declared values, stop before copying and report the mismatch. Do not replace the files with a newly generated report. If exact source replay or either browser run fails, record the real result and stop; do not relabel it PASS.

## Required R10 outputs and stop gate

R8B must contain the recovered bytes, recovery record, raw command log, input/output manifests, and report. R10 must contain report.md, candidate-binding.json, input-hashes.json, browser-binding.json, per-run command receipts, logs, Playwright JSON, captures, output-hashes.json, and a verifier. Each requirement is PASS/FAIL/NOT RUN with exact limits. The recovery record must distinguish new raw-Git binding from historical source provenance.

Stop after delivery for a fresh exact-candidate GPT Plus #2 audit and Parent decision. This local maker work cannot replace that audit or accept A1. Provider Auth/Storage, production database, deployed behavior, physical devices, accessibility sessions, recovery, integration and G7 remain NOT RUN unless separately evidenced.
