# W1-F1-r2 Delivery Report — Native Geometry and Proof Evidence

**Delivery Identifier:** `W1-F1-r2`  
**Maker:** Gemini-1 (Model: Gemini 3.8 Flash (High))  
**Assigned Work Order:** `W1-CORR-01` (from [2026-10-01-next-packets.md](../../../../docs/planning/reconciliation-packets/2026-10-01-next-packets.md))  
**Parent Ruling Addressed:** [2026-10-01-reconciliation.md](../../../../docs/planning/reviews/2026-10-01-reconciliation.md) (W1 REWORK findings W1-01, W1-02, W1-03, W1-04)  
**Parent Authority:** Parent Codex (Coordinator and Sole Gate Authority)  
**Assigned Reviewers:** Gemini-3 (Independent Peer Review) & Claude-13 (Browser Export & Provenance Review) under `W1-REV-02`  
**Execution Environment:** Blender 5.2.2 LTS (Build d13f752e3b9c), Python 3.12.10, Node v24.19.0, Khronos glTF-Validator 2.0.0-dev.3.10  
**Baseline & Specification:** Feasibility Baseline F1 / Product Specification Revision 2  
**Examined Git HEAD Commit:** `f4cd0a3be5fc7899e2fd20932bf40da2d4c2195c`  
**Owned Output Root:** `deliveries/W1/revisions/W1-F1-r2/` (Existing `deliveries/W1/` top-level proof files remain completely unchanged)

---

## 1. Verified Local Input Inventory

All required baseline specification documents and visual reference assets were inspected directly in the local workspace. Every SHA-256 digest was independently computed and matches the repository authority:

| Reference Input Path | SHA-256 Digest | Status & Provenance |
| :--- | :--- | :--- |
| `references/images/main-reference.png` | `37adfb0ee344642798978e954a0cfc8d9715eac1b3ca4e5a84ab87a228c53362` | Primary visual authority; bright white desk, blue chair, pink hex lights, cyan fill |
| `references/README.md` | `4bef6bb974a6f44f9ba1a28016685b1df74efdd87f9f025a4cc25d102ea5a0d2` | Reference index and attribution |
| `references/manifest.json` | `21c4e16fbe971792aa0c414a93a0da55b79cfcd5bf450da21f85681620cbd229` | Provenance manifest |
| `references/text/source-discussion.txt` | `99d27b55b395561c94d39368ebd000faddcfbb2790972e981da8e57a3afa5faf` | Reference discussion data (not authority over human request) |
| `docs/superpowers/specs/2026-09-30-yor-world-design.md` | `c5e14f1f7c662041734d6332aa90e86909d152422b27fdcd40a2d47921c013c4` | Product specification §§1, 3, 4, 7, 10 |
| `docs/planning/art-and-experience.md` | `763d64d20176c6e3a6d9887bdff233fc71fb2751ee142ebd6fd28ed150126ded` | Art and experience guidelines §§1–6, 9 |
| `docs/planning/interaction-catalog.md` | `c64127bcf4fb4fe4a1ffe86161e2180c079274a4f2bb3d14051ec9b4592e2806` | Interaction targets and catalog entities |
| `docs/planning/validation-and-production.md` | `0efa9bc08ce42f126d5845d33e58548ac9d8bf8904fd0d30497f47fdcba1ddef` | Validation criteria §§1, 2, 5, 7 |
| `docs/planning/delegation-and-work-orders.md` | `bc731e64a58b3f946a4ffd73adda2d60eb44dd8377b1438180df8d8d429cd3a5` | Delegation hub and account roles |
| `docs/planning/reconciliation-packets/2026-10-01-next-packets.md` | `2fb615c7a376011e7b7d7bc08e3fed92bb358f8a6965af4aa3057ff76ac7c145` | Bounded packet `W1-CORR-01` instructions |
| `docs/planning/reviews/2026-10-01-reconciliation.md` | `45e4b3b7a5a1fd3ae5b95b268e76e1a18a61a92d97ad85a682fa5050f82e0252` | Parent Codex ruling and technical audit findings |

---

## 2. Parent Findings Closure Ledger

### W1-01 (P1): Nested Placement Double-Offset Fixed Across Entire Scene

