**REWORK G1.** Six P1 findings and one P2 proof defect require correction or a new, explicit parent adjudication before accepting this candidate. No P0 was found. Deferred production work is identified separately below; this audit does not require finished V1, change F1, implement corrections, deploy, or authorize another phase.

Audited GitHub `main`: **`d88f7e1600087bfc51ee3a04dbb1c8c7978a1f80`**. Source tree: **`8635e32f0837b2000fb3c7e82f031f6b826656d0`**. GitHub still pointed to this commit at the endpoint check. The shared local main had a separate unpublished art commit; it was excluded. All probes used a separate checkout and production build. Delivery source and historical reports were not edited.

**Exact revision verification**

| Input | Parent record | Independently measured SHA-256 | Result |
| --- | --- | --- | --- |
| W1 room | W1-F1-r2 | `cb9dbe01a8325933cac3e83003358dad096c0c5be9b9da76bc60bd2f47079d0f` | Both G1 public copies match accepted bytes; 925,024 bytes |
| W2 avatar | W2-F1-r2 | `eba336b923e7fd8caf20fc006221934bd820f1f61812a0965833c109d7525511` | Both copies match; 230,360 bytes |
| W2 fixture | W2-F1-r2 | `7c9b2358b898a26b40baae799506cf3be26a54019f7e14826b7d3b2c9a94a4d7` | Both copies match; 307,852 bytes |
| W3 baseline package | W3-A1-r2 | `8cb1995f42b71550f688d983948ede67f68851fef1af3cbafe212ebaa00acf70` | Matches PARENT-RECON-02 |
| W3 baseline lockfile | W3-A1-r2 | `1d310d95e3f46bbdf6c3bcc6afe883e3419b4303d1cd2b89ac0d84ffae16a98e` | Matches; actual 144,282 bytes, not manifest's 144,510 |
| W3 baseline handoff | W3-A1-r2 | `1fec5b26253bfbf03a5e7ab4f9e278156dae71bb0824f796a86506bc6a460fa2` | Matches; 3,133,766 bytes |
| Current G1 archive | Candidate at audited main | `d27cf04ec601a0b4d4868c423cf7a071ce940215ef0935b1f089a53f0bae3d97` | 24,117,523 bytes; **not the parent-accepted G1 archive** |

G1 is an integration derivative of the correct W3 baseline: 26 original source files are unchanged, six are changed, none are missing, and 20 files are added. Changes are package/lockfile, Playwright configuration, Home page, payload test, and boundary test. The full delta is retained in [w3-integration.diff](w3-integration.diff); this is not a claim that the integrated application is byte-identical to W3. G1's Git lockfile is `4f02784775189fc59a4441c5f4e9e670f086cd35057908de94612054d9e53682` (146,659 bytes). Windows checkout CRLF differences are recorded separately and are not counted as substantive drift.

The current archive has all 52 current source members, with no substantive source mismatch (four members differ only in line endings). However, PARENT-RECON-03 and Claude-15 bind the **older** archive `10eb041ce009ce3ca2671df76cb8a2fb7c93c254753f0b1b510ff3a87b243cd5`, 6,419,527 bytes. Comparing its extracted source against current Git identifies five substantive differences: CameraDirector, StudioLauncher, WorldRoot, browser-behavior tests, and Playwright configuration. The current asset manifest names a third archive digest, `ca9dec7f6aba7b4e57faff91cb868651652c6f552562fae5557922e38b8180f8`, and the wrong archive size. The ZIP sidecar correctly identifies the current `d27c…` archive. See [authoritative-binding.json](authoritative-binding.json).

