# FINISH-B1 FINISH-04 independent local re-audit

Advice: **REWORK**. Current `deliveries/FINISH-B1-R2/` bytes do not close FINISH-04. FINISH-B1-R3 is absent; absence is a delivery/evidence limit, not proof that assets are wrong. Two actual exported motion defects are reproduced: 125° chair yaw versus contracted 35°, and hands missing the final room keyboard/mouse. B3-01, B3-02 and B3-03 remain open. New B3-04 and B3-05 identify observed defects. Parent alone decides acceptance; no production fixes, maker edits, canonical integration or Git index changes were made.

Audit identity: actual assigned Sol ultra independent lane; no external GPT/Gemini account or serving-infrastructure identity claim. Workspace HEAD `afc69a9a154d2036562728bb61d9948297871149`; immutable maker base `f62a43c5e71c00dcb89e28275ea81d842167db80`; unchanged app tree `42ea29ec235225046a75959eb19eb386ac2f821d`. Accepted FINISH-00-R2 output manifest SHA-256 `8038db147824b0a31de1028c330383352177020b2247dd627d1674d6dc14c6af` and accepted input-manifest identity `516295623cb233c88d358729db0ef7ee4867bf070b61c0d37e33ed59d4883a76` are design bindings, not art acceptance. Actual candidate manifest SHA-256 `546e32459e48fdca4a7b698cdcab5371aa7e38a8322657805113ed4c50fd993b` (12894 B). R2 contains 86 files; its 85 declared outputs all match, with only self-excluded output-hashes.json outside the rows. All 23 indexed captures and all 54 accepted contract output rows match. All 20 candidate identities present in prior r2 auditor inputs remain unchanged.

| Export | Bytes | Raw SHA-256 |
| --- | ---: | --- |
| room | 915508 | `1391423695392205ec40d38ee93d7a1b7c906a1d2ee3693af21dcca8ff4b4988` |
| resident | 575900 | `3c96610e5f9b2324303e4cc105b0b12688d7c9a47a778d9f26714ce540605c57` |
| fixture | 86804 | `fa2188db284acf1d8fd01cb29c75f6f7e6b215d91c816f813ccaf5a7228bbc41` |
| group-b-props | 38060 | `008078c09e10b106db5d6b4adcdc98ae5de9969bb428ae8981ae1290971efe30` |
| on-demand-projects | 12420 | `ca57ceb15c4c98c1056cbac40e3335f184f365f1e5a8a7e763255012fb76ea92` |

Named governing documents, prior audits/readiness, accepted design/contract, candidate sources/evidence and references were directly opened. The main reference was viewed with view_image, as were desktop/mobile and open-door candidate images. The fresh output directory was confirmed absent before creation. `input-hashes.json` binds all current candidate files and named inputs; `manifest-verification.json`, `candidate-current-inventory.json` and `prior-evidence-binding.json` provide raw comparisons. No application tests are claimed from hash rows or animation sample counts.

The prior independent Khronos receipt remains useful on these exact unchanged five exports: validator 2.0.0-dev.3.10, zero errors/warnings (room 166 infos, optional details 8 and project effects 4). It was not rerun. Prior exposure advice remains below its ceiling for the bytes it examined, but those files are compositor screenshots, not true raw framebuffer captures. Independent all-channel RGB≥245 pixel checks yield desktop .3131%, mobile .7892%, entry 0%, monitor .3762%, reverse .00048%. Original r1/r2 reports are preserved; their broad closure claims are not expanded to missing FINISH-04 evidence.

Focused direct accessor/TRS checks pass 24 anchors plus Door_Leaf .88×2.08×.04 m extent at .0001 m tolerance. Actual room floor spans approximately X[-2.1,2.1], Z[-1.8,1.8], with Y=0 top and ceiling lower plane 2.8 m. Actual desk footprint is 2.6×.8 m, top Y=.750000024 m, center X/Z=(0,-1.149999976). Door hinge/leaf, chair roots/seat, monitor, painting/mark and named prop anchors agree. The exact 26-joint skeleton local rest TRS and inverse bind matrices match the pinned baseline (`ee50b195...`) with zero serialized differences. Scene names are unique across the five mounted exports. These are positive measurements of assets, distinct from the supplied generator's inadequate literal measurement program.

