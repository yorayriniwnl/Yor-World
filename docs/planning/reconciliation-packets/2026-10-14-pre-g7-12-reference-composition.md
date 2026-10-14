# PRE-G7-12 — Reference composition and mobile room visibility

**Date:** 2026-10-14 (Asia/Calcutta)
**Authority:** Parent Codex, Architect and Acceptance Authority
**Status:** Authorized for local implementation after PRE-G7-11 narrow acceptance. No deployment authority is added.

## Frozen input and purpose

Use PRE-G7-11 accepted app source commit `cfdc744f69cd257c8ac0cbaad78b8805c48f20d5`, app tree `915c26f4b9a1fa075614ea64959750f9e486187c`. Its final evidence-only revision is `aeebec04e2097d017e0b531a19cdddc377264604`; the source subtree is unchanged. The parent ruling is [PRE-G7-11-R1 acceptance](../reviews/2026-10-14-pre-g7-11-fullscreen-domain-acceptance.md). Do not amend that accepted source silently.

The user-designated main reference and product spec section 7 require a recognizable bright gaming workstation. PRE-G7-11 browser captures show a room image, but its opening frame hides or misplaces several specified objects and the expanded mobile HUD covers much of the room. This packet corrects the actual 3D composition and mobile chrome while preserving the semantic portfolio and accepted runtime boundaries.

Named governing inputs and SHA-256:

| Input | SHA-256 |
|---|---|
| `docs/superpowers/specs/2026-09-30-yor-world-design.md` | `9a05f7c0485fd46299e96706d3d7c4195eb30b2ae33710b37d67f2763aceff05` |
| `references/images/main-reference.png` | `37adfb0ee344642798978e954a0cfc8d9715eac1b3ca4e5a84ab87a228c53362` |
| `docs/planning/art-and-experience.md` | `0fc3b10ee179937396debcea032a6f482823f75213d2a88932a1717d2e3453aa` |
| `docs/planning/validation-and-production.md` | `01d9df1de83cede37a9efbc5ca3cdfe760403404a8b1929029a05067c7551290` |
| `app/public/models/production-room-full.glb` | `3a02647d24e474c8a2579b0d277cf02a7841212e961c1554f67b6e032e40a307` |

The main reference is visual guidance and not a licensed source asset. Preserve provenance in `references/manifest.json`; do not copy, texture-bake, trace, or redistribute pixels from the supplied image.

## Initial source inspection

The bound production GLB currently contains named nodes for `hex_panel_1` through `hex_panel_7`, `Light_CyanFill`, `Light_HexWall`, the monitor light bar, shelf and plant groups, two speakers, pegboard/controller props, `helios-pc`, and `talks-microphone`. The pegboard and controller nodes are at negative X while the PC is at positive X, unlike the section 7 right-side grouping. No headset stand node was found in the GLB node table. The maker must repeat and extend this inventory from the exact accepted model, record transforms/materials/visibility and any parent grouping, and inspect interaction bindings before moving anything. This inventory is a starting observation, not permission to invent or remove unrelated scenery.

## Bounded maker ownership

Own only:

- `app/src/features/world/CameraDirector.ts`
- `app/src/features/world/ProductionLighting.ts`
- `app/src/features/world/SceneIntegrator.ts`
- `app/src/features/world/WorldRoot.tsx`
- `app/src/features/world/world.module.css`
- one narrowly scoped new world-composition module if required
- `app/tests/e2e/world-reference-composition.spec.ts` and a directly relevant focused unit test if needed
- corresponding changed source and tests under `yorayriniwnl.in/`, plus its `README.md` and `source-delivery-manifest.json`
- `deliveries/G7/preparation/maker-evidence/pre-g7-12/`

Do not edit product routes/content, publication data or identity guards, provider/service code, runtime lifecycle/retry/recovery policy, dependency/configuration files, unrelated domain files, or any earlier accepted/evidence revision. Keep `app/` canonical and regenerate the local domain mirror from that source, preserving its already-recorded `src/config/public-base-url.ts` override. Verify the current mirror boundary before editing; stop and report if an unexpected difference exists.

## Authorized changes

