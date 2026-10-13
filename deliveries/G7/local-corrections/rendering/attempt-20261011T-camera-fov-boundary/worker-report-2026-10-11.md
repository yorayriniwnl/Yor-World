# Camera FOV and reduced-motion browser assertion follow-up — 2026-10-11

## Changes

At aspect ratio exactly `0.75` (3:4), `CameraDirector` selects the 58° horizontal target but the old strict `< 0.75` max-FOV branch also applied the 44° landscape cap. That reduced actual horizontal FOV to about 33.7°. The vertical cap now remains 100° through the exact breakpoint and applies 44° only above it. Existing portrait and landscape viewport behavior remains unchanged.

Added a unit regression that resizes a desktop HOME camera to exactly 750×1000 and asserts 58° horizontal FOV. The six required viewport regression still passes.

Also corrected the reduced-motion browser assertion: it now locates the control by its `switch` role and accessible label and checks `aria-checked="true"`, instead of matching the visible text’s letter casing. The UI is unchanged.

## Changed-file fingerprints

- `app/src/features/world/CameraDirector.ts` — SHA-256 `67CAB992898C437722F69E102E7D63557CBF759B552016E02BF3B63F8D211568`
- `app/tests/unit/camera-director.test.ts` — SHA-256 `9669D071C2F104E7B29879D65A33E4787B70EB8F77489CAD8EC5ACA4BC9EF3D7`
- `app/tests/e2e/browser-behavior.spec.ts` — SHA-256 `5BFE87C775FAAB0E8E85D92EFF6BEBC8BC32907F979975C8F4D24249561A5385`

## Validation

| Check | Result | Evidence |
|---|---|---|
| `pnpm exec vitest run tests/unit/camera-director.test.ts` | PASS, 1 file / 9 tests | `camera-unit.log` |
| `pnpm exec vitest run --config vitest.integration.config.ts tests/integration/production-camera.test.ts` | PASS, 1 file / 5 tests | `camera-integration.log` |
| `pnpm exec eslint src/features/world/CameraDirector.ts tests/unit/camera-director.test.ts tests/e2e/browser-behavior.spec.ts --max-warnings=0` | PASS, exit 0 | `eslint.log` |
| `git diff --check` on the three changed files | PASS, exit 0 | `diff-check.log` (Git noted the existing CRLF-to-LF normalization policy for the browser spec) |
| Browser execution | NOT RUN; parent owns fresh-build browser acceptance | Parent’s earlier browser failure is covered by the semantic assertion update |

No build or browser run was performed. Parent will invalidate the earlier browser snapshot and rerun final acceptance after this source change. No commit was created; independent audit remains with the parent.