* **Defect Identified:** In W1 original, setting `obj.parent = parent` after specifying world coordinates left `obj.location` interpreted as local coordinates relative to the parent, causing child props to be translated by the parent's world offset twice.
* **Correction Implemented:**
  1. Primitive builders (`add_box`, `add_cylinder`, `add_sphere`, `add_empty_anchor`) now strictly maintain world matrix integrity when parenting via `obj.matrix_parent_inverse = parent.matrix_world.inverted()`.
  2. Every child prop (`door_leaf`, `door_handle_plate`, `door_handle_lever`, `pc_glass_panel`, `pc_fan_1..3`, `headset_stand_base`, `gaming_headset`, `controller-pegboard`, `pegboard_controller_1..2`, `talks-microphone`, `fg_plant_pot`, `fg_plant_leg_1..4`, `fg_plant_foliage_1..3`, `desk_clock_screen`, `console_dark_core`, `camera_lens`, `ps_sym_1..4`) maintains its intended world coordinates.
  3. Native Blender and exported glTF evaluated world positions were audited for all 232 nodes. Agreement is **100% (max deviation < 0.0001 m)**.
  4. Door leaf closed center is verified at **`(-1.2000, 1.0500, 1.8000)`** with hinge anchor at **`(-1.6500, 0.0000, 1.8000)`**.
  5. Hit zones correspond directly to actual evaluated object boundaries.

#### World Coordinates Agreement Audit (Sample of Corrected Nodes)

| Node Name | Parent Node | Intended Runtime (X, Y, Z) | Native Blender Runtime | glTF Evaluated Runtime | Deviation | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `door-hinge` | `door` | `(-1.650, 0.000, 1.800)` | `(-1.650, 0.000, 1.800)` | `(-1.650, 0.000, 1.800)` | $0.0000\text{ m}$ | **PASS** |
| `door_leaf` | `door-hinge` | `(-1.200, 1.050, 1.800)` | `(-1.200, 1.050, 1.800)` | `(-1.200, 1.050, 1.800)` | $0.0000\text{ m}$ | **PASS** |
| `door_handle_plate`| `door_leaf` | `(-0.820, 1.000, 1.830)` | `(-0.820, 1.000, 1.830)` | `(-0.820, 1.000, 1.830)` | $0.0000\text{ m}$ | **PASS** |
| `door_handle_lever`| `door_leaf` | `(-0.850, 1.000, 1.860)` | `(-0.850, 1.000, 1.860)` | `(-0.850, 1.000, 1.860)` | $0.0000\text{ m}$ | **PASS** |
| `helios-pc` | `reference-props` | `(1.020, 0.980, -1.150)` | `(1.020, 0.980, -1.150)` | `(1.020, 0.980, -1.150)` | $0.0000\text{ m}$ | **PASS** |
| `gaming_headset` | `headset_stand_base`| `(1.020, 1.440, -1.150)` | `(1.020, 1.440, -1.150)` | `(1.020, 1.440, -1.150)` | $0.0000\text{ m}$ | **PASS** |
| `controller-pegboard`| `reference-props`| `(1.280, 1.680, -1.150)` | `(1.280, 1.680, -1.150)` | `(1.280, 1.680, -1.150)` | $0.0000\text{ m}$ | **PASS** |
| `pegboard_controller_1`| `controller-pegboard`| `(1.240, 1.850, -1.250)` | `(1.240, 1.850, -1.250)` | `(1.240, 1.850, -1.250)` | $0.0000\text{ m}$ | **PASS** |
| `talks-microphone`| `talks_microphone_clamp`| `(-0.480, 0.960, -0.920)`| `(-0.480, 0.960, -0.920)`| `(-0.480, 0.960, -0.920)`| $0.0000\text{ m}$ | **PASS** |
| `fg_plant_pot` | `reference-props` | `(-1.350, 0.520, -0.150)`| `(-1.350, 0.520, -0.150)`| `(-1.350, 0.520, -0.150)`| $0.0000\text{ m}$ | **PASS** |
| `desk_top` | `desk` | `(0.000, 0.725, -1.150)` | `(0.000, 0.725, -1.150)` | `(0.000, 0.725, -1.150)` | $0.0000\text{ m}$ | **PASS** |
| `chair-root` | None (Locator) | `(0.300, 0.000, -0.360)` | `(0.300, 0.000, -0.360)` | `(0.300, 0.000, -0.360)` | $0.0000\text{ m}$ | **PASS** |

Full 232-node comparison record: `evidence/export-inspection.json`.

---

### W1-02 (P1): Geometry-Derived Clearance Checks & Fault Injection Validation

