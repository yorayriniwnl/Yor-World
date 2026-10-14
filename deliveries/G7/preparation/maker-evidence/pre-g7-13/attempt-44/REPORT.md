# PRE-G7-13D attempt 44

## Result

**FAIL at the targeted occlusion gate.** The desk and monitor pass in both viewports, but the mobile right-speaker cabinet exceeds the packet's 10% chair/resident occlusion ceiling. The 16-case lane was **NOT RUN** because the required target gate did not pass. No packet acceptance is claimed.

## Source checkpoint

- Worktree: `C:\p13-iso`
- Branch: `codex/pre-g7-13-anchor-articulation-isolated-20261014`
- Base HEAD: `2a9e50576f2e88b11c2c30380cee16ede9e24983`
- Changed source: `app/src/features/world/ReferenceComposition.ts`
- Source SHA-256 at capture: `B1688EDE3805545313778D77592FF65B0D316C8134457E586BC1F99F27A497E4`
- Frozen `production-room-full.glb` SHA-256: `3A02647D24E474C8A2579B0D277CF02A7841212E961C1554F67B6E032E40A307` (unchanged)

## Chair transform

- `chair-root`: shift X `0.05`, Z `-0.735`; yaw `+18°`; scale `[0.6, 0.8, 0.6]`.
- `chair-base`: shift X `0.20`, Z `-0.735`; yaw `+18°`; scale `[0.75, 1, 0.75]`.
- Root/base X offset remains `0.15` world units.
- Diagnostic world positions: root `[0.35, 0.076, -1.095]`; base `[0.50, 0, -1.095]`.

## Build and capture

- Build: `run-build.cmd` (Node `v24.19.0`, evidence build flag enabled, `pnpm build`) — **PASS, exit 0**. Logs: `build.log`, `build.exit.txt`.
- Fresh production server PID `46764` reported Ready on port 3133 and was stopped after capture.
- Capture: `run-capture.cmd` — **PASS, exit 0**.
- Same-page pre/post traces show `HOME`, controls closed, one visible WebGL2 canvas, context not lost, and zero static/failure fallbacks.
- Desktop PNG: `screenshots/studio-reference-desktop-1440x900.png` (SHA-256 `3DB4DCAE597653DE536E087AFD4054E8CAB90C7EB3E47369A2A054CCC4E4D49B`).
- Mobile PNG: `screenshots/studio-reference-mobile-390x844.png` (SHA-256 `5D1425E5350478AE84E7BBB7C85F9910678C255DAEA6C4E8DBED3D07C66BA98C`).
- Same-page traces and per-anchor diagnostics are in `measurements/desktop-1440x900-*` and `measurements/mobile-390x844-*`.

## Occlusion measurements

The unchanged projected-bounds sampler records 81 samples per anchor. The gate is at most 10% chair/resident occlusion.

| Anchor | Desktop 1440×900 | Mobile 390×844 | Gate |
|---|---:|---:|---|
| Desk | chair 2; ratio `0.071429` | chair 2; ratio `0.068966` | PASS |
| Monitor | chair 3; ratio `0.055556` | chair 3; ratio `0.055556` | PASS |
| Right speaker cabinet | chair 3; ratio `0.047619` | chair 7; ratio `0.118644` | **FAIL on mobile** |

The mobile raw view shows the chair's back/seat and base/wheels, while the right speaker cabinet remains partly covered by the chair in the sampled frame, matching the failed metric.

## Checks

- `pnpm build`: **PASS**.
- Fresh desktop/mobile captures with same-page runtime snapshots: **PASS**.
- `git diff --check`: **PASS**.
- PRE-G7-13D 16-case lane: **NOT RUN**; mobile right-speaker gate failed.
- Mirror sync, full tests, commit, and push: **NOT RUN** for this failed transform iteration.

Attempts 41–43 and earlier evidence remain preserved. This report documents attempt 44 only.
