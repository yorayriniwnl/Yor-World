# Current RC5 restore and recovery record

Current candidate: **v1.0.0-rc5**. Canonical app: `app/`. G1-G5 ACCEPTED; G6 ACTIVE / REWORK; G7 LOCKED. The [RC5 maker evidence](../../deliveries/G6/rc5-candidate/report.md) records fresh execution against schema `20261005000000_schema_v2`. The additive private GitHub refresh-state table is outside the fifteen public-table backup inventory. RC5 makes no operations/schema changes. Prior RC3 local proof below and historical RC1 rehearsal remain identified by their original source; they do not replace fresh RC5 proof.

Canonical implementation is `app/src/server/operations/backup-restore.ts`. Backup reads all fifteen accepted public tables in one repeatable-read transaction and fails if a table cannot be read. Restore uses fixed table/column allowlists, parameterized values, reverse dependency deletion and one transaction for writes. Version1 snapshots remain compatible with their recorded tables, including earlier nine-table snapshots. Auth-service identity/session state and private storage blobs are outside this public-table snapshot.

The current fifteen-table inventory is: `admin_users`, `projects`, `project_revisions`, `evidence_records`, `media_assets`, `site_revisions`, `published_content`, `publication_history`, `contact_messages`, `contact_idempotency`, `email_outbox`, `request_quotas`, `github_snapshots`, `aggregate_events`, `audit_events`.

Historical RC3 source-bound integration execution passed `tests/integration/platform/canonical-platform.test.ts`: the exact accepted A3/A4 schema was loaded into isolated PGlite, a synthetic owner/contact receipt was created, all fifteen public tables were backed up, contact/idempotency/quota rows were removed, then restore recovered all fifteen tables plus message/outbox/idempotency records. This actual local SQL execution is part of the final 155-test integration suite at source `6129ad7a870f9f391455eb8a0582733a5ccccd11`. Exact command, exit code and log hash are in `deliveries/G6/full-stack-integration/commands-and-exit-codes.md`, `evidence/execution.jsonl` and the release manifest. Hosted Supabase recovery remains unverified.

Contact transaction failure/rollback is separately verified by the canonical R2/outbox insertion failure tests. It does not establish an actual failed hosted full-database restore or live rollback RTO/RPO. Driver-mock tests verify that production BEGIN/writes/COMMIT/ROLLBACK use one checked-out connection and release it; hosted independent connection/process behavior remains unverified.

RC3 uses unchanged `20261001000000_a3_owner_auth_rls.sql` and `20261001000001_a4_publication_media.sql`, with logical release binding `20261002000000_schema_v1`. The required candidate operational DCL `app/supabase/operations/harden-publication-grants.sql` is applied after the migrations: deny PUBLIC/anon/authenticated execution of the inherited SECURITY DEFINER publication helper while preserving privileged service-role execution. The local actual-role denial test is separate from table restore and does not claim hosted grants have been configured.

| Scope | RC3 evidence category | Remaining authorized production work |
| --- | --- | --- |
| Fifteen public tables and receipt/outbox/idempotency restoration | Final source-bound AUTOMATED local SQL PASS | Fresh managed PostgreSQL/Supabase backup and restore, consistency and production schema/grant checks. |
| Legacy version1 table snapshot compatibility | Canonical implementation and local suite | Inspect actual retained production snapshot/version compatibility. |
| Public portfolio/backend outage | Canonical cross-lane browser test | Fresh production smoke after authorized deployment. |
| Auth identities/TOTP/session state | NOT RUN hosted | Separate Supabase Auth provisioning/recovery and owner revocation/AAL2 validation. |
| Media storage blobs/object versions | NOT RUN | Actual private bucket backup/object restore and current approved media access policies. |
| Mail provider and outbox delivery | NOT RUN live | Actual provider delivery/retry/idempotency, safe synthetic receipt/outbox verification. |
| Live deployment rollback | NOT RUN | Rehearsed rollback, RTO<=5minutes, RPO=0; a header/etag is not rehearsal evidence. |

No hosted DB/blob restoration, live deployment or G7 probe was performed by this packet. Physical/manual and external-service limits remain recorded in the current candidate dossier/checklist. Gemini #1 verifies platform/recovery evidence, GPT Plus #2 independently audits, and GPT Plus #1 adjudicates G6. Owner authorization is required before G7.

## Historical RC1 rehearsal — preserved record

The following text is retained as the prior RC1 operations record, including its original claims and limitations. It has not been re-executed or adopted as fresh RC3 evidence.

# YOR WORLD Operations: Non-Production Restore & Disaster Recovery Record

**Release Candidate:** `v1.0.0-rc1` (Gate G6 Staging Release Candidate)  
**Consumed Baselines:** Milestone A6 Accepted Implementation (`deliveries/A6/`), Gemini #1 G6 Platform Restore Rehearsal (`deliveries/G6/gemini-1-platform/restore-rehearsal.md`)  
**Evaluation Date:** 2026-10-02  
**Evaluation Scope:** Isolated non-production rehearsal executing embedded PostgreSQL (`PGlite`) and staging runtime  
**Governance Invariant:** **NON-PRODUCTION / STAGING REHEARSAL ONLY.** Zero claims of live production database rollback are made. Live production disaster recovery verification remains strictly reserved for Gate G7.

