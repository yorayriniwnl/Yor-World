# FINISH-C1 / FINISH-04 independent runtime re-audit

**Advice: REWORK. C3-01 through C3-05 remain OPEN.** The local FINISH-C1-R2 bytes do not satisfy the eight runtime correction clauses. No implementation acceptance, canonical integration, provider action or production fix was performed. Parent retains acceptance authority.

The inspected delivery is `deliveries/FINISH-C1-R2/`; `deliveries/FINISH-C1-R3/` is absent. Revision labels were not used as a substitute for byte inspection. Model provenance is the inherited local collaboration invocation, GPT-6.1 Sol / ultra; no external-account dispatch is claimed.

## Exact binding and execution scope

- Observed Parent HEAD: `afc69a9a154d2036562728bb61d9948297871149`; immutable source base: `f62a43c5e71c00dcb89e28275ea81d842167db80`; both app trees: `42ea29ec235225046a75959eb19eb386ac2f821d`.
- Accepted FINISH-00-R2 output-manifest SHA-256: `8038db147824b0a31de1028c330383352177020b2247dd627d1674d6dc14c6af`. All54 declared contract files and their raw byte sizes/hashes match.
- Maker output-manifest SHA-256: `c14252969aad5d3d55daeb62de43da3652ffc690c9d8ddae27859ba305ad126d`. All29 declared source/test hashes match; all29 paths match the exhaustive E/N allowlist. Delivered candidate files also match the29 replacements.
- Patch SHA-256: `a3df6b2b209a8c2cf3faa5c5c17a09b07a04c95dfda067c02f9067df1238cbfe`. Exact-base isolated check exits128 on an invalid concatenated path. Applied-source agreement is NOT RUN because the patch prerequisite fails.
- Diagnostic assembly: exact `git archive` app tree plus byte-identical replacements, staged only beneath this audit root. This is clearly labeled diagnostic source, not a successful patch integration. Existing app/node_modules was junctioned without installing dependencies.
- An initial nested patch check returned0 by silently skipping paths after finding the parent repository. That no-op is preserved and expressly invalidated. Corrected `GIT_CEILING_DIRECTORIES` probe excludes parent discovery; both the isolated archive check and read-only canonical app check then reject the patch. No index or maker/canonical paths were changed.
- Current maker input-declaration mismatches are disclosed in identity-checks.json as historical governance-input changes; actual audit inputs are separately raw-hash bound. The maker input manifest does not name the runtime01 contract. Earlier maker/79-case audit receipts remain preserved, with no inherited broader acceptance.
- Actual tools: Node24.19.0, pnpm9.15.9, Vitest5.0.2, TypeScript6.0.3, Python3.12.10 and Git2.55.0.windows.5. Commands, versions, timestamps, stdout/stderr and exits are archived.

The final independent diagnostic run discovered **29 unique cases: 9 PASS, 20 FAIL**, with Vitest exit1. Expectations assert the accepted outcome; failed cases establish requirement failures. Initial22/28-case runs overlap and are not summed. Fetch/decode adapters and fake timers are explicitly mocked; Three resource objects, schema/store/controller, loader control flow, lifecycle, map methods and batching are the candidate implementation. No mock/constructor result is represented as browser rendering.

## Material findings

**RT-RA-01 — HIGH — C3-01** (`deliveries/FINISH-C1-R2/source.patch:1`). Trigger: Apply delivered patch to exact base app tree. Expected: Canonical valid app paths; clean check and replacement agreement. Observed: Out-of-repository exact archive and canonical unchanged-app read-only checks both exit 128: invalid concatenated canonical/delivery path. Patch not applied. Evidence: patch-verification.json. Scope: exact-base git patch check.

**RT-RA-02 — MEDIUM — C3-01** (`deliveries/FINISH-C1-R2/source/src/contracts/experience.ts:61`). Trigger: Parse valid historical v1 Preferences without paused. Expected: Schema supplies paused false. Observed: safeParse fails on missing paused. PreferencesStore performs an ad hoc repair, but direct schema/type consumers remain incompatible. Evidence: old-schema in observations.jsonl. Scope: source + Node diagnostic.

