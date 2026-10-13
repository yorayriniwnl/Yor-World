# Art continuation: attempt 13

Status: candidate evidence only. This attempt corrects the Blender authoring HOME_DESKTOP view after the attempt-12 desktop preview showed the chair blocking the desk. It is not visual acceptance, provenance approval, Parent admission, or a browser/runtime capture. No app/public GLB or manifest was changed by this attempt.

## Source and camera change

The immutable source snapshot is evidence/build-attempt-13-source-snapshot/, bound by source-record.json (SHA-256 cc6a74e1d63ed3ddf8f644b971917a2379d9ee04a45377e6527370124197b46d). Its 17 recorded source and attempt-09 manifest inputs matched their recorded hashes at snapshot time. The environment builder is SHA-256 cbbbf097a0cdf4f758203f4e094ebd691c2d0f8ac724347c9f4e7e66e440eb18; source/art_refinements.py is 0df9e733db7487f5b98d43020d7cad39515d7b5274713f40802a937029f22472.

Only the Blender authoring preset camera-home-desktop changed relative to attempt 12: position (0.25, 1.25, 0.45) to (-1.55, 1.42, 1.05), target (0.05, 0.95, -1.15) to (0, 1, -1.1), and FOV 50 to 43 degrees. This matches the proposed HOME_DESKTOP pose in the accepted art specification. It does not edit the runtime CameraDirector. Furniture and chair transforms, mobile camera preset, and other source inputs were preserved.

Blender 5.2.2 LTS generated evidence/build-attempt-13/. The captured PowerShell invocation reported Blender's Material.use_nodes deprecation warning on stderr as NativeCommandError; the build log evidence/environment-execution-attempt-13.log (SHA-256 586c1ac8ca6de750027e689083b9028b6203ce664cbe7ffc30c92846706d224c) ends with PRODUCTION ENVIRONMENT BUILD COMPLETE and contains no Python traceback. The six export inspections below independently completed. The render process log is evidence/environment-render-attempt-13.log (SHA-256 0ed8b114e230270db1a6eaba6c869431d0ddd4111c16156948a7f76f377b227e).

## Candidate exports and validation

The full inspection record is evidence/export-inspection-attempt-13.json (SHA-256 7176b2094a5916863111ee7218652795b440b384a474b04eb7aea470fd59907c). glTF Validator 2.0.0-dev.3.10 reported zero errors and zero warnings for all six inspected GLBs. Authored node-transform and strict-bounds checks passed: Group A 136/136, Group B 111/111, on-demand projects 33/33, full room 280/280, mobile room 280/280, and fixture 68/68.

| Candidate output | Evidence path | Bytes | Triangles | SHA-256 |
| --- | --- | ---: | ---: | --- |
| Group A | evidence/build-attempt-13/runtime/group-a-essential.glb | 908,368 | 7,876 | 2feaec244d5c88e3e905bc6b713d30cd0d51cb9c03331d979ede7b5b7892cada |
| Group B | evidence/build-attempt-13/runtime/group-b-props.glb | 613,832 | 7,036 | 60191445f604d5f8200aa4b70350e995074f734ea17b88b083cae3ed53e7a795 |
| On-demand projects | evidence/build-attempt-13/runtime/on-demand-projects.glb | 106,496 | 1,472 | 1ed121f2ecc0242734e215ff6c53788c0d4b0817010c4376a391ab6eb8cd0f71 |
| Full room | evidence/build-attempt-13/runtime/production-room-full.glb | 1,620,840 | 16,384 | 75d50104b3c28c6de12fec9df23273b69717f9063118b165771f0ca762f369b5 |
| Mobile LOD | evidence/build-attempt-13/runtime/mobile-room-lod.glb | 1,515,500 | 12,632 | e74c8fd0476f25dde4f37de2dc8f6a49e8466565628ea85837e2e712d98a43a2 |
| Resident fixture, carried from attempt 04 | evidence/fixture-attempt-04/runtime/fixture-production.glb | 391,396 | 8,080 | 828a03348604924a3c030e4de9cec566cf3154111d4553ce37488ac860b40da2 |

