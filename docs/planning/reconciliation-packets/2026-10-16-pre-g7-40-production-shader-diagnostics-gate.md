# PRE-G7-40 — production shader-diagnostics gate

- **Date:** 2026-10-16 (Asia/Calcutta)
- **Authority:** Parent Codex, under the user's full-site repair and explicit GitHub-push authorization
- **Status:** Authorized bounded runtime behavior change based on P39 query attribution
- **Branch:** `codex/pre-g7-40-production-shader-diagnostics-gate-20261016`
- **Branch parent:** `90b985477f1ee2580fdc0cdc963a614927310142` (PRE-G7-39 evidence)
- **Frozen source base:** `ae0412fb4bfcf81b807ecd492a96cbd773c5005c`
- **Frozen app tree:** `7572fd8d082659251762ddb81416219a37800680`
- **Frozen source-commit domain tree:** `58721ce1ae7e8c3c84c0b959566c975932871f8c`
- **Frozen build base:** `ZU5S4uDGagmUivvV4xDKh`; `BUILD_ID` SHA-256 `9a2f517f64d3d460f4d800276ea7a46bb9bb63740c5ea85ca0b77d1b74432240`
- **Output owner:** `deliveries/G7/preparation/maker-evidence/pre-g7-40/`
- **Boundary:** Narrow production default for Three.js shader diagnostics, with development and explicit production debug opt-in; mirrored runtime source, lint/typecheck/build, and one instrumented runtime capture. No test suites, full performance suite, acceptance, merge, deployment, or domain/DNS change.

## Evidence and explicit policy change

PRE-G7-39 recorded 60 `getProgramParameter(LINK_STATUS)` calls totaling 14,012 ms in the 40-second capture. KHR `COMPLETION_STATUS_KHR` polls totaled 1.9 ms; uniform and attribute count queries together totaled 1.0 ms. The route still had long tasks of 3.943, 8.964, and 1.441 seconds. This identifies the synchronous link-status query as the measured stall in that capture.

Three.js documents `renderer.debug.checkShaderErrors` as enabled by default, recommends it for development, and says it may be disabled in production for performance. The official KHR extension specifies `COMPLETION_STATUS_KHR` as the non-blocking completion poll, but the link-success query remains synchronous in this observed implementation. References: [Three.js WebGLRenderer debug docs](https://threejs.org/docs/pages/WebGLRenderer) and [Khronos KHR_parallel_shader_compile specification](https://registry.khronos.org/webgl/extensions/KHR_parallel_shader_compile/).

PRE-G7-38 explicitly prohibited disabling link-failure diagnostics. P39 shows that keeping the synchronous status check in the default production path preserves a 14-second main-thread stall on the captured machine. This parent packet explicitly supersedes that P38 clause for the public production runtime, with these bounds:

- Development builds keep `renderer.debug.checkShaderErrors = true`.
- Production builds set automatic shader checks off by default before any material program is first used.
- A production session can opt into the diagnostics path before renderer creation with the exact query parameter `?shaderDiagnostics=1`.
- The P38 Three.js patch remains installed. With checks enabled, it retains failure info logs, the callback, and default error output while skipping successful-link info logs.
- No other renderer, material, visual, quality, or interaction behavior may change.

This is an explicit production diagnostics tradeoff, not a claim that link failures are impossible. The report must state that normal production sessions no longer perform automatic link-failure log checks and that the query opt-in path was inspected but not separately captured under this single-capture limit.

## Authorized work

1. Change only the canonical and mirrored `WorldRuntime.ts` files to set `renderer.debug.checkShaderErrors` before `compileAsync` or any material first use. Enable it in development and when the production query parameter is exactly `shaderDiagnostics=1`; otherwise disable it in production. Keep the domain override untouched and preserve byte parity for this runtime file.
2. Keep the P38 Three.js package patch, lockfile, and package metadata unchanged. Do not set any shader-check property after materials are initialized.
3. Use Node 24.19.0 and pnpm 9.15.9. Run lint, typecheck, and a production build on the source commit. Use `NEXT_PUBLIC_PRE_G7_13_EVIDENCE=1` only if required by the existing build workflow. Clear it from the diagnostic server environment.
4. After source/build identity is frozen, run exactly one headless Chrome 155.0.8059.84 / Playwright 1.63.0 capture at 1440×900 on `/?studio=1` for 40 seconds, using the P39 argument-aware GL wrappers. Do not pass the opt-in query for this capture. Bind it to the P40 source/app/domain trees, build ID and hash. Record the `LINK_STATUS` count, other enum timings, lifecycle/HOME time, long tasks, frame gaps, errors, GLB statuses, screenshot, and server logs.
5. Do not retry or repeat the capture. Tests and the full performance suite are not authorized. Keep every source, build, capture, and parity result in the P40 report; record unrun checks as NOT RUN.
6. Update the domain README and source-delivery manifest for the new unaccepted candidate. Write a strict evidence inventory with byte length, SHA-256, and Git blob ID; verify all entries against committed blobs. Commit and push the packet/index first, source correction separately, and evidence separately.

## Owned paths

- This packet and the narrow P40 entry in `docs/planning/delegation-and-work-orders.md`.
- `app/src/features/world/WorldRuntime.ts` and `yorayriniwnl.in/src/features/world/WorldRuntime.ts`.
- `deliveries/G7/preparation/maker-evidence/pre-g7-40/`.
- `yorayriniwnl.in/README.md` and `yorayriniwnl.in/source-delivery-manifest.json` for P40 source/build/runtime evidence.

Do not modify application tests, assets, dependency/package files, shader/material designs, render budgets, route assertions, timeouts, or accepted baselines. No merge or deployment is authorized.

## Exit boundary

P40 is an unaccepted local source candidate, not a full performance pass. Independent audit, human visual review against `references/images/main-reference.png`, Parent ruling, and the full performance suite remain open. No merge, deployment, or domain/DNS change is authorized.
