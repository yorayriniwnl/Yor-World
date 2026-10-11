# A1-R5 local maker return

**Status:** complete maker package for independent audit and a separate Parent ruling. This report does not accept the candidate or authorize canonical integration.

## Identity and scope

- Worker: local Codex in an isolated source worktree. No Gemini session or external reviewer was used.
- Delivery branch: codex/finish-22-a1-r5-20261011. The commit containing this package is reported in the handoff.
- Immutable source base: f62a43c5e71c00dcb89e28275ea81d842167db80; accepted base app tree: 42ea29ec235225046a75959eb19eb386ac2f821d.
- Candidate root tree: c6ed1b4889e07b0e1e88b48d7644515e9acc20f9; candidate app tree: fe55f6202fe4471a831850cc1d93e24a9724185e.
- Accepted FINISH-00-R2 design output-manifest SHA-256: 8038db147824b0a31de1028c330383352177020b2247dd627d1674d6dc14c6af.
- Output root: deliveries/FINISH-A1/r5-05/, allocated by FINISH-22.
- Changed paths: 25, all in the frozen 26-path A1 allowlist. The authorized app/tests/integration/platform/published-media.test.ts is unchanged. The canonical checkout app/ was not modified.
- source/ mirrors changed files relative to the app/ root; changed-paths.txt and source.patch use canonical app/ paths.
- Patch SHA-256: 7a3b7d638867b35b2c83066a3c66f689b88a9f2cb4c65d8b374dd2e19a4c25e5.

The candidate implements strict project review identity and DTO validation, streamed/cancellable private media reads, complete draft authoring and guarded preview, stale-write protection, durable publish/rollback checks, private response protections, and truthful visibility feedback. The exact changed files and evidence mapping are in changed-paths.txt and requirement-matrix.json.

The source worktree started at the exact assigned base. No production files were copied from rejected R4, earlier R5 roots, or the unverified C:\yw-r5b checkout. The output preserves prior attempt logs as diagnostics; the normalized-final run listed below is authoritative.

## Validation bound to the normalized final candidate

| Check | Result | Evidence |
| --- | --- | --- |
| Focused unit | PASS — 1 file, 18 tests | evidence/normalized-final-20261011/focused-unit.log and .exit |
| Focused integration | PASS — 3 files, 34 tests | evidence/normalized-final-20261011/focused-integration.log and .exit |
| Full unit | PASS — 24 files, 330 tests | evidence/normalized-final-20261011/unit.log and .exit |
| Full integration | PASS — 28 files, 294 tests | evidence/normalized-final-20261011/integration.log and .exit |
| Lint | PASS, exit 0 | evidence/normalized-final-20261011/lint.log and .exit |
| Typecheck | PASS, exit 0 | evidence/normalized-final-20261011/typecheck.log and .exit |
| Production build | PASS, exit 0; Next.js 16.3.8 build ID SfVbbqj7hUCmwkGvXTUGw | evidence/normalized-final-20261011/build.log, build output manifest, and source-build-browser-binding.json |
| Chromium | PASS — 6/6 tests, Playwright 1.63.0, Chromium 153.0.8010.12 | evidence/browser-r5-05-normalized-final-20261011/ |
| Exact-base replay | PASS — git apply --check, apply, git diff --check, and 25/25 byte comparisons | evidence/exact-base-patch-replay-final.log |

The browser flow selects the synthetic PNG through the actual authoring picker, saves and reopens the draft, and displays it through the owner-guarded private preview route. It also checks section/block/list editing and focus restoration, stale-save buffer preservation, publish, and no public draft/media leakage. The fixture is explicitly test-only and returns providerApproved=false; it is not evidence of provider approval. Build output, source tree, patch, browser result JSON, screenshot, and test-source hashes are linked in evidence/normalized-final-20261011/source-build-browser-binding.json.

Tool versions and exact commands/exits are recorded in evidence/normalized-final-20261011/tool-versions.txt and evidence/commands.json. input-hashes.json and output-hashes.json use SHA-256 of raw bytes.

## Earlier diagnostics and limits

Earlier logs remain intact for traceability and are not counted as final passing evidence. One browser attempt used a database path whose parent directory did not exist; that setup diagnostic failed before the app flow. A later PowerShell wrapper also stopped on a nonfatal color-variable warning even though its JSON test receipt showed 6/6; the normalized-final Chromium rerun produced an ordinary zero exit and a fresh receipt.

PGlite, synthetic auth, local browser fixtures, and mocked/in-memory Storage support only local behavior claims. Native PostgreSQL/Auth/Storage, provider-approved media, multi-process database races, deployed origin and CDN behavior, live rollback, physical devices and assistive technology, backup/recovery rehearsal, manual production operations, independent audit, Parent acceptance, canonical integration, and G7 acceptance are NOT RUN. These remain required gates. No provider, production, or G7 readiness is claimed.