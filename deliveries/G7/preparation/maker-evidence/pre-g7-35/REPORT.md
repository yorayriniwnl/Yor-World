# PRE-G7-35 — async shader prewarm evidence

**Status:** Build evidence PASS; candidate remains unaccepted and undeployed
**Source commit:** `5c1e6aedb71d89d46ffc0ada8de522526290131c` (pushed)
**App tree:** `62a08db251ef15254523bfb08b926ce7c6954ebc`
**Domain mirror tree at source commit:** `89ca7d46f790f062e63fcae2368c24ae557e03ab`
**Build ID:** `YeuUJsHpZHf4H1-GP30nT`

## Change

After required scene integration, lighting/material-quality setup, and viewport sizing, `WorldRuntime` awaits `renderer.compileAsync(this.scene, this.camera)` before scheduling the first animation frame and starting entrance choreography. If prewarming throws, the runtime logs the error and continues normal startup. After the await, it checks disposal and the lifecycle token before starting. The optional interaction GLB still loads after the frame loop begins and is not part of this prewarm.

Only `app/src/features/world/WorldRuntime.ts` and its mirrored `yorayriniwnl.in/src/features/world/WorldRuntime.ts` changed in the source commit. `git diff --check` passed. The branch source commit changed exactly those two owned files and the pushed remote ref matched the commit during preflight.

## Validation

Pinned Node `24.19.0` and pnpm `9.15.9` were used.

| Command | Result | Evidence |
| --- | --- | --- |
| `pnpm install --frozen-lockfile --offline --store-dir C:\Users\ayush\AppData\Local\pnpm\store\v3` | PASS; 404 packages reused, zero downloaded | `commands/offline-install.json` and Base64 logs |
| `pnpm run lint` | PASS, exit 0 | `commands/lint.json` and Base64 logs |
| `pnpm run typecheck` | PASS, exit 0 | `commands/typecheck.json` and Base64 logs |
| `pnpm run build` | PASS, exit 0; evidence flag set only for this command | `commands/production-build.json` and Base64 logs |

The build completed optimized compilation, TypeScript, and static generation for all 7 pages. Build ID is recorded with its SHA-256 in `build-id.json`.

Two initial runner-path attempts failed before lint or typecheck started. Their errors are preserved in `commands/runner-path-attempts.json`; both commands then ran through the corrected evidence runner and passed. A first staged evidence whitespace check also failed on Markdown line-break spaces and terminal progress whitespace; that result is preserved in `commands/evidence-commit-preflight-attempt-01.json`. Report whitespace was removed, and command output bytes are preserved as wrapped Base64 with raw hashes and byte lengths recorded in `log-encoding-conversion.json`. No tests were added or run.

## Source and frozen-artifact binding

The source commit binds app tree `62a08db251ef15254523bfb08b926ce7c6954ebc` and domain mirror tree `89ca7d46f790f062e63fcae2368c24ae557e03ab`. The source/mirror audit checked 116 source pairs and 14 test pairs: 130 raw line-ending differences, zero normalized-content mismatches, and zero Git-blob mismatches. The domain URL override remains `https://yorayriniwnl.in` with SHA-256 `bcd4c0eb4681b707c2a6ead176ec38592693f4c8008390d25cddfe702140e530`.

All 9 GLB files under `app/public/models/` retain the same Git blob IDs as frozen PRE-G7-31 source commit `bd01478617b4166866f3f44196c56fc5add94acd`. Their byte lengths and SHA-256 values are in `frozen-model-hashes.json`.

The evidence inventory lists each evidence file, the governing PRE-G7-35/PRE-G7-34/PRE-G7-26 packets, delegation index, source/mirror files, and updated mirror metadata with byte length, SHA-256, and Git blob ID. It excludes only itself to avoid a self-referential hash.

## Not run and acceptance boundary

Tests, browser runtime capture, the full performance suite, independent external audit, and human visual review are **NOT RUN**. In particular, this build does not establish that the startup stall is fixed. PRE-G7-31 remains unaccepted and undeployed; PRE-G7-35 does not authorize acceptance, merge, or deployment.
