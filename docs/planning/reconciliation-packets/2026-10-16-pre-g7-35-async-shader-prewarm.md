# PRE-G7-35 — prewarm scene shaders without blocking the first frame

- **Date:** 2026-10-16 (Asia/Calcutta)
- **Authority:** Parent Codex, continuing the user's full-site repair authorization
- **Status:** Authorized, bounded local source correction and build evidence
- **Branch:** `codex/pre-g7-35-shader-first-use-correction-20261016`
- **Branch parent:** `4757af073cc64f1eab93ff56bf49a824405d79cd` (PRE-G7-34 CPU attribution)
- **Frozen source base:** PRE-G7-31 commit `bd01478617b4166866f3f44196c56fc5add94acd`
- **Frozen app tree:** `3975e40c59a04b8696efa2ca3605eb37a0617165`
- **Inherited candidate domain tree:** `8b276ca90142c4c7ed7f8674668677a5d167891a`
- **Output owner:** `deliveries/G7/preparation/maker-evidence/pre-g7-35/`
- **Boundary:** Local source/build only. No model or visual change, performance-policy change, test-suite change/run, external acceptance, merge, or deployment.

## Why this packet exists

PRE-G7-34's one Chrome CPU profile maps the dominant sampled path in three long tasks to Three.js `WebGLProgram.onFirstUse`: `WorldRuntime.animate` → `WebGLRenderer.render` → `renderBufferDirect` → `WebGLProgram.getUniforms` → minified `P`. The first two tasks lasted 13.290 and 12.347 seconds; the same `P` frame accounted for 12.915 and 12.125 seconds of sampled CPU time across its three leading nodes. The source snippet matches the locked Three.js `0.180.0` implementation, which checks shader link/log status and initializes uniforms/attributes when a program is first used. Three.js exposes `WebGLRenderer.compileAsync` to precompile scene materials with `KHR_parallel_shader_compile` where supported.

The interaction asset is an optional enhancement. `WorldInteractionBinding.addInteractionScene` hides its nodes and uses them only as hit proxies; production-mesh raycasts and DOM controls remain available. The CPU profile points to first-use programs in the visible main scene. This correction therefore targets the main scene before its first animation frame and leaves the optional-proxy path untouched.

## Owned paths

- `app/src/features/world/WorldRuntime.ts`
- `yorayriniwnl.in/src/features/world/WorldRuntime.ts` (content must match the canonical source)
- After the source commit only: `yorayriniwnl.in/README.md` and `yorayriniwnl.in/source-delivery-manifest.json` to record the new unaccepted candidate and P35 evidence
- `deliveries/G7/preparation/maker-evidence/pre-g7-35/`
- This packet and its narrow delegation index entry

Keep `app/` canonical. Preserve the exact P35 branch base and inherited mirror state. The original model assets, asset manifest, interaction catalog, camera presets, visual materials, lighting, renderer quality/DPR policy, shader diagnostic setting, performance budgets, assertions, timeout, retry policy, and DOM/production-mesh fallback are frozen.

## Authorized correction

1. After required scene integration, lighting/material quality setup, and viewport sizing, await `renderer.compileAsync(this.scene, this.camera)` before scheduling the first animation frame and starting entrance choreography. Check the lifecycle token and disposal state after the await. If precompilation throws, report the error and continue ordinary renderer startup; record prewarming as failed rather than claiming success.
2. Keep optional interaction GLB loading asynchronous and outside required readiness, entrance, and HOME. Do not wait for it during initial scene prewarm. Its nodes are hidden hit proxies; visible production-mesh raycasts and DOM controls remain active.
3. Preserve `renderer.debug.checkShaderErrors` and all existing shader diagnostics. Do not patch Three.js, suppress GL errors, remove materials, change geometry, lower quality, or change lighting/composition to hide the stall.
4. Change only the two `WorldRuntime.ts` source/mirror files in the source commit. Update the mirror README/manifest in the later evidence commit with the resulting source commit/tree and the P35 build result; keep the candidate explicitly unaccepted and undeployed.

This packet authorizes one offline frozen install only if the P35 app worktree has no `node_modules`; use the already populated `C:\Users\ayush\AppData\Local\pnpm\store\v3` store and do not download packages. Run the pinned Node `24.19.0` / pnpm `9.15.9` lint, typecheck, and one production build with `NEXT_PUBLIC_PRE_G7_13_EVIDENCE=1` set only for the build. Do not add or run test suites under this packet. Preserve command receipts and all failures. A build pass alone does not establish runtime performance or candidate acceptance.

## Evidence and exit boundary

Push the source commit before a separate evidence commit. Bind the source and mirror trees, changed Git blobs, frozen model hashes, mirror README/manifest state, command receipts, build ID, and a strict SHA-256 / byte-length / Git-blob inventory. Report tests, browser runtime capture, complete performance suite, external audit, and human visual review as **NOT RUN**; do not claim the startup stall is fixed without browser evidence.

PRE-G7-31 remains unaccepted and undeployed. This packet does not accept the new source, close the GPT Plus #2 audit or human visual review, authorize a merge, or authorize deployment, domain/DNS operations, or G7 completion. If the new build cannot complete prewarming safely, preserve the failure and prepare a distinct follow-up packet.
