# Art continuation report — attempt 19 and fixture reproducibility

**Disposition: candidate only.** This report records a source-level correction and offline exports. It does not approve the art, bind public URLs, change the public manifest, or establish integrated visual acceptance. Parent review of the updated integrated browser composition is still required.

## Source changes

Relative to attempt18, the attempt19 environment source also adds the cyan desk modesty-panel material and restrained local lighting changes; the frozen environment builder and referenced textures are included in source-attempt-19. The plant translation is described below.

`source/resident-fixture/build-resident-production.py` now canonicalizes the exported caster data for the five `chair-caster*` nodes. Repeated Blender exports with identical fixture source hashes had changed only caster normal/index buffer views; positions and directed triangle geometry were unchanged. `PYTHONHASHSEED` alone did not stabilize the earlier attempts. After Blender exports the GLB, the bounded post-pass derives normalized ellipsoid normals from caster positions and bounds, and sorts each triangle by cyclic rotation while retaining its winding. It does not change positions, face sets, caster count, node hierarchy, material bindings, accessor counts, or GLB length.

`source/art_refinements.py` shifts the complete floor monstera group 0.45 m toward the desk along runtime Z. The edit moves the pot, stand, six leaves, and six stems together; it preserves scale, materials, and leaf geometry. The plant's floor-center distance from the documented home camera changes from 0.223607 m to 0.657647 m (2.9411×). The scene comparison checks all 280 nodes: the 16 monstera objects move by the specified vector, and the other 264 objects remain unchanged.

The current frozen source hashes are:

| File | SHA-256 |
| --- | --- |
| `source/environment/build-environment.py` | `7ee5690982715fd615615136e4f1f2eb6121ce4dc25752db1465ec87c746d532` |
| `source/art_refinements.py` | `6a293c5a04571f72343860af70c115fa6a3dc22d55fef809998224026c4ba961` |
| `source/resident-fixture/build-resident-production.py` | `e03a890c26c2c1b97f2d23d813d99e73d058f29ece443ff9bcdf9b55284e0f23` |

Frozen copies and texture fingerprints are in `source-attempt-19/source-manifest.json`. The current fixture pair uses `source-fixture-determinism-attempt-11/source-manifest.json`. Attempts 04–06 and 18/fixture06 remain preserved.

## Environment attempt 19

Blender 5.2.2 LTS built from the frozen attempt19 source. The process returned exit code 0. Its only stderr content is the `Material.use_nodes` deprecation warning. The PowerShell runner redirected stderr as diagnostic output and judged success from Blender's exit code; the warning did not stop the export.

| Candidate output | Bytes | SHA-256 |
| --- | ---: | --- |
| `group-a-essential.glb` | 940,340 | `44ce298adc75cc2164b7704b8f5f9febc54853c68ad50f1a1c997da2a7ff41b8` |
| `group-b-props.glb` | 611,620 | `c8c3dde5c17f90f0748f3f76d6c75ca7cde96dfcd5ca2e350cf702a410144e82` |
| `on-demand-projects.glb` | 106,496 | `85840a1c11b39455a97d5371225baf002030976c41ec91db7bef6b444f52958b` |
| `production-room-full.glb` | 1,648,372 | `52ec834e1ceb2dd2b7b0b65512bfa60489d4777514f070a18fce7e4b87f79ae4` |
| `mobile-room-lod.glb` | 1,545,516 | `6a140a5acdd0d1420be9b6e5205363c5774c65e3dda49275e442f2143ade9831` |

The five outputs are in `evidence/build-attempt-19/runtime/`. Blender-only camera renders are in `evidence/build-attempt-19/renders/`; they are source-scene evidence, not an integrated app comparison.

## Fixture reproducibility and geometry

The first canonicalized fixture pair, attempts 09 and 10, used the same frozen builder (`e03a890c…`) and original refinement module (`5ac343c3…`). Their GLBs were both 391,396 bytes with SHA-256 `ce05bcbd0033b685b1cdb91fa1591fd366653fc7fd6d7409c1a4efacb508c1fe`.

The fresh attempt11/12 pair reran the unchanged fixture builder from one frozen snapshot with different `PYTHONHASHSEED` values. Both Blender processes returned exit code 0 and emitted the same 391,396-byte GLB hash:

