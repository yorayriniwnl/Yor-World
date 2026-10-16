# PRE-G7-24 maker evidence report

**Result: FAIL / unaccepted.** The required composition E2E passed its six behavior assertions, but the render-call budget is not proven because the captured renderer counters omit shadow-map submissions. Neither required 1440×900 capture stayed at the accepted P22 HIGH tier, and the candidate screenshot shows extra foliage/stems on the upper-left shelf. Do not accept or deploy this result.

## Source, lineage, and evidence binding

- Candidate source commit: 017bead7813d5ea9875b8789621b93b8a8cd00ce
- Candidate app tree: b28bf52127947dce6ad9e032d1fd0ffd2577fb47
- Source commit parent: a3582e87068f030a2a63d1b8a048549fd07a48e8
- PRE-G7-23 source base: dde53bf6dde0a5e6b2644b02a622100b7355d1f2; its P24 starting app tree is 26e87c8cd41f2745d165a74446ae1366f17f7bc1 / ab95dafb3276c91ee9097d4f99a313e79c7da7e3.
- PRE-G7-23 evidence correction 3122a512a922219b76252bf4b13dce8b9550676d is not an ancestor of this branch. P24 descends from the P23 source base through its plan commit. The P23 failure and correction record remains at deliveries/G7/preparation/maker-evidence/pre-g7-22/delta-15/README.md.
- Source and evidence commits are separate. This report correction preserves the prior pushed evidence commit 806a26e95caa8506a1d989065cd104761c2699ed.
- Concurrent edits to yorayriniwnl.in/README.md and yorayriniwnl.in/source-delivery-manifest.json, plus the P25 planning changes, are outside this P24 evidence correction.

The source/mirror audit covers 116 application files and 10 scoped test files. It reports zero Git-blob mismatches and zero normalized-content mismatches; 109 raw-byte mismatches are CRLF/LF variation. All five changed source/test paths have matching app and mirror Git blobs:

| Changed path pair | Git blob in app and mirror |
|---|---|
| LowQualityBatch.ts | 89a151a8eaac3a35fc32580c22e8951136c7bb2f |
| WorldRuntime.ts | a028cec5ea75fc6363f432ddfc24dd21580a23b1 |
| types.ts | fe1c72653fd7149ed19906eb36063dac0684bbb4 |
| low-quality-batch.test.ts | 2a9603b35214ee08b3227600560174252c14cbf2 |
| static-batch-production-report.test.ts | 4e0dafe253cfcd8bcc31bc4c9f937d2a07624869 |

The production room asset remains SHA-256 3a02647d24e474c8a2579b0d277cf02a7841212e961c1554f67b6e032e40a307. Resident, fixture, desktop interaction, and mobile interaction assets are b15000feb4738d14aa1d41a43f01ba377f7011dbe1c95b3478c1200d12f4411d, 8e413b1aa407841b5fd268a9c00bb66718688957c6507551f3b79104132d81d8, 1d965a9fe9b58a9f485b0145161bc38a75e4ccb9113ce83211db503a5b1e6b6d, and 9dd2933d64dbe947328ee600a1608de07016a5aa01cad027881d33e738cd190e.

The source-bound production-batch-report-02 passed 1/1 test on the candidate commit and app tree. Desktop and mobile profiles each report 335 total meshes, 209 eligible, 208 batched, six batches, 36 dynamic meshes batched, and one compatible singleton. See diagnostics/committed-source-01/. The earlier production-batch-report-01 passed against an uncommitted working tree; it remains preserved but is not exact-source evidence.

## Required composition E2E and render budget

The required isolated run is composition-e2e-01 under attempt-01/visual-run. It passed all six Playwright behavior assertions using the unchanged PRE-G7-13 evidence variables. Two generic 404 resource errors appear in the browser log; the requested URLs were not captured. The separate visual-e2e-final and baseline-e2e runs are extras and do not replace this required run.

Three.js renderer.info was reset after shadow rendering in this installed renderer path. The runtime diagnostics therefore omit shadow-map submissions, so captured renderCalls are lower bounds. The E2E budgetAssessment reports PASS for those main-render readings, but that does not prove the packet’s inclusive call ceiling. Every row below is UNPROVEN for inclusive calls. Reported triangle counts are below their ceilings.

