# FINISH-B1-R4-02 — FINISH-25 plus R1 / FINISH-30 maker return

**Reviewable bounded candidate; no maker acceptance.** Local structural, lineage, replay, call and asset-budget checks PASS. PC/window occlusion is corrected within the amendment. Full reference fidelity remains **FAIL / OPEN** and glass aesthetic/reflection acceptance is pending independent review. Door/camera, production ownership, devices and external review remain open.

## Exact inputs and scope

- R3 base commit `1753b9278c4537b5377c3893172b2a0f26d13b10`; full tree `9759ac9879bcc9489770b7c5784ead2f022157b0`; R3 subtree `0bc042af5add583314a7e0713c6db8793f5ca18b`.
- FINISH-25 packet `105d79b1d4d3d36064a933fa745e3ca43a35a8cf`; R1 authorization `b33631a9bcbd74cfca9e8f2495140a5eee322a9a`. Read named frozen contract, art §7, reference/index/manifest and FINISH-20 report directly. Raw receipts: `evidence/input-hashes.json` (28 commit/path/hash entries). R1 packet copy: `inputs/finish25-r1/`.
- Only this fresh delivery root was written. R3 and earlier roots, accepted contracts, canonical `app/` and status/hub files were not edited. Canonical app tree read as `42ea29ec235225046a75959eb19eb386ac2f821d`. Shared branch changes were made by other work; maker commits through a separate worktree.
- Local Codex maker execution. No Gemini production or GPT Plus #2 review is claimed.

## Correction and exact geometry limits

`PC_TemperedGlass` uses `alphaMode=BLEND`, alpha .18 and zero transmission. Removed the transmission/IOR export extensions and unused declarations. Original RGB, metallic .05, roughness .08 and double-sided setting remain exact. Native IOR 1.52 remains an inactive shader input; Blender omits its extension here. Native/source fields agree exactly; actual material export agrees with production within 1e-7. Every other material is exact.

The single GLB material primitive remains on `StaticBatch__Room_Root__PC_TemperedGlass` (node 201, mesh 74). Authored components are `pc_glass_side_panel` and `window_glass`, joined into that static batch with their identity proxies retained; their vertices/UV/bindings remain exact. Final inspection: `evidence/final-material-inspection.json`; native/material parity: `evidence/native-source-export-parity.json`.

| Authorized component | Before → after triangles | Delta | Implementation |
| --- | --- | --- | --- |
| `pc_chassis_frame` | 12 → 60 | +48 | Five .012-thick opaque shell boxes, open at min-X; same identity/parent/TRS/material/exact outer bounds. |
| `pc_internal_backplate` | 0 → 12 | +12 | Sole new static node under `helios-pc`, existing charcoal material; center (1.155,1,-1.15), dimensions (.008,.38,.38), inside original case. |
| Left wall component in existing static batch | 12 → 48 | +36 | Four strips around authorized aperture; other original wall faces/vertices/UVs/shading exact. |
| `window_frame` | 12 → 48 | +36 | Four border strips; identity/parent/TRS/material/exact outer bounds retained. |

Total **+132 triangles**, **one added opaque call**. All original node identities/TRS/hierarchy are exact except the one new child reference. Fan/LED hooks, spin axis, glass, blinds, lights, door/cameras, animations, skins, other props remain exact. Native inventories and reopened saved source: `evidence/native-geometry-diff.json`. Production primitive/full-record proof: `evidence/final-lineage.json`.

## Source and export lineage

`source.patch` replays byte-exactly from the pinned R3 environment builder. Final authoring source is `source/blender/scripts/build-environment.py`. The replay recipe opens exact R3 native source, uses the patched authoring geometry recipes, corrects glass, saves/reopens the native inventory and actually exports the room through Blender. `export-final-room.py` then imports only the authorized native-exported mesh deltas into the original R3 GLB records. This preserves every original binary byte as an exact prefix, all original accessors/buffer views, unchanged nodes/meshes/materials and unrelated wall attributes/indices. It avoids changing frozen geometry through a whole-scene exporter reorder.

Room asset: `assets/room.glb`, SHA-256 `d192a8154cc9e43adfef6b84beb0eaa64d40d2af464d8572fd4b0fcbf845baf5`, 699668 bytes. Native source: `assets/source/room.blend`. The four other GLBs and two PNGs are raw R3 copies; all six byte-identical. The full eight-file original production universe is checked against Git, not a guessed list.

Fresh repeated native room GLB and merged production room GLB are byte-identical. Native .blend containers are checked through exact saved/reopened semantic inventories; binary save timestamp determinism is not claimed. Final replay proof: `evidence/final-export-reproducibility.json`.

## Raw renderer measurements

| Variant | Profile | Raw calls | Main | Transmission | Rendered triangles |
| --- | --- | --- | --- | --- | --- |
| R3 | desktop-home | 202 | 101 | 101 | 30544 |
| R3 | mobile-home | 146 | 73 | 73 | 27872 |
| material-only | desktop-home | 102 | 102 | 0 | 15296 |
| material-only | mobile-home | 74 | 74 | 0 | 13960 |
| R4 | desktop-home | 103 | 103 | 0 | 15428 |
| R4 | mobile-home | 75 | 75 | 0 | 14056 |

