# PRE-G7-30 - Full-suite trace recapture

- **Date:** 2026-10-16 (Asia/Calcutta)
- **Authority:** Parent Codex, continuing the user's full-site repair authorization
- **Status:** Authorized, local diagnostic only
- **Output owner:** deliveries/G7/preparation/maker-evidence/pre-g7-30/
- **Parent source gate:** PRE-G7-28 remains FAIL / unaccepted

## Objective and boundary

Capture one full PRE-G7-28 performance-suite run with Playwright traces after PRE-G7-29's single run passed all six tests but produced no trace archives. The previous run's output shows that pnpm forwarded a literal separator before the trace option. For this attempt, pass the Playwright option directly after the script name using the pnpm run argument form documented by pnpm: https://pnpm.io/cli/run.

This packet authorizes no product or test source edits, asset changes, timeout or assertion changes, retry, filtered run, repair, deployment, G7 state change, or acceptance. Do not start a second suite invocation. If the preflight source/build binding fails, stop before running the suite. If the suite or trace capture fails, preserve its first result and stop without a retry. The test runner may finish the already-enumerated tests after any failure inside the one invocation.

## Frozen source, build, and P29 result

- **Exact source:** PRE-G7-28 commit d86d3d68c34fcdff6319c7945c7d74e87ce81946.
- **Exact app tree:** 6ab180f831661e43cc035fe9d70eec67372dd708.
- **Exact yorayriniwnl.in tree:** 7bb2e52b61c1161565816fac0b0e95194c9ff73c.
- PRE-G7-28 changes only the in-dialog Projects locator in app/tests/performance/world.spec.ts, mirrored byte-for-byte. The candidate remains unaccepted.
- PRE-G7-29 evidence commit: 48fb0850170091bc7822a227567a2476441ba461. Its report is deliveries/G7/preparation/maker-evidence/pre-g7-29/REPORT.md.
- PRE-G7-29's complete suite passed 6/6, but no trace archive was captured because its invoked command contained a literal separator before --trace on. That run did not diagnose the earlier stalls.
- Reuse the production build from PRE-G7-29 only if preflight verifies build ID RaVS8E9Rdlg988UYqPwy2 and the complete .next inventory digest 92e4fdc8942720e4638666b8111f7818a3a7d674bc83a9608eeb08f4152346cc against deliveries/G7/preparation/maker-evidence/pre-g7-29/attempt-01/build/next-output-inventory.json. The detached source worktree must still be clean at the exact commit. Do not rebuild or reinstall.

## Authorized procedure

1. Revalidate the detached worktree at C:\p29-diagnostic-20261016: exact source commit, app and mirror trees, equal performance-test blobs, clean tracked tree, build ID, and canonical .next inventory digest. Record hashes and tool versions. If any source/build value differs, stop and report the discrepancy without repairing it.
2. Use Node 24.19.0 and pnpm 9.15.9 already bound by PRE-G7-29. Run exactly one unfiltered full-suite invocation from app/ with this command form: pnpm run test:performance --trace on. Through the pinned Node/Corepack launcher, the arguments after pnpm@9.15.9 must be run, test:performance, --trace, on; do not insert a standalone -- argument. Use port 3220 and an absolute C3_EVIDENCE_DIR beneath this packet's attempt directory. Keep CI unset. Unset NEXT_PUBLIC_PRE_G7_13_EVIDENCE, NEXT_TELEMETRY_DISABLED, and NODE_OPTIONS in the caller; the existing webServer config sets NEXT_TELEMETRY_DISABLED=1 for its child.
3. Keep the checked-in performance config, one worker, zero retries, Chrome project, 180-second test timeout, 15-second HOME assertions, 60-second web-server limit, and all existing thresholds unchanged. The command output must show Playwright invoked as playwright test --config playwright.performance.config.ts --trace on. If it shows an extra separator or the trace argument is not applied, preserve the single result and report FAIL / incomplete; do not try again.
4. Preserve the command receipt, full raw stdout/stderr, Playwright JSON result, per-test JSON files, Playwright last-run file, and every generated trace archive. At minimum, a trace must exist for each startup-dependent test: active interaction route and multi-cycle enter/exit. Preserve all other traces generated as well. Record actual trace file count and hashes; do not assume absent archives are present.
5. Inspect the active-route and cycle traces for required GLB request start/response/finish events, DOM loading text and progress, and lifecycle transitions around HOME. State a root cause only if these artifacts establish it. If HOME is reached in this invocation, record that the earlier stall did not reproduce; a passing run without a supported cause remains unresolved.
6. Leave application and mirror source unchanged. Only this packet's evidence directory and the documentation/index update may be committed and pushed.

## Exit and review

P30 is diagnostic only. It does not accept PRE-G7-28, even if this run passes. The trace diagnosis is complete only if the command is forwarded as specified and the required startup-test traces are preserved and source-bound. Otherwise report FAIL / incomplete, include all captured output, and stop. Any product or test change needs a separate bounded packet. Parent acceptance and external GPT Plus #2 audit remain pending under project governance.

Physical-device, screen-reader, hosted-service, domain, deployment, and G7 checks remain NOT RUN.
