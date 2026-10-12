# FINISH-49 A1 R10 maker return

**Status:** Evidence-only replay and browser environment correction completed. This is a maker return; fresh independent audit and Parent acceptance remain pending.

## Candidate and source recovery

- Branch: `codex/finish-49-a1-r8b-r10-provenance-correction-20261012`. R10 is intended as a child of R8B `f5978b91ea981d740ab0ba42b46368175f045cf8`; R8 `e377e06c514819ee6dbd82da2216c95813bedd2f` and R9 `a2f0e218f8153ceec311616f49b7b654c9892bb2` remain immutable.
- Exact R8 base: `f62a43c5e71c00dcb89e28275ea81d842167db80`. The unchanged 238,701-byte R8 patch has SHA-256 `6241ab27996cea9518d0d202e6cf3c9a362c63e283a91e2180158814e871f061`. Replay tree: `5dc26a201e715ca15757ae661639589948ab4800`; candidate app tree: `0fdc8972f303cd5304f812f89ece493fef170ea1`, matching the R8 and R9 candidate app-tree bindings. Replay evidence is `evidence/logs/replay-verification.log`.
- The 15 declared R8 inputs are now traced as 13 raw-Git inputs from R8 history and two files added as raw Git blobs in R8B. The two copies retain historical origin `PARENT-LOCAL-COPY`; their original paths have no raw Git blobs in R8. The R8B binding does not imply earlier provenance. See `input-hashes.json` and the R8B recovery record.
- No app, test, dependency, R8, R9, or historical review files were changed. R10 contains only `deliveries/FINISH-A1-R10/`.

## Verification

- Frozen offline dependency install: **PASS**, exit 0. Raw stdout, stderr, and command receipt are under `evidence/logs/install.*`.
- Production build: **PASS**, exit 0, Next.js `16.3.8`, build ID `ALNsgVdw0v06rsPr94bsL`; 980 files totaling 50,930,833 bytes. The build output manifest SHA-256 is `8365b6c85f72a28eb8ef5c1905f9f090467be1a24a8921fb58146a81d77eff1c`. Raw logs and receipt are under `evidence/logs/build.*`.
- Chromium preflight: **PASS**, Playwright `1.63.0`, Chromium `153.0.8010.12`. The existing F: R9 browser cache was reused read-only; binary hashes are in `evidence/browser-version.json`.
- Absent private draft case: **PASS**, 1/1. A synthetic owner-cookie requests valid `/admin/preview/candidatex` while the CandidateX seed is omitted via the fixture-only `YOR_E2E_OMIT_CANDIDATEX_DRAFT=1` switch (with `YOR_E2E_FIXTURE=1`); the rendered not-found capture is included. Fresh PGlite path: `F:\A1-R10-Temp-20261012\pglite\20261012T064936239747Z-absent-draft`.
- Normal fixture browser cases: **PASS**, 6/6, with the default CandidateX fixture seed. A distinct fresh PGlite path was used: `F:\A1-R10-Temp-20261012\pglite\20261012T064936239747Z-normal-fixture`.
- Both browser runs use local PGlite and synthetic auth/media; provider Auth/Storage, production DB, deployed origin/CDN, physical devices, assistive technology, accessibility/recovery sessions, and live behavior remain **NOT RUN**. Full unit/integration, lint, and typecheck suites were not rerun in R10; the existing R8 receipts are prior candidate evidence only.

## Remaining gate

Fresh exact-candidate GPT Plus #2 audit, Parent decision, canonical integration, deployment, and G7 are **NOT RUN**. See `requirement-matrix.json`, `candidate-binding.json`, browser/build bindings, raw logs, JSON results, and captures.
