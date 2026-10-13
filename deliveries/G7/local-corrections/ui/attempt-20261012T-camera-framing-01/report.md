# Runtime, launcher, and camera correction evidence

Date: 2026-10-12. Maker evidence only; this report is not independent acceptance.

## Completed

- `WorldRoot` now reads the validated return snapshot without consuming it during startup. `WorldRuntime` reports whether `ExperienceController.restoreSnapshot` succeeded; only then does `WorldRoot` clear that same snapshot. A newer snapshot written during startup is preserved by compare-and-clear.
- Both launcher paths save the live room state before navigation. The direct URL handler saves only for an ordinary same-tab primary click and cancels any pending tile motif, so an old transition cannot navigate after the direct route. Tile progress and cleanup are scoped to their own abort controller.
- Desktop HOME now uses the art specification's approximate eye-height position and 43-degree preset FOV. Mobile HOME uses a closer, lower three-quarter position. Portrait horizontal FOV is 46 degrees at 390x844 and 320x600, easing to the existing 58-degree horizontal frame at the 3:4 breakpoint.

## Integrated capture review

Reviewed the six `after-home` captures and `report.json` from `deliveries/production-environment/revisions/local-corrections-r1/evidence/browser-art-attempt-14/`. The report identifies the capture as an integrated native Chrome art harness, with one resident and one retained chair. Its candidate asset URLs were `/candidate/build-attempt-14/runtime/production-room-full.glb`, `/models/resident-production.glb`, and `/candidate/fixture-attempt-04/runtime/fixture-production.glb`. The captures bind the previous `CameraDirector.ts` hash `ef700da9a91df80fd877bf65d8e28ff31cd5ae2f6f32bab2009f688f805e7a9b`; they therefore do not validate the new camera.

The source composition was too high on desktop. In portrait, preserving 56 degrees of horizontal view yielded 98.02 degrees vertical at 390x844 and 89.83 degrees at 320x600, leaving the room small in the tall frame. The revised framing yields the following source-derived projections:

| Viewport | Preset | Horizontal FOV | Vertical FOV |
| --- | --- | ---: | ---: |
| 1440x1000 | home-desktop | 58.00 deg | 42.11 deg |
| 1920x1080 | home-desktop | 62.94 deg | 38.00 deg |
| 1024x768 | home-desktop | 56.62 deg | 44.00 deg |
| 390x844 | home-mobile | 46.00 deg | 85.14 deg |
| 320x600 | home-mobile | 46.00 deg | 77.03 deg |
| 844x390 | home-desktop | 73.38 deg | 38.00 deg |

The capture manifest SHA-256 is `e4f1fcd5d95c0045a474a2a0f0c1eb7ce20afe5d23f0df5b196c6a21e1f9f313`; its asset-manifest SHA-256 is `1f432a4a42564e017b5c6377fd6e58a0916656c378ee6a2fa9b474130a990d29`. SHA-256 for the reviewed candidate screenshots:

```text
after-home-1440x1000.png  9ae248d334df2713724fe92269b6816ce33d3396f42cea6ff6cc4cf4302c92fd
after-home-1920x1080.png  3feb3f6cfaa0d8e47ca176d077bd28754df3468e8d267c3574fbe8be7d40bb44
after-home-1024x768.png   82f8479145571c89032717b6618d282e3dac65dbde7d03a43ce608fdb629f36f
after-home-390x844.png    01ec3b5fcc8764744b84fcb22e4a5efcb8367deba2e027dd6fd03386934bc294
after-home-320x600.png    dbf7d9b848fe02afc924e1e7cb4a73d69aa9070ae8383329e2ae98f0c71f3a98
after-home-844x390.png    a054f740433859f7071428334f9932f1dbe5c2dd5c782ee023bedc14152333a0
```

The 43-degree desktop value is the preset value; aspect fitting continues to adjust the runtime FOV across measured stage sizes. The parent will review the new composition in the final integrated art mapping. No camera screenshot after this edit is claimed.

## Verification

- `pnpm exec vitest run --config vitest.config.ts tests/unit/camera-director.test.ts tests/unit/return-storage-and-audio.test.ts tests/unit/world-runtime-recovery.test.ts` - PASS, 3 files / 33 tests. Raw output: `combined-focused-unit-vitest.log`.
- `pnpm exec vitest run --config vitest.integration.config.ts tests/integration/production-camera.test.ts` - PASS, 1 file / 5 tests, including actual-room shell clearance and entrance trajectory checks against the current public manifest. Raw output: `production-camera-integration-vitest.log`.
- `pnpm typecheck` - PASS. Raw output: `typecheck.log`.
- Targeted ESLint over the nine changed source/test files - PASS, exit 0. Raw output: `focused-eslint.log`.
- `git diff --check` over the nine changed source/test files - PASS; only Git's existing CRLF-to-LF warnings appeared.
- Browser regressions in `app/tests/e2e/local-studio-usability.spec.ts` were added for the two launcher paths and delayed-load snapshot retention, but were NOT RUN. Parent requested central browser/build coordination after art attempt 18 freezes.

## Exact implementation and test paths

- `app/src/features/experience/return-snapshot.ts`
- `app/src/features/world/WorldRuntime.ts`
- `app/src/features/world/WorldRoot.tsx`
- `app/src/features/world/CameraDirector.ts`
- `app/src/features/monitor/launcher.tsx`
- `app/tests/unit/return-storage-and-audio.test.ts`
- `app/tests/unit/world-runtime-recovery.test.ts`
- `app/tests/unit/camera-director.test.ts`
- `app/tests/e2e/local-studio-usability.spec.ts`

## SHA-256 of implementation/test files

```text
app/src/features/experience/return-snapshot.ts  6e09eb040c14c3f79a88bb24bf1060bf4a33565345b9417fe973f0a194e714fe
app/src/features/world/WorldRuntime.ts          12eb748e58e512f9955ac3530a807d7798fe10d758751b42cb7124806708be3a
app/src/features/world/WorldRoot.tsx            619f0c146047d4bb0764acf8529573d3a1c74c5e9a7f42a1ecd7d2b2ab9a0101
app/src/features/world/CameraDirector.ts        0248d875c3c148221062d1324bdbaa871ecc34097cf24c100f4cd41f5da15b2e
app/src/features/monitor/launcher.tsx           3260948d4e80967463e754a693dd35864f3c8000dd465e87f480efcf829d5826
app/tests/unit/return-storage-and-audio.test.ts 47099832921c4bd2b2b3981be580af6be7e3025aaa6b8a80c1394854656682aa
app/tests/unit/world-runtime-recovery.test.ts   b28e713461d647e6dcf9c2e8cace21cdf6124228c0847abb514783cae3d5393f
app/tests/unit/camera-director.test.ts          95058b66116d0b631f61065988ed220d5bab2a1dba316e51eb34057eef0baf62
app/tests/e2e/local-studio-usability.spec.ts    c03e1b2c782f2c3299a13116f43367f60cf48c30e00ba274d525141f0fbd10ff
```

## Remaining verification

Await Parent's integrated browser captures against the frozen art candidate, including all six viewport sizes, and Parent's centralized E2E run. Candidate art URLs/public manifest were not edited. No browser, Next build, or shared server was started by this worker.
