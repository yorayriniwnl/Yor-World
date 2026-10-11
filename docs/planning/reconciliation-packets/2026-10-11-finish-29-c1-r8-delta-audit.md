# FINISH-29 — C1-R8 exact-candidate delta audit

Date: 2026-10-11 UTC. Status: local independent delta audit assigned; Parent acceptance remains pending.

## Candidate identity and separate lineage

Audit only the known C1-R8 maker commit `364d8ff690d3dc814a09406873433d9cb397b574` on `codex/finish-c1-r8-e02-verifier`. Its parent is `b33631a9bcbd74cfca9e8f2495140a5eee322a9a`, full tree is `a29a29f7027f5d72e496c58f327d2e03058d2ad1`, R8 subtree is `b3b98efa08045f520a00abf4569145ffa3ba3ee7`, and app tree remains `42ea29ec235225046a75959eb19eb386ac2f821d`.

The package output manifest lists 25 stable outputs totaling 237,622 bytes and has SHA-256 `0f1a4fd53ca549f35b724fb548272d7b2bd068d0f8f7d41467d5a1d6dd8e1e97`. The corrected verifier SHA-256 is `4ba2f9eb3538bd61a6e82d4ef0958bfa96aad6ce3e50921f8323e3a1e7d114e2`. The maker report is present at `deliveries/FINISH-C1-R8/report.md` in that exact commit.

A separate commit `c398876583bc337c069414b79364e3fdea745879` appeared on `origin/codex/finish-28-c1-r8-20261011` after allocation, and the canonical checkout has an occupied, separate R8 path. Its provenance and content have not been admitted as this candidate. Preserve that branch and path without reading, copying, changing, or using them. Do not mix either lineage into the exact candidate under review.

The R7 predecessor is commit `e2670d4152c461005da86b392dbcea12cec740bf`, full tree `419950200cc9705a101468d44e5b589b40f609f0`, app tree `42ea29ec235225046a75959eb19eb386ac2f821d`. FINISH-28 authorized only fail-closed verifier/evidence correction; E-01, historical receipts, R7, application/runtime files, dependencies, and canonical app remain outside scope.

## Reviewer and isolated root

The reviewer is the local Codex B1-R4 worker after it finishes and pushes its separate art-lane package. The reviewer did not author C1-R8. This is a local cross-lane audit; external GPT Plus #2 remains NOT RUN. Parent will make a separate ruling.

Use a fresh isolated worktree checked out at the exact C1-R8 commit above. Recheck this audit root immediately before writing:

`deliveries/completion-audits/FINISH-C1/finish-13/20261011T142400Z-c1-r8-delta-review-01/`

This path was absent in the canonical checkout at allocation. If it is occupied in the audit worktree, preserve it without inspecting it and stop for Parent reallocation. Keep all scratch under the assigned root's `.work/`. Commit and push only this audit root on a scoped reviewer branch. Do not amend, reset, cherry-pick, or otherwise alter either R8 candidate branch.

## Required independent checks

1. Recompute the exact candidate parent, commit, full tree, R8 subtree, app tree, changed-path list, and raw blob hashes from Git objects. Confirm only the intended 26 files were added under `deliveries/FINISH-C1-R8/` and all 25 stable output rows match byte count and SHA-256.
2. Review the implementation and tests against FINISH-28. Confirm every `sourceManifest` field is checked against the authoritative raw R6 manifest blob and every duplicated installed-Three package row is checked against exact installed package identity and bytes. Check missing, extra, duplicate, malformed, wrong-type, and contradictory values fail closed.
3. Independently run the exact-candidate positive CLI with output-manifest checking. Independently run or reconstruct the 51 negative cases, prioritizing each of the five former false-pass fields, the uncached CLI zero-hash case, and preservation of the exact R7 source, installed dependency tree, manifests, and canonical app. Use disposable copies for every mutation. Record the exact commands, tools, stdout/stderr, and exits.
4. Verify the correction patch applies to the exact R7 verifier bytes and reproduces the R8 verifier byte-for-byte. Identify any uncovered edge cases, false negatives, false positives, or test harness coupling. Distinguish evidence-verifier scope from runtime/application behavior.
5. Return `report.md`, `findings.json`, `requirement-matrix.json`, candidate binding, command/tool receipts, and output hashes. Mark each result PASS/FAIL/NOT RUN and state limitations. A passing maker suite is not independent audit evidence.

Recommend PASS or REWORK for E-02 only. E-01, external GPT Plus #2, application/runtime/build/browser/device/provider checks, Parent acceptance, integration, deployment, and G7 remain separate and must not be marked accepted by the reviewer.