The fixture is the attempt-04 candidate export and is not byte-identical to the fixture recorded in the attempt-09 app-manifest snapshot. Its earlier Blender interaction evidence remains in evidence/fixture-attempt-04/blender-checks.json (SHA-256 65571ba4c9c07fe93c177e77456f8bcb9b8af76caa1099efaa3175c7e83e671); all eight animation states report zero desktop hits and grounded soles, with intended pelvis-seat contact only. The turn and greeting hand clearances are 0.16 m and 0.3312 m. This evidence is carried forward, not a new attempt-13 interaction run.

The per-mesh LOD record is evidence/mobile-lod-comparison-attempt-13.json (SHA-256 45d954fa8174645d43d006fa0c38e668bbf29f0d9d83669c0f0caf6f70b28efe). The required 0.55 target was met for all 37 eligible meshes: 8,240 source triangles became 4,488 (actual ratio 0.544660). Fifteen protected meshes totaling 2,368 triangles remained unchanged. Full-to-mobile totals are 16,384 to 12,632 triangles, saving 3,752 triangles, 105,340 GLB bytes, and 106,804 estimated GPU bytes.

## Offline preview captures

evidence/build-attempt-13/renders-preliminary/environment-render-manifest.json (SHA-256 78d80cbdc9068ceeb0cbbc373e4a0a6b160223f4b8cb54b8764a3eba586e80c) records the attempt-13 source renders. The required six viewport files are:

- evidence/build-attempt-13/renders-preliminary/environment-desktop-1440x1000.png
- evidence/build-attempt-13/renders-preliminary/environment-wide-1920x1080.png
- evidence/build-attempt-13/renders-preliminary/environment-tablet-1024x768.png
- evidence/build-attempt-13/renders-preliminary/environment-portrait-390x844.png
- evidence/build-attempt-13/renders-preliminary/environment-small-portrait-320x600.png
- evidence/build-attempt-13/renders-preliminary/environment-landscape-844x390.png

Additional entry and monitor-focus views are in the same directory. These are offline Blender source renders, not integrated-browser screenshots. The desktop comparison is evidence/build-attempt-12/renders-preliminary/environment-desktop-1440x1000.png before (SHA-256 32ea4ff2c4193cfb2250c349e5097e122c0bc94a70698f899b7af7ececb5aaa0) and evidence/build-attempt-13/renders-preliminary/environment-desktop-1440x1000.png after (SHA-256 4d9629c09bd82dff51c5e52e95b627c1f949a2edc40b3d0aa0f3d37a2eba33b0). The revised source camera reveals substantially more desk and monitor while moving the chair toward frame right. The mobile camera source was unchanged. Pixel comparison found all 329,160 pixels identical (mean absolute channel delta 0), although PNG hashes differ: attempt 12 SHA-256 894489148e4c54305109299ea586a4a3873f572306d65dd7c92ead05373e1ad3 and attempt 13 SHA-256 5f260b937349c886596978b740375d0c2bd1433b94ade2a2e289c0bfeecb82e1. Ceiling and foreground-chair framing remain unresolved until runtime capture.

## Re-export difference and pending work

evidence/attempt-12-13-glb-binary-comparison.json (SHA-256 a813bb9d23465c0d36b42d99610958e0c5caafca66e1459721a809d671d63c42) is deliberately recorded as FAIL: attempt-13 GLBs have different payload hashes from attempt 12 despite the authoring-camera-only source edit. Their GLB JSON metadata, file lengths, inspector transform/bounds results, and triangle counts match. Group A, Group B, on-demand, and full-room POSITION/NORMAL buffers match, but UV/index buffer views differ. In mobile LOD, seven decimated meshes (chair_wheel_1 through chair_wheel_5, ivy_mound, and succulent_leaf_center) also have changed POSITION/NORMAL buffer views, while their triangle counts and authored-bound checks still pass. This is a real reproducibility difference, not a passing byte-equivalence check; the exports need Parent review before integration.

Browser screenshots, direct all-group/on-demand interaction coverage, independent visual/provenance audit, and Parent acceptance are not run in this attempt. No candidate files were copied into app/public, and the app or revision asset manifests were not edited by this attempt. Keep every output approved:false / candidate-only until separately accepted.