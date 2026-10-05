# Parent execution ledger

All six requested combined checks executed in `C:/Users/yoray/AppData/Local/Temp/yw-res-2af509/app`, a detached checkout of `2af509296a1eebd5f8dee37936fbff8ba7bbd658`. Frozen dependency installation preceded the final source freeze; dependency/lockfile bytes were unchanged. Lint, typecheck, unit, integration and build then ran against the two makers' frozen 17-file delta. Node 24.19.0, pnpm 9.15.9; exact argument arrays, UTC times, raw logs and their hashes are in [parent-checks.json](evidence/parent-checks.json). The full checks used CI=true and NEXT_TELEMETRY_DISABLED=1. Build and final typecheck ran sequentially.

| Exact executable and arguments | Exit | Elapsed | Receipt |
| --- | --- | --- | --- |
| `pnpm.cmd install --frozen-lockfile` | 0 | 42.547s | [receipt](evidence/frozen-install.json) |
| `pnpm.cmd lint` | 0 | 40.141s | [receipt](evidence/lint.json) |
| `pnpm.cmd typecheck` | 0 | 6.812s | [receipt](evidence/typecheck.json) |
| `pnpm.cmd test:unit --reporter=default --reporter=json --outputFile.json=C:\Users\yoray\Projects\Yor World\deliveries\G6\rc3-platform-residual-corrections\evidence\unit-results.json` | 0 | 9.906s | [receipt](evidence/unit.json) |
| `pnpm.cmd test:integration --reporter=default --reporter=json --outputFile.json=C:\Users\yoray\Projects\Yor World\deliveries\G6\rc3-platform-residual-corrections\evidence\integration-results.json` | 0 | 22.515s | [receipt](evidence/integration.json) |
| `pnpm.cmd build` | 0 | 35.516s | [receipt](evidence/production-build.json) |

Actual final unit counts: 266/266 PASS in 20 files; integration: 280/280 PASS in 26 files; zero failures/skips/todos. The 56 new canonical tests are media 32 and durable GitHub 24. Focused media66/66 and GitHub 41/41 overlap existing/full integration tests and must not be added to those totals. Independent delta25/25 is a separate executed probe suite. [Test evidence map](tests/evidence/README.md).

Earlier failures remain disclosed in the [media ledger](workers/media/commands-and-exit-codes.md), [GitHub ledger](workers/github/commands-and-exit-codes.md) and [independent report](review/delta/report.md): media narrow compiler exit 2 (two owned test typing defects and the other maker fixture query type), failed shell-quoted version query exit 1, GitHub initial31/37 exit 1 (six millisecond stale-boundary failures), narrow compiler exit 1 and two new-test lint errors exit 1. Makers corrected their own assigned files; final focused/full checks passed without weakening rules. The reviewer initially encountered MODULE_NOT_FOUND before installation; its final25 executed cases passed.

Parent native fixture preparation exited1: `postgres.exe --version` was blocked by Windows Application Control WinError 4551 before initdb/server startup. [Exact blocker and publisher provenance](evidence/postgres-execution-block.json). Native DB sessions NOT RUN; no policy bypass. Optional runnable probes remain in [native.optional.ts](review/delta/native.optional.ts) and the canonical GitHub test's YOR_GITHUB_TEST_DATABASE_URL branch.

Initial `python tools/integrate-source.py` exited1 after copying the scoped delta: a whole raw-byte fingerprint check saw 76 unaltered baseline files with checkout CRLF differences. The corrected verification exited0 after checking all 17 changed files against tested raw bytes and the reviewer Git blobs, and checking every other difference was only CRLF. [Integration receipt](evidence/source-integration.json). No source correction or new suite rerun was required. Canonical committed app/source identity matches the tested delta.

Initial parent return-validator executions exited1 for a retained PowerShell UTF-16 JSON receipt decoded as UTF-8 and a link to its own not-yet-created validation receipt. The reader now honors byte-order markers and the staged read-only pass verifies the final receipt target; original worker evidence bytes were preserved. Final validation checks every JSON document, local Markdown target, worker checksum, source/input identity and root inventory. [Final packaging validation](evidence/return-validation.json).

`git diff --cached --check` exited0. `git commit -m 'fix(platform): reject APNG and coordinate GitHub refresh attempts'` exited0 and produced `83000ceb4f6046ba92f4764cb99ee64bde68dd22`. `git -c http.version=HTTP/1.1 -c http.postBuffer=1048576 push origin main` exited0, output `2af5092..83000ce main -> main`; independent `git ls-remote origin refs/heads/main` matched the implementation commit. Return artifacts are committed/pushed separately with the same app tree.

No E2E/accessibility/performance, exact RC4 CI, hosted external services, release regeneration, acceptance or deployment was run by this packet. Earlier evidence is not represented as fresh execution.
