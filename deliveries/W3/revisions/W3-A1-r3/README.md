# W3-A1-r3 — Semantic Foundation (Correction Wave r3)

Work packet: **W3-CORR-02**  
Lane: Platform/Content/Backend Production Maker  
Declared Maker: **Google Gemini 3.8 Flash (High)**  
Examined base: commit `fe1a40f797ce3ec839939c09a1857b797c197269`, corrected base `W3-A1-r2` (`20950576f8b9a149fe521ac4ac44056ff263aba9`), and delta audit `docs/planning/reviews/2026-10-01-correction-delta-audit/report.md`.  
Target root: `deliveries/W3/revisions/W3-A1-r3/` only.

## Summary of Bounded Corrections (W3-CORR-02)

1. **F1 — Dependency Security Baseline (Retained)**:
   - Pinned `next` to `16.3.8` and `eslint-config-next` to `16.3.8` in `source/package.json`.
   - Frozen lockfile (`source/pnpm-lock.yaml`) verified with strict peer dependency resolution.
   - Evaluated the 7 scheduled security fixes in Next 16.3.8 and the 2 deferred upstream issues in `evidence/a1-current/security-review.md`.

2. **F2 — Payload Budget & Script Preload Accounting (Retained)**:
   - `source/tests/e2e/payload.spec.ts` captures link-initiated script preloads (`<link rel="preload" as="script">`) without double-counting.
   - Initial JavaScript transferred across 20 cold loads in Chrome and Edge: 157,757 bytes (154.06 KiB), well below the 250 KiB budget ceiling.
   - Total transferred bytes: 181,750 bytes (177.49 KiB), well below the 650 KiB budget ceiling.
   - Proved negative test: Injected oversized script fixture (>600 KiB) in scratch, verified test failure with exit code 1, captured evidence in `payload-oversized-fault-injection.json` / `.log`, and restored clean source.

3. **F3 / W3-04 — Residual AST Boundary Bypasses Resolved**:
   - **Template-Literal Dynamic Imports**: Upgraded `getSpecifierText` in `source/tests/unit/boundaries.test.ts` to inspect both `ts.isStringLiteral` and `ts.isNoSubstitutionTemplateLiteral` (plus template expressions), ensuring that dynamic imports using backticks (e.g. ``import(`../../../tests/fixtures/reviewer-fixture`)``) are extracted and checked against forbidden patterns.
   - **Contract Directory Containment**: Updated `validateContractModule` in `source/tests/unit/boundaries.test.ts` to require that relative imports must resolve strictly within `src/contracts/` (`imp.resolvedPath.startsWith("src/contracts/") || imp.resolvedPath === "src/contracts"`), preventing normalized contract escapes into framework or app code (e.g. `'export { default } from "./../app/layout";'`).
   - **Adversarial Regression Coverage**: Added explicit unit tests in `boundaries.test.ts` covering both parent counterexamples. Total unit test count: **62 passed out of 62**.
   - Verified that mutating scratch source causes boundary checks to fail with exit code 1; restored clean source.

4. **F4 — Reproduction Helper Exit Propagation (Retained)**:
   - `tools/proof.py` aggregates subprocess return codes across `audit-all`, `audit-production`, and `list`, raising `SystemExit` if any child process fails. Verified with 6-case test matrix in `audit-wrapper-fault-injection.json`.

5. **F5 & F6 — Maintenance & Canonical Byte Policy (Retained)**:
   - F5: Disclosed non-blocking P3 maintenance item regarding ESLint 9 EOL.
   - F6: Scoped `.gitattributes` (`* -text`, `evidence/** -whitespace`) enforces byte preservation across checkout, Git blob objects, and the immutable archive (`W3-A1-r3-handoff.zip`).

## Frozen Reproduction Commands

Run from the repository root:

```powershell
# 1. Prepare clean external scratch directory and initialize execution record
python deliveries/W3/revisions/W3-A1-r3/tools/proof.py prepare

# 2. Perform frozen install using the genuine lockfile
python deliveries/W3/revisions/W3-A1-r3/tools/proof.py install

# 3. Run lint, strict typecheck, 62 unit tests, and production build
python deliveries/W3/revisions/W3-A1-r3/tools/proof.py lint typecheck test:unit build

# 4. Run full Playwright test suite (18 tests across Chrome and Edge)
python deliveries/W3/revisions/W3-A1-r3/tools/proof.py test:e2e

# 5. Run dependency list and security audits
python deliveries/W3/revisions/W3-A1-r3/tools/proof.py audit list

# 6. Verify npm registry metadata
python deliveries/W3/revisions/W3-A1-r3/tools/check-versions.py

# 7. Package delivery and verify SHA-256 integrity
python deliveries/W3/revisions/W3-A1-r3/tools/package-delivery.py
```