**RT-RA-03 — HIGH — C3-01** (`deliveries/FINISH-C1-R2/source/src/features/experience/preferences-store.ts:20`). Trigger: Storage property getter throws SecurityError; pause then create new store/runtime. Expected: Validated document memory restores true. Observed: getStorage swallows getter failure as null without marking denied; subsequent constructor starts defaults. First true, second false. Evidence: blocked-getter in observations.jsonl. Scope: source + Node diagnostic.

**RT-RA-04 — HIGH — C3-01** (`deliveries/FINISH-C1-R2/source/src/features/world/WorldRoot.tsx:141`). Trigger: Enter/retry/re-enter with saved paused true. Expected: Restore runtime/director pause before activation. Observed: WorldRoot passes neither initialPaused nor initial setDecorativePaused. Runtime defaults false despite controller paused true; constructor property diagnostic reproduces mismatch before rendering. Evidence: initial-runtime-pause in observations.jsonl. Scope: source + constructor state diagnostic; rendered path NOT RUN.

**RT-RA-05 — MEDIUM — C3-01** (`deliveries/FINISH-C1-R2/source/src/features/experience/controller.ts:489`). Trigger: Request painting preset while paused; advance 180 frames. Expected: Bounded requested spring safely settles without clearing pause. Observed: Paused branch advances only greeting; painting remains 5.5 degrees and unsettled after 3 seconds. Evidence: paused-painting in observations.jsonl. Scope: source + Node diagnostic.

**RT-RA-06 — HIGH — C3-02** (`deliveries/FINISH-C1-R2/source/src/features/world/AssetLoader.ts:239`). Trigger: Read one sequential essential response before other required requests start. Expected: Only complete same-representation aggregate can be determinate. Observed: Emits required-session 4/4 (100%) with only 1 of 3 requests started; no aggregate denominators. EOF short body 2/header4 never diagnoses mismatch; body-null fallback actual2 emits fabricated4/4. Evidence: aggregate, eof-shorter, arraybuffer-fallback in observations.jsonl. Scope: source + Node diagnostic.

**RT-RA-07 — MEDIUM — C3-02** (`deliveries/FINISH-C1-R2/source/src/features/world/WorldRoot.tsx:469`). Trigger: Render indeterminate loading bytes. Expected: Omit aria-valuenow and factual numeric percent for indeterminate. Observed: isDeterminate false sets progressPercent0, but JSX always emits aria-valuenow0 and visible 0%; CSS indeterminate styling is not selected. Ratio comes from legacy progress field and clamp. Evidence: source: WorldRoot.tsx:439-480. Scope: source inspection; browser rendering NOT RUN.

**RT-RA-08 — HIGH — C3-02** (`deliveries/FINISH-C1-R2/source/src/features/world/LifecycleManager.ts:124`). Trigger: New required bytes at t=10s; clock reaches15s, or stale entrance call during current loading. Expected: Fail only after15s without new required high-water/decode/integration; stale calls cannot clear current timer. Observed: New required progress still fails at absolute15s. startEntrance(oldToken) returns false but clears timer; genuine stall stays LOADING with zero timers. Evidence: progress-watchdog and stale-entrance in observations.jsonl. Scope: source + Node diagnostic.

**RT-RA-09 — HIGH — C3-02** (`deliveries/FINISH-C1-R2/source/src/features/world/WorldRuntime.ts:247`). Trigger: Recreate WorldRuntime/LifecycleManager or supply same-token progress from another generation. Expected: Unique monotonically increasing runtime generation plus token fence. Observed: Runtime omits sessionGeneration; loader defaults1. New manager also starts1. updateLoadingProgress accepts generation999 with token1. Runtime optional callback checks only token and disposed flag. Evidence: stale-generation in observations.jsonl; source: AssetLoader.ts:137, LifecycleManager.ts:13,148. Scope: source + Node generation diagnostic.

