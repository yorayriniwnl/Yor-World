# PRE-G7-13 parent acceptance: local visual-composition readiness

- **Date:** 2026-10-16 (Asia/Calcutta)
- **Authority:** Parent Codex, Architect and Acceptance Authority
- **Decision:** **ACCEPTED for bounded local visual-composition readiness.** This does not accept G7, production readiness, physical-device behavior, or deployment.

## Revisions reviewed

- Source commit: `034d87951555731ff03d413b380556471e4ad73a`
- App tree: `0ea10ae3cadb00526e13293248fbef3b3007537e`
- Candidate branch: `codex/pre-g7-13-anchor-articulation-20261014`
- Evidence branch head: `356e4b24eb4ee09afcdde3fc75cff0733cb50ef9`
- Maker evidence/report commit: `545ad466df120c884dc03ad0ed9b45c42ab14cff`
- Corrected source-delivery manifest: `a476c3aeba7eef7d03c59524eb390938ab55d9f0`
- Final checksum inventory: `356e4b24eb4ee09afcdde3fc75cff0733cb50ef9`
- Read-only delta audit: local Codex substitute at `356e4b24`; this was not an external GPT Plus #2 audit.

The accepted PRE-G7-11 release baseline remains immutable. PRE-G7-13 is accepted as the local visual-composition candidate for continued preparation; it does not replace that release baseline or authorize deployment.

## Basis for acceptance

The independent visual audit found the required workstation groups recognizable in the raw 1440×900 and 390×844 captures. The exact-source composition suite passed 3/3 across desktop, phone, compact 320×600, and landscape 844×390. The camera rests on its shelf, the console rests on the desk, the lilac hex panels and cyan floor pool are visible, and the code-native controller and headset remain distinguishable on mobile. The seven hex panels retain their authored identity and bindings while using the authorized six-sided runtime profile; the GLB remains byte-for-byte unchanged.

The final inventory verifies all 342 listed paths against their committed blobs. The corrected source-delivery manifest points at `attempt-64/composition/`, its source/tree identity and canonical URL override are unchanged, and all 116 mirrored source files plus 9 test files match. The maker's exact-source lint, typecheck, 324-test unit suite, production builds, CandidateX 404 guard, clean-profile smoke, focused camera tests, and the isolated recovery retry passed.

## Recorded failures and limits

- Full integration is **FAIL, 285/286** because `canonical-fixture.test.ts` exceeded its existing 60-second test timeout. The cause is undetermined; the test and timeout policy were not changed.
- Combined recovery/fullscreen is **FAIL, 12/13** because the first recovery case remained `LOADING` instead of reaching `HOME` within 15 seconds. The isolated rerun passed 1/1, but does not erase the combined-run failure.
- iPhone/iPad Safari, Android Chrome with TalkBack, Windows NVDA, Safari with VoiceOver, and the 10-minute mobile soak are **NOT RUN**. No Android device was attached or exposed to this host, and NVDA/Safari executables were unavailable to run. These require the real devices and assistive technologies.
- Interactive `chrome://gpu` inspection is **NOT RUN**. The automated Playwright run did create a WebGL 2.0 context through ANGLE on Intel Iris Xe/D3D11 with `contextLost=false`; this is emulated headless-browser evidence, not an interactive `chrome://gpu` reading or a guarantee about the user's Chrome profile.
- The user-provided extension-injected hydration attributes and null-WebGL startup error are not accepted as fixed by this packet. Renderer creation/fallback policy and browser-extension behavior remained outside the authorized PRE-G7-13 changes.

This acceptance establishes only the local visual-composition result. G7 remains in preparation; production services, sender/domain verification, deployment, rollback, and all physical-device checks remain unaccepted. No production deployment or provider change was made. The local candidate is available at `http://127.0.0.1:3002/` for preview; this URL is not a production release.

## Baseline handling

Freeze the PRE-G7-13 app tree above. Any later app change requires an explicit parent packet naming this exact source/tree and its scope. Continue to report the two failed automated suite results and all NOT RUN gates as open; do not describe this ruling as G7 acceptance.
