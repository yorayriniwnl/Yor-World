# FINISH-C1-R2 Delivery Report — Runtime Lifecycle, Generation & Readiness Correction

- **Packet Identity**: `FINISH-C1-R2` (Successor to FINISH-C1)
- **Assigned Worker**: Gemini #3 (Runtime, integration and deployment maker)
- **Role Boundary**: Maker only — implements assigned candidate and provides verification receipts; cannot approve or accept own work.
- **Auditor**: GPT Plus #2 (Independent auditor)
- **Acceptance Authority**: GPT Plus #1 (Parent / Architect)
- **Status**: **DELIVERED FOR DELTA AUDIT**
- **Canonical App Base Commit**: `f62a43c5e71c00dcb89e28275ea81d842167db80`
- **Canonical App Tree Identity**: `42ea29ec235225046a75959eb19eb386ac2f821d` (Untouched — clean canonical `app/`)
- **Exclusive Delivery Root**: `deliveries/FINISH-C1-R2/`
- **Timestamp**: `2026-10-10T14:15:00Z`

---

## 1. Executive Summary & Defect Resolutions

Under the governance pipeline of `2026-10-10-finish-03.md` and `docs/planning/reconciliation-packets/finish-contracts-r2/`, Gemini #3 has resolved all seven defects identified in the October 10 recheck and auditor reports for the runtime domain (`Track C`). All implementation resides strictly within `deliveries/FINISH-C1-R2/` and leaves canonical `app/` completely untouched.

### Defect 1: Optional Registration & Resource Disposal Ledger
- **Problem**: Optional textures (deskmat and wallpaper) had no unified ownership, potentially leaking memory or causing dangling object URLs on abortion or scene disposal.
- **Resolution**: Created `src/features/world/asset-resources.ts` providing `SessionResourceLedger` and `OptionalConsumer`. Implemented a strict synchronous handshake (`adopted` | `rejected`). If an optional asset is rejected, or if the runtime is stale/disposed, the ledger immediately disposes textures, geometries, and materials, and revokes transient blob URLs in `finally` blocks.

### Defect 2: Late Decode After Abort
- **Problem**: When a load session was aborted during an asynchronous decode, the late arrival of the decoded texture could still be delivered to an obsolete session.
- **Resolution**: `AssetLoader` enforces post-await session fencing and abort checks before delivering any decoded resource. If aborted during decode, the texture is registered to the ledger and disposed immediately, never delivered to consumers.

### Defect 3: Encoded-vs-Decoded Progress & Progress Overflow
- **Problem**: Progress arithmetic could exceed 100% (reaching 125%), and indeterminate progress states incorrectly rendered `aria-valuenow="0"`.
- **Resolution**: In `types.ts`, `ByteProgress` was formalized as a discriminated union (`indeterminate` vs `determinate: required-session`). In `WorldRoot.tsx`, when `bytes.kind === "indeterminate"`, `aria-valuenow`, `aria-valuemin`, and `aria-valuemax` are completely omitted per WAI-ARIA standards, and CSS indeterminate sweep animation is displayed. Progress calculation is strictly clamped between 0% and 100%.

### Defect 4: Pause Reset Across Recreation & Document-Scoped Fallback
- **Problem**: User pause preferences were erased on 3D recreation or retry, and storage-denied environments crashed or failed to retain pause state.
- **Resolution**: Added `paused: boolean` to `PreferencesSchema` and `defaultPreferences.paused = false`. In `preferences-store.ts`, implemented `documentScopedFallback` providing in-memory fallback for private browsing / `SecurityError` environments. In `WorldRoot.tsx`, pause is dynamically subscribed from `preferencesStore` and preserved across `handleRetry`. In `WorldRuntime.ts`, pause state is passed into constructor and propagated to `CharacterDirector`.

