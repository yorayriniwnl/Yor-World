# W2 seated-avatar/export feasibility — W2-F1-r2

Returned for **Gemini-3 motion, Claude-01 interface, Claude-13 export/provenance and parent review**. Not accepted; no later lane started. This is OpenAI Codex/GPT-6 executing the functional GPT-2/W2 lane, not proof of another account/provider. Exact serving build is not exposed.

The delivery contains an actual editable Blender source, resident GLB, separate F1 fixture GLB, five authored 30 FPS actions, a private playback harness, and independently executable maker checks. Native generation/reopen, glTF validation and real exported Chrome/Edge playback passed for the hashes below. No final likeness, final character quality, production CharacterDirector, completed B4, G1 acceptance or publication is claimed.

Inputs: product specification revision 2 and F1; exact SHA-256 values in [input-revisions.json](input-revisions.json). Read directly: START_HERE, AGENTS, account-prompts Shared/W2, work-order W2, art §§3/5/6/9, engineering §§4/5, product §§1/3/4/10, validation §§1/2/5/7, reference README/manifest and main image. The reference image was visually opened. The source discussion and prior-session transcript were not needed and were not treated as instructions.

**Input revision caveat:** packaging detected eight shared file hashes changed by work outside this lane, including the product spec (still labeled revision 2). The first packaging attempt exited 1 and is recorded in [packaging-input-change.log](evidence/r2/packaging-input-change.log). Original build hashes remain intact. Current hashes are separately captured in [handoff-input-revisions.json](handoff-input-revisions.json), with current Markdown snapshots under input-snapshots/handoff. Rereading the assigned sections found the same W2/F1 geometry, clips, timing and export requirements; updated text explicitly routes Claude reviews through browser packets. This is maker source inspection, not a whole-file diff or parent acceptance. Parent reconciliation is required before acceptance. No shared file was edited by this maker.

The main image supplied the white/ivory desk, blue/white chair, cyan fill and pink/lilac accents. The generic human and all fixture geometry are authored additions. The room's prominent hex lights, plants, gaming props and pegboard remain the environment maker's work; this independent furniture proof neither replaces nor edits that room. No image pixels, external models, textures, sound, biography, project claims or contact data were added to production.

Capabilities actually demonstrated: local filesystem read/write, native PowerShell 5.1.26100.9444, Python 3.12.10, Node 24.19.0, npm 11.17.0, Blender 5.2.2 LTS (`d13f752e3b9c`), Khronos validator 2.0.0-dev.3.10, Playwright 1.58.2 and Three.js 0.180.0. Browser runs used Chrome 154.0.8037.58 and Edge 154.0.4258.37 on Windows 11 Pro 10.0.26200, Ryzen 5 3600XT, RTX 2060, NVIDIA driver 32.0.15.9186. Both WebGL reports identify ANGLE/D3D11/RTX 2060, not SwiftShader. No Blender/browser MCP was assumed: CLI and Playwright performed the work. Database access was not configured or tested. See [capabilities](evidence/r2/capabilities.json).

All edits are inside deliveries/W2; only authorized exact-pinned dependencies were installed in the unique external temporary directory logged in [prepare-dependencies.log](evidence/r2/prepare-dependencies.log). No global install, purchase, provisioning, repository creation, deployment, account dispatch or agent spawning occurred. Background subprocesses ran with hidden windows. The folder is not a Git repository; this was reported during work, and commit/push remain NOT RUN.

The previous 36 files were inspected and archived before edits in [history/interrupted-r1.zip](history/interrupted-r1.zip), with [original hashes](history/interrupted-r1-inventory.json). The old report overstated collision and browser measurements. Corrections include real skinned-vertex metrics, quaternion heading instead of ambiguous Euler yaw, zero-based clip timing, root-level skin export, stable foot tracks, safe interruption paths, narrower seat fit, raised/widened hand withdrawal and forearm clearance. Failed intermediate checks were retained, including [pre-foot-fix archive](history/r2-before-foot-fix.zip) and named trial logs. They are not final evidence. [changed-files.json](changed-files.json) identifies each modified/new current output; unrelated work was excluded.

