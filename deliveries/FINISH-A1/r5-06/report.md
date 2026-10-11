# FINISH-27 A1-R5/R6 maker return

Status: **PASS for local maker implementation and required local verification.** This is a local Codex maker return. It is not an independent audit, acceptance, or integration.

## Candidate identity

- Worker: local Codex; Gemini execution is not claimed.
- Isolated worktree branch: `codex/finish-27-a1-r5-r6-20261011`.
- Exact source base: `f62a43c5e71c00dcb89e28275ea81d842167db80`.
- Base `app/` tree: `42ea29ec235225046a75959eb19eb386ac2f821d`.
- Candidate `app/` tree assembled from the patch: `c1f4e54e6b5de23acf1a783842bedffc4b684da1`.
- Canonical `source.patch` SHA-256: `212f29baf76effafcdcf262e4a3bacde1a62134363dec769fb5d44fe8def93bd`.
- Accepted FINISH-00-R2 design output-manifest SHA-256: `8038db147824b0a31de1028c330383352177020b2247dd627d1674d6dc14c6af`.
- Changed paths: 25 of the 26 paths in the frozen A1 allowlist. The full list is in `changed-paths.txt`; path-level old/new byte hashes are in `replacement-verification.json`.
- Scoped package commit and remote push identity will be reported with the maker handoff. The commit ID is not embedded in its own hashed package.

## Six findings

| Finding | Result | Correction and evidence |
| --- | --- | --- |
| A1R5-01 — DTO compatibility | PASS | Restored `approvalAudit: {eventId, createdAt}`, the accepted `PrivateDraftReview` fields, and generic project/site `ReviewCheck` scope/ID. Strict malformed-input and coherent-candidate checks remain. Frozen positive/negative probes are in `evidence/focused-unit.log` and `evidence/integration.log`. |
| A1R5-02 — publish/rollback refresh | PASS | The healthy refresh consumes GET `/api/admin/publish`'s `activePublication`, history, and review identity. Publish and rollback refresh the visible state without navigation. See `evidence/chromium-final.log`, `evidence/browser-results.json`, and `evidence/chromium/publish-rollback-review.png`. |
| A1R5-03 — missing draft | PASS | Missing requested drafts raise the explicit not-found signal before review/media assembly. The owner API returns private no-store 404; the page reaches `notFound()`. Service/API and page regressions are in focused and full unit/integration logs. |
| A1R5-04 — stale save handoff | PASS | An authorized 409 includes current draft identity/content; the transaction performs no writes and the editor retains its unsaved buffer. The current draft is withheld before owner authorization. See focused/full integration and Chromium evidence. |
| A1R5-05 — draft media URL | PASS | Draft images render only the exact canonical relative owner-preview URL for the encoded media ID. Absolute/origin-confused, traversal, query, and fragment variants are rejected, and the renderer uses the validated canonical value. See `evidence/focused-unit.log` and `evidence/unit-serial.log`. |
| A1R5-06 — blank authoring defaults | PASS | New paragraph/list/code/section/link/evidence controls start empty or explicitly unknown/null. Link URL and checked-at time are entered by the author; changing the URL clears its prior check time, and saving without an explicit check time is rejected without writes. See focused unit/integration logs and Chromium results. |

The direct page `notFound()` regression passed in the focused unit run and the full 320-test unit run. Existing review-hash, private-media byte/size, owner/privacy, synthetic picker, save/reopen, and public/private isolation coverage also passed in the local suites.

## Verification

Commands ran in `deliveries/FINISH-A1/r5-06/.work/assembly/app`. Tool versions and command receipts are recorded in `evidence/tool-versions.json` and `evidence/commands.json`.

