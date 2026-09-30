# CLAUDE-13 — Asset Export and Provenance Review (W1 + W2)

**Reviewer Identity:** Independent Reviewer (Claude-13 Lane; executed via Gemini 3.8 Flash (High), High Effort/Depth)  
**Date:** 2026-10-01  
**Candidate Revisions:** W1-F1 (`deliveries/W1/`, generator SHA `99207efa...`, GLB `d47d10e0...`) + W2-F1-r2 (`deliveries/W2/`, ZIP SHA `74bdcfe5...`)  
**Baseline:** Product Spec §1/§3/§4/§7/§10, Art Spec §1–§6/§9, F1 Spatial Invariants, Validation Gate G1

---

## 1. Received and Inspected Inventory

| Asset / Evidence File | Provider / Source | Byte Size | Declared SHA-256 | Status |
| --- | --- | --- | --- | --- |
| `deliveries/W1/room-blockout.glb` | Gemini-1 / W1 | 925,628 | `d47d10e0b38e357041a4a69723944eec5981c85a4f8d41816a936fd5f9610c88` | INSPECTED |
| `deliveries/W1/blockout.blend` | Gemini-1 / W1 | 283,089 | `97800c25a7226db2c2196191b29a2889aeafc3ca3082a5d2093e78f654b17ba9` | INSPECTED |
| `deliveries/W1/build-blockout.py` | Gemini-1 / W1 | 65,013 | `99207efa9d86663c21df99dedae3b2be8d94f34e420a1784feb376a9c17758ad` | INSPECTED |
| `deliveries/W1/asset-register.json` | Gemini-1 / W1 | 12,691 | `b537c357732a392823a07b71f92e008d387f3ca6992d9bc99c42502f06b9dc31` | INSPECTED |
| `deliveries/W2/avatar-proof.glb` | GPT-2 / W2 | 230,360 | `eba336b923e7fd8caf20fc006221934bd820f1f61812a0965833c109d7525511` | INSPECTED |
| `deliveries/W2/fixture-proof.glb` | GPT-2 / W2 | 307,852 | `7c9b2358b898a26b40baae799506cf3be26a54019f7e14826b7d3b2c9a94a4d7` | INSPECTED |
| `deliveries/W2/avatar-proof.blend` | GPT-2 / W2 | 459,097 | `72f791644f488a7e15dfdcd7ed3c951abead9873223daf0ea9fdf176a2322360` | INSPECTED |
| `deliveries/W2/build-avatar-proof.py` | GPT-2 / W2 | 26,958 | `13228064b326737142d13e95ec408628c52e26b4c72589f49efe506f412d8685` | INSPECTED |
| `deliveries/W2/asset-metadata.json` | GPT-2 / W2 | 4,493 | `83c0e22cb579b166649b76532801c58f322a6189eaf79cf914b4dd13573ad888` | INSPECTED |
| `deliveries/W2/integration-handoff.md` | GPT-2 / W2 | 5,836 | `f1b7f4e0888a9de84b459c19c45b21760307a7479ec7f1c59760f481300854bd` | INSPECTED |
| `deliveries/W2/evidence/r2/export-hierarchy.txt` | GPT-2 / W2 | 3,923 | `295700ae6db11b66169b2843bb7dea7d291314cd911f0db98238b4e4f2df9210` | INSPECTED |
| `deliveries/W2/w2-avatar-proof-r2.zip` | GPT-2 / W2 | 7,123,893 | `74bdcfe5b8402be0753afb7d05715172a053c208fe95d2e31c0da0c1598ef6c2` | INSPECTED |
| `references/manifest.json` | Project Reference | 3,115 | `8bc995f6176378e907a41f6ca19808383fa1497223b204683a54d3da13f9c629` | INSPECTED |
| `docs/planning/reviews/2026-10-01-reconciliation.md` | Parent Codex | 26,794 | `b85ee42845625fffc3df65d1d6159670d9a7bb296db40f1712a2082260ff09f4` | INSPECTED |

### Missing Inventory
- Corrected W1 delivery (`deliveries/W1/revisions/W1-F1-r2/` is pending execution of W1-CORR-01).

---

## 2. Evidence Ledger

