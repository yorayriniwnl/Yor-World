# FINISH-B1-R4 — FINISH-25 plus R1 local re-audit

**Reviewable bounded candidate; local packet checks pass, independent review and parent acceptance are pending.** This is not a maker self-acceptance, full B1 acceptance, canonical integration, or release approval.

## Exact inputs and scope

- Pinned base: FINISH-B1-R3 commit `1753b9278c4537b5377c3893172b2a0f26d13b10`, tree `9759ac9879bcc9489770b7c5784ead2f022157b0`.
- FINISH-25 packet: `105d79b1d4d3d36064a933fa745e3ca43a35a8cf`. FINISH-25-R1 authorization: `b33631a9bcbd74cfca9e8f2495140a5eee322a9a`.
- `evidence/lineage-r1.json` verifies 26 raw Git inputs, exact source patch replay, all eight production input identities, and the preserved 72-file material-only checkpoint (10,515,141 bytes; manifest SHA-256 `2957fb72ed270f9d6bd75fdce5f6dc0c1fe3e124da490a8a682fb9cf9731724a`).
- Final builder SHA-256: `ea965a95d2f7aebb54e0819a1846f3b76e827f64098cfb6c784acc09696ad591`. Patch SHA-256: `15c1cb3740781a8234f352a0f5cf342d542eb6f47024825132ee1a9f7b45c513`.

## Geometry and material results

`PC_TemperedGlass` uses alpha 0.18 and zero transmission. The R1 geometry audit finds only the four allowed component changes. `pc_chassis_frame` changes from 12 to 60 triangles (+48); `pc_internal_backplate` adds 12; the existing wall component changes from 12 to 48 (+36); and `window_frame` changes from 12 to 48 (+36). Total change is +132 triangles. The backplate remains inside the chassis bounds. All other object geometry, UV associations, hierarchy, transforms, and material bindings match the pinned source; the one added node is `pc_internal_backplate`.

The PC fan hook remains centered at `(1.05, 0.99, -0.914)` with runtime +Z axis. The oblique exterior capture shows the three fan rings through the pane, partly occluded by the dark backplate. The window exterior capture shows room content through the blind gaps. Its interior close view is dominated by the slats and does not independently prove the pane surface. These local captures do not establish reference-grade reflections, an exterior environment, daylight, or blind interaction presets.

## Browser and local budgets

| Variant | Profile | Raw calls | Main pass | Transmission pass | Triangles |
| --- | --- | ---: | ---: | ---: | ---: |
| R3 | desktop-home | 202 | 101 | 101 | 30544 |
| R3 | mobile-home | 146 | 73 | 73 | 27872 |
| material-only | desktop-home | 102 | 102 | 0 | 15296 |
| material-only | mobile-home | 74 | 74 | 0 | 13960 |
| R4-R1 | desktop-home | 103 | 103 | 0 | 15428 |
| R4-R1 | mobile-home | 75 | 75 | 0 | 14056 |

R1 desktop is 103/120 calls and 15,428 triangles; mobile is 75/80 calls and 14,056 triangles. The intercepted count matches `renderer.info`, each measurement advances one frame, and transmission calls are zero. The run uses the pinned R3 harness with URL remapping, Three 0.180.0, Playwright 1.63.0, Chromium 153.0.8010.12, DPR 1, exposure 0.85, and the same matched cameras/lights/animation state for all three variants. `evidence/browser-results-r1.json` contains per-call stack, owner, material flags, camera, lights, and loaded asset hashes; `evidence/capture-reverification-r1.json` verifies all 24 PNGs and the loaded GLB bodies.

| Profile | Calls | Triangles | GPU estimate bytes | Median ms | P95 ms | Result |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| desktop-home | 103 | 15428 | 6375766 | 0.900 | 1.300 | PASS LOCAL |
| mobile-home | 75 | 14056 | 6375766 | 0.800 | 1.000 | PASS LOCAL |

Asset transfer, texture, geometry-memory estimate, triangle, and local timing limits pass. The GPU estimate excludes driver and framebuffer overhead; timing is local Chromium only. Provider, physical-device, thermal, production runtime, and G7 checks are **NOT RUN**.

## Exports and validation

Final `assets/room.glb` is 699668 bytes, SHA-256 `ede3258e39efa6d2641f1480baaf3cfd9d44c3915b4da243fc6d4011d8c3654b`. The four other production GLBs and two textures match pinned R3 bytes. GLB validation reports five files, zero errors, and zero warnings; fresh Blender import and finite transforms pass for all five.

Two independent Blender 5.2.2 LTS builds reopen to the same semantic object, geometry, UV, material graph, hierarchy, and transform inventory. Their saved `.blend` containers and full-scene raw GLB intermediates are not byte-identical. The two raw GLBs have the same size but different hashes; merging either raw export into the pinned R3 records produces the exact same final room GLB bytes while preserving the original binary prefix and unrelated records. See `evidence/final-export-reproducibility.json` for the precise hashes and caveat.

## Acceptance boundary

The authorized glass and window visibility blockers pass local mechanical checks. Full reference fidelity remains **FAIL / OPEN**: the inherited composition is darker and simpler than `references/images/main-reference.png`. The FINISH-20 positive-Y door/camera sweep and production door-transform ownership remain unresolved. External GPT Plus #2 review, physical-device and production/provider checks are **NOT RUN**. No integration, publishing, downstream C2/C3 work, or broad B1 acceptance is authorized by this package.

`evidence/output-hashes-r1.json` lists the R1 source, inputs, assets, captures, and principal audit receipts. `output-hashes.json` and `evidence/package-verification.json` bind the complete delivered package, excluding only their documented self-cycle entries and scratch paths.
