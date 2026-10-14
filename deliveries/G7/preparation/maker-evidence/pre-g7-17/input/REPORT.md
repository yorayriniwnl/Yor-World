# PRE-G7-16 maker report

Worker identity: local Codex substitute for Gemini #3 (runtime/integration maker). No external Gemini account performed this work, and this report is not an audit or acceptance.

## Scope and source identity

The only implementation change is the Vitest integration setting fileParallelism: false, mirrored at the delivery root. The default integration command, 60,000 ms test timeout, 90,000 ms hook timeout, isolation, assertions, and all 286 tests are preserved. No test retry, timeout override, skip, or weakened assertion was added.

The source branch is codex/pre-g7-16-canonical-fixture-20261015. It starts from accepted PRE-G7-15 source commit 8becac4ea3e9decc91ca2807e2004a0aa0407105 with app tree 26d4885d4c76233168baaea52c5a33aca1ede594. The source-only change is commit f71d1df028f80637abb3e427040f0e0f5085179c; full tree 990323fa18d7c34fefdb8fe822b839c76d0e2ee0; resulting app tree a19c817a7ebfa8962f0b898364ca01e8770e302a. The source commit contains exactly the app integration config and its domain mirror.

## Diagnosis

PRE-G7-15's isolated canonical fixture passed 1/1 in 51.36 s, while its two default integration runs each ended 285/286 with the canonical fixture's unchanged 60 s timeout. Those original logs and the isolated baseline receipt are copied under input/.

PRE-G7-16 attempt 01 ran the full integration command on a temporary snapshot with timing-only instrumentation. It failed after 190.53 s: 11 files failed, 16 passed; 1 test failed, 157 passed, 128 skipped. The canonical fixture's first database migration completed at +165,829 ms; multiple unrelated PGlite setup hooks hit the unchanged 90 s limit. An ad hoc in-run WMI process snapshot showed at least 11 Vitest worker processes active. That WMI snapshot was not retained as a separate raw artifact, so the worker count is reported as an operator observation. This pattern supports cross-file PGlite startup contention as the scheduling cause, but does not independently prove a specific database defect.

Attempt 02 was an accidental full-suite run: the intended focused path was forwarded but Vitest still executed all 27 files. The raw run is preserved and classified in attempt-02/provenance.txt. It failed with 4 files failed and 23 passed; 1 test failed, 231 passed, 54 skipped, plus 10 worker teardown errors. Timing instrumentation logged a migration completion at +74,867 ms. The console.error timing markers left Vitest's onUserConsoleLog pending during worker teardown, so this is diagnostic evidence, not a clean baseline result.

After adding only fileParallelism: false, the focused canonical fixture passed 1/1 in 40.32 s. The exact default command pnpm run test:integration then passed 27/27 files and 286/286 tests in 342.47 s, using the unchanged 60 s and 90 s limits. The suite ran in file-serial mode and retained all test files and isolation.

**The packet's integration acceptance gate remains unresolved.** The cap allowed at most three full-suite invocations. Attempts 01 and 02 failed before the correction, and attempt 03 is the only post-correction default-suite pass. Two consecutive 286/286 default-suite passes were not achieved; no fourth suite run was made.

## Validation

All commands below used Node 24.19.0 and pnpm 9.15.9 via the pinned npx wrapper recorded in the raw logs. The test snapshot was a physical directory assembled from the accepted source archive with the authorized integration-config change overlaid and pinned dependencies installed. test-snapshot-audit.json records exact hashes for the canonical test, fixture helper, both Vitest configs, and package manifest; all six match the final source snapshot.

- Attempt 01 diagnostic full integration: FAIL; 11 files failed, 16 passed; 1 failed, 157 passed, 128 skipped; exit 1.
- Attempt 02 accidental instrumented full integration: FAIL; 4 files failed, 23 passed; 1 failed, 231 passed, 54 skipped; 10 teardown errors; exit 1.
- Attempt 03 focused canonical fixture: PASS, 1/1 in 40.32 s; exit 0.
- Attempt 03 default full integration: PASS, 27/27 files and 286/286 tests in 342.47 s; exit 0.
- Full unit suite: FAIL, 25/26 files and 326/327 tests passed. tests/unit/boundaries.test.ts exceeded its unchanged 5 s test timeout; the test body took 9.154 s. The separate focused run of the same accepted test bytes and unchanged unit config passed 18/18 in 15.36 s. This narrows the failure to the full-suite run context; the full unit result remains a failure.
- Lint: PASS, eslint . --max-warnings=0, exit 0.
- Typecheck: PASS, tsc --noEmit, exit 0.
- Production build: NOT RUN; the only source change is test-runner configuration, so the packet's build condition for production source changes does not apply.
- Physical-device and user's Chrome/GPU checks: NOT RUN; GPU state remains NOT PROVIDED.

The source/delivery mirror audit passes: 116 source files and 10 test files have identical Git blobs and LF-normalized bytes; the paired integration configs also have identical raw worktree bytes and identical Git blobs. The 126 local raw-byte differences among pre-existing source/test mirror entries are Windows checkout line-ending conversions; they are separately reported in mirror-parity-audit.json, not counted as committed mirror mismatches. All 17 protected model, texture, and contract hashes match the accepted PRE-G7-15 source.

## Evidence and remote state

The raw command outputs, setup failures, diagnostic logs, idle checks, focused tests, source patch, test-snapshot audit, mirror audit, and protected-hash audit are retained beneath this directory. source-delivery-manifest.json records the PRE-G7-16 packet lineage, accepted source base, resulting app tree, preserved domain override, and configuration mirror.

Source commit f71d1df028f80637abb3e427040f0e0f5085179c was pushed to origin/codex/pre-g7-16-canonical-fixture-20261015 and verified by git ls-remote. The final evidence is a separate commit and is pushed to the same branch. Work remains subject to independent read-only audit and separate parent acceptance; no self-acceptance is claimed. This is local-only work; no provider, DNS, or deployment configuration was performed.

evidence-inventory.json records every evidence file plus the root source-delivery manifest; it omits only its own recursive hash and is hashed after generation.

The evidence-local .gitattributes disables Git line-ending conversion inside the evidence bundle so raw logs and their inventory hashes remain byte-exact in the committed artifacts.
