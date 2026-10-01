# YOR WORLD Milestone A5 — Durable Contact Receipt & Email Retry Maker Report

## Executive Summary

- **Milestone:** A5 (Durable Contact Receipt and Email Retry)
- **Maker Lane:** Gemini #1 — Platform / Backend Maker
- **Status:** **PASS** (100% of lint, typecheck, 84 unit tests, 74 integration tests, Next.js 16 production build, and 84 Playwright E2E tests passing)
- **Source Revision Baseline:** Milestone A4 accepted baseline
- **Output Delivery Root:** `deliveries/A5/`
- **Delivery Bundle:** `deliveries/A5/a5-durable-contact.zip`
- **Package Checksum File:** `deliveries/A5/a5-durable-contact.zip.sha256`
- **Package Manifest:** `deliveries/A5/manifest.json`

---

## 1. Scope & Core Architectural Invariants

In strict compliance with human instructions and the platform implementation requirements for Milestone A5:

### 1.1 Critical Proof: Honest Receipts
**"Do not claim 'received' unless persistence succeeded."**
- The API endpoint (`/api/contact`) and ingestion pipeline (`src/server/contact/receive.ts`) guarantee transactional integrity.
- If storage write or transaction commit fails, the server responds with **HTTP 503 Service Unavailable** and `{ "received": false, "status": "failed", "error": "Contact submission could not be persisted. Please use direct email." }`.
- Under no circumstances is `{ "status": "received" }` returned when the record has not been transactionally committed to durable storage.

### 1.2 Durable Contact Persistence & Outbox Architecture
- Persistence spans three tables within a single atomic transaction:
  1. `public.contact_messages`: Stores sanitized name, email, message body, source IP hash, and metadata.
  2. `public.email_outbox`: Stores pending notification tasks with payload, recipient, retry counter, lease timestamp, and status (`pending`, `processing`, `delivered`, `failed`).
  3. `public.contact_idempotency`: Stores deduplication tokens, SHA-256 payload hashes, and cached durable receipts.
- Single atomic transaction ensures no message exists without an outbox task, and no outbox task exists without a durable message record.

### 1.3 Idempotency Enforcement (24-Hour Sliding Window)
- Ingestion supports explicit `Idempotency-Key` HTTP headers (UUID/alphanumeric) as well as deterministic SHA-256 payload hashing (`email:normalized_body`).
- Replay requests within 24 hours return the exact original receipt with **HTTP 202 Accepted**, `idempotentReplay: true`, and identical `messageId` and `receivedAt` timestamps without re-enqueuing duplicate outbox notifications.

### 1.4 Quota Enforcement & Rate Limiting
- Multi-tier quota protection enforced atomically:
  - Network IP Quota: 3 requests per 10 minutes (`MAX_PER_IP_WINDOW = 3`).
  - Sender Email Quota: 10 requests per 24 hours (`MAX_PER_EMAIL_DAY = 10`).
  - Global Quota: 100 requests per 1 hour (`MAX_GLOBAL_HOUR = 100`).
- Exceeded quotas return **HTTP 429 Too Many Requests** with `Retry-After: 600` header and `{ "status": "rate_limited" }`. Quota rejection occurs prior to transaction creation and never claims "received".

### 1.5 Atomic Outbox Leasing & Exponential Backoff Retry
- **Atomic Leasing:** Workers acquire pending tasks using atomic SQL row-level leasing (`UPDATE public.email_outbox SET lease_until = ..., status = 'processing' WHERE id IN (...) RETURNING ...`), preventing worker concurrency conflicts or duplicate deliveries.
- **Exponential Backoff Schedule:**
  - Attempt 1: 60 seconds (1 min)
  - Attempt 2: 300 seconds (5 min)
  - Attempt 3: 1800 seconds (30 min)
  - Attempt 4: 7200 seconds (120 min)
  - Max Attempts (4): Marked permanently as `failed` (dead-letter status) for operational investigation.

### 1.6 Input Sanitization & Anti-Spam
- Payload ceiling strictly limited to 8 KiB.
- Field length constraints: Name ≤ 100 characters, Email ≤ 254 characters (RFC 5321), Message ≤ 4000 characters.
- HTML and control character sanitization (`escapeHtml`) on all stored and transmitted fields.
- Honeypot trap (`_hp_trap`): Silently accepts automated bot submissions with fake receipt without persisting to database or sending notification emails, stopping bot harvesting while preventing outbox spam.

### 1.7 Zero WebGL / Zero 3D Overhead
- The contact experience at `/contact` is 100% accessible semantic HTML.
- Zero WebGL canvas, Three.js, audio contexts, or heavy client scripts are loaded on this route.
- Direct email fallback (`mailto:ayushroy@mit.edu`), verified LinkedIn/GitHub/Devpost links, and 90-day retention disclosures are rendered cleanly for both standard browsers and JavaScript-disabled environments.

---

## 2. API Endpoint & HTTP Response Specification