| Attempt | Hash seed | GLB SHA-256 | Result |
| --- | ---: | --- | --- |
| `fixture-attempt-11` | 0 | `ce05bcbd0033b685b1cdb91fa1591fd366653fc7fd6d7409c1a4efacb508c1fe` | PASS |
| `fixture-attempt-12` | 42 | `ce05bcbd0033b685b1cdb91fa1591fd366653fc7fd6d7409c1a4efacb508c1fe` | PASS |

The GLBs compare byte-for-byte and their embedded JSON chunks are equal. The generated `.blend` files differ in hash and size; byte reproducibility is demonstrated for the shipped GLB, not Blender's native project file.

Against preserved fixture06 (`5957f5d3…`), the comparator finds equal GLB JSON, exact position arrays, and exact winding-preserving triangle sets for all 65 mesh primitives / 8,080 triangles. Raw index arrays differ because the five caster triangle lists are now in canonical order. Caster normals are deterministic but differ from fixture06's exporter-generated normals: 2,070 scalar values change, with maximum absolute scalar delta 0.023339658975601196. That is a bounded caster shading change and remains subject to independent visual review.

Both fresh attempts retain 18/18 fixture clearance checks, 1,040 samples at 60 Hz across eight clips, zero desktop interior hits, 0 m sole height, and turn/greeting hand gaps of 0.16 m / 0.3312 m. Expected pelvis/seat contact remains in the measurement JSON.

## Checks and raw outcomes

| Check | Result | Evidence |
| --- | --- | --- |
| Blender environment export, attempt19 | PASS, exit 0; warning-only stderr | `evidence/environment-execution-attempt-19.stdout.log`, `.stderr.log`, `.exit-code.txt` |
| GLB validator and authored transform inspection, attempt19 | PASS for all 5 environment GLBs and fixture10; each has 0 validator errors/warnings and 0 transform failures; 908 checks total, max position delta `7.5148061e-8 m` | `evidence/export-inspection-attempt-19.json` |
| Mobile LOD contract comparison | PASS; full/mobile 16,384 / 12,632 triangles; 37 eligible meshes reduce 8,240→4,488 triangles (ratio 0.54466); 15 protected meshes unchanged | `evidence/mobile-lod-comparison-attempt-19.json` |
| Plant transform/bounds delta, attempt18→19 | PASS; 16 objects moved, 264 unchanged; all positions, bounds, and reported matrices match within `2e-7` | `evidence/plant-clearance-attempt-19-r1.json` |
| Fixture export and clearance, attempts11/12 | PASS; both exit 0, both byte-identical GLBs; 18/18 clearance checks per run | `evidence/fixture-execution-attempt-11.*`, `evidence/fixture-execution-attempt-12.*`, each `fixture-attempt-*/blender-checks.json` and `blender-measurements.json` |
| Fixture GLB structure/transforms, attempts11/12 | PASS; 8,080 triangles, 68 nodes, 5 materials, 0 validator errors/warnings, 0 transform failures per fixture | `evidence/export-inspection-fixture-attempt-11.json`, `evidence/export-inspection-fixture-attempt-12.json` |
| Repeat-export and geometry comparator | PASS; pair byte-identical; positions and winding-preserving face sets equal fixture06 | `evidence/fixture-determinism-attempt-11-12.json` |
| Staged whitespace check | FAIL, exit 1; trailing whitespace at builder lines 191 and 203 in two frozen fixture source copies, plus one blank line at the comparator tool EOF | Exact files included in the candidate commit; details below |

The staged whitespace check reports inherited trailing spaces in the exact fixture builder snapshots at evidence/fixture-determinism-source-snapshot-01/source/resident-fixture/build-resident-production.py and source-fixture-determinism-attempt-11/resident-fixture/build-resident-production.py (blank lines 191 and 203). Those source bytes were kept unchanged to preserve the recorded source hashes. It also reports one new blank line at EOF in evidence/tools/compare-mobile-lod-attempt-19.mjs. That comparator and both frozen snapshots are included in the candidate commit, preserving the successful run and its receipt. A temporary EOF cleanup was reverted after a rerun correctly refused to overwrite the existing write-once receipt (Node EEXIST); the original tool and successful receipt remain intact. This is a whitespace-style failure; the export, geometry, validator, clearance, and determinism checks above passed.
The first plant comparison receipt, `evidence/plant-clearance-attempt-19.json`, is preserved as FAIL: its `1e-7` tolerance was stricter than two rotated-stem matrix values after Blender's seven-decimal serialization. The source scene showed the intended translations and unchanged bounds. The rerun raises only the recorded floating-point comparison tolerance to `2e-7` and passes; it does not relax the geometry or movement requirement.

