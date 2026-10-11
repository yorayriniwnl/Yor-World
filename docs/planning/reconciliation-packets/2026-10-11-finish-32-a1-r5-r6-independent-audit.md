# FINISH-32 - A1-R5/R6 exact-candidate independent delta audit

Date: 2026-10-11 UTC. Status: exact-candidate audit allocated and queued behind the active FINISH-29 review. Parent acceptance and canonical integration remain pending.

## Candidate binding

Audit only commit `77e5836c572141478b54ef6ffd928b9bcaafb10e` on branch `codex/finish-27-a1-r5-r6-20261011`.

- Parent: `f62a43c5e71c00dcb89e28275ea81d842167db80`.
- Full tree: `159d0462bff2900a4ef412bda4d156d60f2871ae`.
- App tree: `c1f4e54e6b5de23acf1a783842bedffc4b684da1`.
- Delivery subtree: `c3644b7983ab2516ee16aaf091d567d726fc40ef`.
- Delivery root: `deliveries/FINISH-A1/r5-06/`.
- Package output-manifest SHA-256: `e887a75c093dcbf6f3357699d2d9d3e07316f8bdefaae580a482bf423a34d212`.
- The package binds 60 stable output rows totaling 1,123,045 bytes. Its complete Git delivery contains 61 files under the delivery root; scratch is excluded.
- Canonical source patch SHA-256: `212f29baf76effafcdcf262e4a3bacde1a62134363dec769fb5d44fe8def93bd`.
- The maker reports 25 changed paths from the exact base, each in the frozen 26-path A1 allowlist; canonical `app/` remains unchanged.
- Maker report: `deliveries/FINISH-A1/r5-06/report.md`. These are maker claims and are not independent evidence.

The maker branch is pushed. Independently verify that the remote ref resolves to the exact commit before review. Do not inspect or use another A1 candidate as a base. FINISH-27's complete packet and frozen path ownership are the authority for this audit; the existing FINISH-24 findings and accepted FINISH-00-R2 ruling are relevant inputs.

## Reviewer and audit root

Reviewer: local Codex B1-R4 cross-lane reviewer, after it completes FINISH-29. It did not author FINISH-A1. Do not interrupt FINISH-29 or start this audit concurrently in its worktree. External GPT Plus #2 is NOT RUN; local results do not satisfy that external review gate. Parent makes a separate acceptance decision.

Use a fresh isolated worktree at the exact candidate commit and a clean audit branch:

- Branch: `audit/finish-32-a1-r5-r6-20261011`.
- Root: `deliveries/completion-audits/FINISH-A1/finish-07/20261011T181100Z-a1-r5-r6-independent-delta-review-01/`.

The Parent rechecked the root absent in both the canonical checkout and candidate worktree, and the local and remote branch names were absent at allocation. Recheck both immediately before writing. If any root or branch is occupied, preserve it without inspecting or changing it and stop for Parent reallocation. Keep scratch only under the audit root's `.work/`. Commit and push only that root on the scoped audit branch. Do not modify the candidate branch, other A1 packages, audit roots, or canonical `app/`.

## Required independent checks

1. **Identity and package integrity.** Recompute candidate commit, parent, full tree, app tree, delivery subtree, exact changed-path list, remote ref, package inventory, and raw Git-blob SHA-256/byte sizes. Recompute every stable output row and the manifest hash. Confirm all files are beneath `deliveries/FINISH-A1/r5-06/`, there are no unlisted package files, and all 25 source replacements are exact members of the frozen 26-path allowlist. Independently replay `source.patch` from the exact base; compare every replacement byte and verify every unpatched tracked app path remains byte-identical. Confirm the accepted design output-manifest SHA-256 is `8038db147824b0a31de1028c330383352177020b2247dd627d1674d6dc14c6af`.
2. **A1R5-01 - frozen DTO compatibility.** Inspect and probe the exact accepted wire shapes: `approvalAudit` has only the accepted `eventId`/`createdAt` form; `PrivateDraftReview` has the accepted fields; `ReviewCheck` preserves generic project/site scope and the accepted ID seam. Check positive frozen DTO fixtures and rejection of malformed, legacy, contradictory, incoherent, and wrong-typed records. Verify candidate and publish semantics remain coherent.
3. **A1R5-02 - publish and rollback refresh.** Independently trace the API response through UI refresh and verify `activePublication`, history, and review identity are consumed. Exercise successful publish and rollback and confirm the visible revision/review state updates without a full page reload; inspect error/denial paths for stale or fabricated success state.
4. **A1R5-03 - missing draft.** Verify a requested missing draft reaches the intended page not-found path and returns the specified owner-authorized 404 with private no-store headers. Check no successful review/media DTO is built from the missing draft and owner authorization precedes private data reads.
5. **A1R5-04 - stale-save handoff.** Verify an authorized stale save returns HTTP 409 plus current draft identity/content needed for handoff, does not write, and preserves the editor's unsaved buffer. Verify current content is not revealed before owner authorization; exercise stale, current, and denied paths.
6. **A1R5-05 - private image URL.** Verify rendering accepts only the canonical exact relative owner-preview URL for the encoded media ID. Probe absolute URLs, origin-confusion, encoded and traversal paths, query/fragment variants, malformed IDs, and alternate encodings. Confirm only the validated canonical string reaches the image renderer.
7. **A1R5-06 - truthful authoring defaults.** Inspect new paragraph/list/code/section/link/evidence controls and their save model. Confirm content and URL fields start blank, unknown evidence remains explicit null/unknown, and no fabricated project facts or check timestamps are inserted. Verify changing URLs invalidates old checks and saving requires explicit evidence where the contract requires it.
8. **Regression and source-bound verification.** Independently run focused regressions for all six findings plus retained FINISH-12 review-hash, bounded media, synthetic image selection/private preview, owner/privacy, stale-conflict, and publish/rollback behavior. Run the full unit and integration suites, lint, typecheck, production build, and final Chromium workflow against a fresh source replay from the pinned candidate. Verify screenshots/build/browser artifacts bind to that replay. Record all commands, tool versions, stdout/stderr, and exit codes. Use disposable copies for probes that mutate inputs. Do not use maker exit logs as reviewer command receipts.
9. **Scope and limitations.** Confirm no changes outside A1's allowlist and no impact on canonical `app/`. Mark native PostgreSQL/Auth/Storage, provider approval, multi-process race, deployment/origin/CDN behavior, physical-device/accessibility, recovery/manual operations, external GPT Plus #2, Parent acceptance, canonical integration, and G7 as NOT RUN unless independently evidenced. Recommend PASS or REWORK only for the exact FINISH-27 six-finding correction scope.

## Return artifacts

Under the assigned root, provide `report.md`, `findings.json`, `requirement-matrix.json`, exact candidate binding, command/tool/exit receipts, and raw package/build/browser hashes. Mark every requirement PASS, FAIL, or NOT RUN, preserve any maker-reported limitation, and distinguish independent reruns from static review. A passing maker suite is not an audit result. Parent acceptance, canonical integration, release authority, and the external GPT Plus #2 gate remain separate.