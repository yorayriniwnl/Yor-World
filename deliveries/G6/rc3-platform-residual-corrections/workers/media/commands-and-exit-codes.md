# Media worker execution ledger

Canonical command working directory: `C:/Users/yoray/AppData/Local/Temp/yw-res-2af509/app`. `<return>` means `C:/Users/yoray/Projects/Yor World/deliveries/G6/rc3-platform-residual-corrections/workers/media`; `<fixtures>` means the scratch app's `tests/fixtures/residual-media`. PowerShell receipt wrappers capture `$LASTEXITCODE`, UTC timestamps and the actual working directory before exiting with the child command's status. File paths in receipt command labels abbreviate these same explicit paths.

| Command | Exit | Actual result / evidence |
| --- | --- | --- |
| `python <return>/evidence/prepare-fixtures.py <primary independent media fixtures> <fixtures>` | 0 | Four immutable byte copies + five generated fixtures; manifest hashes bind all nine |
| `pnpm exec vitest run --config vitest.integration.config.ts tests/integration/platform/residual-media-still-images.test.ts tests/integration/platform/scp-media-validation.test.ts --reporter=default --reporter=json --outputFile.json=<return>/evidence/focused-results.json` | 0 | Initial 66/66 PASS; preserved `focused-initial-*` |
| `pnpm exec eslint src/server/media/validate-upload.ts tests/integration/platform/residual-media-still-images.test.ts --max-warnings=0` | 0 | Initial bounded lint PASS |
| `pnpm exec tsc --project <return>/evidence/tsconfig-media.json` | 2 | Initial failure: spy generic/PGlite row typing in new test; concurrent other maker fixture row typing; preserved `typecheck-initial-*` |
| `python <return>/evidence/inspect-fixtures.py <fixtures>` | 0 | `fixture-oracle.json`, valid two-frame APNG vs valid-CRC corrupt second-frame decode failure |
| `node --version` | 0 | v24.19.0 |
| `pnpm --version` | 0 | 9.15.9 |
| Inline `node --input-type=module -e <dependency version query>` | 1 | PowerShell/native quote loss, syntax error before query; corrected with actual `.mjs` script |
| `node <return>/evidence/runtime-versions.mjs <scratch app>` | 0 | `runtime-versions.json`: Vitest5.0.2, PGlite0.5.8, Sharp0.35.5/libvips8.18.7 |
| Final focused Vitest command above, after test typing correction | 0 | **66 total,66 PASS,0 FAIL,0 skipped**, new32 + retained34; `focused-*` and `post-observations.json` |
| Final bounded ESLint command above | 0 | `lint.log`, `lint-receipt.json` |
| Final strict TypeScript command above | 0 | `typecheck.log`, `typecheck-receipt.json`; no weakening |
| `git rev-parse HEAD`, `git rev-parse HEAD:app` | 0 | Exact supplied base HEAD/tree |
| `git diff --check -- app/src/server/media/validate-upload.ts` | 0 | No whitespace errors |
| `git diff -- app/src/server/media/validate-upload.ts` | 0 | Five added lines only; archived `source.patch` |
| `python <return>/evidence/package-return.py <scratch root> <primary root>` | 0 | Twelve actual owned files copied into `files/app/`, identity and hashes generated |
| Full install/lint/typecheck/unit/integration/build | NOT RUN by worker | Parent owns installation and combined suite receipts |
| Hosted/Gemini/deployment/Git commit/push | NOT RUN by worker | Explicit local maker boundary; parent integration and commit/push follow |

No test counts are pooled across reruns. Empty lint/typecheck raw logs mean the corresponding process emitted no diagnostics; nonzero exit status is preserved for the initial typecheck. The final result files and observations supersede initial files while retaining them for audit.
