# Runtime/UI worker report

Status: implementation checkpoint only. This is maker evidence; it is not independent audit, source acceptance, visual acceptance, or G7 acceptance.

## Binding

- Worktree: `C:\Users\yoray\Projects\Yor-World-Local-Corrections`
- Branch / HEAD: `fix/local-studio-check` / `a599a159bef3935a278a18e2d42877438d664c78`
- Frozen candidate manifest SHA-256: `1f432a4a42564e017b5c6377fd6e58a0916656c378ee6a2fa9b474130a990d29`
- Final `app/src/features/world/asset-locations.ts` SHA-256: `0d3dcdc808fe829baf9872de2f832292a1d42ccffe5cb243def8d52fbeefdfde`
- SHA-256 for this worker's 25 changed source/test files, as a path-sorted-by-assignment inventory in `owned-source-sha256.txt`: `a9bb05af6a8a3263535b555c6d45bea09738ecc95fc7ebf98840e43784fafd66`.
- `asset-locations.test.ts` passed against the exact manifest hash above. Five mapped model URLs use full content hashes from the final manifest.

## Implemented paths

UI, focus, layout, and experience:

- `app/src/features/monitor/launcher.tsx`
- `app/src/features/portfolio/accessibility-controls.tsx`
- `app/src/features/room/room-controls.tsx`
- `app/src/features/room/static-fallback.tsx`
- `app/src/features/world/WorldFallback.tsx`
- `app/src/features/world/WorldRoot.tsx`
- `app/src/features/world/world.module.css`
- `app/src/ui/ModalDialog.tsx`
- `app/src/ui/RouteFocus.tsx`

Runtime, camera, lighting, and batching:

- `app/src/features/world/CameraDirector.ts`
- `app/src/features/world/ConstantMaterialBatch.ts`
- `app/src/features/world/ProductionLighting.ts`
- `app/src/features/world/RigidWorldBatch.ts`
- `app/src/features/world/WorldRuntime.ts`
- `app/src/features/world/asset-locations.ts`

Regression coverage:

- `app/tests/e2e/local-studio-usability.spec.ts`
- `app/tests/e2e/physical-interactions.spec.ts`
- `app/tests/e2e/renderer-recovery.spec.ts`
- `app/tests/e2e/world-lifecycle.spec.ts`
- `app/tests/integration/production-lighting.test.ts`
- `app/tests/unit/asset-locations.test.ts`
- `app/tests/unit/camera-director.test.ts`
- `app/tests/unit/constant-material-batch.test.ts`
- `app/tests/unit/world-interaction-binding.test.ts`
- `app/tests/unit/world-runtime-recovery.test.ts`

The experience changes keep one primary sound and motion control, make loading progress count completed models instead of implying byte percentages, supply focus entry/return targets and route-heading focus, and expose a stage fallback for failure/context-loss states. Runtime changes settle or cancel camera/entrance work during reduced-motion and context-loss paths, pause decorative advancement while retaining navigation, keep the measured-aspect HOME composition responsive, calibrate bounded scene lighting, preserve source materials with unsupported vertex-color input on the native renderer path, and batch only compatible constant PBR materials with atomic fallback and explicit disposal. `asset-locations.ts` now maps the five art-owned candidates to the exact final hash-named URLs.

The new unit raycast test dispatches a pointer gesture against a real Three.js monitor mesh and verifies `lastActivatedId === main-monitor` and the controller opens the launcher. The new browser regression performs a real canvas click and checks modal focus restoration, but that browser test has not run.

## Verification

PASS — isolated actual mesh-binding behavior:

```text
pnpm exec vitest run --config vitest.config.ts tests/unit/world-interaction-binding.test.ts
Test Files 1 passed (1); Tests 1 passed (1)
```

Raw log and exit code: `deliveries/G7/local-corrections/rendering/attempt-20261011T-runtime-interaction-binding/`.

PASS — storage resilience, return snapshot/audio, transition/controller, pause/quality policy, and mesh-binding unit coverage:

