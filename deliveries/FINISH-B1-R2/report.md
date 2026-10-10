# FINISH-B1-R2 Candidate Delivery Report

**Date**: 2026-10-10  
**Lane**: Gemini #2 — World and Art Maker  
**Authority**: Milestone FINISH-B1-R2 Work Order & Product Specification Revision 2  
**Contract Reference**: `docs/planning/reconciliation-packets/finish-contracts-r2/03-asset-bindings.md`  
**Delivery Root**: `deliveries/FINISH-B1-R2/`  
**Delivery Status**: **DELIVERED FOR DELTA AUDIT**  
**Next Owner**: GPT Plus #2 (Independent Auditor)

---

## 1. Executive Summary & Defect Closure Ledger

Milestone candidate `FINISH-B1-R2` delivers fully conforming 3D assets, reproducible Blender source models, isolated playback harness, and photographic / WebGL verification evidence under exclusive write root `deliveries/FINISH-B1-R2/`. This revision directly resolves all six defects (`B1-R1` through `B1-R6`) identified in the independent audit `deliveries/completion-audits/FINISH-B1/2026-10-10-r1/report.md`.

| Defect ID | Audit Defect Finding | FINISH-B1-R2 Resolution & Verification | Status |
| :--- | :--- | :--- | :--- |
| **B1-R1** | Non-conforming GLB filenames (`production-room-full.glb`, etc.) and missing literal uppercase nodes (`Door_Frame`, `Door_Hinge`, `Door_Leaf`, `Plant_Leaf_01/02`, `Books_Stack`, `Chair_Seat`, `PC_Fan_Group`, `Zenith_Core`, `Camera_Lens_Ring`, `Clock_Face`, etc.). | Exported exact conforming files: `assets/room.glb`, `resident.glb`, `fixture.glb`, `group-b-props.glb`, `on-demand-projects.glb`. All 12+ literal nodes verified in GLB trees (`binding-inventory.json`). Zero runtime synonym adapters. | **PASS** |
| **B1-R2** | Door animation duration mismatch (3.54s sampler vs 2.83s claimed with closing return); door leaf displacement offset bug ($X = -2.85\text{ m}$). | Authored exact tree `Room_Root/door/{Door_Frame, Door_Hinge/Door_Leaf}`: `Door_Hinge` rest at $(-1.65, 0.0, 1.80)$, `Door_Leaf` local at $(+0.45, 1.05, 0.0)$, evaluated closed world center at $(-1.20, 1.05, 1.80)$. **Zero mixer clips exported in room.glb**. Direct hinge yaw ($0 \to \pi/2$ over 2.5s) owned by `EntranceCoordinator`. | **PASS** |
| **B1-R3** | Severe overexposure in Three.js browser canvas (90.79% white clipped pixels, mean RGB > 240). | Calibrated punctual light energies in GLB (`Light_HexWall` 12.0, `Light_TaskDownlight` 10.0, `Light_CyanFill` 6.0, `Light_CeilingAmbient` 8.0), calibrated material emissive strengths (1.2–2.0), toned white surfaces (0.80–0.84), and applied canonical `ProductionLighting.ts` intensities. Measured white clipping: **0.31% desktop-home, 0.79% mobile-home, 0.0% entry** (all well below < 5% ceiling). | **PASS** |
| **B1-R4** | F1 invariant prose vs geometry discrepancy: report claimed `[-0.05, 0.0, -0.65]` while conforming locator is `[0.30, 0.0, -0.36]`. | Conforming F1 locators `[0.30, 0.0, -0.36]` and room envelope $4.2 \times 3.6 \times 2.8\text{ m}$ strictly preserved in geometry. Report and metadata corrected to match true conforming geometry. | **PASS** |
| **B1-R5** | Byte-identical `mobile-room-lod.glb` falsely labeled as mobile LOD optimization. | Eliminated false mobile alias; adopted unified shared geometry policy with runtime tier quality controls per R2 contract. | **PASS** |
| **B1-R6** | Insufficient multi-angle browser and performance provenance. | Generated full photographic and WebGL canvas suites across all 5 camera presets (`desktop-home`, `mobile-home`, `entry`, `monitor-detail`, `reverse-doorway`), side-by-side reference comparisons, door rotation sweep, and 8 synchronized character clips. | **PASS** |

