# FINISH-B1-R3 correction handoff

## Outcome

The R3 art package and evidence are prepared for independent review. Geometry, contact, motion, import, export syntax, and captures were measured from the delivered assets. The frozen raw draw-call gate remains **FAIL**: 202 desktop calls against 120 and 146 mobile calls against 80. This package is not a budget-pass candidate, and it has not been externally reviewed or accepted.

No canonical `app/` source, earlier delivery, or other lane was edited. Source changes and assets are contained in this delivery. The R3 allowlist and the 120/80 limits were not changed. No unsafe merge of hit surfaces, moving targets, or blind slats was made.

## Final exports

Geometry values and bounds below come from decoded GLB binary accessors and composed node transforms in the glTF runtime axis convention (Y up). Each mesh instance is in the default scene. Final Blender import of all five GLBs also passed and records Blender's converted Z-up bounds separately.

| Export | Bytes | SHA-256 | Meshes | Vertices | Triangles | World bounds (min .. max) |
|---|---:|---|---:|---:|---:|---|
| `assets/room.glb` | 676,176 | `e3ed3cf4a868922535427eb6c9dcf8c3e20618d300c82228475772c5a3c6560c` | 84 | 10,820 | 5,844 | `[-2.2000,-0.1000,-1.9000] .. [2.2000,2.9000,2.9000]` |
| `assets/resident.glb` | 579,596 | `bb0c6a271080890aeaccc2961cd3b3a846c41698a471ef6ba5feda62063c2de2` | 1 | 5,470 | 6,336 | `[-0.01929,0,-0.92971] .. [0.61929,1.41400,-0.20000]` |
| `assets/fixture.glb` | 84,816 | `0aeb5b55b4646d8c424c5d9cb77aea864364643f0ea1a449e7319fa71af6af30` | 5 | 2,362 | 2,460 | `[-0.0625,0,-0.59923] .. [0.6625,1.17000,-0.10500]` |
| `assets/group-b-props.glb` | 38,260 | `660fcc5290d915686e4013d37e28a6c63dffd8ca48f764141e33ac3344c42c03` | 7 | 912 | 576 | `[-1.3350,0.7500,-1.7200] .. [0.4575,2.2700,-1.1125]` |
| `assets/on-demand-projects.glb` | 12,420 | `ca57ceb15c4c98c1056cbac40e3335f184f365f1e5a8a7e763255012fb76ea92` | 4 | 216 | 128 | `[-1.4800,0.8000,-1.6025] .. [1.0550,1.8000,-0.9500]` |
| `assets/textures/deskmat-topography.png` | 38,312 | `7da8cd524d9409b59ccdbc3319cc755a415c9ff5cad9caf38886532b169c7a7e` | — | — | — | — |
| `assets/textures/monitor-wallpaper.png` | 208,470 | `8063a7d33f555a0bf8f0194547fcce3c24539a50b161ce2f2eafb6270cca5d20` | — | — | — | — |

The resident export is byte-identical to `validator-logs/pre-static-batching-20261011/assets/resident.glb`. A later static-batch builder run produced another resident hash (`d0d5d3c5…`); it was not promoted. The final browser suite and Blender import ran against the restored `bb0c…` resident and the other hashes in the table.

## Verification results

