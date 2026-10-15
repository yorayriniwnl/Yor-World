# PRE-G7-22-C1 — evidence build flag clarification

- **Date:** 2026-10-15 (Asia/Calcutta)
- **Authority:** Parent Codex, Architect and Acceptance Authority
- **Applies to:** [PRE-G7-22](2026-10-15-pre-g7-22-home-scene-reference-fidelity.md), unchanged source base `fc64a18a7ec1d027fb0a33400c2fcd6288d6afbf`
- **Status:** Authorized clarification; local-only

The existing browser evidence instrumentation in `SceneIntegrator.ts` and `CameraDirector.ts` is included in a production bundle only when `NEXT_PUBLIC_PRE_G7_13_EVIDENCE=1` is present during `next build`. The PRE-G7-22 visual E2E in evidence mode depends on that instrumentation. Without the flag, its required live projected-anchor evidence is unavailable.

For the untouched baseline build and final candidate build, set `NEXT_PUBLIC_PRE_G7_13_EVIDENCE=1` in the build process environment, then run the packet's unchanged exact command `pnpm run build` from canonical `app/`. This enables only the already-existing, query-gated evidence diagnostics; it does not add source behavior, change runtime quality policy, or alter the build command or its arguments. Record the variable name and value in each build receipt. Do not add other environment variables, command flags, filters, retries, timeout overrides, or shims to the packet's quality commands.

The final visual test remains exactly `pnpm exec playwright test tests/e2e/world-reference-composition.spec.ts`, with the four PRE-G7-22 `PRE_G7_13_*` evidence variables and isolated evidence directory set as specified by the packet. Baseline capture remains read-only, source-bound to `fc64...`, and separate from that one required final E2E invocation.

No source/mirror path, dependency, frozen acceptance boundary, evidence target, command count, or review boundary changes. The maker and reviewer must bind their evidence to both this clarification and the original PRE-G7-22 authorizing commit. This note does not accept any result.
