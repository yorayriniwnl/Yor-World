# PRE-G7-13D attempt 45

## Result

**FAIL at the targeted occlusion gate.** The mobile right-speaker cabinet exceeds the packet's 10% chair/resident occlusion ceiling, and desktop desk occlusion is slightly above the ceiling. The 16-case lane was **NOT RUN**. No packet acceptance is claimed.

## Source checkpoint

- Worktree: `C:\p13-iso`
- Branch: `codex/pre-g7-13-anchor-articulation-isolated-20261014`
- Base HEAD: `2a9e50576f2e88b11c2c30380cee16ede9e24983`
- Changed source: `app/src/features/world/ReferenceComposition.ts`
- Source SHA-256 at capture: `98BAD91C143ACAEF2C49A014E04A0DEC2CDE737F4CCA89BC93AD5074B80A1782`
- Frozen `production-room-full.glb` SHA-256: `3A02647D24E474C8A2579B0D277CF02A7841212E961C1554F67B6E032E40A307` (unchanged)

## Chair transform

Only the shared yaw changed from attempt 44: `+18°` to `+16°`. The remaining values stayed fixed:

- `chair-root`: shift X `0.05`, Z `-0.735`; scale `[0.6, 0.8, 0.6]`.
- `chair-base`: shift X `0.20`, Z `-0.735`; scale `[0.75, 1, 0.75]`.
- Runtime diagnostic positions: root `[0.35, 0.076, -1.095]`; base `[0.50, 0, -1.095]`.

## Build and capture

- Build: `run-build.cmd` (Node `v24.19.0`, evidence build flag enabled, `pnpm build`) — **PASS, exit 0**. Logs: `build.log`, `build.exit.txt`.
- Fresh production server PID `68072` reported Ready on port 3133 and was stopped after capture.
- Capture: `run-capture.cmd` — **PASS, exit 0**.
- Same-page pre/post traces show `HOME`, controls closed, one visible WebGL2 canvas, context not lost, and zero static/failure fallbacks.
- Desktop PNG: `screenshots/studio-reference-desktop-1440x900.png` (SHA-256 `D4C586663BC982477410725D68C1691D09CE4A0A4AC20F04878475CC1E4C4F8A`).
- Mobile PNG: `screenshots/studio-reference-mobile-390x844.png` (SHA-256 `4BDB3A45060E44B9E87626AFD65AF97062E3BBD4F29A046685DD5F0AF7B831B9`).
- Same-page traces and per-anchor diagnostics are in `measurements/desktop-1440x900-*` and `measurements/mobile-390x844-*`.

## Occlusion measurements

The unchanged projected-bounds sampler records 81 samples per anchor. The gate is at most 10% chair/resident occlusion.

| Anchor | Desktop 1440×900 | Mobile 390×844 | Gate |
|---|---:|---:|---|
| Desk | chair 3; ratio `0.103448` | chair 3; ratio `0.100000` | **FAIL desktop; mobile at ceiling** |
| Monitor | chair 3; ratio `0.055556` | chair 3; ratio `0.055556` | PASS |
| Right speaker cabinet | chair 2; ratio `0.031746` | chair 7; ratio `0.118644` | **FAIL mobile** |

The raw images show the existing seat, back, and base/wheels in both views. The mobile chair still overlaps the right speaker cabinet in the sampled frame, consistent with the failing metric.

## Checks

- `pnpm build`: **PASS**.
- Fresh desktop/mobile captures with same-page runtime snapshots: **PASS**.
- `git diff --check`: **PASS**.
- PRE-G7-13D 16-case lane: **NOT RUN**; targeted occlusion gates failed.
- Mirror sync, full tests, commit, and push: **NOT RUN** for this failed transform iteration.

Attempts 42–44 and earlier evidence remain preserved. This report documents attempt 45 only.
