# PRE-G7-13E -- Clear desktop navigation from the chair

- **Date:** 2026-10-15 (Asia/Calcutta)
- **Authority:** Parent Codex, Architect and Acceptance Authority
- **Applies to:** PRE-G7-13 visual-composition work after the PRE-G7-13D audit; all prior contracts remain unless this packet says otherwise

## Reason

PRE-G7-13D candidate commit 9e676579b3a3f02196734e42ae9db971fe3e7d8d made the existing chair readable in desktop and mobile raw captures and passed the anchor-sampling and 16-case visual suite. The exact-commit local Codex audit found a remaining desktop control-obstruction failure: the bottom navigation covers 6,783 px2 (20.32%) of the chair-base projected bounding box, including caster pixels. PRE-G7-13D remains unaccepted and its source/evidence stay preserved.

## Narrow scope amendment

The maker may change only the CSS positioning of the existing fullscreen portfolio navigation in:

- app/src/features/world/world.module.css
- yorayriniwnl.in/src/features/world/world.module.css
- the corresponding world.module.css source-delivery manifest entry

A responsive desktop placement may move the existing navigation into a clear screen area while preserving its current content and behavior. Do not change JSX, link targets, ARIA labels, keyboard behavior, the chair/root/base transforms, scene/camera/resident/desk/lighting, geometry, GLB bytes, routes, providers, dependencies, renderer/fallback behavior, tests, or project-wide timeouts. Do not change assertions to make this correction pass.

## Required result and evidence

- In a raw closed-HUD 1440x900 capture, the existing navigation bounding box must have zero intersection with the chair-base projected bounds and must not cover any caster pixels. Keep the chair base fully in the viewport.
- Keep the seat, backrest, and caster base visibly connected as one recognizable chair. Preserve the attempt-54 scene transforms and show that the nav clears the desk, monitor, speakers, controller, headset, and other required anchors.
- Keep every navigation action visible, keyboard reachable, and at least 44x44 CSS px. Preserve the existing accessible name and link/button behavior. Maintain no page-level horizontal overflow and the existing fixed-chrome <=20% viewport budget.
- Capture raw closed-HUD evidence at 1440x900 and 390x844; also retain default-suite evidence for compact 320x600 and landscape 844x390. Do not edit Playwright assertions or timeouts.
- Run the unchanged focused 16-case visual-composition suite with default settings plus build, relevant unit, typecheck, and lint checks. Record exact commands, versions, exit codes, evidence paths, and unchanged unit failures.
- Mirror the changed CSS byte-for-byte and update only its manifest entry. Verify all manifest rows, the frozen GLB SHA-256, and the exact changed-path scope.
- Preserve PRE-G7-13D and every failed iteration. Commit and push the scoped source/evidence change under the repository Git rule.

This packet does not accept PRE-G7-13E, PRE-G7-13, G7, physical-device behavior, or deployment. Independent review and Parent adjudication remain required.