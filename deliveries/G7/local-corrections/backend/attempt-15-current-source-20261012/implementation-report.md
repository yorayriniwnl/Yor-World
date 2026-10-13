# Backend current-source regression report — attempt 15

Date: 2026-10-12. Branch `fix/local-studio-check`, source commit `3f0b47c78b3322f1d2be3d048620bd86e4b32f0f`.

The assigned backend source paths (`app/src/server`, contact/events/admin-media routes, `app/supabase/migrations`, and `app/tests/integration/platform`) have no worktree changes at this source commit. This is a current-source regression recheck, not a new backend implementation delta.

- **PASS** — embedded-database backend suite: `commands.txt`, raw `backend-integration.log`, exit `backend-integration.exit-code.txt`; 12 files, 210/210 tests passed. The suite uses repository test fixtures / embedded PGlite and synthetic provider responses.
- **PASS** — schema-v3 ordered migration inventory: all four current migration files match policy byte counts and SHA-256 values in `schema-migration-inventory.txt`; the release regression's `schema-migration-inventory.test.mjs` also passed as part of 114/114 non-asset release tests.
- **NOT RUN** — native PostgreSQL: no listener/process on loopback port 54329. No database was provisioned or changed. Do not reuse historical attempt-06 native results as current-source evidence.
- **NOT RUN** — hosted Supabase Auth/PostgREST/Storage, external provider checks, production writes, shared build, R7 driver, browser/live probes.

This evidence supports the local fixture suite and exact migration inventory only. It does not establish native PostgreSQL, hosted Supabase, provider, production, release, or G7 acceptance.
