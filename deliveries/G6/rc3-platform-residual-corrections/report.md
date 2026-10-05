# Platform residual corrections return

**SCP-04 and SCP-07 are FIXED in the bounded implementation; local checks and fresh maker-independent delta review PASS.** The correction is committed and pushed to main as `83000ceb4f6046ba92f4764cb99ee64bde68dd22`. Native independent PostgreSQL sessions remain NOT RUN. This return does not accept G6.

| Finding | Original counterexample | Corrected behavior | Actual evidence |
| --- | --- | --- | --- |
| SCP-04 / P2 | A valid-CRC PNG with a corrupt APNG second frame passed Sharp's fallback-frame decode. | Complete PNG parsing rejects acTL/fcTL/fdAT with 422 INVALID_MEDIA before registration. Exact validated still bytes are retained; existing MIME/CRC/decoder/5MiB/8192-axis/16,777,216-pixel constraints remain. | Media 66/66 PASS, including 32 new cases;20 actual JSON/multipart rejection routes produced zero media DB records, storage client/object calls or approval events. Two genuine still successes preserved exact bytes and pending status. [Maker evidence](workers/media/report.md). |
| SCP-07 / P2 | Process reset/isolated Maps allowed repeated failed GitHub attempts inside one hour. | A database-clock conditional UPSERT reserves each attempt for an hour, including failures; losers never fetch. Full-precision claim tokens fence late status/snapshot writes. Successful fetched_at remains separate from attempts. | GitHub 41/41 PASS, including 24 new actual-SQL cases. Ten independently initialized simulated callers through distinct handles yielded one upstream attempt; reset/restart,59:59/exact-hour, cold/warm403/429/5xx/network/JSON/timeout/success, fallback, ACL and clock/fence checks passed. [Maker evidence](workers/github/report.md). |

Combined requested checks: frozen install, lint, typecheck and build all exit 0; **unit 266/266 and integration 280/280 PASS**, zero failures/skips/todos. There are56 new canonical cases; focused totals overlap the full suite. The [fresh independent reviewer](review/delta/report.md) executed25 additional probes, PASS, and checked schema/backup/rollback consistency. [Exact command ledger](commands-and-exit-codes.md), [test evidence map](tests/evidence/README.md), [defect records](defects.json), [identity](implementation-identity.json).

| Git/schema binding | Value |
| --- | --- |
| Base HEAD | `2af509296a1eebd5f8dee37936fbff8ba7bbd658` |
| Earlier implementation base | `02380c323154fdf0815e10543de0a936619f2b79` |
| New production commit, pushed main | `83000ceb4f6046ba92f4764cb99ee64bde68dd22` |
| App tree before | `3586e0c8674faac3f73bcab4d17f646e3b2e9191` |
| App tree after | `40d13c07ec076de1210c04e1ade0c3e69170bda6` |
| New migration | `20261005000000_github_refresh_state.sql` |
| Old logical schema | `20261002000000_schema_v1` |
| Expected next RC4 schema, documentation only | `20261005000000_schema_v2` |

The 17 changed application files comprise the two production modules, new migration, directly necessary test-fixture/bootstrap changes, two new integration tests and ten media fixture/manifest files. [Exact changed paths and byte/Git blob identities](evidence/source-integration.json). All other tracked paths match the base in Git, including historical migrations, dependency/lockfiles, world/camera/quality/performance, assets, contact R2, publication/outbox, accepted/independent evidence, release manifests and living gate/deployment documentation. Parent copied only the assigned paths, bound the reviewer blobs to the committed source, and committed source separately from this return. Raw baseline checkout line endings differed between worktrees; that disclosed tooling check was corrected without changing source or weakening verification.

[Schema amendment](schema-amendment.md) records additive rollout and rollback. Bounded private operational github_refresh_state is intentionally excluded from the unchanged historical logical backup inventory, while github_snapshots stays included. In-place restore retains an existing reservation; clean restore resets this operational state and can permit one additional coordinated attempt, explicitly without claiming pre-restore failed-attempt cadence. No hosted migration or destructive down migration ran. Code rollback leaves the table intact but restores the prior process-local limitation.

Configured coordination errors fail closed for upstream work and can return last-good memory cache or generic 503. Unconfigured offline behavior remains process-local. Failure/status storage never contains credentials, headers, upstream bodies or exception text. Snapshot storage errors preserve the already committed reservation; fetched metadata may be returned without a persisted-success claim. Native Node fetch/JSON timeout probes exercised the real four-second abort against a synthetic loopback server; real GitHub calls were not made.

The requested Gemini provider was unavailable: **Gemini NOT RUN**. Two fresh Codex makers inherited the parent model (exact service model ID not exposed); their assigned paths stayed separate. The supplemental reviewer used GPT-6.1 Sol/Codex and only reported findings and verified maker output. It did not fix source or approve a gate. This is maker-independent local review, with no claim of separate provider/account verification. Earlier auditor returns are immutable.

Native PostgreSQL 17.11 publisher binaries were downloaded into an isolated temporary fixture, but Windows Application Control blocked postgres.exe --version with WinError 4551 before initialization/server startup. [Blocker evidence](evidence/postgres-execution-block.json). No bypass was attempted. The executed connection simulations share one actual PGlite backend and do not prove native independent backend sessions; runnable optional native probes are retained. Hosted database/Auth/Storage/effective grants, real upstream services and deployed restart/scaling/restore remain NOT RUN. Exact versions, retained initial failures and successful reruns are recorded in the ledgers; no failures were suppressed or canonical tests skipped.

G1-G5 remain accepted; G6 remains ACTIVE/REWORK and G7 LOCKED. RC3 remains historical; RC4 is NOT CREATED. No performance change, release rebinding, G6 adjudication, deployment or next packet execution occurred. The next assigned maker owns RC4 and its exact-candidate checks. This bounded correction stops after its source and evidence are pushed.
