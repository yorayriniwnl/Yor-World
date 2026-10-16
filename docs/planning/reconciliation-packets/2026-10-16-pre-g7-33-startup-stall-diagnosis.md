# PRE-G7-33 - PRE-G7-32 startup stall diagnosis

- **Date:** 2026-10-16 (Asia/Calcutta)
- **Authority:** Parent Codex, continuing the user's full-site repair authorization
- **Status:** Authorized, source-bound diagnosis-only packet
- **Branch:** `codex/pre-g7-33-startup-readiness-20261016`
- **Branch parent:** `b26368cab80270e686e69b0ba29e80b87d7bde63`
- **Frozen application source:** PRE-G7-31 commit `bd01478617f2186866f3f44196c56fc5add94acd`
- **Frozen app tree:** `3975e40c59a04b8696efa2ca3605eb37a0617165`
- **Output owner:** `deliveries/G7/preparation/maker-evidence/pre-g7-33/`
- **Boundary:** Local read-only diagnosis. No product-source, test-source, asset, dependency, threshold, timeout, deployment, or acceptance changes.

## Why this packet exists

PRE-G7-32 preserved one full performance-suite failure: its active interaction route stayed in `LOADING` at the existing 15-second `HOME` assertion. Its trace records the optional `/models/interaction-assets.glb` response shortly before an 18-second gap in captured browser frames; the final frame shows the rendered room after the assertion failed. The GLB contains 133 nodes, 111 meshes, 36 materials, 9 animations, and 7 embedded images. This timing raises a main-thread asset-processing hypothesis but does not prove it.

Prior evidence is mixed. PRE-G7-30 reached `HOME` 12.675 seconds after its observed `LOADING` state, close to the current assertion ceiling. PRE-G7-28's focused readiness diagnostic reached `HOME` while its optional interaction-asset request took 14.161 seconds. Preserve those findings without claiming a cause.

## Authorized work

1. Confirm the pinned Node 24.19.0 / pnpm 9.15.9 toolchain and frozen source tree. Install with `pnpm install --offline --frozen-lockfile` only if `app/node_modules` is absent.
2. Build the exact frozen app source once with `NEXT_PUBLIC_PRE_G7_13_EVIDENCE=1` set only for `pnpm run build`.
3. Add one packet-owned standalone Playwright diagnostic script under `deliveries/G7/preparation/maker-evidence/pre-g7-33/`. It may observe the `/?studio=1` startup route, DOM lifecycle changes, browser long tasks, animation-frame gaps, console/page errors, model request timing, and screenshots. It must not patch application code or tests.
4. Run that diagnostic once in headless Chrome against the packet's production build on port `3221`. Start observation before navigation, capture a Playwright trace, and allow up to 40 seconds for the route to settle so delayed completion is visible. Record the actual browser channel/version, toolchain, request timings, and exit status. Do not repeat the run if it stalls or fails.
5. Compare the captured timeline with the archived PRE-G7-28, PRE-G7-30, and PRE-G7-32 evidence. Report whether a long task overlaps optional-GLB parsing or another startup phase; if the evidence does not isolate the cause, report `UNRESOLVED`.

Do not change any product or test source, model asset, performance budget, assertion, retry count, browser configuration, or timeout. Do not run the full performance suite again in this packet. If the diagnosis identifies a correction, prepare a separate parent packet that states the exact fix and regression scope before changing source.

## Evidence and exit boundary

Preserve the preflight, optional offline-install receipt if needed, build receipt/output, diagnostic script, browser trace, screenshots, JSON timeline, console/page errors, and a strict SHA-256 / byte-length / Git-blob inventory. Bind every capture to source commit `bd01478617f2186866f3f44196c56fc5add94acd` and app tree `3975e40c59a04b8696efa2ca3605eb37a0617165`.

The PRE-G7-31 source candidate remains unaccepted and undeployed. This packet authorizes no correction, independent account review, visual acceptance, merge, domain operation, deployment, or G7 completion. Parent diagnosis is not a substitute for the separate GPT Plus #2 audit or human visual review.
