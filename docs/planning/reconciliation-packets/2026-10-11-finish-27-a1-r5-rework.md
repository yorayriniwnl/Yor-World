# FINISH-27 — A1-R5 six-finding rework

Date: 2026-10-11 UTC
Status: Parent-authorized local Codex maker correction. Independent delta audit and a separate Parent acceptance remain required.

## Parent decision and exact inputs

FINISH-24 reviewed candidate `8f3aa566f36c92bb98658090ef91f9bfa96e8a79` and recommends **REWORK** for A1R5-01 through A1R5-06. The report is at `deliveries/completion-audits/FINISH-A1/finish-06/20261011T132805Z-a1-r5-independent-review-01/report.md`; its findings are in the adjacent `findings.json`. Parent verified all 31 stable files listed by that audit root's output-hash manifest. The candidate remains unaccepted, unintegrated, and immutable.

This packet authorizes a new A1-R5 candidate that closes all six findings against the accepted contracts. It does not accept FINISH-24's candidate, the separate `32af5dc7` branch candidate, or any earlier A1 delivery. Start from the exact immutable base commit `f62a43c5e71c00dcb89e28275ea81d842167db80`, whose `app/` tree is `42ea29ec235225046a75959eb19eb386ac2f821d`. The accepted FINISH-00-R2 design output-manifest SHA-256 remains `8038db147824b0a31de1028c330383352177020b2247dd627d1674d6dc14c6af`.

Read and follow FINISH-12, FINISH-14, FINISH-22, FINISH-24, the FINISH-00-R2 ruling, and the frozen A1 rows in `docs/planning/reconciliation-packets/finish-contracts-r2/04-path-ownership.md`. The exact A1 allowlist remains the 26 rows in the accepted ownership table. No path expansion is granted.

## Authorized output and preservation

Use only `deliveries/FINISH-A1/r5-06/`. It was absent when this packet was issued; recheck immediately before writing. If occupied, preserve it byte-for-byte and stop for a Parent reallocation. Preserve `r5/`, `r5-02/`, `r5-03/`, `r5-04/`, `r5-05/`, all audit roots, the separate `32af5dc7` branch, and canonical `app/` unchanged. Do not use prior candidate source as the base. If any prior implementation is consulted diagnostically, identify the exact paths and reuse in the report.

Return a complete source package: `source/`, canonical-path `source.patch`, changed-path inventory, raw input/output hashes, full standalone requirement matrix, test/build/browser evidence, and a report with exact commands, versions, exits, identities, PASS/FAIL/NOT RUN, and limits. Commit and push only the stable `r5-06/` delivery package on its scoped branch. Stop for an exact-candidate independent delta audit; do not self-accept or integrate.

## Required corrections

1. Restore exact frozen DTO wire compatibility: `approvalAudit` uses `{ eventId, createdAt }`; `PrivateDraftReview` contains only the accepted fields; `ReviewCheck` preserves the accepted generic project/site scope and ID seam. Retain strict malformed-input rejection and coherent candidate semantics.
2. Make each healthy publication refresh consume the actual `GET /api/admin/publish` response, including `activePublication`, or change the API through an explicitly justified compatibility-preserving contract. Verify publish and rollback refresh the displayed publication/review identity without a page reload.
3. For a requested private draft that does not exist, return the intended 404 and reach the page's not-found path. Do not construct a strict successful review from a missing draft; preserve owner guards and private headers.
4. On an authorized stale save, return the current draft identity/content needed for conflict handoff while retaining HTTP 409, preventing writes, and preserving the editor's unsaved buffer. Do not expose current content before owner authorization.
5. Render a draft image only when its URL is the exact allowed owner-preview relative path for that encoded media ID. Reject absolute, origin-confused, encoded, or traversal paths; render only the validated canonical string.
6. New authoring controls must not invent project content or verification facts. New text/list/code/link fields start empty; a new link has no fabricated URL or check time. Preserve explicit unknown/null evidence defaults.

Add targeted red/green regressions for every finding, including frozen positive DTO probes, healthy publish/rollback refresh, requested missing draft, full stale-conflict response and no-write behavior, absolute/traversal renderer inputs, and blank new-content defaults. Keep existing FINISH-12 review-hash, bounded media, synthetic browser image-selection/private-preview, and privacy regressions intact.

## Required verification and limits

Replay the final patch from the exact base; verify its paths are an exact subset of the 26 frozen paths and every replacement byte matches the packaged source. Run focused affected tests, full unit and integration suites, lint, typecheck, production build, and final source-bound Chromium flows. Bind logs, exits, screenshots, build artifacts, and browser results to the exact candidate. Native PostgreSQL/Auth/Storage, provider approval, deployed origin/CDN, physical devices/accessibility, recovery, manual operations, external GPT Plus #2 review, Parent acceptance, canonical integration, and G7 remain NOT RUN unless separately evidenced.
