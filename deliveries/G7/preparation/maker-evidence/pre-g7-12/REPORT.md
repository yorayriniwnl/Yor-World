# PRE-G7-12 maker report: reference composition and mobile controls

**Result: FAIL / NOT ACCEPTED. No deployment was performed; G7 is not accepted.** This report records the maker result and source-bound evidence. Parent acceptance remains pending.

## Revisions and scope

- Packet/base status commit: `67026f26bb80d81de4edf632b3038b0239eea4de`.
- Accepted PRE-G7-11 source input: `cfdc744f69cd257c8ac0cbaad78b8805c48f20d5`; app tree `915c26f4b9a1fa075614ea64959750f9e486187c`.
- PRE-G7-12 source: `43d3c0289fd5afe5970d799c77f9a701b4d71d0e`; app tree `77f3af861ffe4d6b96154fcfba792490b3cc45dc`.
- Source was pushed in `4e29c166e3b32a91c9339eb42132ac30141e512c` and endpoint correction `43d3c0289fd5afe5970d799c77f9a701b4d71d0e`.
- Domain mirror was pushed in `aac69fe9d46d360f7aedea2b7bc90fee4bd71bd9` and final correction sync `11fe035800ed877e1b4a556c7663e8aafb57124c`.
- The final evidence snapshot and checksum-only commit are identified by `evidenceSnapshotCommit` in [SHA256SUMS.json](SHA256SUMS.json) and the final Git handoff. The checksum file is excluded from hashing itself.
- Eleven canonical app files changed relative to the packet base. The accepted production GLB and chair fixture bytes are unchanged. The domain keeps its intentional `https://yorayriniwnl.in` base URL override.
- The final desktop camera x-coordinate is `-0.5`. This binary-exact endpoint avoids the one-bit `-0.44999999999999996` result from the existing entrance interpolation.

The source updates the existing scene framing and named lighting, repositions authorized named groups, adds a simple code-native headset stand after the inventory confirmed none exists, and makes the mobile control surface a compact drawer. The existing control actions and route semantics remain available. No routes, GLB/model files, dependencies, provider settings, runtime lifecycle/retry policy, DNS, or production configuration were changed.

## Visual review

The exact-source captures are [desktop 1440 by 900 beside the reference](attempt-18/screenshots/studio-reference-desktop-1440x900-reference-comparison.png) and [mobile 390 by 844 beside the reference](attempt-18/screenshots/studio-reference-mobile-390x844-reference-comparison.png). The scene is the accepted production GLB/runtime, not an illustration.

**Visual acceptance FAIL.** The arrangement is recognizable, with the desk, chair, resident, monitor, speakers, microphone, shelf/plant group, PC and pegboard in the opening view. In the current final capture the room reads flat gray compared with the bright reference, the lilac panels read as rectangular blocks rather than a clear honeycomb, the warm monitor bar and cyan fill are weak, and the low-poly assets do not approach the reference's richness. The mobile view exposes the workstation, but the room remains modest in scale within the portrait frame. The frozen model was not edited; geometry/export changes require a separate packet.

The source-bound projected-anchor ledger uses production GLB SHA-256 `3a02647d24e474c8a2579b0d277cf02a7841212e961c1554f67b6e032e40a307` and fixture SHA-256 `8e413b1aa407841b5fd268a9c00bb66718688957c6507551f3b79104132d81d8`: [projected bounds](attempt-18/measurements/projected-anchor-bounds.json), [desktop ledger](attempt-18/measurements/desktop-1440x900-anchor-ledger.json), [mobile ledger](attempt-18/measurements/mobile-390x844-anchor-ledger.json). All recorded anchors intersect the measured frusta and none is fully covered by closed HUD chrome; this does not establish visual recognition.

The closed-drawer fixed-chrome ratios are 2.21% at 1440 by 900, 8.01% at 390 by 844, 11.65% at 320 by 600, and 8.70% at 844 by 390. The scene stage fills each viewport and the document width matches it. The new browser test opened and closed the drawer, checked all 25 existing semantic controls (26 visible actions including the drawer toggle), keyboard reachability, focus return, Diagnostics-first Escape behavior, reduced motion, route links, and minimum 44-pixel targets.

## Validation

