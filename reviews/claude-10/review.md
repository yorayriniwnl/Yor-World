# CLAUDE-10 — G1 Lifecycle and Renderer Review

**Reviewer Identity:** Independent Reviewer (Claude-10 Lane; executed via Gemini 3.8 Flash (High), High Effort/Depth)  
**Date:** 2026-10-01  
**Candidate Revision:** G1 Integration Delivery (`deliveries/G1/`, `g1-integration-proof.zip`)  
**Scope:** Strict lifecycle review of loading, entrance, Skip/Escape, cancellation, interruption, error handling, unmount, resource ownership, and stale-completion safety. Final art and downstream C-track features are excluded.

---

## 1. Inspected Inventory

| Item / Path | Source / Hash | Description | Status |
| :--- | :--- | :--- | :--- |
| `deliveries/G1/source/src/features/world/WorldRuntime.ts` | `deliveries/G1/source` | Core 3D engine, loop, loader, and lifecycle manager | INSPECTED |
| `deliveries/G1/source/src/features/world/WorldRoot.tsx` | `deliveries/G1/source` | React container, HUD overlay, event bindings, and disposal | INSPECTED |
| `deliveries/G1/source/src/features/world/StudioLauncher.tsx` | `deliveries/G1/source` | Entry disclosure, dynamic SSR-disabled loader | INSPECTED |
| `deliveries/G1/source/src/features/world/WorldFallback.tsx` | `deliveries/G1/source` | Accessible error fallback UI | INSPECTED |
| `deliveries/G1/source/src/features/world/CharacterDirector.ts` | `deliveries/G1/source` | Animation state machine, queue, cancel, and settle | INSPECTED |
| `deliveries/G1/source/src/features/world/CameraDirector.ts` | `deliveries/G1/source` | Camera presets and viewport resizing | INSPECTED |
| `deliveries/G1/source/src/features/world/SceneIntegrator.ts` | `deliveries/G1/source` | Three.js graph integration, node pruning, mixer pairing | INSPECTED |
| `deliveries/G1/source/tests/unit/character-director.test.ts` | `deliveries/G1/source` | Unit tests for state machine, cancel, and instant settle | INSPECTED |
| `deliveries/G1/source/tests/e2e/browser-behavior.spec.ts` | `deliveries/G1/source` | Playwright E2E browser behavior specification | INSPECTED |
| `deliveries/G1/evidence/execution.json` | `deliveries/G1/evidence` | Command execution ledger (Commands 01–15) | INSPECTED |
| `deliveries/G1/evidence/14-test-unit.log` | `deliveries/G1/evidence` | Unit test execution evidence (67 tests passed) | INSPECTED |
| `deliveries/G1/evidence/15-build.log` | `deliveries/G1/evidence` | Production Turbopack build log (exit code 0) | INSPECTED |

---

## 2. Resource Ownership & Lifecycle Trace Matrix

