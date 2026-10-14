# PRE-G7-11 evidence correction r1

## Audit finding

The exact-push review after `2c3ab02acb25a4d0856ea4573c556db66f5c9eea` found that the corrected `REPORT.md` and its updated checksum line were staged after that push, so the pushed commit did not contain the report/checksum correction as a single revision. It also found that `verify-delivery-evidence.mjs <commit>` read `SHA256SUMS.txt` from the current worktree while reading listed payloads from the requested commit. That did not bind the checksum list itself to the commit being verified.

## Correction

Commit mode now resolves the requested revision and reads both `SHA256SUMS.txt` and every listed payload using `git cat-file blob <resolved-commit>:<path>`. Staged mode reads the staged checksum list and staged payload blobs where present, and otherwise reads `HEAD` blobs. The checksum generator accepts a base commit (default `HEAD`) and hashes staged replacements over that exact committed tree, including the corrected report. The primary report retains the updated compact-HUD measurement and the explicit mobile room-visibility/product-fidelity limitation.

## Verification

`verification.log` records the exact-push finding, the commit-mode isolation check against `7cea7a316f2cbe5ad825d623518cecccdd8d6a1b` while a different report/checksum set is staged, and staged-mode checksum verification. The final correction commit is also checked directly after commit; its full hash and exact verifier output are returned in the maker handoff for independent delta review.

This is a narrow evidence/tooling correction. It does not change canonical source, art/assets, production configuration, deployment state, or G7 acceptance.
