# FINISH-38 - FINISH-36 recheck output reallocation

Date: 2026-10-11 UTC. Status: Parent-authorized path-only reallocation. This packet supersedes FINISH-37's output paths only; all FINISH-36 requirements, candidate identities, read-only limits, and acceptance boundaries remain unchanged.

## Collision preservation

The first FINISH-36 output roots were already occupied and were preserved under FINISH-37. FINISH-37's new paths also became occupied before use. Per FINISH-37, their contents were not opened or modified; only top-level inventory was recorded.

- A1 FINISH-37 root `deliveries/completion-audits/FINISH-A1/finish-09/20261011T230854Z-a1-r5-r7-parent-local-technical-recheck-02/`: empty top-level inventory when checked.
- C1 FINISH-37 root `deliveries/completion-audits/FINISH-C1/finish-16/20261011T230854Z-c1-r9-parent-local-technical-recheck-02/`: top-level `.work/` and `evidence/` directories.

Preserve these roots intact. Do not inspect their contents. New paths below were checked absent before allocation. Recheck each exact path immediately before writing; on collision, preserve it, record top-level names only, and request another allocation.

## Exact candidates and governing scope

FINISH-36 remains governing: `docs/planning/reconciliation-packets/2026-10-11-finish-36-a1-c1-local-technical-rechecks.md`. FINISH-37 supplies the preceding path history. No check requirement or candidate base is changed.

- A1: branch `codex/finish-29-a1-r5-r7-20261011`, commit `76d679dcb98064152021830b98f16eb456b3ae19`, full tree `6bb0a24c3ec9b716a4728b88fc0e07d5df440cd6`, delivery subtree `61026e89795d28aa212ee2e03c8edc05b2aea97a`, base `f62a43c5e71c00dcb89e28275ea81d842167db80`.
- C1: branch `codex/finish-30-c1-r9-20261011`, commit `3dda9a616033375768f3d5f60f8c653d504f7c8c`, full tree `5a38d405499737ff40b0141a64845c244a9e4813`, delivery subtree `aa097f12adff2dbac2c88d6300c949f37bf34251`, R8 input `c398876583bc337c069414b79364e3fdea745879`.

Both remote branches were checked at those commits on 2026-10-11 UTC.

## New output roots

- A1: `deliveries/completion-audits/FINISH-A1/finish-09/20261011T231434Z-a1-r5-r7-parent-local-technical-recheck-03-ad5e3362/`
- C1: `deliveries/completion-audits/FINISH-C1/finish-16/20261011T231434Z-c1-r9-parent-local-technical-recheck-03-ad5e3362/`

## Required work and limits

Execute the full read-only FINISH-36 checks from raw Git objects. Rebind remote branches, commits, parents, trees, package subtrees, root `app/`, candidate patch/source hashes, and allowlists. Recompute each output-manifest row from raw Git blobs. For A1, verify patch encoding/applicability, exact changed-path set and packaged replacements; review the six FINISH-24 findings against source/tests and maker evidence. For C1, compare every inherited R9/R8 file, confirm only the authorized E-02-05 pointer and matching finalizer template differ, verify all matrix evidence paths resolve, matrix statuses are unchanged, and inspect the committed false-pass receipt and exit result. Do not run the C1 finalizer or claim inherited C1 behavioral tests were rerun. Rerun focused A1 checks only in an isolated exact-base/replay workspace and only if the pinned environment permits without changing the candidate. Separate reviewer reruns from maker claims.

Write a concise report, structured findings and requirements matrix, exact candidate bindings, commands and versions, evidence, and output hashes under the new roots. Keep GPT Plus #2, implementation acceptance, canonical integration, native providers, physical/device, deployment, recovery/manual operations, and G7 gates explicitly pending or NOT RUN unless direct evidence is available. These remain Parent-local technical rechecks, not external independent audits or acceptance. Do not change candidate commits, canonical `app/`, or any earlier audit evidence. Commit and push only completed files under the two new roots, leaving all other dirty data untouched.