---

## 2. Delivered Artifact Inventory

All files are strictly contained within `deliveries/FINISH-B1-R2/`:

```
deliveries/FINISH-B1-R2/
├── assets/
│   ├── room.glb                      (915,508 bytes, SHA-256 in output-hashes.json)
│   ├── resident.glb                  (575,900 bytes)
│   ├── fixture.glb                   (86,804 bytes)
│   ├── group-b-props.glb             (38,060 bytes)
│   ├── on-demand-projects.glb        (12,420 bytes)
│   ├── source/                       (.blend native scenes)
│   └── textures/                     (PBR procedural textures, total 442,168 bytes)
├── captures/
│   ├── desktop-home/                 (raw-frame.png, browser-canvas.png, browser-ui.png)
│   ├── mobile-home/                  (raw-frame.png, browser-canvas.png, browser-ui.png)
│   ├── entry/                        (raw-frame.png, browser-canvas.png, door-closed/45/90deg.png)
│   ├── monitor-detail/               (raw-frame.png, browser-canvas.png, browser-ui.png)
│   ├── reverse-doorway/              (raw-frame.png, browser-canvas.png, browser-ui.png)
│   ├── comparisons/                  (side-by-side images vs main-reference.png)
│   └── index.json                    (capture metadata & checksums)
├── scripts/
│   ├── build-environment.py          (Blender 5.2.2 LTS room environment generator)
│   ├── build-resident-fixture.py     (Blender 5.2.2 LTS avatar and chair rig generator)
│   ├── generate-textures.py          (Procedural PBR texture generator)
│   ├── test-browser-playback.mjs     (Playwright Chromium Three.js validation harness)
│   ├── create-comparisons.py         (White-clipping analysis & side-by-side generator)
│   ├── export-assets.py              (Reproducible build pipeline)
│   └── generate-manifest-and-metadata.py
├── source/
│   ├── blender/models/               (room.blend, resident.blend, fixture.blend, optional-details.blend)
│   ├── blender/scripts/              (exact build & export scripts)
│   └── harness/                      (package.json, package-lock.json, index.html, main.ts)
├── validator-logs/
│   ├── export-validation.json        (Khronos glTF-validator: 0 errors, 0 warnings across all 5 GLBs)
│   ├── dimensions-anchors-check.json (F1 room, desk, door, chair measurements: all PASS)
│   ├── rest-pose-check.json          (26-joint skeleton and chair rest TRS: PASS)
│   ├── clip-inventory.json           (8 synchronized paired clips: all PASS)
│   ├── duplicate-ownership-check.json(Zero door clips, no mesh overlaps: PASS)
│   ├── browser-playback-evidence.json(Three.js runtime metrics: triangles 30,240, calls 398)
│   ├── exposure-evidence.json        (White-clipping analysis: all cameras < 1% clipping: PASS)
│   ├── native-export.log             (Blender 5.2.2 LTS export command receipts)
│   └── browser-playback.log          (Chromium WebGL playback logs)
├── candidate-asset-manifest.json     (Schema v1 conforming manifest, DELIVERED FOR DELTA AUDIT)
├── binding-inventory.json            (Complete 25 catalog interaction rows binding inventory)
├── rest-transforms.json              (Full scene hierarchy and TRS transform dump)
├── asset-register.json               (Resource accounting & GPU footprint estimates)
├── provenance.json                   (Toolchain, visual reference hash, and lineage ledger)
├── input-hashes.json                 (SHA-256 of all inspected project inputs)
├── output-hashes.json                (SHA-256 and byte sizes of all delivered files)
└── report.md                         (This delivery report)
```

---

## 3. Technical & Verification Evidence

### 3.1 Khronos glTF-Validator Results
Executed via `gltf-validator` 2.0.0-dev.3.9:
- `room.glb`: **0 Errors, 0 Warnings** (166 Infos)
- `resident.glb`: **0 Errors, 0 Warnings** (0 Infos)
- `fixture.glb`: **0 Errors, 0 Warnings** (0 Infos)
- `group-b-props.glb`: **0 Errors, 0 Warnings** (8 Infos)
- `on-demand-projects.glb`: **0 Errors, 0 Warnings** (4 Infos)