| Artifact | Bytes | Triangles (proof LOD0) | Materials | SHA-256 |
| --- | ---: | ---: | ---: | --- |
| `avatar-proof.glb` | 230,360 | 4,060 | 6 | `eba336b923e7fd8caf20fc006221934bd820f1f61812a0965833c109d7525511` |
| `fixture-proof.glb` | 307,852 | 6,472 | 5 | `7c9b2358b898a26b40baae799506cf3be26a54019f7e14826b7d3b2c9a94a4d7` |

`avatar-proof.blend`: 459,097 bytes; SHA-256 `72f791644f488a7e15dfdcd7ed3c951abead9873223daf0ea9fdf176a2322360`. Source SHA-256 `13228064b326737142d13e95ec408628c52e26b4c72589f49efe506f412d8685`. Both GLBs total 538,212 bytes, with no textures. Decoded glTF buffer byte lengths total 435,768; this is a buffer count, not a total GPU-residency measurement. Browser main-pass observation: 10,532 triangles / 65 draw calls; shadow passes, environment assets and later optimization are not a performance acceptance result.

Asset origin: procedural W2 source, including the preserved inherited attempt and this correction. Reference rights remain unknown; no runtime reference-image use. No geometry publication license or user likeness approval has been assigned. Vendored Three.js retains its [MIT notice](playback/vendor/THREE-LICENSE.txt). Full source/export metadata is in [asset-metadata.json](asset-metadata.json); hashes for returned current files are in [output-hashes.json](output-hashes.json). This metadata is a local proof record, not a replacement for the shared AssetManifest contract.

The exact exported hierarchy, raw local TRS and channel targets are in [export-hierarchy.txt](evidence/r2/export-hierarchy.txt) and [export-inspection.json](evidence/r2/export-inspection.json). [integration-handoff.md](integration-handoff.md) specifies placement, bone parents, clip ranges, chair yaw ownership and fixture selection. Both imports load at identity. Avatar `body-turn` and fixture `chair-root` own synchronized absolute yaw; `chair-base` stays stationary. The integrator keeps W1's accepted desk/environment, removes its proxy and entire static chair, keeps W2 `chair-root` + `chair-base`, and discards W2 `fixture-static`. No doubled root offset, scene rotation or yaw is required. Exact W1 names/hashes require a later G1 assignment.

Measurements use 605 poses per browser at 60 Hz, including half-frames between 30 FPS authored keys, plus five complete cycles, 25 cancellations and 25 instant skips in each browser. Native BVH surface checks cover the fixture meshes and forearm/hand versus torso; browser skin-triangle checks cover desk/pedestal conservative boxes. Contact permits 0.2 mm numeric tolerance; browser boxes are inset 0.5 mm to exclude boundary tangency. These are sampled checks, not continuous collision proofs or independent review.

Minimum hand/front-edge gap while yaw is nonzero: 37.08 mm. Maximum root error: 1.86210863e-08 m. Maximum chair/body yaw difference: 2.60805793e-05 degrees. Maximum absolute seat gap: 6.29351507e-08 m. Feet lift at most 51.995 mm. Every repeated cycle settles into coding. Coding hand surfaces remain 1.000–2.894 mm above key tops; individual finger articulation is later work.

The proof uses pose-matched clip boundaries and a shared sampler. Proposed 150–250 ms production blend windows are not implemented; [the handoff](integration-handoff.md) explicitly proposes this proof approach for review. Safe cancellation reverses checked poses and took at most 2.667 s in the sampled cases (2.7 s theoretical maximum). Skip/Escape instantly restores coding. A later navigation controller must use instant settlement rather than delaying a route by this cancellation time. No shared schema or F1 dimensions were changed.

