# Art continuation report — attempt 18

Date: 2026-10-12  
Revision: `world-art-local-corrections-20261009-r1`  
Disposition: **candidate only; not visually accepted; not approved**

## Scope and source changes

Only the owned art revision was edited. `source/art_refinements.py` now assigns a cyan accent material to the desk modesty panel, preserving the accepted ivory top and white drawer materials. `source/environment/build-environment.py` adds that material and reduces the exported room light energies (hex 45→14, task 35→8, cyan 22→12, ceiling 30→6) because the runtime already adds primary pink/cyan lights. The material anchors for the wall, ivory top, chair blue, hex pink/lilac, and warm task bar remain unchanged.

Source SHA-256:

- `source/art_refinements.py`: `5ac343c39070693d237fee762de61bddbf9b297ef9a425a9e097439acaa7b6a`
- `source/environment/build-environment.py`: `7ee5690982715fd615615136e4f1f2eb6121ce4dc25752db1465ec87c746d532`
- `source/resident-fixture/build-resident-production.py` (unchanged): `58b0252e1a26b969b794beccef93245fed1b3f89352b24b3c12fbc059fb4c200`

The pre-edit canonical source is preserved at `evidence/build-attempt-16-source-snapshot/source/`. Historical attempts and public GLB bytes were left intact. No public asset files, public manifest, runtime source, shared build, browser process, or Git index were changed by this continuation.

## Candidate exports

All six GLBs were generated from the exact files under `source/` into fresh attempt roots and inspected from those output bytes. These full-hash URLs are proposed mappings for parent integration; they have not been copied into `app/public` or activated in a manifest.

| Logical ID | Proposed URL | Bytes | Triangles | Materials | Estimated GPU bytes | SHA-256 |
|---|---|---:|---:|---:|---:|---|
| `group-a-essential` | `/models/world-art-local-corrections-20261009-r1/group-a-essential.44ce298adc75cc2164b7704b8f5f9febc54853c68ad50f1a1c997da2a7ff41b8.glb` | 940,340 | 7,876 | 26 | 7,851,178 | `44ce298adc75cc2164b7704b8f5f9febc54853c68ad50f1a1c997da2a7ff41b8` |
| `group-b-props` | `/models/world-art-local-corrections-20261009-r1/group-b-props.cfad37c68dd609681b4669e66cf915d83f4446d21e5a862b33ae18700b1c7561.glb` | 611,608 | 7,036 | 24 | 3,901,471 | `cfad37c68dd609681b4669e66cf915d83f4446d21e5a862b33ae18700b1c7561` |
| `on-demand-projects` | `/models/world-art-local-corrections-20261009-r1/on-demand-projects.85840a1c11b39455a97d5371225baf002030976c41ec91db7bef6b444f52958b.glb` | 106,496 | 1,472 | 11 | 80,856 | `85840a1c11b39455a97d5371225baf002030976c41ec91db7bef6b444f52958b` |
| `production-room-full` | `/models/world-art-local-corrections-20261009-r1/production-room-full.fc2b17593927b82905750d63ce1df678d9d1d9f9f91e69de1bb3890dfa8e1f3a.glb` | 1,648,360 | 16,384 | 44 | 11,827,889 | `fc2b17593927b82905750d63ce1df678d9d1d9f9f91e69de1bb3890dfa8e1f3a` |
| `mobile-room-lod` | `/models/world-art-local-corrections-20261009-r1/mobile-room-lod.8d65fe4e5c98bb17fd110b6905cf7fafccfd076cbda8ccc6e6cea7095fb2b1ba.glb` | 1,545,504 | 12,632 | 44 | 11,723,453 | `8d65fe4e5c98bb17fd110b6905cf7fafccfd076cbda8ccc6e6cea7095fb2b1ba` |
| `fixture-chair-production` | `/models/world-art-local-corrections-20261009-r1/fixture-production.5957f5d3c9121ba332ef545b4f304b85244afee0371c171ccf18f0c93eb83dab.glb` | 391,396 | 8,080 | 5 | 342,892 | `5957f5d3c9121ba332ef545b4f304b85244afee0371c171ccf18f0c93eb83dab` |

GPU estimates are asset-derived geometry-buffer plus decoded PNG mip estimates, not measured total device allocation. Texture count is 7 in full/mobile, 4 in Group A, 3 in Group B, and none in project/fixture assets. The fixture carries eight animation clips.

## Export, transforms, hierarchy, and LOD

