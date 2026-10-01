# YOR WORLD Milestone A6 — Cached Metadata, Telemetry & Observable Operations Maker Report

## Executive Summary

- **Milestone:** A6 (Cached Project Metadata and Observable Operations)
- **Maker Lane:** Gemini #1 — Platform / Backend Maker
- **Status:** **PASS** (100% of ESLint, TypeScript, 84 Vitest unit tests, 92 integration tests across 9 suites, Next.js 16 Turbopack production build, and 84 Playwright E2E tests passing across Chromium and Microsoft Edge)
- **Source Revision Baseline:** Milestone A5 accepted baseline (`d9bd586`)
- **Output Delivery Root:** `deliveries/A6/`
- **Delivery Bundle:** `deliveries/A6/a6-operations-metadata.zip`
- **Package Checksum File:** `deliveries/A6/a6-operations-metadata.zip.sha256`
- **Package Manifest:** `deliveries/A6/manifest.json`

---

## 1. Scope & Core Architectural Invariants

Milestone A6 completes the operational, metadata caching, and telemetry requirements for the YOR WORLD platform per `docs/superpowers/plans/2026-09-30-01-platform.md` Task A6 and `docs/planning/engineering-and-content.md` §§10–13:

### 1.1 GitHub Metadata Integration & Outage Resilience
- **Allowlist Enforcement:** Server-side fetch strictly limits metadata requests to the 5 approved project repositories:
  - `yorayriniwnl/Yor-World`
  - `yorayriniwnl/helios`
  - `yorayriniwnl/zenith`
  - `yorayriniwnl/ai-vs-real`
  - `yorayriniwnl/talks`
  Arbitrary or unapproved repository URLs are rejected with **HTTP 403 Forbidden**.
- **Cache TTL & Stale Threshold:** Responses are cached in memory for 1 hour (3600s). Cached responses older than 24 hours (86,400s) are marked with `stale: true`.
- **Last-Good Preservation:** In the event of upstream GitHub API rate limits (HTTP 403/429) or network timeouts, the system returns the last-good cached snapshot with `stale: true` and `rateLimited: true`, ensuring public portfolio pages never crash or block on external API outages.
- **Credential Hygiene:** Never exposes internal GitHub tokens or auth headers to client-side code.

### 1.2 Privacy-Preserving Telemetry & Bounded Event Ingestion
- **Strict Event Allowlist:** Only 8 predefined operational events are accepted:
  1. `studio_entry_requested`
  2. `studio_ready`
  3. `intro_completed`
  4. `intro_skipped`
  5. `project_opened`
  6. `fallback_used`
  7. `contact_received`
  8. `renderer_failed`
- **Strict Field Boundaries:** Payloads accept only:
  - `event`: Allowlisted event name.
  - `projectId`: Optional allowlisted project ID (`candidatex`, `helios`, `zenith`, `ai-vs-real`, `talks`).
  - `tier`: Coarse quality tier (`high`, `medium`, `low`, `static`).
  - `code`: Bounded error code string ($\le 64$ characters, alphanumeric/delimiters only).
- **Prohibited Data Safeguards:** Freeform contact text, keystrokes, personal identifiers, full referrer URLs, raw GPU strings, and visitor tracking profiles are strictly forbidden and rejected with **HTTP 400 Bad Request**.
- **Payload Ceiling:** Enforces a hard $4096\text{-byte}$ ceiling (returns **HTTP 413 Payload Too Large** if exceeded).
- **Non-Blocking Operation:** Telemetry failures return HTTP status without disrupting public client navigation or room interactions.

### 1.3 Internal Jobs & Scheduled Cron Runner
- **Authentication:** All `/api/internal/jobs/[job]` endpoints enforce secret authentication via `CRON_SECRET` / `INTERNAL_JOB_KEY` bearer tokens or headers. Unauthorized attempts are rejected with **HTTP 401 Unauthorized**.
- **Leased Outbox Worker:** Leased tasks prevent worker concurrency collisions and guarantee at-least-once delivery with bounded retries.
- **Bounded Exponential Backoff:** 1 min $\to$ 5 min $\to$ 30 min $\to$ 120 min schedule with a maximum of 4 attempts before dead-lettering.
- **Automated Catch-Up:** Scheduled jobs (`refresh-github`, `process-outbox`, `cleanup-stale`) catch up on missed execution windows safely.

### 1.4 Database Backup & Rehearsed Recovery Verification
- **Transactional Snapshot Engine:** `createDatabaseBackup()` captures structured, validated JSON snapshots of core tables: `projects`, `project_revisions`, `published_content`, `publication_history`, `media_assets`, `contact_messages`, `email_outbox`, `github_snapshots`, `aggregate_events`.
- **Atomic Restore Rehearsal:** `restoreDatabaseFromBackup()` executes within an atomic PostgreSQL transaction. Any constraint violation or integrity failure automatically rolls back cleanly without data loss.

### 1.5 Zero WebGL / 3D Overhead
- All metadata, telemetry, and operations endpoints operate entirely on the server with zero client-side WebGL canvas or 3D engine requirements.

