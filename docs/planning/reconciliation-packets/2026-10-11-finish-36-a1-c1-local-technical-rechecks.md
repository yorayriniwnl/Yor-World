# FINISH-36 — A1 and C1 parent-local technical rechecks

Date: 2026-10-11 UTC. Status: Parent-authorized, read-only local rechecks of exact delivered packages. These reports are preliminary Parent-local technical evidence. They do not substitute for the still-required GPT Plus #2 audits, Parent acceptance, or canonical integration.

## A1 candidate

- Exact candidate: `76d679dcb98064152021830b98f16eb456b3ae19` (`codex/finish-29-a1-r5-r7-20261011`).
- Full tree: `6bb0a24c3ec9b716a4728b88fc0e07d5df440cd6`.
- Package subtree: `61026e89795d28aa212ee2e03c8edc05b2aea97a`.
- Root `app/` tree: `42ea29ec235225046a75959eb19eb386ac2f821d`.
- Governing independent-audit handoff: [FINISH-32](2026-10-11-finish-32-a1-r5-r7-independent-audit.md), exact base `f62a43c5e71c00dcb89e28275ea81d842167db80`, patch SHA-256 `aa9b91f613a0f1b98e6da7735ec0513d10d0e1c2e78512fff63ecc19ee717dd8`.
- Output root: `deliveries/completion-audits/FINISH-A1/finish-08/20261011T224512Z-a1-r5-r7-parent-local-technical-recheck-01/`.

Rebind the candidate and remote branch; recompute every package output hash from raw Git bytes; confirm the exact base, package source, patch, path allowlist, unchanged root app, and build/browser bindings. Review the six FINISH-24 corrections, relevant source/tests and recorded command results. Re-run focused checks only when the pinned local environment permits without modifying the candidate. Mark external services, deployed behavior, GPT Plus #2 review, and Parent acceptance separately. Do not edit the candidate, canonical app, or historical evidence. Do not label this report an independent GPT Plus #2 audit or acceptance.

## C1 candidate

- Exact candidate: `3dda9a616033375768f3d5f60f8c653d504f7c8c` (`codex/finish-30-c1-r9-20261011`).
- Full tree: `5a38d405499737ff40b0141a64845c244a9e4813`.
- Package subtree: `aa097f12adff2dbac2c88d6300c949f37bf34251`.
- Root `app/` tree: `42ea29ec235225046a75959eb19eb386ac2f821d`.
- Governing independent-audit handoff: [FINISH-34](2026-10-11-finish-34-c1-r9-independent-audit.md), exact R8 input `c398876583bc337c069414b79364e3fdea745879`.
- Output root: `deliveries/completion-audits/FINISH-C1/finish-15/20261011T224512Z-c1-r9-parent-local-technical-recheck-01/`.

Rebind the candidate, remote branch and R8 input; recompute all output hashes from raw Git blobs; compare inherited R9/R8 files and the relative changed-file inventory; verify the matrix/finalizer evidence-pointer change, false-pass receipt, resolved evidence references, unchanged matrix statuses, and unchanged root app. Do not run the finalizer or claim inherited tests were rerun. Keep E-01, GPT Plus #2, Parent acceptance, provider/device checks, deployment, and G7 open or NOT RUN unless separately evidenced. Do not edit candidate or canonical source.

## Output and decision boundary

Each exact output root must be rechecked immediately before use. If occupied, preserve it and report its exact top-level inventory without inspecting contents. Return a concise `report.md`, structured findings and requirement matrix, exact candidate bindings, commands/tool versions and output hashes. Mark every check PASS/FAIL/NOT RUN. No output from this packet accepts or integrates a candidate. Preserve all unknown `.work` data and historical packages. Parent will separately inspect and decide whether any local recommendation is sufficient for its own acceptance step; required external audits remain pending.
