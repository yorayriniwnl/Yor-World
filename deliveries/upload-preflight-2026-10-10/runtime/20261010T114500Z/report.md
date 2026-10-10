# Gemini #3 Runtime Preflight Report — FINISH-03 Lane Preflight

**Lane:** Gemini #3 — runtime, integration and deployment maker  
**Date:** 2026-10-10  
**Timestamp:** `20261010T114500Z`  
**Preflight Root:** `deliveries/upload-preflight-2026-10-10/runtime/20261010T114500Z/`  
**Coordination HEAD:** `de2c8afe516099d7d7be30a63e16a883b753133a`  
**Packaging Baseline Commit:** `f62a43c5e71c00dcb89e28275ea81d842167db80`  
**Canonical Application Tree:** `42ea29ec235225046a75959eb19eb386ac2f821d` (clean; `git diff --name-only HEAD -- app` empty)  
**Governance Ruling Context:** Historical accepted baseline G6-R1 / RC5; RC6-R1 source accepted for G7 preparation; FINISH-00 accepted historically; FINISH-00-R2 draft contracts reviewed with Astra PASS advice (r2), awaiting Parent acceptance ruling.

---

## 1. Handoff Discovery & Implementation Prerequisite Check

In accordance with the account operating model and FINISH-03 upload instructions, Gemini #3 inspected the workspace to determine if an eligible implementation packet exists:

1. **FINISH-00-R2 Status:**
   - Contract files exist in `docs/planning/reconciliation-packets/finish-contracts-r2/` (output manifest raw SHA-256: `65126f6a196449f0167263574b84bbc8aaa439760f17323e2cca447f1f74056d`).
   - Architectural delta advice r2 (`deliveries/completion-audits/FINISH-00-R2/architecture/r2/report.md`) by Astra evaluated the delta and advised **PASS**.
   - However, **no formal Parent acceptance ruling** for FINISH-00-R2 exists yet in `docs/planning/reviews/`.
   - `00-contract-decision.md` remains explicitly marked: *"DRAFT FOR INDEPENDENT REVIEW; no implementation acceptance."*

2. **FINISH-C1-R2 Issuance Status:**
   - Previous candidate FINISH-C1 was reviewed by GPT Plus #2 (`deliveries/completion-audits/FINISH-C1/2026-10-10-r1/report.md`), which advised **REWORK** across findings C1-R1 through C1-R7.
   - Parent has not yet issued the formal execution handoff for FINISH-C1-R2 with accepted contract hashes.

3. **Determination:**
   - Prerequisites for P05 (FINISH-C1-R2) implementation are **NOT YET SATISFIED**.
   - Per instruction, Gemini #3 does not self-dispatch, self-approve, or modify shared production files.
   - **Concrete preflight executed immediately** in this owned directory without making production changes.

---

## 2. Technical Inspection of Delivered C1 Candidate & Canonical Consumers

The delivered C1 candidate (`deliveries/FINISH-C1/source/` and `source.patch`) was mapped against canonical source in `app/` and independent audit findings:

### C1-R1: Asynchronous Optional Asset Ownership & Integration Boundaries
- **Source defect in delivered candidate:**
  - In `WorldRuntime.ts` (lines 258–264), the `onOptionalReady` callback receives `OptionalAssetsUpdate`. When `interactionGltf` resolves late, it sets `optional.interactionGltf.scene.name = "interaction-assets"` and adds it directly as an outer visible scene child (`this.scene.add(...)`).
  - At startup (`WorldRuntime.ts:318–320`), `WorldInteractionBinding` was constructed with `loadedAssets.interactionGltf?.scene`, which was `null` during background loading.
  - In canonical `WorldInteractionBinding.ts` (lines 54–60), interaction assets must have their frozen hit proxies registered and their visible subtrees hidden. By bypassing `WorldInteractionBinding`, the late IA subtree becomes an unmanaged visible object without proxy registration or material quality integration.
  - Deskmat (`deskmatTexture`) and wallpaper (`wallpaperTexture`) updates are completely ignored in `onOptionalReady` and never attached or disposed.
- **R2 Contract Fix Required:**
  - Session-scoped resource ledger (`src/features/world/asset-resources.ts`).
  - Synchronous adoption handshake (`OptionalConsumer = (result: OptionalAssetResult) => Adoption`).
  - Deskmat applied to `desk_mat` / `Desk_MatTopography`; wallpaper applied to `monitor_screen_center` / `Monitor_ScreenWallpaper`.
  - In C1, deprecated `interactionGltf` remains null (no old IA scene request); C2 will register late details via `WorldInteractionBinding.registerOptionalDetails`.

### C1-R2: Cancellation, Disposal & Abort Fencing
- **Source defect in delivered candidate:**
  - In `AssetLoader.ts` (lines 247–254, 267–274, 288–294), `signal?.aborted` is checked prior to async awaits, but **not after awaits** before invoking callbacks.
  - In `WorldRuntime.ts` (line 259), if the runtime is disposed or stale, `onOptionalReady` silently returns, abandoning the decoded texture/GLTF resources without disposing them.
  - Object URLs created for blob decoding (`URL.createObjectURL(blob)`) are revoked at lines 248 and 268 outside a `finally` block; a parse/decode rejection bypasses revocation.
  - In `loadRequiredGltf` (lines 199–200), `signal?.addEventListener("abort", onAbort, { once: true })` adds abort listeners on retry backoff timers that are never removed when the timer resolves normally.
  - If a required model fails after previous required models succeeded, earlier decoded GLTF resources have no disposal path.
