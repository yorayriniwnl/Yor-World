# FINISH-A1-R8B recovered-input source supplement

**Status:** Evidence-source supplement for the first FINISH-49 commit. This does not accept R8/R9 or A1.

## Provenance correction

- Pinned base: R8 `e377e06c514819ee6dbd82da2216c95813bedd2f` (tree `552cb2618c31fe000ab4fae0a9e5997c6442d084`; app tree `42ea29ec235225046a75959eb19eb386ac2f821d`).
- R9 reference: `a2f0e218f8153ceec311616f49b7b654c9892bb2` remains partial; this supplement changes no R8/R9 paths and adds no app/test files.
- R8 input manifest declares 15 inputs, of which 13 were raw-Git backed. The two R5 review artifacts below were absent from the pinned R8 tree and had no matching R8 raw Git object.
- Their source is honestly labeled `PARENT-LOCAL-COPY`: read-only copies from the original C: workspace. They are not represented as having existed in R8.

## Exact byte checks

| File | Source bytes | SHA-256 | R8B Git blob (computed from exact bytes; post-commit rechecked in R10) |
|---|---:|---|---|
| `findings.json` | 8,980 | `bcb50fae65b6e51fddb561c0a60c7ca0941ef155aed2fb97373892f1ca3e4f9a` | `a7cc38a2d8b28dd70afd4e91501f4afedbc245ff` |
| `report.md` | 10,043 | `cd5930619153ae1fec6b71ac821fdbd92aa2fa5647a24b3805e62dc6f28ea586` | `7e203c31c24c58d94dc002825fc103eadbb22a2c` |

Both C: inputs were checked for exact declared byte count and SHA-256 before copy. The raw command result is `evidence/logs/source-verification.log`; R8 path-absence checks are `evidence/logs/r8-absence.log`. The C: files were only read; all new files are under this F: worktree. Nested `.gitattributes` marks recovered bytes binary to preserve their exact original line endings in Git.

## Verification boundary

- Source size and SHA checks: PASS.
- R8 path absence: PASS.
- Candidate object IDs are deterministically precomputed from the exact copied bytes. Actual R8B raw-Git object comparison is required after this commit and is recorded by the child R10 package.
- Full R8 input provenance: PARTIAL (13 raw Git inputs remain inherited; these two have only local-copy origin).
- App replay, build, browser tests, production services, deployment, acceptance and audit: NOT RUN in this source-only commit.

R8B is an evidence-source supplement only. It makes no acceptance, audit, integration or deployment claim.