---

## 2. API Endpoints Specification

| Method & Route | Auth / Headers | HTTP Status | Response Payload | Description |
|---|---|---|---|---|
| `GET /api/github?repo=:name` | Public / None | **200 OK** | `{ success: true, data: GitHubMetadata }` | Fetches cached repository metadata with stale fallback |
| `GET /api/github?repo=:name` | Disallowed repo | **403 Forbidden** | `{ success: false, error: "..." }` | Allowlist rejection |
| `POST /api/events` | Body $\le 4\text{ KiB}$ | **202 Accepted** | `{ success: true }` | Ingests allowlisted telemetry event |
| `POST /api/events` | Disallowed event | **400 Bad Request** | `{ success: false, error: "..." }` | Schema / allowlist violation |
| `POST /api/events` | Body $> 4\text{ KiB}$ | **413 Payload Too Large**| `{ success: false, error: "..." }` | Payload limit exceeded |
| `POST /api/internal/jobs/:job`| `CRON_SECRET` valid | **200 OK** | `{ job, success: true, durationMs, details }` | Executes internal scheduled job |
| `POST /api/internal/jobs/:job`| Missing / bad secret | **401 Unauthorized**| `{ error: "Unauthorized" }` | Rejects unauthenticated job trigger |
| `POST /api/internal/jobs/:job`| Unknown job | **404 Not Found** | `{ error: "Unknown job '...'" }` | Rejects uncataloged job name |

---

## 3. Verification Evidence & Test Summary

All automated checks executed against frozen dependencies in an isolated scratch environment (`C:\Users\yoray\AppData\Local\Temp\yor-world-a6-proof-db188nmu`):

| Test Suite | Command | Result | Evidence File |
| :--- | :--- | :---: | :--- |
| **Lint** | `eslint . --max-warnings=0` | **PASS** | `deliveries/A6/evidence/04-lint.log` (0 errors, 0 warnings) |
| **Typecheck** | `tsc --noEmit` (TypeScript 6.0.3) | **PASS** | `deliveries/A6/evidence/06-typecheck.log` (0 errors) |
| **Unit Tests** | `vitest run --config vitest.config.ts` | **PASS** | `deliveries/A6/evidence/07-test-unit.log` (84/84 tests passing) |
| **Integration Tests** | `vitest run --config vitest.integration.config.ts` | **PASS** | `deliveries/A6/evidence/08-test-integration.log` (92/92 tests passing across 9 suites) |
| **Production Build** | `next build` (Turbopack) | **PASS** | `deliveries/A6/evidence/09-build.log` (All 17 routes compiled) |
| **Playwright E2E** | `playwright test` (Chrome + Edge) | **PASS** | `deliveries/A6/evidence/11-test-e2e.log` (84/84 tests passing) |

### Integration Test Breakdown (92 Tests Across 9 Suites):
1. `tests/integration/github-metadata.test.ts` (5 tests) **PASS**:
   - Permits only explicitly allowlisted repositories
   - Rejects non-allowlisted repositories with 403 Forbidden
   - Fetches and caches metadata successfully for allowlisted repository
   - Serves cached metadata within 1 hour without hitting upstream
   - Preserves last good response and marks stale when upstream rate limited or fails
2. `tests/integration/telemetry.test.ts` (5 tests) **PASS**:
   - Accepts all 8 allowlisted events with status 202
   - Rejects non-allowlisted event types with 400 Bad Request
   - Rejects payloads exceeding 4096-byte ceiling with 413 Payload Too Large
   - Rejects disallowed project IDs with 400
   - Aggregates counts cleanly without profiling individual visitors
3. `tests/integration/internal-jobs.test.ts` (4 tests) **PASS**:
   - Enforces secret authentication for job execution (bearer token & header key)
   - Executes refresh-github job across allowlisted repositories
   - Handles cleanup-stale job safely in mock mode
   - Returns 404 error semantics on unknown job name
4. `tests/integration/operations-restore.test.ts` (4 tests) **PASS**:
   - Creates a complete JSON backup snapshot of core database tables
   - Restores database cleanly and transactionally from backup snapshot
   - Calculates exponential retry backoffs correctly (1m, 5m, 30m, 120m)
   - Proves contact messages persist durably even during external email outages
5. `tests/integration/contact.test.ts` (13 tests) **PASS**
6. `tests/integration/publication.test.ts` (17 tests) **PASS**
7. `tests/integration/media-access.test.ts` (13 tests) **PASS**
8. `tests/integration/owner-auth.test.ts` (18 tests) **PASS**
9. `tests/integration/database-authorization.test.ts` (13 tests) **PASS**

---

## 4. Delivery Packaging & Artifact Checksum

- Delivery archive: `deliveries/A6/a6-operations-metadata.zip`
- SHA-256 Digest: recorded in `deliveries/A6/a6-operations-metadata.zip.sha256`
- Package Manifest: `deliveries/A6/manifest.json`

**STATUS: DELIVERED AND READY FOR INDEPENDENT AUDIT (STOPPED FOR GPT #2 AUDIT).**
