# Security/outbox production maker return

Executor: new local Codex production maker, implementing only SCP-01/02/03; not Gemini provider execution, independent audit, or acceptance. The parent explicitly authorized this executor and waived maker commit/push; parent integrates and commits. G6 ACTIVE / REWORK; G7 LOCKED.

Input HEAD: d13dc181fd765081446093c2e39785123bb7b90c. Input app tree verified directly as 174ccd19091622c3dbce5f6b0ce3fe7fb38e1985. Working checkout: C:\Users\yoray\AppData\Local\Temp\yw-scp-64a4e0ad. Node v24.19.0; pnpm9.15.9; PGlite0.5.8; Vitest5.0.2.

Changed owned files:
- app/supabase/operations/harden-publication-grants.sql
- app/src/server/jobs/outbox-worker.ts
- app/tests/integration/platform/database-authorization.test.ts
- app/tests/integration/platform/scp-publication-outbox.test.ts (new)

SCP-01: operational DCL denies direct snapshot/history DML including inherited PUBLIC grants; public snapshot reads and owner private reads remain. Five identity cases execute both accepted A3/A4 migrations, deliberately grant PUBLIC table DML before hardening, and prove all three prohibited mutations on both tables plus helper RPC denial. Existing canonical server publish/rollback, expectedRevision conflict, asset validation and contactR2 tests remain unchanged and passed against the same operational DCL. Accepted numbered migration files were not edited.

SCP-02: atomic claim returns PostgreSQL xmin as claim version. Every completion requires that exact version, processing status and an unexpired lease, and increments counters only when RETURNING supplies the owned row. Claims/completions must be separate committed statements, as canonical Pool.query is. Ownership is checked before message lookup and again immediately before provider send so queued/slow-read batch items cannot begin provider work after forfeiting their lease. The supplied scheduling clock advances by elapsed local milliseconds while awaiting work. Reclaim changes xmin even when expiry timestamps coincide; a regression keeps A's clock behind B and leaves B processing to isolate the version fence from status/time gates. Stale success/retry/permanent failure/adapter exception/read exception/missing-message/completion-write exception regressions leave the newer row unchanged and return zero counts. Expiry alone also rejects completion without requiring a reclaim.

SCP-03: adapter/read/completion exceptions and ordinary failures use one fenced completion path. Attempt5 is terminal failed; four exception retries retain exactly60/300/1800/7200-second delays. A persistent database outage still rejects the operation rather than claiming a state transition; a transient first completion-write failure is covered. Stable outbox_<id> provider keys and contact receipts are preserved.

Executed evidence:
- focused-01: PASS, 5files/59tests, exit0 (first20-case regression version).
- focused-02: PASS, 5files/62tests, exit0 (final23-case regression version).
- owned-lint-01: PASS, exit0.
Logs and Vitest JSON reports are in evidence/. No test failures occurred. Full lint/typecheck/unit/integration/build belong to parent integrated verification and are NOT RUN by this worker.

Limits: controlled async reclaim interleavings use one real embedded PostgreSQL instance, not independent PostgreSQL sessions or hosted Supabase Auth/REST/Storage/RLS. Providers are synthetic; no actual mail/API/provider calls. An in-flight provider request can outlive a lease; its late SQL result is discarded. Actual provider duplicate suppression is NOT RUN and depends on its stable idempotency behavior. The xmin version is a PostgreSQL internal transaction version, used only during a short lease, not a persistent schema identifier. No deployment/release refresh, independent audit, acceptance, commit or push performed.

Source-only rollback disposition: source remains unchanged; the accepted rollback API has targetRevision only. Canonical tests demonstrate rollback serializes and publishes a new revision, but this does not establish stale-tab expectedRevision intent protection. Parent contract decision and separately assigned route/UI paths remain necessary; not marked fixed.

Parent integrated typecheck identified missing PGlite row generics in the new regression file. Corrected query result types with explicit generics (no casts or compiler weakening). Follow-up focused-03: PASS, 5files/62tests, exit0; owned-lint-02: PASS, exit0. This worker did not rerun full typecheck; parent retains initial failure and verifies integrated result.
