# PRE-G7-13E maker report — attempt 55

## Scope and source checkpoint

This attempt implements PRE-G7-13E only. The only product-source change is a responsive CSS rule in `app/src/features/world/world.module.css`; the same bytes were copied to `yorayriniwnl.in/src/features/world/world.module.css`, and only that source row was refreshed in the mirror manifest. No JSX, content, ARIA, links, tests, assertions, timeouts, chair transforms, scene/runtime code, routes, providers, or GLB bytes changed.

Base HEAD: `493b60d8a636b22dcf8b9af6f2c4258da5499e47` on `codex/pre-g7-13-anchor-articulation-isolated-20261014`.

The final desktop rule applies at `min-width: 900px` and `min-height: 600px`. It places the existing portfolio destination nav in a 8.75rem-wide vertical stack at the upper right, below the Studio toggle. Mobile, compact, and short-landscape continue using their existing responsive layout. Final app and mirror CSS SHA-256 (raw, mirrored, and normalized): `9b6c503205303a38ff5148afb6c9b4b6093c35683c0b5d22b2f08066e3cc05b4`.

The exact three-file source/manifest diff is preserved as `source-diff.patch` (SHA-256 `13f03dec310edcf6f244d50fadd3cb034c088c73a796bce3e64c0adef25cf1a7`, 2,862 bytes); generation details are in `source-diff.sha256.txt`.

## Raw closed-HUD captures and clearance

The final raw desktop capture is `screenshots/corrected-03/studio-reference-desktop-1440x900.png`; its same-page trace and clearance data are in `measurements/corrected-03/`. The final raw mobile capture is `screenshots/corrected-02/studio-reference-mobile-390x844.png`; its trace and clearance data are in `measurements/corrected-02/`. Both captures use `http://127.0.0.1:3133/?studio=enter&pre-g7-evidence=1`, have controls closed, and show a live HOME scene with one visible WebGL2 canvas and no fallback/context loss before and after the screenshot.

At 1440×900, the named portfolio nav is x=1288–1428, y=68–323.56. The existing Studio toggle ends at y=52, leaving a 16px gap. All five actions are 126.81×44px. All 34 measured anchor intersections have zero area, including `chair-base` and `pegboard_system`; the document has no horizontal overflow. Fixed chrome is 3.18% of the viewport.

At 390×844, the existing bottom nav remains in its mobile position. Its smallest action is 55.69×44px, fixed chrome is 8.01%, and document width equals viewport width. Nav/chair-base intersection area is zero. The raw image keeps the room and chair visible together.

The initial diagnostics in `iteration-01-initial-nav-sampler/` used a generic `nav` selector, so its nav measurements are invalid; the raw captures are preserved. The 9.25rem trial in `iteration-02-width-9.25-rem-pegboard-overlap/` is a failed iteration: it overlapped the projected pegboard anchor by 63.71px². The final 8.75rem rule shifts the nav's left edge to x=1288 and clears that overlap. The `corrected-02` desktop PNG is also preserved but invalid as final visual evidence: its trace changes from live HOME/WebGL2 before screenshot to no canvas plus static fallback afterward. It is excluded from the final gate. The fresh `corrected-03` desktop capture is live and valid.

The unchanged default visual E2E also produced viewport evidence under `visual-e2e/`: 1440×900, 390×844, compact 320×600, and short landscape 844×390, including the control checks.

## Validation

Runtime for build, browser lane, unit, typecheck, lint, and mirror verification: official portable Node `v24.19.0`, matching `app/package.json`'s `>=24.19.0 <25` engine.

| Check | Command | Result | Evidence |
|---|---|---|---|
| Production build | `pnpm build` with `NEXT_PUBLIC_PRE_G7_13_EVIDENCE=1` | PASS, exit 0 | `build-02.log`, `build-02.exit.txt` |
| Visual composition and controls | `pnpm exec playwright test tests/e2e/world-reference-composition.spec.ts` with the existing evidence env and default config | PASS, 16/16, exit 0 | `visual-e2e.log`, `visual-e2e.exit.txt`, `visual-e2e/` |
| Unit suite | `pnpm test:unit` | FAIL, exit 1; 23 files passed/2 failed, 319 tests passed/2 failed | `unit.log`, `unit.exit.txt` |
| Typecheck | `pnpm typecheck` (`tsc --noEmit`) | PASS, exit 0 | `typecheck.log`, `typecheck.exit.txt` |
| Lint | `pnpm lint` (`eslint . --max-warnings=0`) | PASS, exit 0 | `lint.log`, `lint.exit.txt` |
| Mirror/manifest | `node deliveries/G7/preparation/maker-evidence/pre-g7-13/attempt-55/verify-mirror.mjs` from repo root | PASS, exit 0; 116 source + 9 test rows; 125/125 normalized pairs; CSS pair byte-identical; unchanged manifest rows preserved | `mirror-verification.log`, `mirror-verification.exit.txt`, `mirror-verification.json` |
| Whitespace check | `git diff --check -- app/src/features/world/world.module.css yorayriniwnl.in/src/features/world/world.module.css yorayriniwnl.in/source-delivery-manifest.json` | PASS, exit 0; Git reports checkout EOL-conversion notices only | `diff-check.exit.txt` |
| Frozen model | SHA-256 of `app/public/models/production-room-full.glb` | PASS, `3a02647d24e474c8a2579b0d277cf02a7841212e961c1554f67b6e032e40a307` | `frozen-glb-sha256.txt` |

The two unit failures are retained without changing tests or timeouts. `tests/unit/reference-composition.test.ts:123` expects `chairRoot.position.x` to be close to `0.5` but receives `0.35`. `tests/unit/boundaries.test.ts:139` exceeds its existing 5,000ms timeout. These failures concern the prior composition/boundary lane, not the CSS-only PRE-G7-13E edit.

## Mirror and EOL notes

The all-row verifier confirms 125 normalized source/test pairs, with 14 currently byte-identical in this checkout. The changed CSS source/mirror pair is byte-identical and its raw hashes match the manifest. All other manifest rows are unchanged from the committed baseline. The domain public-base override remains untouched and tracked-clean; its worktree bytes differ from the committed blob only by checkout EOL conversion, while normalized content and committed hash remain preserved.

`evidence-file-hashes.json` was generated from the staged Git index blobs using one `git cat-file --batch` pass. It records 182 staged source/evidence entries (excluding the inventory file itself), their blob OIDs, raw byte counts, and SHA-256 values; the only other staged path is the inventory file itself. The inventory helper rejects paths outside the three owned source/manifest files and `attempt-55/`.

## Changed-path boundary and disposition

The intended product-source paths are exactly:

- `app/src/features/world/world.module.css`
- `yorayriniwnl.in/src/features/world/world.module.css`
- `yorayriniwnl.in/source-delivery-manifest.json`

All other intended changes are confined to this `attempt-55/` evidence directory. Parent-owned packet files and earlier attempt evidence are excluded. This is a maker checkpoint only; no PRE-G7-13E or G7 acceptance is claimed. Commit and remote result will be added after the scoped source/evidence commit.
