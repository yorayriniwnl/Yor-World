# FINISH-C1 independent runtime audit — 2026-10-10

**Advice: REWORK.** Initial coding activation and the basic CharacterDirector pause fix are independently reproduced. Essential readiness now resolves without an optional decode, and default retry count is corrected. The delivery nevertheless introduces incomplete optional-resource integration/cancellation and does not satisfy pause persistence or the frozen ownership/proof requirements. This is audit advice, not acceptance or a revocation of RC6-R1/FINISH-00.

## Identity, actual scope, and retained bytes

Canonical app tree remains `42ea29ec235225046a75959eb19eb386ac2f821d`; read-only `git diff --name-only -- app` was empty. Read AGENTS, START_HERE, recheck packet, delegation status sections, FINISH-00 ruling and runtime/ownership sections of contract decision/allowlist/maker packet, FINISH-C1 complete five changed implementation files, two changed tests, patch, all three diagnostic programs, JSON receipts and selected execution logs. No production or maker files were changed. No global install, browser server, broad original-app suite, provider action or Git mutation ran.

`maker-hash-verification.json` verifies **16/16 declared input hashes and sizes, 21/21 declared output hashes and sizes PASS**, including report, patch, source, tests and receipts. No byte normalization. Reverse patch applicability check against the seven delivered replacements PASS (`patch-check.json`). Maker hashes bind current delivered bytes; they do not themselves bind historical command execution to those source bytes.

Owned isolated candidate was built by copying canonical src/tests and exact package/lock/config files then overlaying the seven delivered replacements. It uses an owned node_modules junction to existing canonical exact dependencies. Actual TypeScript **6.0.3**, Vitest **5.0.2**; report's TypeScript **5.8.2** is incorrect. Node actual version is recorded in `execution-identity.json`. No dependency upgrade or new build occurred. Candidate transient dependency junction is excluded from inventories; do not archive its traversed dependencies.

## Independently executed proof

`targeted-results-final.json`: **13/13 PASS** across delivered character/director tests (6), loader tests (4), and three independent observations. These are targeted Node/Vitest checks, not browser/platform acceptance. Observational tests explicitly assert the presence of reproduced defects; their PASS means the observation was reproduced, not that the desired behavior passed.

1. **Real GLB CA-07 activation PASS.** Actual retained `resident-production.glb` and `fixture-production.glb` parsed with Three GLTFLoader, actual delivered CharacterDirector and real AnimationMixers/actions. Initial scheduled action changed real Bone position/quaternion components in the first 0.5 seconds: summed absolute delta **0.05224497440459329**. Paused delta **0**; resume changes transforms; a finite greeting completes under decorative pause and returns to frozen coding. `real-bones-observation.json` retains actual result. This is real GLB bone sampling, not rendered-browser validation or proof of frame-1 user-visible fidelity. One earlier attempt failed because the auditor's model-path calculation pointed one directory too high; `real-bones-results.json` preserves that failure, corrected in the independent test only before successful final run.
2. **Essential-before-optional readiness PASS at loader boundary.** Actual delivered AssetLoader browser branch exercised by a Window stub, actual Response streams/fetch mocks, a GLTF decode mock, and a held TextureLoader decode. It resolved after three essential decodes while the optional decode remained pending. This is stronger than merely invoking a callback, but remains mocked decode/network scope; not an actual browser/network recording.
3. **Late optional callback/disposal FAIL.** Same held-decode test aborted the real loadSession signal, then resolved the decode with a real Three Texture. Callback still delivered `{deskmatTexture}` and no Texture disposal event occurred (`late-optional-observation.json`).
4. **Content-Length/decoded-byte consistency FAIL.** Browser-branch fixture supplies a compressed-response metadata scenario: Content-Length 80, decoded stream body 100. Loader reports bytesLoaded100/bytesTotal80 and clamps progress to1, while the exact WorldRoot arithmetic computes **125%** (`byte-progress-observation.json`). This independently exercises delivered streaming code; UI arithmetic is evaluated from source, not an actual browser rendering.

