# FINISH-39 - FINISH-36 recheck output reallocation

Date: 2026-10-11 UTC. Status: Parent-authorized path-only reallocation. This packet supersedes FINISH-38 output paths only; FINISH-36 requirements, exact candidates, read-only limits, and acceptance boundaries are unchanged.

## Preservation and process record

FINISH-38's two exact output roots were occupied before use. Only their top-level names were inspected; both contained `.work/` and `evidence/`. Preserve both roots intact and do not inspect their contents.

The FINISH-37 roots were opened and used by Parent during this continuation after the FINISH-37 no-open instruction was read. Their contents were also altered with temporary audit work. Preserve them and do not inspect them further. The FINISH-39 reports must disclose this process-boundary incident. No candidate commit or canonical `app/` file was changed.

## Exact candidates and governing scope

FINISH-36 remains the governing check packet: `docs/planning/reconciliation-packets/2026-10-11-finish-36-a1-c1-local-technical-rechecks.md`. FINISH-37 and FINISH-38 allocate paths only.

- A1: branch `codex/finish-29-a1-r5-r7-20261011`, commit `76d679dcb98064152021830b98f16eb456b3ae19`, full tree `6bb0a24c3ec9b716a4728b88fc0e07d5df440cd6`, delivery subtree `61026e89795d28aa212ee2e03c8edc05b2aea97a`, base `f62a43c5e71c00dcb89e28275ea81d842167db80`.
- C1: branch `codex/finish-30-c1-r9-20261011`, commit `3dda9a616033375768f3d5f60f8c653d504f7c8c`, full tree `5a38d405499737ff40b0141a64845c244a9e4813`, delivery subtree `aa097f12adff2dbac2c88d6300c949f37bf34251`, R8 input `c398876583bc337c069414b79364e3fdea745879`.

## New output roots

These exact paths were absent when allocated; recheck immediately before writing:

- A1: `deliveries/completion-audits/FINISH-A1/finish-09/20261011T231745Z-a1-r5-r7-parent-local-technical-recheck-04-7c41a9d2/`
- C1: `deliveries/completion-audits/FINISH-C1/finish-16/20261011T231745Z-c1-r9-parent-local-technical-recheck-04-7c41a9d2/`

If either is occupied, preserve it and record top-level names only, then allocate again. Do not read or alter FINISH-37 or FINISH-38 roots.

## Required work and limits

Run the full FINISH-36 read-only checks against raw Git objects. Rebind remote branches, commits, parents, trees, package subtrees, root `app/`, candidate patch/source hashes, and allowlists. Recompute each output-manifest row from raw Git blobs. For A1, verify patch encoding and exact-base applicability, changed-path inventory and packaged replacements; review the six FINISH-24 findings against candidate source/tests and maker evidence. For C1, compare every inherited R9/R8 file, verify only the authorized E-02-05 evidence-pointer and matching finalizer-template changes, resolve every matrix evidence path, preserve all matrix statuses, and inspect the committed negative-receipt result and exit. Do not run the C1 finalizer or claim inherited C1 behavioral tests were rerun. Rerun focused A1 checks only in a clean isolated exact-base replay when the pinned environment permits, without changing the candidate.

Report reviewer reruns separately from maker claims. Disclose the FINISH-37 process-boundary incident without using its contents as evidence. Keep GPT Plus #2, implementation acceptance, canonical integration, native providers, physical/device, deployment, recovery/manual operations, and G7 gates pending or NOT RUN unless direct evidence exists. These are Parent-local technical rechecks, not independent external audits or acceptance. Do not change candidate commits, canonical `app/`, or earlier audit evidence.

Each output root needs a concise `report.md`, structured findings and requirement matrix, exact candidate binding, commands/tool versions, supporting evidence, and an output-hash manifest. Commit and push only the two completed new output roots, leaving all unrelated dirty data untouched.
