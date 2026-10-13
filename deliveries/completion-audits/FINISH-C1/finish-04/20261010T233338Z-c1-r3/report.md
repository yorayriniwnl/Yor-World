# FINISH-C1-R3 independent audit

Advice: **REWORK** for this bounded runtime delivery. Parent acceptance remains separate. The final candidate is complete and byte-stable; the patch and declared files pass identity/applicability checks. Six independent contract tests collected and failed with concrete observations. A further quality persistence defect is established by the complete source call path. Mandatory browser/build proof is still incomplete.

This report audits only `deliveries/FINISH-C1-R3/`. Production write allowance was empty. No maker, canonical application, accepted contract, asset, deployment or previous accepted audit file was edited. The isolated assembly contains the applied delivery, without fixes. A delegated helper inspected pause/progress source only; its conclusions were checked against the bound source here.

## Exact binding and scope

- Source base: `f62a43c5e71c00dcb89e28275ea81d842167db80`; accepted app tree: `42ea29ec235225046a75959eb19eb386ac2f821d`.
- Accepted FINISH-00-R2 design manifest SHA-256: `8038db147824b0a31de1028c330383352177020b2247dd627d1674d6dc14c6af`; all 54 declared contract outputs independently match.
- Final maker output manifest SHA-256: `4507bf04ad129f026556abf7d3e2099ee32f265da4bb29c3fff653d9dc17bb9e`; all 53 declared outputs and all 16 declared maker inputs match their byte counts and hashes.
- Final UTF-8 `source.patch`: 157355 bytes; SHA-256 `e1be558f734378fe69659dcf8271c4e5e57d87fbfbdca1582823be103082dc5d`.
- `git archive` of the exact base was unpacked into this audit root. The independently initialized repository's app tree was verified before applying the patch. Its synthetic local archive commit is recorded as such and is not represented as the original source commit. Both `git apply --check` and actual application passed; all 29 returned files agree byte-for-byte. There are 28 changed allowlisted paths; `SceneIntegrator.ts` is unchanged. Fixture changes are paused-only and CSS changes concern indeterminate loading. No package, lock, asset or unrelated source path was changed by the patch.
- The governance HEAD recorded during preparation and the later HEAD `10c23ef8b5586bfa9187684685b4af322da176c8` are separate from the maker base. The canonical app tree remains the accepted tree.

[Before binding](candidate-binding-before.json), [after binding](candidate-binding-after.json), [input checks](input-identity-checks.json), [exact-base patch verification](patch-verification.json), and [raw preparation receipts](preparation-receipts.json) contain the file-by-file identities and actual command results. Every behavioral command checked all 53 maker output hashes before and after execution. The stable candidate remained unchanged.

Earlier incomplete snapshots and the temporary 480186-byte patch are preserved in the separate [preliminary note](../20261010T232359Z-preliminary-c1-r3/maker-feedback-preliminary.md) and [delta note](../20261010T232359Z-preliminary-c1-r3/maker-feedback-delta.md). They are superseded bindings. No test or patch application ran against either superseded binding.

## Execution and evidence limits

| Check | Independent result | Actual evidence |
| --- | --- | --- |
| Unit suite | PASS: 347 tests, 26 files | [receipt](unit-receipt.json), raw stdout/stderr |
| Integration suite, serial workers | PASS: 290 tests, 28 files | [receipt](integration-receipt.json), raw stdout/stderr |
| ESLint, zero warnings | PASS | [receipt](lint-receipt.json) |
| TypeScript `--noEmit` | PASS | [receipt](typecheck-receipt.json) |
| Additional contract diagnostics | FAIL: 6 collected, 6 failed, 0 passed | [results](diagnostic-results.json), [observations](observations.jsonl), [receipt](diagnostic-receipt.json) |
| Initial diagnostic alias setup | NOT RUN: 0 tests collected | [original receipt](diagnostic-initial-alias-receipt.json); audit-only config correction enabled the six cases above |
| Optimized independent build | NOT RUN to completion: harness error, actual command exit 1 | [receipt](build-receipt.json), [raw error](build.stderr.log) |
| Independent browser run | NOT RUN: optimized build unavailable in this harness | No independent browser outcome is claimed |