* **Defect Identified:** W1 original hardcoded preset clearance numbers without inspecting actual evaluated geometry, emitting unverified PASS claims. Armrest underside clearance used the pad center rather than pad top.
* **Correction Implemented:**
  1. Clearance checks now derive all measurements directly from evaluated mesh bounding boxes and vertex positions.
  2. Sampled door sweep evaluated from $0^\circ$ (closed) to $90^\circ$ (open) at $\Delta\theta = 5^\circ$ increments (19 samples). Measured minimum clearances:
     - Minimum clearance to left wall ($X = -2.10\text{ m}$): **$0.4500\text{ m}$** (at full $90^\circ$ open).
     - Minimum clearance to desk front edge ($Z = -0.75\text{ m}$): **$1.6700\text{ m}$**.
     - Minimum clearance to foreground plant foliage ($R = 0.26\text{ m}$ at $(-1.35, -0.15)$): **$0.8510\text{ m}$**.
  3. Entry path and corridor envelope evaluated:
     - Clear door opening width between left and right jambs: **$0.8900\text{ m}$** (passes $\ge 0.85\text{ m}$ threshold).
     - Clear doorway height from floor to header: **$2.0950\text{ m}$** (passes $\ge 2.05\text{ m}$ threshold).
     - Entry camera clearance to corridor walls: left $0.550\text{ m}$, right $0.550\text{ m}$.
  4. Chair turn and vertical clearance evaluated directly from bounds:
     - Armrest pad top $Y_{max}$ evaluated from `chair_armrest_left_pad` / `right_pad` bounds: **$0.6650\text{ m}$**.
     - Tabletop underside $Y_{min}$ evaluated from `desk_top` bounds: **$0.7000\text{ m}$**.
     - Evaluated vertical clearance: $0.7000 - 0.6650 = \mathbf{0.0350\text{ m}}$ ($35\text{ mm}$).
     - Knee-well clear width between Alex drawer units: **$1.6200\text{ m}$**.
     - Chair 360° turn base clearance to desk front: **$0.0700\text{ m}$** ($70\text{ mm}$).
     - $45^\circ$ visitor acknowledge turn clearance to obstacles: **$> 1.65\text{ m}$** into open room floor.
  5. Continuous guarantee disclaimer recorded: "Sampled check evaluated at 5.0-degree increments; discrete sampling does not constitute a continuous topological guarantee."

#### Fault Injection Suite Evidence (`evidence/fault-injection.json`)

To prove that the clearance checker demonstrably detects and rejects collisions (as required by W1-CORR-01 Item 2), a dedicated automated fault injection runner was executed against deliberate colliding mutations:

| Test ID | Description | Injected Mutation | Checker Outcome | Detector Action | Verdict |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `FAULT-INJECT-00` | Baseline delivery scene check | Un-mutated candidate geometry | `PASS` | All clearances clear | **PASS** |
| `FAULT-INJECT-01` | Wall proximity collision fault | Displace door hinge to $X = -2.08\text{ m}$ (only $20\text{ mm}$ from wall) | `FAIL` | Wall gap $0.020\text{ m} < 0.050\text{ m}$ threshold rejected | **PASS** |
| `FAULT-INJECT-02` | Armrest tabletop collision fault | Elevate armrests $+80\text{ mm}$ ($Y = 0.745\text{ m}$ penetrating $0.700\text{ m}$ desk) | `FAIL` | Vertical clearance $-0.045\text{ m} < 0$ rejected | **PASS** |
| `FAULT-INJECT-03` | Chair base desk penetration fault| Displace chair forward to $Z = -0.65\text{ m}$ (penetrating desk front) | `FAIL` | Clearance $-0.220\text{ m} \le 0$ rejected | **PASS** |

All 4 test cases executed cleanly. Collisions are demonstrably rejected by the checker.

---

### W1-03 (P1): Visual Anchor Framing and Camera Coverage Reconciled

