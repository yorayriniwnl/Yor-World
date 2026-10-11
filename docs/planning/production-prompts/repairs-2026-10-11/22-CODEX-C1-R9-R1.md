# FINISH-33 C1-R9 generator-consistency correction

Use this amended maker handoff together with [FINISH-30](../../reconciliation-packets/2026-10-11-finish-30-c1-r8-matrix-evidence-reallocation.md) and [FINISH-33](../../reconciliation-packets/2026-10-11-finish-33-c1-r9-generator-consistency.md). FINISH-33 adds one matching generator-template edit; it preserves FINISH-30's source candidate, root, and all other boundaries.

```text
You are the local Codex evidence maker for FINISH-30 as amended by FINISH-33. Read AGENTS.md, START_HERE.md, both packets, the FINISH-30 maker prompt, the exact local C1-R8 recheck report, and exact input commit c398876583bc337c069414b79364e3fdea745879.

Use only deliveries/FINISH-C1-R9/ and branch codex/finish-30-c1-r9-20261011, based on exact C1-R8 commit c398876583bc337c069414b79364e3fdea745879. Recheck the delivery root immediately before writing; if occupied, preserve it and stop. Preserve the old deliveries/FINISH-C1-R8/ root; it contains unknown .work/ scratch. Do not inspect or reuse that scratch. Source every R8 file from the pinned Git commit, not from the local R8 directory.

The E-02-05 matrix currently lists evidence/cli-negative-false-pass.json and an absent evidence/cli-negative-false-pass.log. The JSON already contains the command, stdout, stderr, parsed FAIL result, and exit code. The R8 scripts/finalize.py template emits the same bad two-path list. Apply FINISH-33's exact, bounded correction: make both the R9 requirement-matrix.json E-02-05 evidence array and the R9 scripts/finalize.py E-02-05 template contain only evidence/cli-negative-false-pass.json. This is one evidence-pointer correction reflected in the generated artifact and its generator.

Do not run the whole finalizer because it regenerates time-sensitive receipts and unrelated outputs. Do not change the verifier, tests, source receipts, app/runtime, dependencies, prior R8 files, any other matrix row/claim, or E-01. Keep the original R8 report and receipts byte-for-byte; add a concise r9-correction-report.md and r9-candidate-binding.json that bind the exact R8 source commit/tree, the two same-pointer edits, and the unchanged accepted app tree.

Recompute output-hashes.json over every stable R9 package file except the manifest itself. Independently verify each listed byte count/hash, verify every matrix evidence path resolves to a committed R9 file, verify the E-02-05 template row equals the matrix row, and verify every other R8 file remains raw-byte-identical except the permitted matrix, finalizer, new correction report/binding, and recomputed manifest. Include commands, exact identities, changed-path inventory, and PASS/FAIL/NOT RUN results in the correction report. Do not claim the original E-02 tests were rerun; FINISH-30's JSON receipt is inherited evidence.

Commit and push only deliveries/FINISH-C1-R9/ on the scoped branch. Return the exact delivery commit/tree, delivery subtree, output-manifest hash, changed paths, and verification results. Do not self-audit, accept, integrate, change E-01, deploy, or claim G7. Parent will assign a separate independent delta audit and make the acceptance decision.
```
