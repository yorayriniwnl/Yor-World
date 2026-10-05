# YOR WORLD canonical application

This is the single deployable RC4 application. Historical delivery applications are proof inputs.

Use Node `>=24.19.0 <25` and pnpm `9.15.9`:

```sh
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:integration
pnpm build
pnpm start
```

Configure the names documented in `.env.example` through the hosting environment. Contact, publishing, and internal jobs require a durable Supabase PostgreSQL `DATABASE_URL`. Supabase Auth and Storage require the public URL/key, server-only service-role credential, and private media bucket. Mail jobs require Resend configuration and an owner notification address. No secret belongs in `NEXT_PUBLIC_*` variables.

Apply the three SQL migrations in `supabase/migrations/` in filename order without renumbering them (the two accepted A3/A4 migrations plus the additive `20261005000000_github_refresh_state.sql`), then apply `supabase/operations/harden-publication-grants.sql` to deny direct public execution of the inherited privileged publication RPC. The release schema binding is `20261005000000_schema_v2` (additive private `github_refresh_state` table; historical `20261002000000_schema_v1` is preserved). Provision the owner account and active `admin_users` record, enroll TOTP, and ensure the private bucket and approved public media policy are configured during authorized G7 work.

Public portfolio and project pages serve the validated accepted snapshot when the backend is unavailable. Contact fails honestly with 503 when durable storage is unavailable. Administration requires an active owner and verified AAL2 session on the server.

For isolated browser tests only, set `YOR_E2E_FIXTURE=1` and `YOR_TEST_DATABASE_PATH` to a fresh temporary directory before `pnpm test:e2e`. This selects a synthetic file-backed PGlite fixture; it does not verify a hosted Supabase service. Never set these variables on a hosted application. Browser tests must never share a production database.

RC4 is a candidate. G6 is ACTIVE / REWORK pending independent audit. G7 is LOCKED; this packet does not authorize deployment.
