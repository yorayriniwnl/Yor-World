# PRE-G7-34 startup CPU attribution

**Result: likely cause identified.** The single profiled capture reproduced the startup stall and placed the dominant sampled work in Three.js shader-program first use during rendering. In the two severe long-task windows, the minified `P` frame mapped by direct source comparison to `WebGLProgram.onFirstUse`; its three top profile nodes account for 12.915 seconds of sampled CPU time in the 13.290-second first task and 12.125 seconds in the 12.347-second second task. The profile does not identify the individual material/program, so the root cause is narrowed to first-use shader program finalization, not to a specific scene object.

PRE-G7-31 remains unaccepted and undeployed. PRE-G7-34 made no product, test, asset, dependency, threshold, timeout, or quality-policy changes. The capture is diagnostic and includes profiler overhead; it is not a performance-gate result. External GPT Plus #2 audit and human visual review remain pending.

## Source and build binding

| Item | Value |
|---|---|
| Packet | `docs/planning/reconciliation-packets/2026-10-16-pre-g7-34-startup-cpu-attribution.md` |
| Packet commit | `f2e0ce0995b8ba09e6502f65808a6b7788b36c00` |
| Packet branch base | `95e6dc912adff1cecb14bc1993d6620bcce696df` (PRE-G7-33 evidence) |
| Frozen PRE-G7-31 source | `bd01478617b4166866f3f44196c56fc5add94acd` |
| Source `app/` tree | `3975e40c59a04b8696efa2ca3605eb37a0617165` |
| Source-commit domain tree | `8c34adf791c678a4e9e8bfe90f92426026994e68` |
| Inherited candidate domain tree | `8b276ca90142c4c7ed7f8674668677a5d167891a` |
| Reused build | PRE-G7-33 build in `D:\p33\app`, ID `ksG7LoWL4qW1WtybQH4gz` |
| Reused `BUILD_ID` SHA-256 | `c09ccc6e505742ebb0f3fb6e8126e96296e209b46bc05ea584e56a0ea4baa138` |
| Node / pnpm | `v24.19.0` / `9.15.9` |
| Browser / Playwright | Headless Chrome `155.0.8059.84` / `1.63.0` |

The inherited candidate domain tree differs from the frozen source-commit domain tree only in PRE-G7-32's mirrored `README.md` and `source-delivery-manifest.json` status update. PRE-G7-33's source/mirror preflight records 130 canonical/domain source and test pairs with zero Git-blob mismatches. PRE-G7-34 independently verified the frozen app/source-mirror trees, inherited candidate trees, clean P33 worktree, P33 build receipt, build ID, and pinned toolchain. No package installation or rebuild was performed.

## Checks

| Check | Result | Command / exit | Evidence |
|---|---|---|---|
| Initial P34 preflight attempt | FAIL, preserved | `node deliveries/G7/preparation/maker-evidence/pre-g7-34/preflight.mjs` / 1 | `preflight-attempt-01.json`, `commands/preflight-attempt-01.receipt.json`, and `commands/preflight-attempt-01.stdout.txt`; the first harness incorrectly expected the inherited mirror tree to equal the source-commit mirror tree. No install, build, or browser capture ran. |
| Corrected frozen-source/build preflight | PASS | `node deliveries/G7/preparation/maker-evidence/pre-g7-34/preflight.mjs` / 0 | `preflight.json`, `commands/preflight.receipt.json`, `commands/preflight.stdout.txt`, and `commands/preflight.stderr.txt`; all 11 checks pass, including the P33 build ID and clean worktrees. |
| Packet script syntax | PASS | Four pinned-Node `node --check` invocations / 0 | `commands/script-syntax-check.json`; preflight, capture, runner, and inventory scripts parsed successfully. |
| One source-bound CPU-profile capture | PASS, capture complete | `node deliveries/G7/preparation/maker-evidence/pre-g7-34/capture-startup-cpu-profile.mjs` via `run-cpu-profile-capture.mjs` / 0 | `commands/cpu-profile.receipt.json`, captured stdout/stderr, `diagnostic-run/startup-cpu-profile-diagnostic.json`, raw profile, trace, screenshot, and server output. No retry. |
| Unit, integration, E2E, and performance suites | NOT RUN | Prohibited by this diagnosis-only packet. | No suite result or performance pass is claimed. |
| Application source, tests, assets, and dependencies | UNCHANGED | Read-only packet | Frozen source tree is `3975e40c59a04b8696efa2ca3605eb37a0617165`; no code delta. |