| Command | Result | Evidence |
| --- | --- | --- |
| `pnpm exec vitest run --config vitest.config.ts tests/unit/platform/completion-authoring-blocks.test.ts` | PASS — 8 tests, exit 0 | `evidence/focused-unit.log` |
| `pnpm exec vitest run --config vitest.integration.config.ts tests/integration/platform/completion-authoring-preview.test.ts` | PASS — 23 tests, exit 0 | `evidence/focused-integration.log` |
| `pnpm test:unit` | Initial parallel run: 319/320 passed; one existing dependency-boundary test hit its 5-second timeout, exit 1 | `evidence/unit.log` |
| `pnpm exec vitest run --config vitest.config.ts --maxWorkers=1 --minWorkers=1` | PASS — 24 files, 320 tests, exit 0 | `evidence/unit-serial.log` |
| `pnpm test:integration` | PASS — 28 files, 309 tests, exit 0 | `evidence/integration.log` |
| `pnpm lint` | PASS — zero warnings, exit 0 | `evidence/lint.log` |
| `pnpm typecheck` | PASS — exit 0 | `evidence/typecheck.log` |
| `pnpm build` | PASS — Next.js 16.3.8 production build, exit 0 | `evidence/build-final.log` |
| `CI=1 YOR_E2E_FIXTURE=1 pnpm exec playwright test tests/e2e/platform/completion-authoring-workflow.spec.ts --project=chromium` | PASS — 1/1 Chromium workflow, exit 0 | `evidence/chromium-final.log`, `evidence/browser-results.json` |

The parallel unit timeout was transient under concurrent local test load. The sequential run passed all 320 tests; the failed run remains in the package so both outcomes are visible.

The Chromium flow uses local PGlite, synthetic owner identity, and a clearly synthetic PNG. It selects the fixture in the real picker, saves and reopens the draft, renders through the guarded private preview route, and publishes then rolls back while checking the refreshed revision/review state. Screenshots are `evidence/chromium/candidatex-private-preview.png` and `evidence/chromium/publish-rollback-review.png`. Build ID is `A_dMOM0unJoPSDOduTfjK`; `evidence/build-output-manifest.json` lists 980 build files with `.next/cache/**` excluded. Browser and build are local source-bound evidence only.

## Exact-base replay and ownership

`evidence/patch-replay-final.log` records patch check and replay from the exact base: both commands exited 0, all 25 replacement files match the packaged bytes, every changed path is within the frozen 26-path set, and every unlisted tracked `app/` byte matches the base. The patch uses canonical `app/` path prefixes. `input-hashes.json` contains 31 raw input-file hashes, including the accepted contract/output manifest, all governing packets, and the prior audit/report inputs.

For diagnostics only, I consulted the unaccepted FINISH-24 candidate's `deliveries/FINISH-A1/r5-05/source.patch` (SHA-256 `945bee3ccf793d56f6ffc2319cf3d6ede52a9f8bec665ac3d568272f1a179b41`) and its report/findings. The consulted replacement paths were exactly the 25 paths listed in this package's `changed-paths.txt`. That candidate was not used as the source base; this patch was assembled and replayed from `f62a43c5e71c00dcb89e28275ea81d842167db80`, then each replacement was byte-compared. No earlier delivery or audit root was modified.

The full 44-row `requirement-matrix.json` maps all FINISH-04/A1 clauses, A3 clauses and FINISH-12 corrections, plus explicit FINISH-24 finding rows and gate/limit rows. It records 34 local PASS rows and 10 NOT RUN rows.

## Limits and handoff

The following remain **NOT RUN**: native PostgreSQL/Auth/Storage, provider approval, native multi-process races, deployment/origin/CDN/shared-cache behavior, physical-device and assistive-technology sessions, backup/recovery, manual operations, independent reviewer re-runs, external GPT Plus #2 review, Parent acceptance, canonical integration, and G7. Local PGlite, mocked Storage/auth, and synthetic browser media do not establish those external behaviors.

Only the stable package root is authorized for commit and push on the scoped branch. The exact delivery commit and remote branch verification are reported in the maker handoff. Stop here for the exact-candidate independent delta audit and separate Parent decision; no self-approval or integration is claimed.
