# CandidateX current-presence recheck — October 11, 2026

## Decision

CandidateX is a current, separate project with a public source repository, a public portfolio case study, and a reachable demo endpoint. It is not useless past work. The current evidence register's statements that no CandidateX repository or live deployment exists are stale. Keep CandidateX **unpublished inside Yor World** until its project identity, owner-approved content, authorship/contribution, and claim-specific evidence receive a separate content review. This recheck does not amend the frozen evidence register, accepted contract, or canonical app.

## Local folder findings

| Path | Observed state | Handling |
| --- | --- | --- |
| `C:\Users\yoray\Projects\CandidateX-main` | Origin `https://github.com/yorayriniwnl/CandidateX.git`; local HEAD `62081eaf5a15`; 171 dirty entries, including tracked deletions. | Preserve; this clone is not a clean baseline and its origin tracking was stale. Do not reset or overwrite its local changes. |
| `C:\Users\yoray\Projects\CandidateX-pnpm-override-fix` | Same origin; clean working tree at older local HEAD `f583df1cce9a`. | Preserve as a historic clean comparison point; compare before using it as a source baseline. |
| `C:\Users\yoray\Projects\Portfolio-Ayush-Roy-main` | No Git metadata. README identifies `https://yorayriniwnl.in` as the deployed portfolio and documents its Next.js / Three.js stack. | Preserve; establish a source-to-deployment identity and recoverable version history before importing or using it as a governed source package. |
| `C:\Users\yoray\Projects\Temp\cci-revision` | Separate 947-file, 65,960,723-byte paper/reproduction and QA bundle. | Preserve as research evidence and retain provenance; do not treat it as disposable temporary output. |

The remote CandidateX `main` reference returned by read-only `git ls-remote` was `50e35e8c29a5ab0ed26448e9ac51a89cc213dce5`. The dirty `CandidateX-main` checkout is not that revision. No fetch, checkout, reset, merge, file move, or deletion was performed.

## Current public observations

At 2026-10-11 14:06 UTC, HTTP HEAD returned 200 for the portfolio root, the portfolio's `/projects/candidatex` route, and `https://candidatex-smoky.vercel.app/`. The response pages were served by Vercel; the homepage and portfolio case study responses were cached. These checks establish accessible public endpoints at observation time, not backend reliability, user ownership, authorship, content accuracy, or employment validity.

The current [portfolio homepage](https://yorayriniwnl.in/) presents CandidateX among six projects and links a 3D workstation, source, and live demo. Its [CandidateX case study](https://yorayriniwnl.in/projects/candidatex) calls it a research prototype, describes synthetic candidate data, and says the system does not make autonomous hiring decisions. The [public CandidateX repository](https://github.com/yorayriniwnl/CandidateX) is available and its README states that the demo uses synthetic candidate data and is not validated for employment decisions. The separate [CandidateX demo](https://candidatex-smoky.vercel.app/) returned HTTP 200.

These are current public statements, not independent proof of the claims. In particular, public pages and a repository do not by themselves verify the user's authorship, specific contribution, the reported benchmark methodology/results, academic status, real-world effectiveness, fairness, or production-grade backend behavior. The paper/reproduction files in `Temp\cci-revision` may contain relevant research receipts and must be reconciled to the repository and public case study before using any numeric or publication claim.

## Reconciliation with frozen Yor World records

`docs/content/evidence-register.md` is hash-bound by the accepted R2 contract at SHA-256 `f898c580e65f21aaaa80f9bfbf8c3b0001b914186a4ca4bea4366930558fe756`. Preserve those bytes. Its CDX-02 rationale (“No CandidateX repo exists”), CDX-03 rationale (“no verified live domain”), and rejected-claim reason (“No repository or live deployment exists”) are contradicted by this recheck. The conservative verification state remains appropriate: CDX-04 authorship/contribution and claim-specific support are not established by these public observations, and CDX-05 keeps CandidateX unpublished.

Do not change the accepted CandidateX withholding rule, add CandidateX to public project data, remove its 404/denial behavior from the Yor World app, or copy unbound portfolio code into the canonical repository based on this recheck. A later versioned content decision can correct the historical factual rationale while keeping unverified content withheld.

## Scope and limits

This was a read-only audit. It checked local paths and Git state, read the portfolio README, queried the public Git reference without fetching, opened the public pages, and sent HTTP HEAD requests to the three public endpoints. It did not run tests, inspect private accounts, validate the live demo's workflows, reproduce paper results, audit every repository claim, or change any file outside this report and its folder-audit link.