1. Diagnose the existing scene before changing it: extract the exact model node hierarchy, world transforms, material names/colors/emissive values, culling/visibility, and camera frusta for `home-desktop` and `home-mobile`. Check scene ownership and `WorldInteractionBinding` or equivalent raycast references for every node to be moved. Preserve the accepted GLB bytes unless the parent issues a separate model-export packet.
2. Correct opening desktop framing, placement of the existing named visual groups where necessary, and bounded named-light intensity/exposure so the actual home view shows the reference's composition. Required anchors are a white/ivory desk, blue-and-white chair, prominent pink/lilac hex light cluster, visible cyan fill, warm monitor light bar, plant/shelf grouping with camera, central monitor and two speakers, console/microphone to the left, and PC/controller pegboard to the right. Preserve the bright palette and keep the seated resident from hiding the desk setup. Do not invent other props or replace the room with a concept image.
3. Add one simple code-native headset stand only if the exact accepted scene audit confirms none exists. Keep it visually secondary, in the right-side PC/pegboard grouping, with no external image, model, texture, or dependency. Record dimensions, transforms, primitive/material choices and the reason it belongs. No other new geometry is authorized.
4. Change the initial mobile HUD to a compact, clearly labeled control entry/drawer so the scene is the default view. Keep portfolio destinations and Exit available. Opening the drawer must make all the current semantic controls, focus states, settings, camera choices and diagnostics reachable by touch and keyboard; closing it restores focus. Respect reduced motion and safe-area insets. Desktop controls may be grouped, but should not obscure the primary reference composition.
5. Do not change WebGL creation policy, DPR/quality tiers, model loading, or fallback behavior. Preserve all 25 existing semantic control actions and the accepted fallback/keyboard contracts. If control count changes only due to a new wrapper button, document which existing actions remain available and separately assert their reachability after opening the drawer.

No live deployment, DNS or provider modification is allowed in this packet. No production model binary change is authorized. If a required correction cannot be achieved within these paths without changing the accepted model export or runtime contract, stop at a concrete proposal with evidence and leave that work NOT RUN.

## Required evidence and acceptance targets

Return exact base/source/evidence commits, resulting app tree, scoped diff, source-mirror manifest, SHA-256 inventory over exact committed blobs, raw logs, screenshots, and a report with each check `PASS | FAIL | NOT RUN`, command/exit code, evidence path, and limitation.

- Capture the main reference and source-bound actual 3D scene side by side at 1440×900 and 390×844. The live image must be the room rendered by the accepted GLB/runtime, not the reference image or a substitute illustration.
- At 1440×900, the opening home view must make every required anchor group in item 2 recognizable without changing camera presets. Include a per-anchor evidence ledger naming the visible object, its source node/geometry, its screenshot region or projected bounds, and any remaining mismatch.
- At 390×844, show the desk/chair and all major lighting/shelf/monitor/left-prop/right-PC groupings in the opening view. With the HUD drawer closed, fixed chrome must cover no more than 20% of the viewport area and no anchor group may be completely occluded. Provide measured overlay boxes and deterministic assertions; visual review remains required.
- At 320×600 and 844×390, scene and drawer remain usable without clipped actions or page-level horizontal overflow. Preserve at least 44 CSS-pixel touch targets. Verify opening/closing the control drawer, focus entry/return, keyboard traversal to every action, Escape semantics, reduced motion, and portfolio navigation.
- A new focused browser test must assert the measured initial HUD/scene bounds, drawer reachability, named camera preset, and availability of semantic actions. A meaningful unit test must verify any new projected-bounds/scene-group logic; do not add tests that merely restate constants.
- Run focused world recovery/fullscreen tests, focused new tests, lint, typecheck, unit and integration suites, production build, CandidateX 404 guard, and clean-profile production browser smoke. Preserve the known default unit/integration timeout failures if they recur. Never relax project-wide timeout, GPU, or quality policy in this packet.
- Include the supported desktop/browser/GPU context and label emulation honestly. Physical Safari/TalkBack/NVDA/VoiceOver and mobile soak remain NOT RUN until the parent provides the accepted integrated build to the user for real-device sessions.

## Review and acceptance boundary

After exact maker source/evidence commits are pushed, the independent local auditor performs a read-only source, asset-node/interaction, visual screenshot, mobile chrome, source-mirror and checksum review. It reports findings to the maker for correction; it does not write fixes. The same auditor reviews the exact correction delta. Parent alone accepts the source.

PRE-G7-12 acceptance will establish only local visual-composition and mobile-HUD readiness. It will not establish physical-device behavior, production provider access, domain ownership/DNS, a live sender identity, deployment, monitoring/rollback, or G7.
