# PRE-G7-39 — program-parameter query attribution

- **Date:** 2026-10-16 (Asia/Calcutta)
- **Authority:** Parent Codex, under the user's full-site repair and explicit GitHub-push authorization
- **Status:** Authorized bounded diagnostic against the frozen PRE-G7-38 production build
- **Branch:** `codex/pre-g7-39-program-parameter-query-diagnostic-20261016`
- **Branch parent:** `25a26a4f0c14e0633138dce31ccd7acd200e1967` (PRE-G7-38 evidence commit)
- **Frozen source commit:** `ae0412fb4bfcf81b807ecd492a96cbd773c5005c`
- **Frozen app tree:** `7572fd8d082659251762ddb81416219a37800680`
- **Frozen source-commit domain tree:** `58721ce1ae7e8c3c84c0b959566c975932871f8c`
- **Frozen build:** `ZU5S4uDGagmUivvV4xDKh`; `BUILD_ID` SHA-256 `9a2f517f64d3d460f4d800276ea7a46bb9bb63740c5ea85ca0b77d1b74432240`
- **Output owner:** `deliveries/G7/preparation/maker-evidence/pre-g7-39/`
- **Boundary:** One argument-aware browser diagnostic on the exact P38 production build. No product source, tests, install, rebuild, full performance suite, acceptance, merge, deployment, or domain/DNS change.

## Why this packet exists

PRE-G7-37's single instrumented capture on the PRE-G7-35 build recorded 60 `getProgramInfoLog` calls totaling 15,441.8 ms, while `getProgramParameter` totaled 26.6 ms. PRE-G7-38 patched Three.js to check `LINK_STATUS` before reading shader/program info logs. Its one instrumented capture on the new build recorded zero `getProgramInfoLog` and `getShaderInfoLog` calls, but 457 `getProgramParameter` calls totaled 11,730.9 ms, with a maximum of 609.1 ms. The three largest long tasks were 4,050, 6,673, and 1,277 ms.

P38's wrapper did not record the second argument to `getProgramParameter`, so it cannot distinguish `LINK_STATUS`, `ACTIVE_UNIFORMS`, `ACTIVE_ATTRIBUTES`, `VALIDATE_STATUS`, or the KHR completion-status query. Because the P38 patch moved `LINK_STATUS` ahead of info-log reads, the wait may have shifted to that query. The existing evidence does not establish which query blocked, and each capture is a single instrumented observation.

## Authorized work

1. Use the frozen PRE-G7-38 production build and source identity above. Do not install packages or rebuild. Confirm the build ID and app/domain trees before capture. Record that the P39 branch contains only packet and evidence changes at capture time.
2. Extend the P38 WebGL probe in the P39 evidence directory to record `getProgramParameter`'s numeric second argument and resolved WebGL enum name. Record per-enum call counts, total measured duration, maximum duration, and timestamps for calls at least 50 ms. Preserve the original return value, thrown errors, and all existing wrapper observations. Do not record shader source, uniforms, or user data. Keep wrapper timing overhead caveats.
3. Run exactly one headless Chrome 155.0.8059.84 / Playwright 1.63.0 browser capture at 1440×900 on `/?studio=1` for 40 seconds. Use Node 24.19.0 and pnpm 9.15.9, a dedicated local port, and clear `NEXT_PUBLIC_PRE_G7_13_EVIDENCE` from the runtime server. Bind the result to the frozen P38 source, trees, and build ID/hash.
4. Preserve navigation, final lifecycle and HOME timing, long tasks, frame gaps, every WebGL method summary, per-enum `getProgramParameter` timings, errors, GLB response statuses, screenshot, server logs, and the exact single-run receipt. Do not retry or repeat if output is incomplete or the route stalls.
5. Write a report that distinguishes observations from inference. If one enum carries most of the time, identify that result as a measured candidate for the next source-correction packet; this diagnostic itself does not establish causation or pass the full performance gate.
6. Write a strict inventory with byte length, SHA-256, and Git blob IDs for all P39 artifacts and relevant P38 packet/report/source/build evidence. Verify the inventory against committed blobs. Commit and push the packet/index before evidence code, and commit/push the completed P39 evidence separately.

## Owned paths

- This packet and the narrow PRE-G7-39 entry in `docs/planning/delegation-and-work-orders.md`.
- `deliveries/G7/preparation/maker-evidence/pre-g7-39/`.

Do not edit `app/`, `yorayriniwnl.in/`, test source, assets, dependencies, or the frozen P38 build. No app lint, typecheck, build, install, or tests are authorized under P39. No full performance suite, acceptance, merge, deployment, or DNS work is authorized.

## Evidence and exit boundary

The P38 source candidate remains unaccepted and undeployed. P39's one capture is diagnostic evidence only. Independent audit, human visual review against `references/images/main-reference.png`, Parent ruling, and the full performance suite remain open. No merge or deployment is authorized.
