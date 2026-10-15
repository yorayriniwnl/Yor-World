# PRE-G7-17 maker report

Worker identity: **local Codex substitute for Gemini #3 (runtime/integration maker)**. No external Gemini account performed this work. This is maker evidence, not an audit or acceptance.

## Disposition

The integration subgate passes with two consecutive default 286/286 runs on the final source. The required full-unit gate remains **FAIL/INCOMPLETE**: the final exact `pnpm run test:unit` invocation emitted the unchanged boundary-test timeout and exited 1, but the PowerShell wrapper terminated before a complete aggregate summary was captured. Do not infer a total from that partial output. The required 327/327 full-unit result was not established, so PRE-G7-17 and G7 remain unaccepted pending independent audit and parent disposition.

## Source and scope

The isolated branch is `codex/pre-g7-17-unit-boundary-verification-20261015`, based exactly on PRE-G7-16 source `f71d1df028f80637abb3e427040f0e0f5085179c` (app tree `a19c817a7ebfa8962f0b898364ca01e8770e302a`).

Source changes are in two scoped commits:

- `bb4d97973bba188a8bf681892ff7e8f2ccb926b1` sets only `fileParallelism: false` in `app/vitest.config.ts` and its domain mirror.
- `fc64a18a7ec1d027fb0a33400c2fcd6288d6afbf` adds the coverage-preserving snapshot/AST cache in `app/tests/unit/boundaries.test.ts` and its domain mirror.

Final source tree: `593f72ad5900dcfe8d5de0f0d0b2483dc8149709`; app tree: `0804688e4cdd55960e71a19efc8384d4a2f0d071`. The source branch head was pushed and verified against `origin` at `fc64a18a…` before the separate evidence commit.

The test helper caches the unfiltered `src` file snapshot (path and exact text) for both scans, then caches each parsed TypeScript AST/import list by exact `(filePath, text)`. The discovered source set remains 117 paths with the same sorted-path SHA-256 `41a41d3c89d684a322f5e81ae46ac472f06673f03e61f98d7f0ffa8e65a547e3` and traversal SHA-256 `d02064134564b5d071c611aa09d9457d87499b3ecaa41bbf3ecc5bfcc6975294`. All 13 test declaration lines and all 30 `expect(...)` lines match the accepted base exactly. No tests/assertions were removed or weakened, and no source path was excluded.

The unit timeout remains Vitest's default 5,000 ms. Integration remains `fileParallelism: false`, 60,000 ms test timeout and 90,000 ms hook timeout. No retries, timeout overrides, disabled assertions, or reduced test coverage were added. The integration config is unchanged from the base.

## Unit diagnosis and outcomes

The first default unit run before the unit scheduler change failed 325/327: two boundary tests timed out at the unchanged 5,000 ms limit (25/26 files passed; 59.14 s). External process sampling recorded up to 11 Vitest fork workers. The authorized `fileParallelism: false` change reduced file concurrency; a subsequent default full run still failed 326/327 at the same boundary bottleneck (25/26 files; Vitest 98.42 s; the failing body was observed at about 9.081 s).

After the cache optimization, the direct focused boundary invocation passed the selected test, with 17 other tests filtered by its selector; its Vitest duration was 8.31 s and no timeout override was supplied. A separate command intended to focus the test forwarded arguments incorrectly and actually ran the entire suite: 26/26 files and 327/327 tests passed in 58.40 s. This is preserved as a **non-gate supplemental pass**, not a focused result or the exact default command.

The final exact default `pnpm run test:unit` invocation emitted `tests/unit/boundaries.test.ts (18 tests | 1 failed)`, with the integrated dependency-boundary test at 8.783 s and file duration 9.594 s. It exited 1. PowerShell stopped the log wrapper on the native nonzero exit before the aggregate Vitest summary/receipt was written. The partial raw output, recovery receipt and captured wrapper error are preserved in `attempt-05/`. No additional unit-suite run was made. The full-unit gate is unresolved and the cache change did not establish the required default 327/327 result.

## Integration gate

The pre-run host check found no PRE-G7-17 worker, Vitest/integration process, or PostgreSQL process. `DATABASE_URL` and `YOR_GITHUB_TEST_DATABASE_URL` were unset; the optional SCP integration test therefore used in-memory PGlite. Its temporary fixture uses a unique `mkdtemp` path and local test listeners use OS-assigned port 0. The two runs created separate temp directories, which were closed after each run; historical temp directories were left untouched.

A separate `yor-talks-v3` Playwright/Vite job and a PRE-G7-13 build were observed as unrelated ambient activity. They used separate worktrees and no shared database, listener, or fixture was identified. No process was terminated.

| Invocation | Exact command | Result | Runtime |
| --- | --- | --- | ---: |
| Integration 01 | `pnpm run test:integration` | PASS, 27/27 files and 286/286 tests, exit 0 | Vitest 288.50 s; wrapper 320.255 s |
| Integration 02 | `pnpm run test:integration` | PASS, 27/27 files and 286/286 tests, exit 0 | Vitest 165.47 s; wrapper 170.135 s |

Both commands used Node 24.19.0 and pnpm 9.15.9, with no filters or timeout overrides. Post-run idle checks found no PRE-G7-17/Vitest integration/PostgreSQL processes. The integration subgate is met; the overall PRE-G7-17 unit-plus-integration gate is still unresolved because the full-unit result failed/incomplete.

## Validation and integrity

- Focused boundary test after optimization: PASS for the selected case; supplemental only.
- Full default unit after optimization: FAIL/INCOMPLETE; no aggregate total claimed.
- Lint: PASS, `eslint . --max-warnings=0`, exit 0, 313.697 s.
- Typecheck: PASS, `tsc --noEmit`, exit 0, 171.926 s.
- Production build: NOT RUN; only test-runner/test-helper paths changed.
- Source/delivery mirror: PASS for both test and unit config pairs; normalized bytes and Git blobs match. Raw byte-size differences are CRLF checkout conversions.
- Protected model/texture/contract audit: PASS, all 17 accepted Git blobs and raw SHA-256 values unchanged.
- `yorayriniwnl.in/source-delivery-manifest.json` is preserved byte-for-byte and its worktree SHA-256 (`2af6525d70510f4d3074dd95d48d762365f1b038bbac25db010f6da4f6155f06`) and Git blob (`a4a117eacc9ccecf5584a67c11be034723c143a8`) are verified. It is historical PRE-G7-13 provenance and binds source commit `8bc0db9b1572e3603000cbc657a3d04a3dabf0d7` / resulting app tree `7e5ca476b9b9b5544942a3f1229f540dd99b9d8e`; it is not current or source-bound to PRE-G7-17. Since this packet authorizes a manifest update only when delivered source paths change and this change touches only test configuration/helper paths, the manifest remains unchanged. The inventory records this historical status and verifies its bytes.
- Physical-device and user's Chrome/GPU checks: NOT RUN / NOT PROVIDED.

`source.patch`, raw logs, command receipts, input hashes, mirror/path-set checks, protected-hash audit, and host/fixture snapshots are retained beneath this directory. The evidence inventory lists each evidence file and the unchanged root source-delivery manifest, excluding only its own recursive hash. The source commit and evidence are separate. Parent audit and acceptance remain separate; no self-acceptance is claimed.