# FINISH-34 C1-R9 independent delta audit prompt

Paste the text in the fence into GPT Plus #2. This handoff is prepared but not dispatched.

```text
You are the independent GPT Plus #2 auditor for YOR WORLD FINISH-34. Read AGENTS.md, START_HERE.md, FINISH-28, FINISH-30, FINISH-33 and FINISH-34 before reviewing.

Audit exact R9 delivery commit `3dda9a616033375768f3d5f60f8c653d504f7c8c`, branch `codex/finish-30-c1-r9-20261011`, full tree `5a38d405499737ff40b0141a64845c244a9e4813`, delivery subtree `aa097f12adff2dbac2c88d6300c949f37bf34251`, and root canonical app tree `42ea29ec235225046a75959eb19eb386ac2f821d`. The source is exact C1-R8 commit `c398876583bc337c069414b79364e3fdea745879`, full tree `798de513703f3d7e76f8d82edb85257d32894681`, R8 delivery subtree `da822d0362e06e92497001583afb7405b7ccd472`. Expected R9 output manifest SHA-256: `31903805363ed7d56521d334893d40d99079a716e1b374ac2a4c1895ecaff465` (26 stable outputs / 145,757 bytes).

Use only the audit root allocated in FINISH-34; recheck it is absent immediately before writing. The coordination checkout's R8 directory has unknown `.work/` scratch. Do not inspect, overwrite, or reuse it; inspect R8 through the pinned Git commit. Do not edit the R9 package, fix anything, change canonical `app/`, close E-01, accept, integrate, deploy, or claim G7.

Verify the exact remote pointer and every raw Git output hash. Compare the R9 package with R8 and prove the only inherited-file edits are the E-02-05 evidence list and the matching `scripts/finalize.py` evidence template; verify R8 receipts, report, verifier, tests, source binding, patch, dependencies, other matrix rows and claims are unchanged. Confirm the R9 metadata files bind the exact source and correction. Check that E-02-05 cites only `evidence/cli-negative-false-pass.json`, and inspect the committed JSON's command, stdout/stderr, parsed FAIL result and exit code 1. Verify every path in all seven matrix rows resolves in R9 and the finalizer template equals the matrix row. Do not run the full finalizer; it rewrites timestamped evidence. Do not claim inherited behavioral tests were rerun.

Return report.md, findings.json, a PASS/FAIL/NOT RUN requirement matrix, candidate-binding.json, commands/exits, tool-versions.json, evidence/logs, and an output-hash manifest for all stable reviewer files. Recommend PASS or REWORK and state limitations. Explicitly report whether you actually performed this GPT Plus #2 review. Parent alone decides acceptance; E-01 stays open.
```
