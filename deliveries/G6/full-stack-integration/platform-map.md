# Canonical platform integration map ? RC3 candidate

Canonical deployable root: `app/`. Historical `deliveries/A6/source/`, `deliveries/C3/source/`, and contact R2 amendment files were read directly and remain immutable. This is maker evidence; G6 remains ACTIVE / REWORK and G7 LOCKED.

## Comparison and decisions

C3 has no `src/server`, admin routes, API routes, contact feature, or Supabase migration tree. Each A6-only file was reviewed for its purpose and selected individually; the public application/layout/world were retained from C3. The only competing route in this packet was `/contact`: C3's unavailable-messaging placeholder was replaced with A6's form/API experience while retaining C3 public shell/style imports. Form wording explains receipt semantics in plain language; direct email and a no-JavaScript explanation remain available.

Both lanes' `publication-reader.ts` were byte-identical at input. The runtime integration worker owns their server-public-reader wiring and public request rendering; canonical publishing now supplies `readPublicPublication()` returning only approved `published_content`. Private drafts/media never enter that read. Public snapshot fallback remains the accepted static publication if storage is absent/unavailable. Production publication preserves the frozen asset manifest revision rather than inventing a new art revision.

## R2 binding

Canonical `/api/contact` imports `@/server/contact/receive`, which imports canonical `outbox.ts`. The A6 input already contains the R2 amendment's atomic conditional upsert; this is the executing implementation, not a manifest citation. Core receipt algorithm and accepted HTTP route contract are preserved: `/api/contact` returns **202**, while the R2 report's prose described 200. Matching replays receive the same receipt; conflicting payloads receive 409. The mutex remains disabled by default. Idempotency claim runs before quotas/message/outbox in the winning transaction, with full rollback on failure.

Production contact DB uses `DATABASE_URL` via exact-pinned `pg@8.16.3`; every transaction checks out one connection and releases it after COMMIT/ROLLBACK. Production never creates PGlite or selects memory because storage failed. `MemoryContactDb`, explicit injection, and mock mail exist only as test adapters. Live route storage/config failure is 503 and no receipt; logs contain static error codes, no raw error/detail/payload.

The canonical R2 suite retains all eleven amendment scenarios. The 100-task test is a **single embedded PostgreSQL connection** test; it is not evidence of hosted Supabase or separate PostgreSQL worker sessions. The earlier historical multi-process amendment harness was inspected, not relabelled as fresh canonical execution. Production pool transaction ownership is separately verified with a driver mock.

## Integration corrections needed for production wiring

Inspection found A6 provider paths that were accepted proof fixtures but not production persistence. Canonical-only corrections were explicitly authorized by the parent:

