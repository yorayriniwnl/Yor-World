# R1 camera and current-asset fixture follow-up — 2026-10-11

## Scope and result

Fixed the desktop camera’s real R1 ceiling collision, retained the 0.05 m camera clearance invariant through both entrance trajectories, and changed current-world integration/E2E fixtures from stale root URLs to `ASSET_LOCATIONS` and the current asset manifest. The exact mobile entrance endpoint comparison now uses a `1e-12` distance tolerance for floating-point interpolation only. No browser, E2E, full build, or shared server was run.

R1 binding used by the camera integration test:

- `app/public/asset-manifest.json` SHA-256: `1F432A4A42564E017B5C6377FD6E58A0916656C378EE6A2FA9B474130A990D29`
- `production-room-full` URL: `/models/world-art-local-corrections-20261009-r1/production-room-full.2b4c1d18b81874630da5c32836b0e37ec1ff9f25147ccb92aba1d22f62e46a6e.glb`
- GLB SHA-256 / size: `2B4C1D18B81874630DA5C32836B0E37EC1FF9F25147CCB92ABA1D22F62E46A6E` / `1,342,960` bytes

The decoded R1 shell has `ceiling_main` Y bounds `2.80..2.90` and `wall_left` X bounds `-2.20..-2.10`. The new `home-desktop` position `[-1.8, 2.65, 1.35]` clears those bounds by 0.15 m and 0.30 m respectively, stays inside the room, and moves 0.2 m closer to the workstation. The camera test checks actual manifest-bound bounds at every sampled entrance frame and checks the full travel segments against shell bounds expanded by the unchanged 0.05 m requirement.

The frozen-world integration fixture now parses the current room, resident, fixture, and desktop interaction assets by `ASSET_LOCATIONS`; each URL must exist in `asset-manifest.json`, and each file’s declared byte count and SHA-256 are verified. Its phone ray test uses an overhead view of the actual R1 phone because the earlier front/rear test viewpoints were occluded by the current chair/monitor. The E2E full-stack test now expects the exact four `ASSET_LOCATIONS` URLs and verifies each selected response against the runtime manifest’s bytes and SHA-256. No R6 historical test remains mislabeled as current behavior.

## Changed-file fingerprints

- `app/src/features/world/CameraDirector.ts` — `BB586BED910A21E6718B40922E671B8918C4F5106758BB579FF44BC376C85223`
- `app/tests/integration/production-camera.test.ts` — `7B9FB300F81DE6FCDB25F21B7E4623AED7EAE27D9F01CB0C7E0F9180E5C227D1`
- `app/tests/integration/runtime/frozen-world-binding.test.ts` — `7FAC8533AB551C5D6670D7D9B5CBCABA70E1E09A814EE5ECF43E47ED8A4631D4`
- `app/tests/e2e/full-stack-integration.spec.ts` — `B68DA5C83AE847563DDAF9E5F5B7F17D83521C3567FEE4AEA45E81DB5B4CCF5D`

## Validation

| Check | Result | Evidence |
|---|---|---|
| R1-bound camera + runtime asset integration | PASS, 2 files / 9 tests | `final-camera-and-runtime-integration.log` |
| Camera director unit tests | PASS, 1 file / 8 tests | `camera-director-unit.log` |
| Focused ESLint with `--max-warnings=0` on all four changed files | PASS, exit 0 | `focused-eslint.log` |
| `git diff --check` on all four changed files | PASS, exit 0 | empty output |
| Full-stack E2E against a coordinated fresh build | NOT RUN; parent owns the fresh-build/browser run | E2E assertion and hash check are linted in this scope |
| Full combined integration suite | NOT RUN by this worker | Parent will rerun after source freeze |

The original stale-URL failure and the manifest-bound pre-fix camera failures are retained in `../coordination/attempt-20261011T-parent-freeze-04/integration.log` and `baseline-manifest-bound.log`. The phone-ray diagnostic logs also preserve the initial occlusion diagnosis. The unrelated canonical-platform failure present in the parent freeze-04 log is outside this camera/runtime fixture scope and was not rerun here.

No build or commit was made. Parent’s combined suite and independent delta audit remain pending.
