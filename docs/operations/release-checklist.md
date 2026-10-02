# YOR WORLD Production Release Candidate Checklist

**Release Candidate ID:** `v1.0.0-rc1` (Gate G6 Staging Release Candidate)  
**Governance Standard:** Account Operating Model & Governance Pipeline (§2)  
**Responsible Makers:** Gemini #1 (Platform), Gemini #2 (World / Art), Gemini #3 (Runtime / Integration)  
**Auditor Lane:** GPT Plus #2 (Independent Auditor)  
**Acceptance Authority:** Parent Codex (GPT Plus #1)  
**Gate Invariant:** STOP AT G6 HANDOFF. Gate G7 is LOCKED until owner human approval.

---

## 1. Pre-Flight Repository Integrity
- [x] **Repository HEAD Bound:** Exact git commit SHA verified and recorded.
- [x] **No Dirty Working Tree Alterations:** Accepted milestone roots (`deliveries/A1`–`A6`, `deliveries/B1`–`B5`, `deliveries/C1`) remain bit-for-bit immutable.
- [x] **Dependency Tree Frozen:** `pnpm-lock.yaml` hash matched across all execution environments.
- [x] **Zero Localhost Leaks:** Release manifest and runtime configurations contain zero references to `localhost`, `127.0.0.1`, or placeholder staging strings.

---

## 2. World & 3D Art Freeze (Track B / Gemini #2)
- [x] **Asset Inventory Freeze:** 13 registered runtime assets audited with SHA-256 digests (`deliveries/G6/gemini-2-world/release-asset-inventory.json`).
- [x] **glTF Validation:** 0 errors, 0 warnings across all production GLB files using Khronos glTF-Validator 2.0.0-dev.3.10.
- [x] **Mobile Geometry Budget:** Combined scene geometry (15,112 triangles) is well within the 140,000 ceiling (>89% margin).
- [x] **Mobile VRAM Budget:** Combined scene textures and buffers (34.34 MB) remain well under the 90 MB ceiling (>61% margin).
- [x] **Camera Presets Verified:** `entry`, `home-desktop`, `home-mobile`, `monitor`, and `reverse-doorway` visually verified and locked.

---

## 3. Platform, Auth & Operations Baseline (Track A / Gemini #1)
- [x] **Database Schema Migration:** `supabase/migrations/` schema baseline frozen at `20261002000000_schema_v1`.
- [x] **Row-Level Security (RLS):** 15 protected tables verified; zero public bypasses; authenticated owner access strictly governed by AAL2 TOTP.
- [x] **Contact Pipeline Invariants:**
  - Honest receipts: HTTP 503 on database failure, never false "received".
  - 24-hour idempotency deduplication with HTTP 409 on conflicting payloads.
  - Rate limits enforced: 3 per 10m (IP), 10 per 24h (email), 100 per 1h (global).
  - Transactional outbox worker retry schedule: 1m, 5m, 30m, 120m with dead-letter triage.
  - Zero raw PII in server telemetry or application logs.
- [x] **Operations & Restore Rehearsal:** Atomic transactional backup restore verified using PGlite; rollback upon error proven (`docs/operations/restore-record.md`).

---

## 4. Runtime, Accessibility & Adaptive Quality (Track C / Gemini #3)
- [x] **Adaptive Quality Policy:**
  - Automated tier selection: `chooseInitialTier(capabilities)` honors device memory, CPU concurrency, GPU limits, and saveData.
  - Strict non-negotiable static fallback when WebGL is unavailable.
  - Downgrades require 3 consecutive slow windows (>25ms / >33.3ms).
  - Upgrades require 20 seconds of stable headroom (<14ms) strictly at safe HOME state.
  - Explicit user preference is never overridden by automated scaling.
- [x] **Accessibility (WCAG 2.2 AA):**
  - Automated axe-core audit: 0 critical and 0 serious violations across all 8 public routes (`/`, `/about`, `/resume`, `/contact`, `/projects`, `/projects/*`).
  - Semantic headings (logical H1/H2 hierarchy) and landmark regions (`main`, `nav`).
  - Direct skip-to-content bypass link verified for keyboard users.
  - Interactive touch targets satisfy minimum 44×44 CSS px sizing.
  - Responsive reflow at 320 CSS px viewport width without horizontal scrolling.
  - Assistive technology disclosure: Every published project and contact destination accessible with zero WebGL/canvas dependencies.
- [x] **Audio Policy:**
  - Audio remains OFF by default.
  - `AudioController.setEnabled(true)` captures browser autoplay rejection and reports actual state (`false`).
  - Idempotent resource disposal via `AudioController.dispose()`.
- [x] **Reduced Motion Runtime:**
  - Removes camera travel duration (0ms) rather than merely slowing down.
  - Eliminates pointer parallax completely (0.0 factor).
  - Decorative animation pause toggle verified.
- [x] **Renderer Failure Recovery:**
  - WebGL context loss triggers accessible `WorldFallback` banner without trapping user.
  - Asset failure provides Retry and Continue with Portfolio actions.
  - Dialog interactivity preserved during renderer crash.

---

## 5. Release Candidate Validation & Packaging
- [x] **CI Configuration:** `.github/workflows/ci.yml` incorporates frozen install, lint, typecheck, unit, asset validation, build, e2e, a11y, and budget checks.
- [x] **Release Manifest Validator:** `scripts/release/validate-release.mjs` enforces commit, asset, publication, and schema bindings.
- [x] **Immutable Dossier:** `docs/releases/v1.0.0-rc1.md` created with complete P01–P14 requirement traceability.

---

## 6. Audit & Acceptance Handoff
- [x] **Candidate Dossier Assembled:** Both maker roots (`deliveries/C3/`, `deliveries/C4/`) packaged with cryptographic SHA-256 hashes.
- [x] **Maker Self-Approval Invariant:** Candidate marked `candidate` / `pending_audit`. Zero self-approval by Gemini #3.
- [ ] **Independent Audit:** Awaiting GPT Plus #2 verification.
- [ ] **Acceptance Ruling:** Awaiting Parent Codex (GPT Plus #1) Gate G6 sign-off.
- [ ] **Gate G7 Production Deployment:** GATED / LOCKED until formal owner authorization.
