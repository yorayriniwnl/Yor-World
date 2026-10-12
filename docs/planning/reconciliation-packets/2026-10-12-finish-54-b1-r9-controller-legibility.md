# FINISH-54 — B1-R9 fixed-frame controller legibility correction

Date: 2026-10-12. Status: **Parent-authorized maker packet; candidate work not yet delivered or accepted.** The owner reviewed FINISH-B1-R7's unchanged desktop/mobile captures and returned **Needs correction** for the targeted mobile pegboard requirement. The full panel fits, but the two mounted controller forms are too small and indistinct to read as separate controllers. This packet corrects those silhouettes while retaining the panel placement and both frozen camera profiles.

## Exact lineage and owned paths

- Candidate base: FINISH-B1-R8 commit `cb0af1174dcbd2cd714e6cd55de447ae3e8a15a6`, tree `6a779b74b6e2073b5d7f91e7ecb365fdabad6ddd`; direct parent R7: `876e119d100936fc821b8618c5aa0e057584b338`; R6 source baseline: `e8ea9187c1b6cd47b66ce7de9ad520daf9bd6baf`.
- R7's exact art, matched captures, source, package inputs, and FINISH-50 source-patch supplement are read-only candidate inputs. Preserve R6, R7, R8, their reports, and all historical evidence.
- New candidate branch: `codex/finish-54-b1-r9-controller-legibility-20261012`.
- New delivery root: `deliveries/FINISH-B1-R9/`. Worktree: `F:/Yor-World-B1-R9-FINISH54-20261012`. Both were confirmed unoccupied at packet creation. If either becomes occupied, stop without inspecting unknown contents and request a Parent reallocation.
- The accepted canonical app tree remains `42ea29ec235225046a75959eb19eb386ac2f821d`; no `app/` change is authorized.

## Authorized correction

Improve only the two static mounted controller silhouettes already embedded in the existing room asset groups. Use the R7 editable Blender source and bind every input to the pinned raw Git objects. Preserve R7's pegboard placement, full perforated panel, desktop right-side relationship, and 48-hole layout. Make the two controllers visibly distinct and recognizable as gamepads in the exact unchanged `mobile-home` capture at 720×1280; target at least 55×50 captured pixels per controller, a clear gap between the silhouettes, and no controller/panel overhang beyond a two-pixel rasterization tolerance. The central bridge, two grips, and button/control grouping must read as one gamepad shape rather than disconnected pale pieces. Confirm they remain legible in `desktop-home` at 1920×1080 without covering the PC fan face, headset, monitor, or speakers.

Use only existing geometry batches/material slots, preferably with no additional mesh partitions, materials, nodes, runtime assets, requests, or draw calls. The mobile draw-call ceiling is 80 and R7 reports 78; the corrected candidate must remain at or below 80. Do not add new draw-call-producing material slots. Keep all other frozen transfer, triangle, residency, and frame-sample ceilings in FINISH-44 and the validation specification.

Do not change `app/`, dependencies, schemas, IDs, load groups, requests, hooks, interactions, camera profiles/transforms, projection, FOV, exposure, DPR, viewport, crop, unrelated geometry/materials, door/path, resident rig/animation, audio, services, or route/UI. Do not replace the mounted art with a card, texture, screenshot, or unrelated prop. If the target cannot be met inside the current panel and budget limits, return the exact measured conflict and stop for Parent allocation.

## Required implementation and evidence

1. Use a clean isolated worktree at the exact R8 base above. Bind the R8 commit/tree, R7 and R6 raw Git input blobs, the R7 package manifest, and each input's bytes/SHA-256/blob ID before modifying anything. Do not use unbound staged copies as source authority.
2. Starting from the actual R7 editable `assets/source/room.blend`, edit only the paired controller component geometry in the existing static batches. Deliver the repeatable Blender edit/export scripts, edited `.blend`, native export, final runtime GLB, measured before/after geometry diff, and the exact `source.patch`. The patch must replay from the pinned raw R6 room GLB and Blender source to the exact R9 outputs; preserve FINISH-50's binary-patch replay properties.
3. Capture fresh actual browser renders using the exact unchanged R7 desktop and mobile profiles. Bind capture dimensions/hash, camera values, DPR, browser/build identity, requests, asset hashes, and the measured panel/controller bounds. Show matched R7/R9 comparisons with the main reference; do not crop or manipulate validation captures. Update every existing anchor row and identify any change in readability or overlap.
4. Run Blender 5.2.2 import/export checks, the pinned Khronos glTF validator, exact-profile browser checks, identity/hook/load-group/request invariants, patch replay, and all frozen performance/transfer budgets. Record actual tool versions, commands, exits, raw logs, and limitations. Never label inherited or maker-reported checks as independently rerun.
5. Verify the R9 delivery manifest against committed raw Git blobs, exact R8 parent/tree, only the declared R9 delivery-root changes, unchanged canonical app tree, and source-patch output hashes. Commit and push this candidate branch to GitHub.

Return `report.md`, exact input/output hash receipts, candidate/package manifests, geometry/correction diff, updated requirement matrix, source patch, raw logs, actual captures, browser/performance evidence, and native/source assets. Report each check PASS/FAIL/NOT RUN with its evidence. Mark owner re-review, separate GPT Plus #2 audit, Parent acceptance, physical-device/accessibility checks, provider/live checks, integration, and G7 as pending or NOT RUN unless they truly occur. The maker cannot audit or accept its own output; stop at the candidate handoff.
