# PRE-G7-22 — home-scene reference-fidelity remediation

- **Date:** 2026-10-15 (Asia/Calcutta)
- **Authority:** Parent Codex, Architect and Acceptance Authority
- **Status:** Authorized for one bounded local source correction with source-bound visual and regression evidence.
- **Boundary:** Local-only. No provider setup, domain/DNS, deployment, or production operation.

## Purpose and frozen source

The project remains incomplete. The current home-scene captures show the reference anchors present in the room, but the workstation reads as small and distant, the seated character and chair compete with the desk, and the speaker pair does not read as the two round desktop speakers in the user-designated image. `START_HERE.md` and the G3/full-V1 requirements keep visual approval open. PRE-G7-13 accepted its bounded composition delta; it did not establish final art approval or close this gap.

Use the exact accepted source commit `fc64a18a7ec1d027fb0a33400c2fcd6288d6afbf`, source tree `593f72ad5900dcfe8d5de0f0d0b2483dc8149709`, and canonical `app/` tree `0804688e4cdd55960e71a19efc8384d4a2f0d071`. PRE-G7-21 accepts a production build only on that source. Begin in a new clean worktree directly from the source commit; do not base implementation on an evidence commit or the dirty PRE-G7-20 development-server worktree.

The screenshot under PRE-G7-13 `attempt-60/composition/` is historical diagnosis, not evidence for this source. Capture the untouched `fc64...` source first, then capture the corrected source in the same browser, renderer tier, viewport, and entry state.

## Governing inputs

Read these files and preserve their contracts. Hashes are SHA-256 of the named parent inputs; runtime source is separately frozen by the exact source commit/tree above.

| Input | SHA-256 | Use |
| --- | --- | --- |
| `START_HERE.md` | `9bf70a05303ba8990b80ff954c640eb994a49384e0b3c2af2b7dae1667738f4a` | Current accepted state and known visual gap |
| `docs/superpowers/specs/2026-09-30-yor-world-design.md` | `9a05f7c0485fd46299e96706d3d7c4195eb30b2ae33710b37d67f2763aceff05` | Product requirements P03/P07/P09 and visual direction §7 |
| `docs/planning/art-and-experience.md` | `0fc3b10ee179937396debcea032a6f482823f75213d2a88932a1717d2e3453aa` | Bright palette, camera grammar, object grouping, and art provenance |
| `docs/planning/interaction-catalog.md` | `331d0d7d824e9c365d20d6616cce10a0fc70652674e0a0ba5888c9c8febe5e23` | Frozen named interaction and camera contracts |
| `docs/planning/validation-and-production.md` | `01d9df1de83cede37a9efbc5ca3cdfe760403404a8b1929029a05067c7551290` | Visual, accessibility, performance, and full-V1 acceptance |
| `references/README.md` | `f463a6d0ddec539f275103bc8cd443443beb538f87f8f25ad67f8f2e85dd7145` | Reference roles and unknown rights |
| `references/manifest.json` | `21c4e16fbe971792aa0c414a93a0da55b79cfcd5bf450da21f85681620cbd229` | Original locations, source hashes, duplicate copies, and provenance |
| `references/images/main-reference.png` | `37adfb0ee344642798978e954a0cfc8d9715eac1b3ca4e5a84ab87a228c53362` | User-designated visual authority; guidance only, not a source asset |
| `docs/planning/reviews/2026-10-15-pre-g7-21-parent-acceptance.md` | `e2f5d52387b79e7f366b6fe5c0aa8798de19a068740724d1e5965a61344a3cd0` | Exact-source build acceptance boundary |

The production room GLB is frozen at SHA-256 `3a02647d24e474c8a2579b0d277cf02a7841212e961c1554f67b6e032e40a307`. The named current source inputs inspected for this packet are `CameraDirector.ts` (`92c54ede5887aaa9d5f337e4b702343e315e57379fb454b1f63092e29b5e4acf`), `ReferenceComposition.ts` (`7c9ee0baeaf449e708def7344c5d4990a7c129cb6ed7b05ed1cfd0775f1c45fd`), `ProductionLighting.ts` (`e73b5ba9e7062b1db49aa7ecd4051e94a77e2c5fd91220354f411d09bb04f279`), `SceneIntegrator.ts` (`375be63624818424ac27617b6e53937bf1bef079d8c2be4cd540147474e6b28d`), and `app/tests/e2e/world-reference-composition.spec.ts` (`d5cb26b9fa2315813864e6a5fbece81cc78df242bae8938b6f76eb5dc554de63`). Reconfirm them from the assigned worktree before editing.

