# PRE-G7-25 source and evidence report

**Status: source candidate, unaccepted.** This report binds the local renderer correction to the pushed source commit and its captured evidence. It does not grant PRE-G7-25, G7, deployment, or production acceptance.

## Source identity

| Role | Commit | `app/` tree |
|---|---|---|
| Accepted PRE-G7-22 input | `500d10fa5901be48d4ff877e608d65ba0e271bb9` | `ba0b709192367e1d12a796618f97801a8fcd5a70` |
| PRE-G7-25 renderer source | `3ad7e1c390cba7073229f008b38211c8e957c9dc` | `202012f7d1ced70f6d5136d53d864288c52e022b` |
| Final source candidate | `8ff3c929030c77208d31b937dc800e6ebdd2e6a2` | `385c7e967837e3a4e76e6c92c8dd19900ab99428` |

The task branch parent was `8dfda048a40349e49082b138ff17e024e944f66b`. Commits `8260a5e4` and `3ad7e1c3` implement and instrument the batching correction. Commits `bf4a4859` and `8ff3c929` correct the renderer mock and performance test navigation setup. A committed tree comparison confirms only `app/tests/unit/world-runtime-recovery.test.ts` and `app/tests/performance/world.spec.ts` changed after the renderer source commit; production runtime code and capture inputs remain at `3ad7e1c3`.

Canonical implementation is in `app/`; corresponding source and test files in `yorayriniwnl.in/` are checked by the generated source mirror audit. The source-delivery manifest records the final candidate, source tree, mirror hashes, intentional canonical URL override, and test support commits. Asset hashes for the required and optional models/textures and asset manifest are in `source/asset-hashes.json`. The 7 loaded assets match app/mirror raw SHA-256 and Git blobs. The text asset manifest has identical Git blobs and normalized content; its raw checkout bytes differ only due to line endings. `source/source-binding.json` records the changed Git blobs, frozen room GLB hash, source tree match, and referenced evidence hashes.

## Renderer and viewport results

The correction preserves the accepted room composition, source objects, authored transforms/materials, interaction sources, and quality tiers. Static batching synchronizes visibility from the original source meshes. The renderer diagnostics count submissions at the renderer reset boundary, separating shadow-map calls from the main pass while reporting inclusive calls and main-pass visible triangles. No renderer policy, geometry, quality threshold, or ceiling was lowered to achieve these readings.

PRE-G7-22's archived `visual-run` source identity resolves to commit `63756c058de7fec92ba9699b327667207fe48488` and app tree `a166d5c01473aec366305bdfaa68d27cf665d0ec`, not the accepted root in its packet. The old 63756-based comparison is preserved under `attempt-02/pixel-parity-obsolete-63756-baseline/` and is not used as parity evidence. A clean capture was made from accepted root commit `500d10fa` at the packet's exact tiers. The temporary counter overlay is limited to reset-boundary metrics; the patch SHA-256 is `0c762543bb14fd4ad6a0e553753d2ba86376f00c3e91e12bb1925e03faeba1fa`, overlay app tree `d8956de409e824bbff1490d1fd8d1564d5e25cda`. All eight original-versus-overlay screenshots are bit-identical, so that measurement-only overlay did not change rendered pixels.

Each row applies to both Chrome and Edge captures. Captures use the same headless browser channels, Intel Iris Xe WebGL renderer, DPR 1, viewport, and quality tier on both sides. The full-resolution capture metadata and raw images are retained in `attempt-02/accepted-root-captures/`, `attempt-02/accepted-root-counter-captures/`, and `attempt-02/quality-captures/`.

| Viewport | Tier | Accepted root shadow + main calls | Candidate shadow + main calls | Visible triangles, root → candidate | Candidate ceiling | Pixel identity |
|---|---|---:|---:|---:|---:|---:|
| 1440×900 | HIGH | 11 + 412 = 423 | 3 + 56 = 59 | 28,736 → 28,736 | 120 calls / 300,000 tris — PASS | 99.98356481% |
| 390×844 | MEDIUM | 11 + 400 = 411 | 3 + 56 = 59 | 28,592 → 28,592 | 80 calls / 140,000 tris — PASS | 99.98602503% |
| 320×600 | MEDIUM | 11 + 414 = 425 | 3 + 56 = 59 | 28,760 → 28,760 | 80 calls / 140,000 tris — PASS | 99.99427083% |
| 844×390 | HIGH | 11 + 414 = 425 | 3 + 56 = 59 | 28,760 → 28,760 | 120 calls / 140,000 tris — PASS | 99.99453153% |

