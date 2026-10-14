# PRE-G7-13-A1 — Existing hex-panel silhouette correction

Date: 2026-10-14 (Asia/Calcutta). Parent amendment to [PRE-G7-13](2026-10-14-pre-g7-13-anchor-articulation.md).

## Evidence and scope

The frozen input remains source commit `133529868c8c7279831cbbffe35ab23178012b8c`, app tree `06f2b4ad62f8022bc4f2d410d67ffa197316e6ab`, and evidence commit `b40cd49d257eca4b18f9e2df54404088eb4181c2`. The canonical `app/public/models/production-room-full.glb` is SHA-256 `3A02647D24E474C8A2579B0D277CF02A7841212E961C1554F67B6E032E40A307` in this input.

Read-only GLB inspection shows the seven existing nodes `hex_panel_1` through `hex_panel_7` reference meshes `Cube.100` through `Cube.106`. Each mesh has one primitive with 24 POSITION vertices and local bounds `[-0.11,-0.10,-0.0075]` to `[0.11,0.10,0.0075]` meters: a thin rectangular cuboid, not a hexagonal panel. The actual rendered opening scene therefore cannot show the prominent hex silhouettes required by PRE-G7-13 using materials and transforms alone.

## Authorized correction

PRE-G7-13 is amended to permit one in-memory, code-native regular hex-prism geometry replacement for each of those seven existing named panel meshes. This applies only to `hex_panel_1`–`hex_panel_7`; preserve each object, parent, name, interaction/diagnostic binding, materials, authored placement, and scale contract. Match the existing panel envelope (maximum 0.22 m wide × 0.20 m tall × 0.015 m deep before the already-authorized runtime scale), and retain the seven-panel authored arrangement. Do not add a new panel object, emissive overlay, texture, external asset, or any other geometry beyond the code-native props already authorized by PRE-G7-13. The GLB bytes must remain unchanged.

The maker must record the GLB hash, original mesh names/count/bounds, generated geometry dimensions and six-sided silhouette check, and the rendered desktop/mobile result. The strengthened browser evidence must assert the existing seven names remain bound and that their combined live pixels read as distinct pink/lilac hex shapes; the parent still makes the human recognition judgment.

All PRE-G7-13 ownership, review, testing, local-only, and non-deployment limits remain in force. This is a narrow parent scope amendment, not a G7 or visual acceptance ruling.
