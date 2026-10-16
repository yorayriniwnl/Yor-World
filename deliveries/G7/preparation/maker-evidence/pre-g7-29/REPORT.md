# PRE-G7-29 full-suite startup trace report

**Diagnostic result: FAIL / incomplete.** The one complete suite invocation passed all 6 tests, but no Playwright traces were captured. The startup stall was not reproduced in this run, and its cause remains unresolved.

## Source and build binding

The run used PRE-G7-28 source commit d86d3d68c34fcdff6319c7945c7d74e87ce81946, app tree 6ab180f831661e43cc035fe9d70eec67372dd708, and yorayriniwnl.in tree 7bb2e52b61c1161565816fac0b0e95194c9ff73c. The app and mirror performance test blobs were equal before and after the run. The detached worktree remained clean at the pinned commit.

Node 24.19.0 (binary SHA-256 3602f2bb1a10f2cbab4c36886218a33c1ab3db87290e73b033c46c77147d0237) and pnpm 9.15.9 were used. Frozen-lockfile installation passed with 404 packages added from cache and zero downloads. It emitted a Node url.parse deprecation warning.

The production build passed in 144.737 seconds with NEXT_PUBLIC_PRE_G7_13_EVIDENCE=1 as its only build flag. It produced build ID RaVS8E9Rdlg988UYqPwy2. The .next inventory binds 537 files, 3 symlinks, 101,878,699 bytes, and canonical inventory SHA-256 92e4fdc8942720e4638666b8111f7818a3a7d674bc83a9608eeb08f4152346cc. Build output is recorded in build/ and commands/.

## Full-suite result

One unfiltered invocation ran all six tests in the Chrome project with one worker, zero retries, the existing timeouts and thresholds, and port 3219. The JSON report records 6 expected, 0 unexpected, 0 skipped, 0 flaky, and 142.726 seconds. The runner elapsed time was 151.204 seconds. Every test passed:

| Test | Result | Duration |
| --- | --- | ---: |
| Dynamic public HTML payloads | PASS | 0.585 s |
| Five cold loads, desktop 1440x900 | PASS | 6.223 s |
| Five cold loads, mobile 390x844 | PASS | 5.440 s |
| Five cold loads, narrow 320x600 | PASS | 3.809 s |
| 60-second active interaction route and frame pacing | PASS | 77.143 s |
| Enter/exit resource stability over multiple studio cycles | PASS | 40.035 s |

The browser project was [chrome]. The installed Chrome executable reported version 155.0.8059.84. The Playwright test output also recorded a NO_COLOR/FORCE_COLOR warning; it did not fail the suite.

## Trace capture failure and limits

The packet intended to run pnpm run test:performance -- --trace on. The captured pnpm output shows Playwright was invoked with a literal separator before the trace option:

playwright test --config playwright.performance.config.ts "--" "--trace" "on"

The config's normal trace mode is off. No trace.zip was created, so there are no required-GLB request/response timelines or matching DOM snapshots for this run. The command receipt, raw stdout/stderr, Playwright JSON, per-test result JSON, and the Playwright last-run marker are preserved under attempt-01/.

This single run does not explain the earlier PRE-G7-28 stalls. It only shows that the exact six-test suite passed once and that the prior readiness failure did not recur. No root cause is claimed. The one-invocation limit is consumed; no test or trace rerun was made.

## Gate status

| Check | Result | Evidence |
| --- | --- | --- |
| Source commit, app tree, mirror tree | PASS | source-binding.json |
| Frozen dependency install | PASS | attempt-01/commands/dependency-install.* |
| Production build and output inventory | PASS | attempt-01/commands/production-build.* and attempt-01/build/ |
| Complete six-test suite, once | PASS, 6/6 | attempt-01/commands/performance-suite-trace.* and attempt-01/playwright/results/performance-results.json |
| Trace archive capture | FAIL / NOT CAPTURED | attempt-01/playwright/trace-capture-status.json |
| Startup stall diagnosis | NOT RUN / UNRESOLVED | No trace archives were produced |
| Product or test source edits | NONE | Detached source worktree remained clean |
| PRE-G7-28 acceptance | PENDING; remains FAIL / unaccepted | A P29 suite pass does not accept the candidate |
| External GPT Plus #2 audit and parent acceptance | PENDING | Project governance pipeline |

Physical-device, screen-reader, hosted-service, domain, deployment, and G7 checks remain NOT RUN.