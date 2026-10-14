# PRE-G7-13-A1 - Hex-panel geometry amendment

**Date:** 2026-10-14 (Asia/Calcutta)
**Authority:** Parent Codex, Architect and Acceptance Authority
**Status:** Authorized narrow amendment to PRE-G7-13. No deployment authority is added.

## Finding and frozen input

The PRE-G7-13 maker's exact-source topology audit found that `hex_panel_1` through `hex_panel_7` in the unchanged production GLB are 24-vertex / 36-index cube meshes with four unique vertices on the front face. They are rectangular cuboids, not hexagonal panels. The GLB remains 861,364 bytes with SHA-256 `3a02647d24e474c8a2579b0d277cf02a7841212e961c1554f67b6e032e40a307`.

The current source input remains `133529868c8c7279831cbbffe35ab23178012b8c`, app tree `06f2b4ad62f8022bc4f2d410d67ffa197316e6ab`, on the PRE-G7-13 correction branch. This is the failed PRE-G7-12 candidate named by PRE-G7-13; it is not an accepted baseline.

## Explicitly authorized delta

This amendment overrides only PRE-G7-13's restriction on adding code-native geometry for the missing hex shape. The maker may replace, in memory at runtime, the geometry of the seven existing named panel nodes with simple six-sided low-poly hexagonal panel geometry. The maker may instead suppress the rectangular faces and attach one six-sided code-native mesh beneath each existing named node if replacement would disrupt loader ownership.

Preserve each node's name, interaction bindings, authored group placement, existing named material treatment, and relationship to the rest of the room. Keep the panels in their existing wall cluster and orient them toward the opening home views. Do not add extra hex panels, unrelated props, imported assets, textures, dependencies, or reference-image-derived geometry. Do not modify the GLB, source textures, or binary assets. Record the runtime geometry dimensions, vertex/topology evidence, material values, and final desktop/mobile projected bounds.

All other PRE-G7-13 constraints remain unchanged, including its limits on named lights/materials, code-native controller/console/headset details, semantic controls, runtime fallback, providers, deployment, and review gates. If the seven existing nodes cannot retain their names, bindings, placement, and pixel visibility with this correction, stop and return evidence rather than widening scope.

## Added verification

- Add a meaningful unit test proving that each of the seven named runtime panel nodes receives a six-sided geometry with the expected orientation and bounded dimensions while retaining its stable name.
- In source-bound production screenshots at 1440x900 and 390x844, show seven individually recognizable pink/lilac hexagons with visible separation and a readable cluster outline. The focused browser check must measure each projected panel, assert it is in-frame, and sample saturated pixels in the hex regions; human visual review remains required.
- Report the GLB SHA-256 before and after, prove it is unchanged, and include the exact-source topology audit and the amendment in the evidence package.

## Review boundary

This amendment does not accept PRE-G7-12, accept PRE-G7-13, or authorize deployment. The same independent reviewer audits the exact amended source/evidence revision; parent acceptance remains separate.
