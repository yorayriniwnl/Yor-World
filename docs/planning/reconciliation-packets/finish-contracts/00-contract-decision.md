# FINISH-00: Parent Contract Decision and Architectural Amendments

**Packet:** FINISH-00  
**Authority:** GPT Plus #1 (Parent Architect & Acceptance Authority)  
**Cross-Lane Decisions:** Astra Architectural Gate Evaluation  
**Date:** 2026-10-09  
**Status:** ISSUED FOR INDEPENDENT AUDIT  
**Coordination Baseline:** Commit `ab369d413c7501224e3d79aa78e56172f97839ff` (documentation-only descendant of audit baseline `e0f57a49f4c3d38517be1969f96585d01378bd6c`)  
**Canonical App Tree:** `42ea29ec235225046a75959eb19eb386ac2f821d` (matching RC6-R1 accepted source `8e5b954e147a87e36a6869d9940c40f3d4c123f0`)  

---

## 1. Executive Summary & Purpose

This contract decision document completes **FINISH-00** under [parent-contracts.md](../../production-prompts/completion-2026-10-09/parent-contracts.md) and [FINISH-01](../2026-10-09-finish-01.md). It operates strictly within the accepted Product Specification Revision 2 ([2026-09-30-yor-world-design.md](../../superpowers/specs/2026-09-30-yor-world-design.md)) and does not create a competing design plan.

This ruling resolves and freezes all six cross-lane architectural decisions required before dispatching maker implementations for **FINISH-A1**, **FINISH-B1**, and **FINISH-C1**. It establishes immutable contract boundaries, exact types, file ownership allowlists, dependency chains, and outcome-level acceptance criteria to address all thirteen confirmed findings (CA-01 through CA-13) of the [2026-10-09 Full-Project Completion Audit](../../reviews/2026-10-09-completion-audit.md).

---

## 2. Astra Architectural Cross-Lane Evaluations & Decisions

Per [account-operating-model.md](../../account-operating-model.md) §4, **Astra** is invoked for critical cross-lane decisions that span Platform, Art, Runtime, and Release boundaries.

### Astra Decision 1: Publication Schema Extension & Backward Compatibility (Platform ↔ Release)
* **Problem:** Finding CA-03 identified that biography, settings, résumé reference, and project ordering are schema-only or hardcoded in source (`public-content.ts`), bypassing publication snapshotting and rollback. `PublicationSchema` in `app/src/contracts/content.ts` only versions `projects` and `assetManifestRevision`.
* **Alternatives Considered:**
  1. *Breaking schema replacement:* Redefine `PublicationSchema` with mandatory `site` object. **Rejected:** Invalidates historical accepted Revision 1 snapshot (`approvedPublication`), violating Invariant 3 (Accepted baselines are immutable).
  2. *Parallel site-publication system:* Create separate `site_publications` table and independent revision counter. **Rejected:** Breaks atomic multi-entity rollback; site copy could become desynchronized from project case studies.
  3. *Additive optional extension (Selected):* Add an optional `site: SiteContentSchema.optional()` property to `PublicationSchema`.
* **Astra Ruling:**
  - `PublicationSchema` remains the single canonical atomic publication contract.
  - An optional field `site` is added to `PublicationSchema`.
  - Historical Revision 1 (`approvedPublication`) remains strictly valid with `site: undefined`.
  - Canonical public readers (`publication-reader.ts`) implement fallback to verified baseline `defaultSiteContent` when `publication.site` is absent.
  - Publications starting at Revision 2 MUST include the complete, validated `SiteContent` snapshot.
  - Zero-downtime rollback is preserved: rolling back to Revision 1 gracefully falls back to default site content; rolling back to Revision 2+ atomically restores both site content and projects.

