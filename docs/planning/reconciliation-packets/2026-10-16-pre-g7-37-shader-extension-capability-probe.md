# PRE-G7-37 — identify WebGL shader first-use capability and cost

- **Date:** 2026-10-16 (Asia/Calcutta)
- **Authority:** Parent Codex, continuing the user's full-site repair authorization and explicit GitHub-push request
- **Status:** Authorized, bounded source-bound WebGL capability diagnosis
- **Branch:** `codex/pre-g7-37-shader-extension-capability-probe-20261016`
- **Branch parent:** `8c34561352f21be6cea347682013c157293ba600` (PRE-G7-36 evidence)
- **Frozen source commit:** `5c1e6aedb71d89d46ffc0ada8de522526290131c`
- **Frozen app tree:** `62a08db251ef15254523bfb08b926ce7c6954ebc`
- **Source-commit domain tree:** `89ca7d46f790f062e63fcae2368c24ae557e03ab`
- **Inherited candidate domain tree:** `1310ab56ca105b28fe3fb10957bfe5875085b7fd`
- **Reused build:** PRE-G7-35 production artifact in `D:\p35\app`, build ID `YeuUJsHpZHf4H1-GP30nT`, `BUILD_ID` SHA-256 `6a56fa056415b835e05a411dbb273538a5df986b77592004fdfaad30dd2e1d96`
- **Output owner:** `deliveries/G7/preparation/maker-evidence/pre-g7-37/`
- **Boundary:** One instrumented browser capability diagnostic. No app or test source, model, install, build, test suite, performance suite, acceptance, merge, deployment, or domain/DNS change.

## Why this packet exists

PRE-G7-36 reached `HOME` at 9,266.7 ms on the exact PRE-G7-35 build, but recorded 5.260-, 9.284-, and 1.812-second main-thread tasks. Its sampled stack again ended at Three.js `WebGLProgram.getUniforms` → `onFirstUse`. The capture did not record whether `KHR_parallel_shader_compile` was available or how much time the synchronous shader-log and uniform/attribute queries consumed.

Three.js 0.180.0's `compileAsync` waits on `KHR_parallel_shader_compile` when the extension exists. Without it, program readiness can be reported before driver compilation has finished, and first use can stall. The next step is one read-only probe on the same Chrome/browser environment to measure extension availability and the WebGL calls made during initial startup.

## Authorized work

1. Confirm the P37 worktree is at this packet's parent, P36 evidence commit `8c34561352f21be6cea347682013c157293ba600` is pushed, the P35 source/app/domain trees match the frozen values, the P35 tracked worktree is clean, and the existing build ID/SHA match. Use Node `24.19.0`, pnpm `9.15.9`, Playwright `1.63.0`, and Chrome `155.0.8059.84`. Do not install or rebuild.
2. Use one P37-owned diagnostic script and start the existing server read-only from `D:\p35\app` on `127.0.0.1:3224`. Keep `NEXT_PUBLIC_PRE_G7_13_EVIDENCE` cleared in the server environment.
3. Before navigation, wrap the WebGL prototype methods `getProgramInfoLog`, `getShaderInfoLog`, `getProgramParameter`, `getUniformLocation`, and `getAttribLocation` with transparent call counters and elapsed-time measurements. The wrappers must call the original method with the same receiver and arguments, return its exact result, and rethrow the same error. Record `KHR_parallel_shader_compile` and `WEBGL_debug_renderer_info` availability from the already-created context, the WebGL version, and renderer name. Preserve the standard shader diagnostics.
4. Navigate headless Chrome at 1440×900 to `http://127.0.0.1:3224/?studio=1` once. Observe the route for 40 seconds and record lifecycle/loading state, long tasks, frame gaps, page/console errors, required/optional model request timing, wrapper call counts/totals/maxima, final screenshot, server logs, and actual runtime/browser versions. The method wrappers add measurement overhead; state this in the report.
5. Run the probe exactly once. Do not retry or repeat if the route stalls, a call is slow, an output times out, or capability inspection fails. Preserve every outcome. Do not change the P35 source or build. Use the result to identify whether extension support or first-use GL calls explain the residual stall; if source work is needed, prepare a separate bounded correction packet.

Only this packet, its narrow delegation-index entry, and `deliveries/G7/preparation/maker-evidence/pre-g7-37/` are owned. A later evidence commit may update the domain README and manifest with the probe while keeping PRE-G7-35 explicitly unaccepted and undeployed. Do not change app/mirror application code, tests, assets, budgets, assertions, retries, timeouts, browser configuration, or the reused build.

Do not run unit, integration, e2e, or full performance suites under this packet. Do not perform external acceptance, merge, deployment, domain/DNS operations, or G7 completion.

## Evidence and exit boundary

Commit and push the packet/index before the probe. Push the report and evidence in a separate commit. Bind the single capture to source commit `5c1e6aedb71d89d46ffc0ada8de522526290131c`, app tree `62a08db251ef15254523bfb08b926ce7c6954ebc`, source-commit domain tree `89ca7d46f790f062e63fcae2368c24ae557e03ab`, inherited domain tree `1310ab56ca105b28fe3fb10957bfe5875085b7fd`, build ID and SHA above, runtime/browser versions, command receipt, instrumented results, screenshot, server output, report, and strict SHA-256/byte-length/Git-blob inventory. Record tests and the full performance suite as **NOT RUN**.

PRE-G7-31 and PRE-G7-35 remain unaccepted and undeployed. This packet does not close the independent GPT Plus #2 audit or human visual review and does not authorize merge or deployment.
