# PRE-G7-22 maker report

Prepared 2026-10-16. This is local-only maker evidence; independent review and parent acceptance remain pending.

The source correction is commit 63756c058de7fec92ba9699b327667207fe48488 (tree 59b3b17f2bb49af80e7fa0b0ea642d25528c01b2; canonical app tree a166d5c01473aec366305bdfaa68d27cf665d0ec). Its README and source-delivery-manifest binding is commit 2caf06cefc4a06bdf58e3a62c085be0e7c833aa9. The untouched base was fc64a18a7ec1d027fb0a33400c2fcd6288d6afbf, app tree 0804688e4cdd55960e71a19efc8384d4a2f0d071. Governing packet commit: c35dcf26d95f430c86a6df1a188059dc0fcddc31; C1 evidence-build flag commit: 44d639a1d313c1c6f50ea76dbbc5cc0db8a67875.

Source changes are limited to the authorized camera, reference-composition, lighting, directly relevant unit/E2E tests, and their yorayriniwnl.in mirrors plus README/manifest. No GLB or fallback/lifecycle/quality policy code changed. The frozen production-room GLB remains SHA-256 3a02647d24e474c8a2579b0d277cf02a7841212e961c1554f67b6e032e40a307. The source/mirror audit checked 125 manifest paths and found zero normalized parity failures.

## Required checks

| Check | Result | Command / exit | Evidence and reason |
|---|---|---|---|
| Untouched baseline and final captures | PASS | Baseline capture and isolated final E2E; exit 0 | baseline/ and visual-run/screenshots/; baseline plus raw 1440x900, 390x844, 320x600, and 844x390 screenshots, with 1440x900 and 390x844 reference comparisons |
| Final composition and compact-control browser E2E | PASS | pnpm exec playwright test tests/e2e/world-reference-composition.spec.ts; exit 0, 6/6 | visual-run/commands/final-e2e.receipt.json and raw stdout/stderr; Chrome and Edge each passed desktop composition, phone semantic actions/Escape, and compact portrait/landscape controls |
| Unit tests | PASS | pnpm run test:unit; exit 0, 327/327 | visual-run/commands/test-unit.receipt.json and raw stdout/stderr |
| Lint | PASS | pnpm run lint; exit 0 | visual-run/commands/lint.receipt.json and raw stdout/stderr |
| Typecheck | PASS | pnpm run typecheck; exit 0 | visual-run/commands/typecheck.receipt.json and raw stdout/stderr |
| Required post-E2E production build | PASS | pnpm run build; exit 0 | visual-run/commands/post-e2e-build.receipt.json and raw stdout/stderr. A separate successful build prepared the isolated E2E server and is retained as final-build.* |
| Integration run 1 of 2 | FAIL | pnpm run test:integration; exit 1, 285/286 | visual-run/commands/integration-01.*; frozen-world-binding.test.ts:63 expected resident x=0.3, while the authorized desktop composition transform moves it to x=1.5 |
| Integration run 2 of 2 | FAIL | pnpm run test:integration; exit 1, 285/286 | visual-run/commands/integration-02.*; same single assertion and measured difference of +1.2 m; these are the only two integration invocations |
| Source/mirror parity | PASS | node runner/audit-source-mirror.mjs 63756c058de7fec92ba9699b327667207fe48488; exit 0 | source/mirror-parity-audit.json; 125 paths checked, 0 parity failures |
| Projected composition thresholds and named-anchor visibility | PASS | Covered by the isolated E2E; exit 0 | visual-run/measurements/*projected-anchor-snapshot.json and anchor-visibility files. Chrome and Edge: desktop monitor 30.3%, seven-hex cluster 27.1%, desk 63.3%; phone monitor 41.1%, cluster 36.2%. All asserted anchors passed the E2E bounds/visibility and color checks |
| Closed HUD area and horizontal overflow | PASS | Covered by the isolated E2E; exit 0 | visual-run/measurements/*closed-chrome.json; maximum measured fixed chrome is 11.65% and every document width equals its viewport |
| Triangle budget | PASS | Runtime diagnostics captured by E2E | 28,736 desktop triangles against 300,000; 28,592 phone triangles against 140,000 |
| Draw-call budget | FAIL | Runtime diagnostics captured by E2E | Desktop measured 412 calls against 120; phone measured 400 against 80. At 320x600 and 844x390, 414 calls were measured. No performance policy or budget was relaxed |
| Independent human visual review | NOT RUN | No command; reviewer must inspect exact pushed commits | Required reviewer must record anchor-by-anchor judgments beside the reference; maker does not self-accept |
| Physical iPhone/iPad Safari, Android Chrome/TalkBack, Windows NVDA, Safari/VoiceOver, and 10-minute mobile soak | NOT RUN | No command | These are explicitly excluded by PRE-G7-22 and require real hardware/screen readers; viewport emulation is not device testing |
| GUI chrome://gpu capture | NOT RUN | Isolated headless Chrome attempts returned no internal-page data | The attempt is documented in local-machine-chrome-gpu-attempt.md. Playwright did capture WebGL 2.0 and the Intel Iris Xe ANGLE renderer in browser-environment measurements |
| Providers, database, domain/sender verification, deployment | NOT RUN | No command | Outside the local-only packet boundary |

## Visual and browser observations

The final Chrome and Edge measurements show the required desktop and phone monitor/hex/desk minimums. Closed fixed chrome stays below 20% and there is no horizontal overflow at any required viewport. The E2E also verifies seven distinct pink/lilac panel samples, cyan fill in exposed floor regions, warm monitor-bar pixels, the paired speaker bounds, semantic action availability, focus on opening studio controls, Diagnostics-first Escape handling, and compact phone/landscape controls. These automated checks do not substitute for the required independent human fidelity review.

The captured renderer reports WebGL 2.0 (OpenGL ES 3.0 Chromium), contextLost=false, on ANGLE / Intel Iris Xe Graphics / Direct3D11. This establishes the local Playwright browser context only. It does not establish the state of the user's normal Chrome GUI profile. The user-provided hydration diff names attributes inserted by Dark Reader and Grammarly extensions; the captured page log does not show that same hydration warning. The final browser log does contain two generic 404 resource errors without URLs, retained in visual-run/desktop-composition-browser.log and left unresolved.

The local ports 127.0.0.1:3000 and 127.0.0.1:3002 each returned HTTP 200 when checked. Port 3002 was already listening; this work did not replace or restart that pre-existing process.
