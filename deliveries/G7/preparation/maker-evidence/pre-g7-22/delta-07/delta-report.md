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
| Evidence inventory | PASS at audit commit 46a92f2f: 642 entries matched committed path, mode, blob ID, bytes, and SHA-256 | reviews/independent-audit-03.md |
| Source mirror parity | PASS, 126 paths; 116 source and 10 test files; no normalized parity failures or Git blob mismatches | `source/mirror-parity-audit.json` |

The first E2E case recorded a desktop Chromium WebGL2 context on Intel Iris Xe, but failed its floor-cyan pixel check: measured ratio `0`, minimum `0.1`. Its recorded quality tier was `low`; the existing low-tier policy disables the point-light layer containing the cyan fill. The same screenshot recorded 115 render calls against a 120 budget and 14,392 triangles against a 300,000 budget. No quality policy was changed. The other five E2E cases were unable to navigate because the local test server refused connections. Consequently, delta-07 has no final phone-size, compact-size, landscape, or Edge screenshots. The Playwright browser measurements are emulation and do not establish physical-device behavior.

Both integration invocations ran while the assertion still expected `-0.36`; the observed production chair-root value was `-0.91`. The expected value was then corrected in the candidate source, but the two required integration invocations were not repeated after that correction. Treat the corrected assertion as unverified by integration.

## Independent source and evidence audits

Audit 01 reviewed source commit 7b63604979db4426d334b16f049bd1be3b84f16e, the initial manifest binding 97fa25769eb46c12347bbc0cb37bc98ec79667cb, and evidence commit aed64ba62335bb60cf435a11feb40a0501f1a193. It found a stale parity-report pointer and an omitted frozen-world integration test. Both were corrected in manifest commit 07204a66cebbcdef353e4b266ff9b430687075e9. The original findings are archived in reviews/independent-audit-01.md.

Audit 02 reviewed evidence commit ddc70d9d596c7a9242ade16029523e55120921a1. It found 277 of 642 inventory entries had byte counts and SHA-256 values from the Windows worktree that differed from the committed Git blobs. The inventory generator was corrected in commit 46a92f2f9ceb850098f70ada2431c92b30cb46ce to hash staged Git blob contents. Audit 02 is archived in reviews/independent-audit-02.md.

Audit 03 reviewed commit 46a92f2f9ceb850098f70ada2431c92b30cb46ce and verified all 642 inventory entries against committed paths, modes, blob IDs, sizes, and hashes (479 unique blobs; 66,245,421 bytes). It confirmed the corrected manifest and parity report. Audit 03 is archived in reviews/independent-audit-03.md. The maker reported a deterministic generator rerun; the reviewer did not rerun it or run tests.

After both review reports were archived, the inventory generator was run again on the staged Git index to include them. This final evidence bundle lists 644 files apart from the self-excluded inventory; the candidate source and manifest are unchanged.

Exact-run source provenance remains NOT ESTABLISHED: command receipts identify the original long-path worktree but omit a Git revision and dirty-state snapshot, and recorded runs predate the source commit timestamp. E2E failure, the unverified integration correction, and required real-device checks remain open. Parent acceptance is withheld.

## Device checks and acceptance

Physical-device and assistive-technology checks remain **NOT RUN**: iPhone/iPad Safari, Android Chrome with TalkBack, Windows NVDA, Safari with VoiceOver, and a 10-minute mobile soak. The interactive `chrome://gpu` page is also **NOT RUN**. The WebGL2 and renderer values above come from the captured Playwright Chromium runtime record only.

This candidate is not accepted. The inventory discrepancy is corrected and independently verified. The E2E floor-cyan failure, unverified integration correction, exact-run provenance gap, and real-device checks remain open. Work remained local-only: no provider configuration, database operation, domain/DNS work, or deployment was performed.

The PRE-G7-22 starting worktree later showed concurrent route and lighting edits plus `delta-08` through `delta-10`. Those paths are excluded from this isolated branch and were left untouched. This report covers only delta-07 and the earlier copied PRE-G7-22 evidence.
