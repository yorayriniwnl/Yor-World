# PRE-G7-34 — startup CPU attribution

- **Date:** 2026-10-16 (Asia/Calcutta)
- **Authority:** Parent Codex, continuing the user's full-site repair authorization
- **Status:** Authorized, source-bound browser diagnosis-only packet
- **Branch:** `codex/pre-g7-34-startup-cpu-attribution-20261016`
- **Branch parent:** `95e6dc912adff1cecb14bc1993d6620bcce696df` (PRE-G7-33 evidence)
- **Frozen application source:** PRE-G7-31 commit `bd01478617b4166866f3f44196c56fc5add94acd`
- **Frozen app tree:** `3975e40c59a04b8696efa2ca3605eb37a0617165`
- **Frozen domain-mirror tree:** `8c34adf791c678a4e9e8bfe90f92426026994e68`
- **Reused build:** PRE-G7-33 production build in `D:\p33\app`, build ID `ksG7LoWL4qW1WtybQH4gz`, `BUILD_ID` SHA-256 `c09ccc6e505742ebb0f3fb6e8126e96296e209b46bc05ea584e56a0ea4baa138`
- **Output owner:** `deliveries/G7/preparation/maker-evidence/pre-g7-34/`
- **Boundary:** Local read-only diagnosis. No product source, test source, model asset, dependency, threshold, timeout, quality-policy, deployment, or acceptance change.

## Why this packet exists

PRE-G7-32's one full performance invocation failed the existing 15-second HOME assertion while the required chair-fixture loading stage remained visible. PRE-G7-33 captured the exact PRE-G7-31 source in headless Chrome and observed the route reach `HOME`, but its browser `PerformanceObserver` recorded main-thread long tasks of 11.784 and 9.099 seconds with `unknown` attribution. The first task started 60 ms before the optional interaction GLB's recorded response end, so the capture did not establish that optional parsing caused the stall. PRE-G7-28 and PRE-G7-30 also show intermittent success without identifying a blocking function.

The next step is one Chrome DevTools Protocol CPU profile over the same route and the already-built PRE-G7-33 artifact. This can associate sampled JavaScript frames with the long-task window without changing the frozen app or repeating the performance suite. Profiling overhead can affect timings; this packet is for attribution only and cannot pass a performance gate.

## Authorized work

1. Confirm the pinned Node `24.19.0` / pnpm `9.15.9`, clean tracked paths in both the P34 worktree and reused P33 worktree, exact source commit/app/domain trees, and the existing P33 build ID. Do not rebuild or install packages. Do not modify the P33 worktree.
2. Add one standalone packet-owned diagnostic under `deliveries/G7/preparation/maker-evidence/pre-g7-34/`. It may start the existing P33 production server on port `3222`, launch headless Chrome `155.0.8059.84`, begin a CDP `Profiler` recording before navigation, observe `/?studio=1` for up to 40 seconds, and record lifecycle state, loading stage/progress, long tasks, animation-frame gaps, console/page errors, request timing, browser/runtime versions, a screenshot, a Playwright trace, and the raw CPU profile.
3. Run that diagnostic exactly once. Preserve the exact command, exit code, profile, screenshot, trace, and server stdout/stderr. Do not retry or repeat if startup stalls, profiler data is incomplete, or the profile capture fails.
4. Analyze sampled stacks against the two PRE-G7-33 long-task windows and identify named modules/functions and their sampled self/total time where the profile supports it. Keep the raw profile. If frame attribution is insufficient or profiler overhead makes the timeline incomparable, report `UNRESOLVED`.
5. Compare with PRE-G7-28, PRE-G7-30, PRE-G7-32, and PRE-G7-33 evidence. A source fix is permitted only after a separate packet states the precise evidence-backed correction and regression scope.

Do not edit `app/`, `yorayriniwnl.in/`, tests, assets, dependencies, lockfiles, build output, performance budgets, browser configuration, assertions, retries, or timeouts. Do not run any test suite or the full performance suite. Do not perform acceptance, external review, merge, or deployment under this packet.

## Evidence and exit boundary

Bind every capture to source commit `bd01478617b4166866f3f44196c56fc5add94acd`, app tree `3975e40c59a04b8696efa2ca3605eb37a0617165`, domain tree `8c34adf791c678a4e9e8bfe90f92426026994e68`, and reused build ID above. Record the P33 build receipt and the P34 preflight that verifies the build file and frozen Git trees. Include a strict SHA-256 / byte-length / Git-blob inventory for the report, scripts, preflight, command receipts/output, CPU profile, trace, screenshot, and server output.

The PRE-G7-31 candidate remains unaccepted and undeployed. This packet cannot close the separate GPT Plus #2 audit or human visual review. If the profile identifies a likely cause, prepare a separate bounded correction packet before any product-source change. If not, preserve `UNRESOLVED` and state which attribution evidence is missing.
