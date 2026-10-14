# PRE-G7-13 Maker Report

Date: 2026-10-14  
Worktree: `C:\p13-iso`  
Branch: `codex/pre-g7-13-anchor-articulation-isolated-20261014`  
HEAD: `ccb029c67c0c5fe5d6dd90baa5ba21828f6f4de6`  
Maker status: reviewable failed checkpoint; parent audit did not accept it because the chair seat remains occluded at 390×844. Not deployed.

## Scope and changed paths

Implementation was limited to the PRE-G7-13 owned world composition, lighting, camera, diagnostics and tests, plus the mirrored site package and PRE-G7-13 evidence. PRE-G7-13A’s runtime-only six-sided geometry replacement is applied to the seven named panel meshes while preserving GLB bytes, node names/hierarchy/material slots and interaction roots. PRE-G7-13B’s two integration expectation changes retain trajectory/clearance assertions and use the authorized (1e-12) endpoint tolerance. PRE-G7-13C adds only a click on the existing controls toggle in the two browser setup helpers; assertions and timeouts are unchanged.

Changed app paths:

- `app/src/features/world/CameraDirector.ts`
- `app/src/features/world/ProductionLighting.ts`
- `app/src/features/world/ReferenceComposition.ts`
- `app/src/features/world/SceneIntegrator.ts`
- `app/src/features/world/WorldRoot.tsx`
- `app/tests/e2e/renderer-recovery.spec.ts`
- `app/tests/e2e/world-fullscreen.spec.ts`
- `app/tests/e2e/world-reference-composition.spec.ts`
- `app/tests/integration/production-camera.test.ts`
- `app/tests/integration/runtime/frozen-world-binding.test.ts`
- `app/tests/unit/camera-director.test.ts`
- `app/tests/unit/reference-composition.test.ts`
- `app/tests/unit/production-lighting.test.ts` (new)

The corresponding source/test files are mirrored under `yorayriniwnl.in/src/` and `yorayriniwnl.in/tests/`. Also changed: `yorayriniwnl.in/README.md` and `yorayriniwnl.in/source-delivery-manifest.json`. The mirror retains its public-base URL override.

Parent-owned packet amendment files are dirty/untracked in the worktree and are excluded from this maker change set:
`docs/planning/reconciliation-packets/2026-10-14-pre-g7-13-anchor-articulation.md`,
`...pre-g7-13b-integration-regression-assertions.md`,
`...pre-g7-13c-open-controls-in-browser-setups.md`.
The historical PRE-G7-11 browser log was restored to HEAD after its test lane stopped. No other unrelated tracked paths were found in the latest status.

## Candidate hashes and asset integrity

Machine-readable hashes: `attempt-33/candidate-tree-hashes.json`.

- Candidate app tree: `92f63a3640164d72abb37da19aef0576f787b6a2`
- Candidate domain mirror tree: `d3d27e83c13308de6a03a94bd3f222605e3b7a24`
- Root tree with candidate app: `9ce1f32c5f34dabc6cd3df7b1e83fdf1c73c0dfb`
- Root tree with candidate mirror: `631f5bf1894bc4eb24202a3dfe8b7b9f1ffdc1a1`
- Frozen room GLB SHA-256, app and mirror: `3a02647d24e474c8a2579b0d277cf02a7841212e961c1554f67b6e032e40a307` (PASS, unchanged)

The candidate app/mirror source trees have not changed since these hashes were captured. Later writes are evidence/report files only.

## Mirror verification

PASS, Node 24.19.0, exit 0. Command: `node attempt-33/verify-mirror.mjs` after `node attempt-33/sync-mirror.mjs`.

- Log: `attempt-33/mirror-verify-c13c-final-node2419.log`
- JSON: `attempt-33/mirror-verification.json`
- 116 source rows and 9 test rows checked; 13 changed pairs updated.
- All changed pairs are byte-exact; all rows are normalized-content equal; unchanged baseline rows were preserved.
- 112 baseline rows are normalized-only because the checkout has EOL conversion; canonical manifest rows were not rewritten for those unchanged files.
- Public-base override and canonical manifest hash checks PASS.
- Offline mirror install: `pnpm install --frozen-lockfile --offline --ignore-scripts`, Node 24.19.0, exit 0; `attempt-33/mirror-install-node2419.log`.

## Validation record

Portable Node 24.19.0 was used from `C:\Users\ayush\AppData\Local\Temp\yor-world-node-24.19.0\unpacked\node-v24.19.0-win-x64`. No project dependency or lockfile changes were made. Earlier Node 24.14.0 runs emitted the declared engine mismatch warning (package requires `>=24.19.0 <25`); final reported checks below use Node 24.19.0 unless stated.

