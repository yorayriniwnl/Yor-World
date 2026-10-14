# PRE-G7-10 — Investigate and prevent WebGL context loss during effect replay

Date: 2026-10-14 (Asia/Calcutta). Parent packet under the continuing owner instruction to complete the project. The accepted RC6-R1 source remains immutable: source commit `8e5b954e147a87e36a6869d9940c40f3d4c123f0`, app tree `42ea29ec235225046a75959eb19eb386ac2f821d`. Any resulting source amendment is a new, unaccepted successor requiring fresh source-bound proof, independent delta review, and Parent acceptance before it can be used for production.

## Trigger and scope

The screenshot reports `WebGL context creation failed: Cannot read properties of null (reading 'precision')` while entering the studio in Next development mode; the UI also reports a lost context. A clean Playwright Chrome run now reproduces this error, with React's `doubleInvokeEffectsInDEV` in the stack. This confirms the Strict Mode replay and unconditional `forceContextLoss()` teardown interaction in the byte-identical runtime/world component files listed below. A browser with unavailable WebGL must also reach its accessible fallback. The screenshot's hydration attributes (`data-darkreader-proxy-injected`, `data-gr-ext-installed`) are browser-extension mutations, not evidence of a source hydration mismatch.

The candidate fix currently exists on branch `codex/fix-world-webgl-context-replay` at commit `70ec59119f9d871885edd4b238416df6661ad438`; it is a pushed, unaccepted candidate, not a maker return or a source acceptance. The runtime maker must reproduce the supplied development failure from accepted RC6-R1 source in an isolated checkout, distinguish Strict Mode replay from unavailable/broken WebGL, and return an independently implemented correction.

Parent diagnostic on source commit `58ca6edb`: the accepted `app/` tree is exactly `42ea29ec235225046a75959eb19eb386ac2f821d`. The local domain-root copy differs from accepted `src/` only in `src/config/public-base-url.ts`; its `WorldRuntime.ts`, `WorldRoot.tsx`, and `StudioLauncher.tsx` blobs match accepted RC6-R1 exactly (respectively `2ab246f27cdf7bbece18d7732da5fb2ad8f7f3ee`, `eab447e9e4ef619ce417b15a36ab62733797aaf6`, and `6d94938e1ad09b446b53ff0274dcda14d6cc6e74`). In clean headless Chrome with SwiftShader, the production build entered the studio and rendered 81 frames. In development, after allowing hydration to finish before interaction, entry showed the accessible fallback, removed the canvas, and logged `WebGL context creation failed: Cannot read properties of null (reading 'precision')`; the stack includes `doubleInvokeEffectsInDEV` and `reconnectPassiveEffects`. No hydration mismatch appeared in that clean run; a separate `/favicon.ico` 404 was observed. This is parent diagnostic evidence, not independent audit or source acceptance. The maker must still reproduce against the exact accepted tree and provide the assigned regression/evidence package.

Assigned maker: **Gemini #3, runtime/integration lane**. The maker owns only:

- `app/src/features/world/WorldRuntime.ts`
- `app/tests/unit/world-runtime-recovery.test.ts`
- `deliveries/G7/preparation/maker-evidence/pre-g7-10/runtime/`

Do not edit accepted RC6-R1 receipts, current-status records, unrelated application files, frozen contracts, asset manifests, dependencies, CI policy, or production configuration. Parent owns integration, candidate identity, new source-bound proof, status records, and acceptance. No deployment or paid service action is assigned.

## Required behavior

Reproduce the Strict Mode sequence `setup → cleanup → setup` on the same still-connected canvas. Cleanup must release the old runtime's resources without irreversibly losing a context that the replacement runtime needs. A real detached-canvas teardown must still release resources and follow the intended context-loss behavior. Separately exercise WebGL creation failure/unavailability and genuine context loss; both must show the intended accessible fallback and recovery behavior without an unhandled exception. Preserve lifecycle cancellation, recovery/retry, visibility handling, and the single-render-loop invariant.

Add focused regression coverage proving that:

1. Cleanup during replay on a connected shared canvas does not force context loss, and the replacement runtime can obtain a usable rendering context.
2. Final teardown after the canvas is detached performs the intended context cleanup and does not leave animation frames, event listeners, or runtime resources active.
3. Genuine WebGL creation failure and genuine context loss still reach the accessible fallback and existing recovery path.

The screenshot also contains `data-darkreader-proxy-injected` and Grammarly-injected body attributes. Treat those as browser-extension mutations for the hydration warning; do not suppress hydration warnings or change `app/src/app/layout.tsx` in this packet. Verify server markup and client hydration in a clean browser profile when recording browser evidence.

## Required evidence

Return `report.md`, the exact source diff, test command/output logs, `SHA256SUMS.txt`, and a browser-smoke record under the assigned evidence root. Record the exact base and result commits, app-tree identities, runtime versions, commands, exit codes, browser/GPU details, observed canvas lifecycle, and limitations. Do not present mock-context tests as proof of physical GPU behavior.

Run the focused recovery tests, then the repository lint, typecheck, unit and integration suites, and production build using Node `24.19.0` and pnpm `9.15.9`. Run a clean-profile browser smoke against the resulting production build: confirm the studio reaches its usable home state, renders frames on the supported test GPU, and has no WebGL context-creation exception. Exercise an explicit context-loss/fallback path and recovery. Preserve raw output and identify any hardware-dependent or NOT RUN checks honestly.

## Review and release boundary

After the maker return, GPT Plus #2 performs a read-only audit of the exact maker commit, changed paths, tests, and browser evidence. If corrections are required, Gemini #3 makes them and GPT Plus #2 audits the exact delta. Parent alone decides acceptance and creates a new source/app-tree/bundle/manifest binding with fresh proof; keep RC6-R1 and all prior receipts unchanged.

This packet does not accept the existing `70ec5911` candidate, does not satisfy any deployment-bound G7 criterion, and does not replace the separate production service, recovery, monitoring, accessibility, physical-device, or manual G7 evidence requirements.
