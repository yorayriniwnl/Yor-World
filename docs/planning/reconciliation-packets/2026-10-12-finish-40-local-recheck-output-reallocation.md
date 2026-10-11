# FINISH-40 - FINISH-36 recheck output reallocation

Date: 2026-10-11 UTC. Status: Parent-authorized path-only reallocation. This packet supersedes FINISH-39 output paths only; FINISH-36 scope, candidates, read-only limits, and acceptance boundaries remain unchanged.

## Preservation record

FINISH-39's exact output roots were occupied. Only their immediate top-level names were inventoried; no contents were opened or changed. Preserve these roots intact and do not inspect their contents:

- A1 `deliveries/completion-audits/FINISH-A1/finish-09/20261011T231745Z-a1-r5-r7-parent-local-technical-recheck-04-7c41a9d2/`: `.work/`, `evidence/`, `candidate-binding.json`, `commands.json`, `findings.json`, `report.md`, `requirement-matrix.json`, `tool-versions.json`.
- C1 `deliveries/completion-audits/FINISH-C1/finish-16/20261011T231745Z-c1-r9-parent-local-technical-recheck-04-7c41a9d2/`: `.work/`, `evidence/`, `candidate-binding.json`, `commands.json`, `findings.json`, `report.md`, `requirement-matrix.json`, `tool-versions.json`.

FINISH-39 records that FINISH-37 roots were opened and altered during earlier parent work despite the preceding no-open instruction. Disclose this process-boundary incident in both reports. Do not use FINISH-37, FINISH-38, or FINISH-39 output contents as evidence.

## Governing scope and exact candidates

FINISH-36 remains authoritative: `docs/planning/reconciliation-packets/2026-10-11-finish-36-a1-c1-local-technical-rechecks.md`. FINISH-37 through FINISH-39 and this packet allocate paths only.

- A1: branch `codex/finish-29-a1-r5-r7-20261011`, commit `76d679dcb98064152021830b98f16eb456b3ae19`, tree `6bb0a24c3ec9b716a4728b88fc0e07d5df440cd6`, package subtree `61026e89795d28aa212ee2e03c8edc05b2aea97a`, base `f62a43c5e71c00dcb89e28275ea81d842167db80`.
- C1: branch `codex/finish-30-c1-r9-20261011`, commit `3dda9a616033375768f3d5f60f8c653d504f7c8c`, tree `5a38d405499737ff40b0141a64845c244a9e4813`, package subtree `aa097f12adff2dbac2c88d6300c949f37bf34251`, R8 input `c398876583bc337c069414b79364e3fdea745879`.

## New output roots

These exact roots and this packet file were checked absent before allocation. Recheck each root immediately before creating it. If occupied, preserve it, record only immediate top-level names, and issue another path-only allocation.

- A1: `deliveries/completion-audits/FINISH-A1/finish-09/20261011T232927Z-a1-r5-r7-parent-local-technical-recheck-05-905448b2/`
- C1: `deliveries/completion-audits/FINISH-C1/finish-16/20261011T232927Z-c1-r9-parent-local-technical-recheck-05-905448b2/`

## Required checks and boundaries

Execute FINISH-36 directly from the exact candidate raw Git objects. Rebind local and remote branch identities, commits, parents, trees, delivery/package subtrees, root `app/`, patch/source hashes and allowlists. Recompute every output-manifest row from raw Git blobs.

For A1, confirm patch encoding, exact-base applicability, changed paths, packaged replacements and the six FINISH-24 corrections against candidate source, tests and maker evidence. Run any reviewer checks only in a clean isolated exact-base replay; do not change the candidate. Keep reviewer reruns separate from maker claims.

For C1, compare every inherited R9/R8 file, confirm the precise seven-file R9 delta and the authorized E-02-05 JSON evidence pointer/finalizer-template change, verify every matrix evidence reference resolves and statuses remain unchanged, and inspect the committed false-pass receipt and child exit. Do not run the C1 finalizer or claim inherited behavioral tests were rerun.

Each output root must contain `report.md`, `findings.json`, `requirement-matrix.json`, `candidate-binding.json`, `commands.json`, `tool-versions.json`, supporting evidence, and an output hash manifest. Mark every requirement PASS/FAIL/NOT RUN. Disclose the FINISH-37 process-boundary incident. Keep external GPT Plus #2 audits, implementation acceptance, canonical integration, native providers, physical/device checks, deployment, recovery/manual operations and G7 explicitly pending or NOT RUN absent direct evidence. These are Parent-local technical rechecks, never external audits or acceptance.

Do not alter candidate commits, canonical `app/`, or earlier output roots. Commit and push only completed files beneath the two new output roots; leave all unrelated dirty data untouched.
