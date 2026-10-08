# Rendering maker checkpoint — 2026-10-09

Actual executor: local Codex `local_rendering_maker`; this is maker evidence, not independent acceptance. Owned correction worktree: `C:\Users\yoray\Projects\Yor-World-Local-Corrections`. Parent manages Git and both servers. Accepted port 3000 remained intact.

The original report was read directly: `Yor World/scratch/local-check/studio/report.md` and `results-closure.json`. Its 615 high HOME frames each returned 300 scene draws; Three r180 resets after shadow rendering, so that original diagnostic omitted earlier shadow draws.

Implemented: one renderer.info reset immediately before the complete frame with autoReset disabled; explicit inclusive diagnostic marker; exact-material opaque rigid batching at high/medium/low; pre-render live world transforms/visibility and conservative native fallbacks. The no-WEBGL_multi_draw path uses copied merged geometry and camera-selected index ranges. Original geometry, material identity, hierarchy, names and raycasts remain owned by the world. Unsupported skins, morphs, transparency/transmission, callbacks, custom raycasts, object-space normals, shear, changed buffers/materials/layers/hierarchy stay native. Off-camera shadow casters remain in portable geometry. Borrowed source assets are not disposed by batches. Tier changes restore sources before rebuilding.

Independent reported preservation defects corrected: newly added source layers cannot remain in an old batch layer; replaced attribute identities cannot use stale copied buffers; detached/reparented sources cannot remain ghost instances. Both batching paths have focused regressions.

| Check | Result | Actual evidence |
| --- | --- | --- |
| 82 focused batching/material/runtime-loop tests | PASS | `attempt-20261009-0438-native/unit-batching.log`; pnpm exec vitest run with the four owned test files, exit 0 |
| Real full-app Chrome/NVIDIA frames with multi-draw | PASS for sampled HOME draw ceilings | `probe-results.json`: desktop 94 high/medium, 49 low; mobile 76 high/medium, 39 low; actual pass/material breakdown |
| Real full-app Chrome/NVIDIA frames with extension suppressed | PASS for sampled HOME draw ceilings | `attempt-20261009-0438-native/probe-results.json`: source fingerprints stable, no page errors, actual extension unavailable, same counts across 133–134 consecutive frames per profile |
| Portable geometry motion/normal, source identity, fallback and disposal tests | PASS | Same 82-test log |
| Initial development StrictMode GPU creation | FAIL, preserved | `probe-dev-strict-failure.json`; corrected by the separate UI maker, fresh probe subsequently rendered |
| Initial native fallback before merge implementation | FAIL, preserved | `harness-before-portable-merge.json`: 356 desktop / 194 mobile native draws. Not relabeled as success |
| Separate reconstructed GLB harness after merge | PASS for sampled counts | `harness-results.json`; this harness is explicitly distinct from full-app evidence |
| Final production build, independent delta audit, new-art combined performance | NOT RUN at this checkpoint | Parent/new art integration and independent reviewer required |

Actual browser: installed Chrome 154.0.8037.98, ANGLE NVIDIA GeForce RTX 2060 / D3D11. The full app target was Parent's correction-tree Next dev server at 3140; exact file SHA-256 fingerprints are in the fresh raw report. These are functional GPU draw samples, not controlled frame-pacing or production certification. High/medium frames split as 47+47 desktop and 38+38 mobile transmission/main draws. Frozen GLB mesh castShadow flags were false; configured shadow lighting was retained and no effect was removed. Existing transmitting glass materials remain native and unchanged.

Changed production/test paths: `WorldRuntime.ts`, `types.ts`, `LowQualityBatch.ts`, new `RigidWorldBatch.ts`, new `rigid-world-batch.test.ts`, `world-runtime-recovery.test.ts`, `performance/world.spec.ts`. The performance spec gains strict inclusive ceilings and adapts quality selection to the UI maker's Options disclosure without loosening prior assertions/timeouts.

Remaining expanded packet work: bounded loading/abort/resource ownership, real decorative pause and dynamic reduced motion, measured-container cameras, UI restoration/replay APIs, then fresh combined art/UI/performance and independent review. Heap/GPU leak absence remains UNKNOWN; physical mobile/audible/screen-reader/production evidence NOT RUN. No self-acceptance or external-account execution claim.

Parent archival note: bulky raw JSON probes are committed as lossless `.json.gz` companions. `raw-artifact-inventory.json` binds compressed and decompressed bytes. The original raw files remain untouched locally; decompress the companion to recover the exact report path named above.
