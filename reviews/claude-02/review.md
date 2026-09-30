# CLAUDE-02 — W3 Software Foundation Review

**Reviewer Identity:** Independent Reviewer (Claude-02 Lane; executed via Gemini 3.8 Flash (High), High Effort/Depth)  
**Date:** 2026-10-01  
**Candidate Revision:** W3-A1 (`858c425cf2a48407245c9e65e4f08bf5b7908c36` / Git base `fe1a40f797ce3ec839939c09a1857b797c197269`) + evaluation of WIP correction `W3-A1-r2`  
**Baseline:** Product Spec §1/§3/§4/§10, Platform Plan Setup/A1, Engineering Contracts §1–§5

---

## 1. Received and Inspected Inventory

| Item / Path | Source / Hash | Description | Status |
| --- | --- | --- | --- |
| `deliveries/W3/source/package.json` | `753177024fdb236ea081395568ef76652eb6a13d78c005b5ef29ba04a29a0f4c` | Original W3 package manifest with Next 16.3.7 | INSPECTED |
| `deliveries/W3/source/pnpm-lock.yaml` | `e288f6c1270b2e17681bd807b6eafa5ad2b442913f7d2a053db925aec28c60cf` | Original frozen lockfile | INSPECTED |
| `deliveries/W3/source/src/app/(public)/**/*.tsx` | Multiple files | Five semantic routes (Home, Projects, About, Contact, Resume) | INSPECTED |
| `deliveries/W3/source/src/app/not-found.tsx` | `d121bcff13d2f9543e5a593306db5ff98b1ecfa421946ebfc19b7d444458f700` | Honest 404 page for unknown routes | INSPECTED |
| `deliveries/W3/source/src/features/portfolio/public-content.ts` | `28e67a07fc2cb11b404e9086c67d1db0e073c6a46ae1a7b4662d51bcefb57375` | Truthful empty published projects, provisional identity | INSPECTED |
| `deliveries/W3/source/tests/e2e/payload.spec.ts` | `432ec4fffe2438676f494f6f437061b405527a9ceca7452d3aa05047b3b4ba9e` | Original payload calculation test (initiator=script) | INSPECTED |
| `deliveries/W3/source/tests/unit/boundaries.test.ts` | `b78e2eb579db3563914a849bb9a51bf2cb2f8f74227f8a7e0c466986dd6e94ef` | Original regex boundary test | INSPECTED |
| `deliveries/W3/source/tools/proof.py` | `0531c36aefdfb8f2cbe6782eb0ec41c0e359a35e8e8ce167a57a8a699c274fe9` | Original reproduction runner | INSPECTED |
| `deliveries/W3/reviews/2026-10-01-independent/report.md` | `882c8386049cdae8f91fcca843c7d8ccb9d6e5dca644c3164d8cf0ad7711f94c` | Independent Codex audit report (findings F1–F6) | INSPECTED |
| `deliveries/W3/revisions/W3-A1-r2/` | Current work-in-progress | Proposed correction branch attempting F1–F4 fixes | INSPECTED |

### Missing Inventory
- Finalized, accepted `W3-A1-r2` delivery archive and clean passing build logs (currently incomplete/failing).

---

## 2. Evidence Ledger

