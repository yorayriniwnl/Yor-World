# FINISH-A1-R4 platform correction delivery

**Disposition: maker return for independent audit. This report does not accept the implementation or authorize canonical integration.** Work was performed by the local Codex implementation worker; no external Gemini account execution is claimed.

## Source and scope

The candidate is based on commit `f62a43c5e71c00dcb89e28275ea81d842167db80`, whose app tree is `42ea29ec235225046a75959eb19eb386ac2f821d`. The R4 app tree is `ae4f54e366774969dfd202806451e7e4ec66d10b`. It contains 25 changed files, all within the FINISH-A1 exact allowlist. `app/src/contracts/content.ts`, migrations, dependency files, the canonical `app/` worktree, and other delivery roots were not modified by this candidate.

`source.patch` is a 210,877-byte UTF-8 Git patch with SHA-256 `7b2dd8ba10801dfca095191ce4b8c81a05d11a95eac4b016dd32fb433c619604`. Git paths use the canonical `app/` prefix; replacement files are under `source/` with paths relative to `app/`. The patch passed exact-base `git apply --check --whitespace=error-all`, applied successfully, and produced the same app Git tree as the staged R4 candidate. All 25 replacement files match the fresh patch-applied checkout byte for byte. Six files have CRLF in the Windows verification checkout and LF in the patch-applied replacement set; the resulting Git app tree is identical. See `patch-verification-final.json`, `patch-application.json`, and `patch-assembly.json`.

The implementation adds strict private review DTOs and deterministic candidate hashing; requires review identity at API and service boundaries; re-reads durable publication/draft/media state under ordered locks; verifies bounded private image bytes against row hash/size/type; rejects stale same-ID media changes before publication writes; completes the four-variant editor, private draft preview and media proxy; and returns rollback concurrency/reason plus committed/origin-observed/edge-unobserved visibility separately. Private API responses set `private, no-store` and `Vary: Authorization, Cookie` on the exercised branches. No SQL or frozen content-contract edits were made.

## Findings and required outcomes

| Finding / requirement | Result | Evidence and limit |
| --- | --- | --- |
| A3-01: source ownership, frozen contract, exact DTO/test paths, applicable UTF-8 patch | **PASS** | 25-path allowlist check; exact-base application; patch/source tree equality; `patch-verification-final.json`. |
| A3-02: complete review required at API and durable service boundaries; no partial writes | **PASS in embedded integration** | Omitted and mismatched review tests verify 422 and unchanged publication/history/audit counts in `completion-authoring-preview.test.ts`; PGlite, not hosted PostgreSQL. |
| A3-03: durable identity, canonical hash, ordered review locks, full media/approval identity and bytes | **PASS in embedded integration** | Tests cover durable revision 7, one review transaction/locks, reordered JSON keys, four valid same-ID media/approval changes, tampered bytes and no partial writes. Storage is mocked and SQL runs in PGlite; native multi-process/provider races are **NOT RUN**. |
| A3-04: actual approved-media list, save validation and private proxy | **PASS for server fixtures; browser selection NOT RUN** | Integration exercises the real route/service code with a valid synthetic PNG and mocked Storage, invalid save and tampered proxy rejection. Playwright verifies the empty approved-media picker state. Selecting a genuine provider-approved image in a browser was **NOT RUN** because no real approved asset/provider was available. |
| A3-05: CandidateX privacy, safe draft renderer, rollback identity/reason, cache and visibility behavior | **PASS for exercised local branches** | PGlite tests cover CandidateX, safe proxy URL boundaries and required rollback fields; browser covers private preview, publish, rollback and anonymous API isolation. Browser confirms origin observation and explicitly reports CDN/edge visibility as unobserved. The full provider-outage/503 branch matrix was **NOT RUN**. |
| Editor: all block variants, order/focus, failed-buffer preservation, save/reopen/cancel | **PASS in Chromium workflow** | `completion-authoring-workflow.spec.ts`; the image test proves the empty picker state and preserved alt/caption buffer, not an approved image selection. |
| Evidence defaults and review checklist truthfulness | **PARTIAL** | New evidence fields default to unknown/null and review displays executed checks/timestamps/reasons; no genuine source receipt or approved evidence was supplied. Browser coverage of editing evidence records is **NOT RUN**. |
| Anonymous/non-owner/AAL1/revoked denial and private cache headers | **PASS for exercised local matrix** | Synthetic Auth integration covers non-owner, AAL1 and revoked across six private handlers; Chromium covers anonymous 401 responses and `private,no-store`/`Vary` on eight API calls. No native Auth/session claim. |
| Lint, typecheck, build and full local suites | **PASS** | Exact candidate logs listed below. |
| Independent complete-scope/delta audit and separate Parent acceptance | **NOT RUN** | This is the maker handoff. No self-acceptance or canonical integration occurred. |

