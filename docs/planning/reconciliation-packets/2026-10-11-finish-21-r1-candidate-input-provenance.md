# FINISH-21-R1 — candidate-input provenance mapping amendment

Date: 2026-10-11 UTC

Status: Parent amendment; supersedes only FINISH-21's instruction to resolve every R6 input path literally in the R6 candidate commit. All remaining FINISH-21 boundaries and deliverable rules remain in force.

## Reason

The assigned maker correctly stopped before writing when it found that 10 of the 29 `r6Inputs` entries use a temporary `candidate-app/` alias that is not a path in R6 commit `9188b413d37da0ec3381b5430e25dc375a45bb18`. Treating those ten as direct R6 commit paths would create false missing-object failures. Parent independently mapped eight repository files to the exact pinned source commits/paths below and confirmed that the remaining two are installed `three@0.180.0` package files whose bytes match the original receipt in this workspace. This amendment preserves that distinction; it does not rewrite the historical manifest or imply all inputs are Git blobs.

## Corrected R6 input mapping

For the 19 R6 input rows whose paths are ordinary repository-relative paths, continue resolving them directly in the pinned R6 commit and record the actual raw Git blob bytes. For the eight repository-backed `candidate-app/` rows, record the original alias and use these exact provenance locations:

| Original R6 input alias | Authoritative committed path | Pinned commit |
| --- | --- | --- |
| `candidate-app/app/src/features/world/AssetLoader.ts` | `deliveries/FINISH-C1-R6/source/app/src/features/world/AssetLoader.ts` | `9188b413d37da0ec3381b5430e25dc375a45bb18` |
| `candidate-app/app/tests/unit/world/completion-essential-loader.test.ts` | `deliveries/FINISH-C1-R6/source/app/tests/unit/world/completion-essential-loader.test.ts` | `9188b413d37da0ec3381b5430e25dc375a45bb18` |
| `candidate-app/app/src/features/world/RuntimeMaterialQuality.ts` | `deliveries/FINISH-C1-R5/source/app/src/features/world/RuntimeMaterialQuality.ts` | `5e85e6a8a248581fe3893fd80c7da3d05079f305` |
| `candidate-app/app/src/features/world/WorldRuntime.ts` | `deliveries/FINISH-C1-R5/source/app/src/features/world/WorldRuntime.ts` | `5e85e6a8a248581fe3893fd80c7da3d05079f305` |
| `candidate-app/app/src/features/world/LowQualityBatch.ts` | `deliveries/FINISH-C1-R3/source/src/features/world/LowQualityBatch.ts` | `5e85e6a8a248581fe3893fd80c7da3d05079f305` |
| `candidate-app/app/public/models/production-room-full.glb` | `app/public/models/production-room-full.glb` | `f62a43c5e71c00dcb89e28275ea81d842167db80` |
| `candidate-app/app/public/models/resident-production.glb` | `app/public/models/resident-production.glb` | `f62a43c5e71c00dcb89e28275ea81d842167db80` |
| `candidate-app/app/public/models/fixture-production.glb` | `app/public/models/fixture-production.glb` | `f62a43c5e71c00dcb89e28275ea81d842167db80` |

For each row, record the authoritative commit, repository path, blob OID, SHA-256 and byte count, and compare against the historical alias's expected values. Parent's read-only spot check found these eight committed blob digests/sizes match their original R6 expected values, including the R3 `LowQualityBatch.ts` replacement.

The remaining two aliases are:

- `candidate-app/node_modules/three/build/three.module.js` — expected SHA-256 `c8211c69345d2e9949dc7a8ac969380497aa0600a5a8ac6a459c8cd02dd9cb8a`, 603,113 bytes.
- `candidate-app/node_modules/three/build/three.core.js` — expected SHA-256 `eb077d2417f61d3e6d9264c317cabc4ea35769ed6b0ab533067292a550784c20`, 1,403,455 bytes.

These are installed-package files, not Git blobs. Record them in a distinct non-Git dependency section with their resolved file hashes/sizes, `three` package version, pinned R6 lockfile path and blob identity, the `pnpm-lock.yaml` package integrity string, and the original frozen-install receipt. Verify the package reports version `0.180.0` and both file hashes match the pinned R6 expectations. Do not label these two rows Git-verified. If the installed files or lock evidence cannot be verified, mark them NOT RUN/FAIL and leave E-01 unresolved; do not substitute a guessed or current registry version.

The corrected 29-row receipt must therefore account for 19 direct R6 Git paths, eight mapped Git sources, and two installed-package files. It must preserve every original alias, expected hash, and expected size.

## Deliverable-name amendment

In FINISH-21's required inventory, replace `candidate-input-git-blobs.json` with `candidate-input-provenance.json`, and replace `verify-git-blob-receipts.py` with `verify-input-provenance.py`. The verifier must validate all 27 repository-backed rows against the exact commit/path mapping above and the 19 direct R6 paths, validate both installed package files against the pinned lock/package/install evidence, and report Git-backed versus non-Git counts separately. Keep `predecessor-output-git-blobs.json` as specified: all 32 R5 outputs resolve directly from R5 commit `5e85e6a8a248581fe3893fd80c7da3d05079f305`.

No other FINISH-21 scope changes. The maker still owns only `deliveries/FINISH-C1-R7/`, must stop if that root is occupied, preserve all historical bytes, commit/push only the complete root, and return for a separate independent delta audit. This amendment does not accept the candidate or resolve E-01 by itself.
