# G7 evidence output isolation — maker delta

Status: implementation and focused regression complete; independent review and Parent acceptance remain required.

## Changed source paths

- `deliveries/G7/preparation/tools/g7-evidence.py`: preserve the raw `--output` spelling for validation; reject traversal, malformed/nonportable components, paths outside `deliveries/G7`, tool-source destinations, case aliases, symlinks/junctions, non-directory parents, hard-linked/existing destinations, and input/output collisions. Create missing parent directories one component at a time beneath the validated root, revalidate, and reserve the final file with exclusive `open("x")` so concurrent writers cannot replace one another's output.
- `deliveries/G7/preparation/tools/test_g7_evidence.py`: add isolated CLI regressions for existing-output/input preservation, traversal and case aliases, symlink/junction parents, hard-linked output, and concurrent exclusive creation. All fixtures use temporary roots and are labelled NOT LIVE.

## Final attempt 19 evidence

Worktree: `C:\Users\yoray\Projects\Yor-World-Local-Corrections`; Python 3.12.10.

| Command | Result | Raw evidence |
|---|---|---|
| `python -B deliveries/G7/preparation/tools/test_g7_evidence.py` | PASS — 33 tests, 1.959 s, exit 0 | `g7-evidence-tests.log`, `g7-evidence-tests.exit` |
| Python `compile()` on both changed files | PASS, exit 0 | `python-syntax.log`, `python-syntax.exit` |
| `git diff --check -- deliveries/G7/preparation/tools/g7-evidence.py deliveries/G7/preparation/tools/test_g7_evidence.py` | PASS, empty output, exit 0 | `scoped-diff-check.log`, `scoped-diff-check.exit` |

Commands, timestamps and exits are in `commands.json`. SHA-256 values for the changed sources and primary raw logs are in `output-hashes.json`.

Earlier attempts are preserved. Attempt 17 passed 32 tests before the added input/output regression. Attempt 18 passed 33 tests but its first diff check exposed CRLF line endings across the files (exit 2). The line endings were normalized to the repository's LF format; attempt 19 reran and passed all checks. The attempt-18 logs and hashes remain unchanged.

## Limits

This is fixture-only structural tool evidence. No production G7 ledger, R7 driver, shared build, browser run, external provider, native PostgreSQL/Supabase proof, independent audit, or acceptance was performed by this worker. The full Chrome+Edge 248/248 browser rerun belongs to the Parent's separate fixture-backed evidence and is not a G7 acceptance result.
