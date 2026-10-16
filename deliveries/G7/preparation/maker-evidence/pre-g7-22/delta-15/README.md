# PRE-G7-23 delta-15 closeout

**Result: FAIL / unaccepted.** No safe render-call correction was completed. I am the local Codex maker substitute, not Gemini #3, and I do not accept this work. Branch `codex/pre-g7-22-home-scene-reference-fidelity-20261015` remains at source HEAD `26e87c8cd41f2745d165a74446ae1366f17f7bc1`. The experimental app and mirror edits were archived, then the assigned tracked source and test paths were restored. There is no source commit; the evidence closeout is committed separately.

## Final render-call ceiling comparison

The packet keeps quality tiers, shadows, DPR, scene content and semantics fixed. A numerically passing LOW-tier capture is not a valid substitute for the original tier.

| Viewport | Browser | Captured tier and render calls | Ceiling | Result |
|---|---|---:|---:|---|
| 1440×900 | Chrome | HIGH/MEDIUM: 132; later automatic LOW: 68 | 120 | **FAIL** at the original tier (+12). LOW passes numerically but is invalid evidence because the automatic quality controller downgraded it. |
| 1440×900 | Edge | HIGH: 132 | 120 | **FAIL** (+12) |
| 390×844 | Chrome | MEDIUM: 132 | 80 | **FAIL** (+52) |
| 390×844 | Edge | MEDIUM: 132 | 80 | **FAIL** (+52) |
| 320×600 | Chrome | MEDIUM: 132 | 80 | **FAIL** (+52) |
| 320×600 | Edge | MEDIUM: 132 | 80 | **FAIL** (+52) |
| 844×390 | Chrome | HIGH: 132 | 120 | **FAIL** (+12) |
| 844×390 | Edge | HIGH: 132 | 120 | **FAIL** (+12) |

The LOW-tier Chrome desktop result is not an optimization pass. The accepted PRE-G7-22 Chrome desktop capture was HIGH with 412 calls; the delta-15 screenshot used LOW with 68. The profile shows the unchanged automatic policy moving from HIGH to MEDIUM after 144 HOME frames while calls stayed at 132; another preserved profile later reached LOW, where calls fell to 68. Tier choice is frozen by the packet, so this adaptation cannot satisfy the ceiling.

## Where the 132 calls come from

The candidate’s per-frame report has 33 `BatchedMesh` batches, 189 meshes in batches (34 dynamic), 20 visible compatible singleton meshes, and 15 other visible opaque exclusions. Batching those dynamic meshes exceeds PRE-G7-23 static-geometry scope; the experiment is rejected and those changes are absent from restored source. Its main opaque pass is therefore `33 + 20 + 15 = 68` calls. Three.js also renders a transmission prepass: it submits the opaque list again except for four transmitting meshes, yielding 64 calls. The observed renderer counter is exactly **132 = 68 + 64**. Each pass contains 33 batch submissions, for 66 batch calls total; the remaining submissions are 35 in the main pass and 31 in the transmission pass, for 66 non-batch calls total.

This counter excludes shadow-map submissions: in the installed Three.js `WebGLRenderer.js`, `shadowMap.render(...)` runs before `renderer.info.reset()`, then the transmission and ordinary scene submissions increment `renderer.info`. Thus 132 is main/transmission work, not main plus shadows, and is a lower bound on total frame submissions. Triangle counts stayed within their ceilings; render calls are the recorded budget failure.

A grouped-geometry range merge was investigated and ruled out for these frozen sources. The successful source inspection covered 196 room, 7 resident and 59 fixture GLTF meshes and found zero `geometry.groups`. It provides no safe group-range canonicalization opportunity. The captured production batch report also retains packet exclusions; no exclusion was relaxed in the final source state.

## PASS / FAIL / NOT RUN evidence table

Command receipts are preserved at the linked paths. These command results ran against the rejected delta-15 experiment before source restoration; they are attempt results and must not be read as validation of the final branch HEAD.

