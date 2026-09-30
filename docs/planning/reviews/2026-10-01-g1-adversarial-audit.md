# GPT-6 Astra Adversarial Audit — G1 Integration Proof

**Auditor:** GPT-6 Astra (Adversarial Architecture & Engineering Audit)  
**Date:** 2026-10-01  
**Candidate:** G1 Delivery Candidate (`deliveries/G1/`, `g1-integration-proof.zip`)  
**Scope:** Rigorous adversarial audit of code boundaries, scene graph integrity, coordinate mapping, animation state machine, resource disposal, and failure paths.

---

## 1. Adversarial Assessment Summary

The G1 delivery candidate represents a disciplined, well-architected integration of the accepted W1, W2, and W3 packages. The maker adhered strictly to the bounding constraints of `PARENT-RECON-02`:
- Single coordinate conversion policy is maintained: all assets load at identity without doubled offsets.
- Pruning of W1 proxy nodes and W2 fixture-static leaves zero duplicate desks, chairs, or floors.
- AST boundary guards strictly isolate Three.js from the public shell.
- Dynamic SSR-disabled loading guarantees zero 3D network requests or execution prior to explicit entry.

However, an adversarial probe of the source code and runtime lifecycle reveals several key vulnerabilities and evidence gaps that must be classified for gate adjudication.

---

## 2. Adversarial Findings Ledger

| ID | Class | Severity | Subsystem / File | Description | Impact & Disposition |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ASTRA-G1-01** | SOURCE | P2 | `WorldRuntime.ts:254–265` | **Incomplete GPU Resource Traversal on Dispose:** `WorldRuntime.dispose()` cancels RAF and calls `this.renderer.dispose()`, but fails to traverse `this.scene` to call `.dispose()` on geometries, materials, and textures. | Three.js retains GPU buffer references in its internal render caches until garbage collected or context lost. **Non-blocking for G1 proof; MUST be resolved in downstream B5.** |
| **ASTRA-G1-02** | SOURCE | P2 | `WorldRuntime.ts:55–79` | **Absent WebGL Context Loss Handlers:** No event listeners are attached for `webglcontextlost` or `webglcontextrestored` on `this.canvas`. | If the GPU context is dropped by the OS/browser (e.g. mobile tab backgrounding or driver reset), the runtime hangs rather than triggering the accessible `WorldFallback`. **Non-blocking for G1; required for C3.** |
| **ASTRA-G1-03** | SOURCE | P3 | `SceneIntegrator.ts:52–66` | **Redundant Node Removal Traversal:** `chair-root`, `chair`, and `resident` are all pushed to `w1NodesToRemove`. Removing `chair-root` already detaches `chair` and `resident`, causing child node names to be recorded multiple times in `removedW1Nodes`. | Functional scene graph is intact and correct (counts verified at 1 resident, 1 chair), but accounting list contains duplicate child names. **Non-blocking P3 hygiene.** |
| **ASTRA-G1-04** | EVIDENCE | P2 | `evidence/execution.json` | **Unrecorded Playwright E2E Execution:** `evidence/execution.json` and logs document commands 1 through 15 (install, lint, typecheck, unit tests, and production build). `test-e2e` was not recorded in `execution.json`. | While 67/67 unit tests pass (including AST boundaries and scene integrator), browser behavior E2E runs lack committed log receipts. **Classified as NOT RUN in independent gate audit.** |
| **ASTRA-G1-05** | SOURCE | P3 | `StudioLauncher.tsx:22–31` | **URL Parameter State Initialization:** `StudioLauncher` parses `window.location.search` during client state initialization for fault injection. | Safe in Next.js client component, but direct URL search param parsing without `Suspense` boundary can cause client-side deopt if expanded. **Acceptable for proof harness.** |
| **ASTRA-G1-06** | SOURCE | PASS (PROVED) | `WorldRoot.tsx:55–60`, `CharacterDirector.ts:143–149` | **Instant Escape / Settlement Invariant:** Pressing Escape immediately invokes `settle()`, clearing animation queues and resetting to `coding_idle` within 1 frame (≤16ms). | Bypasses the 2.667s diagnostic reverse sampler from W2 proof, satisfying Parent Invariant #7. |
| **ASTRA-G1-07** | SOURCE | PASS (PROVED) | `WorldRuntime.ts:96` | **Race-Safe Mid-Load Unmount:** `if (this.isDisposed) return;` immediately follows `Promise.all` model loading. | Prevents unmounted component from attaching scene graph or starting RAF loop if unmounted during fetch. |

---

## 3. Adversarial Recommendation

The core architectural invariants of G1 (zero pre-entry load, single coordinate conversion, node pruning, single resident/chair, and instant skip) are fully demonstrated in the source code and passing unit test suite (67/67). 

None of the findings represent a blocking regression of W1, W2, or W3. Findings `ASTRA-G1-01` and `ASTRA-G1-02` are valid technical debt items properly allocated to the **B5 Lifecycle & Camera** milestone.
