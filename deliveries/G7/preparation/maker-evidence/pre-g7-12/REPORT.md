# PRE-G7-12 maker report: reference composition and mobile controls

**Result: FAIL / NOT PASS. Not accepted, not deployed, and G7 is not accepted.** This is the maker’s source-bound report, not an acceptance decision. Parent review remains pending.

## Revision and scope

- Packet/base status commit: 67026f26bb80d81de4edf632b3038b0239eea4de.
- Accepted PRE-G7-11 input source: cfdc744f69cd257c8ac0cbaad78b8805c48f20d5, app tree 915c26f4b9a1fa075614ea64959750f9e486187c.
- PRE-G7-12 final source commit: 133529868c8c7279831cbbffe35ab23178012b8c; resulting app tree 06f2b4ad62f8022bc4f2d410d67ffa197316e6ab.
- Evidence commit: exact SHA is reported to the parent alongside this file.
- Source diff: [scoped-source.patch](scoped-source.patch); nine owned app files changed.
- Source/model evidence: [GLB inventory and anchor audit](glb-anchor-source-audit.json); [visual anchor ledger](visual-anchor-ledger.json).
- Domain mirror audit: [final-mirror-audit.json](final-mirror-audit.json), PASS for source commit 1335298…, app tree 06f2b4…; 116 manifest source files, 96 tests mirrored, exact tracked Git-blob parity, and the intended yorayriniwnl.in base-URL override preserved.
- No deployment, DNS, provider configuration, model/GLB bytes, runtime lifecycle, route, or configuration changes.

The implementation updates scene-group placement and bounded light values, adds the authorized code-native secondary stand, adds a compact mobile control drawer while preserving existing semantics/focus/navigation, and adds focused unit/browser coverage. The final scoped placement moves the existing ai-real-camera root by [0.7, 0.35, 0.18]; its name and WorldInteractionBinding target are unchanged. ReferenceComposition guards repeated application to avoid compounding transforms.

## Visual findings

The accepted GLB remains unchanged at 861,364 bytes with SHA-256 3a02647d24e474c8a2579b0d277cf02a7841212e961c1554f67b6e032e40a307. The final live renders are [desktop 1440×900](attempt-11/screenshots/studio-reference-desktop-1440x900.png), [desktop/reference comparison](attempt-11/screenshots/studio-reference-desktop-1440x900-reference-comparison.png), [mobile 390×844](attempt-11/screenshots/studio-reference-mobile-390x844.png), and [mobile/reference comparison](attempt-11/screenshots/studio-reference-mobile-390x844-reference-comparison.png). These are the actual GLB/runtime scene, not a replacement illustration.

The visual target fails. The desk and blue chair are recognizable and the cyan floor pool is visible. The monitor is recognizable, but the two-speaker grouping is not; the left microphone renders, while the source inventory contains no named console node. The seven existing hex panels render as a washed-out pale wall patch rather than recognizable lilac hexes. The warm light bar reads neutral/dark. The left plant is clipped. The PC and pegboard are partly present but the resident/chair overlap them, and the single pale controller assembly is too small to recognize. The camera root is mesh-null in the GLB but has seven real mesh descendants; the new transform renders them in-frustum, at projected bounds about 40×53 pixels desktop and 13×19 pixels mobile. The result looks like a small hanging object/glyph rather than a recognizable camera seated on the shelf. Its interaction target remains reachable: clicking it navigated to /projects/ai-vs-real. Camera interaction PASS and camera visual recognition FAIL are separate findings.

The code-native stand is covered by a meaningful unit test but remains visually secondary/unclear; no headset model was added. Runtime emissive-strength rewriting was outside the packet and was not attempted. The per-anchor descriptions, source nodes, approximate screenshot regions, projected camera bounds, and limitations are in visual-anchor-ledger.json.

The closed compact HUD passed measured coverage: 2.21% at 1440×900, 8.01% at 390×844, 11.65% at 320×600, and 8.70% at 844×390; document width matched each viewport. The drawer kept all 25 prior semantic actions available, tested all controls for reachability/44px touch size, exercised keyboard traversal, Diagnostics-first Escape behavior and return focus, reduced motion, and portfolio navigation. This establishes responsive control mechanics, not visual composition acceptance. Measurements are under attempt-11/measurements/.