```text
pnpm exec vitest run --config vitest.config.ts tests/unit/preferences-resilience.test.ts tests/unit/return-storage-and-audio.test.ts tests/unit/project-transition.test.ts tests/unit/interaction-controller.test.ts tests/unit/quality-policy.test.ts tests/unit/world-interaction-binding.test.ts
Test Files 6 passed (6); Tests 80 passed (80)
```

Raw log and exit code: `deliveries/G7/local-corrections/ui/attempt-20261011T-runtime-ui-units/`.

PASS — final asset mapping test, 1 file / 1 test, against manifest SHA above; `asset-locations.ts` at that run had SHA-256 `0d3dcdc808fe829baf9872de2f832292a1d42ccffe5cb243def8d52fbeefdfde`. Raw evidence: `deliveries/G7/local-corrections/rendering/attempt-20261011T164337Z-final-manifest-rebind/`.

Historical focused checkpoint PASS (before the final additional one-test raycast file was added):

```text
pnpm exec vitest run --config vitest.config.ts tests/unit/asset-locations.test.ts tests/unit/asset-loader.test.ts tests/unit/camera-director.test.ts tests/unit/constant-material-batch.test.ts tests/unit/entrance-coordinator.test.ts tests/unit/lifecycle-manager.test.ts tests/unit/rigid-world-batch.test.ts tests/unit/scene-integrator.test.ts tests/unit/world-runtime-recovery.test.ts
Test Files 9 passed (9); Tests 72 passed (72)

pnpm exec vitest run --config vitest.integration.config.ts tests/integration/production-lighting.test.ts
Test Files 1 passed (1); Tests 4 passed (4)

pnpm typecheck
PASS
```

Raw evidence for that checkpoint: `deliveries/G7/local-corrections/rendering/attempt-20261011T164629Z-slice-checkpoint/`. This historical loader/full-app result is not being rerun or treated as current release evidence: parent has directed that dependent loader/full-app checks wait for release's final policy/hash reconciliation. The new unit-only test was added after the checkpoint; no production source was changed after it.

PASS — whitespace check on the owned path list: `git diff --check -- <owned paths>` (warnings only note normal CRLF-to-LF normalization on several touched files). No whitespace errors.

## Preserved exploratory failures

The early material-color repro attempts remain in separate roots and are not counted as passing tests:

- `deliveries/G7/local-corrections/rendering/attempt-20261011T164124Z-constant-color-regression/`
- `deliveries/G7/local-corrections/rendering/attempt-20261011T164159Z-constant-color-debug/`
- `deliveries/G7/local-corrections/rendering/attempt-20261011T164224Z-constant-color-debug-throw/`

The initial repro assumed source color attributes could enter the constant-material batch, then dereferenced a batch that correctly did not exist. Admission rejects source `color` attributes, so those meshes retain their native material/render path. The replacement regression checks that behavior and verifies transforms do not mutate geometry, material, parent, or layers. Temporary debug logging/rethrow was removed. This resolves the false repro; it is not evidence of a pixel-level color comparison.

## NOT RUN / pending coordination

- No shared Next build/server or browser session was started, per parent freeze instruction.
- No E2E suite was run. In particular the six viewport layouts, keyboard focus trapping/background exclusion, route/history focus in a real browser, actual canvas mesh dialog click/restoration, and case-study return UI remain unverified in-browser.
- No final-manifest screenshot set, reference comparison, axe run, real GPU shader pixel comparison, native-device test, or combined performance/budget measurement was made. No visual, native-GPU, performance, or leak-absence claim is made.
- The E2E specs were updated but are not accepted until they run against the coordinated frozen source and current manifest.
- Loader/full-app checks are pending release's policy/path/hash rebinding. Policy and contract paths were left to their owners.
- No commit was created; parent owns Git coordination and scoped commits.

The earlier browser art screenshots under the `local-corrections-r1` revision refer to prior manifests and prior source fingerprints and are not evidence for this frozen manifest or the current runtime source.