### Astra Decision 2: Asset-to-Runtime Binding Architecture (World / Art ↔ Runtime)
* **Problem:** Finding CA-05 and CA-11 identified that entrance door opening was relegated to a hidden, unplayed Interaction Assets (IA) scene, while production room GLB had no door animations or named leaf/book/motif nodes.
* **Alternatives Considered:**
  1. *Runtime-transplanted IA nodes:* Clone meshes and animations from IA GLB into Production Room at runtime. **Rejected:** Fragile, creates duplicate matrix hierarchies, high draw-call overhead, breaks Khronos validator clean-lineage.
  2. *Single monolithic animated GLB:* Merge all props, character, and room into one GLB. **Rejected:** Violates asset tiering; forces heavy re-download on small prop updates; exceeds mobile memory budget.
  3. *Reference-faithful Production Room with explicit named node hierarchy and runtime transform/mixer hooks (Selected).*
* **Astra Ruling:**
  - Production Room GLB (`deliveries/FINISH-B1/assets/room.glb`) is the sole visible room asset. IA subtree hiding in `WorldInteractionBinding.ts` is eliminated.
  - The production room geometry must incorporate real hex lights, round speakers, blue floor, and author the entrance door with root `Door_Frame`, child `Door_Leaf`, and explicit rotation pivot `Door_Hinge`.
  - Prop interaction targets must have stable named nodes: `Plant_Leaf_01`, `Plant_Leaf_02`, `Books_Stack`, `Chair_Seat`, `PC_Fan_Group`, `Zenith_Core`, `Camera_Lens_Ring`, `Mic_LED`.
  - The runtime drives the door opening via `EntranceCoordinator.ts` by either executing the exported `Door_Open` clip on the room mixer or animating `Door_Hinge.rotation.y` from 0 to $\pi/2$ radians over the 0.0s–2.5s entrance window.
  - All 8 approved resident character clips must be exported in `resident.glb` and registered in runtime.

### Astra Decision 3: Mobile Viewport & Stage Boundary Ownership (Runtime ↔ UI Layout)
* **Problem:** Finding CA-11 recorded 8 buttons clipped below the stage boundary in 350x520 px viewports, and stacked HUD blocks obscuring the 3D room.
* **Alternatives Considered:**
  1. *Allow parallel edits by Gemini #1 (CSS) and Gemini #3 (Canvas).* **Rejected:** Violates Prime Directive (no concurrent swarming on shared paths).
  2. *Scale down the entire 3D canvas on mobile.* **Rejected:** Degrades visual fidelity, creates letterboxing, breaks hit-test raycasting.
  3. *Exclusive ownership of WorldRoot, HUD, and Room Controls assigned strictly to FINISH-C3 (Selected).*
* **Astra Ruling:**
  - FINISH-C3 exclusively owns `WorldRoot.tsx`, `world.module.css`, `StudioLauncher.tsx`, `room-controls.tsx`, `room-controls.module.css`, and related mobile accessibility styles.
  - Mobile layout MUST place optional decorative controls inside a collapsible, accessible Room Controls drawer/panel (`aria-expanded`).
  - Essential controls (Exit Studio, Camera toggle, Sound mute, Pause, Skip Intro) MUST be positioned within the primary viewport safe area using CSS grid/flex and `env(safe-area-inset-*)`, ensuring zero clipping at 350x520 px.

---

## 3. Detailed Contract Decisions & Frozen Specifications

### Decision 1: Structured Block Editing & Private Preview Contract (FINISH-A1)

1. **Exact Block Boundary Contract:**
   The block structure in `app/src/contracts/content.ts` remains frozen to `ContentSectionSchema`. It allows ONLY:
   - `paragraph`: `{ type: "paragraph", text: z.string().min(1) }`
   - `image`: `{ type: "image", mediaId: z.string().min(1), alt: z.string(), caption: z.string() }`
   - `list`: `{ type: "list", items: z.array(z.string().min(1)).min(1) }`
   - `code`: `{ type: "code", language: z.string().min(1), text: z.string().min(1) }`
   *Arbitrary raw HTML, MDX, script tags, and unvetted iframe embeddings are strictly prohibited.*

2. **Approved-Media Boundary:**
   Any `image` block referencing `mediaId` MUST be verified against `media_assets` with `approval_status = 'approved'` and validated MIME type (`image/png`, `image/jpeg`, `image/webp`). Attempting to save or publish an unapproved media reference MUST fail validation with HTTP 422.

