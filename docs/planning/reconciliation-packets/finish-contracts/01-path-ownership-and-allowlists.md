# FINISH Path Ownership, Allowlists, and Maker Packet Contracts

**Document:** `01-path-ownership-and-allowlists.md`  
**Parent Authority:** GPT Plus #1 (Lead Architect)  
**Date:** 2026-10-09  
**Status:** BINDING GOVERNANCE SPECIFICATION  
**Applies To:** FINISH-A1, FINISH-A2, FINISH-B1, FINISH-C1, FINISH-C2, FINISH-C3, FINISH-I1, G7, EXT-01..06  

---

## 1. Prime Governance Directives for File Ownership

1. **No Direct Writes to Canonical `app/`:**
   Makers must never edit canonical `app/` directly. Each maker produces source replacements or patches strictly within its assigned delivery root (`deliveries/<packet>/source/`).
2. **Canonical Mapping via Strict Allowlist:**
   Only paths explicitly enumerated in the packet's canonical changed-path allowlist may be mapped into the canonical successor application during integration (`FINISH-I1`).
3. **Sequential Account Execution:**
   - Gemini #1 executes **FINISH-A1**, then **FINISH-A2**.
   - Gemini #2 executes **FINISH-B1**.
   - Gemini #3 executes **FINISH-C1**, then **FINISH-C2**, then **FINISH-C3**, then **FINISH-I1**.
   - **FINISH-A1**, **FINISH-B1**, and **FINISH-C1** may execute in parallel because their delivery roots and canonical allowlists are completely disjoint.
4. **Human Git Rule:**
   After completing code changes, each worker commits and pushes only its owned delivery paths. Do not bundle unrelated changes, modify historical records, or force-push.

---

## 2. Maker Packet Ownership Specifications

### Packet: FINISH-A1 — Substantive Block Authoring & Private Preview
* **Assigned Maker:** Gemini #1 (Platform Maker)
* **Exclusive Delivery Root:** `deliveries/FINISH-A1/`
* **Prerequisites:** FINISH-00 Parent Contract Gate acceptance.
* **Base Coordination Commit:** `ab369d413c7501224e3d79aa78e56172f97839ff`
* **Base App Tree:** `42ea29ec235225046a75959eb19eb386ac2f821d`
* **Canonical Changed-Path Allowlist (relative to `app/`):**
  - `src/features/admin/project-editor.tsx`
  - `src/features/admin/structured-block-editor.tsx` *(new)*
  - `src/features/admin/draft-preview.tsx` *(new)*
  - `src/features/admin/publish-review.tsx`
  - `src/app/admin/editor/page.tsx`
  - `src/app/admin/publish/page.tsx`
  - `src/app/admin/preview/page.tsx` *(new)*
  - `src/server/content/preview.ts` *(new)*
  - `src/app/api/admin/preview/route.ts` *(new)*
  - `tests/unit/platform/completion-authoring-blocks.test.ts` *(new)*
  - `tests/integration/platform/completion-authoring-preview.test.ts` *(new)*
  - `tests/e2e/platform/completion-authoring-workflow.spec.ts` *(new)*
* **Forbidden Paths:**
  - `src/contracts/content.ts` *(frozen in this turn)*
  - `supabase/migrations/*` *(immutable)*
  - `src/app/(public)/*` *(public routes owned by FINISH-A2)*
  - All world, room, and runtime paths (`src/features/world/*`, `src/features/room/*`)
* **Independent Reviewer:** GPT Plus #2 (Platform Auditor)
* **Outcome Acceptance Checks:**
  1. Full round-trip UI editing, addition, deletion, and reordering of all four block types (paragraph, image, list, code).
  2. Saving and reopening case study displays exact saved content with zero placeholder fallbacks.
  3. Private preview route displays authentic draft content rendered through sanitized `CaseStudy` component; unauthorized requests return HTTP 401/403.
  4. Optimistic concurrency conflict (HTTP 409) verified when base revision is stale.
  5. Publish review page displays executed per-project verification results instead of hardcoded checkmarks.
* **Expected Delivery Artifacts:**
  - `deliveries/FINISH-A1/source/` (canonical-relative replacement files)
  - `deliveries/FINISH-A1/source.patch`
  - `deliveries/FINISH-A1/report.md`
  - `deliveries/FINISH-A1/input-hashes.json`
  - `deliveries/FINISH-A1/output-hashes.json`
  - `deliveries/FINISH-A1/evidence/` (raw test receipts and screenshots)

---

