# PRE-G7-13D attempt 43

## Result

**FAIL at the targeted occlusion gate.** This attempt tested the requested midpoint X placement on the existing chair groups. Fresh build and desktop/mobile captures completed successfully. The desk exceeds the 10% chair/resident occlusion ceiling in both views, so the 16-case lane was **NOT RUN**. No packet acceptance is claimed.

## Source checkpoint

- Worktree: `C:\p13-iso`
- Branch: `codex/pre-g7-13-anchor-articulation-isolated-20261014`
- Base HEAD: `2a9e50576f2e88b11c2c30380cee16ede9e24983`
- Changed source: `app/src/features/world/ReferenceComposition.ts`
- Source SHA-256 at capture: `29DFD73B4CA112C230D482DD378B1F9F5EB9C5D44FC20848BB8DCDFD970211A6`
- Frozen `production-room-full.glb` SHA-256: `3A02647D24E474C8A2579B0D277CF02A7841212E961C1554F67B6E032E40A307` (unchanged)

## Chair transform

- `chair-root`: shift X `0.00`, Z `-0.69`; yaw `+18°`; scale `[0.6, 0.8, 0.6]`.
- `chair-base`: shift X `0.15`, Z `-0.69`; yaw `+18°`; scale `[0.75, 1, 0.75]`.
- Root/base X offset remains `0.15` world units.
- Diagnostic world positions: root `[0.30, 0.076, -1.05]`; base `[0.45, 0, -1.05]`.

## Build and capture

- Build: `run-build.cmd` (Node `v24.19.0`, `NEXT_PUBLIC_PRE_G7_13_EVIDENCE=1`, `pnpm build`) — **PASS, exit 0**. Full log and exit are `build.log` and `build.exit.txt`.
- Fresh production server PID `31160` reported Ready on port 3133 and was stopped after capture.
- Capture: `run-capture.cmd` — **PASS, exit 0**.
- Each capture trace has the same-page runtime snapshot immediately before and after its PNG: `HOME`, controls closed, one visible WebGL2 canvas, context not lost, and zero static/failure fallbacks.
- Desktop PNG: `screenshots/studio-reference-desktop-1440x900.png` (SHA-256 `9609BF3F06F74BDACCB86EB47534D31AFFB29B80649FD70860020D152A5E4785`).
- Mobile PNG: `screenshots/studio-reference-mobile-390x844.png` (SHA-256 `DF0580B60D830C415C9E1A5031458727B2B696B132D0903ED7F45173AB0C1625`).
- Same-page traces and per-anchor diagnostics are in `measurements/desktop-1440x900-*` and `measurements/mobile-390x844-*`.

## Occlusion measurements

The unchanged sampler records 81 projected-bound samples per anchor. The packet ceiling is 10% chair/resident occlusion.

| Anchor | Desktop 1440×900 | Mobile 390×844 | Gate |
|---|---:|---:|---|
| Desk | chair 6; ratio `0.193548` | chair 7; ratio `0.212121` | **FAIL** |
| Monitor | chair 2; ratio `0.037736` | chair 3; ratio `0.055556` | PASS |
| Right speaker cabinet | chair 0; ratio `0` | chair 0; ratio `0` | PASS |

Desk is the only sampled anchor over the ceiling. No other sampled required anchor has nonzero chair/resident occlusion beyond the monitor values listed above. The raw views show the existing blue chair back/seat and base; mobile still places the visible chair/worktop overlap across the desk, consistent with the failing desk metric.

## Checks

- `pnpm build`: **PASS**.
- Fresh desktop/mobile capture and same-page runtime snapshots: **PASS**.
- `git diff --check`: **PASS**.
- PRE-G7-13D 16-case lane: **NOT RUN**; the targeted desk gate failed.
- Mirror sync, full tests, commit, and push: **NOT RUN** for this failed transform iteration.

Attempt 42 and earlier evidence remain preserved. This report documents attempt 43 only.