## Validation receipts

All final commands ran against candidate app tree `ae4f54e366774969dfd202806451e7e4ec66d10b`. Tool versions are in `tool-versions.json`; source/build/log hashes are bound in `execution-bindings.json`.

`receipts.json` records the exact commands, browser fixture environment, exits, results and the superseded concurrent timeout attempt.

| Command | Result | Receipt |
| --- | --- | --- |
| `pnpm run test:unit` | 24 files, 314 passed | `evidence/full-unit-20261011-final.log` |
| `pnpm run test:integration` | 28 files, 313 passed | `evidence/full-integration-20261011-final.log` |
| `pnpm exec playwright test tests/e2e/platform/admin-publish.spec.ts tests/e2e/platform/completion-authoring-workflow.spec.ts --project=chromium --workers=1 --reporter=list` | 10 passed | `evidence/browser-20261011-final.log`, `evidence/browser-results.json`, `evidence/screenshots/` |
| `pnpm run lint` | exit 0, zero warnings | `evidence/lint-20261011-final.log` |
| `pnpm run typecheck` | exit 0 | `evidence/typecheck-20261011-final.log` |
| `pnpm run build` | exit 0; build ID `eeCzuyP7FOlBNrLOKZ8Pu` | `evidence/build-20261011-final.log` |
| Exact-base patch check and application | exit 0; 25/25 source replacements identical; patched/candidate app trees equal | `evidence/patch-application.log`, `patch-verification-final.json` |

An earlier full-unit run overlapped with other test/browser jobs and timed out two boundary checks at their 5-second limits. That attempt is retained as `evidence/full-unit-20261011.log`; the isolated final run above passed all 314 tests.

## Evidence limits and intake preservation

Integration tests use embedded PGlite, synthetic owner/auth registries and mocked private Storage containing test PNG bytes. Playwright ran a production Next server with a local fixture owner cookie. These results do not establish native Supabase PostgreSQL/Auth/Storage behavior, CDN invalidation, live deployment, approved PDF handling, physical-device behavior, backup/recovery, or G7 acceptance. No real user/session/provider credentials were accessed.

The R3 allocation snapshot at `2026-10-10T23:50:54Z` recorded 358 entries and 270 files. A later full inventory at `2026-10-11T00:49:05Z` recorded 30,212 entries and 25,402 files, including `candidate/node_modules`, plus 17 changed baseline files. The R3 `.gitignore` marker and misbound W2 asset-manifest hashes still match their packet values. The R3 writer is not established by these receipts; this R4 worker did not write to R3, did not use its candidate as a base, and does not claim that R3 remained byte-identical. See `evidence/r3-preservation.json` and the preserved R3 inventory/delta receipts.

`verification/`, `patch-check/`, and `.work/` are ignored local assembly/test workspaces, excluded from the handoff file-hash inventory. The existing R4 evidence files and concurrent package-inspection receipts were preserved; authorship of those pre-existing helper artifacts is not inferred. One preserved package-audit receipt is an intermediate: it reports an assembly-map mismatch from before the final top-level `sourceFiles` map was added. The final package is verified by `patch-verification-final.json`. `output-hashes.json` enumerates 127 delivered files totaling 13,347,339 raw bytes (excluding itself and the ignored workspaces).

No commit or push was made, as FINISH-A1-R4 explicitly reserves that step until Parent review and stability. Return this exact revision for independent complete-scope/delta audit, then a separate Parent ruling.
