# PRE-G7-04 release tooling maker evidence

Changed only scripts/release/release-lib.mjs and scripts/release/tests/immutable-output.test.mjs. Filesystem target resolution protects existing aliases and nonexistent descendants; reserved-path protection, repository containment, and unsafe-path checks remain. Dangling aliases fail closed.

PASS: Windows Node 24.19.0 regression, exit 0, 12 tests passed, zero failures/skips. See test-output.tap and receipt.json for actual command, platform, and source hashes. Accepted workspace paths were guard-only checks; writes used isolated temporary fixtures and verified cleanup.

NOT RUN: independent audit/acceptance, full release validation, production/manual G7 checks. Parent owns integration, CI binding, commit and push. This is maker evidence only.
