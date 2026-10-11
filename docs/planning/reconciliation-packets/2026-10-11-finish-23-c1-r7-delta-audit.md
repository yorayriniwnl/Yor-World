# FINISH-23 — C1-R7 exact-candidate provenance delta audit

Date: 2026-10-11 UTC
Status: Parent-authorized, read-only independent delta audit. This assignment does not accept C1-R6, close E-01, or authorize canonical integration.

## Candidate binding

- Candidate delivery commit: `e2670d4152c461005da86b392dbcea12cec740bf`.
- Candidate full Git tree: `419950200cc9705a101468d44e5b589b40f609f0`.
- Candidate `app/` tree: `42ea29ec235225046a75959eb19eb386ac2f821d`, equal to the accepted baseline app tree.
- Candidate parent: the FINISH-21-R1 provenance amendment commit `1058676cb74d8239aae7fed3dfa91defcc8a30a1`.
- Candidate delivery root: `deliveries/FINISH-C1-R7/` (11 committed files; ten rows in `output-hashes.json`, 186,448 bytes total).
- Original candidate: R6 commit `9188b413d37da0ec3381b5430e25dc375a45bb18`, app tree `42ea29ec235225046a75959eb19eb386ac2f821d`.
- Predecessor: R5 commit `5e85e6a8a248581fe3893fd80c7da3d05079f305`.
- Governing inputs: [FINISH-21](2026-10-11-finish-21-c1-r6-receipt-correction.md), [FINISH-21-R1](2026-10-11-finish-21-r1-candidate-input-provenance.md), and [FINISH-16 report](../../../deliveries/completion-audits/FINISH-C1/finish-10/20261011T061133Z-c1-r6-independent-review-03/report.md).

## Exclusive reviewer output

Write only under:

`deliveries/completion-audits/FINISH-C1/finish-11/20261011T073003Z-c1-r7-delta-review-01/`

This root was absent at allocation. Recheck immediately before creating it. If it is occupied, do not inspect it as evidence, alter it, or write into it; stop and return its exact path and inventory for Parent reallocation. Preserve prior candidate/audit roots and all scratch. Keep reviewer scratch under this root's `.work/`, excluded from the stable output manifest. The reviewer must not edit the candidate, source, historical receipts, this packet, or canonical `app/`; must not fix defects, accept the candidate, integrate it, or commit/push the review.

## Independent checks

1. Bind the exact candidate commit, full tree, parent, and `app/` tree. Confirm the commit changes only the eleven stable files under `deliveries/FINISH-C1-R7/`. Compare every declared R7 output row against raw Git blob bytes from this exact commit; require exactly 10 files and 186,448 total bytes, excluding `output-hashes.json` and `.work/`.
2. Inspect and independently run `deliveries/FINISH-C1-R7/verify-input-provenance.py`. Recompute all 29 R6 input receipts from the exact pinned Git commit/path mappings or, for the two separately labelled non-Git Three.js files, verify the installed `three@0.180.0` package bytes against the R6 package manifest, lockfile integrity, source-build identity, and frozen-install receipt. Do not convert line endings, normalize Unicode, or call installed package files Git blobs. If the package files or installation evidence are unavailable, record those checks as NOT RUN rather than substituting current registry or checkout data.
3. Recompute all 32 R5 predecessor output receipts and the separate R5 manifest receipt directly from raw Git objects at the pinned R5 commit. Verify counts, blob OIDs, byte lengths, SHA-256 values, duplicate-path handling, and the distinction between historical mismatches and corrected committed-byte receipts.
4. Recheck the one-byte diagnostic discrepancy against the pinned R6 candidate blob and FINISH-16's pinned log. Confirm the report explains the extra CR byte without inferring a source change and preserves both original manifests unchanged.
5. Review the verifier for fail-closed behavior on missing/mismatched paths, commits, counts, hashes, and duplicate paths. Where feasible, run negative cases against disposable copies under `.work/`; never mutate the candidate. Record any unavailable negative case as NOT RUN.
6. Confirm `requirements-matrix.json`, `source-binding.json`, report, verifier log, and structured results agree with independently reproduced values. State that application/runtime tests are inherited from FINISH-16 and NOT RUN by this evidence-only correction.
7. Search the candidate diff for application or historical evidence changes. The candidate `app/` tree must remain exactly `42ea29ec235225046a75959eb19eb386ac2f821d`; any mismatch is a blocker and must be reported, not repaired by the reviewer.

Return an auditable `report.md`, `findings.json`, `requirement-matrix.json`, exact candidate binding, raw commands/exits/tool versions, rerun receipts, and an output-hash manifest covering every stable reviewer file except the manifest itself and `.work/`. Use raw PASS/FAIL/NOT RUN outcomes. External GPT Plus #2 review, Parent acceptance, provider/device checks, deployment, and G7 remain NOT RUN unless separately evidenced; no prior local PASS advice may be promoted to acceptance.

After review, return the exact output inventory and recommendation to Parent. Parent will inspect and independently verify the stable output hashes before publishing the audit package and deciding E-01. Preserve the auditor/maker/acceptance separation.