Executed commands (PowerShell `Start-Process` captured stdout/stderr separately and recorded `$p.ExitCode`):

```text
"C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --python source-attempt-19/environment/build-environment.py -- --attempt build-attempt-19
PYTHONHASHSEED=0  "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --python source-fixture-determinism-attempt-11/resident-fixture/build-resident-production.py -- --attempt fixture-attempt-11 --no-render
PYTHONHASHSEED=42 "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --python source-fixture-determinism-attempt-11/resident-fixture/build-resident-production.py -- --attempt fixture-attempt-12 --no-render
node evidence/tools/inspect-exports.mjs export-inspection-attempt-19.json build-attempt-19 fixture-attempt-10
node evidence/tools/compare-mobile-lod-attempt-19.mjs
node evidence/tools/inspect-exports.mjs export-inspection-fixture-attempt-11.json build-attempt-19 fixture-attempt-11
node evidence/tools/inspect-exports.mjs export-inspection-fixture-attempt-12.json build-attempt-19 fixture-attempt-12
node evidence/tools/compare-fixture-determinism-attempt-11-12.mjs
node evidence/tools/compare-plant-clearance-attempt-19.mjs
```

The direct `Get-Command blender.exe` lookup failed because Blender is not on this PowerShell PATH; the explicit installed executable path above was verified as Blender 5.2.2 LTS. An initial strict plant comparator run returned exit 1 as described above; its corrected receipt passes.

## Limits and remaining review

- The exact attempt19 GLBs have not been loaded in the shared browser. Parent must bind them into the next integrated capture and judge the monstera framing against the previous capture and reference.
- Fixture6→canonical caster normal changes are measured above; independent review should confirm their appearance.
- Exports, geometry checks, and Blender renders do not prove visual acceptance or product-gate acceptance. Assets remain unapproved.
- No public GLB, `app/public/asset-manifest.json`, runtime path, shared build, or browser run was changed or executed by this continuation.

## Changed paths in this continuation

Paths below are relative to this revision directory. Attempts 09 and 10 also passed GLB structure and authored-transform inspection; their receipts are listed below. The frozen snapshots contain only manifest-listed files. Generated Python caches were removed and are not source inputs.

