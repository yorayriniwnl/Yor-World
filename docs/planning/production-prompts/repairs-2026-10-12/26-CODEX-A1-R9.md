# FINISH-48 — A1-R9 maker prompt

You are the assigned platform maker for this evidence-only correction. Follow `AGENTS.md`, `START_HERE.md`, and [FINISH-48](../../reconciliation-packets/2026-10-12-finish-48-a1-browser-environment-binding-correction.md). Start from exact FINISH-A1-R8 commit `e377e06c514819ee6dbd82da2216c95813bedd2f` and preserve every predecessor byte-for-byte.

Create a new `deliveries/FINISH-A1-R9/` package and branch. Make no application, test, dependency, or predecessor-receipt changes. Recreate the exact R8 source patch in fresh scratch and rerun both scoped Chromium cases from FINISH-48: absent-draft with fixture and omission flags, and normal authoring/publishing with omission unset. Give each run a different fresh temporary PGlite directory in `YOR_TEST_DATABASE_PATH`. Record the exact path or a hash-bound isolated-temp-directory identity in each browser receipt; the prior R8 binding omitted this field.

Bind raw Git inputs, source/app tree, R8 patch, lock, build ID, browser and Playwright versions, command, cwd, UTC start, exit, test totals, result JSON, screenshots and raw logs. Verify the R9 output manifest against raw Git, exact R8 parent, canonical app unchanged, and changed paths limited to the new R9 delivery. Rerun no unrelated app suites. Mark production Auth/Storage, deployed routes, devices and assistive technology NOT RUN.

Return `report.md`, candidate/input/output bindings, per-run browser receipts, real logs and captures, and a check matrix. Commit and push only the new R9 package. Stop at delivery for independent exact-candidate audit and Parent acceptance; do not integrate or claim A1 completion.
