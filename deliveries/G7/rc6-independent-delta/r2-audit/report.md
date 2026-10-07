# RC6 r2 maker-independent delta audit

Date: 2026-10-07 UTC / Asia-Calcutta. Reviewer: local Codex read-only audit worker `/root/rc6_final_independent_audit`, assigned GPT-6.1 Sol by Parent under the ordinary-audit policy. Exact backend/session/account identity is not independently attested. No external GPT/Gemini/Claude account execution is claimed. This reviewer did not implement production corrections, operate production services, or accept a release/gate.

**Recommendation: HOLD / REWORK the bound RC6 r2 successor.** The new r2 bundle binding still points into the original RC6 proof root: the detached run overwrote that checkout's original archive, and the same bound path in the shared repository contains the preserved original archive with a different hash. This is a release-binding defect that blocks successor acceptance even though application checks pass. Both PRE-G7-04 P2 corrections close within the executed boundaries, and no application P0/P1 was confirmed. A separate P2 operational-ledger defect is independently reproduced; PRE-G7-05 assigns its correction. Parent adjudicates acceptance. G7 remains NOT ACCEPTED.

## Exact inputs and source

| Identity | Value |
| --- | --- |
| Accepted RC5 source | `c34e01bb5bff210d924f42d5266e2fa1ed13288e` |
| Accepted RC5 app tree | `88a65e85d1f120a9aa4397efa8cc779bdfe5cf08` |
| Accepted RC5 bundle SHA-256 | `4380cab7f5211c836fe5bb97c68d67137c1b0fd7a2e4789bb29d0157ab5faa0f` |
| Accepted coordination base | `eb1ff201391334d6041b35c59eb350fcd012a79c` |
| Original RC6 source | `6c7200ae4222557f6f8aecce4e2b7d88755ca6f3` |
| Original RC6 proof archive commit | `3ab0c7b44bb541136348b760afcfdea5f2d61fff` |
| Final audited RC6 source | `48ee09a98c9f7e59ca3a652c7f5dbeb31d0c7e2f` |
| Final audited app tree | `b281deaa902f56d93c4acb40ae8eb7cbb6edcbd4` |
| Final candidate evidence root | `deliveries/G7/rc6-candidate-r2/` |
| R2 receipt archive hash | `d83a17f137dfbbb0070f81000c4270c263622ee43c876cd7d009abd54ba654cd` |
| R2 bound archive path | `deliveries/G7/rc6-candidate/yor-world-v1.0.0-rc6.bundle.tar.gz` — historical original root; incorrect for r2 |
| Shared actual archive at that path | `c12e265b54f16a200a8a9b782a3a050f9730236cc543f2d8e56fb066cc8e4355` — preserved original proof |

Read directly: START_HERE, AGENTS, delegation/work orders, product design revision 2, exact PRE-G7-01/02/03 and `2026-10-07-pre-g7-04.md`, G6-R1 and its RC5 independent audit, pre-G7 prerequisites, RC6 dossier, prior partial audit receipts, and changed source/tests/release tooling. PRE-G7-04's filename is dated October 7; an October 6 filename does not exist. No missing required input remains from that filename discovery. Visual references were not re-reviewed: the assigned delta preserves their bytes and all assets; this is not a new visual acceptance.

Source inspection compares the app delta against RC5; historical receipts are compared against the later accepted coordination base, where RC5/G6-R1 actually exist. Comparing additions from the earlier source commit as though they were historical rewrites would misclassify legitimate archival work.

## Checks executed by this reviewer

Exact commands, exits and raw log hashes are in [executed-checks.json](executed-checks.json). These are fresh targeted executions by this reviewer, separate from maker receipts and the full release run.

