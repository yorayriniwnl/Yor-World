# PRE-G7-25 — surface parity correction and performance test setup

- **Date:** 2026-10-16 (Asia/Calcutta)
- **Authority:** Parent Codex, continuing the user's local repair authorization
- **Status:** Authorized for one bounded renderer correction and exact-source evidence
- **Boundary:** Local-only. No provider setup, domain/DNS, deployment, production operation, or G7 acceptance.

## Purpose and frozen inputs

PRE-G7-24 source commit `017bead7813d5ea9875b8789621b93b8a8cd00ce` (app tree `b28bf52127947dce6ad9e032d1fd0ffd2577fb47`) reports 56 calls, but the measurement resets after shadow rendering and does not prove the inclusive call ceilings. The accepted PRE-G7-22 root capture is source commit `500d10fa5901be48d4ff877e608d65ba0e271bb9`, app tree `ba0b709192367e1d12a796618f97801a8fcd5a70`. P24's selected input (`26e87...`, app tree `ab95...`) is not that accepted root. The required P24 1440×900 captures also use LOW and MEDIUM instead of the accepted HIGH tier. The same-tier 390×844 comparison is 99.135375% identical but shows extra foliage and stems on the upper-left shelf. The full P24 report and exact captures are preserved under `deliveries/G7/preparation/maker-evidence/pre-g7-24/`.

Start from the accepted PRE-G7-22 root source commit `500d10fa5901be48d4ff877e608d65ba0e271bb9`, app tree `ba0b709192367e1d12a796618f97801a8fcd5a70`, and preserve its composition. PRE-G7-24 source is a patch donor only; it must not replace the accepted scene. Do not use later unaccepted PRE-G7-22 deltas as the source base. Record the task branch parent, exact base source commit, and app tree before editing. Preserve the failed PRE-G7-24 source and evidence unchanged.

Governing contracts are [PRE-G7-24](2026-10-16-pre-g7-24-surface-parameter-batching.md), [PRE-G7-23](2026-10-16-pre-g7-23-render-call-budget.md), [PRE-G7-22](2026-10-15-pre-g7-22-home-scene-reference-fidelity.md), and the existing [validation ceilings](../validation-and-production.md). This packet authorizes a separately bound correction and test-harness setup fix; it does not relax visual, accessibility, interaction, source-mirror, or performance contracts.

## Owned paths

Own only:

- `app/src/features/world/LowQualityBatch.ts`, and `WorldRuntime.ts` only if needed for the bounded batching correction
- directly related tests under `app/tests/unit/` and `app/tests/performance/world.spec.ts`
- the corresponding changed files under `yorayriniwnl.in/`, plus that mirror's `README.md` and `source-delivery-manifest.json`
- `deliveries/G7/preparation/maker-evidence/pre-g7-25/`
- this packet and its narrowly related delegation index entry

Keep `app/` canonical. Confirm the app/mirror boundary and exact source tree before editing. Report unexpected drift before touching it.

## Authorized correction

1. Port the PRE-G7-24 in-memory batching approach onto the accepted PRE-G7-22 root source without losing the root scene composition. Preserve the authored materials, transforms, lighting, shadows, visible objects, and tier policy. Do not carry the upper-left foliage/stem objects absent from the accepted root scene.
2. Measure inclusive calls across both shadow and main render passes. The PRE-G7-24 `renderer.info` reading resets after shadow rendering and is not sufficient. Add a source-bound measurement that counts both passes without changing the renderer policy or acceptance ceilings.
3. Preserve all existing exclusions, source objects, interaction raycasts, transforms, animation, visibility, layer masks, render order, shadow flags, bounds/culling, teardown, `WEBGL_multi_draw` behavior, and its existing fallback. Do not remove other visible geometry or change materials, lights, tier policy, tone mapping, shadows, camera, DPR, renderer extensions, thresholds, or content to make the measurements pass.
4. Repair the performance test setup at the two quality-tier selections by opening the existing Studio controls drawer and waiting for the control to be visible before selecting LOW. Do not alter the product UI, assertions, test filters, retry policy, timeout, or performance thresholds.
5. Compare 1440×900 at HIGH and 390×844 at MEDIUM against exact PRE-G7-22 root captures. Keep browser and renderer identical. Preserve screenshots, pixel statistics, and direct visual inspection. Also capture all required viewports in Chrome and Edge and report the inclusive call and triangle ceilings.
6. If the existing approach cannot meet the inclusive ceilings while preserving parity, stop and record the remaining measured gap plus a concrete renderer or asset proposal. Do not change thresholds or omit geometry.

## Required evidence

Use a fresh `pre-g7-25` evidence directory and preserve all PRE-G7-22/PRE-G7-23/PRE-G7-24 artifacts. Bind source and evidence commits separately on the task branch. Record the exact parent source commit, app tree, changed Git blobs, mirror parity, asset hashes, raw command receipts, screenshots, and before/after inclusive call-count table. Reuse the accepted PRE-G7-22 root screenshots only with their exact source commit/tree and tier bindings recorded; do not use the PRE-G7-24 selected-input comparison as accepted-root parity evidence.

Run the unchanged composition E2E once with the existing PRE-G7-22 evidence variables, the focused batching and performance-test checks, full unit suite, lint, typecheck, production build, and two consecutive unchanged integration invocations. Run the existing performance suite once with its original configuration and verify that both previously blocked active-world tests proceed through the controls UI. Preserve every failure; do not change test filters, retries, timeouts, or thresholds.

The unchanged original-tier ceilings apply to every required capture:

| Viewport | Inclusive calls | Visible triangles |
|---|---:|---:|
| 1440×900 | ≤120 | ≤300,000 |
| 390×844 | ≤80 | ≤140,000 |
| 320×600 | ≤80 | ≤140,000 |
| 844×390 | ≤120 | ≤140,000 |

Physical-device, screen-reader, provider, database, deployment, independent audit, and parent acceptance claims remain **NOT RUN** unless separately performed under their governing workflow. This local packet cannot accept itself.

## Review boundary

After source and evidence are pushed, a separate read-only reviewer must audit the exact commits, visual parity, render ceilings, material/shader equivalence, interaction semantics, shadows, fallback behavior, performance test setup, source/mirror parity, and evidence binding. The maker does not approve the work. Corrections require a separately bound delta; parent acceptance remains pending until independent review and required evidence are complete.

This packet addresses the PRE-G7-24 scene drift, incomplete inclusive-call measurement, and the performance test's closed-drawer setup on the accepted PRE-G7-22 root source. It does not accept later PRE-G7-22 deltas, complete full V1/G7, approve asset rights beyond existing provenance, or authorize deployment.
