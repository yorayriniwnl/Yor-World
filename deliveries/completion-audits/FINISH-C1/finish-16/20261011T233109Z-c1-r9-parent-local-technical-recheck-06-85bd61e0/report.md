# FINISH-41 Parent-local C1-R9 technical recheck

**Local result: PASS for the R9 E-02-05 evidence-pointer correction.** This is a narrow Parent-local technical recheck; it does not rerun inherited behavioral tests, adjudicate E-01, substitute for GPT Plus #2, or accept the candidate.

R9 candidate `3dda9a616033375768f3d5f60f8c653d504f7c8c` on `codex/finish-30-c1-r9-20261011` has exact parent R8 `c398876583bc337c069414b79364e3fdea745879`. Both R9 and the pinned R8 input branches match their remote commits. The R9 full tree and package subtree match the allocated identities; all 26 output-manifest rows (145,757 bytes) match raw Git. The R8 output manifest also matches all 22 rows. The canonical root `app/` tree remains `42ea29ec235225046a75959eb19eb386ac2f821d`.

Raw R8-to-R9 comparison found **20 unchanged inherited files, 3 changed inherited files, 4 additions, and no removals**. The exact seven paths match `changed-paths.json`: `output-hashes.json`, `requirement-matrix.json`, `scripts/finalize.py`, `changed-paths.json`, `evidence/r9-correction-verification.json`, `r9-candidate-binding.json`, and `r9-correction-report.md`.

The matrix retains all seven statuses, all non-E-02-05 rows are byte-equivalent after parsing, and every evidence reference resolves to a committed R9 file. E-02-05 now cites only `evidence/cli-negative-false-pass.json`. A raw R8/R9 finalizer diff confirms its template changes only by removing the obsolete `.log` item from that evidence list. The committed negative receipt records a new uncached Python process, a zeroed `sourceManifest.sha256`, child exit code **1**, parsed result **FAIL**, empty stderr, and identical before/after hashes of the original receipt. The R7 candidate ID is consistent across R9’s output manifest and binding.

The R9 finalizer and inherited behavioral tests were **NOT RUN**, as required by the packet. E-01 remains open. The maker’s R8 behavioral results are preserved as prior receipts, not represented as new Parent test runs.

**Process-boundary disclosure:** after FINISH-37, Parent inadvertently read `report.md` from both original FINISH-36 output roots and wrote temporary verification/replay scratch under the then-active FINISH-37 roots. FINISH-38 roots were occupied; only their immediate top-level names were recorded. This report uses none of the FINISH-37/38/39/40 output contents. It was regenerated under FINISH-41 from raw Git objects. No candidate commit or canonical `app/` source was modified.

External audit, Parent acceptance, canonical integration, deployment/provider/device/recovery checks, and G7 remain **NOT RUN**. No acceptance or production claim is made.

Raw R8/R9 bindings, matrix snapshots, false-pass receipt, finalizer diff, commands, findings and hashes are in this directory. `output-hashes.json` excludes itself and `.work/`.
