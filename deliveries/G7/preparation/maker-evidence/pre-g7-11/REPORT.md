# PRE-G7-11 maker report

## Source and delivery identity

- Parent branch/base: `codex/yorayriniwnl-in-site` at `9da8f5632cb0c54fe148f7a4995a52eb6735f410`.
- Accepted PRE-G7-10 input: `95729282af3d84b4e3158158546643935e737b7a`, app tree `e53f3ea9c6c80f471832e46d548206105699c32b`.
- PRE-G7-11 source commit: `cfdc744f69cd257c8ac0cbaad78b8805c48f20d5`, app tree `915c26f4b9a1fa075614ea64959750f9e486187c`.
- Domain delivery contains 115 mirrored `src/` files and two tests. Source and test copies match canonical app paths byte-for-byte, except the intentional `src/config/public-base-url.ts` override for `https://yorayriniwnl.in` (SHA-256 `415e2f1291d4adcf6d1bf4927668339c332e0ee85be602d97c6b23d269e4b4ca`). See `yorayriniwnl.in/source-delivery-manifest.json` and `source-delivery-manifest-generation.json`.

## Changes

Exact source changes in `cfdc744f` are `app/src/features/world/StudioLauncher.tsx`, `app/src/features/world/WorldRoot.tsx`, `app/src/features/world/world.module.css`, and new `app/tests/e2e/world-fullscreen.spec.ts`. The delivery mirror updates the matching three world source files, copies accepted `WorldRuntime.ts` and the runtime recovery test, and adds `yorayriniwnl.in/tests/e2e/world-fullscreen.spec.ts`; `yorayriniwnl.in/README.md` and `source-delivery-manifest.json` bind the local delivery identity and canonical URL override.

Studio entry opens a native modal before renderer measurement, returns focus on Escape/Exit, and keeps the stage and controls usable at tested viewport sizes. Responsive CSS keeps the studio full-height on narrow screens. Fallback action contrast is fixed. The browser test checks focus, control reachability, fallback contrast, and existing room camera presets. Existing room assets and approved routes remain in place. CandidateX remains unpublished.

## Validation

The canonical-worktree logs record their exact commands, working directories, and exit codes. Additional `*-clean-worktree` runs came from the sibling validation worktree and are identified by filename. The effective app-root toolchain was Node `24.19.0` and pnpm `9.15.9`; exact `where pnpm` and `pnpm --version` output is in `pnpm-effective-invocation.log` and `toolchain.json`. Next.js was `16.3.8`, Vitest `5.0.2`, and Playwright `1.63.0`. Raw command output, browser JSON, and screenshots are included alongside this report.

| Gate | Result | Evidence |
|---|---|---|
| Focused world recovery | PASS, 13/13 | `focused-recovery-clean-worktree.log` |
| Focused production fullscreen browser | PASS, 4/4 | `fullscreen-browser-v6-clean-worktree.log`, `fullscreen-browser-v6/` |
| Full lint | PASS, exit 0 | `lint-final-source.log` |
| Typecheck | PASS, exit 0 | `typecheck-final.log` |
| Full unit suite, default timeout | FAIL, 315/316; unchanged `boundaries.test.ts` exceeded its 5s test timeout | `unit-full-clean-worktree.log` |
| Full unit suite, 15s diagnostic override | PASS, 316/316; project-wide timeout unchanged | `unit-timeout-15s.log` |
| Full integration suite, default timeout | FAIL, 285/286; unchanged canonical-fixture test exceeded its 60s timeout | `integration.log` |
| Isolated canonical-fixture diagnostic | PASS, 1/1 in 37.29s with a 180s diagnostic limit; full suite remains failed | `integration-canonical-fixture-180s-diagnostic.log` |
| Production build after responsive CSS fix | PASS, exit 0 | `build-final-after-mobile-stage-fix.log` |
| CandidateX production route guard | PASS, 1/1; 404 with no candidate data leak | `route-guard-final-clean-worktree.log`, `route-guards-codex-final/` |
| Public shell browser suite | PASS, 8/8 | `public-shell-e2e.log`, `public-shell/` |
| Source-delivery mirror audit | PASS; 115 source files and 2 tests, no unexpected parity failures | `source-delivery-manifest-audit.log`, `source-delivery-manifest-generation.json` |

