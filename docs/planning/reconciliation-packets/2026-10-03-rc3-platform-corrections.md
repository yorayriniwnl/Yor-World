# G6-RC3-PLATFORM-CORRECT-01

Date: 2026-10-03. Parent-issued bounded correction packet. Assigned maker: **Gemini #1, platform/backend lane**, Gemini Pro with highest available thinking. Status: **READY FOR MAKER; execution NOT RUN; no callable Gemini connection in this Codex session**. The supplemental Codex reviewers do not implement the corrections or approve their findings as resolved.

The [supplemental report](../../../deliveries/G6/rc3-supplemental-codex-verification/report.md) reproduced seven defects, including two P1 defects. Its six passing probe cases confirm defective behavior. They are neither a Gemini account return nor the independent GPT Plus #2 audit. G1-G5 ACCEPTED; **G6 ACTIVE / REWORK; G7 LOCKED**.

## Bound inputs

Read AGENTS.md, START_HERE.md, the current work order, this packet, the supplemental [defect ledger](../../../deliveries/G6/rc3-supplemental-codex-verification/defects.json), [identity](../../../deliveries/G6/rc3-supplemental-codex-verification/verification-identity.json), probes and execution evidence. Read the original [human integration packet](../../../deliveries/G6/full-stack-integration/parent-packet.txt), [engineering/content contracts](../engineering-and-content.md), canonical source and affected tests directly.

The defective candidate is `261c483646f68692a3fe8e184d48d25b8264a6d7`; its implementation source is `6129ad7a870f9f391455eb8a0582733a5ccccd11`. The observed coordination HEAD was `2bbf7f05b34e17094acaa0078e9c6743d73f8196`. Each has `app` tree `174ccd19091622c3dbce5f6b0ce3fe7fb38e1985`. The supplemental identity records canonical Git-blob and executed working-file hashes. Verify these before changing source. A later coordination commit may contain these packets, but must retain the same production tree at correction start. Report any unexpected source difference.

Use an isolated worktree from the latest coordinated branch with that production tree. Own the paths below and a new return root, `deliveries/G6/rc3-platform-corrections/`. Record actual input/implementation commits, model/tool declaration, commands, working directories, versions, failures and limits. Do not alter the supplemental probes or evidence to make the original reproduction pass on corrected code; create canonical regression tests for the expected corrected outcomes.

## Owned production paths

- `app/supabase/operations/harden-publication-grants.sql`
- `app/src/server/jobs/outbox-worker.ts`
- `app/src/server/media/validate-upload.ts`, and one narrowly scoped decoder helper under the same directory if required
- `app/src/app/api/admin/media/route.ts` only for awaiting actual image validation if the decoder is asynchronous; preserve the existing public response contract
- `app/src/server/telemetry/events.ts`
- `app/src/app/api/events/route.ts`
- `app/src/server/integrations/github.ts`
- Affected tests under `app/tests/integration/platform/` and `app/tests/unit/platform/`, plus genuine small image fixtures under `app/tests/fixtures/`; keep changes limited to these defects and affected expectations
- `app/package.json` and `app/pnpm-lock.yaml` only if an actual image decoder requires an exact pinned dependency; document its need and compatibility

No other production paths are assigned. Preserve numbered migration bytes and schema binding `20261002000000_schema_v1`; use explicit post-migration operations for grant hardening. Do not edit immutable A6/C3/C1/C2 proofs, accepted reports, frozen GLBs or assets, runtime/world behavior, publication content, contact R2 claim/quota/transaction logic, workflow thresholds, release scripts or existing candidate evidence. A required schema or API contract change must return a concrete proposal to the parent before implementation.

## Required corrected behavior and regressions

