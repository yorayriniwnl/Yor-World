# FINISH-32 — A1-R5-R7 exact-candidate independent delta audit

Date: 2026-10-11 UTC
Status: Parent audit assignment prepared for GPT Plus #2. The prompt has **not been dispatched**; independent review, Parent acceptance, and integration remain pending.

## Exact candidate binding

- Candidate branch: `codex/finish-29-a1-r5-r7-20261011`.
- Candidate commit: `76d679dcb98064152021830b98f16eb456b3ae19`; `origin` pointed to this exact commit at allocation.
- Candidate full tree: `6bb0a24c3ec9b716a4728b88fc0e07d5df440cd6`.
- Candidate delivery subtree `deliveries/FINISH-A1/r5-07/`: `61026e89795d28aa212ee2e03c8edc05b2aea97a`.
- Candidate commit's canonical root `app/` tree: `42ea29ec235225046a75959eb19eb386ac2f821d` (unchanged from the accepted base).
- Packaged `source/app/` subtree: `1bcaa9acde89fdb9541c3f2abde913a4ed2d2ec3`.
- Candidate patched `app/` tree reported by the maker's exact-base replay: `ba8f952edc34e94393c48b25779071daab9a9812`; independently recompute it from the patch and reconcile it with the packaged source subtree.
- Exact immutable base: `f62a43c5e71c00dcb89e28275ea81d842167db80`; accepted base `app/` tree: `42ea29ec235225046a75959eb19eb386ac2f821d`.
- Patch SHA-256: `aa9b91f613a0f1b98e6da7735ec0513d10d0e1c2e78512fff63ecc19ee717dd8`.
- Package output-manifest SHA-256: `5c42034d1ceb9cf938d7a536a436b3b53cee8094c48e3e934c419dad0fafa420`.
- Maker report: `deliveries/FINISH-A1/r5-07/report.md`. The maker reports 25 changed paths, all within the frozen 26-path A1 allowlist, and passing local replay, tests, build, lint, typecheck, and Chromium checks. Those are maker claims until independently checked.

The candidate commit is available through Git. The current coordination checkout's `deliveries/FINISH-A1/r5-07/` contains an unknown `.work/` directory; its contents were not inspected. Preserve that directory. Read the pinned commit directly or use a separate audit worktree under the new audit root's `.work/`; do not check out or copy candidate files into the occupied delivery root. The audit output root below was absent when allocated; recheck immediately before writing.

## Governing inputs and boundaries

Follow [FINISH-24](2026-10-11-finish-24-a1-r5-independent-audit.md), [FINISH-27](2026-10-11-finish-27-a1-r5-rework.md), [FINISH-29](2026-10-11-finish-29-a1-r5-r5-06-collision.md), the frozen FINISH-00-R2 ruling and output manifest, FINISH-10/12/14/22, and the 26-path table in `docs/planning/reconciliation-packets/finish-contracts-r2/04-path-ownership.md`. FINISH-24's exact-candidate audit recommends REWORK for A1R5-01 through A1R5-06; FINISH-27 and FINISH-29 authorize only those six corrections on the exact base and unchanged path allowlist.

This is an independent delta audit, not a maker task or Parent acceptance. The reviewer must not edit or regenerate the candidate, change canonical `app/`, fix defects, widen the allowlist, accept or integrate the work, or write outside the allocated audit root. The auditor must be GPT Plus #2 or another reviewer independent of the candidate author; a Parent-local check does not substitute for the required independent review. Do not represent this ready-to-paste packet as a dispatched session.

## Required review

1. Rebind the exact commit, parent, full tree, delivery subtree, root `app/` tree, packaged `source/app/` subtree, replayed candidate `app/` tree, and remote branch pointer from raw Git. Verify the patch hash, strict patch encoding, exact-base applicability, changed-path inventory, byte-for-byte source replacements, and subset of the frozen 26 paths. Reconcile any mismatch between packaged source and patch replay; confirm the accepted baseline and unrelated paths remain unchanged.
2. Recompute every row in the package output manifest from raw candidate bytes. Independently check the input ledger, report, standalone requirement matrix, command receipts, logs, screenshots, build manifest, browser binding, and result JSON for identity, path, hash, count, and exit consistency. Distinguish maker-generated evidence from checks actually rerun by the auditor.
3. Audit the six FINISH-24 findings against the frozen contracts and executable regressions:
   - **A1R5-01 — DTO compatibility:** exact `approvalAudit` `{ eventId, createdAt }`, frozen `PrivateDraftReview` fields, generic project/site `ReviewCheck` scope and ID seam, positive valid DTOs, and strict malformed-input rejection.
   - **A1R5-02 — publication refresh:** publish and rollback consume the actual healthy `GET /api/admin/publish` response, including `activePublication`, and visibly refresh publication/review identity without reload.
   - **A1R5-03 — missing private draft:** a requested absent draft returns 404 and reaches the page not-found path while preserving owner checks and private headers.
   - **A1R5-04 — stale save:** authorized 409 carries the current draft identity/content for conflict handoff, performs no write, and preserves the losing editor's unsaved buffer; unauthorized callers receive no current content.
   - **A1R5-05 — draft image URL:** render only the exact canonical owner-preview relative URL for the encoded media ID; reject absolute, origin-confused, query/fragment, encoded, and traversal variants.
   - **A1R5-06 — blank authoring defaults:** new text/list/code/link fields are empty, new links have no fabricated URL/check time, and evidence remains explicitly unknown/null/empty.
4. Inspect the actual tests and browser result artifacts for each correction. Independently rerun focused regressions and the full applicable unit/integration, lint, typecheck, build, and Chromium checks when the pinned environment permits. Verify the final build and browser evidence bind to the exact candidate. If an artifact or provider is unavailable, record that check as NOT RUN rather than inheriting the maker's PASS.
5. Check that the six fixes preserve the accepted FINISH-00-R2 review-hash, media-size/privacy, owner-guard, and publication contracts; review candidate-supplied FINISH-10/A1/FINISH-12 matrix rows for unsupported PASS claims or contradictory evidence. Keep native PostgreSQL/Auth/Storage, provider behavior, deployed origin/CDN, physical devices/accessibility, recovery, manual operations, and G7 separate and NOT RUN unless independently proven.

## Audit output and next gate

Use only `deliveries/completion-audits/FINISH-A1/finish-07/20261011T155401Z-a1-r5-r7-independent-delta-review-01/`. Recheck it is absent before creation; if occupied, preserve it and stop for Parent reallocation. Return `report.md`, `findings.json`, `requirement-matrix.json`, `candidate-binding.json`, `commands.json`, `tool-versions.json`, evidence/logs, and an output-hash manifest covering every stable reviewer file except that manifest and `.work/`. State the exact recommendation as PASS or REWORK, with every requirement marked PASS/FAIL/NOT RUN and limits recorded. State whether the assigned GPT Plus #2 review actually ran; a saved prompt is not evidence of execution.

Return the review to Parent for separate adjudication. Do not self-accept, integrate, deploy, claim G7, or close other A1/C1/B1 gates. C1-R9 remains a separate evidence-pointer correction; B1 full-room fidelity and door/camera ownership remain open.