### Packet: FINISH-A2 — Site Content Versioning, Approved Résumé & Claim Provenance
* **Assigned Maker:** Gemini #1 (Platform Maker)
* **Exclusive Delivery Root:** `deliveries/FINISH-A2/`
* **Prerequisites:** FINISH-A1 acceptance by GPT Plus #1; accepted contract design for site content schema.
* **Base Coordination Commit:** Accepted FINISH-A1 successor commit.
* **Canonical Changed-Path Allowlist (relative to `app/`):**
  - `src/contracts/content.ts` *(additive SiteContentSchema and updated PublicationSchema)*
  - `supabase/migrations/20261009000000_site_content_and_resume.sql` *(new additive migration)*
  - `src/features/admin/site-editor.tsx` *(new)*
  - `src/app/admin/site/page.tsx` *(new)*
  - `src/server/content/site-revisions.ts` *(new)*
  - `src/server/content/publish.ts`
  - `src/content/publication-reader.ts`
  - `src/content/server-publication.ts`
  - `src/features/portfolio/public-content.ts`
  - `src/app/(public)/page.tsx`
  - `src/app/(public)/about/page.tsx`
  - `src/app/(public)/resume/page.tsx`
  - `src/app/(public)/projects/page.tsx`
  - `src/app/api/content/resume/download/route.ts` *(new)*
  - `tests/unit/platform/completion-site-content.test.ts` *(new)*
  - `tests/integration/platform/completion-site-publishing.test.ts` *(new)*
  - `tests/e2e/platform/completion-site-rollback.spec.ts` *(new)*
* **Forbidden Paths:**
  - Three historical migrations: `20261001000000_*`, `20261001000001_*`, `20261005000000_*`
  - FINISH-A1 editor files: `project-editor.tsx`, `publish-review.tsx`
  - All world, room, and runtime paths
* **Independent Reviewer:** GPT Plus #2 (Platform Auditor)
* **Outcome Acceptance Checks:**
  1. Owner can edit and save biography, skills, availability, display labels, project order, and résumé reference in CMS.
  2. Transactional publication saves both site content and projects atomically in publication history.
  3. Coherent rollback restores earlier site and project snapshot as a new publication revision.
  4. Public routes (`/`, `/about`, `/resume`, `/projects`) dynamically read published snapshot with graceful fallback to default verified identity.
  5. Downloadable résumé endpoint serves approved PDF with verified SHA-256 and immutable download headers; unapproved state displays honest status.
  6. Provenance register binds all verified claims to archived receipts.
* **Expected Delivery Artifacts:**
  - `deliveries/FINISH-A2/source/`
  - `deliveries/FINISH-A2/source.patch`
  - `deliveries/FINISH-A2/provenance/evidence-register.md`
  - `deliveries/FINISH-A2/report.md`
  - `deliveries/FINISH-A2/input-hashes.json`
  - `deliveries/FINISH-A2/output-hashes.json`

---

### Packet: FINISH-B1 — Reference-Faithful Assets & Usable Motion Bindings
* **Assigned Maker:** Gemini #2 (World / Art Maker)
* **Exclusive Delivery Root:** `deliveries/FINISH-B1/`
* **Prerequisites:** FINISH-00 Parent Contract Gate acceptance.
* **Base Coordination Commit:** `ab369d413c7501224e3d79aa78e56172f97839ff`
* **Canonical Changed-Path Allowlist (relative to `app/`):**
  - *No direct files in `app/`.* Assets are staged under delivery root and consumed by runtime in FINISH-C2/I1.
* **Exclusive Output Domain (under `deliveries/FINISH-B1/`):**
  - `assets/room.glb`
  - `assets/resident.glb`
  - `assets/textures/*`
  - `source/blender/models/*.blend`
  - `source/blender/scripts/build-environment.py`
  - `source/blender/scripts/export-assets.py`
  - `binding-inventory.json`
  - `provenance.json`
  - `captures/reference-comparison.png`
  - `captures/desktop-home.png`
  - `captures/mobile-home.png`
  - `captures/door-open-sequence.png`
  - `report.md`, `input-hashes.json`, `output-hashes.json`
* **Forbidden Paths:**
  - Direct edits to `app/`
  - Overwriting historical delivery assets in `deliveries/production-environment/` or `deliveries/interaction-assets/`