- Contact default ephemeral PGlite/memory fallback became durable configured PostgreSQL, failing closed.
- Draft/revision writes now use actual schema UUID foreign keys, server validation, optimistic revision checks, transaction-scoped advisory locks, revision and audit rows. Missing accepted project draft rows use accepted static content as the edit baseline. Partial POSTs no longer falsely claim a saved draft.
- Publish/rollback now read current database snapshots, serialize publication revision checks and commit history+public content+audit atomically. Database errors are not swallowed. CandidateX remains excluded from publication. Public fallback contains only accepted content.
- `/admin`, `/admin/editor`, `/admin/publish` perform server authorization before rendering. `/admin/login` stays accessible. Cookie-based Supabase sign-in and enrolled TOTP challenge use existing `/api/admin/verify`; no unaccepted `/api/admin/login` route was invented. Sign-out clears the session. Login layout says AAL2 **required**, avoiding a false authenticated badge.
- Production authorization verifies `getUser` and cryptographically verified `getClaims().aal`, then current owner role/active record. Metadata cannot elevate AAL1, and revoked owners fail with a still-valid AAL2 session. Standard SSR chunked cookies are supplied through `getAll`; service-role credentials remain server-only.
- Media registration uploads the validated bytes to configured private Supabase storage and persists metadata; approval and owner metadata routes are durable and protected. Production has no automatic media registry fallback. Public case studies resolve only media IDs referenced by the CURRENT validated approved snapshot with currently approved metadata into HTTPS signed private-bucket URLs (900-second lifetime). Caller-supplied unpublished IDs, revoked approvals, stale snapshots, missing placeholders, HTTP signatures and storage outages produce no public URL. Runtime figures receive that safe mapping; they never guess a public image path. Unavailable images remain honest accessible fallback.
- The immutable A4 SECURITY DEFINER publication helper had default PUBLIC EXECUTE and accepts caller-selected actor/snapshot. Canonical `supabase/operations/harden-publication-grants.sql` explicitly revokes PUBLIC/anon/authenticated execution and grants service_role only. This DCL operational delta MUST run after the exact accepted migrations; it changes no table/schema or numbered migration. Actual PGlite checks deny both direct anonymous and authenticated RPC execution without inserting public content; the server publication path remains functional. Remaining SECURITY DEFINER functions are read-only RLS predicates bound to auth.uid()/auth.jwt(), with no caller-selected owner/snapshot.
- Internal job route supplies the configured database; authentication has no known default secret and uses timing-safe comparison. Outbox leases use atomic SQL across processes, reclaim expired processing leases, retain one provider idempotency key per row, and call configured Resend transport. No mock provider marks production mail sent. Cleanup removes stale idempotency/quota records and private contact rows after 90 days.
- GitHub cache uses durable last-good snapshots when configured, with accepted upstream/cache fallback. Telemetry persists only allowlisted aggregate fields; visitor input remains discarded and actions remain independent of telemetry availability.
- Backup fails if any table cannot be read and uses a consistent transaction snapshot. Restore maps all fifteen accepted public tables with fixed SQL column allowlists/parameters and one transaction, including outbox/idempotency/quota. Historical nine-table version-1 snapshots remain readable. Auth-service state and blob backup are separate production dependencies.

## Dependencies and schema