Blender 5.2.2 LTS exported `build-attempt-18` and `fixture-attempt-06`. The actual commands were:

```powershell
blender.exe --background --python source/environment/build-environment.py -- --attempt build-attempt-18
blender.exe --background --python source/resident-fixture/build-resident-production.py -- --attempt fixture-attempt-06 --no-render
node evidence/tools/inspect-exports.mjs export-inspection-attempt-18.json build-attempt-18 fixture-attempt-06
node evidence/tools/compare-mobile-lod-attempt-18.mjs
```

The Blender calls returned exit code 0. Their raw stdout/stderr and exit-code receipts are `evidence/environment-execution-attempt-18.*` and `evidence/fixture-execution-attempt-06.*`. Stderr contains Blender's `Material.use_nodes` deprecation warning only; it was nonfatal. Fresh camera renders are in `evidence/build-attempt-18/renders/`.

`evidence/export-inspection-attempt-18.json` reports PASS for all six GLBs: zero Khronos validator errors and warnings, 908 transform checks across grouped/full/mobile exports with zero failures, and maximum position delta `7.5148061e-8 m`. These checks overlap nodes intentionally: the 280-node environment is inspected as grouped exports and as full/mobile exports. The separate completeness receipt confirms the 136 + 111 + 33 group-node union equals the 280-node full/mobile scene. Certificate glass is under its frame, painting frame/canvas are under the pivot, and clock display is under the chassis.

The initial `export-completeness-attempt-18.json` check flagged `resident` and `resident-body` as missing from the 68-node fixture. These are deliberate exclusions: the fixture is chair/desk proof geometry, and the source says resident bytes are retained in the separate historical `/models/resident-production.glb`. `export-completeness-attempt-18r1.json` records the explicit exclusions and passes; the resident GLB remains 575,900 bytes with SHA-256 `b15000feb4738d14aa1d41a43f01ba377f7011dbe1c95b3478c1200d12f4411d`.

`evidence/mobile-lod-comparison-attempt-18.json` passes: full/mobile totals are 16,384 / 12,632 triangles, a 22.9004% reduction and 102,856 fewer encoded bytes. Thirty-seven eligible meshes total 8,240 source triangles and 4,488 mobile triangles (ratio 0.54466 against the 0.55 target). Fifteen protected meshes remain unchanged; no nodes are missing or added.

Fixture clearance evidence is `evidence/fixture-attempt-06/blender-checks.json` and `blender-measurements.json`: all 18 checks pass across 1,040 samples at 60 Hz for eight clips. There are zero desktop interior hits; chair intersections are limited to the expected pelvis/seat contact; soles remain at 0 m; turn/greeting hand gaps are 0.16 m / 0.3312 m. This supports the existing blue/white padded fixture chair. The integrated attempt-14 screenshots also show that retained chair; no chair-source change was made.

## Appearance review and limits

The attempt-14 integrated browser captures (`evidence/browser-art-attempt-14/`) showed clipped wall/desk whites and weak blue/lavender shadow contrast against the main reference. The art change therefore reduces exported environment lights that duplicate runtime lights and makes the desk front cyan while retaining the established white/ivory, pink/lilac, cyan, and warm anchors. Attempt-18 Blender camera renders display the cyan front panel and pink/lilac hexes, but look darker because these standalone EEVEE renders contain only environment-exported lights, not the separate runtime lighting in the browser scene.

The parent requested no shared browser or build for this revision. Therefore the new exact asset set has **no integrated browser captures** at the required six viewports. Browser visual review, mobile/desktop framing, and any visual acceptance remain pending parent integration. The 248/248 browser run from before these URLs remains evidence for its earlier 255-file tree only. This delivery is not visual approval, release approval, or a G7 result.

## Reproducibility note and incomplete attempts

The fixture source has the same SHA-256 across attempts 04/05/06, but Blender emitted three different fixture GLB hashes at the same 391,396-byte length. `evidence/fixture-reproducibility-attempt-18.json` compares them: GLB JSON, all positions, and canonical triangle geometry match; only chair-caster normal/index buffer views differ (maximum normal scalar delta about `9.8512e-5`). Use the exact selected artifact hash in its URL; byte-for-byte fixture re-export is not reproducible yet.

Earlier attempt roots 15 and 17 remain preserved and unused. Their wrappers treated Blender's deprecation text on stderr as a terminating PowerShell error and left empty export roots; no candidate was taken from them. Attempt 18/fixture 06 use separate redirected stdout/stderr, record exit code 0, and are the inspected candidates above.

