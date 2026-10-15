# PRE-G7-18 maker closeout

Maker identity: **local Codex substitute for Gemini #3**, not the Gemini #3 account. This is maker evidence only; no self-audit or acceptance is claimed.

## Disposition

The single exact default `pnpm run test:unit` invocation on unchanged PRE-G7-17 source **FAILED**: 326/327 tests passed and 1/26 files failed. The integrated-boundary test reported the unchanged 5,000 ms timeout; its reported synchronous body duration was 68.215 s. The runner receipt has a blank PowerShell `.ExitCode` field, so the command exit is classified from raw pnpm output, which ends with `ELIFECYCLE Command failed with exit code 1`. The required PRE-G7-18 unit gate is **UNRESOLVED**.

No test-only source correction was made. The profiling performed here did not establish a direct 68-second bottleneck in the owned test implementation: a standalone profile of the same 117-path parse/import/client-graph algorithm measured 8.837 s on its initial cold pass, then 0.797 s on a subsequent warm pass. The separated warm measurements were 0.582 s TypeScript parse, 0.069 s AST visitation, 0.044 s client graph traversal, and 0.038 s in 649 existence checks. This variability and the gap from the failed test duration do not justify a targeted source edit. The packet requires a justified correction before another full run; attempt 02 was therefore **NOT RUN**. No focused test, lint, typecheck, build, or additional test suite was run.

## Candidate identity and scope

The isolated branch is `codex/pre-g7-18-unit-boundary-closeout-20261015`, based exactly on PRE-G7-17 source commit `fc64a18a7ec1d027fb0a33400c2fcd6288d6afbf`, source tree `593f72ad5900dcfe8d5de0f0d0b2483dc8149709`, and app tree `0804688e4cdd55960e71a19efc8384d4a2f0d071`. There is no source delta and no source commit. The complete source and domain-mirror test Git blobs both remain `c2353be846e7c34d2e0d7305f6240245db7f9078`; their worktree raw hashes differ because the Windows checkout uses CRLF in the domain mirror, while Git blobs match. Both also match the PRE-G7-18 base snapshots exactly.

The exact 117 discovered `src` path strings and both hashes match the PRE-G7-17 saved path list: sorted-path SHA-256 `41a41d3c89d684a322f5e81ae46ac472f06673f03e61f98d7f0ffa8e65a547e3` and traversal SHA-256 `d02064134564b5d071c611aa09d9457d87499b3ecaa41bbf3ecc5bfcc6975294`; there are zero added or missing paths. All test declarations and all 30 `expect(...)` source lines are unchanged because the complete test blobs match the base. The root `yorayriniwnl.in/source-delivery-manifest.json` remains unchanged historical PRE-G7-13 provenance. Its raw SHA-256 is `2af6525d70510f4d3074dd95d48d762365f1b038bbac25db010f6da4f6155f06` and Git blob is `a4a117eacc9ccecf5584a67c11be034723c143a8`; the archived copy matches both byte-for-byte and blob-for-blob.

Only evidence paths under `deliveries/G7/preparation/maker-evidence/pre-g7-18/` changed. No application runtime, configuration, integration test/configuration, content, contract, asset, timeout, or test assertion changed.

## Attempt 01 and diagnosis

The default command used Node `v24.19.0` and pnpm `9.15.9` without filters, flags, retries, or timeout overrides. It reported `Test Files 1 failed | 25 passed (26)` and `Tests 1 failed | 326 passed (327)`. The failing case is `enforces integrated dependency boundaries: HTML shell stays free of 3D and browser features stay free of server imports`. Vitest's unchanged default timeout is 5,000 ms; the raw output reports that the synchronous body finished at 68.215 s and the file at 73.502 s. Vitest's total duration was 198.60 s; the outer measured elapsed time was 229.126 s.

The external observer sampled `Get-Process node` every five seconds, with no WMI or test-code instrumentation: 44 samples, baseline 5 node processes, maximum 20 total, maximum 15 new since baseline, and maximum 17.9375 accumulated CPU seconds across those new nodes. These observations do not attribute the timeout to any specific external process or establish a code-level cause.

The standalone algorithm profiler found 117 source paths, 109 TypeScript parses, 87,378 AST nodes, 362 imports, 13 client modules, 126 graph visits, 283 relative/alias edges, and 649 `existsSync` checks. Initial profile: parse+visit 7.286 s, full module scan 7.729 s, client graph 0.770 s, `existsSync` subtotal 0.576 s, total 8.837 s. A follow-up profile separated parse from visitor after warm-up: parse 0.582 s, visitor 0.069 s, client graph 0.044 s, `existsSync` subtotal 0.038 s, total 0.797 s. Thus the measured algorithm did not reproduce the 68.215 s Vitest test-body duration. This is unresolved diagnostic evidence, not proof of an environment cause.

The original failed unit logs and process observations are preserved under `attempt-01/`. Additional profiler launch/setup errors and their recovery history are recorded under `attempt-01/diagnostic-attempt-history.md`; successful profile stdout/stderr and receipts are preserved separately. The offline frozen install passed with the pinned toolchain; its subsequent receipt-wrapper API error is preserved in `setup/pinned-install-wrapper-error.txt`.

## Evidence integrity

The source test/mirror pair matches the PRE-G7-17 blobs and the saved base snapshots; the root historical manifest and archived copy are byte-identical. The source path audit matches both PRE-G7-17 hashes and all 117 path strings. The final strict Node validation checks every evidence inventory entry and external manifest path for existence, byte size, raw SHA-256, and Git blob; it also parses every `.json` file strictly and rechecks mirror, path-set, and historical-manifest flags. Final validation outcome is recorded in `COMMANDS.md`.
## Other gates

- Unit attempt 01: **FAIL**, 326/327, raw output indicates exit 1.
- Unit attempt 02: **NOT RUN**; no directly supported correction was identified.
- Focused boundary test: **NOT RUN**.
- Lint and typecheck: **NOT RUN**; no source correction was made.
- Production build: **NOT RUN**; test-only diagnostic scope.
- Integration rerun: **NOT RUN**. PRE-G7-17's two consecutive default 286/286 integration passes carry forward for this unchanged source/app tree; this does not close the unit gate.
- Device/accessibility sessions: **NOT RUN**. User's Chrome/GPU state: **NOT PROVIDED**.
- Providers, deployment, DNS/domain, and production configuration: **NOT RUN**.

Parent audit and acceptance remain separate. PRE-G7-18 and G7 remain unaccepted pending the parent decision and an independently reviewed unit-gate disposition.