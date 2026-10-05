# RC4 candidate integration report

**v1.0.0-rc4 is a CANDIDATE. G6 remains ACTIVE / REWORK; G7 remains LOCKED.** This is maker evidence only. It is not an audit, a G6 acceptance, or a deployment authorization. Gemini was not available (no callable Gemini connection); the work was executed locally by the Antigravity/Claude coding agent at the human's request ("Complete it" with scope confirmed as "Build RC4 now ... stop before G6 acceptance and G7").

## Binding

| Item | Value |
| --- | --- |
| Candidate source commit (pushed to `main`) | `74954fbd963537a852c1899820da14bff6bd2615` |
| Coordination base | `195ea1371331ad50d553d2dc62b563eaa218ed38` |
| Superseded candidate (RC3, immutable history) | `261c483646f68692a3fe8e184d48d25b8264a6d7`, implementation `6129ad7a870f9f391455eb8a0582733a5ccccd11` |
| Corrections included | `02380c3` (SCP-01..06), `83000ce` (SCP-04 APNG, SCP-07 durable GitHub coordination + migration) |
| Schema binding | `20261005000000_schema_v2` (additive `github_refresh_state`; historical `20261002000000_schema_v1` preserved) |
| Bundle | 232 files, 1,636,394 bytes, SHA-256 `8d841ce6ec4ecdc9ee3af16ac265b3aca93f25979d7952fac3d47b608f4e721a` |
| Manifest validation | strict PASS (`release-manifest-validation.receipt.json`, `verifiedHead` = source commit) |

The source commit changes only release tooling, CI, package version and status tokens relative to the corrected platform code at `195ea13`. See [source-binding.json](source-binding.json) for the 53-file diff against the RC3 implementation and [evidence/historical-immutability.json](evidence/historical-immutability.json) (no historical delivery path changed).

## Results (local, exact source commit)

| Check | Result |
| --- | --- |
| Frozen install, lint, typecheck | PASS (exit 0) |
| Unit tests | PASS 266/266 (20 files) |
| Integration tests | PASS 280/280 (26 files) |
| Khronos asset validation | PASS |
| Production build | PASS |
| Full E2E | PASS 194/194, zero failed/flaky/skipped |
| Accessibility | PASS 34/34, zero failed/flaky/skipped |
| Performance browser tests | PASS 6/6, zero failed/flaky/skipped |
| Budget regression, release composition | PASS |
| Manifest/archive strict validation | PASS |

**Counts differ from RC3 by design of the local runner, not by new tests.** With `CI` unset, `playwright.config.ts` runs the same 97 E2E and 17 accessibility tests in two projects (`chrome` and `msedge`) on Windows, giving 194 and 34 executions. GitHub CI sets `CI=true` and runs one Chromium project (97/17). The assembler's expected counts were set to the actual local values.

Commands, exit codes and durations: [commands-and-exit-codes.md](commands-and-exit-codes.md). Hashes: [SHA256SUMS.txt](SHA256SUMS.txt).

## Failures retained

- First E2E attempt: 174 passed, 11 failed. Cause was a bug in my local driver (it deleted the parent temp directory and did not recreate it, so fixture DB creation failed with `ENOENT mkdir`). Not an application defect. Retained in [evidence/initial-e2e-harness-failure](evidence/initial-e2e-harness-failure/README.md); the corrected rerun is the authoritative result.
- Pushing the source-only commit `74954fb` cannot satisfy CI step 13 (no RC4 manifest existed at that SHA). That run's failure at step 13 is expected and is superseded by the evidence commit's run.

## Limits (NOT RUN)

- Not a fresh checkout: local `node_modules` pre-existed. Fresh-checkout proof is the GitHub CI run on the pushed evidence HEAD (recorded separately after observation).
- Hosted Supabase Auth/REST/Storage/effective grants, native independent PostgreSQL sessions (blocked earlier by Windows Application Control WinError 4551), real GitHub/mail services, physical devices, screen readers, deployed restart/scaling/restore, and live rollback: NOT RUN.
- Local frame pacing is software/local-renderer lab evidence, not device certification.

## Next

GPT Plus #2 independent full-stack/delta audit of this candidate, then GPT Plus #1 G6 decision. G7 requires explicit owner authorization plus the ten live criteria in the [G7 protocol](../../../docs/planning/releases/2026-10-02-g7-production-release-protocol.md). The RC3 review handoff stays held and must not silently take this target.
