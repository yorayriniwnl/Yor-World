# PRE-G7-13D attempt 42

## Result

**FAIL at the targeted occlusion gate.** This attempt used only the PRE-G7-13D-authorized transforms for the existing `chair-root` and `chair-base`. The fresh build and raw two-viewport capture completed successfully. The required 16-case lane was **NOT RUN** because the measured desk and mobile-monitor occlusion exceeded the packet's 10% ceiling. No packet acceptance is claimed.

## Source checkpoint

- Worktree: `C:\p13-iso`
- Branch: `codex/pre-g7-13-anchor-articulation-isolated-20261014`
- Base HEAD: `2a9e50576f2e88b11c2c30380cee16ede9e24983`
- Changed source: `app/src/features/world/ReferenceComposition.ts`
- Source SHA-256 at capture: `FED574B20EFAD44C63F3D1BEB4602FB92CD7D11781DA43F5032A27FD7B13272C`
- Frozen GLB `deliveries/production-environment/runtime/production-room-full.glb` SHA-256: `3A02647D24E474C8A2579B0D277CF02A7841212E961C1554F67B6E032E40A307` (unchanged)

## Chair transform

- `chair-root` shift values: X `-0.05`, Z `-0.69`; yaw `+18°`; scale `[0.6, 0.8, 0.6]`.
- `chair-base` shift values: X `0.10`, Z `-0.69`; yaw `+18°`; scale `[0.75, 1, 0.75]`.
- The root/base X offset remains `0.15` world units.
- Runtime diagnostic world positions: root `[0.25, 0.076, -1.05]`; base `[0.40, 0, -1.05]`.

## Build and capture

- Build: `attempt-42/run-build.cmd` (Node `v24.19.0`, `NEXT_PUBLIC_PRE_G7_13_EVIDENCE=1`, `pnpm build`) — **PASS, exit 0**. Full output: `build.log`; exit: `build.exit.txt`.
- Production server: fresh process PID `58176`, `next start --hostname 127.0.0.1 --port 3133`; reported Ready. Stopped after capture.
- Capture: `attempt-42/run-capture.cmd` — **PASS, exit 0**.
- Each PNG and diagnostic snapshot was recorded on the same fresh page before navigation. Both traces report `HOME`, controls closed, one visible WebGL2 canvas, context not lost, zero static/failure fallbacks, before and after screenshot.
- Desktop PNG: `screenshots/studio-reference-desktop-1440x900.png` (SHA-256 `3D1F3A6C0F3AC3F0049B4A057F8111DE2DA59F270F86CD511C7EA924397DE49F`).
- Mobile PNG: `screenshots/studio-reference-mobile-390x844.png` (SHA-256 `09C4036FE20ADFCABE291854650389666709D94DD295CB51852D339344CA5E4E`).
- Same-page traces and per-anchor diagnostics are in `measurements/desktop-1440x900-*` and `measurements/mobile-390x844-*`.

## Occlusion measurements

The unchanged sampler uses 81 projected-bound samples per anchor. The packet ceiling is 10% chair/resident occlusion.

| Anchor | Desktop 1440×900 | Mobile 390×844 | Gate |
|---|---:|---:|---|
| Desk | chair 7; ratio `0.21875` | chair 7; ratio `0.212121` | **FAIL** |
| Monitor | chair 5; ratio `0.089286` | chair 6; ratio `0.107143` | **FAIL on mobile** |
| Right speaker cabinet | chair 0; ratio `0` | chair 0; ratio `0` | PASS |

No other sampled required anchor had nonzero chair/resident occlusion in either diagnostic snapshot. The mobile raw view still shows the seat/worktop relationship partly obscured; the projected bounds alone do not establish full chair recognition.

## Checks

- `pnpm build`: **PASS** (exact source above).
- Fresh desktop/mobile capture and same-page runtime snapshots: **PASS**.
- PRE-G7-13D 16-case lane: **NOT RUN**; targeted gates failed as stated above.
- Mirror sync, full tests, commit, and push: **NOT RUN** for this failed transform iteration.

Earlier attempts remain preserved. This report documents attempt 42 only; it does not alter attempt 41 or any prior evidence.
