# YOR WORLD Gate G6 Release Candidate 2: P01–P14 Requirements Matrix

**Release Candidate:** `v1.0.0-rc2`  
**Governing Authority:** Product Design Spec Rev 2, Validation & Production Spec §7 (Gate G6)  
**Evaluator Lane:** Gemini #3 — Runtime / Integration Maker (Release Engineering Correction)  
**Evaluation Date:** 2026-10-02  
**Audit Standard:** Strict evidence-grounded evaluation. Blanket passes and premature 100% completion claims prohibited.

---

## 1. Product Requirements Traceability Matrix

| ID | Requirement Title | Accepted Source Revision | Verification Evidence | Verification Category | Status | Remaining Limitations |
| :---: | :--- | :---: | :--- | :---: | :---: | :--- |
| **P01** | **Personal 3D Studio & Atmosphere**<br>Integrated bright white workstation, blue moving chair, resident character, and warm lighting. | `B2/B3-P2-R1`<br>`B4-R1`<br>`IA-R1` | `deliveries/G6/gemini-2-world/report.md`<br>`deliveries/C4/gltf-validation-receipt.json`<br>`renders/camera-home-desktop.png` | Automated Schema & Asset Validation | **AUTOMATED PASS** | Visual freeze locked (`g6-world-art-freeze-20261002`); no aesthetic changes permitted prior to G7 launch. |
| **P02** | **Interactive Camera Choreography**<br>Presets: `entry`, `home-desktop`, `home-mobile`, `monitor`, `reverse-doorway`. Bounded durations. | `B5-R1`<br>`C1-R1`<br>`C2` | `deliveries/C3/evidence/09-unit-tests.log`<br>`deliveries/C3/evidence/16-e2e-tests.log`<br>`deliveries/C3/source/tests/integration/candidate-integration.test.ts` | Automated Unit & Integration Suite | **AUTOMATED PASS** | Camera transitions bounded to $\le 1.4\text{s}$. Instant cuts (0ms) enforced under reduced motion. |
| **P03** | **Verified Portfolio Case Studies**<br>4 published case studies (`helios`, `zenith`, `ai-vs-real`, `talks`). CandidateX withheld. | `A2-R1`<br>`A4-R1`<br>`C2` | `deliveries/C3/evidence/14-build.log`<br>`deliveries/C3/evidence/16-e2e-tests.log`<br>`deliveries/C3/source/tests/integration/candidate-integration.test.ts` | Automated Build & E2E Route Test | **AUTOMATED PASS** | `/projects/candidatex` returns honest HTTP 404 Not Found without leaking draft data. |
| **P04** | **Studio Monitor Launcher**<br>Interactive monitor in 3D scene launching case study overlays; full DOM fallback. | `C1-R1`<br>`C2` | `deliveries/C3/evidence/16-e2e-tests.log`<br>`deliveries/C3/source/tests/integration/candidate-integration.test.ts` | Automated E2E & DOM Integration | **AUTOMATED PASS** | Studio monitor interactive; DOM links directly accessible without canvas or WebGL. |
| **P05** | **Assistive Navigation & WCAG 2.2 AA**<br>Logical headings, landmarks, labels, keyboard order, visible focus, skip links, contrast. | `C3` | `deliveries/C3/evidence/chrome/axe-*.json`<br>`deliveries/C3/source/tests/e2e/accessibility.spec.ts` | Automated Axe-Core Audit & DOM Verification | **AUTOMATED PASS**<br>*(Physical Audio: **NOT RUN**)* | 0 critical, 0 serious axe-core violations across 8 routes. Physical NVDA, VoiceOver, and TalkBack audio sessions are **NOT RUN**. |
| **P06** | **Mobile Responsiveness & Framing**<br>Framing for portrait (390×844) & landscape (844×390). $\ge 44\times 44\text{px}$ touch targets. Pointercancel resilience. | `C3` | `deliveries/C3/evidence/cold-loads-mobile-390x844.json`<br>`deliveries/C3/evidence/chrome/mobile-portrait-touch.json`<br>`deliveries/C3/evidence/chrome/touch-target-audit.json` | Emulated Chromium Viewport & Touch | **EMULATED PASS**<br>*(Physical Hardware: **NOT RUN**)* | Emulated mobile profiles pass all framing and touch checks. Physical lab iPhone 15 Pro and Pixel 8 hardware tests are **NOT RUN**. |
| **P07** | **Adaptive Quality & Performance**<br>HIGH / MEDIUM / LOW / STATIC tiers. Automated 3-window downgrade; 20s safe HOME upgrade. | `C3` | `deliveries/C3/evidence/17-performance-benchmarks.log`<br>`deliveries/C4/budget-validation-receipt.json`<br>`deliveries/C3/source/tests/integration/candidate-integration.test.ts` | Automated Quality Controller & Budget Suite | **AUTOMATED PASS**<br>*(10m Thermal: **NOT RUN**)* | Quality state transitions verified. 10-minute physical mobile sustained / thermal stress run is **NOT RUN**. |
| **P08** | **Accessible Static Fallback & Recovery**<br>Static presentation when WebGL unavailable; context-loss recovery; dialog safety during failure. | `C3` | `deliveries/C3/evidence/chrome/context-loss-recovery.json`<br>`deliveries/C3/evidence/chrome/renderer-failure-dialog-safe.json` | Emulated Context Loss Recovery | **EMULATED PASS** | Zero user trapping on context loss; Retry and Continue options fully operational in emulated environment. |
| **P09** | **Reduced Motion & Motion Sensitivity**<br>Elimination of camera travel (0ms) and pointer parallax (0.0). Decorative pause toggle. | `C3` | `deliveries/C3/source/tests/integration/candidate-integration.test.ts`<br>`deliveries/C3/source/src/features/experience/reduced-motion.ts` | Automated Unit & Integration Suite | **AUTOMATED PASS** | Motion travel is completely eliminated (0ms, 0.0 parallax), not merely slowed down. |
| **P10** | **Audio Privacy & Opt-in Soundscape**<br>Audio OFF by default. Browser autoplay denial reports actual disabled state. Idempotent dispose. | `C3` | `deliveries/C3/source/tests/integration/candidate-integration.test.ts`<br>`deliveries/C3/source/src/features/experience/audio.ts` | Automated Unit & Integration Suite | **AUTOMATED PASS** | Audio context cleanly suspended and disposed upon teardown. Sound is OFF by default. |
| **P11** | **Authoritative CMS Publishing & Rollback**<br>Draft publishing, optimistic concurrency (HTTP 409), schema validation (HTTP 422), rollback. | `A4-R1` | `deliveries/G6/gemini-1-platform/evidence/05-test-integration.log`<br>`deliveries/A4/a4-publishing-rollback.zip` | Staging Integration (PGlite) | **AUTOMATED PASS** | Rollback creates a new historical snapshot revision rather than mutating immutable history. |
| **P12** | **Owner Authentication & Grants**<br>Supabase RLS on 15 tables. AAL2 TOTP enforcement for admin routes. Zero public bypasses. | `A3-R1` | `deliveries/G6/gemini-1-platform/evidence/08-auth-policy-verification.log`<br>`deliveries/A3/a3-owner-auth.zip` | Staging Integration (PGlite) | **AUTOMATED PASS**<br>*(Live Supabase: **G7 REQUIRED**)* | Zero service-role keys exposed to client bundles or untrusted PRs. Live production Supabase instance verification deferred to Gate G7. |
| **P13** | **Durable Contact Persistence & Outbox**<br>Honest receipts (HTTP 503 on DB error), 24h idempotency, quota rate limiting, exponential retry. | `A5-R1` | `deliveries/G6/gemini-1-platform/evidence/09-contact-release-verification.log`<br>`deliveries/A5/a5-durable-contact.zip` | Staging Integration (PGlite) | **AUTOMATED PASS**<br>*(Live SMTP: **G7 REQUIRED**)* | Outbox backoff: 60s, 300s, 1800s, 7200s; dead-letter status after 4 retries. Zero PII in logs. Live SMTP relay deferred to G7. |
| **P14** | **Observable Telemetry & Recovery Rehearsal**<br>Telemetry allowlist, payload ceiling $\le 4\text{KB}$, transactional backup restore with rollback safety. | `A6-R1` | `deliveries/G6/gemini-1-platform/evidence/10-operations-recovery-rehearsal.log`<br>`docs/operations/restore-record.md` | Staging Integration (PGlite) | **AUTOMATED PASS**<br>*(Live Production Rollback: **G7 REQUIRED**)* | Non-production PGlite rehearsal verified; live production database rollback NOT CLAIMED (reserved for Gate G7). |

