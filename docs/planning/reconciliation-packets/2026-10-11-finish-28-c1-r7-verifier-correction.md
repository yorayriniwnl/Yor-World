# FINISH-28 — C1-R7 verifier correction

Date: 2026-10-11 UTC
Status: Parent-authorized evidence-package correction. It does not alter C1-R7, application/runtime source, canonical app, or the historical receipt claims.

## Exact finding and candidate

The exact-candidate [FINISH-26 independent delta audit](../../deliveries/completion-audits/FINISH-C1/finish-12/20261011T133844Z-c1-r7-delta-review-02/report.md) examined C1-R7 commit `e2670d4152c461005da86b392dbcea12cec740bf`, full tree `419950200cc9705a101468d44e5b589b40f609f0`, and app tree `42ea29ec235225046a75959eb19eb386ac2f821d`. The audit confirms all actual source receipts: ten R7 output rows, 27 Git-backed R6 inputs, two installed Three.js files, and 32 R5 predecessor rows. Its sole recommendation is REWORK for E-02: the verifier returns PASS when duplicated receipt metadata contradicts the authoritative input.

Use the verifier and receipt sources from the exact R7 commit only. Preserve `deliveries/FINISH-C1-R7/`, the audit root, all prior R5/R6 inputs and manifests, canonical `app/`, and every historical report byte-for-byte. Do not resolve E-01 or reinterpret historical receipt mismatches in this packet.

## Exclusive maker root and scope

Use only `deliveries/FINISH-C1-R8/`. This root was absent when allocated; recheck immediately before writing. If it is occupied, preserve it byte-for-byte and stop for Parent reallocation.

This is a verifier/evidence package only. Correct `verify-input-provenance.py` behavior against the exact R7 receipt model, add targeted red/green regressions, and return the corrected verifier, tests, exact candidate binding, logs, report, requirement matrix, and output hashes. Do not modify the original R7 verifier, application/runtime source, package dependencies, historical manifests, or any other root. Keep disposable scratch in `.work/` inside the assigned root.

## Required fail-closed checks

The corrected verifier must compare every duplicated declaration with its authoritative raw source, not accept a matching primary blob OID while ignoring contradictory metadata. At minimum:

1. Validate `candidate-input-provenance.json.sourceManifest` fields `commit`, `path`, `blobOid`, `sha256`, and `bytes` against the exact source-manifest Git blob at the pinned candidate commit.
2. Validate every field and list entry under `source-binding.json.threeDependencyEvidence.packageFiles` against the actual installed `three@0.180.0` package identity and the exact installed file bytes already represented by the R7 evidence. Validate the authoritative expected values for `three.module.js` and `three.core.js`, including package name/version, relative path, byte length, and SHA-256.
3. Reject missing, extra, duplicated, malformed, or contradictory aliases/rows wherever those receipt fields are required to agree. Keep the verifier fail-closed and return nonzero/FAIL for each invalid case.
4. Retain a positive run against the unmodified exact R7 delivery inputs that returns PASS. Prove the negative checks use disposable copies and do not mutate the pinned candidate, historical inputs, installed dependency tree, or canonical app.

Add explicit regressions for each previously false-passing mutation: source-manifest `commit`, `path`, `sha256`, and `bytes`, and the duplicated installed-package SHA-256. Include the uncached CLI case with a zeroed source-manifest hash, which previously returned PASS and exit 0. Preserve passing rejection coverage for malformed primary hashes, wrong paths/commits/counts, duplicate aliases/paths, missing files, unpinned commits, lock integrity, package identity/version and installed bytes.

## Evidence, lineage, and review

Bind the package to C1-R7 commit `e2670d4152c461005da86b392dbcea12cec740bf`; recompute the full Git and app trees and raw input blobs before running. Include exact commands, versions, stdout/stderr, exits, positive/negative results, hashes for every stable output, and a requirement matrix with PASS/FAIL/NOT RUN and scope limits. Report E-01, external GPT Plus #2, application/runtime/build/browser checks, physical/device/provider checks, Parent acceptance, integration, deployment and G7 as NOT RUN or separately pending according to actual evidence. Do not claim the maker's work is independently audited or accepted.

Commit and push only the completed `deliveries/FINISH-C1-R8/` package on its scoped branch. Parent will assign a separate exact-candidate delta audit and separately adjudicate E-01. The package cannot close E-01 or authorize canonical integration.
