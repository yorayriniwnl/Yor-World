# W3-A1-r2 — Semantic Foundation (Correction Wave r2)

Work packet: **W3-CORR-01**  
Lane: Platform/Content/Backend Production Maker  
Declared Maker: **Google Gemini 3.8 Flash (High)**  
Examined base: commit `fe1a40f797ce3ec839939c09a1857b797c197269` plus coordination commit `f4cd0a3be5fc7899e2fd20932bf40da2d4c2195c`.  
Target root: `deliveries/W3/revisions/W3-A1-r2/` only.

## Summary of Bounded Corrections (F1–F4 & Byte Policy)

1. **F1 — Dependency Security Baseline**:
   - Pinned `next` to `16.3.8` and `eslint-config-next` to `16.3.8` in `source/package.json`.
   - Regenerated a genuine lockfile (`source/pnpm-lock.yaml`) via isolated pnpm resolution with strict peers enforced.
   - Evaluated the 7 scheduled security fixes in Next 16.3.8 and the 2 deferred upstream issues in `evidence/a1-current/security-review.md`.

2. **F2 — Payload Budget & Script Preload Accounting**:
   - Updated `source/tests/e2e/payload.spec.ts` to classify JavaScript by joining observed response resource/MIME data to Resource Timing, including `<link rel="preload" as="script">` without double-counting.
   - Recalculated baseline: Next 16.3.7 original build is 137,034 JS bytes (133.8 KiB) rather than 135,064 bytes; total transfer stays 160,417 bytes.
   - Measured new Next 16.3.8 build: **137,107 JS bytes (133.89 KiB)** and **160,484 total transfer bytes (156.72 KiB)** across all 20 cold loads in Chrome and Edge.
   - Proved negative test: Injected an oversized preloaded script fixture (>250 KiB) in scratch, confirmed test failure with exit code 1, captured evidence in `payload-oversized-fault-injection.json` / `.log`, and restored clean source.

3. **F3 — Import Boundary AST Syntax & Module Resolution**:
   - Upgraded `source/tests/unit/boundaries.test.ts` to use TypeScript compiler AST traversal (`ts.createSourceFile`) and path resolution (relative and `@/` aliases).
   - Detects and rejects static imports, side-effect imports, export-from declarations, dynamic imports (`import(...)`), require calls, and type-only import types referencing tests/fixtures, three, supabase, server, or features/room.
   - Reproduces archived dynamic-import fixture mutation in scratch, confirming test failure with exit code 1, captured in `fixture-boundary-fault-injection.json` / `.log`. Clean source passes 60 unit tests with zero fixture or sentinel leaks in built output.

4. **F4 — Reproduction Helper Exit Propagation**:
   - Fixed `tools/proof.py` `audit` action to execute both `audit-all` and `audit-production`, preserve both child logs, and propagate nonzero exit if either fails.
   - Fixed `tools/proof.py` `list` action to propagate nonzero return code.
   - Executed and verified full child-exit combination matrix `(1,1)`, `(0,1)`, `(1,0)`, `(0,0)` and failing list, proving only `(0,0)` yields outer helper exit 0; captured in `audit-wrapper-fault-injection.json`.

5. **F5 & F6 — Maintenance Disposition & Canonical Byte Policy**:
   - F5: Disclosed non-blocking P3 maintenance item regarding ESLint 9 EOL; preserved stable peer alignment without forced overrides.
   - F6: Enforced scoped `.gitattributes` (`* -text`, `evidence/** -whitespace`) to preserve exact evidence bytes across disk checkout, Git blob objects, and the immutable archive (`W3-A1-r2-handoff.zip`).

## Frozen Reproduction Commands

Run from the repository root:

```powershell
# 1. Prepare clean external scratch directory and initialize execution record
python deliveries/W3/revisions/W3-A1-r2/tools/proof.py prepare

# 2. Perform frozen install using the genuine lockfile
python deliveries/W3/revisions/W3-A1-r2/tools/proof.py install

# 3. Run lint, strict typecheck, 60 unit tests, and production build
python deliveries/W3/revisions/W3-A1-r2/tools/proof.py lint typecheck test:unit build

# 4. Run full Playwright test suite (18 tests across Chrome and Edge)
python deliveries/W3/revisions/W3-A1-r2/tools/proof.py test:e2e

# 5. Run dependency list and security audits
python deliveries/W3/revisions/W3-A1-r2/tools/proof.py list audit

# 6. Verify npm registry metadata
python deliveries/W3/revisions/W3-A1-r2/tools/check-versions.py

# 7. Package delivery and verify SHA-256 integrity
python deliveries/W3/revisions/W3-A1-r2/tools/package-delivery.py
```