---

## 1. Executive Summary

Disaster recovery and transactional restore procedures have been verified against the complete release-candidate schema (`20261002000000_schema_v1`) and platform runtime.

The rehearsal verified five mandatory operational capabilities:
1. **Public Route Resilience:** Core portfolio routes remain functional and serve cached fallback metadata during database unavailability.
2. **Publication State Recovery:** Transactional restore from snapshot recovers 100% of published projects and content snapshots.
3. **Owner Administration & Access Denial:** Unauthenticated or unauthorized administrative requests are strictly rejected with HTTP 401/403 post-recovery; MFA AAL2 requirements remain intact.
4. **Contact Persistence & Idempotency Semantics:** Durable message persistence, 24h deduplication, and transactional outbox queues recover with zero lost records or duplicate sends.
5. **Asset Revision Compatibility:** 3D GLB runtime assets and media pointers remain bit-for-bit aligned with the restored content catalog.

---

## 2. Rehearsal Execution & Recovered State Verification

### 2.1 Public Route Resilience
- **Pre-Condition:** Database engine stopped / connection aborted.
- **Observed Behavior:**
  - Route `/` renders semantic hero and static portfolio directory.
  - Route `/projects` renders project cards with cached descriptions.
  - Case study routes (`/projects/helios`, `/projects/zenith`, etc.) render cached Markdown sections.
  - Route `/contact` serves the interactive inquiry form.
- **Verification Result:** **PASS** (Zero blank white screens; zero unhandled 500 crashes).

### 2.2 Publication State Recovery
- **Snapshot Identity:** `e1f8c49e7b23d91a82f3a6479b1837e23114a8726593b4f6208573ef8902cd41`
- **Tables Restored:** `projects`, `project_revisions`, `published_content`, `publication_history`
- **Recovered Records:**
  - `projects`: 4 verified canonical records (`helios`, `zenith`, `ai-vs-real`, `talks`)
  - `published_content`: 1 active published snapshot
  - Unverified draft candidate (`candidatex`) remained excluded (404 Not Found preserved).
- **Verification Result:** **PASS** (100% recovery within atomic transaction).

### 2.3 Owner Administration & Denial Verification
- **Test Scenarios:**
  1. Request to `/api/cms/publish` with no bearer token $\to$ **HTTP 401 Unauthorized**.
  2. Request with valid user token but AAL1 session $\to$ **HTTP 403 Forbidden** (`"AAL2 TOTP verification required"`).
  3. Attempted direct SQL injection against RLS-protected tables $\to$ **Rejected** by PostgreSQL RLS policy engine.
- **Verification Result:** **PASS** (Security invariants remain impenetrable post-restore).

### 2.4 Contact Receipt & Persistence Semantics
- **Pipeline Recovery:**
  - `contact_messages`: Persisted inquiry records intact.
  - `email_outbox`: Queued tasks retained valid exponential retry timestamps (`60s`, `300s`, `1800s`, `7200s`).
  - `contact_idempotency`: 24-hour replay table preserved; identical submission returns original receipt ID; conflicting payload returns HTTP 409 Conflict.
- **Simulated DB Failure During Submission:**
  - Returns honest **HTTP 503 Service Unavailable** with `{ "status": "failed" }`. Never returns false `"received"`.
- **Verification Result:** **PASS**.

### 2.5 Asset Revision Compatibility
- **Cross-Layer Alignment:**
  - Restored publication records reference media assets matching `deliveries/G6/gemini-2-world/release-asset-inventory.json`.
  - Mesh files: `production-room-full.glb`, `group-a-essential.glb`, `resident-production.glb`, `fixture-production.glb`, `interaction-assets.glb`.
  - Zero broken asset references or missing textures.
- **Verification Result:** **PASS**.

---

## 3. Rollback Safety & Failure Injection Audit

To verify that an interrupted or corrupted restore cannot leave the database in an inconsistent state:
1. A foreign key constraint violation was artificially injected during restore execution.
2. The transactional restore runner caught the error and issued an immediate `ROLLBACK;`.
3. Audit confirmed:
   - Zero partially written tables.
   - Pre-restore state completely preserved.
   - No orphan records created.
- **Evidence:** Documented in `deliveries/G6/gemini-1-platform/evidence/10-operations-recovery-rehearsal.log`.

---

## 4. Operational Boundaries & Limits

| Boundary | Staging Rehearsal Status | Production Gate G7 Requirement |
| :--- | :--- | :--- |
| **Database Engine** | Embedded PGlite / PostgreSQL schema | Managed Supabase PostgreSQL with Point-In-Time-Recovery (PITR) |
| **Storage Engine** | Local filesystem snapshot | Supabase Storage / S3 with object versioning |
| **DNS / CDN** | Local mock ports / HTTP | Cloudflare CDN with TLS 1.3 & automated failover |
| **Live Rollback Claim** | **NOT CLAIMED** | Verified during Gate G7 live release rehearsal |
