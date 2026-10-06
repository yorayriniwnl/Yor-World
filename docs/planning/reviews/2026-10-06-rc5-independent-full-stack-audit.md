# RC5 independent full-stack release candidate audit

Date: 2026-10-06. Role: Independent Full-Stack Release Candidate Auditor.

## Recommendation

**RECOMMEND G6 ACCEPT**

Hosted CI is green on the audited HEAD, all 13 required checks executed, and no new P0/P1 defect was confirmed. Parent retains acceptance authority. G6 remains ACTIVE / REWORK until adjudication; G7 remains LOCKED.

This report archives the completed read-only audit. It does not accept G6, unlock G7, authorize deployment or update candidate source. Source review, independent cryptographic checks and actual hosted execution evidence support its conclusions. The auditor did not rerun the application test suites locally or execute live service tests. GitHub/source links below are pinned to the audited revision where applicable.

## AUDITED HEAD and RC5 identity

| Binding | Independently verified value |
|---|---|
| Audited/evidence HEAD | `2a0b1ad2e4f8f3bd74b581e5d43b2d002d3a54f1` |
| releaseId | `v1.0.0-rc5` |
| Canonical root | `app/` |
| sourceCommit | `c34e01bb5bff210d924f42d5266e2fa1ed13288e` |
| sourceAppTree | `88a65e85d1f120a9aa4397efa8cc779bdfe5cf08` |
| Original evidence commit | `f3cb4d1a4fcb797dd4520e796a3422b7b12a890f` |
| releaseBundleSha256 | `4380cab7f5211c836fe5bb97c68d67137c1b0fd7a2e4789bb29d0157ab5faa0f` |
| assetRevision | `g6-world-art-freeze-20261002` |
| publicationRevision | `A4-R1-20260928` |
| schemaRevision | `20261005000000_schema_v2` |
| Contact amendment | `A5/A6-CONTACT-IDEMPOTENCY-R2` |

Later evidence commits preserved `app/`, `.github/`, release tooling, manifest, source binding and bundle. The archive contains exactly **232 source-matching files**, with no missing, extra or mismatched member. All 33 manifest/source/composition hash references passed.

## EXACT HOSTED CI RUN IDs

