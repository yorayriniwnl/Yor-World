# Yor World Supabase Schema & Identity Reference

## Schema Evolution and Migration History

The database schema evolution preserves all historical migrations sequentially:

1. `20261001000000_a3_owner_auth_rls.sql` — Baseline owner auth, RLS policies, audit logs, and project tables.
2. `20261001000001_a4_publication_media.sql` — Publication tables, media asset records, and publication history.
3. `20261005000000_github_refresh_state.sql` — GitHub sync state and refresh telemetry tracking.
4. `20261009000000_owner_identity_media_integrity.sql` — **Schema v3 forward remediation**:
   - Native JWT identity handling: repairs `auth.jwt()` and `auth.uid()` to resolve JSON-only claims from `request.jwt.claims`. Prevents legacy non-JSON `request.jwt.claim.sub` from masking missing or invalid JSON claims.
   - Enforces valid UUID syntax checking for JWT `sub` and denies malformed, revoked, or non-matching identities.
   - Preserves `SECURITY INVOKER` and `STABLE` attributes on standard auth helper routines.
   - Media integrity enforcement: adds `storage_bucket` and `integrity_verified_at` columns to `public.media_assets`.
   - Adds `guard_media_integrity()` trigger: enforces immutability of object identity (`object_key`, `hash`, `mime`, `bytes`, `storage_bucket`) on retained publication media assets while allowing status updates (e.g. rejection/revocation), and blocks hard DELETE on approved publication media.
   - Uses transactional advisory lock `media_lifecycle_lock` to serialize approval, integrity verification, and publication.

## Environment Separation & Evidence Guarantees

- **Embedded PGlite**: Used for local fast unit/integration regression tests (`@electric-sql/pglite`). Simulates PostgreSQL semantics and schema execution within Node.js memory. Embedded tests prove SQL parsing, schema migration order, trigger behavior, and query logic, but do NOT replace native PostgreSQL/Supabase multi-session transaction semantics.
- **Native PostgreSQL / Hosted Supabase**: Requires running PostgreSQL or hosted Supabase project credentials. Full RLS connection tests, network transport timeouts, and live storage integration remain gated on live environment availability.
