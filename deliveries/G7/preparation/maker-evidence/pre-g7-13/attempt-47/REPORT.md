# PRE-G7-13D attempt 47

## Result

**FAIL at the targeted occlusion gate.** Desk occlusion remains over the 10% chair/resident ceiling in both views. The 16-case lane was **NOT RUN**. No packet acceptance is claimed.

## Source checkpoint

- Worktree: `C:\p13-iso`
- Branch: `codex/pre-g7-13-anchor-articulation-isolated-20261014`
- Base HEAD: `2a9e50576f2e88b11c2c30380cee16ede9e24983`
- Changed source: `app/src/features/world/ReferenceComposition.ts`
- Source SHA-256 at capture: `1D512FB505B7D8F96B2A0E3C331345D04179B02ED2D807F059E5F9D3257857FD`
- Frozen `production-room-full.glb` SHA-256: `3A02647D24E474C8A2579B0D277CF02A7841212E961C1554F67B6E032E40A307` (unchanged)

## Chair transform

- `chair-root`: shift X `0.04`, Z `-0.735`; yaw `+18°`; scale `[0.6, 0.8, 0.6]`.
- `chair-base`: shift X `0.19`, Z `-0.735`; yaw `+18°`; scale `[0.75, 1, 0.75]`.
- Runtime diagnostic positions: root `[0.34, 0.076, -1.095]`; base `[0.49, 0, -1.095]`.

## Build and capture

- Build: `run-build.cmd` (Node `v24.19.0`, evidence build flag enabled, `pnpm build`) — **PASS, exit 0**. Logs: `build.log`, `build.exit.txt`.
- Fresh production server PID `54096` reported Ready on port 3133 and was stopped after capture.
- Capture: `run-capture.cmd` — **PASS, exit 0**.
- Same-page pre/post traces show `HOME`, controls closed, one visible WebGL2 canvas, context not lost, and zero static/failure fallbacks.
- Desktop PNG: `screenshots/studio-reference-desktop-1440x900.png` (SHA-256 `2EA72C0B2E96D2589573DDBA2331091A8CD6A8B6D140CD324EE356ABA22B9597`).
- Mobile PNG: `screenshots/studio-reference-mobile-390x844.png` (SHA-256 `0819D3D5A918F34EE6D74AC74F3F0C8164F1E10E0010FF9D7F4C246B15260422`).
- Same-page traces and per-anchor diagnostics are in `measurements/desktop-1440x900-*` and `measurements/mobile-390x844-*`.

## Occlusion measurements

The unchanged projected-bounds sampler records 81 samples per anchor. The gate is at most 10% chair/resident occlusion.

| Anchor | Desktop 1440×900 | Mobile 390×844 | Gate |
|---|---:|---:|---|
| Desk | chair 5; ratio `0.166667` | chair 4; ratio `0.129032` | **FAIL** |
| Monitor | chair 3; ratio `0.055556` | chair 3; ratio `0.055556` | PASS |
| Right speaker cabinet | chair 0; ratio `0` | chair 1; ratio `0.017241` | PASS |

The raw views show the existing seat/back and base/wheels, but the chair still overlaps the desktop; this matches the measured desk failure.

## Checks

- `pnpm build`: **PASS**.
- Fresh desktop/mobile captures with same-page runtime snapshots: **PASS**.
- `git diff --check`: **PASS**.
- PRE-G7-13D 16-case lane: **NOT RUN**; targeted desk gate failed.
- Mirror sync, full tests, commit, and push: **NOT RUN** for this failed transform iteration.

Attempts 42–46 and earlier evidence remain preserved. This report documents attempt 47 only.
