# PRE-G7-16 - canonical fixture under the default integration suite

- **Date:** 2026-10-15 (Asia/Calcutta)
- **Authority:** Parent Codex, Architect and Acceptance Authority
- **Status:** Authorized for a bounded local test/fixture correction only. No production or provider work is authorized.

## Accepted input

PRE-G7-15 accepts source commit `8becac4ea3e9decc91ca2807e2004a0aa0407105`, app tree `26d4885d4c76233168baaea52c5a33aca1ede594`, and final evidence head `965abdaeff38282e2702e1ea97b4929acbef6889`. Its parent ruling is [PRE-G7-15](../reviews/2026-10-15-pre-g7-15-parent-ruling.md). Keep that accepted revision immutable and create a new source branch from it.

## Trigger

Both final-source default integration runs for PRE-G7-15 recorded **285/286**. In each, `tests/integration/platform/canonical-fixture.test.ts` timed out at its unchanged **60,000 ms** default while initializing one file database across independently loaded route modules. The reports and logs are archived in the [PRE-G7-15 evidence](../../../deliveries/G7/preparation/maker-evidence/pre-g7-15/).

After PRE-G7-15 acceptance, the exact test passed **1/1 in 51.36 seconds** with Node `24.19.0`, pnpm `9.15.9`, and the unchanged default test timeout; the raw diagnostic is [archived here](../../../deliveries/G7/preparation/pre-g7-16-input/isolated-canonical-fixture.log). This establishes that the isolated test can pass, but it does not identify why it reaches the timeout in the full suite. Diagnose the cause before choosing a correction; do not assume that parallel load is the cause.

## Owned paths

Own only the paths needed for this fixture correction:

- `app/tests/integration/platform/canonical-fixture.test.ts`
- `app/src/server/database.ts` and `app/src/server/test-fixture.ts` only if their fixture ownership/lifecycle is the cause
- `app/vitest.integration.config.ts` only if test-runner scheduling is the demonstrated cause
- corresponding changed paths under `yorayriniwnl.in/`, plus `yorayriniwnl.in/source-delivery-manifest.json`
- `deliveries/G7/preparation/maker-evidence/pre-g7-16/`

Before editing, verify the domain mirror against the exact PRE-G7-15 source and preserve the declared `src/config/public-base-url.ts` override. Preserve all accepted camera/WebGL source and the protected assets/contracts unchanged.

## Required correction and evidence

1. Keep the default **60,000 ms test timeout and 90,000 ms hook timeout unchanged**. Do not add retries, skip/only markers, timeout overrides, weakened assertions, mock databases, or a special command that hides the failing test. If scheduling is the demonstrated cause, any configuration change must preserve the default `pnpm run test:integration` command, all 286 tests, and their full coverage.
2. Preserve the test's ownership guarantee: independently loaded database modules for the same explicit test path must return the same database owner and pending initialization; the seeded published row and subsequent update must be visible through both handles; cleanup must close resources and clear the fixture owner.
3. Run the focused canonical-fixture test and the full default integration suite with Node `24.19.0` and pnpm `9.15.9`, without timeout or retry overrides. Require **two consecutive 286/286 default-suite passes** after the correction. Allow at most three full-suite invocations total; after any failure, preserve the raw attempt and verify its test/fixture processes and locks are idle before the next run. If two consecutive passes are not achieved within those three invocations, report the gate unresolved. Never label an isolated focused pass as a full-suite pass.
4. Run the full unit suite, lint, and typecheck; also run the production build if production source changes. Preserve raw outputs, exit codes, versions, hashes, the exact source patch, mirror manifest, and a report distinguishing baseline failures from corrected results.
5. Verify source/mirror parity, protected hashes, the final source commit and app tree, and the actual test snapshot bytes. Commit and push the scoped source change and its separate final evidence delta.
6. An independent read-only audit reviews the exact remote head. Parent acceptance is separate. If local Codex substitutes for Gemini #3 or GPT Plus #2, state the substitution; do not claim an external account performed work.

## Boundaries

This is local-only test reliability work. Do not configure providers, change user Chrome/GPU settings, deploy, change DNS/domains, or claim physical-device verification. The user’s exact Chrome GPU state remains **NOT PROVIDED**; G7 remains unaccepted.
