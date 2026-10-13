# Runtime/UI worker report — current checkpoint

This is implementation evidence from the assigned maker. It is not independent audit, visual acceptance, source acceptance, or G7 acceptance.

## Candidate binding

- Worktree: `C:\Users\yoray\Projects\Yor-World-Local-Corrections`
- Branch / HEAD: `fix/local-studio-check` / `a599a159bef3935a278a18e2d42877438d664c78`
- Final art manifest SHA-256: `1f432a4a42564e017b5c6377fd6e58a0916656c378ee6a2fa9b474130a990d29`
- Final `app/src/features/world/asset-locations.ts` SHA-256: `0d3dcdc808fe829baf9872de2f832292a1d42ccffe5cb243def8d52fbeefdfde`
- Owned 25-file source/test inventory fingerprint: `757b8ea86870ce4b3d65fec7aa232c1cc65e733363f493aebecd723462fd75a4`; per-file hashes are in `owned-source-sha256.txt` beside this report.

## Implementation

Focus and accessible experience changes cover modal focus entry and return, route/history heading focus, context-loss/failure focus recovery, compact scene layout, loading counts by completed models, and removal of duplicate sound/motion controls. The camera uses measured scene dimensions and responsive aspect composition; lighting and constant-material batching keep conservative native-renderer fallbacks, verify shader linking, and preserve ownership/cleanup. The final hash-versioned art URLs are bound in `asset-locations.ts`.

The follow-up return-state audit fixed three state gaps. Startup now chooses quality from the validated return snapshot or stored preferences before creating the quality controller. User quality selections update the experience preference store. Saved sound intent remains visible as “Tap to enable” while playback stays off until a new gesture; startup mute no longer erases that intent. Runtime intro completion updates the active controller preference store, and the restored camera/quality state is applied after the initial snapshot has actually been restored.

The material-color investigation confirmed that source geometry with a `color` attribute is excluded from custom batching and stays on the native path. The replacement regression verifies geometry, material, hierarchy, and layers remain unchanged in that fallback.

Owned changed files:

- Runtime/UI: `app/src/features/monitor/launcher.tsx`, `app/src/features/portfolio/accessibility-controls.tsx`, `app/src/features/room/room-controls.tsx`, `app/src/features/room/static-fallback.tsx`, `app/src/features/world/CameraDirector.ts`, `app/src/features/world/ConstantMaterialBatch.ts`, `app/src/features/world/ProductionLighting.ts`, `app/src/features/world/RigidWorldBatch.ts`, `app/src/features/world/WorldFallback.tsx`, `app/src/features/world/WorldRoot.tsx`, `app/src/features/world/WorldRuntime.ts`, `app/src/features/world/asset-locations.ts`, `app/src/features/world/world.module.css`, `app/src/ui/ModalDialog.tsx`, `app/src/ui/RouteFocus.tsx`.
- Tests: `app/tests/e2e/local-studio-usability.spec.ts`, `app/tests/e2e/physical-interactions.spec.ts`, `app/tests/e2e/renderer-recovery.spec.ts`, `app/tests/e2e/world-lifecycle.spec.ts`, `app/tests/integration/production-lighting.test.ts`, `app/tests/unit/asset-locations.test.ts`, `app/tests/unit/camera-director.test.ts`, `app/tests/unit/constant-material-batch.test.ts`, `app/tests/unit/world-interaction-binding.test.ts`, `app/tests/unit/world-runtime-recovery.test.ts`.

## Verification

PASS — runtime recovery, decorative pause/navigation, reduced-motion settling, one-session replay, context-loss late-resource disposal, inclusive draw count, intro persistence, and mute-without-preference-erasure:

```text
pnpm exec vitest run --config vitest.config.ts tests/unit/world-runtime-recovery.test.ts
Test Files 1 passed (1); Tests 14 passed (14)
```

Raw log, exit code, manifest hash, and tested source hashes: `deliveries/G7/local-corrections/rendering/attempt-20261011T-runtime-preferences-unit/`.

PASS — actual Three.js raycast binding from a named monitor mesh:

```text
pnpm exec vitest run --config vitest.config.ts tests/unit/world-interaction-binding.test.ts
Test Files 1 passed (1); Tests 1 passed (1)
```

Raw evidence: `deliveries/G7/local-corrections/rendering/attempt-20261011T-runtime-interaction-binding/`. The E2E real-canvas click regression is present but has not run.

PASS — independent storage, return/audio, transition/controller, and quality-policy tests:

```text
pnpm exec vitest run --config vitest.config.ts tests/unit/preferences-resilience.test.ts tests/unit/return-storage-and-audio.test.ts tests/unit/project-transition.test.ts tests/unit/interaction-controller.test.ts tests/unit/quality-policy.test.ts tests/unit/world-interaction-binding.test.ts
Test Files 6 passed (6); Tests 80 passed (80)
```

Raw log: `deliveries/G7/local-corrections/ui/attempt-20261011T-runtime-ui-units/unit.log`. This ran before the final `WorldRoot`/`WorldRuntime` preference follow-up; the direct runtime regression above was rerun after that follow-up.

