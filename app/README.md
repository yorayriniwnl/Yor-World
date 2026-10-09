# YOR WORLD canonical application

This is the RC6 successor application. Historical delivery applications are proof inputs.

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

This pending R7 candidate uses four SQL migrations in `supabase/migrations/`, in filename order: the three immutable historical migrations followed by `20261009000000_owner_identity_media_integrity.sql`. Its candidate schema binding is `20261009000000_schema_v3`; accepted R6 remains bound to `20261005000000_schema_v2` and three migrations. Do not renumber or modify historical migrations. Apply `supabase/operations/harden-publication-grants.sql` after migration setup to deny direct public execution of the inherited privileged publication RPC. The forward migration repairs native JSON JWT identity and binds media integrity metadata; existing media without verified storage identity requires re-verification before publication or rollback. Candidate source/schema acceptance and hosted verification remain pending. Provision the owner account, active `admin_users` record, TOTP and private media bucket during authorized G7 work against the separately accepted deployment source.

Public portfolio and project pages serve the validated accepted snapshot when the backend is unavailable. Contact fails honestly with 503 when durable storage is unavailable. Administration requires an active owner and verified AAL2 session on the server.

For isolated browser tests only, set `YOR_E2E_FIXTURE=1` and `YOR_TEST_DATABASE_PATH` to a fresh temporary directory before `pnpm test:e2e`. This selects a synthetic file-backed PGlite fixture; it does not verify a hosted Supabase service. Never set these variables on a hosted application. Browser tests must never share a production database.

Accepted RC5/G6-R1 remains immutable by its source commit and bundle. This RC6 amendment needs independent delta review and Parent acceptance. The owner authorized production completion under PRE-G7-01; G7 remains in preparation until actual services and mandatory live/manual verification pass.