* **Defect Identified:** In W1 original, Camera Home cropped the upper hex lights and chair, pegboard appeared empty, and headset, controllers, mic, and foreground plant were displaced outside the camera view due to W1-01. Camera Mobile did not demonstrate usable touch space. Reverse doorway showed an empty opening.
* **Correction Implemented:**
  1. With W1-01 resolved, all props are positioned in their authentic visual anchor locations.
  2. `Camera_Home` re-tuned to $(-2.15, 1.70, 1.55)$ looking at $(0.12, 1.25, -1.15)$ with $60^\circ$ FOV (16:9, 1920×1080). Renders demonstrate complete uncropped capture of:
     - Upper pink honeycomb hex lighting
     - Dual floating shelves with trailing foliage, camera, display keyboard, PlayStation icons
     - Curved 34" ultrawide monitor with screen wallpaper and downward lightbar
     - Workstation desk with vertical console and boom-arm microphone
     - White PC tower with glowing pink/cyan fans and headset stand with headphones on top
     - Perforated pegboard with 2 hung game controllers
     - Blue-and-white ergonomic gaming chair and seated resident scale proxy
     - Large foreground potted plant on 4-leg wooden stand
  3. `Camera_Mobile` (9:16 portrait, 1080×1920) re-tuned with horizontal sensor fit: frames monitor on the left, resident on the right, hex lights above, and provides **38% unobstructed floor space** at the bottom for touch controls.
  4. `Camera_ReverseDoorway` captures the closed door leaf, brass handle, and door frame directly.
  5. Doorway open evidence rendered (`camera-reverse-doorway-open.png` and `-open-gray.png`) demonstrating the full $90^\circ$ open leaf and entrance threshold.
  6. Side-by-side composite `reference-comparison.png` ($4360 \times 1160$) generated, presenting `main-reference.png`, color render, and clay render with clear descriptive banners.

---

### W1-04 (P2): Asset Register & Scene Numbers Reconciled

* **Defect Identified:** Discrepancies between reviewer citations and committed file statistics, lack of SHA bindings, and missing declarations of camera FOV conventions and recursive removal roots.
* **Correction Implemented:**
  1. `asset-register.json` computes all statistics directly from the evaluated Blender scene data blocks:
     - **Total Nodes:** 232
     - **Total Mesh Objects:** 204
     - **Total Mesh Triangles:** 11,020
     - **Total Materials:** 50
     - **Total Cameras:** 6
  2. `room-blockout.glb` exported file size: **925,024 bytes** (SHA-256: `cb9dbe01a8325933cac3e83003358dad096c0c5be9b9da76bc60bd2f47079d0f`).
  3. Declared camera FOV conventions: Auto/Vertical for landscape cameras; explicit Horizontal sensor fit for `Camera_Mobile`.
  4. Stored chair yaw: Declared as $-135.0^\circ$ Blender Euler Z ($+135.0^\circ$ runtime Y-up yaw).
  5. Declared camera purpose: Exported cameras represent proof and framing presets; they do not define or replace the production `CameraId` enum.
  6. Recursive removal roots declared:
     - `resident` root: Recursively removes proxy mannequin and all 18 child nodes.
     - `chair` root: Recursively removes chair and all 19 child nodes (base hub, 5 legs, 5 casters, cylinder, seat, backrest, pillows, armrests).
     - W1 `chair-root` locator: Stored locator at $(0.30, 0, -0.36)$. In G1 integration, this locator must be reused by W2 or disposed/renamed before adding W2's root to avoid duplicate names.

---

## 3. Khronos glTF Validation

Official Khronos `gltf-validator` 2.0.0-dev.3.10 was executed against `room-blockout.glb`.

* **Result:** **0 Errors, 0 Warnings**
* **Target File:** `deliveries/W1/revisions/W1-F1-r2/room-blockout.glb`
* **File Size:** 925,024 bytes
* **SHA-256:** `cb9dbe01a8325933cac3e83003358dad096c0c5be9b9da76bc60bd2f47079d0f`
* **Evidence Record:** `evidence/export-validation.json`

---

## 4. Summary of Verification Evidence

