# PRE-G7-06 archive-binding maker handoff

Base: `80c9ae9173bee27b18a066dd84fb6ab3c9919581`. Actual workspace files returned; no acceptance claim.

Owned changes:

- `scripts/release/rc6-policy.json`: delivery root and canonical archive both name `deliveries/G7/rc6-candidate-r3/`.
- `scripts/release/release-lib.mjs`: guards preserve original RC6 and rejected R2 directories, including resolved aliases; reject nonportable Windows names; validate canonical policy archive binding and contain outputs in the current delivery without aliases.
- `scripts/release/build-release-bundle.mjs`: validate policy and every output before building/writing; reject archive overrides and colliding receipt paths.
- `scripts/release/validate-release.mjs`: validate policy/output paths before loading proof; reject archive drift and receipt collisions with manifest inputs before writing.
- `scripts/release/tests/immutable-output.test.mjs`: extend canonical, case and filesystem-alias preservation checks to original RC6 and rejected R2; mutable fixture uses R3.
- `scripts/release/tests/policy-output.test.mjs`: execute builder, strict validator and driver prepare against invalid policies in isolated repositories; test nonportable paths, output overrides, alias protection, complete exported input/archive checks, missing/failed primary receipts, and final validation ordering.
- `deliveries/G7/preparation/tools/candidate-driver.py`: preflight policy and whole output trees before writing/export; stop on policy drift; compare final detached and primary mandatory inputs and hashes, including actual bundle; run strict primary validation after export; require its bound PASS receipt before final inventory.

| Check | Result | Evidence |
| --- | --- | --- |
| Release output regressions | PASS, 26/26, exit 0; no skipped tests | `regression-tests.log` |
| Original RC6 and rejected R2 remain unchanged during regression execution | PASS, all 313 existing files match before/after hashes | `maker-evidence.json` |
| Driver Python syntax | PASS (`ast.parse`, no bytecode output) | `maker-evidence.json` |
| Scoped `git diff --check` | PASS, exit 0 | `diff-check.log` |
| Fresh exact-source complete 13-check R3 proof, actual strict primary validation | NOT RUN by maker | Parent owns new source freeze and full proof after integration commit |
| Independent delta audit, acceptance | NOT RUN by maker | Assigned read-only reviewers and Parent authority |

Reproduce bounded maker checks: `python -B scratch/pre-g7-06-archive/maker-checks.py`.

Full proof must supply the primary workspace's dependencies/build artifacts required by the strict composition validator; the driver will fail if these are unavailable or inconsistent. Synthetic regression fixtures establish rejection behavior, not the final R3 release proof. No app/source contracts, assets, CI, old proof receipts, provider actions or purchases were changed. Parent owns scoped commits/pushes under this packet.
