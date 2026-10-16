# PRE-G7-38 — first-use shader info-log fast path

**Result:** The successful-link info-log calls were removed in the single diagnostic capture; long startup and post-entry stalls remain.

- Source commit: `ae0412fb4bfcf81b807ecd492a96cbd773c5005c`
- App tree: `7572fd8d082659251762ddb81416219a37800680`
- Source-commit domain tree: `58721ce1ae7e8c3c84c0b959566c975932871f8c`
- Build ID: `ZU5S4uDGagmUivvV4xDKh`
- BUILD_ID SHA-256: `9a2f517f64d3d460f4d800276ea7a46bb9bb63740c5ea85ca0b77d1b74432240`

## Source correction

The pinned Three.js 0.180.0 dependency is patched through pnpm's patched-dependency mechanism. The patch changes both the package source module and production ESM module. When `renderer.debug.checkShaderErrors` is enabled, it checks `LINK_STATUS` before reading diagnostic logs. Successful links skip program and shader info-log reads and the associated success-log warnings. Failed links retain the existing program, vertex, and fragment diagnostics, custom `onShaderError` callback, default error output, and failure diagnostics. Uniform and attribute cache initialization continues on the successful path.

The patch, `package.json`, and `pnpm-lock.yaml` are byte-identical under `app/` and `yorayriniwnl.in/`. The P38 parity audit reports zero normalized source/test parity failures, zero committed-blob parity failures, and exact byte/blob matches for all three dependency files. The domain URL override remains `https://yorayriniwnl.in`.

## Install and validation record

The first frozen offline install failed after 13.589 seconds because the locked Next.js 16.3.8 tarball was missing from the local store. It reused 401 packages and downloaded none; the command receipt and output are preserved. The packet-authorized frozen online install completed with exit code 0 after 56.219 seconds. Its progress recorded two package identities: `next@16.3.8` at a maximum observed 42,046,250 bytes and `@next/swc-win32-x64-msvc@16.3.8` at 34,863,768 bytes. These are maximum progress counters, not independent wire-byte measurements.

During `pnpm patch-commit`, pnpm reported seven downloads, but the captured partial output did not identify the packages or a final exit code. It also rewrote two unrelated `eslint-plugin-import` peer contexts. Those peer rewrites were restored, only the Three.js patch records were kept, and no further network install was run. The authorized offline frozen install after patching passed in 1.465 seconds with zero fetch-progress events.

| Check | Result | Time |
| --- | --- | ---: |
| Offline frozen install after patch | PASS | 1.465 s |
| Lint | PASS | 106.454 s |
| Typecheck | PASS | 38.459 s |
| Production build | PASS | 60.773 s |

The build used `NEXT_PUBLIC_PRE_G7_13_EVIDENCE=1` and `NEXT_TELEMETRY_DISABLED=1` as required by the existing workflow. The diagnostic server environment cleared the evidence flag. Node 24.19.0 and pnpm 9.15.9 were used. Unit, integration, and end-to-end tests were **NOT RUN**; the full performance suite was **NOT RUN**.

## One instrumented browser capture

The authorized capture ran once against the P38 production build at `/?studio=1` with a 1440×900 viewport, headless Chrome 155.0.8059.84, Playwright 1.63.0, and a 40-second observation window. Navigation returned HTTP 200 and the route reached `HOME` at 7,696.8 ms. The screenshot was captured. WebGL 2 used ANGLE on Intel Iris Xe; `KHR_parallel_shader_compile` was available. All four required/optional GLB responses returned HTTP 200. There were no page errors, failed requests, or instrumentation errors. One generic console message reported a resource 404; it was not localized to a URL. The Next.js server became ready in 353 ms and stderr was empty.

| WebGL method | Calls | Total measured time | Maximum call |
| --- | ---: | ---: | ---: |
| `getProgramInfoLog` | 0 | 0 ms | 0 ms |
| `getShaderInfoLog` | 0 | 0 ms | 0 ms |
| `getProgramParameter` | 457 | 11,730.9 ms | 609.1 ms |
| `getUniformLocation` | 2,814 | 6.5 ms | 0.1 ms |
| `getAttribLocation` | 176 | 0.4 ms | 0.1 ms |

The browser reported 10 long tasks over 40 seconds, totaling 13,471 ms. The three tasks longer than one second were 4,050 ms at 2,651.4 ms, 6,673 ms at 10,747.4 ms, and 1,277 ms at 21,441.7 ms. The second and third tasks occurred after `HOME`. The maximum animation-frame gap was 6,660.9 ms.

The wrappers time each WebGL method by taking `performance.now()` before and after the native call, then updating count and duration fields. Those recorded durations include the wrapper's timing and bookkeeping cost; the capture did not independently measure or subtract that overhead. The results establish that successful info-log reads were absent in this capture. Because the patch moves the `LINK_STATUS` query ahead of those reads, the 11.731 seconds measured in `getProgramParameter` is consistent with the wait shifting to the status query. The wrapper did not record query enums, so it cannot confirm which calls blocked or show an uninstrumented baseline. The capture does not establish an overall startup improvement or pass the full performance gate.

## Evidence and limits

`preflight.json` binds the source commit, app/domain trees, source build ID and hash, remote tip at preflight, offline post-patch install, lint, typecheck, build, and package parity. `diagnostic-run/` contains the single browser result, screenshot, and server logs. The evidence inventory lists the P38 evidence, governing packet history, source/mirror package and patch files, parity inputs, prior diagnostic reports, and domain metadata with byte length, SHA-256, and Git blob ID; it excludes only itself to avoid a self-referential hash.

PRE-G7-38 remains **unaccepted and undeployed**. Independent GPT Plus #2 audit, human visual review against `references/images/main-reference.png`, Parent ruling, and the full performance suite remain pending. No merge, deployment, or domain/DNS change was performed.