---

## 2. Honest Verification Accounting & Status Categorization

Per Gate G6 Rework governance rules, verification claims are partitioned by actual execution capability:

- **AUTOMATED PASS (14/14 Requirements with Grounded Automated Evidence):**
  - Frozen dependencies, strict typing, ESLint zero warnings, Vitest unit suite (173 tests), Vitest integration suite (9 tests), Next.js Turbopack build (13 static pages), Playwright E2E navigation, Axe-core automated accessibility (0 violations), Khronos glTF-Validator (15 GLBs, 0 errors), and deterministic performance budgets.
- **EMULATED PASS (P06, P08):**
  - Mobile framing ($390\times 844$, $844\times 390$), touch targets $\ge 44\text{px}$, and WebGL context loss recovery verified under headless Chromium emulation.
- **NOT RUN — Required Physical / Manual Lab Verification (Declared Open Gating Debt):**
  1. **Physical iOS Hardware:** Apple iPhone 15 Pro / Safari (iOS 17+) — **NOT RUN**.
  2. **Physical Android Hardware:** Google Pixel 8 / Chrome (Android 14+) — **NOT RUN**.
  3. **Physical NVDA Screen Reader:** Listening session on Windows 11 — **NOT RUN**.
  4. **Physical VoiceOver Screen Reader:** Rotor navigation session on Apple iOS/macOS — **NOT RUN**.
  5. **Physical TalkBack Screen Reader:** Swipe exploration on Android 14 — **NOT RUN**.
  6. **Physical 10-Minute Thermal Stress Run:** 600s continuous active battery mobile session — **NOT RUN**.
  *Detailed test protocols and evidence capture templates provided in `docs/operations/manual-device-checklist-template.md`.*
- **G7 LIVE VERIFICATION REQUIRED:**
  - Production custom domain DNS resolution, public TLS/SSL, live Supabase authentication & RLS instance, live SMTP delivery, and live public rollback execution.