- source/art_refinements.py
- source/environment/build-environment.py
- source/environment/generate-carpet-texture.py
- source/environment/generate-pegboard-texture-attempt-11.py
- source/environment/textures/floor-carpet-microtexture.png
- source/environment/textures/pegboard-pattern-attempt-11.png
- source/resident-fixture/build-resident-production.py
- source-attempt-19/source-manifest.json
- source-attempt-19/art_refinements.py
- source-attempt-19/environment/build-environment.py
- source-attempt-19/environment/textures/acoustic-panel.png
- source-attempt-19/environment/textures/clock-display.png
- source-attempt-19/environment/textures/desk-mat-pattern.png
- source-attempt-19/environment/textures/floor-carpet-microtexture.png
- source-attempt-19/environment/textures/floor-wood-tiles.png
- source-attempt-19/environment/textures/monitor-wallpaper.png
- source-attempt-19/environment/textures/pegboard-pattern.png
- source-attempt-19/environment/textures/pegboard-pattern-attempt-11.png
- source-attempt-19/environment/textures/wall-painting.png
- source-fixture-determinism-attempt-11/source-manifest.json
- source-fixture-determinism-attempt-11/art_refinements.py
- source-fixture-determinism-attempt-11/resident-fixture/build-resident-production.py
- evidence/fixture-determinism-source-snapshot-01/source-manifest.json
- evidence/fixture-determinism-source-snapshot-01/source/art_refinements.py
- evidence/fixture-determinism-source-snapshot-01/source/resident-fixture/build-resident-production.py
- evidence/build-attempt-19/authored-scene.json
- evidence/build-attempt-19/blender-stderr.log
- evidence/build-attempt-19/blender-stdout.log
- evidence/build-attempt-19/production-environment.blend
- evidence/build-attempt-19/renders/blender-entry.png
- evidence/build-attempt-19/renders/blender-home-desktop.png
- evidence/build-attempt-19/renders/blender-mobile-portrait.png
- evidence/build-attempt-19/renders/blender-monitor-detail.png
- evidence/build-attempt-19/renders/blender-reverse-doorway.png
- evidence/build-attempt-19/runtime/group-a-essential.glb
- evidence/build-attempt-19/runtime/group-b-props.glb
- evidence/build-attempt-19/runtime/mobile-room-lod.glb
- evidence/build-attempt-19/runtime/on-demand-projects.glb
- evidence/build-attempt-19/runtime/production-room-full.glb
- evidence/fixture-attempt-09/authored-scene.json
- evidence/fixture-attempt-09/blender-checks.json
- evidence/fixture-attempt-09/blender-measurements.json
- evidence/fixture-attempt-09/runtime/fixture-production.glb
- evidence/fixture-attempt-09/runtime/resident-manifest.json
- evidence/fixture-attempt-09/runtime/resident-production.blend
- evidence/fixture-attempt-10/authored-scene.json
- evidence/fixture-attempt-10/blender-checks.json
- evidence/fixture-attempt-10/blender-measurements.json
- evidence/fixture-attempt-10/runtime/fixture-production.glb
- evidence/fixture-attempt-10/runtime/resident-manifest.json
- evidence/fixture-attempt-10/runtime/resident-production.blend
- evidence/fixture-attempt-11/authored-scene.json
- evidence/fixture-attempt-11/blender-checks.json
- evidence/fixture-attempt-11/blender-exit-code.txt
- evidence/fixture-attempt-11/blender-measurements.json
- evidence/fixture-attempt-11/blender-stderr.log
- evidence/fixture-attempt-11/blender-stdout.log
- evidence/fixture-attempt-11/runtime/fixture-production.glb
- evidence/fixture-attempt-11/runtime/resident-manifest.json
- evidence/fixture-attempt-11/runtime/resident-production.blend
- evidence/fixture-attempt-12/authored-scene.json
- evidence/fixture-attempt-12/blender-checks.json
- evidence/fixture-attempt-12/blender-exit-code.txt
- evidence/fixture-attempt-12/blender-measurements.json
- evidence/fixture-attempt-12/blender-stderr.log
- evidence/fixture-attempt-12/blender-stdout.log
- evidence/fixture-attempt-12/runtime/fixture-production.glb
- evidence/fixture-attempt-12/runtime/resident-manifest.json
- evidence/fixture-attempt-12/runtime/resident-production.blend
- evidence/environment-execution-attempt-19.exit-code.txt
- evidence/environment-execution-attempt-19.stderr.log
- evidence/environment-execution-attempt-19.stdout.log
- evidence/fixture-execution-attempt-09.exit-code.txt
- evidence/fixture-execution-attempt-09.stderr.log
- evidence/fixture-execution-attempt-09.stdout.log
- evidence/fixture-execution-attempt-10.exit-code.txt
- evidence/fixture-execution-attempt-10.stderr.log
- evidence/fixture-execution-attempt-10.stdout.log
- evidence/fixture-execution-attempt-11.exit-code.txt
- evidence/fixture-execution-attempt-11.stderr.log
- evidence/fixture-execution-attempt-11.stdout.log
- evidence/fixture-execution-attempt-12.exit-code.txt
- evidence/fixture-execution-attempt-12.stderr.log
- evidence/fixture-execution-attempt-12.stdout.log
- evidence/export-inspection-attempt-19.json
- evidence/export-inspection-determinism-attempt-09.json
- evidence/export-inspection-determinism-attempt-10.json
- evidence/export-inspection-fixture-attempt-11.json
- evidence/export-inspection-fixture-attempt-12.json
- evidence/mobile-lod-comparison-attempt-19.json
- evidence/fixture-determinism-attempt-11-12.json
- evidence/plant-clearance-attempt-19.json
- evidence/plant-clearance-attempt-19-r1.json
- evidence/tools/compare-mobile-lod-attempt-19.mjs
- evidence/tools/compare-fixture-determinism-attempt-11-12.mjs
- evidence/tools/compare-plant-clearance-attempt-19.mjs
- continuation-report-attempt-19-20261012.md