Host: Node 24.14.0, pnpm 9.15.9. The package requires Node `>=24.19.0 <25`; commands emitted that engine warning. Browser: Playwright-managed headless Chromium 155 on Windows/Win32, DPR 1, WebGL 2, unmasked Intel Iris Xe / Direct3D11. Phone and landscape sizes are emulated viewports, not physical devices.

| Check | Result | Command and exit | Evidence and limitation |
|---|---|---|---|
| Full unit suite | PASS, 321/321 | `corepack pnpm test:unit`, exit 0 | [log](attempt-18/full-unit-suite.log). |
| Full integration suite | PASS, 286/286 | `corepack pnpm test:integration`, exit 0 | [log](attempt-18/full-integration-suite.log); includes production camera and lighting integration. |
| Focused production camera | PASS, 5/5 | `corepack pnpm exec vitest run --config vitest.integration.config.ts tests/integration/production-camera.test.ts`, exit 0 | [log](attempt-18/focused-production-camera.log); exact endpoint regression is covered. |
| Focused production lighting | PASS, 4/4 | `corepack pnpm exec vitest run --config vitest.integration.config.ts tests/integration/production-lighting.test.ts`, exit 0 | [log](attempt-18/focused-production-lighting.log). |
| Reference composition and mobile drawer | PASS, 3/3 | `corepack pnpm exec playwright test tests/e2e/world-reference-composition.spec.ts --project=chrome`, exit 0 | [Playwright result](attempt-18/e2e-results/browser-results.json), [run log](attempt-18/composition-browser.log), screenshots and measurements above. Automated pixel checks pass; visual comparison still fails as described. |
| Lint | PASS | `corepack pnpm lint`, exit 0 | [log](attempt-18/full-lint.log). |
| TypeScript | PASS | `corepack pnpm typecheck`, exit 0 | [log](attempt-18/typecheck.log). |
| Production build | PASS | `corepack pnpm build`, exit 0 | [log](attempt-18/production-build.log). |
| CandidateX production 404 guard | PASS, 1/1 | `corepack pnpm exec playwright test tests/e2e/room-project-navigation.spec.ts --project=chrome --grep candidatex`, exit 0 | [log](attempt-18/candidatex/candidatex-404-guard.log). |
| Clean-profile public shell | PASS, 8/8 | `corepack pnpm exec playwright test tests/e2e/public-shell.spec.ts --project=chrome`, exit 0 | [log](attempt-18/clean-profile/clean-profile-production-smoke.log); automated public routes/accessibility/reflow only, not the 3D visual target. |
| Focused legacy recovery/fullscreen | FAIL, 6/13 | `corepack pnpm exec playwright test tests/e2e/world-fullscreen.spec.ts tests/e2e/renderer-recovery.spec.ts --project=chrome`, exit 1 on source `4e29c166...`; not rerun after the final `-0.05` camera endpoint correction | [log](attempt-17/focused-recovery-fullscreen.log), [results](attempt-17/recovery-fullscreen/browser-results.json). Seven failures use old helpers that expect controls visible before opening the new drawer, or hit a navigation intercept. New drawer mechanics are covered by the final-source 3/3 test above. |
| Domain source mirror | PASS | `node deliveries/G7/preparation/maker-evidence/pre-g7-12/sync-final-mirror.mjs`, exit 0 | [result](mirror-sync-result.json); 122 normalized source/test pairs verified, with 111 raw line-ending differences. Override SHA-256 remains `415e2f1291d4adcf6d1bf4927668339c332e0ee85be602d97c6b23d269e4b4ca`. |
| Physical Safari/iOS, Android/TalkBack, Windows/NVDA, VoiceOver/Safari and device soak | NOT RUN | Requires physical-device sessions | Browser emulation is not substituted. |
| Formal independent GPT Plus #2 audit and parent acceptance | NOT RUN | No independent audit report for this exact final source/evidence revision was available in this workspace | This maker report is not an independent review or acceptance. |
| Deployment, DNS and provider checks | NOT RUN | Explicitly outside PRE-G7-12 | No live change was made. |

The desktop browser log also records a missing `/favicon.ico` and aborted in-flight RSC requests during navigation; the latter occurred as navigation replaced requests. No route or favicon changes were in this packet.

## Handoff

The exact source and mirror commits are pushed to `codex/pre-g7-12-reference-composition-20261014`. This result is not accepted: visual fidelity remains below the reference and the legacy recovery/fullscreen suite has the disclosed failures. Physical-device checks, formal independent audit, parent acceptance, deployment, and G7 remain open.