Unit and integration counts are reported separately; the six additional cases are distinct boundary tests. The initial zero-test alias failure is excluded. Historical/maker runs are not added to independent counts. Commands, arguments, cwd, timestamps, durations, exits and bound hashes are in each receipt. [Tool versions](tool-versions.json) records Windows 11, Node 24.19.0, pnpm 9.15.9, Vitest 5.0.2, TypeScript 6.0.3, Playwright 1.63.0 and Git 2.55.0.windows.5.

The build failure is the audit dependency arrangement: Next/Turbopack rejected a `node_modules` junction pointing outside its filesystem root. It is **not a candidate build defect**. No candidate configuration was changed and no dependency installation or replacement build attempt followed. Independent browser checks remain NOT RUN because this optimized build prerequisite did not complete.

Maker logs record an optimized Next 16.3.8 build and three Chromium scenarios passing, including a 5.1 ms Continue response/request abort and a 15337 ms required-request stall. Those are reviewed maker observations, not independent execution. The maker's current build-directory source agrees with all 29 returned files after CRLF-to-LF normalization only; 7/29 agree in raw bytes. [Read-only lineage check](maker-build-evidence-check.json) records this distinction and the present build artifact hashes. The return lacks an executed build-time receipt binding final source/lock/build hashes. Hashing the returned logs authenticates their current bytes, not the source at their execution time. `final-validation-summary.json` also names `evidence/typecheck.log`, which is absent; the independent typecheck receipt supplies the actual local result here.

The diagnostics exercise actual bound loader/material/runtime methods with real Three objects. Fetch and GLTF/texture decoding are mocked, timers are controlled, and teardown uses a prototype harness with explicit owned components. They establish these local contract failures; they do not establish browser rendering, GPU behavior, real network transport, assistive technology, physical devices or live hosting. The passing startup test loads the real base GLBs and measures a bone delta in Node; its synthetic fallback must not be used as real-asset proof if those binaries are absent. Those binaries were present in this isolated audit. Browser clip/time events remain a different scope from rendered bone/skinned deformation.

## Findings routed to the runtime maker

All code findings belong to the assigned FINISH-C1 runtime maker. Return fixes and receipts in a fresh Parent-assigned revision; retain R3 and earlier failures. No finding authorizes later C2/C3 work or changes to accepted contracts.

### C1-R3-01 — unknown encoding accepted as factual bytes

HIGH; parent `C3-02`, prior `RT-RA-06`. `source/src/features/world/AssetLoader.ts:76–81`, SHA-256 `fa85b62be24e0eb0216f735a2042fdfd675f840b7065873e0d7cbfcd7b0d8b8f`.

Trigger: three status-200 required responses expose Content-Length 4 and no exposed Content-Encoding. Expected: accepted runtime01 keeps absent/unexposed encoding metadata indeterminate. Observed: null encoding becomes `identity`, and the actual loader emits five determinate events, including 8/12 and 12/12. This can present a factual ratio without establishing comparable byte representations. Reproduce with the first test in [audit-contract.test.ts](audit-contract.test.ts); observation ID `unknown-encoding`.

Correction: establish trustworthy identity/uncompressed representation before using each denominator; preserve indeterminate behavior for absent/unexposed/uncertain metadata. Add negative cases that assert no numeric aggregate, while retaining known-identity and EOF checks. Content-Length-only positive mocks currently encode the permissive assumption.

### C1-R3-02 — retry announcement retains failed transfer bytes

MEDIUM; `C3-02`, `RT-RA-06`. `AssetLoader.ts:283–288,309–317`; same source hash as above.

