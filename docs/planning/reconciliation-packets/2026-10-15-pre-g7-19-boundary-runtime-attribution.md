# PRE-G7-19 — boundary-test runtime attribution

- **Date:** 2026-10-15 (Asia/Calcutta)
- **Authority:** Parent Codex, Architect and Acceptance Authority
- **Status:** Authorized for one instrumented focused diagnosis, at most one justified test-only correction, and one exact default unit-gate attempt.
- **Project boundary:** Local-only. No providers, DNS/domain work, deployment, or production-readiness claims.

## Inputs and candidate

- PRE-G7-17 source base: `fc64a18a7ec1d027fb0a33400c2fcd6288d6afbf`; app tree `0804688e4cdd55960e71a19efc8384d4a2f0d071`.
- PRE-G7-18 final evidence: `ce7cb39a09f7829f0f25ed2147cfcbc35a11d82a`; its single exact default run failed 326/327. The boundary-test body was reported at 68.215 s against the unchanged 5,000 ms timeout.
- PRE-G7-18 profiling measured a cold standalone scan at 8.837 s and a warm pass at 0.797 s, without reproducing the 68.215 s Vitest body. Its optional standalone matcher probe did not run because the package could not be resolved. No cause was established; do not attribute the delay to the host or a particular operation without new evidence.

Create a fresh isolated source branch directly from `fc64a18...`, not from an evidence commit. Preserve all prior source and evidence revisions. Use pinned Node `24.19.0` and pnpm `9.15.9`.

## Owned paths and protections

Own only:

- `app/tests/unit/boundaries.test.ts`, only for temporary timing instrumentation and, if justified, one coverage-preserving correction
- `yorayriniwnl.in/tests/unit/boundaries.test.ts`, kept byte-identical at the Git-blob level to the source test
- `deliveries/G7/preparation/maker-evidence/pre-g7-19/`

Do not change test-runner configuration, timeouts, scripts, integration paths, runtime code, contracts, content, assets, or `yorayriniwnl.in/source-delivery-manifest.json`. Keep the historical manifest byte-identical.

## Authorized sequence and hard run caps

1. Read the exact PRE-G7-18 source, receipts, profiler output, and observer samples. Confirm the 117-path set, current mirror state, and that the source remains at the specified base.
2. Make temporary diagnostic-only instrumentation in the owned boundary test and its mirror, keeping the pair byte-identical throughout. It may record cumulative wall and process-CPU time for source discovery/read, TypeScript parsing, AST traversal, import resolution, module validation, and boundary-test body total. Avoid per-node logging or matcher work that changes the algorithm. Preserve all original test assertions and behavior. Record the instrumentation patch, then restore the test and mirror before any final candidate commit unless a separate source correction is justified.
3. Run **at most one** focused Vitest invocation for only the integrated-boundary test with its unchanged 5,000 ms default timeout. This is diagnostic only, never the required suite gate. Capture raw stdout/stderr, command, versions, process samples, exit evidence, and timing data. Do not run another diagnostic/focused invocation to replace a failed or incomplete receipt.
4. If and only if the instrumented run establishes a direct, correctable bottleneck in the owned test implementation, make at most one coverage-preserving correction in that test and its mirror. Keep all test declarations, assertions, discovered source paths, import kinds, traversal, forbidden-boundary checks, and thrown errors semantically intact. No skips, retries, mocks, exclusions, timeout changes, or runner flags. If the profile does not establish a direct source bottleneck, make no source change.
5. After a justified correction, run **at most one** focused test at the unchanged timeout. It is supplemental and must not be rerun. If no correction is made, do not spend this post-correction focused allowance.
6. Run **exactly one final default** `pnpm run test:unit` invocation on the final candidate, without filters, flags, retries, or timeout changes. This is the only required unit-gate attempt in PRE-G7-19. The required result is 327/327. If it fails or is incomplete, stop and report the gate unresolved; no second default invocation is authorized.
7. If source/test code changed, run lint and typecheck after the correction. A production build is not required. Do not rerun integration: PRE-G7-17's two 286/286 default integration passes carry forward only if the final delta is limited to the owned unit-test path and mirror.
8. Verify exact source/app identity, mirror parity, all 117 paths, unchanged test declarations/assertions, protected hashes, unchanged historical manifest, candidate-specific mirror evidence, test-snapshot bytes, raw outputs, versions, exit results, and evidence inventory. Commit/push a scoped source delta only if one exists, then a separate evidence commit; verify remote refs. If no source correction is justified, keep the source base unchanged and push only evidence.
9. Identify the maker as the local Codex substitute for Gemini #3 and the independent reviewer as the local Codex substitute for GPT Plus #2 when those external accounts are unavailable. The reviewer stays read-only; parent acceptance remains separate.

## Required disposition

The unit gate passes only on one exact default 327/327 result at the final source. Focused runs and profiler timings do not substitute. Preserve unresolved timing uncertainty honestly; process counts do not prove causation. Physical-device/accessibility checks remain **NOT RUN**, and the user's browser GPU state remains **NOT PROVIDED**. PRE-G7-18 remains closed not accepted; this packet does not revise that ruling or make G7 accepted.
