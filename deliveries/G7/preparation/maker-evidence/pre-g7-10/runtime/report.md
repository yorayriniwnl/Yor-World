# PRE-G7-10 local Codex maker report

Date: 2026-10-14. This is implementation and evidence from the local Codex maker. It is not a Gemini #3 return, independent audit, Parent acceptance, G7 acceptance, or deployment.

## Source identities

- Accepted RC6-R1 source: commit `8e5b954e147a87e36a6869d9940c40f3d4c123f0`, app tree `42ea29ec235225046a75959eb19eb386ac2f821d`.
- Clean maker branch base: commit `f6a8df58095807b09004c2f0ab8a2382c3971e80`, app tree `42ea29ec235225046a75959eb19eb386ac2f821d`.
- Implementation result: commit `95729282af3d84b4e3158158546643935e737b7a`, app tree `e53f3ea9c6c80f471832e46d548206105699c32b`.
- The accepted and maker-base app trees match exactly. The result app tree adds only the assigned runtime and recovery-test changes.
- Fresh accepted-source reproduction checkout: `C:\Users\ayush\AppData\Local\Temp\pre-g7-10-rc6-baseline`, HEAD `8e5b954e147a87e36a6869d9940c40f3d4c123f0`, app tree `42ea29ec235225046a75959eb19eb386ac2f821d`.
- Runtime and test diff: `source-diff.patch`. Git path checks before the implementation commit showed only `app/src/features/world/WorldRuntime.ts` and `app/tests/unit/world-runtime-recovery.test.ts` staged. No app dependency or configuration changes were made.

The earlier unexplained `pre-g7-10-runtime-local-codex` worktree diff was not used. Its origin remains unknown. The current result was implemented independently on the clean `C:\g7c` worktree.

## Change summary

`WorldRuntime.dispose()` now disposes renderer resources without immediately force-losing a canvas context that remains connected during React Strict Mode effect replay. It queues a detached-canvas check and releases the context after the real removal. Final teardown still cancels animation, aborts outstanding initialization, removes listeners, disposes the renderer, and releases detached context.

The recovery tests now use a stateful renderer/canvas mock. They verify connected shared-canvas setup → cleanup → setup, detached teardown cleanup, context-loss fallback/recovery, and renderer-creation failure fallback/recovery on a replacement canvas.

## Runtime versions

- Node.js `v24.19.0`
- pnpm `9.15.9`
- Next.js `16.3.8`
- Vitest `5.0.2`
- Playwright `1.63.0`
- Chromium `153.0.8010.12` from the installed `chromium-1243` executable
- Production WebGL GPU: Intel Iris Xe Graphics through ANGLE / Direct3D 11. The SwiftShader diagnostic was not used for the final real-loss run because its `WEBGL_lose_context` availability varied.

## Commands and outcomes

All maker commands ran from `C:\g7c\app` using Node 24.19.0 and Corepack `pnpm@9.15.9`, unless the command used the accepted baseline checkout or the evidence browser script.

| Command | Result |
| --- | --- |
| `pnpm install --frozen-lockfile` | PASS, exit 0 (`02-maker-install.log`) |
| `pnpm exec vitest run --config vitest.config.ts tests/unit/world-runtime-recovery.test.ts` | PASS, 13/13 tests (`03-focused-test.log`) |
| `pnpm lint` | PASS, exit 0 (`04-lint.log`) |
| `pnpm typecheck` | PASS, exit 0 (`05-typecheck.log`) |
| `pnpm test:unit` | FAIL twice at the repository default 5-second timeout for the existing `tests/unit/boundaries.test.ts` case; that case took about 7.17 seconds. Each run otherwise passed 315/316 tests (`06-unit-tests.log`, `06-unit-tests-retry.log`). |
| `pnpm exec vitest run --config vitest.config.ts --testTimeout 15000` | PASS, 23/23 files and 316/316 tests (`07-unit-tests-15s.log`) |
| `pnpm test:integration` | PASS, 27/27 files and 286/286 tests (`08-integration-tests.log`) |
| `pnpm build` | PASS, exit 0; Next production compilation, TypeScript, and static page generation completed (`09-build.log`) |

