# FINISH-33 - C1-R8 duplicate JSON member correction

Date: 2026-10-11 UTC. Parent decision: **REWORK for E-02 only** on exact candidate `364d8ff690d3dc814a09406873433d9cb397b574`. The new maker correction is authorized and queued until the current FINISH-31 review is complete. E-01 and project acceptance remain separate.

## Finding and exact source

The FINISH-29 independent report is `deliveries/completion-audits/FINISH-C1/finish-13/20261011T142400Z-c1-r8-delta-review-01/report.md`; findings are in the adjacent `findings.json`. It records one HIGH finding, `FIN29-E02-01`: duplicate JSON object members are discarded by ordinary `json.loads` before field validation. The auditor independently ran 33 uncached CLI cases: one positive control, seven correct rejections, and 25 false passes for contradictory repeated members whose authoritative value appears last. The 25 cases comprise 15 primary and 10 additional cases. Reverse order and singleton wrong-value controls reject. The 51 supplied negative cases, 76 reviewer type/container probes, exact patch replay, and preservation checks pass. The candidate and installed Three package were unchanged.

Audit only the exact R8 candidate:

- Commit: `364d8ff690d3dc814a09406873433d9cb397b574`.
- Parent: `b33631a9bcbd74cfca9e8f2495140a5eee322a9a`.
- Full tree: `a29a29f7027f5d72e496c58f327d2e03058d2ad1`.
- App tree: `42ea29ec235225046a75959eb19eb386ac2f821d`.
- R8 delivery subtree: `b3b98efa08045f520a00abf4569145ffa3ba3ee7`.

## Maker, root, and immutable boundary

Maker: local Codex runtime-lane worker `/root/c1_r8_maker`, after it completes its active FINISH-31 audit. The FINISH-29 auditor B1-R4 must not implement the correction. External GPT Plus #2 is NOT RUN.

Start from exact immutable R8 commit `364d8ff690d3dc814a09406873433d9cb397b574` in a fresh worktree and branch:

- Branch: `codex/finish-33-c1-r8-duplicate-json-20261011`.
- Exclusive new delivery root: `deliveries/FINISH-C1-R9/`.

The Parent checked `deliveries/FINISH-C1-R9/` absent in both canonical checkout and exact candidate worktree, and checked the local/remote branch names absent at allocation. Recheck before writing. If occupied, preserve without inspection and stop for Parent reallocation. Keep scratch under `.work/`. Commit and push only stable R9 package paths. Do not alter R8, R7, their inputs, historical audit roots, installed dependencies, canonical `app/`, or any unrelated delivery. R9 is a new correction candidate; no prior candidate is amended or replaced.

## Required correction

Reject duplicate JSON object member names at every nesting level before any semantic field validation. Reject both contradictory duplicates and repeated identical values. Apply the duplicate-rejection policy consistently to every JSON entry point that consumes evidence or receipts in this verifier, including `source-binding.json`, candidate provenance, predecessor output manifests, installed package identity, package-file rows, shared byte loaders, and log-derived JSON where parsed. Do not accept last-member-wins behavior. Preserve exact pinned Git/raw-byte source checks, installed package identity/bytes, and all valid R8 positive behavior.

Add raw-byte, uncached CLI regressions for duplicate members in every previously exposed schema family: all five `sourceManifest` fields (`commit`, `path`, `blobOid`, `sha256`, `bytes`); both `packageFiles` rows and their `alias`, `packageFile`, `sha256`, and `bytes`; duplicated package name/version; source-binding and candidate schema versions; R6 binding SHA/OID; predecessor source-manifest and output SHA/OID; candidate corrected-source SHA; and actual disposable installed `package.json` name/version. Test contradictory values in both member orders and same-value duplicates. Include nested-object duplicates and duplicates in arrays of objects. The unmodified exact R8 input set must still pass. The original R8 51 negative cases, reviewer 76 type/container probes, and preservation controls remain passing.

Use disposable copies for every mutation. Probes must run through uncached CLI processes with actual raw receipt bytes, preserve the original R8 tree and candidate inputs byte-for-byte, and keep the installed Three package unchanged. The raw JSON bytes under test must not be normalized through a dict before duplicate testing. Include a minimal reproduction and full test inventory.

## Return and limits

Return a complete `deliveries/FINISH-C1-R9/` package with exact source patch/replacements, candidate binding, changed-path inventory, raw input/output hashes, tests, command/tool/exit receipts, report, and a requirement matrix. Replay the correction from exact R8 bytes; show all replacements are byte-identical to the package. Mark every result PASS/FAIL/NOT RUN. Distinguish maker evidence from a separate FINISH-34 independent exact-candidate audit.

This correction addresses E-02 only. Do not reinterpret or close E-01's historical receipt findings. External GPT Plus #2, application/runtime/build/browser/device/provider checks, Parent implementation acceptance, canonical integration, deployment, and G7 remain separate and NOT RUN unless separately evidenced. Stop after delivering the candidate; do not self-accept or integrate.