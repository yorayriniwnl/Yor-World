# Main protection preparation — operational handoff

Authority: Parent's bounded governance preparation assignment under PRE-G7-01 and owner authorization G7-OWNER-AUTH-20261006. Owned paths: `deliveries/G7/preparation/governance/` only. Preparation is returned for independent review and Parent decision; this worker does not accept its output or G7. Root coordinates the scoped commit/push.

At the last authenticated observation (`evidence/inspect-20261007T075346658892Z/before.json`), repository `yorayriniwnl/Yor-World` is public, User-owned, and defaults to main. Existing Git credentials identify `yorayriniwnl` with admin/maintain/push access. Main is `48ee09a98c9f7e59ca3a652c7f5dbeb31d0c7e2f`, unprotected; authenticated protection GET returned 404 and the rulesets inventory including parent rulesets was empty. The only collaborator is the owner. **No independent GitHub collaborator with write/review permission currently exists.** This proposal does not add collaborators; owner admin bypass remains available. Ordinary PR review needs an independent writer later. External source auditing is distinct from a GitHub approving review.

The authenticated `/user` response omitted a plan name, so the actual account subscription is **UNKNOWN**. The observed public repository is eligible for these protection controls on GitHub Free. No purchase/upgrade is needed or attempted. This eligibility follows GitHub's [protected branches documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches) and [branch protection API documentation](https://docs.github.com/en/rest/branches/branch-protection), checked on 2026-10-07. Admin role is proven; API administration-write authority is not claimed tested until the authorized PUT succeeds.

The actual current-head check contexts are `integrity` (completed/success) and `Verify & Validate Full-Stack RC6` (in progress in the last snapshot). Both are supplied by GitHub Actions app ID 15368. RC6 run 37589502218 / job 112689426280 is a push run of `.github/workflows/ci.yml`; the raw job-step inventory is retained. Required steps 1–13 are present but were not all completed at observation. This is not a final CI PASS.

The concrete payload is `evidence/inspect-20261007T075346658892Z/protection-payload.json`: exact two contexts, explicit GitHub Actions app bindings, strict/up-to-date checks, one required approving PR review, dismissal of stale reviews, no code-owner/last-pusher extra requirement, force-push/deletion settings false, no push restrictions, and `enforce_admins:false` to retain the owner emergency bypass. That standard admin exception means owner actions are not made subject to ordinary check/review enforcement. Parent retains responsibility for using it only through the established independent audit/acceptance process.

`protect-main.py` uses existing Git credentials in memory only and sends authenticated requests exclusively to literal `https://api.github.com`. Redirects are rejected, so Authorization cannot follow a redirect. No token is stored in environment variables, logs, or files. Error records contain API method/endpoint/status, not credential values or server error bodies. No browser authentication, installs, provider purchases, repository application/CI edits, or frozen-proof edits were performed.

The default command performs GET requests only and appends a new snapshot beneath `evidence/`:

```powershell
python deliveries/G7/preparation/governance/protect-main.py
```

After Parent has reviewed this preparation, pushed the final candidate/evidence head, and obtained exact-head hosted CI success, Parent may invoke the single scoped protection mutation:

```powershell
python deliveries/G7/preparation/governance/protect-main.py --apply --expected-head <final-pushed-40-character-main-sha>
```

The tool refuses unless authenticated admin access and a public repository are observed, local HEAD and remote main match the provided SHA, both exact-head check runs completed successfully, the canonical RC6 push run/job/attempt binds to that head, and all 13 exact-named mandatory steps individually completed successfully. It refuses to overwrite any existing protection/rulesets that appeared since this preparation. It rechecks main immediately before the one permitted PUT. Then it fetches a fresh authenticated inventory and verifies strict contexts/provider bindings, PR review settings, force/deletion settings, admin bypass, no push restrictions, main protected=true, unchanged head, and no unexpected rulesets. Only successful API readback sets `debtResolved:true`; preparation sets it false. Network/API/readback failures are retained and return a nonzero exit. A successfully applied but failed-readback action is recorded as mutation completed with unresolved debt, requiring fresh Parent inspection rather than an invented closure.

Inputs and SHA-256 values are in `input-ledger.json`. START_HERE, delegation/work orders, account policy, PRE-G7-01, prerequisites, both workflows and existing fetch helper were read directly. Relevant governance clauses of the immutable G6 ruling and independent RC5 audit were read with targeted local search; their archived files were hashed, not rewritten.

| Check | Result | Actual evidence |
| --- | --- | --- |
| Workspace/named-input access | PASS | Direct local reads and input-ledger.json |
| Authenticated repository/admin/protection/rulesets/collaborator inventory | PASS | evidence/inspect-20261007T075346658892Z/before.json and receipt.json |
| Concrete exact-context/provider payload | PASS | Same snapshot/protection-payload.json |
| Offline safety checks | PASS | 7 tests; offline-safety-checks-r2-final.log; Python exit 0 |
| Both exact current-head checks and 13 steps successful | NOT RUN to completion | RC6 in_progress at observation; raw job steps retained |
| Remote protection apply/readback | NOT RUN | No --apply invoked; all recorded remote API calls were GET |
| Governance debt closure | NOT RUN | debtResolved=false; no parent acceptance claimed |

Two early read-only inspection attempts are retained as FAIL because the RC6 check had not yet appeared; their inventory snapshots remain actual evidence. The first test command routed unittest's stderr through Windows PowerShell and returned shell exit 1 despite six tests displaying OK; that command log is preserved. The runner was changed to stdout, and subsequent commands returned 0, with the final run containing seven tests. These safety tests use synthetic fixtures and do not claim GitHub protection enforcement or hosted application execution.

Open limitations: RC6/final-head CI must finish successfully; final candidate/evidence commit must be pushed; independent approving GitHub writer is absent; remote apply/readback and Parent adjudication remain required. Accepted baselines and production/app/release/CI paths remain unchanged by this worker.
