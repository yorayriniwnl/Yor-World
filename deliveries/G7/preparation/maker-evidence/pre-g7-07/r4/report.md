# PRE-G7-07 R4 release integration maker handoff

Ready for independent review and parent source freeze. This report is maker evidence, not acceptance.

Input revision: merged parent HEAD `d6b90100cd58cc26b918db6aa4a6d5039df4a7f6`.
Read directly: `START_HERE.md`, `docs/planning/delegation-and-work-orders.md`, `docs/planning/reconciliation-packets/2026-10-07-pre-g7-07.md`, the seven assigned paths, `scripts/release/validate-release.mjs`, `.github/workflows/integrity.yml`, and `.gitignore`. Workspace terminal and filesystem access were available. No provider actions or external account dispatch were performed.

Changed only the seven assigned tracked paths:

- `scripts/release/rc6-policy.json`: binds delivery and canonical bundle to `deliveries/G7/rc6-candidate-r4/`.
- `scripts/release/release-lib.mjs`: preserves reconciled R3 by name and filesystem identity, alongside previously preserved proof.
- `scripts/release/tests/immutable-output.test.mjs`: includes R3 in canonical, Windows casing and isolated alias guards; mutable fixture moves to R4.
- `scripts/release/tests/policy-output.test.mjs`: checks R4 binding; rejects R3 archive drift, preserved roots, CLI override writes, and Python aliases/casing before any output is created.
- `deliveries/G7/preparation/tools/candidate-driver.py`: includes preserved R3 in Python output guards.
- `.github/workflows/ci.yml`: preflights policy paths, derives the delivery root, writes strict validation within that root, then copies the actual JSON receipt into `.rc6-ci/release-manifest-validation.receipt.json` for existing artifact upload.
- `.github/workflows/generate-rc6-r3.yml`: deleted; prior contents remain in Git history.

The thirteen required quality checks, browser discovery counts (109/17/6), quality steps 1–12, upload behavior, app source, pointer test assertions, and timing thresholds remain unchanged. The remote whole-test allowance already present in the merged source is untouched.

| Check | Result | Actual evidence |
| --- | --- | --- |
| `node --test scripts/release/tests/immutable-output.test.mjs scripts/release/tests/policy-output.test.mjs` | PASS — 31 tests, zero failures/skips | `release-guards.log` |
| `python -B scratch/pre-g7-07-r4/preflight.py` | PASS | `preflight.json`, `preflight.log`, reproducible `preflight.py` |
| Preserved R1/R2/R3 proof content and file membership | PASS — 470 files byte-identical to before edit | `preserved-proof-before.json`, `preflight.json` |
| CI policy environment preparation | PASS — actual Node command executed, expected root/count outputs verified | `preflight.py`, `preflight.json` |
| All thirteen CI check labels; steps 1–12 identical; receipt copy before upload | PASS — read-only workflow wiring checks | `preflight.py`, `preflight.json` |
| Node syntax, Python AST parsing, `git diff --check`, no app delta | PASS | `preflight.py`, `preflight.json` |
| Fresh full R4 checks, packaging, exact-head hosted CI/artifact verification | NOT RUN — parent owns source freeze and fresh proof | No candidate directory created by maker |
| Commit/push | NOT RUN — parent explicitly owns Git | Scope left reviewable in shared worktree |

Tools: Node v24.19.0, Python 3.12.10, Git 2.55.0.windows.5. Git emitted only its normal LF/CRLF conversion warning for the Python file; whitespace check exited zero.

Open defects: none identified in maker scope. Independent acceptance is pending. Other existing untracked paths were not edited or staged. Parent next step: independent delta review, scoped integration commit/push, source freeze, complete fresh R4 candidate proof, and exact-head hosted verification. No G7 or production/manual acceptance is claimed.
