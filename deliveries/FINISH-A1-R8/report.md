# FINISH-45 A1 R8 maker return

**Status:** Focused test/evidence correction complete. Independent review and Parent acceptance remain pending. This is a maker return, not an audit, acceptance, canonical integration, or deployment.

## Candidate and scope

- Delivery: `deliveries/FINISH-A1-R8/` on `codex/finish-45-a1-test-claim-coverage-correction-20261012`.
- Source candidate: R7 commit `76d679dcb98064152021830b98f16eb456b3ae19` (commit tree `6bb0a24c3ec9b716a4728b88fc0e07d5df440cd6`), read from its exact pinned base `f62a43c5e71c00dcb89e28275ea81d842167db80`. R7 package source tree: `1bcaa9acde89fdb9541c3f2abde913a4ed2d2ec3`; R7 output manifest SHA-256: `5c42034d1ceb9cf938d7a536a436b3b53cee8094c48e3e934c419dad0fafa420`.
- R8 exact-base replay tree: `5dc26a201e715ca15757ae661639589948ab4800`; resulting `app/` tree: `0fdc8972f303cd5304f812f89ece493fef170ea1`; patch SHA-256: `6241ab27996cea9518d0d202e6cf3c9a362c63e283a91e2180158814e871f061`. The replay starts from the exact base and reproduces the packaged patch.
- The source patch changes 25 of the frozen 26 A1 paths; all are under the allowlist. The root `app/`, R7 package, and earlier R7 evidence were left unchanged. The exact changed path list is `changed-paths.txt`.
- Scope was limited to FINISH-45's three test/evidence gaps. In addition to the two test files, `source/app/src/server/content/revisions.ts` adds an E2E fixture-only way to omit the synthetic CandidateX draft. It is consulted only when `YOR_E2E_FIXTURE=1` and `YOR_E2E_OMIT_CANDIDATEX_DRAFT=1`; the fixture's default seed is unchanged. Production route/DTO behavior was not changed.

## Corrected test evidence

1. **Absent private draft page:** the owner-authenticated browser test requests valid slug `/admin/preview/candidatex` with that fixture seed omitted. The API returns 404; the page renders the generic not-found UI and no CandidateX draft content. The isolated Chromium run passed 1/1. Evidence: `evidence/r8/logs/browser-absent-draft-exact.log`, its runner receipt and Playwright result JSON, and `evidence/r8/screenshots/absent-private-draft-not-found.png`.
2. **Canonical preview URL:** the focused unit suite retains the canonical positive URL and rejects origin-confused `//` URLs, absolute URLs, query/fragment forms, literal and percent-encoded traversal, encoded slash, double encoding, encoded unreserved API-prefix characters, and other noncanonical media IDs. Focused and full unit suites passed. No runtime URL behavior change was needed.
3. **Blank evidence defaults:** the authoring browser flow asserts a newly created evidence item has unknown status, empty note and URL, and null checked time; after save it checks the persisted project API response for the same blank values. The normal-fixture Chromium run passed 6/6. Existing blank text/list/code/link defaults remain covered by the focused and full unit suites.

The specific matrix rows FINISH-27/A1-R5-03, R5-05 and R5-06 now point to these direct assertions and the final R8 logs. The matrix binds its claims to the R8 app tree and patch.

## Verification results

Every listed final check exited 0. Runner JSON files preserve exact argv, working directory, start time, duration, and exit code. Full command and raw-output receipts are under `evidence/r8/logs/`.

| Check | Result | Evidence |
| --- | --- | --- |
| Frozen-lockfile offline install | PASS | `evidence/r8/logs/install.log` and `.json` |
| Focused URL unit | PASS — 1 file, 5 tests | `evidence/r8/logs/final-focused-unit.log` and `.json` |
| Focused preview integration | PASS — 1 file, 22 tests | `evidence/r8/logs/final-focused-integration.log` and `.json` |
| Full unit | PASS — 24 files, 317 tests | `evidence/r8/logs/final-full-unit.log` and `.json` |
| Full integration | PASS — 28 files, 308 tests | `evidence/r8/logs/final-full-integration.log` and `.json` |
| ESLint | PASS — zero warnings | `evidence/r8/logs/final-lint.log` and `.json` |
| TypeScript | PASS — no emit | `evidence/r8/logs/final-typecheck.log` and `.json` |
| Exact-base replay | PASS — patch check/apply, whitespace check, 25 paths, exact R8 tree and patch reproduction | `evidence/r8/logs/patch-replay.log` and `.json` |
| Production build | PASS — Next.js 16.3.8 Turbopack; build ID `bkuEvCWn_avaExBuQBUoq` | `evidence/r8/logs/final-build.log`, `evidence/r8/build-binding.json`, `evidence/r8/build-output-manifest.json` |
| Chromium | PASS — 1 isolated missing-draft test plus 6 normal-fixture tests, across two invocations | `evidence/r8/browser-binding.json`, both Playwright result JSON files and raw logs |
| Local build canary scan | PASS — 980 `.next` files; zero matches | `evidence/r8/static-build-sentinel-scan.json` |

Tool versions: `evidence/r8/tool-versions.txt`. The authoritative browser runs used Playwright 1.63.0 and Chromium 153.0.8010.12. The omission flag was set only for the isolated absent-draft run; the other six browser tests used the normal fixture. Earlier exploratory browser attempts, including the retained failure result `evidence/r8/browser-results-early-attempt.json`, remain recorded for traceability; only the two final receipts above establish the passing result.

## Limits and remaining gates

Native PostgreSQL race testing, provider Auth/MFA, provider Storage/media approval, deployed origin/CDN/shared-cache behavior, physical-device or assistive-technology sessions, recovery/restore, manual operations, and G7 were **NOT RUN**. PGlite, synthetic owner auth/media, and local Chromium do not establish those outcomes.

No independent audit, Parent acceptance, canonical integration, deployment, or G7 claim is made. Keep the baseline immutable until the separate exact-candidate review and Parent ruling.