Actual Playwright Chromium 153.0.8010.12 / Three 0.180.0 loaded the five GLBs on Windows 11 with ANGLE NVIDIA RTX 2060 D3D11. The diagnostic extracts the maker HTML without changing maker bytes, exposes existing objects, and disables unattended RAF only while sampling. It evaluates Three.js CPU skinned vertices at deterministic 1/60 s spacing over complete intervals: 361/121/37/73/55/79/73/241 samples (1,040 total). This is browser deformation sampling, **not wall-clock 60 FPS, integrated director testing or physical-device performance**. Root and chair-base drift are zero; all sampled resident vertices show zero desk interior hits; pre-turn minimum hand front gap is .159997741 m. A one-way vertex test does not prove complete triangle collision, seat tangency or all action transitions. The separately applied 2.5 s smoothstep door diagnostic records 151 actual panel poses from 0° to 90°; frame sweep/camera crossing/near-frustum safety and actual EntranceCoordinator ownership remain NOT RUN.

The independent raw harness reproduces 30,240 desktop triangles / 398 draw calls and 29,256 mobile-view triangles / 362 calls. Those raw counts exceed the numerical 120/80 ceilings, and cannot support the maker's unconditional budget PASS. This is not a claim that the absent C2 batched production tier has been tested. Decoded asset buffer plus RGBA8/mipmap lower-bound accounting is 12,656,209 B (~12.07 MiB), excluding targets/shadows/driver allocations/quality derivatives/optional replacement overlap. A bounded warm local RAF diagnostic records 120 intervals per viewport: desktop median 16.700 ms / p95 16.700 ms, mobile-view median 16.700 ms / p95 16.800 ms. These RTX2060 headless vsync intervals are not contracted target device/network/cache/tier frame or GPU-time approval.

## Findings

**B3-01 — MEDIUM — invalid_measurement_evidence**
`deliveries/FINISH-B1-R2/scripts/generate-manifest-and-metadata.py:54`; contract `docs/planning/production-prompts/corrections-2026-10-10/02-GEMINI2-B1-R3.md:12`.

Trigger: Generate dimensions-anchors-check.json and rest-transforms.json from current scripts. Expected: Executable measurements derive evaluated geometry, world/local rest transforms, resource identity and tolerances from current exported bytes. Observed: Dimensions/anchors have literal expected and measured values with unconditional PASS; supplied rest-transforms contains local TRS only. This does not establish measured geometry. Independent new 25 checks and envelope/desk bounds are conforming; no wrong rigid geometry inferred.

Maker correction: Retain conforming assets, implement actual measured geometry/transform/bind-matrix/resource checks and bind raw results/tolerances to export SHA-256 in the fresh revision.

**B3-02 — HIGH — missing_required_behavior_evidence**
`deliveries/FINISH-B1-R2/scripts/test-browser-playback.mjs:531`; contract `docs/planning/reconciliation-packets/finish-contracts-r2/03-asset-bindings.md:80`.

Trigger: Run supplied browser clip and door validation. Expected: Full >=60Hz exported-deformation checks, loop/transition/repetition/cancel/interrupt outcomes and entire door/frame/camera clearance path. Observed: Each clip waits 200ms then unconditionally appends PASS. Door jumps between three angles with 100ms waits; no 2.5s progression or clearance oracle. Native Blender 60Hz evidence is separate. New independent browser diagnostics cover complete clip intervals and panel positions, but no supplied director, loop, transitions, 20 repeats, finite cancellation, skip/navigation/re-entry or frame/camera clearance evidence exists. These missing outcomes are NOT RUN, not observed collision failures.

Maker correction: Measure complete clips plus loop seams and actual action transitions; add genuine assertions/raw samples for twenty repeats and finite start/mid/end cancellation/skip/navigation/re-entry. Measure frame/hinge sweep and allocated camera aperture/frustum path with one direct-transform owner; preserve native results separately.

