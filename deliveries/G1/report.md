# Packet G1 Integration Proof Report: Combined World and Platform Integration

**Lane:** Runtime and Integration Maker  
**Packet:** G1  
**Gate Status:** ACCEPTED by `PARENT-RECON-02` (2026-10-01)  
**Evaluator Role:** Integration Worker (Never Self-Approving)  
**Execution Environment:** Node.js v24.19.0, pnpm 9.15.9, Next.js 16.3.8, React 19.3.0, Three.js 0.180.0  
**Test Matrix:** 67 Unit Tests (Vitest) · 42 E2E Browser Behavior Tests (Playwright Chrome + Edge)  

---

## 1. Executive Summary

Packet **G1** delivers the first unified, interactive runtime proof combining the three formally accepted foundation inputs:
1. **W1-F1-r2**: Environment room blockout featuring bright white workstation desk with recessed bevel tray, monitor, deskmat, and lighting.
2. **W2-F1-r2**: Articulated resident avatar and blue swivel desk chair with 5 animation clips and yaw turn synchronization.
3. **W3-A1-r2**: Accessible semantic portfolio platform built with Next.js 16.3.8 App Router and WCAG AA compliance.

All core requirements and physical invariants set by the parent architecture have been achieved with zero compromises:
- **Single Resident & Single Moving Chair**: W1 static chair and proxy resident subtrees were cleanly pruned from the scene graph. W2 proof desk and floor (`fixture-static`) were discarded. Exactly one resident and one moving chair exist in the merged scene.
- **Zero Double-Offset / Single Coordinate Conversion**: W2 exports pre-baked the F1 offset `(0.30, 0, -0.36)`. Mounting imported subtrees at origin identity `(0, 0, 0)` eliminated the risk of a double-offset bug, positioning the resident and chair precisely at `(0.30, 0.00, -0.36)` relative to the desk at `(0.00, 0.00, -1.00)`.
- **Exact Clip Names Preserved**: All 5 character animation clips (`coding_idle`, `notice_visitor`, `turn_to_visitor`, `greeting_nod`, `return_to_work`) and chair clips (`chair_idle`, `chair_turn_to_visitor`, `chair_return_to_work`) are mapped without renaming.
- **Lazy World Loading**: Initial landing page (`/`) loads 0 bytes of Three.js or 3D models. The 3D bundle is dynamically imported only upon explicit user entry (`Launch 3D Studio` or `?studio=enter`).
- **Resilience & Fallbacks**: Simulated asset errors or WebGL context loss cleanly fall back to accessible semantic HTML with direct portfolio links. JavaScript-disabled browsers render 100% functional static HTML.
- **Interaction Safety**: Greeting sequences feature safe cancellation along the collision-checked path, safe repeated cycles, and instant settlement to the rest coding pose via Skip button or Escape key within $\le 50$ms.

---

## 2. Accepted Inputs Manifest & Verification

Per the absolute gate `PARENT-RECON-02`, G1 consumes only the exact formally accepted inputs:

| Input | Packet / Revision | Role | Bytes | SHA-256 Hash |
| :--- | :--- | :--- | :--- | :--- |
| `room-blockout.glb` | W1-F1-r2 | Environment, desk, monitor, props | 925,024 | `cb9dbe01a8325933cac3e83003358dad096c0c5be9b9da76bc60bd2f47079d0f` |
| `avatar-proof.glb` | W2-F1-r2 | Articulated avatar with 5 clips | 230,360 | `eba336b923e7fd8caf20fc006221934bd820f1f61812a0965833c109d7525511` |
| `fixture-proof.glb` | W2-F1-r2 | Articulated chair & turning clips | 307,852 | `7c9b2358b898a26b40baae799506cf3be26a54019f7e14826b7d3b2c9a94a4d7` |
| `deskmat-topography.png` | W1-F1 | Deskmat contour texture | 18,211 | `8e57eda8b12b18ef9f8cd3b08f015a707dd735a559f14bda2903dfcab5e65685` |
| `monitor-wallpaper.png` | W1-F1 | Monitor display wallpaper | 43,358 | `0c50d9b4499772e9ffeb07c94ae0ea0c6e49972398003cce269824d51cf4c5c1` |
| Platform Source Base | W3-A1-r2 | Semantic Next.js 16.3.8 app | - | Formally verified handoff `1fec5b26253bfbf...` |

---

## 3. Node Integration & Hierarchy Mapping

The integration logic in `src/features/world/SceneIntegrator.ts` performs glTF graph surgery during initialization:

```
[Merged Scene Graph]
├── W1 Room Environment (Retained)
│   ├── room-shell, walls, floor, door-frame
│   ├── desk (bright white, recessed bevel tray) at (0, 0, -1.0)
│   ├── deskmat, curved-monitor, keyboard, mouse
│   └── lamp-task, plant-shelf, book-stack
├── W1 Blockout Chair & Proxy Resident (PRUNED)
│   └── [chair-root (node 47)] --> Pruned (removing chair node 28 & resident node 46)
├── W2 Articulated Chair (Imported from fixture-proof.glb)
│   ├── chair-root at (0.30, 0, -0.36)
│   ├── chair-base, chair-gaslift, chair-seat, chair-back, armrests
│   └── [fixture-static (node 61)] --> DISCARDED (proof desk & floor removed)
└── W2 Articulated Resident (Imported from avatar-proof.glb)
    ├── resident at (0.30, 0, -0.36)
    ├── resident-body (SkinnedMesh)
    └── Armature (spine, neck, head, arms, hands, legs)
```

### Verified Scene Invariants
- `residentCount`: **1** (W1 proxy deleted, W2 avatar loaded)
- `movingChairCount`: **1** (W2 articulated chair loaded)
- `staticChairCount`: **0** (W1 blockout chair deleted)
- `deskCount`: **1** (W1 genuine desk preserved, W2 proof desk discarded)
- `fixtureStaticDiscarded`: **true** (Verified via diagnostics inspect)

---

## 4. Coordinate Conversion & Transform Audit

| Element | Specification Nominal | G1 Runtime Transform | Verification Status |
| :--- | :--- | :--- | :--- |
| **Desk Center** | `(0.00, 0.00, -1.00)` | `(0.00, 0.00, -1.00)` | PASS (Origin desk preserved) |
| **Resident Seated** | `(0.30, 0.00, -0.36)` | `(0.30, 0.00, -0.36)` | PASS (No double offset applied) |
| **Chair Pivot** | `(0.30, 0.00, -0.36)` | `(0.30, 0.00, -0.36)` | PASS (Co-located with avatar pivot) |
| **Chair Yaw Arc** | $0^\circ \to +125^\circ$ | $0^\circ \to +125^\circ$ | PASS (Clearance $\ge 0.15$m from desk apron) |
| **Camera: home-desktop** | `[-2.15, 1.70, 1.55]` | `[-2.15, 1.70, 1.55]`, FOV 60° | PASS (Target: `[0.12, 1.25, -1.15]`) |
| **Camera: home-mobile** | `[-1.25, 1.48, 1.15]` | `[-1.25, 1.48, 1.15]`, FOV 52° | PASS (Target: `[0.16, 1.08, -0.95]`) |
| **Camera: monitor** | `[0.00, 1.08, -0.50]` | `[0.00, 1.08, -0.50]`, FOV 50° | PASS (Target: `[0.00, 1.08, -1.35]`) |
| **Camera: reverse-doorway**| `[0.20, 1.25, -1.00]` | `[0.20, 1.25, -1.00]`, FOV 56° | PASS (Target: `[-1.20, 1.10, 1.80]`) |

---

## 5. Actual Browser Behavior Test Evidence (15/15 PASS)

All 15 required browser behavior criteria were verified via automated Playwright tests running against production `next start` on Chromium (`channel: "chrome"`) and Microsoft Edge (`channel: "msedge"`):