Final limits: desktop ≤120, mobile ≤80. Final raw calls equal intercepted calls, frame delta is one, all final calls are main pass. Receipts retain per-object material flags, raw stack frames and owner attribution. Both final home profiles load all five GLBs, including original on-demand effects; there is no reduced-asset budget profile.

Exact pinned R3 harness HTML with asset URL remap only, Three 0.180.0, Playwright 1.63.0, Chromium 153.0.8010.12. Desktop 1920×1080 / mobile 720×1280, DPR1, ACES exposure .85, sRGB, original cameras/lights. Browser evidence includes exact camera/lights and five response-body SHA hashes per variant. Matched stills explicitly use coding_idle at t=0 in all variants. Browser command `node deliveries/FINISH-B1-R4-02/scripts/verify-browser.mjs`: exit0; `evidence/browser-run.log`, `evidence/browser-results.json`.

## Capture observations and limits

21 actual canvas PNGs: seven views each for R3, sealed material-only and amended R4. Each view has matched camera, DPR, exposure, lights, renderer and animation state. Desktop/mobile plus PC outside/inside and window inside/outside are included. Hashes/dimensions/settings and loaded response hashes reverified by `evidence/capture-reverification.json`.

- **PC depth:** exterior base view now shows the recessed charcoal backplate, shell depth, unchanged LED, pane edge and tint instead of the original opaque slab. The normal PC outside/inside views retain the original large cyan on-demand network plane; it obscures some interior detail. One clearly labeled supplemental `pc-glass-outside-base` view hides only `Project_Effects_Root` equally in all three variants. It is not a budget or full-scene acceptance view.
- **Window:** both sides now show the authorized opening/frame and unchanged blinds; outside view sees the room/resident through the pane. Interior view has limited light glint. With frozen lighting and no exterior/environment, these views do not prove reference-grade reflections, daylight, exterior art or blind interaction presets.
- **Reference fidelity:** full-room composition/lighting remains visibly darker and simpler than `references/images/main-reference.png`. The existing flat props/resident and underexposed frame do not establish overall art acceptance. No lighting, unrelated geometry, environment/reflection image or camera adjustment was authorized here. Any broader visual correction needs a separate Parent packet specifying reference composition/lighting and detailed art bounds. Independent review must decide whether this bounded alpha glass appearance is sufficient; the maker does not sign it off.

## Relevant budgets

File caps PASS: room 699668≤1,500,000; resident 579,596≤800,000; fixture84,816≤524,288. Essential GLBs 1,364,080 bytes fit mobile3MiB/desktop6MiB. All delivered GLBs+late PNG transfer bytes 1,661,542 fit mobile7MiB/desktop14MiB. Unique delivered texture bytes 246,782≤1,500,000; embedded/standalone duplicate monitor image deduplicated by raw hash.

| Profile | Asset GPU estimate bytes | Local median ms | Local p95 ms | Result |
| --- | --- | --- | --- | --- |
| desktop-home | 6375766 | 0.800 | 1.100 | PASS LOCAL |
| mobile-home | 6375766 | 0.700 | 1.000 | PASS LOCAL |

GPU estimate includes unique loaded attribute/index buffers and all delivered unique textures at RGBA8 with mipmaps; excludes driver/framebuffers. Timing is local animated renderFrame+blocking WebGL finish, 30 warmups/180 RAF samples after matched stills. It is not production or physical-device qualification. Cold/warm network entry, real mobile/Safari thermal/profile, runtime optional overlap/residency and G7 remain **NOT RUN**. Full raw estimates/sample arrays: `evidence/final-budgets.json`, browser receipt.

## Check ledger

Final commands/UTC/exits/log hashes: `evidence/final-check-commands.json`; all 12 final commands exit0. Versions including Blender5.2.2 LTS hashd13f752e3b9c, Python/Node/Git and validator: `evidence/tool-versions.json`.

| Check | Result | Final evidence |
| --- | --- | --- |
| Native correction/reopen, all non-authorized mesh/UV/TRS/material/action identities | PASS | native-geometry-diff.json; final-native-replay.log |
| Actual native and production export replay | PASS | final-export-reproducibility.json; final-room-replay.log |
| Raw R3 eight-output universe; exact allowed deltas/bounds; +132 triangles; patch replay | PASS | final-lineage.json / .log |
| Builder/native glass and actual material export parity | PASS | native-source-export-parity.json; final-native-parity.log |
| Five fresh Blender imports, finite matrices | PASS | blender-imports.json; final-blender-imports.log |
| Khronos glTF structural validation, five GLBs | PASS: zero errors/warnings | gltf-validation.json; final-gltf-validation.log |
| 21 capture hashes/dimensions/settings/pose and15 GLB bodies | PASS | capture-reverification.json; final-capture-reverification.log |
| Applicable asset/call/triangle/estimate/local timing budgets | PASS LOCAL | final-budgets.json / .log |
| 28 commit/path/raw input bindings | PASS | input-hashes.json; final-input-binding.log |
| Package file set/raw hashes | PASS upon explicit verifier run | output-hashes.json; package-verification.json |
| Full art/reference, glass aesthetic acceptance | FAIL / PENDING independent review | issue-matrix.json; captures |
| Door/camera sweep and production door owner | OPEN; NOT RUN here | Preserved FINISH-20 findings |
| Physical devices/provider/production/G7/external GPT Plus #2 | NOT RUN | No supplied evidence |

