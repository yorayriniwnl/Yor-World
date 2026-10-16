# PRE-G7-29 - Full-suite startup trace

- **Date:** 2026-10-16 (Asia/Calcutta)
- **Authority:** Parent Codex, continuing the user's full-site repair authorization
- **Status:** Authorized, local diagnostic only
- **Output owner:** deliveries/G7/preparation/maker-evidence/pre-g7-29/
- **Parent source gate:** PRE-G7-28 remains FAIL / unaccepted

## Objective and boundary

Identify where the PRE-G7-28 full performance suite stalls before HOME by preserving one full suite run with Playwright traces. Correlate required GLB request and response timing with the recorded loading DOM and lifecycle state. State only what the trace supports; a completed response alone does not establish that parsing or integration completed.

This packet authorizes no product or test source edits, asset changes, timeout or assertion changes, retry, filtered rerun, repair, deployment, G7 state change, or acceptance. If the build or suite fails, preserve the first outcome and stop after the single invocation. Playwright may continue to its already-defined remaining tests after a test failure in that same invocation.

## Frozen source and prior evidence

- **Exact source:** PRE-G7-28 commit d86d3d68c34fcdff6319c7945c7d74e87ce81946.
- **Exact app/ tree:** 6ab180f831661e43cc035fe9d70eec67372dd708.
- **Exact yorayriniwnl.in/ tree:** 7bb2e52b61c1161565816fac0b0e95194c9ff73c.
- PRE-G7-28 changes only the in-dialog Projects locator in app/tests/performance/world.spec.ts, mirrored byte-for-byte. Its product candidate remains unaccepted.
- Prior full-suite evidence: deliveries/G7/preparation/maker-evidence/pre-g7-28/REPORT.md and the two result trees under performance/full/ and performance/full-retry/.
- Exact prior failure snapshots differ: attempt 01 shows the active-route and cycle tests at "Loading chair fixture"; attempt 02 shows active-route at "Loading resident avatar" and cycle at "Loading chair fixture". This packet records those per-attempt contexts; the generic sentence in the PRE-G7-28 report that describes both attempts as chair-fixture stalls omits that difference.
- The separate PRE-G7-28 required-load diagnostic reached HOME and observed HTTP 200 for the three required GLBs, but it did not exercise the failing full-suite sequence and did not explain the stall.

## Authorized procedure

1. Create a clean detached worktree at the exact source commit above. Record and verify its app/ and yorayriniwnl.in/ Git trees before any command. Keep all generated output outside tracked source paths. Install dependencies from the unchanged lockfile using Node 24.19.0 and pnpm 9.15.9; record the exact command and result.
2. Run one production build from app/ with only the existing NEXT_PUBLIC_PRE_G7_13_EVIDENCE=1 build flag. Do not add other build environment flags. Preserve stdout, stderr, exit code, environment, source identity, .next/BUILD_ID, and a per-file hash inventory of the resulting .next tree. If the build fails, stop without a retry.
3. Run the complete six-test performance suite exactly once from the built source with the command pnpm run test:performance -- --trace on. Use the existing config unchanged: Chrome project with CI unset, one worker, zero retries, 180-second test timeout, existing 15-second HOME assertion, 60-second web-server startup limit, and current test thresholds. Use port 3219 and an absolute C3_EVIDENCE_DIR under this packet's attempt directory. The config itself sets NEXT_TELEMETRY_DISABLED=1 for its web server; do not add other test environment flags. The sole diagnostic option is --trace on.
4. Preserve the full stdout/stderr and command receipt, Playwright JSON report, all six trace archives, browser/tool versions, non-secret environment, and source/build bindings. Inspect the two readiness failures' network events and DOM snapshots for required GLB request start, response and finish timing, loading text/progress, and lifecycle state. If the trace does not establish a cause, report the diagnosis as unresolved.
5. Do not rerun any test or command after a failure, repair generated output, or change the worktree source. Mark missing traces and any remaining suite rows explicitly. Leave the detached source worktree at the pinned commit; only the P29 evidence directory and this documentation/index update may be committed and pushed.

## Exit and review

P29 is a diagnostic, not a performance pass. The P28 product gate remains FAIL / unaccepted even if the trace run completes. The diagnostic is complete only when the one invocation and source/build bindings are preserved; otherwise report FAIL / incomplete with the first failure and all NOT RUN items. Do not authorize a source correction from an unsupported inference. A separately bounded packet is required for any product or test edit. Parent acceptance and external GPT Plus #2 audit remain pending under the project governance pipeline.

Physical-device, screen-reader, hosted-service, domain, deployment, and G7 checks remain NOT RUN. This packet does not authorize them.