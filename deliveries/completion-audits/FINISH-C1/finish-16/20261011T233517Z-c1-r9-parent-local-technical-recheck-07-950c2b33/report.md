# FINISH-36 C1 parent-local technical recheck

**Recommendation: PASS for the E-02-05 evidence-pointer correction only.** This does not resolve E-01, substitute for the external GPT Plus #2 audit, accept implementation, or authorize canonical integration.

## Exact candidate and raw object checks

- Branch/remote: `codex/finish-30-c1-r9-20261011` at `3dda9a616033375768f3d5f60f8c653d504f7c8c`.
- R9 commit/tree: `3dda9a616033375768f3d5f60f8c653d504f7c8c` / `5a38d405499737ff40b0141a64845c244a9e4813`; parent R8: `c398876583bc337c069414b79364e3fdea745879`.
- R9 package tree: `aa097f12adff2dbac2c88d6300c949f37bf34251`. Root `app/`: `42ea29ec235225046a75959eb19eb386ac2f821d` (unchanged).
- R8 tree/package: `798de513703f3d7e76f8d82edb85257d32894681` / `da822d0362e06e92497001583afb7405b7ccd472`.
- R9 output manifest: 26 rows / 145,757 bytes, all raw-blob hashes match. R8: 22 rows / 140,981 bytes, all raw-blob hashes match.

The exact R9/R8 delta is the seven declared files: `changed-paths.json`, `evidence/r9-correction-verification.json`, `output-hashes.json`, `r9-candidate-binding.json`, `r9-correction-report.md`, `requirement-matrix.json`, and `scripts/finalize.py`. The requirement matrix has seven unchanged status/claim rows; all ten evidence paths resolve. E-02-05 points only to `evidence/cli-negative-false-pass.json`. The finalizer differs only by removing the stale `.log` pointer from that one template row.

The committed disposable-copy negative receipt records child exit **1**, parsed status **FAIL**, matching JSON stdout, empty stderr, and the same original receipt hash before and after. No candidate change or rewrite was made.

## Scope boundaries

- The C1 finalizer and inherited behavioral tests were **NOT RUN**, as required by the packet.
- E-01, external GPT Plus #2 audit, Parent acceptance, canonical integration, providers, devices, deployment, recovery/manual operations, and G7 remain **NOT RUN / PENDING**.
- The allocation history records a FINISH-37 process-boundary incident: those roots were opened and altered during earlier parent work despite the preceding no-open instruction. This report did not inspect or use FINISH-37 through FINISH-41 output contents as evidence; it uses exact candidate raw Git objects under the fresh FINISH-42 allocation.
