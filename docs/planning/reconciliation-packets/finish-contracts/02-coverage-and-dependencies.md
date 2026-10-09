# Coverage & Dependency Matrix: Audit Findings, Product Requirements, Catalog, G7, and Extensions

**Document:** `02-coverage-and-dependencies.md`  
**Parent Authority:** GPT Plus #1 (Lead Architect)  
**Date:** 2026-10-09  
**Status:** BINDING GOVERNANCE SPECIFICATION  

---

## 1. Audit Findings Coverage Matrix (CA-01 through CA-13)

This matrix maps all thirteen findings from the [2026-10-09 Full-Project Completion Audit](../../reviews/2026-10-09-completion-audit.md) directly to assigned maker packets, target deliverables, and outcome evidence:

| Audit ID / Severity | Summary of Finding | Assigned Packet | Assigned Maker | Target Delivery Root | Outcome Acceptance Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **CA-01** HIGH | CMS project editor cannot author or edit substantive body blocks; text truncated; placeholders inserted | **FINISH-A1** | Gemini #1 | `deliveries/FINISH-A1/` | E2E browser test adds/edits/reorders/deletes paragraph, image, list, code; saves and reopens with exact text |
| **CA-02** HIGH | Authenticated draft preview missing; publish review page shows hardcoded claims and public project count | **FINISH-A1** | Gemini #1 | `deliveries/FINISH-A1/` | Authenticated `/admin/preview` renders drafts with sanitized `CaseStudy` component; review page runs executed checks |
| **CA-03** HIGH | Biography, settings, résumé reference, and project ordering CMS versioning absent; hardcoded in source | **FINISH-A2** | Gemini #1 | `deliveries/FINISH-A2/` | CMS site editor saves drafts; atomic publish persists site + projects; coherent rollback restores previous snapshot |
| **CA-04** MEDIUM | Approved downloadable résumé document/route missing | **FINISH-A2** | Gemini #1 | `deliveries/FINISH-A2/` | Download route serves approved PDF with verified SHA-256 and immutable headers; unapproved state truthful |
| **CA-05** HIGH | 3D entrance has no visible door opening or automatic resident greeting | **FINISH-C2** (Asset in **B1**) | Gemini #3 (Asset: Gemini #2) | `deliveries/FINISH-C2/` | Visual entrance choreography opens `Door_Hinge` 0°–90° over 0.0s–2.5s; resident notices, turns, greets, and settles |
| **CA-06** HIGH | Decorative pause control does not stop character playback in render loop | **FINISH-C1** | Gemini #3 | `deliveries/FINISH-C1/` | Pause control freezes character mixer delta and prop updates; navigation and UI remain responsive; state persists |
| **CA-07** HIGH | Initial coding animation action is not scheduled/activated on load | **FINISH-C1** | Gemini #3 | `deliveries/FINISH-C1/` | `CharacterDirector` initializes with clip `"none"`, scheduling `coding_idle` on frame 1 with active bone motion |
| **CA-08** HIGH | Physical reactions substituted: plant maps to unpause, chair to full greet, books to navigation, clock static | **FINISH-C2** (Asset in **B1**) | Gemini #3 (Asset: Gemini #2) | `deliveries/FINISH-C2/` | Real leaf deflection spring; chair posture adjustment with 5s cooldown; book nudge + research; live Asia/Kolkata clock |
| **CA-09** MEDIUM | Project physical motifs absent; 3/8 resident clips unintegrated in runtime | **FINISH-C2** (Asset in **B1**) | Gemini #3 (Asset: Gemini #2) | `deliveries/FINISH-C2/` | Real Helios network, Zenith energy, camera lens, mic waveform motifs; all 8 resident clips registered and playable |
| **CA-10** MEDIUM | Loader waits for optional textures; stage weights simulate percentage; retries exceed spec | **FINISH-C1** | Gemini #3 | `deliveries/FINISH-C1/` | Group A starts entrance without Group B; byte progress only when bytes verified; max 2 auto-retries; abort on cancel |
| **CA-11** HIGH | Room presentation lacks reference fidelity; 8 mobile controls clipped below stage boundary | **FINISH-B1** (Art) & **FINISH-C3** (UI) | Gemini #2 (Art) & Gemini #3 (UI) | `deliveries/FINISH-B1/` & `deliveries/FINISH-C3/` | Hex light panels, round speakers, blue floor; mobile 350x520 px viewport has zero clipped controls and unblocked room |
| **CA-12** MEDIUM | Public claim verification not reproducible from archived receipts; AI-vs-real drift | **FINISH-A2** | Gemini #1 | `deliveries/FINISH-A2/` | Complete provenance register with pinned commits, receipts, model hashes, and clear documentation of upstream drift |
| **CA-13** HIGH | Production services, live deployment, recovery rehearsal, and manual device sessions unexecuted | **FINISH-G7-A/B/C** | Gemini #1 / #2 / #3 | `deliveries/G7/completion/` | Complete execution of all 10 mandatory G7 criteria, 56 observations, and 6 manual physical/assistive device sessions |

