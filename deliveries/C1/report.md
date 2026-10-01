# Milestone C1 Proof Report: Experience State Machine, Priority Arbitration & Physical Room Interactions

**Lane:** Experience-State & Interaction-Runtime Maker (Gemini #3)  
**Milestone:** C1  
**Gate Authority:** [`PARENT-RECON-04`](../planning/reviews/2026-10-01-reconciliation-04.md) / [Bounded Packets A4, B3-P3, C1](../planning/reconciliation-packets/2026-10-01-bounded-packets-a4-b3p3-c1.md)  
**Evaluator Role:** Production Maker (Never Self-Approving; Stop for GPT #2 Audit)  
**Execution Environment:** Node.js v24.19.0, pnpm 9.15.9, Next.js 16.3.8, React 19.3.0, Three.js 0.180.0, Playwright 1.63.0, Vitest 5.0.2  
**Test Matrix:** 122 Unit Tests PASS (14 Test Suites, Vitest) · 12 E2E Physical Interaction Tests PASS (Playwright Chrome + Edge) · 0 TypeScript Errors · 0 ESLint Errors / 0 Warnings  

---

## 1. Executive Summary & Architectural Invariants

Milestone **C1** implements the production experience-state machine and physical interaction runtime for YOR WORLD, strictly consuming the frozen G3 baseline, frozen interaction catalog revision `2026-09-30-v1` (23 entities), and immutable engineering contracts (`src/contracts/experience.ts`).

All 5 core architectural invariants required by the parent specification are rigorously enforced:

1. **One Canonical High-Level Experience State Snapshot:**
   Managed exclusively by `ExperienceController` (`src/features/experience/controller.ts`). The snapshot (`ExperienceSnapshot`) provides an immutable, coherent view of the experience phase (`explore`, `focus`, `panel`, `intro`, `static`), active project, active panel, active camera, character action clip, environment state (`lampOn`, `blindsOpen`, `detailFound`), and user preferences.
2. **One Camera Director Owner:**
   Camera positioning, FOV, and smooth transitions are owned strictly by `CameraDirector` (`primary-camera-director`). All project focuses, panel openers, and entrance choreography delegate camera travel to this single owner. Reduced motion bypasses all camera motion instantaneously.
3. **One Full-Body Character Director Owner:**
   Character skeletal animation and chair turning are owned strictly by `CharacterDirector` (`primary-character-director`). Coordinated by `GreetingController`, greeting sequences (`notice_visitor` $\to$ `turn_to_visitor` $\to$ `greeting_nod` $\to$ `return_to_work`) enforce a 7-second cooldown. Repeat triggers within 7s convert to a subtle attention glance (`attention_glance`). Any higher-priority interaction preempts character motion and settles the avatar into the safe typing rest pose (`coding_idle`) within $\le 50$ms.
4. **One Current Interaction Intent:**
   Enforced by `IntentArbitrator` (`src/features/experience/intent-arbitration.ts`). Incoming intents are arbitrated across a strict 6-tier deterministic priority ladder. No concurrent contradictory intents can execute simultaneously.
5. **Explicit Cancellation Identity & Transition Tokens:**
   Orchestrated by `CancellationCoordinator` (`src/features/experience/cancellation-coordinator.ts`). Every asynchronous operation receives a monotonic transition ID and `AbortSignal`. Stale completions are explicitly rejected; obsolete asynchronous work **never** navigates, restarts animations, travels cameras, or corrupts state.

---

## 2. Frozen V1 Interaction Catalog Arbitration & Non-Geometry Parity

Every interaction in Milestone C1 consumes an explicit registered catalog entity from the frozen V1 catalog (23 entities, see [`catalog-mapping.json`](catalog-mapping.json)). Zero unregistered or uncataloged interactions exist.

Every meaningful 3D geometry interaction has a 100% accessible non-geometry equivalent in the accessible `RoomControls` DOM overlay (`src/features/room/room-controls.tsx`) and header navigation.

| Catalog ID | Entity / Object | Category | 3D Physical Mechanic | Accessible Non-Geometry Equivalent | Camera / Character Action | Cooldown / Coalescing |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `entrance-door` | Studio Entrance Door | Navigation | 3D Door click / entry | "Enter Studio / Replay Entrance" button | `entry` $\to$ `reveal` $\to$ `home-desktop` | Single active entrance; skip instant |
| `resident` | Seated Creator Avatar | Resident | Direct 3D mesh click | "Greet Creator" accessible button | Notice $\to$ Turn $\to$ Nod $\to$ Return | 7s full turn cooldown; glance on repeat |
| `wall-painting` | Wall Artwork | Kinetic Prop | Pointer drag (max 6°); $\ge 5^\circ$ reveals mark | "Inspect Wall Painting" button | No camera travel; 1.2s spring return to $0^\circ$ | 8px click suppression; 250ms coalesce |
| `main-monitor` | 34" Ultrawide Display | Monitor | Screen click focuses launcher | "Open Studio Launcher" button | `monitor` camera; resident clears hands | Transient focus ($\le 900$ms) |
| `candidatex-launcher` | Launcher Project Entry | Project | Monitor link click | Direct link to `/projects/candidatex` | `monitor` camera; resident looks at screen | Shows unverified state |
| `helios-pc` | Custom PC Chassis | Project | Chassis click; pulse motif | Direct link to `/projects/helios` | `pc` camera; resident brief glance | Max 1.4s transition delay |
| `zenith-model` | Solar/Battery Model | Project | Model click; energy trace | Direct link to `/projects/zenith` | `energy` camera; resident unaffected | Max 1.4s transition delay |
| `ai-real-camera` | Inspection Scanner Rig | Project | Scanner click; lens reflection | Direct link to `/projects/ai-camera` | `scanner` camera; subtle lens shimmer | Max 1.4s transition delay |
| `talks-microphone` | Broadcast Microphone | Project | Microphone click; status LED | Direct link to `/projects/yor-talks` | `microphone` camera; audio chime if sound ON | Max 1.4s transition delay |
| `desk-lamp` | Minimalist Task Lightbar | Environment | 3D Lamp fixture toggle | "Desk Task Lamp" accessible switch | Updates ambient lighting with 250ms ease | Persisted in room session |
| `window-blinds` | Window Louvers | Environment | Blinds click toggle | "Window Blinds" accessible switch | Updates cyan fill with 250ms ease | Persisted in room session |
| `desk-clock` | Asia/Kolkata Clock | Environment | Clock click 12h/24h toggle | "Clock Format" accessible switch | Swaps 12h/24h format display | Persisted in local preferences |
| `speakers` | Studio Monitors | Environment | Speaker click mute/unmute | "Studio Sound Effects" accessible switch | Toggles sound engine state | Opt-in; default muted |
| `plant-leaves` | Potted Desk Plant | Kinetic Prop | Leaf deflection on click | "Nudge Plant Leaves" accessible button | Spring settle back to neutral | 500ms coalescing |
| `keyboard` | 75% Mechanical Keyboard| Peripheral | Key click focuses monitor | Keyboard shortcut / launcher button | `monitor` camera; opens launcher | Transient |
| `mouse` | Ergonomic Mouse | Peripheral | Mouse click focuses monitor | Launcher button | `monitor` camera; opens launcher | Transient |
| `chair` | Ergonomic Swivel Chair | Resident | Chair click adjusts posture | "Adjust Chair Posture" button | Subtle seated posture shift | 5s cooldown; blocked during turn |
| `door-inside` | Interior Exit Door | Navigation | Interior door click | "Replay Entrance" accessible button | Replays entrance sequence cleanly | Reset preferences modal |
| `skills-board` | Pegboard Tool Reference | Navigation | Pegboard click | Direct link to `/about#skills` | `about` camera preset | Direct navigation |
| `research-books` | Bookshelf Technical Volumes | Navigation | Book stack click | Direct link to `/about#research` | Subtle focus preset | Direct navigation |
| `contact-phone` | Smartphone on Desk | Navigation | Phone screen tap | Direct link to `/contact` | `contact` camera preset | Direct navigation |
| `about-personal-object`| Approved Artifact | Navigation | Artifact click | Direct link to `/about` | `about` camera preset | Direct navigation |
| `certificate-frame` | Credential Frame | Navigation | Frame click | Direct link to `/about` | Short focus preset | Disabled if unverified |

---

## 3. 6-Tier Priority Arbitration & Adversarial Attack Verification

The `IntentArbitrator` enforces deterministic arbitration across 6 priority tiers:

```
[Tier 1 (Highest)] ESCAPE, SKIP, NAVIGATE, HIDE, SHOW, RENDERER_FAILED
        ↓ Preempts all lower tiers immediately; releases pointer capture; <=50ms safe settle
[Tier 2] OPEN_PROJECT
        ↓ Preempts greeting or prior project focus; bounded <=1.4s budget
[Tier 3] GREET, OPEN_PANEL, ENTER
        ↓ 7s cooldown on full turn; repeat within 7s converted to glance; dropped if duplicate in-flight
[Tier 4] SET_LAMP, SET_BLINDS, SET_CLOCK_FORMAT, SET_SOUND, SET_QUALITY, SET_PAUSED
        ↓ Updates environment/preferences; does not disrupt camera or character
[Tier 5] Kinetic reactions (painting drag, leaf deflection, chair posture)
        ↓ Damped spring physics; dropped if Tier 1-2 arrives
[Tier 6 (Lowest)] Ambient loops (coding_idle, breathing_idle)
```

### Verified Adversarial Attacks:

1. **Resident $\to$ Resident Rapidly (Double-Click Attack):**
   - **Behavior:** Sending repeat `GREET` intents while the character is in-flight.
   - **Verification:** Duplicate click is detected by `IntentArbitrator` (`accepted: false`) and dropped without double-queuing. Subsequent click during the 7s cooldown window triggers an restrained `attention_glance` without heavy yaw rotation.
   - **Evidence:** `tests/unit/interaction-controller.test.ts` (Attack 1) PASS · E2E Test 2 PASS.

2. **Resident $\to$ Project Preemption:**
   - **Behavior:** Clicking a project prop while the avatar is mid-greeting.
   - **Verification:** `IntentArbitrator` assigns Tier 2 (`OPEN_PROJECT`) which preempts Tier 3 (`GREET`). Avatar aborts turn immediately and settles into safe `coding_idle` within $\le 50$ms. Camera smoothly travels to the project preset.
   - **Evidence:** `tests/unit/interaction-controller.test.ts` (Attack 2) PASS.

3. **Project A $\to$ Project B (Stale Completion Rejection):**
   - **Behavior:** Triggering Project A focus, then triggering Project B focus mid-transition.
   - **Verification:** Project A is superseded; `CancellationCoordinator` increments the monotonic transition ID and aborts token A. When the Project A camera transition promise resolves, `cancellation.isCurrent(tokenA.id, tokenA.signal)` returns `false`. Project A **never** navigates. Navigation executes exclusively for Project B.
   - **Evidence:** `tests/unit/interaction-controller.test.ts` (Attack 3) PASS.

4. **Painting During Camera Movement:**
   - **Behavior:** Dragging the decorative wall painting while a camera travel is in flight.
   - **Verification:** Kinetic drag is dropped/coalesced without disrupting active camera travel or character state.
   - **Evidence:** `tests/unit/interaction-controller.test.ts` (Attack 4) PASS.

5. **Escape During Interaction (Safe Base-State Restoration):**
   - **Behavior:** User presses Escape key during monitor focus or project transition.
   - **Verification:** Aborts active transition, closes all open panels (`launcher`, `room-controls`), commands resident to safe `coding_idle`, resets camera preset to `home-desktop`, and restores phase to `explore`. Existing user environment preferences (`lampOn: false`, `blindsOpen: false`) are strictly preserved without mutation.
   - **Evidence:** `tests/unit/interaction-controller.test.ts` (Attack 5) PASS · E2E Test 3 PASS.

6. **Back & Route Navigation During Interaction:**
   - **Behavior:** Browser back button or top navigation link clicked mid-greeting.
   - **Verification:** In-flight asynchronous work is aborted; canvas cleanly unmounts without hanging promises or console errors.
   - **Evidence:** `tests/unit/interaction-controller.test.ts` (Attack 6) PASS · E2E Test 6 PASS.

7. **Hide / Show Visibility Suspension:**
   - **Behavior:** Document visibility changes to `hidden` during animation loop.
   - **Verification:** `WorldRuntime` enters suspended mode; animation frame loops freeze; upon `SHOW`, timing clock is resynchronized to avoid visual time leaps.
   - **Evidence:** `tests/unit/interaction-controller.test.ts` (Attack 7) PASS.

8. **Renderer Failure (Context Loss):**
   - **Behavior:** WebGL context lost or `RENDERER_FAILED` intent received.
   - **Verification:** Lifecycle manager transitions to `FAILURE`; in-flight transitions abort; DOM unmounts canvas and cleanly displays accessible fallback with retry option.
   - **Evidence:** `tests/unit/interaction-controller.test.ts` (Attack 8) PASS.

9. **Unmount & Cleanup:**
   - **Behavior:** Component unmounts while interactions or transitions are active.
   - **Verification:** `stop()` / `dispose()` cleans up event listeners, cancels RAF IDs, settles character to neutral, and marks cancellation coordinator disposed.
   - **Evidence:** `tests/unit/interaction-controller.test.ts` (Attack 9) PASS · E2E Test 6 PASS.

10. **Reduced Motion Mode:**
    - **Behavior:** User enables `prefers-reduced-motion`.
    - **Verification:** Camera transitions become instantaneous ($0.0$s duration); project navigation opens immediately without panning; painting tilt animates without yaw; avatar acknowledgment executes without heavy yaw rotation.
    - **Evidence:** `tests/unit/interaction-controller.test.ts` (Attack 10) PASS.

11. **Storage Denied & Corrupt Preferences Resilience:**
    - **Behavior:** `localStorage` throws `SecurityError: Access is denied` or contains corrupt JSON / invalid schema.
    - **Verification:** `PreferencesStore` catches storage exceptions and falls back cleanly to in-memory state; Zod parse failures safely return `defaultPreferences` without throwing or crashing the runtime.
    - **Evidence:** `tests/unit/preferences-resilience.test.ts` (4/4 PASS).

---

## 4. Execution Logs & Test Results Matrix

All validation steps were executed repeatably using the self-contained harness `deliveries/C1/tools/proof.py` in an isolated temporary environment outside the git workspace.

| Step | Command | Exit Code | Time | Evidence Log | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Typecheck** | `tsc --noEmit` | `0` | 6.8s | `evidence/20-typecheck.log` | **PASS** (0 errors) |
| **Lint** | `eslint . --max-warnings=0` | `0` | 5.8s | `evidence/21-lint.log` | **PASS** (0 errors, 0 warnings) |
| **Unit Tests** | `vitest run --config vitest.config.ts` | `0` | 1.1s | `evidence/21-unit-tests.log` | **PASS** (122/122 passed, 14 suites) |
| **Production Build** | `next build` (Turbopack) | `0` | 10.2s | `evidence/22-build.log` | **PASS** (Static routes compiled) |
| **Playwright E2E** | `playwright test` (Chrome + Edge) | `0` | 1.8m | `evidence/23-e2e-tests.log` | **PASS** (12/12 tests passed) |

### Playwright E2E Test Results:
- `1. Invariants: verifies single owners and high-level experience snapshot` (Chrome: 9.7s, Edge: 9.5s) → **PASS**
- `2. Attack: rapid resident greeting clicks without race conditions or double-queuing` (Chrome: 7.6s, Edge: 7.2s) → **PASS**
- `3. Attack: Escape key cancels interaction and restores safe explore base state` (Chrome: 8.5s, Edge: 8.6s) → **PASS**
- `4. Non-geometry equivalent: accessible Room Controls toggles environment settings` (Chrome: 8.2s, Edge: 7.1s) → **PASS**
- `5. Painting interaction: inspection tilt triggers spring response and discovers hidden mark` (Chrome: 7.8s, Edge: 11.5s) → **PASS**
- `6. Attack: route navigation during interaction unmounts cleanly without errors` (Chrome: 8.0s, Edge: 7.0s) → **PASS**

---

## 5. Evidence Artifacts Ledger

### Browser Recordings (`deliveries/C1/evidence/recordings/`):
- `physical-interactions-Phys-6c254-h-level-experience-snapshot-chrome_video.webm` (256 KB)
- `physical-interactions-Phys-6c254-h-level-experience-snapshot-edge_video.webm` (258 KB)
- `physical-interactions-Phys-7693f-onditions-or-double-queuing-chrome_video.webm` (273 KB)
- `physical-interactions-Phys-7693f-onditions-or-double-queuing-edge_video.webm` (277 KB)
- `physical-interactions-Phys-5d650-res-safe-explore-base-state-chrome_video.webm` (350 KB)
- `physical-interactions-Phys-5d650-res-safe-explore-base-state-edge_video.webm` (351 KB)
- `physical-interactions-Phys-3a5aa-oggles-environment-settings-chrome_video.webm` (314 KB)
- `physical-interactions-Phys-3a5aa-oggles-environment-settings-edge_video.webm` (272 KB)
- `physical-interactions-Phys-67e8e-e-and-discovers-hidden-mark-chrome_video.webm` (276 KB)
- `physical-interactions-Phys-67e8e-e-and-discovers-hidden-mark-edge_video.webm` (311 KB)
- `physical-interactions-Phys-7901e-unts-cleanly-without-errors-chrome_video.webm` (311 KB)
- `physical-interactions-Phys-7901e-unts-cleanly-without-errors-edge_video.webm` (276 KB)

### Playwright Event Traces (`deliveries/C1/evidence/traces/`):
- `physical-interactions-Phys-6c254-h-level-experience-snapshot-chrome_trace.zip` (1.97 MB)
- `physical-interactions-Phys-6c254-h-level-experience-snapshot-edge_trace.zip` (2.92 MB)
- `physical-interactions-Phys-7693f-onditions-or-double-queuing-chrome_trace.zip` (4.26 MB)
- `physical-interactions-Phys-7693f-onditions-or-double-queuing-edge_trace.zip` (3.39 MB)
- `physical-interactions-Phys-5d650-res-safe-explore-base-state-chrome_trace.zip` (5.54 MB)
- `physical-interactions-Phys-5d650-res-safe-explore-base-state-edge_trace.zip` (4.85 MB)
- `physical-interactions-Phys-3a5aa-oggles-environment-settings-chrome_trace.zip` (4.85 MB)
- `physical-interactions-Phys-3a5aa-oggles-environment-settings-edge_trace.zip` (3.71 MB)
- `physical-interactions-Phys-67e8e-e-and-discovers-hidden-mark-chrome_trace.zip` (2.88 MB)
- `physical-interactions-Phys-67e8e-e-and-discovers-hidden-mark-edge_trace.zip` (3.09 MB)
- `physical-interactions-Phys-7901e-unts-cleanly-without-errors-chrome_trace.zip` (4.18 MB)
- `physical-interactions-Phys-7901e-unts-cleanly-without-errors-edge_trace.zip` (2.49 MB)

---

## 6. Delivery Manifest & Packaging

All delivery assets, test recordings, execution traces, and sources have been packaged into `c1-interaction-proof.zip`:
- Archive path: `deliveries/C1/c1-interaction-proof.zip`
- SHA-256 Digest: recorded in `deliveries/C1/c1-interaction-proof.zip.sha256`

**STATUS: DELIVERED AND READY FOR INDEPENDENT AUDIT (STOPPED FOR GPT #2 AUDIT).**
