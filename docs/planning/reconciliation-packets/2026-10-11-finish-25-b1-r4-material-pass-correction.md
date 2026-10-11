# FINISH-25 — B1-R4 glass material and draw-call correction

Date: 2026-10-11 UTC
Status: Parent-authorized bounded maker assignment. It does not accept B1-R3 or authorize canonical integration.

## Candidate and frozen inputs

- Rework candidate: FINISH-B1-R3 commit 1753b9278c4537b5377c3893172b2a0f26d13b10; full Git tree 9759ac9879bcc9489770b7c5784ead2f022157b0; delivery subtree 0bc042af5add583314a7e0713c6db8793f5ca18b.
- Candidate package parent: 54c2448bbabb8bfb8bd7fd55ff4a25b3a4343feb.
- Accepted source baseline: f62a43c5e71c00dcb89e28275ea81d842167db80; app tree 42ea29ec235225046a75959eb19eb386ac2f821d.
- Required prior audit: FINISH-20 report at deliveries/completion-audits/FINISH-B1/finish-06/20261011T063200Z-b1-r3-independent-review-02-f6a91d/report.md.
- Frozen material/art direction: docs/planning/reconciliation-packets/finish-contracts-r2/03-asset-bindings.md and docs/planning/art-and-experience.md §7.
- Frozen budgets remain 120 raw calls for desktop and 80 for mobile.
- New exclusive output root: deliveries/FINISH-B1-R4/. It was absent at packet allocation. Recheck immediately before creating it; if occupied, preserve it and stop for Parent reallocation.

FINISH-20 independently measured 202 desktop calls (101 main pass + 101 transmission pass) and 146 mobile calls (73 + 73). It traced the duplicated scene render to the transmission material PC_TemperedGlass on StaticBatch__Room_Root__PC_TemperedGlass. Do not treat these counts as cumulative leakage or assume an unmeasured later runtime optimization.

## Authorized correction

Create a new isolated correction package from the exact R3 candidate. Resolve the transmission-pass draw-call failure by correcting only the material representation and the source/export steps needed for that representation in the room asset. Preserve credible, visibly glass-like PC case panels and any other surfaces that share the current material. Use the supplied main reference and the accepted art notes; prefer an art-directed, low-cost response over expensive real-time reflections.

Keep all geometry, UVs, object/node names, hierarchy, transforms, door and camera sequences, animation, interaction hooks, other asset groups, canonical app source, accepted contracts, and prior delivery bytes unchanged. If the glass cannot meet both the frozen visual and call budgets within this scope, report FAIL with evidence and a concrete amendment proposal; do not broaden the change silently.

## Required evidence

1. Bind every R3 input used to its exact commit/path/raw SHA-256. Return a replayable source patch and corrected room export in the R4 root, with an output manifest for the R4 package and a byte-level lineage table proving all unchanged R3 production outputs remain identical. Do not rewrite R3 or copy unknown-provenance material into R4.
2. Independently inspect the final room GLB material definitions and mesh assignments. Show that PC_TemperedGlass no longer invokes Three r180's transmission pass. Record every changed material field and every object that uses it. Show that no other production material changed.
3. Re-run the exact browser renderer harness on the R4 export for desktop-home 1920×1080 and mobile-home 720×1280, binding browser, renderer, camera, DPR, exposure, lights, loaded hashes, and command exits. Report raw renderer.info and intercepted calls by pass and owner. Both actual counts must be at or below 120 desktop / 80 mobile; assertion failure is a FAIL.
4. Provide matched R3/R4 desktop and mobile captures using the same camera and lighting settings, plus close views of the PC glass from outside and inside. The evidence must let an independent reviewer judge transparency/readability, reflections, edges, and reference fidelity. Do not call a material visually acceptable based only on its property values.
5. Run the applicable GLB structural validator, source/export reproducibility checks, hierarchy/transform/material inventory checks, and package hash verification. Record each as PASS, FAIL, or NOT RUN with its command, exit, version, and evidence path. Distinguish local Chromium/Blender results from physical-device and provider-backed evidence.
6. Return report.md, source.patch, corrected room asset/source, output-hashes.json, lineage/diff evidence, raw logs, matched captures, and a concise issue matrix. Commit and push only deliveries/FINISH-B1-R4/ after evidence is complete. Do not commit R3 or unrelated workspace files.

## Explicitly unresolved

The positive-Y door/camera sweep concern and production door-transform owner from FINISH-20 remain open. Keep the door and camera path out of this correction. A passing material/performance correction will not close those findings, accept the full art lane, authorize C2/C3, or establish production/device qualification. External GPT Plus #2 review remains NOT RUN unless an actual external review is separately supplied.

Parent retains independent audit and acceptance authority. The maker must not accept its own work.
