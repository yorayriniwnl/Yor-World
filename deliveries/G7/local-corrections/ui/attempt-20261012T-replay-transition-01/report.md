# Replay during transition correction — attempt 01

Status: **bounded Worker 3 correction implemented; focused checks pass; Parent review pending. Not accepted.**

## Finding and correction

The runtime only admitted replay from lifecycle `HOME`. A resident greeting holds the lifecycle in `TRANSITION`, so an explicit Replay action during the greeting silently did nothing. The runtime now settles that transition through its existing Escape path, then replays within the same lifecycle/session. An already-running `ENTRANCE` is left alone so its completion callback cannot complete a second entrance sharing the same session token.

The controller-only replay fallback also returned to a hardcoded desktop HOME preset and did not settle the camera in reduced-motion mode. It now uses the measured HOME preset and settles it immediately when reduced motion is active.

## Changed source paths

- `app/src/features/world/WorldRuntime.ts`
- `app/src/features/experience/controller.ts`
- `app/tests/unit/world-runtime-recovery.test.ts`
- `app/tests/unit/interaction-controller.test.ts`

The runtime regression starts a resident greeting, requests replay, and checks that the greeting settles, lifecycle returns to `ENTRANCE`, the session token and single asset load remain unchanged, and skip returns to HOME. Controller regressions check mobile HOME selection in both reduced-motion and regular replay paths.

## Checks and raw outcomes

| Command | Result | Evidence |
| --- | --- | --- |
| `pnpm exec vitest run --config vitest.config.ts tests/unit/world-runtime-recovery.test.ts tests/unit/interaction-controller.test.ts` (from `app/`) | PASS — 2 files, 35 tests, exit 0 | `unit.log`, `unit.exit-code.txt` |
| `pnpm exec tsc --noEmit` (from `app/`) | PASS — exit 0, no diagnostics | `typecheck.log` (empty), `typecheck.exit-code.txt` |
| `git diff --check -- app/src/features/world/WorldRuntime.ts app/src/features/experience/controller.ts app/tests/unit/world-runtime-recovery.test.ts app/tests/unit/interaction-controller.test.ts` | PASS — exit 0; CRLF-normalization warning only | `diff-check.log`, `diff-check.exit-code.txt` |

## Source fingerprints

| Path | SHA-256 |
| --- | --- |
| `app/src/features/world/WorldRuntime.ts` | `bc295ad07dd42aeabed642f1694cc6a071383583234da34314567f9d12d18d36` |
| `app/src/features/experience/controller.ts` | `0a8395f5f071f42975cc855eb3a191bd3d5187d719d7d8e9af93ec773277f680` |
| `app/tests/unit/world-runtime-recovery.test.ts` | `ad27e58e60ac594dbef49ea1b4e4e73f83bcbc9945df253b832d9aeeb3dd51ac` |
| `app/tests/unit/interaction-controller.test.ts` | `ab977edcc08049cdb5286280a73c5edd1c717a19df309a3e1833351ebf73bf70` |

Raw unit log SHA-256: `0a0bc45ce9323dac298052a37edc8e3af1d2ab074cf5791e8f1eeb4aa7c9eb73`.

## Limits and handoff

No browser, build, viewport capture, WebGL/GPU measurement, physical-device check, or assistive-technology session was run for this delta. Parent owns shared build/browser verification, Git, and acceptance. The worktree remains unstaged and uncommitted. This report is a maker handoff, not source or G7 acceptance.