---

## 2. Product Requirements Coverage Matrix (P01 through P14)

| Req ID | Requirement Statement | Current Audit Status | Assigned Completion Packet | Required Evidence for Acceptance |
| :--- | :--- | :--- | :--- | :--- |
| **P01** | Name, role, Projects, About, Contact, and Résumé available before 3D assets finish loading | PASS local HTML; FAIL approved downloadable résumé | **FINISH-A2** | Cold-load HTML recording; accessible download button serving approved PDF or truthful notice |
| **P02** | First-time visitors can choose Enter studio or View projects | PASS local browser evidence | Maintained in **C1/C2** | Regression verification that both paths work independently without waiting |
| **P03** | Door opens, camera enters, character acknowledges visitor, and exploration begins | FAIL door opening & greeting; PASS camera & skip | **FINISH-C2** (Asset in **B1**) | Complete entrance video capture on desktop and mobile showing visible door swing and greeting |
| **P04** | Clicking character produces restrained look-back and return to work | PARTIAL; full greeting works, initial idle & glance incomplete | **FINISH-C1** & **FINISH-C2** | Click character triggers greeting; rapid re-clicks throttled by 7s cooldown; glance during cooldown |
| **P05** | Painting responds physically to pointer/tap and settles | PARTIAL; spring present; touch/RM/cancellation unverified | **FINISH-C2** | Pointer, touch, and keyboard trigger spring tilt ($8\text{px}, 6^\circ$ max, $1.2\text{s}$ settle); RM border response |
| **P06** | Every published project has a real route and a working room entry point | PASS local route evidence; CandidateX deliberately unpublished | **FINISH-A2** & **FINISH-C2** | Direct navigation, Back/Forward, room launcher click for all 4 published projects; CandidateX 404 verified |
| **P07** | Room state and animations remain coherent under rapid or conflicting input | PARTIAL; missing catalog reactions limit full coverage | **FINISH-C2** | Deterministic rapid event test suite: rapid clicks, tab switches, dialog openings produce zero stuck states |
| **P08** | Meaningful content and actions available without WebGL | PASS semantic HTML | Maintained in **A2/C3** | WebGL-disabled and JavaScript-disabled browser testing verifies full portfolio readability |
| **P09** | Authored mobile composition and single-tap semantics | PARTIAL; 8 controls clipped below 350x520 stage boundary | **FINISH-C3** | Native Chromium 350x520 and physical iOS/Android captures show zero clipped buttons and touch targets $\ge 44\text{px}$ |
| **P10** | Admin can draft, preview, publish, and roll back verified content | FAIL substantive block editing, draft preview, and site CMS | **FINISH-A1** & **FINISH-A2** | Complete admin workflow: edit blocks, preview privately, publish atomically, and roll back to previous snapshot |
| **P11** | Contact produces durable receipt or honest failure | PASS local synthetic DB/outbox; live DB/mail unconfirmed | **FINISH-G7-A** | Live Supabase/Resend tests: rate limiting (HTTP 429), outbox delivery, zero PII leak in logs |
| **P12** | Motion, audio, downloads, and thermal load are controlled | PARTIAL; pause broken, loading simulated; thermal unrun | **FINISH-C1** & **FINISH-G7-C** | Functional pause; essential asset streaming; opt-in audio; 600-second sustained device run with stable frame rate |
| **P13** | Public claims and assets have evidence and provenance | PARTIAL; structural visual mismatch; unarchived receipts | **FINISH-A2** & **FINISH-B1** | Reference-matched 3D room; archived claim register with verifiable external sources and model receipts |
| **P14** | Release can be reproduced, observed, backed up, and rolled back | PARTIAL; local archive present; live restore/rollback unrun | **FINISH-I1** & **FINISH-G7-A/C** | Clean build from git; restore rehearsal covering all 16 tables; rollback executed with $RTO \le 5\text{m}, RPO = 0$ |