| Name | PASS/FAIL/NOT RUN | Evidence path | Reason |
| --- | --- | --- | --- |
| Required local inputs and preserved interrupted delivery | PASS | input-revisions.json; history/interrupted-r1-inventory.json | Files opened directly; original build input SHA-256 values retained. Main image visually inspected. |
| Shared input hashes unchanged during run | FAIL | evidence/r2/input-changes-at-handoff.json; handoff-input-revisions.json | Eight shared files changed outside this lane. Current W2/F1 requirements inspected as compatible; original hashes not overwritten. Parent must reconcile exact revisions before acceptance. |
| Native Blender generation and 30 FPS common bind pose | PASS | evidence/r2/blender-arm-clearance.command.json; evidence/r2/native-reopen.json | Native build/export exit 0; delivered .blend reopened and its saved coding pose/ranges verified. |
| F1 scale, axes and root placement | PASS | evidence/r2/chrome-browser.json; evidence/r2/export-hierarchy.txt | Desk 2.6 x .8 m, top .75; resident/chair/base (.30,0,-.36). Scenes loaded at identity. |
| Five named clips and exact zero-based timings | PASS | evidence/r2/export-inspection.json | 6.0/.6/1.2/.9/1.3 s; same clips and timeline in resident and fixture. |
| Separate avatar and fixture / G1 node mapping | PASS | integration-handoff.md; evidence/r2/export-hierarchy.txt | Avatar excludes furniture; retain chair-root + chair-base, discard fixture-static. W1 integration NOT RUN. |
| Khronos glTF validation | PASS | evidence/r2/avatar-proof.glb.validator.json; evidence/r2/fixture-proof.glb.validator.json | Both exports: 0 errors, 0 warnings, 0 infos, 0 hints. |
| Native furniture and forearm/hand-torso clearance | PASS | evidence/r2/blender-checks.json; evidence/r2/blender-measurements.json | 605 evaluated poses at 60 Hz. Only numerically tangent pelvis/seat pairs permitted. No other sampled furniture or forearm/hand-torso intersections. |
| Exported browser desk/pedestal clearance | PASS | evidence/r2/chrome-browser.json; evidence/r2/msedge-browser.json | Skin triangles tested against desk/pedestal boxes inset by 0.5 mm, not static bone labels; zero hits. |
| Withdrawal before rotation and return to keys | PASS | evidence/r2/chrome-browser.json; evidence/r2/chrome-hands-clear.png; evidence/r2/chrome-side-contact.png | Minimum hand/front-edge gap during yaw 0.037079 m. Typing proximity 1.000-2.894 mm above actual key tops; endpoint mesh matches coding. |
| Coordinated turn and acknowledgment | PASS | evidence/r2/chrome-browser.json; evidence/r2/chrome-playback.webm | 125 degree chair/body yaw; maximum sampled nod 8.970 degrees; neutral endpoints. |
| Feet, seat and planted-foot stability | PASS | evidence/r2/chrome-browser.json; evidence/r2/msedge-browser.json | Sole range [-8.901702391431766e-09, 0.0519947772293823]; maximum seat-gap magnitude 6.29e-08 m. Independent baked foot roots fix between-key sliding. |
| Repeated turn/return and root drift | PASS | evidence/r2/chrome-browser.json; evidence/r2/msedge-browser.json | Five cycles in each browser; maximum absolute root error 1.86210863e-08 m, no accumulated translation. |
| Interruption, repeated input and instant safe coding pose | PASS | evidence/r2/chrome-browser.json; evidence/r2/msedge-browser.json | 25 sampled cancellations and 25 skips per browser; coalesced double sequence; no stale queue. Max measured reverse-path cancel 2.667 s; Skip/Escape instant. |
| Real exported browser playback and recordings | PASS | evidence/r2/chrome-playback.webm; evidence/r2/msedge-playback.webm | Actual requestAnimationFrame playback and canvas MediaRecorder; final asset hashes recorded; no console errors/failing requests. |
| Source/Blender/browser color parity approval | NOT RUN | evidence/r2/blender-greeting.png; evidence/r2/chrome-greeting.png | Matching camera position/target/vertical FOV; Cycles/AgX and WebGL/ACES lighting differ. Independent color/art approval not supplied. |
| Frozen dependency provenance | PASS | playback/package-lock.json; evidence/r2/prepare-dependencies.log; evidence/r2/vendor-verification.json | Exact pins installed only in unique external scratch; generated lockfile; vendored Three.js bytes equal installed package; MIT notice included. |
| Git commit and push | NOT RUN | evidence/r2/git-repository-check.command.json | git rev-parse exited 128: no repository. No remote was invented and no repository was created. |
| Database execution | NOT RUN | evidence/r2/capabilities.json | No configured project database used or tested; not required by W2. |
| Physical mobile, Safari, Firefox and performance budgets | NOT RUN | evidence/r2/capabilities.json | Chrome/Edge desktop feasibility only. No physical-device, cold-load network, sustained thermal, field-vitals or release-budget claim. |
| Independent motion/interface/provenance review and parent acceptance | NOT RUN | integration-handoff.md | Maker evidence only. Reviewer aliases not dispatched; no external-provider execution or self-approval claimed. |

