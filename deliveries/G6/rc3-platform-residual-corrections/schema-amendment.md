# Durable GitHub attempt coordination amendment

Human authorization: [supplied residual correction packet](evidence/input-packet.txt), received for this bounded maker task. Current application base is `2af509296a1eebd5f8dee37936fbff8ba7bbd658`, app tree `3586e0c8674faac3f73bcab4d17f646e3b2e9191`.

| Binding | Value |
| --- | --- |
| Historical logical schema revision | `20261002000000_schema_v1` |
| Existing numbered migrations, byte-preserved | `20261001000000_a3_owner_auth_rls.sql`, `20261001000001_a4_publication_media.sql` |
| New numbered migration | `app/supabase/migrations/20261005000000_github_refresh_state.sql` |
| Expected next RC4 logical schema revision | `20261005000000_schema_v2` |
| RC3 release binding | Unchanged historical schema/source/archive |

The new identifier is later than both existing migration identifiers and uses the human client's current date, 2026-10-05. The expected RC4 revision is documented here for the next assigned integration maker; no manifest, release validator, candidate or acceptance record is rebound by this task.

`public.github_refresh_state` contains at most one row for each of the five explicitly allowlisted repositories. Columns are repository_id, last_attempt_at, last_status and updated_at. Repository/status CHECK constraints bound the domain. It stores no credentials, headers, upstream response bodies, visitor information or exception text. RLS is enabled with no public policies, PUBLIC/anon/authenticated privileges are revoked and the privileged service role receives the required table rights. Hosted role/BYPASSRLS authority still needs verification when G7 is authorized.

Before a configured application contacts GitHub, a conditional PostgreSQL UPSERT reserves an attempt using the database statement clock, returning a timestamp token only to the winner. The inclusive condition is last_attempt_at <= new_attempt_time - interval '1 hour'. A loser reads the available successful snapshot or returns a generic503 without calling GitHub. Failed HTTP, transport, timeout and JSON attempts keep the reservation. Unavailable coordination storage fails closed for upstream work, with any existing last-good cache as fallback. An application with no configured database retains explicitly process-local offline behavior; distributed durability is not claimed in that mode.

Successful payloads remain in github_snapshots and fetched_at remains the last successful fetch timestamp. Failure never redefines it as attempt time. The full-precision token fences status changes and successful snapshot persistence; JavaScript Date conversion must not truncate the claim token. The snapshot/status write uses one SQL statement so a late prior winner cannot overwrite a later authoritative result. Test clock injection is enabled only under actual test environment flags; production ignores caller-supplied clocks for SQL cadence.

PostgreSQL documents the atomic conflict behavior and concurrent conflict handling in its [INSERT reference](https://www.postgresql.org/docs/17/sql-insert.html) and [transaction isolation reference](https://www.postgresql.org/docs/17/transaction-iso.html). Executed local tests use actual PostgreSQL SQL through PGlite with independently initialized application modules and separate simulated connection handles. They do not prove independent native backend sessions. The attempted portable native executable was blocked by Windows Application Control, WinError4551; no policy bypass, database initialization or native server occurred. The native test harness remains runnable in a permitted disposable environment, with this gap recorded as NOT RUN.

## Application and rollback implications

An authorized schema installation must run A3, A4 and this new migration in identifier order, and preserve the existing publication operational DCL. This task only applies SQL in disposable test databases; it does not change a hosted database. Before deploying code that requires durable claims, the new table and effective private/privileged grants must be present. A missing table or denied claim fails closed and may yield503/cached responses rather than fetching from GitHub.

The amendment is additive. Rolling application code back to the prior revision can leave the table intact, but restores the old process-local cadence limitation. Do not drop the table while any application instance still uses durable coordination. Removing it requires a separate operations decision after all such instances are drained. No destructive down migration is executed or included here; no historical publication/contact data is changed.

## Backup and restore inventory decision

The existing explicit logical backup inventory in `app/src/server/operations/backup-restore.ts` remains unchanged. It continues to include github_snapshots as historical public metadata. **github_refresh_state is intentionally excluded** as bounded operational coordination state, following the human's preference; it is not historical user data and the backup format remains version1.

An in-place logical restore only replaces tables present in that inventory, so an existing refresh-state row remains intact and its hour stays reserved. A clean-environment restore applies the new migration but restores no refresh-state rows. A still-fresh successful snapshot suppresses unnecessary fetching; otherwise the empty state permits one newly coordinated attempt. This can allow an extra attempt compared with a pre-restore failed reservation. That explicit operational reset is safe for data integrity: it changes no restored user content or successful snapshot, and subsequent contenders share the new reservation. It is not claimed to preserve pre-restore failed-attempt cadence. Restores must occur under authorized controlled operations, not by restarting application processes or deleting coordination rows during ordinary traffic.

If an operator instead requires preserving cadence across disaster restoration, retain/reseed unexpired coordination rows as a separately reviewed operations addition. A physical provider backup may include the table; that is distinct from the unchanged application logical inventory. Backup/restore, provider scheduling and hosted multi-instance proof remain G7 requirements and are not authorized here.