---

## 3. Interaction Catalog Coverage Matrix (All 25 Rows)

All 25 rows from [interaction-catalog.md](../../interaction-catalog.md) §3 are bound to implementation and verification:

| # | Catalog Object ID | Idle / Discovery State | Target Activate / Physical Outcome | Camera & Character State | Persistence & Cooldown | Touch, Keyboard, RM Behavior | Assigned Packet |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `entrance-door` | Threshold light; "Enter studio" label | Visible door leaves open 0°–90°; starts 8s entrance | ENTRY camera path; resident notices at 2.5s | Intro completion persisted; ignore duplicate starts | Enter button; RM skips travel directly to HOME | **FINISH-B1** / **C2** |
| 2 | `resident` | `coding_idle` typing; attention shift on hover | Pause, turn to visitor, nod, return to work | Camera still; full-body animation sequence | 7s full-greeting cooldown; repeat gets `attention_glance` | "Greet creator" in panel; RM brief acknowledgment | **FINISH-C1** / **C2** |
| 3 | `wall-painting` | Subtle border highlight on hover | Spring-damped tilt ($8\text{px}, 6^\circ, 1.2\text{s}$ settle) | Camera still; resident unaffected | No persistent tilt; 250ms coalescing | Tap tilts; RM subtle highlight without tilt | **FINISH-C2** |
| 4 | `main-monitor` | Ambient code display; screen brightens | Focus camera on screen; opens YOR launcher | MONITOR preset; character clears hands | Transient focus; $\le 900\text{ms}$ approach | Opens launcher panel; RM opens directly | **FINISH-C2** |
| 5 | `candidatex-launcher` | CandidateX label within launcher | Evidence motif, then project route (Conditional) | Short monitor focus; resident faces monitor | One active transition; stays unpublished (404) | Direct link navigates; RM static | **FINISH-C2** *(Truthful 404)* |
| 6 | `helios-pc` | PC fan rotation; chassis light pulse | Network-path illumination motif, then route | PC focus; resident brief glance if idle | Temporary motif layer; no lasting override | Tap navigates; RM static network icon | **FINISH-B1** / **C2** |
| 7 | `zenith-model` | Solar panel miniature; glow pulse | Solar/grid energy trace motif, then route | ENERGY focus; no full-body interruption | Temporary effect, $\le 1.4\text{s}$ | Tap navigates; RM static energy diagram | **FINISH-B1** / **C2** |
| 8 | `ai-real-camera` | Lens reflection highlight; hover label | Lens ring rotation + scanner motif, then route | SCANNER focus; no harsh flash | Resets on route transition | Tap navigates; RM static classification label | **FINISH-B1** / **C2** |
| 9 | `talks-microphone` | Inactive LED; discoverable label | LED pulse + audio waveform motif, then route | MICROPHONE focus; zero mic recording | Temporary audio effect (opt-in only) | Tap navigates; RM static waveform icon | **FINISH-B1** / **C2** |
| 10 | `project-shortcuts` | Compact labeled DOM rail in 3D room | Direct navigation to selected published project | No camera dependency | None | Identical across all modes; accessible DOM | **FINISH-C2** / **C3** |
| 11 | `research-books` | Spine highlight on bookshelf hover | Bounded book nudge animation + opens Research | Small shelf focus | Closing panel closes focus | Tap opens Research; RM opens directly | **FINISH-B1** / **C2** |
| 12 | `skills-board` | Minimalist physical pinboard on wall | Focus board; opens verified skills in About page | Local focus; resident unchanged | None | Tap opens About; no fake percentages | **FINISH-C2** |
| 13 | `certificate-frame` | Decorative certificate on wall | Opens verified credential details (Conditional) | Optional short focus | None | Tap opens details; absent if unverified | **FINISH-C2** *(Truthful state)* |
| 14 | `contact-phone` | Dark smartphone screen; wakes on hover | Phone screen lights up; navigates to `/contact` | CONTACT focus; resident may glance | Form draft in page memory only | Tap navigates; RM direct form | **FINISH-B1** / **C2** |
| 15 | `desk-lamp` | Current lamp on/off state | Toggle warm light contribution with 250ms ease | No camera movement; resident lighting updates | On/off state remembered in session | Labeled toggle switch; RM immediate | **FINISH-B1** / **C2** |
| 16 | `window-blinds` | Current blinds open/closed state | Toggle blind slats and cyan ambient fill preset | No camera movement | Session preference persisted | Labeled toggle switch; RM immediate preset | **FINISH-B1** / **C2** |
| 17 | `desk-clock` | Real time in Asia/Kolkata timezone | Toggle 12h/24h display format | No camera / character interruption | Format preference stored in localStorage | Button toggle; RM unchanged | **FINISH-B1** / **C2** |
| 18 | `speakers` | Physical mute LED indicator | Explicit audio opt-in toggle (Mute / Unmute) | No camera movement; audio engine responds | Mute preference persisted; default is OFF | Global visible sound button | **FINISH-B1** / **C2** |
| 19 | `plant-leaves` | Still leaves with subtle ambient breeze | Bounded spring leaf deflection and settle | No camera / character interruption | No persistent deformation; 500ms settle | Tap/control triggers; RM no sway | **FINISH-B1** / **C2** |
| 20 | `keyboard` | Resident typing at low amplitude | Key depression response; opens launcher Commands | Uses MONITOR focus; single character owner | Transient response | Button equivalent; zero shell execution | **FINISH-B1** / **C2** |
| 21 | `mouse` | Subtle material highlight on hover | Wakes monitor launcher panel | Same as monitor; no parallel camera owner | Transient wake | Button equivalent | **FINISH-B1** / **C2** |
| 22 | `chair` | Occupied ergonomic chair | Bounded resident posture adjustment when idle | Controlled by CharacterDirector | Blocked during turns; 5s cooldown | Button in panel; RM acknowledgment | **FINISH-B1** / **C2** |
| 23 | `about-personal-object`| Approved personal prop on shelf | Navigates to `/about` page (Conditional) | ABOUT composition if available | None | Ordinary About link; truthful conditional | **FINISH-C2** *(Truthful state)* |
| 24 | `door-inside` | Visible from room interior | Opens confirmation dialog for Replay entrance | No surprise travel on first click | Replay is explicit; reset preferences | Menu equivalent | **FINISH-C2** |
| 25 | `hidden-yor-mark` | Hidden behind painting | Reveals small signature once; zero gated content | No camera movement required | Session discovery flag persisted | Accessible "Reveal detail" control | **FINISH-B1** / **C2** |

