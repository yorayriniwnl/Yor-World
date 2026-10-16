# PRE-G7-39 — program-parameter query attribution

**Result:** The P38 synchronous wait is attributed to `LINK_STATUS` queries in this capture. The production startup issue remains unresolved.

- Frozen source commit: `ae0412fb4bfcf81b807ecd492a96cbd773c5005c`
- App tree: `7572fd8d082659251762ddb81416219a37800680`
- Source-commit domain tree: `58721ce1ae7e8c3c84c0b959566c975932871f8c`
- P38 candidate domain tree at the evidence commit: `08e17ce6b032088101884db718de7ce3a60d5d06`
- Build ID: `ZU5S4uDGagmUivvV4xDKh`
- BUILD_ID SHA-256: `9a2f517f64d3d460f4d800276ea7a46bb9bb63740c5ea85ca0b77d1b74432240`

## Preflight

The first preflight attempt is preserved at `commands/preflight-attempt-01.json`. It returned FAIL before any browser capture: its check compared the current domain folder tree with the earlier P38 source-commit tree, although P38's evidence commit had since updated `yorayriniwnl.in/README.md` and `source-delivery-manifest.json`. A separate success-path comparison also treated `execFileSync`'s null return with ignored stdio as failure. The corrected preflight compares the source-commit domain tree and the P38 evidence-commit domain tree separately and records success when the no-diff command exits normally. The corrected preflight passed before the capture.

No P39 product source was changed. The P38 app and domain package files remained byte-identical, and the pinned Node/pnpm versions, source trees, and frozen build ID/hash matched the packet.

## One instrumented browser capture

The packet's single capture ran against the frozen P38 production build at `/?studio=1` with a 1440×900 viewport, headless Chrome 155.0.8059.84, Playwright 1.63.0, Node 24.19.0, pnpm 9.15.9, and a 40-second observation window. It used a separate local port, 3226. Navigation returned HTTP 200 in 228 ms; the route reached `HOME` at 7,334.4 ms. The screenshot was captured. WebGL 2 ran on ANGLE / Intel Iris Xe, with `KHR_parallel_shader_compile` available. All four required/optional GLBs returned HTTP 200. There were no page errors, failed requests, or instrumentation errors. One generic console resource 404 was recorded without a URL. The Next.js server was ready in 322 ms and stderr was empty.

| WebGL method | Calls | Total measured time | Maximum call |
| --- | ---: | ---: | ---: |
| `getProgramInfoLog` | 0 | 0 ms | 0 ms |
| `getShaderInfoLog` | 0 | 0 ms | 0 ms |
| `getProgramParameter` | 354 | 14,014.9 ms | 758.6 ms |
| `getUniformLocation` | 2,814 | 8.2 ms | 0.1 ms |
| `getAttribLocation` | 176 | 0.3 ms | 0.1 ms |

The wrapper recorded `getProgramParameter`'s numeric `pname`, resolved enum name, per-enum counts and timings, and timestamps for calls at least 50 ms:

| `pname` enum | Numeric value | Calls | Total measured time | Maximum call |
| --- | ---: | ---: | ---: | ---: |
| `LINK_STATUS` | 35714 | 60 | 14,012.0 ms | 758.6 ms |
| `COMPLETION_STATUS_KHR` | 37297 | 174 | 1.9 ms | 0.7 ms |
| `ACTIVE_UNIFORMS` | 35718 | 60 | 0.6 ms | 0.2 ms |
| `ACTIVE_ATTRIBUTES` | 35721 | 60 | 0.4 ms | 0.3 ms |

`LINK_STATUS` accounts for 99.98% of the measured `getProgramParameter` time in this run. The remaining parameter queries together took 2.9 ms. Sixteen long tasks accumulated 16,157 ms. The three tasks longer than one second lasted 3,943 ms from 2,296.7 ms, 8,964 ms from 10,319.2 ms, and 1,441 ms from 23,339.8 ms. The maximum animation-frame gap was 8,975.9 ms.

This capture directly attributes the measured query time to the `LINK_STATUS` enum. Combined with P37's 60 slow info-log reads, P38's zero info-log reads, and P39's 60 slow link-status reads, the evidence supports that the P38 fast path moved the synchronization wait from info-log reads to the status query. The KHR completion-status polls were inexpensive, but they do not report link success/failure. Khronos describes `COMPLETION_STATUS_KHR` as the non-blocking completion poll; Three.js exposes `renderer.debug.checkShaderErrors`, which defaults to enabled and its docs say may be disabled in production for performance. [KHR extension specification](https://registry.khronos.org/webgl/extensions/KHR_parallel_shader_compile/), [Three.js WebGLRenderer docs](https://threejs.org/docs/pages/WebGLRenderer).

The enum lookup happens before the timed native call; timing uses `performance.now()` immediately around each method. The timing calls are included in the measured durations, while per-call bookkeeping runs after the end timestamp. Wrapper overhead was not independently calibrated. This is one instrumented capture, so no general hardware guarantee or full performance pass is claimed.

## Evidence and limits

`commands/webgl-probe.receipt.json` records the one invocation and exit code 0. `diagnostic-run/` contains the complete JSON, screenshot, and server stdout/stderr. The evidence inventory lists every P39 artifact and the governing P38/P37 reports, source/build bindings, mirrored dependency files, runtime source context, and domain metadata with byte length, SHA-256, and Git blob ID; it excludes only itself.

P39 changed no application code, tests, assets, dependencies, or build. Tests and the full performance suite were **NOT RUN**. P38 remains unaccepted and undeployed. Independent audit, human visual review against `references/images/main-reference.png`, Parent ruling, and the full performance suite remain pending. No merge or deployment is authorized.
