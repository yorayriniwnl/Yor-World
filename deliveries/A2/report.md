# YOR WORLD Milestone A2 — Verified Content & Project Routes Maker Report

## Executive Summary

- **Milestone:** A2 (Verified Portfolio Content & Substantive Project Routes)
- **Maker Lane:** Verified Content and Project Routes Maker
- **Status:** **PASS** (100% of lint, typecheck, 84 unit tests, production build, and 62 Playwright E2E tests passing)
- **Source Revision Baseline:** `e763e4256a70f8bc0358bde16995079780cf850c`
- **Output Delivery Root:** `deliveries/A2/` (immutable `deliveries/G1/` preserved untouched)
- **Public Evidence Register:** `docs/content/evidence-register.md` and `deliveries/A2/evidence-register.md`
- **Delivery Bundle:** `deliveries/A2/a2-verified-portfolio.zip`
- **Package Checksum File:** `deliveries/A2/a2-verified-portfolio.zip.sha256`
- **Package Manifest:** `deliveries/A2/manifest.json`

---

## 1. Scope & Verification Boundaries

In strict compliance with human instructions and constraint **C01**:
1. **Zero Invented Claims:** No invented metrics, fake users, simulated benchmarks, unearned research credentials, or speculative production claims. All claims are grounded directly in verifiable receipts from GitHub repositories, live deployments, and owner profile metadata.
2. **Four Verified Projects Published:**
   - **`ai-vs-real` (AI vs. Real Image Detector):** 78.5% held-out test accuracy on deterministic 80/20 split; LBP/GLCM texture forensics; calibrated RBF SVM; Streamlit / Vercel demo; GitHub repository `yorayriniwnl/Yor-Ai-vs-real-image`.
   - **`zenith` (Yor Zenith):** Solar feasibility platform; 3D roof viewer in Three.js and React; mathematical irradiance calculation; financial ROI modeling; Vercel deployment; GitHub repository `yorayriniwnl/Yor-Zenith`.
   - **`helios` (Yor Helios):** Realtime energy intelligence and anomaly engine; FastAPI asynchronous WebSockets; Docker Compose orchestration; active development status truthfully disclosed; GitHub repository `yorayriniwnl/Yor-Helios`.
   - **`talks` (Yor Talks V2):** Full-stack realtime messaging; React/Vite/TypeScript frontend; Express/Socket.IO event broker; PostgreSQL + Drizzle ORM; Vercel deployment; GitHub repository `yorayriniwnl/yor-talks-v2`.
3. **CandidateX Resolution:** Retained internally as an unverified candidate. Per constraint C01, CandidateX has zero public case study (`/projects/candidatex` yields HTTP 404). Attempting to publish it with unverified claims (`status: "unknown"`) triggers an immediate `PublicationValidationError`.
4. **Prohibited Features Strictly Excluded:**
   - No A3 authentication
   - No A4 admin publishing
   - No A5 contact backend / database mutation
   - No A6 operations
   - No new 3D world runtime features
   - WebGL code strictly avoided on public routes (zero Three.js loaded pre-entry; 100% semantic HTML/CSS).

---

## 2. Evidence Register Summary

