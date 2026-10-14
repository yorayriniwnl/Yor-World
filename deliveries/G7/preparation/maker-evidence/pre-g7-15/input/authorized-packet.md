# PRE-G7-15 - WebGL startup failure classification and fallback

- **Date:** 2026-10-15 (Asia/Calcutta)
- **Authority:** Parent Codex, Architect and Acceptance Authority
- **Status:** Authorized for local source correction only. No deployment or provider work is authorized.

## Accepted input

PRE-G7-14 accepts the bounded endpoint correction at source commit `8056fece5cd0b8113b81313b6d6a22099163bb27`, app tree `fb4881289d618612b580ef2c576103f1d3e2112c`, and final evidence head `c4eeda6be483952e56dae7972633c1d9e82becb2`. Parent ruling: [PRE-G7-14](../reviews/2026-10-15-pre-g7-14-parent-ruling.md). Keep that accepted revision immutable; create a new source branch from it.

## Trigger

The user supplied a local Chrome console report where Three.js renderer construction fails with `Cannot read properties of null (reading 'precision')`, while the visible fallback says `WebGL graphics context was lost.` The accessible fallback is present, but the observed startup failure and user-facing reason can disagree. The exact browser GPU state is not yet verified. The user also supplied a React hydration warning for `data-darkreader-proxy-injected`, `data-new-gr-c-s-check-loaded`, and `data-gr-ext-installed`; these are extension-added attributes and are outside this code packet.

This packet improves the app's honest, quiet startup-failure handling. It cannot make WebGL available when the browser or device refuses to create a context, and it must not claim that the user's Chrome has been fixed without a real check there.

## Owned paths

Own only:

- `app/src/features/world/WorldRuntime.ts`
- `app/tests/unit/world-runtime-recovery.test.ts`
- `app/tests/e2e/renderer-recovery.spec.ts` if the startup fallback needs browser-level coverage
- corresponding changed source/tests under `yorayriniwnl.in/`, plus `yorayriniwnl.in/source-delivery-manifest.json`
- `deliveries/G7/preparation/maker-evidence/pre-g7-15/`

Before editing, verify the domain mirror against the exact accepted source input and preserve its declared `src/config/public-base-url.ts` override.

## Required correction and evidence

1. Distinguish a failure to construct a renderer/create its first WebGL context from a context lost after a renderer has initialized. A startup failure must not be reported as post-start context loss.
2. Keep the accessible portfolio fallback and retry path. Give a concise, actionable user-facing startup reason that mentions checking browser hardware acceleration and using the portfolio links. Preserve technical details in a warning; do not send expected unsupported-context startup failures to the development error console. Keep genuine scene/asset/runtime errors and post-start context-loss handling visible at their existing severity.
3. Add a unit test for the renderer-constructor/context-creation failure and retain the existing genuine context-loss tests. Add browser-level coverage that denies WebGL context creation, verifies the accurate accessible fallback and retry/portfolio actions, and confirms the expected startup failure does not become an unhandled page error or `console.error` event.
4. Do not change the browser's GPU settings, capability quality thresholds, renderer options, camera presets, retry counts, test timeouts, or the accepted endpoint/interpolation code. Do not add a global `suppressHydrationWarning`; no application hydration mismatch was established by the reported extension attributes.
5. Run focused runtime-recovery unit and renderer-recovery browser tests, full unit and default integration suites without timeout overrides, lint, typecheck, and production build with Node `24.19.0` and pnpm `9.15.9`. Preserve raw output, exit codes, versions, hashes, source patch, mirror manifest, and report. Verify source/mirror parity and non-owned asset/contract hashes.
6. Report the user's exact Chrome GPU state as **NOT PROVIDED** unless received. Browser automation is not a physical Chrome verification. Do not claim the user can render 3D after this code change without a manual check in their browser.

## Review boundary

A maker returns source and evidence; a read-only independent reviewer audits the exact pushed revision, then the maker corrects any findings and the reviewer performs a delta audit. Parent acceptance remains separate. If local Codex substitutes for Gemini #3 or GPT Plus #2, identify that substitution accurately. This packet is local-only and does not resolve physical-device testing, provider readiness, production configuration, deployment, or G7 acceptance.
