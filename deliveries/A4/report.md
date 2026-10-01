# YOR WORLD Milestone A4 — Drafts, Approved Media, Publishing & Rollback Maker Report

## Executive Summary

- **Milestone:** A4 (Drafts, Approved Media, Publishing, and Rollback)
- **Maker Lane:** Gemini #1 — Platform / Backend & Publishing Maker
- **Status:** **PASS** (100% of lint, typecheck, 84 unit tests, 61 integration tests, Next.js 16 production build, and 78 Playwright E2E tests passing)
- **Source Revision Baseline:** Exact accepted A3 baseline (`ac56097`)
- **Output Delivery Root:** `deliveries/A4/`
- **Delivery Bundle:** `deliveries/A4/a4-publishing-rollback.zip`
- **Package Checksum File:** `deliveries/A4/a4-publishing-rollback.zip.sha256`
- **Package Manifest:** `deliveries/A4/manifest.json`

---

## 1. Scope & Verified Capabilities

In strict accordance with human instructions and the Platform Implementation Plan (§ Milestone A4):

1. **Structured Project Editor (`/admin/editor`):**
   - Authoritative owner editing interface for structured project metadata, sections, paragraph/code/list/image blocks, external links, and verifiable evidence records.
   - Built with accessible semantic controls, zero WebGL/3D overhead, and clear draft revision badges.
2. **Draft State Management & Optimistic Concurrency:**
   - Server-side revisions module (`src/server/content/revisions.ts`) manages private draft states.
   - Saves require `expectedRevision` matching current revision: stale revisions return **HTTP 409 Conflict** (`STALE_REVISION_CONFLICT`).
   - Mutations undergo structural and URL schema validation: malformed blocks or insecure URLs return **HTTP 422 Unprocessable Entity** (`INVALID_CONTENT`).
3. **Private Draft Media Upload & Inspection (`/api/admin/media`):**
   - Server-side media upload validator (`src/server/media/validate-upload.ts`) enforces:
     - Strict MIME allowlist: `image/png`, `image/jpeg`, `image/webp`.
     - File header magic bytes verification (spoofed extensions rejected).
     - 5 MiB payload ceiling (`MAX_UPLOAD_BYTES`).
     - Dimension extraction and SHA-256 cryptographic hashing.
   - Validated uploads register as private drafts (`approval_status: 'pending'`).
   - Private media endpoint (`/api/admin/media/[id]`) strictly consumes `verifyOwner`: unauthenticated requests return 401, non-owners return 403. Draft media is never publicly accessible.
4. **Media Manifest & Pre-Flight Publish Review (`/admin/publish`):**
   - Media manifest checker (`src/server/media/manifest.ts`) verifies that every image block references an existing, approved media asset.
   - Publish review panel (`src/features/admin/publish-review.tsx`) provides pre-flight checklist verification: 100% verified evidence, safe HTTPS URLs, and approved media verification.
   - Unapproved media or unsupported claims ('unknown' status) trigger **HTTP 422 Unprocessable Entity** (`INVALID_MEDIA` / `INVALID_CONTENT`).
5. **Transactional Publication & Snapshot Isolation (`/api/admin/publish`):**
   - Atomically records publication snapshot and increments revision number.
   - Concurrent publications execute optimistic concurrency gating: stale expectedRevision returns **HTTP 409 Conflict**.
   - Public readers (`src/content/publication-reader.ts`) consume strictly approved publication snapshots.
   - Unpublished drafts (e.g. `candidatex`) remain 100% isolated: public project routes return HTTP 404 without leaking draft metadata.
6. **Publication History & Asset-Verified Rollback (`/api/admin/rollback`):**
   - Complete publication history preserved in durable audit history.
   - Rollback verifies that all assets referenced in the target historical snapshot remain available and approved; missing assets trigger **HTTP 422 Unprocessable Entity**.
   - Executing rollback restores the target snapshot as a **new incremented revision** (preserving immutable forward history).
7. **Resilient Cache-Refresh Handling:**
   - Cache refresh failures are isolated to warnings (`cacheRefreshed: false`), preserving durable database publications and history without rollback corruption.

---

## 2. Authorization & HTTP Status Matrix

