# PRE-G7-13D attempt 41 — chair-only transform check

## Candidate and scope

- Branch: `codex/pre-g7-13-anchor-articulation-isolated-20261014`
- Base HEAD: `2a9e50576f2e88b11c2c30380cee16ede9e24983`
- Canonical source path: `app/src/features/world/ReferenceComposition.ts`
- Current source SHA-256: `32d36fa937fcd48cf7e9c4ce0c3258c3e6004be00bde945e25e13defebef9a19`
- Frozen GLB SHA-256: `3a02647d24e474c8a2579b0d277cf02a7841212e961c1554f67b6e032e40a307` (unchanged)
- Attempt-41 transform: existing `chair-root` and `chair-base` share `+18°` runtime Y yaw; their Z shifts are both `-0.79` (attempt 38/39/40: `-0.69`). X offsets and scales are unchanged from attempt 38: root `(0.05, 0, -0.79)`, scale `[0.6, 0.8, 0.6]`; base `(0.2, 0, -0.79)`, scale `[0.75, 1, 0.75]`.
- No GLB, hierarchy, geometry, other anchor, camera, lighting, renderer, test, or timeout changes were made for attempt 41.

## Capture provenance

`run-build.cmd` ran `pnpm build` with Node `v24.19.0` and `NEXT_PUBLIC_PRE_G7_13_EVIDENCE=1`; exit `0` (`build.exit.txt`).

`run-capture.cmd` launched a fresh headless Chrome page per viewport against the production server at `http://127.0.0.1:3133/?studio=enter&pre-g7-evidence=1`; exit `0` (`capture.exit.txt`). It recorded the full runtime anchor diagnostic immediately before each PNG, then page state immediately after. Desktop and mobile both recorded `HOME`, controls closed, one visible canvas, zero static/failure fallbacks, 11 loaded Next chunks, and a live WebGL context. No screenshot from the failed attempt-38 test runner is used here.

Raw closed-HUD images:

- `screenshots/studio-reference-desktop-1440x900.png`
- `screenshots/studio-reference-mobile-390x844.png`

Full capture traces and same-frame anchor measurements:

- `measurements/desktop-1440x900-capture-trace.json`
- `measurements/desktop-1440x900-anchor-diagnostics.json`
- `measurements/mobile-390x844-capture-trace.json`
- `measurements/mobile-390x844-anchor-diagnostics.json`

The captures are emulated viewports. The helper records WebGL version and context state but does not record the GPU vendor/renderer or physical-device behavior.

## Measured occlusion gate

The packet limit is `<= 0.10` chair/resident occlusion for sampled anchors. Ratios are from the same live page and frame as the PNG.

| Attempt | Chair yaw | Shared Z shift | Desk desktop / mobile | Monitor desktop / mobile | Right speaker desktop / mobile | Gate |
|---|---:|---:|---:|---:|---:|---|
| 39 | `+18°` | `-0.69` | `.07143` (2 chair hits) / `.03571` (1) | `.03774` (2) / `.05556` (3) | `.07813` (5) / `.20339` (12) | Fail: mobile speaker |
| 40 | `-18°` | `-0.69` | `.19355` (6) / `.21212` (7) | `.10714` (6) / `.10714` (6) | `0` / `0` | Fail: desk and monitor |
| 41 | `+18°` | `-0.79` | `.19355` (6) / `.18750` (6) | `.05556` (3) / `.05556` (3) | `0` / `0` | **Fail: desk** |

In attempt 41, every other sampled required anchor recorded zero chair/resident first-hit occlusion. The desk result remains outside the packet limit at both viewports, so the 16-case visual-composition suite was not run. A bounding-box result is not treated as proof of chair recognition; parent visual review of the raw captures remains necessary.

## Attempt-38 capture mismatch

The original attempt-38 two-test run logged a desktop desk ratio of `.19355` and mobile right-speaker ratio `.10169`. Its desktop PNG was static fallback even though the test's pre-screenshot record reported live `HOME`, canvas, and WebGL. A standalone trace on the same attempt-38 build later reproduced no fallback: both pre/post states remained live and its desktop/mobile PNGs showed the 3D room. This supports a transient test capture/state mismatch for that desktop PNG; no renderer startup defect or app behavior change is inferred from it. Attempt-38 logs and images remain preserved as failed evidence.

## Validation status

- Production build: **PASS**, exit `0`; command: `pnpm build`; log: `build.log`.
- Same-page raw capture: **PASS**, exit `0`; command: `node ..\deliveries\G7\preparation\maker-evidence\pre-g7-13\attempt-41\capture-state.cjs`; log: `capture.log`.
- Chair occlusion gate: **FAIL**; desk is `.19355` desktop and `.18750` mobile against `<= .10`.
- 16-case Playwright lane: **NOT RUN** because the pre-lane desk gate failed.
- Lint, unit tests, mirror sync/manifest verification, and physical-device checks: **NOT RUN** in this attempt.

This is a failed maker checkpoint for parent review, not PRE-G7-13D acceptance. No source/evidence commit was created from this checkpoint.
