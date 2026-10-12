# FINISH-47 — B1-R7 mobile pegboard correction

Date: 2026-10-12. Status: **Parent-authorized maker assignment; no implementation or acceptance claimed.** FINISH-44 delivered a strong static-detail candidate, but its full right-side controller pegboard is outside the frozen `mobile-home` frame. This packet allocates that specific failure for correction while retaining both camera profiles and all accepted runtime contracts.

## Exact input and governing source

- Base only on FINISH-B1-R6 commit `e8ea9187c1b6cd47b66ce7de9ad520daf9bd6baf`, tree `60da77df9e600670a416635101558203872bde7b`, branch `codex/finish-44-b1-full-reference-detail-correction-20261012`.
- Its exact parent is FINISH-B1-R5 commit `a5ebcc88170703751a5f504f67aed637d2f7d8e9`; FINISH-44 delivery manifest SHA-256 is `80d6cb214cf9f1f74334268193365b9f9115c86b884c6762072d777d65c30525`.
- Keep R6 immutable. Create a separate R7 candidate and delivery root; do not use or inspect unknown `.work/` data.
- Read `AGENTS.md`, `START_HERE.md`, FINISH-44, the R6 report, its `evidence/requirement-matrix.json`, the design specification sections 7 and 10, art-and-experience sections 1–4 and 7–9, validation-and-production sections 1–3, and the exact R6 source/build inputs.
- The accepted canonical app tree remains `42ea29ec235225046a75959eb19eb386ac2f821d` and must not change.

## Authorized correction

Create `deliveries/FINISH-B1-R7/` from the exact R6 inputs. Correct only the right-side static controller pegboard composition and its mounted controller geometry, using the existing room/fixture asset groups and material batches. The panel may be repositioned or reoriented onto the front-facing portion of the right workstation wall so it stays beside the PC/headset and fully reads in the unchanged mobile view. Keep it a clearly perforated/slotted pegboard with at least two distinguishable mounted controllers. Preserve the desktop right-side relationship and avoid obscuring the PC fans, headset, monitor/speakers, or any other required anchor.

Do not change `app/`, dependencies, schemas, asset IDs, load groups, runtime requests, interactions/hooks, camera profile or transforms, projection, FOV, exposure, DPR, viewport, crop, door/path geometry, resident rig/animation, audio, services, route/UI, or any unrelated geometry/material. Retain all FINISH-44 improvements and glass/window fixes. If a fully legible panel cannot fit under these constraints, return the exact measured obstruction and a Parent allocation proposal instead of weakening the camera or substituting a controller card.

## Required proof

1. Verify the exact R6 base, raw-Git input hashes, package inventory, and report/matrix bindings. Use a fresh isolated workspace and a new R7 output directory. Return source, edit scripts, editable `.blend` files, actual exports, a scoped source patch, input/output hashes, and a concise report.
2. Capture actual browser renders at the exact existing `desktop-home` and `mobile-home` profiles from FINISH-44. Bind camera values, viewport, DPR, browser/build identity, asset hashes, and capture hashes. Do not adjust the camera or image crop. Compare R7 and R6 side by side with the main reference.
3. Mark every anchor in the existing matrix. The mobile pegboard passes only when the full panel and at least two controllers are in-frame and individually recognizable. A detached display card, partial panel, or controller-only view does not pass. Confirm all other R6 anchors remain readable and no new overlap was introduced.
4. Re-run Blender import/export, pinned Khronos glTF validation, exact-profile browser checks, identity/hook/load-group/request invariants, and all frozen transfer, triangle, draw-call, residency, and frame-sample budgets. Report each exact command, version, exit status, raw log, and limitation. Maker evidence remains subject to independent review.
5. Confirm the candidate changes only its delivery directory, canonical `app/` remains unchanged, no R6 input blobs changed, and the R7 output manifest matches committed raw Git blobs. Commit and push the narrow R7 delivery on its candidate branch per `AGENTS.md`.

Return `report.md`, `input-hashes.json`, `output-hashes.json`, a correction diff, updated requirement matrix, raw logs and actual captures. Mark visual owner review, independent GPT Plus #2 audit, Parent acceptance, device/provider tests, integration, and G7 as pending or NOT RUN unless they truly occur. Stop at the delivered-candidate gate; do not integrate or claim B1 completion.