3. **Draft Revision Identity & Concurrency:**
   - Draft project state is stored in `project_revisions` with monotonic integer `revision`.
   - Admin save requests MUST supply the base `revision` being edited.
   - If the database revision is greater than the base revision, the server MUST return HTTP 409 Conflict with the current revision payload to prevent silent overwrite.

4. **Truthful Preview & Validation Contract:**
   - Dedicated authenticated preview route `/admin/preview` (and `/admin/preview/[slug]`) rendering draft content with the identical sanitized block renderer used by public case studies (`CaseStudy` component).
   - Access is restricted to authenticated owners with AAL2 MFA (`requireOwner`). Anonymous, non-owner, and AAL1 requests are rejected with HTTP 401/403.
   - Draft content MUST NEVER leak to public routes, static HTML responses, shared caches, or public CDNs.
   - The `/admin/publish` review interface MUST dynamically execute verification checks:
     - Project schema completeness
     - Media asset approval status
     - Evidence link validity and non-empty notes
   - Hardcoded checkmarks are prohibited; the review screen MUST display executed status (`passed` | `failed`), timestamp, and explicit failure reasons.

---

### Decision 2: Site Content Schema, Revisioning, Rollback & Migration Contract (FINISH-A2)

1. **Frozen Site Content Schema:**
   The additive `SiteContentSchema` to be incorporated in `app/src/contracts/content.ts` is defined as:

   ```typescript
   export const AvailabilityStatusSchema = z.enum(["available", "limited", "unavailable"]);
   export type AvailabilityStatus = z.infer<typeof AvailabilityStatusSchema>;

   export const ResumeReferenceSchema = z.strictObject({
     mediaId: z.string().min(1),
     filename: z.string().min(1),
     sha256: z.string().regex(/^[a-f0-9]{64}$/),
     mimeType: z.literal("application/pdf"),
     approvedAt: z.iso.datetime({ offset: true }),
     downloadUrl: z.url({ protocol: /^https$/ }),
   });
   export type ResumeReference = z.infer<typeof ResumeReferenceSchema>;

   export const EducationEntrySchema = z.strictObject({
     institution: z.string().min(1),
     degree: z.string().min(1),
     field: z.string().min(1),
     startYear: z.number().int(),
     endYear: z.number().int().nullable(),
     expected: z.boolean(),
     location: z.string().min(1),
     details: z.array(z.string().min(1)),
   });

   export const ExperienceEntrySchema = z.strictObject({
     organization: z.string().min(1),
     role: z.string().min(1),
     period: z.string().min(1),
     location: z.string().min(1),
     details: z.array(z.string().min(1)),
     certificationRef: z.string().nullable(),
   });

   export const SiteContentSchema = z.strictObject({
     owner: z.strictObject({
       name: z.string().min(1),
       handle: z.string().min(1),
       role: z.string().min(1),
       tagline: z.string().min(1),
       location: z.string().min(1),
       email: z.string().email(),
       educationSummary: z.string().min(1),
       experienceSummary: z.string().min(1),
       links: z.record(z.string(), z.string().url()),
       bioParagraphs: z.array(z.string().min(1)),
     }),
     availability: z.strictObject({
       status: AvailabilityStatusSchema,
       note: z.string(),
       updatedDate: z.string(),
     }),
     labels: z.record(z.string(), z.string()),
     projectOrder: z.array(ProjectIdSchema),
     resume: ResumeReferenceSchema.nullable(),
     skills: z.record(z.string(), z.array(z.string().min(1))),
     education: z.array(EducationEntrySchema),
     experience: z.array(ExperienceEntrySchema),
   });
   export type SiteContent = z.infer<typeof SiteContentSchema>;

   // Additive extension to PublicationSchema:
   export const PublicationSchema = z.strictObject({
     revision: z.number().int().positive(),
     publishedAt: timestamp,
     projects: z.array(PublishedProjectSchema),
     assetManifestRevision: text,
     site: SiteContentSchema.optional(), // Backward-compatible with Revision 1
   });
   export type Publication = z.infer<typeof PublicationSchema>;
   ```