### 3.2 Asset Budget & Memory Accounting
| Resource | Measured Size | Allowed Limit | Margin | Status |
| :--- | :--- | :--- | :--- | :--- |
| `assets/room.glb` | 915,508 B | 1,500,000 B | -39.0% | **PASS** |
| `assets/resident.glb` | 575,900 B | 800,000 B | -28.0% | **PASS** |
| `assets/fixture.glb` | 86,804 B | 524,288 B | -83.4% | **PASS** |
| `assets/group-b-props.glb` | 38,060 B | 500,000 B | -92.4% | **PASS** |
| `assets/on-demand-projects.glb`| 12,420 B | 500,000 B | -97.5% | **PASS** |
| Delivered Textures Total | 442,168 B | 1,500,000 B | -70.5% | **PASS** |
| Essential Entry Total (Room + Resident + Fixture) | 1,578,212 B | 3,145,728 B (Mobile) / 6,291,456 B (Desktop) | Within 3.0 MiB ceiling | **PASS** |
| Home Desktop Visible Triangles | 30,240 | 300,000 (Desktop) / 140,000 (Mobile) | Well below limits | **PASS** |
| Render Draw Calls | 398 (unbatched raw) | Batching tested in C1/C2 runtime | Tier supported | **PASS** |

### 3.3 Exposure & Color Fidelity Verification (B1-R3 Closure)
White-clipping analysis measured on raw WebGL canvas captures (RGB $\ge 245$):
- `desktop-home/browser-canvas.png`: **0.31% clipping** (mean luminance 76.1) -> **PASS**
- `mobile-home/browser-canvas.png`: **0.79% clipping** (mean luminance 86.4) -> **PASS**
- `entry/browser-canvas.png`: **0.00% clipping** (mean luminance 14.7) -> **PASS**
- `monitor-detail/browser-canvas.png`: **0.38% clipping** (mean luminance 94.5) -> **PASS**
- `reverse-doorway/browser-canvas.png`: **0.00% clipping** (mean luminance 90.7) -> **PASS**
- All Blender EEVEE raw frames: **0.00% clipping** -> **PASS**

### 3.4 Door Motion Binding Verification (B1-R2 Closure)
- `Door_Frame` and `Door_Hinge` are verified siblings under `door`.
- `Door_Hinge` world rest position: $(-1.65, 0.0, 1.80)$.
- `Door_Leaf` local offset: $(+0.45, 1.05, 0.0)$, evaluated closed world center $(-1.20, 1.05, 1.80)$.
- `room.glb` contains **zero animation clips** (`animations: []`).
- Direct rotation sweep ($0 \to \pi/2$) verified in browser capture suite: `door-closed.png`, `door-45deg.png`, `door-90deg.png`.

### 3.5 Character Skeleton & Clips Verification (B1-R1 / B1-R4 Closure)
- Exact 26 joints preserved in `resident.glb` conforming to B1 baseline reference.
- Both `resident.glb` and `fixture.glb` export exactly the 8 synchronized clips (`coding_idle` 6.0s, `mouse_idle` 2.0s, `notice_visitor` 0.6s, `turn_to_visitor` 1.2s, `greeting_nod` 0.9s, `return_to_work` 1.3s, `attention_glance` 1.2s, `breathing_idle` 4.0s).
- Chair seat local rest T: $(0.0, 0.42, 0.025)$, chair root and base at $(0.30, 0.0, -0.36)$.
- Zero proof static props (desk, floor, keyboard, monitor) in `fixture.glb`.

---

## 4. Governance & Hand-off

1. **Self-Approval Prohibition**: Gemini #2 does not approve its own work. This candidate is marked strictly as `DELIVERED FOR DELTA AUDIT`.
2. **Canonical Tree Protection**: The canonical application tree (`app/`) was not modified. All work is strictly isolated in `deliveries/FINISH-B1-R2/`.
3. **Next Action**: Hand off to **GPT Plus #2** for independent Delta Audit of `deliveries/FINISH-B1-R2/`.
