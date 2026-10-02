# YOR WORLD Gate G6 Release Candidate: Contact & Outbox Release Check

**Milestone Coverage:** Milestone A5 (`A5-R1`), Gate G5 (`G5-R1`)  
**Maker Lane:** Gemini #1 — Platform / Backend Release-Candidate Evidence Maker  
**Candidate Source:** `deliveries/A6/source/` (Accumulated A1–A6 platform baseline)  
**Evidence Receipt:** `evidence/09-contact-release-verification.log`  

---

## 1. Executive Summary

This document records the release-candidate verification of the visitor contact ingestion pipeline, transactional outbox engine, idempotency deduplication, and quota rate limiting. The behavior was re-verified against real embedded PostgreSQL (`PGlite`) executing table schemas and operational code in `src/server/contact/` and `src/server/jobs/outbox-worker.ts`.

All ten critical invariants defined in the G6 platform mandate and Milestone A5 specification are fully satisfied.

---

## 2. Invariants Verification Summary

| # | Verification Criterion | Specification Standard | Measured Behavior | Status |
|:---:|:---|:---|:---|:---:|
| 1 | **Durable Receipt Integrity** | Receipt returned strictly after database commit; never false "received" | Simulated storage abort returns **HTTP 503**; status is `failed`, never `received` | **PASS** |
| 2 | **Idempotent Replay** | Same key + identical payload returns original receipt | Returns exact original `receiptId` and timestamp; table counts remain 1 | **PASS** |
| 3 | **Conflict Rejection** | Same key + conflicting payload rejected with HTTP 409 | Throws `IdempotencyConflictError` with descriptive conflict message | **PASS** |
| 4 | **Parallel Duplicate Race** | Simultaneous parallel submissions resolve to 1 record | `Promise.all` returns identical receipt to both callers; exactly 1 DB record | **PASS** |
| 5 | **Quota Race Boundedness** | Sliding window rate limits enforced atomically | 4th request from same IP within 10m rejected with **HTTP 429** (`Retry-After: 600`) | **PASS** |
| 6 | **Email Outage Resilience** | External provider outage does not invalidate DB receipt | Visitor gets honest receipt; notification remains queued for retry | **PASS** |
| 7 | **Outbox Retry Schedule** | Bounded exponential backoff: 1m, 5m, 30m, 120m | Calculated retry intervals exactly match 60s, 300s, 1800s, 7200s | **PASS** |
| 8 | **Worker Lease Collision** | Leased task claiming prevents duplicate sends | Concurrent workers process disjoint partitions; zero duplicate emails | **PASS** |
| 9 | **Permanent Failure Triage** | Maximum 4 retries before dead-letter marking | Attempt 5 or non-retryable error marks row `status = 'failed'` with cleared lease | **PASS** |
| 10 | **Zero Raw Visitor PII** | No raw email/message text in logs or telemetry | Strict payload escaping; zero PII stored in telemetry aggregator | **PASS** |

---

## 3. Deep Dive: Architectural Invariants

### 3.1 Honest Receipts & Transactional Atomicity
The contact receiver (`src/server/contact/receive.ts`) coordinates an atomic database transaction spanning three synchronized tables:
1. `public.contact_messages`: Permanent durable record containing sanitized sender name, email, body, and receipt ID.
2. `public.email_outbox`: Asynchronous notification task containing owner recipient address, HTML email body, retry counter, and lease timestamp.
3. `public.contact_idempotency`: 24-hour sliding window replay record mapping hashed key to payload hash and receipt ID.

If the database query fails or connection is aborted, the transaction rolls back cleanly. The client receives **HTTP 503 Service Unavailable** with `{ "status": "failed" }`. The system **never** returns `{ "status": "received" }` unless durable persistence has committed.

### 3.2 24-Hour Idempotency Replay & Conflict Detection
- **Idempotency Window:** Valid for 24 hours from initial submission.
- **Key Hashing:** Keys are hashed via SHA-256 before database lookup.
- **Replay Behavior:** When a client submits the exact same key with identical normalized content (whitespace-trimmed name, email, body), the pipeline short-circuits before database insertion and returns the cached receipt ID.
- **Conflict Behavior:** If a malicious or buggy client submits an already-used idempotency key with different payload text, the system throws `IdempotencyConflictError` (HTTP 409), preventing replay tampering.

### 3.3 Concurrency & Quota Enforcement
The quota engine (`src/server/contact/quota.ts`) maintains atomic counters in `public.request_quotas`:
- **Network IP Limit:** 3 submissions per 10-minute sliding window.
- **Email Limit:** 10 submissions per 24-hour window.
- **Global Limit:** 100 submissions per 1-hour window.

When limits are exceeded, requests fail immediately with **HTTP 429 Too Many Requests** and include a `Retry-After: 600` header.

### 3.4 Leased Outbox Worker & Collision-Free Delivery
The outbox processor (`src/server/jobs/outbox-worker.ts`) operates on leased batches:
- SQL query uses `FOR UPDATE SKIP LOCKED` inside a serialized transaction to claim pending records.
- Records are assigned a lease expiration (`lease_until = now() + 300s`) and status `processing`.
- Multiple concurrent workers run simultaneously without double-claiming or double-sending notifications.
- When the external email adapter reports temporary provider failure (e.g. SMTP 503 / 504), the worker increments `attempts` and sets `next_attempt_at` according to the backoff curve.
- After 4 failed attempts, the record transitions to `status = 'failed'` for manual owner review, clearing the lease so workers no longer poll it.

### 3.5 Privacy & Log Hygiene
- No raw visitor email addresses, unhashed visitor IP addresses, or freeform inquiry bodies appear in telemetry events or server execution logs.
- The email formatter (`formatContactNotification`) rigorously HTML-escapes all user-supplied fields, neutralizing XSS injection payloads (`<script>`, `onerror`, `onload`).
