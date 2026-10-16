# PRE-G7-37 — WebGL shader capability probe

**Result:** CAPTURED; the parallel compile extension is available, but synchronous first-use program-log calls still coincide with long startup stalls
**Frozen source commit:** 5c1e6aedb71d89d46ffc0ada8de522526290131c
**App tree:** 62a08db251ef15254523bfb08b926ce7c6954ebc
**Source-commit domain tree:** 89ca7d46f790f062e63fcae2368c24ae557e03ab
**Inherited domain tree at P36:** 1310ab56ca105b28fe3fb10957bfe5875085b7fd
**Reused build:** YeuUJsHpZHf4H1-GP30nT
**Build ID SHA-256:** 6a56fa056415b835e05a411dbb273538a5df986b77592004fdfaad30dd2e1d96

## Capture

The one authorized probe ran once against the frozen PRE-G7-35 production build in D:\p35\app, at http://127.0.0.1:3224/?studio=1. It used headless Chrome 155.0.8059.84, Node 24.19.0, pnpm 9.15.9, and Playwright 1.63.0, with a 1440×900 viewport and a 40-second observation window. Navigation returned HTTP 200; the route reached HOME at 9,841.3 ms. The final screenshot was captured.

All three required GLBs and the optional interaction GLB returned HTTP 200. There were no page errors or failed requests. One generic, unlocalized console resource 404 was recorded. The Next.js 16.3.8 server reported ready in 670 ms; its stderr was empty.

## Finding

The context was WebGL 2 on ANGLE / Intel Iris Xe. Both KHR_parallel_shader_compile and WEBGL_debug_renderer_info were available. This rules out missing parallel-compile extension support as the explanation for this capture's stalls.

The wrappers recorded these calls during the observation:

| WebGL method | Calls | Total time | Maximum call |
| --- | ---: | ---: | ---: |
| getProgramInfoLog | 60 | 15,441.8 ms | 713.2 ms |
| getShaderInfoLog | 120 | 49.0 ms | 4.6 ms |
| getProgramParameter | 326 | 26.6 ms | 2.0 ms |
| getUniformLocation | 2,814 | 9.7 ms | 0.4 ms |
| getAttribLocation | 176 | 0.8 ms | 0.1 ms |

There were 21 long tasks over the observation; their accumulated duration was 19,179 ms. The largest tasks were 5,716 ms from 4,075.2–9,791.2 ms, 8,528 ms from 13,817–22,345 ms, and 1,664 ms from 26,393.8–28,057.8 ms. The maximum animation-frame gap was 8,525.7 ms. The second and third large tasks occurred after HOME.

Three.js 0.180.0 source shows WebGLProgram.onFirstUse retrieving the program and shader info logs when renderer.debug.checkShaderErrors is enabled, before it builds the uniform and attribute caches. P36's CPU profile identified this same first-use path. In this capture, the getProgramInfoLog calls consumed 15.44 seconds in aggregate, while uniform and attribute location queries consumed 10.5 ms combined. The first two large long tasks overlap multiple measured slow-call intervals. This makes program-info-log retrieval the leading measured cost and a strong candidate for the freezes; the single instrumented capture does not isolate native-call time from wrapper overhead or prove per-call causation.

The extension is available, yet PRE-G7-35's compileAsync prewarm has not prevented these stalls. A separate source-correction packet is needed to reduce the synchronous first-use cost while preserving shader failure diagnostics. The wrapper overhead is part of this diagnostic and limits direct timing comparisons with uninstrumented captures.

## Evidence and limits

commands/webgl-probe.receipt.json records the single invocation and exit code 0. diagnostic-run/ contains the complete diagnostic JSON, final screenshot, and server stdout/stderr. preflight.json binds the frozen build and worktrees. The evidence inventory lists every P37 artifact, this report, the P37/P36/P35 packets and reports, the delegation index, build receipts, source/mirror runtime files, and domain metadata with byte length, SHA-256, and Git blob ID; the inventory excludes only itself.

No install, build, test suite, or full performance suite was run for P37. All are NOT RUN. P35 remains unaccepted and undeployed. Independent audit, human visual review against references/images/main-reference.png, and Parent ruling remain pending. No application source, test, asset, build, acceptance, merge, deployment, or domain/DNS state changed under P37.
