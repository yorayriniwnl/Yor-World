# Project folder audit — October 11, 2026

## Finding

The folders under `C:\Users\yoray\Projects` are not all one application. They contain several separate products, Git clones/worktrees, version-pinned Yor World release candidates, research materials, and a requirements-only project. Keep each product in its own root under the shared `Projects` directory. Keep Yor World's canonical code, specifications, references, delivery packets, and accepted evidence in `C:\Users\yoray\Projects\Yor World`. Do not flatten separate repositories or delete historical worktree data: many folders contain the only local copy of unfinished changes or release evidence.

No folders or files were moved, renamed, pruned, or deleted during this audit.

## Inventory and action

| Folder | What it contains | Current value and handling |
| --- | --- | --- |
| `Yor World` | Canonical Yor World Git repository, specifications, references, app, delivery packets, and audit roots. Branch `audit/completion-2026-10-09`, HEAD `d63a53f4a5d3`; local audit found 24 untracked paths at inspection. | **Primary project root.** Keep the project’s authored code and governed work here. Preserve untracked deliveries and stage only scoped work. |
| `Yor-World-Local-Corrections` | A Git worktree sharing Yor World's common Git database, branch `fix/local-studio-check`, HEAD `56afa21a2cbf`, with 53 dirty entries and 21 branch-only commits; canonical branch is 61 commits ahead. | **Important unfinished work.** The local reconciliation packet explicitly says preserve and finish it. Do not merge wholesale or discard changes; reconcile its branch and dirty files against the canonical branch in a separate bounded packet. |
| `Yor-World-RC5-c34e01b` | Detached historical worktree at `c34e01bb5bff`, with 13 untracked entries including RC5 G6 release-candidate proof. | **Release evidence snapshot.** Code is historical, but the package/proof remains relevant to release lineage. Preserve until its evidence is archived and verified elsewhere. |
| `Yor-World-RC6-30240b6` | Detached ancestor snapshot `30240b672ae3`, with an untracked `rc6-candidate-r4` package. | **Historical candidate evidence.** Preserve; compare its delivery receipts with the accepted RC6 baseline before any cleanup. |
| `Yor-World-RC6-48ee09a` | Detached ancestor snapshot `48ee09a98c9f`, with an untracked `rc6-candidate-r2` package. | **Historical candidate evidence.** Preserve. |
| `Yor-World-RC6-6c7200a` | Detached ancestor snapshot `6c7200ae4222`, with an untracked `rc6-candidate` package. | **Historical candidate evidence.** Preserve. |
| `Yor-World-RC6-71737a6` | Detached ancestor snapshot `71737a61c52d`, with an untracked `rc6-candidate-r3` package. | **Historical candidate evidence.** Preserve. |
| `Yor-World-RC6-8e5b954` | Detached ancestor snapshot `8e5b954e147a`, with an untracked `rc6-candidate-r6` package. | **Historical candidate evidence.** Preserve. |
| `CandidateX-main` | Separate clone of `yorayriniwnl/CandidateX`, local HEAD `62081eaf5a15`, 171 dirty entries including deleted tracked files. Its local tracking ref is stale; remote `main` was observed at `50e35e8c29a5ab0ed26448e9ac51a89cc213dce5`. | **Important separate product, unsafe as a clean baseline.** Preserve local edits; compare them with the remote in a dedicated CandidateX recovery review before reset or merge. |
| `CandidateX-pnpm-override-fix` | Separate clean clone of the same CandidateX remote at older commit `f583df1cce9a`. | **Useful historic clean baseline.** It is behind the observed remote; preserve and use only after an explicit source comparison. |
| `Portfolio-Ayush-Roy-main` | Portfolio source tree with Next.js/React/Three.js project structure and no Git metadata. Its README identifies `https://yorayriniwnl.in` as the deployed portfolio and documents CandidateX routes. | **Important live product/reference, source provenance unbound.** Preserve. Establish exact source/deployment identity and review its content separately before importing or treating it as a canonical Yor World input. |
| `yor-talks-v3` | Separate Yor Talks repository, branch `release/unified-release-20261009`, HEAD `8000dcdb203c`, with 9 dirty tracked paths. | **Current active Yor Talks work.** Keep as a separate project; inspect and reconcile its edits within that repository. |
| `yor-talks-release` | Clean detached snapshot at `aca6ccbf916f`; same Yor Talks remote. It is an ancestor of v3; v3 is 28 commits ahead. | **Useful release baseline**, not a duplicate to delete until v3 release evidence is complete. |
| `yor-talks-media-final-20261007` | Separate Yor Talks clone, branch `codex/production-readiness-20261007`, HEAD `108ddef6e5b6`, with 67 dirty entries (33 tracked and 34 untracked in the original inventory). | **Important but unfinished media/release work.** Preserve and reconcile independently. |
| `yor-talks-media-validation-20261005` | Non-Git validation data with `media-bin`, `pgdata`, PostgreSQL log and Redis configuration, dated October 5. | **Potentially valuable validation/database evidence.** Preserve as data; do not treat it as disposable build output without a backup and owner review. |
| `Temp\cci-revision` | Non-Git paper/research revision package. It includes manuscript/source manuscript, primary-results files, DOI/reference verification, reproduction and build/QA records, targeted literature/technical checks, rendered pages, and supporting snapshots. Audit inventory: 947 files, about 65.96 MB. | **Important research evidence, not generic temporary junk.** Preserve and maintain its own provenance and backup. Review/remove only after the paper's source and final outputs are archived elsewhere. |
| `Abhyodhya` | Separate requirements project for a hybrid intelligent network intrusion detection system. | **Unrelated project.** Keep separate; it does not belong inside Yor World. |