- **R2 Contract Fix Required:**
  - Post-await session validation (`AssetSessionId: { generation, token }`).
  - `finally` block for `URL.revokeObjectURL`.
  - Atomic disposal of unadopted/orphaned resources in `asset-resources.ts`.
  - Cleanup of retry backoff timers and listener removal on resolution.

### C1-R3: Progress Semantics & UI Arithmetic
- **Source defect in delivered candidate:**
  - `AssetLoader.ts` (lines 51–70) reads `Content-Length` from response headers and streams `Response.body`. When response compression (gzip/brotli) is used, `Content-Length` reflects encoded bytes (e.g. 80), while `Response.body` reader yields uncompressed decoded bytes (e.g. 100).
  - The loader clamps progress to 1.0, but `WorldRoot.tsx` (lines 447–449) recomputes `progressPercent = Math.round((bytesLoaded / bytesTotal) * 100)` directly, yielding **125%**.
  - In `WorldRoot.tsx` (line 476), this emits `<div role="progressbar" aria-valuenow={125} aria-valuemin={0} aria-valuemax={100}>`, violating ARIA constraints.
  - In sequential downloads, per-asset byte counts reach 100% for each file, creating a misleading jumping progress indicator.
- **R2 Contract Fix Required:**
  - Discriminated `ByteProgress` union: `{ kind: "indeterminate"; reason: string }` vs `{ kind: "determinate"; scope: "required-session"; loaded: number; total: number }`.
  - Determinate progress only when all required response lengths are confirmed uncompressed identities; otherwise indeterminate progress (omitting `aria-valuenow`).

### C1-R4: Pause Recreation & Persistence
- **Source defect in delivered candidate:**
  - In `WorldRoot.tsx` (line 73), `initialDecorativePausedRef` is set once from state and never updated when the user toggles pause (`:309`).
  - On retry (`WorldRoot.tsx:352`), `setDecorativePaused(false)` explicitly resets pause to false.
  - No persistence across unmount / re-entry exists.
- **R2 Contract Fix Required:**
  - Extend `PreferencesSchema` in `src/contracts/experience.ts` with `paused: z.boolean().default(false)` (`version: 1`).
  - Update `PreferencesStore` (`preferences-store.ts`) with validated document-memory fallback when localStorage is blocked.
  - `WorldRoot.tsx` subscribes dynamically to preferences instead of using a static initial ref.

### C1-R5: Ownership & Allowlist Governance
- **Defect in delivered candidate:**
  - Delivered C1 modified `WorldRoot.tsx`, `types.ts`, `tests/unit/asset-loader.test.ts`, and `tests/unit/character-director.test.ts`, which were not in the historical FINISH-00 C1 allowlist.
- **R2 Contract Resolution:**
  - `finish-contracts-r2/04-path-ownership.md` explicitly amends C1-R2 allowlist to include `WorldRoot.tsx`, `types.ts`, `LifecycleManager.ts`, `RuntimeMaterialQuality.ts`, `LowQualityBatch.ts`, `asset-resources.ts`, `src/contracts/experience.ts`, `preferences-store.ts`, `controller.ts`, `return-snapshot.ts`, and designated unit/integration/e2e tests.

### C1-R6 & C1-R7: Diagnostic Scope, Execution Receipts & Watchdog
- **Defects in delivered candidate:**
  - CA06 diagnostic ran in Node against a mock canvas resulting in `lifecycle: FAILURE`, `renderedFrames: 0`, proving no live camera/navigation pause.
  - Cancellation test used a 500ms threshold with 63ms observed, failing to prove the required <=50ms browser cancellation.
  - Retry backoff was 150/300ms instead of contract 500/1500ms.
  - Button label in `WorldRoot.tsx:498` was "Retry" rather than contract "Retry 3D".
  - Watchdog lacked real 15s browser execution evidence.
- **R2 Contract Fix Required:**
  - Backoff waits of exactly 500ms then 1500ms; max 2 automatic retries (3 attempts total).
  - 15,000ms watchdog without forward progress surfacing "Retry 3D" and "Continue with Portfolio".
  - Clean receipts binding exact tool versions (TS 6.0.3, Vitest 5.0.2).

---

## 3. Independent Audit Findings Reused

Gemini #3 reviewed and accurately reuses the independent findings from `deliveries/completion-audits/FINISH-C1/2026-10-10-r1/`:

