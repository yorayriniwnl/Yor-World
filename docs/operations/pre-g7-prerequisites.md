# Pre-G7 prerequisites for accepted RC5

**Accepted baseline: G6-R1 / RC5. Current candidate: v1.0.0-rc6. G7 AUTHORIZED / PREPARATION** under **G7-OWNER-AUTH-20261006** (owner: “Complete it.”). PRE-G7-01 through PRE-G7-06 assign bounded source, release and operational preparation. Fresh R3 source/bundle/export/hosted verification and independent adjudication remain required; rejected R2 remains preserved. These prerequisites are not completed evidence.

Accepted source `c34e01bb5bff210d924f42d5266e2fa1ed13288e`, app tree `88a65e85d1f120a9aa4397efa8cc779bdfe5cf08`, bundle `4380cab7f5211c836fe5bb97c68d67137c1b0fd7a2e4789bb29d0157ab5faa0f`. The [independent audit](../planning/reviews/2026-10-06-rc5-independent-full-stack-audit.md) and G6-R1 record all remaining debt and limitations. Any source amendment must use a separate Parent packet, a new binding and independent delta adjudication; accepted RC5 is not silently edited.

## Governance and implementation prerequisites

- Owner production authorization is recorded; do not repeat consent requests for that scope. Actual provider access/configuration and accepted successor binding remain required.
- Protect main using the owner-approved branch protection/ruleset and required reviews/CI. The independent audit observed main unprotected with no rulesets; no policy was changed here.
- Implement missing `/api/health` under a separate authorized maker packet before relying on G7 health/monitoring proof.
- Correct open studio Retry and STATIC visibility/resource behavior through a separate maker/delta-review packet. Replace unsupported memory-leak claims with real measurements or UNKNOWN. Do not waive these requirements by accepting G6.
- Address the optional checksum inventory exception and repository-size debt through explicit evidence/storage packets; preserve accepted historical data.

## Exact schema and environment

Schema revision remains **20261005000000_schema_v2**. Apply all three immutable migrations in filename order:

1. `app/supabase/migrations/20261001000000_a3_owner_auth_rls.sql`
2. `app/supabase/migrations/20261001000001_a4_publication_media.sql`
3. `app/supabase/migrations/20261005000000_github_refresh_state.sql`

Then apply `app/supabase/operations/harden-publication-grants.sql` and verify effective PUBLIC/anon/authenticated/service-role privileges and direct mutation denial. Verify the private sixteenth table `github_refresh_state` as well as the fifteen public tables. The archived [RC3 environment contract](../../deliveries/G6/full-stack-integration/environment-contract.md) is historical and still describes schema v1/two migrations; use this guide and the accepted source `.env.example` for current preparation.

Names only — provide values later through the production host's secret configuration:

| Scope | Current names/prerequisites |
| --- | --- |
| Client-safe configuration | NEXT_PUBLIC_BASE_URL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY |
| Durable DB and owner/storage services | DATABASE_URL, CONTACT_HASH_SECRET, QUOTA_HASH_SECRET, SUPABASE_SERVICE_ROLE_KEY, MEDIA_PRIVATE_BUCKET |
| Email provider | RESEND_API_KEY, MAIL_FROM, OWNER_NOTIFICATION_EMAIL; actual delivery and provider deduplication proof required |
| Internal scheduled jobs | CRON_SECRET or supported INTERNAL_JOB_KEY; verify authentication, scheduling and restart/scaling behavior |
| Optional GitHub metadata | GITHUB_TOKEN if used; verify live cadence/fencing/fail-closed behavior across independent processes |

Provision the owner, current active-owner record, AAL2/TOTP and revocation behavior; verify REST/RLS/private Storage on the real Supabase project. Disable YOR_E2E_FIXTURE/YOR_TEST_DATABASE_PATH on hosts. Verify secret isolation, ingress/body limits, trusted proxy handling, CSP/HSTS and other actual production headers. Database fencing is not proof of exactly-once provider delivery.

## Mandatory G7 proof — all NOT RUN for production

- Fresh real domain/DNS/TLS/HTTPS/canonical-header and CDN/cache/compression/asset-hash/transfer verification.
- Actual PostgreSQL concurrency: contact/idempotency races, publication/rollback, outbox lease/reclaim/fencing and durable GitHub coordination.
- Real email delivery/retry/deduplication, live GitHub metadata, jobs, restarts and scaling.
- Live health, error/uptime monitoring and zero visitor-PII telemetry/logging.
- Hosted database/service/blob backup and restore rehearsal; demonstrated rollback RTO <=5 minutes and RPO=0.
- Physical iPhone/Safari and Android/Chrome in portrait/landscape, touch/reflow and ten-minute sustained thermal use; actual NVDA, VoiceOver and TalkBack sessions.
- Fresh production smoke for all public/project/admin/API flows, world readiness/entry/skip/fallback, contact/owner denial, security headers and rollback.
- Independent multi-lane receipts for every one of the [ten G7 requirements](../planning/releases/2026-10-02-g7-production-release-protocol.md), then Parent G7 adjudication.

Local embedded SQL, automated axe/keyboard/Chromium and SwiftShader/NVIDIA lab pacing are G6 evidence. They do not establish the unrun physical/manual/hosted criteria. No prerequisite above was executed by this document.