The full unit suite passed with a 15-second per-test timeout override. The default command's timeout failure is retained above and in its raw logs.

## Baseline development reproduction

The accepted clean checkout ran `pnpm dev --port 3190` with a fresh Playwright browser context and Chromium 153.0.8010.12. The clean profile used no persistent browser data or extensions. After opening the studio disclosure and entering the studio, the baseline logged `WebGL context creation failed: Cannot read properties of null (reading 'precision')`; the stack contains React's `doubleInvokeEffectsInDEV` / `reconnectPassiveEffects`. It then showed the accessible fallback, removed the canvas, and rendered zero canvas frames. No hydration mismatch appeared in the recorded run.

Evidence: `01-baseline-dev-repro.json`, `01-baseline-dev-repro.png`, `01-baseline-dev-server.log`, and the reproducible `baseline-dev-repro.mjs`. The baseline dependency installation used Node 24.19.0 and pnpm 9.15.9 (`00-baseline-install-node24.19.log`).

## Production browser evidence

The production server ran the result build at `http://127.0.0.1:3200` (`10-production-server.log`). Each browser run used a new Playwright context without a persistent profile or extensions.

1. **Supported WebGL render, real context loss, fallback, and recovery — PASS.** Chromium 153.0.8010.12 used `--enable-webgl --ignore-gpu-blocklist` and Intel Iris Xe / ANGLE D3D11. The production canvas reached HOME and rendered frames. The browser's `WEBGL_lose_context.loseContext()` produced a trusted (`isTrusted: true`) `webglcontextlost` event. The original context reported lost, the runtime showed `WebGL graphics context was lost.`, and the accessible fallback appeared. Retry detached the old canvas, cleared fallback, returned to HOME, and rendered 206 frames on one replacement canvas with a live WebGL context. There was no WebGL context-creation exception in the supported initial render. Evidence: `10-production-context-loss-recovery.json`, `10-production-render-before-loss.png`, `11-production-context-loss-fallback.png`, `12-production-context-loss-recovered.png`, `production-context-loss-recovery.mjs`, and `11-production-browser.log`.
2. **Actual WebGL creation unavailability — PASS for fallback.** A fresh Chromium context launched with `--disable-webgl` had no WebGL 1 or 2 context. The production route returned HTTP 200 and showed the accessible fallback with `WebGL context creation failed: Error creating WebGL context.` Retry preserved the fallback and no canvas. Playwright recorded zero uncaught page errors. A separate fresh enabled Intel/ANGLE context then reached HOME with a live WebGL context and 13 rendered frames. The disabled browser cannot recover its WebGL capability in place; recovery evidence is the fresh supported context plus the unit-level replacement-runtime recovery coverage. Evidence: `13-production-webgl-unavailable-recovery.json`, `13-production-webgl-unavailable-fallback.png`, `13-production-webgl-unavailable-retry.png`, `14-production-webgl-enabled-recovery.png`, `production-webgl-unavailable.mjs`, and `15-production-webgl-unavailable.log`.

`12-webgl-capability-probe.json` and `.log` record the supported browser's live WebGL version, GPU, context state, and extensions. The final real-loss check used Intel/ANGLE. Earlier exploratory SwiftShader runs and their failures are preserved under files named `*-initial-attempt`, `*-extension-attempt`, and `*-no-extension`; they are not counted as passing proof.

## Limitations and checks not run

- Physical-device and mobile-browser matrices: NOT RUN.
- Deployment, production service integration, and manual G7 evidence: NOT RUN.
- Independent audit and Parent acceptance: NOT RUN.
- The supported production route emitted a generic console 404 message and aborted route-prefetch requests during navigation; those requests did not block the recorded render or recovery path. This packet did not identify the generic 404 resource.
- The unavailability case used Chromium's real `--disable-webgl` switch. Its Retry correctly remained in the accessible fallback while WebGL stayed disabled. Recovery was demonstrated in a separate clean enabled context; same-context capability re-enablement was not available in Chromium.

`SHA256SUMS.txt` contains SHA-256 hashes for this evidence package and both changed source files. It excludes itself, as required for a non-self-referential checksum list.
