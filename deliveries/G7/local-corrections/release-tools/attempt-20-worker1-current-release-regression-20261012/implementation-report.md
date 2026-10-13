# Worker 1 backend/release integrity checkpoint — LOCAL-CORRECTIONS-03

Date: 2026-10-12. Branch `fix/local-studio-check`; source HEAD `3f0b47c78b3322f1d2be3d048620bd86e4b32f0f`. This is implementation evidence only. Parent owns review, Git, commits/pushes, and acceptance.

## Assigned delta present in the worktree

The inherited uncommitted Worker 1 paths reviewed in this checkpoint are listed in `source-sha256.txt` and are:

- `deliveries/G7/preparation/tools/candidate-driver.py`: exclusive new JSON/log creation, exact-copy or verified append-only primary export, non-resumable interrupted delivery roots, and source-bound phase start/completion receipts.
- `deliveries/G7/preparation/tools/g7-browser-smoke.mjs` and `g7-live-probes.mjs`: reserve isolated raw evidence outputs and write artifacts/receipts exclusively. Only syntax checks ran; browser and network actions did not run.
- `scripts/release/check-current-status.mjs`, `scripts/release/tests/current-status.test.mjs`, and `scripts/release/tests/status-check.test.mjs`: require visible acceptance labels to agree with explicit accepted/pending disposition and existing source/ruling bindings.
- `scripts/release/tests/immutable-output.test.mjs`: protects the R7 root composition and GLTF validation reports and exercises policy-bound output paths.
- `scripts/release/validate-release.mjs` and `scripts/release/tests/schema-migration-inventory.test.mjs`: bind the exact ordered four-migration inventory to policy.
- `scripts/release/tests/asset-manifest-validation.test.mjs`, `app/src/security/policy.ts`, and `app/tests/unit/cache-policy.test.ts`: validate the candidate manifest and expected exact public/cache inventory. The app policy/cache test currently exposes a shared-tree asset inventory mismatch described below.
- `deliveries/G7/local-corrections/backend/backend-remediation-report.md`: appended the current-source backend evidence index; prior reports/logs remain intact.
- `deliveries/G7/preparation/tools/g7-evidence.py` and `test_g7_evidence.py` are already committed in HEAD from the earlier output-isolation slice; no changes in this checkpoint.

Current art-owned public manifest/GLB files and runtime-owned contract paths were read for integration review and were not edited. `rc6-policy.json` and `release-lib.mjs` are clean in the current worktree and were used as the exact policy inputs.

## Regression evidence

- **PASS** — isolated non-asset release suite: 114/114 tests, exit 0. Exact command and raw log: `non-asset-release-command.txt`, `non-asset-release-regression.log`.
- **FAIL, expected release gate remains closed** — full release suite: 121 tests, 119 pass / 2 fail, exit 1. Both failures are the real public R1 inventory checks rejecting an unreferenced tracked GLB; see `asset-inventory-trace.txt` and `r1-public-inventory.txt`.
- **FAIL, same inventory mismatch** — app contracts/cache suite: 59 tests, 57 pass / 2 fail, exit 1. `app/tests/unit/cache-policy.test.ts` finds 21 public GLBs versus 15 frozen cache paths and 12 R1 directory GLBs versus six manifest URLs. Raw command/log: `app-cache-contract-command.txt`, `app-cache-contract.log`.
- **PASS** — G7 evidence ledger fixtures: 33/33, exit 0. Raw command/log: `g7-evidence-command.txt`, `g7-evidence-regression.log`.
- **PASS** — current backend embedded-database integration suite: 12 files, 210/210, exit 0; exact command and raw log are in `../../backend/attempt-15-current-source-20261012/`.
- **PASS** — actual four migration files match the policy's ordered bytes and SHA-256 inventory; see `../../backend/attempt-15-current-source-20261012/schema-migration-inventory.txt`.
- **PASS** — syntax: `node --check` for all nine changed release/browser/helper `.mjs` files; `python -m ast` for candidate-driver, assembler, and G7 evidence. Scoped tracked `git diff --check` and untracked test whitespace scan pass. Raw results: `syntax-and-diff-check.log`.

## Asset mismatch and proposed narrow guard behavior

The active public/revision manifests and release policy bind six candidate URLs; all candidates remain `approved:false` / `status:candidate`. The current public R1 directory actually contains 12 GLBs. The other six are tracked historical files absent from manifest and accepted/retained/candidate policy inventories. `assetFiles()` rejects on the first such path rather than allowing an unreferenced public model into the bundle. The rejected `fixture-production.ce05...glb` is an unchanged tracked file (391396 bytes, raw SHA-256 `ce05bcbd0033b685b1cdb91fa1591fd366653fc7fd6d7409c1a4efacb508c1fe`); the separate candidate manifest binds `fixture-production.c7ed...glb` (377024 bytes). Full details and all 12 file hashes are in `asset-inventory-trace.txt` and `r1-public-inventory.txt`.

Proposed behavior, pending Parent adjudication: preserve this fail-closed inventory guard, do not add legacy assets to the active cache allowlist or mark candidates approved, and have the art owner archive the six historical extras outside `app/public` with their bytes preserved (or obtain an explicit parent-authorized manifest policy that binds every public URL). The unreferenced-asset unit test should separately use a synthetic file inventory so its orphan assertion reaches `validateVersionedAssetInventory()` even when the shared actual tree is out of sync. No code or asset correction was made before Parent review.

## Limits and NOT RUN

`candidate-driver.py` was not invoked; no shared build, R7 package/validation/inventory phase, browser smoke, live HTTP/TLS probe, service provisioning, production write, hosted Supabase/Auth/PostgREST/Storage test, or deployment ran. The loopback PostgreSQL port 54329 had no listener, so current-source native PostgreSQL validation is **NOT RUN**. The 210/210 backend result is fixture-backed and does not imply native or hosted provider proof. The 248/248 Chrome+Edge run reported by Parent is separate fixture-backed browser evidence and is not R7/G7 acceptance.

## Source fingerprints

Exact SHA-256 values for reviewed source/policy/manifest files, including the two raw manifest hashes, are in `source-sha256.txt`. No files were staged. Per Parent's instruction, this worker leaves Git unstaged/uncommitted for Parent's scoped commit and push.

