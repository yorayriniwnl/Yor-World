# PRE-G7-13A — Restore the hexagonal panel silhouette

- **Date:** 2026-10-14 (Asia/Calcutta)
- **Authority:** Parent Codex, Architect and Acceptance Authority
- **Applies to:** PRE-G7-13 only; all other packet constraints remain unchanged

## Reason and frozen input

The PRE-G7-13 maker audited `app/public/models/production-room-full.glb` at SHA-256 `3a02647d24e474c8a2579b0d277cf02a7841212e961c1554f67b6e032e40a307`. The frozen asset has 222 nodes and 196 meshes. The seven named nodes `hex_panel_1` through `hex_panel_7` are cuboids (`Cube.100` through `Cube.106`), each with eight unique corners and 36 triangle indices. Their current geometry cannot produce the specified six-sided silhouette through transforms or material calibration alone.

## Narrow scope amendment

The maker may replace geometry **in memory at runtime** for meshes belonging only to `hex_panel_1` through `hex_panel_7` with shallow six-sided panel geometry. Keep the replacement within each panel's authored world-space width and height, preserve its existing named node hierarchy, mesh names, transforms, material slots, and interaction bindings, and preserve the saturated pink/lilac calibration from PRE-G7-13. Make the operation idempotent and isolate each replacement geometry from shared GLB geometry.

The GLB, its nodes, accessors, buffers, materials, textures, and bytes remain unchanged. This amendment permits no new external asset, no other geometry replacement or prop, no global shader/renderer/tone-mapping changes, and no deployment, DNS, provider, or production edits.

## Evidence and review

Keep the failed PRE-G7-13 attempt-08 logs and captures unchanged. Record the source geometry inventory, replacement geometry dimensions and vertex/index counts, mesh and binding preservation, and final GLB checksum in a fresh attempt. Add unit coverage for the seven-panel mapping, six-sided silhouette data, geometry isolation, and repeated-application behavior. The strengthened production browser run must capture raw desktop and mobile scenes and retain the requirement for human recognition review; projected bounds alone are not visual acceptance.

The existing PRE-G7-13 validation, mirror, exact-commit evidence, independent read-only audit, delta audit, and parent ruling requirements remain in force. This amendment is not source acceptance, G7 acceptance, or deployment authority.
