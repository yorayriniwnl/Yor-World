# FINISH-48 A1 R9 maker return

**Status:** Evidence-only browser-environment correction complete. This is a maker return; independent audit, Parent acceptance, integration, and deployment remain pending.

## Candidate and scope

R9 is based on FINISH-A1-R8 commit `e377e06c514819ee6dbd82da2216c95813bedd2f` (tree `552cb2618c31fe000ab4fae0a9e5997c6442d084`), whose parent is R7 `76d679dcb98064152021830b98f16eb456b3ae19`. Its R8 output manifest SHA-256 is `db6957ef40d2552772dcbf0ab66acffc75222a42f8bad2ec64192cb3266abc1f`. I verified all 140 R8 output files directly from raw Git blobs (2,451,512 bytes). R8 canonical `app/` remains tree `42ea29ec235225046a75959eb19eb386ac2f821d`.

The R8 source patch SHA-256 is `6241ab27996cea9518d0d202e6cf3c9a362c63e283a91e2180158814e871f061` (238701 bytes). It was applied in fresh scratch from base `f62a43c5e71c00dcb89e28275ea81d842167db80` and reproduced replay tree `5dc26a201e715ca15757ae661639589948ab4800` and candidate app tree `0fdc8972f303cd5304f812f89ece493fef170ea1` across 25 changed paths. The R9 candidate itself contains no runtime, test, or dependency changes; all new files are under `deliveries/FINISH-A1-R9/`.

Raw-Git input verification matched 13 of 15 entries in R8 `input-hashes.json`. The two R5 independent-review files have no matching Git blob in the pinned R8/coordinator histories. Parent separately reported that their local copies match the recorded SHA-256 and byte counts; this is identified as a Parent-reported local-copy check, not raw-Git provenance. See `input-hashes.json` and `evidence/logs/input-provenance.log`.

## Rebuild and browser results

The fresh replay installed the frozen lockfile offline (404 packages reused; zero downloaded; exit 0) and built successfully with Next.js 16.3.8. Build ID: `pp5xdSckVjwwIzU_SnOxQ`. The output manifest binds 980 non-cache files (50,930,812 bytes) to the candidate app tree and exact lock hash.

Playwright 1.63.0 launched Chromium 153.0.8010.12. The installer exited 0 and installed the matching Chromium and headless-shell binaries. Its stderr also logged a self-signed certificate-chain error for an ancillary download; no TLS override was set, and browser preflight plus both test runs passed. Two fresh isolated PGlite directories were used, each confirmed absent before its run and explicitly recorded in its receipt:

- **Absent private draft:** PASS, 1/1. `YOR_E2E_FIXTURE=1`; `YOR_E2E_OMIT_CANDIDATEX_DRAFT=1`; database `F:\A1-R9-Temp-20261012\pglite\20261012T053750787479Z-absent-draft`. The valid `/admin/preview/candidatex` route returned the asserted not-found UI.
- **Normal authoring/publishing:** PASS, 6/6. `YOR_E2E_FIXTURE=1`; omission variable unset; database `F:\A1-R9-Temp-20261012\pglite\20261012T053820640625Z-normal-fixture`.

The two database paths are distinct and both are on F:. Production database and Supabase variables were unset in both browser processes. Raw stdout/stderr, Playwright result JSON, screenshot captures, exact commands, working directory, start time, duration, exit code, browser versions, and hashes are recorded under `evidence/`.

## Verification and limits

`requirement-matrix.json` separates R9 reruns from inherited R8 checks and unrun production scope. The broader R8 unit/integration/lint/typecheck checks were not rerun under FINISH-48. Provider Auth/MFA and Storage approval, production PostgreSQL, deployed route/CDN behavior, physical devices, accessibility/assistive technology, recovery, and manual operations were NOT RUN. Synthetic owner auth and local PGlite do not establish those outcomes.

No independent audit, Parent acceptance, canonical integration, or deployment claim is made. Stop here for exact-candidate independent review and Parent ruling.
