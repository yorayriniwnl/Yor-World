# CLAUDE-05 — Accessibility and Keyboard Review

**Reviewer Identity:** Independent Reviewer (Claude-05 Lane; executed via Gemini 3.8 Flash (High), High Effort/Depth)  
**Date:** 2026-10-01  
**Candidate Revision:** W3-A1 (`858c425cf2a48407245c9e65e4f08bf5b7908c36` / Git base `fe1a40f797ce3ec839939c09a1857b797c197269`)  
**Baseline:** WCAG 2.2 AA / AAA Standards, Platform Plan §A1, Product Spec §3/§4/§10

---

## 1. Received and Inspected Inventory

| Item / Path | Source / Hash | Description | Status |
| --- | --- | --- | --- |
| `deliveries/W3/source/src/app/layout.tsx` | `9b360f0d2358897f267a5bb07f87eeea1ad90faae7d5fa216a7071ea13e2f5b8` | HTML shell, skip link, main landmark, footer | INSPECTED |
| `deliveries/W3/source/src/features/portfolio/navigation.tsx` | `ef09c3132e4d0f622be45582f05903c7ea07d08ba2c9fe83eec19c3c1e28ba24` | Header landmark, primary nav list, accessible names | INSPECTED |
| `deliveries/W3/source/src/app/(public)/**/*.tsx` | Multiple files | Home, Projects, About, Contact, Resume, 404 pages | INSPECTED |
| `deliveries/W3/source/src/styles/tokens.css` | `d6945a8e3f60f64c1b52bca7e61bc8939c635a11dfb9a8ae66795f7ef5eb461c` | Design tokens, focus outlines, reduced motion, forced colors | INSPECTED |
| `deliveries/W3/source/src/features/portfolio/portfolio.module.css` | `cbb567e7a8581699fce97a55c2cb9ba6f1304561fe7842602e1762c4c34a9fe3` | Component styling, target sizes, media queries | INSPECTED |
| `deliveries/W3/source/tests/e2e/public-shell.spec.ts` | `75a7c2936712eeaa3ae19ecda8f03767f4ae91e4aaae98d4151a66ef8c8f85f3` | Automated keyboard, axe, reflow, and no-JS E2E suite | INSPECTED |
| `deliveries/W3/reviews/2026-10-01-independent/report.md` | `882c8386049cdae8f91fcca843c7d8ccb9d6e5dca644c3164d8cf0ad7711f94c` | Independent Codex audit findings on accessibility & contrast | INSPECTED |

### Missing Inventory
- Physical assistive technology runtime logs (NVDA, JAWS, VoiceOver, TalkBack).
- Physical mobile device touchscreen and manual browser pinch-zoom test logs.

---

## 2. Evidence Ledger

| Accessibility Area | Evidence Class | Result | Evidence Citation | Notes / Limitations |
| --- | --- | --- | --- | --- |
| Document Language | SOURCE | PASS | `layout.tsx:14` | `<html lang="en">` explicitly declared |
| Semantic Landmarks | SOURCE | PASS | `layout.tsx`, `navigation.tsx` | `<header>`, `<nav aria-label="...">`, `<main id="main-content">`, `<aside>`, `<footer>` |
| Heading Hierarchy | SOURCE | PASS | `page-intro.tsx`, `page.tsx` | Exactly one `h1` per page; sub-sections use `h2`; zero skipped levels |
| Accessible Names | SOURCE | PASS | `navigation.tsx:15,19`, `page.tsx:8,40` | Brand link has `aria-label="Yor World home"`; nav has `Primary navigation`; sections use `aria-labelledby` |
| Skip Link Implementation | SOURCE / E2E | PASS | `layout.tsx:16`, `portfolio.module.css:11–12` | First DOM element; off-screen until focused; targets `#main-content` |
| Focus Indicator Visibility | SOURCE | PASS | `tokens.css:19`, `portfolio.module.css:12` | `:focus-visible` outline 3px solid `#174bbb` with 5px offset; skip link outline 3px solid `#172c42` |
| Target Size (WCAG 2.5.8) | SOURCE | PASS | `portfolio.module.css:4,7,24,27,64` | Nav links min-height 44px; buttons/summaries 52px; meets AA (24px) and AAA (44px) |
| Semantic Interactive Elements | SOURCE | PASS | `src/app/(public)/**/*.tsx` | Native `<a>`, `<Link>`, `<details>`, `<summary>`; zero pseudo-buttons or void links |
| Studio Disclosure No-JS | SOURCE / E2E | PASS | `page.tsx:20–26`, `public-shell.spec.ts:31–65` | Native `<details>` operates natively without JavaScript |
| Reduced Motion Support | SOURCE | PASS | `tokens.css:25–27` | `@media (prefers-reduced-motion: reduce)` resets scroll-behavior, animation, transition |
| Forced Colors (High Contrast) | SOURCE | PASS | `tokens.css:28–30` | `@media (forced-colors: active)` explicitly sets `forced-color-adjust: auto` |
| Text Contrast (Paper/Ink) | REVIEWER EXECUTED | PASS (AAA) | `tokens.css:3–6` | `#172c42` on `#fbfaf7` yields 13.25:1 contrast ratio (exceeds AAA 7.0:1) |
| Muted Text Contrast | REVIEWER EXECUTED | PASS (AA) | `tokens.css:3,5` | `#526175` on `#fbfaf7` yields 6.07:1 contrast ratio (exceeds AA 4.5:1) |
| Link & Button Contrast | REVIEWER EXECUTED | PASS (AAA) | `tokens.css:4,6` | `#174bbb` on `#fbfaf7` yields 7.24:1; white on `#174bbb` yields 7.55:1 |
| Poster Gradient Contrast | SOURCE / REVIEWER EXECUTED | PASS (Evaluated) | `portfolio.module.css:31,42` | `#43546d` over `#e5edf8` is ~6.4:1; Axe flags "incomplete" due to CSS gradient |
| Automated Axe-core Scan | MAKER / INDEPENDENT | PASS | `public-shell.spec.ts:15–20`, Independent Report §109 | 0 automated violations across desktop and mobile emulated viewports |
| Screen Reader Execution | UNVERIFIED | NOT RUN | None | Real NVDA / VoiceOver / TalkBack live testing not performed |
| Physical Touch & 400% Zoom | UNVERIFIED | NOT RUN | None | Real browser zoom (400%) and physical touch gestures not tested |

