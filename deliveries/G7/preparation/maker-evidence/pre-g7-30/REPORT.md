# PRE-G7-30 full-suite trace recapture

**Diagnostic result: PASS (capture and review complete).** The one authorized, unfiltered performance-suite invocation passed all 6 tests and produced all 6 requested trace archives. The startup stall seen in PRE-G7-28 did not recur. Its cause remains unresolved because these successful traces do not explain the prior intermittent stalls.

## Source and build binding

The run is bound to the exact PRE-G7-28 candidate commit `d86d3d68c34fcdff6319c7945c7d74e87ce81946`, app tree `6ab180f831661e43cc035fe9d70eec67372dd708`, and `yorayriniwnl.in` tree `7bb2e52b61c1161565816fac0b0e95194c9ff73c`. The app and mirror performance-test blobs are identical (`d09b792f4a3f0b8c7af0e57e421cc0e7f0f4c7e7`), and the detached source worktree was clean.

The PRE-G7-29 production build was reused after the packet's exact preflight passed: build ID `RaVS8E9Rdlg988UYqPwy2`, canonical `.next` inventory SHA-256 `92e4fdc8942720e4638666b8111f7818a3a7d674bc83a9608eeb08f4152346cc`. Node 24.19.0, pnpm 9.15.9, and Chrome 155.0.8059.84 were recorded. No install or rebuild was performed for this packet.

## Command and suite result

The single command was `pnpm run test:performance --trace on`, passed through the pinned Node/Corepack launcher. Captured output confirms Playwright received `--trace on` directly, with no standalone separator. It ran the Chrome project with one worker, zero retries, port 3220, and the checked-in timeout and thresholds. The receipt records exit code 0 and 270.795 seconds elapsed; the Playwright JSON reports 265.586 seconds and 6 expected, 0 unexpected, 0 skipped, and 0 flaky tests.

| Test | Result | Duration |
| --- | --- | ---: |
| Dynamic public HTML payloads | PASS | 0.820 s |
| Five cold loads, desktop 1440x900 | PASS | 7.603 s |
| Five cold loads, mobile 390x844 | PASS | 7.212 s |
| Five cold loads, narrow 320x600 | PASS | 7.424 s |
| 60-second active interaction route and frame pacing | PASS | 114.691 s |
| Enter/exit resource stability over multiple studio cycles | PASS | 100.528 s |

## Startup trace review

Both required startup traces are source-bound in `attempt-01/playwright/startup-trace-analysis.json`. In the active-route trace, the first observed lifecycle state was LOADING at 14:24:42.898Z and HOME was observed at 14:24:55.573Z, 12.675 seconds later. Its captured DOM snapshots show 15% progress with 0/3 required assets at 14:24:42.750Z and “Loading resident avatar” at 14:24:42.827Z.

The enter/exit trace records four entry cycles, and every cycle reached HOME. LOADING-to-HOME times were 11.812, 11.229, 9.374, and 6.100 seconds. LOADING-to-ENTRANCE-to-HOME was visible in cycles 1 and 4; cycles 2 and 3 reached HOME without an ENTRANCE observation in the trace logs. Its captured progress snapshots show 0/3 required assets twice. “Loading chair fixture” does not appear in the inspected startup traces.

The active-route trace contains one request each for the required room, resident, and fixture GLBs and the optional interaction GLB. The cycle trace contains four requests each for those assets. Every captured response was HTTP 200; request durations ranged from 1.943 ms to 304.523 ms. These successful requests and HOME transitions establish that the earlier stall did not reproduce in this invocation. They do not establish the cause of the earlier stalls, so no root cause is claimed.

## Gate status

| Check | Result | Evidence |
| --- | --- | --- |
| Exact source and mirror binding; source worktree clean | PASS | `attempt-01/source/source-binding.json` |
| Reused build preflight | PASS | `attempt-01/source/build-preflight.json` and `attempt-01/build/preflight-current-next-inventory.json` |
| Correct trace-enabled command forwarding | PASS | `attempt-01/commands/performance-suite-trace.receipt.json` and raw stdout |
| Complete suite, one invocation | PASS, 6/6 | `attempt-01/playwright/results/performance-results.json` |
| All suite traces captured | PASS, 6 archives | `attempt-01/playwright/trace-archive-inventory.json` |
| Startup stall diagnosis | UNRESOLVED | Both startup tests reached HOME; cause not established |
| Application or test source edits | NONE | Exact detached source worktree remained clean |
| PRE-G7-28 candidate acceptance | PENDING; remains FAIL / unaccepted | P30 is diagnostic only |
| External GPT Plus #2 audit and parent acceptance | PENDING | Project governance pipeline |

The command receipt, raw stdout/stderr, Playwright last-run marker, six per-test result files, all six traces, source/build preflight, trace analysis, and SHA-256/Git-blob evidence inventory are preserved under this packet. Physical-device, screen-reader, hosted-service, domain, deployment, and G7 checks remain NOT RUN.