2. **Additive Migration Contract:**
   The three existing migrations in `app/supabase/migrations/` are **IMMUTABLE**:
   - `20261001000000_a3_owner_auth_rls.sql`
   - `20261001000001_a4_publication_media.sql`
   - `20261005000000_github_refresh_state.sql`

   Gemini #1 is assigned to implement additive migration `20261009000000_site_content_and_resume.sql` in FINISH-A2. This migration MUST:
   - Relax `check_media_mime` constraint on `public.media_assets` to permit `'application/pdf'` (or introduce a structured document asset check constraint).
   - Ensure `site_revisions` table (already existing in migration 000000) has indexes for lookups: `CREATE INDEX IF NOT EXISTS idx_site_revisions_lookup ON public.site_revisions(revision DESC);`.
   - Update `publish_new_revision` SQL function if needed to ensure atomic snapshot persistence of site content within publication history.

3. **Approved Résumé Download Contract:**
   - The résumé document must be served as an authenticated approved media item or public download route `/api/content/resume/download`.
   - Response headers: `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="Ayush_Roy_Resume.pdf"`, `Cache-Control: public, max-age=3600, immutable`.
   - When owner-approved PDF bytes are not yet supplied, the route displays a truthful notice and the requirement remains flagged as an **UNMET OWNER INPUT / NOT RUN** in the evidence register. No fabricated document or Print-to-PDF substitute is acceptable.

4. **Claim Provenance & AI-vs-Real Drift:**
   - Retain historical 78.5% holdout claim with its exact context: evaluated 80/20 train/test split as of 2026-10-01.
   - Record the recent upstream README change (85.05%) in `docs/content/evidence-register.md` as external repository drift pending model evaluation receipts.
   - CandidateX remains strictly unpublished (HTTP 404) until real repository/deployment evidence and explicit owner authorization are recorded.

---

### Decision 3: Assets and Animation Contract (FINISH-B1 & FINISH-C2)

1. **Main Visual Reference Anchors:**
   Visual assets must conform to [main-reference.png](../../../references/images/main-reference.png):
   - Bright white/ivory desk with drawer units
   - Blue-and-white ergonomic chair
   - Hexagonal wall light panels emitting vibrant pink/lilac luminescence
   - Soft cyan ambient fill lighting
   - Warm monitor light bar illuminating keyboard/desk mat
   - Dual round desktop monitor speakers
   - Grouped accessories: pegboard, headphones on stand, game controllers, console, desktop microphone, plant on wall shelves.

2. **Proof Baseline F1 Coordinates & Scale:**
   - Room bounding box: $4.2\text{ m} \times 3.6\text{ m} \times 2.8\text{ m}$.
   - Y-up coordinate system in Three.js; Blender Z-up converted once on export.
   - Rear wall at $Z = -1.8\text{ m}$.
   - Desk footprint: $2.6\text{ m} \times 0.8\text{ m}$, height $0.75\text{ m}$, centered at $X = 0, Z = -1.15\text{ m}$.
   - Chair / resident origin: $(0.30, 0, -0.36)$.

3. **Door & Entrance Animation Binding:**
   - The production room GLB (`deliveries/FINISH-B1/assets/room.glb`) MUST contain:
     - `Door_Frame` (static frame geometry)
     - `Door_Leaf` (door panel geometry)
     - `Door_Hinge` (empty/bone with pivot at door hinge line)
   - Runtime `EntranceCoordinator.ts` drives the rotation:
     - $t = 0.0\text{s}$ to $2.5\text{s}$: `Door_Hinge.rotation.y` interpolates from $0$ to $1.5708\text{ rad}$ ($90^\circ$).
     - At $t = 2.5\text{s}$, resident begins `notice_visitor` clip.

4. **Avatar Animations (All 8 Clips Frozen):**
   The resident GLB MUST export and runtime MUST register:
   1. `coding_idle`: Typing posture loop, subtle breathing, fingers on keyboard.
   2. `notice_visitor`: Head shifts toward door threshold, hands pause.
   3. `turn_to_visitor`: Chair rotates, torso swivels toward visitor.
   4. `greeting_nod`: Subtle friendly head nod and acknowledgment gesture.
   5. `return_to_work`: Chair rotates back to desk, hands return to keyboard.
   6. `attention_glance`: Quick head turn toward visitor without chair swivel.
   7. `mouse_idle`: Hand moves to mouse, subtle wrist motion.
   8. `breathing_idle`: Seated resting breath cycle with no typing.