## Cross-repository and registry observations

- The five RC6 folders and RC5 folder are registered Git worktrees of the Yor World repository, pinned to historical commits; they share the main repository's Git database. They are not independent repositories to combine. Their untracked candidate directories are not represented by the pinned commit, so preserve them until package hashes and lineage are recorded elsewhere.
- The Local Corrections worktree is also linked to the main Git database, but contains both a unique branch and dirty work. Its work is not superseded merely because the canonical branch is newer.
- CandidateX and Yor Talks have separate Git remotes and product scopes. The portfolio tree has no Git identity, so its claimed relationship to the live site needs a provenance audit.
- `git worktree list --porcelain` also reports Codex scratch/replay worktrees and 12 stale `prunable` registrations under the user Temp area. Their follow-up inventory is below; no project data was moved or deleted.
- Public references checked during the audit: [portfolio](https://yorayriniwnl.in/), [CandidateX case study](https://yorayriniwnl.in/projects/candidatex), [CandidateX source repository](https://github.com/yorayriniwnl/CandidateX), and [CandidateX live app](https://candidatex-smoky.vercel.app/). These show CandidateX as a current public project and conflict with older Yor World evidence notes that claim no CandidateX repository or live deployment exists. That evidence register is stale on this point; resolve it in a separate content-evidence review without silently admitting CandidateX content into Yor World or changing frozen contracts.

The read-only public/local reconciliation is recorded separately in the [CandidateX current-presence recheck](2026-10-11-candidatex-current-presence-recheck.md). It confirms endpoint availability and a public repository while preserving the existing unpublished/unknown content gate.

## Temp worktree registration follow-up

The 12 `prunable` registrations were rechecked by exact path. Four Temp directories are already absent. Eight directories remain but have no `.git` pointer: seven contain only empty directory trees; the remaining `yor-world-rc3-calibrated-final-93d8bcdbad3d477f9a98b1271dbf4c11` tree contains 10 files. Nine of those files are byte-identical to existing files under the canonical `deliveries/G6/full-stack-integration/evidence/`; the remaining file is an untracked `.next` route-cache artifact. Their branch refs and file contents were preserved.

`git worktree prune --verbose` attempted to remove the 12 stale registrations, but Windows returned `Permission denied` for each `.git/worktrees/<id>` entry. The `.git/worktrees` directory has a read-only attribute and explicit deny ACLs for write/delete. No ACL change was attempted; the registrations therefore remain until an authorized owner changes access. These are orphaned Temp residues, not additional project roots to move into Yor World.

A separate request to recursively remove the verified orphan Temp directory trees was rejected by automatic review. No folders or files were deleted.

## 2026-10-12 current-state recheck

The shared parent remains `C:\Users\yoray\Projects`. Its children are separate product roots and Yor World worktrees/snapshots. Keep them under this shared parent, each in its own folder; flattening them into `Yor World` would mix distinct products and break the intended worktree boundaries.

| Root | Rechecked state | Handling |
| --- | --- | --- |
| `Yor World` | Canonical branch `audit/completion-2026-10-09`, HEAD `23206d0c694128f51e93a0690a01dce7a15fac37`, equal to its origin tracking branch. No tracked edits; 12,949 untracked files, primarily retained delivery and audit material. | Keep as canonical. Preserve untracked evidence; stage only a named, scoped change. |
| `Yor-World-Local-Corrections` | Branch `fix/local-studio-check`, HEAD `3f0b47c78b3322f1d2be3d048620bd86e4b32f0f`; 91 main-only and 36 branch-only commits from merge base `f6a8df58095807b09004c2f0ab8a2382c3971e80`. It has 63 tracked dirty paths and 5,820 untracked files; HEAD matches origin. | Important unfinished work, not a stale duplicate. Keep separate and reconcile by its packet; do not merge wholesale or clean it. |
| `Yor-World-FINISH-B1-R5-work` | Clean worktree at `a5ebcc88170703751a5f504f67aed637d2f7d8e9`, exact B1-R5 candidate branch. | Preserve as a reviewable candidate; owner visual review, full reference fidelity, and independent audit remain open. |
| `Yor-World-finish30-c1-r9` | Clean worktree at `3dda9a61`, C1-R9 candidate branch. | Preserve with its exact delivery and audit lineage; external audit and Parent acceptance remain open. |
| `Yor-World-RC5-c34e01b` and five `Yor-World-RC6-*` roots | Detached snapshots; each still has 2,254 to 2,267 untracked package files. RC6 source `8e5b954e147a87e36a6869d9940c40f3d4c123f0` remains accepted for G7 preparation. Production, manual/physical checks, deployment, and G7 acceptance are still not complete. | These are release lineage and candidate evidence, not disposable copies. Keep until package hashes and evidence are archived and verified. |
| CandidateX, Portfolio, Yor Talks, Abhyodhya, CCI and media-validation roots | Separate products or research/data roots. CandidateX-main has 171 tracked dirty paths; Yor Talks v3 has 9 and media-final has 33 tracked plus 34 untracked. The CandidateX clean clone and Yor Talks release snapshot remain useful comparison baselines. | Keep each product/data set in its own root and reconcile within that product. Do not import them into Yor World or delete them as generic temporary material. |

### Local-Corrections art candidate status

The exact art candidate commit `5cfe3c4783f95ca6df8571f9126adc46afa206e` preserves the attempt-19 output GLBs and their report in `deliveries/production-environment/revisions/local-corrections-r1/`. Integrated art review attempt 04 used those exact candidate outputs and recorded a HOME-composition visual pass with limits: two multi-view `net::ERR_ABORTED` diagnostics, a late greeting capture, and a tight reverse-doorway view. The review explicitly did not accept or publish the assets.

The current `app/public/asset-manifest.json` still identifies `g6-world-art-freeze-20261002`; the app manifest and public model files were unchanged by the attempt-19 candidate or integrated review. Attempt 19 is preserved review work, not an active app asset revision. Keep its source, outputs, captures, and reports. Any later candidate binding must use the exact attempt-19 bytes and a versioned candidate path, preserve existing assets, and remain subject to independent review and Parent admission.

### Subsequent candidate-binding update

After the recheck, the art maker added a separate attempt-19 candidate binding in commit `3f0b47c78b3322f1d2be3d048620bd86e4b32f0f`: six full-SHA model files under the versioned candidate directory, plus `manifest-attempt-19.json` and `evidence/candidate-binding-attempt-19.json`. Parent raw-Git verification matched all six destination hashes and byte counts to the exact source commit and committed inspection receipts; the three unchanged asset rows also match the active manifest. All six new rows remain `approved:false` / `status:candidate`. The active app manifest and earlier R1 manifest are unchanged, and no runtime mapping or deployment was made. The files are present in an inactive candidate directory; independent visual/provenance review and Parent admission remain open. Preserve all prior candidate files and evidence.

No project roots, files, or evidence packages were moved, renamed, or deleted during this recheck. The evidence still does not justify treating any audited root as useless or safely removable.

## Recommendation

Use the parent `Projects` directory to group distinct projects. Within each product, keep one canonical repository/root and retain separate worktrees only where an active packet or reproducible historical candidate requires them. First reconcile the unfinished Local Corrections, CandidateX-main, CandidateX portfolio provenance, Yor Talks dirty work, and release candidate evidence. After their contents are hashed, backed up, and their owners confirm no active use, a separate cleanup review can identify truly redundant clones. The present evidence does not support calling these folders useless or safely deleting them.
