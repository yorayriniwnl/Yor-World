# G6-RC3-PLATFORM-VERIFY-01

Assigned account: **Gemini #1, platform/backend verification lane**. Model: Gemini Pro, highest available thinking, as requested in the original integration packet. Status: HELD / NOT DISPATCHED; execution NOT RUN. The [new correction packet](../2026-10-03-rc3-platform-corrections.md) precedes review activation; unresolved supplemental defects and absent platform return block the original handoff. Corrected source requires new pinned inputs. This packet consumes the completed candidate and returns bounded platform evidence. It does not authorize production corrections or acceptance.

## Exact input and ownership

Read AGENTS.md, START_HERE.md, the current work order, [handoff index](README.md), [inputs.json](inputs.json), and the human's `deliveries/G6/full-stack-integration/parent-packet.txt`. Review candidate `261c483646f68692a3fe8e184d48d25b8264a6d7`; its implementation source is `6129ad7a870f9f391455eb8a0582733a5ccccd11`, canonical root `app/`, release `v1.0.0-rc3`.

Use an isolated detached checkout of the candidate. Verify all protected tree identities and named Git-blob hashes in the ledger before execution. Record both the reviewed candidate and implementation source. If access is missing, report NO FILE ACCESS / MISSING INPUT. If source or bindings differ, report the mismatch and request a revised parent packet rather than silently reviewing another HEAD.

Own only `deliveries/G6/rc3-platform-verification/` for returned files. Dependency, build and browser scratch belong in the isolated checkout or fresh temporary directories. Do not edit tracked `app/`, release scripts/workflows, frozen assets, historical proof roots, the maker dossier or accepted reports. The maker's `tools/run-check.py` writes into its existing dossier: do not use it to capture this verification.

Named local inputs under `deliveries/G6/full-stack-integration/`: `report.md`, `platform-map.md`, `integration-map.md`, `conflict-resolution.md`, `route-inventory.md`, `dependency-merge.md`, `environment-contract.md`, `test-matrix.md`, `corrections-during-integration.md`, `release-manifest.json`, `release-composition.json`, `bundle-receipt.json`, `release-manifest-validation.receipt.json`, `commands-and-exit-codes.md`, `evidence/execution.jsonl`, `ci-results.json`. Read the immutable accepted A6 and contact R2 inputs when comparing behavior. The current specification is revision 2; its exact file identity is in the ledger.

## Required platform verification

| Area | Verify against actual canonical imports and execution |
| --- | --- |
| Composition | All 22 accepted public/admin/API routes and required server modules exist in the build and RC3 archive. Public world and semantic portfolio remain available; Contact uses the actual canonical API. |
| Contact R2 | `/api/contact` resolves to canonical receive/outbox; DB-owned conditional idempotency claim precedes quota/message/outbox in one winning transaction. Same payload replays one receipt, changed payload returns 409, parallel duplicate preserves one record pair, failed transaction leaves no orphan rows. In-process mutex is not required for correctness. Preserve accepted 202, 429 and honest 503 semantics. |
| Persistence | Production requires configured durable PostgreSQL; no automatic PGlite/memory fallback on failure. BEGIN, writes, COMMIT/ROLLBACK and release use one checked-out client. Separate actual embedded SQL, driver-mock and hosted multi-session evidence. |
| Auth/admin | Anonymous, non-owner, owner AAL1 and revoked-owner requests are denied. Verified current owner AAL2 succeeds within the executed test boundary. Metadata cannot elevate assurance. Protected server pages and API checks cannot be bypassed from world navigation. Loopback test cookies and fixture flags cannot enable hosted bypass. |
| Publication/media | Drafts/private media stay private. Publish/rollback serialize revision checks and atomically update approved public snapshot/history/audit. Preserve stale 409 and invalid 422. Media reads use the transaction, and signed URLs require current-publication references and current approval; no arbitrary caller-selected media leaks. Accepted missing Helios placeholder remains honest; CandidateX stays unavailable. |
| SQL grants | Accepted numbered migrations remain byte-preserved. Review the explicit post-migration `harden-publication-grants.sql` DCL: direct PUBLIC/anon/authenticated SECURITY DEFINER publication calls must be denied; service-role/server publication must remain usable. Do not treat this candidate security delta as an already accepted new schema. |
| Operations | Authenticated jobs have no known default credential. Atomic outbox leasing/reclaim/provider idempotency, honest retry behavior, allowlisted GitHub last-good fallback and aggregate-only telemetry execute from canonical routes. Actual local backup/restore covers all fifteen tables and restores contact/outbox/idempotency/quota coherently. |
| Boundaries | Privileged secrets and server modules remain absent from browser graphs. Client-safe admin SDK availability is distinct from forbidden pre-world homepage imports. Public approved/static fallback survives backend outage without exposing drafts, private media or raw PII. |

Inspect source beyond test assertions. Existing passing tests cannot establish an untested hosted claim. Do not contact configured production services, use real credentials, mutate hosted databases, send mail, deploy or start G7 under this packet.

## Execution and evidence

Use Node `>=24.19.0 <25` and pnpm `9.15.9`, with the exact frozen lockfile. Capture tool/browser versions and actual working directories. A useful local sequence in the isolated canonical `app/` is:

```text
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm exec vitest run --config vitest.integration.config.ts tests/integration/platform
pnpm build
```

Exercise relevant canonical browser files: `tests/e2e/platform/` and `tests/e2e/full-stack-integration.spec.ts`. Set `CI=true` for the documented full Chromium channel. Scope `YOR_E2E_FIXTURE=1`, a new `YOR_TEST_DATABASE_PATH` and synthetic job credential only to the isolated browser test process; direct all evidence directories to this packet's owned root. Build with fixture flags absent. Retain assertions, zero retries and existing timeouts. Verify the actual JSON reports contain zero unexpected/flaky/skipped cases; capture actual counts rather than assuming the maker's totals.

From the isolated repository root, reproduce `scripts/release/check-release-composition.mjs` against that fresh build and `scripts/release/validate-release.mjs --strict`, writing receipts into the owned return root. The ledger and existing hash inventory establish historical/input immutability. Record exact commands, exit codes, log hashes, source binding and which checks were rerun versus inspected. No performance rerun or art regeneration is assigned to this platform packet.

Hosted Supabase Auth/Storage/RLS, independent production PostgreSQL sessions, mail delivery, physical devices, actual monitoring and hosted restore/rollback remain NOT RUN unless a later explicitly authorized packet supplies those environments. A mocked or embedded PASS must name its boundary.

## Required return and stop

Return `report.md`, `defects.json`, `commands-and-exit-codes.md`, `verification-identity.json`, actual logs/JSON/receipts, and `SHA256SUMS.txt` in the owned root. The identity records packet ID, executor/tool/model declaration, reviewed candidate, implementation source, archive SHA, schema/asset/publication/contact bindings and tested environment. Each finding records ID, severity P0-P3, source path/line, trigger, expected/actual behavior, reproduction/evidence, impact and proposed maker lane. Preserve failed evidence.

The report must separate local PASS, FAIL and NOT RUN, identify all blocking findings, and state whether the bounded platform input is ready to enter independent audit. This is lane verification, not G6 acceptance. Stop after returning the report. Parent issues any correction packet; GPT Plus #2 audits after the bound return is available. G6 ACTIVE / REWORK; G7 LOCKED.
