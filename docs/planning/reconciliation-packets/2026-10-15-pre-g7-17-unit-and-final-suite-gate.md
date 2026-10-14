# PRE-G7-17 - unit boundary and final integration gate

- **Date:** 2026-10-15 (Asia/Calcutta)
- **Authority:** Parent Codex, Architect and Acceptance Authority
- **Status:** Authorized for bounded local test reliability and verification only. No provider, deployment, domain, or production work is authorized.

## Accepted inputs

- PRE-G7-15 remains the accepted source baseline: `8becac4ea3e9decc91ca2807e2004a0aa0407105`, app tree `26d4885d4c76233168baaea52c5a33aca1ede594`.
- PRE-G7-16 is an unaccepted candidate, source commit `f71d1df028f80637abb3e427040f0e0f5085179c`, app tree `a19c817a7ebfa8962f0b898364ca01e8770e302a`. It adds only `fileParallelism: false` to the integration config and its domain mirror.
- Final PRE-G7-16 evidence head is `72d159b8e459db39c649d69ad219955ae586395f`. The PRE-G7-16 disposition is [here](../reviews/2026-10-15-pre-g7-16-parent-disposition.md).

Keep these revisions intact. Create a new source branch from the exact PRE-G7-16 source commit `f71d1df...`; evidence-only commits are not the source base.

## Trigger

PRE-G7-16 produced one default integration pass, 286/286, after its integration scheduling change, but did not reach the original two-consecutive-pass gate within its three-run cap. Its full unit run passed 326/327: `tests/unit/boundaries.test.ts` test "enforces integrated dependency boundaries" exceeded the unchanged five-second Vitest default and took 9.154 seconds. The same test file passed 18/18 in a focused run in 15.36 seconds. The failing test scans all `src` files and parses TypeScript imports. This is evidence of suite-context timing pressure, but the unit scheduling cause has not been isolated.

PRE-G7-16-C1 corrected evidence paths only; it made no source/test changes and introduced no test runs. Parent disposition requires this explicit packet before further full-suite work.

## Owned paths

Own only paths required for this unit and integration test gate:

- `app/tests/unit/boundaries.test.ts` only if a proven test implementation issue requires a coverage-preserving optimization
- `app/vitest.config.ts` only if unit-runner scheduling is demonstrated as the cause
- `app/vitest.integration.config.ts` only if a new integration scheduling defect is demonstrated
- corresponding paths under `yorayriniwnl.in/` and `yorayriniwnl.in/source-delivery-manifest.json` when source paths change
- `deliveries/G7/preparation/maker-evidence/pre-g7-17/`

Before editing, verify the domain mirror against the exact PRE-G7-16 source and preserve the declared `src/config/public-base-url.ts` override. Protected assets, camera/WebGL code, contracts, public content, and all accepted baselines remain unchanged.

## Required work

1. Diagnose the five-second boundary failure before editing. Preserve the exact failing test name and duration. Run the focused boundary test and one full default unit suite under Node `24.19.0` and pnpm `9.15.9`; collect worker/process and timing observations externally without modifying tests or suppressing console output. Do not assume parallel scheduling without evidence.
2. If the full unit suite passes unchanged, make no unit-config/source change. If the same unchanged boundary test times out again and observations show file-worker contention, a one-property `fileParallelism: false` change in `vitest.config.ts` and its mirror is authorized. If a more direct test implementation bottleneck is demonstrated, optimize only the owned test while preserving every assertion and discovered source path. Do not increase the 5,000 ms timeout, add retries, skip/only markers, mocks, or weaken coverage.
3. After the final source state, require a full default `pnpm run test:unit` pass: 327/327. A focused boundary pass is supplemental, never a substitute.
4. Close the integration gate on the exact final source. If no application source changes from `f71d1df...`, PRE-G7-16 attempt-03 (286/286, default command, exit 0) may serve as the first consecutive pass; run one fresh default `pnpm run test:integration` and require 286/286. If any application source/config changes, require two consecutive 286/286 default integration passes on the new source within at most three full-suite invocations. Preserve every attempt; after failures verify workers and database fixtures are idle before the next invocation.
5. Keep the default integration command, 60,000 ms test timeout, 90,000 ms hook timeout, the unit 5,000 ms default, all assertions and all tests. No special flags, timeout/retry overrides, test filtering for a gate result, skips, or reduced coverage.
6. Run lint and typecheck for any source/config correction. A production build is not required for test-only configuration changes. Preserve raw outputs, exit codes, runtime versions, hashes, exact source patch, test snapshot, mirror manifest and a report that distinguishes prior failures from new results.
7. Verify source/mirror parity, protected hashes, exact source/app tree and actual test-snapshot bytes. Commit and push the scoped source change and its separate final evidence delta. A local Codex audit substitute for Gemini #3 or GPT Plus #2 must be stated; parent acceptance remains separate.

## Boundaries

This packet does not retroactively change PRE-G7-16's exhausted cap or acceptance result. It defines a new successor verification gate only. If the required full unit and integration outcomes are not reached within these bounded runs, report them unresolved; do not issue an unbounded retry loop. G7 remains unaccepted. Physical-device validation and the user's Chrome GPU/WebGL state remain NOT RUN / NOT PROVIDED. Continue the local-only instruction; do not configure providers, change DNS/domains, deploy, or claim production readiness.