- PASS — `pnpm run lint`, Node 24.19.0, exit 0; `attempt-33/lint-node2419-c13c.log`.
- PASS — `pnpm run typecheck`, Node 24.19.0, exit 0; `attempt-33/typecheck-node2419-c13c.log`.
- PASS — full unit suite `pnpm run test:unit`, Node 24.19.0, retry after an overlapping run ended, 25/25 files and 321/321 tests; `attempt-33/full-unit-node2419-retry.log`. The earlier overlapping run had one 5-second boundary-test timeout (320/321); preserved at `attempt-33/full-unit-node2419-c13c.log`.
- PASS — PRE-G7-13 focused integration tests, 2 files / 9 tests; `attempt-33/integration-focused-final.log`. B13 focused tests (2 files / 9 tests) passed.
- FAIL — full configured integration suite `pnpm run test:integration`, Node 24.19.0, default 60-second timeout: 26/27 files and 285/286 tests pass; `tests/integration/platform/canonical-fixture.test.ts` times out at 60,000 ms. Full log/stack: `attempt-33/integration-node2419.log`. An earlier Node 24.14.0 run also failed and is preserved; it is not used to attribute the final result because that runtime does not satisfy the declared engine. The final no-overlap Node 24.19.0 rerun is preserved at `attempt-33/integration-node2419-final-no-overlap.log`: exit 1, 26/27 files and 285/286 tests pass. The same `canonical-fixture.test.ts` case reports `Test timed out in 60000ms`; Vitest measured the test at 92.5 seconds and the full run at 102.3 seconds. No timeout or source change was made. This reproduces the fixture failure under the required engine without another test lane overlapping.
- PASS — visual composition and compact-controls E2E: 16/16 across Chrome and Edge; `attempt-33/visual-e2e.log`, browser results in `attempt-33/browser-results.json`. This lane predates the later C13C-only edits to other test helpers; composition/runtime sources and this spec were not changed afterward.
- PASS — CandidateX 404 guard from mirror production build, fresh Playwright context; `attempt-33/candidatex-node2419.log`.
- PASS — mirror production build `pnpm run build`, Node 24.19.0; `attempt-33/mirror-build-node2419.log`.
- PASS — clean-profile mirror production smoke at `http://127.0.0.1:3136/?studio=enter`, 1440×900, fresh browser context. Canvas rendered with WebGL2, 37 rendered frames, no context loss/static fallback; log and JSON/screenshot are in `attempt-33/mirror-clean-profile-smoke-rerun.log` and `attempt-33/mirror-clean-profile-smoke/`. This smoke has the controls drawer open and is separate from the closed-HUD recognition captures.
- FAIL — focused recovery/fullscreen E2E after C13C, 24/26 across Chrome and Edge; `attempt-33/recovery-fullscreen-c13c-node2419.log`. The sole failing case on both engines is “Renderer failure with dialog open preserves dialog interactivity in DOM”: clicking the visible Projects link is intercepted by `.world-failure-container` (30-second default timeout). All other recovery/fullscreen checks pass. This pointer-interception failure remains explicit; no renderer/fallback policy or timeout was changed. The prior pre-C13C failure lane is preserved at `attempt-33/recovery-fullscreen-node2419.log`.
- PASS — `git diff --cached --check -- app yorayriniwnl.in`; no source/mirror whitespace errors (checkout EOL warnings only). A whole staged-tree check reports trailing whitespace in raw captured browser/build logs; these historical evidence files are preserved byte-for-byte.
- NOT RUN — physical-device verification.
- NOT RUN — deployment or G7 acceptance. Parent review/delta audit is complete and classified this candidate NOT ACCEPTED because the chair seat remains occluded at 390×844.

## Visual review and remaining caveat

Raw closed-HUD screenshots and same-page measurements for desktop 1440×900, mobile 390×844, compact 320×600, and landscape 844×390 are in `attempt-33/screenshots/` and `attempt-33/measurements/`. The 16/16 automated lane confirms viewport containment, panel batch mapping/visibility, and compact controls behavior. Parent visual review of attempt-33 reports the chair backrest is visible at desktop/mobile and speaker/PC remain visible; at phone size the seat remains occluded/unclear. This is retained as a visual limitation, not claimed as full chair recognition. Camera/controller and scene perception remain a human-review question; bounds and automation are not represented as proof of visual recognition.

## Evidence inventory

Attempt-33 holds source-bound logs, screenshots, measurements, browser results, mirror verifier/install/build, CandidateX, smoke artifacts, and recovery/fullscreen traces. Earlier attempts remain append-only. `attempt-33/candidate-tree-hashes.json` binds the candidate source trees. The SHA-256 inventory at `attempt-33/evidence-file-hashes.json` is generated from Git index/commit blob bytes by `attempt-33/hash-evidence-blobs.mjs`; it includes this report and the helper, excludes only itself, and is verified against the final evidence commit.

## Commit state

Source/evidence checkpoint commit: `f457776510b43267971721e6288e201ac904ff93`. `git push` exited 0; origin advanced from `ccb029c6` to `f4577765`. After that push, `git status -sb` showed the branch synchronized with origin and only these parent-owned packet files dirty: modified `docs/planning/reconciliation-packets/2026-10-14-pre-g7-13-anchor-articulation.md`, plus untracked `...pre-g7-13b-integration-regression-assertions.md`, `...pre-g7-13c-open-controls-in-browser-setups.md`, and `...pre-g7-13d-chair-seat-visibility.md`. They are excluded from the source/evidence commit. The restored PRE-G7-11 browser log was clean and excluded. Parent review/delta audit classified attempt-33 as NOT ACCEPTED because the chair seat remains occluded at 390×844. The reported integration and pointer-interception failures remain explicit; no deployment or G7 acceptance is claimed.






