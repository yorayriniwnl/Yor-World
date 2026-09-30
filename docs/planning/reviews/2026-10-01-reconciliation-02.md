# W1/W2/W3 Second Reconciliation and G1 Authorization — 2026-10-01

**Authority:** Parent Codex (Coordinator, Architect, and Sole Technical Gate Authority)  
**Date:** 2026-10-01  
**Scope:** Feasibility Proof Acceptance Gate (`PARENT-RECON-02`) and G1 Integration Authorization  

**RULING:**  
* **W1: ACCEPTED (`W1-F1-r2`)**  
* **W2: ACCEPTED (`W2-F1-r2`)**  
* **W3: ACCEPTED (`W3-A1-r2`)**  
* **G1: UNLOCKED AND AUTHORIZED**

---

## 1. Executive Summary & Gate Decision

In the initial reconciliation ([`docs/planning/reviews/2026-10-01-reconciliation.md`](2026-10-01-reconciliation.md)), G1 integration was locked pending:
1. Native geometry and clearance corrections for W1 (`W1-CORR-01`).
2. Completion and archival of assigned Claude reviews for W2 (`W2-REV-01`, `W2-REV-13`).
3. Security patch updates, preload budget calculations, AST boundary guards, and runner exit propagation for W3 (`W3-CORR-01`), alongside Claude reviews (`W3-REV-02`).

Following the delivery and archival of:
- `W1-F1-r2` in commit `ee57da8ee6d0013f523b6eeb88aec0bd023e6135`
- Independent Claude reviews for `CLAUDE-01`, `CLAUDE-02`, `CLAUDE-05`, and `CLAUDE-13` in commit `85c977c832845199747518c6e1a7d675aa24da21`
- `W3-A1-r2` in commit `20950570882e389531e21b79f848f060762a1ea8`

Parent Codex has conducted `PARENT-RECON-02`. All blocking defects are verified closed, all three feasibility deliverables satisfy their contract requirements, and **G1 combined integration is formally unlocked and authorized**.

---

## 2. Packet Adjudication & Evidence Review

### 2.1 W1 Adjudication: `W1-F1-r2` — ACCEPTED
* **Delivery Root:** `deliveries/W1/revisions/W1-F1-r2/`
* **Defect Closures Verified:**
  * **W1-01 (P1, Double-Offset Fixed):** Native Blender and glTF world coordinates audited across all 232 nodes. Agreement is 100% (max deviation < 0.0001m). Door leaf closed center is verified at `(-1.2000, 1.0500, 1.8000)` with hinge anchor at `(-1.6500, 0.0000, 1.8000)`. All nested props (headset, controllers, microphone, plants) reside in their correct room/desk bounds.
  * **W1-02 (P1, Geometry-Derived Clearance):** Sampled door sweep evaluated at 5° increments shows minimum wall clearance of 0.450m and desk clearance of 1.670m. Armrest vertical gap derived from bounds is 35mm (under 0.700m desk underside). Automated fault injection test suite (`evidence/fault-injection.json`) confirmed that 3 deliberate colliding mutations were correctly detected and rejected.
  * **W1-03 (P1, Camera Framing & Anchors):** Renders in `renders/` confirm all 8 visual anchors captured in Home view. Mobile view provides 38% unobstructed lower touch area. Reverse doorway captures closed leaf and 90° open leaf.
  * **W1-04 (P2, Asset Register Reconciled):** Asset register matches scene blocks: 232 nodes, 204 meshes, 11,020 triangles, 50 materials, 6 cameras. Khronos `gltf-validator` 2.0.0-dev.3.10 confirms **0 errors, 0 warnings** on `room-blockout.glb` (925,024 bytes).
* **Verdict:** **ACCEPT** as room/environment foundation for G1.

### 2.2 W2 Adjudication: `W2-F1-r2` — ACCEPTED
* **Delivery Root:** `deliveries/W2/`
* **Review Findings Adjudication:**
  * Gemini-3 motion review confirmed 30 FPS, common rest pose, and clean execution of 5 clips (`coding_idle`, `notice_visitor`, `turn_to_visitor`, `greeting_nod`, `return_to_work`).
  * Khronos `gltf-validator` confirmed **0 errors, 0 warnings** on both `avatar-proof.glb` and `fixture-proof.glb`.
  * Claude-01 (`reviews/claude-01/review.md`) and Claude-13 (`reviews/claude-13/review.md`) reviews confirmed asset integrity and identified key integration hazards, now adopted as mandatory G1 integration rules:
    1. **Identity Loading (C01-02, C13-04):** Both `avatar-proof.glb` and `fixture-proof.glb` carry authored F1 root offsets `(0.30, 0, -0.36)`. G1 loaders must mount both scenes strictly at identity `(0,0,0)` to avoid double-transformation.
    2. **Node Disambiguation (C01-03, C13-05):** W1's `resident` proxy tree and `chair` tree must be recursively deleted before mounting W2 assets.
    3. **Fixture Discard (C13-03):** Node `fixture-static` in `fixture-proof.glb` must be stripped to prevent duplicate desk and floor geometry.
    4. **Instant Settlement Navigation (C01-04):** Route navigation or user Skip/Escape must settle immediately to `coding_idle` within ≤50ms, bypassing the diagnostic 2.667s reverse-path playback.
* **Verdict:** **ACCEPT** as avatar and articulated chair foundation for G1.