The fixed browser recordings are [Chrome WebM](evidence/r2/chrome-playback.webm) and [Edge WebM](evidence/r2/msedge-playback.webm). Still evidence includes [coding](evidence/r2/chrome-coding.png), [hands withdrawn](evidence/r2/chrome-hands-clear.png), [greeting](evidence/r2/chrome-greeting.png), [return](evidence/r2/chrome-returned.png) and [side contact](evidence/r2/chrome-side-contact.png). The paired [Blender greeting](evidence/r2/blender-greeting.png) is a Cycles render of the reopened native source, not browser evidence. Both use camera (-2.15,1.72,2.10), target (0,.72,-.64), vertical FOV 44°, image/canvas 1140×800; browser full screenshots are 1440×900, DPR 1. Lighting and tone mapping differ and require art review.

| Canonical execution | Exit code | Log |
| --- | ---: | --- |
| `prepare-dependencies` | 0 | `evidence/r2/prepare-dependencies.log` |
| `environment` | 0 | `evidence/r2/environment.log` |
| `blender-arm-clearance` | 0 | `evidence/r2/blender-arm-clearance.log` |
| `blender-render-delivery` | 0 | `evidence/r2/blender-render-delivery.log` |
| `gltf-delivery` | 0 | `evidence/r2/gltf-delivery.log` |
| `chrome-delivery` | 0 | `evidence/r2/chrome-delivery.log` |
| `edge-delivery` | 0 | `evidence/r2/edge-delivery.log` |
| `git-repository-check` | 128 | `evidence/r2/git-repository-check.log` |

