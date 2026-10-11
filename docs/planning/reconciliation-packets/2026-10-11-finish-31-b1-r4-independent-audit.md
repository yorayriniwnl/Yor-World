# FINISH-31 - B1-R4-02 exact-candidate independent audit

Date: 2026-10-11 UTC. Status: exact-candidate cross-lane local audit reallocated after a root collision; implementation acceptance remains pending.

## Candidate binding

Audit only commit `7936fa981a24fe4af834ff250ffec8a7b02b09b3` on branch `codex/finish-b1-r4-02-glass-20261011`.

- Parent: FINISH-B1-R3 commit `1753b9278c4537b5377c3893172b2a0f26d13b10`.
- Full tree: `98f37af3f3b490a19a25677160c442fa7daef3fc`.
- R4-02 subtree: `7df14feefa5b89f02b07c0127992d15189848f7a`.
- App tree: `42ea29ec235225046a75959eb19eb386ac2f821d` (unchanged).
- Output manifest SHA-256: `370c7c4d621b4e7a1134685f54fa374662781b2162c0ff42b05aa9feeb10d191`.
- Package: exactly 200 allowed paths, 198 stable output-hash rows plus `output-hashes.json` and `evidence/package-verification.json` self-exclusions; 32,836,336 stable bytes.
- Final room GLB SHA-256: `d192a8154cc9e43adfef6b84beb0eaa64d40d2af464d8572fd4b0fcbf845baf5`.
- Native export SHA-256: `d421d5217c495728afb7a83815ac7b399a1516cf5edf80e2b3779cd218deb090`.
- Native authoring file SHA-256: `32a55d22fa682ad0cb48905411b1d139a3065f9b9d1dc7417d3e85c56956f7f4`.
- Source patch SHA-256: `15c1cb3740781a8234f352a0f5cf342d542eb6f47024825132ee1a9f7b45c513`.
- Patched authoring source SHA-256: `ea965a95d2f7aebb54e0819a1846f3b76e827f64098cfb6c784acc09696ad591`.

Parent's preflight confirms the exact parent, 200 changed paths all under R4-02, unchanged app tree, and no `2cc4419aa9e0670b9b3da36cfbbcdb472231589e` ancestor. Parent independently recomputed all 198 stable output rows and confirmed the 200-path inventory and all 200 eligible-origin hashes. The reviewer must independently reproduce these results from Git objects; maker evidence is not independent audit evidence.

## Preserved collision and prior discrepancy

The prior root `deliveries/FINISH-B1-R4/`, unpushed snapshot `2cc4419aa9e0670b9b3da36cfbbcdb472231589e`, eleven unknown R1 files, and two additional untracked browser-R1 files remain preserved. Do not inspect or use their unknown contents. The new candidate is a separate branch rooted at exact R3 and has no `2cc` ancestor.

The preserved snapshot contained a room GLB at SHA-256 `ede3258e39efa6d2641f1480baaf3cfd9d44c3915b4da243fc6d4011d8c3654b` and native export at `e80fcc64e881724990977bea5a4dbf88fc0be32b26c63a40733388eeed177411`, while replay receipts referenced `d192...` and `d421...`. The maker reports a clean exact-R3 rebuild produced the latter room/native hashes twice and added an assertion binding final receipts to raw committed files. Audit the new exact candidate without inferring correctness from those earlier reports; independently verify replay, outputs, and receipts.

## Reviewer and audit root

Reviewer: local Codex runtime-lane worker `/root/c1_r8_maker`, which did not author B1-R4-02. External GPT Plus #2 is NOT RUN.

The originally assigned root `deliveries/completion-audits/FINISH-B1/finish-07/20261011T145500Z-b1-r4-independent-review-01/` became occupied by a separate Parent-local review on branch `audit/finish-31-b1-r4-02-local-20261011` at commit `b25b0bd0b30fe97d7d7173c40bad694c675f026e`. Preserve that root and branch unchanged; they are not the assigned C1-R8 reviewer return and do not satisfy FINISH-31.

Use a fresh isolated worktree at the exact candidate commit. Recheck the reallocated root immediately before writing:

`deliveries/completion-audits/FINISH-B1/finish-07/20261011T175900Z-b1-r4-independent-review-02/`

Parent confirmed the reallocated root absent in both the canonical checkout and clean candidate worktree, and confirmed branch `audit/finish-31-b1-r4-02-c1-review-20261011` absent at allocation. If either becomes occupied, preserve it without inspecting and stop for Parent reallocation. Keep scratch under the root's `.work/`. Commit and push only that audit root on the scoped reviewer branch; do not modify the candidate branch.

## Required independent checks

1. Recompute commit, parent, tree, subtree, changed paths, app tree, all 200 package paths, the eleven exclusions, and absence of the old root and excluded files. Recompute all stable raw-file hashes and the two self-excluded file bindings. Verify that `2cc...` is not an ancestor.
2. Independently inspect the report, issue matrix, package-verification assertion, and source manifest. Confirm the preserved 72-file material-only checkpoint matches FINISH-25-R1's exact manifest and hash. Verify the candidate's admitted R3 input set and raw Git SHA-256 values.
3. Apply `source.patch` to the exact R3 authoring source in a disposable worktree. Independently replay the authoring and native/export steps where the environment permits. Confirm the committed native authoring file, native GLB export, and production room GLB are the actual reproduced outputs; verify every final receipt binds those actual raw bytes.
4. Diff native and GLB structure against the exact R3 inputs. Only the FINISH-25/25-R1 scope is allowed: `PC_TemperedGlass`; geometry edits to `pc_chassis_frame`, at most one `pc_internal_backplate`, the connected `wall_left` aperture component, and `window_frame`. Check all other object/node names, parents, transforms, material records and assignments, meshes, UVs, assets, runtime hooks, door/camera path, and production GLBs/textures remain exact. The prior contaminated native snapshot had out-of-scope object/mesh record differences on `Speaker_LED`, `speaker_left_cabinet`, `speaker_right_cabinet`, `StaticBatch__Room_Root__Plant_Foliage`, and `StaticBatch__Room_Root__Wall_SoftLavender`; explicitly verify these records are restored to their authorized R3 state.
5. Independently run the GLB structural validator, native/material/hierarchy/transform checks, exact desktop-home 1920x1080 and mobile-home 720x1280 browser profiles, and strict raw draw-call checks. Verify zero transmission-pass duplication, counts at or below 120 desktop / 80 mobile, fresh captures bound to the final source/render hashes, and the maker's 21 matched capture claims. Inspect captures visually for PC glass depth/readability and the window opening; do not infer visual acceptance from material properties or counts.
6. Verify all other four production GLBs and two textures remain byte-identical to R3. Report physical-device/provider qualification as NOT RUN if unavailable. Keep the positive-Y door/camera sweep and production door-transform ownership open; this correction cannot accept full B1 or authorize downstream C2/C3.
7. Return `report.md`, `findings.json`, `requirement-matrix.json`, candidate binding, commands/tool versions/exit receipts, and raw output hashes. Mark each result PASS/FAIL/NOT RUN. Recommend PASS or REWORK only for FINISH-25/25-R1 correction scope. Parent acceptance, canonical integration, deployment, G7, and external GPT Plus #2 remain separate.
