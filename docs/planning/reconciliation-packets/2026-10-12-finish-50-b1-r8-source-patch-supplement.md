# FINISH-50 - B1 R8 source-patch supplement

Date: 2026-10-12. Status: Parent-authorized, evidence-only maker follow-up. This does not accept B1 or authorize integration.

## Finding and preservation

FINISH-47 required a scoped source patch, but FINISH-B1-R7 contains the editable Blender source, build/merge scripts and correction-diff.json without a source.patch. A local cross-lane audit verified the R7 package binding and art receipts, but recorded this required artifact omission. Preserve R7 and all earlier candidates unchanged.

Pinned identities:

- R6 base commit: e8ea9187c1b6cd47b66ce7de9ad520daf9bd6baf; tree 60da77df9e600670a416635101558203872bde7b.
- R7 candidate commit: 876e119d100936fc821b8618c5aa0e057584b338; tree c88be58f85cd46914b271b86d2f5ecda90cc1cce.
- R7 output manifest SHA-256: 2a56fb6bf39ffe742bb75a16fa5cb4ab89f155319b6cf1f4918ca43419f8941a.
- The two changed source-bearing outputs are assets/room.glb (SHA-256 7d1c11e3d67f84fddbbaac609c2ca88a025cec400fe2cddb15ab1a92cf29bb67) and assets/source/room.blend (SHA-256 1820982983ce8bc785ddfcc97c2a0abec738c0d311aaf1fe632aca5c0fad5600).

## Authorized correction

Create a separate R8 artifact-only candidate on branch codex/finish-50-b1-r8-source-patch-supplement-20261012, directly based on R7. Write only deliveries/FINISH-B1-R8/; do not rewrite R7 or change app, assets, captures, geometry, cameras, or budgets.

Create a binary-capable source.patch from the exact R6 raw Git blobs to the exact R7 room.glb and room.blend outputs. Add a small deterministic replay/verifier that applies the patch in an isolated scratch copy of the R6 inputs and proves both resulting files match R7's committed size and SHA-256. The patch must be usable independently of R7's edit scripts; correction-diff.json is supporting evidence, not a substitute. Bind the R6 raw blob IDs, patch hash/size, R7 output hashes, exact replay command, tool versions and exit status. Confirm the patch touches only the two declared files and that app and all other art inputs remain unchanged.

Rebind the R7 package's output manifest from raw Git and include input-hashes.json, output-hashes.json, source-patch-replay.json, raw commands.log and report.md. Mark this as an artifact supplement only: captures and art are byte-identical to R7; no new visual review, device proof or art acceptance is claimed. Commit and push the scoped R8 package.

If a binary-capable patch cannot be replayed to both exact output hashes, record FAIL/NOT RUN with the measured reason and stop. Do not edit R7 or substitute a JSON diff as the required patch.

## Stop gate

Stop for a fresh exact-candidate GPT Plus #2 review and Parent decision. Owner visual review for R7's art remains pending; the mobile frame has only two draw calls of headroom. Physical devices, accessibility, production services, canonical integration and G7 remain NOT RUN.
