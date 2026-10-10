# FINISH-00-R2 platform, schema and recovery contract

Date: 2026-10-10. Architectural successor proposal for Parent and independent contract review; this file does not accept implementation, dispatch accounts, migrate a database or establish G7 proof. Historical FINISH-00 documents/ruling, RC5/G6-R1 and RC6-R1 remain unchanged. This bounded contributor inspected local source; no provider, secret, Auth session or live database was accessed.

Inspection base: source HEAD `f62a43c5e71c00dcb89e28275ea81d842167db80`, canonical `app/` tree `42ea29ec235225046a75959eb19eb386ac2f821d` (RC6-R1 source tree). `finish-contracts-r2/` did not exist when inspected. A1 delivery is not established by these inputs; dependent A2 implementation requires a separately accepted, hash-bound A1 overlay, not an invented successor commit. Maker roots are `deliveries/FINISH-A1/r2/` and `deliveries/FINISH-A2/r2/`; preserve any earlier delivery and stop on a root collision for Parent revision allocation.

## Finding-to-decision mapping

| Finding/requirement | Successor decision | Implementation/evidence owner |
| --- | --- | --- |
| GOV-01, P14 | Sixteen schema-qualified public application tables; Auth and Storage are separate provider services; inventory below derives from SQL | A2 inventory/export maker; G7-A native service rehearsal |
| GOV-02, CA-13 | Measured application routing rollback RTO <=300s/RPO=0; distinct full-service disaster recovery with actual recovery cut-off/time | G7-A backend, G7-C deployment; GPT #2 independent audit |
| GOV-06 | Three supported authenticated POST job URLs; actual POST scheduler and catch-up/overlap receipts | G7-A config, G7-C origin/deployment binding |
| CA-01/02, P10 | Complete four-variant editor, authentic private renderer, executed review bound to draft vector and content hash | A1, then A2 site extension |
| CA-03/04/12, P01/13 | Optional historical `site`, required complete site on new normal writes, coherent rollback, approved hash-bound PDF and claim register | A2; I1 monitor/public snapshot seam |
| Old A1/A2 omitted consumers | Exact amended allowlists below, including APIs/server/media/renderer and sequential A1 -> A2 responsibilities | Parent packet authority; Gemini #1 maker |

## Actual immutable schema and security inventory

Migration order and raw SHA-256 values are listed in the input table at the end. The three immutable migrations are `app/supabase/migrations/20261001000000_a3_owner_auth_rls.sql`, `20261001000001_a4_publication_media.sql`, `20261005000000_github_refresh_state.sql`. Source also requires the separately hashed DCL artifact `app/supabase/operations/harden-publication-grants.sql` after them. DCL is not a fourth historical schema migration. No fictional `contact_submissions`, `contact_outbox`, `owner_sessions` or `private.github_refresh_state` is introduced.

All sixteen tables below have RLS enabled. All are in SQL schema **public**; private denotes denied access. `O` means active authoritative owner with cryptographically verified AAL2 through `public.is_active_owner_with_aal2()`, not editable user metadata. `service_role` gets ALL on the first fifteen tables by A3 and SELECT/INSERT/UPDATE/DELETE on table sixteen by its explicit migration. Native provider verification must establish actual role attributes/RLS behavior; the test/bootstrap role creation alone does not establish BYPASSRLS.

| Actual table | Data/key role | Effective anon/authenticated grants after required DCL | Source RLS policies |
| --- | --- | --- | --- |
| `public.admin_users` | Auth UUID FK; role=owner, active/revocation | anon none; authenticated SELECT own row with O | `admin_users_owner_select` |
| `public.audit_events` | UUID; actor Auth FK; append audit | anon none; authenticated SELECT/INSERT with O; no UPDATE/DELETE | `audit_events_owner_select`, `audit_events_owner_insert` (actor null or auth.uid) |
| `public.projects` | UUID; unique slug; draft pointer/archive | anon none; authenticated SELECT/INSERT/UPDATE/DELETE with O | `projects_owner_select`, `projects_owner_insert`, `projects_owner_update`, `projects_owner_delete` |
| `public.project_revisions` | UUID; project FK; unique project/revision; JSON payload | anon none; authenticated SELECT/INSERT/UPDATE/DELETE with O | `project_revisions_owner_select`, `project_revisions_owner_insert` (created_by=auth.uid), `project_revisions_owner_update`, `project_revisions_owner_delete` |
| `public.evidence_records` | UUID; project FK; source/status/date/notes | anon none; authenticated SELECT/INSERT/UPDATE/DELETE with O | `evidence_records_owner_select`, `evidence_records_owner_insert`, `evidence_records_owner_update`, `evidence_records_owner_delete` |
| `public.media_assets` | UUID; unique object_key; hash/MIME/bytes/dimensions/provenance/approval | anon none; authenticated SELECT/INSERT/UPDATE/DELETE with O; approved status alone grants no anon DB access | `media_assets_owner_select`, `media_assets_owner_insert`, `media_assets_owner_update`, `media_assets_owner_delete` |
| `public.site_revisions` | UUID; unique integer revision; JSON payload; actor Auth FK | anon none; authenticated SELECT/INSERT/UPDATE/DELETE with O | `site_revisions_owner_select`, `site_revisions_owner_insert` (created_by=auth.uid), `site_revisions_owner_update`, `site_revisions_owner_delete` |
| `public.publication_history` | UUID; integer publication revision; JSON snapshot; actor Auth FK | anon none; authenticated SELECT with O; required DCL removes all public/authenticated mutation grants | `publication_history_owner_select`, `publication_history_owner_insert` (actor=auth.uid), `publication_history_owner_update`, `publication_history_owner_delete`; write policies remain in SQL but DCL denies role writes |
| `public.published_content` | UUID; publication revision/payload/time; reader selects latest | anon/authenticated SELECT publicly; required DCL removes their mutation grants | `published_content_public_read` to public USING true; `published_content_owner_insert`, `published_content_owner_update`, `published_content_owner_delete` retain O predicates but no corresponding authenticated write grant |
| `public.contact_messages` | UUID; unique receipt_id; private sender/body/status/time | anon none; authenticated SELECT/UPDATE/DELETE with O; INSERT service only | `contact_messages_owner_select`, `contact_messages_owner_update`, `contact_messages_owner_delete` |
| `public.contact_idempotency` | key_hash PK; payload_hash/receipt/expiry | anon/authenticated none | zero policies |
| `public.email_outbox` | UUID; message FK cascade; status/attempt/due/lease/provider ID | anon/authenticated none | zero policies |
| `public.request_quotas` | key_hash PK; bucket/count/expiry | anon/authenticated none | zero policies |
| `public.github_snapshots` | allowlisted repository PK; last-good payload/time/status | anon/authenticated none | zero policies |
| `public.aggregate_events` | UUID; date/event/project/tier/count; unique tuple | anon/authenticated none | zero policies |
| `public.github_refresh_state` | allowlisted repository PK; attempt/status/update timestamps; no credentials/bodies | PUBLIC/anon/authenticated explicitly revoked; service CRUD only | zero policies |

A3 revokes PUBLIC public-schema usage and all table privileges, grants schema USAGE to anon/authenticated/service_role and sequence USAGE/SELECT to authenticated/service_role. O SELECT/DELETE policies use O; O INSERT uses WITH CHECK O; O UPDATE uses both USING and WITH CHECK O. The special actor conditions above apply in addition. No inherited grants are assumed absent until inspected on the actual provider. A4 adds image approval/MIME constraints, five lookup indexes and `public.publish_new_revision(integer,jsonb,uuid)`, a SECURITY DEFINER JSON snapshot/history/audit helper. Its default PUBLIC execution is removed by required DCL; only service_role execution is retained. Actual canonical publish.ts uses its own transaction statements, not that helper. Policy predicates `is_active_owner()` and `is_active_owner_with_aal2()` remain available to policy evaluation.