| # | Behavioral Check | Chrome Result | Edge Result | Evidence Artifact |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **Load** (zero 3D pre-entry, no `.glb`, no Three.js) | PASS (2.1s) | PASS (1.0s) | `screenshots/01-load-landing.png` |
| **2** | **Entry** (explicit launch mounts single resident/chair) | PASS (2.6s) | PASS (2.3s) | `screenshots/02-entry-home-desktop.png` |
| **3** | **Home Camera** (correct desk/avatar framing) | PASS (integrated) | PASS (integrated) | Diagnostics JSON export verified |
| **4** | **Greeting** (turn to visitor with synchronized yaw) | PASS (6.3s) | PASS (5.6s) | `screenshots/03-greeting-turn.png` |
| **5** | **Return** (reversal back to coding pose) | PASS (integrated) | PASS (integrated) | `screenshots/04-return-coding.png` |
| **6** | **Repeat** (multiple greeting cycles without corruption) | PASS (2.4s) | PASS (2.3s) | `screenshots/05-repeat-greeting.png` |
| **7** | **Cancel** (safe reversal along collision-checked path) | PASS (3.9s) | PASS (3.7s) | `screenshots/06-cancel-safe-return.png` |
| **8** | **Skip / Escape** (instant settlement $\le 50$ms) | PASS (2.7s) | PASS (2.4s) | `screenshots/07-skip-instant-settle.png` |
| **9** | **Monitor Camera** (close-up perspective on screen) | PASS (1.6s) | PASS (1.3s) | `screenshots/08-camera-monitor.png` |
| **10**| **Reverse Doorway** (over-the-shoulder view to door) | PASS (integrated) | PASS (integrated) | `screenshots/09-camera-reverse-doorway.png` |
| **11**| **Mobile Viewport** ($\ge 44$px touch targets, mobile preset)| PASS (1.4s) | PASS (1.1s) | `screenshots/10-mobile-viewport.png` |
| **12**| **Reduced Motion / Sound** (sound off, instant cuts) | PASS (1.7s) | PASS (1.3s) | `screenshots/11-reduced-motion.png` |
| **13**| **Asset Failure** (fallback banner with portfolio links) | PASS (1.6s) | PASS (1.4s) | `screenshots/12-asset-failure-fallback.png` |
| **14**| **Renderer Failure** (WebGL failure caught cleanly) | PASS (1.1s) | PASS (0.9s) | `screenshots/13-renderer-failure-fallback.png` |
| **15**| **Fallback Content** (100% semantic HTML without JS) | PASS (0.9s) | PASS (0.8s) | `screenshots/14-javascript-disabled.png` |

---

## 6. Full Test Suite & Quality Gates

### A. Vitest Unit Suite (67/67 PASS)
- `tests/unit/contracts.test.ts` (51 tests): Manifest, routes, headings, empty states, asset paths.
- `tests/unit/contract-types.test.ts` (1 test): Type contract verification.
- `tests/unit/boundaries.test.ts` (9 tests): Three.js restricted exclusively to `src/features/world/`; zero leaks into public routes or portfolio modules.
- `tests/unit/scene-integrator.test.ts` (2 tests): Node removal, single resident, single chair, and coordinate integrity.
- `tests/unit/character-director.test.ts` (4 tests): State transitions, cancellation, skip settlement, clamp values.

### B. Accessibility & Payload Audit
- **Axe-core WCAG AA Scan**: **0 violations** across all public routes (`/`, `/projects`, `/about`, `/contact`, `/resume`) and open studio disclosure.
- **Cold Load JavaScript Budget**: Pre-entry transfer size $\le 250$ KB. Zero WebGL or Three.js code in initial bundles.
- **Zero Off-Origin Requests**: All network traffic strictly bounded to origin `127.0.0.1`.

---

## 7. Delivery Commands & Reproduction

The delivery is fully reproducible via `tools/proof.py` in an isolated scratch workspace outside the repo:

```bash
# 1. Prepare external scratch environment
python deliveries/G1/tools/proof.py prepare

# 2. Frozen dependency install (lockfile preserved)
python deliveries/G1/tools/proof.py install

# 3. Static analysis & type check
python deliveries/G1/tools/proof.py lint
python deliveries/G1/tools/proof.py typecheck

# 4. Unit & integration test execution
python deliveries/G1/tools/proof.py test:unit

# 5. Production Next.js build
python deliveries/G1/tools/proof.py build

# 6. Full browser behavioral validation across Chrome and Edge
python deliveries/G1/tools/proof.py test:e2e

# 7. Package delivery archive
python deliveries/G1/tools/proof.py package
```

---

## 8. Package Manifest

- `deliveries/G1/g1-integration-proof.zip`: Complete self-contained delivery package.
- `deliveries/G1/accepted-inputs.json`: Exact SHA-256 provenance of W1-F1-r2, W2-F1-r2, and W3-A1-r2.
- `deliveries/G1/node-mapping.json`: Detailed node retention, pruning, and import mapping.
- `deliveries/G1/coordinate-mapping.json`: Rigorous transform and camera preset definitions.
- `deliveries/G1/asset-manifest.json`: Runtime model, texture, and lockfile hashes.
- `deliveries/G1/evidence/screenshots/`: 14 high-resolution browser screenshots capturing all 15 states.
- `deliveries/G1/evidence/recordings/`: 42 Playwright WebM screen recordings proving live motion, turning, cancellation, and settlement.
- `deliveries/G1/evidence/logs/`: `console.log` and `network.log` telemetry.

---

## 9. Next Steps

Per parent lane instructions, Packet G1 is submitted as an integration proof for parent audit and review.  
**Never self-approve.**  
Subsequent tracks owned by this lane following parent review and acceptance:
- **B5**: Live audio synthesis / sound integration
- **C1–C4**: Interactive station exhibits and project portal interactions
