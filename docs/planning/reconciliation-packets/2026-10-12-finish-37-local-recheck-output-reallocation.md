# FINISH-37 - FINISH-36 recheck output reallocation

Date: 2026-10-11 UTC. Status: Parent-authorized path-only reallocation. Owner instruction: "Now start executing. Fix all. Work till you complete all. Complete the work fully. Each and everything."

## Reason and preservation

FINISH-36 assigned read-only Parent-local technical rechecks of A1 R5-R7 and C1 R9. Its exact output roots were occupied when checked immediately before use. Per FINISH-36, their contents were not opened or modified; only top-level names were recorded.

- A1 prior root `deliveries/completion-audits/FINISH-A1/finish-08/20261011T224512Z-a1-r5-r7-parent-local-technical-recheck-01/` contains top-level `.work/`, `evidence/`, `candidate-binding.json`, `commands.json`, `findings.json`, `output-hashes.json`, `report.md`, `requirement-matrix.json`, and `tool-versions.json`.
- C1 prior root `deliveries/completion-audits/FINISH-C1/finish-15/20261011T224512Z-c1-r9-parent-local-technical-recheck-01/` contains the same top-level names.

Preserve both prior roots intact. This packet reallocates output paths only; it does not change FINISH-36 requirements, candidate identities, test scope, or acceptance boundaries.

## Exact candidates and governing packet

FINISH-36 remains the governing scope: `docs/planning/reconciliation-packets/2026-10-11-finish-36-a1-c1-local-technical-rechecks.md`.

- A1: commit `76d679dcb98064152021830b98f16eb456b3ae19`, tree `6bb0a24c3ec9b716a4728b88fc0e07d5df440cd6`, package subtree `61026e89795d28aa212ee2e03c8edc05b2aea97a`, base `f62a43c5e71c00dcb89e28275ea81d842167db80`.
- C1: commit `3dda9a616033375768f3d5f60f8c653d504f7c8c`, tree `5a38d405499737ff40b0141a64845c244a9e4813`, package subtree `aa097f12adff2dbac2c88d6300c949f37bf34251`, R8 input `c398876583bc337c069414b79364e3fdea745879`.

Both remote branches were read-only checked at those exact commits on 2026-10-11 UTC.

## New output roots

The parent directories and exact paths were checked absent before allocation. Use these fresh roots:

- A1: `deliveries/completion-audits/FINISH-A1/finish-09/20261011T230854Z-a1-r5-r7-parent-local-technical-recheck-02/`
- C1: `deliveries/completion-audits/FINISH-C1/finish-16/20261011T230854Z-c1-r9-parent-local-technical-recheck-02/`

Recheck each exact root immediately before writing. If either has become occupied, preserve it, record its top-level inventory without opening contents, and request another path allocation.

## Required work and limits

Execute the complete FINISH-36 recheck against raw Git identities and outputs. Rebind remote branches and commits; recompute package output hashes from raw Git blobs; verify bases, patches, allowlists, package trees, changed-file inventories, unchanged canonical app tree, and recorded build/browser/source bindings. Review the exact prior audit findings and maker evidence named in FINISH-36. Rerun focused checks only if the pinned local environment permits without modifying a candidate; distinguish rerun evidence from maker-reported evidence. For C1, do not run the finalizer or claim inherited behavioral tests were rerun. Record provider, device, deployment, external GPT Plus #2, Parent acceptance, and G7 gates separately as pending or NOT RUN unless direct evidence exists.

This remains a Parent-local technical recheck. It is not an independent GPT Plus #2 audit, implementation acceptance, canonical integration, or G7 acceptance. Do not edit candidate commits, `app/`, or prior evidence. Each new root must contain a concise `report.md`, structured findings and requirement matrix, exact candidate bindings, commands/tool versions, and hashes. Commit and push only the two new, completed output roots in separate scoped commits or one scoped commit, leaving unrelated working-tree data untouched.