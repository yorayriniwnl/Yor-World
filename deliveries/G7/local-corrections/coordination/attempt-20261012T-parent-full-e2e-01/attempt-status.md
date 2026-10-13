# Interrupted full browser attempt

The first parent-owned full E2E run was interrupted after 39 of 248 cases. It started the production server without `YOR_E2E_FIXTURE` and `YOR_TEST_DATABASE_PATH`, so storage-dependent contact tests returned `STORAGE_UNAVAILABLE`. This is an environment/setup failure, not a product verdict. The run did not finish; no complete Playwright JSON report or final exit receipt exists. Raw partial console output is retained at `logs/playwright.log`.

The run also initially used a path relative to `app/`; this directory was moved intact to the repository-level coordination evidence root. The intended build was `OJPrYs4BfBEWD_ViCUPLq`; the binding receipt in this attempt is incomplete because the script looked under `app/app/.next`. A clean rerun uses a new attempt directory and the explicit isolated PGlite fixture.
