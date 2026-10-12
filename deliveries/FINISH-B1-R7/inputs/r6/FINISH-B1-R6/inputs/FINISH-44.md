# FINISH-44 — B1 full-reference room-detail correction

Date: 2026-10-12. Status: **Parent-authorized candidate work; no implementation or acceptance claimed.** This packet opens the next bounded correction after FINISH-35 improved palette values but left room composition, detail, prop richness, and prominent accent lighting below the main reference. The owner asked to continue execution and complete the remaining work.

## Exact input and governing source

- Use only the exact FINISH-B1-R5 candidate as the source input: branch `codex/finish-35-b1-reference-visual-correction-20261012`, commit `a5ebcc88170703751a5f504f67aed637d2f7d8e9`, full tree `d3dcb1ab82485749bd8b53f2b7cb9add2e576caa`.
- Its exact parent is FINISH-B1-R4-02 commit `7936fa981a24fe4af834ff250ffec8a7b02b09b3`; its delivery output manifest SHA-256 is `e961589754498b3b8770de38ec6516cd051c838267ed3f2db85248769556370a` (127 outputs / 18,529,345 bytes).
- The R5 package is a candidate input, **not an accepted or integrated baseline**. Keep R5 immutable. This packet does not replace its pending FINISH-43 review, Parent adjudication, or owner visual review.
- Read `AGENTS.md`, `START_HERE.md`, `docs/superpowers/specs/2026-09-30-yor-world-design.md` sections 7 and 10, `docs/planning/art-and-experience.md` sections 1–4 and 7–9, `docs/planning/validation-and-production.md` sections 1–3, `docs/planning/reconciliation-packets/finish-contracts-r2/03-asset-bindings.md`, FINISH-35, and FINISH-43 directly from the pinned source.
- The accepted canonical app tree is `42ea29ec235225046a75959eb19eb386ac2f821d`. It remains unchanged by this packet.

## Confirmed gap

R5 restores much of the proposed palette while preserving the R4-02 glass and geometry boundaries. Its own report and matched capture show that the room remains materially sparser and differently composed than the main reference. The large hex-light arrangement is weak; shelves/plants and layered desk objects are missing or under-detailed; the left console and microphone and right pegboard, controllers, and headset stand do not read as the reference setup. The chair's light upholstery is only partly visible. Treat full reference fidelity as **OPEN** until a fresh matched visual review; material values alone do not establish it.

The exact reference is `references/images/main-reference.png` (SHA-256 `37adfb0ee344642798978e954a0cfc8d9715eac1b3ca4e5a84ab87a228c53362`). Do not copy reference pixels into textures or imply its asset rights are known.

## Authorized scope

Create a new isolated candidate under `deliveries/FINISH-B1-R6/`, based on the pinned R5 package. Rework only static room and chair-fixture art needed to make the named anchors readable in the existing matched home views: bright drawer-supported ivory desk; blue-and-white chair; prominent pink/lilac hex lights; cyan fill and narrow warm monitor light bar; plant-lined shelves with a camera; central monitor and two round speakers; left console/microphone; right PC, controller pegboard, and headset stand. Use rounded stylized forms, restrained procedural materials, and a layered composition compatible with the frozen spatial layout.

Geometry, node, mesh, UV, and material additions or edits are allowed **inside the existing room and fixture asset groups only**. Keep the existing asset IDs, load groups, interaction hooks, anchor names, and number of runtime asset requests unchanged. Add static visible details only; no new interactive behavior or product claim is introduced. Preserve all known R4-02 glass/PC and window-geometry corrections from the R5 inputs. Preserve the accepted meter/Y-up runtime basis, dimensions, desk/chair placements, and one Blender-to-runtime axis conversion.

The packet is not authorized to change `app/`, application dependencies, asset-manifest schemas, camera profiles or transforms, entrance/door geometry or sweep, character rig or animation, route/UI, audio, service configuration, or another delivery. The B5 camera/door-transform ownership issue is separate. If a mandatory anchor cannot be made visible without changing a separately owned camera or contract, leave that boundary intact and report the exact blocker for Parent allocation.

## Required implementation and proof

1. Rebind the R5 input commit, tree, source and asset hashes directly from raw Git. Work in clean disposable scratch; do not open or alter any unknown `.work/` directory. Reproduce the room and fixture from delivered native source and scripts. Return actual editable `.blend` files and repeatable scripts; never fabricate Blender outputs.
2. Make the reference anchors legible in the exact existing `desktop-home` and `mobile-home` camera profiles. Do not adjust the harness camera, exposure, DPR, renderer effects, or image crop to improve a comparison. Capture fresh browser output and compare it side by side with the main reference and R5 captures. Report every anchor as PASS / FAIL / NOT RUN with the exact camera and evidence path. Distinguish art similarity from rights, runtime, or product approval.
3. Provide object/material inventories and a source/export diff. Verify preserved IDs, anchors, hooks, door/camera profiles, glass behavior, and untouched asset hashes. Report any new node names and why they are static and noninteractive.
4. Re-run the applicable Blender import/export, glTF validator, exact-profile browser checks, and performance/transfer checks. Preserve all frozen budgets: desktop/mobile essential transfer 6/3 MiB, full optional V1 transfer 14/7 MiB, visible triangles 300k/140k, draw calls 120/80, and asset-derived residency estimate 160/80 MiB. Measure calls, triangles, transfer, textures, frame samples, and load-group/request behavior together. Maker receipts are not independent review.
5. Return a stable package manifest, hashes, tool versions, exact commands/exits, logs, captures, material/geometry inventory, requirement matrix, and `report.md`. Mark each check PASS / FAIL / NOT RUN with evidence and limitations. Owner visual approval, independent audit, Parent acceptance, production integration, devices, providers, and G7 remain separate gates.
6. Commit and push only `deliveries/FINISH-B1-R6/` to a fresh candidate branch. Use the exact base above; preserve every earlier candidate and report. Do not merge, integrate, deploy, or claim art-lane acceptance.

## Candidate and audit boundaries

- Candidate branch: `codex/finish-44-b1-full-reference-detail-correction-20261012`.
- Candidate output root: `deliveries/FINISH-B1-R6/` only.
- The worker must first verify both paths are unused. If either is occupied, preserve its contents and report only the path and immediate names; do not inspect unknown work data or choose a new path without Parent reallocation.
- Return the pushed commit, exact parent/tree, raw file manifest, and actual files. The worker cannot audit or accept its own output. Parent will bind the delivery and allocate a separate independent review after it arrives.
- FINISH-35 / B1-R5, FINISH-43, the accepted app, public asset manifest, and historical evidence remain unchanged. R5's bounded palette audit, full-room owner judgment, and door/camera-transform ownership stay open.