| Check | Result | Evidence and qualification |
|---|---|---|
| Focused batching tests | **PASS** | 2 files, 46 tests. Includes the experimental eligibility/restoration/raycast/shadow/tier-material and supported/unsupported multi-draw coverage. Candidate only; not final-HEAD evidence. [`focused-final` receipt](commands/focused-final.receipt.json) |
| Full unit suite | **PASS** | 27 files, 329 tests. Candidate only. [`full-unit-final` receipt](commands/full-unit-final.receipt.json) |
| Integration run 1 | **PASS** | 27 files, 287 tests. Candidate only. [`run 1` receipt](commands/integration-run-1.receipt.json) |
| Integration run 2 | **PASS** | Consecutive unchanged command, 27 files, 287 tests. Candidate only. [`run 2` receipt](commands/integration-run-2.receipt.json) |
| Lint | **PASS** | `pnpm run lint`, zero warnings. Candidate only. [`lint` receipt](commands/lint-final.receipt.json) |
| Typecheck | **PASS** | `pnpm run typecheck`. Candidate only. [`typecheck` receipt](commands/typecheck-final.receipt.json) |
| Production build | **PASS** | `pnpm run build`. Candidate only. [`build` receipt](commands/production-build-final.receipt.json) |
| Composition E2E assertions | **PASS** | 6/6 Playwright tests passed. The same run’s required render-call assessments fail as shown in the ceiling table, so the E2E is not an acceptable final packet pass. [`E2E` receipt](commands/composition-e2e.receipt.json) |
| Required render-call ceilings | **FAIL** | All eight original-tier capture samples exceed their ceilings; the only lower count is the invalid auto-LOW Chrome desktop capture. See table above and per-viewport runtime snapshots under `visual-run/measurements/`. |
| Attempt-02 raw WebGL call profile | **FAIL** | The first raw extension sample overcounted because repeated `getExtension("WEBGL_multi_draw")` access wrapped the same extension object more than once. Preserved and explicitly excluded from final counts in [`attempt-03 README`](attempt-03/README.md). |
| Corrected attempt-03 profile entry | **FAIL** | The once-per-extension correction failed before capture: Playwright found `enter-studio-btn` but it was hidden; click timed out after 30 seconds. Exit 1; no usable corrected profile. [`receipt`](attempt-03/commands/chrome-1440x900-corrected-profile.receipt.json), [`stderr`](attempt-03/commands/chrome-1440x900-corrected-profile.stderr.bin) |
| Frozen-GLB geometry-group inspection | **PASS** | Completed on pinned Node 24.19.0; all 262 inspected GLTF meshes had zero groups. This rules out the proposed grouped-source optimization. [`result`](attempt-03/diagnostics/production-source-groups-rerun.json), [`receipt`](attempt-03/commands/source-group-inspection-rerun.receipt.json) |
| Pixel/scene parity | **FAIL** | The same-browser 1440×900 screenshots differ in 1,251,669 of 1,296,000 pixels (96.5794%); mean absolute RGB-channel difference 24.6002 and RMS 30.6744. This comparison is tier-confounded: accepted baseline HIGH/412 versus candidate automatic LOW/68. It establishes no parity and cannot attribute the foliage/color changes solely to batching. [`pixel-diff measurement`](visual-run/measurements/accepted-vs-delta15-desktop-chrome-pixel-diff.json), [`accepted screenshot`](../visual-run/screenshots/studio-reference-desktop-1440x900-chrome.png), [`candidate screenshot`](visual-run/screenshots/studio-reference-desktop-1440x900-chrome.png) |
| Restored source inventory | **PASS** | Tracked working tree is clean at the existing HEAD. Eight assigned canonical/mirror source and test paths match their HEAD path-filtered Git blobs. With `core.autocrlf=true`, `app/` is checked out as LF (`.gitattributes` specifies `eol=lf`) and `yorayriniwnl.in/` as CRLF; their raw SHA-256 values therefore differ even though the canonical filtered Git blobs match. This is Git-blob parity, not byte-identical raw worktree content. Both added experimental test copies are absent from source paths; the copies and patch remain archived. [`inventory`](attempt-04/final-source-inventory.json) |
| PRE-G7-23 acceptance | **FAIL** | Render-call and scene-parity gates remain unmet; maker does not accept the attempt. |
| Physical-device sessions / 10-minute soak | **NOT RUN** | Not needed to establish the current call-count failure; no physical-device results are claimed. |