`auth.users` and `auth.uid()`/`auth.jwt()` in A3 are fallback/test bootstrap definitions. They do not inventory or back up live provider Auth identities, factors, sessions or configuration. Native Auth setup must inspect the provider-supported schema/functions and migration applicability without overwriting provider-managed behavior blindly. Application UUID references to Auth are part of restore dependency ordering.

| Service/configuration | Actual responsibility and recovery coverage | Current verification boundary |
| --- | --- | --- |
| Supabase PostgreSQL | Sixteen app tables; rows, schema, constraints, indexes, functions, roles/grants/RLS, migration ledger; database TLS/pooler settings | source inspected; hosted/native restore and grants NOT RUN |
| Supabase Auth | Users/identities, owner UUID, TOTP factors/recovery, signing/session configuration, disabled public signup, session revocation | provider support/capacity and actual recovery not confirmed |
| Supabase Storage | `MEDIA_PRIVATE_BUCKET` public=false; bucket/object metadata and policies; separate **object bytes**/hashes, immutable keys, access config | no real bucket/bytes inspected; DB backup is not object-byte backup |
| Vercel/hosting + DNS/CDN | Immutable deployment/build/source/tree, origin/domain/TLS, environment/config versions, retained compatible assets, real rollback eligibility | no live origin/deployment/fallback established |
| Resend/mail | Verified sender and recipient config; stable outbox idempotency keys; provider ID/outcome reconciliation | sender/capacity/delivery NOT RUN; retained runbook describes 24h provider idempotency window |
| Scheduler | Authenticated HTTP POST, stored secret privately, job schedule/results/overlap and restart/catch-up | no executable production scheduler established |
| GitHub | Five source allowlisted repository endpoints, token privately if supplied, durable last-good cache and attempt state | source inspected; no new external/evaluation receipt readback |
| Monitoring/evidence and source/art archive | Readiness/uptime/error redaction, encrypted backups, immutable runtime/source asset inventories | current capacity/config/restore ownership must be recorded |

## A1 exact content and review boundary

Do not change `src/contracts/content.ts` in A1. Preserve actual strict ContentSection variants; `list.items` is currently an array without schema `.min(1)` and section.blocks likewise has no schema minimum. Draft/publish services already require nonempty sections' blocks; A1 adds a **write validation** requiring at least one list item and unique section IDs. Keep historical schema parsing separate; do not silently claim the frozen schema already has those constraints.

```ts
type ContentBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'image'; mediaId: string; alt: string; caption: string }
  | { type: 'list'; items: string[] }
  | { type: 'code'; language: string; text: string };
// Existing nonempty text boundaries still apply; no HTML/MDX/iframe variant.
type ReviewIdentity = {
  expectedPublicationRevision: number;
  projects: Array<{ projectId: ProjectId; draftRevision: number }>;
  siteDraftRevision: number | null; // null in A1; extended by A2
  candidateSha256: string; // lowercase hex of deterministic candidate content
};
type ReviewCheck = {
  scope: 'project' | 'site'; id: string;
  kind: 'schema' | 'evidence-records' | 'https-links' | 'approved-media' | 'publication-rules';
  status: 'passed' | 'failed'; checkedAt: string; reasons: string[];
};
type PrivateDraftReview = {
  identity: ReviewIdentity; drafts: DraftRecord[];
  checks: ReviewCheck[]; canPublish: boolean;
};
type CaseStudyPresentation =
  | { mode: 'published' }
  | { mode: 'draft'; draftRevision: number };
```

`preview.ts` owns candidate assembly/checks and deterministic JSON hashing: recursively sort object keys; preserve array order; UTF-8 JSON without whitespace; hash `{projects, siteDraftRevision, site, assetManifestRevision}` (site=null in A1); omit review time, publication number and future publishedAt. Return projects sorted by ProjectId in identity; document content order is preserved in the hashed projects. Only projects eligible for publication enter that candidate; a private CandidateX preview is independent and cannot become canPublish=true. CandidateX stays publicly 404 without a separately accepted content decision.

API `GET /api/admin/preview` returns this executed review; `GET /api/admin/preview?projectId=<id>` returns the identified private draft and checks, including CandidateX only if a genuine draft exists. `/admin/preview` lists private drafts/review and `/admin/preview/[slug]` renders the actual durable draft. API anonymous=401; nonowner/AAL1/revoked=403. Page owner helper may redirect denied page visits to login; no draft bytes render first. Each page and API independently calls existing owner/AAL2 guards. No client role, dropdown or cached prior authorization is authority.

`CaseStudy` gains `presentation?: CaseStudyPresentation` (default published). Shared SectionRenderer keeps React-escaped text/code and approved image resolution. Draft mode says Draft preview/Unpublished and identifies draft revision; contribution/links headings use neutral wording instead of Verified Case Study/Contribution/Links. Its AccessibleFigure accepts HTTPS approved URLs in published mode and, only in draft mode, a server-produced relative `/api/admin/preview/media/<encoded-id>` URL with no query/fragment/traversal; the current HTTPS-only check must be narrowly amended for this exact private route. Section semantics/rendering remain identical. A1's `draft-preview.tsx` calls this interface, not a second HTML renderer.

Owner-only media resolution in manifest.ts takes `DraftRecord, OwnerContext` and returns approved image IDs/URLs only for that draft, separately from `readApprovedPublishedMediaUrls`. Use authenticated same-origin `GET /api/admin/preview/media/[id]` for bytes; recheck owner/AAL2, image approval and hash on every read and send private,no-store plus Vary Cookie,Authorization. Do not embed bearer signed Storage URLs in private HTML: those URLs can be reused without AAL2. Existing public approved-media flow remains restricted to current published image references. Missing/pending/rejected images produce a private validation failure and honest placeholder, never a public URL. The exact immutable baseline `missing-*` image blocks already grandfathered by manifest.ts may remain unchanged and visibly pending; new/arbitrarily edited missing IDs receive no exemption.

Save checks schema, stable/unique section IDs, four variants, HTTPS records and approved **image** type/bytes, inside the existing per-project transaction/lock before changing draft pointer. Unapproved or missing image ->422; stale expectedRevision ->409, no overwrite. Return current draft identity/content only to authorized conflict callers. Existing API maps both ContentValidationError and MediaValidationError to422. New section/block inputs must ask for real content; new evidence defaults to unknown/null checkedAt, not invented verified receipts. Editor preserves full Unicode/newlines, block/section/list order and unsaved buffer after failure; keyboard move controls restore useful focus.

Publish-review shows executed checks against the candidate draft vector/hash, a timestamp and failure reasons. A secure HTTPS URL check is reported as **record/URL validation**, not a claimed fresh live link or metric verification. No arbitrary evidence-URL server fetch is introduced. Retained source receipts determine evidence assertions; mutation-time dropdown validation alone cannot manufacture those receipts.

