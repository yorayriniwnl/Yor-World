# Parent intake ruling — FINISH-07 / A1-R4

Date: 2026-10-11 UTC

## Decision

The exact A1-R4 candidate is admitted as a stable **independent-audit input only**. This is not implementation acceptance, publication authority, or canonical integration. The source under `deliveries/FINISH-A1/r4/source/` remains outside canonical `app/`.

Candidate commit: `2e183eb3a1470427950265fc6bf4dadb8ad6411e` (pushed to `audit/completion-2026-10-09`). The exact output-manifest SHA-256 is `c97e0daa58ad2be10dea1477d593cc8d2bb7f42d82403876aa6e1ed8b2ef7604`; the manifest binds 127 delivery files totaling 13,347,339 bytes. The patch SHA-256 is `7b2dd8ba10801dfca095191ce4b8c81a05d11a95eac4b016dd32fb433c619604`.

## Parent intake checks

Read-only checks at intake found all 127 manifest entries present with matching byte counts and SHA-256 values, no unmanifested files outside the declared excluded workspaces, and 25 replacement files. All 25 replacements match their corresponding files in `patch-check/app/` byte-for-byte. The exact R4 patch passed `git apply --reverse --check --whitespace=error-all` against that applied checkout (exit 0). These checks bind the current content; they do not establish who originally wrote it.

## Preserved integrity exception

The creator and last writer of the unexpected `source/`, `source.patch`, and associated package receipts remain unknown. The captured process snapshots found no matching active process, which cannot identify an exited writer. Do not attribute these files to the local maker or treat the worker label in an assembly receipt as independent proof. Preserve the discrepancy record and ask the independent auditor to assess whether this limits any claimed requirement or evidence.

R3 inventory growth, its 17 changed prior files, the late database fixture, and out-of-root browser artifacts remain recorded in the R4 evidence. This intake does not infer their cause or claim exact R3 preservation. R4 did not use the R3 candidate as a source base.

## Next gate

[FINISH-10](../reconciliation-packets/2026-10-11-finish-10-a1-r4-audit.md) commissions a fresh independent complete-scope and delta audit in `deliveries/completion-audits/FINISH-A1/finish-05/20261011T011000Z-a1-r4-independent-review/`. The assigned reviewer is local Codex, not external GPT Plus #2. The separate audit and Parent acceptance remain pending. Provider, deployment, native database, and manual/device checks reported as NOT RUN remain open.
