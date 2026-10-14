# PRE-G7-10 runtime maker evidence

## Revision and scope

- Maker lane: local Codex, following `2026-10-14-pre-g7-10-codex-routing-addendum.md`.
- Worktree branch: `codex/pre-g7-10-runtime-local-codex`.
- Base commit: `f6a8df58095807b09004c2f0ab8a2382c3971e80` (`origin/main`).
- Base `app/` tree: `42ea29ec235225046a75959eb19eb386ac2f821d` (accepted RC6-R1 tree).
- Source result commit: `c13fde9e408d1ca053f43d7af6f9d9b0382100a8`.
- Result `app/` tree: `6b4619222c1f11e34c47a61c238447a30aa37eed`.
- Source commit contains only `app/src/features/world/WorldRuntime.ts` and `app/tests/unit/world-runtime-recovery.test.ts`; it was pushed to `origin/codex/pre-g7-10-runtime-local-codex`.

The runtime now preserves a WebGL context when React Strict Mode disposes and recreates a runtime around the same connected canvas. It forces context loss when the canvas has been detached for final teardown. Unit coverage exercises connected setup→cleanup→setup, detached cleanup of renderer/frame/listeners, renderer creation failure, and a genuine context-loss event that cancels rendering and fails the lifecycle. Existing visibility, cancellation, retry, and single-loop coverage remains in the focused test file.

## Validation

### PASS

- Baseline reproduction: `baseline-dev-repro.log` confirms the accepted revision fails under a clean development Chrome profile with SwiftShader. It reaches the accessible fallback with `Cannot read properties of null (reading 'precision')`; the React stack includes `doubleInvokeEffectsOnFiber` and passive-effect reconnection.
- Focused runtime tests: 13/13 passed; see `focused-tests-final.log`.
- Lint: the completed initial `pnpm lint` exited 0; see `lint.log` (`eslint . --max-warnings=0`). A later duplicate run was interrupted after remaining active without output past its command header; it is not counted as a completed run. `lint-final.log` preserves its output.
- Typecheck: `pnpm typecheck` passed; see `typecheck-final.log`.
- Unit suite: the first default-timeout run had 314/316 pass because two boundary tests exceeded Vitest's 5-second timeout (`unit-tests.log`). The rerun with a 15-second per-test timeout passed all 316 tests across 23 files in 47.16 seconds (`unit-tests-timeout-15s.log`).
- Development replay browser smoke: passed on Chrome 153 / SwiftShader with a fresh Playwright profile. It rendered 27 frames, retained a live context, showed no fallback, had no hydration-injection attributes, and reported no browser errors; see `development-replay-smoke.log`.
- Production build: `pnpm build` passed, including TypeScript and all 7 static pages; see `production-build.log`.
- Production browser smoke: passed on Chrome 153 / SwiftShader with fresh Playwright profiles. The supported context rendered, an actual `WEBGL_lose_context` event showed the accessible fallback and detached the old canvas, and retry recreated a live rendering context. A second run with WebGL disabled showed the accessible creation-failure fallback and retry control. There were no page errors; see `production-browser-smoke.log`.

### FAIL

- Integration suite: 26/27 files and 285/286 tests passed. The unmodified `tests/integration/platform/canonical-fixture.test.ts` exceeded the configured 15-second timeout; suite duration was 257.29 seconds (`integration-tests.log`).
- Parent-directed isolated retry: the same unmodified fixture test exceeded the 60-second timeout; Vitest reported 79.4 seconds test duration and 84.36 seconds total (`canonical-fixture-isolated-60s.log`). Per the parent instruction, the full integration suite was not rerun after that isolated failure. Parent inspection confirmed this test only covers cross-module database fixture initialization and SQLite queries, outside the WebGL change.

### NOT RUN

- Physical-GPU browser verification. Browser rendering used Chromium SwiftShader software graphics.
- Real-device/accessibility sessions: iPhone/iPad Safari, Android Chrome with TalkBack, Windows NVDA, and VoiceOver with Safari.
- Ten-minute mobile soak.

## Evidence files

The scripts and raw logs in this directory preserve baseline reproduction, development and production browser runs, install, lint, typecheck, unit and integration tests, build, and the scoped source diff. `SHA256SUMS.txt` contains SHA-256 hashes for each evidence file other than the checksum file itself.
