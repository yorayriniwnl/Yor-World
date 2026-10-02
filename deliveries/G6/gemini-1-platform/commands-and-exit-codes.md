# YOR WORLD Gate G6 Release Candidate: Commands, Tooling & Exit Codes Ledger

**Milestone Coverage:** Gate G6 (`G6-PLATFORM-RC`), Milestones A1–A6, Gate G5  
**Worker / Authority:** Gemini #1 — Platform / Backend Release-Candidate Evidence Maker  
**Timestamp:** 2026-10-02T13:38:00Z  
**Candidate Commit SHA:** `f60a0e93023c04ef168e760f5504b5ed9265bfac` (Observed dispatch HEAD: `e441f74d6656559f83e2ac089fb14dd1a8f524fc`)  
**Isolated Scratch Root:** `C:\Users\yoray\AppData\Local\Temp\yor-world-g6-platform-rc-4hfliqa3\app`  

---

## 1. Toolchain & Runtime Versions

All verification commands were executed within a clean, isolated scratch workspace created outside the repository tree (`C:\Users\yoray\AppData\Local\Temp\yor-world-g6-platform-rc-4hfliqa3\app`) populated directly from accepted platform baseline `deliveries/A6/source/`.

| Component / Utility | Command Executed | Version Observed | Lockfile / Pinned Spec | Status |
|---|---|---|---|:---:|
| **Node.js** | `node --version` | `v24.19.0` | `>=24.19.0 <25` | **MATCH** |
| **pnpm** | `pnpm --version` | `9.15.9` | `pnpm@9.15.9` (pinned) | **MATCH** |
| **Next.js** | `next --version` | `16.3.8` (Turbopack) | `next: 16.3.8` | **MATCH** |
| **React** | `react/package.json` | `19.3.0` | `react: 19.3.0` | **MATCH** |
| **TypeScript** | `tsc --version` | `6.0.3` | `typescript: 6.0.3` | **MATCH** |
| **Vitest** | `vitest --version` | `5.0.2` | `vitest: 5.0.2` | **MATCH** |
| **Playwright** | `playwright --version` | `1.63.0` | `@playwright/test: 1.63.0` | **MATCH** |
| **Embedded DB (PGlite)** | `@electric-sql/pglite` | `0.5.8` | `@electric-sql/pglite: 0.5.8` | **MATCH** |
| **Python Harness** | `python --version` | `3.12.10` | N/A (Harness runner) | **MATCH** |

---

## 2. Command Execution Ledger & Exit Codes

| Step | Operation Label | Exact Command Line | Working Directory | Exit Code | Elapsed / Result | Evidence Log |
|:---:|:---|---|---|:---:|:---|---|
| **01** | `frozen-install` | `node pnpm.cjs install --frozen-lockfile --store-dir <scratch>/store --config.cache-dir=<scratch>/cache` | `<scratch>/app` | **0** | 387 packages linked, 0 vulnerabilities | [`evidence/01-frozen-install.log`](evidence/01-frozen-install.log) |
| **02** | `lint` | `node pnpm.cjs lint` (`eslint . --max-warnings=0`) | `<scratch>/app` | **0** | 0 errors, 0 warnings across all files | [`evidence/02-lint.log`](evidence/02-lint.log) |
| **03** | `typecheck` | `node pnpm.cjs typecheck` (`tsc --noEmit`) | `<scratch>/app` | **0** | 0 type diagnostics | [`evidence/03-typecheck.log`](evidence/03-typecheck.log) |
| **04** | `test-unit` | `node pnpm.cjs test:unit` (`vitest run --config vitest.config.ts`) | `<scratch>/app` | **0** | 84 passed (6 test files, 2.27s) | [`evidence/04-test-unit.log`](evidence/04-test-unit.log) |
| **05** | `test-integration` | `node pnpm.cjs test:integration` (`vitest run --config vitest.integration.config.ts`) | `<scratch>/app` | **0** | 92 passed (9 test files, 15.97s) | [`evidence/05-test-integration.log`](evidence/05-test-integration.log) |
| **06** | `build` | `node pnpm.cjs build` (`next build`) | `<scratch>/app` | **0** | 17 static/SSG/dynamic pages compiled | [`evidence/06-build.log`](evidence/06-build.log) |
| **07** | `test-e2e` | `node pnpm.cjs test:e2e` (`playwright test`) | `<scratch>/app` | **0** | 84 passed across Chrome & Edge (3.1m) | [`evidence/07-test-e2e.log`](evidence/07-test-e2e.log) |
| **08** | `verify:auth` | `vitest run tests/integration/rc-auth-matrix.test.ts` | `<scratch>/app` | **0** | 15 passed (5-tier auth, 15 RLS tables) | [`evidence/08-auth-policy-verification.log`](evidence/08-auth-policy-verification.log) |
| **09** | `verify:contact` | `vitest run tests/integration/rc-contact-checks.test.ts` | `<scratch>/app` | **0** | 10 passed (honesty, mutex, quotas) | [`evidence/09-contact-release-verification.log`](evidence/09-contact-release-verification.log) |
| **10** | `rehearse:restore`| `vitest run tests/integration/rc-restore-rehearsal.test.ts` | `<scratch>/app` | **0** | 12 passed (backup, restore, rollback) | [`evidence/10-operations-recovery-rehearsal.log`](evidence/10-operations-recovery-rehearsal.log) |
| **11** | `audit:config` | `vitest run tests/integration/rc-configuration-audit.test.ts` | `<scratch>/app` | **0** | 5 passed (zero leaked keys, CORS safe) | [`evidence/11-configuration-audit.log`](evidence/11-configuration-audit.log) |
| **12** | `verify:content` | `vitest run tests/integration/rc-content-snapshot.test.ts` | `<scratch>/app` | **0** | 5 passed (4 verified projects, C4 bound) | [`evidence/12-content-snapshot-verification.log`](evidence/12-content-snapshot-verification.log) |

---

## 3. Aggregate Test Metrics

- **Total Test Suites Executed:** 22 suites
- **Total Tests Executed:** 307 test assertions
- **Passed Tests:** 307 (100.0%)
- **Failed Tests:** 0 (0.0%)
- **Skipped / Flaky Tests:** 0
- **Total Browser Runs:** 84 tests across Chromium (`channel: chrome`) and Edge (`channel: msedge`)
- **Compilation Routes:** 17 routes (13 static/SSG, 4 dynamic API handlers)

---

## 4. Environment Limitations & Isolation Boundaries

1. **Staging / Local Rehearsal Only:**
   - All database operations executed in embedded PostgreSQL (`PGlite v0.5.8`) executing production DDL migrations.
   - External network calls to Supabase, GitHub REST API, and Resend email servers are intentionally mocked or offline-isolated in tests.
2. **Production Deployment Values:**
   - Production secrets (`SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`), live SSL/HSTS headers, and domain DNS are designated as **`REQUIRES G7 LIVE VERIFICATION`**.
