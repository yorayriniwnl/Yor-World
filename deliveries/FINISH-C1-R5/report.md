# FINISH-C1-R5 — local implementation return

Date: 2026-10-11  
Worker: local Codex runtime implementation worker  
Status: implementation candidate returned for independent audit; Parent acceptance and integration are pending.

## Source binding and scope

The candidate starts at immutable base commit f62a43c5e71c00dcb89e28275ea81d842167db80, whose app tree is 42ea29ec235225046a75959eb19eb386ac2f821d. It applies the required FINISH-C1-R3 predecessor patch, SHA-256 e1be558f734378fe69659dcf8271c4e5e57d87fbfbdca1582823be103082dc5d, followed by the R5 patch, SHA-256 d6ad3359fa628067ab228eccc52f25d0604ddddb42813d7023e6a809cf60d83d. The accepted FINISH-00-R2 output manifest is bound by SHA-256 8038db147824b0a31de1028c330383352177020b2247dd627d1674d6dc14c6af.

The R5 patch changes exactly these six allowlisted paths:

- app/src/features/world/AssetLoader.ts
- app/src/features/world/RuntimeMaterialQuality.ts
- app/src/features/world/WorldRuntime.ts
- app/tests/unit/world/completion-essential-loader.test.ts
- app/tests/unit/runtime-material-quality.test.ts
- app/tests/unit/project-transition.test.ts

No canonical app files, FINISH-C1-R3/R4 delivery files, or audit outputs were changed. No commit, push, integration, independent audit, or self-acceptance was performed. The temporary assembly and sequential-verification workspaces are retained under this delivery root.

## Corrections implemented

- Essential-transfer progress now trusts only an explicitly confirmed identity representation with a positive safe Content-Length and a matching received byte count at EOF. Unknown, compressed, chunked, contradictory, and mismatched responses remain indeterminate. Failed-attempt byte and trust state is cleared before retry progress is announced.
- Late texture maps are isolated when the target GLB material has distinct sampler or transform state. The target copy retains flipY, channel, wrap, UV transform, and sampling configuration. Optional-map installation tracks derivatives and rolls back visible material plus quality registries atomically; temporary resources are disposed without disposing the original base map or changing unrelated shared-material users.
- Greeting timeouts are owned by their WorldRuntime instance. Replacement and transitions out of the greeting state clear the timer, generation checks reject stale callbacks, and dispose clears synchronously.

The R4-specific tests cover the malformed final required response, a failure on the second mesh sharing the original material with observable disposal counts, and a real WorldRuntime timer replacement/stale-callback/disposal sequence.

## Test-first evidence

The red runs reproduced the assigned defects before the implementation changes:

- red-loader.log: 13 passed and 4 failed, covering absent encoding, chunked transfer with a length, malformed final required EOF, and retry-state reset.
- red-material.log: 12 passed and 2 failed, covering GLB texture-state isolation and shared-material rollback.
- red-mat-transition.log: 35 passed and 3 failed, including the shared-material and WorldRuntime timer regressions.

The exact runner and failing cases are preserved in each raw log. The original shell line for the focused red runs was not persisted separately.

## Validation results

| Check | Result | Evidence |
| --- | --- | --- |
| Offline frozen install | PASS, exit 0 | evidence/logs/install.log |
| Focused green regressions | PASS, 55 tests in 3 files | evidence/logs/green-targeted.log |
| Material rollback green rerun | PASS, 14 tests | evidence/logs/green-material.log |
| Full unit suite | PASS, 355 tests in 26 files | evidence/logs/unit.log |
| Integration suite | PASS, 290 tests in 28 files | evidence/logs/integration.log |
| Lint | PASS, zero warnings permitted | evidence/logs/lint.log |
| Typecheck | PASS | evidence/logs/typecheck.log |
| Production build | PASS | evidence/logs/build.log |
| Production browser paths | PASS, 3 Chromium tests | evidence/logs/browser.log and evidence/browser-results/browser-results.json |
| Sequential patch application | PASS | evidence/logs/sequential-apply.log and evidence/sequential-apply-receipt.json |

Sequential verification started from the immutable base. Before R5, all 29 C1-R3 app outputs matched the predecessor output manifest by SHA-256 and byte length. The default Git apply check and application then passed for R5, followed by git diff --check. After R5, all six candidate files were byte-identical to the returned replacements, and all 23 non-overlapping R3 app outputs retained their predecessor hashes and lengths. The R3 replacement files independently match all 29 entries in the R3 output-hashes.json manifest.

The tested assembly, sequential candidate, and returned six replacements are byte-identical. The production build identity is BUILD_ID WtL2rKS6CkbAL7t86fHms, SHA-256 C556A332EDCB663EFE331338A09EB42B52F7FB444AF014DCE9DBE05EFB26C515.

Tool versions: Node v24.19.0; pnpm 9.15.9; Vitest 5.0.2; ESLint 9.39.5; TypeScript 6.0.3; Playwright 1.63.0; Next.js 16.3.8. Commands and exit codes are recorded in evidence/validation-results.json.

The browser tests ran against the local production build in Chromium and exercised required-load cancellation and indeterminate ARIA progress, pause recovery after failed loading with runtime recreation, and watchdog recovery after a required-transfer stall. Playwright produced a JSON result receipt; separate screenshot files were not captured. No hosted provider, production deployment, physical phone/tablet, or assistive-technology acceptance is claimed.

## Patch line-ending correction

The audited parent-level source.patch was copied without modification and its original SHA-256 was 791fbb4220eea7ec3e03f6a028144ba2e1cbfac6e908cf4cd9dca9b688fb9f3b. Its 735 lines used CRLF, while the candidate source uses LF, so default git apply --check rejected the copied patch. The R5-root source.patch was regenerated from the same verified assembly diff with LF endings only; its text is identical after CRLF-to-LF normalization and its final SHA-256 is d6ad3359fa628067ab228eccc52f25d0604ddddb42813d7023e6a809cf60d83d. The parent-level copy remains untouched. Both hashes and the normalization evidence are recorded in evidence/recovery-copy-hashes.json and evidence/logs/patch-normalization.log.

## Returned files

- source.patch
- source/ with the six exact replacement files
- input-hashes.json, changed-paths.json, requirements-matrix.json, and output-hashes.json
- evidence/ with raw test, lint, typecheck, build, browser, and patch-application logs and receipts

The hash files bind the required FINISH-04/05/06/08 inputs, accepted design, R3 predecessor, R4 diagnostic inputs, exact R5 source outputs, and evidence artifacts. The output manifest excludes itself and the retained temporary workspace under .work/.

## Handoff

This is a local implementation return, not an audit or acceptance. An independent reviewer should inspect this exact stable candidate and its regressions. Parent acceptance remains a separate decision.