# PRE-G7-27 — Isolated renderer attribution captures

Status: **AUTHORIZED, LOCAL ONLY**
Maker lane: runtime / integration, with a local Codex substitute if Gemini #3 is unavailable
Output owner: deliveries/G7/preparation/maker-evidence/pre-g7-27/

## Objective and boundary

Complete the item-level attribution that PRE-G7-26 could not capture. Use independent, fresh page contexts for each browser and viewport, with the viewport fixed before navigation. Capture the accepted root and exact P25 patch donor. This packet is measurement-only.

Do not change app or mirror source, authored assets, rendering behavior, thresholds, quality tiers, DPR, browser timeouts, Playwright retry policy, production services, deployment, or any G7 state. Do not optimize or use these measurements to claim acceptance. Any renderer or asset change requires a later parent packet.

The P26 invocation is closed and must not be resumed or repeated. PRE-G7-27 is a new packet with a different capture design: each measurement starts in its own page at its final viewport, so no active scene is resized. If any capture fails or times out, retain its first result and do not retry it.

## Frozen inputs

- Accepted source: commit 500d10fa5901be48d4ff877e608d65ba0e271bb9; app tree ba0b709192367e1d12a796618f97801a8fcd5a70; mirror tree 34f7ac0731984e50cbb06cf02039911ba65f59a9.
- P25 patch donor only: commit 28fb4187445206bcc62e2ef0ae2678e44ac6604b; app tree f68074b41b8d2eea228d7fa964d3db8358a9fea4; mirror tree be03089ce9abae0f487bd829b4f24ddac9bb3dfd. Do not use another P25 revision as the donor.
- P25 attempt-03 report: deliveries/G7/preparation/maker-evidence/pre-g7-25/attempt-03/REPORT.md, SHA-256 b0a5d18ba09019eb3aee332fe60d129c56a88e47821952a403d438bacabfe751.
- P26 report: deliveries/G7/preparation/maker-evidence/pre-g7-26/REPORT.md, SHA-256 24720e046a755ba474866c2025fcc05cc37b262d5904f962d1082401617e0fa0.
- P26 archived observer source: deliveries/G7/preparation/maker-evidence/pre-g7-26/attempt-01/attribution/instrumentation-source/P26RenderAttribution.ts, SHA-256 11b064a5b4500b3d3ed2c989d7f35ea509685c346de745fad7951b4578a8695f. It may be reused only as temporary measurement code, outside committed app source.
- Frozen product, engineering, and validation contracts remain those named and hashed in PRE-G7-26: product spec 9a05f7c0485fd46299e96706d3d7c4195eb30b2ae33710b37d67f2763aceff05; engineering contract 9a382f0c45e50c59862728f88a8ef7af77c1ed814a5c71a9fe4f59baac1e8b4a; validation and production contract 01d9df1de83cede37a9efbc5ca3cdfe760403404a8b1929029a05067c7551290.

## Authorized work

1. Create isolated, clean source worktrees pinned to the exact accepted and donor commits. Verify their complete app and mirror tree hashes before measuring. Do not commit temporary instrumentation or generated build output.
2. Use a measurement-only observer archived beneath the P27 evidence directory. Base it on the P26 archived observer, namespace its output as P27, bind its exact source hash, and gate it to a diagnostic-only URL flag. Apply it only in temporary source copies used for the capture build. Record each immutable base app/mirror tree and the temporary observer build tree; remove the observer from temporary source copies after capture.
3. Use Node 24.19.0 and pnpm 9.15.9. Set the existing evidence build flag NEXT_PUBLIC_PRE_G7_13_EVIDENCE=1 for both sources. Build and serve each source in production mode, with separate output directories and ports. Record exact commands, runtime versions, browser versions, renderer strings, all non-secret environment flags, and source identities.
4. Collect exactly sixteen independent rows: accepted root and P25 donor × Chrome and Edge × 1440×900 HIGH, 390×844 MEDIUM, 320×600 MEDIUM, and 844×390 HIGH. Use one fresh page/context per row. Set viewport and tier before navigation. Never call page.setViewportSize after the studio begins loading. Use one sequential Playwright invocation for each source, workers=1, retries=0, and the existing 30-second test timeout. Do not increase timeouts, filter cases, or add retries.
5. For each row, record whether the route and studio reach HOME, exact inclusive main and shadow submissions, visible triangles, WebGL draw API calls, multi-draw invocations, object and batch identity, geometry/group, material/program compatibility, draw order, visibility/layers, shadow-caster state, dynamic/exclusion reasons, screenshots, and full source and output hashes. Keep logical objects, renderer submissions, WebGL calls, and multi-draw API invocations distinct.
6. Preserve every first-run failure and partial result. Continue only through already enumerated independent cases in the same single invocation; never rerun a failed row. If the observer cannot be applied without modifying source semantics or if a browser process becomes unstable, stop the affected source invocation and report exact remaining rows as NOT RUN.
7. Do not run unrelated application suites under this diagnostics-only packet. Report any build failure, 404, timeout, incomplete row, or browser crash without repair or retry. No pixel-parity or visual-equivalence claim is authorized because this packet creates no renderer candidate.

The evidence directory must contain a concise REPORT.md, command and environment receipts, source-binding, per-row JSON and screenshots, Playwright results, the archived observer and any source overlay patch, plus an evidence inventory with raw SHA-256, byte counts, and Git blob IDs. Keep all app and asset commits unchanged; only the P27 evidence directory may be committed and pushed.

## Exit and review

PASS means all sixteen rows are complete, internally consistent, and source-bound. If any row is missing, the packet result is FAIL / incomplete; show every completed row and mark the rest NOT RUN. No optimization, asset authoring, or acceptance follows automatically.

After the maker pushes the evidence commit, a separate read-only reviewer must audit exact source identities, observer behavior, row coverage, counts, hashes, pass split, and failure metadata. External GPT Plus #2 review remains required. Any local Codex substitute must be clearly labeled as such. Parent acceptance remains pending until the audit and all later project gates are complete.

Physical-device, screen-reader, mobile-soak, live-service, domain, deployment, and G7 checks remain NOT RUN unless independently performed under their governing protocol. This packet cannot accept itself.