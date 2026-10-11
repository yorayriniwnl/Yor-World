# FINISH-21 — C1-R6 committed-byte receipt correction

Date: 2026-10-11 UTC

Status: authorized evidence-only correction; C1 implementation acceptance remains pending independent delta review and Parent adjudication.

## Finding and boundary

FINISH-16 independently rechecked C1-R6 commit `9188b413d37da0ec3381b5430e25dc375a45bb18` and recommends REWORK for E-01 only. Its source behavior, source replacements, tests, build, and source-bound browser checks passed the recorded local scope. The evidence defect is that R6's inherited input receipts and R5's predecessor output manifest record Windows working-tree bytes instead of consistently binding the exact committed Git blobs: 22/29 R6 inputs are raw exact, six differ only by line endings, and one historical diagnostic test differs by one CR byte; 9/32 R5 outputs are raw exact, while all six R5 source replacements are exact. See [the FINISH-16 report](../../../deliveries/completion-audits/FINISH-C1/finish-10/20261011T061133Z-c1-r6-independent-review-03/report.md) and [finding E-01](../../../deliveries/completion-audits/FINISH-C1/finish-10/20261011T061133Z-c1-r6-independent-review-03/findings.json).

This packet authorizes an append-only provenance supplement at `deliveries/FINISH-C1-R7/`. It does not rewrite R3, R5, R6, or FINISH-16 evidence, change any application source, alter the accepted design, or accept C1-R6. No production or canonical `app/` paths are authorized.

## Immutable identities

- R6 candidate commit: `9188b413d37da0ec3381b5430e25dc375a45bb18`; its full Git tree is `aaaef9759b66e4f680d5ab9306775a44e596e12f`; its application tree is `42ea29ec235225046a75959eb19eb386ac2f821d`.
- R6 output manifest: `deliveries/FINISH-C1-R6/output-hashes.json`, SHA-256 `a8dcd6700b2471b3a2d0d98d71a79ce398a33efcea5a1c48fc83d291cdeeb798` (35 outputs / 1,415,587 bytes).
- R5 candidate commit: `5e85e6a8a248581fe3893fd80c7da3d05079f305`; source patch SHA-256 `d6ad3359fa628067ab228eccc52f25d0604ddddb42813d7023e6a809cf60d83d`.
- FINISH-16 audit: `deliveries/completion-audits/FINISH-C1/finish-10/20261011T061133Z-c1-r6-independent-review-03/`.
- The immutable baseline remains `f62a43c5e71c00dcb89e28275ea81d842167db80` / app tree `42ea29ec235225046a75959eb19eb386ac2f821d`.

## Exact work

1. Recheck that `deliveries/FINISH-C1-R7/` is absent before writing. If it is occupied, stop and report it; Parent must allocate a new root.
2. Read the original R6 `input-hashes.json` at the pinned R6 commit. For each of its 29 declared paths, obtain the Git blob OID from the pinned commit tree, read the raw blob bytes with Git object commands, and record commit, path, blob OID, SHA-256, and byte count. Preserve each original expected hash and size alongside the corrected committed-byte values.
3. Read the original R5 `output-hashes.json` at the pinned R5 commit. For each of its 32 declared outputs under `deliveries/FINISH-C1-R5/`, derive the same raw Git-blob receipt. Also record the committed blob OID, SHA-256, and byte count for the original R5 manifest itself; it is intentionally excluded from its own output list.
4. Include a small standard-library verifier that independently resolves every `<commit>:<path>` to a blob, reads the raw bytes from Git, and verifies both corrected receipts. It must fail closed on a missing path, wrong commit/tree, duplicate path, count mismatch, or unresolved hash. Do not use checkout bytes, `Get-Content`, CRLF conversion, or Unicode normalization as the hash source.
5. Explain the one-byte diagnostic-test discrepancy using the pinned commit blob and the original receipt. The corrected R6 row must reflect the committed bytes, with no source edit inferred from the receipt error.
6. Add a concise report and requirement matrix. Mark the 29 R6 input blobs and 32 R5 predecessor outputs PASS only if every value matches the pinned Git objects. State that the original R6/R5 manifests remain unchanged and that source/runtime checks are inherited from FINISH-16, not rerun by this evidence-only task.
7. Provide raw command output, tool versions, the verifier's exit code, and an output manifest covering every stable R7 file except itself and `.work/`. Use UTF-8 JSON/text with LF endings and ensure post-commit verification against Git blobs gives the same recorded sizes and hashes.

## Owned paths and return

Own only `deliveries/FINISH-C1-R7/`. Return at minimum:

- `.gitattributes` (LF rules for this text-only receipt package)
- `report.md`
- `requirements-matrix.json`
- `source-binding.json`
- `candidate-input-git-blobs.json`
- `predecessor-output-git-blobs.json`
- `verify-git-blob-receipts.py`
- `evidence/verification.json`
- `evidence/verifier.log`
- `output-hashes.json`

Record exact expected, returned, and missing files in `report.md`. Keep scratch under `.work/` and exclude it from the output manifest. Commit and push only this delivery root after verifying the staged path list and committed Git-blob hashes. Preserve all unrelated untracked work. Do not edit or stage the prior candidate or audit roots.

## Review and acceptance

After the maker returns, Parent will allocate a separate exact-candidate delta audit. The reviewer must independently run the verifier, recompute all 29 and 32 receipts from the pinned Git objects, validate the R7 output manifest from committed bytes, and confirm that no application or historical evidence path changed. The reviewer reports PASS/FAIL/NOT RUN and does not fix files. External GPT Plus #2 remains unrun unless separately performed. Parent acceptance is still pending after any audit recommendation; this packet grants no self-acceptance, canonical integration, deployment, or G7 acceptance authority.
