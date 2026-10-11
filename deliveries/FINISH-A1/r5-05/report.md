# A1-R5 local maker return

**Status:** complete maker package returned for independent audit. This report does not accept the candidate or authorize canonical integration.

## Identity and scope

- Worker: local Codex using the isolated source worktree `C:\\yw-r5c`; no Gemini session was connected or used.
- Immutable base commit: `f62a43c5e71c00dcb89e28275ea81d842167db80`.
- Base `app/` tree: `42ea29ec235225046a75959eb19eb386ac2f821d`.
- Candidate `app/` tree: `cb42202d3be7f4f10c460d2e1b43db853910b87f`.
- Accepted design output-manifest SHA-256: `8038db147824b0a31de1028c330383352177020b2247dd627d1674d6dc14c6af`.
- Changed paths: 25, all within the frozen A1 allowlist of 26. `published-media.test.ts` is authorized and unchanged. `app/` in the canonical checkout was not modified.
- Patch SHA-256: `945bee3ccf793d56f6ffc2319cf3d6ede52a9f8bec665ac3d568272f1a179b41`.
- Output: `deliveries/FINISH-A1/r5-05/`. FINISH-22 reallocated the destination after the unknown-provenance `r5-04/` collision. Earlier A1 roots, R4, audit records, and the separate `C:\\yw-r5b` checkout were not used as source.

The changes complete the authoring and preview flows, bind review hashes to full ordered project content, validate strict review DTOs, bound and cancel private media streams, and exercise the actual private image picker/preview path using a labeled synthetic PNG. Durable publish/review checks, conflict handling, rollback, and cache behavior are covered by the local suites.

## Validation

The final sequential run is authoritative. Each command's exit receipt and raw log are included under `evidence/`.

| Check | Result | Evidence |
| --- | --- | --- |
| Unit suite | PASS — 24 files, 316 tests | `unit-suite-final-sequential.log/.exit` |
| Integration suite | PASS — 28 files, 306 tests | `integration-suite-final-sequential.log/.exit` |
| Lint | PASS, exit 0 | `lint-final-sequential.log/.exit` |
| Typecheck | PASS, exit 0 | `typecheck-final-02.log/.exit` |
| Production build | PASS, exit 0; build ID `rLA3QF1UjefZlpylb6Izw` | `production-build-final.log/.exit`, `build-output-manifest.json` |
| Chromium | PASS — 6/6 tests; Playwright 1.63.0, Chromium 153.0.8010.12 | `chromium-e2e-final.log/.exit`, `browser-results.json`, `browser-binding.json` |
| Exact-base replay | PASS — `git apply --check`, apply, whitespace check; 25/25 replacement bytes match | `patch-replay-final.log/.exit` |
| Built-output sentinel scan | No named private sentinel matches | `static-build-sentinel-scan.log` |

The build manifest binds 630 output files (116,591,312 bytes) to the candidate tree. Browser results and screenshot hashes are bound to that build and source patch in `evidence/browser-binding.json`. The image test selects `app/tests/fixtures/scp-media/valid-rgba-16x12.png` through the real editor picker, saves and reopens the draft, then loads it through the guarded private preview route. The fixture is synthetic and test-only; it is not provider approval.

Tool versions are recorded in `evidence/tool-versions.txt`: Node 24.19.0, pnpm 9.15.9, Next.js 16.3.8, TypeScript 6.0.3, ESLint 9.39.5, Vitest 5.0.2, Playwright 1.63.0, Chromium 153.0.8010.12.

Earlier non-final attempts remain in the evidence folder. Initial unit/integration runs were not authoritative; the final sequential runs passed. The first browser run exposed the synthetic fixture's initial durable revision mismatch; the fixture setup was corrected and the final 6/6 Chromium run passed. These earlier logs are retained and are not counted as final passing evidence.

## Limits and gates

Embedded PGlite, synthetic auth, mocked Storage, and local Chromium support only local behavior claims. Native PostgreSQL/Auth/Storage, provider-backed media approval, live deployment/origin/CDN behavior, physical devices and assistive technology, backup/recovery, manual operations, and G7 acceptance are **NOT RUN**. No independent audit, delta audit, Parent implementation acceptance, or canonical integration is claimed. These gates remain for their assigned reviewers and Parent authority.

The package contains `source/`, UTF-8 `source.patch`, `changed-paths.txt`, `input-hashes.json`, `output-hashes.json`, `requirement-matrix.json`, raw logs, exit receipts, screenshots, and source/build/browser identity bindings. Input and output manifests use SHA-256 of raw file bytes.


