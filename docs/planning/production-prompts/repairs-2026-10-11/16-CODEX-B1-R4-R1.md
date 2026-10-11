# Local Codex art-maker: FINISH-B1-R4-R1

Read `AGENTS.md`, `START_HERE.md`, and the exact inputs listed in:

- `docs/planning/reconciliation-packets/2026-10-11-finish-25-b1-r4-material-pass-correction.md`
- `docs/planning/reconciliation-packets/2026-10-11-finish-25-r1-b1-glass-visibility-amendment.md`
- `deliveries/completion-audits/FINISH-B1/finish-06/20261011T063200Z-b1-r3-independent-review-02-f6a91d/report.md`
- `docs/planning/reconciliation-packets/finish-contracts-r2/03-asset-bindings.md`
- `docs/planning/art-and-experience.md` §7

Work only in `deliveries/FINISH-B1-R4/`. The root is already assigned and contains an in-progress material-only stage. Preserve `checkpoints/material-only/` and its manifest byte-for-byte. Base all final source/export changes on exact FINISH-B1-R3 commit `1753b9278c4537b5377c3893172b2a0f26d13b10`; do not modify R3 or prior audit roots.

The material-only checkpoint removed the transmission-pass failure (102 desktop / 74 mobile raw calls) but its PC pane is occluded by the closed white chassis. The shared material's window pane is also occluded by the wall and frame. FINISH-25-R1 authorizes only these visibility fixes: (1) replace `pc_chassis_frame` with an open-minimum-X five-wall shell in the exact old bounds; (2) add at most one small `pc_internal_backplate` node using existing `Baseboard_Charcoal` inside that same case envelope; (3) open only the existing `wall_left` batch component at the exact window aperture; and (4) replace only `window_frame`'s cuboid with four border strips in its exact old bounds. Keep every other asset, component, UV, transform, hierarchy, camera, door, animation, fan/LED hook, blind, glass pane, material binding and runtime file unchanged.

Follow FINISH-25 and FINISH-25-R1 for exact bounds, triangle expectations, ceilings, preserved materials, source replay, captures, budgets, manifests, and stop conditions. Do not extend geometry or add outdoor/daylight content. If the authorized visibility changes cannot preserve the strict budgets or unrelated component identities, stop and report the exact evidence rather than expanding scope.

Return actual files with PASS/FAIL/NOT RUN evidence. This is a local Codex maker assignment, not an external Gemini execution. Do not self-approve. Commit and push only the completed R4 root; Parent owns independent audit and acceptance.