| Method & Route | Request Precondition | HTTP Status | Response Payload Summary | Behavior |
|---|---|---|---|---|
| `POST /api/contact` | Valid payload, new submission | **202 Accepted** | `{ "received": true, "status": "received", "receipt": { "messageId", "receivedAt", "idempotentReplay": false } }` | Transactionally saved to contact_messages + email_outbox |
| `POST /api/contact` | Duplicate `Idempotency-Key` or payload within 24h | **202 Accepted** | `{ "received": true, "status": "received", "receipt": { "messageId", "receivedAt", "idempotentReplay": true } }` | Replays cached receipt; outbox is not duplicated |
| `POST /api/contact` | Honeypot field `_hp_trap` populated | **202 Accepted** | `{ "received": true, "status": "received", "receipt": { ... } }` | Silent drop; zero database persistence |
| `POST /api/contact` | Malformed email or missing required fields | **400 Bad Request** | `{ "received": false, "status": "validation_error", "errors": [...] }` | Rejection; no persistence |
| `POST /api/contact` | Payload size > 8 KiB | **413 Payload Too Large** | `{ "received": false, "status": "payload_too_large" }` | Rejection; no persistence |
| `POST /api/contact` | IP / Email / Global quota exceeded | **429 Too Many Requests** | `{ "received": false, "status": "rate_limited", "retryAfterSeconds": 600 }` | Rate limit enforced; `Retry-After: 600` header sent |
| `POST /api/contact` | Database unavailable or transaction rollback | **503 Service Unavailable** | `{ "received": false, "status": "failed", "error": "..." }` | Honest failure: strictly `status !== "received"` |

---

## 3. Database Schema Migration

Migration file: `supabase/migrations/20261002000001_a5_contact_outbox.sql`:
- `public.contact_messages`: UUID primary key, `name`, `email`, `message`, `ip_hash`, `created_at`.
- `public.email_outbox`: UUID primary key, `recipient`, `subject`, `html_body`, `status` (`pending`, `processing`, `delivered`, `failed`), `attempts`, `next_retry_at`, `lease_until`, `created_at`.
- `public.contact_idempotency`: `key_hash` primary key, `message_id`, `receipt_payload`, `expires_at`, `created_at`.
- `public.contact_quotas`: `bucket_key` primary key, `count`, `window_expires_at`.
- Strict indexes on `(status, next_retry_at, lease_until)` for outbox worker polling.

---

## 4. Verification Evidence & Test Summary

All automated checks executed against frozen dependencies and verified in isolated scratch environment (`C:\Users\yoray\AppData\Local\Temp\yor-world-a5-proof-w60a8aal`):

### Automated Verification Passes
1. **Lint:** `pnpm lint` (`eslint . --max-warnings=0`) — **PASS** (0 errors, 0 warnings)
2. **Typecheck:** `pnpm typecheck` (`tsc --noEmit`) — **PASS** (0 errors)
3. **Unit Tests:** `pnpm test:unit` — **PASS** (84/84 tests passing across 6 test files)
4. **Integration Tests:** `pnpm test:integration` — **PASS** (74/74 tests passing across 5 suites):
   - `tests/integration/contact.test.ts` (13 tests) **PASS**:
     - ✓ Valid submission transactionally persists contact message and outbox task
     - ✓ Replays original receipt for duplicate idempotency key
     - ✓ Detects duplicate payload and replays receipt without duplicate outbox
     - ✓ Does not claim 'received' when persistence fails (503 response)
     - ✓ Silently absorbs honeypot submission without outbox entry
     - ✓ Rejects payload exceeding 8 KiB ceiling with HTTP 413
     - ✓ Rejects malformed email and missing fields with HTTP 400
     - ✓ Enforces IP rate limiting with HTTP 429 and Retry-After header
     - ✓ Enforces email rate limiting with HTTP 429
     - ✓ Outbox worker leases pending emails atomically
     - ✓ Outbox worker processes and delivers emails via mock adapter
     - ✓ Outbox worker retries failed delivery with exponential backoff
     - ✓ Outbox worker marks job as failed after maximum attempts
   - `tests/integration/publication.test.ts` (17 tests) **PASS**
   - `tests/integration/media-access.test.ts` (13 tests) **PASS**
   - `tests/integration/owner-auth.test.ts` (18 tests) **PASS**
   - `tests/integration/database-authorization.test.ts` (13 tests) **PASS**
5. **Production Build:** `pnpm build` (`next build` with Turbopack) — **PASS** (All 18 static and dynamic routes compiled cleanly)
6. **End-to-End Suite:** `pnpm test:e2e` (`playwright test`) — **PASS** (84/84 tests passing across Chromium and Microsoft Edge):
   - Semantic HTML contact form verified with zero WebGL/3D overhead
   - Form submission produces honest durable receipt with unique reference ID
   - Live region (`aria-live="polite"`) updates accessibility tree with confirmation
   - Direct refresh preserves contact form and verified direct channels
   - All previous regression baselines preserved (A1 public shell, A2 verified portfolio, A3 admin auth, A4 publishing review, G1 browser behavior)