| Viewport | Browser | Accepted P22 tier / calls | P24 required capture tier / calls | P24 triangles / ceiling | Inclusive call ceiling |
|---|---|---:|---:|---:|---|
| 1440×900 | Chrome | HIGH / 412 | LOW / 30 | 14,392 / 300,000 | UNPROVEN |
| 1440×900 | Edge | HIGH / 412 | MEDIUM / 56 | 28,736 / 300,000 | UNPROVEN |
| 390×844 | Chrome | MEDIUM / 400 | MEDIUM / 56 | 28,592 / 140,000 | UNPROVEN |
| 390×844 | Edge | MEDIUM / 400 | MEDIUM / 56 | 28,592 / 140,000 | UNPROVEN |
| 320×600 | Chrome | MEDIUM / 414 | MEDIUM / 56 | 28,760 / 140,000 | UNPROVEN |
| 320×600 | Edge | MEDIUM / 414 | MEDIUM / 56 | 28,760 / 140,000 | UNPROVEN |
| 844×390 | Chrome | HIGH / 414 | HIGH / 56 | 28,760 / 140,000 | UNPROVEN |
| 844×390 | Edge | HIGH / 414 | HIGH / 56 | 28,760 / 140,000 | UNPROVEN |

The baseline values come from the accepted PRE-G7-22 root capture at source 500d10fa5901be48d4ff877e608d65ba0e271bb9, app tree ba0b709192367e1d12a796618f97801a8fcd5a70. A separate PRE-G7-22 delta-12 capture records MEDIUM / 412 at 1440×900; it is not the accepted root capture used here. P24 desktop Chrome adapted to LOW and Edge to MEDIUM, so neither desktop count is an original-tier pass. The receipts do not isolate the cause of the adaptation. No quality policy, DPR, or ceiling was changed in the candidate source.

## Visual parity

Overall parity is **FAIL**. The corrected pixel comparison uses the accepted P22 root screenshots and the required P24 attempt-01 screenshots. Neither 1440×900 browser comparison is same-tier: the accepted baseline is HIGH / 412 calls, while the P24 required capture is LOW / 30 in Chrome and MEDIUM / 56 in Edge. Chrome is 3.420602% identical with mean absolute RGB-channel difference 24.600188; Edge is 99.011111% identical with mean absolute difference 0.535213. Those desktop comparisons are tier-confounded and cannot prove parity.

The 390×844 images are both MEDIUM and are 99.135375% identical (2,846 of 329,160 pixels differ; mean absolute channel difference 0.431524). Visual inspection still found a green foliage object and long thin stems on the candidate’s upper-left shelf, absent from the accepted baseline. The small affected region keeps aggregate pixel error low, but it is a visible scene-geometry discrepancy. Thus even the same-tier mobile comparison does not establish semantic scene parity.

The corrected script, input screenshot hashes and measurements, side-by-side images, and difference images are in attempt-01/accepted-p22-pixel-comparisons/. The older attempt-01/pixel-comparisons/ files compare against the separate delta-12 capture; visual-parity/ compares against the P23 starting-state baseline. Both are preserved historical comparisons, not accepted-baseline proof.

## Validation results

All recorded commands used Node 24.19.0 and the project-pinned pnpm 9.15.9. The direct pnpm entry resolves the package.json pin from the app directory; the required E2E and qualifying integration pair use Corepack’s pinned entry explicitly.

| Check | Result | Evidence and qualification |
|---|---|---|
| Final focused batching tests | PASS, 49/49 | focused-source-final, candidate commit and app tree bound |
| Source-bound production batch report | PASS, 1/1 | production-batch-report-02; source commit/tree recorded in receipt and diagnostics |
| Full unit suite | PASS, 332/332 | unit-full-01 |
| Lint | PASS | lint-01 |
| Typecheck | PASS | typecheck-03 |
| Production build with evidence flag | PASS | build-01; app tree matched the committed tree |
| Required integration invocation 1 | PASS, 27 files / 287 tests | integration-uncontended-01; 103,767 ms |
| Required integration invocation 2 | PASS, 27 files / 287 tests | integration-uncontended-02; 104,392 ms |
| Required composition E2E behavior | PASS, 6/6 | composition-e2e-01; render budget remains UNPROVEN |
| Inclusive render-call ceilings | FAIL / UNPROVEN | Shadow-map submissions are absent from renderer.info |
| Same-tier visual parity | FAIL | Neither 1440×900 browser pair matches the accepted HIGH tier; mobile also shows an extra visible foliage/stem object |
| Performance suite: performance-final | FAIL, 4/6 | Both active-route and resource-stability tests timed out after 180 seconds while selecting hidden quality-tier-select |
| Performance suite: performance-suite-01 | FAIL, 4/6 | Active-route test again timed out after 180 seconds at hidden quality-tier-select; resource-stability assertion remained LOADING instead of HOME for 15 seconds |
| iPhone Safari physical-device session | NOT RUN | No device session |
| iPad Safari physical-device session | NOT RUN | No device session |
| Android Chrome with TalkBack | NOT RUN | No device session |
| Windows with NVDA | NOT RUN | No device session |
| Safari with VoiceOver | NOT RUN | No device session |
| 10-minute mobile soak | NOT RUN | No physical-device run |
| Provider/database setup, production domain, deployment | NOT RUN | Outside this local maker run |
| Local Codex substitute audit | COMPLETE; recommends FAIL / retain unaccepted | Reviewed source `017bead7` and evidence commits `806a26e9` / `edd0ab05` |
| External GPT Plus #2 audit | NOT RUN | Independent audit has not been performed |
| Parent acceptance | PENDING | No acceptance claim is made |