**B3-03 — MEDIUM — capture_provenance_and_budget_evidence**
`deliveries/FINISH-B1-R2/scripts/test-browser-playback.mjs:488`; contract `docs/planning/reconciliation-packets/finish-contracts-r2/03-asset-bindings.md:125`.

Trigger: Inspect supplied capture index/raw images and render budget PASS. Expected: Raw canvas/native/DOM distinct, true desktop/mobile surfaces, project/greeting captures, per-capture provenance and measured applicable tier/frame/GPU budgets or exact runtime-dependent NOT RUN owner. Observed: Five canonical view folders exist; project-focus/greeting-contact absent. browser-canvas.png is a compositor screenshot visibly containing DOM HUD. Mobile canvas actual1920x1080 conflicts with declared720x1280; setViewportSize never resizes renderer/canvas or camera aspect. Index provides bytes/hash only. 398 calls is unconditionally PASS with future batching cited; diagnostic reproduces398 desktop/362 mobile calls in raw harness. Target tier/cold/warm/network/overlap/GPU/frame-time proof is absent.

Maker correction: Supply true framebuffer readback alongside DOM/native captures, real resized mobile renderer/aspect, required focus/greeting views and complete per-capture provenance. Remove unconditional budget PASS; prove ceilings or explicitly mark C2 batching/tier and C3 target-profile thresholds NOT RUN. Request bounded Parent amendment for any new LOD/quality change.

**B3-04 — HIGH — observed_export_behavior_defect**
`deliveries/FINISH-B1-R2/scripts/build-resident-fixture.py:35`; contract `docs/planning/reconciliation-packets/finish-contracts-r2/03-asset-bindings.md:72`.

Trigger: Sample chair-root relative rest yaw at turn_to_visitor t=1.2000000477s; greeting_nod start/end; return_to_work start/end. Expected: Chair/body coordinated0->35degrees, hold35 greeting,35->0 return. Observed: Actual browser chair-root yaw0->125.000022505deg; greeting125.000022911deg; return125.000022911->0deg. Chair-root is a scene-root sibling with identity rest quaternion/unit scale; yaw is local/world Y relative identity rest, not inferred heading. Source TURN=radians(125) and current GLB rotation channel match.

Maker correction: Correct the maker motion generation/paired resident-chair exports to accepted35degree curve and validate all complete intervals/seams/clearances without retargeting skeleton or changing the contract.

**B3-05 — HIGH — observed_export_contact_defect**
`deliveries/FINISH-B1-R2/scripts/build-resident-fixture.py:308`; contract `docs/planning/reconciliation-packets/finish-contracts-r2/03-asset-bindings.md:74`.

Trigger: Sample actual skinned hand/finger vertices at coding_idle t=0 and return_to_work t=1.2999999523s; mouse_idle t=2s after full reach. Expected: Returned hands align to actual room keys; mouse action reaches actual room mouse and returns safely (contract lines70,74,80). Observed: Return/coding left-hand X[.095490,.191000], right[.409000,.504510] versus actual keycaps X[-.240000,.080000]: both horizontal bounds disjoint. Return wrists(.155000,.822000,-.815000)/(.445000,.822000,-.815000). Mouse final hand X[.564000,.659510] versus actual mouse X[.207500,.272500], wrist(.600000,.825000,-.800000); supplied mouse_reach remains1 at end. Old proof props X=.30/.58 differ from final room X=-.08/.24.

Maker correction: Bind hand/finger trajectories and finite mouse return to final room keyboard/mouse world geometry while preserving accepted roots and pinned skeleton; rerun actual exported browser contact/clearance/seam/cancel proof. Do not shift conforming room or add runtime offsets to hide the mismatch.

## Complete requirement matrix

PASS indicates only the stated scope. FAIL is an observed asset/evidence conformance defect. Missing execution or required artifact is NOT RUN; no invented collision, device, provider or deployment failure is asserted. All five FINISH-04 art correction requirements are covered below.

