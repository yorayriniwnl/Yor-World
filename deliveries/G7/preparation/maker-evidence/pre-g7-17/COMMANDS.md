# PRE-G7-17 commands and receipts

All project checks ran from the isolated worktree's `app/` directory. Runtime: Node `v24.19.0`; pnpm `9.15.9`. The pinned executables were:

- `C:\Users\ayush\AppData\Local\Temp\yor-world-node-24.19.0\unpacked\node-v24.19.0-win-x64\node.exe`
- `C:\Users\ayush\AppData\Local\pnpm\store\v11\links\@\pnpm\9.15.9\3d51f653a61d6f9b811790f44bb80b908ca8d24c424e6e53e491ea81b7f96a43\node_modules\pnpm\bin\pnpm.cjs`

For each invocation the pinned Node executable ran the pinned pnpm CJS file. The pinned Node directory was placed first on `PATH` so pnpm-launched child processes also used Node 24.19.0. Setup output and exit code are in `setup/pinned-install.log` and `setup/pinned-install.exit-code.txt`; frozen install exited 0. The install log includes npm's `strict-peer-dependencies` config warning, which did not fail installation.

| Command from `app/` | Result | Receipt / raw output |
| --- | --- | --- |
| `pnpm run test:unit` before unit scheduling change | FAIL, 325/327; two 5 s boundary timeouts, 25/26 files | `attempt-02/unit-suite-run.txt`, `attempt-02/unit-suite.log` |
| `pnpm run test:unit` after `fileParallelism: false`, before cache | FAIL, 326/327; same boundary timeout, 25/26 files; 111.470 s wrapper | `attempt-03/unit-suite-final-run.txt`, `attempt-03/unit-suite-final.log` |
| `pnpm run test:unit -- tests/unit/boundaries.test.ts -t "enforces integrated dependency boundaries"` | **Non-gate supplemental**: argument forwarding ran all 327 tests and all passed; 58.40 s Vitest | `attempt-04/focused-boundary-run.txt`, `attempt-04/focused-boundary.log`, `attempt-04/unit-wrapper-misrouted-classification.txt` |
| `pnpm exec vitest run --config vitest.config.ts tests/unit/boundaries.test.ts -t "enforces integrated dependency boundaries"` | PASS, one selected test; 17 others filtered by selector; 8.31 s Vitest | `attempt-04/focused-boundary-direct-run.txt`, `attempt-04/focused-boundary-direct.log` |
| `pnpm run test:unit` exact default after cache | FAIL/INCOMPLETE, exit 1; boundary test 8.783 s, file 9.594 s; aggregate summary not captured | `attempt-05/unit-suite-final-default-recovery-receipt.txt`, `.log`, and `-wrapper-error.txt` |
| `pnpm run lint` (`eslint . --max-warnings=0`) | PASS, exit 0, 313.697 s | `attempt-06/lint-run.txt`, `attempt-06/lint.log` |
| `pnpm run typecheck` (`tsc --noEmit`) | PASS, exit 0, 171.926 s | `attempt-06/typecheck-run.txt`, `attempt-06/typecheck.log` |
| `pnpm run test:integration` invocation 01, default | PASS, 27 files / 286 tests, exit 0; Vitest 288.50 s; wrapper 320.255 s | `attempt-08/integration-default-01-run.txt`, `.log` |
| `pnpm run test:integration` invocation 02, default | PASS, 27 files / 286 tests, exit 0; Vitest 165.47 s; wrapper 170.135 s | `attempt-09/integration-default-02-run.txt`, `.log` |

The integration config's 60,000 ms test timeout, 90,000 ms hook timeout, and `fileParallelism: false` are unchanged. No build was run because only Vitest configuration and a unit-test helper changed. No test command was issued after integration invocation 02.

Evidence-only checks and their results are retained in `attempt-04/`, `attempt-07/`, and `attempt-10/`. `attempt-10/source.patch` is the exact `git diff --binary --full-index` from base `f71d1df028f80637abb3e427040f0e0f5085179c` to source `fc64a18a7ec1d027fb0a33400c2fcd6288d6afbf`, scoped to the unit/integration Vitest configuration and unit boundary test mirror paths.