Trigger: room and resident decode; fixture fetch reaches its four-byte advertised EOF but its decode fails. Expected: failed-attempt bytes are retired before announcing attempt 2. Observed: the retry event already says attempt 2 while reporting determinate 12/12, progress 1, requiredLoaded 2/3. Reset occurs only after the 500 ms wait. Reproduce with the second diagnostic; observation `retry-counter-before-backoff` captures the event before backoff advances.

Correction: replace the failed counter and denominator before emitting the retry transition. Preserve the separate watchdog high-water rule. Verify an honest ratio may decrease across retries and do not count failed bytes as new-attempt progress.

### C1-R3-03 — late maps lose GLTF orientation and UV configuration

HIGH; `C3-05`, `RT-RA-14`. `source/src/features/world/RuntimeMaterialQuality.ts:66–81`, SHA-256 `9af1b0bd5de16e779ca2fef61f49ad92e2235d88f879858185cac33805734be8`.

Trigger: replace a GLTF map with a TextureLoader/default texture, or replace a map carrying a different channel/transform. Expected: preserve original GLTF flipY convention, UV channel and transform/wrapping while setting sRGB and maintaining LOW/HIGH isolation. Observed: original flipY false becomes true; original channel 1, offset [.2,.4], repeat [2,3], rotation .5 and RepeatWrapping become channel 0, offset [0,0], repeat [1,1], rotation 0 and ClampToEdgeWrapping. Installed Three source confirms Texture defaults flipY true and GLTFLoader sets false. The current room has textured desk/monitor target materials.

Reproduce with diagnostics 3 and 4; observations `late-flipY` and `late-UV-transform`. Correction: preserve the effective mapping from each target's original texture, using isolated texture views if targets need different configurations; retain fallback, sRGB, ownership and current derivative behavior. Add meaningful map property checks and rendered orientation/quality proof. Current tests assert identity/color-space, but miss these mapping requirements.

### C1-R3-04 — failed connection leaves quality registries changed

HIGH; `C3-03`, `RT-RA-12`. `RuntimeMaterialQuality.ts:83–112`; same source hash as above.

Trigger: inject an exception in the target connection after original/clone/simplified registration has changed. Expected: restore visible material and every registration before propagating failure; later quality changes must retain the original base. Observed: catch disposes new objects but retains changed originals/simplified/generated-clone registry entries. In the controlled first-write failure the original remains visible immediately, then `apply("high")` installs the failed clone (different UUID). The undo closure was never returned for this failing target.

Reproduce with diagnostic 5; observation `failed-map-registration`. This is explicit fault injection at a real method boundary, not a claim that ordinary Mesh assignment naturally throws. Correction: make the failing target itself transactional, restoring registries and connections on every throw as well as undoing earlier successful targets. Assert subsequent LOW/HIGH transitions, exact-once disposal and resource ownership after the failure.

### C1-R3-05 — greeting timeout survives teardown

MEDIUM; `C3-04`. `source/src/features/world/WorldRuntime.ts:472–485,708–764`, SHA-256 `12db7ee436e89e2c1e6915955f5c31629c1af5d72dbeb75275b35dc48a09f9fc`.

Trigger: greet from HOME, then dispose before the four-second callback. Expected: teardown removes the obsolete greeting timer. Observed: after disposing and flushing the separate zero-delay disposal task, one greeting timer remains. The closure retains the discarded runtime until it fires. The callback's lifecycle guard avoids the demonstrated stale transition; this finding does not claim stale UI mutation.

Reproduce with diagnostic 6; observation `greeting-timer-after-dispose`. Correction: own, fence and cancel the greeting completion handle on obsolete greeting, teardown/navigation/recreation, and verify repeated entry/greeting/exit leaves no timer or retained owner.

### C1-R3-06 — saved quality is ignored and selections are not persisted

MEDIUM; `C3-01` and current prompt03 preference preservation. `source/src/features/world/WorldRoot.tsx:55,73–78,89–94,294–305`, SHA-256 `4739749322f392a502d6b9d451fac2e6c099fa35cc2a87e44ffda4ee23fd6e10`; `WorldRuntime.ts:564–583`.

