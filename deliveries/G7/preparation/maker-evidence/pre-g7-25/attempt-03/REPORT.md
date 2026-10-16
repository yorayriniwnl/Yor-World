# PRE-G7-25 attempt-03 report

Disposition: **FAIL / unaccepted**. The corrected candidate preserves the accepted-root composition closely and passes most local source checks, but all eight required inclusive render-call captures exceed the frozen ceiling. The original performance suite also exits 1 (5/6 passed). No further renderer optimization was attempted after restoring the bounded dynamic transform/visibility synchronization port. This report records evidence; the maker does not approve or accept the candidate.

## Source and evidence binding

The source-only candidate is commit `28fb4187445206bcc62e2ef0ae2678e44ac6604b` on `codex/pre-g7-25-p22-parity-20261016`, with setup parent `0ad635b8ac8d893b19cde08dd712ea993c54411b`. It starts from the accepted PRE-G7-22 root source commit `500d10fa5901be48d4ff877e608d65ba0e271bb9`, app tree `ba0b709192367e1d12a796618f97801a8fcd5a70`. The candidate source root/app/mirror trees are `f04e1ff586f9523b28f7a3d47860a7d001ac5eec`, `f68074b41b8d2eea228d7fa964d3db8358a9fea4`, and `be03089ce9abae0f487bd829b4f24ddac9bb3dfd`. The source commit was pushed separately from this evidence update. Node `v24.19.0` and pnpm `9.15.9` were used for the required commands.

The required unchanged composition spec is `commands/composition-e2e-02.*`, exit 0, 6/6 Chrome/Edge tests passed. Its metadata binds the exact source commit and trees above and the E2E artifact stream hashes. The eight exact candidate runtime snapshots are listed below with full JSON SHA-256 values. Matching full-frame PNGs and their SHA-256 values are bound in `commands/pixel-parity-06.json`. The test command emitted only the recorded `NO_COLOR` / `FORCE_COLOR` Node warnings on stderr.

