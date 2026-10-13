# FINISH-C1-R3 preliminary maker feedback

This is independent read-only feedback while the maker is active. **Candidate binding is incomplete; no complete-scope audit, production acceptance or finding closure is claimed.** Parent requested this fresh note; no maker files, canonical source or prior audit were changed.

Review references: accepted FINISH-04 assignment and FINISH-00-R2 runtime/ownership contracts; current Runtime Prompt 03; Auditor Prompt 04; October 11 re-audit findings RT-RA-01 through RT-RA-15 and parent C3-01 through C3-05.

## Identity and review limit

- Governance HEAD observed: 12f561222f2ef6e21286d68edd4427046b837eca.
- Exact maker base: f62a43c5e71c00dcb89e28275ea81d842167db80; accepted app tree: 42ea29ec235225046a75959eb19eb386ac2f821d.
- Actual accepted design output-manifest SHA-256: 8038db147824b0a31de1028c330383352177020b2247dd627d1674d6dc14c6af; matching ruling records ACCEPTED DESIGN only.
- First review snapshot: 2026-10-10T23:21:17.4681667Z; 29 replacement/test files and patch 2714b37d297fceb064995b5e9f52ee1e9ee1bafc5d6874c2b12c9510917651c9.
- Subsequent snapshot: 2026-10-10T23:23:59.6078263Z; patch 6c147c6c9f51892196e6740b63e13a9521d55985996039d326e677a0270a7800. Source/test edits and regenerated patch occurred during inspection.
- input-hashes.json appeared during review. All 16 declared file SHA-256 values and byte counts agreed when inspected.
- At the latest root inventory, report.md and output-hashes.json were absent.
- The original patch receipt covered six stale source files. A later regenerated receipt covered the current production files, but the current browser spec was still newer than that receipt at 23:23:38Z. Final applicability must bind the final source bytes.
- See [source-snapshots.json](source-snapshots.json) for the two actual file-by-file identities. These snapshots document partial review and are not a release manifest.

No tests or patch-application commands were executed by this reviewer while source was mutating. Recorded maker log tails show 347 unit tests, 289 integration tests and three Chromium cases; these are inspected logs, not independent execution or final source/build bindings. The useful mocked resource/material tests do not establish browser deformation, native providers, real devices or live deployment.

## PRE-C1R3-01: final handoff and applicability binding missing

Related IDs: RT-RA-01 and all complete-scope evidence requirements. Severity: audit blocker while incomplete.

Paths: deliveries/FINISH-C1-R3/source.patch; evidence/patch-check-receipt.json; source/tests/e2e/world/completion-loading-pause.spec.ts; missing report.md/output-hashes.json.

Trigger: review source/ after the earlier exact-base apply receipt, or use the recorded suite counts as proof of the current replacements.

Expected: stable final replacement inventory, UTF-8 patch, exact-base real check/application and byte agreement, final source/build/evidence hashes, requirement matrix and report.

Observed: source and browser tests changed during this review. The patch was regenerated once, while the browser spec still exceeded that receipt. Required final report/output manifest were absent. This is expected ongoing maker work, not a final rejected handoff.

Requested correction: finish the maker return; regenerate patch/check/apply agreement after the final source edit; preserve raw command receipts and final build/test source bindings; publish an exhaustive output manifest excluding itself/caches/credentials. Announce the stable handoff for a new coherent independent audit. Do not infer applicability from the earlier PASS receipt.

## PRE-C1R3-02: late GLB color maps do not preserve mapping conventions

Related IDs: RT-RA-14 / C3-05. Severity: HIGH provisional code finding. Inspected RuntimeMaterialQuality.ts SHA-256: 9af1b0bd5de16e779ca2fef61f49ad92e2235d88f879858185cac33805734be8.

Path/line: source/src/features/world/RuntimeMaterialQuality.ts:67-78; caller source/src/features/world/AssetLoader.ts optional TextureLoader decode.

Trigger: decode deskmat/wallpaper through TextureLoader and adopt onto the current GLB targets; or adopt where the target's original map has a nondefault UV channel/offset/repeat/rotation/wrap transform.

Expected: preserve the actual GLB UV/texture mapping and correct GLTF flipY convention, sRGB, current-tier LOW/HIGH derivatives, base fallback and atomic rollback.

Observed from source: installColorMap sets only colorSpace before assigning the same incoming texture to every cloned target material. No flipY, UV channel or map transform is carried from the actual GLB map. TextureLoader's incoming image texture uses its default orientation. Read-only GLB JSON inspection confirmed the current desk_mat uses baseColorTexture index1 and monitor_screen_center uses baseColorTexture index3 plus emissiveTexture index2. No other inspected caller establishes GLB image orientation or per-target transforms. Runtime Prompt 03 explicitly requires GLTF flipY correctness. Rendered misorientation is inferred from the source; it has not been executed by this reviewer.

