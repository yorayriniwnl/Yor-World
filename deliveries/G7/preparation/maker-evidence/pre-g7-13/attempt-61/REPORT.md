# PRE-G7-13 camera endpoint correction

## Source identity

- Source commit: `034d87951555731ff03d413b380556471e4ad73a`
- App tree: `0ea10ae3cadb00526e13293248fbef3b3007537e`
- Governing packet: `docs/planning/reconciliation-packets/2026-10-14-pre-g7-13-anchor-articulation.md`

## Correction

The mobile home camera used `x = 0.3`. `EntranceCoordinator.entrancePositionAt(1, true)` interpolates the endpoint, producing `0.30000000000000004`, while the settled camera uses the exact `0.3` value. The exact endpoint assertion failed. The permitted camera preset now uses binary-exact `x = 0.3125` (a 1.25 cm shift), and the camera-director unit expectation matches it. The lifecycle/interpolation implementation remains unchanged.

## Verification

- Production camera integration test, Node 24.19.0: PASS, 5/5. See `focused-production-camera-node24.19.log`.
- Camera director unit test, Node 24.19.0: PASS, 5/5. See `focused-camera-unit-node24.19.log`.
- Full integration suite, Node 24.19.0: FAIL, 285/286. `tests/integration/platform/canonical-fixture.test.ts` exceeded its 60-second test timeout; this test does not cover the camera correction. The failure and full output are in `full-integration-node24.19-path.log`. Its cause was not determined.
- Source mirror audit: PASS, 116 source files and 9 test files, zero mismatches. The intentional `src/config/public-base-url.ts` domain override remains documented. See `final-mirror-sync-audit.json`.
- Production build, Node 24.19.0: PASS. Build ID `XCQS-sAWChbQlXVUq93Rn`. See `production-build-node24.19.log`.

## Review status

Attempt-60 desktop/mobile captures remain the visual candidate evidence; attempt-61 is a small camera endpoint precision correction. This candidate is not accepted or deployed. Independent delta audit and parent acceptance remain pending, and G7 remains not accepted.
