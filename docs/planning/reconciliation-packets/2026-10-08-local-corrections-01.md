# LOCAL-CORRECTIONS-01 — correct observed local studio defects

Parent Codex issues this packet under the owner's continuing completion instruction and the subsequent “Host locally”, “You check it by yourself” and “Continue.” requests. Coordination base: `f6a8df58095807b09004c2f0ab8a2382c3971e80`. Work only in `C:\Users\yoray\Projects\Yor-World-Local-Corrections`, branch `fix/local-studio-check`.

Accepted RC6-R1 source `8e5b954e147a87e36a6869d9940c40f3d4c123f0`, tree `42ea29ec235225046a75959eb19eb386ac2f821d`, bundle `d4648de41f631fca5ce71a45397d6bbc34ced8fc8408aeba90e65701a9653e59` and manifest `671d19d32fcbe19493b15c177e55828259866b01ddeab6b87e54aa68863e0d21` remain immutable. This packet authorizes an explicit source amendment, not edits to accepted receipts or automatic acceptance of changed source. All earlier RC1–RC6 proof, decisions and historical output roots stay preserved. No provider setup, production/G7 success, physical/assistive success or heap/GPU leak absence is claimed.

## Direct input and reproduced defects

Read START_HERE and current delegation opening, current source/specification and the actual local review at `C:\Users\yoray\Projects\Yor World\scratch\local-check\report.md`; its `studio` and `public` reports/raw evidence are named inputs. The unchanged accepted local server at port3000 runs the accepted detached checkout. Do not overwrite its build or stop it during development; use a separate loopback development/preview port.

LOCAL-01/02: desktop studio stays in a575px hero column with stacked controls obstructing most of the room. At390px mobile the793px HUD exceeds the520px clipped stage, hiding Exit/cameras/Diagnostics; Room Controls Close is clipped above the stage and cannot receive pointer clicks on either viewport. LOCAL-03: Room Controls sound preference becomes enabled while runtime/HUD remain muted. LOCAL-05/06: available studio uses stale unavailable/G1-proof copy, and the browser's favicon request404s. LOCAL-04: fresh actual NVIDIA high-quality HOME reports300 scene calls per frame; the120desktop/80mobile contract includes effects/shadows, and current Three autoReset excludes earlier shadow calls from diagnostics.

## UI maker ownership

Own only:

- `app/src/features/world/WorldRoot.tsx`, `world.module.css`, `StudioLauncher.tsx`.
- `app/src/features/portfolio/accessibility-controls.tsx`, its module CSS, and `portfolio.module.css`.
- `app/src/features/room/room-controls.tsx`, `room-controls.module.css`.
- `app/src/app/(public)/page.tsx`; favicon/icon files in `app/public/` or the conventional `app/src/app/` icon path, and icon metadata in `app/src/app/layout.tsx` only if necessary.
- A focused new `app/tests/e2e/local-studio-usability.spec.ts` plus directly affected existing UI tests only if genuine behavior/assertions require amendment. Do not weaken assertions or performance timeouts.
- `deliveries/G7/local-corrections/ui/` maker evidence.

Make studio presentation large enough to use, with a compact primary control surface, and keep detailed/accessibility options reachable in a bounded scrollable panel with pointer/keyboard Close. Preserve public destinations, reduced motion, quality selection, sound opt-in, replay/skip, room interactions, recovery, diagnostics for verification and all existing contracts. Details must not obscure most of the scene or clip critical controls at320/390/844 and1440/1000; retain44px targets. Synchronize sound across room preference, UI and runtime without enabling it before actual user opt-in. Remove stale proof/unavailable implementation copy; keep identity/content provenance truthful. Derive the favicon from the existing identity rather than inventing a new branding system. No asset GLB or backend changes.

## Rendering maker ownership

Own only:

- `app/src/features/world/WorldRuntime.ts`, `LowQualityBatch.ts`, `RuntimeMaterialQuality.ts`, `ProductionLighting.ts`; additional new batching helper in this directory only after informing Parent of its exact path.
- `app/src/features/world/types.ts` only for accurate frame diagnostic fields, preserving existing names/contracts.
- `app/tests/unit/low-quality-batch.test.ts`, `runtime-material-quality.test.ts`, `world-runtime-recovery.test.ts` (faithful renderer.info.reset mock and consecutive-frame counter regression), focused new batching/render-counter regression tests, and `app/tests/performance/world.spec.ts` only for a meaningful inclusive-count check without weakening existing tests.
- `deliveries/G7/local-corrections/rendering/` maker evidence.

Diagnose actual draws/materials/passes first. Correct inclusive per-frame counters so shadow/transmission/effect passes are counted once and do not accumulate across frames. Meet the existing120desktop/80mobile ceilings on actual high/medium/low supported profiles while preserving the frozen nine GLBs, mandatory object visibility, room lighting/material appearance, animation, original interaction/raycast identity, camera behavior and preference authority. Do not hide required objects, force high to low, disable mandatory effects or loosen budgets. Batch compatible geometry/materials conservatively, preserve unsupported-feature fallbacks, cleanup, context-loss recovery and single loop. Verify animated/interactable targets after batching and repeated tier changes/disposal. Explain any unsupported renderer limitations honestly; no fake counts, frame samples or subjective performance PASS.

## Coordination, review and release

The two makers have disjoint ownership; neither edits the other's paths. Parent performs pinned dependency setup and manages shared builds/preview ports and Git. Makers may run isolated unit checks; full builds/browser suites are coordinated after both deltas are ready. Return changed paths, actual PASS/FAIL/NOT RUN evidence, raw logs and limits. Never accept your own output or claim an external account dispatch.

A separate read-only auditor verifies source delta and actual corrected browser/screenshots/inclusive-frame samples. Astra may advise on the dangerous cross-lane rendering/gate decision, without production changes. Parent stages each completed maker scope, commits and pushes the correction branch; no force push or unrelated files. Accepted main/server stays available until a corrected build is independently checked. Release preparation must use a separately assigned new output root and exact source/bundle/manifest binding; no accepted R6 record may be rewritten or relabeled as proof of this amendment. Changed source needs separate independent review and Parent adjudication before any successor acceptance. Actual production/manual requirements remain unrun.