PASS — final exact manifest-mapping test:

```text
pnpm exec vitest run --config vitest.config.ts tests/unit/asset-locations.test.ts
Test Files 1 passed (1); Tests 1 passed (1)
```

`asset-locations.ts` SHA-256 was `0d3dcdc808fe829baf9872de2f832292a1d42ccffe5cb243def8d52fbeefdfde`. Raw evidence: `deliveries/G7/local-corrections/rendering/attempt-20261011T164337Z-final-manifest-rebind/`.

PASS — focused lint on the latest follow-up paths:

```text
pnpm exec eslint src/features/world/WorldRoot.tsx src/features/world/WorldRuntime.ts tests/unit/world-runtime-recovery.test.ts tests/e2e/local-studio-usability.spec.ts
Exit code 0
```

Raw log: `deliveries/G7/local-corrections/rendering/attempt-20261011T-preference-hydration-fix2/`.
A final expanded focused lint check over all owned TS/TSX files also passed (24 files, exit 0): `pnpm exec eslint src/features/monitor/launcher.tsx src/features/portfolio/accessibility-controls.tsx src/features/room/room-controls.tsx src/features/room/static-fallback.tsx src/features/world/CameraDirector.ts src/features/world/ConstantMaterialBatch.ts src/features/world/ProductionLighting.ts src/features/world/RigidWorldBatch.ts src/features/world/WorldFallback.tsx src/features/world/WorldRoot.tsx src/features/world/WorldRuntime.ts src/features/world/asset-locations.ts src/ui/ModalDialog.tsx src/ui/RouteFocus.tsx tests/e2e/local-studio-usability.spec.ts tests/e2e/physical-interactions.spec.ts tests/e2e/renderer-recovery.spec.ts tests/e2e/world-lifecycle.spec.ts tests/integration/production-lighting.test.ts tests/unit/asset-locations.test.ts tests/unit/camera-director.test.ts tests/unit/constant-material-batch.test.ts tests/unit/world-interaction-binding.test.ts tests/unit/world-runtime-recovery.test.ts`. Raw log: `deliveries/G7/local-corrections/rendering/attempt-20261011T-owned-lint-02/eslint.log`.

The first expanded-lint invocation failed before ESLint analysis because PowerShell passed the file array as one filename. That shell-argument failure is preserved at `deliveries/G7/local-corrections/rendering/attempt-20261011T-owned-lint/`; the explicit-argument rerun above passed.

PASS — `git diff --check` on all owned tracked paths; latest follow-up paths were rechecked separately. Git only reports normal CRLF-to-LF normalization warnings; no whitespace errors.

Historical pre-follow-up checkpoint (not current-source acceptance):

```text
pnpm exec vitest run --config vitest.config.ts tests/unit/asset-locations.test.ts tests/unit/asset-loader.test.ts tests/unit/camera-director.test.ts tests/unit/constant-material-batch.test.ts tests/unit/entrance-coordinator.test.ts tests/unit/lifecycle-manager.test.ts tests/unit/rigid-world-batch.test.ts tests/unit/scene-integrator.test.ts tests/unit/world-runtime-recovery.test.ts
Test Files 9 passed (9); Tests 72 passed (72)

pnpm exec vitest run --config vitest.integration.config.ts tests/integration/production-lighting.test.ts
Test Files 1 passed (1); Tests 4 passed (4)

pnpm typecheck
PASS
```

Raw evidence: `deliveries/G7/local-corrections/rendering/attempt-20261011T164629Z-slice-checkpoint/`. These ran before the preference-hydration follow-up and are retained as historical evidence only. The exact mapping test remains bound to the unchanged manifest and mapping-source hashes above.

## NOT RUN / pending coordination

- No shared Next build/server, browser run, or E2E run was started under the parent freeze. The six-viewport interaction/layout suite and new tests for saved quality/sound, intro completion, restored camera, real mesh-originated dialog focus, route/history focus, and dialog keyboard behavior still need browser execution against the coordinated frozen source.
- Full `pnpm typecheck`, loader/full-app suites, full E2E/axe, final-manifest screenshots/reference comparison, real GPU color comparison, and combined performance/budget measurements are pending the parent/release hash-policy reconciliation and coordinated freeze.
- Current art candidate URLs remain candidate/unapproved; this worker did not approve the art, policy, or release output.
- Historical art captures use earlier manifest/source identities and do not validate the current runtime or final manifest. No physical-device, native-GPU, performance, or measured leak-absence claim is made.
- The exploratory failed material-color repro/debug attempts remain untouched at `deliveries/G7/local-corrections/rendering/attempt-20261011T164124Z-constant-color-regression/`, `attempt-20261011T164159Z-constant-color-debug/`, and `attempt-20261011T164224Z-constant-color-debug-throw/`; they are not passing evidence.
- No commit was created; parent owns Git coordination and scoped commits.

The previous report at `attempt-20261011T-runtime-ui-finalization/worker-report.md` is an earlier checkpoint and is superseded by this one.


