# Explicit GitHub coordination amendment

- Previous schema binding: `20261002000000_schema_v1`.
- Added migration: `app/supabase/migrations/20261005000000_github_refresh_state.sql`.
- Proposed next RC4 schema binding: `20261005000000_schema_v2` (parent documentation only; no marker migration, release manifest or RC4 was created by this worker).
- New table: `public.github_refresh_state(repository_id,last_attempt_at,last_status,updated_at)`. At most five allowlisted repository rows; fixed scalar statuses and timestamps only; RLS enabled; PUBLIC/anon/authenticated privileges revoked; service_role granted SELECT/INSERT/UPDATE/DELETE. The privileged database connection retains its existing bypass-RLS requirement.

Apply the additive migration before enabling the corrected application. A corrected application connected to a pre-amendment database fails closed and returns a cached/generic result instead of an uncoordinated refresh. Existing snapshot/schema consumers remain compatible with the extra private table. Avoid dropping the table while corrected instances run. Application rollback may retain the unused table; reverting to the historical application reinstates its known process-only cadence limitation and does not preserve this correction's guarantee. No destructive rollback SQL is supplied.

This is operational attempt coordination, separate from durable last-success snapshots and historical user data. Existing logical backup inventory intentionally excludes it. The new canonical test invokes the actual SQL backup and in-place restore functions, confirms the exclusion and confirms the attempt row survives in-place restore. A clean database restore applies the migration with an empty coordination table; the next request may make one additional attempt under the parent's explicit reset-on-restore exception. Historical user content is not lost by that reset. Deployment ordering, restoration topology and independent PostgreSQL sessions remain for subsequent authorized operational proof; this packet does not begin G7.

Numbered A3/A4 migration files, operational DCL, backup source, RC3 release binding and accepted historical proofs were not modified. Parent owns the aggregated authoritative [schema amendment](../../schema-amendment.md).