The comprehensive register is stored at [`docs/content/evidence-register.md`](file:///c:/Users/yoray/Projects/Yor%20World/docs/content/evidence-register.md).

| Claim ID | Entity | Claim Subject | Evidence Source | Verification State | Public Wording |
|---|---|---|---|---|---|
| `EV-ID-01` | Owner | Full Name & Handle | GitHub profile (`yorayriniwnl`) | `verified` | "Ayush Roy (@yorayriniwnl)" |
| `EV-ID-02` | Owner | Location | GitHub profile | `verified` | "Bhubaneswar, Odisha, India" |
| `EV-ID-03` | Owner | Education | Academic records & profile | `verified` | "B.Tech Computer Science & Communication Engineering, KIIT (2023–2027 expected)" |
| `EV-ID-04` | Owner | Internship Experience | RGMTTC Certificate / profile | `verified` | "Telecom & Data Network Intern at BSNL (June 2026)" |
| `EV-AIR-01` | `ai-vs-real` | Source Code | GitHub repo `Yor-Ai-vs-real-image` | `verified` | "Source Repository: github.com/yorayriniwnl/Yor-Ai-vs-real-image" |
| `EV-AIR-02` | `ai-vs-real` | Live Application | Vercel deployment `yor-ai-vs-real-image` | `verified` | "Live Demonstration: yor-ai-vs-real-image.vercel.app" |
| `EV-AIR-03` | `ai-vs-real` | 78.5% Accuracy | Commit history / evaluation scripts | `verified` | "78.5% held-out test accuracy on deterministic 80/20 split using LBP & GLCM with calibrated RBF SVM" |
| `EV-ZEN-01` | `zenith` | Source Code | GitHub repo `Yor-Zenith` | `verified` | "Source Repository: github.com/yorayriniwnl/Yor-Zenith" |
| `EV-ZEN-02` | `zenith` | Live Application | Vercel deployment `zenith-xi-snowy` | `verified` | "Live Demonstration: zenith-xi-snowy.vercel.app" |
| `EV-HEL-01` | `helios` | Source Code | GitHub repo `Yor-Helios` | `verified` | "Source Repository: github.com/yorayriniwnl/Yor-Helios" |
| `EV-HEL-02` | `helios` | Production Status | Architecture audit | `verified` | "In active development with Docker Compose; live cloud production cluster is not deployed" |
| `EV-TLK-01` | `talks` | Source Code | GitHub repo `yor-talks-v2` | `verified` | "Source Repository: github.com/yorayriniwnl/yor-talks-v2" |
| `EV-TLK-02` | `talks` | Live Application | Vercel deployment `yor-talks-v2` | `verified` | "Live Demonstration: yor-talks-v2.vercel.app" |
| `EV-CX-01` | `candidatex` | Candidate Status | Discussion prompt | `unknown` | Omitted from public publication; route yields 404 |

---

## 3. Implemented Architecture & Routes

1. **Projects Index (`/projects`):**
   - Renders 4 verified cards loaded via `readPublication()`.
   - Displays project titles, summary, role/contribution badges, and safe external repository/demo links.
   - Reflows from multi-column grid to 1-column layout on viewports down to 320px.
2. **Project Route Architecture (`/projects/[slug]`):**
   - Dynamic Next.js SSG route with `generateStaticParams` pre-rendering all 4 verified slugs at build time.
   - Generates dynamic OpenGraph metadata, canonical URL links (`https://www.yorayriniwnl.in/projects/[slug]`), and breadcrumb navigation.
   - Deep case study sections: Challenge, Architecture, Implementation, Empirical Results, Technical Limitations, and an Evidence Audit & Verification State box.
   - Unrecognized or unpublished slugs trigger Next.js `notFound()` returning HTTP 404.
3. **About (`/about`):**
   - Verified biography of Ayush Roy grounded in owner receipts.
   - Education details (KIIT 2023–2027) and BSNL Telecom & Data Network internship (June 2026).
   - Core technical capabilities categorized across Languages, Frameworks, Systems, and Machine Learning.
   - Preserves anchor links `#skills` and `#research`.
4. **Resume Route (`/resume`):**
   - Semantic HTML curriculum vitae with accessible heading hierarchy.
   - Verified academic timeline, work experience, featured project highlights, and technical competencies.
   - Styled with `@media print` rules for clean, background-free printing and PDF export.
5. **Security & Accessibility Components:**
   - `SafeExternalLink`: Enforces `https:` protocol, `target="_blank"`, `rel="noopener noreferrer"`, and visually-hidden `(opens in a new tab)` notice for screen readers. Unsafe protocols (e.g. `javascript:`) are safely neutered into non-clickable spans.
   - `AccessibleFigure`: Renders semantic `<figure>` with `<figcaption>`. If an asset is pending or missing, displays an accessible non-crashing placeholder container with `role="img"` and descriptive fallback text, generating zero broken `<img>` tags.
6. **SEO & Discovery:**
   - Canonical URLs configured across all pages via root `metadataBase: new URL("https://www.yorayriniwnl.in")`.
   - `/sitemap.xml`: Dynamically generated sitemap containing only verified routes (`/`, `/about`, `/projects`, `/projects/ai-vs-real`, `/projects/zenith`, `/projects/helios`, `/projects/talks`, `/resume`, `/contact`). CandidateX is strictly excluded.
   - `/robots.txt`: Production crawling rules pointing to `sitemap.xml`.
7. **No-WebGL Access Guarantee:**
   - Public content routes require zero WebGL, canvas, audio, or 3D assets.
   - Full substantive content, case studies, navigation, and resume are 100% accessible with JavaScript completely disabled.

---

## 4. Verification Gates & Execution Evidence

All verification commands were executed strictly inside an isolated external temporary scratch workspace (`%TEMP%/yor-world-a2-proof-*`) via `deliveries/A2/tools/proof.py` to prevent workspace pollution:

| Command | Action | Exit Code | Result | Evidence Log |
|---|---|---|---|---|
| `python tools/proof.py prepare` | Initialize external scratch workspace | `0` | Clean sandbox created | `evidence/execution.json` |
| `python tools/proof.py install` | `pnpm install --frozen-lockfile` | `0` | All dependencies installed | `evidence/01-frozen-install.log` |
| `python tools/proof.py lint` | `eslint . --max-warnings=0` | `0` | Zero errors, zero warnings | `evidence/03-lint.log` |
| `python tools/proof.py typecheck` | `tsc --noEmit` | `0` | TypeScript passed cleanly | `evidence/05-typecheck.log` |
| `python tools/proof.py test:unit` | `vitest run --config vitest.config.ts` | `0` | 84/84 unit tests passed | `evidence/12-test-unit.log` |
| `python tools/proof.py build` | `next build` (Turbopack) | `0` | Static HTML & SSG generation | `evidence/17-build.log` |
| `python tools/proof.py test:e2e` | `playwright test` (Chrome & Edge) | `0` | 62/62 E2E tests passed | `evidence/18-test-e2e.log` |
| `python tools/proof.py package` | Create delivery zip & compute SHA-256 | `0` | Bundle packaged and verified | `evidence/execution.json` |

### Required Test Matrix Coverage

| Required Condition | Implemented Test | Result |
|---|---|---|
| **Verified project** | Loaded `/projects/ai-vs-real`, `/projects/zenith`, `/projects/helios`, `/projects/talks`; verified H1, summary, contribution, links, and evidence audit boxes | **PASS** |
| **Unpublished project** | Requested `/projects/candidatex`; verified HTTP 404 returned without leaking internal notes or mock metrics | **PASS** |
| **Unknown slug** | Requested `/projects/unknown-slug-xyz`; verified HTTP 404 and accessible Page not found heading | **PASS** |
| **Missing figure** | Loaded `/projects/helios`; verified accessible fallback container rendered with `role="img"` and zero broken `<img>` tags | **PASS** |
| **Long title** | Rendered project with ultra-long title; verified `word-break: break-word` and zero viewport horizontal overflow (`scrollWidth <= innerWidth`) on 1440px and 390px viewports | **PASS** |
| **Direct refresh** | Navigated directly to `/projects/ai-vs-real`, refreshed browser (`page.reload()`); verified 200 OK and intact heading | **PASS** |
| **Back navigation** | Navigated from `/projects` into `/projects/zenith`, executed `page.goBack()`; verified return to `/projects` with all 4 cards | **PASS** |
| **JavaScript / no-world** | Navigated `/projects`, `/projects/ai-vs-real`, `/about`, and `/resume` with `javaScriptEnabled: false`; verified 200 OK, full text visible, zero `.glb` requests, and zero canvas elements | **PASS** |
| **Safe external links** | Scanned all project links; verified `https://` protocol, `target="_blank"`, `rel="noopener noreferrer"`, and screen reader text `(opens in a new tab)` | **PASS** |
| **Unsupported claim rejection** | Unit test `validatePublication()` rejected publication fixtures with unverified evidence (`status: "unknown"`), missing verified receipts, duplicate slugs, and insecure URLs | **PASS** |

---

## 5. Visual Artifacts & Screenshots

Screenshots captured during test execution and stored under [`deliveries/A2/evidence/screenshots/`](file:///c:/Users/yoray/Projects/Yor%20World/deliveries/A2/evidence/screenshots/):

1. `a2-projects-index.png`: Projects index showing 4 verified cards and publication badges.
2. `a2-project-ai-vs-real.png`: Full case study for AI vs. Real Image Detector with 78.5% accuracy receipt and links.
3. `a2-project-zenith.png`: Full case study for Yor Zenith with 3D roof planning details and Vercel demo link.
4. `a2-project-helios.png`: Full case study for Yor Helios with architecture, code block, and truthful in-development status.
5. `a2-project-talks.png`: Full case study for Yor Talks V2 with tech stack breakdown and verified demo.
6. `a2-404-candidatex.png`: Accessible 404 page returned for unpublished candidate CandidateX.
7. `a2-missing-figure-fallback.png`: Accessible fallback figure rendered in Helios case study.
8. Baseline shell screenshots (`01-load-landing.png` through `14-javascript-disabled.png`).

---

## 6. Changed Files Inventory

### Documentation & Evidence
- `docs/content/evidence-register.md`: Public evidence register mapping all claims to sources, states, and wording.
- `deliveries/A2/evidence-register.md`: Delivery-scoped mirror of evidence register.
- `deliveries/A2/report.md`: This comprehensive maker report.
- `deliveries/A2/manifest.json`: Machine-readable package inventory with SHA-256 hashes.
- `deliveries/A2/a2-verified-portfolio.zip`: Packaged delivery bundle.
- `deliveries/A2/a2-verified-portfolio.zip.sha256`: SHA-256 checksum file.
- `deliveries/A2/tools/proof.py`: Isolated scratch proof runner.

### Application Source (`deliveries/A2/source/`)
- `src/contracts/content.ts`: Zod validation schemas for publication and project data.
- `src/content/approved-publication.ts`: Validated publication snapshot with 4 verified projects.
- `src/content/publication-reader.ts`: Content retrieval and rejection logic.
- `src/features/portfolio/safe-link.tsx`: Hardened external link component.
- `src/features/portfolio/case-study.tsx`: Case study and accessible figure components.
- `src/features/portfolio/portfolio.module.css`: Responsive CSS with mobile reflow down to 320px and print styles.
- `src/features/portfolio/public-content.ts`: Published project constants and verified owner identity.
- `src/styles/tokens.css`: Accessible `.sr-only` class.
- `src/app/(public)/page.tsx`: Updated homepage with verified owner identity.
- `src/app/(public)/about/page.tsx`: Substantive verified About page.
- `src/app/(public)/contact/page.tsx`: Verified contact channels and email link.
- `src/app/(public)/projects/page.tsx`: Verified Projects index.
- `src/app/(public)/projects/[slug]/page.tsx`: Substantive case study dynamic route with SSG.
- `src/app/(public)/resume/page.tsx`: Verified semantic HTML curriculum vitae.
- `src/app/sitemap.ts`: Dynamic XML sitemap generator.
- `src/app/robots.ts`: Crawling rules.
- `src/app/not-found.tsx`: Accessible 404 page for unpublished candidates.
- `src/app/layout.tsx`: Root metadata with canonical base.
- `vitest.config.ts`: Vitest path resolution.
- `tests/unit/content-visibility.test.ts`: A2 unit tests for claims, lookup, fallback, and validation.
- `tests/unit/boundaries.test.ts`: Import boundary enforcement.
- `tests/e2e/public-shell.spec.ts`: End-to-end shell verification.
- `tests/e2e/project-routes.spec.ts`: Dedicated A2 Playwright E2E suite.

---

## 7. Remaining Unknowns & Next Steps

1. **CandidateX Evidence:** CandidateX remains unpublished because no public GitHub repository, commit history, or deployment exists on the owner's profile. If and when the owner provides verifiable evidence, it can be registered and published via publication snapshot revision increment.
2. **Helios Live Cloud Deployment:** Helios is truth-disclosed as "in development with runnable Docker Compose local environment". Cloud deployment links will remain omitted until live hosting is active.
3. **Milestone A3 Handoff:** Authentication and account features were strictly not implemented, leaving a clean foundation for subsequent milestone ownership.
