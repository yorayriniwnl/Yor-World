# LOCAL-CORRECTIONS-02 release-tool maker handoff

Implemented in the assigned correction worktree. This is maker evidence for Parent/independent review, not acceptance, an external account dispatch or production proof. Parent owns commits/pushes and final source freeze.

## Inputs and scope

Read START_HERE, current delegation, AGENTS, LOCAL-CORRECTIONS-01/02, actual RC6-R1 Markdown/decision and the original local-check summary. Product design revision 2 opening was read for revision identity; no visual/art implementation or whole-spec review is claimed.

Coordination base: `f6a8df58095807b09004c2f0ab8a2382c3971e80`. Accepted source: `8e5b954e147a87e36a6869d9940c40f3d4c123f0`; accepted app tree: `42ea29ec235225046a75959eb19eb386ac2f821d`. Source/bundle/manifest for R7 remain unassigned until Parent's final source freeze.

Raw input SHA-256:

| Input | SHA-256 |
| --- | --- |
| LOCAL-CORRECTIONS-01 | 0c199ae908f2ab89ffe06dd968f07a4886413a8034a1b284e5024f4d0065be65 |
| LOCAL-CORRECTIONS-02 | 6fb4800c09c9da8ea3e4994f41969303a77ea3e3cc748512f1d6ef6204b53990 |
| RC6-R1 decision.json | daf0c6b95ae2533cda7e732610b1a562094dfb4effdc5d45e0bf95d23713c31c |
| Product design revision 2 | 9a05f7c0485fd46299e96706d3d7c4195eb30b2ae33710b37d67f2763aceff05 |

## Returned source files

- `scripts/release/rc6-policy.json`: active delivery/archive change to `deliveries/G7/rc6-candidate-r7`, retaining release v1.0.0-rc6, candidate/selfApproved:false and frozen identities/budgets.
- `scripts/release/release-lib.mjs` and `deliveries/G7/preparation/tools/candidate-driver.py`: extend preserved paths to exact R6 root, RC6-R1 directory/Markdown, `rc6-independent-delta/r6-audit` and `rc6-independent-delta/gate-advice/final-r6`. Existing path, casing, alias, hardlink, source and portability checks remain intact.
- `scripts/release/tests/immutable-output.test.mjs` and `policy-output.test.mjs`: isolated direct/alias rejection, unchanged file/directory sentinels, case/hardlink and distinct R7 writer checks. Existing receipt/input classifications and export validation assertions remain intact.
- `deliveries/G7/preparation/tools/g7-evidence.py`, `test_g7_evidence.py`, `README.md`: exact RC6-R1/RC6-R2 ruling-ID allowlist; both retain identical hash, authority, candidate identity, owner authorization and ordering checks. Tests include both full structural positives and wrong ruling/authority/identity/time/hash negatives.

No application, workflow, archive assembler, API or environment changes were made by this lane. No actual historical writer target was executed: filesystem mutations use isolated temporary repositories, including all negative CLI and Python checks. Read-only canonical guard checks call the guard without a writer.

## Actual verification

Environment: Windows PowerShell, Node v24.19.0, Python 3.12.10.

| Check | Result | Evidence | Detail |
| --- | --- | --- | --- |
| JS guard/policy and embedded Python checks | PASS | guard-tests.log | Exit 0; 57/57 tests, zero fail/skip, 33.104 seconds |
| G7 structural ledger suite | PASS | g7-evidence-tests.log | Exit 0; 28 unittest methods, 1.762 seconds; additional R1/R2 subtests |
| Scoped whitespace check | PASS | validation-summary.json | `git diff --check -- scripts/release deliveries/G7/preparation/tools`, exit 0 |
| Frozen browser discovery/count update | NOT RUN / PENDING | Current policy | 109 E2E /17 accessibility /6 performance temporarily retained, pending Parent's actual frozen inventory |
| Full app build/browser/performance suites | NOT RUN | Parent coordination | Shared execution is Parent-owned after UI/rendering freeze |
| R7 packaging, hosted CI, independent review and RC6-R2 adjudication | NOT RUN | Parent execution | Final source and real evidence required |
| Deployment/G7/live/manual/assistive/physical proof | NOT RUN | Outside this maker lane | No claims |

Commands from this worktree:

```powershell
node --test scripts/release/tests/immutable-output.test.mjs scripts/release/tests/policy-output.test.mjs
python -B deliveries/G7/preparation/tools/test_g7_evidence.py
git diff --check -- scripts/release deliveries/G7/preparation/tools
```

Structural fixture ingestion validates structure, identities, hashes and time consistency only. It does not authenticate authority, operator claims or actual execution. Even a full fictitious structural PASS retains `independentReview: NOT RUN`, `heapGpuLeakAbsence: UNKNOWN`, and `acceptanceClaim: false`.

Open item: Parent must supply actual discovered browser counts after both application makers freeze. Parent then commits/pushes this bounded lane and reviews the delta independently before final R7 execution. Accepted local port3000 server was not stopped or changed.
