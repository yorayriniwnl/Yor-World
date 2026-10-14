# PRE-G7-13 - Anchor articulation and visual calibration

- **Date:** 2026-10-14 (Asia/Calcutta)
- **Authority:** Parent Codex, Architect and Acceptance Authority
**Status:** Authorized for local correction work only. No deployment authority is added.

## Parent ruling and frozen input

PRE-G7-12 was reviewed and **not accepted** for visual composition. See [the parent ruling](../reviews/2026-10-14-pre-g7-12-parent-ruling.md) and the source-bound [maker report](https://github.com/yorayriniwnl/Yor-World/blob/b40cd49d257eca4b18f9e2df54404088eb4181c2/deliveries/G7/preparation/maker-evidence/pre-g7-12/REPORT.md).

Use the exact failed candidate source `133529868c8c7279831cbbffe35ab23178012b8c`, app tree `06f2b4ad62f8022bc4f2d410d67ffa197316e6ab`, as the correction input. Its evidence commit is `b40cd49d257eca4b18f9e2df54404088eb4181c2`. This packet authorizes a new correction on top of that candidate; it does not retroactively accept it or alter the PRE-G7-11 accepted source `cfdc744f69cd257c8ac0cbaad78b8805c48f20d5` / app tree `915c26f4b9a1fa075614ea64959750f9e486187c`.

The goal is to make the specified gaming-workstation anchors recognizable in the actual GLB/runtime opening scene while retaining the useful mobile control work. Fix the visual defects recorded in the PRE-G7-12 ledger rather than treating its passing interaction or color-diversity checks as visual acceptance.

## Owned paths

Own only:

- `app/src/features/world/CameraDirector.ts`
- `app/src/features/world/ProductionLighting.ts`
- `app/src/features/world/SceneIntegrator.ts`
- `app/src/features/world/ReferenceComposition.ts`
- `app/src/features/world/WorldRoot.tsx`
- `app/src/features/world/world.module.css`
- narrowly relevant world unit and production E2E tests, including `app/tests/e2e/world-reference-composition.spec.ts`
- corresponding changed source and tests under `yorayriniwnl.in/`, plus that mirror's `README.md` and `source-delivery-manifest.json`
- `deliveries/G7/preparation/maker-evidence/pre-g7-13/`

Before editing, verify that `app/` is canonical and the domain mirror differs only at the documented `src/config/public-base-url.ts` override. Preserve that override and report any unexpected difference before proceeding.

## Authorized corrections

1. **Calibrate named materials in memory.** The accepted GLB remains byte-for-byte immutable. The maker may apply bounded runtime overrides to the existing `Hex_LilacEmissive`, `Hex_VioletEmissive`, and `Lightbar_WarmTask` materials so the panels render as saturated pink/lilac shapes and the monitor bar reads warm. Inspect and record original material names, factors, emissive strengths, shared users, and color-management behavior. Clone a material when needed to avoid changing unrelated objects that share it. Record final runtime values and prove that the GLB SHA-256 is unchanged. Do not edit textures, bake reference pixels, or change global renderer/tone-mapping policy.
2. **Recalibrate only named room lights.** Bounded changes may be made to `Light_CeilingAmbient`, `Light_CyanFill`, and `Light_HexWall` after recording current values and their visible effects. Preserve the animated `Light_TaskDownlight` behavior and its 2.5 baseline. Maintain a bright room, saturated lilac hexes, visible cyan floor fill, and a warm monitor bar without washing out pale surfaces.
3. **Place existing groups for the actual opening views.** Bounded runtime group transforms, scale, and the existing named home-camera framing may be corrected for the plants, shelf/camera, monitor/speakers, microphone/console area, PC/pegboard/controller, chair, and resident. Preserve all named interaction roots and routes. The camera must visibly rest on the shelf, not merely remain in-frustum. Keep the resident from hiding the workstation and keep the plant within both desktop and mobile frames.
4. **Add only the missing code-native anchor details.** If the exact GLB audit confirms that its existing geometry cannot form a recognizable prop, this packet explicitly permits simple code-native geometry for (a) one game controller on the pegboard, (b) one compact audio console beside the existing microphone, and (c) an over-ear headset on the already authorized secondary stand. Keep each assembly visually consistent with the low-poly room, interaction-neutral unless an existing binding is deliberately reused, and secondary to the workstation. Record dimensions, placement, materials, and source-node inventory. Do not add any other prop or external asset.
5. **Keep the compact mobile control drawer.** Preserve all 25 existing semantic actions, focus entry/return, Escape behavior, keyboard traversal, reduced motion, portfolio navigation, safe areas, and touch targets. Change the drawer or camera only when necessary to keep the specified anchors visible.

Do not edit the GLB, other assets, route/content data, identity guards, provider/service code, backend schema, dependencies, project-wide timeouts, WebGL renderer creation/fallback/retry policy, or unrelated files. Hydration warnings from extension-injected attributes and the null-WebGL renderer error are separate issues and must remain outside this packet. No live deployment, DNS, production provider, or sender-domain change is authorized.

## Required evidence and acceptance targets

Return exact base/source/evidence commits, app tree, scoped source patch, final source-mirror manifest, exact-commit SHA-256 inventory, raw logs, screenshots, and a candid per-anchor report. Every check must be marked `PASS`, `FAIL`, or `NOT RUN` with command, exit status, artifact path, and limitation.

- Capture the actual live scene beside the supplied main reference at 1440x900 and 390x844. Review the raw live scene as rendered by the accepted GLB/runtime; comparison montages alone are not evidence of recognition.
- At 1440x900, all required anchors must be recognizable: desk/chair, prominent pink/lilac hex cluster, cyan fill, warm monitor light bar, plant and shelf camera, central monitor with two speakers, left console/microphone grouping, and right PC/controller pegboard. Include the headset and stand as a secondary detail. No primary group may be hidden by the chair or resident.
- At 390x844, the same major groups must remain identifiable and unclipped in the opening view. Closed-HUD fixed chrome remains <=20% of viewport area and fully obscures no required anchor. The camera and controller must be recognizable at this size, not merely have non-empty projected bounds.
- At 320x600 and 844x390, the scene and drawer remain usable without clipped actions or page-level horizontal overflow. Preserve 44 CSS-pixel touch targets and test focus entry/return, Escape, keyboard reachability, reduced motion, and navigation.
- Strengthen the focused production browser test to measure projected bounds for each required existing and code-native anchor and to assert meaningful visibility/color evidence for the lilac hexes and warm light bar. Assert that anchors remain inside the viewport and that the resident/chair do not cover the named target regions. Keep a human visual review in the report; do not claim that projected bounds alone prove recognizability.
- Add meaningful unit coverage for any new in-memory material calibration, group transform, or geometry construction. Keep all original semantic actions reachable.
- Run focused world-recovery/fullscreen tests, the strengthened visual-composition tests, lint, typecheck, full unit and integration suites, production build, CandidateX 404 guard, and clean-profile production browser smoke. Record default timeout or deterministic assertion failures without relaxing global timeout, GPU, quality, or fallback policies.
- Include browser/OS/GPU details and label emulated viewports honestly. Physical iPhone/iPad Safari, Android Chrome/TalkBack, Windows NVDA, VoiceOver/Safari, and 10-minute mobile soak remain NOT RUN until the parent integrates an accepted build and gives it to the user for real-device sessions.

## Review boundary

After the maker pushes exact source and evidence commits, an independent reviewer performs a read-only source, visual, material, geometry, accessibility, mirror, and checksum audit. The maker implements any correction; the reviewer then performs a delta audit. Parent alone accepts the packet. A local Codex audit is not represented as an external GPT Plus #2 audit. PRE-G7-13 acceptance, if earned, establishes only local visual-composition readiness; it does not accept G7, physical-device behavior, provider access, domain ownership, sender verification, deployment, or rollback readiness.
