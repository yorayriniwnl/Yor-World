# PRE-G7-28 — modal route locator evidence reclassification

- **Date:** 2026-10-16 (Asia/Calcutta)
- **Authority:** Parent Codex, continuing the user's full-site repair authorization
- **Status:** Reclassification of an already pushed local test candidate and evidence; candidate remains **FAIL / unaccepted**
- **Source commit:** `d86d3d68c34fcdff6319c7945c7d74e87ce81946`, app tree `6ab180f831661e43cc035fe9d70eec67372dd708`
- **Source base:** PRE-G7-26 commit `ffd4635242362774c7981f8d54405fd0ccb2b0c9`, app tree `9895fcc5c09ba695674fc5ff0342f5afb35b3d0c`
- **Original task branch parent:** `f2a9c4e8b7fd4ed17633ffb31a161ac25f792f2a`
- **Boundary:** Documentation and evidence path correction only. No new application source edit, deployment, or acceptance.

## Why this is PRE-G7-28

The modal-navigation locator correction was initially packeted and evidenced as PRE-G7-27 on the PRE-G7-25 branch. A separate, earlier PRE-G7-27 packet already exists on `codex/pre-g7-27-attribution-capture-20261016`. That packet owns `deliveries/G7/preparation/maker-evidence/pre-g7-27/` and permits no application source changes.

This reclassification preserves the pushed locator source commit and test results, moves the current evidence directory to `pre-g7-28/`, and gives the current branch one unambiguous packet index. The original commits `a72f743b` (initial packet), `d86d3d68` (test source), and `e09a8438` (initial evidence) remain in history; their original labels and output paths are not rewritten. Captured receipts and Playwright metadata retain the original `pre-g7-27` output paths because those are the paths used during the recorded runs.

## Source delta

The source delta from PRE-G7-26 is one locator in `app/tests/performance/world.spec.ts`, mirrored byte-for-byte at `yorayriniwnl.in/tests/performance/world.spec.ts`. The four-cycle test uses the existing `Portfolio destinations and studio exit` navigation inside the active modal. Product UI, runtime, renderer, assets, interaction sequence, timeout, retries, filters, and performance thresholds are unchanged.

## Evidence and gate

The full six-test performance suite was captured twice with Node 24.19.0 and pnpm 9.15.9; each run passes four tests and fails the active-route and cycle tests at the existing 15-second HOME readiness assertion while the studio reports the chair fixture loading stage. A focused cycle run passes all four enter/exit cycles. Typecheck, lint, source binding, and 130-pair mirror parity pass. A separate browser diagnostic reaches HOME and receives all three required GLBs with HTTP 200, but it does not explain the full-suite-only stall.

The complete performance-suite gate remains **FAIL**. No timeout or assertion was relaxed. See `deliveries/G7/preparation/maker-evidence/pre-g7-28/REPORT.md` and `source/source-binding.json` for exact commands, raw output, source identity, and hashes.

PRE-G7-28 is not accepted or deployed. The suite-level readiness stall needs a later bounded work order before any correction. Physical-device, screen-reader, hosted-service, deployment, independent-review, and parent-acceptance claims remain **NOT RUN**.