| Own check | Result | Evidence |
| --- | --- | --- |
| Committed-source delayed-loading/visibility probe | PASS for final source; reproduces original double-chain defect on RC5 and original RC6 | [loading-visibility-probe.json](loading-visibility-probe.json) |
| Actual Windows guard-only canonical/case/history-descendant probe | PASS: nine rejected targets; accepted-file hashes unchanged | [immutable-path-probe.json](immutable-path-probe.json) |
| Release guard regression, including isolated junctions, escapes, dangling links, unsafe paths and positive mutable targets | PASS: 12/12, zero skipped/cancelled | [immutable-output-tests.log](immutable-output-tests.log) |
| Runtime recovery, health, CSP and import-boundary unit checks | PASS: 59/59 across four files | [targeted-unit.log](targeted-unit.log) |
| Health route integration | PASS: 6/6 | [targeted-health-integration.log](targeted-health-integration.log) |
| Current status/accepted-ruling agreement | PASS | [current-status.log](current-status.log) |
| Historical RC4 builder under current RC6 policy | PASS of expected fail-closed behavior: exit 1 before building/writing | [historical-rc4-builder.log](historical-rc4-builder.log) |
| Isolated adversarial G7 ledger ingestion | FAIL of ledger contract: wrong-source and partial-subcriteria receipts become requirement/overall PASS | [g7-ledger-probe.json](g7-ledger-probe.json) |

The loading probe executes transpiled committed production runtime/lifecycle code with deterministic RAF/renderer/loader adapters. It does not use real WebGL/GPU rendering. The unit regression uses real scene integration/directors/lifecycle with renderer and loader adapters. Health success uses a local PGlite SQL adapter and synthetic Auth response; the native pg test proves cancellation against an unresponsive local TCP peer, not connection to production PostgreSQL. No full application suite was rerun by this reviewer.

## Independent correction verification

**PRE-G7-04 render-loop P2: CLOSED within source/adapter boundary.** The same retained independent reproducer yields two queued chains and two renders in one browser tick on RC5 and original RC6 after hide/show during LOADING. At the final commit, ordinary loading and loading hide/show each yield zero callbacks before assets, one callback after assets, one render per tick, and zero pending callbacks/renders after disposal. `scheduleAnimationFrame` centralizes ownership, waits for an integrated scene, clears the owned ID before executing a frame, and rejects canceled callbacks whose IDs no longer own the loop. Added regression covers repeated resumes, initially hidden/hidden-during-loading completion, stale canceled callbacks, disposal/portfolio retirement, failed load and replacement runtime. The independent probe has no real GPU claim.

**PRE-G7-04 historical-output P2: CLOSED within actual Windows/filesystem boundary.** `safePath` resolves the nearest existing ancestor and checks real filesystem containment; `assertMutableOutput` compares reserved lexical and resolved identities, folding Windows case. Original demonstrated case-alias targets now reject. Independently executed isolated junction tests verify both existing accepted files and nonexistent descendants of directory aliases, docs aliases, escapes, dangling links, preserved mutable successors and unchanged isolated accepted fixtures. No accepted file was written by this audit. Historical `build-rc4-bundle.mjs` calls `safePath` later, but its first check rejects the fixed RC6 policy before argument parsing, bundle construction or any write; no current bypass through that entrypoint was confirmed.

**NEW / P2 — G7 preparation-ledger identity and completeness: OPEN, independently reproduced.** `deliveries/G7/preparation/tools/g7-evidence.py` requires nonempty receipt identity fields but never compares them with the supplied manifest/ledger identity. It then replaces the complete required criterion list through `matching.update(observation)` and verifies only that the provided subcriteria all say PASS. Three isolated executions at `48ee09a` demonstrate:

- A receipt with source `ffffffffffffffffffffffffffffffffffffffff`, conflicting app-tree/bundle/manifest hashes and all four domain subcriteria marks requirement 1 PASS under the actual original-RC6 manifest's different source identity.
- A matching-source receipt with only DNS resolution marks all of requirement 1 PASS and removes the other three required criteria.
- Wrong-source receipts with only one criterion for each of ten requirements plus six clearly synthetic manual session records produce `overallStatus: PASS` while the output still carries the actual manifest's source. Every artifact hash is valid, but the artifact explicitly states no test was executed.

