# PRE-G7-32 source validation report

**Result: FAIL; PRE-G7-31 remains unaccepted and undeployed.** The frozen PRE-G7-31 source passed unit, lint, typecheck, both integration runs, build, and the composition browser suite. Its one authorized full performance run failed 5 of 6 checks: the active interaction route remained in `LOADING` instead of reaching `HOME` within the existing 15-second assertion. The packet allows one performance invocation, so the run was not retried and no source or test correction was made.

## Source binding

| Item | Value |
|---|---|
| Validation packet | `docs/planning/reconciliation-packets/2026-10-16-pre-g7-32-pre-g7-31-source-validation.md` |
| Validation packet commit | `b8fe473cb27fd0b39880c4bca80b420e45522f57` |
| Frozen PRE-G7-31 source commit | `bd01478617b4166866f3f44196c56fc5add94acd` |
| Canonical `app/` tree | `3975e40c59a04b8696efa2ca3605eb37a0617165` |
| PRE-G7-31 source-commit domain tree | `8c34adf791c678a4e9e8bfe90f92426026994e68` |
| Evidence starting commit | `13c329421fb8e8c16328714f51f6bad6d8f4397d` |
| Node / pnpm | `v24.19.0` / `9.15.9` |
| Node executable | `C:\Users\ayush\AppData\Local\Temp\yor-world-node-24.19.0\unpacked\node-v24.19.0-win-x64\node.exe` |
| Corepack | `C:\Program Files\nodejs\node_modules\corepack\dist\corepack.js` |

`preflight.json` confirms the frozen app tree, 116 source-file pairs and 14 test-file pairs with zero source/mirror Git-blob mismatches. Product source paths were clean; the only worktree entry was this packet's own untracked evidence directory. The initial helper preflight incorrectly treated that expected evidence directory as a product change; its raw result is retained as `preflight-attempt-01.*`, the helper was corrected to check product paths, and the preserved final preflight passed. No application, test, asset, dependency, threshold, timeout, or quality-policy files were changed.

The build receipt confirms `NEXT_PUBLIC_PRE_G7_13_EVIDENCE=1`. The browser receipt binds the isolated run directory to `visual-run/`. Its Playwright JSON reports 6 expected, 0 unexpected, 0 skipped, and 0 flaky checks across Chrome and Edge. The fresh 390x844 Chrome projected-anchor snapshot records the `home-mobile` camera target `[0.06, 0.55, -1.2]`. This is captured browser evidence; human visual review beside the main reference remains pending.

## Authorized checks

| Check | Result | Exact command | Exit | Evidence and reason |
|---|---|---|---:|---|
| Pinned toolchain and source/mirror preflight | PASS | `node preflight.mjs` | 0 | `preflight.json`; exact source commit/tree confirmed, 116 source and 14 test pairs, zero parity failures. Initial helper false-negative is preserved separately. |
| Offline dependency setup (needed because `app/node_modules` was absent) | PASS | `pnpm install --offline --frozen-lockfile` | 0 | `commands/install.receipt.json`, `.stdout.bin`, `.stderr.bin`. |
| Unit suite | PASS | `pnpm run test:unit` | 0 | `commands/unit.*`. |
| Lint | PASS | `pnpm run lint` | 0 | `commands/lint.*`. |
| Typecheck | PASS | `pnpm run typecheck` | 0 | `commands/typecheck.*`. |
| Integration run 1 | PASS | `pnpm run test:integration` | 0 | `commands/integration_01.*`. |
| Integration run 2 | PASS | `pnpm run test:integration` | 0 | `commands/integration_02.*`; invoked consecutively after run 1. |
| Production build with composition evidence enabled | PASS | `pnpm run build` | 0 | `commands/build.*`; receipt records `NEXT_PUBLIC_PRE_G7_13_EVIDENCE=1`. Bound to the frozen source commit and app tree above. |
| Composition browser suite | PASS | `pnpm exec playwright test tests/e2e/world-reference-composition.spec.ts` | 0 | `commands/composition_e2e.*`, `visual-run/`, and `visual-run/playwright-results/`; 6 expected, 0 unexpected, 0 skipped, 0 flaky across Chrome and Edge. Evidence environment uses one isolated absolute directory. |
| Full performance suite with traces | **FAIL** | `pnpm run test:performance --trace on` | 1 | `commands/performance.*`, `performance/performance-results.json`, and six archives under `performance/playwright-results/`. Five checks passed. `60-second active interaction route and frame pacing` failed at `tests/performance/world.spec.ts:93`: `data-lifecycle-state` stayed `LOADING`, not `HOME`, for the 15-second assertion. No retry was made. |

The performance runner output confirms Playwright received `playwright test --config playwright.performance.config.ts "--trace" "on"`, with one worker, zero retries, port `3220`, and no standalone `--`. All six trace archives and the failed test's `error-context.md` are preserved. The failure shows that the startup readiness stall recurred in this invocation; this evidence does not establish its cause or attribute it to the camera adjustment.

## Gate status and inventory

The complete captured command output, receipts, screenshots, projected/runtime measurements, performance JSON, `.last-run.json`, error context, and six traces are retained under this directory. `evidence-inventory.json` lists artifact paths, byte lengths, raw SHA-256 hashes, and Git blob IDs; it excludes only itself to avoid a self-referential hash. The inventory was checked against committed tree entries after commit.

Independent GPT Plus #2 audit: **NOT RUN**. Human visual review beside `references/images/main-reference.png`: **NOT RUN**. Parent acceptance: **PENDING**. Merge, deployment, domain live check, physical-device check, provider/production checks, and G7 completion: **NOT RUN / NOT AUTHORIZED by this packet**. PRE-G7-31 remains an unaccepted, undeployed candidate; any correction requires a separate bounded packet.