The exact-root comparison is `attempt-02/pixel-parity/accepted-p22-pixel-parity.json`; same-side-by-side images and absolute-difference images are stored beside it. The browser captures are byte-identical between Chrome and Edge for each viewport and tier. Candidate captures pass every unchanged inclusive-call and triangle ceiling. The pixel-level differences are very small and concentrated in rasterized scene pixels; direct side-by-side inspection found no scene-content drift from the accepted input.

## Validation

All local commands used Node 24.19.0 and pnpm 9.15.9. Full command receipts, stdout, and stderr are in `commands/`.

| Check | Result | Source binding / detail |
|---|---|---|
| Focused batching checks | PASS, 50/50 | `focused-final`; source tree `202012f7` |
| Production build with evidence flag | PASS | `build-final`; source tree `202012f7` |
| Composition E2E | PASS, 6/6 | `composition-e2e-final`; source tree `202012f7`; Chrome and Edge desktop/mobile flows pass |
| Full unit suite | PASS, 333/333 | `unit-final-corrected-01`; source commit `bf4a4859`; test mock was corrected to implement renderer `info.reset()` |
| Integration suite, run 1 | PASS, 27 files / 287 tests | `integration-final-01`; source commit `bf4a4859` |
| Integration suite, run 2 | PASS, 27 files / 287 tests | `integration-final-02`; source commit `bf4a4859`; consecutive invocation |
| Typecheck | PASS | `typecheck-final-test-support`; final candidate commit `8ff3c929` |
| Lint | PASS | `lint-final-test-support`; final candidate commit `8ff3c929` |
| Existing performance suite | FAIL, 5/6 | `performance-final-corrected-01`; unchanged config, thresholds, retries, and timeout |

The final performance run passes dynamic payload checks, five cold loads at desktop/mobile/narrow sizes, and the 60-second active interaction route. That route completes all 60 actions across 3,600 frames; median frame time is 16.7 ms, p95 is 16.9 ms, maximum reported render calls are 30, and maximum triangles are 14,392. The four-cycle enter/exit resource test then fails on a later entry: the stage remains `LOADING` instead of reaching `HOME` within its existing 15-second assertion. The captured state is at 92%, with all 3 required assets and 1 of 3 optional assets processed; the failed run is preserved without extending timeouts or changing the assertion. An earlier performance attempt also failed because the Diagnostics/Studio drawer intercepted project navigation; the test setup was corrected in `8ff3c929`, and the remaining loading failure is from the corrected final attempt.

The successful isolated composition E2E includes two generic browser console 404 messages whose request URLs were not captured. They are retained in `attempt-02/composition-e2e/desktop-composition-browser.log` and are unresolved.

Physical-device sessions, screen-reader checks, provider/database setup, production domain operation, deployment, independent audit, and parent acceptance are **NOT RUN**. The complete performance artifacts and preserved first-attempt failures are in `performance/` and `performance-attempt-01-failed/`.

## Gate and follow-up

This is a pushed but **unaccepted source candidate**. A read-only independent reviewer must audit the exact source/evidence commits, source/mirror parity, material/shader equivalence, scene composition, interactions, shadows, batching fallback, and performance evidence. Parent acceptance remains pending. The resource-stability failure must be diagnosed under a separately authorized correction before this candidate can pass the full local performance suite. No deployment was performed.

The source-delivery manifest and binding scripts are in `yorayriniwnl.in/source-delivery-manifest.json`, `runner/update-source-delivery-manifest.mjs`, and `runner/bind-source-evidence.mjs`. `source/evidence-inventory.json` inventories all evidence files except itself and is regenerated after the report and source binding are final.