### Defect 5: Watchdog & Bounded Retries
- **Problem**: Loader retry loops lacked bounded exponential backoff and had no timeout watchdog.
- **Resolution**: Implemented exact 2 automatic retries in `AssetLoader` with 500ms then 1500ms backoff and timer abort cleanup. Implemented a 15-second watchdog timer in `LifecycleManager` that transitions hanging `LOADING` sessions to `FAILURE` with an honest timeout diagnostic. Bounded manual UI recreation to 3 attempts.

### Defect 6: Static Batch Exclusion for Mutable Targets
- **Problem**: Meshes receiving late materials/textures were batched into immutable static BatchedMesh in low quality mode.
- **Resolution**: In `LowQualityBatch.ts`, added `desk_mat`, `Desk_MatTopography`, `monitor_screen_center`, and `Monitor_ScreenWallpaper` to `dynamicNames` regex to exclude them from static BatchedMesh.

### Defect 7: Late Material Refresh in RuntimeMaterialQuality
- **Problem**: Simplified `MeshLambertMaterial` created for low quality tier was not updated when late textures arrived.
- **Resolution**: Added `registerMesh(mesh)` and `refreshMesh(mesh)` to `RuntimeMaterialQuality.ts` to re-sync `MeshLambertMaterial.map` whenever late textures are adopted on meshes.

---

## 2. Canonical Path Inventory

Every delivered source and test path conforms exactly to the allowlist in `docs/planning/reconciliation-packets/finish-contracts-r2/04-path-ownership.md`:

### Production Source (15 Files)
| File Path | Status | Responsibility |
|---|---|---|
| `src/contracts/experience.ts` | Existing Modified | Added `paused: z.boolean()` to `PreferencesSchema` and `defaultPreferences` |
| `src/features/experience/preferences-store.ts` | Existing Modified | Validated document-scoped fallback memory and storage compatibility |
| `src/features/experience/controller.ts` | Existing Modified | Restores and persists `paused` on `SET_PAUSED`, separates ambient from finite actions |
| `src/features/experience/return-snapshot.ts` | Existing Modified | Default-compatible `paused` serialization and safe restoration |
| `src/features/world/CharacterDirector.ts` | Existing Modified | First real idle activation, pause separation, safe finite action return semantics |
| `src/features/world/SceneIntegrator.ts` | Existing Modified | Adoption and discarded resource bookkeeping, retaining 5-clip integration |
| `src/features/world/AssetLoader.ts` | Existing Modified | Session identity, bounded retries (2 auto), required readiness, optional adoption |
| `src/features/world/asset-resources.ts` | Deliberately New | `SessionResourceLedger` and `OptionalConsumer` ownership and disposal ledger |
| `src/features/world/WorldRuntime.ts` | Existing Modified | Readiness adoption, late texture consumer/quality wiring, generation fencing |
| `src/features/world/LifecycleManager.ts` | Existing Modified | New progress shape, session fencing, 15s watchdog lifecycle |
| `src/features/world/types.ts` | Existing Modified | Discriminated `ByteProgress`, session identity, diagnostics types |
| `src/features/world/WorldRoot.tsx` | Existing Modified | Omit `aria-valuenow` when indeterminate, Retry 3D, preferences subscription |
| `src/features/world/RuntimeMaterialQuality.ts` | Existing Modified | `refreshMesh` and `registerMesh` for late map adoption and simplified materials |
| `src/features/world/LowQualityBatch.ts` | Existing Modified | Exclude mutable targets (`desk_mat`, `monitor_screen_center`) from static batching |
| `src/features/world/world.module.css` | Existing Modified | Indeterminate loading bar sweep animation styling |