Requested correction: retain per-target GLB map orientation/channel/transform while safely owning any derived textures, retain sRGB and rollback, and add a meaningful nondefault mapping regression. Execute source/build-bound browser proof using the real desk_mat and monitor_screen_center after late loading and LOW-to-HIGH-to-LOW. Inspect the actual monitor image with its retained emissive map; target names alone cannot prove the intended wallpaper rendered.

## PRE-C1R3-03: greeting timer survives teardown

Related IDs: C3-04 teardown/timer accounting. Severity: MEDIUM provisional code finding. Inspected WorldRuntime.ts SHA-256: a94cdeb25ede73bcb42083afda221e523f2ff87d87243a9678d372e1a48fe85c.

Path/line: source/src/features/world/WorldRuntime.ts:472-486 and dispose():708 onward.

Trigger: greet, then cancel/navigate/dispose before the four-second callback; inspect pending timer ownership and retained runtime references.

Expected: obsolete presentation callbacks/timers are canceled at teardown and cannot retain or affect a subsequent session. The separately owned zero-delay GPU cleanup task may finish later.

Observed from source: greet() starts an untracked setTimeout(..., 4000). dispose() cancels RAF/lifecycle timers/listeners but cannot clear this greeting timeout. The callback checks lifecycle state, so this inspection does not claim a stale UI mutation; it does retain its runtime closure and remains scheduled until firing. The source implementation fails the stated remove-timers teardown requirement.

Requested correction: give the greeting timer an explicit owner, cancel it on relevant cancellation/teardown, fence its callback to the session/operation, and prove greeting followed by Exit/Retry does not leave that timer pending or complete a newer action.

## PRE-C1R3-04: rendered activation evidence observes diagnostics rather than deformation

Related IDs: RT-RA-15 and C3-01/C3-05 mandatory browser proof. Severity: HIGH evidence gap.

Path/line: source/tests/e2e/world/completion-loading-pause.spec.ts:131-173; source/src/features/world/WorldRuntime.ts:442-457.

Trigger: treat the production frame event's activeClip/currentTime values as proof of rendered bone movement or late-map image changes.

Expected: actual GLB bone/skinned-frame samples or captures after renderer submission prove startup motion; real map identities/transforms or rendered captures prove late image adoption. Restored pause freezes before presentation.

Observed: the event is emitted after renderer.render(), but the browser assertion reads CharacterDirector clip/time diagnostics. Those numbers can advance even when actual bone/skin deformation is absent. optionalTextureTargets reports chosen mesh names, not actual material map state or pixels. The separate Node startup test reads real GLBs and measures bone changes; that is useful Node scope, not rendered browser proof.

Requested correction: capture and assert real production bone/skinned transform samples tied to submitted browser frames, and the actual late map state/rendered result. Include loaded model/image hashes, source/build identity, renderer/browser details, timestamps and paused first-frame samples. Avoid replacing this with a synthetic rig or animation-name check.

## PRE-C1R3-05: complete browser lifecycle matrix still required

Related IDs: RT-RA-08/RT-RA-15 and C3-02/C3-04/C3-05. Severity: HIGH evidence gap.

Path: source/tests/e2e/world/completion-loading-pause.spec.ts and evidence/browser*.

Trigger: use the three existing cases to close the full accepted lifecycle/browser scope.

Expected: useful held-request cancellation and indeterminate ARIA, genuine stall, healthy required progress beyond 15 seconds, paused navigation/return, late-map quality effects and repeated entry/Exit/Retry/context cleanup with timer/request/listener/resource accounting.

Observed: the inspected spec contains genuine fault-injected load/cancel, failed-load recreation, late texture requests and stall cases. A newer edit added paused navigation to /about and re-entry, but that edit was newer than the original browser log/patch receipt. No repeated cleanup/resource accounting, rendered late-map changes or healthy slow-transfer browser proof was inspected. The callback/quality mock integration tests use real Three objects but no renderer/world entry; they are separate evidence scope.

Requested correction: execute the final edited navigation case and fill the required remaining browser proofs with actual world sessions. Show cancellation latency <=50ms, actual disposed/retained resource and timer identities per repeated cycle, and sustained required high-water progression beyond the absolute 15-second mark. Report genuinely unexecuted paths as NOT RUN and leave them open.

## Preliminary source observations retained for final audit

The current inspected source contains substantive corrections for historical paused parsing, denied getter fallback, pause before activation, painting advancement, whole-required-set progress, contradictory EOF handling, per-session retry policy, meaningful watchdog high-water, current-generation fences, pre-prune identity capture and typed map target separation. These are useful code observations only. They do not close the corresponding findings until final bytes and executed behavior are independently bound.

The final audit must inspect every RT-RA-01..15 and C3-01..05 against the stable return and return CLOSED / STILL OPEN / NOT RUN with actual evidence. It must preserve native/mock/browser/device/live limits and Parent's separate acceptance authority.