---

## 3. Findings

### C05-01 (P3 — Low): Automated Axe Contrast "Incomplete" on Multi-stop Poster Gradients
- **Class:** SOURCE / REVIEWER EXECUTED
- **File / Symbol:** `deliveries/W3/source/src/features/portfolio/portfolio.module.css:31–42`, `tokens.css:9–10`
- **Expected:** Text over background surfaces must achieve at least 4.5:1 contrast for normal text and 3:1 for large text.
- **Observed:** In the hero `.poster` element, text `#43546d` sits over `linear-gradient(145deg, #e5edf8, #f6eaf4 60%, #e1f3f3)`. Automated scanners (Axe-core) cannot compute pixel-by-pixel luminance across multi-stop CSS gradients and flag contrast as "incomplete" (requiring human verification). Independent manual calculation verifies that the darkest background stop (`#e5edf8`) has luminance ~0.84, giving a contrast of ~6.4:1 against `#43546d` (luminance ~0.09), which satisfies WCAG 2.2 AA.
- **Disposition:** Satisfied for A1 proof; formal sign-off requires documenting the calculated contrast stops to close the automated incomplete flag.

### C05-02 (P3 — Low): Main Landmark Programmatic Focus Ring Suppressed
- **Class:** SOURCE
- **File / Symbol:** `deliveries/W3/source/src/features/portfolio/portfolio.module.css:10`
- **Expected:** Skip link activation sends focus to `<main id="main-content" tabIndex={-1}>`. Focus outlines should be suppressed on programmatic container focus only if focus continues cleanly to child elements.
- **Observed:** `.main:focus { outline: none; }` intentionally removes the outline when `#main-content` receives programmatic focus. Subsequent Tab key moves focus directly to the first interactive element (`View projects`) which has a visible outline.
- **Disposition:** Standard accessible pattern for skip-to-content containers with `tabIndex={-1}`.

### C05-03 (P2 — Evidence Gap): Real Screen Reader and Hardware Touch Execution Absent
- **Class:** UNVERIFIED / NOT RUN
- **File / Symbol:** Workspace validation evidence
- **Expected:** WCAG compliance claims for assistive technology and mobile reflow must be backed by live screen reader passes and physical device zoom/touch verification.
- **Observed:** Evidence relies exclusively on Chromium CDP viewport emulation (390×844) and automated `@axe-core/playwright` assertions. No live NVDA, VoiceOver, or TalkBack sessions were recorded.
- **Correction Criterion:** Convert into explicit local retest requests for future integrated releases.

---

## 4. Local Retest Requests

1. **NVDA Landmark & Skip Link Test (Windows):** Using NVDA + Firefox/Chrome on Windows:
   - Load the home page, press `Tab` once; verify NVDA announces `"Skip to content link"`.
   - Press `Enter`; verify focus moves to `main` and subsequent `Tab` reaches `"View projects link"`.
   - Press `D` (landmark navigation); verify navigation cycles through Banner (`header`), Navigation (`Primary navigation`), Main, Complementary (`aside`), and Contentinfo (`footer`).
2. **NVDA Native Disclosure Test:**
   - Tab to `"Enter studio"`, press `Space` or `Enter`; verify NVDA announces `"Enter studio, collapsed"` transitioning to `"expanded"` and reads `"The studio is not yet available."`
3. **Manual 400% Zoom Reflow Test:**
   - On a desktop browser at 1280×1024, zoom to 400% (equivalent to 320 CSS px); verify that no content is clipped and no horizontal scrollbar appears.

---

## 5. Recommendation

**Recommendation:** **ACCEPT FOR A1 ACCESSIBILITY FOUNDATION** (with recorded NOT RUN screen-reader and physical-zoom limitations).  
- The static semantic markup, heading hierarchy, target sizing, skip link, `:focus-visible` styling, and contrast ratios strictly fulfill WCAG 2.2 AA and A1 foundation requirements.
- Native HTML controls ensure 100% functionality without JavaScript.
