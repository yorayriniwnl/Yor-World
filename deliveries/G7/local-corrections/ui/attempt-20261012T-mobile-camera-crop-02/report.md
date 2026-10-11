# Mobile HOME camera correction — attempt 02

Status: **implementation complete; focused checks pass; parent visual recheck pending. Not accepted.**

## Scope and source change

This correction addresses the resident crop in the parent’s integrated portrait captures at 390×844 and 320×600. The `home-mobile` preset now uses position `[-0.33, 2.05, 0.35]`, target `[0.37, 1.08, -1.25]`, and a 58° horizontal fit target. The mobile HOME projection is recentered to keep the resident within the viewport while preserving the monitor and desk interaction area. The desktop preset was left unchanged by this correction.

Changed source paths:

- `app/src/features/world/CameraDirector.ts`
- `app/tests/unit/camera-director.test.ts`

The unit regression checks resident, monitor, and desk-object margins/readability at both portrait sizes. The separate projection evidence measures all mesh vertices from the bound candidate room/fixture assets and the resident bind pose.

## Focused checks

| Check | Result | Raw evidence |
| --- | --- | --- |
| `pnpm exec vitest run --config vitest.config.ts tests/unit/camera-director.test.ts` | PASS — 1 file, 10 tests | `camera-director-unit-final.log`, exit `0` |
| `pnpm exec vitest run --config vitest.integration.config.ts tests/integration/production-camera.test.ts` | PASS — 1 file, 5 tests | `production-camera-integration-final.log`, exit `0` |
| `git diff --check -- app/src/features/world/CameraDirector.ts app/tests/unit/camera-director.test.ts` | PASS — exit `0` | `git-diff-check.exit-code.txt` |
| GLB vertex projection replay (`node ../deliveries/G7/local-corrections/ui/attempt-20261012T-mobile-camera-crop-02/project-mobile-bounds-replay-01.mjs`, run from `app/`) | PASS — exit `0`; output matches the original projection | `project-mobile-bounds-replay-01.log`, `projected-bounds-replay-01.json`, `project-mobile-bounds-replay-01.exit-code.txt` |

No browser or build was run. Parent owns the post-art integrated recapture and acceptance.

## Projected bounds

Projection uses all available mesh vertices for resident, chair, monitor, keyboard, mouse, and desk phone, with resident vertices CPU-transformed using the GLB bind-pose joint matrices and inverse bind matrices. No animation pose is sampled.

| Viewport | Element | X bounds (px) | Y bounds (px) |
| --- | --- | ---: | ---: |
| 390×844 | Resident (5,470 vertices) | 172.8–333.6 | 452.8–686.5 |
| 390×844 | Chair (4,080 vertices) | 169.6–382.5 | 543.1–728.6 |
| 390×844 | Monitor (558 vertices) | 24.9–211.8 | 383.8–490.0 |
| 390×844 | Keyboard | 97.3–171.1 | 499.1–540.0 |
| 390×844 | Mouse | 183.4–202.8 | 490.6–510.8 |
| 390×844 | Desk phone | 221.2–245.3 | 488.3–508.3 |
| 320×600 | Resident (5,470 vertices) | 141.9–273.0 | 325.1–515.6 |
| 320×600 | Chair (4,080 vertices) | 139.3–312.9 | 398.7–549.9 |
| 320×600 | Monitor (558 vertices) | 21.3–173.7 | 268.8–355.4 |
| 320×600 | Keyboard | 80.4–140.6 | 362.8–396.2 |
| 320×600 | Mouse | 150.5–166.4 | 355.9–372.4 |
| 320×600 | Desk phone | 181.3–201.0 | 354.0–370.3 |

At 320×600, the resident body ends 84.4 px above the bottom edge; at 390×844 it ends 157.5 px above it. The 320×600 chair bound is within the viewport with 7.1 px at the right edge and 50.1 px below it. Monitor widths are 152.4 px and 186.9 px respectively. The camera vertical FOV is 92.2097° at 320×600 and capped at 100° at 390×844; effective horizontal FOV is 58.0000° and 57.6824°.

Machine-readable output: `projected-bounds.json`; deterministic replay: `projected-bounds-replay-01.json`. Projection script: `project-mobile-bounds.mjs` (SHA-256 `fb2d6ae2279c3aebcd9a5b40cc0fb812c155b734848675374189604e794fabc2`).

## Input and source binding

- Room candidate: `deliveries/production-environment/revisions/local-corrections-r1/evidence/build-attempt-18/runtime/production-room-full.glb`, SHA-256 `fc2b17593927b82905750d63ce1df678d9d1d9f9f91e69de1bb3890dfa8e1f3a`.
- Fixture candidate: `deliveries/production-environment/revisions/local-corrections-r1/evidence/fixture-attempt-06/runtime/fixture-production.glb`, SHA-256 `5957f5d3c9121ba332ef545b4f304b85244afee0371c171ccf18f0c93eb83dab`.
- Resident: `app/public/models/resident-production.glb`, SHA-256 `b15000feb4738d14aa1d41a43f01ba377f7011dbe1c95b3478c1200d12f4411d`.
- Camera source SHA-256: `94779c93db3f457b34f6a9f04722e39fe030b0cde8a7ad30a6983c3443f6b3a7`.
- Camera unit test SHA-256: `ca4ab6524611476baecf248b24a49c2a5e1507f67113a5fc970fb3f590e8da9b`.

The prior parent screenshots that identified the crop remain at `deliveries/G7/local-corrections/coordination/attempt-20261012T-integrated-art-review-01/captures/home-390x844.png` (SHA-256 `0706f13b388f77019ae80309b9ed3df3c3e7ee6928f35d2a087b8a8dd53a2118`) and `home-320x600.png` (SHA-256 `83a72ca99eb60bc27dfb1d571226b1fd4785705b14181d4ccc31e0a89ec2398c`). These are pre-correction captures, not visual proof of the corrected camera.

## Limits and handoff

The bounds establish that the projected resident, monitor, and desk objects fit the specified portrait dimensions under the measured candidate geometry. They do not prove the integrated browser composition, control overlay placement, animated resident silhouette, or the final art occlusion correction. The chair is close to the right edge at 320×600. Parent should recapture both mobile sizes after art’s occlusion correction and check resident/monitor/object fit above the actual controls. This report records maker evidence only and is not an independent review, source acceptance, or G7 acceptance.