| Asset Check | Evidence Class | Result | Evidence Citation | Notes / Limitations |
| --- | --- | --- | --- | --- |
| W1 Procedural Origin & Clean Room | SOURCE | PASS | `build-blockout.py`, `asset-register.json:8–16` | Clean-room procedural Python; reference rights unknown; 0 external meshes |
| W1 GLTF Syntax & Schema Validation | MAKER / PARENT | PASS | Parent Khronos validation receipt | 0 errors, 0 warnings across 232 nodes, 49 materials, 11,020 tris |
| W1 Nested Transform Defect | SOURCE / PARENT | FAIL (P1) | `build-blockout.py:228–276`, Parent Report §46 | Door leaf at `(-2.85, 1.05, 3.60)`; headset, controller, mic displaced |
| W1 Clearance Derivation | SOURCE / PARENT | FAIL (P1) | `build-blockout.py:846–870`, Parent Report §47 | Hardcoded constants emitted; not derived from evaluated geometry |
| W1 Framing & Anchor Proof | SOURCE / PARENT | FAIL (P1) | `renders/camera-home.png`, Parent Report §48 | Upper hex lights cropped; pegboard props missing due to transform bug |
| W1 Node Collision on `resident` | SOURCE | WARNING (P1) | `asset-register.json:89`, `export-hierarchy.txt:2` | W1 proxy root named `resident`; collides with W2 armature root |
| W1 Removable Chair Subtree | SOURCE | PASS (Contract) | `asset-register.json:108–122` | Documents 13 removable nodes under `chair` |
| W2 Procedural Origin & Provenance | SOURCE | PASS | `build-avatar-proof.py`, `asset-metadata.json:78` | Procedural Python script; no external mesh, texture, or audio |
| W2 MIT Vendor License Receipt | SOURCE | PASS | `playback/vendor/THREE-LICENSE.txt` | Standard Three.js r180 MIT license included |
| W2 GLTF Validator Receipts | MAKER / PARENT | PASS | `avatar-proof.glb.validator.json`, Parent Report §55 | 0 errors, 0 warnings for both `avatar-proof.glb` and `fixture-proof.glb` |
| W2 ZIP Archive Verification | PARENT AUDIT | PASS | `2026-10-01-reconciliation.md:38` | Original ZIP verifies 125/125 declared manifest members |
| W2 Checkout Timestamp Variance | PARENT AUDIT | PASS (Disclosed) | `2026-10-01-reconciliation.md:38` | 3 checkout JSON files have updated timestamps (09:44 vs 10:15 UTC); bytes match ZIP |
| W2 Fixture Static Discard Contract | SOURCE | PASS (Contract) | `integration-handoff.md:13,209` | Mandates discarding `fixture-static` (desk, keys, floor) to prevent duplication |
| W2 Double Transform Hazard | SOURCE | WARNING (P1) | `export-hierarchy.txt:2,21,33` | Nodes carry `[0.30, 0, -0.36]`. Scenes must load at identity `(0,0,0)` |
| W2 Skinning Root Sibling Structure | SOURCE | PASS (Structure) | `export-hierarchy.txt:19`, `integration-handoff.md:10` | `resident-body` skin root is at `(0,0,0)`; must not be translated separately |
| W2 Animation Clip Hierarchy | MAKER / INDEPENDENT | PASS | `summary.json`, Parent Report §55 | 5 clips: `coding_idle` (6.0s), `notice` (0.6s), `turn` (1.2s), `nod` (0.9s), `return` (1.3s) |

---

## 3. Findings

### C13-01 (P1 — Gate-Blocking): W1 Nested Placement Applied World Coordinates Twice (W1-01)
- **Class:** SOURCE / PARENT INSPECTION
- **File / Symbol:** `deliveries/W1/build-blockout.py:228–276, 322–335, 537–544`
- **Expected:** Door leaf and nested props must sit at their intended room coordinates. Door leaf closed center must be near `(-1.20, 1.05, 1.80)`.
- **Observed:** In `build-blockout.py`, helper primitives assign world coordinates, then parent the object to a node that already has a world translation. `door_leaf` is parented to `door-hinge` at `(-1.65, 0, 1.80)`, shifting `door_leaf` to `(-2.85, 1.05, 3.60)` in exported runtime space. Similarly:
  - `gaming_headset` is at `(3.06, 3.64, -3.45)` (outside the room).
  - `pegboard_controller_1` is at `(2.52, 3.53, -2.40)` (outside the room).
  - `talks-microphone` is at `(-1.23, 1.72, -2.27)` (outside the intended desk mount).
- **Correction Criterion:** In W1-CORR-01, adjust local parenting translations so that evaluated world positions match F1 specifications, and assert world transform bounds before and after export.