`POST /api/admin/publish` requires `{expectedRevision, review: ReviewIdentity}`. Server enters transaction, takes `yor-publication` advisory lock and participating `yor-draft-<id>` locks in lexicographic ID order, rereads exact candidate/draft revisions, compares both revision vector and candidateSha256 and reruns all checks with approval rows locked FOR SHARE. Any post-review draft/body/approval/publication change ->409 for identity mismatch or422 for invalid content; no snapshot/history/audit partial write. Matching client hash is concurrency identity, never authorization. All service/direct fixture callers of publishRevision must supply review identity; update named existing tests rather than retaining an unreviewed bypass. All success/error/401/403/404/409/422/503 private responses use private,no-store, Vary Authorization,Cookie. Proxy document no-store remains additional protection; dynamic routes/headers must be tested, including build/static artifacts.

## A2 exact site design, historical reads and additive SQL design

Rejected alternatives: mandatory site on every parsed snapshot breaks old history and old RC6-generated revisions; independent site publication counter breaks atomic public restore. Selected design keeps optional site for readers, complete site for **new normal publication writes**, and an immutable baseline fallback. Revision numbers cannot identify format: old RC6 can publish no-site revision2+, and legacy rollback creates a higher revision. No `revision>=2` parsing rule is allowed.

```ts
type ResumeReference = {
  mediaId: string; filename: string; sha256: string;
  mimeType: 'application/pdf'; approvedAt: string; downloadUrl: string;
};
type EducationEntry = {
  institution: string; degree: string; field: string;
  startYear: number; endYear: number | null; expected: boolean;
  location: string; details: string[];
};
type ExperienceEntry = {
  organization: string; role: string; period: string;
  location: string; details: string[]; certificationRef: string | null;
};
type SiteContent = {
  owner: {
    name: string; handle: string; role: string; tagline: string;
    location: string; email: string; educationSummary: string;
    experienceSummary: string;
    links: { github: string; linkedin: string; devpost: string; website: string; steam: string };
    bioParagraphs: string[];
  };
  availability: { status: 'available' | 'limited' | 'unavailable'; note: string; updatedDate: string };
  labels: { brand: string; brandSubtitle: string; projects: string; about: string;
    contact: string; resume: string; footer: string };
  projectOrder: ProjectId[];
  resume: ResumeReference | null;
  skills: Record<string, string[]>;
  education: EducationEntry[]; experience: ExperienceEntry[];
  researchParagraphs: string[];
};
type SiteDraftRecord = { draftRevision: number; site: SiteContent; updatedAt: string; updatedBy: string };
type Publication = { revision: number; publishedAt: string; projects: PublishedProject[];
  assetManifestRevision: string; site?: SiteContent };
```

Strict Zod objects reject unknown fields. Every string except explicitly optional note/caption/alt remains nonblank; email is validated; links HTTPS only and fixed keys (no arbitrary behavior/catalog data). Timestamp/approvedAt use existing offset ISO datetime. updatedDate is real YYYY-MM-DD with date validity; years integers 1900..2100 with end>=start. Paragraph/list collections preserve order; biography at least one paragraph, skills category names/items nonblank, labels nonblank, projectOrder unique and exactly the IDs in the candidate's published projects, never CandidateX. Site resume filename is basename matching `[A-Za-z0-9][A-Za-z0-9._-]{0,127}` with `.pdf`, no traversal/control characters; sha256 lowercase64. Resume downloadUrl must equal configured HTTPS canonical origin + `/api/content/resume/download?sha256=<hash>`; it is never an arbitrary fetch destination. Existing SiteContent owner fields are retained; fixed labels/links replace unconstrained dictionaries, and researchParagraphs is explicitly added to remove current About research prose from hardcoded source.

`src/content/default-site-content.ts` is a new immutable legacy fallback, grounded in the current public-content.ts and existing About/Resume/Contact source wording. Preserve historical claim context and safe provenance limits; do not relabel absent receipts newly verified. Legacy project order uses actual accepted four-project order. Null resume truthfully says no approved download. A2 emits safe provenance register and explicitly flags missing original enrollment/certificate/evaluation/diagram/PDF inputs; no invented source bytes or approval timestamps. Public metric changes require real retained receipt and Parent content adjudication. Preserve historical 78.5% deterministic80/20 LBP/GLCM calibrated RBF-SVM wording/context; 85.05% upstream drift is a separate observation pending model/dataset/code/evaluation lineage, not replacement history. Do not fetch external URLs during rendering or publish validation.

Site save is owner/AAL2 `GET/POST /api/admin/site`; POST strict `{expectedRevision, site}`. First draft has expectedRevision0 and a displayed fallback seed; take `yor-site-draft` transaction advisory lock, reread maximum site_revisions.revision, reject stale409, append unique next revision/payload/created_by and safe audit. No mutable head table is necessary. Draft save never changes published_content. `site-editor.tsx` handles all defined fields, approved resume selection, save/reopen and links to private preview; admin navigation exposes Site.

A2 extends A1 preview.ts and shared publish review with `siteDraftRevision` plus executed site checks, and draft-preview with site preview using `site-preview.tsx`; `/admin/preview` shows identified site and project drafts. A1 generic ReviewCheck scope/type already allows site; A2 may amend exactly the listed consumer paths after accepted A1. `readServerPublication` must return one request-memoized sanitized snapshot (React cache per request, not process-global cache across visitors); `resolveSiteContent(publication)` and `orderPublicationProjects(publication)` derive from it. Root layout/nav/footer/metadata and public home/About/Contact/Resume/Projects/detail use that same snapshot. Clients receive plain public site/project values, never server credentials or draft state. Backend failure uses the immutable approvedPublication + defaultSiteContent; disclose fallback revision where needed and never silently claim latest content is visible.

Normal publish takes publication -> ordered project locks -> site lock; reads latest site draft (or complete explicit seeded SiteContent when no saved draft, identity siteDraftRevision0), compares reviewed site revision/hash and validates site/media/project order, writes one complete Publication JSON to existing history/content plus audit in one transaction. Retain current assetManifestRevision unless separately assigned I1 asset publication identity changes. Cache refresh failure returns committedRevision and observed visibleRevision/unknown with warning; never claim global edge invalidation from the process-local setActivePublicationSnapshot helper. Recheck public revision on a new request/process.

Rollback takes `{targetRevision, expectedRevision, reason}`; owner/AAL2, serial publication lock, validates target shape/provenance/available approved image/PDF bytes and expected current publication, then appends a **new** revision with actor/reason/target in audit. Preserve target optional-site presence and use immutable legacy fallback when absent; do not inject current draft site into a historical target. New normal publishes after rollback still require full site. Historical snapshot bytes are never rewritten. Keep objects referenced by retained approved history available; unavailable/tampered/revoked references cause rollback422. Default legacy missing diagrams remain honest placeholders, not fabricated images.

Planned A2 SQL artifact: **new** `app/supabase/migrations/20261009000000_site_content_and_resume.sql`. No SQL implementation or hash exists as a dispatch prerequisite. Maker implements accepted design, auditor verifies resulting raw hash and executed SQL, Parent accepts exact bytes. Design:

1. Extend named `check_media_mime` constraint on public.media_assets to image/png,image/jpeg,image/webp,application/pdf, without deleting/recasting data. Constraint replacement is a bounded compatibility expansion, not a destructive table migration; retain approval constraint. PDF has dimensions=NULL; image decoder checks remain image-only. Do not add new app tables.
2. Add `idx_site_revisions_lookup` on revision DESC. Existing unique revision already guarantees identity; index is lookup-only. Existing JSON payload storage already holds site snapshots; do not modify historical rows. Generic publish_new_revision needs no semantic SQL rewrite for nested JSON; preserve hardened execution grants.
3. All sixteen public app tables/security policies remain the inventory; A2 changes media constraint/index plus code/JSON schema. Produce successor schema identity `20261009000000_site_content_v3`, ordered migration + DCL hashes and effective-policy/grant verification. Replay against pristine and upgraded accepted schema, with representative old rows/old app reader and old exporter; native locks/upgrade timing remain separate provider proof.