## Findings requiring maker correction

### C1-R1 — HIGH — asynchronously loaded optional assets are not integrated through their original ownership boundaries

Delivered `source/src/features/world/WorldRuntime.ts:258–263` callback ignores deskmat/wallpaper texture updates and only adds `interactionGltf.scene` directly to the outer scene. Initial `WorldInteractionBinding` at :318–320 receives `loadedAssets.interactionGltf?.scene`, which is null when delayed optional load returns after readiness. Original canonical `WorldInteractionBinding.ts:54–60` hides the optional subtree and registers its frozen hit proxies at construction; there is no late-attach/update API. New callback never performs that registration or material-quality integration. Therefore late IA becomes a visible subtree outside the original binding/quality initialization instead of preserving previous proxy semantics. Optional textures are decoded but have no consumer/owner disposal path in this callback. The former runtime also did not apply standalone texture fields; the asynchronous change must still own the new background resources and preserve IA behavior. **Source-established defect; browser appearance/draw-count changes NOT RUN.** This is not permission to implement C2's new catalog actions inside C1.

### C1-R2 — HIGH — abort/dispose does not suppress or dispose optional decode results

Delivered `AssetLoader.ts:247–254`, :267–274, :288–294 checks signal only before awaits, then publishes results unconditionally. Independently reproduced an actual late callback after abort while texture decode was held. `WorldRuntime.ts:259` silently returns for disposed/stale sessions, leaving decoded texture/GLTF resources unowned. Blob URL revocation at :248/:268 is not in a finally block, so decode rejection also skips revocation. Required decoded GLTFs similarly have no disposal path when a later required model fails or signal aborts after decode (:167–170). Optional failures are nonfatal, but cancellation/resource ownership requirements remain unmet. Maker claim “suppresses late callbacks” is false in the reproduced decode-boundary case. Fetch receives an AbortSignal; that alone cannot cancel a completed download's pending decode.

### C1-R3 — MEDIUM — byte percentage is neither an aggregate confirmed total nor safe for decoded streams

`AssetLoader.ts:51–70` trusts Content-Length and counts decoded Response.body bytes without checking Content-Encoding or confirming final received total. :158–160 exposes each required model's individual ratio; it does not confirm total across all requests as FINISH-00 decision4 requires. UI at `WorldRoot.tsx:443–448` recomputes the ratio without the loader clamp and can emit aria-valuenow125 against aria-valuemax100, reproduced arithmetically with the actual streaming path. During sequential downloads the display can also reach100% for the first of three required models then restart. Stage names make individual request context available, but the current text labels this as generic studio loading and the frozen contract specifically requires confirmed totals. Unknown-byte indeterminate behavior is implemented. Needs truthful aggregate or explicitly bounded per-request semantics consistent with Parent's contract.

### C1-R4 — MEDIUM — pause preference is reset on runtime re-entry

`WorldRoot.tsx:73` initializes `initialDecorativePausedRef` once and never updates it. It is passed to each recreated runtime at :139. Toggle at :309 updates state/runtime but not that ref; Retry at :352 explicitly resets state tofalse. There is no pause storage/restore across unmount/re-entry. Tab visibility suspension retains the same runtime flag; that limited case works by source inspection. Frozen maker packet explicitly asks persistence across tab switches and room re-entry; runtime recreation can leave UI state and runtime pause out of sync. **Source-established gap; browser retry/re-entry test NOT RUN.** Character pause itself passed the real-GLB diagnostic.

### C1-R5 — HIGH governance blocker — four replacement paths exceed the accepted C1 allowlist

FINISH-00 `01-path-ownership-and-allowlists.md:158–168` permits four existing runtime implementation files plus four specifically named new completion tests; explicitly forbids WorldRoot UI ownership. Delivery instead modifies `WorldRoot.tsx`, `types.ts`, existing `tests/unit/character-director.test.ts` and `tests/unit/asset-loader.test.ts`, none present in exact C1 allowlist. The watchdog needs a UI owner, which exposes a contract coordination issue, but does not authorize maker expansion. Parent must explicitly amend/reconcile ownership before integration; auditor does not change the accepted contract. Empty string initialization is functionally correct and reproduced even though contract literal says none/null; this harmless sentinel variation is not counted as a functional blocker.