A6 exact pins merged: `@supabase/ssr 0.12.7`, `@supabase/supabase-js 2.117.2`, test `@electric-sql/pglite 0.5.8`. Existing Next/React/Three/Zod pins stay unchanged. Required durable driver additions: production `pg 8.16.3`, test/types `@types/pg 8.15.5`; npm registry verified pg Node >=16 compatibility with project Node >=24.19 <25. [Official node-postgres transaction documentation](https://node-postgres.com/features/transactions) requires one checked-out client; canonical adapter follows it. [Supabase session claims](https://supabase.com/docs/reference/javascript/auth-getclaims) and [MFA claim contract](https://supabase.com/docs/guides/auth/auth-mfa) support session assurance verification. [Resend official OpenAPI](https://github.com/resend/resend-openapi/blob/main/resend.yaml) supplies the email POST endpoint, reply-to field, and Idempotency-Key header contract; no live mail was sent.

No migration was renumbered or changed; accepted A3 `20261001000000_a3_owner_auth_rls.sql` and A4 `20261001000001_a4_publication_media.sql` are byte-preserved. They supply the existing production platform tables/constraints. The parent binds logical release schema revision `20261002000000_schema_v1` and its separately inventoried accepted schema input. No new DDL is required for RC3. The separate operational function-GRANT correction is a necessary candidate security delta and requires independent review plus production grant verification; migration hashes alone do not prove those safe effective grants.

## Environment and explicit test boundary

Client-safe required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`; existing public base URL follows root contract. Server-only production required: `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CONTACT_HASH_SECRET`, `QUOTA_HASH_SECRET`, `RESEND_API_KEY`, `MAIL_FROM`, `OWNER_NOTIFICATION_EMAIL`, `MEDIA_PRIVATE_BUCKET`, and `CRON_SECRET` or `INTERNAL_JOB_KEY`. Optional server-only: `GITHUB_TOKEN`. Legacy Supabase URL/key aliases are retained without dummy credential defaults. Hash secrets must remain stable to preserve active key/quota mappings.

E2E uses **explicit** `YOR_E2E_FIXTURE=1` plus a temporary `YOR_TEST_DATABASE_PATH`. It loads accepted migrations into file-backed PGlite and seeds synthetic owner/accepted public content. The synthetic owner cookie is honored only on loopback requests under that fixture configuration; the regular path uses Supabase auth. The missing-Helios figure is fixture-approved metadata only, never a claimed real image. The parent resets the temporary directory per run and controls Playwright configuration. This fixture is not hosted service verification and must not be configured in production.

## Executed maker evidence

Executed directly from `app/`, Node/pnpm versions recorded by parent runner. Commands/results at this worker handoff:

| Command | Result | Evidence |
| --- | --- | --- |
| `pnpm typecheck` | PASS exit 0 | Local tool sessions 5522 / 66071; root archives fresh aggregate execution |
| `pnpm lint` | PASS exit 0 | Local tool sessions 5522 / 66071; no lint disables |
| `pnpm test:unit` | PASS exit 0, 17 files / **191 tests** | Local tool execution; accepted content-visibility suite byte-identical |
| `pnpm test:integration` | PASS exit 0, 17 files / **139 tests** | Local tool sessions 5522 / 66071; PGlite actual SQL and canonical route imports |
| Production build / browser E2E | Parent-run evidence pending at map creation | Parent owns unified fresh build/browser evidence |
| Hosted Supabase/TOTP enrollment, private storage, Resend, production PostgreSQL workers | NOT RUN | No live credentials/services provisioned; G7 remains locked |

139-test suite includes accepted platform tests, eleven R2 amendment tests, canonical actual-route concurrency/409/rollback/outbox, durable CMS publish/stale409/rollback/privacy, all-fifteen-table actual-schema restore, verified-claims auth path/owner revocation, production same-client transaction checks, and runtime integration tests. Accepted admin E2E scenarios are preserved with an explicit owner fixture; additional anonymous page/API denial verifies the repaired security boundary. The accepted partial-draft auth test now submits a real structured draft and revision rather than testing a fake success response.

## File-by-file source mapping

| Canonical relative path | Decision |
| --- | --- |
| `src/server/auth/clients.ts` | Canonical integration correction; accepted input preserved |
| `src/server/auth/require-owner.ts` | Canonical integration correction; accepted input preserved |
| `src/server/auth/types.ts` | A6 exact accepted bytes |
| `src/server/contact/db.ts` | Canonical integration correction; accepted input preserved |
| `src/server/contact/email-adapter.ts` | Canonical integration correction; accepted input preserved |
| `src/server/contact/outbox.ts` | A6 exact accepted bytes |
| `src/server/contact/quota.ts` | A6 exact accepted bytes |
| `src/server/contact/receive.ts` | A6 exact accepted bytes |
| `src/server/contact/schema.ts` | Canonical integration correction; accepted input preserved |
| `src/server/content/publish.ts` | Canonical integration correction; accepted input preserved |
| `src/server/content/revisions.ts` | Canonical integration correction; accepted input preserved |
| `src/server/integrations/github.ts` | Canonical integration correction; accepted input preserved |
| `src/server/jobs/outbox-worker.ts` | Canonical integration correction; accepted input preserved |
| `src/server/jobs/runner.ts` | Canonical integration correction; accepted input preserved |
| `src/server/media/manifest.ts` | Canonical integration correction; accepted input preserved |
| `src/server/media/validate-upload.ts` | Canonical integration correction; accepted input preserved |
| `src/server/operations/backup-restore.ts` | Canonical integration correction; accepted input preserved |
| `src/server/telemetry/events.ts` | Canonical integration correction; accepted input preserved |
| `src/features/admin/project-editor.tsx` | A6 exact accepted bytes |
| `src/features/admin/publish-review.tsx` | A6 exact accepted bytes |
| `src/features/contact/contact-form.tsx` | Canonical integration correction; accepted input preserved |
| `src/features/contact/contact.module.css` | A6 exact accepted bytes |
| `src/app/admin/admin.module.css` | A6 exact accepted bytes |
| `src/app/admin/editor/page.tsx` | Canonical integration correction; accepted input preserved |
| `src/app/admin/layout.tsx` | Canonical integration correction; accepted input preserved |
| `src/app/admin/login/page.tsx` | Canonical integration correction; accepted input preserved |
| `src/app/admin/page.tsx` | Canonical integration correction; accepted input preserved |
| `src/app/admin/publish/page.tsx` | Canonical integration correction; accepted input preserved |
| `src/app/api/admin/audit/route.ts` | Canonical integration correction; accepted input preserved |
| `src/app/api/admin/media/[id]/approve/route.ts` | Canonical integration correction; accepted input preserved |
| `src/app/api/admin/media/[id]/route.ts` | Canonical integration correction; accepted input preserved |
| `src/app/api/admin/media/route.ts` | Canonical integration correction; accepted input preserved |
| `src/app/api/admin/projects/route.ts` | Canonical integration correction; accepted input preserved |
| `src/app/api/admin/publish/route.ts` | Canonical integration correction; accepted input preserved |
| `src/app/api/admin/rollback/route.ts` | Canonical integration correction; accepted input preserved |
| `src/app/api/admin/verify/route.ts` | A6 exact accepted bytes |
| `src/app/api/contact/route.ts` | Canonical integration correction; accepted input preserved |
| `src/app/api/events/route.ts` | A6 exact accepted bytes |
| `src/app/api/github/route.ts` | A6 exact accepted bytes |
| `src/app/api/internal/jobs/[job]/route.ts` | Canonical integration correction; accepted input preserved |
| `supabase/config.toml` | A6 exact accepted bytes |
| `supabase/migrations/20261001000000_a3_owner_auth_rls.sql` | A6 exact accepted bytes |
| `supabase/migrations/20261001000001_a4_publication_media.sql` | A6 exact accepted bytes |
| `supabase/tests/authorization.test.sql` | A6 exact accepted bytes |

Tests: nine accepted A6 integration files are mapped to `app/tests/integration/platform/` with relative imports rebased; `contact-idempotency-r2.test.ts` imports canonical modules. Added `canonical-platform.test.ts`, `session-claims.test.ts`, `postgres-transactions.test.ts`, `published-media.test.ts`. Added operational DCL script and explicit fixture/provider modules. The accepted A6 `content-visibility.test.ts` remains byte-identical (SHA-256 `8f3f7c230c3009460fa7befe53aa688b2a4ac8fdcafcd7d567344d28edd6f97c`). Accepted admin/contact E2E scenarios are under `app/tests/e2e/platform/`; C3 runtime suites remain under their existing paths.

Limitations: hosted security/RLS execution, independent production PostgreSQL connections/processes, real mail delivery, storage-bucket policy validation, live backups and rollback RTO remain G7/live verification. Maker does not self-accept RC3 or G6.

## Parent finalization note

The preliminary worker commands, counts and fixture descriptions above record an earlier maker handoff. They are historical diagnostics, superseded by the parent corrections in [corrections-during-integration.md](corrections-during-integration.md) and the final source-bound [report](report.md) and [commands and exit codes](commands-and-exit-codes.md). In particular, final publication validation uses the transaction's own connection, and the earlier fixture-approved missing-Helios shortcut has been removed; the exact accepted placeholder remains honestly unavailable.

Final implementation source `6129ad7a870f9f391455eb8a0582733a5ccccd11` has fresh PASS results for 261 unit tests, 155 integration tests, 97 unified E2E tests, 17 dedicated accessibility tests and 6 performance tests, with measured budgets and strict manifest/archive validation also PASS. Exact pushed-HEAD GitHub verification is recorded separately in the authoritative report and CI record after observation. Hosted service verification remains NOT RUN. This is maker evidence only: G6 ACTIVE / REWORK; G7 LOCKED.
