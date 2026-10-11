# FINISH-30 - C1-R8 evidence-matrix correction

Date: 2026-10-11 UTC
Status: Parent-authorized evidence-only correction following a local exact-candidate recheck. C1-R8 remains unaccepted.

## Finding and exact candidate

The local recheck of C1-R8 commit `c398876583bc337c069414b79364e3fdea745879` confirmed its 22 output-manifest rows, all nine regression tests, and the pinned C1-R7 verifier run. It found one stale evidence reference: `requirement-matrix.json` cites `evidence/cli-negative-false-pass.log`, which is not in the committed delivery. The required command, stdout, stderr, parsed FAIL result and exit code are present in `evidence/cli-negative-false-pass.json`.

This recheck is a Parent local check, not an independent GPT Plus #2 audit or acceptance. The prior C1-R8 package remains immutable at its exact commit. E-01 remains separate and open.

## Reallocated output and exclusive scope

The previous path `deliveries/FINISH-C1-R8/` now exists locally with a top-level `.work/` directory. Preserve it and do not inspect or reuse its contents. Reallocate the matrix-reference correction to `deliveries/FINISH-C1-R9/`, which was absent at allocation; recheck immediately before writing and stop for Parent reallocation if occupied.

Use only exact C1-R8 commit `c398876583bc337c069414b79364e3fdea745879` as the source package. Change the E-02-05 evidence reference to the existing JSON file. Do not change the verifier, tests, source receipt, application/runtime, dependency files, prior receipts, E-01 disposition, or any other claim. Recompute stable output hashes and ensure every matrix evidence reference resolves to a committed file.

The correction is governed by FINISH-28; this packet changes only the destination and the single evidence pointer. Return a concise report and exact candidate binding. Commit and push only `deliveries/FINISH-C1-R9/` on its scoped branch. Parent will assign separate delta review. No self-acceptance, E-01 closure, canonical integration, deployment or G7 claim is authorized.
