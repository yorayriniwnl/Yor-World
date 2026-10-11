# Local Codex evidence maker: FINISH-30 C1-R8 matrix correction

Read `AGENTS.md`, `START_HERE.md`, FINISH-28, FINISH-30, [the local recheck report](../../../../deliveries/completion-audits/FINISH-C1/finish-13/20261011T144616Z-c1-r8-parent-local-recheck-01/report.md), and exact C1-R8 commit `c398876583bc337c069414b79364e3fdea745879`.

The old `deliveries/FINISH-C1-R8/` root is occupied by unknown `.work/` scratch. Preserve it without inspecting or reusing its contents. FINISH-30 reallocates the single evidence-matrix correction to `deliveries/FINISH-C1-R9/`; confirm that root is absent immediately before writing. If occupied, stop.

Copy the exact C1-R8 package from its pinned commit. Correct only the E-02-05 matrix evidence path from the absent `evidence/cli-negative-false-pass.log` to the committed `evidence/cli-negative-false-pass.json`, which contains the command and raw CLI stdout/stderr/exit. Do not alter the verifier, tests, source, receipts, historical claims, application/runtime, dependencies, or E-01 status.

Recompute the output hash inventory, verify each listed file against the new package, confirm every requirement-matrix evidence path resolves, and preserve the original exact R8 commit. Return the changed-path inventory, candidate binding, report, requirement matrix and hashes. Commit and push only the R9 package on its scoped branch. Do not self-audit, accept, integrate, close E-01, deploy, or claim G7.