The preflight harness correction is limited to distinguishing the frozen source mirror from the inherited P32 candidate mirror. The failed attempt is retained instead of overwritten. The corrected packet commit and exact P33 build were in place before the one browser capture.

## Capture and profile findings

The 40-second observation ran once at `http://127.0.0.1:3222/?studio=1`. Navigation returned HTTP 200 in 457 ms. The browser reached `HOME` at 15,997.9 ms after `performance.timeOrigin`; the CPU profiler ran for 40.944 seconds at a 1,000-microsecond sampling interval and returned 24,300 samples across 2,925 profile nodes. Its clock calibration spread was 3.813 ms. Chrome's sampling profiler changes timing, so these durations are useful only for identifying the hot path.

| Long task | Browser interval | Samples in interval | Top `P` frame samples | Interpretation |
|---|---:|---:|---:|---|
| First | 2,538.6–15,828.6 ms (13,290 ms) | 8,122 | 12,915 ms sampled across its three top nodes | Blocks the transition from `LOADING` to `ENTRANCE`; `ENTRANCE` appears 9.5 ms after the task ends. |
| Second | 21,927.6–34,274.6 ms (12,347 ms) | 7,398 | 12,125 ms sampled across its three top nodes | Occurs after `HOME` at 15,997.9 ms; the same shader-program path is reused. |
| Third | 38,315.7–40,233.7 ms (1,918 ms) | 1,204 | 1,853 ms in the top node | Further work on the same path near the end of observation. |

Across the two severe tasks, the stack is `WorldRuntime.animate` → Three.js `WebGLRenderer.render` → `renderBufferDirect` → `WebGLProgram.getUniforms` → minified `P`. The production chunk has no source map. `startup-cpu-profile-analysis.json` preserves the minified source excerpt; it matches the local locked Three.js `0.180.0` implementation of `WebGLProgram.onFirstUse` in `node_modules/three/src/renderers/webgl/WebGLProgram.js`. That function checks shader/program logs and link status when `renderer.debug.checkShaderErrors` is enabled (the Three.js default), then initializes uniform and attribute bindings. This source mapping is a direct code comparison, not a source-map result. The exact material/program responsible remains unidentified.

The severe task begins as the first renderer frames are being prepared. All three required model requests had completed with HTTP 200; the optional interaction GLB completed in 31.7 ms. Its request spans 2,508.5–2,540.2 ms, while the first long task starts at 2,538.6 ms. The profile's dominant stack is the renderer's shader-program first-use path, so the overlap with the optional request does not support GLB parsing as the cause. The second severe task carries the same stack after HOME, consistent with additional program first use as the scene renders. The capture recorded 15 long tasks, a maximum animation-frame gap of 13,788.5 ms, no page errors, and one generic unlocalized 404 console message. The 404 did not match any of the recorded model responses.

**Diagnosis:** Three.js shader-program first-use work in `WebGLProgram.onFirstUse` is the likely cause of the recurring long tasks. The profile narrows the blocking code path but cannot identify each affected material or confirm whether `KHR_parallel_shader_compile` is available in this Chrome renderer. A separate correction packet should precompile the initial scene and late optional proxies with Three.js `compileAsync`, preserve shader diagnostics, and verify the unsupported-extension fallback. Do not edit Three.js internals or disable shader error checks based on this capture.

## Evidence and gate status

The raw 24,300-sample profile is `diagnostic-run/startup-cpu-profile.json`; the aligned interval/frame analysis and source excerpts are `diagnostic-run/startup-cpu-profile-analysis.json`. The lifecycle/resource/error capture is `diagnostic-run/startup-cpu-profile-diagnostic.json`; the screenshot, Playwright trace, and server output sit beside those files. The previous P33 build receipt is referenced from the P34 preflight and was not copied or changed. `evidence-inventory.json` lists every P34 evidence file other than itself and the governing packet/delegation index by repository-relative path, byte length, raw SHA-256, and Git blob ID.

| Gate | Status |
|---|---|
| PRE-G7-34 CPU attribution | Complete; shader-program first use is the likely cause |
| PRE-G7-31 candidate acceptance | Pending; candidate remains unaccepted |
| External GPT Plus #2 audit | NOT RUN |
| Human visual review against main reference | NOT RUN |
| Merge, deployment, domain operation, and G7 completion | NOT RUN / not authorized by this packet |
