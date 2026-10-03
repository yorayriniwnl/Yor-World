# Fresh RC3 commands and exit codes

Implementation sourceCommit: `6129ad7a870f9f391455eb8a0582733a5ccccd11`. Canonical root: `app/`. Final runs use the isolated detached checkout recorded in `evidence/versions.json`; its dependencies and build outputs started absent. Earlier diagnostic/failing executions remain in execution history and are not final proof.

| Check | Exact command | Exit | Duration (s) | Evidence |
| --- | --- | ---: | ---: | --- |
| frozen-install | `pnpm.cmd install --frozen-lockfile` | 0 | 47.266 | [evidence/01-frozen-install.log](evidence/01-frozen-install.log) |
| lint | `pnpm.cmd lint` | 0 | 25.578 | [evidence/02-lint.log](evidence/02-lint.log) |
| typecheck | `pnpm.cmd typecheck` | 0 | 14.938 | [evidence/03-typecheck.log](evidence/03-typecheck.log) |
| unit-tests | `pnpm.cmd test:unit` | 0 | 6.438 | [evidence/04-unit-tests.log](evidence/04-unit-tests.log) |
| integration-tests | `pnpm.cmd test:integration` | 0 | 14.297 | [evidence/05-integration-tests.log](evidence/05-integration-tests.log) |
| asset-validation | `node scripts/release/validate-gltf-assets.mjs --output deliveries/G6/full-stack-integration/asset-validation.json` | 0 | 0.719 | [evidence/06-asset-validation.log](evidence/06-asset-validation.log) |
| production-build | `pnpm.cmd build` | 0 | 67.265 | [evidence/07-production-build.log](evidence/07-production-build.log) |
| e2e-tests | `pnpm.cmd test:e2e` | 0 | 169.828 | [evidence/08-e2e-tests.log](evidence/08-e2e-tests.log) |
| accessibility | `pnpm.cmd exec playwright test tests/e2e/accessibility.spec.ts --output test-results-accessibility` | 0 | 30.984 | [evidence/09-accessibility.log](evidence/09-accessibility.log) |
| performance-tests | `pnpm.cmd test:performance` | 0 | 84.828 | [evidence/10-performance-tests.log](evidence/10-performance-tests.log) |
| budget-regression | `node scripts/release/check-performance-budgets.mjs --benchmark-dir "C:\Users\yoray\Projects\Yor World\deliveries\G6\full-stack-integration\evidence\performance" --output deliveries/G6/full-stack-integration/budget-validation-receipt.json` | 0 | 1.859 | [evidence/12-budget-regression.log](evidence/12-budget-regression.log) |
| release-composition | `node scripts/release/check-release-composition.mjs --output deliveries/G6/full-stack-integration/release-composition.json` | 0 | 0.625 | [evidence/11-release-composition.log](evidence/11-release-composition.log) |
| release-manifest-validation | `node scripts/release/validate-release.mjs --strict --receipt deliveries/G6/full-stack-integration/release-manifest-validation.receipt.json` | 0 | 20.75 | [evidence/13-release-manifest-validation.log](evidence/13-release-manifest-validation.log) |
| bundle-assembly | `node scripts/release/build-rc3-bundle.mjs --source-commit 6129ad7a870f9f391455eb8a0582733a5ccccd11` | 0 | 19.969 | [evidence/14-bundle-assembly.log](evidence/14-bundle-assembly.log) |
| browser-report-verification | `node scripts/release/verify-playwright-results.mjs "C:\Users\yoray\Projects\Yor World\deliveries\G6\full-stack-integration\evidence\e2e\browser-results.json"` | 0 | 0.109 | [evidence/15-browser-report-verification.log](evidence/15-browser-report-verification.log) |
| accessibility-report-verification | `node scripts/release/verify-playwright-results.mjs "C:\Users\yoray\Projects\Yor World\deliveries\G6\full-stack-integration\evidence\accessibility\browser-results.json"` | 0 | 0.062 | [evidence/16-accessibility-report-verification.log](evidence/16-accessibility-report-verification.log) |
| performance-report-verification | `node scripts/release/verify-playwright-results.mjs "C:\Users\yoray\Projects\Yor World\deliveries\G6\full-stack-integration\evidence\performance\performance-results.json"` | 0 | 0.062 | [evidence/17-performance-report-verification.log](evidence/17-performance-report-verification.log) |

Test counts and measured results are in the exact command logs, browser JSON reports, release composition and budget receipt. Chromium uses the documented full-browser headless channel; the frame report identifies its actual renderer. Browser fixtures use one synthetic file-backed PostgreSQL engine across canonical routes and execute the exact accepted migrations/grant hardening. Fixture mode is absent from build and performance runs.

Local embedded transaction evidence does not prove independent hosted PostgreSQL sessions, real Supabase MFA/Storage or mail delivery. Physical devices, screen readers, hosted restore/rollback and production operations remain NOT RUN/G7-only. G6 remains pending independent audit; G7 LOCKED.
