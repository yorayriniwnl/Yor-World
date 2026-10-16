# PRE-G7-26 source and evidence report

**Status: source candidate, unaccepted.** The asset-loading correction removes optional network work from the required entry path. The recorded performance run proves the loading stall is gone and exposes a separate test-navigation mismatch. This report does not accept PRE-G7-26, G7, deployment, or production readiness.

## Source identity

| Role | Commit | `app/` tree |
|---|---|---|
| PRE-G7-25 source input | `8ff3c929030c77208d31b937dc800e6ebdd2e6a2` | `385c7e967837e3a4e76e6c92c8dd19900ab99428` |
| PRE-G7-26 candidate | `ffd4635242362774c7981f8d54405fd0ccb2b0c9` | `9895fcc5c09ba695674fc5ff0342f5afb35b3d0c` |

Task branch parent was `e0fd6e9e860f3614a8f5a26336e38765d7da0903`. The candidate changes only `AssetLoader.ts`, `LifecycleManager.ts`, `WorldInteractionBinding.ts`, `WorldRuntime.ts`, and the two related unit tests in `app/`, with matching `yorayriniwnl.in/` copies. `source/source-binding.json` records all changed source and mirror blobs. `source/mirror-parity-audit.json` records the full normalized source/mirror audit.

## Correction

The prior loader awaited two optional texture fetches and the optional interaction GLB before returning three successfully loaded required models. The deskmat and wallpaper textures had no consumers in the current source; the interaction GLB only adds hidden hit proxies. PRE-G7-26 removes those unused texture requests from startup and returns after the required room/avatar/fixture are ready. It then fetches and parses the optional interaction GLB asynchronously after rendering and the binding are initialized.

`WorldInteractionBinding.addInteractionScene()` attaches hit proxies after they arrive and remains idempotent. Production mesh raycasts and DOM controls remain available while they load or if they fail. Runtime teardown aborts the fetch; if parsing finishes after cancellation, the optional GLTF's geometries, materials, and textures are disposed without attaching it to a stale runtime. Asset files and `asset-manifest.json` remain unchanged; their hashes are in `source/asset-hashes.json`.

## Validation

The captured post-commit validation commands used Node 24.19.0 and pnpm 9.15.9. Their stdout, stderr, and receipts are in `commands/`.

| Check | Result | Evidence |
|---|---|---|
| Focused loader and hit-proxy unit tests | PASS, 7/7 | `commands/focused-loader-final.*` |
| Full unit suite | PASS, 337/337 | `commands/unit-final.*` |
| Typecheck | PASS | `commands/typecheck-final.*` |
| Lint | PASS | `commands/lint-final.*` |
| Production build with evidence flag | PASS | `commands/build-final.*` |
| Original performance suite | FAIL, 5/6 | `performance/performance-results.json` and `performance/enter-exit-error-context.md` |

The performance result was first recorded with the system pnpm environment, which reported Node 24.14.0 against the package's `>=24.19.0 <25` engine requirement. This invocation passed all three five-cold-load checks and the 60-second active route: 60 acknowledged actions over 3,605 frames, median frame 16.7 ms, p95 16.9 ms, maximum calls 30, and maximum triangles 14,392. The fourth test no longer stops at 92% with optional loading pending. It reaches the route-exit click and then times out after 180 seconds because it targets `Primary navigation` outside the active `showModal()` dialog; the full-screen canvas in the modal intercepts that click. The dialog contains the accessible `Portfolio destinations and studio exit` navigation with its own Projects link. A new bounded follow-up corrects the test to use that in-dialog link, preserving the modal behavior and all performance assertions.

The structured Playwright report preserves the full run, including 5 passes and the navigation timeout. The large error-context capture is retained unchanged. No test timeout, threshold, retry count, or filter was altered.

## Open gate

PRE-G7-26 is not accepted. The follow-up test-navigation correction is PRE-G7-27. Physical-device and screen-reader sessions, hosted service setup, deployment, independent audit, and parent acceptance are **NOT RUN**. Do not deploy this candidate.
