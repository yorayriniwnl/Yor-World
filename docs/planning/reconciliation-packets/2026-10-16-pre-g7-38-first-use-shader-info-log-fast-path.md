# PRE-G7-38 — remove successful-link shader-info-log startup stalls

- **Date:** 2026-10-16 (Asia/Calcutta)
- **Authority:** Parent Codex, under the user's full-site repair and explicit GitHub-push authorization; source correction is authorized by PRE-G7-37
- **Status:** Authorized bounded dependency correction with build and one source-bound browser diagnostic
- **Branch:** codex/pre-g7-38-first-use-shader-log-fast-path-20261016
- **Branch parent:** 1d39670b102b2ef240ff587f184da68c8dfa84f5 (PRE-G7-37 evidence)
- **Frozen candidate source commit:** 5c1e6aedb71d89d46ffc0ada8de522526290131c
- **Frozen app tree:** 62a08db251ef15254523bfb08b926ce7c6954ebc
- **Source-commit domain tree:** 89ca7d46f790f062e63fcae2368c24ae557e03ab
- **Inherited candidate domain tree:** 1b9c325d816528672be7dad25badcf1172777e27
- **P35 production build:** YeuUJsHpZHf4H1-GP30nT; BUILD_ID SHA-256 6a56fa056415b835e05a411dbb273538a5df986b77592004fdfaad30dd2e1d96
- **Output owner:** deliveries/G7/preparation/maker-evidence/pre-g7-38/
- **Boundary:** Pinned Three.js shader-diagnostic fast path in canonical app and domain mirror, offline-first frozen install with one bounded network fallback for a missing locked tarball, lint/typecheck/build, and exactly one instrumented runtime capture. No tests, full performance suite, acceptance, merge, deployment, or domain/DNS change.

## Why this packet exists

PRE-G7-37 observed KHR_parallel_shader_compile on Chrome 155.0.8059.84, yet 60 getProgramInfoLog calls consumed 15,441.8 ms during the 40-second observation. The maximum call took 713.2 ms. The first two long tasks, 5,716 ms and 8,528 ms, overlapped multiple slow program-log call intervals. Uniform and attribute queries took 10.5 ms combined. PRE-G7-36's CPU profile independently identified Three.js WebGLProgram.onFirstUse.

The pinned Three.js 0.180.0 implementation reads program and shader info logs before checking LINK_STATUS. Successful links therefore pay for diagnostic reads that are needed only to explain a failed link. The P37 run is instrumented and singular; timing overhead and exact per-call causation remain limits.

## Authorized work

1. Keep the P35 product source and all assets as the base. Patch the pinned Three.js 0.180.0 package using pnpm's patched-dependency mechanism. Patch both its source implementation and the production ESM module consumed by the application.
2. In WebGLProgram.onFirstUse, check LINK_STATUS before reading diagnostic logs. On a successful link, skip program/shader info-log retrieval and non-fatal successful-link info-log warnings, then proceed with the existing uniform and attribute cache initialization. On a failed link, retain the original diagnostic path: program/vertex/fragment logs, custom onShaderError callback, default error output, and failure diagnostics. Continue honoring renderer.debug.checkShaderErrors.
3. Mirror the same patched dependency files, package metadata, lockfile, and applicable source-delivery metadata from app/ into yorayriniwnl.in/. Preserve the domain URL override. Update the mirror/parity evidence to bind the exact new source and domain trees.
4. Use Node 24.19.0 and pnpm 9.15.9. Attempt the frozen install offline first and record package downloads. If it fails because a locked package tarball is missing from the local store, preserve that failure and use this packet delta to authorize one network-enabled pnpm install --prefer-offline --frozen-lockfile against the existing registry configuration. It may fetch only dependencies already present in the lockfile; do not modify the lockfile, and record all downloaded packages and counts. Stop if resolution changes or another source is needed. Then run lint, typecheck, and a production build. Set NEXT_PUBLIC_PRE_G7_13_EVIDENCE=1 only if required by the existing build workflow, and clear it from the runtime server environment.
5. After the source/build identity is frozen, run exactly one instrumented headless Chrome capture at 1440×900 on /?studio=1 for 40 seconds, using the P37 WebGL-call wrappers and the same Chrome 155.0.8059.84 / Playwright 1.63.0 environment. Bind it to the P38 source, app/domain trees, build ID and hash. Record lifecycle, HOME timing, long tasks, frame gaps, WebGL method counts/timings, errors, model requests, screenshot, and server logs. Record wrapper timing overhead. Do not retry or repeat if the route stalls, a log call is slow, or output fails.
6. Record getProgramInfoLog and shader-log counts. A successful normal run should not need those logs. If a call occurs, preserve the result and inspect whether a shader link actually failed; do not hide or relabel it as a pass. This single capture diagnoses the change and does not pass the full performance gate.
7. Write a report and strict evidence inventory with byte length, SHA-256, and Git blob IDs. Record tests and the full performance suite as NOT RUN.

## Owned paths

Only the following paths may change:

- app/package.json, app/pnpm-lock.yaml, and the generated app/patches/three@0.180.0.patch.
- The matching package.json, pnpm-lock.yaml, and patches/three@0.180.0.patch under yorayriniwnl.in/.
- The narrow PRE-G7-38 entry in docs/planning/delegation-and-work-orders.md and this packet.
- The P38 evidence directory.
- yorayriniwnl.in/README.md and yorayriniwnl.in/source-delivery-manifest.json for source/build/runtime evidence.
- Existing parity/audit outputs needed to bind matching app and mirror files.

Do not modify application runtime source, tests, assets, shader/material designs, quality policy, rendering budgets, route assertions, timeouts, or the reused P35 build. Do not add a workaround that disables link-failure diagnostics.

## Evidence and exit boundary

Commit and push this packet and delegation-index entry before source changes. Commit and push the source correction as a separate small descriptive commit. Commit and push build/capture evidence separately after the source commit. Confirm the inventory matches the committed Git blobs and verify the remote branch tip.

PRE-G7-31, PRE-G7-35, P37's inherited candidate, and the new P38 candidate remain unaccepted and undeployed. This packet does not close independent GPT Plus #2 audit, human visual review against references/images/main-reference.png, Parent ruling, the full performance suite, or G7 acceptance. No merge or deployment is authorized.


## 2026-10-16 install-cache delta

The first authorized offline frozen install completed with exit code 1 after 13.589 seconds. It reused 401 packages, downloaded zero, and stopped because the locked Next.js 16.3.8 tarball was absent from the local pnpm store. The exact receipt and stdout/stderr are preserved in deliveries/G7/preparation/maker-evidence/pre-g7-38/commands/offline-install.receipt.json and the adjacent binary logs.

This delta authorizes one network-enabled frozen-lockfile install with prefer-offline enabled, using the existing registry configuration to hydrate dependencies already fixed by pnpm-lock.yaml. Capture every package download. No dependency version, lockfile resolution, or registry configuration change is authorized.


## 2026-10-16 post-patch install delta

The network-enabled frozen install above hydrated the locked Next.js and SWC packages before the Three.js patch existed. After pnpm patch-commit updates the lockfile with the P38 patch, this packet authorizes one additional offline frozen install to apply that exact patched dependency to node_modules before lint/typecheck/build. This install must remain offline; if it fails, preserve the failure and stop without another network install.