### C13-02 (P1 — Gate-Blocking): W1 Clearance Check Emitter Uses Hardcoded Constants (W1-02)
- **Class:** SOURCE / PARENT INSPECTION
- **File / Symbol:** `deliveries/W1/build-blockout.py:846–870`
- **Expected:** Clearance verification must evaluate actual geometry meshes (bounding boxes, collision sweeps) to prove door opening clearance, desk underside gap, and chair rotation clearance.
- **Observed:** `evaluate_clearance_and_collisions()` sets `turn_pass=True`, hardcodes `0.45` and `0.90` constants, and emits static pass strings without measuring mesh coordinates. Furthermore, the claimed 50 mm desk-to-armrest clearance used the armrest center instead of its upper surface bounding box (actual gap is ~35 mm).
- **Correction Criterion:** Implement documented, sampled sweep collision tests against actual vertex bounding boxes; include a deliberate failing collision test in a scratch verification script to prove the test detects collisions.

### C13-03 (P1 — Gate-Blocking): Potential Duplicate Furniture via W2 `fixture-static`
- **Class:** SOURCE
- **File / Symbol:** `deliveries/W2/evidence/r2/export-hierarchy.txt:41–50`, `deliveries/W2/integration-handoff.md:13,209`
- **Expected:** Furniture components must exist in exactly one delivery to prevent z-fighting and double geometry in G1.
- **Observed:** W2's `fixture-proof.glb` includes Node 61 `fixture-static`, containing an entire independent desk, pedestals, keyboard keys, and floor slab used for proof clearance testing.
- **Impact:** If an integrator imports `fixture-proof.glb` without stripping `fixture-static`, two overlapping desks and keyboards will be rendered.
- **Correction Criterion:** The G1 integration specification must explicitly discard node `fixture-static` from `fixture-proof.glb`, retaining only `chair-root` and `chair-base`.

### C13-04 (P1 — Gate-Blocking): Asset Scene Transform Doubling Risk (W2)
- **Class:** SOURCE
- **File / Symbol:** `deliveries/W2/evidence/r2/export-hierarchy.txt:2,21,33`, `deliveries/W2/asset-metadata.json:85`
- **Expected:** Scene loaders must know whether models are authored around origin `(0,0,0)` or pre-placed in world space.
- **Observed:** In `avatar-proof.glb`, `resident` translation is `[0.30, 0, -0.36]`. In `fixture-proof.glb`, `chair-root` is `[0.30, 0, -0.36]` and `chair-base` is `[0.30, 0, -0.36]`.
- **Impact:** If an integrator mounts the glTF scene inside an F1 container placed at `(0.30, 0, -0.36)`, the translation will be doubled to `(0.60, 0, -0.72)`.
- **Correction Criterion:** Integrators must load both GLB files at root identity `(0,0,0)` with zero parent offset.

### C13-05 (P1 — Gate-Blocking): Root Node Name Collision Between W1 and W2
- **Class:** SOURCE
- **File / Symbol:** `deliveries/W1/asset-register.json:89` vs `deliveries/W2/evidence/r2/export-hierarchy.txt:2`
- **Expected:** Separate assets merged into one scene graph must not share non-unique root node names.
- **Observed:** W1 exports a seated proxy root named `resident`. W2 exports its armature root also named `resident`.
- **Correction Criterion:** Integrator must recursively remove W1's `resident` proxy tree before attaching W2's `resident` armature.

---

## 4. Local Retest Requests

1. **W1 World Transform Verification:** Execute a script in Blender on the corrected `blockout.blend` reading `obj.matrix_world.translation` for `door_leaf`, `gaming_headset`, `pegboard_controller_1`, and `talks-microphone`, asserting that `door_leaf` X/Y/Z is within 0.05m of `(-1.20, 1.05, 1.80)` and headset/controller sit within the room envelope (`|X| < 2.1m`, `|Z| < 1.8m`).
2. **W1 Evaluated Clearance Test:** Run an automated sweep check rotating `door_leaf` from 0° to 90° and chair proxy from 0° to 125°, asserting minimum clearance to adjacent walls/pedestals is > 0.02m.
3. **W2 Identity Loading Check:** In Three.js / Playwright, load `avatar-proof.glb` and `fixture-proof.glb` into a blank scene at identity `(0,0,0)`, sample bone `body-turn` and node `chair-root`, and assert their world position is `(0.30, 0, -0.36)`.
4. **W1 Chair/Proxy Removal Check:** In Three.js, load W1 `room-blockout.glb`, execute removal of `removableProxyNodeNames` and `removableChairNodeNames`, mount W2, and verify 0 residual duplicate nodes.

---

## 5. Recommendation

**Recommendation:**  
- **W1: REWORK** (Blocked by W1-01 nested placement, W1-02 unverified clearances, and W1-03 camera framing).
- **W2: ACCEPT AS FEASIBILITY PROOF** (Asset geometry, rig, clips, and Khronos validation are sound; integration hazards C13-03, C13-04, and C13-05 are adapter requirements for G1).
- **G1 Gate Status: REMAINS LOCKED** until W1-CORR-01 is accepted and combined integration contracts are resolved.
