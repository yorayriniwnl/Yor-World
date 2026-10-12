# FINISH-50 B1-R8 source-patch supplement

Status: **artifact supplement produced; independent review and Parent decision pending**.

R8 adds a binary-capable `source.patch` that applies the exact R6 raw Git blobs for `assets/room.glb` and `assets/source/room.blend` to the exact R7 outputs. The included replay verifier applies it in an isolated temporary Git repository and checks both output byte counts and SHA-256 values against R7 raw Git blobs. `input-hashes.json` binds the R6/R7 source blobs, R7 output manifest, governance packet and prompt, app tree, and patch. `source-patch-replay.json` records tool versions, commands, exit status, and replay results; `commands.log` captures the executed checks.

The patch changes only those two declared source-bearing files. R6 and R7 have the same canonical app tree; the other seven R6/R7 asset files are blob-identical. The package manifest binds every R8 delivery file other than itself to its exact size and SHA-256.

R8 is based directly on R7 commit `876e119d100936fc821b8618c5aa0e057584b338` (tree `c88be58f85cd46914b271b86d2f5ecda90cc1cce`). R7 and all earlier candidates remain untouched. This supplement does not change app, art, captures, geometry, cameras, or budgets; R7 capture and art evidence are byte-identical by inheritance. No new visual review, device proof, or art acceptance is claimed. Owner visual review remains pending; the R7 mobile frame has only two draw calls of headroom. Physical-device, accessibility, production-services, canonical-integration, and G7 checks remain NOT RUN.

Run from this repository root with Python and Git available:

```powershell
python deliveries/FINISH-B1-R8/scripts/run-finish50-checks.py
python deliveries/FINISH-B1-R8/scripts/build-output-hashes.py
python deliveries/FINISH-B1-R8/scripts/verify-package.py --repo . --commit HEAD
```

The package verifier is intended to run after the R8 commit exists. Stop here for fresh independent review and Parent decision; this report does not accept B1 or authorize integration.