Trigger: enter/re-enter with validated preferences quality `low` on a capable desktop, or change quality then recreate the world. Expected: restore the saved/document-memory choice before constructing the runtime and persist explicit choices through the existing authority. Observed from the complete source path: WorldRoot initializes quality to literal `auto`, passes that ref to initial-tier selection, subscribes only to pause, and updates only local state/controller/runtime on quality selection. `setQualityTier` changes rendering and sends no `SET_QUALITY`; it does not persist the choice. The existing controller's `SET_QUALITY` persistence path is unused here. A capable desktop therefore chooses automatic HIGH despite saved LOW; remount also returns the control to AUTO.

This is source-confirmed behavior; actual browser reproduction is NOT RUN. The maker browser seed is quality auto and cannot detect it. Correction: read/subscribe/persist the existing quality preference within this C1 preference contract, preserving explicit user choice versus effective adaptive tier. Verify saved LOW, changed LOW/HIGH/AUTO, denial-safe memory, retry and route re-entry. Later mobile/control layout ownership is separate and does not defer preference preservation.

### C1-R3-07 — mandatory rendered/race/cleanup proof incomplete

HIGH proof gap; `RT-RA-15`, all related parent scope. `source/tests/e2e/world/completion-loading-pause.spec.ts:136–174,191–220`; `WorldRuntime.ts:442–454`; maker `evidence/final-validation-summary.json:1` and current returned evidence inventory.

The three new browser cases perform real entry and assertions; they supersede the earlier vacuous spec. Their rendered-frame event reports clip name/time and target names after render. These fields can advance while bindings fail; they do not measure actual rendered bone/skinned deformation or correctly oriented late-map pixels. Reviewed logs support their tested cancellation, retry, pause/navigation and held-network-stall paths, subject to the build lineage limit above.

Still required: final-source/lock/build hash command receipts; first actual rendered/deformed idle and frozen/resumed pose samples; rendered late maps across LOW/HIGH with target/orientation isolation; healthy required transfer advancing beyond 15 seconds; a decode-after-EOF stall; repeated enter/retry/exit/navigation cleanup accounting for timers/listeners/requests/renderers/resources; required hidden-return/reduced-motion/audio independence paths. Real context-loss, devices and live/CDN checks remain NOT RUN and must not be inferred from mocks or software rendering. Missing raw maker typecheck log is also recorded above.

Correction: return executed, meaningful, exact-bound evidence for these requirements and label unavailable scopes NOT RUN. Do not make the matrix all PASS from three aggregate scenarios, Node counts or diagnostic event fields. Independent build/browser remained NOT RUN here because of the recorded audit harness error, so there is no independent browser closure to substitute.

## Prior IDs and retained corrections

[Prior-findings disposition](prior-findings.json) records all `RT-RA-01..15` and `C3-01..05`; [requirement matrix](requirement-matrix.json) separates PASS/FAIL/NOT RUN by actual scope. The previous patch, historical schema, denied-getter memory, preactivation pause wiring, paused painting spring, indeterminate ARIA, meaningful watchdog, generation/progress fences, per-session retry ceiling, throwing-consumer cleanup and shared/pruned resource identity defects are corrected in the inspected local scopes. Their broader rendered/browser limits are kept open under RT-RA-15.

RT-RA-06, RT-RA-12, RT-RA-14 and RT-RA-15 remain open. All five parent C3 finding groups remain open because current preference, progress, atomic rollback, timer cleanup and rendered map/evidence requirements are incomplete. The token-only entrance API is not asserted as a demonstrated foreign-generation mutation: current production callbacks retain their original manager/runtime and token, while progress/optional consumers check the session pair. A theoretical foreign-manager call is not used to inflate defects.

The six independent diagnostic failures mean defects were reproduced; they are not fixes. The delivery can advance only after maker correction, delta audit and Parent ruling. C2 art/catalog/clock, C3 mobile/layout, I1 integration, G7 provider/device/recovery and release remain separate downstream assignments.
