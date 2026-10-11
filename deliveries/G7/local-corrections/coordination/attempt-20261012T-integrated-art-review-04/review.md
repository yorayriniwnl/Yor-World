# Integrated art review - attempt 04

**Disposition: VISUAL HOME REVIEW PASS WITH CAPTURE-DIAGNOSTIC LIMITATION - NOT ACCEPTED**

**Scope:** Read-only Chrome review of the frozen `build-attempt-19` environment export, `fixture-attempt-12` resident fixture, and committed mobile camera correction. This is candidate evidence only; it is not product, release, or production acceptance.

## Evidence binding

- Art correction commit: `5cfe3c4783f95ca6df8571f9126adc46afa206e3`.
- Runtime camera correction commit: `dc091502ddfc393bea594d770dbb3fe2459fe436`.
- Browser: Chrome `155.0.8059.39`, NVIDIA GeForce RTX 2060 / Direct3D11.
- Captures: 12 PNGs. Source hashes stable before/after (`sourcesStable: true`); 0 page errors.
- Environment: `production-room-full.glb`, 1,648,372 bytes, SHA-256 `52ec834e1ceb2dd2b7b0b65512bfa60489d4777514f070a18fce7e4b87f79ae4`.
- Resident fixture: `fixture-production.glb`, 391,396 bytes, SHA-256 `ce05bcbd0033b685b1cdb91fa1591fd366653fc7fd6d7409c1a4efacb508c1fe`.
- Resident model: 575,900 bytes, SHA-256 `b15000feb4738d14aa1d41a43f01ba377f7011dbe1c95b3478c1200d12f4411d`.
- Asset manifest SHA-256: `1f432a4a42564e017b5c6377fd6e58a0916656c378ee6a2fa9b474130a990d29`.
- Main reference SHA-256: `37adfb0ee344642798978e954a0cfc8d9715eac1b3ca4e5a84ab87a228c53362`.
- Capture report SHA-256: `6177c4610220eb796c504d2377e33e53df45a0ce7d120d044690541742acb6a3`; network probe JSON SHA-256: `b51107e9d8fec52c724a288490da696cf6fbaeb6acb7423e5de13ab2f7919b1`.
- Harness source hashes: `art-harness.html` `6a56e2ce107bbc8b171e6b6f0b9c777e9daa8d639948615631c3e88a3fddd1be`; `capture.cjs` `f045e407b03884f6458c5992403e09a761873714bc12458d0af9903eaa7e7f1f`; `server.cjs` `033c2bb60ea06943477d70bac36e312231b86ac27e9d9cd2aef8dfaee705da70`; `network-probe-01.cjs` `97e4c4361bab4fc0576a20f306a9f906f4bc6c9093153ee57e4fcf16cadaad57`.
- Exact per-capture hashes, camera/node state, request/response logs, and inputs are preserved in `report.json`.

## Findings

1. **HOME composition at reviewed sizes - visual PASS.** The large monstera no longer covers the monitor or working surface. It sits in the lower-left foreground, consistent with the main reference's plant placement. Desktop captures at 1440x1000, 1920x1080, and 1024x768 retain the white/cyan workstation, blue chair, and pink lights. The 844x390 landscape and 390x844 / 320x600 portrait screenshots keep the resident, monitor, and desk in frame.
2. **Narrow portrait chair clearance - PASS WITH LIMIT.** Mesh projection evidence gives 7.1 px of right-edge clearance for the chair at 320x600. It is technically in frame but visually close to the edge. The harness has no actual product controls, so clearance above UI overlays is **NOT RUN**.
3. **Capture network diagnostics - FAIL for a clean-network capture.** The 320x600 and 844x390 capture pages each logged `net::ERR_ABORTED` for the candidate full-room GLB after a response with HTTP 200. Both screenshots still rendered and recorded expected scene nodes. A separate single-page 320x600 probe recorded HTTP 200 and `bodyFinished: complete` for that GLB, with zero request failures and zero page errors through page close. This is consistent with a capture/page-teardown race, but does not prove its cause and does not clear the 844x390 abort. The full capture remains diagnostically limited.
4. **Greeting - NOT RUN as greeting evidence.** The `greeting-1440x1000.png` screenshot shows the resident back at the coding pose; the 4.2-second capture delay outlasts the greeting sequence. The image is retained as a HOME diagnostic, not proof of the greeting state.
5. **Reverse doorway - still a tight, cropped face view.** This is not part of the HOME composition pass and remains a separate visual follow-up. The `about`, `pc`, `scanner`, and `monitor` images are diagnostic views; the harness does not verify their actual UI interactions.
6. **Browser environment caveat.** Request logs contain injected requests to `gc.kis.v2.scr.kaspersky-labs.com`. No causal link to the GLB aborts is established. A clean-profile recapture would help resolve the capture diagnostic.

## Checks and limits

| Check | Result | Evidence | Notes |
| --- | --- | --- | --- |
| Frozen candidate/input binding | PASS | `report.json` | `build-attempt-19`, `fixture-attempt-12`, committed runtime source; source hashes stayed stable. |
| HOME visual framing | PASS for reviewed captures | `captures/home-*.png` | Human visual review at six viewports; does not establish UI overlay clearance or physical-device behavior. |
| Render/page errors | PASS | `report.json` | 0 page errors; expected resident/chair/desk nodes present in all captures. |
| Clean network during multi-view capture | FAIL | `report.json` | Two full-room GLB requests logged `net::ERR_ABORTED` after HTTP 200. |
| Single-page 320x600 GLB transfer | PASS | `network-probe-01.json` | HTTP 200, body complete, 0 request failures, 0 page errors before/after close. Cause of multi-view aborts remains unproven. |
| Greeting pose | NOT RUN | `captures/greeting-1440x1000.png` | Captured after the animation had returned to coding pose. |
| Actual UI/control overlay and interaction behavior | NOT RUN | - | Not present in this read-only art harness. |
| Full application build, full browser E2E, Edge, provider/deployment, manual/physical checks | NOT RUN | - | Outside this visual harness attempt. |
| Public manifest/model publication and G7 acceptance | NOT RUN | - | Candidate assets remain unpublished and unaccepted. |

`git diff --cached --check` reports only extra blank lines at EOF in `capture.cjs` and `server.cjs`; those executed harness sources are preserved byte-for-byte. The review report itself has no trailing whitespace.

The public manifest and public model files were not changed by this review. Preserve attempts 01-03 and this attempt as separate evidence; do not replace their reports or screenshots. The candidate can proceed to the next separately authorized audit step, but this report does not approve canonical integration or G7.