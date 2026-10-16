# PRE-G7-41 — restore shader diagnostics and trace first-use programs

- **Date:** 2026-10-17 (Asia/Calcutta)
- **Authority:** Parent Codex, under the user's full-site repair and explicit GitHub-push authorization
- **Status:** Authorized bounded runtime correction and one source-bound diagnostic capture
- **Branch:** `codex/pre-g7-41-shader-first-use-callsite-diagnostic-20261017`
- **Branch parent:** `790f68d15591f5bcad7c017dcfbba7f891cc51ac` (PRE-G7-40 evidence)
- **Frozen source base:** `4c3908b61d728babeaf67419d225c1f3978bb779` (PRE-G7-40 source)
- **Frozen app tree:** `c0ba382dae8bd05f0cee339e40f98a24db40347d`
- **Frozen source-commit domain tree:** `e9861f48ed2fdf96e7cf7f3dd495679d958f30e6`
- **Frozen build base:** `FX_IbnDTG8Oe7r-ftVmDq`; `BUILD_ID` SHA-256 `b6100686bbdc641413e41f9ce8610745885dc6af8c645e36c39df63118cc86c4`
- **Output owner:** `deliveries/G7/preparation/maker-evidence/pre-g7-41/`
- **Boundary:** Restore Three.js's default shader diagnostics in production and development, then collect one argument-aware, program-identity-aware capture to bind first-use stalls to program creation/link/use timing and caller stacks. No other renderer behavior changes.

## Evidence and reason

PRE-G7-39 attributed 14.012 seconds to 60 `LINK_STATUS` queries. PRE-G7-40 disabled production shader diagnostics, but its single capture measured 11.706 seconds in 60 `ACTIVE_UNIFORMS` queries, with 13.566 seconds of long tasks and no responsiveness improvement. Automatic diagnostics were therefore hidden without a measured benefit. Restore Three.js's default `renderer.debug.checkShaderErrors === true`; preserve the P38 success-log fast path and its failure diagnostics.

The P40 capture records slow `ACTIVE_UNIFORMS` calls in three windows: 3.120–6.740 seconds, 10.914–17.685 seconds, and 21.736–23.100 seconds. Static inspection confirms `WebGLProgram.onFirstUse` initializes uniform/attribute caches on the first draw. The capture did not bind each query to its program creation time or full JavaScript caller stack. P41 adds that narrow attribution to determine whether late groups are first use of already-linked programs or programs created later. This is a diagnostic question, not a claim that the query windows map to specific scene features.

## Authorized work

1. Change only canonical `app/src/features/world/WorldRuntime.ts` and its mirrored `yorayriniwnl.in/src/features/world/WorldRuntime.ts` to remove the P40 production query gate and leave shader diagnostics enabled by Three.js's default. Preserve the P38 Three.js patch, failure logs/callback behavior, and all other runtime behavior. Keep normalized and committed Git-blob parity for the two runtime files. Leave the domain URL override untouched.
2. Keep package metadata, patched dependency, and lockfiles unchanged. Use Node 24.19.0 and pnpm 9.15.9. Run lint, typecheck, and production build on the source commit, using `NEXT_PUBLIC_PRE_G7_13_EVIDENCE=1` only if required by the existing build workflow and clearing it from the diagnostic server environment.
3. After freezing the source/build identity, run exactly one headless Chrome `155.0.8059.84` / Playwright `1.63.0` capture at 1440×900 on `/?studio=1` for 40 seconds. Use the P40 WebGL instrumentation as the base. Instrument `createProgram`, `linkProgram`, and `useProgram`; assign each WebGLProgram a stable capture-local ID; record per-enum query counts/durations/timestamps; and capture one JavaScript stack per program's first `LINK_STATUS` or `ACTIVE_UNIFORMS` query plus stacks for slow queries. Record program creation/link/first-use times, lifecycle/HOME time, long tasks, frame gaps, errors, GLB statuses, screenshot, and server logs. Do not add the shaderDiagnostics query parameter.
4. Do not retry or repeat the capture. Tests and the full performance suite are not authorized. The report must distinguish measured findings from inferred call paths and record wrapper overhead limitations.
5. Update the domain README and source-delivery manifest for this new unaccepted candidate. Write a strict evidence inventory with byte length, SHA-256, and Git blob ID; verify every entry against committed blobs. Commit and push the packet/index first, source correction separately, and evidence separately.

## Owned paths

- This packet and its narrow PRE-G7-41 entry in `docs/planning/delegation-and-work-orders.md`.
- `app/src/features/world/WorldRuntime.ts` and `yorayriniwnl.in/src/features/world/WorldRuntime.ts`.
- `deliveries/G7/preparation/maker-evidence/pre-g7-41/`.
- `yorayriniwnl.in/README.md` and `yorayriniwnl.in/source-delivery-manifest.json` for P41 candidate/source/build/runtime evidence.

Do not modify application tests, assets, package/dependency files, shader/material design, quality policy, render budgets, route assertions, timeouts, or accepted baselines.

## Exit boundary

P41 is an unaccepted local source candidate and diagnostic record. Independent audit, human visual review against `references/images/main-reference.png`, Parent ruling, and the full performance suite remain open. No merge, deployment, or domain/DNS change is authorized.
