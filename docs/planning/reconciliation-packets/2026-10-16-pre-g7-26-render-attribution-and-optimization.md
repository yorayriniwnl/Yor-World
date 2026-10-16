# PRE-G7-26 — render-list attribution and bounded call reduction

- **Date:** 2026-10-16 (Asia/Calcutta)
- **Authority:** Parent Codex, continuing the user's instruction to complete YOR WORLD as planned
- **Status:** Authorized for one source-bound local renderer candidate and exact evidence
- **Boundary:** Local-only. No provider configuration, database changes, domain/DNS, deployment, physical-device claims, or G7 acceptance.

## Purpose and frozen inputs

PRE-G7-25 reduced the inclusive submission count from accepted-root overlay values of 423/411/425 to 129, but still exceeds the unchanged limits by 9 calls at desktop/landscape and 49 at phone/compact. Its performance suite is 5/6. The candidate remains unaccepted. See the [PRE-G7-25 parent ruling](../reviews/2026-10-16-pre-g7-25-parent-ruling.md) and exact [candidate report](../../../deliveries/G7/preparation/maker-evidence/pre-g7-25/attempt-03/REPORT.md).

The immutable source base is accepted PRE-G7-22 commit `500d10fa5901be48d4ff877e608d65ba0e271bb9`, app tree `ba0b709192367e1d12a796618f97801a8fcd5a70`. PRE-G7-25 source `28fb4187445206bcc62e2ef0ae2678e44ac6604b` and evidence commits `afb42f938eef80a27e406bda3f976b519ae71bc7`, `793f2dbbc318cfa152a8ec00f69b8f1f8da73658`, and `4ddd00a8924546f49a742f9c5ec4bf10242621e7` are comparison inputs and patch donors only; none is an accepted source baseline.

The accepted source-bound captures under `pre-g7-25/attempt-03/accepted-root-500-source/` are the visual baseline for the named source. The earlier PRE-G7-22 captures identify source `63756c058de7fec92ba9699b327667207fe48488` and remain a separate history. Preserve the upper-shelf ivy cluster already present in `500d`; the contradictory P25 instruction to omit this cluster is superseded only as specified in the parent ruling. The main visual reference is `references/images/main-reference.png` (SHA-256 `37adfb0ee344642798978e954a0cfc8d9715eac1b3ca4e5a84ab87a228c53362`).

The P25 packet links PRE-G7-23 and PRE-G7-24 packet files that are **MISSING** from the current repository tree and Git history. Do not claim to have read them or invent additional requirements from them. Use the P25 packet, P24 report and parent ruling, the accepted source, and the present validation contract. Frozen limits are documented in `docs/planning/validation-and-production.md` (SHA-256 `01d9df1de83cede37a9efbc5ca3cdfe760403404a8b1929029a05067c7551290`). The product spec SHA-256 is `9a05f7c0485fd46299e96706d3d7c4195eb30b2ae33710b37d67f2763aceff05`; engineering contract SHA-256 is `9a382f0c45e50c59862728f88a8ef7af77c1ed814a5c71a9fe4f59baac1e8b4a`.

## Owned paths

Own only:

- `app/src/features/world/LowQualityBatch.ts` and `WorldRuntime.ts` if a bounded renderer correction is supported by the attribution
- directly related tests under `app/tests/unit/`, `app/tests/integration/runtime/`, and `app/tests/performance/world.spec.ts`
- corresponding changed files under `yorayriniwnl.in/`, plus its `README.md` and `source-delivery-manifest.json`
- `deliveries/G7/preparation/maker-evidence/pre-g7-26/`

Keep `app/` canonical. Record the task-branch parent, accepted base commit/tree, exact source commit/tree, changed paths and Git blobs before validating. Preserve every PRE-G7-22 through PRE-G7-25 artifact unchanged.

## Authorized work

1. Start from the accepted `500d` source. Use PRE-G7-25 code only as a patch donor; do not merge its evidence branch as an accepted baseline. First produce an item-level attribution for the accepted root and the 129-call P25 candidate. For each required viewport, separate main and shadow passes and identify the submitting object or batch, geometry/group, material/program compatibility, render order, visibility/layers, cast-shadow state, dynamic/exclusion reason, and multi-draw path. Bind every inventory row to exact source and capture hashes. Distinguish logical objects, renderer submissions, WebGL draw calls, and multi-draw API invocations.
2. After recording attribution, test at most one renderer-only optimization using existing compatible batching or multi-draw facilities. The objective is to meet all frozen ceilings: 1440×900 HIGH ≤120; 390×844 MEDIUM ≤80; 320×600 MEDIUM ≤80; 844×390 HIGH ≤120. Triangle ceilings remain 300,000 for desktop and 140,000 for the other views.
3. Preserve every authored object, including the upper-shelf ivy, materials and shader semantics, transforms and animation, visibility, raycasts, layers, order, shadow behavior, quality tiers, DPR, renderer settings, source-object identity, unsupported-extension fallback, and teardown. Do not remove or hide geometry, alter thresholds, or merge semantically distinct materials. Do not modify GLB assets in this packet; if asset authorship is necessary, report exact opportunity and remaining gap for a separate Track B packet.
4. Retain the accepted root and candidate full-frame screenshots for all four required viewports in Chrome and Edge. Record exact browser/viewport/tier, renderer, inclusive main-plus-shadow calls, triangles, and full-frame pixel deltas. Explain every nonzero delta; do not invent a numeric pixel tolerance or claim exact equality when hashes/pixels differ. Preserve named-anchor, interaction, shadow, mobile framing, and fallback behavior.
5. Run focused batching/runtime tests, full unit suite, lint, typecheck, production build, evidence-enabled build, composition E2E once, and two consecutive unchanged integration invocations. Run the configured performance suite once and preserve its complete result; do not change timeout, retries, thresholds, or filters. P25's 5/6 result remains a known failure, and this packet does not authorize navigation-UI redesign. If the known Projects-link interception repeats, record it and stop; do not retry.
6. If one compatible renderer-only candidate cannot meet all call ceilings while preserving semantics and visual evidence, stop. Record the exact per-viewport attribution and remaining gaps plus the concrete separate asset/rendering proposal. Do not attempt further optimization in this packet.

## Required evidence and review

Use a fresh `pre-g7-26` evidence directory. Bind source and evidence commits separately. Include raw command receipts, runtime versions, source/asset hashes, source/mirror parity, item-level attribution, screenshots, pixel results, and before/after tables. Report every result as PASS/FAIL/NOT RUN with its evidence path. Do not overwrite or relabel earlier runs.

After source and evidence are pushed, a separate read-only reviewer must inspect the exact commits, attribution validity, frozen ceilings, shader/material and shadow equivalence, object/interaction semantics, fallback paths, tests, mirror integrity, and visual deltas. The maker does not approve or accept its own work. External GPT Plus #2 review remains required; any local Codex substitute must be labeled as such. Parent acceptance remains pending until independent review and all required evidence are complete.

Physical-device, screen-reader, mobile-soak, production-service, domain, deployment, and G7 claims remain **NOT RUN** unless separately performed under their governing protocol. This packet cannot accept itself.
