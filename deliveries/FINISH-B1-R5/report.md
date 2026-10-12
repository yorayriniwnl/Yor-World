# FINISH-35 ? B1 reference palette correction

Date: 2026-10-12. Status: **scoped candidate delivered; owner visual review and independent audit pending.** This package addresses only the palette and light-color gap identified in the R4-02 full-room review.

## Candidate and boundary

The candidate is based on FINISH-B1-R4-02 commit `7936fa981a24fe4af834ff250ffec8a7b02b09b3`, tree `98f37af3f3b490a19a25677160c442fa7daef3fc`, package subtree `7df14feefa5b89f02b07c0127992d15189848f7a`. The full raw-Git package manifest is archived at `inputs/r4/git-manifest.json`; 200 source files totaling 32,924,791 bytes are bound to that commit. The accepted application tree `42ea29ec235225046a75959eb19eb386ac2f821d` was not changed.

The candidate changes only existing room and chair-fixture material values and two authored punctual-light colors. It lightens the existing wall, ceiling, blinds, desk, drawers, chair-white, PC chassis, pegboard and ceramic materials; adds low emissive lift to existing pale surfaces; increases the fixture chair cobalt; and makes the existing hex panels/lights more clearly pink and lilac. The cyan fill and deep-blue floor remain unchanged. No nodes, meshes, textures, UVs, transforms, animations, object or material assignments, runtime hooks, application code, camera profiles, dependencies or contracts changed. The room and fixture GLB binary chunks remain byte-identical.

A full scene rebuild was not used: replaying the pinned R4 builder from scratch changes the R4-02 wall geometry. Instead, `source.patch` updates only material/light values, `scripts/apply-native-palette.py` replays those values against the exact R4-02 `.blend`, and `scripts/apply-gltf-palette.py` applies the matching existing-material values to the shipped GLBs while retaining their binary chunks.

## Evidence

- Input bindings, source hashes and package tree: `evidence/input-bindings.json`, `inputs/r4/git-manifest.json`.
- Exact source patch replay: `evidence/source-patch-replay.json`.
- Material/light and unchanged-inventory proof: `evidence/palette-invariants.json`; detailed before/after Blender inventories are in `evidence/native-inventory-r4.json` and `evidence/native-inventory-r5.json`.
- Matched Chromium/Three r180 desktop (1920?1080) and mobile (720?1280) captures: `captures/R5/desktop-home/webgl-canvas.png`, `captures/R5/mobile-home/webgl-canvas.png`. Side-by-side comparisons: `evidence/visual-comparison.png` and `evidence/mobile-comparison.png`.
- Desktop: **103 draw calls**, 15,428 triangles. Mobile: **75 draw calls**, 14,056 triangles. The local calls limits (120/80), triangle/transfer budgets and texture budget pass. Measurements use the exact inherited cameras, DPR 1, exposure 0.85 and runtime lighting.
- `gltf-validator`: **5 files, 0 errors, 0 warnings**. Fresh Blender 5.2.2 import: **5/5 GLBs pass**. The 12-command replay/verification run exited 0 for every command; see `evidence/commands-and-exit-codes.json` and `evidence/logs/`.

## Visual outcome and open gates

The comparison shows brighter white/ivory walls, desk and drawer fronts, a stronger blue-and-white chair read, and more distinct pink/lilac hex lights while the cyan fill and blue floor remain visible. The monitor artwork remains legible. The room is still structurally simpler than the supplied reference and has fewer visible props and less photographic lighting nuance. This is a visible palette improvement, not a claim that full-room art fidelity has passed. The owner visual review and independent GPT#2 review remain pending; this maker package does not accept itself.

The positive-Y door/camera sweep and production door-transform owner remain open and outside this packet. Canonical integration, hosted-provider verification, physical mobile/Safari testing, recovery/security checks and G7 production qualification are **NOT RUN**. No production claim is made.
