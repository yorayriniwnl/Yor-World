# YOR WORLD Milestone C3: Renderer Recovery, Resilience & Adaptive Quality Policy

**Author / Lane:** Gemini #3 — Runtime / Integration Maker  
**Packet:** `C3` (Mobile, Adaptive Quality, Accessibility and Failure Recovery)  
**Evaluation Date:** 2026-10-02  
**Receipt Artifacts:** `evidence/chrome/context-loss-recovery.json`, `evidence/chrome/asset-failure-recovery.json`, `evidence/chrome/renderer-failure-dialog-safe.json`  

---

## 1. Architectural Recovery Mechanisms

### 1.1 WebGL Context Loss Handling
- **Event Binding:** `WorldRuntime` attaches `webglcontextlost` and `webglcontextrestored` listeners directly to the rendering canvas element.
- **Immediate Action on Loss:**
  1. Calls `event.preventDefault()` to prevent browser default unhandled crash behavior.
  2. Cancels active `requestAnimationFrame` loop immediately (`animationFrameId = null`).
  3. Transitions `LifecycleManager` to `FAILURE` with reason: `"WebGL graphics context was lost."`.
  4. Automatically renders `WorldFallback` within `[data-testid="world-failure-container"]`.
- **User Safety:** The user is never trapped in a black canvas. The fallback banner provides:
  - `Retry 3D Studio` (increments session token and attempts clean WebGL re-initialization).
  - `Continue with Portfolio` (dismisses 3D stage and transitions to accessible STATIC mode).
  - Direct hyperlinks to `/projects` and `/about`.
- **Evidence:** Verified in automated E2E test `tests/e2e/renderer-recovery.spec.ts` (passed in 1.3s in both Chrome and Edge).

### 1.2 Asset Loading Failure & Retry Boundedness
- **Failure Boundary:** If network timeout, CORS error, or corrupt GLB payload occurs during asset fetch:
  1. The error is caught by `AssetLoader` and propagated to `LifecycleManager.fail()`.
  2. An honest progress banner displays the failure reason and loaded asset counts.
  3. Clicking `Retry` increments `sessionToken`, invalidating all in-flight asynchronous promises and re-attempting load.
  4. Maximum 3 bounded retries enforced (`maxRetries = 3`). Once exhausted, user is guided to Continue with Portfolio.
- **Evidence:** Verified in `tests/e2e/renderer-recovery.spec.ts` and `tests/unit/lifecycle-manager.test.ts`.

### 1.3 Renderer Failure with Dialog Open
- **DOM Safety Invariant:** When a dialog (e.g. Monitor Launcher or Room Controls) is open during a renderer crash:
  1. The dialog overlay is rendered as an independent React sibling in the DOM.
  2. Canvas crash does not unmount or corrupt dialog state.
  3. Dialog close button (`onClose`) and internal links remain 100% interactive.
  4. Page scrolling and browser URL navigation to `/projects` remain unobstructed.
- **Evidence:** Verified in `tests/e2e/renderer-recovery.spec.ts` (`renderer-failure-dialog-safe.json`).

---

## 2. Adaptive Quality Tier Policy (`HIGH` / `MEDIUM` / `LOW` / `STATIC`)

### 2.1 Baseline Tier Selection (`chooseInitialTier`)
The runtime determines baseline quality from device capabilities before canvas initialization:
1. **Missing WebGL:** Forces `static` (non-negotiable).
2. **User Explicit Preference:** If user previously chose `high`, `medium`, `low`, or `static` in HUD, that preference is strictly honored (as long as WebGL is supported).
3. **Data-Saver Active (`saveData: true`):** Defaults to `low`.
4. **Constrained GPU (`maxTextureSize < 4096`):** Defaults to `low`.
5. **Constrained Mobile (`deviceMemoryGb <= 3` or `hardwareConcurrency <= 4`):** Defaults to `low`.
6. **Capable Mobile (`> 3GB` RAM, `> 4` cores):** Defaults to `medium`.
7. **Constrained Desktop (`< 4GB` RAM, `<= 2` cores):** Defaults to `low`.
8. **Capable Desktop (`>= 8GB` RAM, `> 4` cores):** Defaults to `high`.

### 2.2 Frame Time Window Sampling & Scaling Invariants (`updateTier`)
- **Noise Rejection (`filterNoisySamples`):**
  - Extreme outlier spikes (> 3.5× median and > 60ms) caused by background tab GC or thread contention are discarded from p95 calculation to prevent premature thrashing.
- **Downgrade Invariant:**
  - Downgrades require **three consecutive slow windows** (> 25ms for 60fps / > 33.3ms for 30fps).
  - Downgrade cascade: `high` $\to$ `medium` $\to$ `low` $\to$ `static`.
- **Upgrade Invariant:**
  - Upgrades require **20 seconds of sustained stable headroom** (< 14ms frame time, 10 consecutive 2s windows).
  - Upgrades are strictly gated to the **safe `HOME` state**. Upgrades NEVER occur during camera travel, transitions, focus, intro, or panel interactions.
- **User Preference Immunity:** An explicit user selection is NEVER overridden by the automated scheduler.

---

## 3. Assistive Controls & Storage Resilience

### 3.1 Audio Controller (`AudioController`)
- **Default State:** Audio remains strictly **OFF** by default.
- **Activation & Denial:** Calling `setEnabled(true)` triggers `audioCtx.resume()`. If the browser rejects activation (e.g. autoplay denial without user interaction), the exception is caught, `enabled` remains `false`, and `false` is returned to the caller.
- **Disposal:** Calling `dispose()` suspends/closes the `AudioContext` and clears all event subscriptions idempotently.

### 3.2 Reduced Motion Runtime Behavior (`ReducedMotionController`)
- **Non-Negotiable Rule:** Reduced motion must **REMOVE** cinematic travel and pointer parallax, not merely slow them down.
- **Transition Duration:** Set to **0ms** (instant cut, zero motion travel).
- **Parallax Factor:** Set to **0.0** (zero mouse/gyroscope displacement).
- **Decorative Animation:** Independent toggle allows pausing ambient chair drifting or subtle decorative loops while keeping interactive camera controls operational.

### 3.3 Storage Resilience (Denied & Corrupt localStorage)
- When browser privacy settings (e.g. incognito or 3rd-party cookie blocking) throw `SecurityError` on `localStorage` access:
  - System silently falls back to an in-memory session cache.
- When `localStorage` contains corrupt JSON or schema versions from obsolete builds:
  - Schema validator resets stored preferences cleanly to default values without raising an unhandled exception.
- **Evidence:** Verified across 3 dedicated unit tests in `tests/unit/quality-policy.test.ts`.
