# Runtime exit and camera snapshot sync — attempt 01

Status: **bounded Worker 3 implementation complete; focused checks pass; Parent review pending. Not accepted.**

## Scope

This slice fixes two runtime/UI gaps found during the Worker 3 audit:

- Leaving during required asset loading now aborts the runtime's shared loading signal, settles in-flight work, transitions to the portfolio path, and disposes runtime-owned resources. A late parse is retired before scene integration.
- Responsive HOME camera state is synchronized with the experience snapshot. Resizing, direct camera selection, skip, replay, Escape, and return restoration now keep the active and saved camera consistent with the measured viewport. A saved desktop HOME preset adapts to the current mobile viewport. `reverse-doorway` remains a live camera preset but maps to the responsive HOME preset in the safe return snapshot because it is absent from the existing `CameraId` storage contract.
- The UI Continue to Portfolio and Escape paths now use runtime retirement and switch to the static fallback when the studio remains mounted.

## Changed paths

- `app/src/features/experience/controller.ts`
- `app/src/features/world/WorldRuntime.ts`
- `app/src/features/world/WorldRoot.tsx`
- `app/tests/unit/world-runtime-recovery.test.ts`

`WorldRuntime.ts` already contains saved cross-lane batching hunks. This slice does not change batching. `ConstantMaterialBatch.ts` and `RigidWorldBatch.ts`, public asset mapping, backend/release paths, and parent status docs remain outside this slice.

## Checks

| Command | Outcome | Raw evidence |
| --- | --- | --- |
| `pnpm exec vitest run --config vitest.config.ts tests/unit/world-runtime-recovery.test.ts tests/unit/interaction-controller.test.ts tests/unit/return-storage-and-audio.test.ts tests/unit/camera-director.test.ts` (from `app/`) | PASS — 4 files, 50 tests, exit 0 | `unit.log`, `unit.exit-code.txt` |
| `pnpm exec vitest run --config vitest.integration.config.ts tests/integration/production-camera.test.ts tests/integration/production-lighting.test.ts` (from `app/`) | PASS — 2 files, 9 tests, exit 0 | `integration.log`, `integration.exit-code.txt` |
| `pnpm exec tsc --noEmit` (from `app/`) | PASS — exit 0, no diagnostics | `typecheck.log`, `typecheck.exit-code.txt` |
| `git diff --check -- app/src/features/experience/controller.ts app/src/features/world/WorldRuntime.ts app/src/features/world/WorldRoot.tsx app/tests/unit/world-runtime-recovery.test.ts` | PASS — exit 0; Git emitted only existing CRLF-normalization warnings | `diff-check.log`, `diff-check.exit-code.txt` |

No build, browser, E2E, axe, performance, GLB, or new viewport capture was run. Parent owns shared build/browser coordination and will perform the integrated visual/browser checks after the lanes freeze.

## Source hashes

SHA-256 of the complete current files at this attempt:

| Path | SHA-256 |
| --- | --- |
| `app/src/features/experience/controller.ts` | `194c45f985270042b23df19d6d9da18265440d1c80a0bc03d123b35eca009825` |
| `app/src/features/world/WorldRuntime.ts` | `3ed6328ba00f1b6e05aae061f7d255f23f9219f1a20011c00d80af2fe0381c7d` |
| `app/src/features/world/WorldRoot.tsx` | `9cb4c9fdd69b34cefdee97dcf5d4ea4b1c30e8d9c0c565a640ffe0d0382a78d9` |
| `app/tests/unit/world-runtime-recovery.test.ts` | `3f6f696331b10e73d1ac5e2229ecd2ec9b189e5bf2fa49ebe0a0b7c14fe09c2b` |

Log SHA-256 values:

- `unit.log`: `e1e028c63cda0c52152c2024732d3517a0ccaeb37a1af8c9b007640b223e3754`
- `integration.log`: `03f3c9fb1420aac79769623206162abfa5d1040599a9e586683d8c1a499b9bf6`
- `typecheck.log` (empty; no diagnostics): `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
- `diff-check.log`: `4e2e3c153aafb94693c9de5f4f6a29bc2691ae9782ce77e4648409723f8a500a`

## Viewport and review evidence

The `CameraDirector` preset source was not changed in this slice. Previous measured HOME bounds are recorded in [mobile camera crop attempt 02](../attempt-20261012T-mobile-camera-crop-02/report.md), including the 390×844 and 320×600 projected resident, chair, monitor, keyboard, mouse, and desk phone bounds. Parent's [integrated art review attempt 04](../../coordination/attempt-20261012T-integrated-art-review-04/review.md) visually reviewed all six required HOME viewports and reports HOME composition PASS for those captures. That harness does not include product controls, so mobile clearance above controls remains unverified. Attempt 04 also records a tight/cropped reverse-doorway face view; this slice leaves that separate camera pose unchanged.

## Git and limits

The assigned worktree remains on `fix/local-studio-check` at `3f0b47c78b3322f1d2be3d048620bd86e4b32f0f`, with `origin/fix/local-studio-check...HEAD` at `0 0` before this uncommitted slice. No files were staged or committed. Other lanes' dirty files and evidence were preserved. Parent owns the scoped review/commit/push and final acceptance.