| Check Name | Target Artifact | Status | Evidence Path | Notes / Measured Result |
| :--- | :--- | :--- | :--- | :--- |
| **Nested Transforms Audit** | `blockout.blend` & `room-blockout.glb` | **PASS** | `evidence/export-inspection.json` | 232/232 nodes match intended world positions; 0 double-offsets |
| **Door Leaf Placement** | `room-blockout.glb` (node 79/80) | **PASS** | `evidence/native-inspection.json` | Door leaf closed center at `(-1.2000, 1.0500, 1.8000)`; hinge at `(-1.6500, 0, 1.8000)` |
| **Door Sweep Clearance** | `blockout.blend` | **PASS** | `asset-register.json` | Sampled 0°–90° at 5° intervals; min wall gap $0.450\text{ m}$; min desk gap $1.670\text{ m}$ |
| **Armrest Vertical Clearance**| `blockout.blend` | **PASS** | `asset-register.json` | Geometry-derived: desk underside $0.700\text{ m}$ - armrest top $0.665\text{ m} = 0.035\text{ m}$ ($35\text{ mm}$) |
| **Chair 360° Turn Clearance** | `blockout.blend` | **PASS** | `asset-register.json` | Base turning radius $0.320\text{ m}$; min clearance to desk front $0.070\text{ m}$ ($70\text{ mm}$) |
| **Clearance Fault Injection** | `fault-injection-runner.py` | **PASS** | `evidence/fault-injection.json` | 4/4 tests pass; all 3 injected collision mutations demonstrably rejected |
| **Camera Framing Gate** | Color & Clay Renders | **PASS** | `renders/` | All 8 visual anchors captured in Home view; Mobile has 38% touch space |
| **Doorway Open Evidence** | Door swing renders | **PASS** | `renders/camera-reverse-doorway-open.png`| Direct visual capture of door swung open 90° into room |
| **Reference Comparison** | Side-by-side composite | **PASS** | `reference-comparison.png` | 4360×1160 side-by-side comparison with `main-reference.png` |
| **Khronos glTF Validation** | `room-blockout.glb` | **PASS** | `evidence/export-validation.json` | 0 errors, 0 warnings (gltf-validator 2.0.0-dev.3.10) |
| **Asset Register Statistics** | `asset-register.json` | **PASS** | `asset-register.json` | Reconciled: 232 nodes, 204 meshes, 11,020 triangles, 50 mats, 6 cameras |
| **Archive Integrity** | `w1-f1-r2-proof.zip` | **PASS** | `manifest.json` | Full archive packaged with complete SHA-256 manifest |

---

## 5. Artifact Manifest (SHA-256 and File Sizes)

| File Name | File Size (Bytes) | SHA-256 Digest | Description |
| :--- | :--- | :--- | :--- |
| `build-blockout.py` | 77,736 | `c61474e2c46aafcab494116089f8b7b8ef1a5feb9dc3d6f4ed5a2a40693ca090` | Corrected blockout generator script |
| `blockout.blend` | 282,179 | `8f813f8b2df518dc3410e062c791e66bbf646910b3ca038e040c27ddf01db08b` | Corrected native Blender 5.2.2 scene |
| `room-blockout.glb` | 925,024 | `cb9dbe01a8325933cac3e83003358dad096c0c5be9b9da76bc60bd2f47079d0f` | Corrected glTF 2.0 binary export |
| `asset-register.json` | 15,466 | `7bd65522670510d64edee03dba803d957831f8793f5e3a52ca3a50105526ca93` | Reconciled asset register with live scene statistics |
| `reference-comparison.png`| 4,470,314| `05542a9ecd184f2539016b25566e638771fca3741cf4fdcf72229afe92005a29` | Side-by-side comparison composite (4360×1160) |
| `w1-f1-r2-proof.zip` | 39,940,186 | `bb4735f2f2198cb8ae350f3e1ba61e4b0cc4c26e0e8488efa1831ec4b744c440` | Full delivery archive package |
| `evidence/native-inspection.json` | 138,009 | `84c6d6abc8ad8bf8e6c87dc25a58da3b9ac5ec459bb6e15d6fa0f81b348cd0b7` | Native Blender object inspection record |
| `evidence/export-inspection.json` | 100,121 | `b24a9a5881b671f86dc297ab8b4cd52122750e3a364a406c804c59490caecb69` | Evaluated glTF transform audit and agreement table |
| `evidence/export-validation.json` | 43,377 | `36f598e8b3866607796f586ad24e4e454bd87b50c296e06af38a4b93f9749880` | Khronos glTF-Validator official report (0 errors, 0 warnings) |
| `evidence/fault-injection.json` | 2,465 | `5afb227b5739746db6ad77640cbc6f78e5ccf8a4822b4ffdfa96f303da872f3a` | Clearance checker collision fault injection test evidence |

*(Full archive package `w1-f1-r2-proof.zip` and complete manifest are recorded in `manifest.json`.)*

---

## 6. Worker Declaration & Independent Review Handoff

In accordance with [AGENTS.md](../../../../AGENTS.md) and [2026-10-01-next-packets.md](../../../../docs/planning/reconciliation-packets/2026-10-01-next-packets.md):
- This maker does not self-approve deliverables.
- This delivery is formally submitted to Parent Codex for review dispatch under `W1-REV-02`.
- Next required step: Gemini-3 independent review (`reviews/gemini-3/W1-F1-r2-review.md`) and Claude-13 browser export review (`reviews/claude-13/W1-F1-r2.md`).
- G1 integration remains locked until parent reconciliation adjudicates acceptance.
