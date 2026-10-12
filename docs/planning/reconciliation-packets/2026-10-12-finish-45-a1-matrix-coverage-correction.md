# FINISH-45 — A1 direct-test coverage for R5-R7 claims

Date: 2026-10-12. Status: **Parent-authorized test/evidence correction; candidate and acceptance pending.** The FINISH-32 local pre-audit confirmed the six source fixes and exact-base patch replay, but identified three requirement-matrix claims whose direct test evidence is narrower than the wording. This packet closes those evidence gaps without reopening the six accepted-by-contract behavior definitions.

## Exact base and governing inputs

- Use FINISH-A1 R5-R7 candidate branch `codex/finish-29-a1-r5-r7-20261011`, commit `76d679dcb98064152021830b98f16eb456b3ae19`, tree `6bb0a24c3ec9b716a4728b88fc0e07d5df440cd6`.
- Exact base commit is `f62a43c5e71c00dcb89e28275ea81d842167db80`; accepted root `app/` tree is `42ea29ec235225046a75959eb19eb386ac2f821d`. The R7 candidate's root `app/` is unchanged.
- R7 package source tree is `1bcaa9acde89fdb9541c3f2abde913a4ed2d2ec3`; its reported exact-base patched `app/` tree is `ba8f952edc34e94393c48b25779071daab9a9812`; patch SHA-256 `aa9b91f613a0f1b98e6da7735ec0513d10d0e1c2e78512fff63ecc19ee717dd8`.
- R7 output manifest SHA-256 is `5c42034d1ceb9cf938d7a536a436b3b53cee8094c48e3e934c419dad0fafa420`.
- Read FINISH-32, the FINISH-24 findings, FINISH-27/29 scope, frozen FINISH-00-R2 ruling and actual path-allowlist location `docs/planning/reconciliation-packets/finish-contracts-r2/02-platform-schema-recovery.md`, then inspect the pinned R7 source/test artifacts directly.
- R7 is still a candidate, not accepted or integrated. Keep its package and all history immutable. This packet is not the assigned GPT Plus #2 review or Parent acceptance.

## Bounded corrections

Create a new isolated delivery in `deliveries/FINISH-A1-R8/` from the pinned R7 candidate. Improve only tests and evidence that substantiate these exact claims:

1. **Absent private draft page behavior:** keep the existing API 404 assertion and add a focused owner-page/browser assertion proving that a requested absent private draft reaches the application's not-found UI/path. Preserve owner checks, private cache headers, and no-content behavior for unauthorized callers.
2. **Canonical preview URL rejection:** expand the existing preview URL test to include fragments and noncanonical percent-encoded/traversal forms called out by FINISH-32, alongside absolute/origin-confused, query, and traversal inputs. Retain a positive canonical URL case. If the implementation fails a frozen FINISH-00-R2 requirement, fix only the relevant files inside the same 26-path A1 allowlist and report the exact reason; do not broaden scope.
3. **Blank new evidence defaults:** add a direct authoring assertion proving a newly created evidence record has no invented note, URL, or checked time (`checkedAt` remains null/empty as the schema requires). Preserve explicitly unknown evidence and blank text/list/code/link defaults.

Do not add unsupported matrix claims. Tie each statement to a named automated assertion or mark the requirement row PARTIAL/NOT RUN. Retain the same DTOs, route contracts, publication behavior, security rules, source allowlist, and accepted app tree. No unrelated changes, provider configuration, schema migrations, or product features.

## Required checks and return

- Rebind the exact R7 commit/source/patch/manifest and candidate parent from raw Git. Prove the R8 patch applies exactly to R7's packaged app and changes only the frozen A1 allowlist. Preserve all R7 files and evidence byte-for-byte except explicitly identified successor bindings, tests, matrix, report, and regenerated package manifests.
- Run the three targeted regressions, full unit/integration suites, lint, typecheck, production build, and relevant Chromium tests on the exact R8 source. Bind every result to the final source/build identity; if any tool is unavailable, report NOT RUN and why.
- Return actual source, tests, patch, matrix, report, raw file hashes, commands/exits, tool versions, and logs. State maker-reported versus rerun results accurately. Native PostgreSQL/provider Auth/Storage, deployed origin/CDN, physical devices/accessibility, recovery, manual operations, and G7 remain separate.
- Branch: `codex/finish-45-a1-test-claim-coverage-correction-20261012`.
- Output root: `deliveries/FINISH-A1-R8/` only. Check both paths are unoccupied before creating; if occupied, preserve and report the immediate names for Parent reallocation.
- Commit and push only the new package to GitHub. Do not change root `app/`, R7, frozen contracts, or earlier evidence. Do not audit, accept, integrate, deploy, or claim G7.

The worker returns the exact pushed commit/tree, changed-path inventory, manifests, and honest PASS/FAIL/NOT RUN evidence. A separate reviewer and Parent ruling remain mandatory before integration.