# FINISH-B1-R5 reference-visual correction

Status: **bounded maker package complete; Parent audit and owner visual review pending**
Date: 2026-10-12

This candidate changes the existing room and chair-fixture palette to restore the reference's ivory work surfaces, pale lavender room surfaces, blue-and-ivory chair, pink/lilac hex accents, and cyan underdesk fill. It preserves the dark blue floor and screen content. The package contains a generated source patch, native Blender source, updated GLBs, matched R4/R5 captures, hashes, logs, and local verification receipts. It does not claim visual acceptance or production readiness.

## Bound inputs and scope

- Exact R4-02 base: commit `7936fa981a24fe4af834ff250ffec8a7b02b09b3`, tree `98f37af3f3b490a19a25677160c442fa7daef3fc`, delivery subtree `7df14feefa5b89f02b07c0127992d15189848f7a`.
- FINISH-35 packet and frozen contracts were copied and hash-bound from packet commit `4290a9c0089692a63aed6896df450b6df17a504d`; see `evidence/input-bindings.json`.
- Main reference SHA-256: `37adfb0ee344642798978e954a0cfc8d9715eac1b3ca4e5a84ab87a228c53362`.
- Art specification SHA-256: `763d64d20176c6e3a6d9887bdff233fc71fb2751ee142ebd6fd28ed150126ded`.
- Frozen asset bindings SHA-256: `0f4173cfd4cc7f52562344fc2e087ace13dea5717cb065c7b7a0c0200bfdb360`.
- FINISH-31 audit was read from commit `b25b0bd0b30fe97d7d7173c40bad694c675f026e`; its full report is preserved at `inputs/FINISH-31/report.md`.

Only these runtime files changed: `assets/room.glb`, `assets/fixture.glb`, and `assets/source/room.blend`. The room contains 15 allowlisted material changes and three existing authored point-light color changes; the fixture contains two allowlisted material changes. `source.patch` is generated from the exact R4 builder input. The delivery includes component-level source and GLB diffs in `evidence/native-palette-scope.json`, `evidence/fixture-palette-scope.json`, `evidence/room-native-material-merge.json`, and `evidence/fixture-native-material-merge.json`.

The R4 PC tempered-glass material remains semantically identical. GLB binary payloads, geometry, UVs, node and mesh inventories, transforms, animations, object names, cameras, door state, runtime requests, IDs, interaction hooks, and all non-target material and light fields remain unchanged. The other five runtime assets and both loose texture files are byte-identical to R4. `evidence/final-scope.json` records the full comparison.

## Requirement matrix

| Proof | Result | Evidence |
|---|---|---|
| Raw Git input bindings and R4 output manifest | PASS | `evidence/input-bindings.json` |
| Source patch generated and replayed against exact R4 builder | PASS | `source.patch`, `evidence/source-patch-replay.json`, `evidence/checks/source-patch-replay.stdout.log` |
| Native palette scope, geometry/UV/TRS/action/camera/hook inventories, and R4 glass preservation | PASS LOCAL | `evidence/native-palette-scope.json`, `evidence/fixture-palette-scope.json`, `evidence/final-scope.json` |
| Matched desktop/mobile R4 and R5 captures, exact listed profiles and unchanged runtime model requests | PASS LOCAL | `evidence/browser-results.json`, `evidence/capture-verification.json`, `evidence/comparisons/index.html` |
| Reference anchor restoration and overall art fidelity | NOT RUN — owner review pending | Captures show the intended palette cues. They also show material differences in prop richness, rendering detail, composition, and the prominence of the colored lights. This packet forbids geometry, placement, and camera edits, so the candidate does not claim to reproduce the reference image. |
| glTF validator | PASS LOCAL — 5 GLBs, 0 errors, 0 warnings | `evidence/gltf-validation.json` |
| Blender import and finite transforms | PASS LOCAL — 5 GLBs | `evidence/blender-imports.json` |
| Desktop/mobile calls, triangles, transfer and texture budgets | PASS LOCAL — 103 / 75 calls | `evidence/final-budgets.json` |
| Package file hashes and exact delivery set | PASS LOCAL | `output-hashes.json`, `evidence/package-verification.json` |
| Physical-device, hosted-provider, cold/warm network, production and G7 checks | NOT RUN | This local visual candidate makes no such claims. |

## Matched results

The browser harness is the packet-bound Playwright/Three r180 harness with URL remapping only. It kept the existing renderer, exposure, lighting, animation state, camera, and DPR settings. Desktop was captured at 1920 × 1080; mobile at 720 × 1280. Fourteen captures (seven views for each of R4 and R5) have recorded PNG dimensions and SHA-256 values.

| Profile | Calls | Call limit | Triangles | Triangle limit | Local median / p95 frame sample |
|---|---:|---:|---:|---:|---:|
| Desktop home | 103 | 120 | 15,428 | 300,000 | 0.8 / 1.1 ms |
| Mobile home | 75 | 80 | 14,056 | 140,000 | 0.8 / 1.0 ms |

Delivered essential GLBs total 1,365,300 bytes; all delivered assets total 1,662,762 bytes; unique texture bytes total 246,782. These are local contract calculations. The browser timing and GPU figures are instrumented estimates, not real-device or production qualification.

Open `evidence/comparisons/index.html` to see the supplied reference, R4 capture, and R5 capture together for both profiles. The R5 image shows brighter ivory desk and drawer surfaces, lavender walls, a stronger blue chair with pale trim, brighter pink/lilac accents, and visible cyan beneath the desk. The blue floor and screen remain readable. The chair is shown from behind at the fixed camera and its pale pads are only partly visible; the hex lights remain less prominent than in the reference. The overall room render remains less detailed and its composition differs from the supplied image. Owner judgment is still required.

## Commands, tools, and delivery limits

The exact sequential commands, exit codes, elapsed times, and stdout/stderr logs are recorded in `evidence/final-check-commands.json` and `evidence/checks/`. All eleven final commands exited 0. Tool versions are in `evidence/tool-versions.json`: Blender 5.2.2 LTS, Chromium 153.0.8010.12, Playwright 1.63.0, Three 0.180.0, `gltf-validator` 2.0.0-dev.3.10, Node 24.19.0, and Python 3.12.10. The worktree-local dependency scratch directory is excluded from this package.

No application or canonical tree was changed. The positive-Y door/camera margin, runtime door-transform ownership, product interactions, full-room art admission, Parent audit, owner review, physical device, hosted-provider, and production gates remain open. This package must not be treated as acceptance of the broader art lane.