## Preserved failed checkpoint and logs

`checkpoints/material-only/` is the original failed visual stage:102/74 calls, opaque chassis/window blockers. Its manifest SHA `2957fb72ed270f9d6bd75fdce5f6dc0c1fe3e124da490a8a682fb9cf9731724a` and all72 files /10,515,141 bytes are unchanged. Use its embedded report/receipts to read that stage. Root `material-only-stage-report.md` is historical; its relative links describe that stage and must not be treated as final proofs.

## FINISH-30 collision resolution

Allocation commit `c2478400` directs this fresh isolated branch to start at exact R3, not at collision snapshot `2cc4419aa9e0670b9b3da36cfbbcdb472231589e`. Retrieved exactly200 eligible Git paths; excluded all eleven unknown artifacts without reading their contents. Old root and unpushed snapshot are unchanged. All regenerated output remains inside the new root. The final tree contains no old R4 root and no unknown artifacts in its ancestry.

The old snapshot production room was `ede3258e39efa6d2641f1480baaf3cfd9d44c3915b4da243fc6d4011d8c3654b`, but its browser/replay/lineage receipts identified earlier `d192a8154cc9e43adfef6b84beb0eaa64d40d2af464d8572fd4b0fcbf845baf5`. That snapshot was not a valid evidence binding. Package hash agreement alone did not detect stale dependent receipts.

Exact old native export: `e80fcc64e881724990977bea5a4dbf88fc0be32b26c63a40733388eeed177411` (686,636 bytes). Earlier comparison value recorded in the old receipt: `d421d5217c495728afb7a83815ac7b399a1516cf5edf80e2b3779cd218deb090`; the original historical binary was not retained. Freshly rebuilding exact R3 native plus the authorized patch now independently produces `d421d5217c495728afb7a83815ac7b399a1516cf5edf80e2b3779cd218deb090` (686,600 bytes), twice byte-identically. Fresh production replay independently produces the d192… hash, twice byte-identically; no bytes were patched toward either hash.

Actual old committed native source SHA: `fc727ddab4d974e59f58406bc88ca06a8ddddbfb21e2ec55ac011e7bc009c443`. Method: load that eligible pinned .blend into Blender, compare every object type/parent/TRS/material slot/full mesh vertex-face-UV inventory against the exact-R3-plus-patch rebuild, and compare all native material node inputs/links. Differing object records: `Speaker_LED`, `speaker_left_cabinet`, `speaker_right_cabinet`, `StaticBatch__Room_Root__Plant_Foliage`, `StaticBatch__Room_Root__Wall_SoftLavender`. These are object/mesh/topology/UV differences; all native material records are identical. The fresh rebuilt records independently match R3 for every unauthorized component; only the three authorized mesh records plus backplate differ. The wall retains all other original faces/attributes/UVs exactly. Full per-record differences, raw native-export JSON differences and binary SHA/size comparison are in `evidence/native-reopen-diff.json`.

All final native/export/replay/browser/capture/validator/import/budget/lineage evidence was freshly regenerated against the one delivered room. Legacy active receipt names were rebound to current checks; original historical receipts and failed attempts remain only as checkpoint evidence or explicitly labeled historical logs, not final PASS evidence. Physical devices/provider/external review remain NOT RUN. Package verification now cross-checks the actual room/native hash across every final receipt in addition to file hashes and exact eligible set.

## Package and replay

`output-hashes.json` lists every returned file's raw bytes/SHA, including checkpoint/inputs/logs/scripts/captures/native source. Only the manifest itself and `evidence/package-verification.json` are excluded to avoid a hash cycle; both are committed as ordinary files. Scratch `.work/`, node_modules, __pycache__, .blend1 backups are excluded from delivery. R4 `.gitattributes` preserves raw bytes in Git.

Recheck: `python deliveries/FINISH-B1-R4-02/scripts/verify-package.py`. With an isolated exact commit checkout, use `--git-ref HEAD --no-write` for raw Git blob identity. Replay native/export/final checks: `python deliveries/FINISH-B1-R4-02/scripts/run-final-checks.py`; browser first if recapturing. Requires the recorded Blender binary plus pinned Three/Playwright/glTF validator dependencies. In the isolated worktree set `FINISH_B1_DEPENDENCY_ROOT=C:/Users/yoray/Projects/Yor World/app`; this supplies existing installed packages through a normalized read-only route and does not alter the frozen harness/render settings or app files. Do not run historical prepare/material-only scripts against final output; they intentionally construct the old stage.

Parent assigns separate exact-candidate audit and retains acceptance. This package authorizes no integration, publication, C2/C3 progression or full B1 approval.
