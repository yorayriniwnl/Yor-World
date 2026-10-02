# YOR WORLD Gate G6 Release Candidate: Auth & Admin Policy Verification Matrix

**Milestone Coverage:** Milestones A3 (`A3-R1`), A4 (`A4-R1`), Gate G5 (`G5-R1`)  
**Maker Lane:** Gemini #1 — Platform / Backend Release-Candidate Evidence Maker  
**Candidate Source:** `deliveries/A6/source/` (Accumulated A1–A6 platform baseline)  
**Evidence Receipt:** `evidence/08-auth-policy-verification.log`  

---

## 1. Executive Summary

This document establishes the verified release-candidate evidence for the authentication, authorization, Row Level Security (RLS), and CMS publishing governance subsystems of YOR WORLD. All policies and security definer functions have been freshly verified against real embedded PostgreSQL (`PGlite`) executing authoritative migrations (`supabase/migrations/20261001000000_a3_owner_auth_rls.sql` and `supabase/migrations/20261001000001_a4_publication_media.sql`).

Zero security bypasses, zero permission leaks, and zero credentials exposures were detected.

---

## 2. Five-Identity Authorization & Policy Matrix

The platform enforces five distinct identity tiers across all administrative routes and PostgreSQL database tables.

| Identity Profile | Session & JWT Claims | Database Role | Admin Route Access (`/api/admin/*`) | RLS Policy Action | Forensic Verdict |
|---|---|:---:|:---:|:---:|:---:|
| **1. Anonymous Visitor** | None / Missing Authorization | `anon` | **HTTP 401 Unauthorized** (`UNAUTHENTICATED`) | Access denied on all internal/draft tables | **PASS (DENIED)** |
| **2. Authenticated Non-Owner** | Valid JWT, non-owner `sub` (`44444444-...`), `aal2` | `authenticated` | **HTTP 403 Forbidden** (`FORBIDDEN_NOT_OWNER`) | Denied read/write on administrative tables | **PASS (DENIED)** |
| **3. Owner Without AAL2** | Valid owner JWT (`11111111-...`), `aal: "aal1"` | `authenticated` | **HTTP 403 Forbidden** (`FORBIDDEN_MFA_REQUIRED`) | Denied mutations; requires TOTP MFA verification | **PASS (DENIED)** |
| **4. Active Owner with AAL2** | Valid owner JWT (`11111111-...`), `aal: "aal2"`, `active: true` | `authenticated` | **HTTP 200 OK** (Authorized operations) | Full administrative read/write access granted | **PASS (AUTHORIZED)** |
| **5. Revoked Owner** | Valid owner JWT (`22222222-...`), `aal: "aal2"`, `active: false` | `authenticated` | **HTTP 403 Forbidden** (`FORBIDDEN_REVOKED`) | Denied immediately via authoritative `admin_users` table | **PASS (DENIED)** |

---

## 3. Database Row Level Security (RLS) on 15 Domain Tables

PostgreSQL table catalog queries confirm that `rowsecurity = true` is strictly enforced across all 15 protected application domain tables:

| # | Database Table Name | RLS Active | Anon / Public Grants | Non-Owner Grants | Active Owner (AAL2) Grants |
|:---:|:---|:---:|:---:|:---:|:---:|
| 1 | `public.admin_users` | **YES** | DENIED | DENIED | SELECT, UPDATE (Active status) |
| 2 | `public.audit_events` | **YES** | DENIED | DENIED | SELECT, INSERT (Append-only) |
| 3 | `public.projects` | **YES** | SELECT (Published only) | SELECT (Published only) | ALL (SELECT, INSERT, UPDATE, DELETE) |
| 4 | `public.project_revisions` | **YES** | DENIED | DENIED | ALL (Drafts & Revision History) |
| 5 | `public.evidence_records` | **YES** | SELECT (Verified only) | SELECT (Verified only) | ALL |
| 6 | `public.media_assets` | **YES** | SELECT (`status = 'approved'`) | SELECT (`status = 'approved'`) | ALL (Uploads, Approval, Rejection) |
| 7 | `public.site_revisions` | **YES** | SELECT (Active revision) | SELECT (Active revision) | ALL |
| 8 | `public.publication_history` | **YES** | DENIED | DENIED | SELECT, INSERT (Immutable snapshots) |
| 9 | `public.published_content` | **YES** | SELECT (Active published payload) | SELECT (Active published payload) | ALL |
| 10 | `public.contact_messages` | **YES** | INSERT (via API receiver only) | DENIED | SELECT (Owner triage only) |
| 11 | `public.contact_idempotency` | **YES** | DENIED (Internal service) | DENIED | Internal Service / Leased workers |
| 12 | `public.email_outbox` | **YES** | DENIED | DENIED | Internal Leased Outbox Workers |
| 13 | `public.request_quotas` | **YES** | DENIED | DENIED | Internal Rate Limiter |
| 14 | `public.github_snapshots` | **YES** | SELECT (Cached metadata) | SELECT (Cached metadata) | Internal Service Cache Refresh |
| 15 | `public.aggregate_events` | **YES** | DENIED | DENIED | Internal Telemetry Aggregator |

---

## 4. CMS Draft Isolation & Media Security

1. **Private Draft Data Isolation:**
   - Edits made in the CMS structured editor (`saveProjectDraft`) write strictly to `project_revisions` under `draft` status.
   - Unauthenticated visitors and public portfolio routes (`readPublication()`, `findPublishedProject()`) consume exclusively from the approved immutable publication snapshot.
   - Draft revisions are completely inaccessible to non-owners.

2. **Draft Media Isolation:**
   - Media uploaded to the CMS begins in `status: 'draft'`.
   - Any attempt to publish a revision containing unapproved media is rejected at the validation gate with **HTTP 422 Unprocessable Entity** (`MediaValidationError`).
   - Only media explicitly approved by the owner (`approveMediaAsset`) can be published and accessed publicly.

---

## 5. Optimistic Concurrency, Validation Gates & Rollback

1. **Optimistic Concurrency Control (HTTP 409 Conflict):**
   - CMS publish operations enforce strict `baseRevision` checks.
   - If an administrative user attempts to publish a revision with a stale `baseRevision` (e.g. attempting to publish against revision 1 when active publication is already at revision 2), the transaction aborts and returns **HTTP 409 Conflict** (`RevisionConflictError`), preventing race conditions or accidental overwrites.

2. **Validation Gates (HTTP 422 Unprocessable Entity):**
   - Payloads violating the strict content schema (e.g., empty titles, invalid URL structures, unapproved media asset IDs, missing required sections) are rejected before database commit with **HTTP 422**.

3. **Transactional Publication Rollback:**
   - Rollback operations (`rollbackPublication`) verify that all required historical assets for the target snapshot remain available.
   - Rather than destructively rewriting history, rollback creates a **new sequential publication revision** whose payload mirrors the chosen historical snapshot.
   - The append-only historical audit trail is 100% preserved.

---

## 6. Credential & Secret Hygiene

- No database secrets (`SUPABASE_SERVICE_ROLE_KEY`), internal tokens (`CRON_SECRET`), or session credentials appear in error responses or logs.
- Server-side authentication routines throw security exceptions immediately if imported into browser contexts (`typeof window !== 'undefined'`).
- The `admin_users` table is the single source of truth for authorization, preventing privilege escalation from compromised JWT tokens without database verification.