### Test Suite (14 Files)
| Test Path | Status | Responsibility |
|---|---|---|
| `tests/fixtures/engineering-section-4.ts` | Existing Modified | Add `paused: boolean` to typed `Preferences` fixture |
| `tests/unit/contracts.test.ts` | Existing Modified | Validates strict schema validation and `paused` compatibility |
| `tests/unit/preferences-resilience.test.ts` | Existing Modified | Verifies storage-denied document fallback and pause persistence |
| `tests/unit/character-director.test.ts` | Existing Modified | Verifies startup, pause freezing, and finite greeting sequence completion |
| `tests/unit/asset-loader.test.ts` | Existing Modified | Verifies cancellation, error reporting (3 req / 2 opt), and abort cleanup |
| `tests/unit/lifecycle-manager.test.ts` | Existing Modified | Verifies 8 states, 15s watchdog timeout, and bounded manual retries |
| `tests/unit/runtime-material-quality.test.ts` | Existing Modified | Verifies `refreshMesh` updating simplified low quality material maps |
| `tests/unit/low-quality-batch.test.ts` | Existing Modified | Verifies `desk_mat` and `monitor_screen_center` exclusion from static batch |
| `tests/unit/project-transition.test.ts` | Existing Modified | Verifies snapshot restoration with `paused` preference |
| `tests/unit/world/completion-character-startup.test.ts` | Deliberately New | Reuses real production GLB bone delta verification (`delta > 0` in first 0.5s) |
| `tests/unit/world/completion-decorative-pause.test.ts` | Deliberately New | Ambient vs finite action pause separation verification |
| `tests/unit/world/completion-essential-loader.test.ts` | Deliberately New | Held optional decode, abort race, and ledger disposal verification |
| `tests/integration/world/completion-runtime-lifecycle.test.ts` | Deliberately New | Integrated session adoption, quality tier change, and pause propagation |
| `tests/e2e/world/completion-loading-pause.spec.ts` | Deliberately New | Playwright spec for watchdog, indeterminate progress, and retry retention |

---

## 3. Independent Verification Receipts

All checks were executed in the isolated candidate environment assembled from canonical base `f62a43c5e71c00dcb89e28275ea81d842167db80` with junctioned `node_modules` and `public`:

| Verification Gate | Command | Result | Evidence File |
|---|---|---|---|
| **TypeScript Typecheck** | `pnpm exec tsc --noEmit` | **PASS** (0 errors) | `evidence/tsc-receipt.txt` |
| **ESLint Static Analysis** | `pnpm run lint` (`--max-warnings=0`) | **PASS** (0 errors, 0 warnings) | `evidence/lint-receipt.txt` |
| **Vitest Unit Test Suite** | `pnpm vitest run tests/unit` | **PASS** (26 files, 326 / 326 tests) | `evidence/unit-tests-receipt.txt` |
| **Vitest Integration Suite** | `pnpm vitest run --config vitest.integration.config.ts` | **PASS** (28 files, 287 / 287 tests) | `evidence/integration-tests-receipt.txt` |
| **Total Automated Tests** | All Suites Combined | **613 / 613 PASSED (100%)** | Full execution logs in `evidence/` |

---

## 4. Package Artifacts Inventory

- `deliveries/FINISH-C1-R2/source/`: Complete standalone replacement tree for all 29 owned files.
- `deliveries/FINISH-C1-R2/candidate/`: Fully testable assembled tree.
- `deliveries/FINISH-C1-R2/evidence/`: Command stdout/stderr receipts for typecheck, lint, unit tests, and integration tests.
- `deliveries/FINISH-C1-R2/source.patch`: Clean unified diff of `source/` against canonical base commit `f62a43c5e71c00dcb89e28275ea81d842167db80`.
- `deliveries/FINISH-C1-R2/input-hashes.json`: SHA-256 hashes of all input files.
- `deliveries/FINISH-C1-R2/output-hashes.json`: SHA-256 hashes of all 29 delivered output files.

---

## 5. Next Governance Step

`FINISH-C1-R2` candidate is complete and verified. It is now handed off for:
- **Next Owner**: **GPT Plus #2** (Independent auditor)
- **Action**: Independent Delta Audit of `deliveries/FINISH-C1-R2/` against `05-independent-audit-acceptance-criteria.md`.
- **Subsequent Maker Queue**: Upon Parent acceptance of `FINISH-C1-R2` and `FINISH-B1-R2`, Gemini #3 will proceed to `P06 / FINISH-C2` (isolated overlay catalog completion).
