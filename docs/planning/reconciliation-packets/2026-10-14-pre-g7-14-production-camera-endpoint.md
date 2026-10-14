# PRE-G7-14 - Exact production entrance endpoints

- **Date:** 2026-10-14 (Asia/Calcutta)
- **Authority:** Parent Codex, Architect and Acceptance Authority
- **Status:** Authorized for local source correction only. No deployment or provider work is authorized.

## Accepted input

PRE-G7-13-R1 accepts only the bounded visual-composition source. Use its exact application source commit `a3459c158af880319269196f85c0c922ee86c5d6`, app tree `23c7dac82746d7db84632e228efe3224736b9266`, and final evidence head `498d6e1329ce651a816cd17935af5fa25bf01ba2`. Parent ruling: [PRE-G7-13-R1](../reviews/2026-10-14-pre-g7-13-parent-ruling.md). Do not use or describe failed PRE-G7-12 as accepted.

## Trigger

The default full integration run on this exact source passes 285/286. `tests/integration/production-camera.test.ts:174` requires `entrancePositionAt(1, true)` to equal the settled mobile camera target exactly, but linear interpolation returns `[0.30000000000000004, 2.22, 1.43]` instead of `[0.3, 2.22, 1.43]`. The last waypoint is contractually the HOME camera position. Preserve that exact endpoint in production behavior; do not weaken the strict assertion or introduce a numeric tolerance to hide the endpoint drift.

The original source-bound failure log is `deliveries/G7/preparation/maker-evidence/pre-g7-13/attempt-59/full-integration.log`.

## Owned paths

Own only:

- `app/src/features/world/EntranceCoordinator.ts`
- `app/tests/unit/entrance-coordinator.test.ts`
- `app/tests/integration/production-camera.test.ts` (only if new assertions are needed; keep the existing strict endpoint check)
- corresponding changed source/tests under `yorayriniwnl.in/`, plus `yorayriniwnl.in/source-delivery-manifest.json`
- `deliveries/G7/preparation/maker-evidence/pre-g7-14/`

Preserve the domain mirror's documented `src/config/public-base-url.ts` override and parity. Before editing, confirm that all other mirror files match the accepted input source.

## Required correction and evidence

1. Make the clamped endpoints at progress 0 and 1 return the exact authored hallway and selected HOME camera vectors. Preserve clamping for values below 0 and above 1, mobile/desktop selection, and the existing intermediate doorway trajectory. Do not alter camera presets or the curve between endpoints.
2. Add focused unit coverage for exact start/end values for desktop and mobile, plus clamped out-of-range progress. Keep the integration test's exact settled-position equality so the original regression remains detectable.
3. Run the focused unit and production-camera integration tests, then the default `pnpm test:integration` without timeout overrides, lint, typecheck, unit suite, and production build with Node `24.19.0` and pnpm `9.15.9`. Preserve raw output, exit codes, versions, hashes, source patch, mirror manifest and report. Do not modify timeout/GPU policies.
4. Verify the source mirror against this exact source revision and verify the GLB and all non-owned contracts/assets are unchanged.

Report each result as PASS, FAIL, or NOT RUN, with exact command, exit code, evidence path and limitation. Do not claim that a passing focused test makes the full integration suite pass.

## Review boundary

A maker must return the source and evidence; a read-only independent reviewer audits the exact source/evidence revision, followed by maker correction and delta audit if needed. Parent acceptance remains separate. If a local Codex account substitutes for Gemini #3 or GPT Plus #2, identify it accurately; do not claim the named external account ran the work. This packet does not resolve the user-browser WebGL issue, hydration attributes injected by extensions, physical-device testing, provider readiness, deployment, or G7 acceptance. The current instruction remains local-only.