# FINISH-B1-R4 material-only stage

Local Codex maker result: **FAIL for the complete FINISH-25 visual requirement; PASS for the measured draw-call correction.** This stage is preserved before any Parent amendment. It is not an acceptance or an external Gemini/GPT review.

Exact predecessor: FINISH-B1-R3 commit `1753b9278c4537b5377c3893172b2a0f26d13b10`, full tree `9759ac9879bcc9489770b7c5784ead2f022157b0`. Parent packet: FINISH-25 at `105d79b1d4d3d36064a933fa745e3ca43a35a8cf`. Inputs were read as raw Git blobs and bound in `evidence/input-hashes.json`.

The successor glass uses alpha blending at 0.18 and zero transmission. It preserves the original RGB, roughness, metallic factor and double-sided geometry. Transmission and its dependent IOR export declarations are removed, matching Blender's actual non-transmissive glass export. `source.patch` changes only the predecessor environment builder's glass setup. The native source changes only that material. The production room export is a deterministic material-only JSON change with an exact unchanged binary chunk; all node, hierarchy, mesh/UV/topology and animation records are exact.

| Requirement | Actual result | Evidence |
| --- | --- | --- |
| Frozen desktop raw calls ≤120 | PASS: R3 202, R4 102 | `evidence/browser-results.json` |
| Frozen mobile raw calls ≤80 | PASS: R3 146, R4 74 | Same receipt |
| No transmission pass | PASS: R4 0; all intercepted calls are main pass | Same receipt with raw stack frames, owner attribution and renderer.info |
| Credible PC glass transparency/readability | FAIL | Matched `captures/R3/pc-glass-outside/`, `captures/R4/pc-glass-outside/` and inside views; `evidence/pc-occlusion-scope.json` |
| Matched desktop/mobile and outside/inside/window captures | PASS for hashes, actual dimensions and matched settings | Ten actual canvas PNGs and index in browser receipt |
| Overall reference fidelity | FAIL / unresolved visual gate | The current room is visibly darker and less detailed than the main reference; unchanged inherited lighting/geometry. These material-only views do not approve overall art. |
| Other production outputs unchanged | PASS: six byte-identical outputs; room GLB and native source are the two expected changes | `evidence/production-lineage.json` |
| GLB structure | PASS: five files, zero errors, zero warnings | `evidence/gltf-validation.json` |
| Native material and source parity | PASS: exact fields; actual Blender material export matches production within 1e-7 | `evidence/native-source-export-parity.json` |
| Source patch replay | PASS: exact applied bytes with core.autocrlf=false | `evidence/source-patch-replay.json` |
| Deterministic room export replay | PASS: exact bytes | `evidence/export-reproducibility.json` |
| Native hierarchy/mesh/UV/actions and other materials | PASS | `evidence/native-material-diff.json` |
| Fresh Blender import | PASS: five exact final GLBs, finite transforms | `evidence/blender-imports.json` |
| Positive-Y door/camera and production door-transform owner | OPEN, outside scope | FINISH-20 remains unresolved; no door/camera geometry or paths changed |
| Physical devices, production/provider proof, external review | NOT RUN | Local Chromium/Three r180 and Blender 5.2.2 LTS only |

The chassis is a closed opaque box named `pc_chassis_frame`, under `helios-pc`, using `PC_ChassisWhite`. Its opaque x=0.93 side lies immediately behind the glass panel, whose x range is about [0.9255,0.9305]. The corrected exterior therefore still reads as an opaque white slab. The interior capture is dark/empty with the frozen renderer; it does not prove usable internal visibility. Merely lowering alpha cannot remove the occluding side or make the existing front fans readable from the side.

A narrowly bounded successor needs Parent authorization to replace only the chassis box with an open-side thin shell inside its existing envelope, and to provide minimal visible interior detail while retaining its node/name/parent/TRS/material and the fan/LED hooks. The shared window glass geometry must remain exact. Raw draw calls and matched views must be rerun on that final successor. This stage makes no geometry or lighting change and does not close the full art gate.

Earlier local attempts are retained: browser package-version lookup initially failed before rendering; native saving initially failed because the target directory was absent; source replay initially encountered the machine's global CRLF conversion; native export parity initially exposed the now-removed inactive IOR declaration. Final named receipts represent the corrected runs. No failed attempt is silently counted as PASS.
