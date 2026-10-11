# FINISH-C1-R9 evidence-pointer correction return

Status: **maker package prepared; independent delta audit and Parent acceptance pending**.

This package carries the exact C1-R8 delivery from commit `c398876583bc337c069414b79364e3fdea745879` on `codex/finish-28-c1-r8-20261011` (full tree `798de513703f3d7e76f8d82edb85257d32894681`; delivery subtree `da822d0362e06e92497001583afb7405b7ccd472`). Its underlying C1-R7 candidate remains `e2670d4152c461005da86b392dbcea12cec740bf`, with canonical `app/` tree `42ea29ec235225046a75959eb19eb386ac2f821d`.

The FINISH-30 matrix defect is corrected in the single E-02-05 evidence list: it now cites only `evidence/cli-negative-false-pass.json`, whose inherited raw receipt contains the command, child stdout/stderr, parsed FAIL result and exit code 1. The same pointer is corrected in the E-02-05 template in `scripts/finalize.py`; a full finalizer run was intentionally not performed because it regenerates time-sensitive receipts outside FINISH-33 scope.

Raw-byte verification confirms all other files from the R8 Git package remain identical. Every evidence path in all seven matrix rows resolves to a committed file in this R9 package. The matrix's packet, candidate commit, requirement text, statuses and all rows other than E-02-05 are unchanged. The inherited E-02 regression evidence was not rerun; this package does not alter the verifier, tests, receipts, app/runtime or dependencies.

Changed package paths are listed in `changed-paths.json`; `output-hashes.json` covers every stable file except itself. E-01, independent review, Parent acceptance, canonical integration, deployment and G7 remain open or NOT RUN.
