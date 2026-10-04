# Correction commands and exit codes

Actual final executions bind app tree `3586e0c8674faac3f73bcab4d17f646e3b2e9191`. The receipts record exact argv, cwd, timestamps, exit code, source index tree and unchanged working-source delta. Failed earlier attempts remain preserved.

| Check | Actual result | Receipt |
| --- | --- | --- |
| frozenInstall | Exit0 PASS | [evidence/final-frozen-install-03.json](evidence/final-frozen-install-03.json) |
| lint | Exit0 PASS | [evidence/final-source-lint-03.json](evidence/final-source-lint-03.json) |
| typecheck | Exit0 PASS | [evidence/final-typecheck-04.json](evidence/final-typecheck-04.json) |
| unit | Exit0 PASS;20 files/266 tests,0failed/0skipped | [evidence/final-unit-04.json](evidence/final-unit-04.json) |
| integration | Exit0 PASS;24 files/224 tests,0failed/0skipped | [evidence/final-integration-03.json](evidence/final-integration-03.json) |
| build | Exit0 PASS | [evidence/final-production-build-02.json](evidence/final-production-build-02.json) |
| primaryFrozenInstall | Exit0 PASS | [evidence/primary-frozen-install.json](evidence/primary-frozen-install.json) |

Final unit/integration JSON retain all test names and outcomes. Commands executed from isolated canonical `app/` with Node24.19.0, pnpm9.15.9 and Vitest5.0.2; the final primary frozen install executed in the shared canonical `app/`. Fixture flags were absent for final checks/build.

Source commit: `git commit -m "Fix platform publication, delivery, media and telemetry gates"` exit0. Push: `git -c http.version=HTTP/1.1 -c http.postBuffer=1048576 push origin main` exit0; `d13dc18..02380c3 main -> main`. The evidence commit follows separately to bind an already observed source/push.

[Local-change disposition](local-change-disposition.json) records actual initial git status/diff/cached/log/branch/HEAD/live comparison. [Retained failure history](evidence/retained-failures.json) and worker command ledgers preserve every failed execution; no failed result was converted into PASS. Imported baseline artifacts are distinguished from current execution; their original commands/exits were not invented.

The raw-byte inventory is appropriate for the nested `.gitattributes`, which preserves existing local evidence and returned worker files. Some imported worker JSON/Markdown have a UTF8 BOM or CRLF; parse JSON with UTF8-sig. Build/dependency scratch is excluded from Git.

No full E2E/accessibility/performance or hosted/provider run was assigned to this platform correction; later RC4 integrated verification owns those. The external current performance failure is metadata plus human-supplied message, not a newly executed local performance result.

Worker media checksum paths beginning `app/` resolve from the repository root; its other paths resolve from the worker directory. Those source hashes record exact executed Windows working bytes; the identity separately records canonical Git-blob source hashes. Structural validation corrected this path-base interpretation; no evidence or source bytes changed.