These measurements verify the identities named in the formal W1/W2/W3 acceptance record. They do **not** erase the contrary prerequisite closure evidence in the earlier [correction delta audit](https://github.com/yorayriniwnl/Yor-World/blob/44646aa33bc346cd26e76f23332468fb9e400616/docs/planning/reviews/2026-10-01-correction-delta-audit/report.md). This audit does not repeat or silently resolve that dispute.

**Evidence actually executed**

Frozen install and production build exited 0. Node 24.19.0; Next 16.3.8; Three 0.180.0; Chrome 154.0.8037.58; Edge 154.0.4258.37; Windows / NVIDIA RTX 2060 through ANGLE D3D11. These are local browser observations, not claims about Safari or real phones.

The auditor completed **22 Chrome scenarios and seven Edge corroborations**, plus a real-GLB scene/mixer probe and a deterministic stale-callback adapter probe. The initial Chrome context-restore harness attempted to reacquire an extension after loss and failed; that harness error remains in its raw result. A corrected probe stores the extension before loss and completes in both browsers. It is not counted as an application regression. Browser result files record observations; `executed: true` means the scenario completed, not that its product behavior passed.

Primary receipts:

- [Chrome initial scenarios](chrome-hostile-results.json), [context/retry/cancellation follow-up](chrome-additional-hostile-results.json), [delayed navigation and camera capture](chrome-navigation-hostile-results.json), [initial-render failure](chrome-initial-render-hostile-results.json), [Edge corroboration](msedge-hostile-results.json).
- [Real asset results](real-asset-results.json), [runtime harness](hostile-browser.cjs), [real asset and callback harness](real-asset-probe.cjs), [identity verifier](verify-identities.py).
- [Install](install.log), [build](build.log), [execution receipts](additional-execution.json), [endpoint/source-integrity check](repository-endpoint.json).

The maker's current evidence contains 42 passing E2E tests and a recorded successful execution. Older reviews saying these were NOT RUN are stale. Their PASS labels are maker/archived-review claims, not substitutes for the hostile scenarios here. The Claude-10/13/15 returns declare Gemini 3.8 Flash execution; no new Claude browser reproduction was performed by this audit. Browser failure probes manipulate network responses or browser APIs without patching application code. The Node graph probe stubs image decoding only; the browser uses the real images. The production build regenerated only `next-env.d.ts` in scratch; original application and runtime files were unchanged.

**Blocking findings and bounded corrections**

**H01 — P1: optional world code failure destroys the semantic portfolio.**

- Reproduce: load `/`; block the production world chunk (`/_next/static/chunks/13fu-g5lqyu6r.js` in this build); open Enter studio and click Launch 3D Studio.
- Affected: [StudioLauncher.tsx](../../../../deliveries/G1/source/src/features/world/StudioLauncher.tsx#L19), `DynamicWorldRoot`; no local error boundary surrounds the optional import.
- Expected: a world-only fallback, with Projects/About and ordinary HTML still available. Observed in Chrome and Edge: the complete page becomes “This page couldn’t load”; zero `/projects` links and zero world fallback banners. A chunk rejection escapes the optional feature.
- Evidence: `dynamic-chunk-failure` in Chrome and Edge JSON; [Chrome screenshot](chrome-dynamic-chunk-failure.png).
- Minimal correction: place a feature-local error boundary outside the lazy import; preserve the surrounding semantic page and offer a controlled retry/dismiss path.
- Required regression: reject the actual lazy JavaScript request, assert useful Home and Projects remain reachable, and retry without a full-page application crash. Simulated GLB failure is not an adequate substitute.

**H02 — P1: navigation intent does not settle the active greeting.**

- Reproduce: enter; Greet; wait 850 ms; delay `/projects?*` RSC response; click Projects; inspect after another 350 ms.
- Affected: [WorldRoot.tsx](../../../../deliveries/G1/source/src/features/world/WorldRoot.tsx#L75), runtime cleanup only on unmount; Home/public navigation has no settlement handoff to `WorldRuntime.skip()` / `CharacterDirector.settle()`.
- Expected: presentation settles within the binding G1 **50 ms** limit on navigation intent, independently of destination latency. Observed: still `mode=sequence`; chair yaw advances from **13.934° to 70.118°** while the route is pending. Cleanup finally stops RAF when the new route mounts. No delayed or corrupt history mutation was observed; the defect is failure to cancel presentation immediately.
- Evidence: `greet-navigation-delayed-route` in [navigation receipts](chrome-navigation-hostile-results.json).
- Minimal correction: wire navigation intent to the single presentation owner before waiting for route work; abort/invalidate presentation without postponing navigation.
- Required regression: delayed destination response during every finite clip; assert settled pose/cleared work within 50 ms, then correct destination and Back behavior after release.

**H03 — P1: error fallback retains an active renderer loop.**

- Reproduce: after Home loads, make the first WebGL `drawElements`/`drawArrays` call throw once, then enter. Wait for the world fallback and another 500 ms. A separate probe throws on three draws after readiness.
- Affected: [WorldRuntime.ts](../../../../deliveries/G1/source/src/features/world/WorldRuntime.ts#L46), constructor rejection handler and `animate` at line 148; [WorldRoot.tsx](../../../../deliveries/G1/source/src/features/world/WorldRoot.tsx#L50), `onError` and conditional fallback at line 136.
- Expected: a terminal failed session stops frames and releases its owned effects before showing fallback. Observed: first draw failure is caught by `init`, but RAF was already queued. Fallback removes the canvas without unmounting WorldRoot's effect. **RAF executions increase 3→90 and draw calls 535→16,021 in 500 ms on a detached canvas**, with one RAF still pending. The 100 ms timer and window resize/keydown listeners also remain. After-ready draw faults instead surface as three uncaught errors while the loop keeps running, with no fallback.
- Evidence: [initial-render result](chrome-initial-render-hostile-results.json), `post-ready-render-exception` in both browsers; 404/corrupt-GLB scenarios independently show the retained timer/listeners without RAF.
- Minimal correction: one idempotent terminal-failure path must stop owned work, dispose the failed runtime, and clear its component effects. Route both initialization and active-frame failures through it. Suppress callbacks from disposed sessions.
- Required regression: faults before first draw and after readiness; assert zero subsequent world draws, pending world RAF, world polling timers, and world listeners after fallback; then a fresh retry with exactly one owner.

**H04 — P1: URL test switches bypass explicit-entry loading.**

- Reproduce: open `/?studio=enter` in a fresh context without clicking anything.
- Affected: [StudioLauncher.tsx](../../../../deliveries/G1/source/src/features/world/StudioLauncher.tsx#L33), `autoEnter` / `isEntered`; fault-injection query switches use the same public path.
- Expected: the accepted G1 invariant is zero 3D loading until explicit user entry. Observed: all three GLBs load, WebGL initializes, and one RAF runs before an entry click. The plain `/` negative control has no context or world RAF.
- Evidence: `direct-query-without-entry` and `double-enter-and-settlement.pre` in [Chrome results](chrome-hostile-results.json).
- Minimal correction: keep public production entry gated by the user action; put automation/fault switches behind a test-only mechanism. A decision to permit URL auto-entry would require an explicit parent contract change.
- Required regression: direct loads and Back/refresh with all entry/fault query switches produce no world code, assets, canvas context, or RAF before user activation.

**H05 — P1: the combined Home camera is inside the retained W1 wall.**

- Reproduce: enter at a 1440×900 viewport; capture the canvas pixels directly, with no HUD pixels included.
- Affected: [CameraDirector.ts](../../../../deliveries/G1/source/src/features/world/CameraDirector.ts#L4), `CAMERA_PRESETS['home-desktop']`, combined with W1-F1-r2 `wall_left` and the actual embedded canvas aspect ratio.
- Expected: the combined proof visibly demonstrates the resident, chair, and workstation. Observed: position **(-2.15, 1.70, 1.55)** is inside `wall_left`; the raw default canvas is nearly entirely a grey wall. Diagnostics nevertheless report successful room integration. This is a geometry/camera incompatibility, not a demand for final art.
- Evidence: [raw Home canvas](chrome-raw-canvas-home.png); `homeCamera.containingMeshes=["wall_left"]` in [real-asset results](real-asset-results.json); browser camera diagnostics in the navigation result.
- Minimal correction: obtain parent approval for a proof camera outside collision geometry, with an explicitly defined FOV/aspect policy, then update the G1 camera/evidence. Preserve F1 geometry and the original W1 proof; do not silently change the accepted asset.
- Required regression: camera collision/frustum check against the actual GLB plus raw browser images at the real desktop and portrait/landscape canvas sizes. Named camera coordinates alone cannot pass this test.

**H06 — P1 evidence/gate defect: the accepted archive does not identify the current candidate.**

- Reproduce: hash current ZIP; compare PARENT-RECON-03, Claude-15, asset manifest, ZIP sidecar, and extracted source. Exact digests and differences are above.
- Affected: `docs/planning/reviews/2026-10-01-reconciliation-03.md` accepted record; `reviews/claude-15/review.md`; G1 `asset-manifest.json` and current delivery binding.
- Expected: one exact source/archive/lockfile identity for the reviewed and accepted candidate. Observed: accepted `10eb…`, manifest `ca9d…`, actual `d27c…`; five substantive source differences between accepted ZIP and current source. Source snapshots and archive identity are conflated.
- Evidence: [authoritative-binding.json](authoritative-binding.json), historical archive read directly from Git, and current ZIP member comparison.
- Minimal correction: return a coherent candidate manifest and a delta review of the exact current source/archive; issue a **new** parent decision after blocker closure. Preserve historical reports and acceptance records as dated evidence.
- Required regression: mechanically validate source tree, archive members, hashes, byte counts, and review/acceptance bindings; stale identities must fail the gate.

**H07 — P2 proof defect: initial `coding_idle` is only a diagnostic label.**

- Reproduce: load the actual GLBs with the unmodified integrator/director; construct CharacterDirector; advance 0.37 s; inspect both real AnimationActions and bone transforms. Compare with idle after a completed greeting.
- Affected: [CharacterDirector.ts](../../../../deliveries/G1/source/src/features/world/CharacterDirector.ts#L24), initial `currentClip`, constructor, `applyClip` activation condition at lines 60/73.
- Expected: both initial idle actions are activated and the authored idle affects the rig. Observed: diagnostic time becomes 0.37 while both `isScheduled()` values are **false** and bone-transform delta is **0**. The same real idle is scheduled after greeting and produces a nonzero transform delta (~0.000900254) over the comparison interval.
- Evidence: `initialIdle` / `idleAfterGreeting` in [real-asset results](real-asset-results.json). This is a Node execution of actual clips, not a claim derived from the status badge.
- Minimal correction: explicitly activate the initial action or distinguish “no active clip yet” from the current clip name. Keep one paired animation owner.
- Required regression: initial real-clip pose changes and both actions scheduled before any greeting, plus correct settlement and re-entry. Correct this bounded proof behavior before accepting the revised G1; no expanded action catalog is requested.

**Non-blocking downstream findings — remaining P2**

These retain the earlier parent deferrals where applicable. They are not used to demand a finished V1 or to justify the G1 rework by themselves.

| ID / severity | Exact reproduction and expected → observed | Affected source / evidence | Minimal correction and required regression |
| --- | --- | --- | --- |
| H08 / P2, B5 resource ownership | Enter→Exit twice. Expected deterministic cleanup; each detached context retains **537 buffers, 8 textures, 7 programs, 4 framebuffers, 1 renderbuffer** with zero deletion calls for those classes. Normal exit does stop RAF, interval, and world window listeners. Delayed rejected load after disposal still invokes the obsolete `onError` once. | `WorldRuntime.dispose:254`, loader/catch at 46/90/96, `SceneIntegrator` discarded subtrees; `double-enter-and-settlement`, `loading-route-late-rejection`, `staleErrorCallback`. | Dispose owned scene resources, mixer bindings and discarded/late-loaded assets; abort loads and gate success **and error** callbacks by session validity. Test repeat entry/exit, partial success/failure, late success and late rejection. Counter instrumentation intentionally retains context references; this measures absent explicit releases, **not** post-GC GPU heap size or an observed device crash. |
| H09 / P2, C3 recovery | Enter→Greet→`WEBGL_lose_context.loseContext()`. Expected static fallback and explicit retry; observed lost context, blank canvas, one continuing RAF, **no fallback/retry** in both browsers. Calling the saved extension's `restoreContext()` lets Three restore; application recovery was not implemented. Real constructor failure/404/corrupt GLB also have no Retry button, though Close Fallback→fresh entry works. | `WorldRuntime.init/animate`, `WorldRoot:136`, `WorldFallback.onRetry`; corrected Chrome/Edge context tests and `renderer-creation-failure-reentry`. | Observe context loss as session failure; add one bounded explicit retry through clean ownership. Test real extension loss/restoration, constructor failure, repeated retry failure, useful HTML throughout. This extends the already deferred ASTRA-G1-02/C10-02 recovery item. |
| H10 / P2, B5/C1 preferences and visibility | During Greet, emulate OS reduced motion. Expected current policy updates; observed media query true while diagnostics stay false. UI toggle sets true but turn continues (yaw ~31.62°→61.59°). Dispatch hidden visibility/pagehide: RAF executions **221→282** in 350 ms and motion continues. | `WorldRoot:26` reads matchMedia once; `WorldRuntime.setReducedMotion:201` only informs camera; no world visibility policy. `greet-preference-hide-resize-rotate`. | Subscribe/unsubscribe to preference and visibility changes through one owner, settle/pause according to policy, reset clock on show. Test change during every active phase and hidden/show/re-entry. Hide evidence is a deterministic event/visibility injection, not a real mobile OS suspension. G1 cameras already cut directly, so its narrower “no reduced-motion camera sweep” invariant passes. |
| H11 / P2, B2 asset binding | Serve historical W1 GLB hash `d47d10e0b38e357041a4a69723944eec5981c85a4f8d41816a936fd5f9610c88` at the unchanged model URL with stale-cache headers; supply an old manifest if requested. Expected revision mismatch detected; observed ready counts all pass in Chrome/Edge, **zero manifest requests**, no fallback. | `WorldRuntime.init:90`, hardcoded `/models/` paths; `cached-old-asset-manifest`. | Version/hash-bind asset URLs and the selected manifest, and reject incompatible bytes before integration. Test stale manifest plus old/mixed GLBs, correct revalidation/retry, and missing/corrupt members. This is a controlled stale-response substitution; actual browser disk-cache reuse was not measured. No CDN is required merely to fix identity binding. |
| H12 / P2, B5 loading lifecycle | Hold the world JS chunk; Enter→Escape. Expected controllable loading state; observed placeholder has **no Skip or Exit**, and world mounts when the promise resolves. Separately hold a required GLB for 16 s, press Escape/Skip: status remains `none/unmounted`, blank canvas, no retry/progress timeout; later it becomes ready. Semantic navigation remains available, and Exit is available once WorldRoot loads. | `StudioLauncher.DynamicWorldRoot.loading`, `WorldRuntime.init`, null-director `skip`; `dynamic-chunk-slow-escape`, `loading-escape-skip-late-success`. | Put loading cancellation outside the lazy subtree; retain pending intent and add bounded progress/continue/retry policy. Test slow code and slow asset phases independently, cancel before completion, and prevent obsolete mounts. The full timed entrance and production timeout UX remain B5/V1 work. |

No new P3 finding is needed to explain the observed failures. The earlier redundant pruning-accounting observation remains low-priority bookkeeping; it must not be confused with actual duplicate furniture. No P0/security or data-loss claim is made.

**Requested attack coverage and ownership conclusions**

| Sequence / invariant | Independently observed outcome |
| --- | --- |
| Enter→Enter | One active canvas/context and one world RAF; no duplicate live owner. PASS for ownership. |
| Enter→Skip / Escape | Ready-state settlement works; loading commands do not cancel pending world entry. Slow chunk has no controls (H12). |
| Enter→route change / Back while loading | Destination remains correct; released late success does not mount a world, and no RAF starts. Late rejected load still reports an obsolete error (H08). |
| Enter→asset failure: missing or corrupt GLB | Useful semantic fallback retained. Failed-session timer/listener cleanup is incomplete (H03); explicit retry absent (H09). |
| Enter→world failure | Lazy code rejection loses semantic content (H01); first-draw failure retains a detached loop (H03); constructor failure preserves semantic fallback. |
| greet→greet | Same revision returned by director; duplicate greeting does not restart the sequence; actual paired clips stay synchronized. |
| greet→project navigation | Correct route eventually loads, but a delayed route exposes failure to settle on intent (H02). |
| greet→Escape | Synchronous settlement call measured less than 0.1 ms in actual-asset probe, queue empty and yaw zero; browser key handler ~0.3 ms and later pose remains idle. No claim that 100 ms UI polling proves display latency ≤50 ms. |
| greet→Back | Actual browser Back reaches previous About page; no world RAF/poll timer afterward. No route/history corruption observed. |
| greet→page hide | No application pause in injected visibility lifecycle (H10); actual mobile suspension not run. |
| greet→component unmount | Active greeting's RAF stops, counters remain unchanged after 500 ms, world listeners/timer removed. Resource releases remain H08. |
| loading→stale completion | Exit before successful completion suppresses ready/mount/RAF; post-disposal rejection still calls `onError` once. |
| cancelled transition→late promise completion | Director uses a synchronous queue, not completion promises. Cancel→Escape→wait 4.5 s stays idle; no resumed sequence. Loader late promises are tested separately above. |
| failed renderer→retry | No explicit Retry control. Close/re-enter after constructor fault removal succeeds with one live owner; context loss recovery requires browser extension restoration or leaving/re-entering. |
| reduced motion changed while active | OS change ignored; UI flag changes without settling the character. Direct-cut cameras retain their narrower G1 behavior (H10). |
| rapid resize / mobile rotate | Seven viewport changes and portrait→landscape: one RAF, counts/roots retained, camera switches mobile↔desktop. This is desktop viewport emulation, not physical mobile validation. Default desktop framing still fails H05. |
| slow network | Delayed chunk, required asset and destination route exercised separately; H12/H02. No blanket claim about all network conditions. |
| cached old manifest / GLB | Manifest is never read; substituted old compatible-shaped GLB is accepted (H11). |
| duplicate desk/chair/resident | Real integrated graph independently counted: desk=1, resident=1, resident-body=1, chair-root=1, chair-base=1, fixture-static=0. No duplicate furniture found in accepted-byte integration. |
| double transform / double coordinate conversion / root drift | Resident and chair world roots `(0.3000000119,0,-0.3600000143)`; **zero root-position drift over 20 greetings**; no double offset/conversion found. |
| multiple camera/animation owners | One camera director and one character director; two intentional mixers control separate avatar/chair roots. Max paired yaw difference ~`0.0000261°` over 20 real-asset cycles. No conflicting owners found. |
| stale state / RAF / event / WebGL leaks | Real failures and limitations H02/H03/H08/H09/H10. Normal unmount cleanup passes for RAF/window listeners/timer; that result cannot be extrapolated to fallback. |
| audio leaks | Zero AudioContext constructions observed. Sound is a boolean stub, so this does not validate a future audio implementation. |
| semantic fallback loss | Reproduced for lazy chunk failure H01; GLB and renderer-construction errors preserve the page. |

**Exact next packets**

1. **G1-CORR-HOSTILE-01 — integration maker:** H01/H02/H03/H04 and H07, within G1 runtime/tests only. Return scoped diff, exact source/archive hashes, and the specified failure/settlement regressions. Parent audits; maker does not self-accept.
2. **G1-CAMERA-REVIEW-01 — parent-approved camera correction:** H05. Preserve F1 geometry and W1 historical exports; return an explicit camera/FOV/aspect proposal, actual collision checks and browser pixel evidence. This packet is not permission to silently revise accepted W1 contracts.
3. **G1-BIND-REVIEW-01 — packaging/review:** H06 after corrections. Produce one coherent manifest and archive; obtain delta review against that exact candidate; append a new parent decision and update living status references. Keep historical acceptance/review documents intact.
4. **B2/B5/C3 follow-up ledger:** retain H08–H12 with their stated required tests and earlier parent deferrals. Do not use absence of final lighting/materials, eight-action catalog, audio implementation, backend, deployment or physical-phone release certification as new G1 blockers.

**Conclusion: REWORK G1.** The exact accepted input bytes are present, but this candidate is not bound to the existing G1 acceptance archive and fails concrete integration, interruption, and failure-isolation requirements. Existing living statements that this exact candidate has zero blocking defects are unsupported by these executions. This recommendation does not itself merge changes, deploy, or begin another gate.