## Validation

Host: Node 24.19.0, pnpm 9.15.9. Browser: Playwright-managed HeadlessChrome 154 on Windows 10/Win32, emulated viewports, DPR 1, WebGL 2 on ANGLE Intel Iris Xe / D3D11. The phone dimensions are browser emulation, not physical devices.

| Check | Result and source provenance | Evidence / limitation |
|---|---|---|
| Focused composition and camera interaction browser test | PASS, 3/3 on final source 1335298… | attempt-11/logs/reference-composition-camera-interaction-node24.19.log; direct camera click reached /projects/ai-vs-real; responsive assertions covered 1440×900, 390×844, 320×600, 844×390. |
| Focused unit tests | PASS, 7/7 on final source 1335298… | attempt-11/logs/focused-unit-node24.19.log; composition behavior/idempotency and camera placement cases. |
| ESLint | PASS on final source 1335298… | attempt-11/logs/full-lint-node24.19.log. |
| TypeScript check | PASS on final source 1335298… | attempt-11/logs/typecheck-node24.19.log. |
| Production build | PASS on final source 1335298… | attempt-11/logs/production-build-node24.19.log. |
| Focused world recovery | PASS, 13/13 on prior packet source eceaabf4bcec60e399c42d8bfec4caddffad8bea (app tree f118cefabc1383b679c567e4cb57fb8a502d77af) | attempt-08/logs/focused-world-recovery.log; not rerun after the final camera-only delta, per parent direction. |
| Default full unit suite | FAIL, 317/318 on eceaabf4bcec60e399c42d8bfec4caddffad8bea | attempt-08/logs/full-unit-node24.19.log; unchanged tests/unit/boundaries.test.ts:139 exceeded its configured 5,000ms timeout. Project timeout was not changed. Not rerun after the final camera-only source delta. |
| Default full integration suite | FAIL, 284/286 on eceaabf4bcec60e399c42d8bfec4caddffad8bea | attempt-08/logs/full-integration-node24.19.log; unchanged production-camera.test.ts:174 failed exact float equality (-0.44999999999999996 vs -0.45) in the actual false-mobile entrance case, and unchanged canonical-fixture.test.ts exceeded its 60,000ms timeout. Tests/timeouts were not altered. Not rerun after the final camera-only delta. |
| Combined fullscreen/browser run | FAIL / remainder NOT RUN on prior packet source ecea… | attempt-08/logs/world-browser-e2e.log; first fullscreen test passed, next viewport case reached the existing 2-minute suite timeout and remaining cases were cancelled. The separate PRE-G7-12 responsive production run passed 3/3. |
| CandidateX production 404 guard | PASS, 1/1 on ecea… | attempt-08/logs/candidatex-404-production.log; no route change followed. |
| Clean-profile production browser smoke | PASS, 8/8 on ecea… | attempt-08/logs/clean-profile-production-smoke.log; no changes after this run affecting that shell. |
| Domain source mirror | PASS, audited against final source commit 1335298… | final-mirror-audit.json; exact Git blob parity and preserved URL override. |
| Physical iPhone/iPad Safari, Android Chrome/TalkBack, Windows NVDA, VoiceOver/Safari, ten-minute mobile soak | NOT RUN | Requires real-device sessions; browser emulation is not substituted. |
| Provider checks, production domain/DNS, sender-domain verification, deployment | NOT RUN | Explicitly outside this packet; no production changes were made. |

## Remaining status

Parent is the acceptance authority and must inspect this exact source/evidence revision. The visual anchors fail, so this maker result is not accepted and does not imply G7 readiness or deployment. Physical-device, provider, and deployment items remain NOT RUN.

The checksum tooling hashes exact Git blob content. After the checksum file is added, the verifier checks every listed source, mirror, input and evidence blob against the final evidence commit; the self-referential SHA256SUMS.json file is intentionally excluded from its own hash list.