---

### Decision 4: Runtime Execution Contract (FINISH-C1 & FINISH-C2)

1. **Single-Owner Invariant:**
   - Exactly one camera controller owns the Three.js active camera transform (`CameraDirector`).
   - Exactly one character action director owns full-body avatar actions (`CharacterDirector`).

2. **Safe Initial Coding Activation (CA-07 Fix):**
   - In `CharacterDirector.ts`, `currentClip` MUST be initialized to `"none"` (or `null`) so that the constructor call `this.applyClip("coding_idle", 0)` immediately triggers `aAction.reset().play()`.
   - Initial scene entry MUST exhibit active typing deformation on frame 1 without requiring a prior greeting transition.

3. **Decorative Pause Implementation (CA-06 Fix):**
   - `WorldRuntime.ts` render loop MUST check `this.isDecorativePaused`.
   - When paused:
     - Avatar animation mixer delta is 0.
     - Chair and prop physical simulations delta is 0.
     - Desk clock and decorative shader time deltas are 0.
   - User interactions (clicking an object, navigating to a project, opening Room Controls) continue to function normally.
   - Pause preference is stored and restored upon tab re-entry.

4. **Truthful Loading & Retry Contract (CA-10 Fix):**
   - **Group A (Essential Assets):** Room shell, entrance door, resident avatar, chair, base materials.
   - **Group B (Optional Assets):** High-tier textures, ambient particles, secondary prop detail.
   - Once Group A is ready, the 3D studio entrance commences immediately; Group B streams in the background. Optional load failures are logged but non-fatal.
   - **Progress Display:** Display byte-based progress ONLY when `Content-Length` header is present and confirmed across all requests. Otherwise, display truthful stage names (`"Preparing studio..."`, `"Loading character..."`) with an indeterminate loading indicator. Simulated percentage progressions are strictly forbidden.
   - **Retries:** At most 2 automatic retries (maximum 3 total attempts) with exponential backoff ($500\text{ms}, 1500\text{ms}$). If essential assets fail after 15 seconds, display `"Retry 3D"` and `"Continue with Portfolio"` actions.
   - **Cancellation:** In-flight asset requests MUST take an `AbortSignal`. Clicking Skip Intro, Exit Studio, or route navigation aborts pending downloads immediately.

5. **All 25 Interaction Catalog Behaviors:**
   All 25 rows from [interaction-catalog.md](../../interaction-catalog.md) §3 are binding:
   - `plant-leaves`: Real spring-damped leaf deflection, settling in $\le 500\text{ms}$ (replaces `SET_PAUSED false`).
   - `chair`: Bounded posture adjustment on idle click with 5-second cooldown (replaces full greeting).
   - `research-books`: Bounded book nudge animation + opens Research section panel.
   - `desk-clock`: Real-time clock displaying Asia/Kolkata timezone with functional 12h/24h toggle (replaces static 17:49).
   - `helios-pc`: Transient network-path illumination motif before route navigation.
   - `zenith-model`: Transient solar energy trace motif before route navigation.
   - `ai-real-camera`: Lens ring rotation + classification indicator motif before route navigation.
   - `talks-microphone`: LED pulse + waveform acknowledgment before route navigation.
   - `speakers`: Physical mute indicator reflects actual audio mute state.
   - `window-blinds`: Slat rotation + validated cyan fill preset toggle.
   - `desk-lamp`: Warm light ease toggle.
   - `wall-painting`: Spring-damped tilt and settle ($8\text{px}$ threshold, $6^\circ$ max, $1.2\text{s}$ settle).
   - `hidden-yor-mark`: Secret signature reveal behind painting.

---

### Decision 5: Mobile Ownership and Stage Boundary Contract (FINISH-C3)