* **Independent Reviewer:** GPT Plus #2 (Art & Asset Auditor)
* **Outcome Acceptance Checks:**
  1. Room composition faithfully captures main reference: hex light panels with pink/lilac luminescence, round speakers, blue floor, white desk, cyan ambient fill.
  2. Door assembly (`Door_Frame`, `Door_Leaf`, `Door_Hinge`) modeled with proper rotational pivot.
  3. All 8 approved resident character animation clips export cleanly and play without deformation artifacts.
  4. Stable named nodes present for leaf deflection (`Plant_Leaf_01`), book nudge (`Books_Stack`), chair swivel (`Chair_Seat`), and project motifs.
  5. 100% Khronos GLB validation pass with 0 errors and 0 warnings.
  6. Asset size budgets: room $\le 1.5\text{ MB}$, resident $\le 800\text{ KB}$, textures $\le 1.5\text{ MB}$.
* **Expected Delivery Artifacts:**
  - GLB files, textures, Blender sources, build scripts, validation logs, screenshots, and binding inventory.

---

### Packet: FINISH-C1 — Character Animation Activation, Pause & Truthful Loading
* **Assigned Maker:** Gemini #3 (Runtime Maker)
* **Exclusive Delivery Root:** `deliveries/FINISH-C1/`
* **Prerequisites:** FINISH-00 Parent Contract Gate acceptance.
* **Base Coordination Commit:** `ab369d413c7501224e3d79aa78e56172f97839ff`
* **Base App Tree:** `42ea29ec235225046a75959eb19eb386ac2f821d`
* **Canonical Changed-Path Allowlist (relative to `app/`):**
  - `src/features/world/CharacterDirector.ts`
  - `src/features/world/SceneIntegrator.ts`
  - `src/features/world/WorldRuntime.ts`
  - `src/features/world/AssetLoader.ts`
  - `tests/unit/world/completion-character-startup.test.ts` *(new)*
  - `tests/unit/world/completion-decorative-pause.test.ts` *(new)*
  - `tests/unit/world/completion-essential-loader.test.ts` *(new)*
  - `tests/integration/world/completion-runtime-lifecycle.test.ts` *(new)*
* **Forbidden Paths:**
  - UI layout files (`WorldRoot.tsx`, `world.module.css`, `room-controls.tsx`)
  - Platform/CMS files
  - Shared contracts `src/contracts/*`
  - Direct edits to shared canonical `app/`
* **Independent Reviewer:** GPT Plus #2 (Runtime Auditor)
* **Outcome Acceptance Checks:**
  1. `coding_idle` animation action is scheduled and active on frame 1; verified by bone transform change during first 1000ms.
  2. Public Decorative Pause stops avatar animation, prop updates, and clock advancement in the render loop; navigation and UI controls remain fully functional.
  3. Group A essential assets allow 3D entrance without blocking on Group B optional textures.
  4. Loader displays byte progress only when total bytes are verified; otherwise displays truthful stage names with indeterminate loading; zero simulated percentages.
  5. Maximum 2 automatic retries (3 total attempts) with bounded backoff; 15-second timeout surfaces Retry / Continue actions.
  6. Cancellation via `AbortSignal` verified on Skip, Exit, or route transition.
* **Expected Delivery Artifacts:**
  - `deliveries/FINISH-C1/source/`
  - `deliveries/FINISH-C1/source.patch`
  - `deliveries/FINISH-C1/report.md`
  - `deliveries/FINISH-C1/evidence/`
  - `deliveries/FINISH-C1/input-hashes.json`
  - `deliveries/FINISH-C1/output-hashes.json`

---

### Packet: FINISH-C2 — Visible Entrance & All 25 Interaction Catalog Outcomes
* **Assigned Maker:** Gemini #3 (Runtime Maker)
* **Exclusive Delivery Root:** `deliveries/FINISH-C2/`
* **Prerequisites:** FINISH-B1 AND FINISH-C1 acceptance by GPT Plus #1.
* **Base Coordination Commit:** Accepted integrated successor of B1 and C1.
* **Canonical Changed-Path Allowlist (relative to `app/`):**
  - `src/features/world/EntranceCoordinator.ts`
  - `src/features/world/WorldInteractionBinding.ts`
  - `src/features/world/SceneIntegrator.ts`
  - `src/features/world/WorldRuntime.ts`
  - `src/features/world/CharacterDirector.ts`
  - `src/features/experience/experience.ts`
  - `src/features/room/interaction-registry.ts`
  - `tests/unit/world/completion-catalog-behaviors.test.ts` *(new)*
  - `tests/integration/world/completion-door-entrance.test.ts` *(new)*
  - `tests/e2e/world/completion-catalog-outcomes.spec.ts` *(new)*
* **Forbidden Paths:**
  - UI layout files (reserved for FINISH-C3)
  - Platform/CMS files
  - Direct edits to shared canonical `app/`
