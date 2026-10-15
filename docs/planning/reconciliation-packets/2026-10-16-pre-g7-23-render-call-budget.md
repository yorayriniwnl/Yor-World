# PRE-G7-23 — render-call budget remediation

- **Date:** 2026-10-16 (Asia/Calcutta)
- **Authority:** Parent Codex, continuing the user's full-site repair authorization
- **Status:** Authorized for one bounded local renderer correction and exact-source evidence.
- **Boundary:** Local-only. No provider setup, domain/DNS, deployment, production operation, or change to G7 acceptance.

## Purpose and frozen inputs

PRE-G7-22 captures a recognizable composition but exceeds the frozen inclusive render-call ceilings. The current branch captures the same issue after a first static batching experiment:

| Viewport / browser | Tier | Calls | Ceiling | Triangles |
|---|---:|---:|---:|---:|
| 1440×900 Chrome and Edge | medium | 226 | 120 | 28,736 |
| 390×844 Chrome | medium | 212 | 80 | 28,592 |
| 390×844 Edge | low | 108 | 80 | 14,320 |

These are viewport-emulated Playwright measurements on the recorded Intel Iris Xe / ANGLE WebGL 2 context. They are not physical-device claims. The current batch diagnostic reports 335 meshes, 138 eligible, 125 batched into 20 batches, and 13 eligible singletons. This packet authorizes investigation of the remaining calls; it does not treat those figures as a validated optimization.

Use the current candidate at `8a4adb30e514a5fa5a9ecbc04373af9e7714500a`, with app tree `ab95dafb3276c91ee9097d4f99a313e79c7da7e3`. The renderer experiment is source commit `df05ea13082874e6fd5fcfa1c2edf1b58ed77dc3`. Keep the production room GLB byte-identical to SHA-256 `3a02647d24e474c8a2579b0d277cf02a7841212e961c1554f67b6e032e40a307`.

Governing contracts are [the PRE-G7-22 visual packet](2026-10-15-pre-g7-22-home-scene-reference-fidelity.md), [its evidence-build clarification](2026-10-15-pre-g7-22-c1-evidence-build-flag.md), and [the product validation ceilings](../validation-and-production.md). PRE-G7-23 supplements the visual packet only for the draw-call defect. It does not replace its composition, accessibility, source-mirror, evidence, or review requirements.

## Owned paths

Own only:

- `app/src/features/world/LowQualityBatch.ts`, `RuntimeMaterialQuality.ts`, `WorldRuntime.ts`, `WorldInteractionBinding.ts`, `SceneIntegrator.ts`, and `types.ts`, only where required for static render batching and diagnostics
- directly relevant unit, integration, and performance tests under `app/tests/`
- corresponding changed source and tests under `yorayriniwnl.in/`, plus its `README.md` and `source-delivery-manifest.json`
- `deliveries/G7/preparation/maker-evidence/pre-g7-22/delta-15/`

Keep `app/` canonical and preserve the existing domain-only canonical URL override. Report unexpected mirror drift before editing. Do not edit `CameraDirector.ts`, `ReferenceComposition.ts`, `ProductionLighting.ts`, the GLB or any other asset binary, material/lighting values, scene transforms, visible object set, model loading, DPR or quality-tier policy, WebGL fallback/lifecycle/retry behavior, interaction catalog/contracts, routes, content, providers, dependencies, or the budgets below.

## Authorized correction

1. Profile which visible source meshes, material groups, shadow passes, and renderer paths account for the residual calls. Record a reason for every mesh excluded from batching and reconcile predicted versus measured calls.
2. Improve only in-memory batching or equivalent geometry submission for existing opaque static geometry. Preserve the authored material appearance, world transforms, culling, render order, cast/receive-shadow behavior, and all visible pixels within a documented tolerance. Keep source mesh identity and geometry available for interaction raycasts, diagnostics, and teardown. Never hide a semantic target or omit a visible object to meet a budget.
3. Keep animated, transparent, alpha-tested, transmissive, per-object-render-hook, custom-depth, custom-distance, and otherwise unsafe geometry on the original render path unless a test proves equivalent semantics. Do not relax exclusions without a specific regression test for the affected behavior.
4. Preserve every quality tier and fallback exactly. Batching may be active in existing tiers; it may not choose a cheaper tier, reduce DPR, remove shadows/effects, alter entry timing, or change content to satisfy these limits.
5. Add focused tests for eligibility/rejection, object and layer restoration on disposal, raycast behavior, shadow flags, tier-specific materials, and actual production-scene batch counts. Test both supported and no-`WEBGL_multi_draw` paths without changing either path's policy.

If the ceilings cannot be met while preserving these constraints, stop and report a concrete asset or renderer follow-up proposal with the measured remaining gap. Do not modify thresholds or reinterpret the mobile viewport classification.

## Required evidence and limits

Use a fresh delta-15 evidence directory; preserve delta-01 through delta-14. Bind the source and evidence commits separately. Capture raw command receipts, stdout/stderr, screenshots, source/mirror audit, exact Git blob inventory, and an explicit comparison against the PRE-G7-22 baseline. The final source and evidence must both be pushed to the existing task branch.

On the production E2E's recorded WebGL context, meet all existing ceilings without a tier or renderer-policy change:

- 1440×900: no more than 120 inclusive draw calls per rendered frame and 300,000 visible triangles.
- 390×844 and 320×600: no more than 80 inclusive draw calls per rendered frame and 140,000 visible triangles.
- 844×390: no more than 120 inclusive draw calls per rendered frame and 140,000 visible triangles.

Run the unchanged isolated composition E2E once with the PRE-G7-22 evidence variables and `NEXT_PUBLIC_PRE_G7_13_EVIDENCE=1` during production builds. Also run focused batch tests, the required unit, lint, typecheck, build, and two consecutive unmodified integration invocations specified by PRE-G7-22. Run the existing performance suite once if its pinned browser can execute on this source; archive failures without modifying its ceilings. Do not add retries, filters, timeouts, environment shims, or quality-command changes.

The visual scene must remain recognizably identical to the accepted PRE-G7-22 candidate at 1440×900 and 390×844. Retain all 25 semantic actions, raycast targets, camera endpoints, support contacts, full source/mirror parity, compact HUD behavior, and all packet-required viewport captures. Physical-device, screen-reader, provider, database, and deployment claims remain NOT RUN.

## Review boundary

After source and evidence commits are pushed, obtain a separate read-only audit of the exact commit, render budget, scene/pixel parity, interactions, shadows, source mirror, and evidence binding. The maker does not approve the output, and the auditor does not fix it. Corrections require a separately bound delta; parent acceptance remains pending until the review and all required evidence are complete.

This packet closes only the local render-call budget defect. It does not accept final art, establish physical-device behavior, approve licensing beyond recorded provenance, complete full V1/G7, or authorize deployment.