| Finding / Test | Type | Verdict | Exact Observed Evidence | Provenance |
| :--- | :--- | :--- | :--- | :--- |
| **CA-07 Real GLB Bone Activation** | Positive Behavior | **PASS** | `firstDelta`: `0.05224497440459329` in first 0.5s; `pausedDelta`: `0`; `initialScheduled`: true; `finiteGreetingReturnsFrozen`: true. | `real-bones-observation.json` |
| **Late Optional Resource Disposal** | Defect Reproduction | **DEFECT REPRODUCED** (Fails Req) | `heldOptionalNonblocking`: true; `lateCallbackAfterAbort`: true; `lateTextureDisposed`: false. Proves leak on abort. | `late-optional-observation.json` |
| **Compressed Stream Byte Progress** | Defect Reproduction | **DEFECT REPRODUCED** (Fails Req) | Content-Length 80 vs decoded body 100 yields loader clamped progress 1.0, but UI computes `uiPercent: 125%`. | `byte-progress-observation.json` |

*Governance Note:* Passing a defect reproduction test confirms the existence of the bug; it does NOT constitute passing the requirement. These three findings are retained as baseline inputs for C1-R2 implementation.

---

## 4. C2 Consumer, Ownership & Edge-Case Inventory

Looking ahead to FINISH-C2 (entrance choreography & 25 catalog outcomes):

### 4.1 Prerequisites
C2 requires:
1. Accepted FINISH-00-R2 contracts.
2. Accepted corrected FINISH-B1-R2 art assets (`room.glb`, `resident.glb`, `fixture.glb`, 8 paired clips).
3. Accepted corrected FINISH-C1-R2 runtime.
4. Assembly in an **isolated candidate overlay** (`deliveries/FINISH-C2/base/`), **NOT** in canonical `app/`.

### 4.2 ExperienceController Consumers (`app/src/features/experience/controller.ts`)
- Manages single owners: `cameraOwner`, `characterActionOwner`, `transitionOwner`, `experienceControllerOwner`.
- Adapters: `NavigationAdapter`, `CameraDirectorAdapter`, `CharacterDirectorAdapter`.
- Sub-controllers: `PaintingController`, `EnvironmentController`, `GreetingController`.
- **C2 Integration:** Must handle the new `ACTIVATE_OBJECT` intent with 25 catalog IDs without creating a competing controller or bypassing arbitration.

### 4.3 InteractionRegistry Inventory (`app/src/features/experience/interaction-registry.ts`)
- Canonical `FROZEN_V1_CATALOG` currently defines only **21 entries**.
- **Missing 4 entries** required by `catalog-outcomes.json` (25 total):
  1. `project-shortcuts` (DOM rail / project navigation)
  2. `certificate-frame` (verified credential presentation)
  3. `about-personal-object` (About destination personal artifact)
  4. `hidden-yor-mark` (revealed signature from wall painting)

### 4.4 Camera & Entrance Seams
- `types.ts` `CameraPreset` union lacks `"reveal"` and `"greeting"` literals.
- `EntranceCoordinator.ts` must own the single entrance timeline: door leaf rotation on `Room_Root/door/Door_Hinge` (no mixer clips on door in GLB), resident notice/turn/nod/return, arriving safely at HOME <=8s, skip settling <=50ms.

### 4.5 New C2 Modules
- `src/features/world/PropMotionDirector.ts`: bounded deterministic prop motions (plant sway, painting drag/settle) under primary character/camera owners.
- `src/features/world/RoomClock.ts`: live Asia/Kolkata wall clock texture, 12/24 format, minute boundary updates; decorative ticks pause while civil time stays real.

---

## 5. Isolated Overlay Dependency Proposal for C2

To maintain governance invariants and prevent canonical app contamination before FINISH-I1:

```
[Parent Acceptance of B1-R2 + C1-R2]
                 │
                 ▼
[Parent creates deliveries/FINISH-C2/base/]
  ├── Canonical app base (commit f62a43c5 / tree 42ea29ec)
  ├── + Accepted FINISH-C1-R2 runtime patch
  └── + Accepted FINISH-B1-R2 GLB models & textures
                 │
                 ▼
[Gemini #3 implements FINISH-C2]
  ├── Writes only under deliveries/FINISH-C2/
  ├── Implements catalog-outcomes.json (25 rows)
  └── Produces C2 patch & evidence against isolated base
```

---

## 6. Preflight Files Generated

In `deliveries/upload-preflight-2026-10-10/runtime/20261010T114500Z/`:
- `report.md`: This comprehensive report.
- `input-hashes.json`: Raw-byte SHA-256 and byte counts for all 47 inspected inputs.
- `path-inventory.json`: Machine-readable mapping of canonical paths, delivered C1 paths, R2 allowlists, and C2 consumer seams.
- `readiness.json`: Machine-readable gate evaluation, findings inventory, reused evidence, and next actions.

---

## 7. Next Executable Task & Required Parent Decisions

- **Current Lane State:** Preflight COMPLETE. Waiting for Parent acceptance.
- **Required Parent Decisions:**
  1. Formal acceptance ruling for FINISH-00-R2 contracts (`docs/planning/reviews/`).
  2. Formal issuance of FINISH-C1-R2 work order to Gemini #3 with exact allowlist and base commit.
- **Next Executable Task:** P05 (FINISH-C1-R2: runtime lifecycle, resource safety, factual progress, and persistent pause correction) immediately upon Parent issuance.
