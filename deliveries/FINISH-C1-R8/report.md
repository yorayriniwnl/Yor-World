# FINISH-C1-R8 verifier correction

## Candidate and scope

This evidence-only package corrects the verifier against exact C1-R7 commit `e2670d4152c461005da86b392dbcea12cec740bf` (parent `1058676cb74d8239aae7fed3dfa91defcc8a30a1`, full tree `419950200cc9705a101468d44e5b589b40f609f0`, app tree `42ea29ec235225046a75959eb19eb386ac2f821d`). [Candidate binding](evidence/candidate-binding.json) records raw Git receipts. The original verifier SHA-256 is `bc8aaa4d97dcf6117c9fce9d319c3f96d9cbb94af453552ba3e224ea2ef7bb91`; the focused change is [verifier-diff.patch](evidence/verifier-diff.patch).

Only `deliveries/FINISH-C1-R8/` was changed in the isolated worktree. The three R7 receipt inputs were copied byte-for-byte from the exact pinned R7 commit. R7, earlier evidence, `app/`, and the installed dependency tree were not modified.

## Correction

The verifier now compares all five `candidate-input-provenance.json.sourceManifest` fields (`commit`, `path`, `blobOid`, `sha256`, `bytes`) against the raw R6 manifest blob at the pinned R6 commit. Missing, extra, incorrectly typed, or contradictory fields fail.

It also validates duplicated installed-Three declarations against the actual package manifest and exact installed bytes. `packageName` and `packageVersion` must match installed `three@0.180.0`. `packageFiles` must contain exactly two unique rows with exactly `alias`, `packageFile`, `sha256`, and `bytes`; each value is checked against pinned evidence and the bytes read from the installed package. The module file is 603,113 bytes / SHA-256 `c8211c69345d2e9949dc7a8ac969380497aa0600a5a8ac6a459c8cd02dd9cb8a`; the core file is 1,403,455 bytes / SHA-256 `eb077d2417f61d3e6d9264c317cabc4ea35769ed6b0ab533067292a550784c20`.

## Verification

The direct positive CLI invocation used the exact copied R7 receipt inputs and enabled the R7 output-manifest check:

```text
py -B deliveries/FINISH-C1-R8/verify-input-provenance.py --json --check-output-manifest --commit e2670d4152c461005da86b392dbcea12cec740bf
```

Result: **PASS**, exit 0. It verified 29 R6 rows, 32 R5 predecessor rows, and ten R7 output-manifest rows (186,448 bytes). Raw stdout/stderr are under `evidence/exact-r8-positive-r7-inputs.*.log`; the structured result is `evidence/exact-candidate-verification.json`.

The disposable regression command was:

```text
py -B deliveries/FINISH-C1-R8/run_regressions.py
```

Result: **PASS**, exit 0; 51/51 expected negative cases rejected. The suite retains the earlier rejection categories and tests each previously false-passing source-manifest field, the duplicated installed-package SHA-256, and malformed/missing/extra/duplicate declarations. Mutations ran against disposable `.work/` receipt or package copies. The uncached CLI reproduction enabled `--check-output-manifest` with a zeroed source-manifest hash in a copied input; it returned JSON `FAIL`, exit 1. That process used no verifier cache and did not change R7 or installed dependencies. See `evidence/negative-regression-results.json`, `evidence/regression-command.json`, and the captured logs.

Tools: Python 3.12.10, Git 2.55.0.windows.5, PowerShell 5.1.26100.9549. Node 24.19.0 and pnpm 9.15.9 were observed but not used. Full details are in `evidence/tool-versions.json`.

## Limits and handoff

This is maker evidence only. External GPT Plus #2 review, independent R8 delta audit, Parent acceptance, E-01 adjudication, application/runtime/build/browser/device/provider checks, canonical integration, deployment, and G7 remain **NOT RUN / pending**. This correction does not close E-01 or authorize integration.

The canonical checkout's `deliveries/FINISH-C1-R8/` was absent during my immediate pre-write check. Parent later notified me that a canonical R8 folder had appeared. I did not inspect, copy to, stage, or cherry-pick into that now-occupied path. This package is confined to the isolated temporary worktree and its scoped branch, `codex/finish-c1-r8-e02-verifier`; Parent will adjudicate the collision and any fresh output root.

Stable package hashes are in `output-hashes.json` (the manifest excludes itself and `.work/`). Requirement outcomes are in `requirements-matrix.json`.
