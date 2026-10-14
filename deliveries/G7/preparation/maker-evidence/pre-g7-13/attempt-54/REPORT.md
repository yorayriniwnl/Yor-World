# PRE-G7-13D attempt 54

## Candidate

- Branch: `codex/pre-g7-13-anchor-articulation-isolated-20261014`
- Starting HEAD: `300df7cc04be268c39e16c2c8f49d98070d80b83`
- App source SHA-256: `124243becac1032b96aaf570f6bd794118e320d91c4eaa49884700e78141db9a`
- Changed implementation: only the existing `chair-root` and `chair-base` transforms in `app/src/features/world/ReferenceComposition.ts` and its byte-identical mirror. Root position is `(0.05, 0, -0.735)`, base position `(0.2, 0, -0.885)`, shared yaw `18°`, root scale `[0.55, 0.95, 0.55]` bottom anchored, and base scale `[0.75, 1, 0.75]`. Chair base remains 0.15 world units behind the seat group. No geometry, GLB, camera, resident, desk, lighting, test, timeout, or runtime-policy changes.
- Attempts 49–53 are retained as prior failed/invalid iterations. Attempt 53's failed mobile capture and its fresh desktop-context retry remain separately labeled in that directory.

## Attempt-54 raw captures

Closed-HUD source-bound screenshots:

- [Desktop 1440×900](screenshots/studio-reference-desktop-1440x900.png)
- [Mobile 390×844](screenshots/studio-reference-mobile-390x844.png)
- Same-frame browser/renderer traces and anchor diagnostics are under `measurements/`.

Both capture traces stayed on the HOME scene: canvas present, fallback counters `0/0`, WebGL context not lost before or after, zero recorded WebGL context-loss/restoration events, and zero page errors. One generic console 404 was recorded. The images were captured by the separate attempt-54 capture script against the fresh production build.

The seat, backrest, and caster base are visible together in the raw pair. In desktop, chair-root projected bounds are x `762.55–969.68`, y `488.77–816.57`; chair-base bounds are x `803.94–974.56`, y `704.26–899.86` with visible-area ratio `1.0`. The bottom navigation overlaps `6,783 px²` (about `20.32%`) of the chair-base projected bounding box, including part of the caster region. In mobile, chair-root bounds are x `208.54–280.21`, y `346.91–453.91`; chair-base bounds are x `221.54–278.90`, y `425.10–484.61`, fully in the viewport.

Chair-first-hit counts use 81 projected samples per target. Desktop: desk `2/81`, monitor `4/81`, right speaker `0/81`. Mobile: desk `1/81`, monitor `5/81`, right speaker `1/81`. All three target bounds have visible-area ratio `1.0` in both views. Full measurements remain in `measurements/desktop-1440x900-anchor-diagnostics.json` and `measurements/mobile-390x844-anchor-diagnostics.json`.

## Validation

All commands ran from `app/` with portable Node `v24.19.0` (the package requires `>=24.19.0 <25`). Per-command logs, exit files, and Node version files are in this directory.

| Check | Command | Result |
|---|---|---|
| Production build | `pnpm build` | PASS, exit 0 (`build.log`, `build.exit.txt`) |
| Focused visual composition | `pnpm exec playwright test tests/e2e/world-reference-composition.spec.ts` | PASS, 16/16, exit 0, 8.8m (`visual-e2e.log`, `visual-e2e.exit.txt`) |
| Full unit suite | `pnpm test:unit` | FAIL, exit 1: 319/321 tests passed; 2 failed (`unit.log`, `unit.exit.txt`) |
| Typecheck | `pnpm typecheck` | PASS, exit 0 (`typecheck.log`, `typecheck.exit.txt`) |
| Lint | `pnpm lint` (`eslint . --max-warnings=0`) | PASS, exit 0 (`lint.log`, `lint.exit.txt`) |

The unit failures are preserved without changing tests or timeouts:

1. `tests/unit/reference-composition.test.ts:123` expects `chairRoot.position.x` close to `0.5`; the candidate produces `0.35` (difference `0.15`, tolerance `0.005`).
2. `tests/unit/boundaries.test.ts` fails its integrated dependency-boundary check with Vitest's default timeout message. The full failure context is in `unit.log`.

The first visual-E2E invocation failed its preflight because port 3133 was occupied by the separate raw-capture server; that record is preserved in `visual-e2e-port-conflict.log` / `.exit.txt`. I stopped that attempt-54 server, then reran the unmodified default Playwright command. The successful run used fresh Playwright-managed servers and completed all 16 cases in 8.8 minutes.

## Mirror and frozen model

- `mirror-verification.log` / `.exit.txt`: PASS, exit 0. The manifest contains 116 source rows and 9 test rows; all 125 normalized pairs match, 13 pairs are raw-byte equal, the changed ReferenceComposition pair is raw-byte identical, and all unchanged manifest rows are preserved. The canonical base-URL override matches the committed manifest hash and normalized content; its worktree byte difference is checkout EOL conversion only.
- Frozen `app/public/models/production-room-full.glb` SHA-256: `3a02647d24e474c8a2579b0d277cf02a7841212e961c1554f67b6e032e40a307` (`glb-sha256.txt`).

## Staged scope and inventory

- `git diff --cached --check` returns 1 because preserved raw build/capture logs contain trailing whitespace and extra blank lines at EOF. Those logs are kept byte-for-byte as captured.
- `git diff --cached --check -- app/src/features/world/ReferenceComposition.ts yorayriniwnl.in/src/features/world/ReferenceComposition.ts yorayriniwnl.in/source-delivery-manifest.json` passes with exit 0.
- The staged candidate contains 226 paths: the three implementation/mirror/manifest paths and maker evidence under attempts 49–54. A staged-path audit found zero paths outside those exact scopes.
- `evidence-file-hashes.json` is generated from staged Git object bytes in one `git cat-file --batch` operation. It verifies each indexed blob's Git object ID and records 225 paths, excluding the inventory file itself.

## Scope and status

The complete candidate diff is limited to the app composition source, corresponding mirror source, the corresponding manifest row, and PRE-G7-13 maker evidence attempts 49–54. No packet document or unrelated path is part of this candidate. This report records maker evidence only; it does not claim PRE-G7-13D acceptance, G7 acceptance, deployment, or physical-device verification.