**RT-RA-10 — MEDIUM — C3-02** (`deliveries/FINISH-C1-R2/source/src/features/world/AssetLoader.ts:134`). Trigger: Two concurrent loadSession calls on one loader have limits2 and0. Expected: Each session owns its retry policy. Observed: Second session overwrites this.maxRetries; first stops after its first failed attempt. Total requests2 instead of4 (3 first-session attempts plus1 second-session attempt). Evidence: concurrent-retries in observations.jsonl. Scope: source + Node diagnostic.

**RT-RA-11 — HIGH — C3-03** (`deliveries/FINISH-C1-R2/source/src/features/world/AssetLoader.ts:392`). Trigger: Synchronous optional consumer throws, or returns adopted then loader aborts. Expected: Throw/reject immediately releases once; successful adoption removes loader ownership. Observed: Throw bypasses disposeTexture: zero disposals before abort. Adopted deskmat/wallpaper each disposed by loader abort. unregister APIs are unused; runtime separately disposes adopted list and material maps. Evidence: consumer-throw and adopted-abort in observations.jsonl; source: WorldRuntime.ts:672-680,724-769. Scope: source + Node diagnostic.

**RT-RA-12 — HIGH — C3-03** (`deliveries/FINISH-C1-R2/source/src/features/world/WorldRuntime.ts:259`). Trigger: Optional texture resolves before integration, target is absent, or consumer step throws. Expected: Typed deskmat/wallpaper buffering, validated target, atomic material/quality/list rollback. Observed: Push happens before apply; missing integrated scene/target returns void and callback still adopted. Buffer is Texture[]; replay applies every entry to both targets, so target identity is lost. No rollback restores list/maps/quality. Evidence: source: WorldRuntime.ts:259-269,333-336,562-590. Scope: source inspection; full adoption rollback/browser NOT RUN.

**RT-RA-13 — HIGH — C3-04** (`deliveries/FINISH-C1-R2/source/src/features/world/asset-resources.ts:75`). Trigger: Register GLTF then prune nodes, or share resources across meshes; GLTF material has map/ImageBitmap. Expected: Capture complete identities before prune and dispose each geometry/material/texture/bitmap once. Observed: Only GLTF root is retained; detached resources get0 disposals. Shared geometry/material disposed2 times. GLTF map texture and bitmap get0 disposals/close calls; geometry/material Sets never populated. Evidence: shared-disposal, pruned-disposal, bitmap-disposal in observations.jsonl; SceneIntegrator.ts:67,87. Scope: source + Node diagnostic.

**RT-RA-14 — HIGH — C3-05** (`deliveries/FINISH-C1-R2/source/src/features/world/WorldRuntime.ts:562`). Trigger: Late deskmat while LOW, shared target material, or nonexact mutable name. Expected: Owned original map plus current derivative refresh; isolation, sRGB and consistent batch exclusions. Observed: LOW and HIGH both retain old map after adoption/roundtrip. Shared unrelated mesh receives new map. New texture colorSpace remains empty. desk_mat_overlay matches runtime but is batched and original hidden because batch regex is exact. Evidence: late-map-roundtrip, shared-late-material, late-colorspace, batch-name-match in observations.jsonl. Scope: source + Node diagnostic.

**RT-RA-15 — HIGH — C3-05** (`deliveries/FINISH-C1-R2/source/tests/e2e/world/completion-loading-pause.spec.ts:5`). Trigger: Use returned browser spec/evidence to close required browser paths. Expected: Actual source/build-bound loading/watchdog/cancel/first-frame/pause-navigation/quality/repeated-cleanup receipts. Observed: No browser/build receipts returned. Progress test conditionally does nothing when bar hidden and accepts determinate0; pause test writes wrong storage key and simply rereads it, performing no entry or retry. Integration test named adoption only toggles runtime pause on null-context canvas and never loads/adopts textures. Evidence: maker evidence inventory; source browser spec:5-42 and integration test:39-74. Scope: source/evidence completeness; browser NOT RUN.