| Check / Domain | Evidence Class | Result | Evidence Citation | Notes / Limitations |
| --- | --- | --- | --- | --- |
| Package Specifiers & Pins | SOURCE | PASS | `package.json:18–34` | Exact stable pins for all direct dependencies; zero floating versions |
| Node & Package Manager | SOURCE | PASS | `package.json:6–7` | `node >=24.19.0 <25`, `pnpm@9.15.9` enforce strict local environment |
| Strict TypeScript | SOURCE | PASS | `tsconfig.json` | `strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` |
| Public Route Truthfulness | SOURCE | PASS | `src/app/(public)/**/*.tsx` | Zero invented projects; draft identity clearly flagged; contact messaging unavailable |
| Unknown Route Handling | SOURCE | PASS | `src/app/not-found.tsx` | Returns clean 404 page stating only verified projects will have case studies |
| No-JS Route Utility | SOURCE / INDEPENDENT | PASS | `public-shell.spec.ts:31–65`, Independent Report §106 | All 5 public routes render fully with JavaScript disabled |
| Enter Studio Fallback | SOURCE | PASS | `page.tsx:20–26` | Uses native `<details>/<summary>` stating studio is not yet available |
| Zero World/Backend Bleed | SOURCE | PASS | `public-shell.spec.ts:70–95`, `boundaries.test.ts` | No 3D/audio/Supabase imports or network probes pre-entry |
| Next.js Security Baseline | REVIEWER EXECUTED / SOURCE | FAIL (W3-A1) / WIP (r2) | Independent Report F1, Registry recheck | Next 16.3.8 released with 7 fixes; 16.3.7 is vulnerable |
| Payload JS Budget Accuracy | SOURCE / INDEPENDENT | FAIL (W3-A1) | Independent Report F2, `payload-recalculation.json` | Omitted 1,970-byte preload chunk. True JS is 137,034 bytes |
| Boundary Dynamic Import Guard | SOURCE / INDEPENDENT | FAIL (W3-A1) | Independent Report F3, `boundaries.test.ts:17–31` | Regex only checked `from`; dynamic imports bypassed test |
| Proof Runner Exit Propagation | SOURCE / INDEPENDENT | FAIL (W3-A1) | Independent Report F4, `proof.py:97–101` | Swallowed exit status from `audit` and `list` |
| ESLint 9 EOL Status | SOURCE | PASS (Disclosed limitation) | `package.json:30`, Independent Report F5 | ESLint 9.39.5 is EOL; retained as non-blocking maintenance P3 |
| W3-A1-r2 Lint Execution | REVIEWER EXECUTED | FAIL | `deliveries/W3/revisions/W3-A1-r2/evidence/a1-current/03-lint.log` | `boundaries.test.ts:164` has unused variable `snippet2`; ESLint fails |

---

## 3. Findings

### C02-01 (P2 — Gate-Blocking): Next.js Framework Security Baseline Outdated (W3-01 / F1)
- **Class:** SOURCE / REVIEWER EXECUTED
- **File / Symbol:** `deliveries/W3/source/package.json:19,31` and `pnpm-lock.yaml:1606`
- **Expected:** The candidate must use the current security release line. The official Vercel/Next security notice designated 16.3.7 as excluding critical fixes and superseded by 16.3.8.
- **Observed:** Candidate `W3-A1` remains pinned to `next@16.3.7` and `eslint-config-next@16.3.7`.
- **Impact:** G1 integration would inherit a known unpatched framework baseline.
- **Correction Criterion:** Update both pins to `16.3.8`, regenerate a genuine matching lockfile, and verify with `pnpm install --frozen-lockfile`.

### C02-02 (P2 — Gate-Blocking): Payload Measurement Omitted Preloaded JS (W3-03 / F2)
- **Class:** SOURCE / MAKER EVIDENCE
- **File / Symbol:** `deliveries/W3/source/tests/e2e/payload.spec.ts:55`
- **Expected:** All initial JavaScript transferred to the client must be counted toward the 250 KiB budget, including chunks loaded via `<link rel="preload">` or `<link rel="modulepreload">`.
- **Observed:** `payload.spec.ts` filtered resources solely with `r.initiatorType === "script"`, ignoring `link`-initiated chunk `148u489fbqjmh.js` (1,970 bytes). Actual initial JS is 137,034 bytes (133.8 KiB) rather than the reported 135,064 bytes. (Total transfer stays 160,417 bytes; both budgets still pass).
- **Correction Criterion:** Intercept network responses using content-type and URL file extensions to capture all initial JS responses, update summaries to 137,034 bytes, and include a negative test proving oversized preloads fail the budget.