| Requirement | Result | Actual scope / evidence |
| --- | --- | --- |
| Actual delivery and exclusive fresh correction root | NOT RUN | FINISH-B1-R3 absent. Current R2 still audited by actual bytes; no failure inferred solely from folder label. |
| Current inventory/output/capture/accepted-contract raw identities | PASS | 86 current files;85 manifest output rows+manifest itself;85/85 candidate,23/23 capture,54/54 contract output rows match. Contract manifest SHA8038db...;20 prior candidate input bindings unchanged. |
| Prior independent Khronos validation | PASS | Preserved unchanged-byte receipt gltf-validator2.0.0-dev.3.10: all five exact exports0errors/0warnings; no validator rerun counted. |
| Required literal hooks, exact disjoint export/node ownership | PASS | Five contract exports; independent current parsed scene names have no cross-export duplicates; room zero animations; frame/hinge siblings and leaf child verified. |
| Correction1 actual measured rigid geometry and anchors | PASS | Independent25 checks(24 translations+Door_Leaf extent); room floor4.2x3.6m, ceiling lower plane2.8m; desk2.6x.8m,top.75m,centerXZ0,-1.15. Raw accessors+composed transforms, not metadata literals. |
| Correction1 maker measurement program/world-rest inventory | FAIL | Supplied program literal measured=expected; local-only inventory omits world TRS/mesh evaluated bounds/bind matrix comparison/resource ledger. New audit measurements do not make maker program measuring. |
| Pinned26-joint skeleton/local rest/inverse bind matrices | PASS | Independent reference SHAee50b195... against current resident:all26 joint local TRS unchanged;inverseBindMaxError0.0. |
| Eight paired clip names/accessor starts/durations | PASS | Actual exported accessors start0, durations6,2,.6,1.2,.9,1.3,1.2,4within1e-6s;actual browser resident/chair clip durations paired. |
| Correction2 deterministic browser deformation interval sampling | PASS | 1040actual Three.js CPU skin samples at1/60s across all8complete clips;not wall-clock60FPS or maker supplied behavioral suite. |
| Correction2 root/base drift and desk interior vertex diagnostic | PASS | Sampled root/base drift0;actual deformed resident vertices found0within desk_top interior across1040samples;one-way vertex test does not establish triangle surface collision/tangency. |
| Correction2 pre-swivel hand clearance | PASS | turn_to_visitor sampled minimum hand-front gap.159997741m>=.15m versus actual desk front;other phases have intended reach over desk. |
| Correction2 foot/seat contact surfaces | NOT RUN | Bounds/sole/pelvis samples recorded;no robust triangle/surface penetration/contact oracle evaluated. Do not convert grounded bounds/native results into complete browser contact PASS. |
| Correction2 contracted35degree visitor yaw | FAIL | Actual chair identity-relativeY yaw125.00002degrees; paired motion generationuses125. |
| Correction2 final actual keyboard/mouse contact and mouse return | FAIL | Actual skinned hand/finger bounds horizontally disjoint from final room props;mouse finite endpoint still at reached old-proof position. |
| Correction2 loop seams/actual transitions/20repetitions | NOT RUN | Not supplied or executed as action-director tests;endpoint data exists only. |
| Correction2 finite start/middle/end cancellation,skip/navigation/re-entry | NOT RUN | No current behavior receipts or bounded director wiring in art harness;unconditional200ms PASS insufficient. |
| Native Blender motion/contact execution in this re-audit | NOT RUN | Existing supplied native60Hz logs retained as maker evidence;Blender not re-executed and no native/device result inferred. |
| Correction3 door hierarchy/rest/zero competing exported clip | PASS | Exact tree/translations/panelextent conform;zero room animations is export ownership prerequisite only,not actual EntranceCoordinator owner proof. |
| Correction3 sampled entire direct door curve | PASS | Diagnostic applies contract3u^2-2u^3 over2.5s,151panelpositions0..90degrees and raw evaluated bounds;not actual maker/runtime timing test. |
| Correction3 full frame sweep and camera aperture/frustum clearance/sole runtime owner | NOT RUN | Three delivered angle screenshots are supplemental;no current crossing path/director/frame collision/camera near-frustum oracle mounted. No door collision failure claimed. |
| Correction4 canonical five view/capture files and byte bindings | PASS | Desktop-home/mobile-home/entry/monitor-detail/reverse-doorway,23PNG/comparison index rows allmatch. Not complete camera or raw framebuffer approval. |
| Correction4 true raw canvas/DOM/native separation and mobile dimensions | FAIL | Canvas screenshots visibly include overlapping DOM HUD;mobile canvas1920x1080 vs receipt720x1280. |
| Correction4 each project-focus and greeting-contact views | NOT RUN | Required captures absent in exhaustive current86-file inventory. |
| Correction4 per-capture camera/DPR/tier/light/browser/OS/GPU/network/cache/loaded-hash provenance | NOT RUN | Camera/exposure settings exist in source;capture index onlybytes/SHA;receipt filenames/viewports only. Aggregate declared provenance does not bind complete settings to each capture. |
| Exposure on existing supplied screenshot pixels | PASS | NewRGB>=245all-channels analysis:.3131desktop,.7892mobile,0entry,.3762monitor,.00048reverse%;priorbelow-ceiling exposure advice retained. These pixels are compositor captures,not raw framebuffer. |
| Reference faithfulness/likeness/outfit/personal-object/rights approval | NOT RUN | Main reference and3candidate captures viewed;no independent artistic/user likeness acceptance. Reference rights unknown declaration preserved;generated asset/license/likeness limits require maker ledger/userreview. |
| Correction5 file/entry/texture compressed-byte ceilings | PASS | room915508B,resident575900B,fixture86804B;essential1578212B<3MiB;standalonePNG452663B<1.5MB;embedded resource dedup/GPU full residency separately incomplete. |
| Correction5 raw harness renderer.info actualtriangles/calls | PASS | Desktop30240triangles/398calls;mobile29256/362;allfive modelsloaded,RTX2060ANGLE. Actualprofile named;not productiontier proof. |
| Correction5 supplieddrawbudgetPASS | FAIL | 398raw calls exceed desktop120numerically;rawmobile362exceeds80. SuppliedPASSunconditional;futureC2batchingcannotestablish currentPASS. |
| Correction5 asset-buffer/RGBA8+mipmap estimate diagnostic | PASS | Decodedassetlower-bound12656209B~12.07MiB;211uniquegeometries,64materials,7textureobjects;does not include targets/shadows/driver/qualityderivatives/overlap. |
| Correction5 applicable productiondesktop/mobileframe/GPU/tier/cold-warm/network/optional-overlapceilings | NOT RUN | 120localwarmRAFintervalsperviewportrecordedseparately;targetprofiles/fullresidency/C2quality-batchingabsent. C2ownsassembly/tier/batching;C3ownsviewport/mobileprofileverification. |
| PhysicaliOS/Androidthermal/assistive,provider/deployment/liveG7 | NOT RUN | No external-accountorphysical-deviceexecutionclaimed;not art browser proof substitute. |

