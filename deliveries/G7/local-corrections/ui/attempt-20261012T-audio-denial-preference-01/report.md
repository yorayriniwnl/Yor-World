# Audio denial preference correction

Status: implementation and focused source checks complete; awaiting parent browser review. This report covers one Worker 3 correction and is not acceptance or a G7 claim.

## Finding and correction

When `AudioContext.resume()` was denied, the UI copied the actual playback result (`false`) back into the saved sound preference. The HUD then showed `Sound: Off`, losing the explicit request and not identifying the action as a retry.

`WorldRoot` now keeps the user's requested preference separate from actual playback. It updates `WorldRuntime` with whether audio is actually running, persists the requested `SET_SOUND` preference independently, and keeps `Enable sound` / `Sound: Tap to enable` visible while an attempted activation is still denied. The state stays retryable; `aria-pressed` continues to reflect actual playback.

The existing browser-denial regression now asserts preference true + runtime false, the retry label, and a second activation attempt. Added a focused unit regression for denied actual playback coexisting with an enabled desired preference.

## Exact paths

- `app/src/features/world/WorldRoot.tsx`
- `app/tests/unit/return-storage-and-audio.test.ts`
- `app/tests/e2e/local-studio-usability.spec.ts`

## Checks

Commands run from `app/`:

- `pnpm exec vitest run --config vitest.config.ts tests/unit/return-storage-and-audio.test.ts tests/unit/interaction-controller.test.ts` — PASS, 2 files / 25 tests.
- `pnpm exec tsc --noEmit` — PASS, exit 0, no diagnostics.

Command run from the worktree root:

- `git diff --check -- app/src/features/world/WorldRoot.tsx app/tests/unit/return-storage-and-audio.test.ts app/tests/e2e/local-studio-usability.spec.ts` — PASS, exit 0; Git printed CRLF normalization notices for the existing CRLF files.

Browser/E2E, shared build, and visual review — NOT RUN by this worker, per parent coordination.

Raw command output, command text, and exit files are in this directory: `unit.log`, `unit.command.txt`, `unit.exit-code.txt`, `typecheck.log`, `typecheck.command.txt`, `typecheck.exit-code.txt`, `diff-check.log`, and `diff-check.exit-code.txt`.

## Hashes

SHA-256 of current full working-copy files (these include earlier Worker 3 work in two dirty files):

- `app/src/features/world/WorldRoot.tsx` — `797759a315793ada1d3afda9f6754d24611d4788f2b7e1da5e7e54788a198b0a` (34307 bytes)
- `app/tests/unit/return-storage-and-audio.test.ts` — `3bd9f7e6a459810261411ff804c4b011f379d441f84e468e1e56c41b3627f50a` (7381 bytes)
- `app/tests/e2e/local-studio-usability.spec.ts` — `3dc938ed0f1c1df2b961b78ee3a4e819bb24d4c0ba8c07340344a73688f3aad2` (22384 bytes)

Evidence hashes:

- `unit.log` — `d11045cc880f47fd0bb9c04b46fd7e215e8c87c808c83cf5d4f30531f2b53b5b` (229 bytes)
- `typecheck.log` — `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` (empty; command exited 0)
- `diff-check.log` — `726e48672c1dc1ed9cb7da43fabf354eafe99fa86179a25ba6cc0b4939a75522` (412 bytes)

## Remaining review

Parent browser evidence should execute the updated denial/retry E2E regression. This worker did not verify actual browser permission behavior, integrated presentation, or combined acceptance.
