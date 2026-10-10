# FINISH-C1-R3 runtime correction return

Date: 2026-10-11. This return implements the C1-R3 runtime corrections in an isolated candidate. It is ready for independent GPT #2 audit; it is **not** an acceptance ruling.

## Bound source

- Base commit: `f62a43c5e71c00dcb89e28275ea81d842167db80`
- Base/canonical app tree: `42ea29ec235225046a75959eb19eb386ac2f821d`
- Accepted design output-manifest SHA-256: `8038db147824b0a31de1028c330383352177020b2247dd627d1674d6dc14c6af`
- Production patch: [`source.patch`](source.patch)
- Machine-readable requirement outcomes: [`requirements-matrix.json`](requirements-matrix.json)
- Input and output identities: [`input-hashes.json`](input-hashes.json), [`output-hashes.json`](output-hashes.json)

The delivery returns all 29 allowlisted source and test paths; 28 differ from the base, and `SceneIntegrator.ts` is byte-identical to it. The final isolated check verifies the bound app tree, runs `git apply --check` and `git apply` in a clean copy with `core.autocrlf=false` and `GIT_CEILING_DIRECTORIES` set, then compares all 29 returned files byte-for-byte with `source/`; see [`patch-check-receipt.json`](evidence/patch-check-receipt.json). An earlier verifier inherited Windows `core.autocrlf=true` and converted six files; that failed comparison is retained in [`patch-check-initial-autocrlf.json`](evidence/patch-check-initial-autocrlf.json) and was corrected before this return.

## Corrections and proof

The implementation restores default-compatible version-1 pause preferences and keeps validated document memory if storage access is denied. Pause is applied before runtime presentation, survives retry and route re-entry, and allows finite requested actions to settle while decorative motion remains paused. Real GLB tests verify the resident's coding animation advances, and the production browser check observes its action time advance only after unpausing.

Required progress now reflects all three current essential responses using the same trusted, uncompressed byte representation. Unknown/compressed/contradictory lengths stay indeterminate; EOF checks detect shorter and longer bodies; ArrayBuffer fallback uses its actual byte length. The loading UI omits a numeric ARIA value and percentage when indeterminate. Session generation/token checks fence stale work, each session owns its retry ceiling, and the watchdog resets only for meaningful required progress.

Cancellation invalidates the active session immediately and defers bulk resource disposal so the portfolio can respond without waiting for GPU/bitmap teardown. A real Chromium run measured Continue at **5.1 ms** and confirmed the held request was aborted. A separate held production request reached the watchdog after **15,337 ms**, displayed the timeout reason, and kept Retry 3D and Continue with Portfolio available.

Optional texture results are typed by session and ID, buffered until integration, and replayed only onto the matching scene targets. Installation is transactional and restores the prior material state if a later target fails. Actual browser frame evidence reports `deskmat → desk_mat` and `wallpaper → monitor_screen_center`; the integration suite also tests ID isolation, missing targets, rollback, and LOW/HIGH material state. The shared resource ledger now captures shared and pruned GLTF resources, material maps, ImageBitmaps, and object URLs for idempotent cleanup.

Final local checks:

- `pnpm test:unit`: **26 files, 347 tests passed**.
- Integration suite with `--maxWorkers=1 --no-file-parallelism`: **28 files, 290 tests passed**. The default parallel run exhausted Node worker memory; the failed attempt and successful serial rerun are preserved in [`integration-parallel-oom.json`](evidence/integration-parallel-oom.json).
- `pnpm lint`: passed with zero warnings.
- `pnpm exec tsc --noEmit`: passed.
- `pnpm build`: optimized Next.js 16.3.8 production build passed and generated all routes.
- Production-server Playwright Chromium: **3/3 passed** for indeterminate loading/cancellation, retry/pause/animation/late-texture/quality/navigation recovery, and a genuine watchdog stall. See [`browser-results.json`](evidence/browser-results.json), [`browser-measurements.json`](evidence/browser-measurements.json), and the captured command logs under `evidence/`.

## Remaining gates

The canonical `app/` tree has not been modified. Independent GPT #2 review and the separate Parent acceptance ruling remain required before this overlay can enter a successor assembly. Physical mobile/accessibility-device checks, live-host/CDN behavior, and real graphics-context-loss recovery were not run. Other platform/art work and successor packets remain outside this C1 delivery.