### 2.3 W3 Adjudication: `W3-A1-r2` — ACCEPTED
* **Delivery Root:** `deliveries/W3/revisions/W3-A1-r2/`
* **Defect Closures Verified:**
  * **W3-01 / F1 (P2, Framework Security Pin):** Pinned to `next@16.3.8` and `eslint-config-next@16.3.8`, with a verified matching `pnpm-lock.yaml`.
  * **W3-03 / F2 (P2, Payload Accounting):** `payload.spec.ts` updated to capture all JS resources including link-initiated preloads. Recalculated JS total is 137,034 bytes (133.8 KiB), comfortably under the 250 KiB budget. Oversized preload fault injection proved budget failure detection.
  * **W3-04 / F3 (P2, AST Dynamic Import Guard):** `boundaries.test.ts` uses TypeScript AST parser to detect static, side-effect, export-from, and dynamic imports. Regression test cases verify failure on test-fixture leaks.
  * **W3-05 / F4 (P2, Proof Runner Error Propagation):** `tools/proof.py` aggregates subprocess exit codes and propagates failures.
  * **Execution Verification:** 60/60 unit tests pass, production Next.js build succeeds, and 18/18 Playwright E2E browser tests pass across Chrome and Edge. Lint check in `04-lint.log` succeeds with exit code 0.
* **Verdict:** **ACCEPT** as platform and semantic shell foundation for G1.

---

## 3. Formal Accepted Revision Table

All SHA-256 digests below are verified against repository git blobs and local delivery files:

| Track | Revision Identifier | Canonical File / Artifact | SHA-256 Digest | Parent Decision |
| :--- | :--- | :--- | :--- | :--- |
| **W1** | `W1-F1-r2` | `deliveries/W1/revisions/W1-F1-r2/room-blockout.glb`<br>`deliveries/W1/revisions/W1-F1-r2/asset-register.json`<br>`deliveries/W1/revisions/W1-F1-r2/build-blockout.py` | `cb9dbe01a8325933cac3e83003358dad096c0c5be9b9da76bc60bd2f47079d0f`<br>`7bd65522670510d64edee03dba803d957831f8793f5e3a52ca3a50105526ca93`<br>`c61474e2c46aafcab494116089f8b7b8ef1a5feb9dc3d6f4ed5a2a40693ca090` | **ACCEPT** |
| **W2** | `W2-F1-r2` | `deliveries/W2/avatar-proof.glb`<br>`deliveries/W2/fixture-proof.glb`<br>`deliveries/W2/asset-metadata.json`<br>`deliveries/W2/build-avatar-proof.py` | `eba336b923e7fd8caf20fc006221934bd820f1f61812a0965833c109d7525511`<br>`7c9b2358b898a26b40baae799506cf3be26a54019f7e14826b7d3b2c9a94a4d7`<br>`83c0e22cb579b166649b76532801c58f322a6189eaf79cf914b4dd13573ad888`<br>`13228064b326737142d13e95ec408628c52e26b4c72589f49efe506f412d8685` | **ACCEPT** |
| **W3** | `W3-A1-r2` | `deliveries/W3/revisions/W3-A1-r2/source/package.json`<br>`deliveries/W3/revisions/W3-A1-r2/source/pnpm-lock.yaml`<br>`deliveries/W3/revisions/W3-A1-r2/W3-A1-r2-handoff.zip` | `8cb1995f42b71550f688d983948ede67f68851fef1af3cbafe212ebaa00acf70`<br>`1d310d95e3f46bbdf6c3bcc6afe883e3419b4303d1cd2b89ac0d84ffae16a98e`<br>`1fec5b26253bfbf03a5e7ab4f9e278156dae71bb0824f796a86506bc6a460fa2` | **ACCEPT** |

---

## 4. G1 Integration Authorization

The G1 integration gate is **UNLOCKED**.

The assigned runtime and integration maker is authorized to execute packet G1 under the following binding requirements:

1. **Owned Output Root:** `deliveries/G1/` exclusively.
2. **Asset Integration Invariants:**
   - Mount W1 `room-blockout.glb` at identity.
   - Recursively remove W1 proxy node `resident` and all child nodes.
   - Recursively remove W1 static chair node `chair` and all child nodes.
   - Remove/dispose W1 locator `chair-root` before adding W2.
   - Mount W2 `avatar-proof.glb` at identity `(0,0,0)`. Keep `resident` and `resident-body` together.
   - Mount W2 `fixture-proof.glb` at identity `(0,0,0)`. Retain `chair-root` and `chair-base`; discard `fixture-static`.
   - Result must contain **exactly one resident** and **exactly one articulated chair**.
3. **Runtime Invariants:**
   - Coordinate conversion performed once.
   - Exact clip names preserved: `coding_idle`, `notice_visitor`, `turn_to_visitor`, `greeting_nod`, `return_to_work`.
   - Zero world 3D loading until explicit user entry.
   - Sound off by default.
   - Reduced-motion path avoids cinematic camera sweeps.
   - Graceful fallback: WebGL/asset failure leaves accessible, useful semantic HTML.
   - Immediate settlement on navigation or Skip/Escape (≤50ms).
4. **Verification & Delivery:**
   - Complete reproducible source, pinned lockfile, test suites, browser execution evidence, console/network logs, screenshots, and delivery report.
