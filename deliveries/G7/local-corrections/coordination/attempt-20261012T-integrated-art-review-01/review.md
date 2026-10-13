# Integrated art review — attempt 01

**Disposition: REWORK**  
**Scope:** Read-only Chrome visual review of environment `build-attempt-18`, fixture `fixture-attempt-06`, and the runtime source tree recorded in `report.json`. This is candidate evidence only; it is not release acceptance or production verification.

## Evidence binding

- Browser: Chrome 155.0.8059.39 on NVIDIA GeForce RTX 2060 / Direct3D11.
- Captures: 12 PNGs across six HOME viewports and six interaction views.
- Runtime source hashes: stable before and after capture (`sourcesStable: true`).
- Browser diagnostics: 0 page errors and 0 failed requests.
- Environment GLB: 1,648,360 bytes, SHA-256 `fc2b17593927b82905750d63ce1df678d9d1d9f9f91e69de1bb3890dfa8e1f3a`.
- Fixture GLB: 391,396 bytes, SHA-256 `5957f5d3c9121ba332ef545b4f304b85244afee0371c171ccf18f0c93eb83dab`.
- Reference image SHA-256: `37adfb0ee344642798978e954a0cfc8d9715eac1b3ca4e5a84ab87a228c53362`.
- Asset manifest SHA-256: `1f432a4a42564e017b5c6377fd6e58a0916656c378ee6a2fa9b474130a990d29`.
- Each capture recorded one resident, one chair root/base, one desk and zero fixture-static nodes. Exact per-capture paths, hashes, URLs, camera state and renderer diagnostics are in `report.json`.

## Findings

1. **Desktop and wide HOME framing — REWORK.** A large, dark monstera in the lower-left foreground covers a substantial portion of the room and desk. It is visible at 1440×1000, 1920×1080, 1024×768 and 844×390. It obstructs the main composition relative to `references/images/main-reference.png`.
2. **Portrait HOME framing — REWORK.** The resident is clipped at the right edge at both 390×844 and 320×600. The resident, monitor and current object need to fit above the controls at both target sizes.
3. **Greeting capture — not usable as greeting evidence.** `greeting-1440x1000.png` exactly matches `scanner-1440x1000.png`; the camera remained on the `scanner` preset when the screenshot was taken. The capture script did not establish a greeting camera state.
4. Other interaction captures are retained as diagnostic screenshots, not acceptance evidence. The reverse-doorway capture shows a close, cropped face and should be reconsidered during the next full visual pass.

## Required corrections

- Art owner: move the complete monstera group rearward in runtime Z while preserving the documented camera pose and plant components; generate a new unique environment export and renders. Keep the fixture source unchanged unless separate evidence demonstrates a fixture defect.
- Runtime owner: adjust only the mobile HOME camera so the resident is fully framed at 390×844 and 320×600, keeping desktop HOME pose unchanged and preserving monitor/object readability and control clearance.
- Parent: rerun a new integrated review attempt against the frozen corrected art and runtime inputs. Do not overwrite this attempt or update public assets/manifest until the replacement review passes.

## Checks and limits

- **PASS:** capture completed; source hashes stable; all twelve captures saved; no page errors or failed requests; expected asset/node counts present.
- **FAIL:** visual HOME composition at desktop/wide and portrait targets, as detailed above.
- **NOT RUN:** app build, full browser E2E suite, Edge capture, provider/deployment checks, manual/physical checks, and production acceptance.
