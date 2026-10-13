# Runtime/UI follow-up: sound diagnostics observation and isolated monitor click

Date: 2026-10-11 18:15 UTC  
Status: diagnosis and focused E2E correction complete; no new product-code change was warranted by the reproduction.

## Finding

The reported sound test failure reproduced in Chrome and Edge against the existing parent final-09 build. The test turned diagnostics on to inspect quality, turned the drawer off, clicked Sound, then polled `world-diagnostics` without reopening it. `WorldRoot` conditionally unmounts that element while the drawer is closed. The failure snapshot showed `Sound: On` and `aria-pressed=true`, with no `world-diagnostics` element. It therefore did not show `soundEnabled: false`; it polled an absent element.

I corrected the E2E sequence to reopen the diagnostics drawer after the explicit sound gesture, assert it is visible, then assert both runtime `soundEnabled` and `experienceSnapshot.preferences.soundEnabled` are true. The existing startup assertions remain: HUD says “Tap to enable”, runtime sound is false, saved preference is true, and the AudioContext resume count remains zero until the user gesture. This passes in both browsers. The existing shared-store runtime wiring remains unchanged.

The actual-monitor-mesh focus test was run by itself in both browsers. It passed in Chrome and Edge, so the parent-final-09 “closed session” failure did not reproduce independently of suite load.

## Results

| Command | Result |
|---|---|
| `pnpm exec playwright test tests/e2e/local-studio-usability.spec.ts --grep 'saved quality and sound preferences hydrate without starting audio' --project=chrome --project=edge` before the assertion correction | FAIL, 2/2 browser cases; both failed while polling the closed diagnostics drawer |
| Same saved-preference command after the correction | PASS, 2/2 |
| `pnpm exec playwright test tests/e2e/local-studio-usability.spec.ts --grep 'clicking the actual monitor mesh opens its dialog and restores focus to Projects' --project=chrome --project=edge` | PASS, 2/2; independent rerun did not reproduce the prior failure |
| `pnpm exec eslint tests/e2e/local-studio-usability.spec.ts --max-warnings=0` | PASS |
| `pnpm exec tsc --noEmit` | PASS |
| `git diff --check` | PASS; Git reported existing CRLF normalization warnings on other modified worktree files |
| Shared full build, full browser matrix, and native-GPU checks | NOT RUN |

Playwright’s configured webServer used the already available parent final-09 `.next` output for these focused tests; no Next build was started. Initial failing screenshots, error contexts, and browser JSON are preserved in `audio-failure-chrome/`, `audio-failure-edge/`, and `audio-failure-browser-results.json`. Passing monitor and corrected sound result JSON and logs are preserved in this attempt directory as well. The original `app/test-results` failure artifacts were left in place.

## Fingerprints at freeze

| Path | SHA-256 |
|---|---|
| `app/tests/e2e/local-studio-usability.spec.ts` | `9A7F68239E699E68CF10334F221BC3FE3EF24C12D2954C385CAF17B58113A820` |
| `app/src/features/world/WorldRoot.tsx` | `3D919699DFF257D370167847EA1A78F9DA849A14C763F518B7E3A0AAACA3E0F1` |
| `app/src/features/world/WorldRuntime.ts` | `EFFEFB7ECDF6CE0340D4B5E5D6053A42602DFEDFAAD7F700A64B77C48A3FF58B` |
| `app/src/features/experience/audio.ts` | `086D187890A6DA752094FCF2A35203AB57B8C306949C46BEF6D33773D8E2EDB2` |

Only the E2E observation sequence changed in this follow-up. Runtime sound still starts muted, preserves saved sound intent, and reports enabled after a successful explicit gesture. No commit was created.