The fullscreen production browser run used a fresh Playwright context against the built app with `next start`. Each size measured the stage, canvas, and all 25 controls; all controls were reachable, with compact HUD groups using their scroll owners.

| Viewport | Dialog | Stage | Canvas | Controls | Unreachable | Controls requiring scrolling |
|---|---:|---:|---:|---:|---:|---:|
| 1440×900 | 1440×900 | 1440×900 | 1440×900 | 25 | 0 | 0 |
| 390×844 | 390×844 | 390×844 | 390×844 | 25 | 0 | 0 |
| 320×600 | 320×600 | 320×600 | 320×600 | 25 | 0 | 9 |
| 844×390 | 844×390 | 844×390 | 844×390 | 25 | 0 | 0 |

The sibling-worktree browser run records HeadlessChrome 153.0.0, Windows/Win32, DPR 1, WebGL 2, `contextLost=false`, and ANGLE Intel Iris Xe/D3D11. The canonical-worktree capture records HeadlessChrome 154.0.8037.99 on the same ANGLE renderer. Both are desktop browser-emulation runs, not physical-device or physical-GPU evidence. Captures include desktop, mobile, compact, landscape, scrolled compact HUD, modal focus return, fallback focus/contrast, four room camera presets, and desktop/mobile comparisons with the main reference.

The fullscreen entry test checks focus moves into the native dialog, Escape and Exit restore it to the remounted entry control, and the named destination navigation exposes Projects, About, Contact, and Résumé. The fallback test checks action contrast at 4.5:1 or higher, runs axe against the fallback, and verifies visible keyboard focus with an outline at least 2px wide. Captures: `screenshots/studio-entry-exit-focus-return.png` and `screenshots/fallback-actions-contrast-focus.png`.

The first About-link test failure was an ambiguous locator: the dialog intentionally exposes About in both the accessibility rail and destination navigation. The assertion now scopes the destination landmark. The `scrollIntoViewIfNeeded()` timeout waited for an animated HUD control to become stable; the test now measures stable viewport/scroll-owner geometry and verifies each control's reachability. `mobile-stage-height-failure.log` separately records the actual CSS defect: a mobile rule capped the fullscreen stage at 520px. The fullscreen-specific rule corrects that product bug in canonical and mirrored CSS.

The supplied hydration diff lists Dark Reader and Grammarly attributes injected on `<html>`/`<body>`; they are not rendered by the application root layout. No hydration-warning suppression or unrelated layout change was added. The forced WebGL failure test verifies the accessible fallback, while the captured WebGL contexts only describe these headless browser runs.

The scoped `git diff --check` review reports trailing whitespace only in captured terminal output and blank context lines in `scoped-source.patch`; those raw evidence files are preserved verbatim. The source, README, report, and manifest have no whitespace findings.

## Limits

The default full unit and integration commands retain the failures shown above; diagnostic reruns do not change those results. The domain pre-edit inventory was taken before the maker's domain edits; the final folder contains only `.env.example` as an environment file. It records preservation of `.accepted-source-stage` (241 files / 71 directories), `.next` (741 / 93), `node_modules` (37 top-level entries), and `test-results` (15 files / 1 directory). `scoped-source.patch` is the source diff. `SHA256SUMS.txt` contains SHA-256 hashes over exact Git blob bytes; `verify-delivery-evidence.mjs` reads the checksum list and every payload from the specified commit when a revision is supplied, or from staged/HEAD blobs in staged mode. This avoids platform checkout line-ending conversions changing the hashes.

Correction r1 records the audit finding, exact-commit verifier change, checksum regeneration, and raw commit-blob verification in `correction-r1/REPORT.md` and `correction-r1/verification.log`.

At mobile widths, the HUD panels cover much of the room. Control reachability passes, but useful room visibility and discovery and complete reference fidelity remain unestablished; this limitation is tracked in `product-fidelity-follow-up.md`.

Physical iPhone/iPad Safari, Android Chrome with TalkBack, Windows NVDA, VoiceOver with Safari, and the 10-minute mobile soak are **NOT RUN**. Deployment, public DNS/provider state, monitoring, rollback, and G7 acceptance were not performed. This maker report is not an independent audit or acceptance. **NOT DEPLOYED. G7 NOT ACCEPTED.**