## Complete correction matrix

PASS means only the stated scope. NOT RUN proof remains an acceptance limitation. A source or Node failure is not repaired by an unexecuted browser spec.

| Clause | Requirement | Result | Evidence / scope |
| --- | --- | --- | --- |
| 1 | Accepted contract raw manifest and all54 declared files | **PASS** | identity-checks.json; raw identity |
| 1 | 29 maker output hashes and exhaustive E/N source ownership | **PASS** | identity-checks.json; raw identity/path state |
| 1 | Clean patch applies against exact source base | **FAIL** | patch-verification.json / RT-RA-01; git --check |
| 1 | Applied patch agrees with all29 replacements | **NOT RUN** | Prerequisite patch check fails; diagnostic replacement assembly matches29/29; no applicable patch |
| 2 | Historical v1 schema default paused=false | **FAIL** | RT-RA-02; Node schema |
| 2 | Existing-key load ad hoc historical repair and denied getItem memory | **PASS** | preferences-store.ts:75; retained denied-getItem diagnostic; source + Node |
| 2 | Denied storage property getter document persistence | **FAIL** | RT-RA-03; Node |
| 2 | Saved pause restored before runtime/director activation | **FAIL** | RT-RA-04; source + constructor state |
| 2 | Finite explicit painting action safely returns while paused | **FAIL** | RT-RA-05; Node controller |
| 2 | Paused greeting/first real coding bone behavior retained | **NOT RUN** | Earlier actor tests/receipts preserved; no new rendered-frame proof; prior evidence only; browser NOT RUN |
| 2 | Actual pause route/retry/re-entry/context and civil-time hidden return | **NOT RUN** | RT-RA-15; C2 actual clock surface separate; required browser paths missing |
| 3 | Whole3-required aggregate determinate only with all trusted denominators | **FAIL** | RT-RA-06; actual loader, mocked fetch/decode |
| 3 | Actual EOF shorter/header mismatch invalidates ratio | **FAIL** | RT-RA-06; actual reader, mocked response/decode |
| 3 | Body-null ArrayBuffer fallback counts actual bytes | **FAIL** | RT-RA-06; actual loader, mocked response |
| 3 | Compressed and unknown-length results remain indeterminate | **PASS** | 2 retained diagnostic cases; actual loader, mocked fetch/decode |
| 3 | Indeterminate ARIA omits numerical value and UI uses byte shape once | **FAIL** | RT-RA-07; JSX source |
| 3 | Retry attempt counts replace failed aggregate/high-water correctly | **NOT RUN** | No aggregate/high-water implementation; full reproduction absent; missing aggregate contract |
| 4 | 15s meaningful progress stall reset and no stale timer clearing | **FAIL** | RT-RA-08; Vitest fake timers |
| 4 | True no-progress stall fires exactly at15s | **PASS** | retained true-stall diagnostic; Vitest fake timers |
| 4 | Single-session500/1500ms,3-attempt retry ceiling | **PASS** | retained bounded-retry diagnostic; Vitest fake timers |
| 4 | Backoff abort timer cleanup and no retry | **PASS** | retained backoff-abort diagnostic; Vitest fake timers |
| 4 | Concurrent session retry policies remain independent | **FAIL** | RT-RA-10; Vitest fake timers |
| 4 | Generation/token session fencing and unique runtime recreation identity | **FAIL** | RT-RA-09; source + Node |
| 4 | Manual UI retry bounded to3 per mounted launcher | **PASS** | WorldRoot.tsx:333-341 and LifecycleManager.ts:283-299; source only; actual UI NOT RUN |
| 4 | Browser<=50ms cancellation and readiness/request/timer cleanup | **NOT RUN** | RT-RA-15; required measured browser proof missing |
| 5 | Reject optional result disposes once | **PASS** | retained optional-rejection diagnostic; actual loader, mocked decode |
| 5 | Late optional decode after cancellation disposes once without callback | **PASS** | retained late-decode diagnostic; actual loader, mocked decode |
| 5 | Consumer throw disposes immediately and successful adoption transfers owner | **FAIL** | RT-RA-11; Node actual loader boundary |
| 5 | Typed per-target buffer, missing-target rejection and atomic rollback | **FAIL** | RT-RA-12; complete consumer/source inspection |
| 6 | Pre-prune resource capture and shared identity disposal | **FAIL** | RT-RA-13; Node real Three resource identities |
| 6 | GLTF textures/ImageBitmap identity release | **FAIL** | RT-RA-13; real Three texture + bitmap adapter |
| 6 | Unified runtime/loader owner and no source duplicate disposal | **FAIL** | RT-RA-11,13; Node adoption + teardown source |
| 6 | Object URL decode finally cleanup | **PASS** | AssetLoader.ts:376-383,427-434; source only; late Node URL decode earlier receipt retained |
| 7 | Late map low/high roundtrip, isolation and color-space | **FAIL** | RT-RA-14; actual map methods/material-quality |
| 7 | Mutable-node matching agrees with static batch eligibility | **FAIL** | RT-RA-14; actual LowQualityBatch real Three objects |
| 7 | Atomic failed quality/map adoption leaves previous rendering intact | **NOT RUN** | No rollback source; runtime full injected throw/rendered proof absent; RT-RA-12 source defect; browser NOT RUN |
| 8 | Current essential filenames and no legacy whole IA requests | **PASS** | retained essential-name diagnostic; actual loader, mocked decoder |
| 8 | Independent required-outcome regressions | **FAIL** | diagnostic-results.json:29 unique,9 PASS/20 FAIL, child command exit1; Node diagnostics only |
| 8 | Affected suites/lint/typecheck | **NOT RUN** | Unchanged earlier receipts preserved; no broad repetition; historical execution only |
| 8 | Production build hashes/receipt | **NOT RUN** | No returned build receipt; not executed in re-audit; required maker proof missing |
| 8 | Actual browser loading/stall/cancel/animation/pause/late-map/cleanup | **NOT RUN** | No actual returned browser receipts and vacuous spec; required maker proof missing |
| 8 | Physical/live/provider/native-device sessions | **NOT RUN** | No provider mutation or real-device access used; outside this local runtime audit |