[commands.json](evidence/r2/commands.json) retains exact argv arrays, working directories, timestamps, exit codes and log paths for all captured commands, including failures. Failed native/interpolation and initial browser runs were corrected; the successful rows above bind to the delivered assets. `git-repository-check` exit 128 is the actual no-repository result. Environment version queries and vendor byte comparisons are captured separately. The implementation consulted the primary [Three.js AnimationAction](https://threejs.org/docs/pages/AnimationAction.html), [SkinnedMesh](https://threejs.org/docs/pages/SkinnedMesh.html) and [Khronos validator](https://github.com/KhronosGroup/glTF-Validator) documentation; execution used the pinned installed code and native Blender exporter.

Reproduce from the project root in PowerShell (no workspace node_modules):

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\deliveries\W2\prepare-proof.ps1
python .\deliveries\W2\capture-command.py rebuild -- 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --factory-startup --python-exit-code 1 --python 'C:/Users/yoray/Projects/Yor World/deliveries/W2/build-avatar-proof.py' -- --no-render
python .\deliveries\W2\capture-command.py render -- 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --factory-startup --python-exit-code 1 --python 'C:/Users/yoray/Projects/Yor World/deliveries/W2/render-native.py'
python .\deliveries\W2\capture-command.py validate -- node playback/validate-gltf.js
python .\deliveries\W2\capture-command.py chrome -- node playback/run-browser-tests.js chrome
python .\deliveries\W2\capture-command.py edge -- node playback/run-browser-tests.js msedge
node .\deliveries\W2\playback\serve.js
```

The preparation script creates a new unique external scratch directory and runs `npm ci --ignore-scripts --no-fund --no-audit` using the returned lockfile. Existing system Chrome/Edge are required; no browser/global installation is performed. Then open `http://127.0.0.1:8080/playback/index.html`. It is a loopback-only private diagnostic harness. Close with Ctrl+C. The standalone script may generate different binary hashes on another native run; re-run validation and record the new revision instead of reusing these screenshots or approvals. `render-native.py` can reopen/render a saved delivery without re-exporting. Packaging after successful checks is `python deliveries/W2/assemble-handoff.py`.

| Expected file | Returned / missing |
| --- | --- |
| `build-avatar-proof.py` | RETURNED |
| `avatar-proof.blend` | RETURNED |
| `avatar-proof.glb` | RETURNED |
| `fixture-proof.glb` | RETURNED |
| `asset-metadata.json` | RETURNED |
| `input-revisions.json` | RETURNED |
| `integration-handoff.md` | RETURNED |
| `render-native.py` | RETURNED |
| `prepare-proof.ps1` | RETURNED |
| `capture-command.py` | RETURNED |
| `playback/index.html` | RETURNED |
| `playback/proof.js` | RETURNED |
| `playback/serve.js` | RETURNED |
| `playback/run-browser-tests.js` | RETURNED |
| `playback/validate-gltf.js` | RETURNED |
| `playback/package.json` | RETURNED |
| `playback/package-lock.json` | RETURNED |
| `playback/vendor/THREE-LICENSE.txt` | RETURNED |
| `evidence/r2/blender-coding.png` | RETURNED |
| `evidence/r2/blender-hands-clear.png` | RETURNED |
| `evidence/r2/blender-greeting.png` | RETURNED |
| `evidence/r2/chrome-playback.webm` | RETURNED |
| `evidence/r2/msedge-playback.webm` | RETURNED |
| `evidence/r2/chrome-greeting.png` | RETURNED |
| `evidence/r2/chrome-side-contact.png` | RETURNED |
| `evidence/r2/export-inspection.json` | RETURNED |
| `evidence/r2/export-hierarchy.txt` | RETURNED |
| `evidence/r2/blender-measurements.json` | RETURNED |
| `evidence/r2/chrome-browser.json` | RETURNED |
| `evidence/r2/msedge-browser.json` | RETURNED |
| `evidence/r2/commands.json` | RETURNED |
| `evidence/r2/capabilities.json` | RETURNED |
| `report.md`, `changed-files.json`, `output-hashes.json`, `w2-avatar-proof-r2.zip`, `artifact-receipt.json` | RETURNED by this packaging run |

No required W2 source/export/harness/evidence file is missing. The ZIP contains the current proof and r2 evidence; preserved historical ZIP payloads remain local under history and are not nested in the current handoff ZIP. Its SHA-256 is in [artifact-receipt.json](artifact-receipt.json). Read files directly or serve them locally; opening the HTML through file:// cannot load modules/GLBs reliably.

Defects and limits: shared input hashes changed during the run and require parent reconciliation; current compatibility is a maker inspection only. Generic primitive/rigid-weight anatomy, mitten hands and coarse chair silhouette remain proof art; no likeness/final face/hair approval. Sampling does not establish continuous collision freedom or complete self-collision coverage. Reverse-path cancellation changes velocity abruptly at interruption and the proposed production blend windows remain unreviewed. Source/browser materials differ. Physical mobile/Safari/Firefox, performance budgets, G1 integration, final B2/B4 work and all independent reviews remain NOT RUN. Native Blender emits a Material.use_nodes deprecation warning for a future version; it does not fail the installed 5.2.2 run. Public asset rights/approval remain unassigned.

Next bounded step: the parent reconciles the original and handoff input revisions, then assigns Gemini-3 the exact motion/export hashes and supplies Claude-01/Claude-13 browser review packets with the interface/hierarchy and provenance/export records. Those reviewers distinguish supplied maker evidence from tests they actually execute; the parent accepts or returns corrections. Stop here. No later packet or integration has been started.
