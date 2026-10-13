# FINISH-25-R1 — bounded B1 glass-visibility amendment

Date: 2026-10-11 UTC
Status: Parent-authorized amendment to FINISH-25 for the exact in-progress B1-R4 candidate. It does not accept B1-R3/R4 or authorize canonical integration.

## Exact candidate and preserved work

- Governing packet: [FINISH-25](2026-10-11-finish-25-b1-r4-material-pass-correction.md).
- Exact base candidate: FINISH-B1-R3 commit `1753b9278c4537b5377c3893172b2a0f26d13b10`, tree `9759ac9879bcc9489770b7c5784ead2f022157b0`, delivery subtree `0bc042af5add583314a7e0713c6db8793f5ca18b`.
- Active output root: `deliveries/FINISH-B1-R4/`.
- Preserve the complete material-only checkpoint at `deliveries/FINISH-B1-R4/checkpoints/material-only/` byte-for-byte. Its checkpoint manifest binds 72 files / 10,515,141 bytes; `checkpoint-hashes.json` SHA-256 is `2957fb72ed270f9d6bd75fdce5f6dc0c1fe3e124da490a8a682fb9cf9731724a`.
- Preserve FINISH-B1-R3 and every earlier source, export, capture, report, and audit byte-for-byte.

## Reason for this narrow change

The material-only R4 checkpoint removes the duplicate transmission pass and measures 102 raw calls desktop / 74 mobile, but its close view is an opaque white PC slab: `pc_chassis_frame` is a closed six-face box directly behind the glass. The same material is also assigned to a window pane embedded inside the opaque left wall and frame. These are geometry-visibility blockers, not evidence that the new glass material itself failed export. The exact source measurements are in `evidence/pc-occlusion-scope.json` and `evidence/window-occlusion-scope.json` within the active R4 root.

This amendment supersedes FINISH-25's blanket geometry freeze only for the specific mesh components and one bounded interior detail below. All other geometry, UVs, names, hierarchy, transforms, animations, hooks, camera and door sequences, scene assets, materials other than the already assigned `PC_TemperedGlass` correction, and runtime source stay frozen.

## Authorized exact geometry edits

### PC case

1. Replace only the mesh geometry on `pc_chassis_frame` with an open-glass-side, five-wall shell built from the existing opaque `PC_ChassisWhite` material. Omit the side at the minimum world-X face (`x≈0.93`) so the unchanged side-glass panel is visible. Keep the node name, parent `helios-pc`, local transform, material, and outer world bounds exactly within X `[0.92999995,1.16999996]`, Y `[0.75999999,1.24000001]`, Z `[-1.38999999,-0.90999997]`.
2. Add at most one static mesh node named `pc_internal_backplate` under `helios-pc`, using the existing `Baseboard_Charcoal` material, centered approximately at `(1.155,1.0,-1.15)` with dimensions no larger than `(.008,.38,.38)`. It must remain fully inside the original chassis bounds. It has no animation, interaction, or runtime hook. This is the only new scene node allowed.
3. Preserve `PC_Fan_Group` world center `(1.05,.99,-.914)`, its local +Z spin axis, `Helios_Network_LED`, all other PC nodes, and their identities/transforms. Do not rotate or replace fan hooks.

Expected PC geometry change: approximately +48 triangles for the five-box shell and +12 for the backplate, and at most one additional opaque draw call. These are estimates; final native and exported counts must be measured.

### Window aperture

1. In `StaticBatch__Room_Root__Wall_SoftLavender`, replace only the connected `wall_left` geometry component with four opaque wall strips around an aperture at Y `[0.85,2.25]`, Z `[-1.20,0.00]`. Retain the existing `wall_left` proxy, batch name/parent/transform/material, all other batch components, and the wall's full outer bounds X `[-2.20,-2.10]`, Y `[0,2.8]`, Z `[-1.8,1.8]`.
2. Replace only `window_frame`'s closed cuboid with four frame-border strips. Preserve its name, parent `room-shell`, local/world transform, material `Baseboard_Charcoal`, node identity, and exact outer bounds X `[-2.16,-2.12]`, Y `[0.85,2.25]`, Z `[-1.20,0.00]`. The inner aperture is Y `[0.89,2.21]`, Z `[-1.16,-0.04]`.
3. Preserve the existing `window_glass` geometry, material binding, proxy, all blind slats, all lights, and all remaining room geometry exactly. Do not add sky, an exterior scene, daylight simulation, or new window controls.

Expected window geometry change: approximately +72 triangles and zero new raw calls if the original batches/primitives remain intact. This does not prove the exterior, open/closed blind presets, or daylight appearance.

## Boundaries that remain frozen

- Retain FINISH-25's `PC_TemperedGlass` material correction and prove the no-transmission/no-duplicate-pass result. Do not introduce a new glass material unless a further Parent amendment is issued.
- Geometry changes are limited to `pc_chassis_frame`, the single `pc_internal_backplate` addition, the `wall_left` component inside its existing static wall batch, and `window_frame`.
- No other room, furniture, prop, avatar, fixture, mesh component, UV, texture, room hierarchy, transform, animation, script outside the room authoring/export source, camera, door, runtime, app, or accepted-contract change is authorized.
- The positive-Y door/camera sweep and production door-transform owner remain unresolved and continue to block full B1 acceptance and downstream C2/C3 work.

## Required final evidence and delivery

In addition to all FINISH-25 requirements:

1. Keep the material-only checkpoint and its hashes intact; identify it as a failed visual checkpoint, not as the final R4 result.
2. Provide matched final R3 / material-only R4 / amended R4 exterior and interior captures for both PC glass and window. Use the same scene/camera/light settings where applicable. Show that the PC pane reveals depth and that the window pane is actually present through the opening/blinds. Report when an interior/exterior view cannot prove an effect.
3. Recompute component-level triangle counts and verify all non-authorized components' geometry/UV/material/node/transform identities are unchanged. Explicitly account for the one new backplate node and the four authorized geometry edits. Confirm the fan, LED, glass, blinds and all interaction hooks remain bound.
4. Re-export only the room asset from the exact R3 source plus the final R4 patch. Replay the final `source.patch` from the pinned R3 authoring source. Prove the other four production GLBs, two textures, and unrelated files retain their R3 raw bytes.
5. Re-run both exact browser profiles and report raw renderer/intercepted calls, triangles, renderer, camera, DPR, exposure, lights and loaded hashes. Strict draw ceilings remain 120 desktop / 80 mobile. The measured estimate starts from the material-only R4 checkpoint at 102 / 74; do not assume the geometry adds zero calls. A ceiling breach is FAIL.
6. Re-run GLB structural validation, source/export reproducibility, native/GLB hierarchy and transform inventory, UV/material inventory, package hashes, and all relevant budgets. Mark unavailable physical-device/provider checks NOT RUN.
7. Commit and push only the completed `deliveries/FINISH-B1-R4/` package. The maker must not accept it. Parent assigns a separate exact-candidate independent review; external GPT Plus #2 stays NOT RUN unless actually performed.

All original FINISH-25 conditions not amended here remain binding. This amendment grants no broader B1 acceptance, no user-facing publication, and no canonical integration.
