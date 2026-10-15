# PRE-G7-22 delta-07 maker report

Candidate source commit: `7b63604979db4426d334b16f049bd1be3b84f16e` (tree `46ece6472248ee768418d4030e52022932605873`). The `app/` tree is `8ef938d8fbfb048b6f98020819b5fb9997e3c3c0`. The corrected source-delivery manifest binds this candidate in commit `07204a66cebbcdef353e4b266ff9b430687075e9`.

This delta moves the named ivy pot, ivy, and vines onto the upper shelf while keeping the pot at its existing contact point. Two existing monstera leaf cards are reduced to scale `0.45` and placed beside the ivy; the remaining monstera parts stay on the floor. The unit assertion now checks that scale and shelf placement. The frozen-world integration assertion was corrected from chair-root Z `-0.36` to the observed `-0.91`, which includes the desktop composition's `-0.55m` offset. The runtime and mirror changes are present in the paired source files in `yorayriniwnl.in/`.

## Verification

| Check | Result | Evidence |
|---|---|---|
| Instrumented evidence build | PASS, exit 0 | `commands/evidence-build.*` |
| Unit tests | PASS, 327/327, exit 0 | `commands/test-unit.*` |
| Lint | PASS, exit 0 | `commands/lint.*` |
| Typecheck | PASS, exit 0 | `commands/typecheck.*` |
| Production build | PASS, exit 0; post-E2E build also PASS | `commands/build.*`, `commands/post-e2e-build.*` |
| Isolated Playwright E2E | FAIL, exit 1; 6/6 tests failed | `commands/e2e.*`, `visual-run/` |
| Integration run 1 | FAIL, 285/286 | `commands/integration-01.*` |
| Integration run 2 | FAIL, 285/286 | `commands/integration-02.*` |
| Source mirror parity | PASS, 126 paths; 116 source and 10 test files; no normalized parity failures or Git blob mismatches | `source/mirror-parity-audit.json` |

The first E2E case recorded a desktop Chromium WebGL2 context on Intel Iris Xe, but failed its floor-cyan pixel check: measured ratio `0`, minimum `0.1`. Its recorded quality tier was `low`; the existing low-tier policy disables the point-light layer containing the cyan fill. The same screenshot recorded 115 render calls against a 120 budget and 14,392 triangles against a 300,000 budget. No quality policy was changed. The other five E2E cases were unable to navigate because the local test server refused connections. Consequently, delta-07 has no final phone-size, compact-size, landscape, or Edge screenshots. The Playwright browser measurements are emulation and do not establish physical-device behavior.

Both integration invocations ran while the assertion still expected `-0.36`; the observed production chair-root value was `-0.91`. The expected value was then corrected in the candidate source, but the two required integration invocations were not repeated after that correction. Treat the corrected assertion as unverified by integration.

## Independent source and evidence audit

A separate read-only review checked source commit `7b63604979db4426d334b16f049bd1be3b84f16e`, manifest commit `97fa25769eb46c12347bbc0cb37bc98ec79667cb`, and evidence commit `aed64ba62335bb60cf435a11feb40a0501f1a193`. It found that the manifest pointed to an older parity report and omitted the changed frozen-world integration test from its parity list. Both defects were corrected in manifest commit `07204a66cebbcdef353e4b266ff9b430687075e9`; the candidate parity audit was rerun and passed across 126 paths (116 source and 10 tests), with zero normalized-content or Git-blob parity failures. The updated manifest points to this candidate-specific report. The archived first review is `reviews/independent-audit-01.md`.

The review also found exact-run source provenance **NOT ESTABLISHED**: command receipts identify the original long-path worktree but omit a Git revision and dirty-state snapshot, and the recorded runs predate the source commit timestamp. The source tree and mirror are independently identified, but those receipts cannot prove the test run used the exact pushed tree. The E2E failure, integration assertion without a passing rerun, and real-device checks remain open. Independent delta review of the corrected binding/evidence commits and parent acceptance are pending.
## Device checks and acceptance

Physical-device and assistive-technology checks remain **NOT RUN**: iPhone/iPad Safari, Android Chrome with TalkBack, Windows NVDA, Safari with VoiceOver, and a 10-minute mobile soak. The interactive `chrome://gpu` page is also **NOT RUN**. The WebGL2 and renderer values above come from the captured Playwright Chromium runtime record only.

This candidate is not accepted. Independent exact-commit review and parent acceptance are pending. The E2E floor-cyan failure remains open, and the required device checks need real hardware and assistive technology. Work remained local-only: no provider configuration, database operation, domain/DNS work, or deployment was performed.

The PRE-G7-22 starting worktree later showed concurrent route and lighting edits plus `delta-08` through `delta-10`. Those paths are excluded from this isolated branch and were left untouched. This report covers only delta-07 and the earlier copied PRE-G7-22 evidence.
