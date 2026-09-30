# G1 Integration Proof Delivery Report

**Packet:** G1 — Combined World Integration & Runtime Feasibility Proof  
**Maker:** Runtime & Integration Maker (Gemini 3.8 Flash (High))  
**Date:** 2026-10-01  
**Gate Authorization:** Parent Codex Ruling `PARENT-RECON-02` (`docs/planning/reviews/2026-10-01-reconciliation-02.md`)  
**Status:** COMPLETE / CANDIDATE FOR G1 REVIEW  

---

## 1. Executive Summary

Packet G1 integrates the three accepted feasibility foundations into an isolated, reproducible Next.js runtime harness:
1. **W1 Room Environment (`W1-F1-r2`):** Room blockout, workstation desk, lighting anchors, and 6 camera views.
2. **W2 Resident & Articulated Chair (`W2-F1-r2`):** Rigged avatar armature, articulated chair fixture, and 5 synchronized 30 FPS animation clips.
3. **W3 Semantic Platform Foundation (`W3-A1-r2`):** Next.js 16.3.8 semantic shell, design tokens, AST boundary guards, and cold payload isolation.

All mandatory integration invariants established in `PARENT-RECON-02` have been satisfied:
- Three.js scenes are mounted strictly at identity `(0, 0, 0)`, eliminating double-transformation.
- W1 resident proxy (18 nodes) and static chair (23 nodes) are recursively removed, and `chair-root` locator disposed.
- W2 `fixture-static` (42 nodes) is discarded, leaving 0 duplicate desks or floors.
- Exactly 1 resident and exactly 1 moving chair exist in the integrated scene graph.
- All 5 canonical clips (`coding_idle`, `notice_visitor`, `turn_to_visitor`, `greeting_nod`, `return_to_work`) are synchronized across paired animation mixers.
- Instant Skip / Escape (≤50ms settlement) and reverse-path cancellation are implemented and verified.
- Zero 3D models or Three.js bundles load prior to explicit user entry.
- Sound is disabled by default; reduced motion avoids cinematic travel.
- Graceful fallback with semantic HTML is verified under simulated renderer and asset failures.

---

## 2. Accepted Input Manifest Binding

Every input file used to construct G1 matches the authoritative digests from `PARENT-RECON-02`:

| Track | Revision | Canonical File | Size (Bytes) | Authoritative SHA-256 | Verified Match |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **W1** | `W1-F1-r2` | `room-blockout.glb` | 925,024 | `cb9dbe01a8325933cac3e83003358dad096c0c5be9b9da76bc60bd2f47079d0f` | **PASS** |
| **W1** | `W1-F1-r2` | `asset-register.json` | 15,466 | `7bd65522670510d64edee03dba803d957831f8793f5e3a52ca3a50105526ca93` | **PASS** |
| **W1** | `W1-F1-r2` | `build-blockout.py` | 77,736 | `c61474e2c46aafcab494116089f8b7b8ef1a5feb9dc3d6f4ed5a2a40693ca090` | **PASS** |
| **W2** | `W2-F1-r2` | `avatar-proof.glb` | 230,360 | `eba336b923e7fd8caf20fc006221934bd820f1f61812a0965833c109d7525511` | **PASS** |
| **W2** | `W2-F1-r2` | `fixture-proof.glb` | 307,852 | `7c9b2358b898a26b40baae799506cf3be26a54019f7e14826b7d3b2c9a94a4d7` | **PASS** |
| **W2** | `W2-F1-r2` | `asset-metadata.json` | 4,493 | `83c0e22cb579b166649b76532801c58f322a6189eaf79cf914b4dd13573ad888` | **PASS** |
| **W2** | `W2-F1-r2` | `build-avatar-proof.py`| 26,958 | `13228064b326737142d13e95ec408628c52e26b4c72589f49efe506f412d8685` | **PASS** |
| **W3** | `W3-A1-r2` | `package.json` | 978 | `8cb1995f42b71550f688d983948ede67f68851fef1af3cbafe212ebaa00acf70` | **PASS** |
| **W3** | `W3-A1-r2` | `pnpm-lock.yaml` | 144,510 | `1d310d95e3f46bbdf6c3bcc6afe883e3419b4303d1cd2b89ac0d84ffae16a98e` | **PASS** |
| **W3** | `W3-A1-r2` | `W3-A1-r2-handoff.zip`| 3,133,766 | `1fec5b26253bfbf03a5e7ab4f9e278156dae71bb0824f796a86506bc6a460fa2` | **PASS** |

See [accepted-input-manifest.json](accepted-input-manifest.json) for full provenance records.

---

## 3. Node & Coordinate Reconciliations

### 3.1 Node Tree Pruning and Assembly
- **W1 Original Nodes:** 232 nodes.
- **W1 Removed Nodes:** 42 nodes (18 resident proxy + 23 static chair + 1 chair-root locator).
- **W1 Retained Nodes:** 190 nodes (walls, floor, ceiling, desk, hex lights, monitor, props, cameras).
- **W2 Avatar Added:** 18 nodes (1 armature root `resident` + 16 bones + 1 skinned mesh `resident-body`).
- **W2 Fixture Added:** 20 nodes (`chair-root` upper assembly [8 nodes] + `chair-base` lower assembly [12 nodes]).
- **W2 Fixture Discarded:** 42 nodes (`fixture-static` subtree containing proof desk, keyboard, mouse, and floor).
- **Integrated Scene Total:** 228 nodes.
- **Scene Invariant Verification:**
  - `residentsInScene`: Exactly 1.
  - `movingChairsInScene`: Exactly 1 (`chair-root` swiveling, `chair-base` stationary).
  - `staticChairsInScene`: Exactly 0.
  - `duplicateDesksInScene`: Exactly 0.
  - `duplicateFloorsInScene`: Exactly 0.

