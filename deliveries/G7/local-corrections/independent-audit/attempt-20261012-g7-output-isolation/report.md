# G7 evidence ledger output isolation — independent local re-audit

Date: 2026-10-12. Audited source commit: `608f3ade99b0e307e5a3c164cb09caa3b89642eb`. The source files were clean at that commit and remain unchanged in the re-audit checkout. Current audit-record commit before this report: `dece4f1bc4b5ca784df27d5b1c2b396a27566663`.

## Result

**PASS for the bounded output-isolation correction.** The CLI validates the requested destination beneath `deliveries/G7`, blocks output into its tool sources, rejects traversal and nonportable path components, checks existing path components for case aliases and filesystem links, rejects existing destinations, and creates the final ledger with exclusive `open("x")`. Parent creation is component-wise and the destination is revalidated before the exclusive create. The focused regression suite passed 33 tests with no skips in this independent rerun.

| Check | Result | Evidence |
|---|---|---|
| `python -B deliveries/G7/preparation/tools/test_g7_evidence.py` | PASS — 33 tests, 0 skips, exit 0 | `g7-evidence-tests.log`, `g7-evidence-tests.exit` |
| Python compile of the implementation and test files | PASS, exit 0 | `python-syntax.log`, `python-syntax.exit` |
| `git show --check` on the audited committed source diff | PASS, exit 0 | `commit-check.log`, `commit-check.exit` |
| Audited source identity | PASS — SHA-256 bound | `evidence.json` |

The regression cases cover existing-output preservation, output-path traversal and case aliases, symlink/junction parents, hard-linked destinations, and two concurrent writers targeting one final filename. The tool and its temporary-root fixtures do not make a production-readiness or acceptance claim.

## Limits

This confirms local structural behavior on the recorded Windows/Python environment. It does not run the R7 candidate driver, create a production ledger, or establish hosted service, browser, native database, independent external review, source acceptance, or G7 acceptance. The suite does not simulate a hostile process swapping a parent directory between the final validation and file open, or forced termination during the write; this audit therefore makes no claim about adversarial filesystem races or crash-atomic publication.

## Evidence identity

The rerun uses the committed source at `608f3ade99b0e307e5a3c164cb09caa3b89642eb`; the focused source paths had no worktree modifications. Exact source hashes, Python version, audit HEAD, and check exit codes are recorded in `evidence.json`.

Console logs are stored as UTF-8 with LF line endings for repository portability; their command output and exit codes are retained.
