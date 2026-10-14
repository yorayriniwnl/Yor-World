# PRE-G7-13D attempt 46

## Result

**FAIL at the targeted occlusion gate.** The desk exceeds the 10% chair/resident occlusion ceiling in both views. The 16-case lane was **NOT RUN**. No packet acceptance is claimed.

## Source checkpoint

- Worktree: `C:\p13-iso`
- Branch: `codex/pre-g7-13-anchor-articulation-isolated-20261014`
- Base HEAD: `2a9e50576f2e88b11c2c30380cee16ede9e24983`
- Changed source: `app/src/features/world/ReferenceComposition.ts`
- Source SHA-256 at capture: `B56B4FFD2DB09E1B0EA3968B90E0691AFBA9921A93156BC05AA94DE05B26ADD4`
- Frozen `production-room-full.glb` SHA-256: `3A02647D24E474C8A2579B0D277CF02A7841212E961C1554F67B6E032E40A307` (unchanged)

## Chair transform

- `chair-root`: shift X `0.03`, Z `-0.735`; yaw `+18°`; scale `[0.6, 0.8, 0.6]`.
- `chair-base`: shift X `0.18`, Z `-0.735`; yaw `+18°`; scale `[0.75, 1, 0.75]`.
- Runtime diagnostic positions: root `[0.33, 0.076, -1.095]`; base `[0.48, 0, -1.095]`.

## Build and capture

- Build: `run-build.cmd` (Node `v24.19.0`, evidence build flag enabled, `pnpm build`) — **PASS, exit 0**. Logs: `build.log`, `build.exit.txt`.
- Fresh production server PID `47960` reported Ready on port 3133 and was stopped after capture.
- Capture: `run-capture.cmd` — **PASS, exit 0**.
- Same-page pre/post traces show `HOME`, controls closed, one visible WebGL2 canvas, context not lost, and zero static/failure fallbacks.
- Desktop PNG: `screenshots/studio-reference-desktop-1440x900.png` (SHA-256 `82D4168BD1E9A3EA5A9732CB2755FD31CA75C56BC6058A31592D9686976FCB33`).
- Mobile PNG: `screenshots/studio-reference-mobile-390x844.png` (SHA-256 `F77907DDCAABFA1346C6560179C68C63EDAE84D2A77577B2DC00AB413C891A6A`).
- Same-page traces and per-anchor diagnostics are in `measurements/desktop-1440x900-*` and `measurements/mobile-390x844-*`.

## Occlusion measurements

The unchanged projected-bounds sampler records 81 samples per anchor. The gate is at most 10% chair/resident occlusion.

| Anchor | Desktop 1440×900 | Mobile 390×844 | Gate |
|---|---:|---:|---|
| Desk | chair 6; ratio `0.193548` | chair 7; ratio `0.212121` | **FAIL** |
| Monitor | chair 3; ratio `0.055556` | chair 3; ratio `0.055556` | PASS |
| Right speaker cabinet | chair 0; ratio `0` | chair 0; ratio `0` | PASS |

The raw views show the existing seat/back and base/wheels. Desk occlusion remains over the gate in both frames, matching the failed metric.

## Checks

- `pnpm build`: **PASS**.
- Fresh desktop/mobile captures with same-page runtime snapshots: **PASS**.
- `git diff --check`: **PASS**.
- PRE-G7-13D 16-case lane: **NOT RUN**; targeted desk gate failed.
- Mirror sync, full tests, commit, and push: **NOT RUN** for this failed transform iteration.

Attempts 42–45 and earlier evidence remain preserved. This report documents attempt 46 only.