| Check | Result | Evidence and scope |
|---|---|---|
| Final GLB structural validation | **PASS** | `validator-logs/gltf-validation.json`: all 5 GLBs, 0 errors and 0 warnings, with final per-file hashes. |
| Final export geometry/transform assertions | **PASS** | `validator-logs/geometry-checks.json`: 25/25 checks, including measured world positions, door extent, and contract transforms. `validator-logs/glb-inventory.json` contains binary-derived vertex/triangle totals, bounds, mesh hierarchy, and action inventory. |
| Blender import of final exports | **PASS** | `validator-logs/final-export-blender-import.json`: Blender 5.2.2 imported all 5 exact final GLB hashes; 5/5 files contain meshes. Resident import has 26 bones and all 8 named clips. This is an import/geometry check, not a rerun of the source builder's contact checker. |
| Native source-builder check | **PASS, 18/18** | `validator-logs/blender-checks.json` and `validator-logs/blender-fixture-static-batch-build.log`. This receipt belongs to the builder-produced resident hash `d0d5…`, not the restored final resident `bb0c…`; it is preserved but is not presented as hash-bound final-export evidence. Final export motion/contact is covered by the hash-bound browser measurements below. |
| Browser motion/contact suite | **PASS for measured asset-harness criteria** | `validator-logs/browser-deformation-results.json` binds all 7 export/texture hashes. Chromium 153.0.8010.12 sampled all 8 clips at 60 Hz (1,040 rows), with zero root drift and zero desk-interior vertex hits. Key contact minima are about 0.57–1.00 mm in key-ready poses; mouse idle minimum surface gap is 3.03 mm with zero vertices inside the closed mouse surface and zero AABB-proxy hits. Pelvis-seat and foot-floor distances are within floating-point tolerance of contact. Turn hand clearance minimum is 159.995 mm against the 150 mm requirement; maximum body/chair yaw error is 0.000012°. |
| Playback sequence stress | **PASS in standalone harness** | The same hash-bound result records 20/20 greeting/return repetitions, 3/3 cancellation cases, skip-to-idle, and navigation re-entry. The harness copies scheduling behavior from `CharacterDirector.ts`; it does not mount the integrated C2 runtime. |
| Door sweep and camera clearance | **PASS for measured geometry sequence** | 451 samples at 60 Hz cover the 2.5 s sweep and the following 5 s camera path. No leaf/frame triangle intersections or camera near-plane intersections occurred. Minimum leaf/frame surface clearance was 0.0000026 m (near contact); minimum leaf/camera surface gap was 0.0715 m and minimum near-plane margin was 0.0215 m. Results are in `browser-deformation-results.json`. |
| Production door-transform owner | **NOT FOUND / NOT RUN** | The export has `Door_Leaf` parented to `Door_Hinge`, but no supplied production writer for `Door_Hinge` was found; the export has no room animation clip. The required production ownership boundary is unresolved, so the measured standalone door sequence does not prove `EntranceCoordinator` integration. |
| Capture provenance and dimensions | **PASS** | `captures/index.json` indexes 15 views. Each row separately hashes a raw WebGL canvas PNG and DOM screenshot, records camera/renderer/browser details and the complete 7-file hash set, and confirms the requested drawing-buffer pixel dimensions. |
| Browser console | **PASS** | `validator-logs/browser-console.json`: no console errors or page errors. |
| Frame-time diagnostic | **MEASURED; target qualification NOT RUN** | `validator-logs/browser-frame-diagnostic.json`: 120 warm RAF intervals at desktop and mobile viewport sizes. It is a local headless diagnostic, not physical-device FPS or a target-tier acceptance run. |
| Frozen draw-call budget | **FAIL** | Final hash-bound `validator-logs/draw-call-attribution.json` reports desktop `202 / 120` and mobile `146 / 80`. `validator-logs/draw-budget-assertion-final.log` reproduces both failures; the assertion process exits 1 as expected. Per-export owners are room `156/106`, group B `14/12`, resident `14/14`, fixture `10/10`, and on-demand projects `8/4` (desktop/mobile). Limits were not relaxed. |
| Target-tier/runtime batching qualification | **NOT RUN** | The standalone art harness does not run C2's target-tier controller. Runtime qualification and any supported quality-dependent reduction belong to C2 `LowQualityBatch.ts` and `RuntimeMaterialQuality.ts`, with the C3 target mobile profile. Raw export counts above are still a FAIL and are not replaced by this NOT RUN status. |
| Historical native proxy failures | **FAILs preserved; exact frames UNKNOWN** | `validator-logs/blender-checks-pre-native-fix.json` preserves the exact IDs: `mouse_idle desk clearance & seat tangency`, `notice_visitor desk clearance & seat tangency`, and `return_to_work desk clearance & seat tangency`. Original pair maps are in `blender-measurements-pre-native-fix.json`. Neither original artifact serialized frame arrays. Two isolated replays failed to reproduce the full original pair maps, so their frame lists are not attributed to the historical failures. `validator-logs/historical-proxy-failure-reconciliation.json` records both attempts and the mismatch. The post-correction builder receipt is 18/18 PASS. |

## Draw-call investigation and merge boundary

The source-bound static-only batching pass consolidated 120 safe room candidates into 19 batches, 8 optional-detail candidates into 1 batch, and fixture geometry into 4 chair batches. It preserves semantic names/TRS as empty anchors and records geometry/bounds conservation in `validator-logs/static-batch-report.json` and `fixture-static-batch-report.json`. The required `Chair_Seat` mesh remains separate. Contract targets, mutable surfaces, moving-pivot descendants, and 12 independent blind slats remain unmerged; the room report lists all exclusions. The measured result is a reduction from the preserved pre-batch 398/266 counts to 202/146, still above both frozen limits. Further unsafe art merges were not attempted; the runtime owners above need to provide the remaining tier-dependent path.

## Path correction and preserved scratch outputs

An earlier helper revision resolved `SCRIPT_DIR.parent`, sending generated files under this delivery's `source/blender/` scratch tree. That wrong-destination output and its existing files were preserved and were not promoted. Both assigned source builders now resolve `SCRIPT_DIR.parents[2]` to the exact `deliveries/FINISH-B1-R3/` root; the environment builder also skips a copy when source and destination resolve to the same path. The resolved paths, guard check, resident restoration hashes, and non-promoted generated resident hash are recorded in `validator-logs/path-guard-and-baseline-restoration.json`.

## Package and authority

- `source/blender/scripts/` contains the scoped Blender source; `source.patch` diffs the two assigned builders from the accepted R2 source.
- `scripts/` contains the R3 measurement, validation, and final-export import tools.
- `assets/`, `captures/`, and `validator-logs/` contain final artifacts and raw receipts. Earlier exports, audits, scratch files, and baseline evidence remain preserved.
- `output-hashes.json` hashes every packaged file except itself and its read-back verification record; `validator-logs/manifest-verification.json` verifies every manifest row.
- No external Gemini run or acceptance is claimed. Parent/independent review remains outstanding.