All captured command receipts identify pinned Node `v24.19.0`; the commands ran in `app/`, where the repository-selected pnpm version is `9.15.9`. The corrected profile entry failure is retained as a failure, not replaced by an inferred count.

## Scene comparison and source state

The accepted and candidate desktop screenshots have matching dimensions and browser family, but they do not use the same quality tier. The 96.5794% changed-pixel rate is a real measured difference. Because the candidate moved from the accepted HIGH tier to automatic LOW, it cannot establish pixel parity or distinguish tier/capture variance from a batching visual regression. The observed foliage and lighting differences remain unresolved; no parity claim is made.

The rejected experiment’s exact tracked app/mirror patch is archived at [`attempt-04/delta15-experiment-rejected.patch`](attempt-04/delta15-experiment-rejected.patch), SHA-256 `cace91948a1992a6f34b6a3dd0d4499fd2febd89e1257197ddf4efe314ae4982`. Both added production-report tests are archived with SHA-256 `710fd409b12573e3e6fcf5cdbba3d5430d0d35b634659b1c8e85388cb16a67a5`; the patch and test sources are explicitly marked rejected/unaccepted. [`archive manifest`](attempt-04/source-diff-archive.json)

The canonical Git blobs after restoration match HEAD: `LowQualityBatch.ts` `f18dd492cb9a9433bb0db6c33b75ba7c9f15192e`, `WorldRuntime.ts` `06d463db4c1061f1b345c04868d520b56166970c`, `types.ts` `4fda5266b4fd645dbdd5ee69ab3c23b06e782da6`, and `low-quality-batch.test.ts` `3b51ac2aed9c83ee47bf05200a2b28f887ca5c03` in both app and mirror. Raw file hashes are listed separately in the inventory; line-ending conversion means raw app and mirror bytes are not identical.

## Bounded follow-up proposal

A new packet should target only static opaque submission reduction across the 33 distinct material batches. It should explicitly preserve authored material appearance, the original quality tiers/DPR, shadow casting, transmission behavior, mesh identity and raycasts, lifecycle, and both WebGL multi-draw-supported and unsupported paths. A material-table/atlas or equivalent renderer-level approach may be prototyped only with packet-owned scope, then tested against accepted-tier pixel captures and shadow/raycast semantics before any call-ceiling claim. Do not batch the dynamic meshes, relax exclusions, remove visible content, or meet the ceiling by lowering quality. The mobile gap is 52 calls, so singleton consolidation alone cannot solve this measured failure.

## Post-restoration source identity check

After the rejected experiment had been archived, a later reconstruction attempt found that the active branch still contained the restored PRE-G7-23 base source at `26e87c8cd41f2745d165a74446ae1366f17f7bc1`; the experimental implementation existed only in the rejected patch above. The newly copied production-report test therefore failed against the base diagnostics shape (`focused-rebuild`, 43/44 tests; receipt in `commands/focused-rebuild.receipt.json`). This is not candidate validation and does not change the original attempt results. The focused frozen-world binding check passed 5/5 on that base source (`frozen-binding-rebuild.receipt.json`), also not candidate validation.

The reconstruction was discarded rather than presenting those old measurements as source-bound proof or recommitting a candidate already known to miss its ceilings. The canonical source and mirror remain at the pushed base commit; this delta contains failure evidence and the required renderer/asset follow-up proposal, with no accepted source correction.

## Source inventory and attempt chronology

The exact per-path Git blob IDs, raw worktree SHA-256 values, patch hash, added-test hashes, and preserved receipts are in [`attempt-04/final-source-inventory.json`](attempt-04/final-source-inventory.json) and [`attempt-04/source-diff-archive.json`](attempt-04/source-diff-archive.json). Attempts 01 through 03 and their failures remain in place; attempt 04 is the archival rejected patch and restoration record. No earlier delta artifacts were removed or overwritten.
