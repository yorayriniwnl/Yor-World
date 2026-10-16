# PRE-G7-27 — use the active modal's navigation in the performance harness

- **Date:** 2026-10-16 (Asia/Calcutta)
- **Authority:** Parent Codex, continuing the user's full-site repair authorization
- **Status:** Authorized bounded performance-test locator correction
- **Branch parent:** `f2a9c4e8b7fd4ed17633ffb31a161ac25f792f2a`
- **Canonical input source:** `ffd4635242362774c7981f8d54405fd0ccb2b0c9`, app tree `9895fcc5c09ba695674fc5ff0342f5afb35b3d0c`
- **Boundary:** Performance test and exact source/evidence only. No product UI, service, domain, DNS, deployment, production operation, or acceptance changes.

## Evidence and contract

PRE-G7-26 removes the optional texture/proxy wait and its original performance run passes the 60-second active route. The preserved four-cycle result reaches the exit click, then times out because it targets `Primary navigation` outside the open native `showModal()` studio dialog. That outside page content is inert by modal contract. The dialog already exposes its own `Portfolio destinations and studio exit` navigation, including Projects. See `deliveries/G7/preparation/maker-evidence/pre-g7-26/performance/` and `performance/performance-results.json`.

The test should exercise the route exit available while the modal is active. This packet authorizes changing only the navigation locator in the performance test to use that existing in-dialog Projects link.

## Owned paths

- `app/tests/performance/world.spec.ts`
- matching `yorayriniwnl.in/tests/performance/world.spec.ts`
- `deliveries/G7/preparation/maker-evidence/pre-g7-27/`
- `yorayriniwnl.in/README.md` and `source-delivery-manifest.json`
- this packet and the narrowly related delegation index entry

Keep `app/` canonical. Base the test delta on PRE-G7-26 source commit `ffd4635242362774c7981f8d54405fd0ccb2b0c9`; branch parent is the evidence commit above. Bind the changed Git blobs and source/mirror parity, then push the test source commit before the separate evidence commit.

## Authorized correction

1. Change the cycle-test route-exit locator to find the Projects link within the existing `Portfolio destinations and studio exit` navigation in the active dialog.
2. Keep the expected `/projects` route, each HOME entry check, context-loss/cleanup checks, diagnostics, interaction sequence, cycle count, test timeout, retry count, filters, and all performance thresholds unchanged.
3. Do not alter the product dialog, global navigation, CSS stacking, canvas pointer policy, runtime, assets, or renderer. Do not make content outside the modal interactive.
4. Preserve the PRE-G7-26 failing output. Capture the full unchanged performance suite against the new test source; all six tests and all four enter/exit cycles must pass. Preserve output and any failure without relaxing the test.

## Required evidence

Use a fresh `pre-g7-27` evidence directory. Record source identity and changed Git blobs, mirror parity, raw command receipts, and the Playwright JSON and per-cycle resource report. Run the unchanged performance suite with its original configuration, using only the evidence-output directory variable. Run focused performance-test checks, typecheck, and lint. Use the project's pinned Node 24.19.0 and pnpm 9.15.9. Do not modify tests after the captured passing run.

Physical-device, screen-reader, hosted-service, deployment, independent-review, and parent-acceptance claims remain **NOT RUN** unless performed under their governing workflows. Do not deploy or accept this candidate.