### C02-03 (P2 — Gate-Blocking): Fixture Guard Ineffective Against Dynamic Imports (W3-04 / F3)
- **Class:** SOURCE / REVIEWER EXECUTED
- **File / Symbol:** `deliveries/W3/source/tests/unit/boundaries.test.ts:17–31`
- **Expected:** Automated architectural boundary tests must prevent production code from importing test fixtures or forbidden modules via any import syntax.
- **Observed:** The test searched only for static `from "..."` patterns. An injected dynamic import (`await import("../../../tests/fixtures/...")`) bypassed the guard completely while tests passed.
- **Correction Criterion:** Parse module syntax using TypeScript AST to detect static imports, dynamic imports, side-effect imports, and export-from statements.

### C02-04 (P2 — Gate-Blocking): Proof Runner Ignored Audit Subprocess Failures (W3-05 / F4)
- **Class:** SOURCE / REVIEWER EXECUTED
- **File / Symbol:** `deliveries/W3/source/tools/proof.py:97–101`
- **Expected:** Automation runner `proof.py` must propagate non-zero exit codes if any child audit or list step fails.
- **Observed:** The script captured return codes but ignored them in `audit` and `list` branches, exiting 0 even when subprocesses exited 1.
- **Correction Criterion:** Aggregate subprocess return codes and exit non-zero if any check fails.

### C02-05 (P1 — Gate-Blocking): Proposed Correction W3-A1-r2 Fails Lint Execution
- **Class:** REVIEWER EXECUTED
- **File / Symbol:** `deliveries/W3/revisions/W3-A1-r2/source/tests/unit/boundaries.test.ts:164:11`, `evidence/a1-current/03-lint.log`
- **Expected:** Corrected candidate `W3-A1-r2` must achieve clean, zero-warning passes across lint, typecheck, unit, and E2E suites.
- **Observed:** In `deliveries/W3/revisions/W3-A1-r2/source/tests/unit/boundaries.test.ts`, line 164 defines `const snippet2 = ...` which is never used. Running `pnpm lint` (`eslint . --max-warnings=0`) results in `warning 'snippet2' is assigned a value but never used @typescript-eslint/no-unused-vars` and exits with code 1.
- **Impact:** The correction attempt `W3-A1-r2` is currently broken and cannot be accepted as a verified delivery.
- **Correction Criterion:** Remove or use `snippet2` in `boundaries.test.ts`, complete clean runs of frozen install, lint, typecheck, unit tests, build, and E2E suite, and package genuine execution logs.

---

## 4. Local Retest Requests

1. **Frozen Install & Dependency Verification:** In an isolated scratch directory, execute `pnpm install --frozen-lockfile` against the final lockfile and verify `next` and `eslint-config-next` resolve to `16.3.8`.
2. **Lint Cleanliness:** Run `pnpm lint` and assert exit code 0 with 0 warnings.
3. **Boundary AST Guard Retest:** Run `pnpm test:unit tests/unit/boundaries.test.ts` and verify negative tests for dynamic import, side-effect import, and aliased import all trigger assertion errors as expected.
4. **Corrected Payload E2E:** Run `pnpm test:e2e tests/e2e/payload.spec.ts` and verify that all JS responses (including link preloads) are summed, matching the recalculated total.

---

## 5. Recommendation

**Recommendation:** **REWORK W3**  
- Candidate `W3-A1` is rejected due to gate-blocking findings W3-01 (unpatched Next 16.3.7), W3-03 (payload calculation error), W3-04 (dynamic import boundary bypass), and W3-05 (runner error swallowing).
- While the WIP revision `W3-A1-r2` addresses the architectural intent of F1–F4, it currently fails its own lint validation (C02-05). Formal acceptance must await a cleanly executed, fully passing `W3-A1-r2` handoff.