## Evidence and next owner

`findings.json` and `verification-matrix.json` are the machine-readable dispositions. `glb-inventory.json` retains raw-derived hierarchy/world matrices, mesh vertex bounds, channel targets/ranges and inverse binds; `geometry-checks.json`, `skeleton-comparison.json` and `ownership-checks.json` bind the measured positives. `browser-deformation-results.json` retains all interval samples/contact bounds/door panel poses/resources. `focused-results-summary.json`, `browser-frame-diagnostic.json`, `browser-console.json` and `instrumented-maker-harness.html` bind focused browser scope/settings/console. `command-receipts.json` records actual exits/tool versions, including two corrected audit instrumentation/read errors. Native Blender checks were not rerun; physical iOS/Android/thermal/assistive and provider/live G7 work remain NOT RUN.

Gemini #2 owns fresh FINISH-B1-R3 correction: retain sound unchanged exports, correct the measured paired motion/contact defects, supply genuine measured geometry/behavior/capture provenance, and report budgets honestly. C2 owns later accepted runtime assembly/director/door/camera/tier/batching proof; C3 owns later viewport/mobile-profile behavior. Art-required motion/geometry/capture proof cannot be deferred to physical G7. Necessary new LOD/runtime changes need a bounded Parent amendment. No approval of reference rights, likeness/outfit/hair/personal-object or final art direction is inferred. Parent receives this REWORK advice and commits/pushes only the audit artifacts separately.
