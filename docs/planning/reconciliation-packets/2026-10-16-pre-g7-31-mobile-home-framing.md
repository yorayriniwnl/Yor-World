# PRE-G7-31 — mobile home framing correction

- **Date:** 2026-10-16 (Asia/Calcutta)
- **Authority:** Parent Codex, following the user's full-site repair authorization
- **Status:** Authorized for one bounded mobile-camera source candidate
- **Scope:** Local source only. No deployment, production operation, or G7 state change.

## Frozen input and reason for this packet

Start from the pushed PRE-G7-30 evidence commit `848463d6d5c44e2575ada644baedb327176dc356` on `codex/pre-g7-25-surface-parity-20261016`. The product source under review remains the unaccepted PRE-G7-28 candidate `d86d3d68c34fcdff6319c7945c7d74e87ce81946`: canonical `app/` tree `6ab180f831661e43cc035fe9d70eec67372dd708` and domain mirror tree `7bb2e52b61c1161565816facb0e95194c9ff73c`. PRE-G7-30 authorizes diagnostics only; this packet is the required separate authorization for the camera change.

At 390×844, the existing home-mobile view leaves a large exposed blue background above the room. The PRE-G7-25 source-bound browser evidence records the current pose and projected anchors. The camera, reference-composition, scene-integration, and lighting blobs in that evidence are byte-identical to PRE-G7-28. A projection calculation using the measured anchor bounds predicts that changing only the mobile target Y from `0.96` to `0.55` keeps every named required anchor in-frame, with a minimum projected edge margin of 12.9 px; projected monitor width 163.9 px, seven-panel cluster width 148.7 px, shelf-camera width 58.7 px, and controller width 47.7 px. These are geometric projections from existing evidence, not a new browser capture, occlusion measurement, visual acceptance, or proof of human recognition. The source remains unaccepted.

## Exact authorized change

In the mobile home preset only, set `target` from `[0.06, 0.96, -1.2]` to `[0.06, 0.55, -1.2]`. Preserve its position `[0.3, 2.22, 1.43]`, FOV `110`, and all other presets. Update the existing unit assertion for that target. Do not change any E2E thresholds, behavior, entrance, controls, anchors, object transforms, materials, lighting, renderer policy, assets, or dependencies.

`app/` remains canonical. Apply the same normalized source and existing unit-assertion change to `yorayriniwnl.in/`; preserve its sole recorded `src/config/public-base-url.ts` override. Confirm the mirror boundary before editing. Stop if relevant source files differ beyond their documented newline normalization or the domain override.

## Owned paths

- `app/src/features/world/CameraDirector.ts`
- `app/tests/unit/camera-director.test.ts`
- `yorayriniwnl.in/src/features/world/CameraDirector.ts`
- `yorayriniwnl.in/tests/unit/camera-director.test.ts`
- `yorayriniwnl.in/README.md`
- `yorayriniwnl.in/source-delivery-manifest.json`
- `deliveries/G7/preparation/maker-evidence/pre-g7-31/`
- This packet and the PRE-G7-31 status paragraph in `docs/planning/delegation-and-work-orders.md`

No other paths are assigned. Keep source and evidence in separate commits on a new descriptive branch and push both commits to the verified GitHub remote. The source commit must contain only the two canonical source/test pairs and their domain mirrors. The evidence commit binds the source commit, app and mirror trees, source/mirror hashes, the existing projection input and its limitations, and actual check results. Update the domain README and manifest to identify the exact PRE-G7-31 source commit; do not describe the domain as deployed.

## Verification and review boundary

Keep the existing camera unit test and composition E2E assertions unchanged except for the unit test's expected mobile target. Do not weaken or add thresholds. Record checks honestly. A passing geometric projection is not an executed browser check. No test, build, or browser invocation is authorized by this narrow source packet; those checks remain `NOT RUN` unless separately authorized. Do not claim the framing correction is visually accepted from projection arithmetic alone.

This packet does not accept PRE-G7-28 or PRE-G7-31, resolve the performance-suite stall, close the full reference-fidelity requirement, or authorize deployment. A maker-independent audit of the exact source and mirror, a read-only visual review of a fresh 390×844 browser capture beside the main reference, required regression evidence, and Parent acceptance remain pending. Local Codex must not claim an external GPT Plus #2 or Gemini review.
