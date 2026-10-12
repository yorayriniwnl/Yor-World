# FINISH-B1-R7 candidate report

Status: **candidate produced; not accepted**. This correction addresses the R6 failure where the full right-side pegboard was clipped from the frozen mobile-home frame. Owner review, independent audit, Parent acceptance, integration, device/provider checks, and G7 remain separate and **NOT RUN**.

## Lineage and provenance

- Exact base: FINISH-B1-R6 commit `e8ea9187c1b6cd47b66ce7de9ad520daf9bd6baf`, tree `60da77df9e600670a416635101558203872bde7b`. The implementation commit is a direct child of R6; the final branch adds only its raw-Git evidence receipt. R6 remains unchanged.
- `evidence/input-hashes.json` binds the complete R6 delivery tree to raw Git: 195 committed blobs, including 193 output-manifest-listed files totaling 33,201,243 bytes plus the manifest and package-verification receipt. The raw R6 `output-hashes.json` SHA-256 is `80d6cb214cf9f1f74334268193365b9f9115c86b884c6762072d777d65c30525`; every listed raw blob was byte-compared.
- Provenance note: the R6 report records that its earlier staged R5 copy differed and was rehydrated from exact raw Git blobs. R7 independently rehydrated and bound the entire R6 tree by path, size, hash, and Git blob ID; no staged-copy contents were treated as the authority.
- `app/`, R6, camera profiles, contracts, door/path geometry, and other runtime assets remain unchanged. The only changed room nodes are `pegboard_system` and `pegboard_panel`; only existing static mesh indices 67, 72, and 73 changed. There are no added GLB nodes, materials, asset IDs, load groups, hooks, or runtime requests.

## Correction and matched visual evidence

The Blender build starts from the raw R6 editable `room.blend`. The board is moved 0.12 m left along Blender X from the initial R7 layout to keep the whole panel in the unchanged mobile frame. The first mounted controller receives an additional 0.08 m left layout offset. The full panel has 48 perforations, and the two separated mounted controller groups remain beside the right-side PC/headset area. The repeatable source and merge steps are `scripts/build-pegboard-correction.py` and `scripts/merge-pegboard-correction.py`; `evidence/correction-diff.json` records the exact edit, and `evidence/geometry-correction.json` / `evidence/glb-merge.json` bind it to actual exports.

Fresh matched browser renders use the unchanged profiles and screenshots at their full captured dimensions. No camera, viewport, DPR, exposure, or image crop was changed. The side-by-side comparison page is `evidence/comparisons/index.html`; all 14 raw PNG captures are under `captures/R6/` and `captures/R7/`.

| Profile | Full panel bounds | Controller A bounds | Controller B bounds | Result |
| --- | --- | --- | --- | --- |
| desktop-home 1920×1080 | x=1124–1160, y=287–433 | x=1138–1164, y=320–343 | x=1129–1156, y=364–385 | PASS, maker visual inventory |
| mobile-home 720×1280 | x=611–675, y=139–391 | x=635–682, y=195–237 | x=620–666, y=269–308 | PASS, maker visual inventory |

The full perforated surface and two mounted controller groups are inside both unchanged viewports. In the full-resolution captures the right-side panel and controllers remain readable, with the headset and PC fan face visible. The remaining anchor matrix is updated in `evidence/requirement-matrix.json`; it records maker visual inventory, not approval. The mobile frame remains tight and has only two draw calls below its frozen ceiling; inherited mobile cropping of the outer desk support/shelf ends is documented in the matrix.

## Validation and budgets

- Raw R6 input binding: **PASS**, 195 exact raw Git blobs; see `evidence/input-hashes.json` and `evidence/logs/input-bindings.log`.
- Blender 5.2.2 LTS static build/export and scoped geometry merge: **PASS**; actual editable `assets/source/room.blend` and native `evidence/native-room-export.glb` were generated from the raw R6 source. The official Blender 5.2.2 Windows archive SHA-256 `3849d17a682cba006075aaa3f3597ecb5c9c30ec31035b2e092c53e40679b535` matches the checksum list in `evidence/blender-5.2.2.sha256`; see `evidence/blender-archive-verification.json`.
- Blender fresh-scene imports of all five final runtime GLBs: **PASS**, finite transforms; see `evidence/blender-imports.json`.
- Khronos glTF Validator 2.0.0-dev.3.10: **PASS**, all five GLBs, 0 errors and 0 warnings; see `evidence/gltf-validation.json`.
- Exact-profile local Chromium 153.0.8010.12 / Playwright 1.63.0 / Three 0.180.0 run: **PASS**, 14 matched captures, same cameras/render settings and request set, five of five HTTP 200 asset responses per variant, no console errors, and both pegboard bounds checks pass; see `evidence/browser-results.json`.
- Structural invariants and frozen budgets: **PASS**; detailed receipts are `evidence/final-invariants.json` and `evidence/final-budgets.json`. Commands, exit codes, and raw logs are in `evidence/final-check-commands.json` and `evidence/logs/`.

| Metric | R6 desktop → R7 desktop | R6 mobile → R7 mobile | Frozen ceiling |
| --- | ---: | ---: | ---: |
| Essential asset transfer | 2,185,924 → 2,797,276 B | 2,185,924 → 2,797,276 B | 6 / 3 MiB |
| Visible triangles | 35,996 → 37,340 (+1,344) | 34,624 → 36,004 (+1,380) | 300k / 140k |
| Draw calls | 103 → 103 (+0) | 75 → 78 (+3) | 120 / 80 |
| Asset-derived residency estimate | 4,192,491 → 4,233,195 B | 4,192,491 → 4,233,195 B | 160 / 80 MiB |
| Local frame sample median / p95 | 0.8 / 1.1 ms | 0.7 / 1.0 ms | 18.2 / 25 ms; 33.3 / 45 ms |

The seven delivered runtime GLB/texture files total 3,044,058 bytes (2.903 MiB), below both optional-package ceilings. The 1,344 added perforation triangles account for the desktop triangle delta; mobile also renders 36 previously occluded/repositioned controller triangles. The frame sample is a local software-rendered browser measurement, not device qualification. Mobile has only two calls of draw-call headroom.

## Files and remaining gates

- Runtime assets and native editables: `assets/`; exact hashes: `candidate-asset-manifest.json`.
- Source/build/validation scripts: `scripts/`.
- Raw matched captures, comparison page, logs, hashes, invariants, requirements, budgets, and validation receipts: `captures/` and `evidence/`.
- Package file inventory and raw bytes: `output-hashes.json`; package check receipt: `evidence/package-verification.json`; post-commit raw Git blob receipt: `evidence/git-raw-blob-check.json`.
- Visual owner review, independent GPT Plus #2 audit, Parent acceptance, real-device/browser matrix, production service checks, integration, and G7: **NOT RUN / pending**. This is a candidate return only; do not treat it as accepted or integrated.
