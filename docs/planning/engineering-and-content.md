# Engineering, content, and operations specification

Date: 2026-09-30. Proposed baseline. No services, accounts, schemas, credentials, or applications were created.

Parent: [Product design](../superpowers/specs/2026-09-30-yor-world-design.md).

## 1. Architecture decision

Use one Next.js App Router application containing public pages, owner administration, API endpoints, and server-side domain modules. The 3D runtime is a lazy-loaded client feature. Domain services do not import React, route handlers, or rendering code.

Use Supabase PostgreSQL, Auth, and Storage as the proposed managed backend. Use a small transactional outbox and durable database quotas instead of Redis and a separate queue service in V1. Use Supabase Cron to invoke short authenticated maintenance jobs. Provider selection is a planning recommendation, not authorization to provision or pay.

Next.js supports public request handlers and a backend-for-frontend layer; it does not replace arbitrary long-running server workloads. This plan deliberately keeps request work bounded and durable work in stored jobs. See the [official Next.js guide](https://nextjs.org/docs/app/guides/backend-for-frontend).

~~~mermaid
flowchart TD
  V[Visitor] --> H[Semantic Next.js pages]
  H --> W[Optional client 3D world]
  H --> R[Public routes and forms]
  A[Owner admin with MFA] --> S[Server domain services]
  R --> S
  S --> D[(PostgreSQL)]
  S --> O[Versioned object storage]
  S --> E[Email provider]
  J[Authenticated scheduled jobs] --> S
  D --> P[Validated published snapshot]
  P --> H
  O --> W
~~~

The renderer never receives an admin credential or unrestricted data client. The initial public pages are not blocked on a GitHub API call, an email provider, or the availability of 3D assets.

## 2. Technology and version policy

| Concern | Choice | Reason |
| --- | --- | --- |
| Web/application | Next.js App Router, TypeScript strict, React | Semantic routes, server rendering, owner UI, bounded APIs |
| 3D | Three.js + React Three Fiber; selected Drei helpers | Scene lifecycle and React integration |
| Experience state | XState stable v5 + React bindings | Explicit transitions, cancellation, independent state ownership |
| Camera timelines | GSAP, scoped to one camera director | Authored finite sequences with explicit disposal |
| Local physical response | Small deterministic damped-motion utilities | Painting/leaf reactions do not require full-world physics |
| UI styling | CSS modules + design tokens | Small baseline, direct control of composition and accessibility |
| UI animation | CSS for simple transitions | Avoid overlapping motion libraries in V1 |
| Validation | Zod at every untrusted boundary | Shared content/API schemas |
| Backend | Supabase database/Auth/Storage, server modules | Durable content and owner operations |
| Database evolution | Supabase migrations + generated database types | One migration authority; no competing ORM migration system |
| Tests | Vitest, Playwright, axe, database policy/integration tests | Behavior, real navigation, access controls |
| Asset pipeline | Blender, glTF validation, geometry/texture optimization tools | Reproducible exports and measurable assets |
| Hosting | Vercel proposed, subject to account/cost review | Convenient Next previews; application remains portable |
| Email | Resend proposed behind EmailAdapter | Replaceable delivery provider |
| Error reporting | Sentry proposed behind TelemetryAdapter | Filtered errors and release context |

Registry observations on 2026-09-30: Next 16.3.7, React 19.3.0, R3F 9.8.1, XState 5.33.2, and @xstate/react 6.1.0. R3F's published peer range includes React 19.3; the XState React binding's published peer range includes XState 5.33. These were read from the [npm registry](https://registry.npmjs.org/next/latest), including the [R3F record](https://registry.npmjs.org/@react-three/fiber/latest) and [XState binding record](https://registry.npmjs.org/@xstate/react/latest). They are candidate versions, not an installed or tested lockfile.

The current [Stately actors documentation](https://stately.ai/docs/actors) identifies itself as v6 alpha. Do not copy alpha-specific API examples into the stable-v5 implementation. Resolve the complete compatible stable set, pin exact versions, and commit the lockfile during platform setup. Recheck security advisories and provider docs then.

Installed tool observations: Blender 5.2.2 LTS, Node 24.19.0, pnpm 9.15.9. No installation changes were made.

## 3. Proposed file boundaries

These paths describe future implementation files; they do not exist yet.

~~~text
src/
  app/
    (public)/page.tsx
    (public)/projects/page.tsx
    (public)/projects/[slug]/page.tsx
    (public)/about/page.tsx
    (public)/contact/page.tsx
    (public)/resume/page.tsx
    admin/
    api/contact/route.ts
    api/events/route.ts
    api/internal/jobs/[job]/route.ts
  features/
    portfolio/       # semantic page components, navigation, project cards
    room/            # lazy root, scene, objects, named hit proxies
    experience/      # machine, intents, arbitration, preferences
    character/       # clip controller, attention, safe poses
    monitor/         # ambient display and DOM launcher
    admin/           # draft editor, preview, publishing, audit
  server/
    auth/            # verified owner/MFA checks
    content/         # revisions, evidence, publishing, snapshots
    media/           # upload review and manifest validation
    contact/         # durable receipt, quota, outbox
    github/          # cached verified repository metadata
    jobs/            # bounded workers, leases, retry
    telemetry/       # allowlisted data only
  contracts/         # shared value types and schemas; no framework imports
  ui/                # reusable accessible primitives
  styles/            # tokens and composition
supabase/
  migrations/
  tests/
assets-source/       # source index; large files stored/versioned separately
assets-runtime/      # generated manifest; hashed exports in object storage
scripts/assets/     # export validation/optimization
tests/
  unit/
  integration/
  e2e/
  performance/
docs/
~~~

Keep the development world harness outside public production routes. A production build must not expose fixture projects, testing controls, or a source asset browser.

## 4. Shared contracts

Define these once in src/contracts. Their names and fields are used by the implementation plans.

~~~typescript
type ProjectId = "candidatex" | "helios" | "zenith" | "ai-vs-real" | "talks";
type QualityTier = "high" | "medium" | "low" | "static";
type PublicRoute =
  | "/" | "/projects" | "/about" | "/about#research"
  | "/about#skills" | "/contact" | "/resume";
type CharacterAction =
  | "coding_idle" | "mouse_idle" | "notice_visitor" | "turn_to_visitor"
  | "greeting_nod" | "return_to_work" | "attention_glance" | "breathing_idle";
type CameraId =
  | "hallway" | "entry" | "reveal" | "greeting" | "home-desktop"
  | "home-mobile" | "monitor" | "pc" | "energy" | "scanner"
  | "microphone" | "about" | "contact";

type EvidenceStatus = "verified" | "unknown" | "not-measured" | "not-applicable";
type EvidenceRef = {
  id: string; kind: "repository" | "deployment" | "measurement" | "document";
  url: string | null; checkedAt: string | null; status: EvidenceStatus;
  note: string;
};
type PublishedProject = {
  id: ProjectId; slug: string; title: string; summary: string;
  contribution: string; sections: ContentSection[];
  links: { label: string; url: string; checkedAt: string }[];
  evidence: EvidenceRef[]; revision: number;
};
type ContentSection = {
  id: string; heading: string;
  blocks: Array<
    | { type: "paragraph"; text: string }
    | { type: "image"; mediaId: string; alt: string; caption: string }
    | { type: "list"; items: string[] }
    | { type: "code"; language: string; text: string }
  >;
};
type Publication = {
  revision: number; publishedAt: string;
  projects: PublishedProject[]; assetManifestRevision: string;
};
type WorldSnapshot = {
  version: 1; lampOn: boolean; blindsOpen: boolean; detailFound: boolean;
};
type Preferences = {
  version: 1; introCompleted: boolean; soundEnabled: boolean;
  quality: QualityTier | "auto"; clock24h: boolean;
};
type ExperienceIntent =
  | { type: "ENTER"; replay: boolean }
  | { type: "SKIP" }
  | { type: "GREET" }
  | { type: "OPEN_PROJECT"; projectId: ProjectId; source: "room" | "dom" }
  | { type: "NAVIGATE"; path: PublicRoute; source: "room" | "dom"; camera: CameraId | null }
  | { type: "OPEN_PANEL"; panel: "launcher" | "room-controls" | "replay" }
  | { type: "SET_LAMP"; enabled: boolean }
  | { type: "SET_BLINDS"; open: boolean }
  | { type: "SET_SOUND"; enabled: boolean }
  | { type: "SET_QUALITY"; quality: QualityTier | "auto" }
  | { type: "SET_CLOCK_FORMAT"; clock24h: boolean }
  | { type: "SET_PAUSED"; paused: boolean }
  | { type: "ESCAPE" }
  | { type: "HIDE" }
  | { type: "SHOW" }
  | { type: "RENDERER_FAILED"; code: string };
type AssetManifest = {
  revision: string; schemaVersion: 1;
  groups: Array<{
    id: string; tier: QualityTier; url: string; sha256: string;
    bytes: number; triangles: number; materials: number;
    estimatedGpuBytes: number; clips: string[];
    provenanceId: string; approved: boolean;
  }>;
};
~~~

Add fields only through reviewed schema changes. ContentSection deliberately excludes raw HTML and executable MDX. The CMS cannot inject scripts, arbitrary camera programs, or uncontrolled model URLs.

## 5. Render and state lifecycle

Create one WebGL canvas only after Enter studio. Dispose the renderer, textures owned by that scene, listeners, workers, timelines, and audio nodes when the world is left or disabled. Reuse resources deliberately inside a world session; do not dispose a shared texture while another object uses it.

The experience controller owns state progression. CameraDirector.transitionTo(cameraId, signal) returns a completion promise; CharacterDirector.play(action, signal) returns a completion promise. Neither may navigate independently. The NavigationAdapter owns route changes.

CameraDirector.playEntrance owns only camera motion. The entrance coordinator owns the common timeline and coordinates character clips; neither subsystem may start a second copy of the sequence. Looping character actions resolve after starting successfully; finite actions resolve when finished. Abort or dispose stops their owned effects in either case.

Controller dependencies are explicit: camera, character, lighting, navigation, worldLoader, audio, publication, clock, preferenceStorage, and snapshotStorage. Clock exposes now(): number and abortable delay(ms, signal): Promise<void>; storage exposes validated read()/write() and falls back to memory when unavailable. WorldLoader.prepare(tier, signal) resolves only when required groups are decoded; dispose() is idempotent. Inject these adapters in tests rather than depending on real time/network.

Continuous visible animation requires frames. Demand rendering is useful when idle/paused/static, but does not magically remove the cost of a constantly animated character. [R3F's performance guidance](https://r3f.docs.pmnd.rs/advanced/scaling-performance) explains demand rendering and explicit invalidation.

Pause the frame loop while hidden. On return, reset delta accumulation and restore a safe visible state rather than simulating minutes of missed motion. On renderer/context failure, show static content, record a bounded diagnostic, and allow one explicit retry.

Quality adaptation may reduce DPR, shadows, effects, and asset LOD. It must not change content availability. Downgrades require sustained slow windows; upgrades occur only at a safe home state after sustained recovery, preventing oscillation.

## 6. Live monitor decision

Use an inexpensive ambient screen texture for illustrative coding. At focus, align a DOM launcher with the monitor, then give HTML ownership of readable interaction.

Drei Html offers transformed DOM placement and occlusion controls, with documented blur caveats on some devices. See [Drei Html](https://drei.docs.pmnd.rs/misc/html). Validate it in Safari and during resize; if it fails clarity/alignment, transition to a screen-framed HTML panel. Do not describe a DOM overlay as a universally supported live DOM-to-WebGL texture.

Do not embed external project sites or a general-purpose IDE. CandidateX/Helios/etc. are case-study destinations; their actual live demos open as verified links.

## 7. Routes and public data

| Route | Behavior |
| --- | --- |
| / | HTML landing, optional room entry |
| /projects | Published project list |
| /projects/[slug] | Complete semantic case study; unknown slug returns 404 |
| /about | Verified biography, skills, education/research where supported |
| /contact | Accessible contact form and verified alternative contact link |
| /resume | HTML résumé summary plus current approved downloadable document |
| /admin | Owner-only content/admin UI |
| /api/contact | Validated durable message receipt |
| /api/events | Bounded allowlisted anonymous events; no freeform payload |
| /api/internal/jobs/[job] | Secret-authenticated bounded worker endpoint |

Public reads use a published snapshot and cached fallback. Draft previews require owner authentication and must never enter shared public caches. Direct case-study visits do not import the room bundle.

Validate configured URLs to HTTPS and approved link types. External links are visibly identified; server requests fetch only explicitly configured GitHub repository endpoints, not arbitrary visitor-provided URLs.

## 8. Data model

Use UUID primary keys where not defined otherwise, UTC timestamps, constrained status values, and explicit foreign-key behavior. Public project slugs are unique. Delete is archive-first for published content.

| Table | Main fields / invariant |
| --- | --- |
| projects | id, unique slug, title, draft_revision, archived_at |
| project_revisions | project_id, revision, validated payload, created_by, created_at; unique project/revision |
| evidence_records | project_id, kind, source_url, checked_at, status, notes; authoring access only |
| media_assets | object_key, hash, MIME, bytes, dimensions, provenance, approval status |
| site_revisions | revision, validated biography/settings/résumé references |
| publication_history | immutable approved snapshots, revision, actor, timestamp; owner-only |
| published_content | active sanitized payload and revision; public read only |
| admin_users | auth user ID, role=owner, active flag; no user-controlled role editing |
| contact_messages | receipt ID, name, email, body, received_at, status; private |
| contact_idempotency | key hash, payload hash, receipt ID, expires_at |
| email_outbox | message ID, status, attempts, next_attempt_at, lease_until, provider_id |
| github_snapshots | configured repository ID, payload, fetched_at, stale/error status |
| request_quotas | hashed key, bucket_start, count, expires_at; atomic updates |
| audit_events | actor, action, entity/revision, timestamp; no message body/secret |
| aggregate_events | date, allowlisted event, project ID, tier, count |

Data API grants and row policies must both be deliberate. Enable RLS on exposed tables, deny public writes, and isolate private records. A publishable key is not an authorization mechanism. The [Supabase RLS guide](https://supabase.com/docs/guides/database/postgres/row-level-security) explains the combined grants/policy model.

## 9. Owner authentication and authorization

Disable public account creation. Provision the initial owner through a separately approved administrative setup. Require verified identity, a currently active owner record, and MFA assurance on every mutation and private-data read.

Use the maintained SSR client pattern and current server-side identity validation, rather than trusting a cookie's claimed user or a client-provided role. See [Supabase SSR guidance](https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs) and [MFA guidance](https://supabase.com/docs/guides/auth/auth-mfa).

Normal user-scoped data operations retain RLS. Narrow server-only service operations may publish snapshots, receive contact, and process jobs after their own guards; the service credential never enters browser code. Authorization metadata is not taken from editable profile fields.

Recheck owner status for each privileged action; revoked access must not depend solely on a stale role claim. Admin mutations use same-origin checks, explicit validation, and a CSRF strategy appropriate to the chosen action/handler boundary. Login, mutation, and contact quotas are durable across multiple processes.

## 10. Publishing and CMS

The owner edits structured blocks, project ordering, verified links, biography, résumé reference, availability, and labels. Scene asset IDs, allowed interaction types, and camera presets come from a versioned catalog; the CMS cannot invent runtime behavior.

Workflow: draft -> validate evidence/media -> authenticated preview -> publish transaction -> cache refresh -> verify public revision. Editing and publishing are different actions.

Use optimistic concurrency: expected revision mismatch returns 409 without overwriting another edit. Publishing atomically records history, updates active public content, and writes an audit entry. If cache refresh fails, keep the transaction durable and retry refresh; report which revision is publicly visible.

Rollback selects a known approved snapshot, verifies referenced assets are still available, publishes it as a new revision, and records the actor/reason.

Draft uploads use private storage. Validate actual file type, limits, dimensions, and decodeability server-side before approval. Published assets use immutable hashed names. Large .blend source files stay outside normal Git history; a source manifest points to backed-up versions. Asset storage versioning/backups must be configured and tested rather than assumed.

## 11. Contact and email

ContactInput: name 2–100 characters; email validated and at most 254 characters; message 20–4000 characters; request body at most 8 KiB; a UUID idempotency key; optional honeypot field which must be empty. Trim outer whitespace, reject unknown executable/attachment fields, and escape any eventual HTML email.

Contact response contract: invalid fields 400; oversized body 413; idempotency mismatch 409; quota exceeded 429 with Retry-After; unavailable persistence 503; durable receipt 202. A replay of an accepted matching request returns the original receipt with 202.

Persist the message and outbox item atomically before returning a receipt. Return "Message received" only after persistence; never equate receipt with email delivery.

Same idempotency key + same normalized payload returns the original receipt for 24 hours. Same key + different payload returns 409. Apply atomic quotas: 3 attempts per 10 minutes per network key and 10 per day per email key, plus a configurable global abuse ceiling. Hash quota identifiers using a server-held rotating secret; do not log raw IP addresses.

Try short bounded delivery, then process retries via the outbox. Jobs claim rows with leases so concurrent workers cannot both own the same attempt. Retry after approximately 1, 5, 30, and 120 minutes, then mark failed for owner attention. Use stable provider idempotency keys where supported; verify the chosen provider's behavior during implementation. Database receipts remain valid during an email outage.

Use [Supabase Cron](https://supabase.com/docs/guides/cron) for a five-minute authenticated job trigger, with catch-up after delays. No browser request launches an untracked background promise. The exact scheduler secret and provider configuration are release prerequisites.

Proposed retention: contact messages 90 days unless the owner explicitly retains an active conversation; idempotency/quotas expire after their operational windows; job error details 30 days. Explain collection and retention on the contact page. These are product defaults, not a legal-compliance determination.

## 12. GitHub, telemetry, and availability

GitHub metadata is server-fetched for an explicit repository allowlist, refreshed at most hourly, with a timestamp and stale indication after 24 hours. Preserve the last good response on a rate limit or outage. Do not expose access tokens or treat commit counts as an expertise score.

Event allowlist: studio_entry_requested, studio_ready, intro_completed, intro_skipped, project_opened, fallback_used, contact_received, renderer_failed. Optional local object events may be aggregated later. Record project ID, coarse quality tier, and bounded error code only. Do not record contact text, keystrokes, full referrers, raw GPU identifiers, or visitor profiles.

Start with aggregate product counters and technical errors; no session replay or marketing tracker. Respect applicable user preferences and disclose collection. Analytics failure never blocks an action.

## 13. Environments, delivery, and rollback

Local development uses fixtures and a local backend where practical. Staging has separate database/storage/secrets and test contacts. Preview deployments do not point to production-write credentials. Production has its own approved publication and asset manifest.

CI checks frozen install, lint, typecheck, unit tests, database authorization/integration tests, asset validation, build, E2E, accessibility checks, and budget regression. Changed art receives visual review at fixed cameras. Checks produce evidence; no single tool supplies a blanket release-ready claim.

Deploy immutable runtime assets first, verify hashes and availability, then deploy application/config referencing the manifest. Keep the previous compatible asset and publication revisions for rollback. Database changes use an expand/migrate/contract approach; destructive changes require separate review.

Back up database content and source/runtime assets independently. Rehearse restoring a content revision and a clean environment before production. Suggested recovery targets are within 24 hours of data and within 4 hours to restore service; these are unverified operational goals dependent on provider capability and rehearsal.

## 14. Current documentation checks and open provider questions

The Supabase changelog was checked on 2026-09-30. A [PostgreSQL minor-release notice](https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes) concerns certain extensions/operators; this new plan does not rely on those extensions. Select a supported patched database release when provisioning and recheck the changelog then.

Open external facts: account ownership, chosen region, domain, current service quotas/costs, sender-domain verification, backup availability, and source-asset storage capacity. None is silently assumed purchased or configured.
