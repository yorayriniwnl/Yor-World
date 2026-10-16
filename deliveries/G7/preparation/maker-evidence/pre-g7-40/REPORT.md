# PRE-G7-40 — production shader-diagnostics gate

**Result:** The production diagnostics change did not clear the long tasks. The blocking time moved from `LINK_STATUS` to `ACTIVE_UNIFORMS`.

- Source commit: `4c3908b61d728babeaf67419d225c1f3978bb779`
- App tree: `c0ba382dae8bd05f0cee339e40f98a24db40347d`
- Source-commit domain tree: `e9861f48ed2fdf96e7cf7f3dd495679d958f30e6`
- Build ID: `FX_IbnDTG8Oe7r-ftVmDq`
- BUILD_ID SHA-256: `b6100686bbdc641413e41f9ce8610745885dc6af8c645e36c39df63118cc86c4`

## Source correction and explicit behavior

P40 sets `renderer.debug.checkShaderErrors` before material first use. Development builds keep it enabled. Production builds turn it off unless the URL contains the exact `shaderDiagnostics=1` parameter. The P38 Three.js patch remains installed and keeps the full failed-link diagnostics path when the flag is enabled.

This production setting was an explicit P40 policy change after P39 measured 14.012 seconds in `LINK_STATUS` queries. The setting did not improve the capture, so the performance reason for the production opt-out is not supported by these results. The opt-in path was inspected in code but was not separately captured under the one-capture limit.

The P40 parity audit passed across 116 source files, 14 test files, and the three mirrored dependency files. It reports zero normalized source/test failures and zero committed Git-blob mismatches. `WorldRuntime.ts` has matching source/mirror Git blobs. The domain URL override remains unchanged.

## Validation

Node 24.19.0 and pnpm 9.15.9 were used. The P38 patch and lockfile were unchanged, so P40 did not install dependencies.

| Check | Result | Time |
| --- | --- | ---: |
| Lint | PASS | 49.272 s |
| Typecheck | PASS | 21.715 s |
| Production build | PASS | 19.077 s |
| Source/mirror parity | PASS | 116 source + 14 test files and 3 dependency files |

The build used `NEXT_PUBLIC_PRE_G7_13_EVIDENCE=1` and `NEXT_TELEMETRY_DISABLED=1` as required by the existing workflow. The diagnostic server cleared the evidence flag. Unit, integration, and end-to-end tests were **NOT RUN**; the full performance suite was **NOT RUN**.

## One instrumented browser capture

The authorized capture ran once against the P40 production build at `/?studio=1`, without the `shaderDiagnostics=1` opt-in. It used a 1440×900 viewport, headless Chrome 155.0.8059.84, Playwright 1.63.0, Node 24.19.0, pnpm 9.15.9, and a 40-second observation window. Navigation returned HTTP 200 in 184 ms; the route reached `HOME` at 8,050.5 ms. The screenshot was captured. WebGL 2 used ANGLE on Intel Iris Xe, with `KHR_parallel_shader_compile` available. All four required/optional GLBs returned HTTP 200. There were no page errors, failed requests, or instrumentation errors. One generic console message reported a resource 404 without a URL. The server was ready in 238 ms and stderr was empty.

| WebGL method | Calls | Total measured time | Maximum call |
| --- | ---: | ---: | ---: |
| `getProgramInfoLog` | 0 | 0 ms | 0 ms |
| `getShaderInfoLog` | 0 | 0 ms | 0 ms |
| `getProgramParameter` | 646 | 11,709.0 ms | 475.8 ms |
| `getUniformLocation` | 2,814 | 7.8 ms | 0.2 ms |
| `getAttribLocation` | 176 | 0.5 ms | 0.1 ms |

The argument-aware `getProgramParameter` wrapper recorded:

| `pname` enum | Numeric value | Calls | Total measured time | Maximum call |
| --- | ---: | ---: | ---: | ---: |
| `ACTIVE_UNIFORMS` | 35718 | 60 | 11,706.3 ms | 475.8 ms |
| `COMPLETION_STATUS_KHR` | 37297 | 526 | 2.4 ms | 0.1 ms |
| `ACTIVE_ATTRIBUTES` | 35721 | 60 | 0.3 ms | 0.1 ms |
| `LINK_STATUS` | 35714 | 0 | 0 ms | 0 ms |

Fourteen long tasks accumulated 13,566 ms. The three tasks longer than one second were 3,749 ms from 3,008.1 ms, 6,871 ms from 10,815 ms, and 1,384 ms from 21,717.6 ms. The maximum animation-frame gap was 6,876.9 ms.

PRE-G7-39 measured the same 60-program pattern with the diagnostics check enabled: `LINK_STATUS` queries took 14,012 ms while `ACTIVE_UNIFORMS` queries took 0.6 ms. In P40, with the automatic link check disabled, `LINK_STATUS` took no time and `ACTIVE_UNIFORMS` took 11,706.3 ms. This supports that the first synchronous program-introspection query triggers the wait on the sampled renderer; disabling automatic shader checks moves the wait and does not solve it. It also shows the production diagnostics opt-out gains no measured responsiveness in this capture. `COMPLETION_STATUS_KHR` polling remained inexpensive.

The wrapper reads the enum before timing the native call and takes `performance.now()` immediately before and after it. Those timing calls are included; per-call aggregation runs after the end timestamp. Wrapper overhead was not independently calibrated. This is one instrumented capture, not a full performance pass or a claim about every device.

## Evidence and limits

`preflight.json` binds the pushed source commit, source/app/domain trees, build ID/hash, remote source tip, package parity, runtime Git-blob parity, and successful lint/typecheck/build. `diagnostic-run/` contains the complete diagnostic JSON, screenshot, and server logs. The evidence inventory lists the P40 artifacts, governing packet history, P38/P39 evidence, source/build bindings, mirrored dependency files, runtime source, and domain metadata with byte length, SHA-256, and Git blob ID; it excludes only itself to avoid a self-referential hash.

P40 remains **unaccepted and undeployed**. The production-default diagnostics gate did not improve startup and is scheduled for reversal in a follow-up packet. Independent audit, human visual review against `references/images/main-reference.png`, Parent ruling, and the full performance suite remain pending. No merge, deployment, or domain/DNS change was performed.