| Resource Subsystem | Owning Instance / Scope | Creation Point | Disposal / Cleanup Mechanism | Stale-Completion / Leak Risk | Assessment |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Camera** | `WorldRuntime` (`this.camera`), driven by `CameraDirector` | `WorldRuntime.constructor` (`WorldRuntime.ts:42`) | Dereferenced when `WorldRuntime` instance is collected. | None. PerspectiveCamera holds no unmanaged GPU memory. | **PASS** |
| **Resident Body** | `IntegratedSceneResult` (`residentBody: THREE.SkinnedMesh`) | `SceneIntegrator.ts:107` | Detached from scene graph on `WorldRuntime.dispose()`. | GPU geometry and material buffers are not explicitly disposed in `WorldRuntime.dispose()`. | **CAUTION (B5 Debt)** |
| **Animation Mixer** | `CharacterDirector` (`avatarMixer`, `chairMixer`) | `SceneIntegrator.ts:157–158` | Stopped when RAF loop terminates (`WorldRuntime.ts:257`). | Mixers are not explicitly un-cached via `mixer.uncacheRoot()`. | **SATISFACTORY FOR G1** |
| **RAF (render loop)** | `WorldRuntime` (`this.animationFrameId`) | `WorldRuntime.animate` (`WorldRuntime.ts:150`) | Explicitly cancelled via `cancelAnimationFrame` in `WorldRuntime.dispose()` (`WorldRuntime.ts:257`). Guarded by `this.isDisposed`. | None. If `this.isDisposed` is true, RAF immediately returns without re-queueing. | **PASS** |
| **Event Listeners** | `WorldRoot` (React component) | `useEffect` (`WorldRoot.tsx:62–63`): `window.resize`, `window.keydown` | Explicitly removed in `useEffect` cleanup return (`WorldRoot.tsx:74–75`). | None. Listeners are bound to window and guaranteed removed on unmount. | **PASS** |
| **Timers** | `WorldRoot` (diagnostics interval) | `setInterval` (`WorldRoot.tsx:66`) | Explicitly cleared via `clearInterval` in cleanup return (`WorldRoot.tsx:73`). | None. Timer stops immediately on component unmount. | **PASS** |
| **Asset Loaders** | `WorldRuntime.init` (`GLTFLoader`) | `WorldRuntime.ts:89` | Guarded by `if (this.isDisposed) return;` at line 96 post-await. | If unmounted during network fetch, loader finishes fetch, but aborts scene mount and loop start. | **PASS** |
| **AudioContext** | **NONE** (Strictly zero instances) | Forbidden by contract in G1 | Static boolean toggle only (`WorldRuntime.ts:197`). AST test confirms 0 `AudioContext` calls. | None. Zero audio initialization until downstream C1. | **PASS** |
| **WebGL Resources** | `WorldRuntime` (`this.renderer`) | `WorldRuntime.ts:61` | Explicit `this.renderer.dispose()` in `WorldRuntime.dispose()` (`WorldRuntime.ts:261`). | Scene geometries, materials, and textures are not recursively disposed. | **CAUTION (B5 Debt)** |

---

## 3. Lifecycle Evaluation

### 3.1 Loading Lifecycle & Entrance
- **Zero Pre-Entry Loading:** `StudioLauncher.tsx` dynamically imports `WorldRoot` with `ssr: false` behind an interactive disclosure. No GLB models or Three.js bundles are fetched until explicit user activation (`data-testid="enter-studio-btn"`).
- **Entrance Safety:** Entry initializes lighting, creates the WebGL renderer, and loads the 3 GLBs via `Promise.all`. The post-load gate (`WorldRuntime.ts:96`) guarantees that if the user closes or navigates away before loading completes, the integrated scene is discarded without attaching to the DOM or starting the render loop.

### 3.2 Skip / Escape & Instant Settlement
- **Escape Key Integration:** `WorldRoot.tsx:56` intercepts `Escape` on `window` and triggers `runtime.skip()`.
- **Immediate Settlement Invariant:** `CharacterDirector.settle()` clears the transition queue, switches mode to `"coding"`, and applies `coding_idle` at `t=0` within 1 frame (≤16ms). This directly satisfies Parent Invariant #7 and eliminates the 2.667s reverse-path trap from W2.

### 3.3 Cancellation & Interruption
- **Safe Reversal:** `CharacterDirector.cancel()` inspects the current active clip and elapsed time, constructing an inverted queue along the authored animation path (`notice_visitor`, `turn_to_visitor`, `greeting_nod`) back to rest pose.
- **Queue Protection:** Multiple rapid calls to `playGreeting()` while already in `"sequence"` mode are ignored (`CharacterDirector.ts:88`), preventing animation corruption.