| Workflow | Audited HEAD run | Attempt | Result |
|---|---|---:|---|
| Repository Integrity | [37439297648](https://github.com/yorayriniwnl/Yor-World/actions/runs/37439297648) | 1 | SUCCESS |
| CI / Release Quality Gate | [37439297754](https://github.com/yorayriniwnl/Yor-World/actions/runs/37439297754) | 1 | SUCCESS |

Recovery first succeeded at source-equivalent commit `05a3bd44ee3718eeacefe1575ec50f6b70eeb2b9` through runs [37437028292](https://github.com/yorayriniwnl/Yor-World/actions/runs/37437028292) and [37437028269](https://github.com/yorayriniwnl/Yor-World/actions/runs/37437028269). Original runs `37365134471` and `37365134461` remain failed attempt 1, with runner ID 0 and zero steps. Those infrastructure failures are **not source defects**. The successful recovery executions are new push-triggered runs on later source-equivalent evidence heads, not successful rerun attempts of the original run IDs.

## HOSTED CI STEP MATRIX

| Required check | Actual execution |
|---|---|
| Frozen dependency install | SUCCESS |
| Lint | SUCCESS |
| Typecheck | SUCCESS |
| Unit tests | 268 PASS |
| Integration tests | 280 PASS |
| Khronos validation | Nine production GLBs; zero errors/warnings |
| Full production build | SUCCESS |
| Full Playwright E2E | 97 PASS |
| Automated accessibility | 17 PASS |
| Fresh performance measurements | Six PASS |
| Release composition | 22 routes, 103 modules, nine assets |
| Performance budgets | SUCCESS |
| Strict RC5 manifest/archive validation | SUCCESS; exact source/tree/bundle bound |

No required quality check was skipped. Browser reports contain zero skipped, flaky or unexpected cases, with retries disabled. Integrity's PR-only scratch-archive check was appropriately skipped for a push.

The final hosted artifact `11400798961` was independently downloaded and hashed:

`2e1b78be9cd4cb03a03f9da504e17f7dcc83a7da7cdb3b1ec04c198cb2d9f04d`

Its receipt identifies the audited HEAD and the exact RC5 source, application tree, manifest and bundle. The manifest LF SHA-256 is `26bd0188af8865fb4ff8130c2795a249bc392507feef4ebcb4f9943031b0c481`. The final hosted production build ID is `XMJkGscH5m_HyKwWdy9bf`.

The earlier retained hosted artifact `11399806628` hashes to `f33b6c330ad03cb7ef6825a90da652f0659dad6f88229dec396945f8db45524f`. All 70 extracted files matched its independently downloaded ZIP. Against committed evidence, 69 files are byte-identical; the production-build log differs only by three CRLF sequences normalized to LF. All 70 preserve identical content under the declared LF policy.

## RC5 performance correction and composition

The benchmark uses the real quality control, selects LOW, and verifies its application before timing. All nine required diagnoses remain implemented: STATIC_FALLBACK, CANVAS_DETACHED, DOCUMENT_HIDDEN, NO_RENDER_FRAME, ZERO_RENDER_CALLS, ZERO_RENDERED_TRIANGLES, ACTION_TIMEOUT, MISSING_ACTION and OTHER_RENDER_STATE_FAILURE. The one-second watchdog, 60-second duration, 60 acknowledgments, positive rendering requirements and 33.3/45 ms limits remain intact. Separate deterministic tests cover AUTO descending to STATIC and explicit LOW remaining authoritative. Production adaptive semantics were unchanged. [Benchmark](https://github.com/yorayriniwnl/Yor-World/blob/2a0b1ad2e4f8f3bd74b581e5d43b2d002d3a54f1/app/tests/performance/world.spec.ts#L98), [policy tests](https://github.com/yorayriniwnl/Yor-World/blob/2a0b1ad2e4f8f3bd74b581e5d43b2d002d3a54f1/app/tests/unit/quality-policy.test.ts#L248).

Final-run raw evidence independently recomputes to:

| Measurement | Result |
|---|---:|
| Active duration | 60,004.6 ms |
| LOW frames | 3,500 |
| Acknowledged actions | 60 |
| Median / p95 | 16.7 / 16.8 ms |
| Minimum calls / triangles per frame | 22 / 6,896 |
| Maximum acknowledgment latency | 27.9 ms |

This is Chromium/SwiftShader laboratory evidence; physical mobile performance remains unverified. No lucky rerun mechanism was accepted: the successful browser reports contain single passed results and zero skipped/flaky/unexpected cases, while the historical runner-acquisition failures executed no tests.

The production build contains the required public, admin and API routes in one application: `/`, `/about`, `/resume`, `/contact`, `/projects`, `/projects/[slug]`; `/admin`, `/admin/login`, `/admin/editor`, `/admin/publish`; `/api/contact`, `/api/events`, `/api/github`, the accepted `/api/admin/*` handlers and `/api/internal/jobs/[job]`. Source and hosted tests preserve useful HTML without the world, accepted-content fallback during backend outage, working durable contact, protected administration and private-draft denial. No privileged client-import or bundle exposure was found; live production secrets remain unverified.

## PREVIOUS DEFECT CLOSURE MATRIX

| Defect | Current closure |
|---|---|
| SCP-01 publication/history bypass | Operational SQL revokes helper execution and direct mutations, including PUBLIC grants. **G7 must apply it.** [SQL](https://github.com/yorayriniwnl/Yor-World/blob/2a0b1ad2e4f8f3bd74b581e5d43b2d002d3a54f1/app/supabase/operations/harden-publication-grants.sql#L5) |
| SCP-02 stale outbox ownership | Atomic claims and xmin/status/live-lease fencing protect state completion. [Worker](https://github.com/yorayriniwnl/Yor-World/blob/2a0b1ad2e4f8f3bd74b581e5d43b2d002d3a54f1/app/src/server/jobs/outbox-worker.ts#L43) |
| SCP-03 retry ceiling | Shared failure/exception handling enforces the five-attempt ceiling. [Worker](https://github.com/yorayriniwnl/Yor-World/blob/2a0b1ad2e4f8f3bd74b581e5d43b2d002d3a54f1/app/src/server/jobs/outbox-worker.ts#L65) |
| SCP-04 APNG/multiframe | Animation chunks rejected; real metadata and bounded full decode checked. [Validator](https://github.com/yorayriniwnl/Yor-World/blob/2a0b1ad2e4f8f3bd74b581e5d43b2d002d3a54f1/app/src/server/media/validate-upload.ts#L128) |
| SCP-05 telemetry uniqueness | Conflict handling matches SQL dimensional identity. [Telemetry](https://github.com/yorayriniwnl/Yor-World/blob/2a0b1ad2e4f8f3bd74b581e5d43b2d002d3a54f1/app/src/server/telemetry/events.ts#L119) |
| SCP-06 UTF-8 limit | Actual UTF-8 bytes checked against 4,096 before ingestion. [Route](https://github.com/yorayriniwnl/Yor-World/blob/2a0b1ad2e4f8f3bd74b581e5d43b2d002d3a54f1/app/src/app/api/events/route.ts#L19) |
| SCP-07 GitHub cadence | Durable database-clock hourly reservation, completion fencing and fail-closed behavior. [Integration](https://github.com/yorayriniwnl/Yor-World/blob/2a0b1ad2e4f8f3bd74b581e5d43b2d002d3a54f1/app/src/server/integrations/github.ts#L178) |
| Telemetry memory | Maximum 128 keys with 24-hour idle expiry. [Telemetry](https://github.com/yorayriniwnl/Yor-World/blob/2a0b1ad2e4f8f3bd74b581e5d43b2d002d3a54f1/app/src/server/telemetry/events.ts#L68) |

AAL2 and fresh revoked-owner denial, private content guards, transactional publication/rollback and contact R2 replay/conflict behavior remain intact. Backend production source has no RC5 regression. Hosted Supabase and native PostgreSQL concurrency are **NOT RUN**. Outbox database-state fencing does not establish exactly-once provider delivery; provider deduplication remains a G7 verification obligation.

## NEW P0/P1 FINDINGS

None confirmed within the inspected source and verified hosted-test boundary.

## P2/P3 DEBT

- **P2 - Studio recovery:** failure Retry changes lifecycle state without clearing the error or restarting the runtime; STATIC Retry leaves the tier STATIC. The existing browser case only checks button visibility. [WorldRoot](https://github.com/yorayriniwnl/Yor-World/blob/2a0b1ad2e4f8f3bd74b581e5d43b2d002d3a54f1/app/src/features/world/WorldRoot.tsx#L310).
- **P2 - STATIC resource handling:** hide/show can resume rendering after React removes the canvas. Source-confirmed; runtime reproduction NOT RUN. [WorldRuntime](https://github.com/yorayriniwnl/Yor-World/blob/2a0b1ad2e4f8f3bd74b581e5d43b2d002d3a54f1/app/src/features/world/WorldRuntime.ts#L147).
- **P2 - Unsupported memory claim:** the cycle test writes `memoryLeakDetected: false` after checking canvas count only. Accept it as DOM-removal evidence; heap/GPU leak absence remains UNKNOWN. No actual memory leak is established. [Test](https://github.com/yorayriniwnl/Yor-World/blob/2a0b1ad2e4f8f3bd74b581e5d43b2d002d3a54f1/app/tests/performance/world.spec.ts#L283).
- **P2 - G7 documentation drift:** the referenced environment contract still prescribes two migrations/schema v1; RC5 requires three migrations/schema v2 plus full publication hardening. [Contract](https://github.com/yorayriniwnl/Yor-World/blob/2a0b1ad2e4f8f3bd74b581e5d43b2d002d3a54f1/deliveries/G6/full-stack-integration/environment-contract.md#L27).
- **P3 - Evidence inventory:** three ignored `.last-run.json` entries in SHA256SUMS are absent from a clean checkout. Required manifest evidence passes. [Inventory](https://github.com/yorayriniwnl/Yor-World/blob/2a0b1ad2e4f8f3bd74b581e5d43b2d002d3a54f1/deliveries/G6/rc5-candidate/SHA256SUMS.txt#L44).
- **P2 - Repository bloat:** approximately 1.01 GiB of packed Git objects; no demonstrated clone/build/release correctness failure.

The studio-recovery findings are source-confirmed; direct runtime reproduction of those new findings was NOT RUN. The useful public portfolio remains available, so these findings were classified as disclosed P2 debt rather than P0/P1 release blockers.

## G7-ONLY REQUIREMENTS

Before production completion, require:

1. All three accepted migrations, in filename order: `20261001000000_a3_owner_auth_rls.sql`, `20261001000001_a4_publication_media.sql`, `20261005000000_github_refresh_state.sql`; followed by `app/supabase/operations/harden-publication-grants.sql`, with effective-grant verification.
2. Hosted Supabase Auth/AAL2/revocation, REST/RLS and private Storage verification, including the sixteenth table, `github_refresh_state`.
3. Independent PostgreSQL sessions testing contact races, publication/rollback, outbox reclaim and durable GitHub cadence.
4. Real email delivery and provider deduplication, live GitHub integration, restart/scaling and scheduler behavior.
5. Production secrets, disabled fixture flags, ingress limits, trusted proxy headers and CSP/HSTS verification.
6. DNS/TLS/CDN, monitoring, backup/restore and rollback rehearsal, including the required RTO <=5 minutes and RPO=0.
7. Implement `/api/health`: it is absent from the canonical app and has no rewrite/alias, but is required by the [G7 protocol](https://github.com/yorayriniwnl/Yor-World/blob/2a0b1ad2e4f8f3bd74b581e5d43b2d002d3a54f1/docs/planning/releases/2026-10-02-g7-production-release-protocol.md#L137). This is a PRE-G7 implementation requirement, separate from unrun live monitoring; it is outside the current G6 required-route policy.
8. Protect `main`: fresh GitHub reads at audit completion show **unprotected**, with **no rulesets**. This is a PRE-G7 governance requirement.

## PHYSICAL/MANUAL LIMITATIONS

Physical iPhone/Safari, Android/Chrome, NVDA, VoiceOver, TalkBack and ten-minute mobile thermal testing remain **NOT RUN**. Hosted services, native PostgreSQL concurrency, live delivery, production restore and DNS/TLS/CDN also remain **NOT RUN**.

Parent should explicitly record these limitations and the disclosed debt in G6 acceptance; they remain mandatory G7 obligations. They have not been converted into PASS or accepted by the auditor. G1-G5 acceptance and RC1-RC4 historical bytes are preserved. No maker self-approval was found.

The identity table and successful run IDs above are the immutable Parent inputs. This audit changed no repository files, pushed no fixes, deployed nothing and did not accept G6 or unlock G7. Saving this report is a subsequent documentation-only action and does not alter the audited candidate or its governance status.
