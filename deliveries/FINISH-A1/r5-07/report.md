# FINISH-29 A1-R5-R7 maker return

**Status:** implementation and local evidence complete; exact-candidate independent delta audit and Parent acceptance remain pending. This is a maker return, not an acceptance or canonical integration.

## Candidate identity and scope

- Delivery: `deliveries/FINISH-A1/r5-07/` on `codex/finish-29-a1-r5-r7-20261011`.
- Exact source base: `f62a43c5e71c00dcb89e28275ea81d842167db80`; accepted `app/` tree: `42ea29ec235225046a75959eb19eb386ac2f821d`.
- Candidate `app/` tree: `ba8f952edc34e94393c48b25779071daab9a9812`.
- Patch SHA-256: `aa9b91f613a0f1b98e6da7735ec0513d10d0e1c2e78512fff63ecc19ee717dd8`.
- Changed paths: 25, all inside the frozen 26-path A1 allowlist. `app/tests/integration/platform/published-media.test.ts` is allowed and unchanged. The canonical checkout `app/` was not modified.
- The unaccepted R5 candidate commit `8f3aa566f36c92bb98658090ef91f9bfa96e8a79` was used only as a diagnostic source reference. Its 25 reused files are enumerated with byte counts and hashes in `input-hashes.json`; it was not used as the source base or treated as accepted work.

## Finding results

- **R5-01 — DTO compatibility:** approval audit uses `eventId`; the private review shape and generic review-check seam match the frozen DTOs. Focused unit and integration suites passed.
- **R5-02 — publication refresh:** healthy publish and rollback use `activePublication`; Chromium verified the active publication and review revision update without reload.
- **R5-03 — missing private draft:** requested absent drafts return API 404 and the page uses its not-found path. The focused integration suite passed.
- **R5-04 — stale save:** authorized 409 responses carry the current draft identity/content without writes; anonymous callers receive no content. Browser coverage verifies the losing editor retains its unsaved title and rich block buffer.
- **R5-05 — draft image URL:** rendering accepts only the exact canonical relative preview URL; hostile absolute, query, fragment and traversal cases are rejected by the focused unit suite.
- **R5-06 — blank authoring defaults:** new text/list/code/link fields start empty, links have no synthetic URL or checked time, and evidence remains unknown/empty. Unit and browser assertions passed.

The standalone matrix maps these results and the inherited A1 requirements to source paths, evidence, and limits.

## Verification

| Check | Result | Evidence |
| --- | --- | --- |
| Focused unit | PASS — 1 file, 5 tests | `evidence/unit-focused.stdout.log` |
| Focused integration | PASS — 1 file, 22 tests | `evidence/integration-focused.stdout.log` |
| Full unit | PASS — 24 files, 317 tests | `evidence/unit-full.stdout.log` |
| Full integration | PASS — 28 files, 308 tests | `evidence/integration-full.stdout.log` |
| ESLint | PASS, exit 0 | `evidence/lint.stdout.log`, `evidence/verification-results.json` |
| TypeScript | PASS, exit 0 | `evidence/typecheck.stdout.log`, `evidence/verification-results.json` |
| Exact-base patch replay | PASS — apply check, whitespace check, 25/25 changed paths and replacement bytes match packaged source | `evidence/patch-replay.log`, `evidence/patch-replay.result.json` |
| Production build | PASS — default Next.js 16.3.8 Turbopack build, exit 0; build ID `ipOY1wZCZuOF_EBSv1XY8` | `evidence/replay-next-build.stdout.log`, `evidence/replay-next-build.result.json`, `evidence/build-output-manifest.json` |
| Chromium | PASS — 6/6 tests across admin-publish and authoring workflow; Playwright 1.63.0, Chromium 153.0.8010.12 | `evidence/chromium-final.stdout.log`, `evidence/browser-results.json`, `evidence/browser-binding.json` |
| Local built-output scan | PASS — 980 build files scanned; none of four draft/test canaries found | `evidence/static-build-sentinel-scan.json` |

The final default production build and browser run were performed in a fresh exact-base replay worktree after `corepack pnpm install --frozen-lockfile`; the build and browser binding name the same candidate tree and build ID. The original scratch worktree has an external `node_modules` junction, so its first default Turbopack attempt failed at dependency-root validation. The replay worktree avoids that condition and provides the authoritative passing build. The earlier failed attempt is retained in evidence for traceability.

Tool versions and exact command/exit receipts are in `evidence/tool-versions.txt` and `evidence/verification-results.json`. The browser database, authentication, and selected PNG were synthetic local fixtures; transient database directories were removed after the run, while result logs and screenshots remain.

## Limits and remaining gates

Native PostgreSQL race testing, provider Auth/MFA, provider Storage/media approval, deployed origin/CDN/shared-cache behavior, physical-device and assistive-technology sessions, recovery/restore, manual operations, and G7 were **NOT RUN**. Local PGlite, synthetic auth/media, and Chromium do not establish those outcomes.

No independent GPT Plus #2 delta audit, Parent acceptance, or canonical integration was performed. The next required gate is an exact-candidate independent audit of this committed package. Keep the accepted baseline unchanged until that gate and Parent ruling complete.
