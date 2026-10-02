# Canonical RC3 environment contract

The names-only template is `app/.env.example`; no real credentials are included. Configure production values through the authorized host's environment during G7. `NEXT_PUBLIC_*` values are browser-readable and cannot contain privileged credentials. Build/source checks reject private server modules or private environment references in browser import graphs.

| Variable | Exposure | Required status | Consumer/purpose |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_BASE_URL` | Client-safe | G7-required | Canonical metadata, robots and sitemap origin. Accepted fallback remains available locally; it does not verify ownership/TLS of a deployed domain. |
| `NEXT_PUBLIC_SUPABASE_URL` | Client-safe | G7-required for owner/Auth/Storage | Supabase public URL; owner sign-in and server session clients. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client-safe | G7-required for owner/Auth/Storage | Public project key governed by RLS; never a service-role key. |
| `DATABASE_URL` | Server-only | G7-required for durable contact/CMS/jobs/cache/telemetry | Managed PostgreSQL connection. Production transactions own one checked-out `pg` client. Missing/unavailable storage fails contact honestly and leaves public accepted snapshot usable. |
| `CONTACT_HASH_SECRET` | Server-only | G7-required | Stable high-entropy secret for contact payload/idempotency hashing. Rotating it changes active replay mappings and requires an explicit operations decision. |
| `QUOTA_HASH_SECRET` | Server-only | G7-required | Stable high-entropy secret for private quota identifiers; do not expose raw network/email identifiers in telemetry. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only | G7-required for owner verification/private storage | Privileged server service client; must never enter `NEXT_PUBLIC_*` or browser bundles. |
| `MEDIA_PRIVATE_BUCKET` | Server-only | G7-required for CMS media | Configured private Supabase Storage bucket; actual bucket/policy behavior remains live verification. |
| `RESEND_API_KEY` | Server-only | G7-required for mail delivery | Configured provider transport. Missing provider configuration retains retryable outbox rows; production never marks mock delivery as sent. |
| `MAIL_FROM` | Server-only | G7-required for mail delivery | Authorized provider sender. Domain verification remains G7. |
| `OWNER_NOTIFICATION_EMAIL` | Server-only | G7-required for mail delivery | Notification recipient; never emitted as visitor telemetry. |
| `CRON_SECRET` | Server-only | G7-required, configure this or `INTERNAL_JOB_KEY` | High-entropy internal job credential; no known default. |
| `INTERNAL_JOB_KEY` | Server-only | Alternative required job credential | Compatibility alias accepted by the internal authentication path. |
| `GITHUB_TOKEN` | Server-only | Optional | Upstream metadata authentication; accepted cached/last-good fallback remains available. |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY` | Server-only compatibility aliases | Optional aliases | Prefer explicit public/service names above; aliases do not authorize exposing private values. |
| `YOR_E2E_FIXTURE` | Server-only test flag | Local isolated tests only; prohibited on hosted app | Selects synthetic PGlite test provider only with the explicit directory flag. |
| `YOR_TEST_DATABASE_PATH` | Server-only test flag | Local isolated tests only; prohibited on hosted app | Fresh temporary file-backed browser test database. Never point to a production database or reuse between final runs. |

CI scopes synthetic fixture flags to E2E/accessibility and a synthetic `CRON_SECRET` to the job test context. Production build/performance defaults do not enable the fixture. Synthetic owner cookies are honored only on loopback fixture requests; normal sessions require Supabase verified user/claims and active owner AAL2. Unit/integration injection is constrained to the test runtime.

Database preparation preserves the original numbered migrations, in order: `20261001000000_a3_owner_auth_rls.sql`, then `20261001000001_a4_publication_media.sql`. Apply `app/supabase/operations/harden-publication-grants.sql` afterward. This candidate DCL delta revokes PUBLIC/anon/authenticated execution of the historical SECURITY DEFINER publication helper and grants service-role execution; it adds no tables and does not renumber migrations. Logical release schema binding stays `20261002000000_schema_v1`. Independent review of the hardening delta and hosted grants/RLS verification remain required.

Live credentials, owner provisioning/TOTP enrollment, production private bucket policy, mail sender authorization, scheduled jobs, hosted multi-session PostgreSQL concurrency, real monitoring and managed backups are G7-required and NOT RUN in this maker packet. G7 remains LOCKED.
