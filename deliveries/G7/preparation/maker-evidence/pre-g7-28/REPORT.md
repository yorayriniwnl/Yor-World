# PRE-G7-28 modal navigation harness report

**Gate result: FAIL; candidate remains unaccepted.** The in-dialog route locator is corrected and the focused four-cycle check passes, but the required complete performance suite failed twice. No performance assertion, retry setting, or timeout was relaxed.

## Reclassification and source identity

The original test change and evidence were pushed as PRE-G7-27 before the separately authorized PRE-G7-27 renderer-attribution packet was discovered. That packet owns `deliveries/G7/preparation/maker-evidence/pre-g7-27/` and permits no application-source changes. This report and the current directory are reclassified as PRE-G7-28. Existing source commit `d86d3d68` and prior evidence commit `e09a8438` remain in history with their original labels; the source is unchanged and captured command/result files retain the original output paths.

| Role | Commit | `app/` tree |
|---|---|---|
| PRE-G7-26 source base | `ffd4635242362774c7981f8d54405fd0ccb2b0c9` | `9895fcc5c09ba695674fc5ff0342f5afb35b3d0c` |
| PRE-G7-28 test candidate | `d86d3d68c34fcdff6319c7945c7d74e87ce81946` | `6ab180f831661e43cc035fe9d70eec67372dd708` |

The original task branch parent was `f2a9c4e8b7fd4ed17633ffb31a161ac25f792f2a`; the original packet commit was `a72f743b9963443ffff9dcbf83e6e608e7217566`. The only `app/` change from PRE-G7-26 is `app/tests/performance/world.spec.ts`. Its Git blob equals the mirrored `yorayriniwnl.in/tests/performance/world.spec.ts` blob. The app checkout matches the source commit. See `source/source-binding.json` and `source/mirror-parity-audit.json`.

## Change

The four-cycle test now finds Projects inside the active `Portfolio destinations and studio exit` modal navigation. The expected `/projects` route, HOME check, canvas and context teardown assertions, visibility diagnostic, four-cycle count, timeout, retries, filters, and all performance limits remain unchanged. No product UI, runtime, renderer, or asset changed.

## Validation

All captured commands used Node 24.19.0 and pnpm 9.15.9; `commands/pnpm-version.*` records the toolchain check. Raw stdout, stderr, and receipts are in `commands/`.

| Check | Result | Evidence |
|---|---|---|
| Focused four-cycle performance check | PASS, 1/1; all four cycles completed | `commands/cycle-focused-attempt-03.*`, `performance/focused-retry/enter-exit-stability.json` |
| Complete six-test performance suite, attempt 01 | FAIL, 4/6 | `commands/performance-full-attempt-01.*`, `performance/full/performance-results.json` |
| Complete six-test performance suite, attempt 02 | FAIL, 4/6 | `commands/performance-full-attempt-02.*`, `performance/full-retry/performance-results.json` |
| Typecheck | PASS | `commands/typecheck.*` |
| Lint | PASS | `commands/lint.*` |
| Source binding | PASS; one changed canonical test blob, mirror blob equal, app matches commit, room hash preserved | `source/source-binding.json` |
| Source/mirror audit | PASS; 130 pairs, zero Git-blob or normalized-content mismatches | `source/mirror-parity-audit.json` |

Both full-suite runs pass the dynamic payload check and all three five-cold-load checks. In each run the 60-second route and cycle test fail at the existing 15-second HOME readiness assertion while the UI reports `Loading chair fixture (required)...`. The corrected Projects locator is not reached. The first focused attempt also timed out at that readiness check; the later focused attempt passed all four cycles with durations of 18.531, 8.982, 9.734, and 11.616 seconds, observing canvas removal and context loss after every exit.

`performance/required-load-diagnostic.json` records a separate fresh browser visit that reached HOME. The three required GLBs returned HTTP 200 in 163 ms, 110 ms, and 84 ms. The optional interaction GLB returned HTTP 200 after 14.161 seconds and loaded after startup. There were no page errors or failed asset requests; the browser emitted one generic 404 console message whose endpoint was not identified. This diagnostic does not explain the full-suite-only readiness stall, so no product root cause is claimed.

The initial focused command-line invocation and first diagnostic script invocation failed before their intended checks because of PowerShell argument splitting and Node module resolution. Their receipts are retained; they are not counted as test results. Failing focused and full-suite browser outputs and error contexts are preserved without editing the test afterward.

## Open gate

PRE-G7-28 does not pass its required complete performance-suite gate. It remains unaccepted; resolve the suite-level readiness stall under a later bounded work order while retaining the existing assertion limits. Physical-device, screen-reader, hosted-service, deployment, independent-review, and parent-acceptance claims are **NOT RUN**. Do not deploy or accept this candidate.