The accepted-root pixel baseline comes from `C:\p25\deliveries\G7\preparation\maker-evidence\pre-g7-25\attempt-02\accepted-root-capture-budget-check-failed\`, copied unchanged under `accepted-root-500-pixel-baseline-budget-check-failed/`. The exact desktop Chrome baseline is `C:\p25\deliveries\G7\preparation\maker-evidence\pre-g7-25\attempt-02\accepted-root-capture-budget-check-failed\screenshots\studio-reference-desktop-1440x900-chrome.png`; the exact phone Chrome baseline is `C:\p25\deliveries\G7\preparation\maker-evidence\pre-g7-25\attempt-02\accepted-root-capture-budget-check-failed\screenshots\studio-reference-mobile-390x844-chrome.png` (the corresponding Edge baselines are in the same `screenshots/` directory). Its manifest binds commit `500d10fa5901be48d4ff877e608d65ba0e271bb9` and app tree `ba0b709192367e1d12a796618f97801a8fcd5a70`. The copied `required-viewports.json` SHA-256 is `23add451a16e2a8f1feb6cbd37aa14dddc62ed35f7706cfafd0f32730fce8481`. The separate accepted-root inclusive counter overlay is `accepted-root-500-counter-overlay/`, based on the same accepted commit/tree with measurement-only patch SHA-256 `0c762543bb14fd4ad6a0e553753d2ba86376f00c3e91e12bb1925e03faeba1fa`; its visual-equivalence record passes for all eight images. The root capture's unwrapped `renderer.info` counts are main-pass-only lower bounds because Three resets that counter after shadow rendering. The overlay provides the inclusive root counts below.

## Inclusive renderer calls and triangles

`composition-e2e-02` records the candidate's inclusive count as 118 main-pass calls plus 11 shadow-pass calls, total 129, in every browser/viewport. The split sums to the captured total on all rows. Quality tiers match the accepted-root captures. The thresholds below are unchanged packet limits.

| Browser / viewport | Tier | Accepted-root inclusive calls | Candidate main + shadow = inclusive | Call ceiling / gap | Candidate triangles / ceiling | Snapshot SHA-256 |
|---|---|---:|---:|---:|---:|---|
| Chrome 1440x900 | HIGH | 423 | 118 + 11 = 129 | 120 / **+9 FAIL** | 28,736 / 300,000 PASS | `61c1618cf943ae6b420c15794fb018c5cac4802a8730f712a9f63683930e9e46` |
| Edge 1440x900 | HIGH | 423 | 118 + 11 = 129 | 120 / **+9 FAIL** | 28,736 / 300,000 PASS | `30006eea387c4f3e57c978e93fdfcc1895479264423c183b64aeda50be1d55c5` |
| Chrome 390x844 | MEDIUM | 411 | 118 + 11 = 129 | 80 / **+49 FAIL** | 28,592 / 140,000 PASS | `66c206d37626afe0fd6565ee7b5ffc819358904b8c021032f1e5133cc2276075` |
| Edge 390x844 | MEDIUM | 411 | 118 + 11 = 129 | 80 / **+49 FAIL** | 28,592 / 140,000 PASS | `c00c4bfdd99fc6efa226d08206298d1750a5d102eb8fa43d8bcb4c0d8ac8a805` |
| Chrome 320x600 | MEDIUM | 425 | 118 + 11 = 129 | 80 / **+49 FAIL** | 28,760 / 140,000 PASS | `63fe5fc31e4441f1a9520734893db03d2033886c6f2c759615559e41d5f01fe0` |
| Edge 320x600 | MEDIUM | 425 | 118 + 11 = 129 | 80 / **+49 FAIL** | 28,760 / 140,000 PASS | `415d669e355f681dfa5535433a1c9062320e1330676fcd7fc5665a699ad29cc4` |
| Chrome 844x390 | HIGH | 425 | 118 + 11 = 129 | 120 / **+9 FAIL** | 28,760 / 140,000 PASS | `e92d56646f9eea40f64f9b0a680280f21f59c8db3a2d1de6e6160a03006120b9` |
| Edge 844x390 | HIGH | 425 | 118 + 11 = 129 | 120 / **+9 FAIL** | 28,760 / 140,000 PASS | `4799d36d8686ef6d6c130eeb5684507aa9aea42ad379e764de478858a3283792` |

The accepted-root `required-viewports.json` separately reports 412 / 400 / 414 calls in `renderer.info`; those are main-pass readings, not inclusive counts. The measurement-only overlay captured accepted-root inclusive values of 423 / 411 / 425 respectively. Candidate call counts are lower by 294 desktop, 282 phone, and 296 compact/landscape, but remain above every packet ceiling. Triangle counts pass in all eight rows. Do not describe the draw-call gate as a pass or infer that accepted-root captures met the ceilings.

## Pixel comparison

`commands/pixel-parity-06.json` is the authoritative pixel comparison (15,967 bytes; SHA-256 `18f97e7c736c97b034fa629f0da2128a3f3ed1ef713f148fcda35ccdee80baf1`). It was produced by `commands/pixel-parity-03.mjs` (script SHA-256 `7eed9d1b0571fcdda3feef50d39b51f4d9e730f94a0b60da4ec3c33a6c5e61aa`) under pinned Node `v24.19.0`, Sharp `0.35.5` / libvips `8.18.7`, comparing unresized decoded RGBA bytes for the same browser and viewport. The comparison uses the accepted-root budget-check-failed directory above, not later PRE-G7-22 delta screenshots. All eight browser/tier pairs match; within each viewport Chrome and Edge candidate PNGs are byte-identical. Desktop and 390x844 phone screenshots were also inspected side by side: object layout and room composition match. Pixel equality is not exact, so strict parity remains **FAIL** pending review of the small differences; no cause is assumed.

| Viewport | Changed pixels | Changed % | Mean absolute channel difference | Max channel difference |
|---|---:|---:|---:|---:|
| 1440x900 desktop | 211 / 1,296,000 | 0.01628086% | 0.000271991 | 52 |
| 390x844 phone | 46 / 329,160 | 0.01397497% | 0.000116964 | 22 |
| 320x600 compact | 11 / 192,000 | 0.00572917% | 0.000141927 | 25 |
| 844x390 landscape | 17 / 329,160 | 0.00516466% | 0.000058482 | 4 |

The pixel tool's first four local attempts are retained, not overwritten: attempt 01 could not resolve Sharp from the repo-root working directory; attempt 02 failed path setup before Node launch; attempt 03's PowerShell native-stream handling did not persist an OS exit; attempt 05 parsed a BOM-prefixed JSON file without stripping its BOM. The corrected attempt 06 succeeded with exit 0 and is the authoritative output. The exact commands, output streams, script hashes, and reasons are retained in `commands/`.

## Test and validation results

| Gate | Result | Evidence |
|---|---|---|
| Production batch reports, desktop and mobile | PASS | `production-batch-report-03/` and `commands/production-report-03.*`; source 28fb418/app f68074b. 335 source meshes, 168 batched in 4 batches, 36 dynamic / 35 dynamic-batched; reports preserve original GLB material/texture references. |
| Focused batching, dynamic sync, recovery, inclusive counter tests | PASS, 4 files / 67 tests | `commands/focused-unit-04.*`; exit 0. |
| Full unit suite | PASS, 28 files / 336 tests | `commands/full-unit-02.*`; exit 0. |
| Lint | PASS | `commands/lint-01.*`; exit 0. |
| Typecheck | PASS | `commands/typecheck-01.*`; exit 0. |
| Production build | PASS | `commands/build-01.*`; exit 0. |
| Evidence-enabled production build | PASS | `commands/build-evidence-01.*`; exit 0. |
| Composition E2E behavior | PASS, 6/6 | `commands/composition-e2e-02.*`; all eight required viewport/browser captures saved. This does not make the call ceiling pass. |
| Performance suite | **FAIL, 5/6** | `commands/performance-suite-01.*`; one run, exit 1 after 265.7 seconds. The resource-stability case timed out at 180 seconds while clicking Projects because the accessibility navigation rail/toolbar intercepted pointer events. Tests 1-5 passed, including the 60-second active route/frame pacing test. No retry was run. |
| Consecutive integration run 1 | PASS, 27 files / 286 tests | `commands/integration-seq-01.*`; exit 0. |
| Consecutive integration run 2 | PASS, 27 files / 286 tests | `commands/integration-seq-02.*`; exit 0, launched after run 1 completed with no test/build between. |
| Source/mirror integrity | PASS, separate from product review | `mirror-parity-audit-02.json`; 116 source + 9 test + 11 asset pairs, 0 normalized-text and 0 Git-blob mismatches; all assets byte-identical. |
| Inclusive render-call ceiling | **FAIL** | Eight same-tier candidate snapshots above; all 8 are over the unchanged limit. |
| Exact pixel equality | **FAIL** | Raw pixel deltas above; direct visual composition looks consistent, but hashes are not equal. |
| Physical device, screen reader, mobile soak | NOT RUN | iPhone/iPad Safari: NOT RUN; Android Chrome + TalkBack: NOT RUN; Windows NVDA: NOT RUN; Safari + VoiceOver: NOT RUN; 10-minute mobile soak: NOT RUN. |
| Independent GPT Plus #2 audit | NOT RUN | No external auditor report is present. A local Codex maker comparison is not that audit. |
| Parent acceptance | PENDING | Maker does not self-accept. |
| Services or deployment | NOT RUN | Local-only packet. |

All valid required source checks above bind to commit `28fb418`, app tree `f68074b`, and mirror tree `be03089`; metadata records Node 24.19.0 and pnpm 9.15.9. Earlier failed/preflight/overlapped results remain in attempt-01/02/03 and are not silently replaced. The accidental `composition-e2e-01` full-suite launch was interrupted before the requested spec started and is nonqualifying; the single named spec run is `composition-e2e-02`.

## Asset and mirror identity

`production-batch-report-03` binds the source model bytes and reports these GLB hashes: `production-room-full.glb` `3a02647d24e474c8a2579b0d277cf02a7841212e961c1554f67b6e032e40a307`; `resident-production.glb` `b15000feb4738d14aa1d41a43f01ba377f7011dbe1c95b3478c1200d12f4411d`; `fixture-production.glb` `8e413b1aa407841b5fd268a9c00bb66718688957c6507551f3b79104132d81d8`; desktop `interaction-assets.glb` `1d965a9fe9b58a9f485b0145161bc38a75e4ccb9113ce83211db503a5b1e6b6d`; and mobile `interaction-assets-mobile.glb` `9dd2933d64dbe947328ee600a1608de07016a5aa01cad027881d33e738cd190e`. The authoritative `mirror-parity-audit-02.json` and updated `yorayriniwnl.in/source-delivery-manifest.json` bind source commit `28fb418`, app tree `f68074b`, and mirror tree `be03089`. They cover 116 source files, 9 test files, and 11 model/texture assets. Text paths have 122 raw-byte mismatches caused by CRLF/LF checkout differences, but zero normalized-content or committed Git-blob mismatches; all 11 assets are raw-byte and Git-blob identical. The manifest SHA-256 is `9425b532d95275faaeec058d7aa892baad4c65ef70c6c5065dfbc86c08d0d5f6`; the parity audit SHA-256 is `ff63a5773858035eb6ddbc4fe217afa504a65303b3c76458f8da0a76fc297d25`. The domain URL override remains intentional and explicit. A first audit-01 output is preserved; audit-02 is authoritative because it removes the stale PRE-G7-22 mirror audit key and distinguishes mirror integrity from independent review.

## Required bounded follow-up under packet section 6

Do not tune tiers, shadows, DPR, content, visibility, materials, or thresholds. The next authorized renderer/asset investigation should first attribute the remaining 118 main-pass and 11 shadow submissions to exact render-list items, material/geometry groups, and shadow-caster state on these same four viewports. Then, under a new packet, test whether authored assets can share a compatible submission boundary or use the existing multi-draw path without merging semantically distinct materials or changing exclusions. Preserve dynamic transforms, raycasts, visibility, layer masks, draw order, shadows, multi-draw-supported/unsupported fallback, and teardown. Add equivalence evidence for both paths and repeat same-tier pixel and inclusive-call captures. The present measured gaps are +9 calls at desktop/landscape and +49 at phone/compact; this report makes no claim that the current approach can satisfy them without that investigation.

Final source disposition: **FAIL / unaccepted**. Independent audit: **NOT RUN**. Parent acceptance: **PENDING**.