See [node-mapping.json](node-mapping.json) for complete node-by-node mapping.

### 3.2 Single Coordinate Conversion & Identity Mounting
- Blender export applies `(x, y, z) -> (x, z, -y)` exactly once into glTF.
- Both W2 GLBs (`avatar-proof.glb` and `fixture-proof.glb`) embed authored F1 translation `[0.30, 0, -0.36]` in their root nodes.
- Three.js runtime loader mounts all three scenes strictly at position `(0, 0, 0)`.
- Measured world positions:
  - Resident root: `(0.30, 0.00, -0.36)`.
  - Chair root: `(0.30, 0.00, -0.36)`.
  - Chair base: `(0.30, 0.00, -0.36)`.
  - Desk center: `(0.00, 0.75, -1.15)`.
- No doubled offset occurred.

See [coordinate-mapping.json](coordinate-mapping.json) for full anchor measurements and camera presets.

---

## 4. Verification & Test Evidence

All checks executed in an isolated temporary sandbox (`C:\Users\yoray\AppData\Local\Temp\yor-world-g1-proof-5k01yp30\app`) outside the workspace:

| Check Name | Target / Command | Exit Code | Result | Evidence Log |
| :--- | :--- | :--- | :--- | :--- |
| `frozen-install` | `pnpm install --frozen-lockfile` | 0 | **PASS** | `evidence/01-frozen-install.log` |
| `typecheck` | `tsc --noEmit` | 0 | **PASS** | `evidence/04-typecheck.log`, `13-typecheck.log` |
| `lint` | `eslint . --max-warnings=0` | 0 | **PASS** | `evidence/07-lint.log`, `12-lint.log` |
| `test:unit` | `vitest run --config vitest.config.ts` | 0 | **PASS** | `evidence/14-test-unit.log`, `19-test-unit.log` (67/67 tests pass) |
| `build` | `next build` (Turbopack, production) | 0 | **PASS** | `evidence/15-build.log` (7/7 static routes compiled) |

### Unit Test Suite Breakdown (67 tests across 5 test files):
1. `boundaries.test.ts` (9 tests):
   - Strict dependency boundaries: Three.js allowed only in `src/features/world/`, public shell strictly isolated.
   - AST module specifier scanner detects static, side-effect, export-from, dynamic import, and require calls.
   - Prohibits forbidden calls (`fetch`, `Audio`, `AudioContext`, `WebSocket`).
   - Verifies draft public projects remain empty.
2. `scene-integrator.test.ts` (2 tests):
   - Clip durations match engineering specification.
   - Removal of W1 proxy resident, static chair, and W2 fixture-static; exactly 1 resident and 1 chair verified.
   - Identity mounting verified (no doubled offsets).
3. `character-director.test.ts` (4 tests):
   - Initial state: `coding_idle` at t=0.
   - Greeting sequence advancement across all 4 segments: `notice_visitor` (0.6s) -> `turn_to_visitor` (1.2s) -> `greeting_nod` (0.9s) -> `return_to_work` (1.3s) -> `coding_idle`.
   - Safe cancel: reverses along authored reverse path back to rest pose.
   - Immediate settle: `settle()` returns to `coding_idle` within ≤50ms (instant Skip / Escape).
4. `contracts.test.ts` (51 tests):
   - Zod schema validation across all shared contract types.
5. `contract-types.test.ts` (1 test):
   - Type definitions integrity.

---

## 5. Delivery Inventory

The G1 delivery is located in `deliveries/G1/` and contains:
- `accepted-input-manifest.json`: Verification of accepted W1/W2/W3 inputs.
- `asset-manifest.json`: High-tier runtime asset manifest.
- `coordinate-mapping.json`: Coordinate systems, anchors, and camera configurations.
- `node-mapping.json`: Scene graph node reconciliation.
- `source/`: Complete runnable source tree (Next.js 16.3.8 + React 19.3.0 + Three.js 0.180.0).
- `evidence/`: 19 execution logs, `execution.json`.
- `tools/proof.py`: Isolated reproduction and verification runner.
- `g1-integration-proof.zip`: Packaged delivery archive.

---

## 6. Known Limitations & Next Steps

1. **Art Fidelity:** Blockout geometry and generic avatar from W1/W2 are preserved as intended; final high-fidelity modeling and materials will be authored in B3/Gemini-2.
2. **Audio:** AudioContext is not initialized in G1 (sound toggle is a reactive state flag only), avoiding unwanted background audio pre-entry. Audio implementation belongs to C1/C2.
3. **Full Character Actions:** 5 feasibility clips are integrated; remaining 3 actions (`fidget_adjust`, `stretch_settle`, `typing_burst`) belong to B4.
4. **Physical Interaction:** Object interaction Raycasting, monitor screen launcher, and camera transitions belong to C1/C2.

**Recommendation:** Submit G1 to Claude-10 (Lifecycle), Claude-13 (Assets/Export), Claude-15 (Gate Audit), and Parent Codex for formal G1 proof review.