Full inputs/outputs are retained in [ledger-probe-fixtures](ledger-probe-fixtures/); command and tool/source hashes are in the [probe receipt](g7-ledger-probe.json). These are adversarial audit fixtures, not production proof. Severity is P2 because the tool creates misleading complete-evidence status, but `acceptanceClaim` remains false and Parent alone gates release. No production compromise, direct gate acceptance or bundled app defect is established. Correct receipt-to-ledger identity comparison and complete mandatory criterion preservation through a separately assigned maker packet before relying on this ledger for G7. No fix was written by this auditor.

**NEW / P2 — R2 bundle path and original-proof mutation: CONFIRMED, BLOCKS SUCCESSOR BINDING.** The major-gate adviser identified a concrete path mismatch; this auditor independently read the frozen policy, three r2 receipts, file existence and actual hashes in both workspaces. `rc6-policy.json` changes `deliveryRoot` to r2 but leaves `bundle.path` at the original RC6 root. The r2 manifest, source-binding and bundle-receipt all repeat that original-root path with the new `d83a17f...` hash. Neither workspace has a bundle under r2. The detached worktree's original-root archive is now `d83a17f...`, replacing its committed original `c12e265...` proof archive. The shared repository's original archive is still correctly preserved as `c12e265...`, so its new r2 manifest cannot validate the referenced bundle bytes. No shared accepted-history or original-proof overwrite was observed by this auditor. Do not copy the new bundle over that original file. This needs an explicit Parent source/evidence amendment with a new revision and correct successor output path; preserving an old proof cannot be achieved by rewriting its bound path or pretending this is a copy delay.

## Whole authorized delta review

**Runtime/controls:** failure Retry clears failure/UI state and reconstructs a new runtime generation; the retry counter/limit lives above reconstructed lifecycle sessions and retains the accepted three-retry ceiling. Failure/STATIC effect cleanup disposes the old runtime. STATIC Retry is explicit user intent to recompute supported AUTO. Missing WebGL still resolves to useful static content. Disposal aborts the runtime loading signal; stale initialization completion/error callbacks are suppressed. Render eligibility rejects failed, static, stale, disposed, detached and hidden sessions while preserving healthy loading/entrance/HOME/transition restoration. The accessibility-control wrapper restores pointer targeting under the click-through HUD; the browser test uses ordinary mouse input/navigation without force-click. Camera, animation, art, interaction and adaptive-quality modules/contracts remain unchanged.

**Health:** default readiness returns 503 for absent/invalid configuration, fixtures, failed dependencies and timeouts. Explicit liveness returns process-only 200 with readiness `not_checked`. Readiness performs only `SELECT 1` plus bounded Auth health GET; completed results are not cached and concurrent callers share one bounded evaluation. Response data omits connection strings, keys, tokens and provider bodies; responses are no-store. Socket destruction, abort/cancel and bounded close prevent a hung cleanup from holding the request. Accepted environment aliases remain supported. A reachable Auth health identity and successful SQL SELECT do not establish owner/AAL2/RLS/email/restore correctness; the response declares that narrower scope.

**Security:** Proxy generates fresh 128-bit random nonces, overwrites inbound CSP/nonce override headers, places matching CSP on forwarded request and response, and forces dynamic HTML rendering via server layout `connection()`. Production script policy has nonce/strict-dynamic, no unsafe-inline/eval, and blocks script attributes; style attributes retain the explicitly needed permission. Supabase origins are validated from configured environment input. Frame/object/base/form restrictions, existing headers and HTTPS HSTS are present; loopback HTTP correctly remains usable without pretending to prove TLS. Frozen model responses receive immutable caching. Tests include matching framework script nonces, attacker-header replacement, strict policy hydration/world/contact/login and all nine model response hashes. The inline attack test is controlled response delivery of actual server HTML/CSP with one inserted unnonced payload; it is distinct from direct unmodified browser transport and production evidence.

The narrow guard change recognizes only exact layout/proxy server entrypoints without `use client`; negative cases retain restrictions for client-marked entries and similarly named ordinary modules. Transitive private-import and environment guards remain. No accepted auth/database/contact/publication/media/outbox/telemetry source was changed by these packets.

