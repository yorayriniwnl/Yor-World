# PRE-G7-24 — surface-parameter batching follow-up

- **Date:** 2026-10-16 (Asia/Calcutta)
- **Authority:** Parent Codex, continuing the user's local repair authorization
- **Status:** Authorized for one bounded renderer correction and exact-source evidence
- **Boundary:** Local-only. No provider setup, domain/DNS, deployment, production operation, or G7 acceptance.

## Purpose and frozen inputs

PRE-G7-23 ended **FAIL / unaccepted**. Its measurements show that the rejected experiment still exceeds the inclusive render-call ceilings, and its dynamic-mesh batching was outside PRE-G7-23's static-geometry scope. The exact patch and evidence remain archived under [PRE-G7-23 delta-15](../../../deliveries/G7/preparation/maker-evidence/pre-g7-22/delta-15/README.md). The P23 branch's later report commits only correct and preserve that failure record.

Start from P23's current branch head `dde53bf6dde0a5e6b2644b02a622100b7355d1f2`. Its canonical source trees are unchanged from source commit `26e87c8cd41f2745d165a74446ae1366f17f7bc1`, app tree `ab95dafb3276c91ee9097d4f99a313e79c7da7e3`. The production room GLB remains frozen at SHA-256 `3a02647d24e474c8a2579b0d277cf02a7841212e961c1554f67b6e032e40a307`.

Governing contracts are [PRE-G7-23](2026-10-16-pre-g7-23-render-call-budget.md), [PRE-G7-22](2026-10-15-pre-g7-22-home-scene-reference-fidelity.md), and the existing [validation ceilings](../validation-and-production.md). This packet adds one measured renderer experiment; it does not relax the existing visual, accessibility, interaction, source-mirror, or performance contracts.

## Owned paths

Own only:

- `app/src/features/world/LowQualityBatch.ts`, `WorldRuntime.ts`, and `types.ts`, only for reversible batching and diagnostics
- directly related unit, integration, E2E, and performance tests under `app/tests/`
- corresponding changed files under `yorayriniwnl.in/`, plus that mirror's `README.md` and `source-delivery-manifest.json`
- `deliveries/G7/preparation/maker-evidence/pre-g7-24/`
- this packet and the narrowly related delegation index entry

Keep `app/` canonical. Confirm the app/mirror boundary and source commit before editing. Report unexpected drift before touching it.

## Authorized correction

1. Reduce submissions for existing opaque geometry by batching across material objects only when their rendered programs are equivalent after extracting these per-surface values into copied geometry attributes: base color, emissive color/intensity, roughness, and metalness. Preserve each source material's other shader-affecting state exactly, including material class, texture objects and UV transforms, vertex-color use, alpha state, sidedness, extensions, depth/stencil state, and callbacks. If equivalence cannot be proven from a focused test, keep those meshes on the original path.
2. Synchronize transforms for rigid animated or named-root descendants into `BatchedMesh` instances only when focused tests prove transform, visibility, source raycast, shadow, and fallback equivalence across changing poses. Keep the original source objects and geometry available. Unsupported transforms must restore that source mesh to the render path. Never batch skinned, morphed, transparent, alpha-tested/hashed, transmissive, hooked, custom-depth, or custom-distance meshes.
3. Preserve all materials' visible appearance in every existing tier. Do not change material, lighting, tone-mapping, shadow, quality-tier, DPR, renderer-extension, camera, object-set, transform, or content policy to meet the call limits.
4. Preserve all original meshes for interaction raycasts and diagnostics; preserve source transform hierarchy, visibility, layer masks, render order, cast/receive-shadow flags, bounds/culling behavior, and teardown. Test both `WEBGL_multi_draw` support and the existing fallback path without changing either policy.
5. If this bounded approach cannot meet the ceilings with same-tier visual parity, stop and record the remaining measured gap plus a concrete renderer or asset proposal. Do not change thresholds or omit visible geometry.

## Required evidence

Use a fresh `pre-g7-24` evidence directory and preserve PRE-G7-22/PRE-G7-23 artifacts. Bind source and evidence commits separately on this branch. Record the exact parent source commit, app tree, changed Git blobs, mirror parity, asset hashes, raw command receipts, screenshots, and a before/after call-count table.

The unchanged original-tier ceilings apply to every required capture:

| Viewport | Inclusive calls | Visible triangles |
|---|---:|---:|
| 1440×900 | ≤120 | ≤300,000 |
| 390×844 | ≤80 | ≤140,000 |
| 320×600 | ≤80 | ≤140,000 |
| 844×390 | ≤120 | ≤140,000 |

Capture 1440×900 and 390×844 before/after screenshots in the same browser, renderer tier, and evidence mode. Report pixel-difference statistics and inspect the actual output; a tier change invalidates parity. Run the isolated composition E2E once with the unchanged PRE-G7-22 evidence variables, then the required focused batching tests, full unit suite, lint, typecheck, production build, and two consecutive unchanged integration invocations. Run the existing performance suite once if its pinned browser can execute. Preserve every failure; do not change test filters, retries, timeouts, or thresholds.

Physical-device, screen-reader, provider, database, and deployment claims remain **NOT RUN**. Local Codex may document its own checks but cannot claim an independent account audit or parent acceptance.

## Review boundary

After source and evidence are pushed, a separate read-only reviewer must audit exact commits, material equivalence, dynamic behavior, render ceilings, same-tier visual parity, interactions, shadows, fallback behavior, source-mirror parity, and evidence binding. The maker does not approve the work. Corrections require a separately bound delta; parent acceptance remains pending until the independent review and required evidence are complete.

This packet addresses only the render-call defect. It does not accept final art, complete full V1/G7, approve asset rights beyond existing provenance, or authorize deployment.
