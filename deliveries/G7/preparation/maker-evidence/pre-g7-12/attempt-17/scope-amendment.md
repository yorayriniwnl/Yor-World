# PRE-G7-12 narrow scope amendment

**Date:** 2026-10-15 (Asia/Calcutta)  
**Authority:** Parent Codex, implementing the owner's instruction to take over maker, audit, and acceptance work.  
**Scope:** Bounded runtime light/exposure calibration and in-memory treatment of existing named hex-panel nodes.

The PRE-G7-12 packet authorizes bounded lighting/exposure changes but omits `WorldRuntime.ts` from its owned-path list. This amendment adds that file only for intensity assignments on the four named world lights and ACES exposure. It does not authorize changes to WebGL creation, tone-mapping mode, light positions/ranges/colors, DPR or quality tiers, asset loading, fallback behavior, lifecycle/recovery, or runtime contracts.

Direct inspection of the exact frozen GLB shows `hex_panel_1..7` use box meshes with 24 positions and 8 unique corners. The GLB contains no six-sided panel geometry. This amendment allows two close offset rows using those seven named nodes, plus a fragment-shader clip on the existing `Hex_LilacEmissive` / `Hex_VioletEmissive` materials. The material colors and intensity may be calibrated in memory to make the panels legible against the bright wall. No GLB bytes, mesh, geometry, texture, dependency, or external asset is added.

The in-memory panel layout uses top row y=1.87 and lower row y=1.6675 at z=-1.61, retaining the named roots and exact model bytes. The final emissive intensity is 2.4; `Hex_LilacEmissive` uses `0xff58e8` and `Hex_VioletEmissive` uses `0x995cff`.

| Named light / renderer setting | Frozen value | Candidate value |
|---|---:|---:|
| `World_HemisphereAmbient` | 2.1 | 0.85 |
| `World_Key` | 3.1 | 1.1 |
| `World_CyanFill` | 15 | 12 |
| `World_PinkFill` | 14 | 11 |
| ACES exposure | 1.15 | 0.85 |

The final GLB SHA-256 remains `3a02647d24e474c8a2579b0d277cf02a7841212e961c1554f67b6e032e40a307`.
The source-bound desktop and phone captures also showed the authored right speaker fully hidden by the seated resident. This amendment allows the three existing nodes `speaker_right_cabinet`, `speaker_right_tweeter`, and `speaker_right_woofer` to move together by x=-0.20m and y=+0.50m in memory, placing the right speaker beside the monitor where it remains visible in both opening presets. The resident, `chair-root`, camera presets, animation clips, interaction names, and runtime contracts remain unchanged. The resulting chair ledger is bound to the actual `fixture-production.glb` used by `SceneIntegrator`, SHA-256 `8e413b1aa407841b5fd268a9c00bb66718688957c6507551f3b79104132d81d8`; it no longer treats the removed static W1 chair as the rendered chair.