## Retained proof and limits

Sound focused results are compressed/unknown indeterminate behavior, true15s stall, single-session retry/backoff cleanup, denial via getItem fallback, optional rejection, stale optional decode cleanup and current essential-only requests. These do not close the failed aggregate/watchdog/adoption/pause boundaries. Earlier lint/typecheck and narrow actor evidence were not broadly rerun because source is unchanged and new focused failures establish rework.

Required production build/source hashes and actual browser request/animation/disposal/cancellation measurements are absent from the delivered proof. The supplied browser spec conditionally skips its progress assertion and rereads an unused hyphenated storage key; it never performs studio entry/retry. The named integration adoption test creates a null-context canvas and toggles pause without adopting resources. Local browser, physical/live/native-device/provider and <=50ms cancellation proof are **NOT RUN** in this re-audit. No fabricated browser failure or provider/device test is inferred.

The assigned Gemini #3 maker must return a fresh correction revision closing C3-01..05 and all eight clauses. Parent commits/pushes this completed audit root and makes a separate ruling; the auditor has no production allowlist. Canonical app tree and received maker bytes were preserved.

Artifacts: report.md, findings.json, requirement-matrix.json, identity-checks.json, input-hashes.json, patch-verification.json, preparation/diagnostic command receipts, tool-versions.json, raw diagnostic logs/results/observations, reproducible audit scripts and output-hashes.json. Candidate/scratch/dependencies are excluded by .gitignore; .gitattributes preserves raw evidence bytes in Git.