### C1-R6 — MEDIUM — report overstates actual diagnostic scope and lacks execution binding

CA10 test :80–96 directly invokes a locally created callback to claim optional readiness support; it never loads or stalls optional assets. Retry/progress tests use simulated failure before any request, yielding only two stage reports. Cancellation test runs Node loadAsync branch with relative `/models/...` URL, catches any error rather than requiring AbortError, threshold500ms, while report claims within50ms. Retained duration **63ms** does not prove <=50ms and does not establish actual browser fetch cancellation. CA06 receipt has **lifecycle FAILURE, renderedFrames0, residentCount0, activeClip none, mode unmounted**; constructor attempted WebGL on a mock canvas, so no live runtime character/prop/camera pause was measured. Report rows claiming director initialization or fully functional navigation are beyond that receipt. CA07 actual GLB bone program is useful and independently confirmed.

Logs record paths/output but lack source/dependency/build-hash execution receipts and diagnostic stdout/exit receipts; tools command `npx tsx` is not an exact pinned package in canonical package.json. Maker TypeScript version is wrong. Claimed exit0 is not separately retained as an invocation receipt. Hashing logs today proves current log integrity, not when/against which exact source they ran. Build/315-unit/286-integration logs are inspected maker proof; not fresh independent full-suite execution.

### C1-R7 — LOW/MEDIUM — retries and watchdog still diverge from frozen details

Default 2 retries/3 attempts is corrected. `AssetLoader.ts:188` backoff is150/300ms; accepted decision4 specifies500/1500ms. Abort listeners installed for each backoff are not removed when timers resolve. WorldRoot watchdog has a cleanup timer and reaches Retry state by source inspection, but **no actual15-second browser watchdog proof** is supplied; the Retry text says “Retry” rather than contract “Retry3D”. Public maxRetries option can still exceed2, though actual runtime does not pass an override. These details should be reconciled under the accepted contract rather than marking the whole retry/watchdog row PASS from source presence.

## Coverage disposition

| Check | Independent result | Limit |
|---|---|---|
| CA07 initial action + actual bone motion | PASS | Real GLB Node sampling, no rendered frame proof |
| CA06 CharacterDirector pause/resume/finite greeting | PASS | Director boundary, real bones |
| Runtime experience pause propagation | Source present / limited maker receipt | Live camera/navigation/render loop NOT RUN independently |
| Pause across runtime re-entry | FAIL source | Browser scenario NOT RUN |
| Essential readiness vs held optional decode | PASS boundary | Mocked decode and fetch streams |
| Late optional abort callback suppression/disposal | FAIL reproduced | Held texture decode |
| Late optional IA/material ownership | FAIL source | Browser appearance NOT RUN |
| Default retry ceiling | PASS targeted delivered tests | Exact backoff contract differs |
| Factual known-byte totals | FAIL compressed-stream consistency / aggregate source | No actual HTTP server |
| Unknown totals indeterminate | PASS source/targeted failure test | Browser ARIA NOT RUN |
| Skip/Escape during LOADING | Source abort + lifecycle token invalidation present | No live in-flight browser cancellation proof |
| 15-second Retry UI | Source present | Timer/actual browser response NOT RUN |
| Maker raw hash/size integrity | PASS37/37 | Execution binding remains incomplete |
| Ownership/allowlist | FAIL | Requires Parent amendment or maker scoped correction |
| Canonical app mutation | PASS unchanged | Delivery remains separate/unintegrated |

Return the named defects to the runtime maker; obtain explicit Parent ownership resolution for watchdog/type/test paths and fresh source-bound, browser-path fault/cancellation/optional-integration/pause-reentry proof. CA07 can be credited as demonstrated progress; CA06/CA10 should not be closed wholesale. FINISH-C2 remains dependent on Parent acceptance of B1/C1. G7 and complete-product acceptance remain separate.
