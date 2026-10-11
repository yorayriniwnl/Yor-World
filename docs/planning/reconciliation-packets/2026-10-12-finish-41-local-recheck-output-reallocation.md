# FINISH-41 - FINISH-36 recheck output reallocation

Date: 2026-10-11 UTC. Status: Parent-authorized path-only reallocation. This packet supersedes FINISH-40 output paths only. FINISH-36 scope, candidate identities, read-only limits, and acceptance boundaries remain unchanged.

## Collision preservation

Both FINISH-40 roots were occupied before use. Only their immediate top-level names were recorded; each contains `.work/` and `evidence/`. Preserve these roots intact and do not inspect their contents:

- A1: `deliveries/completion-audits/FINISH-A1/finish-09/20261011T232927Z-a1-r5-r7-parent-local-technical-recheck-05-905448b2/`
- C1: `deliveries/completion-audits/FINISH-C1/finish-16/20261011T232927Z-c1-r9-parent-local-technical-recheck-05-905448b2/`

FINISH-39 and earlier packets record the FINISH-37 process-boundary incident. Disclose it in both reports. Do not use FINISH-37, FINISH-38, FINISH-39, or FINISH-40 output contents as evidence.

## Governing scope and exact candidates

FINISH-36 remains authoritative: `docs/planning/reconciliation-packets/2026-10-11-finish-36-a1-c1-local-technical-rechecks.md`. FINISH-37 through FINISH-41 allocate paths only.

- A1: branch `codex/finish-29-a1-r5-r7-20261011`, commit `76d679dcb98064152021830b98f16eb456b3ae19`, tree `6bb0a24c3ec9b716a4728b88fc0e07d5df440cd6`, package subtree `61026e89795d28aa212ee2e03c8edc05b2aea97a`, base `f62a43c5e71c00dcb89e28275ea81d842167db80`.
- C1: branch `codex/finish-30-c1-r9-20261011`, commit `3dda9a616033375768f3d5f60f8c653d504f7c8c`, tree `5a38d405499737ff40b0141a64845c244a9e4813`, package subtree `aa097f12adff2dbac2c88d6300c949f37bf34251`, R8 input `c398876583bc337c069414b79364e3fdea745879`.

## New output roots

These roots and this packet path were absent at allocation. Recheck the roots immediately before creation; if either is occupied, preserve it, record immediate names only, and allocate again.

- A1: `deliveries/completion-audits/FINISH-A1/finish-09/20261011T233109Z-a1-r5-r7-parent-local-technical-recheck-06-85bd61e0/`
- C1: `deliveries/completion-audits/FINISH-C1/finish-16/20261011T233109Z-c1-r9-parent-local-technical-recheck-06-85bd61e0/`

## Required checks and boundaries

Run FINISH-36 directly from the exact candidate raw Git objects. Rebind local and remote branches, commits, parents, trees, delivery/package subtrees, root `app/`, patch/source hashes and allowlists. Recompute every output-manifest row from raw Git blobs.

For A1, confirm patch encoding, exact-base applicability, changed paths, packaged replacements and the six FINISH-24 corrections against candidate source, tests, and maker evidence. Run reviewer checks only in a clean isolated exact-base replay; do not change the candidate. Keep reviewer reruns separate from maker claims.

For C1, compare every inherited R9/R8 file, confirm the exact seven-path R9 delta and authorized E-02-05 JSON evidence-pointer/finalizer-template change, resolve every matrix evidence reference, preserve all matrix statuses, and inspect the committed false-pass receipt and child exit. Do not run the C1 finalizer or claim inherited behavioral tests were rerun.

Each output root needs `report.md`, `findings.json`, `requirement-matrix.json`, `candidate-binding.json`, `commands.json`, `tool-versions.json`, supporting evidence, and an output-hash manifest. Mark each requirement PASS/FAIL/NOT RUN. Disclose the FINISH-37 process-boundary incident. Keep GPT Plus #2 audits, implementation acceptance, canonical integration, native providers, physical/device checks, deployment, recovery/manual operations, and G7 explicitly pending or NOT RUN without direct evidence. These remain Parent-local technical rechecks, never external audits or acceptance.

Do not alter candidate commits, canonical `app/`, or earlier output roots. Commit and push only the completed files under the two new roots; leave all unrelated dirty data untouched.