1. **Exclusive Path Ownership:**
   FINISH-C3 alone owns:
   - `app/src/features/world/WorldRoot.tsx`
   - `app/src/features/world/world.module.css`
   - `app/src/features/world/StudioLauncher.tsx`
   - `app/src/features/room/room-controls.tsx`
   - `app/src/features/room/room-controls.module.css`
   - `app/src/features/portfolio/accessibility-controls.tsx`
   - `app/src/features/portfolio/accessibility-controls.module.css`

2. **Mobile Stage Geometry & Viewport Standards:**
   - Target mobile viewport: $350\text{ px} \times 520\text{ px}$ (minimum supported: $320\text{ px}$ width).
   - All 8 controls previously clipped below the stage boundary (Exit Studio, Camera presets, Sound, Pause, Quality, Reset, Skip, Help) must be completely visible and reachable without scrolling outside the viewport.
   - Secondary controls must be grouped inside an accessible Room Controls bottom sheet or popover.
   - Touch targets must adhere to WCAG 2.2 Target Size minimum ($\ge 44 \times 44\text{ px}$ or $\ge 24\times 24\text{ px}$ with adequate spacing).
   - Full keyboard accessibility and focus trap for open modal dialogs.

---

### Decision 6: Release Compatibility, Migration Inventory & Rollback (Release & Integration)

1. **Database Schema Inventory (16 Tables):**
   The canonical database schema consists of 16 tables:
   - 15 Public Tables:
     1. `public.project_revisions`
     2. `public.site_revisions`
     3. `public.publication_history`
     4. `public.published_content`
     5. `public.media_assets`
     6. `public.contact_submissions`
     7. `public.contact_outbox`
     8. `public.contact_rate_limits`
     9. `public.contact_idempotency`
     10. `public.owner_profiles`
     11. `public.owner_sessions`
     12. `public.audit_events`
     13. `public.telemetry_daily_aggregates`
     14. `public.admin_mfa_challenges`
     15. `public.schema_migrations_ledger`
   - 1 Private Table:
     16. `private.github_refresh_state`

2. **Zero-Downtime Rollback Guarantee:**
   - All database schema modifications must be additive (no dropping columns, no renaming columns, no destructive constraints).
   - Rollback target: $RTO \le 5\text{ minutes}$, $RPO = 0$.
   - Any previous application build must be able to run against the newer database schema without fatal errors.

3. **Performance Budgets (Non-Negotiable):**
   - Public pre-world JS: $\le 200\text{ KB}$ gzip.
   - Essential world assets (Group A): $\le 3.0\text{ MB}$ uncompressed transfer.
   - Desktop frame rate: $\ge 60\text{ fps}$ sustained (p95 frame time $\le 16.6\text{ ms}$).
   - Mobile frame rate: $\ge 30\text{ fps}$ on LOW tier.
   - Cold HTML load: $\le 2.0\text{ s}$ DOMContentLoaded.
   - 3D Entrance duration: $\le 8.0\text{ s}$.
   - Instant Skip response: $\le 50\text{ ms}$.

---

## 4. Governance & Pipeline Flow

In strict accordance with `AGENTS.md` and `account-operating-model.md`:

```
PARENT PACKET (FINISH-00)
    │
    ▼
INDEPENDENT CONTRACT AUDIT (GPT Plus #2)
    │
    ▼
PARENT CONTRACT RULING (GPT Plus #1)
    │
    ▼
DISPATCH PARALLEL MAKER PACKETS:
├── Gemini #1: FINISH-A1 (deliveries/FINISH-A1/)
├── Gemini #2: FINISH-B1 (deliveries/FINISH-B1/)
└── Gemini #3: FINISH-C1 (deliveries/FINISH-C1/)
```

* **No Maker Self-Approval:** Gemini makers produce deliverables and evidence; only GPT Plus #1 issues acceptance rulings.
* **Auditor Never Fixes:** GPT Plus #2 audits code and evidence; never authors fixes.
* **Isolated Roots:** Makers write only to their designated `deliveries/<packet>/` directory. Canonical `app/` is modified solely through assigned integration (`FINISH-I1`).
