# PRE-G7-16-C1 - repair evidence path references

- **Date:** 2026-10-15 (Asia/Calcutta)
- **Authority:** Parent Codex, Architect and Acceptance Authority
- **Status:** Authorized for a bounded evidence-text correction only. No application source, test, provider, deployment, or production work is authorized.

## Accepted input

PRE-G7-16 source commit is `f71d1df028f80637abb3e427040f0e0f5085179c`, app tree `a19c817a7ebfa8962f0b898364ca01e8770e302a`, and maker evidence head `6ead65c93645c3ba7c305a84248be625ce0308ec`. The exact local and remote heads were independently read and matched. The original [PRE-G7-16 packet](2026-10-15-pre-g7-16-canonical-fixture-default-integration.md) remains the controlling source/test contract.

## Trigger

The independent local Codex read-only audit found Windows paths damaged by escaping in:

- `deliveries/G7/preparation/maker-evidence/pre-g7-16/COMMANDS.md:7`
- `deliveries/G7/preparation/maker-evidence/pre-g7-16/input/README.md:7-9`

Backslashes were dropped and two `\f` sequences became form-feed characters. The referenced input logs and diagnostic snapshot exist; their raw contents and hashes passed audit. Correct the human-readable paths so a reviewer can locate the exact inputs and snapshot.

## Owned paths

Own only:

- `deliveries/G7/preparation/maker-evidence/pre-g7-16/COMMANDS.md`
- `deliveries/G7/preparation/maker-evidence/pre-g7-16/input/README.md`
- `deliveries/G7/preparation/maker-evidence/pre-g7-16/evidence-inventory.json`

Use the existing evidence-local `.gitattributes` rule to keep archived command receipts byte-exact. Do not modify the source manifest or any raw receipt.

## Required correction and evidence

1. Correct each cited path using a representation that survives literal text handling, such as forward slashes inside code spans. Verify every resulting absolute path resolves to the intended file or directory.
2. Update the inventory hashes and sizes for the changed documentation entries under its existing schema. Validate every listed entry against both working-copy bytes and committed Git blobs. Do not change raw evidence files or their recorded outcomes.
3. Preserve the source patch and all test receipts byte-for-byte. Verify source commit `f71d1df028f80637abb3e427040f0e0f5085179c`, app tree `a19c817a7ebfa8962f0b898364ca01e8770e302a`, protected hashes, and source/mirror parity remain unchanged.
4. Record exact path-validation commands/results, inventory hash, file hashes, and final commit identity in the evidence report. Commit and push only the three owned paths; verify exact remote HEAD and a clean worktree. An independent read-only audit reviews that exact head.

## Boundaries

This packet authorizes no new tests or full-suite invocations. PRE-G7-16's two-consecutive-full-suite-pass gate remains unresolved after the original three-run cap, and its full unit run remains 326/327 due the unchanged five-second boundary test timeout. Parent disposition is required before any further full-suite work. This evidence correction does not accept PRE-G7-16 or G7 and does not change the local-only instruction.
