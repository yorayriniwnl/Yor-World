# FINISH-31 B1-R4-02 parent-local re-audit

**Recommendation: PASS for the bounded FINISH-25 / FINISH-25-R1 correction only.** The fresh exact-base replay passed the material, geometry, export, validation, renderer-budget, and capture checks. Parent acceptance, external GPT Plus #2 review, canonical integration, and full B1 art acceptance remain pending.

## Candidate binding

- Candidate: `7936fa981a24fe4af834ff250ffec8a7b02b09b3` on `codex/finish-b1-r4-02-glass-20261011`.
- Exact parent: `1753b9278c4537b5377c3893172b2a0f26d13b10`; candidate tree: `98f37af3f3b490a19a25677160c442fa7daef3fc`.
- Delivery subtree: `7df14feefa5b89f02b07c0127992d15189848f7a`; canonical `app/` tree remains `42ea29ec235225046a75959eb19eb386ac2f821d`.
- The commit changes exactly 200 paths, all under `deliveries/FINISH-B1-R4-02/`. The old `2cc4419...` collision commit is not an ancestor. Its files and the eleven unknown R1 paths were not read.
- Output-manifest SHA-256: `370c7c4d621b4e7a1134685f54fa374662781b2162c0ff42b05aa9feeb10d191`.

## Results

| Area | Result | Evidence |
| --- | --- | --- |
| Exact Git package | PASS — all 198 stable output rows match raw Git blobs; exact 200-path allowlist and excluded paths verified | `evidence/package-verification.json` |
| Declared inputs | PASS — 28 commit/path/raw-byte receipts verified against their named Git blobs; no collision inputs referenced | `evidence/input-hash-reverification.json` |
| Material and scope | PASS — `PC_TemperedGlass` is alpha-blended at 0.18 with zero transmission; only the four authorized material fields differ; all other materials and unauthorized primitives match | `evidence/final-material-inspection.json`, `evidence/final-lineage.json` |
| Geometry | PASS — only the authorized PC shell, backplate, left-wall aperture component, and window frame change; +132 triangles; 72-file material-only checkpoint verified | `evidence/final-lineage.json`, `evidence/native-geometry-diff.json` |
| Native and production export | PASS — two fresh Blender/export passes reproduce the committed room GLB byte-for-byte (`d192a815...baf5`); native source is compared by reopened semantic inventory because `.blend` container bytes are timestamp-sensitive | `evidence/final-export-reproducibility.json`, `evidence/native-source-export-parity.json` |
| Structural validation | PASS — five GLBs, zero errors and zero warnings | `evidence/gltf-validation.json` |
| Browser and budgets | PASS LOCAL — desktop 103/120 raw calls, mobile 75/80; 103/75 intercepted calls, main pass only, one frame delta, all five GLBs loaded | `evidence/browser-results.json`, `evidence/final-budgets.json` |
| Captures | PASS — 21 fresh captures reverified for hashes, matched settings, loaded asset hashes, and budget assertions | `evidence/capture-reverification.json` |
| Bounded visual correction | PASS — supplemental PC view shows the tinted glass plane, its edges, and case depth; outside window view exposes the room through the authorized opening. The normal PC close view includes the cyan effects plane, so the matched supplemental view hides only `Project_Effects_Root` for glass inspection. | `evidence/captures/` |
| Full reference fidelity | FAIL / OPEN — the full-room image remains much darker and simpler than the accepted main reference. This correction did not authorize broader lighting or asset redesign. | `evidence/captures/desktop-home.png` |
| Door/camera ownership, physical devices, provider qualification, recovery, G7 | NOT RUN / OPEN — outside this correction | FINISH-20 and G7 ledgers |

The bounded glass correction removes the duplicated transmission pass while retaining a low-cost translucent pane and the authorized visibility geometry. The supplied images do not establish reference-grade reflections; those remain an art-quality limitation, not a hidden PASS. Full-scene art and B1 acceptance are not claimed.

## Execution notes

The isolated candidate worktree remained clean. A fresh replay ran 11 checks successfully: two native geometry/export passes, final lineage, native/material parity, five Blender imports, GLB validation, Chromium rendering, capture re-verification, and asset budgets. Tool versions and raw command exits are recorded in `evidence/final-check-commands.json` and `tool-versions.json`.

The first replay attempt hit Git's Windows path-length limit inside nested scratch. The rerun enabled `core.longpaths=true` only in the disposable replay copy and passed. The candidate was not modified. The aggregate maker input-binding script was not rerun in the isolated shallow repository; instead, all 28 declared inputs were independently hashed against their named Git blobs in the primary repository. The preserved collision snapshot was unavailable in the isolated repository and was not read.

Reviewer: Parent-local Codex cross-lane re-audit; this reviewer did not author B1-R4-02. External GPT Plus #2 was not run. This is a review recommendation, not Parent acceptance, canonical integration, publishing authorization, or G7 acceptance.
