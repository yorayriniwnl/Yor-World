# YOR WORLD Bounded Packets: A4, B3-P3, and C1

**Authority:** Parent Codex (Lead Architect, Coordinator & Auditor)  
**Date:** 2026-10-01  
**Milestone Gates:** Milestone A4 (Platform / Admin Content), Milestone B3-P3 (World / Interactive Props), Milestone C1 (Integration / Experience State & Physical Interactions)  
**Repository:** [https://github.com/yorayriniwnl/Yor-World](https://github.com/yorayriniwnl/Yor-World), branch `main`  
**Base Commit:** Pinned to latest verified repository state  

---

## 1. Executive Summary & Binding Mandates

Following the formal gate acceptance of G1 (`G1-R1`, [`PARENT-RECON-03`](../reviews/2026-10-01-reconciliation-03.md)), the workstation material/light sample B3-P1 (`B3-P1-R1`, [`PARENT-RECON-04`](../reviews/2026-10-01-reconciliation-04.md)), and the delivery of production lifecycle foundation B5-P1, Parent Codex hereby issues **three new bounded, concurrent production packets** targeting the three dedicated Gemini Pro accounts:

1. **Gemini #1 → Milestone A4:** Drafts, Approved Media, Transactional Publishing, Revisions & Rollback  
2. **Gemini #2 → Milestone B3-P3:** Production Interactive Prop Assets and Visual States  
3. **Gemini #3 → Milestone C1:** Experience State Machine, Priority Arbitration & Physical Room Interactions  

### Strict Invariants & Directives

> [!IMPORTANT]
> **MANDATE 1: EVERY INTERACTION FROM C1 MUST CONSUME A KNOWN CATALOG ENTRY.**  
> The experience controller and interaction registry in Milestone C1 are strictly forbidden from implementing, handling, or routing any interaction that does not exist in the frozen Interaction Catalog (§3 V1 Matrix).

> [!IMPORTANT]
> **MANDATE 2: NO MAKER MAY INVENT NEW USER-VISIBLE INTERACTIONS.**  
> No worker across Gemini #1, Gemini #2, or Gemini #3 may introduce new user-visible interactive entities, secret gestures, uncataloged hotkeys, unapproved camera presets, or speculative features. All work must strictly consume the frozen contracts below.

> [!CAUTION]
> **MANDATE 3: ISOLATED DELIVERY ROOTS.**  
> Each maker owns exclusively its assigned output root (`deliveries/A4/`, `deliveries/B3-P3/`, or `deliveries/C1/`). Workers do not modify each other's deliverables, shared root configurations, or live production routes. Integration into production paths is performed only after formal parent acceptance.

---

## 2. Frozen Specifications & Contracts

All three packets consume the following immutable contracts, schemas, identifiers, and specifications. Any deviation is an immediate gate failure.

### 2.1. Frozen G3 Revision (`G3 — World Core`)

- **Gate Authority:** [`docs/planning/validation-and-production.md`](../validation-and-production.md) §7.
- **Definition:** Finished visual workstation sample, essential room assets, resident avatar with full 8-action catalog, and cinematic entrance choreography.
- **Visual Standard:** Adheres strictly to the main visual reference ([`references/images/main-reference.png`](../../../references/images/main-reference.png)) and the accepted B3-P1 material/light benchmark (`PARENT-RECON-04`):
  - Workstation desk slab & Alex drawer units: Ivory white (`#EDEAE7` / `#F4F4F6`, roughness 0.28, metallic 0.0)
  - Gaming chair: Cobalt blue (`#496DD5`, roughness 0.42) and white nylon shell (`#F7F7FA`)
  - Lighting grid: Pink/violet emissive honeycomb panels (`#FF38C8`, emission strength 6.0)
  - Ambient fill: Cyan under-desk wash and monitor halo (`#00E5FF`)
  - Task lighting: Warm 3200K amber monitor-mounted downlight (`#FFE28A`)
- **Technical & Performance Ceilings:**
  - Triangles: $\le 300\text{k}$ visible ceiling (desktop), $\le 140\text{k}$ (mobile).
  - Draw Calls: $\le 120$ per frame (desktop), $\le 80$ (mobile).
  - Estimated Decoded GPU VRAM: $\le 160\text{ MiB}$ (desktop), $\le 80\text{ MiB}$ (mobile).
  - Entry Asset Transfer: $\le 6\text{ MiB}$ (desktop), $\le 3\text{ MiB}$ (mobile).
  - Entrance Duration: $\le 8.0\text{ s}$ maximum post-readiness; instant skip / reduced motion goes directly to settled `HOME`.
- **Milestone Scope Boundary:** G3 is a bounded technical and artistic milestone; it does not close V1 or authorize production deployment (G7).

### 2.2. Frozen Asset Manifest (`schemaVersion: 1`)

Derived from [`docs/planning/engineering-and-content.md`](../engineering-and-content.md) §4 and `src/contracts/assets.ts`:

```typescript
export type QualityTier = "high" | "medium" | "low" | "static";

export type AssetManifest = {
  revision: string;
  schemaVersion: 1;
  groups: Array<{
    id: string;
    tier: QualityTier;
    url: string;
    sha256: string;
    bytes: number;
    triangles: number;
    materials: number;
    estimatedGpuBytes: number;
    clips: string[];
    provenanceId: string;
    approved: boolean;
  }>;
};
```

All 3D asset groups loaded by client runtimes must be cataloged in the manifest. Unapproved manifest URLs, unhashed assets, or mismatched revisions fail validation.

### 2.3. Frozen Interaction Catalog Revision (`2026-09-30-v1`)

Derived from [`docs/planning/interaction-catalog.md`](../interaction-catalog.md) §3. Exactly 23 interactive entities are registered in the V1 matrix:

| Catalog ID | Entity / Object | Category | Action / Outcome | Camera / Character | Persistence / Cooldown |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `entrance-door` | Entrance door | Architecture | Opens door; starts 8s entrance | `entry` $\to$ `reveal` $\to$ `home-desktop` | Intro completed flag |
| `resident` | Seated creator avatar | Character | Pause typing, turn, nod, return | Focus remains home; full-body clips | 7s full-turn cooldown; glance on repeat |
| `wall-painting` | Framed wall artwork | Kinetic Prop | Drag / tilt (max 6°); spring damping return (1.2s) | No camera travel; character unchanged | No persistent tilt; 250ms coalescing |
| `main-monitor` | 34" ultrawide display | Interface | Focus screen; align DOM launcher | `monitor` preset; character clears hands | Transient focus ($\le 900\text{ms}$) |
| `candidatex-launcher`| Project entry in launcher | Project | Displays unverified state / 404 notice | Screen focus; character looks at monitor | Single active transition |
| `helios-pc` | Custom PC chassis | Project | Network pulse motif $\to$ `/projects/helios` | `pc` preset; character brief glance | Temporary lighting pulse ($\le 1.4\text{s}$) |
| `zenith-model` | Solar / battery model | Project | Energy trace motif $\to$ `/projects/zenith` | `energy` preset; no full-body interruption| Temporary effect ($\le 1.4\text{s}$) |
| `ai-real-camera` | Inspection scanner | Project | Lens reflection $\to$ `/projects/ai-vs-real` | `scanner` preset; no bright strobe | Transient effect ($\le 1.4\text{s}$) |
| `talks-microphone` | Studio microphone | Project | Status LED active $\to$ `/projects/talks` | `microphone` preset; audio cue if unmuted| Temporary LED state |
| `project-shortcuts` | Compact DOM rail | Navigation | Direct navigation to published projects | No camera travel | Accessible equivalent |
| `research-books` | Bookshelf volumes | Content | Shelf nudge $\to$ open `/about#research` | Subtle focus preset | Return closes focus |
| `skills-board` | Pegboard with tools | Content | Highlight groups $\to$ open `/about#skills` | Local focus; character unchanged | Direct link |
| `certificate-frame`| Credential frame | Content | Reveal credential details | Optional short focus | Disabled if unverified |
| `contact-phone` | Smartphone on desk | Content | Screen wake $\to$ open `/contact` | `contact` preset; character glance | Form draft in page memory only |
| `desk-lamp` | Task lightbar | Environment | Toggle lamp on/off with 250ms ease | No camera; updates room lighting | Room session preference |
| `window-blinds` | Window louvers | Environment | Toggle blinds open/closed | No camera; updates ambient fill | Room session preference |
| `desk-clock` | Digital desk clock | Environment | Toggle 12h / 24h format display | No camera; character unchanged | Local storage preference |
| `speakers` | Studio monitor speakers | System | Toggle audio mute / unmute | No camera; audio engine responds | User opt-in; mute persisted |
| `plant-leaves` | Potted succulent / ivy | Kinetic Prop | Subtle leaf deflection and settle | No camera; character unchanged | 500ms coalescing |
| `keyboard` | 75% mechanical keyboard | Peripheral | Key click response $\to$ launcher Commands tab | `monitor` preset | Transient |
| `mouse` | Wireless gaming mouse | Peripheral | Wake monitor launcher | `monitor` preset | Transient |
| `chair` | Blue/white gaming chair | Furniture | Small resident posture shift | Driven by character director | Cooldown 5s; blocked while turning |
| `about-personal-object`| Approved artifact | Content | Open `/about` page | `about` composition | Direct link |

*Sub-features:* `door-inside` (replays entrance / reset preferences modal); `hidden-yor-mark` (reveals signature behind painting tilt).  
**Zero other entities exist in V1.**

### 2.4. Frozen `ExperienceIntent`

Derived from [`docs/planning/engineering-and-content.md`](../engineering-and-content.md) §4 and `src/contracts/experience.ts`:

```typescript
export type ExperienceIntent =
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
```

### 2.5. Frozen `CharacterAction`

Derived from [`docs/planning/engineering-and-content.md`](../engineering-and-content.md) §4 and `src/contracts/experience.ts`:

```typescript
export type CharacterAction =
  | "coding_idle"
  | "mouse_idle"
  | "notice_visitor"
  | "turn_to_visitor"
  | "greeting_nod"
  | "return_to_work"
  | "attention_glance"
  | "breathing_idle";
```

### 2.6. Frozen `CameraId`

Derived from [`docs/planning/engineering-and-content.md`](../engineering-and-content.md) §4 and `src/contracts/experience.ts`:

```typescript
export type CameraId =
  | "hallway"
  | "entry"
  | "reveal"
  | "greeting"
  | "home-desktop"
  | "home-mobile"
  | "monitor"
  | "pc"
  | "energy"
  | "scanner"
  | "microphone"
  | "about"
  | "contact";
```

### 2.7. Frozen Project IDs

Derived from [`docs/planning/engineering-and-content.md`](../engineering-and-content.md) §4 and `src/contracts/content.ts`:

```typescript
export type ProjectId = "candidatex" | "helios" | "zenith" | "ai-vs-real" | "talks";
```

- **`ai-vs-real`:** Verified public case study (78.5% accuracy, LBP/GLCM texture forensics, RBF SVM).
- **`zenith`:** Verified public case study (Solar feasibility, Three.js 3D roof viewer, irradiance modeling).
- **`helios`:** Verified public case study (Realtime energy intelligence, FastAPI WebSockets, Docker Compose).
- **`talks`:** Verified public case study (Realtime messaging, React/TypeScript, Express/Socket.IO, Postgres/Drizzle).
- **`candidatex`:** Unverified candidate. Public route `/projects/candidatex` yields HTTP 404; launcher displays unverified status. Publishing without verified evidence is an immediate error.

### 2.8. Frozen Asset IDs

- **Room Architecture & Furniture:** `room-shell`, `desk`, `door`, `chair`, `monitor`, `resident`
- **Spatial Anchors:** `door-hinge`, `chair-root`, `monitor-surface`, `painting-pivot`
- **Interactive Prop Assets:** `wall-painting`, `helios-pc`, `zenith-model`, `ai-real-camera`, `talks-microphone`, `desk-lamp`, `window-blinds`, `desk-clock`, `speakers`, `plant-leaves`, `keyboard`, `mouse`, `about-personal-object`, `certificate-frame`, `contact-phone`, `research-books`, `skills-board`, `hidden-yor-mark`

---

## 3. Bounded Packet: Gemini #1 → Milestone A4

### 3.1. Identity & Envelope
- **Worker Lane:** Gemini #1 (Platform & CMS Maker)
- **Milestone:** A4 — Drafts, Approved Media, Transactional Publishing, Revisions & Rollback
- **Assigned Output Root:** `deliveries/A4/` exclusively
- **Dependencies:** Accepted Milestone A2 (`deliveries/A2/`) and Milestone A3 (`deliveries/A3/`, commit `ac56097`)
- **Independent Reviewers:** Claude-08 (Database policies, publication, media, rollback) & Parent Codex

### 3.2. Mandatory Deliverables & Owned Files
Within `deliveries/A4/source/`:
1. `src/server/content/publish.ts`: Transactional publication service with concurrency control and audit logging.
2. `src/server/content/revisions.ts`: Project draft and revision retrieval, difference tracking, and rollback engine.
3. `src/server/media/validate-upload.ts`: Server-side file validation (MIME type sniffing, magic bytes, dimensions, byte limits, SVG script stripping).
4. `src/server/media/manifest.ts`: Media manifest management distinguishing private draft assets from public CDN assets.
5. `src/features/admin/project-editor.tsx`: Owner-only draft editing UI with optimistic concurrency support.
6. `src/features/admin/publish-review.tsx`: Publication review and confirmation panel with diff visualizer and evidence check.
7. `supabase/migrations/20261001000001_a4_publication_media.sql`: Complete PostgreSQL migration adding revision tables, media tracking, and RLS policies.
8. `tests/integration/publication.test.ts` & `tests/integration/media-access.test.ts`: Database integration tests.
9. `tests/e2e/admin-publish.spec.ts`: Full Playwright E2E test verifying draft $\to$ publish $\to$ rollback flow.
10. `report.md`, `manifest.json`, `a4-publishing.zip`, and `a4-publishing.zip.sha256`.

### 3.3. Key Technical Invariants & Verification Criteria
1. **Concurrency Conflict Detection (HTTP 409):** `publishRevision({ projectId, expectedRevision }, actor)` must verify that the current draft revision in PostgreSQL matches `expectedRevision`. If a concurrent edit incremented the revision, reject with HTTP 409 `Conflict`.
2. **Evidence Validation Gate (HTTP 422):** Publishing rejects any project containing unverified evidence (`status: "unknown"`). CandidateX cannot be published.
3. **Private vs Public Media Isolation:** Draft media uploads reside in private bucket `draft-media` accessible only to AAL2 owners. Publication copies approved media to public bucket `published-media` and generates immutable SHA-256 content hashes.
4. **Atomic Rollback:** `rollbackPublication(targetRevision, actor)` creates a new publication revision referencing the exact snapshot of `targetRevision`. Preserves history; never mutates past records.
5. **No 3D / WebGL Imports:** Zero Three.js code in admin or platform modules.

---

## 4. Bounded Packet: Gemini #2 → Milestone B3-P3

### 4.1. Identity & Envelope
- **Worker Lane:** Gemini #2 (World & Interactive Prop Maker)
- **Milestone:** B3-P3 — Production Interactive Prop Assets and Visual States
- **Assigned Output Root:** `deliveries/B3-P3/` exclusively
- **Dependencies:** Accepted B3-P1 Workstation Sample (`deliveries/material-light-sample/`, commit `fa649a7`, [`PARENT-RECON-04`](../reviews/2026-10-01-reconciliation-04.md)), Accepted G1 Proof (`deliveries/G1/`), Accepted B5 Lifecycle (`deliveries/B5/`)
- **Independent Reviewers:** Gemini-3 (Visual / Camera Parity), Claude-13 (Asset / Provenance / glTF Validation), Parent Codex

### 4.2. Mandatory Deliverables & Owned Files
Within `deliveries/B3-P3/`:
1. `source/interactive-props.blend`: Complete native Blender 5.2.2 LTS source file containing all 18 interactive props with standardized pivots and parenting.
2. `public/models/interactive-props.glb`: Exported binary glTF 2.0 asset containing all interactive props and their visual state node hierarchies.
3. `tools/export-props.py`: Repeatable Python export script converting Blender scene to validated `.glb`.
4. `tools/validate-props.cjs`: Node.js Khronos glTF Validator execution script.
5. `browser-harness/`: Standalone Three.js r180 WebGL test harness demonstrating all interactive prop visual states.
6. `evidence/`: Khronos validation receipt (0 errors, 0 warnings), state restoration parity receipt, and camera render comparisons.
7. `report.md`, `manifest.json`, `b3-p3-props.zip`, and `b3-p3-props.zip.sha256`.

### 4.3. Prop Asset Specification & Visual States

Every prop must be modeled, textured, and exported with explicit node hierarchies representing its 5 standardized states:
1. `idle`: Resting baseline in room.
2. `discoverable`: Subtle glow / specular rise after 120ms hover.
3. `active`: Triggered operational state (LED on, fan pulse, solar beam, lens shimmer).
4. `settling`: Damped transition back to resting state.
5. `unavailable`: Honest inactive/disabled appearance for unverified items.

| Prop ID | Mesh / Hierarchy Details | Visual State Mechanics | Budget (Tris / Textures) |
| :--- | :--- | :--- | :--- |
| `wall-painting` | Pivot at top hanging point (`painting-pivot`). Hidden signature mesh (`hidden-yor-mark`) positioned strictly behind backing. | Max rotation: 6.0° around Z axis. Damped spring return (1.2s). Signature visible only upon tilt $\ge 4.5^\circ$. | $\le 800$ tris; $512\times 512$ canvas texture |
| `helios-pc` | Tempered glass side panel, 3 front RGB fans, GPU backplate, cable combs, power LED. | Active state: fans accelerate, front LED pulses amber/cyan (`#FF9E00` / `#00E5FF`). | $\le 4,500$ tris; procedural PBR + emissive |
| `zenith-model` | Miniature solar array with miniature battery storage unit. | Active state: animated emissive solar trace line (`#FFE500`) flowing into storage cell. | $\le 2,200$ tris; procedural PBR |
| `ai-real-camera` | Precision camera chassis with coated lens element and classification LED. | Active state: subtle lens reflection sweep + blue classification ring (`#00B4D8`). | $\le 1,800$ tris; glass BSDF + emissive ring |
| `talks-microphone`| Studio condenser mic on articulated boom arm with shockmount. | Active state: status ring LED transitions from inactive dark to illuminated amber/red (`#E63946`). | $\le 3,200$ tris; anodized metal PBR |
| `desk-lamp` | Minimalist task lightbar mounted above monitor. | Toggle state: emissive downlight strip (`#FFE28A` 3200K, 140W spot) switches on/off with 250ms smooth transition. | $\le 1,200$ tris; matte aluminum PBR |
| `window-blinds` | Horizontal window louvers with tilt mechanism. | Toggle state: slats rotate 80° between open (reveals cyan fill) and closed (blocks direct fill). | $\le 2,500$ tris; satin plastic PBR |
| `desk-clock` | Compact digital desk clock display. | Toggle state: swaps display texture / emissive UV between 12-hour and 24-hour formats (Asia/Kolkata). | $\le 600$ tris; $512\times 256$ digital segment texture |
| `speakers` | Dual near-field studio monitors with power/mute LED. | Toggle state: LED switches between white (unmuted) and red (muted). | $\le 1,400$ tris; matte black textured PBR |
| `plant-leaves` | Desk potted succulent + shelf cascading ivy. | Active state: small bounded leaf deflection ($\le 3.0^\circ$) with 500ms spring settle. | $\le 2,800$ tris; subsurface foliage PBR |
| `keyboard` | 75% custom mechanical keyboard with charcoal/orange keycaps. | Active state: discrete spacebar/key depression animation ($\Delta y = -2.0\text{mm}$). | $\le 3,500$ tris; PBR keycaps |
| `mouse` | Wireless gaming mouse with scroll wheel and sensor. | Active state: optical sensor glow on desk surface. | $\le 800$ tris; matte nylon PBR |
| `about-personal-object`| Approved personal journey artifact on shelf. | Discoverable state: gentle warm highlight. | $\le 1,500$ tris; ceramic/metal PBR |
| `certificate-frame`| Wall-mounted credential display frame. | Discoverable state: subtle rim illumination. | $\le 500$ tris; polished wood/glass PBR |
| `contact-phone` | Smartphone resting flat on workstation surface. | Discoverable state: screen wakes with glowing message indicator. | $\le 600$ tris; emissive screen texture |
| `research-books` | Hardcover technical volumes on floating shelf. | Discoverable state: one volume nudges forward 15mm from row. | $\le 1,200$ tris; cloth/paper PBR |
| `skills-board` | Wall pegboard with organized cables, adapters, and tools. | Discoverable state: discrete category peg highlights. | $\le 2,200$ tris; perforated wood PBR |

### 4.4. Quantitative Performance Ceilings & Khronos Invariants
- Total Triangles for all 18 props combined: $\le 35,000$ triangles (well under the $\le 75\text{k}$ allocation).
- Total Draw Calls: $\le 60$ draw calls.
- Total Texture VRAM (RGBA8 decoded): $\le 16.0\text{ MB}$.
- Khronos glTF 2.0 Validation: **0 Errors, 0 Warnings**.
- State Restoration: Toggling any prop on and off must restore exact baseline scene parameters ($\Delta = 0.00000000$).

---

## 5. Bounded Packet: Gemini #3 → Milestone C1

### 5.1. Identity & Envelope
- **Worker Lane:** Gemini #3 (Experience Controller & Integration Maker)
- **Milestone:** C1 — Experience State Machine, Priority Arbitration & Physical Room Interactions
- **Assigned Output Root:** `deliveries/C1/` exclusively
- **Dependencies:** Accepted G1 Proof (`deliveries/G1/`), Accepted B5 Lifecycle Foundation (`deliveries/B5/`), Frozen Engineering Contracts (`src/contracts/`), Frozen Interaction Catalog
- **Independent Reviewers:** Claude-03 (State, cancellation, resource ownership), Claude-11 (Object interactions, monitor, navigation), Parent Codex

### 5.2. Mandatory Deliverables & Owned Files
Within `deliveries/C1/source/`:
1. `src/features/experience/controller.ts`: Production ExperienceController managing phases, active projects, monotonic transitions, and cleanup.
2. `src/features/experience/intent-arbitration.ts`: Strict 6-tier priority arbitration and cancellation engine.
3. `src/features/experience/interaction-registry.ts`: Exhaustive registration mapping all 23 catalog entities to typed handlers, hit proxies, and DOM equivalents.
4. `src/features/room/objects/painting.tsx`: Kinetic painting component with pointer capture, drag physics (max 6°), and spring damping settle.
5. `src/features/room/objects/environment-controls.tsx`: Lamp, blinds, clock, and speaker interaction controllers.
6. `src/features/character/greeting.ts`: Avatar greeting coordinator (7s cooldown, safe cancellation to coding pose).
7. `src/features/room/room-controls.tsx`: Accessible DOM overlay panel providing keyboard/screen-reader parity for all room interactions.
8. `tests/unit/interaction-controller.test.ts`: Vitest unit tests verifying state transitions, arbitration priority, cancellation, and lighting preservation.
9. `tests/e2e/physical-interactions.spec.ts`: Playwright E2E tests verifying pointer drag, Escape cancellation, cooldowns, and keyboard accessibility.
10. `report.md`, `manifest.json`, `c1-interactions.zip`, and `c1-interactions.zip.sha256`.

### 5.3. Architecture & Priority Arbitration

The `IntentArbitration` engine enforces a strict deterministic 6-tier priority ladder:
1. **Tier 1 (Highest):** `NAVIGATE`, `ESCAPE`, `HIDE`, `SHOW`, `RENDERER_FAILED`, `SKIP`. Immediately aborts any lower-tier in-flight action, releases pointer captures, and restores safe state.
2. **Tier 2:** `OPEN_PROJECT`. Begins project transition ($\le 1.4\text{s}$ delay maximum); aborts character greeting immediately and commands resident to safe coding pose.
3. **Tier 3:** `GREET`. Plays resident acknowledgement sequence (`notice` $\to$ `turn` $\to$ `nod` $\to$ `return`). Enforces 7-second cooldown on full turn; repeat trigger within 7s triggers only subtle glance (`attention_glance`).
4. **Tier 4:** `SET_LAMP`, `SET_BLINDS`, `SET_CLOCK_FORMAT`, `SET_SOUND`. Toggles environment preferences without interrupting camera or character.
5. **Tier 5:** Kinetic reactions (`wall-painting` drag, `plant-leaves` deflection). Damped spring physics; dropped immediately if Tier 1–2 intent arrives.
6. **Tier 6 (Lowest):** Ambient idle loops (`coding_idle`, `breathing_idle`).

### 5.4. Required Adversarial Test Sequences & Regressions
The test suite (`tests/unit/interaction-controller.test.ts` & `tests/e2e/physical-interactions.spec.ts`) must prove:
1. **Escape Cancels Project Focus Without Mutating Preferences:**
   With lamp OFF and blinds CLOSED, trigger project focus, send `ESCAPE` mid-transition, then resolve the obsolete promise. Assert:
   ```typescript
   expect(controller.getSnapshot().world.lampOn).toBe(false);
   expect(controller.getSnapshot().world.blindsOpen).toBe(false);
   expect(controller.getSnapshot().phase).toBe("explore");
   expect(navigation.openProject).not.toHaveBeenCalled();
   ```
2. **Greeting Interruption:**
   Trigger `GREET`. While avatar is turning at $t = 1.0\text{s}$, send `OPEN_PROJECT` for `zenith`. Assert resident aborts turn immediately and settles into safe coding pose; camera transitions to `energy`; no animation glitch or double-turn.
3. **Greeting Cooldown Enforcement:**
   Trigger `GREET`. At $t = 2.0\text{s}$, trigger `GREET` again. Assert second full turn is rejected; only subtle glance is permitted after current clip finishes.
4. **Painting Pointer Capture & Release:**
   Begin pointer drag on painting. Move 20px (exceeding 8px click suppression). Dispatch `pointercancel` or open dialog. Assert pointer capture is released, frame settles to neutral within 1.2s, and no synthetic click event is fired.
5. **Catalog Enforcement:**
   Attempting to dispatch an unregistered interaction ID or intent throws a typed validation error and does not mutate runtime state.

---

## 6. Execution & Delivery Protocol

1. **Local Clean Verification:**
   All makers must execute their verification test suites locally:
   - Platform (A4): `pnpm test:unit`, `pnpm test:integration`, `pnpm test:e2e`, `pnpm build`, `pnpm typecheck`, `pnpm lint`.
   - Art (B3-P3): Python export run, Khronos glTF validator execution (0/0), browser state restoration measurement.
   - Integration (C1): Vitest unit tests, Playwright E2E physical interaction suite, Next.js build.
2. **Delivery Packaging:**
   Each maker generates:
   - Complete deliverable files under its owned root (`deliveries/<Milestone>/`).
   - Standardized `manifest.json` listing all generated files, byte sizes, and SHA-256 digests.
   - Self-contained delivery archive (`<milestone>.zip`) and checksum (`<milestone>.zip.sha256`).
   - Detailed `report.md` recording actual commands, tool versions, exit codes, execution times, test matrix, and evidence ledger.
3. **Git Commit & Push:**
   Under `AGENTS.md` git rule, after completing each delivery, create a small scoped commit and push to `origin/main`. Report any failures immediately.
4. **Independent Review & Acceptance:**
   Makers stop upon submission. Parent Codex coordinates independent reviews (Gemini-3, Claude-03, Claude-08, Claude-11, Claude-13) and issues formal reconciliation rulings before downstream gates are unlocked.