The two qualifying integration invocations ran sequentially with no other test/build process during either invocation. Earlier successful integration receipts remain preserved but do not qualify as a clean pair: integration-01 overlapped visual-e2e-final; integration-clean-01 overlapped integration-final-01; integration-seq-01/02 overlapped performance-final; integration-final-clean-01 overlapped baseline-build; and integration-final-clean-02 overlapped baseline-e2e. The baseline-e2e is an extra run, not the required candidate E2E.

Earlier diagnostics also remain unchanged: focused-unit-02 failed the dynamic visibility assertion (resident.visible expected false, received true); later focused runs and focused-source-final passed. focused-unit-04 passed 49 tests but emitted the existing 10-second Vite teardown timeout warning; this warning occurred in one of three P24 paired runs. typecheck-01 failed with two TypeScript errors; typecheck-02/03 passed. performance-final overlapped integration-seq runs; performance-suite-01 was a separate rerun. Both performance failures are recorded above. No timeouts, retries, thresholds, or test filters were changed.

## Receipt capture and committed-blob binding

The three stdout captures below are preserved unchanged. Their local working-copy bytes contain CRLF pairs that Git normalized to LF when committing. At verification, `core.autocrlf=true`; `text` and `eol` attributes are unspecified for each path. Replacing only each `0D 0A` pair with `0A` (leaving existing LF bytes unchanged) produced bytes identical to the committed blob. For each path, `git hash-object --path=<path> <path>` also returned the same object ID as `git rev-parse HEAD:<path>`. Exact raw and normalized SHA-256 values, byte counts, LF counts, and blob object IDs are recorded in [`receipt-capture-git-blob-normalization.json`](commands/receipt-capture-git-blob-normalization.json).

| Preserved capture | Local bytes / SHA-256 | Committed blob bytes / SHA-256 | Normalization verification |
|---|---|---|---|
| `commands/baseline-build.stdout.bin` | 1,339 / `05b9c3d8d388d752b29233b6eab80d0c9202e47749d0ced908638f362a7255bc` | 1,336 / `7a58dad67dce8cd78bcf50b39b2564465cd6843562cc4014e105abf42b6d879b` | 3 CRLF pairs converted; exact byte match |
| `commands/build-01.stdout.bin` | 1,345 / `79be1aa0269cfd13fd309b33f332118c12a8fdee440165a98d98b859299fea77` | 1,342 / `f64775ba0d47850eefc8e46d9af45c891e482fd5d779f2a09725affaa5ee0c33` | 3 CRLF pairs converted; exact byte match |
| `commands/typecheck-01.stdout.bin` | 1,019 / `5f4655756993b0ab6bc39d1d368bbf675f2394701f4968201c57022cfaab64c9` | 1,015 / `073eeb71153f0961e305191fd9de96a7d40feb4b64d687ff731a787119cac3ec` | 4 CRLF pairs converted; exact byte match |

## Follow-up and review boundary

A follow-up should first explain and correct the upper-left foliage/stem discrepancy while preserving material, transform, visibility, raycast, and shadow semantics. It should then count submissions across both main and shadow passes without relying on renderer.info’s reset counter and capture every required viewport at the unchanged original tier. Preserve this source, all receipts, and all thresholds until a separately bound correction is ready. The local Codex substitute audit of source `017bead7` and evidence commits `806a26e9` / `edd0ab05` is complete and recommends FAIL / retain unaccepted. External GPT Plus #2 audit is NOT RUN, and parent acceptance is PENDING. The maker has not accepted this candidate.
