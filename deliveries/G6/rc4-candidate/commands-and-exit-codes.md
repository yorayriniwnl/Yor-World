# Fresh RC4 commands and exit codes

Implementation sourceCommit: `74954fbd963537a852c1899820da14bff6bd2615`. Canonical root: `app/`. Final runs use the isolated detached checkout recorded in `evidence/versions.json`; its dependencies and build outputs started absent. Earlier diagnostic/failing executions remain in execution history and are not final proof.

| Check | Exact command | Exit | Duration (s) | Evidence |
| --- | --- | ---: | ---: | --- |
| frozen-install | `pnpm.cmd install --frozen-lockfile` | 0 | 0.906 | [evidence/01-frozen-install.log](evidence/01-frozen-install.log) |
| lint | `pnpm.cmd lint` | 0 | 7.391 | [evidence/02-lint.log](evidence/02-lint.log) |
| typecheck | `pnpm.cmd typecheck` | 0 | 2.937 | [evidence/03-typecheck.log](evidence/03-typecheck.log) |
| unit-tests | `pnpm.cmd test:unit` | 0 | 2.937 | [evidence/04-unit-tests.log](evidence/04-unit-tests.log) |
| integration-tests | `pnpm.cmd test:integration` | 0 | 18.797 | [evidence/05-integration-tests.log](evidence/05-integration-tests.log) |
| asset-validation | `node scripts/release/validate-gltf-assets.mjs --output deliveries/G6/rc4-candidate/asset-validation.json` | 0 | 0.453 | [evidence/06-asset-validation.log](evidence/06-asset-validation.log) |
| production-build | `pnpm.cmd build` | 0 | 11.453 | [evidence/07-production-build.log](evidence/07-production-build.log) |
| e2e-tests | `pnpm.cmd test:e2e` | 0 | 341.984 | [evidence/08-e2e-tests.log](evidence/08-e2e-tests.log) |
| accessibility | `pnpm.cmd exec playwright test tests/e2e/accessibility.spec.ts --output test-results-accessibility` | 0 | 34.797 | [evidence/09-accessibility.log](evidence/09-accessibility.log) |
| performance-tests | `pnpm.cmd test:performance` | 0 | 77.453 | [evidence/10-performance-tests.log](evidence/10-performance-tests.log) |
| budget-regression | `node scripts/release/check-performance-budgets.mjs --benchmark-dir "C:\Users\yoray\Projects\Yor World\deliveries/G6/rc4-candidate\evidence\performance" --output deliveries/G6/rc4-candidate/budget-validation-receipt.json` | 0 | 0.61 | [evidence/12-budget-regression.log](evidence/12-budget-regression.log) |
| release-composition | `node scripts/release/check-release-composition.mjs --output deliveries/G6/rc4-candidate/release-composition.json` | 0 | 0.531 | [evidence/11-release-composition.log](evidence/11-release-composition.log) |
| release-manifest-validation | `node scripts/release/validate-release.mjs --strict --receipt deliveries/G6/rc4-candidate/release-manifest-validation.receipt.json` | 0 | 21.922 | [evidence/13-release-manifest-validation.log](evidence/13-release-manifest-validation.log) |
| bundle-assembly | `node scripts/release/build-rc4-bundle.mjs --source-commit 74954fbd963537a852c1899820da14bff6bd2615` | 0 | 20.25 | [evidence/14-bundle-assembly.log](evidence/14-bundle-assembly.log) |
| browser-report-verification | `node scripts/release/verify-playwright-results.mjs "C:\Users\yoray\Projects\Yor World\deliveries/G6/rc4-candidate\evidence\e2e\browser-results.json"` | 0 | 0.047 | [evidence/15-browser-report-verification.log](evidence/15-browser-report-verification.log) |
| accessibility-report-verification | `node scripts/release/verify-playwright-results.mjs "C:\Users\yoray\Projects\Yor World\deliveries/G6/rc4-candidate\evidence\accessibility\browser-results.json"` | 0 | 0.047 | [evidence/16-accessibility-report-verification.log](evidence/16-accessibility-report-verification.log) |
| performance-report-verification | `node scripts/release/verify-playwright-results.mjs "C:\Users\yoray\Projects\Yor World\deliveries/G6/rc4-candidate\evidence\performance\performance-results.json"` | 0 | 0.046 | [evidence/17-performance-report-verification.log](evidence/17-performance-report-verification.log) |

Test counts and measured results are in the exact command logs, browser JSON reports, release composition and budget receipt. Chromium uses the documented full-browser headless channel; the frame report identifies its actual renderer. Browser fixtures use one synthetic file-backed PostgreSQL engine across canonical routes and execute the exact accepted migrations/grant hardening. Fixture mode is absent from build and performance runs.

Local embedded transaction evidence does not prove independent hosted PostgreSQL sessions, real Supabase MFA/Storage or mail delivery. Physical devices, screen readers, hosted restore/rollback and production operations remain NOT RUN/G7-only. G6 remains pending independent audit; G7 LOCKED.
