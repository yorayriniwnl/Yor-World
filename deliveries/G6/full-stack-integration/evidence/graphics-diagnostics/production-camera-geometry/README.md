This is a read-only maker geometry diagnostic for the current, uncommitted RC3 camera candidate. It is not independent audit or G6 acceptance.

Run from the repository root:

```powershell
node deliveries/G6/full-stack-integration/evidence/graphics-diagnostics/production-camera-geometry/check.mjs app deliveries/G6/full-stack-integration/evidence/graphics-diagnostics/production-camera-geometry/result.json
```

The script extracts the actual camera presets and `entrancePositionAt` from their TypeScript ASTs, decodes the frozen production GLB's original mesh buffers and world transforms, and checks both complete entrance segments against every door-hinge descendant using double-sided triangle raycasts. Only in-memory materials are simplified to avoid Node bitmap decoding. Production files and transforms are not written.

The recorded check returns PASS for desktop and mobile paths with zero intersections. The frozen leaf subtree is already outside the entrance corridor because of inherited parent/local translations: X approximately -3.76 to -2.41, Y 0.01 to 2.14, Z 3.58 to 5.47. This pre-existing asset condition must remain visible to the independent audit. No asset transform correction was authorized or performed. Actual hashes, tool versions, Git HEAD, and relevant uncommitted source paths are in `result.json`.

Separately, the parent ran the five `app/tests/integration/production-camera.test.ts` geometry tests successfully. Those tests exercise the real `EntranceCoordinator` trajectory at 201 frame times per viewport, check static shell and doorframe clearance over complete segments, and check production HOME raycasts. They are maker execution evidence and do not accept the packet. G6 remains ACTIVE / REWORK; G7 remains LOCKED.