The exact frozen source currently sets `home-desktop` to position `[0.75, 2.4, 1.3]`, target `[-0.2, 0.9, -1.2]`, FOV `60`; `home-mobile` is position `[0.3, 2.22, 1.43]`, target `[0.06, 0.96, -1.2]`, FOV `110`. These are the PRE-G7-14 accepted starting endpoints. Any successor values must be reported and tested at the entrance's exact HOME settlement.

## Owned paths

Own only:

- `app/src/features/world/CameraDirector.ts`
- `app/src/features/world/ReferenceComposition.ts`
- `app/src/features/world/ProductionLighting.ts`
- `app/src/features/world/WorldRoot.tsx` and `app/src/features/world/world.module.css`, only if needed to preserve the compact responsive HUD while improving the scene view
- `app/tests/unit/camera-director.test.ts`, `app/tests/unit/reference-composition.test.ts`, `app/tests/e2e/world-reference-composition.spec.ts`, and directly relevant world tests only
- corresponding changed source/tests in `yorayriniwnl.in/`, plus that mirror's `README.md` and `source-delivery-manifest.json`
- `deliveries/G7/preparation/maker-evidence/pre-g7-22/`

Keep `app/` canonical. Preserve the already documented domain-only `src/config/public-base-url.ts` override and prove the source/mirror boundary before editing. Report any unexpected drift and stop before touching it.

## Authorized correction

First audit the actual `fc64...` GLB hierarchy, world transforms, materials, visible regions, camera frusta, interaction roots, and browser-rendered baseline. Record exact browser/OS/renderer, camera poses, and per-anchor pixel bounds at 1440×900 and 390×844 before making changes.

Then correct the home presentation so the actual scene reads as the user-specified gaming workstation: white/ivory desk and blue-and-white chair; a prominent pink/lilac hex cluster with visible cyan fill; central monitor and a visibly warm task light; planted shelf with a recognizable supported camera; two round desktop speakers; console/microphone on the left; and PC/controller/headset grouping on the right. Keep the chair and resident forward-right and out of the monitor/prop sightlines. Preserve the room's bright surfaces, screen legibility, low-poly/stylized direction, and semantic portfolio overlay. Use the reference as visual guidance only. Do not copy, trace, texture-bake, or redistribute its pixels.

The packet explicitly permits:

1. Revising only `home-desktop` and `home-mobile` camera positions, targets, and FOV when source-bound screenshots demonstrate the current endpoints cannot establish the required composition. This is an explicit successor to PRE-G7-14's accepted home endpoint values; once accepted, the PRE-G7-22 values supersede those two values only. Preserve the camera's clamping, transition, reduced-motion, cancellation, and endpoint semantics, including exact settlement to the selected HOME preset. Other named camera presets remain frozen.
2. Bounded in-memory transforms/scales for existing named scene groups, including coherent chair/resident placement, when measurements show a sightline or framing defect. Preserve node identity, animation ownership, interaction hit targets, support contacts, and collision clearances; do not mutate the GLB.
3. Per-instance material and named-light calibration for the existing hexes, cyan fill, task light, screen, and PC. Clone shared materials before changing them. Do not change global tone mapping, exposure policy, renderer creation, DPR/quality policy, or animated task-light baseline.
4. If exact GLB inspection confirms the two speaker groups lack round drivers, code-native low-poly driver/cone details parented to the existing speaker interaction roots. Record dimensions, materials, node names, and draw/triangle cost. Add no other new props or external assets.
5. A compact mobile HUD/layout adjustment only if the opening scene remains obscured. All 25 existing semantic actions, keyboard/focus behavior, reduced motion, safe areas, 44px primary targets, conventional routes, and Exit Studio must remain available.

This packet does not authorize edits to the GLB or any other asset binary, interaction catalog/contracts, content or identity claims, route/backend/provider code, dependencies/lockfiles, WebGL fallback/lifecycle/retry behavior, or unrelated source. No production configuration or deployment is authorized. If the composition cannot meet the target without a frozen contract or asset change outside these paths, stop with a concrete evidence-backed proposal; do not silently expand scope.

## Required evidence and acceptance

