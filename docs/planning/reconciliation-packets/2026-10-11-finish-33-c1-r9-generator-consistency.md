# FINISH-33 — C1-R9 evidence-pointer generator consistency amendment

Date: 2026-10-11 UTC
Status: Parent amendment to FINISH-30. It adds only the same E-02-05 evidence-pointer correction to the package's matrix generator so a later regeneration cannot restore the stale path.

## Finding and exact input

FINISH-30 binds C1-R8 commit `c398876583bc337c069414b79364e3fdea745879`, branch `codex/finish-28-c1-r8-20261011`, and delivery subtree `da822d0362e06e92497001583afb7405b7ccd472`. The R8 `requirement-matrix.json` correctly includes `evidence/cli-negative-false-pass.json` but also names the absent `evidence/cli-negative-false-pass.log`. The JSON contains the command, stdout, stderr, parsed result, and exit code.

At the same exact R8 commit, `scripts/finalize.py` emits the same invalid two-path list for E-02-05. Re-running that package generator after FINISH-30's matrix-only correction would restore the absent `.log` reference. Its raw Git blob is 15,199 bytes with SHA-256 `13072944488d72e3aae053628af299e48bdbe3fa1ab5ac794caec9a07b1247d8`. This amendment corrects that generator template to emit only the already committed JSON evidence, matching the one authorized matrix pointer correction.

## Exact scope

FINISH-30 still governs the R9 allocation, exact R8 source commit, and preservation rules. Use only the absent `deliveries/FINISH-C1-R9/` root, after rechecking it immediately before writing. Produce the same scoped branch, `codex/finish-30-c1-r9-20261011`, from the exact R8 commit. If the root or branch is occupied by unrelated work, preserve it and stop.

In the R9 package, change only these two representations of the same evidence pointer:

1. In `requirement-matrix.json`, remove the absent `.log` entry from E-02-05's evidence list, retaining the single existing `evidence/cli-negative-false-pass.json` path.
2. In `scripts/finalize.py`, make the E-02-05 matrix template emit that same single JSON path.

Do not run the whole finalizer: it regenerates time-stamped receipts and other evidence outside this amendment. Do not change the verifier, tests, source receipts, application/runtime, dependencies, historical package claims, other matrix rows, or E-01 disposition. Preserve the R8 report and receipts byte-for-byte; add a short R9 correction report and binding record, then recompute the complete stable output-hash manifest. Verify all matrix evidence paths resolve to files in the package, and statically confirm the finalizer's E-02-05 row equals the emitted matrix row.

The exact candidate remains unaccepted. Return the changed-path inventory, candidate binding, correction report, final matrix, raw output hashes, and verification evidence. Commit and push only the R9 package on its scoped branch. A separate independent delta review and Parent decision are still required; this amendment closes neither E-01 nor any production, integration, deployment, or G7 gate.