**Release/governance:** RC6 policy preserves accepted asset/schema/publication/contact values and the same thirteen required checks, adds health/Proxy composition evidence and carries candidate/selfApproved=false. Actual Node Proxy compiled output/functions-config manifest is required instead of treating the empty Edge middleware map as proof. CI retains all thirteen numbered mandatory checks, verifies discovered browser totals with zero skipped/flaky/unexpected cases, and runs the new immutable-output regression in integrity CI. New output root and original proof preservation are explicit. Initial original-source evidence is a retained earlier candidate, not proof for the final amendment. Portable inventories explicitly omit optional ignored runner state without rewriting RC5 inventory. Hosted fetch/observer helpers inspect exact runs/attempts/jobs/artifacts and preserve separate snapshots; their source handles credentials in memory, drops authorization before download redirects, constrains archive extraction and avoids self-acceptance. This auditor did not execute provider fetch/observer operations.

LOW duration/actions, 33.3/45 ms thresholds, 1000 ms render watchdog and 900 ms action timeout are unchanged. The resource-cycle test now requires positive actual renders, SPA teardown, detached/context-lost stopped renderers and truthful `UNKNOWN` heap/GPU leak absence. This closes G6-D03's unsupported assertion through honest evidence classification; it does not measure memory leak absence.

## Upstream security context

The checked [official CSP guide](https://nextjs.org/docs/app/guides/content-security-policy) requires dynamic request rendering for per-request nonces and describes matching request/response CSP. The inspected implementation follows that flow; runtime/browser compatibility requires the bound fresh evidence.

The [September 2026 security notice](https://nextjs.org/blog/september-2026-security-release), re-read October 7, names Next 16.3.8 as a patched release and still notes one critical and one high item postponed for upstream coordination. Their detailed applicability remains UNKNOWN. Configuration inspection finds no remote image allowlist, Pages Router, root catch-all SSG/ISR, metadata image route, Cache Components or cached Draft Mode; those are applicability observations about disclosed vectors, not blanket security clearance. Production build/start avoids the disclosed development-server vector. No new exploit for the postponed items was confirmed or claimed mitigated.

## Fresh/hosted evidence and recommendation

The final-source detached run completed all thirteen required checks with 312 unit, 286 integration, 109 E2E, 17 accessibility and six performance cases. These are inspected maker/preparation-worker executions, not this reviewer's full-suite execution. Their success is bounded to that checkout: the archive builder wrote into its committed original-proof path, while the shared new manifest references different bytes. Exact shared candidate binding therefore fails independently despite the detached strict-validation PASS. Hosted verification cannot cure the incorrect frozen bundle placement. Initial source `6c7200a` has separately preserved fresh evidence; it cannot substitute for amended-source validation.

**HOLD / REWORK r2** until the bundle placement/source/evidence defect receives an explicit corrected revision and fresh bound proof. Application source inspection and the two PRE-G7-04 corrections may be retained as passing delta evidence; they do not make the r2 release binding acceptable. Separately correct and audit the P2 G7 ledger before using it for production evidence. No successor or G7 acceptance is issued by this reviewer.

## Limits retained

Actual production origin/deployment/DNS/TLS/CDN, live PostgreSQL independent sessions, Supabase Auth/AAL2/RLS/private Storage/effective grants, provider email delivery/deduplication, scheduled jobs/live metadata/restart/scaling, monitoring, live backup/restore and rollback RTO/RPO remain NOT RUN by this reviewer. Physical iOS/Android, actual NVDA/VoiceOver/TalkBack and sustained thermal sessions remain NOT RUN. Heap/GPU leak absence remains UNKNOWN. Main-protection/provider governance was not operated or independently live-read by this worker. Local fixtures, SwiftShader/hardware lab rendering, controlled security replay and header strings do not replace these mandatory live/manual criteria. Repository-size debt remains outside the correction packets.

Only new audit files/evidence were written under the assigned `r2-audit/` root; source fixes, commits/pushes and final acceptance remain with assigned makers/Parent.