Return source and evidence commits separately on a new descriptive branch. Source changes must stay within owned source/mirror paths; the evidence commit must contain only PRE-G7-22 evidence. Include exact input/source/parent packet commits, source and app trees, a clean before/after state capture, and a strict inventory binding every evidence artifact to byte size, raw SHA-256, and committed Git blob.

Required visual proof:

- Capture untouched baseline and final raw browser screenshots at 1440×900, 390×844, 320×600, and 844×390, plus side-by-side main-reference comparisons at 1440×900 and 390×844. Use the same clean Chromium build/profile, renderer tier, and exact source-bound evidence mode for baseline and final. Identify viewport emulation honestly; it is not device testing.
- At 1440×900, the central workstation is the focal composition. The monitor is at least 28% of viewport width; the hex cluster is at least 25%; the desk is at least 55%. The chair/resident do not cover the monitor or any required object. All named anchors are wholly in frame.
- At 390×844, the monitor is at least 40% of viewport width; the hex cluster, speaker pair, controller, shelf camera, plant, and right/left workstation groups are recognizable at actual rendered size and remain wholly in frame. No required anchor may be called “recognizable” from an AABB or hit target alone.
- The seven hexes render as distinct pink/lilac panels; cyan room/floor fill and the warm monitor task light are visible without washing the desk/wall surfaces. The two existing speaker roots read as a matched round pair flanking the central screen. The left console/microphone and right PC/controller/headset remain in their intended groups.
- At every viewport, record projected pixel bounds and occlusion for each required named anchor. Retain the 20% maximum closed fixed-chrome area, no horizontal page overflow, keyboard/focus/reduced-motion checks, and all 25 semantic controls. The browser test must assert useful minimum projected monitor/hex sizes and anchor visibility; it must not treat pixel-count diversity as proof of fidelity.
- A separate read-only reviewer inspects raw screenshots beside the reference and records a human anchor-by-anchor judgment and deviations. Projected bounds or automated pixel thresholds alone cannot accept visual fidelity.
- Capture renderer triangle count, draw calls, pixel ratio/tier, and material/geometry additions. Stay within the existing home budgets: 300k visible triangles and 120 draw calls desktop; 140k triangles and 80 draw calls mobile. No performance policy may be relaxed.

Run under pinned Node 24.19.0 and pnpm 9.15.9 in the canonical `app/` root. Install only if needed with `pnpm install --offline --frozen-lockfile`. Run the isolated visual E2E file once using `pnpm exec playwright test tests/e2e/world-reference-composition.spec.ts`; set `PRE_G7_13_EVIDENCE_MODE=1`, `PRE_G7_13_REQUIRE_ISOLATED_EVIDENCE=1`, `PRE_G7_13_EVIDENCE_DIR=../deliveries/G7/preparation/maker-evidence/pre-g7-22/visual-run`, and `PRE_G7_13_EXPECTED_EVIDENCE_DIR=../deliveries/G7/preparation/maker-evidence/pre-g7-22/visual-run` so it cannot write into earlier packets. Then run once each: `pnpm run test:unit`, `pnpm run lint`, `pnpm run typecheck`, and `pnpm run build`. Run the default `pnpm run test:integration` exactly twice, consecutively, as separate captured invocations. Do not add retries, filters, timeout overrides, or environment shims to these quality commands. Preserve and report every failure. Do not run physical-device, screen-reader, 10-minute soak, provider, database, or deployment checks under this packet.

The report must list each required artifact and each check as `PASS | FAIL | NOT RUN`, with command, exit code, evidence path, and reason. Preserve raw stdout/stderr and actual screenshots; never synthesize a success screenshot or overwrite PRE-G7-11 through PRE-G7-21 evidence. Record actual maker/reviewer substitutions; local Codex does not count as an external Gemini or GPT account.

## Review boundary

After the maker pushes source and evidence commits, a different read-only reviewer audits the exact commits, current-source baseline/final screenshots, anchor sizes, speaker/material/light appearance, HUD/accessibility, source mirror, performance counters, full regression results, and strict inventory. The reviewer does not edit source or rerun quality gates. Any correction belongs to the maker as a separately committed delta, followed by a delta audit. Parent alone accepts the source and decides whether the visual gate is closed.

This packet accepts only a source-bound local home-composition correction. It does not establish user approval of final art, physical mobile/accessibility behavior, production assets/licensing beyond recorded provenance, full V1, G7, providers, domain/sender verification, deployment, rollback, or live production. Work remains local-only.
