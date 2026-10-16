# PRE-G7-27 parent ruling

Date: 2026-10-16
Disposition: FAIL / NOT ACCEPTED

PRE-G7-27 did not produce renderer attribution captures. Both production builds failed TypeScript, and no Playwright invocation ran. All sixteen rows remain NOT RUN. The maker's final evidence commit is 42186a2c4339debe944e2ef368e5792b4cf8f6ea on codex/pre-g7-27-maker-20261016. The branch is also at origin and its tracked worktree is clean.

## Independent review

A read-only local Codex substitute audit verified the maker commit, scope, restored source trees, and 46-entry evidence inventory. Every raw size, SHA-256 and Git blob ID matches; the listed file set is complete apart from the inventory itself. The two partial build-output inventories each contain 515 files whose individual sizes and hashes were verified. This was not external GPT Plus #2. External audit remains NOT RUN.

The accepted source and P25 donor remain pinned to their exact commits. Both temporary source worktrees were restored cleanly. No production source or asset change was accepted.

## Findings

Both builds exited 1 with the same four TypeScript errors: Material.id is unavailable on the Material type; two observer accesses use possibly undefined targets; and the test refers to FullConfig.retries, unavailable in the installed Playwright type. Logs and partial outputs are preserved under deliveries/G7/preparation/maker-evidence/pre-g7-27/attempt-01/.

The confirmed protocol violation is that the observer was corrected after the accepted-root build failed, and the donor build then used the corrected observer. PRE-G7-27 required preserving a build failure without repair or retry. No browser was launched, so this was a no-repair-boundary violation, not a capture retry.

The harness also changed between build trees: accepted used explicit deviceScaleFactor 1, donor omitted it. No browser context was created, so effective DPR was never measured and no DPR change is established. The removed line and process provenance remain archived; the actor is unknown.

Both receipts include NEXT_PUBLIC_PRE_G7_13_EVIDENCE=1 and NEXT_TELEMETRY_DISABLED=1. Their presence is verified. The cited PRE-G7-22 C1 rule is absent from the governing tree, and PRE-G7-27 does not expressly prohibit the telemetry flag. It is not an independently established protocol violation and is not a basis for this ruling.

The P27 packet's P26 report SHA-256 was a checkout-byte digest, despite the packet stating its file digests were canonical Git blob bytes. At parent 9fcf9f29e498f664f2933648b5ce7388772f22fb, the P26 report blob is 4a74da52a0c1ec4843ff5731f63e61ca3f67e3bb: 7,140 canonical bytes, SHA-256 6df37d9e2e5cfaf34337c5ffdeed181a853d7e8273f6ed9be1ad2a9c8a12cfe2. P27 remains unchanged; the corrected binding is recorded in PRE-G7-28.

The two aggregate partial-output digests in the P27 report did not reproduce using ordinal path sorting. This does not invalidate verified individual file hashes, but aggregate serialization remains unverified. PRE-G7-28 requires an included aggregation script and exact serialization, or no aggregate claim.

## Ruling and next work

The accepted 500d app and mirror remain the immutable baseline. P25 remains donor-only. P27 authorizes no renderer optimization, asset edit, threshold change, parity claim, deployment, physical-device claim, or G7 acceptance.

PRE-G7-27 is closed as FAIL / NOT ACCEPTED. Its report and evidence remain immutable. PRE-G7-28 is a new local-only packet allowing correction of measurement-only observer and harness artifacts before a frozen preflight, then one build per source and one capture invocation per source. Any failure after freeze must be retained without repair or retry. It does not reopen P26 or P27 and does not alter app, mirror, assets, or the accepted baseline.