### 3.4 Failure Handling & Fallback
- **Simulated Errors:** `StudioLauncher` exposes `?simulateRendererError=1` and `?simulateAssetError=1` query parameters.
- **Graceful Degeneration:** Failures in WebGL context creation or asset fetching trigger `options.onError`, which sets React state in `WorldRoot` and renders `WorldFallback`. The public portfolio remains fully accessible, styled, and navigable.

### 3.5 Page Hide / Show (Visibility & Suspension)
- **Delta-Time Clamping:** `WorldRuntime.ts:152` clamps delta time to `Math.min((currentTime - this.lastTime) / 1000, 0.1)`. When the browser suspends RAF in background tabs or mobile sleep, resuming the tab does not cause animation teleportation or physics breakdown.
- **Downstream Improvement:** Explicitly pausing the RAF loop via `document.addEventListener("visibilitychange")` should be formalized in B5.

---

## 4. Deterministic Test Requests for Stale-Completion Paths

To ensure rock-solid production hardening during B5, local makers must implement the following automated integration tests:

1. **Mid-Flight Unmount Test (`STALE-01`):**
   - *Protocol:* Trigger `setIsEntered(true)`, delay 50ms (during GLB network download), immediately trigger `setIsEntered(false)`.
   - *Assertion:* Zero uncaught promise rejections in console; `renderer.dispose()` called; zero active RAF IDs; memory heap returns to baseline.
2. **Escape During Sequence Turn (`STALE-02`):**
   - *Protocol:* Launch studio, invoke `greet()`, wait 800ms (midway through `turn_to_visitor`), dispatch `keydown(Escape)`.
   - *Assertion:* Active clip transitions immediately to `coding_idle`; chair yaw resets to 0.0° within ≤50ms; queue length is 0.
3. **Double-Greet Race (`STALE-03`):**
   - *Protocol:* Invoke `greet()` twice within 5ms.
   - *Assertion:* Second invocation returns current revision without resetting queue or restarting `notice_visitor`.
4. **Context Loss Simulation (`STALE-04`):**
   - *Protocol:* Dispatch `gl.getExtension('WEBGL_lose_context').loseContext()` on canvas.
   - *Assertion:* Application transitions to `WorldFallback` without throwing uncaught exceptions.

---

## 5. Lifecycle Findings

### C10-01 (P2 — Medium): Absence of Recursive Scene Graph GPU Resource Disposal
- **Class:** SOURCE
- **File / Line:** `deliveries/G1/source/src/features/world/WorldRuntime.ts:254–265`
- **Expected:** `dispose()` traverses `this.scene`, calling `.dispose()` on all mesh geometries, materials, and textures to release WebGL buffer memory.
- **Observed:** `WorldRuntime.dispose()` calls `this.renderer.dispose()`, but leaves geometries, materials, and textures un-disposed.
- **Impact:** Repeated mounting and unmounting of the studio across multiple navigation cycles will accumulate orphan GPU memory until garbage collected.
- **Disposition:** Non-blocking for G1 proof of concept; mandatory resolution in **B5 (Lifecycle & Camera Director)**.

### C10-02 (P2 — Medium): Missing Canvas WebGL Context Loss Listeners
- **Class:** SOURCE
- **File / Line:** `deliveries/G1/source/src/features/world/WorldRuntime.ts:61–79`
- **Expected:** Event listeners for `webglcontextlost` and `webglcontextrestored` handle GPU resets.
- **Observed:** Context creation is wrapped in a try/catch, but dynamic runtime loss is unhandled.
- **Disposition:** Non-blocking for G1; mandatory for **C3 (Mobile & Recovery)**.

---

## 6. Review Conclusion & Recommendation

The G1 candidate demonstrates exemplary lifecycle hygiene for an initial integration proof:
- Clean cancellation and unmount guards.
- Instant skip capability verified.
- Bounded delta-time clamping.
- Strict isolation of 3D runtime from the semantic Next.js shell.

**Recommendation:** **RECOMMEND ACCEPT FOR G1 PROOF** (with findings C10-01 and C10-02 logged as binding requirements for milestone B5).
