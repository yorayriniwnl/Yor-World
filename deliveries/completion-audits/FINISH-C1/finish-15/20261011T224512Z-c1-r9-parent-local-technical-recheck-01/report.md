# FINISH-36 C1-R9 parent-local technical recheck

Status: **PASS recommendation for the bounded E-02-05 evidence-pointer correction only.** This is a Parent-local technical recheck of the exact package. The assigned GPT Plus #2 review was **NOT RUN**; Parent acceptance and canonical integration remain pending. C1 E-01 remains open.

## Candidate binding

The delivery commit is `3dda9a616033375768f3d5f60f8c653d504f7c8c`, parent `c398876583bc337c069414b79364e3fdea745879`, full tree `5a38d405499737ff40b0141a64845c244a9e4813`, and R9 subtree `aa097f12adff2dbac2c88d6300c949f37bf34251`. The recorded remote branch `codex/finish-30-c1-r9-20261011` resolves to that commit. The R8 parent subtree is `da822d0362e06e92497001583afb7405b7ccd472`; the root `app/` tree remains the accepted `42ea29ec235225046a75959eb19eb386ac2f821d`.

## Recheck results

All 26 output-manifest rows match raw Git blobs, with 26 unique paths and 145,757 declared bytes. The manifest SHA-256 is `31903805363ed7d56521d334893d40d99079a716e1b374ac2a4c1895ecaff465`.

Relative to the exact R8 package, 20 of 23 inherited files are byte-identical. The only changed inherited files are `requirement-matrix.json`, `scripts/finalize.py`, and `output-hashes.json`; the four new files are the correction report, candidate binding, correction verification, and changed-path inventory. The seven-path inventory matches those changes exactly.

The matrix preserves all seven requirement statuses and every one of its ten evidence references resolves to a committed R9 file. E-02-05 now cites only `evidence/cli-negative-false-pass.json`. Its receipt records a zeroed `sourceManifest.sha256`, an uncached CLI command for the pinned R7 candidate, structured `FAIL` output, exit code 1, empty stderr, and identical original-receipt hashes before and after. The finalizer template contains the matching single-path evidence change. The inherited behavioral tests and finalizer were not rerun, consistent with the correction packet.

## Limits and recommendation

This check does not close E-01, rerun the inherited application/runtime tests, provide the assigned GPT Plus #2 review, accept the candidate, integrate it, or establish provider, device, deployment, or G7 readiness. Those remain **NOT RUN / OPEN**. I recommend Parent acceptance of the bounded R9 evidence-pointer correction only after the required independent review is supplied.
