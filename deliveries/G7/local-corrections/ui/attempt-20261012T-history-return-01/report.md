# Runtime/UI history restoration correction — attempt 01

Status: implementation and focused verification complete; Parent's integrated browser recheck is pending. This is maker evidence, not independent review or acceptance.

## Defect and correction

The integrated production run failed when browser Back returned from About to `/`: the home page rendered, but the studio stage did not mount. The studio launcher used a render-time lookup for `#studio-stage-host`, although that host appears later in the page tree, and automatic entry depended only on URL query flags. A normal studio session entered from `/` therefore had no return path after its safe snapshot had been saved.

`StudioLauncher` now resolves the portal host after commit and mounts the world when the validated same-tab return snapshot is present. Corrupt or stale snapshots remain rejected by `getReturnSnapshot`; blocked storage retains the existing safe in-memory fallback. The E2E now begins from `/`, enters through the visible studio disclosure/button, navigates to About, uses browser Back, and verifies HOME plus restored camera, room, and preference state.

The earlier report of a `RESTORE_SAFE_SNAPSHOT` cancellation-reason type mismatch is no longer real: `CancellationReason` includes that exact value and the controller call typechecks.

## Changed files and identity

- `app/src/features/world/StudioLauncher.tsx` — SHA-256 `5ce426ad41ac551921fdef11c7952d281f40b165a2722fd03291a400d712a084`
- `app/tests/e2e/local-studio-usability.spec.ts` — SHA-256 `7b21082ef24dc69399957749b3106ea3e35590cf0369a8cce0f35b1e5ce3c871`

Camera framing is unchanged in this delta. `app/src/features/world/CameraDirector.ts` is SHA-256 `94779c93db3f457b34f6a9f04722e39fe030b0cde8a7ad30a6983c3443f6b3a7`; that matches the source used by Parent's F: production-build snapshot. Existing measured-container/ResizeObserver behavior and six-viewport projection tests remain in place. Projection detail is in `deliveries/G7/local-corrections/ui/attempt-20261012T-mobile-camera-crop-02/report.md`. No new settled-HOME browser capture was made here.

## Verification

- `pnpm exec vitest run --config vitest.config.ts --configLoader runner tests/unit/camera-director.test.ts tests/unit/return-storage-and-audio.test.ts tests/unit/interaction-controller.test.ts tests/unit/world-runtime-recovery.test.ts` — PASS, 4 files / 56 tests. Raw output: `runtime-ui-focused-unit.log`; exit: `runtime-ui-focused-unit.exit-code.txt`.
- `pnpm exec vitest run --config vitest.integration.config.ts --configLoader runner tests/integration/production-camera.test.ts tests/integration/runtime/public-snapshot.test.ts` — PASS, 2 files / 12 tests. Raw output: `runtime-ui-focused-integration.log`; exit: `runtime-ui-focused-integration.exit-code.txt`.
- `pnpm run typecheck` — PASS, exit 0. Raw output: `typecheck.log`.
- `pnpm exec eslint src/features/world/StudioLauncher.tsx tests/e2e/local-studio-usability.spec.ts` — PASS, exit 0. Raw output: `focused-eslint.log`.
- `git diff --check -- app/src/features/world/StudioLauncher.tsx app/tests/e2e/local-studio-usability.spec.ts` — PASS, exit 0; only existing CRLF conversion notices.

The first lint attempt caught a synchronous effect state update. That attempt and exit 1 are preserved as `focused-eslint-initial-failure.log` and `.exit-code.txt`; state updates are now scheduled in the animation-frame callback and the final lint passes.

Parent owns the production build and browser run. The updated E2E, six-view settled camera captures, and combined performance checks are therefore **NOT RUN by this maker** and remain pending Parent's coordinated run. At inspection time ports 3000 and 3140 had no listeners; no active preview identity was claimed.

## Files in this evidence attempt

This directory contains the raw focused unit/integration/lint/typecheck logs and exit codes. No source build, hosted check, independent review, or acceptance is claimed.