| ID | Severity | Required change and evidence |
| --- | --- | --- |
| SCP-01 | P1 | Deny unmediated authenticated-owner publication/history INSERT, UPDATE and DELETE after the operational DCL, including grants inherited through PUBLIC. Preserve permitted public reads and owner private access, privileged publication's expectedRevision check, and canonical publish/rollback validation, serialization and atomic history/audit writes. Rollback's caller revision contract remains the separate concern below. Execute actual accepted migrations plus DCL for anonymous, non-owner, owner AAL1, revoked owner and active owner AAL2; test helper RPC denial and prohibited direct table DML. The original proof concerns owner bypass, not non-owner privilege escalation. |
| SCP-02 | P1 | Fence every outbox completion by current claim ownership so an expired worker cannot overwrite a reclaimed row. Cover stale success, retryable failure, terminal failure, exception and missing-message paths; count outcomes only for state transitions actually owned. Preserve provider idempotency keys and receipt semantics. Bound provider work or renew/check claims so queued batch items do not silently run after losing leases. Execute controlled reclaim interleavings against actual SQL. Label single embedded-database evidence separately from independent PostgreSQL sessions. |
| SCP-03 | P2 | Apply the same terminal attempt ceiling to exceptions and normal provider failures. A row at attempts4 whose next processing throws must reach `failed`/attempts5, rather than an unclaimable `retrying` row. Cover adapter/message-read exceptions and relevant completion-write failures without overwriting a newer claim; retain the accepted retry schedule. |
| SCP-04 | P2 | Reject truncated/corrupt PNG, JPEG and WebP; require decodeability and real dimensions within resource limits. Preserve MIME, byte ceiling, hashing and private approval behavior. Replace synthetic header-only fixtures described as valid with genuine decodable images. Test the three recorded truncated inputs, corruption, valid formats/dimensions, oversized inputs and MIME mismatch. If decoding becomes asynchronous, update the owned media POST call site and affected tests to await validation; retain422 invalid-media behavior. |
| SCP-05 | P2 | Align durable telemetry identity/upsert with the accepted SQL unique dimensions `(date,event,project_id,tier)`. Different permitted codes must not cause a second valid event to return503; do not imply per-code storage that the schema cannot represent. Cover same/different/omitted code, increments, and null project/tier dimensions in actual durable SQL. Do not silently add a column or change nullable uniqueness semantics through a new migration. |
| SCP-06 | P3 | Enforce the4096-byte event ceiling using actual UTF-8 bytes independently of a missing or misleading Content-Length. The recorded2037-character/6037-byte body must return413 before ingestion. Cover multibyte input and valid byte-boundary requests; retain privacy filtering and existing validation responses. |
| SCP-07 | P2 | Bound refresh attempts, including failures, to the accepted hourly cadence and coordinate overlapping requests. Keep last-good payload/fetch timestamp truthful and compute stale state from last success. Cover repeated failures, empty cache, concurrent refresh, next-hour recovery and secret redaction with synthetic fetches. State the actual durability/multiple-instance coordination boundary; propose any required schema change rather than adding it implicitly. |

The owner publication fix must preserve privileged server publication; revoking all writes without exercising the canonical server transaction is insufficient. The outbox fix must protect every mutation path; modifying the initial atomic claim alone does not resolve SCP-02. Telemetry regression tests must exercise durable SQL rather than only the in-memory test branch.

## Source-only concerns and contract decisions

The supplemental ledger separately records stale rollback intent without an expected current revision and unbounded process-memory telemetry cardinality. These were source inspections, not executed reproductions. Return a reproduction or a reasoned contract disposition for each. Do not mark them fixed solely by the seven required changes.

Rollback request/UI payload changes are outside this packet: the parent must resolve the accepted contract and explicitly assign those paths. A telemetry memory bound within the owned telemetry module may be proposed with its evidence; arbitrary event codes or permanent Map growth must not be described as proven harmless without a bound. Actual approved-object existence in hosted Storage remains an evidence gap, not a reproduced new defect in this packet.

## Verification and return

Use Node `>=24.19.0 <25`, pnpm `9.15.9`, the frozen lockfile unless the bounded decoder addition is needed, and canonical imports. Capture focused expected-behavior regressions, lint, typecheck, unit, full integration and production build. Preserve failures, exact test counts and source binding. Synthetic clocks/providers and local PGlite are allowed. Hosted Auth/REST/Storage, independent hosted PostgreSQL sessions and mail delivery remain NOT RUN; do not contact real services under this packet.

Return `report.md`, `defects.json`, `commands-and-exit-codes.md`, `implementation-identity.json`, actual logs/results and `SHA256SUMS.txt` under the new return root. For each ID, link changed source, an executed expected-behavior test and its result. Use PASS/FAIL/NOT RUN accurately; proposed fixes and source inspection cannot close an executed defect. Provide scoped descriptive commits and push under the repository Git rule, retaining and immediately reporting any check/push failure.

The current RC3 bundle, manifest and S3/E2 logs continue to describe the old source. They must not certify a correction revision. Source changes can make existing strict release checks fail until candidate evidence is rebound; report this openly and retain the gates. This packet does not authorize overwriting the original maker dossier or weakening strict checks to hide the mismatch.

Stop after the maker return. The parent then assigns a bounded integrated candidate refresh to the integration lane, preserving the old candidate by its immutable Git identity and rebinding the corrected source, fresh full-stack checks, deterministic bundle/manifest and exact pushed-HEAD workflows. It reissues platform/full-stack review inputs for that new candidate. The original261 verification/audit packets are held and cannot silently acquire a new target. **GPT Plus #2** performs independent full-stack/delta audit after the bound return and refreshed candidate; **GPT Plus #1** decides G6. Maker return, supplemental review and green CI do not constitute acceptance. No deployment or G7 work is assigned.

In the actual Gemini #1 tool with workspace access, use:

> Read AGENTS.md and START_HERE.md, then execute only G6-RC3-PLATFORM-CORRECT-01 at docs/planning/reconciliation-packets/2026-10-03-rc3-platform-corrections.md. Verify the pinned production tree, fix only the owned platform paths, return actual regression evidence under deliveries/G6/rc3-platform-corrections/, and stop for parent candidate refresh and independent audit.