| Protected Operation | Anonymous | Authenticated Non-Owner | Owner Without MFA (AAL1) | Revoked Owner | Active Owner (AAL2) | Error Status & Code |
|---|---|---|---|---|---|---|
| **View Drafts (`GET /api/admin/projects`)** | 401 | 403 | 403 | 403 | **200 OK** | 401 UNAUTHENTICATED / 403 FORBIDDEN |
| **Save Draft (`POST /api/admin/projects`)** | 401 | 403 | 403 | 403 | **201 Created** | 409 STALE / 422 INVALID |
| **Upload Media (`POST /api/admin/media`)** | 401 | 403 | 403 | 403 | **201 Created** | 422 INVALID_MEDIA |
| **View Private Media (`GET /api/admin/media/[id]`)** | 401 | 403 | 403 | 403 | **200 OK** | 401 UNAUTHENTICATED / 403 FORBIDDEN |
| **Approve Media (`POST /api/admin/media/[id]/approve`)** | 401 | 403 | 403 | 403 | **200 OK** | 403 FORBIDDEN |
| **Publish Revision (`POST /api/admin/publish`)** | 401 | 403 | 403 | 403 | **200 OK** | 409 STALE / 422 INVALID |
| **Rollback Revision (`POST /api/admin/rollback`)** | 401 | 403 | 403 | 403 | **200 OK** | 422 MISSING_ASSET |
| **Public Portfolio (`GET /projects/*`)** | **200 OK** (Approved only) | **200 OK** (Approved only) | **200 OK** (Approved only) | **200 OK** (Approved only) | **200 OK** (Approved only) | 404 for unpublished drafts |

---

## 3. Database Migration

Authored migration: `supabase/migrations/20261001000001_a4_publication_media.sql` (mirrored in `source/supabase/migrations/`):
- Added check constraints on `media_assets`:
  - `media_mime_check`: `mime IN ('image/png', 'image/jpeg', 'image/webp')`
  - `media_approval_status_check`: `approval_status IN ('pending', 'approved', 'rejected')`
- Added performance indexes:
  - `idx_media_assets_approval`: `(approval_status)`
  - `idx_publication_history_revision`: `(revision DESC)`
- Added transactional PL/pgSQL function:
  - `publish_new_revision(p_revision, p_snapshot, p_actor)`: Atomically updates `published_content` and records into `publication_history` and `audit_events`.

---

## 4. Verification Evidence & Test Summary

All automated verification checks executed against frozen dependencies and verified in isolated scratch environment:

### Proof Test Passes
1. **Lint:** `pnpm lint` (`eslint . --max-warnings=0`) — **PASS** (0 errors, 0 warnings)
2. **Typecheck:** `pnpm typecheck` (`tsc --noEmit`) — **PASS** (0 errors)
3. **Unit Tests:** `pnpm test:unit` — **PASS** (84/84 tests passing across 6 test files)
4. **Integration Tests:** `pnpm test:integration` — **PASS** (61/61 tests passing across 4 suites):
   - `tests/integration/publication.test.ts` (17 tests) PASS
   - `tests/integration/media-access.test.ts` (13 tests) PASS
   - `tests/integration/owner-auth.test.ts` (18 tests) PASS
   - `tests/integration/database-authorization.test.ts` (13 tests) PASS
5. **Production Build:** `pnpm build` (`next build` with Turbopack) — **PASS** (All 17 static and dynamic routes compiled successfully)
6. **End-to-End Suite:** `pnpm test:e2e` (`playwright test`) — **PASS** (78/78 tests passing across Chromium and Microsoft Edge):
   - Structured project editor controls verified
   - Pre-flight publication review and rollback table verified
   - Zero WebGL, zero canvas, and zero 3D requests on admin routes verified
   - Public snapshot isolation verified: unpublished candidatex returns 404; approved portfolio serves r1 content with zero private media leakage.

### Visual & Media Evidence
- `evidence/screenshots/a4-admin-editor.png`: Full-page capture of structured project editor
- `evidence/screenshots/a4-admin-publish.png`: Full-page capture of pre-flight publish review and publication history table
- Full Playwright video recordings archived in `evidence/recordings/`
- Full command execution logs (01 through 32) archived in `evidence/`

---

## 5. Reproduction Commands

To reproduce all proofs from clean scratch:

```bash
# 1. Sync source files to isolated scratch workspace
python deliveries/A4/tools/proof.py sync

# 2. Verify frozen lockfile installation
python deliveries/A4/tools/proof.py install

# 3. Code quality and typecheck
python deliveries/A4/tools/proof.py lint
python deliveries/A4/tools/proof.py typecheck

# 4. Unit and integration test suites
python deliveries/A4/tools/proof.py test:unit
python deliveries/A4/tools/proof.py test:integration

# 5. Production build and Playwright E2E suite
python deliveries/A4/tools/proof.py build
python deliveries/A4/tools/proof.py test:e2e

# 6. Package bundle and generate cryptographically verified manifest
python deliveries/A4/tools/generate_manifest.py
```

---

## 6. Audit Readiness

Milestone A4 implementation is complete, strictly isolated, and verified across all required specifications.

**STOPPED FOR GPT #2 AUDIT.**
