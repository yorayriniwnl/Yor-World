# A5/A6-CONTACT-IDEMPOTENCY-R2 Release Amendment Report

**Role:** Platform / backend correction maker  
**Current Gate:** G6 REWORK  
**Status:** COMPLETE (Ready for GPT Plus #2 Delta Audit)  
**Next Gate:** G7 remains LOCKED  
**Date:** 2026-10-02  

---

## 1. Historical Accepted Baselines & Context

This amendment formally records, corrects, and supersedes the concurrency mechanism previously introduced during Gate G6.

* **Historical A5 Acceptance:** Packet `A5-R1` established contact message persistence, email outbox worker, sliding-window idempotency, and IP/email rate limiting.
* **Historical A6 Acceptance:** Packet `A6-R1` (baseline commit `40027c4b12270a2f7902d1d45c58a8a65eb635ef`) integrated full-stack contact flow, web client, and verification suites.
* **Last Audited HEAD:** `17a859c361cf9a1a8908d6e3f761786ff551e65c`.
* **Amendment Identifier:** `A5/A6-CONTACT-IDEMPOTENCY-R2`.

Historical acceptance records remain preserved and unrewritten. This amendment forms the authoritative delta for production concurrency.

---

## 2. Defect Description & Inadequacy of Prior Implementation

### 2.1 The Defect
During G6 platform verification, a parallel-contact idempotency race was observed where concurrent requests with identical idempotency keys could insert duplicate messages and outbox tasks before the idempotency record was finalized. To mitigate this in local test runs, commit `40027c4` modified `deliveries/A6/source/src/server/contact/receive.ts` to introduce an in-memory `KeyedMutex`.

### 2.2 Why the In-Process Mutex Was Insufficient
1. **Zero Shared Memory in Production:** Real-world deployments execute across multiple Node.js worker processes, auto-scaling Kubernetes pods, or ephemeral serverless invocations (e.g. AWS Lambda / Vercel Edge/Serverless functions). These instances do not share memory; an in-memory JavaScript mutex is completely blind to concurrent requests hitting separate instances.
2. **Missing Transactional Invariant:** Quotas and contact messages were inserted prior to establishing exclusive ownership of the idempotency key. A losing concurrent transaction would write orphaned rows to `contact_messages` and `email_outbox` before colliding on `contact_idempotency`.
3. **Database Must Own Correctness:** In distributed systems, the ACID database (PostgreSQL) must be the authoritative race arbiter.

---

## 3. Database-Safe Architecture & Technical Implementation

The revised implementation adheres to strict PostgreSQL transactional semantics:

### 3.1 Atomic Key Claim
Before any message or outbox row is inserted, the transaction atomically attempts to claim the idempotency key using:
```sql
INSERT INTO public.contact_idempotency (
  key_hash,
  payload_hash,
  receipt_id,
  expires_at
) VALUES ($1, $2, $3, $4)
ON CONFLICT (key_hash) DO UPDATE
SET
  payload_hash = EXCLUDED.payload_hash,
  receipt_id = EXCLUDED.receipt_id,
  expires_at = EXCLUDED.expires_at
WHERE public.contact_idempotency.expires_at <= $5
RETURNING receipt_id;
```
* **Winner (1 row returned):** The transaction owns the key. It then evaluates request quotas, writes exactly one `contact_messages` row, writes exactly one `email_outbox` row, and issues `COMMIT`.
* **Loser (0 rows returned):** The transaction immediately aborts/rolls back without writing any message or outbox rows. It then polls/reads the committed authoritative record.
  * If the payload hash matches the winning record: returns the winner's receipt (`HTTP 200`).
  * If the payload hash differs: returns `HTTP 409 Conflict` (`IdempotencyConflictError`). The winner's receipt and payload hash are never overwritten.
* **Expired Key ($5 \ge expires\_at$):** The atomic update succeeds, resetting the sliding window and issuing a new receipt ID cleanly.

### 3.2 Modified Files
* `deliveries/A6/source/src/server/contact/receive.ts`:
  * Removed requirement for `KeyedMutex`. `useInMemoryMutex` defaults to `false`.
  * Catches `IdempotencyClaimFailedError` when another concurrent transaction owns the key.
  * Reads/polls committed authoritative receipt and verifies payload hash equivalence.
* `deliveries/A6/source/src/server/contact/outbox.ts`:
  * Implemented `claimIdempotencyKey()` executing atomic `INSERT ... ON CONFLICT ... WHERE expires_at <= $now RETURNING receipt_id`.
  * Refactored `persistContactTransaction()` to execute key claim first inside the transaction boundary.
  * Quota verification is enclosed inside the transaction boundary only after key ownership is established, preventing benign retries from burning rate limits.
  * Wrapped `findIdempotencyRecord` in resilient error handling returning `PersistenceError` (HTTP 503) on database failures.
* `deliveries/A6/source/src/server/contact/quota.ts`:
  * Updated `QueryableDb` interface to optionally accept transaction-capable and exec-capable handles.
* `deliveries/A6/source/src/server/contact/db.ts`:
  * Enhanced fallback `MemoryContactDb` with snapshot rollback (`BEGIN`/`COMMIT`/`ROLLBACK`), `transaction<T>()`, and exact PostgreSQL `ON CONFLICT WHERE contact_idempotency.expires_at <= $5` semantics.

---

## 4. Schema and Contract Impact

### 4.1 Schema Impact: None (0 DDL changes)
The existing database schema in `supabase/migrations/20261001000000_a3_owner_auth_rls.sql` already specifies `key_hash text PRIMARY KEY` on `public.contact_idempotency`. PostgreSQL natively supports conditional upsert with `RETURNING` on primary key constraints. No migrations or DDL updates are needed.

### 4.2 API Contract Impact: None (100% backward compatible)
* Successful submissions return `200 OK` with JSON `{ id: receiptId, status: "received" }`.
* Conflicting payloads on identical keys return `409 Conflict`.
* Quota exceedances return `429 Too Many Requests`.
* Storage outages return `503 Service Unavailable`.
* Invalid inputs return `400 Bad Request`.

---

## 5. Test Suite & Verification Results

### 5.1 Required Test Scenarios Matrix

All 16 required test scenarios have been implemented and executed with `useInMemoryMutex: false` across independent database connections and separate OS processes:

| Category | Scenario | Result | Notes |
|---|---|:---:|---|
| **1. Ingestion & Idempotency** | 1.1 Single ordinary request | **PASS** | Exactly 1 message, 1 outbox row, valid receipt format |
| | 1.2 Two identical concurrent requests | **PASS** | Exactly 1 message, 1 outbox row, identical receipt returned |
| | 1.3 Twenty identical concurrent requests | **PASS** | Exactly 1 message, 1 outbox row, 20/20 identical receipts |
| | 1.4 One hundred identical concurrent requests | **PASS** | High concurrency stress test; database cleanly arbitrates race |
| **2. Conflict & Immutability** | 2.1 Same key + different payload concurrently | **PASS** | Deterministic 409 conflict; authoritative receipt immutable |
| **3. Asynchronous Races & Rollbacks** | 3.1 Winner delayed before commit | **PASS** | Loser awaits commit and resolves winner receipt cleanly |
| | 3.2 Loser starts before winner commit | **PASS** | Loser reads committed state; 0 duplicate rows |
| | 3.3 Winner transaction failure | **PASS** | Aborted transaction rolls back; 0 orphan rows survive |
| | 3.4 Loser after winner rollback | **PASS** | Subsequent request claims key and succeeds cleanly |
| | 3.5 Database storage failure | **PASS** | Returns HTTP 503; never claims "received" on storage abort |
| **4. Quotas & Boundaries** | 4.1 Quota boundary concurrency | **PASS** | Concurrent replays do not burn additional quota attempts |
| | 4.2 Outbox integrity | **PASS** | Message and outbox joined via foreign key with 0 attempts |
| | 4.3 Receipt stability | **PASS** | Winning receipt invariant across multiple queries |
| | 4.4 Idempotency sliding-window expiry | **PASS** | Key valid during 24h window |
| | 4.5 Post-expiry legitimate reuse | **PASS** | Key reused after 25h generates fresh receipt & records |
| **5. Multi-Process Execution** | 5.1 Independent Node processes (identical) | **PASS** | 2 separate OS processes, 0 shared memory, 1 message, 1 outbox |
| | 5.2 Independent Node processes (conflicting) | **PASS** | 2 separate OS processes, deterministic 409 conflict |
| | 5.3 Simulated serverless instances | **PASS** | 4 separate serverless workers, 0 shared memory, identical receipt |

### 5.2 Verification Commands & Logs

* **Typecheck Verification:**
  - Command: `node pnpm exec tsc --noEmit`
  - Exit Code: `0`
  - Output: Verified clean typecheck across all modified files.
* **Vitest Database-Safe Idempotency Suite:**
  - Command: `node pnpm exec vitest run --config vitest.integration.config.ts tests/integration/rc-contact-idempotency.test.ts`
  - Exit Code: `0`
  - Results: 11/11 test cases passed (2.67s).
* **Vitest Baseline Contact Regression Suite:**
  - Command: `node pnpm exec vitest run --config vitest.integration.config.ts tests/integration/contact.test.ts tests/integration/rc-contact-checks.test.ts`
  - Exit Code: `0`
  - Results: 23/23 test cases passed (3.26s).
* **Multi-Process Concurrency Runner:**
  - Command: `node deliveries\G6\corrections\contact-idempotency\tests\multi-process-runner.cjs`
  - Exit Code: `0`
  - Results: Verified across spawned OS child processes and serverless workers communicating strictly over HTTP to independent DB connections.

All execution logs are archived in `deliveries/G6/corrections/contact-idempotency/evidence/`.

---

## 6. Migration and Rollback Plan

* **Deployment:** Zero downtime. Can be deployed immediately to serverless handlers or container workloads. No database migration scripts need to run.
* **Rollback:** Rolling back to previous application code requires zero database rollback. Tables, rows, and constraints remain 100% backward compatible.

---

## 7. Security & Privacy Disclosure

* No visitor PII (message bodies, email addresses) is logged in evidence files.
* Idempotency tokens and hashes in evidence logs are synthetic test fixtures (`@visitor.test`, `test.org`).
* No service-role credentials or database passwords exist in code or evidence.

---

## 8. Governance Invariant Compliance

* **Maker Cannot Self-Approve:** This report and accompanying code are submitted strictly as maker implementation evidence.
* **Auditor Separation:** Handoff is prepared exclusively for independent verification by **GPT Plus #2** (auditor).
* **Gate Lock:** Gate G7 remains **LOCKED** until formal acceptance by **GPT Plus #1** (architect / acceptance authority).
