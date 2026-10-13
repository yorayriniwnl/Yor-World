# Runtime/UI audit follow-up — 2026-10-11

Executor: local Codex runtime/UI maker. This report covers the parent-assigned replay lifecycle and production-lighting asset-binding findings. It is implementation evidence only; it is not an independent audit or acceptance.

## Findings addressed

Room Controls still dispatches `ENTER,replay:true`. Runtime-created `ExperienceController` instances now receive a replay callback from `WorldRuntime`. That intent clears the panel/controller state, then delegates to the same runtime replay action used by the HUD and modal. `WorldRuntime.replayEntrance()` remains the single owner of `LifecycleManager.replayEntrance()` and `EntranceCoordinator.playEntrance()`, so replay does not allocate another load/render session.

The new regression exercises the HUD action, the exact `ENTER,replay:true` controller intent used by Room Controls, and the modal action. It observes HOME→ENTRANCE→HOME for each action and asserts the session token and renderer owner remain unchanged and `AssetLoader.loadSession` remains at one call.

The lighting integration no longer reads `public/models/production-room-full.glb` as its fixture. It resolves `production-room-full` from `public/asset-manifest.json`, checks that `ASSET_LOCATIONS.roomFull` selects that URL, rejects the stale unversioned path, and verifies the selected asset's byte count and SHA-256 before parsing it.

## Changed paths and whole-file fingerprints

The fingerprints are SHA-256 of the complete files at this checkpoint. `WorldRoot.tsx`, `WorldRuntime.ts`, `controller.ts`, and `world-runtime-recovery.test.ts` already contained earlier uncommitted runtime/UI work; this follow-up adds only the replay delegation/wiring and regression hunks to those files.

| Path | Change | SHA-256 |
|---|---|---|
| `app/src/features/experience/controller.ts` | Injected runtime replay owner; Room Controls' replay intent closes its panel and delegates to that owner. | `779c6f9aa2015cf07a5a57a512622abc0867c412fb6a618f662a6ac7dec539de` |
| `app/src/features/world/WorldRuntime.ts` | Bound its controller replay callback to the runtime replay action. | `59820d8dea420738d22668fab27be88095100c7ce3cdb7d93683c429a8ba8080` |
| `app/src/features/world/WorldRoot.tsx` | Routed HUD and replay-modal controls through the shared runtime replay action. | `e9c87766e55484f05f4ff3c14d2d1622dd72ca6e644889671e344d5caedb22e3` |
| `app/src/features/world/replay-entrance-actions.ts` | Added the shared runtime replay and controller-close actions. | `7a1f936404deff539a2f6a8b5dc7b9818d8c29fb1b74f6c36b651d9508f35fe8` |
| `app/tests/unit/world-runtime-recovery.test.ts` | Added one-session regression across HUD, Room Controls and replay modal. | `9988bbe1cea5b3f60e065d9bd2acfd0cf848f8f6413cff855850ade695988429` |
| `app/tests/integration/production-lighting.test.ts` | Bound lighting integration coverage to the current manifest asset and its integrity metadata. | `cd8aef7ca819a21b5c8618f3fda92fab9cde4e61792239db17cbd296b1960c8f` |

Asset binding observed during the final checks:

- Manifest SHA-256: `1f432a4a42564e017b5c6377fd6e58a0916656c378ee6a2fa9b474130a990d29`.
- Current room URL: `/models/world-art-local-corrections-20261009-r1/production-room-full.2b4c1d18b81874630da5c32836b0e37ec1ff9f25147ccb92aba1d22f62e46a6e.glb`.
- Current room SHA-256: `2b4c1d18b81874630da5c32836b0e37ec1ff9f25147ccb92aba1d22f62e46a6e`; actual and declared size: 1,342,960 bytes.
- The retained unversioned file is 861,364 bytes with SHA-256 `3a02647d24e474c8a2579b0d277cf02a7841212e961c1554f67b6e032e40a307`; the test explicitly cannot resolve to that path.

## Final verification

Vitest and ESLint commands ran from `app/`; `git diff --check` ran from the repository root. All checks targeted the final source fingerprints above.

| Check | Result |
|---|---|
| `pnpm exec vitest run --config vitest.config.ts tests/unit/world-runtime-recovery.test.ts` | **PASS** — 1 file, 15 tests. Raw output: `unit-world-runtime-recovery.log`. |
| `pnpm exec vitest run --config vitest.integration.config.ts tests/integration/production-lighting.test.ts` | **PASS** — 1 file, 4 tests. Raw output: `integration-production-lighting.log`. |
| `pnpm exec eslint src/features/experience/controller.ts src/features/world/WorldRuntime.ts src/features/world/WorldRoot.tsx src/features/world/replay-entrance-actions.ts tests/unit/world-runtime-recovery.test.ts tests/integration/production-lighting.test.ts --max-warnings=0` | **PASS** — all six scoped files, zero warnings. Raw output: `eslint.log`. |
| `git diff --check -- app/src/features/experience/controller.ts app/src/features/world/WorldRuntime.ts app/src/features/world/WorldRoot.tsx app/tests/unit/world-runtime-recovery.test.ts app/tests/integration/production-lighting.test.ts` | **PASS** — exit 0; only Git's existing CRLF normalization notices appeared. The new untracked helper was included in ESLint. |
| Earlier attempt: lighting integration immediately after the manifest refactor | **FAIL, corrected** — two assertions referenced an out-of-scope local `assetPath`; preserved at `attempt-20261011T1712Z-room-replay-lighting-audit-fix/integration-production-lighting.log`. The final run passes all four tests. |
| Earlier attempt: three-control replay test using a single microtask wait | **FAIL, corrected** — the test checked modal lifecycle state before the async controller-close action had completed; preserved at `attempt-20261011T1713Z-room-replay-lighting-audit-final/unit-world-runtime-recovery.log`. The regression now waits for the actual lifecycle notification, and the final run passes all 15 tests. |
| Typecheck, full suite, browser/E2E, build, visual/GPU, performance, and physical-device checks | **NOT RUN** — parent freeze requested focused tests/lint only and prohibited build/browser/E2E at this stage. |
| Independent audit, acceptance, commit, push | **NOT RUN** — maker does not self-audit or accept; parent owns Git and acceptance. |

Final raw logs, `changed-source-sha256.txt`, `asset-binding.json`, `diff-check.log`, and this report are under `deliveries/G7/local-corrections/rendering/attempt-20261011T1714Z-room-replay-lighting-audit-final/`. The failed attempts above remain in their own evidence roots; none were overwritten.