* **Independent Reviewer:** GPT Plus #2 (Runtime Auditor)
* **Outcome Acceptance Checks:**
  1. Visible door opening choreography executed during entrance ($0.0\text{s}$–$2.5\text{s}$); resident notices, turns, nods, and returns.
  2. Skip / Escape cancels entrance sequence immediately ($\le 50\text{ms}$).
  3. All 25 interaction catalog rows produce verified physical/material/route responses:
     - Plant leaf deflection (replaces `SET_PAUSED false`)
     - Chair posture adjustment with 5s cooldown (replaces full greeting)
     - Book nudge + Research panel
     - Live Asia/Kolkata clock with 12h/24h toggle
     - Motifs for Helios, Zenith, Camera, and Microphone
     - Painting spring settlement ($8\text{px}, 6^\circ, 1.2\text{s}$)
     - Hidden mark discovery
  4. Integration of all 8 core resident clips verified in browser runtime.
* **Expected Delivery Artifacts:**
  - `deliveries/FINISH-C2/source/`
  - `deliveries/FINISH-C2/source.patch`
  - `deliveries/FINISH-C2/catalog-outcomes.json`
  - `deliveries/FINISH-C2/report.md`
  - `deliveries/FINISH-C2/evidence/`

---

### Packet: FINISH-C3 — Mobile Viewport Framing & Unclipped Controls
* **Assigned Maker:** Gemini #3 (Runtime Maker)
* **Exclusive Delivery Root:** `deliveries/FINISH-C3/`
* **Prerequisites:** FINISH-C2 acceptance by GPT Plus #1.
* **Base Coordination Commit:** Accepted FINISH-C2 successor commit.
* **Canonical Changed-Path Allowlist (relative to `app/`):**
  - `src/features/world/WorldRoot.tsx`
  - `src/features/world/world.module.css`
  - `src/features/world/StudioLauncher.tsx`
  - `src/features/room/room-controls.tsx`
  - `src/features/room/room-controls.module.css`
  - `src/features/portfolio/accessibility-controls.tsx`
  - `src/features/portfolio/accessibility-controls.module.css`
  - `tests/e2e/runtime/completion-mobile-hud.spec.ts` *(new)*
* **Forbidden Paths:**
  - All 3D physics, scene integrator, or character director files
  - Platform/CMS files
  - Direct edits to shared canonical `app/`
* **Independent Reviewer:** GPT Plus #2 (Runtime & Accessibility Auditor)
* **Outcome Acceptance Checks:**
  1. All 8 controls previously clipped below the 350x520 stage boundary are visible, within safe areas, and interactable on initial fresh entry.
  2. Scene view is unobstructed; optional room controls housed in compact, accessible panel.
  3. Touch targets meet minimum size requirements ($\ge 44 \times 44\text{ px}$).
  4. Responsive validation passes on portrait, landscape, narrow mobile (320px), and 200% zoom.
* **Expected Delivery Artifacts:**
  - Source replacements, patch, screenshots, bounding rectangle receipts, and report.

---

### Packet: FINISH-I1 — Final Cumulative Successor Integration
* **Assigned Maker:** Gemini #3 (Integration Maker)
* **Exclusive Delivery Root:** `deliveries/FINISH-I1/`
* **Prerequisites:** Formal acceptance of FINISH-A2, FINISH-B1, and FINISH-C3.
* **Outcome:** Integrates all accepted patches into one unified successor commit. Runs full regression suite (312 unit, 286 integration, 109 E2E, 17 a11y, 6 perf + new completion tests), validates build, and generates release candidate bundle for G7.

---

### Packets: FINISH-G7-A, FINISH-G7-B, FINISH-G7-C
* **Assigned Makers:** Gemini #1 (Backend), Gemini #2 (CDN/Assets), Gemini #3 (Runtime/Deployment)
* **Exclusive Delivery Roots:** `deliveries/G7/completion/<lane>/`
* **Prerequisites:** FINISH-I1 source acceptance and confirmed production credentials.
* **Outcome:** Execution of all 10 mandatory G7 exit criteria and 6 physical/assistive device sessions.

---

### Packets: EXT-01 through EXT-06 (Full-Product Extensions)
* **Assigned Sequence:** For each extension, Gemini #2 delivers asset packet (Track B), GPT Plus #2 audits, Parent accepts; then Gemini #3 delivers runtime packet (Track C), GPT Plus #2 audits, Parent accepts.
* **Backlog Items:**
  - EXT-01: Coffee mug pickup and drinking animation
  - EXT-02: Wearable over-ear headphones
  - EXT-03: Multiple interactive desk drawers
  - EXT-04: Weather & daylight environment scenes (rain, sunset)
  - EXT-05: Alternate resident moods and greeting variations
  - EXT-06: Expanded 5–8 easter eggs