---

## 4. Gate G7 Exit Requirements & Manual Sessions Matrix

Gate G7 production release requires objective verification of **10 mandatory criteria (56 underlying ledger observations)** and **6 manual physical/assistive device sessions**:

### 10 Mandatory G7 Exit Requirements
1. **Live Domain (4 observations):** DNS resolution on production domain, valid TLS/SSL certificate, automated HTTP→HTTPS redirect, canonical headers. *(Assigned: FINISH-G7-A)*
2. **Fresh Smoke (4 observations):** Critical paths executed live on production domain immediately post-deployment; stale/staging logs rejected. *(Assigned: FINISH-G7-C)*
3. **Public Routes (5 observations):** Direct HTTP GET, browser refresh, and history navigation for `/`, `/about`, `/contact`, `/resume`, and all 4 published projects; verified HTTP 404 for CandidateX. *(Assigned: FINISH-G7-C)*
4. **World Entry (5 observations):** 3D room on-demand loading, loading indicator, entrance duration $\le 8.0\text{s}$, instant skip $\le 50\text{ms}$, settled `HOME`, avatar acknowledgment. *(Assigned: FINISH-G7-C)*
5. **Fallback (5 observations):** Complete semantic HTML portfolio without WebGL, JS-disabled usability, WebGL context-loss recovery, responsive layout across viewports. *(Assigned: FINISH-G7-C)*
6. **Contact Behavior (7 observations):** Sanitized form submission, honeypot spam protection, HTTP 429 rate limiting, atomic PostgreSQL persistence, durable outbox delivery, zero PII logged. *(Assigned: FINISH-G7-A)*
7. **Production Configuration (8 observations):** Zero dev/staging secrets leaked, production environment variables isolated, strict CSP/HSTS headers, Supabase production RLS enforced on all 16 tables. *(Assigned: FINISH-G7-A)*
8. **Asset Loading (6 observations):** CDN delivery, immutable cache headers (`max-age=31536000`), 100% SHA-256 match against production manifest, total entry asset budget $\le 3.0\text{ MB}$. *(Assigned: FINISH-G7-B)*
9. **Monitoring (5 observations):** `/api/health` returns HTTP 200, operational error logging active, external uptime probe configured, zero visitor PII retained in telemetry. *(Assigned: FINISH-G7-A)*
10. **Rollback Readiness (7 observations):** Zero-downtime rollback mechanism rehearsed, backward-compatible DB schema, $RTO \le 5\text{ minutes}$, $RPO = 0$. *(Assigned: FINISH-G7-A / GPT #2)*

### 6 Manual Physical & Assistive Device Sessions
- **MD-01:** Physical iPhone / iPad (iOS Mobile Safari) — touch gestures, thermal pacing, orientation changes.
- **MD-02:** Physical Android Phone (Chrome on Android) — touch interactions, viewport framing, WebGL memory.
- **MD-03:** NVDA Screen Reader (Windows / Firefox or Chrome) — full keyboard navigation, landmark accessibility, ARIA live regions.
- **MD-04:** VoiceOver Screen Reader (macOS / iOS) — rotor navigation, accessible labels, room controls modal focus trap.
- **MD-05:** TalkBack Screen Reader (Android) — accessibility hierarchy, focus indicators, non-WebGL alternatives.
- **MD-06:** 600-Second Sustained Thermal Session — continuous 10-minute 3D canvas run, evaluating frame pacing, memory leaks, and thermal throttling.

---

## 5. Full-Product Post-V1 Extensions Matrix (EXT-01 through EXT-06)

These six extension groups are explicitly retained in the Product Specification (§4 and §12) and will be executed sequentially after V1 acceptance:

| Extension ID | Description | Asset Scope (Gemini #2) | Runtime Scope (Gemini #3) | Acceptance Criteria |
| :--- | :--- | :--- | :--- | :--- |
| **EXT-01** | Coffee Mug Pickup & Drinking | Ceramic mug model, steam particle, pickup/drink avatar clip | Mug click raycasting, character animation trigger, return to coaster | Clean animation blend, no clipping through desk or face, sound effect (opt-in) |
| **EXT-02** | Wearable Over-Ear Headphones | Headphone model on pegboard, avatar head-mounted variant | Click stand triggers resident picking up headphones and placing on ears | Visible mesh swap / socket attachment, audio filter toggle (subtle low-pass) |
| **EXT-03** | Multiple Interactive Desk Drawers | Authored drawer meshes with slide bones/pivots | Click drawer pulls open with ease curve; second click slides shut | Bounded translation, sound effect, reveals small easter egg props inside |
| **EXT-04** | Weather & Daylight Environments | Rain particle effect, wet window texture, sunset/night lighting presets | Sky/window lighting switcher, rain ambient audio (opt-in) | Dynamic lighting updates without hitching, maintains low draw-call budget |
| **EXT-05** | Alternate Resident Moods & Greetings | Cheerful wave clip, tired stretch clip, focused nod clip | Time-of-day or interaction-count selector for ambient greeting variations | Proper clip transitions, cooldown enforcement, character settlement |
| **EXT-06** | Expanded 5–8 Easter Eggs | 5 additional discoverable props (retro game cartridge, figurine, sticky note, etc.) | Click / drag reveal interactions, discovery flags in localStorage | Non-gated content, accessible DOM equivalent in Room Controls panel |

---

## 6. Strict Rules for Unavailable States

1. **CandidateX Project:**
   Must remain completely unpublished on public routes (`/projects/candidatex` returns HTTP 404). In the 3D room launcher, it must be labeled with an explicit `"Pending Verification"` status and be non-navigable until authentic repository, deployment evidence, and owner authorization are formally supplied.
2. **Unverified Credentials & Personal Objects:**
   If owner verification receipts or approved 3D scans are absent, they must be represented by truthful conditional states or accessible placeholder elements. Inventing certifications, likeness, or voice is strictly prohibited.
3. **Approved Downloadable Résumé:**
   The download route and CMS reference mechanism must be fully engineered. If the human owner has not yet supplied the approved PDF bytes, the route must display an honest `"Document awaiting owner release"` notice, and the item must be recorded as an explicit **UNMET OWNER INPUT / NOT RUN** in all audit ledgers.
