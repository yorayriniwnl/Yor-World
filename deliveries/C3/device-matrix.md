# YOR WORLD Milestone C3: Device & Accessibility Test Matrix

**Author / Lane:** Gemini #3 — Runtime / Integration Maker  
**Packet:** `C3` (Mobile, Adaptive Quality, Accessibility and Failure Recovery)  
**Evaluation Date:** 2026-10-02  
**Host Machine:** Windows 11 Pro 10.0.26200, AMD Ryzen 5 3600XT, NVIDIA GeForce RTX 2060, 32 GB RAM  
**Testing Harness:** Playwright 1.63.0, Chromium 1243 (Chrome 124), Microsoft Edge 124, @axe-core/playwright 4.13.0, Vitest 5.0.2  

---

## 1. Device & Browser Verification Matrix

| Device / Profile | Viewport (CSS px) | Rendering Engine | Mode / Tier | Status | Observations / Measurements | Evidence Path |
| :--- | :---: | :---: | :---: | :---: | :--- | :--- |
| **Desktop High-DPI** | 1440 × 900 | Chromium / ANGLE D3D11 | `high` | **PASS** | 5 cold loads: [199, 72, 69, 61, 70] ms; median 70ms, p95 199ms. Frame time median 6.1ms, p95 6.2ms over 1451 frames. | `evidence/cold-loads-desktop-1440x900.json` |
| **Desktop Edge** | 1440 × 900 | Microsoft Edge / ANGLE | `high` | **PASS** | 25 E2E checks passed (axe-core, navigation, context-loss, dialog safety). | `evidence/16-e2e-tests.log` |
| **Mobile Portrait (Emulated)** | 390 × 844 | Chromium / Touch Emulation | `medium` / `low` | **PASS** | 5 cold loads: [86, 143, 153, 146, 138] ms; median 143ms, p95 153ms. Touch tap, pointercancel, and camera controls responsive. | `evidence/cold-loads-mobile-390x844.json` |
| **Mobile Landscape (Emulated)** | 844 × 390 | Chromium / Orientation Reflow | `medium` / `low` | **PASS** | Viewport resize reflow handled without layout jitter or camera clip reset; full DOM links accessible. | `evidence/chrome/mobile-landscape-rotation.json` |
| **Constrained Narrow Viewport** | 320 × 600 | Chromium | `static` / `low` | **PASS** | 5 cold loads: [88, 147, 142, 141, 140] ms; median 141ms, p95 147ms. Zero horizontal scrollbar at 320px width. | `evidence/cold-loads-narrow-320x600.json` |
| **Zoom Reflow (200%)** | 1280 × 800 (Zoom 2.0) | Chromium | `medium` | **PASS** | WCAG 1.4.10 Reflow satisfied. Content reflows vertically without text truncation or clipping. | `evidence/16-e2e-tests.log` |
| **Physical iPhone (iOS / Safari)** | Physical Hardware | Mobile Safari / WebKit | N/A | **NOT RUN** | Physical iOS hardware lab device not attached in local execution runner. | Recorded per Governance Rule |
| **Physical Android (Pixel / Chrome)** | Physical Hardware | Mobile Chrome / Blink | N/A | **NOT RUN** | Physical Android hardware lab device not attached in local execution runner. | Recorded per Governance Rule |
| **Physical 10-Minute Thermal Stress** | Physical Mobile | N/A | N/A | **NOT RUN** | Requires physical mobile device instrumentation; emulated 60-second active route run instead. | Recorded per Governance Rule |

---

## 2. Accessibility & Assistive Technology Matrix

| Assistive Tech / Check | Standard | Scope | Status | Notes & Verification Method | Evidence Path |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **Automated Axe-Core Audits** | WCAG 2.2 AA | All 8 public routes (`/`, `/about`, `/contact`, `/resume`, `/projects`, `/projects/*`) | **PASS** | 0 critical, 0 serious violations across Chrome and Edge. | `evidence/chrome/axe-*.json` |
| **Semantic Heading Hierarchy** | WCAG 1.3.1 (Info & Relationships) | Public shell & pages | **PASS** | Logical H1 on every route; sequential H2 subsections; zero skipped heading levels. | `evidence/16-e2e-tests.log` |
| **Semantic Landmark Regions** | WCAG 1.3.1 | Whole application | **PASS** | `<main>`, `<nav>`, `<aside>`, `<header>`, and `<footer>` present and correctly labeled. | `evidence/16-e2e-tests.log` |
| **Keyboard-Only Navigation** | WCAG 2.1.1 (Keyboard) | Public routes + 3D HUD | **PASS** | Tab order logical; visible focus outline on all interactive controls; zero keyboard traps. | `evidence/16-e2e-tests.log` |
| **Skip-to-Content Direct Bypass** | WCAG 2.4.1 (Bypass Blocks) | Public shell | **PASS** | `#skip-link` targets `#main-content`, allowing keyboard users to bypass header. | `evidence/16-e2e-tests.log` |
| **Touch Target Size** | WCAG 2.5.5 / 2.5.8 | HUD controls, nav links | **PASS** | All interactive touch targets measure $\ge 44 \times 44$ CSS px. | `evidence/chrome/touch-target-audit.json` |
| **Zero-WebGL Access** | Assistive Fallback | All case studies & portfolio | **PASS** | 100% of case study body text, diagrams, code snippets, and contact forms accessible with canvas blocked. | `evidence/16-e2e-tests.log` |
| **Reduced Motion Removal** | WCAG 2.3.3 (Animation from Interactions) | World camera & parallax | **PASS** | Transition duration set to 0ms (travel completely removed); pointer parallax set to 0.0. | `evidence/09-unit-tests.log` |
| **Color Contrast (Text)** | WCAG 1.4.3 (Contrast Minimum) | DOM portfolio text | **PASS** | High contrast light text on dark background exceeds 4.5:1 ratio. | `evidence/16-e2e-tests.log` |
| **Physical Screen Reader (NVDA)** | Physical Windows | Whole application | **NOT RUN** | Screen reader binary NVDA not driven via automated CI runner. | Recorded per Governance Rule |
| **Physical Screen Reader (VoiceOver)** | Physical macOS/iOS | Whole application | **NOT RUN** | VoiceOver runtime unavailable on Windows runner. | Recorded per Governance Rule |
| **Physical Screen Reader (TalkBack)** | Physical Android | Whole application | **NOT RUN** | TalkBack runtime unavailable on Windows runner. | Recorded per Governance Rule |

---

## 3. Honest Governance Declarations
1. **No Emulation Converted to Physical Pass:** Emulated viewports (390×844, 844×390, 320×600) and touch simulation are clearly reported as emulated. No claim of physical hardware execution is made.
2. **Screen Reader Sessions:** Axe-core automated audits (50/50 tests passing with 0 severe violations) and programmatic DOM landmark/keyboard verifications are confirmed. Physical screen reader listening sessions are recorded honestly as **NOT RUN**.
3. **Thermal Benchmarks:** 60-second active route execution recorded 1451 frames with median 6.1ms; 10-minute physical mobile battery/thermal benchmark is recorded as **NOT RUN**.
