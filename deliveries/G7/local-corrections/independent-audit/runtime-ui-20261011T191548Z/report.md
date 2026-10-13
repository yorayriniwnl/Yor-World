# Independent local runtime/UI audit

**REWORK: two optional-interaction defects reproduced.** Current focused application tests pass, but optional hit proxies can activate hidden or occluded targets. No product source was changed. This is local Codex audit only, not external GPT Plus #2 review, source acceptance or G7 acceptance.

Worktree: `C:\Users\yoray\Projects\Yor-World-Local-Corrections`; branch `fix/local-studio-check`; observed HEAD `823b90352b3ebd0d84cedf7b59cdfcdfb022449d`. The application has uncommitted corrections, so HEAD alone does not identify the tested source. Exact 34-file source/dependency inventory SHA-256: `f5ee79a1e8ae7ebb31b120bed1b6f0b52d50d515d0c64d73e56475bc0fdb817d`. Input/source hashes were unchanged across focused execution (`after-hashes.json`).

**Actual independent execution:** 120/120 unit cases in 12 files and 9/9 integration cases in 2 files passed, both exit 0. Four new independent raycast cases returned 2 PASS/2 FAIL, exit 1. These are 133 unique cases, 131 PASS/2 FAIL. Archived browser receipts are separate and are not added to this count. An initial audit config discovered zero probe tests; that harness error is preserved and was corrected only in the audit root.

**RUI-01, MEDIUM ? FAIL**, `app/src/features/world/WorldInteractionBinding.ts:115`. Put an opaque unregistered wall between camera and monitor, then attach a valid optional monitor proxy and click center. Expected: solid occluder prevents activation. Observed: production hit traversal breaks at the wall, then the proxy loop still opens the launcher. Actual Three.js raycast/controller reproduction: `optional-probe.test.ts:25`; raw failure in `optional-probe-results.json`.

**RUI-02, MEDIUM ? FAIL**, `app/src/features/world/WorldInteractionBinding.ts:122`. Hide the monitor mesh while its optional proxy remains and click center. Expected: hidden target stays inactive. Observed: proxy identity/bounds checks accept the hidden target and open the launcher. Actual reproduction: `optional-probe.test.ts:31`. The fallback needs the same target visibility/occlusion semantics as the essential mesh path; the assigned maker owns correction.

The current source also preserves the tested sound correction. Full-09?s reported sound issue was an observation-sequence failure: diagnostics had been closed before polling. The revised test reopens it and requires runtime plus saved preference state. Archived corrected Chrome/Edge cases pass 2/2, and isolated actual-monitor focus cases pass 2/2. The archived full run remains 245 passed/3 failed; the parent?s fresh combined E2E is concurrent and is not accepted by this audit.

| Scope | Result | Evidence and limits |
| --- | --- | --- |
| Camera composition/continuity/cancellation | **PASS** | camera unit cases and production-camera integration; measured source presets, container ResizeObserver, transition listener/RAF cleanup inspected. |
| Bounded essential/optional loader and exact resource release | **PASS** | current asset-loader tests cover held optional network, retry cap, early required failure, late GLTF/bitmap cleanup and pre-prune shared resources. |
| Lifecycle/replay/recovery/hidden-tab single render chain | **PASS** | world-runtime-recovery and lifecycle unit tests; init/context-loss/teardown/one-session replay source inspected. |
| Pause freezes decorative advancement; navigation remains usable | **PASS** | world-runtime-recovery Node regression, independent camera RAF and controller navigation inspected. This scope does not establish physical/rendered timing. |
| Essential monitor action before optional arrival and stale binding attachment | **PASS** | new independent probe 2/2 positive cases; existing named-monitor test also passes. |
| Optional proxy occlusion and hidden-target consistency | **FAIL** | RUI-01 and RUI-02: real raycast probe activates launcher in both forbidden cases. |
| Rigid/multi-draw/portable and constant batching safeguards | **PASS** | current tests pass layer/attribute/detachment/material/color/shader-link fallback/owned-resource checks. GPU pixel equivalence and numerical budgets remain NOT RUN by this audit. |
| Saved quality/sound and explicit audio gesture | **PASS** | current shared-store source and Node test pass; latest corrected archived Chrome/Edge focused receipt 2/2, same WorldRoot/WorldRuntime/audio fingerprints. |
| Dialog keyboard containment/entry/return and route focus | **PASS** | source checked plus archived full-09/local focused receipts; independent browser execution NOT RUN here. |
| Six viewport accessibility/layout E2E | **PASS** | full-09 archived receipt reports both browsers passed six required cases. Physical devices and manual assistive technology NOT RUN. |
| Full final current-source combined browser E2E | **NOT RUN** | Parent concurrent run pending; full-09 has 245 expected/3 unexpected; follow-up 2 sound and2 monitor isolated cases pass. Do not treat isolated delta runs as complete-suite acceptance. |
| Native GPU visual/transmission/shadow comparisons and all inclusive budgets | **NOT RUN** | No new actual renderer/pixel/budget measurements in this audit; custom material batching remains subject to independent admission evidence. |
| Provider/hosted/physical/assistive/G7 acceptance | **NOT RUN** | Local audit only; no production access or authority inferred. |

Relevant raw source fingerprints:

| Path | SHA-256 |
| --- | --- |
| app/src/features/world/CameraDirector.ts | `ef700da9a91df80fd877bf65d8e28ff31cd5ae2f6f32bab2009f688f805e7a9b` |
| app/src/features/world/WorldRuntime.ts | `effefb7ecdf6ce0340d4b5e5d6053a42602dfedfaad7f700a64b77c48a3ff58b` |
| app/src/features/world/WorldRoot.tsx | `3d919699dff257d370167847ea1a78f9da849a14c763f518b7e3a0aaaca3e0f1` |
| app/src/features/world/WorldInteractionBinding.ts | `c03c8b8727915a455a7b8fec1a7b2a7f614a308973964613087cf472dba56919` |
| app/src/features/world/ConstantMaterialBatch.ts | `928e6648d100aac91344e510dad9106655f796a9dcc7b3c5ea703b94b1eae3d5` |
| app/src/features/world/RigidWorldBatch.ts | `b3dafb3d14cfbf70b374a6b32a1204d2401d54136695ea3eebd1c9f851829415` |
| app/src/ui/ModalDialog.tsx | `97d57fc0f920899e1eb3a918381e2fb6912c96cb3a849752a5fabd73c9193b81` |
| app/tests/e2e/local-studio-usability.spec.ts | `9a7f68239e699e68cf10334f221bc3fe3ef24c12d2954c385caf17b58113a820` |
| app/public/asset-manifest.json | `1f432a4a42564e017b5c6377fd6e58a0916656c378ee6a2fa9b474130a990d29` |

Node 24.19.0 and Vitest 5.0.2 were observed locally. Raw input/output manifests, command arguments/cwd/exits/stdout/stderr, actual test JSON, before/after hashes, and browser-receipt summaries accompany this report. Tests use existing pinned app dependencies. No browser/build/server/provider mutation was started by this audit; no physical, native GPU, heap/GPU leak-absence or <=50ms browser cancellation claim is made. Parent owns Git coordination and separate acceptance.