Resume mechanism uses existing private Storage and media_assets, with separate **document** registration/approval in new resume.ts and `/api/admin/resume`. Do not widen image block approval or sharp decoding to PDFs. Backend/owner may upload supplied PDF to the private bucket through the provider-native workflow (not a public arbitrary-upload service); AAL2 POST strict `{action:'register', objectKey, filename, expectedSha256}` downloads that bucket's bounded object (1..5MiB), verifies actual bytes/hash/MIME signature `%PDF-` and final EOF, registers pending application/pdf with dimensions NULL and provenance. Hash/signature checks establish identity/type only; before approval owner actually reviews the document and retains a safe approval receipt. POST strict approval action `{action:'approve', mediaId, reviewedSha256, approvalNote}` rechecks bytes/current hash, records actor/time/provenance and audit, then marks approved. ResumeReference hash/filename/approvedAt must match the recorded media/provenance, never caller assertion. Reject encrypted/unreviewable documents operationally; no claim of an automated PDF sanitizer/decoder is made. Ingestion/approval is separate from merely selecting a filename in Site editor. No fixture is owner-approved content. Private object keys are validated bucket-local keys under the document prefix; no URL/path traversal or externally supplied fetch target. Object reads use an abortable ten-second timeout and bounded byte accumulation; failure cannot commit approval/publication.

GET resume endpoint selects current approved publication's resume; optional sha256 must match it, validates DB approved PDF/hash/provenance and downloaded bytes before streaming. Missing reference=404 with truthful HTML notice; rejected/unapproved/tampered=404/422 as appropriate with no PDF bytes; infrastructure outage=503. Bare current endpoint uses no-store. Hash URL uses attachment, application/pdf, nosniff, safe filename and `Cache-Control: public,max-age=3600,immutable` only for the hash-verified bytes. Old cached approved bytes cannot be revoked retroactively; one-hour max-age is explicit. An old hash that is not current is rejected (retained object may still be used during validated rollback). Cross-origin downloads require no Auth because public approval is already explicit; private draft/PDF preapproval reads remain AAL2,no-store. Do not serve arbitrary public Storage URLs or assign immutable cache to mutable unversioned content.

Backup design: current backup-restore.ts enumerates fifteen tables and version1 legacy partial support; it excludes github_refresh_state, Auth and Storage bytes/config. A2 adds **application export version2** with required rows for all sixteen table names, `schemaId`, ordered migration/DCL hashes and explicit coverage=`application-data-only`. Existing version1 restore remains supported only for its recorded table subset, labeled partial; missing tables are never represented as empty success/full-service restore. v2 restore checks schema identity, required table presence, constraints/order and atomic failure, in isolated environment. Preserve v1 bytes/fixtures; JSON payloads remain opaque stored rows and historical optional-site parsing remains compatible. This expands app-export completeness without pretending it backs up Auth/MFA, database policies/DDL or Storage bytes; native full-service recovery below is still required.

## Exact source/test allowlists and sequential ownership

