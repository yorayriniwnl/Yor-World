# PRE-G7-13 maker report

Status: **maker candidate delivered; independent audit and acceptance pending**. The attempt-50 desktop and mobile visuals were reviewed by the parent as a viable candidate. This report does not self-accept the work.

The source candidate is commit `8bc0db9b1572e3603000cbc657a3d04a3dabf0d7`, with app tree `7e5ca476b9b9b5544942a3f1229f540dd99b9d8e`, based on the failed PRE-G7-12 source `133529868c8c7279831cbbffe35ab23178012b8c` / app tree `06f2b4ad62f8022bc4f2d410d67ffa197316e6ab`. Its immediate packet base is `0a73f307d078cc531f09bbc4ae7a5dfef2eedd01`. The accepted PRE-G7-11 input remains commit `cfdc744f69cd257c8ac0cbaad78b8805c48f20d5` / app tree `915c26f4b9a1fa075614ea64959750f9e486187c`. The governing packet files are `docs/planning/reconciliation-packets/2026-10-14-pre-g7-13-anchor-articulation.md` and `docs/planning/reconciliation-packets/2026-10-14-pre-g7-13-a1-hex-panel-shape.md`.

The implementation uses bounded, in-memory composition/material calibration, the packet-authorized six-sided runtime panel correction for the seven existing named panel nodes, and the authorized code-native controller, compact audio console, and headset/stand. The existing GLB bytes remain unchanged. The final plant adjustment moved the four existing monstera leaves down 0.12 m relative to the pot and stand, leaving a visible foliage/pot overlap in both opening views. Runtime recovery/lifecycle policy and the out-of-scope production camera exact-float integration test were not changed. No provider, deployment, or DNS configuration changes were made.

## Candidate evidence

The frozen visual result is in [attempt-50](attempt-50/). The paired raw production-view screenshots are [`studio-reference-desktop-1440x900.png`](attempt-50/screenshots/studio-reference-desktop-1440x900.png) and [`studio-reference-mobile-390x844.png`](attempt-50/screenshots/studio-reference-mobile-390x844.png). The strict browser run is [`strict-browser.log`](attempt-50/strict-browser.log), with its projected anchors under [`measurements/`](attempt-50/measurements/).

The plant summary reports the pot center inside the foliage envelope in both views. At 1440×900 the foliage/pot overlap is 74.98 px horizontally and 57.78 px vertically. At 390×844 the overlap is 30.53 px horizontally and 21.81 px vertically. The raw captures were reviewed alongside those measurements; bounds alone are not the recognition claim.

The strict browser run used the normal opening view and scale, evidence mode enabled, and no test panel scale. It passed 3/3: desktop reference composition and anchors; fresh mobile compact mode, Diagnostics-first Escape, and all controls; compact drawer/touch behavior at 320×600 and short landscape 844×390. Parent review found the seven-panel cluster and required room anchors recognizable in both final views, with the plant reading as a stylized potted plant. Formal visual acceptance remains with the independent auditor and parent.

Attempt-24 was preserved. Its 13 files were previously compared against the pre-sweep hashes by the parent with zero changed or removed; this maker run did not edit those files. The six attempt-24 PNGs all have the same SHA-256 (`b7f5388a20c009c64baa5125a165ce17bc0790513d93b4410b348e3f06b0a94`), so those screenshots remain historical diagnostics and are not used as proof that the swept speaker transforms rendered. The final checksum inventory records their current hashes as an additional frozen inventory.

## Validation results

All commands ran from `app/` with Node 24.19.0 and pnpm 9.15.9 unless a log shows a Playwright invocation. Logs are in `attempt-50/`.

| Gate | Result | Evidence |
| --- | --- | --- |
| Focused composition unit test | PASS, 3/3 | `focused-unit.log` |
| Full ESLint | PASS, exit 0 | `full-lint.log` |
| Full typecheck | PASS, exit 0 | `full-typecheck.log` |
| Full unit suite | PASS, 26 files / 323 tests | `full-unit.log` |
| Full integration suite | **FAIL**, 284/286 tests | `full-integration.log` |
| Isolated canonical fixture test, default timeout | PASS, 1/1 in 23.2s | `canonical-fixture-isolated.log` |
| Renderer recovery + fullscreen E2E | PASS, 13/13 | `focused-recovery-fullscreen.log` |
| PRE-G7-13 strict responsive browser suite | PASS, 3/3 | `strict-browser.log` |
| CandidateX 404 guard | PASS, 1/1 | `candidatex-404.log` |
| Clean-profile public shell smoke | PASS, 8/8 | `clean-profile-public-shell.log` |
| Flag-off production build | PASS, exit 0 | `flag-off-production-build.log` |
| Domain mirror parity | PASS, 117 source files + 8 scoped tests, zero raw mismatches | `mirror-sync-audit.json`, `mirror-final-sync.log`, `../source-delivery-manifest.json` |

The full integration failure is retained without changing its test or timeout. `tests/integration/production-camera.test.ts:174` compares `[0.30000000000000004, 2.22, 1.43]` to `[0.3, 2.22, 1.43]` using deep equality. `tests/integration/platform/canonical-fixture.test.ts` separately timed out at its unchanged 60-second default; the same fixture test passed in isolation at that same default timeout. The isolated pass does not convert the full suite result to PASS.

## Limitations

Physical-device tests are **NOT RUN**: iPhone/iPad Safari; Android Chrome with TalkBack; Windows NVDA; VoiceOver with Safari; and the requested 10-minute mobile soak. Current browser results use Chromium viewport/device emulation and do not substitute for those sessions.

This is local-only work. No production deployment, DNS, or provider configuration change was made, and no real-device sign-off is included. Full integration remains FAIL as recorded above; acceptance remains pending independent audit.

The source-delivery manifest is refreshed at [`yorayriniwnl.in/source-delivery-manifest.json`](../../../../../yorayriniwnl.in/source-delivery-manifest.json), bound to the exact source commit and app tree. The manifest confirms 117 canonical source files and 8 scoped test files are byte-identical to the domain mirror, and preserves the intentional `src/config/public-base-url.ts` override at `https://yorayriniwnl.in` (SHA-256 `bcd4c0eb4681b707c2a6ead176ec38592693f4c8008390d25cddfe702140e530`).
