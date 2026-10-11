# FINISH-15 — local correction return readiness check

Date: 2026-10-11 UTC; latest scope snapshot at 06:07:39 UTC
Scope: read-only check of the current A1-R5 and B1-R3 local return folders. This is not a full source audit or an implementation acceptance.

## A1-R5

The scratch checkout at `deliveries/FINISH-A1/r5-02/.work/candidate/` has 21 changed paths. All 21 are within the frozen 26-path A1 allowlist clarified by FINISH-14. This is only a path-scope preflight: the checkout is still uncommitted and the stable `deliveries/FINISH-A1/r5-02/` root currently has only `.work/` and two red-test logs under `evidence/`. It has no returned patch, candidate output hashes, standalone requirement matrix, or final report, so it is not ready for independent audit. No tests were run against the mutable checkout in this check.

## B1-R3

The delivery root contains source/assets and validation folders, but no stable top-level report, input/output hash manifests, changed-path inventory, or standalone requirement matrix. A hash-bound post-batching browser run produced 202 desktop draw calls and 146 mobile draw calls against frozen limits of 120 and 80. Both profiles are explicitly `FAIL`; the separate assertion says `202 > 120` and `146 > 80`. The static-batch report's `PASS` indicates batch generation completed; it does not pass the renderer budgets.

The draw-attribution JSON binds the loaded asset hashes; the three static-batch exports named in its report were rehashed locally and matched. The saved browser result records Chromium 153.0.8010.12, Playwright 1.63.0, 30,544 triangles, 101 geometries, and the NVIDIA RTX 2060 renderer. This progress evidence does not establish the remaining required motion, geometry, clearance, capture, and runtime-profile requirements. B1-R3 therefore remains incomplete and is not ready for implementation acceptance.

| Evidence | Bytes | SHA-256 |
| --- | ---: | --- |
| `deliveries/FINISH-B1-R3/validator-logs/draw-attribution-final-hash-bound-run.log` | 8,927 | `17bd695c93f84a0a883cbcf8873f987d4795e5205da03833e4a7fafb050ce482` |
| `deliveries/FINISH-B1-R3/validator-logs/draw-budget-assertion-final.log` | 74 | `74a4ef251290615891546b6468b6ea241a42cda9ff49e682ebda959d1cfe8e69` |
| `deliveries/FINISH-B1-R3/validator-logs/final-browser-hash-bound-run.log` | 2,898 | `598a0a87a65183923834dbee6a663add2489e2037b53af5fb787e00f65e96e4c` |
| `deliveries/FINISH-B1-R3/validator-logs/static-batch-report.json` | 31,709 | `0601fad4138136b6b082f1dbf796f27080d55484698d1a62c16a5034db2696c2` |
| `deliveries/FINISH-B1-R3/validator-logs/draw-call-attribution.json` | 49,194 | `f7aee123fcdf4d2c589c11f10c9c7ac14727576c9c0a91e75b20c1477daecc06` |

No canonical `app/` changes were made. The makers still own their source and asset corrections; these folders must return complete, exact, hash-bound packages before a full independent audit and separate Parent decision.