Paths are relative to **app/**. Existing/new status was checked against the bound tree. Every canonical change must be carried as a replacement/patch under the maker revision root; makers never write shared app/. No directory wildcard grants exist. Existing A1 files may be touched by A2 only in the specifically allocated site-extension seams. I1 later applies exact accepted overlays; no historical A1 delivery is rewritten.

### FINISH-A1: Gemini #1, base bound tree, then independent audit and Parent acceptance

| Exact path | Status | Allowed responsibility |
| --- | --- | --- |
| `src/features/admin/project-editor.tsx` | existing | Full section/block/list controls, revision buffer/focus, actual media selection and preview links |
| `src/features/admin/structured-block-editor.tsx` | new | Four variant accessible block editing |
| `src/features/admin/draft-preview.tsx` | new | Authenticated draft presentation, review identity/check results |
| `src/features/admin/publish-review.tsx` | existing | Executed review, reviewed vector/hash publish; rollback expectedRevision/reason form |
| `src/features/portfolio/case-study.tsx` | existing | Shared escaped renderer and truthful draft presentation only |
| `src/app/admin/editor/page.tsx` | existing | Authorized real drafts and approved-media inputs |
| `src/app/admin/publish/page.tsx` | existing | Actual draft review and active/historical publication separation |
| `src/app/admin/preview/page.tsx` | new | Owner-only draft index/review |
| `src/app/admin/preview/[slug]/page.tsx` | new | Owner-only actual draft detail |
| `src/server/content/preview.ts` | new | Executed review assembly/types/deterministic hash, private preview |
| `src/server/content/revisions.ts` | existing | Save-time write/media checks and authorized409 identity |
| `src/server/content/publish.ts` | existing | Review-bound revalidation, transactions/locks, honest visibility result; rollback concurrency/reason |
| `src/server/media/manifest.ts` | existing | Approved image MIME/byte checks and separate owner-only draft resolution |
| `src/app/api/admin/preview/route.ts` | new | Guarded review/private draft API and cache policy |
| `src/app/api/admin/preview/media/[id]/route.ts` | new | Guarded approved draft image-byte read with no bearer URL leakage |
| `src/app/api/admin/projects/route.ts` | existing | Strict save body/conflict/media422/private headers |
| `src/app/api/admin/publish/route.ts` | existing | Strict reviewed identity and private response headers |
| `src/app/api/admin/rollback/route.ts` | existing | Strict expected revision/reason and private response headers |
| `src/app/api/admin/media/route.ts` | existing | Sanitized image selection metadata and no-store all branches; upload semantics unchanged |
| `tests/unit/platform/completion-authoring-blocks.test.ts` | new | Exact roundtrip/reorder/schema/renderer semantics |
| `tests/integration/platform/completion-authoring-preview.test.ts` | new | Private guard/media/review/changed-draft identity/concurrency/atomicity |
| `tests/e2e/platform/completion-authoring-workflow.spec.ts` | new | Actual edit/save/reopen/cancel/preview/publish/keyboard/cache leakage browser proof |
| `tests/integration/platform/publication.test.ts` | existing | Update changed publish/rollback inputs and preserve meaningful regression expectations |
| `tests/integration/platform/canonical-platform.test.ts` | existing | Actual direct publish/rollback caller inputs and approved-image byte fixture updates; preserve durable regressions |
| `tests/integration/platform/published-media.test.ts` | existing | Strict approved image/draft-public isolation regressions |
| `tests/e2e/platform/admin-publish.spec.ts` | existing | Replace checklist-presence expectations with actual workflow outcomes |

A1 excludes content schema, migrations/DCL, Auth helper changes, all public page changes and world/room/runtime/layout styles. Existing admin styles suffice; proposed necessary additional paths require Parent amendment. Test-fixture migrations/DB adapters are read inputs; A1 changes no tables, so no fixture SQL alteration is necessary.

### FINISH-A2: Gemini #1, exact accepted A1 isolated overlay, then independent audit and Parent acceptance

| Exact path | Status | Allowed responsibility |
| --- | --- | --- |
| `src/contracts/content.ts` | existing | Add specified SiteContent/Resume schemas and optional publication site; preserve legacy format |
| `supabase/migrations/20261009000000_site_content_and_resume.sql` | new | Only accepted media MIME expansion/site lookup design |
| `src/content/default-site-content.ts` | new | Immutable historical fallback and provenance disclosure |
| `src/features/admin/site-editor.tsx` | new | Complete site authoring/save/reopen/approved document selection |
| `src/features/admin/site-preview.tsx` | new | Escaped private preview of site fields |
| `src/app/admin/site/page.tsx` | new | Owner/AAL2 site editor |
| `src/app/admin/layout.tsx` | existing | Add Site/Preview navigation links only |
| `src/server/content/site-revisions.ts` | new | Append site draft revision/service and CAS |
| `src/app/api/admin/site/route.ts` | new | Strict guarded site GET/POST/private responses |
| `src/server/content/preview.ts` | A1 new | Extend reviewed candidate/checks with site; preserve A1 project behavior |
| `src/features/admin/draft-preview.tsx` | A1 new | Add site preview/version/checks consumer |
| `src/features/admin/publish-review.tsx` | existing/A1 amended | Display site review and include site identity; retain project authoring contracts |
| `src/app/admin/preview/page.tsx` | A1 new | Add site private presentation |
| `src/server/content/publish.ts` | existing/A1 amended | Atomic site/project publish, compatibility rollback and visibility |
| `src/app/api/admin/publish/route.ts` | existing/A1 amended | Site identity validation only |
| `src/server/media/manifest.ts` | existing/A1 amended | PDF approval/availability separately from image blocks |
| `src/server/media/resume.ts` | new | Bounded document registration/approval/read identity; provider-native supplied input |
| `src/app/api/admin/resume/route.ts` | new | Owner/AAL2 registration/approval and approved document selection, no-store |
| `src/app/api/content/resume/download/route.ts` | new | Current approved hash download, bytes/headers/honest unavailable state |
| `src/content/publication-reader.ts` | existing | Legacy/site parsing, site fallback/order selectors |
| `src/content/server-publication.ts` | existing | Request-memoized coherent published snapshot; no draft fallback |
| `src/features/portfolio/public-content.ts` | existing | Legacy aliases/fallback exports only; no mutable current-site global |
| `src/app/layout.tsx` | existing | Published labels/footer/metadata consumer, request-scoped snapshot |
| `src/features/portfolio/navigation.tsx` | existing | Explicit labels prop, fixed public route URLs |
| `src/app/(public)/page.tsx` | existing | Published identity/order/availability; final StudioLauncher site prop is the later I1 seam |
| `src/app/(public)/about/page.tsx` | existing | Published biography/skills/education/experience/research |
| `src/app/(public)/contact/page.tsx` | existing | Published contact/availability; preserve contact persistence semantics |
| `src/app/(public)/resume/page.tsx` | existing | Published HTML summary/project data and approved download/honest notice |
| `src/app/(public)/projects/page.tsx` | existing | Published order/labels |
| `src/app/(public)/projects/[slug]/page.tsx` | existing | Coherent request snapshot/metadata labels; preserve public-media isolation404 |
| `src/features/monitor/commands.ts` | existing | Explicit optional public site input; site identity/contact, no new commands |
| `src/features/monitor/launcher.tsx` | existing | Optional site prop passed to commands; existing navigation preserved |
| `src/server/operations/backup-restore.ts` | existing | v2 full sixteen-table application export and honest legacy partial compatibility |
| `src/server/test-fixture.ts` | existing | Apply new migration and labeled document/site fixtures; never production approval |
| `tests/unit/platform/completion-site-content.test.ts` | new | Strict site/order/legacy/historical fallback/component site input |
| `tests/fixtures/engineering-section-4.ts` | existing | Add optional Publication.site fixture/type definition only; preserve accepted experience/legacy sections |
| `tests/unit/contract-types.test.ts` | existing | Publication exact-type successor and separate legacy-input compatibility assertions |
| `tests/integration/platform/completion-site-publishing.test.ts` | new | Site CAS/review/atomicity/legacy rollback/new-write requirement |
| `tests/integration/platform/completion-resume-download.test.ts` | new | Missing/pending/rejected/tampered/doc-type/hash/headers/registration/approval |
| `tests/integration/platform/completion-schema-v3.test.ts` | new | Additive pristine/upgraded schema/grants/legacy records/exportv2/v1 partial |
| `tests/e2e/platform/completion-site-rollback.spec.ts` | new | Site CMS/private preview/public coherence/no-JS/publish/rollback/doc notice |
| `tests/integration/platform/publication.test.ts` | existing | Successor site write/legacy rollback regression fixtures |
| `tests/integration/platform/canonical-platform.test.ts` | existing | Actual site-required publish/rollback inputs; v2 backup count and migration setup |
| `tests/integration/platform/operations-restore.test.ts` | existing | v2/v1 partial semantics, sixteen tables and atomic failure |
| `tests/e2e/platform/admin-publish.spec.ts` | existing | Site-required publish browser inputs/review expectations |

A2 excludes historical migrations, hardened DCL, approved-publication.ts historical bytes, A1 project-editor/block-editor/detail preview behavior, image decoder/upload policy, credentials/Auth, jobs behavior and world layout/runtime. Existing image `AllowedMimeType` remains image-only: document service queries typed PDF records directly and `/api/admin/resume` is the site's document selector; do not pass PDFs to current image registration/approval helpers. No new database client/schema-generated types exist in the inspected tree that require an invented path. No package/lock modification is approved by this design.

An actual `rg -l 'publishRevision\(|rollbackPublication\(' app/src app/tests` found exactly the two API handlers, publish.ts, publication.test.ts and canonical-platform.test.ts. Both test callers are allocated above. Unchanged scp-publication-outbox.test.ts and postgres-transactions.test.ts remain read-only regression execution inputs; they are not falsely described as direct changed-signature callers. Recheck callers before packet issue. Any additional actual caller discovered cannot be silently edited; report its exact path for bounded Parent addition. The listed tests are not permission to weaken accepted outcomes.

### I1 publication seam: Gemini #3, after accepted A2 + C3, no premature full CA-03 closure

Parent specifically allocates existing `src/app/(public)/page.tsx`, `src/features/world/StudioLauncher.tsx` and `src/features/world/WorldRoot.tsx` to I1 for **site prop forwarding only**, after accepted A2 page and C1/C3 world predecessors. Add `site?: SiteContent` to both world components' existing props and `site={resolveSiteContent(publication)}` to the home StudioLauncher invocation; pass home -> StudioLauncher -> DynamicWorldRoot -> Launcher. A2 does not add the home invocation prop before that interface exists, so its isolated candidate remains buildable without touching C3-owned world files. A2's `LauncherProps` adds `site?: SiteContent`; `executeTerminalCommand(input, projects, publicationRevision, site?: SiteContent)` uses supplied site or immutable historical fallback. Projects remain ordered values from the same publication. No parallel controller/site cache or server import in the client runtime. A2 public site/component input acceptance does not establish full monitor snapshot coherence; I1 runs that end-to-end after exact overlays. Parent I1 also binds the final asset manifest/publication revision only where necessary, separately reviewed; A2 must not synthesize manifest revision strings.

## Required proof and honest completion scope

A1 local candidate must demonstrate all four full-text block edits/list operations/keyboard ordering and stable focus; failed save preservation; two-session409; actual private draft renderer/escaping; post-review mutation409; image approval422; anonymous/nonowner/AAL1/revoked denial; no sentinel drafts in anonymous HTML/API/cache/build; publish same reviewed values and new public revision; truthful cache warning. A2 adds site save/reopen/private preview, reviewed site mutation409, atomic site/project/order/document publication and rollback, no-site histories at revision1 **and >1**, failed transaction and v2 export atomic failure, tampered/missing/PDF-as-image rejection, real header/hash proof on labeled fixture and genuine approved bytes when available, public no-JS and CandidateX404. Run changed targeted suites plus lint/typecheck/build and named retained regressions against exact isolated base/overlay hashes. Unit/embedded SQL/mock Auth/browser evidence is distinct from native PostgreSQL races/provider Auth and live G7 proof. Future suite counts are actual unique discovery, not frozen historical totals. Maker report retains PASS/FAIL/NOT RUN and raw command exit/build/tool/source identities; auditor reviews, original maker corrects, auditor delta reviews, Parent alone accepts.

## Recovery contracts and actual POST scheduler

Application **routing rollback** preserves the current database/schema, contact receipt/idempotency/outbox IDs, quotas, site/project drafts, committed publication/history/audit rows and private/approved media bytes. RPO=0 covers **acknowledged committed writes in the failed deployment window**, including202 contact receipts and successful CMS/publish saves. Neither successful email delivery nor in-flight unacknowledged requests are inferred from those acknowledgments. Record a synthetic write ledger before/during/after routing changes and reconcile every ID/commit and corresponding outbox/provider state. Additive code/schema compatibility is necessary preparation, not RTO/RPO proof.

G7-C binds immutable fallback deployment ID/source/tree/build/environment/schema/asset/scheduler compatibility and current actual plan eligibility. First deploy has no previous hosted target: establish a separately accepted schema-compatible historical fallback **or** two immutable deployments of the accepted source, first serving/validating one before promoting the other. Same-source pair proves routing recovery only, not older-code compatibility. Old RC6 `PublicationSchema` is strict and rejects an added site key; its public reader can fall back to older static content. Consequently RC6 cannot be declared a semantically compatible A2 fallback from additive SQL alone. Before A2 production use, obtain a real fallback containing the accepted A2-compatible reader, or independently demonstrate the chosen older fallback's acceptable publication/contact behavior without discarding site data. Do not call static older public copy current-site compatibility. Actual hosted fallback is required before rehearsal/G7 acceptance.

During authorized rehearsal pause conflicting admin/dispatch only as needed; preserve contact ingestion or return honest failure; reroute canonical origin to the verified fallback without drop/reverse migration or stale backup restore. Record incident start, route change, recovered DB/Auth readiness/public routes/contact processing/scheduler, completion time and actual <=300s; prove every acknowledged durable record survives and present publication/media remain readable. Keep provider_id, stable `outbox_<row-id>` idempotency key, lease/attempt state; fences and next-attempt records persist across processes. For send timeout after provider success, reconcile provider outcome by ID/idempotency history before retry; do not replay ambiguous older-than-provider-window rows blindly or claim exactly-once mail. Independent native overlapping-worker/expiry/restart proof is mandatory. No fallback/config/prose supplies measured RPO=0.

Full-service **disaster recovery** is separate: provider-native encrypted access-controlled DB schema/data/constraints/functions/grants/policies/ledger + github_refresh_state + supported Auth identity/MFA/session/config recovery + Storage metadata/policies/bucket config **and separately copied object bytes** + deployment/config/assets/scheduler/mail/monitoring recovery inventories. Record consistent recoverable cut-off and actual restored row/object hashes/counts, PostgreSQL/provider version, Auth fresh login/TOTP/owner revocation and inappropriate-session invalidation. Disable mail/jobs in isolated restore target; reconcile provider IDs before dispatch. Restore failure atomicity and successful restore are different receipts. Preserve live production DB and do not restore destructively from this architectural packet. On existing capacity record actual total time, loss interval/recoverable cut-off, replay coverage and limitations. The engineering24h/4h goals remain unverified planning goals; **no new five-minute/zero-loss full-service guarantee** is imposed. Application v2 JSON exports still do not replace full-service recovery.

Endpoints below are actual route **POST** targets on the bound production origin:

| URL | Source behavior | Operational schedule/proof |
| --- | --- | --- |
| `/api/internal/jobs/process-outbox` | Durable DB; default25, clamp1..100; due pending/retrying and expired processing leases; default300s lease; xmin/time fence; at most5 failed send attempts with60/300/1800/7200s retry delays | every5min, catches up due rows after restart; overlapping native connections and provider outcome reconciliation |
| `/api/internal/jobs/refresh-github` | Five allowlisted repositories; durable one-hour attempt cadence, last-good snapshot/stale>24h, bounded statuses | hourly; missed schedules invoke once then durable cadence governs; no burst replay of every missed tick |
| `/api/internal/jobs/cleanup-stale` | Expired idempotency/quotas; contacts older90days with outbox FK cascade | daily; verify retention effects/counts and repeat/overlap safety, never claim arbitrary job-detail retention is implemented |

Auth is `Authorization: Bearer <CRON_SECRET || INTERNAL_JOB_KEY>` or `x-internal-job-key`; runner uses timing-safe equality and CRON_SECRET precedence. Keep secret privately in permitted provider secret storage. Missing/wrong secret=401; unsupported authenticated job (including run)=404; execution failure500 and DB acquisition failure503. GET-only Vercel Cron/path JSON cannot invoke this POST handler. Backend maker owns native scheduler configuration, deployment maker owns real origin binding. Preferred engineering Supabase Cron + pg_net POST is conditional on actual extensions, secure secret storage, response/timeout visibility and existing quotas; choose a real permitted external POST scheduler if unavailable. No GET bridge/`/run` source mutation is authorized here.

Scheduler transport retries are separate from outbox's four send delays: retry failed5xx/timeout at most twice after30s/120s, never retry401 automatically; authenticate/config correct first. Avoid intentional overlapping scheduled runs; worker fences still protect unavoidable overlap. Persist sanitized scheduler invocation/result/time/status IDs and demonstrate delayed/canceled trigger, catch-up, expired lease reclaim, process restart and scale overlap. Redact tokens/headers/provider bodies/raw exceptions/visitor data; record bounded outcome counts and allowlisted status. Current runner error fields are not a redaction guarantee—G7 backend audit must verify actual emitted/retained responses; a necessary source fix requires a separate Parent packet. Monitor health plus delivery/catch-up backlog; a 200 job result without actual downstream receipt is insufficient.

## Missing inputs and readiness limits

| Missing or not established here | Owner/action | Consequence |
| --- | --- | --- |
| Independent R2 review/Parent ruling and accepted A1 bytes | Parent/GPT #2; exact manifests and review before dispatch/next packet | this proposal is not gate acceptance; A2 depends on accepted A1 |
| Genuine owner-approved PDF bytes, supplied approval/provenance/Storage key | Owner + backend maker, protected provider-native upload/actual review; safe hash receipt only | mechanism can be built/tested; real download requirement remains unmet until supplied |
| Enrollment/certificate/model/dataset/evaluation original receipts, Helios approved diagram | Owner/content/backend maker; retain safe pinned receipts or explicit unknown/not-measured Parent disposition | no false new verification; CA-12/diagram closure pending |
| Actual Supabase/Vercel/mail/scheduler/monitor access/plan capacity/extensions/backup rights | Parent obtains specific connection, backend/deployment makers inspect current native capabilities; no purchase assumed | production/native scheduler/rollback/full restore NOT RUN |
| Real compatible served fallback and isolated restore target | Deployment/backend makers establish on existing capacity, hash-bind config/source and measure | G7 recovery acceptance unavailable from design prose |
| I1 monitor prop wiring and cumulative candidate | Gemini #3 after A2+C3 accepted | A2 acceptance alone does not close full monitor/public snapshot CA-03 coherence |

No auth/secret files were read. Native provider/device/current service facts were not checked; retained runbook is the inspected operational input and makers must verify them at execution. No missing access is replaced by guessed schema, migration hash, provider connection or receipt.

## Raw input identity ledger

The table below hashes raw on-disk bytes, without LF normalization. Long planning/implementation files were read in applicable sections where stated; these hashes bind the whole input, not an assertion of unrelated full review. Parent consolidates these paths into the R2 input manifest. New output hash belongs to Parent's separate manifest (self-hashing this file would be circular).


| Input path | Raw SHA-256 |
| --- | --- |
| `AGENTS.md` | `06738f97b03662ccac542fc29f25b77e476d167600f78411f34eb4ff14f4a0c4` |
| `START_HERE.md` | `3c376b0033819f60bebb26964641a02ab5bb74330beecbbfc8c35e5a01f14587` |
| `docs/planning/delegation-and-work-orders.md` | `de3ecb22b80938155ac4e1e939d3fc501285aa43373596c465286e87a882bee2` |
| `docs/planning/account-operating-model.md` | `a8be4c2ee026a2b0950b0b0bd95943a249270668ace1de26fcfb190367a21da9` |
| `docs/planning/production-prompts/completion-2026-10-10/parent-amendment.md` | `e8ba580e266c7af4ccd39f40d677c3e347f9b68999b7f6a34005cd8efb46fae4` |
| `docs/planning/production-prompts/completion-2026-10-10/platform.md` | `664b0298853cff5490a0435e6665af907cd2a864025ea9ecc20b450687c6f10a` |
| `docs/planning/production-prompts/completion-2026-10-10/common-execution.md` | `239ff5844e8d95ff5e544762eaed3d56c09ea344721cab9e3c12bd1be333a777` |
| `docs/planning/production-prompts/completion-2026-10-10/README.md` | `26e737a084bd3d3ffc6c0f125796ab991b02402e10a1ee731808751b65159227` |
| `docs/planning/reconciliation-packets/2026-10-10-finish-02.md` | `e7d638685af7a8eb55ce4196be789fe3a10b4ce1b01c6390497314d17e6418ab` |
| `docs/planning/reviews/2026-10-10-completion-recheck.md` | `5fe489c7206b04bb0a24431557d1a0a7097a29a090f9ce2b39c228659da756e7` |
| `deliveries/completion-audits/recheck-2026-10-10/governance/report.md` | `978a342b817df6559abda0910bedd21480e0b2e47756faa2dc7058f7f24813ea` |
| `docs/planning/reviews/2026-10-09-completion-audit.md` | `c526d98d2857dcea026d9e82d8d19ade1a75cb091af34f7c36dff231aabd7fb8` |
| `docs/planning/reviews/2026-10-09-finish-00-contract-ruling.md` | `33777afa242d3b1b0a2f9c8e6209ae8f799d3d364a39671bdbb4856557ef0e5b` |
| `docs/planning/reconciliation-packets/finish-contracts/00-contract-decision.md` | `bb51a57ea6891898c6d48eaa817026c82a3c10bb369386aaaa53126eea004e48` |
| `docs/planning/reconciliation-packets/finish-contracts/01-path-ownership-and-allowlists.md` | `5f80c9d0e2bde92efe73928ae1981801dfa33e2d6aa3c4bc18b1dfdf8347850f` |
| `docs/planning/reconciliation-packets/finish-contracts/02-coverage-and-dependencies.md` | `5d49661956703bef13a7774ea84e2f331c8a010d50be08e5bbd17242c7c1c7de` |
| `docs/planning/reconciliation-packets/finish-contracts/03-missing-inputs-ledger.md` | `dfdcdb17ec3ffba62dc56aefadfe65fca160e8e7893ce0c69e46e1e2ed1734b0` |
| `docs/planning/reconciliation-packets/finish-contracts/04-input-output-hashes.json` | `4010ed346e03e0bc82e23992331c77dfe8d85db9a2d2687a12dd7f7a25f86213` |
| `docs/planning/reconciliation-packets/finish-contracts/05-maker-packets.md` | `a83095abb23e190591202a3764200639f725051fd25663b9ddabfdb942a5dba3` |
| `docs/planning/engineering-and-content.md` | `43525c95089f5150a0b413d462502acf5e82c01c29ad689d202b6ca5b58ea391` |
| `docs/planning/validation-and-production.md` | `0efa9bc08ce42f126d5845d33e58548ac9d8bf8904fd0d30497f47fdcba1ddef` |
| `docs/superpowers/specs/2026-09-30-yor-world-design.md` | `c5e14f1f7c662041734d6332aa90e86909d152422b27fdcd40a2d47921c013c4` |
| `docs/operations/production-execution-runbook.md` | `33f949f632993b21cefe699e7e0a4a1d75aa0ee00ea4bd33fae3ee8e0d904ccd` |
| `docs/content/evidence-register.md` | `f898c580e65f21aaaa80f9bfbf8c3b0001b914186a4ca4bea4366930558fe756` |
| `app/src/contracts/content.ts` | `5e341e5a875743439b057df7ebc6c8a7d31b921af8dd7f2576af7765974ce34f` |
| `app/supabase/migrations/20261001000000_a3_owner_auth_rls.sql` | `5a55e9baa1f19b8134d3985e54aecba9415a528c3f1d942be692148abee9c21a` |
| `app/supabase/migrations/20261001000001_a4_publication_media.sql` | `1cc1bbb0d20eb741c2dc435e795575f7b36dbfb68f477a301ee97ebd616d0afa` |
| `app/supabase/migrations/20261005000000_github_refresh_state.sql` | `d6b40d641bfba0fb8050114e7c88e1ffd8a4806c396acb4521386f01f87f0062` |
| `app/supabase/operations/harden-publication-grants.sql` | `e25af1f1bb20199fced22fc7b19983b09ee245fcb6412b6ee13fd7862ce897eb` |
| `app/src/features/admin/project-editor.tsx` | `018987d838b347ae0ee94603c6e922c304f1ec1e93e2664359681343b95a8072` |
| `app/src/features/admin/publish-review.tsx` | `afee9e44fce79a5360ff81b18a2e45ff2e63e4a0d44ff2e863e8e59ac7988664` |
| `app/src/server/content/revisions.ts` | `44f6d70bcdc42587c36f5bc738e1f4cd06590d0c23c01680cc9ae99d275b2dc9` |
| `app/src/server/content/publish.ts` | `14e76d31d13774daa5496e3475879f2e4f4bdf06b5133f32e24d7c39002d5957` |
| `app/src/features/portfolio/case-study.tsx` | `a29c653acb04a10b19e6ec8fafb48719813a29b09152319390701c0e9af49ca0` |
| `app/src/features/portfolio/public-content.ts` | `29d85d02da7e6a67ce4f12cec65927b0427fe3a02184a3d765eb4509dc932a78` |
| `app/src/features/portfolio/navigation.tsx` | `d8614fe2fd694763727c76fa0e23febee1376f098f83b0fad457af4d57d2f739` |
| `app/src/app/api/admin/projects/route.ts` | `85dbb0e666f5fd8a8e44ed557d602ac74c51cc6f49d4413a0e9e0adbbc465043` |
| `app/src/app/api/admin/publish/route.ts` | `88e488ba72e8437a9e5feae3f4207d7ec52a5852fa3b2271aeff542935e01bff` |
| `app/src/app/api/admin/rollback/route.ts` | `c62f943271a2d88c9dc7ed958377d0375eb56b19f89ffd212417bf9ba84c8066` |
| `app/src/app/api/admin/media/route.ts` | `cd15d07eeec352b2fdf882c37eb49ee7d92f64a4694cb55679f5e32899bb31e6` |
| `app/src/app/api/admin/media/[id]/route.ts` | `11a8ccbbd3399a49a41c93daca66c31f87b16d9af9cc511eca6bd3ef33b6e6c6` |
| `app/src/app/api/admin/media/[id]/approve/route.ts` | `be8bf8d7038cfd4723b4d8b3236545e93db0480901f3bf27cf0257da521a3f4c` |
| `app/src/app/api/admin/verify/route.ts` | `44be76ab1138bb4c43e533a4268ff18ec032f3f261031d6968ce8ff3f31f18d3` |
| `app/src/app/admin/editor/page.tsx` | `9194803e6ef6970a557174a7e01d200bcb83f43bb7dee9bbe607151e893216bb` |
| `app/src/app/admin/publish/page.tsx` | `4ac207f3eadb0f791bc500e793ae5b0ed4073bd7e8e147d9192a25d86a142c97` |
| `app/src/app/admin/page.tsx` | `89ae0baab61bcc13e7f9d7824e24b009c369568c0f8ad1d7cb1902998133e2ab` |
| `app/src/app/admin/layout.tsx` | `0e1c0c52bb8495535c1275008f2cde7b8a4cafa8d0ac98d75afbe3fcc47162db` |
| `app/src/server/media/manifest.ts` | `27eeb7dc36b65079c17905de6250769c6715334d27cbdaaf491a598fd1b1fe33` |
| `app/src/server/media/validate-upload.ts` | `027a53d10abe5f64422278d33926520f6ec92adc2755825c028a506767cb1eb0` |
| `app/src/content/server-publication.ts` | `d563f29370211c7ff4784f2405653b3c43918c422b6aab816595c847e4724ada` |
| `app/src/content/publication-reader.ts` | `c25b03edc19d5ffe089e1ebcceff4e669d2c2a5dce69a0a23f1795fd4d9c7d59` |
| `app/src/content/approved-publication.ts` | `0a3b8f7e6682ae3baff933f5f7d38892e2d7265c634c9b20bbb6cf17a24bd7c8` |
| `app/src/server/auth/page-owner.ts` | `fc37317f0f027fc2891c36f1f6075282e7d6985a2e8c63dedfd68e244d9d0f60` |
| `app/src/server/auth/require-owner.ts` | `697a705a00eb194e9aa674f5f1d283632530cacc29a14e6ee55f427cac9167c2` |
| `app/src/proxy.ts` | `4475e3f858f7c25de79f9cfa4acdff814853fcb696d9cd98b03beba4ce20f2be` |
| `app/src/server/jobs/runner.ts` | `54d0f2cbd3308a60588c30e193ab6946c5a5474ad3a3d3266b555bdb24ee59c9` |
| `app/src/app/api/internal/jobs/[job]/route.ts` | `dbffd061fd369f30dbbc1002a9cdb14379954e59c815c605eb6164ece8063249` |
| `app/src/server/jobs/outbox-worker.ts` | `091ecf064224c91d5372265480ab10de6226bc345a6c3ba849e38ffa0da0633b` |
| `app/src/server/operations/backup-restore.ts` | `25bb04731a9f55742de2381756d5d0cf516b807800b3e6e885d949d6154bb9a3` |
| `app/src/server/integrations/github.ts` | `985eb1d55baba3edde3f538ad320ee2d1e262287d8db2c57b7c1db5caf08ca98` |
| `app/src/server/database.ts` | `d0700e1e4b27766761b2e761c6970088bcc9e24588254fd020a34e4818134686` |
| `app/src/server/test-fixture.ts` | `ebdf9bfcd24b670a415eccf2b2ed5d429369d61b0752bc6fa2cf77276cdcfcd9` |
| `app/src/app/(public)/page.tsx` | `ef7a1ddb3a919fe4c4f794312ce4fa3aad70a94089f32ad317be5ad6f9f55653` |
| `app/src/app/(public)/about/page.tsx` | `4cc2abfbcf819b53528335558748b14d07739f96765f60287a394707c42bfeef` |
| `app/src/app/(public)/resume/page.tsx` | `4c4fe43138fc2f0636946ae1f876ff7da1034f8adf490f85751c00f91b9c64e2` |
| `app/src/app/(public)/contact/page.tsx` | `3a85a8fbb59e36a6bcf104c8f53f202bdefe95be22b66b255e2de74cd4c500e6` |
| `app/src/app/(public)/projects/page.tsx` | `fab00982a003878298472df2e56611a37714afab5340afe1fec7f92075c2e056` |
| `app/src/app/(public)/projects/[slug]/page.tsx` | `c8fa04147716c716615b96c6661e8b683c06ba9ab43e1b576638908dca555281` |
| `app/src/app/layout.tsx` | `a66ea6aef9a3cb08fd73ab34c7a15d3f47fc0e4160dd57c31e1013d693ce4437` |
| `app/src/features/monitor/commands.ts` | `43f4f7df9d4d20d777ad74d2cb063459d6002fe0658b773d756467d15124b163` |
| `app/src/features/monitor/launcher.tsx` | `5d4217efc8061019f4643a343eeffa33736c6aab28a8eb8b4857f0b49bb5210c` |
| `app/src/features/world/StudioLauncher.tsx` | `8839b201550af39dd7acbdb15b18a651f4521d59bc106f0b3094733fb434de21` |
| `app/src/features/world/WorldRoot.tsx` | `b463a5e0b5a2603f9e1bfe8972791942c4c69042a35979b85d274ef73c6302bf` |
| `app/package.json` | `0867a027648bb13d677c61670e5dd1c13383e17b9fa03e02114fab750c6c71fb` |
| `app/tests/integration/platform/publication.test.ts` | `5b6b7e4b986acf7efd4f0e31fc0dfb99701bfa117cd404f90599875820624306` |
| `app/tests/integration/platform/operations-restore.test.ts` | `1222a3fc558f4522a845dadc7447870f91b76452079811272327139c862e28f4` |
| `app/tests/integration/platform/internal-jobs.test.ts` | `616f891334e461169f0bfec3b6092503c36e7bd65807e6de47d21dc63fdf3fea` |
| `app/tests/integration/platform/postgres-transactions.test.ts` | `40e8bf6737f057b23490c8b94d8b07b797070780b4929e2b6d3e1e3e6372fa0e` |
| `app/tests/integration/platform/scp-publication-outbox.test.ts` | `9b1896276fdb3bf0fd5e983347eb56775de61f7654dbdd1664448251cedc2b3e` |
| `app/tests/integration/platform/published-media.test.ts` | `95d02435d3c848e6083a7c80fdd21c7f5d4d41c16daf1716b7a925c26ffc7bf0` |
| `app/tests/integration/platform/canonical-platform.test.ts` | `38efb541457ae0dec011dffb44b47959421182dcd82ecdd9308cddd41237284a` |
| `app/tests/e2e/platform/admin-publish.spec.ts` | `31de48693c8d66f347c090f4dfd665bc925d196e8cb0d5cdf0620ba83542e19e` |
