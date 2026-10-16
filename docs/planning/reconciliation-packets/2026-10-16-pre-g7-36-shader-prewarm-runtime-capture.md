# PRE-G7-36 — verify PRE-G7-35 shader prewarm at runtime

- **Date:** 2026-10-16 (Asia/Calcutta)
- **Authority:** Parent Codex, continuing the user's full-site repair authorization and explicit GitHub-push request
- **Status:** Authorized, bounded source-bound browser diagnosis
- **Branch:** `codex/pre-g7-36-shader-prewarm-runtime-capture-20261016`
- **Branch parent:** `24e15b7f7513170c4df56ea930ac8e37b149f98a` (PRE-G7-35 evidence)
- **Frozen source commit:** `5c1e6aedb71d89d46ffc0ada8de522526290131c`
- **Frozen app tree:** `62a08db251ef15254523bfb08b926ce7c6954ebc`
- **Source-commit domain tree:** `89ca7d46f790f062e63fcae2368c24ae557e03ab`
- **Inherited candidate domain tree:** `0c1fb3220ac8e2a192d309e6bc551c916678e5b1`
- **Reused build:** PRE-G7-35 production artifact in `D:\p35\app`, build ID `YeuUJsHpZHf4H1-GP30nT`, `BUILD_ID` SHA-256 `6a56fa056415b835e05a411dbb273538a5df986b77592004fdfaad30dd2e1d96`
- **Output owner:** `deliveries/G7/preparation/maker-evidence/pre-g7-36/`
- **Boundary:** One local diagnostic capture. No product source, test source, model, build, install, performance-suite, acceptance, merge, deployment, or domain/DNS change.

## Why this packet exists

PRE-G7-34's CPU profile attributed its largest sampled startup work to Three.js `WebGLProgram.onFirstUse`. PRE-G7-35 added `renderer.compileAsync(this.scene, this.camera)` before the first animation frame, with lifecycle and disposal checks, and its offline install, lint, typecheck, and build passed. That build-only result does not establish whether the previously observed 13.290-second and 12.347-second long tasks changed or whether the 15-second HOME assertion will pass.

This packet measures the exact pushed PRE-G7-35 artifact once, using the same route, viewport, 40-second observation window, Chrome channel, 1 ms CPU-profile sampling interval, and browser observers used by PRE-G7-34. Profiling can affect timings. This capture is diagnostic evidence and cannot pass the full performance gate.

## Authorized work

1. Confirm the P36 worktree is at the packet branch parent, the frozen P35 source commit/app tree/domain tree match the values above, the remote P35 branch contains evidence commit `24e15b7f7513170c4df56ea930ac8e37b149f98a`, and the P35 source worktree has no tracked changes. Verify the P35 `BUILD_ID` bytes and SHA-256. Do not install or rebuild.
2. Use a standalone P36-owned diagnostic script. Start the existing P35 production server read-only from `D:\p35\app` on `127.0.0.1:3223`. Do not set `NEXT_PUBLIC_PRE_G7_13_EVIDENCE` in the server process; that flag was used only when the build was created. Do not edit the P35 worktree.
3. With pinned Node `24.19.0`, pnpm `9.15.9`, and installed Chrome, begin CDP CPU profiling before navigating headless Chrome `155.0.8059.84` to `http://127.0.0.1:3223/?studio=1`. Observe for exactly 40 seconds after navigation; collect lifecycle/loading state, long tasks, animation-frame gaps, page and console errors, model/chunk requests, a final screenshot, a Playwright trace, raw CPU profile, and server stdout/stderr. Record actual browser/runtime versions.
4. Execute the browser capture exactly once. Do not retry or repeat if startup stalls, HOME is not reached, an artifact times out, or profile collection fails. Preserve every outcome and failure. If preflight fails before capture starts, stop before browser navigation and report the block.
5. Compare P36 with P34's capture and the P35 build receipt. Analyze sampled stacks in the startup long-task windows, including time in `WebGLProgram.onFirstUse` if present. Report the result as `CAPTURED`, `FAIL`, or `UNRESOLVED`; distinguish measurement from performance-gate acceptance. If the likely cause remains or changes, prepare a separate correction packet before product-source changes.

Only `docs/planning/reconciliation-packets/2026-10-16-pre-g7-36-shader-prewarm-runtime-capture.md`, its narrow delegation-index entry, and `deliveries/G7/preparation/maker-evidence/pre-g7-36/` are owned. In the later evidence commit, the domain README and manifest may record the diagnostic result while keeping PRE-G7-35 explicitly unaccepted and undeployed. Do not change app or mirror application code, source assets, tests, budgets, assertions, timeouts, retries, browser configuration, or the reused P35 build.

Do not run unit, integration, e2e, or full performance suites under this packet. Do not perform external acceptance, merge, or deployment. Keep the candidate's optional HTML portfolio path and optional interaction-asset behavior unchanged.

## Evidence and exit boundary

Commit and push the packet/index before running the capture. Then push a separate evidence commit. Bind the capture to source commit `5c1e6aedb71d89d46ffc0ada8de522526290131c`, app tree `62a08db251ef15254523bfb08b926ce7c6954ebc`, source-commit domain tree `89ca7d46f790f062e63fcae2368c24ae557e03ab`, inherited domain tree `0c1fb3220ac8e2a192d309e6bc551c916678e5b1`, build ID and checksum above, pinned runtime, browser version, one command receipt, raw profile, trace, screenshot, server logs, analysis, report, and strict SHA-256/byte-length/Git-blob inventory. Also record tests and the full performance suite as **NOT RUN**.

PRE-G7-31 and PRE-G7-35 remain unaccepted and undeployed. This packet does not close the independent GPT Plus #2 audit or human visual review, authorize merge, or authorize any deployment or G7 completion.
