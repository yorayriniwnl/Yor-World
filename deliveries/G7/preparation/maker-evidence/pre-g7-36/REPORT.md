# PRE-G7-36 — PRE-G7-35 runtime diagnostic

**Result:** CAPTURED; residual startup stalls remain
**Source commit:** `5c1e6aedb71d89d46ffc0ada8de522526290131c`
**App tree:** `62a08db251ef15254523bfb08b926ce7c6954ebc`
**Source-commit domain tree:** `89ca7d46f790f062e63fcae2368c24ae557e03ab`
**Reused build:** `YeuUJsHpZHf4H1-GP30nT`
**Build ID SHA-256:** `6a56fa056415b835e05a411dbb273538a5df986b77592004fdfaad30dd2e1d96`

## Capture

The single authorized CPU-profiled capture ran in Chrome `155.0.8059.84`, Node `24.19.0`, and Playwright `1.63.0` against `http://127.0.0.1:3223/?studio=1`. Navigation returned HTTP 200. The route reached `HOME` at 9,266.7 ms. The browser recorded 886 rendered frames during the observation, and the screenshot, Playwright trace, raw CPU profile, and server output were captured. The profiler collected 23,504 samples over 40.974 seconds from 2,878 profile nodes; the clock-offset spread was 1.275 ms.

Required room, avatar, and fixture models all returned HTTP 200. The optional interaction GLB also returned 200 and remained outside the required loading stage. There were no page errors or failed requests. One generic, unlocalized resource 404 console message was recorded.

## Finding

The profile still shows `WorldRuntime.animate` → `WebGLRenderer.render` → `renderBufferDirect` → `WebGLProgram.getUniforms` → minified `P`. The embedded bundle excerpt matches Three.js `0.180.0`'s `WebGLProgram.onFirstUse`, which performs shader diagnostics and initializes uniforms and attributes. Source maps were absent. The exact material/program and `KHR_parallel_shader_compile` availability were not captured.

Three long tasks exceeded one second:

| Start | Duration | Leading sampled `P` self time |
| ---: | ---: | ---: |
| 3,937.5 ms | 5,260 ms | 4,103.65 ms |
| 15,301.2 ms | 9,284 ms | 4,336.76 ms, 3,906.02 ms, and 775.39 ms across the three leading nodes |
| 28,633.7 ms | 1,812 ms | 1,727.91 ms |

The largest frame gap was 9,292.2 ms. The second task started after the page had reached `HOME`, so the page still had a long post-entry main-thread freeze. The largest task and HOME timing were lower than PRE-G7-34's single capture (13,290 ms and 15,997.9 ms respectively), but the same shader first-use path remains. These one-run comparisons are diagnostic; they are not a performance-suite result. PRE-G7-35's `compileAsync` change has not eliminated the shader stall.

## Evidence and limits

`commands/cpu-profile.receipt.json` records the one capture command and exit code 0. `diagnostic-run/` contains the raw profile, analysis, trace, screenshot, diagnostic record, and server logs. `preflight.json` binds the reused build and clean P35 source worktree. `source-delivery-manifest.json` records the result while keeping the candidate unaccepted and undeployed. The evidence inventory lists every packet artifact, report, script, source/mirror metadata file, and governing packet with byte length, SHA-256, and Git blob ID; it excludes only itself.

The initial two harness-generation errors and the read-only analysis-summary path error are preserved under `commands/`. No browser capture was repeated. Tests and the full performance suite were **NOT RUN**. This diagnostic does not pass the performance gate and does not close the independent GPT Plus #2 audit or human visual review.

PRE-G7-31 and PRE-G7-35 remain unaccepted and undeployed. No merge, deployment, or domain/DNS change is authorized.
