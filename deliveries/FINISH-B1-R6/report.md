# FINISH-B1-R6 candidate report

Status: **candidate produced; not accepted**. This delivery contains static room and chair-fixture detail only. Owner visual review, independent audit, Parent acceptance, integration, production-device checks, provider checks, and G7 remain separate and are **NOT RUN**.

## Lineage and scope

- Base: FINISH-B1-R5 commit `a5ebcc88170703751a5f504f67aed637d2f7d8e9`, tree `d3dcb1ab82485749bd8b53f2b7cb9add2e576caa`, parent `7936fa981a24fe4af834ff250ffec8a7b02b09b3`.
- Raw R5 package binding: **PASS**. The raw committed `output-hashes.json` SHA-256 is `e961589754498b3b8770de38ec6516cd051c838267ed3f2db85248769556370a`; 127 files / 18,529,345 bytes verified from Git.
- Provenance note: the staged copy initially differed from pinned raw Git in 0 manifest-listed files. The R6 input copy was rehydrated from those exact a5 raw blobs; see `evidence/input-bindings.json`. R5, `app/`, camera/door ownership, contracts, and prior committed evidence were not edited.
- Scope: 9 existing room static mesh batches and 1 existing chair-fixture batch changed. Added triangles: 20,432 room + 136 fixture. New nodes, materials, runtime asset requests, mesh nodes, GLB primitives, and interactive hooks: **0**.
- The original R5 binary data is preserved as a byte-identical prefix. Existing node, material, animation, light, camera, glass, and hierarchy inventories remain unchanged. See `evidence/static-geometry-merge.json`, `evidence/final-invariants.json`, and `evidence/final-inventory.json`.
- Delivery-local `.gitattributes` disables line-ending conversion so the rehydrated raw R5 inputs and the package SHA-256 manifest remain byte-identical in committed Git blobs on Windows.
- Editable sources: `assets/source/room.blend` and `assets/source/fixture.blend`. Blender 5.2.2 Windows archive SHA-256 was verified against the official checksum list; exact receipt and tool versions are in `evidence/tool-versions.json` and `evidence/blender-5.2.2.sha256`.

## Validation and budgets

- Blender-authored build and exports: **PASS**, Blender 5.2.2 LTS (`d13f752e3b9c`). Five final GLBs also imported in fresh Blender scenes with finite transforms: **PASS**.
- glTF Validator 2.0.0-dev.3.10: **PASS**, five final GLBs, 0 errors, 0 warnings.
- Exact-profile local Chromium browser run: **PASS** for 14 R5/R6 captures, 5/5 HTTP 200 asset responses per variant, unchanged desktop/mobile camera and renderer settings, no console errors, and unchanged five-request set. Browser is Chromium 153.0.8010.12 / Playwright 1.63.0 / Three 0.180.0.
- R6 observed home asset response transfer is 2,185,924 bytes (2.085 MiB) for five GLBs, up 769,944 bytes from the matched R5 baseline. This is under the frozen 6 MiB desktop and 3 MiB mobile essential-transfer limits. The conservative sum of all seven delivered runtime GLB/texture files is 2,432,706 bytes (2.320 MiB), under the 14/7 MiB optional V1 file-budget ceilings. Provider-served optional media outside this package were **NOT RUN**.
- Desktop/mobile visible counts: 35,996/34,624 triangles (20,568/20,568 from matched R5) and 103/75 draw calls (0 delta), under the 300k/140k triangle and 120/80 call limits. Asset-derived loaded residency estimate is 4,192,491 bytes per view, up 612,928 bytes from R5 (under 160/80 MiB). Receipts: `evidence/final-budgets.json` and `evidence/browser-results.json`.
- Local frame sample after 30 warmup frames and 180 sampled frames: desktop p50/p95 0.90/1.00 ms; mobile p50/p95 0.70/1.00 ms. This is a local headless software/WebGL timing sample, not device or production qualification.

## Visual findings

The matched comparison page is `evidence/comparisons/index.html`. It shows the main reference, committed R5 capture, fresh matched R5 capture, and R6 capture for both exact home profiles. The `evidence/requirement-matrix.json` records the anchor outcomes against the exact profile captures. The mobile view uses the supplemental center drawer support because the original outer support is cropped. The full right-wall controller pegboard remains outside the fixed mobile frame; a compact controller display card is visible but does not satisfy that full anchor. The microphone, shelf ends, and headset are close to the frame edges. Owner and independent visual judgments remain **NOT RUN**; this inventory is not art acceptance.

## Files and handoff

- Updated candidate manifest: `candidate-asset-manifest.json`.
- Reproduction and package scripts: `scripts/build-static-details.py`, `scripts/merge-static-geometry.py`, `scripts/verify-browser.mjs`, `scripts/validate-glb.mjs`, `scripts/verify-blender-imports.py`, `scripts/verify-input-bindings.py`, `scripts/verify-invariants.py`, `scripts/build-comparison.py`, `scripts/write-delivery-report.py`, `scripts/build-output-hashes.py`, `scripts/verify-package.py`.
- Commands, tool versions, captures, logs, inventories, validator JSON, transfer/performance receipts, and raw Git input bindings are under `evidence/`. `output-hashes.json` binds the delivered file set; `evidence/package-verification.json` records the package check.
- Candidate branch is based on the exact pinned R5 commit. This is maker evidence only; no self-audit or acceptance is claimed.
