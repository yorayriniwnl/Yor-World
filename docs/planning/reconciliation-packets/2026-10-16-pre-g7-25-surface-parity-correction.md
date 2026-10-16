# PRE-G7-25 — surface parity correction and performance test setup

- **Date:** 2026-10-16 (Asia/Calcutta)
- **Authority:** Parent Codex, continuing the user's local repair authorization
- **Status:** Authorized for one bounded renderer correction and exact-source evidence
- **Boundary:** Local-only. No provider setup, domain/DNS, deployment, production operation, or G7 acceptance.

## Purpose and frozen inputs

PRE-G7-24 source commit `017bead7813d5ea9875b8789621b93b8a8cd00ce` (app tree `b28bf52127947dce6ad9e032d1fd0ffd2577fb47`) reduced the measured call count to 56 but failed same-tier visual parity against its frozen source baseline `26e87c8cd41f2745d165a74446ae1366f17f7bc1` (app tree `ab95dafb3276c91ee9097d4f99a313e79c7da7e3`). At medium tier, 90.9508% of desktop pixels and 88.0183% of mobile pixels differ by more than four channel values. The archived comparison shows broad lighting and material changes, including lost pink/cyan spill. The performance suite also failed two active-world tests because they select `quality-tier-select` while the Studio controls drawer is closed; both wait for the unchanged 180-second timeout. Exact source, screenshots, pixel metrics, and raw receipts remain preserved under `deliveries/G7/preparation/maker-evidence/pre-g7-24/`.

Start from the PRE-G7-24 failure-evidence/index commit. The canonical `app/` source must still match PRE-G7-24 source commit `017bead...`; record the exact packet-parent commit and app tree before editing. The failed PRE-G7-24 source is an immutable comparison point. Do not relabel it as accepted or overwrite its evidence.

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

1. Correct the PRE-G7-24 batching path so same-tier materials, colors, emissive response, roughness/metalness, lighting, shadows, texture behavior, and visible scene appearance match the frozen baseline. Preserve the useful call reduction if the existing ceilings can be met. Prove shader and geometry equivalence with focused tests and same-tier browser captures. Group only when every relevant state is preserved; leave unsupported materials on the original path.
2. Preserve all existing exclusions, source objects, interaction raycasts, transforms, animation, visibility, layer masks, render order, shadow flags, bounds/culling, teardown, `WEBGL_multi_draw` behavior, and its existing fallback. Do not remove visible geometry or change materials, lights, tier policy, tone mapping, shadows, camera, DPR, renderer extensions, thresholds, or content to make the measurements pass.
3. Repair the performance test setup at the two quality-tier selections by opening the existing Studio controls drawer and waiting for the control to be visible before selecting LOW. Do not alter the product UI, assertions, test filters, retry policy, timeout, or performance thresholds.
4. Capture the 1440×900 and 390×844 scenes in the same browser and renderer tier as the frozen PRE-G7-24 baseline. Preserve before/after screenshots, pixel-difference statistics, and a direct visual inspection. A tier mismatch invalidates the parity comparison. Also capture all four required viewports in Chrome and Edge and report the unchanged render-call and triangle ceilings.
5. If this bounded approach cannot meet the existing call ceilings while preserving same-tier appearance, stop and record the remaining measured gap plus a concrete renderer or asset proposal. Do not change thresholds or omit geometry.

## Required evidence

Use a fresh `pre-g7-25` evidence directory and preserve all PRE-G7-22/PRE-G7-23/PRE-G7-24 artifacts. Bind source and evidence commits separately on the task branch. Record the exact parent source commit, app tree, changed Git blobs, mirror parity, asset hashes, raw command receipts, screenshots, and before/after call-count table. The PRE-G7-24 baseline screenshots and metrics may be reused only with their exact baseline commit/tree binding recorded.

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

This packet addresses only the PRE-G7-24 parity regression and the performance test's closed-drawer setup. It does not accept final art, complete full V1/G7, approve asset rights beyond existing provenance, or authorize deployment.
