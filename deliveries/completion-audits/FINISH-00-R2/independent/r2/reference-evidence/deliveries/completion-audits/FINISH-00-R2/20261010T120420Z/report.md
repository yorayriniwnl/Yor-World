# FINISH-00-R2 independent contract audit and readiness check

**REWORK advice for the exact proposed contract manifest below.** Hash/path/schema checks pass and the inspected runtime/art handoffs are coherent. One publication-review identity defect prevents a full contract PASS. This is GPT #2 advice before R2 acceptance; Parent remains the acceptance authority. No production correction, maker acceptance, deployment or G7 ruling was performed.

## Candidate and actual access

- Proposal: `docs/planning/reconciliation-packets/finish-contracts-r2/`, labelled DRAFT FOR INDEPENDENT REVIEW. FINISH-03 and its P20/P01 instructions authorize this proposed-contract review before acceptance. Its seven decision documents, validator, immutable input snapshots and raw input/output manifests provide the bounded review unit. No accepted R2 ruling was located under `docs/planning/reviews/`.
- Exact reviewed output manifest: SHA-256 **65126f6a196449f0167263574b84bbc8aaa439760f17323e2cca447f1f74056d**, 3,157 bytes. Input manifest: **91b00ad8b1122a1392c7f541485f502dcf4b97723039084ae5688926387a606a**, 33,390 bytes. The raw proposal is preserved in `candidate-snapshot/`; it remained unchanged throughout the recorded diagnostics and final verification.
- Declared maker source base: `f62a43c5e71c00dcb89e28275ea81d842167db80`. Actual inspection HEAD: `31fbf8ffee53fb754e5276f2984032f301ac31cc`, branch `audit/completion-2026-10-09`. Both app trees: **42ea29ec235225046a75959eb19eb386ac2f821d**. `git diff <base> -- app` is empty. No overlays were applied for this documentation review; a production build identity is not applicable to the contract candidate.
- Historical prerequisites: product design Revision 2, RC6-R1 source acceptance and the original FINISH-00 ruling at `docs/planning/reviews/2026-10-09-finish-00-contract-ruling.md`. The original ruling and failed/rejected evidence were preserved. Historical acceptance does not accept R2 or implementation behavior.
- Real local access: PowerShell, Python **3.12.10**, Node **v24.19.0**, Git **2.55.0.windows.5**, source/SQL/GLB/evidence files and local collaboration tools. Three read-only audit helpers were explicitly invoked as **gpt-6.1-sol**, reasoning high, for delivery identity, platform contracts and runtime/art contracts. The primary session identifies itself as Codex/GPT-6; a more specific serving model ID is not exposed here. Internal helpers are within the auditor lane, not dispatches to external account holders. No new Astra invocation is claimed. Existing `architecture/r2` advice is independently hash-matched and attributed to its own report, not treated as Parent acceptance.
- Exclusive output: `deliveries/completion-audits/FINISH-00-R2/20261010T120420Z/`. Auditor canonical production allowlist: **empty**. Parent contracts, `app/`, maker deliveries and earlier audit revisions were read-only.
- Pre-existing unrelated state: `deliveries/G6/rc4-candidate/ci-results.json`, `deliveries/G7/preparation/tools/__pycache__/`, the other untracked `deliveries/completion-audits/FINISH-00-R2/` revisions, and untracked `docs/planning/reconciliation-packets/finish-contracts-r2/`. They are excluded from this scoped commit. Current remote branch matched the inspection HEAD before staging.

## Blocking finding

### PLAT-R2-01 — HIGH — CONFIRMED architectural identity gap

Requirement: publish exactly the reviewed candidate and reject post-review draft/body/approval changes without partial publication writes. Owner: **Parent GPT #1** for the R2 contract correction; Gemini #1 implements only after the corrected contract is reviewed and accepted.

`02-platform-schema-recovery.md:69–74` defines ReviewIdentity; line 89 freezes the hash preimage to `{projects, siteDraftRevision, site, assetManifestRevision}`. Actual image blocks contain `mediaId`, alt and caption (`app/src/contracts/content.ts:28`), with no image hash/object/approval identity. Line 101 nevertheless promises rejection of any post-review approval change.

Trigger: review a draft image, then change the referenced media row to another valid approved object without editing its mediaId or draft revision. The canonical schema has mutable `object_key`, `hash`, provenance and approval columns (`20261001000000_a3_owner_auth_rls.sql:129`), authenticated owner UPDATE grants (line 254) and the active-owner/AAL2 update policy (line 371). Existing approval updates by ID (`validate-upload.ts:271–288`). A FOR SHARE lock and current byte/approval revalidation establish validity at publication; they do not establish identity with the media reviewed earlier. Invalid/revoked media is a separate case that revalidation can reject.

Observed: the independent documented-preimage diagnostic produced **the same hash before and after a different media mapping**: `b2969893c0ecbc2748cc3ef6e2bcdf4a1731874ff713f991ddae48a1f74166e5`. `identityEqual=true`, `mediaMappingChanged=true`. See `review-media-identity.mjs` and `review-media-identity-result.json`. Outcome: **DEFECT REPRODUCED at the architectural identity boundary**, not an implementation or provider test PASS. The diagnostic uses a minimal image-block fragment and hypothetical media rows; it does not execute future A1, a SQL update or Storage approval.

Required correction: Parent must explicitly bind reviewed media bytes/object/approval identity into the deterministic review, or establish an enforceable immutable media-ID mapping and define approval-change semantics. Define the exact relevant source allowance and a maker regression that changes a valid approved mapping after review, then rejects the old identity without history/content/audit partial writes. The auditor does not choose or implement that architectural correction. Preserve this proposal and issue a new review revision, then obtain an independent delta audit before acceptance.

Nonblocking clarification: line 101's private-response header sentence should explicitly name its scope. If it covers all admin media APIs, existing `/api/admin/media/[id]` 404 and `/approve` 200/422/503 lack the required headers and are outside A1/A2's allowance. If scoped to the allocated preview/project/publish work, there is no established allowance blocker. This ambiguity is not counted as a confirmed second defect.

## Executed checks and limitations

| Check | Result | Evidence and meaning |
| --- | --- | --- |
| Independent raw proposal/input verification | PASS **159/159**: 146 inputs + 13 outputs; no missing/extra output path | `manifest-verification.json`; mutable input snapshots checked at their declared paths |
| Candidate validator, without --bind | PASS: 159 hash checks, 134 allowlist checks, 23 local links, 3 migrations, 16 public tables, zero errors | `proposed-validator.stdout.txt`, command receipts; overlaps the independent hashes and is not a second set of distinct tests |
| Independent schema/ownership/source inspection | PASS within inspected scope | `path-inventory.json`; actual SQL names, source call sites, allowed existing/new paths and sequential ownership |
| Proposal delta from preserved initial review | Five changed paths identified; all current identities captured | `proposal-delta.json`; runtime/platform/assets/ownership/validator changed; historical proposal preserved separately |
| B1 delivery drift | PASS: **71/71** prior-bound delivery hashes unchanged, **70/70** current maker output hashes/sizes valid | `delivery-drift.json`; includes B1 manifest's historical identity |
| C1 delivery drift | PASS: **21/21** prior receipt-bound output hashes/sizes unchanged, **21/21** current maker outputs valid | `delivery-drift.json`; C1 has 22 files, with the output manifest itself not historically bound by the prior receipt/input inventory |
| Review media identity negative diagnostic | **FAIL desired identity requirement; DEFECT REPRODUCED** | `review-media-identity-result.json`; architectural fixture only |
| Proposal/source stability | PASS | `candidate-identity.json`, `final-verification.json`; canonical source and inspected candidate preserved |
| Fresh application suites/build/browser/provider/device/assistive/recovery | **NOT RUN** | No implementation was delivered for R2; no unchanged broad codebase audit repeated |

Fresh application test count is **0**. The diagnostic reproduces one specification defect; hash comparisons, allowlist rows and links are not application test cases. Existing 13-case C1, 7-GLB validation and broad historical suite results remain attributed to their original audits and were not relabelled as fresh execution. No rendering, re-export, deformation/clearance, native SQL concurrency, live deployment, full-service recovery, physical thermal or assistive proof is claimed by this audit. Reference bytes are bound and prior art findings reused; the main image was not newly rendered/viewed in this turn.

Helpers directly inspected canonical texture consumers, existing quality/batch interfaces, GLB JSON/node/skin/accessor inventories and the 25-ID catalog. Their source findings are in `helper-review-notes.md`; this is separate from browser playback and deformed geometry measurement. Their unsuccessful exploratory command attempts are disclosed there. Root-owned diagnostics completed with exit 0; existing failed type-seam attempts in the older independent/r1 remain preserved and were not overwritten.

## Original finding closure and regression disposition

| Finding | Contract disposition for this proposal | Implementation/evidence disposition |
| --- | --- | --- |
| GOV-01 | ADDRESSED: exact sixteen public tables, immutable three migrations, private-by-policy github_refresh_state, separate Auth/Storage | Provider/effective-policy/complete successor execution NOT RUN |
| GOV-02 | ADDRESSED: measured routing rollback <=300s/RPO=0 separated from measured full-service recovery/cut-off/limits | Both rehearsals NOT RUN |
| GOV-03, C1-R5 | ADDRESSED: loading UI/types/preferences/resource/quality/tests explicitly allocated; C3 layout remains sequential | Original scope excursion is historical; no corrected C1 bytes exist |
| GOV-04, B1-R1/R2/R4 | ADDRESSED: exact conforming successor exports, hierarchy/pivots/eight paired clips and corrected F1 metadata | Original B1 REWORK remains; no new asset acceptance |
| GOV-05/GOV-08 | ADDRESSED: actual controller/registry paths and isolated accepted overlay before C2, later canonical I1 | Assembly and accepted B1-R2/C1-R2 absent |
| GOV-06 | ADDRESSED: three real authenticated POST jobs, scheduling/retry/catch-up proof requirements | Real scheduler execution NOT RUN |
| GOV-07 | ADDRESSED in living recheck status and R2's delivered/reviewed/accepted/integrated/deployed distinctions | Canonical app unchanged; implementation/source/live states remain separate |
| AR2-01 and camera/fixture type seams | CLOSED/ADDRESSED as design: frame/hinge siblings consistent at asset lines 51/88; reveal/greeting type and fixture sections now allocated | Current source is intentionally old; future maker changes need execution proof |
| C1-R1/R2/R3/R4/R6/R7, CA-06/07/10 | ADDRESSED as session/adoption/disposal/progress/pause/browser proof obligations | STILL OPEN at required integrated/browser scope; prior narrow initial-bone evidence retained |
| B1-R3/R5/R6, CA-05/08/09/11 | ADDRESSED as physical/reference/capture/budget/catalog obligations | STILL OPEN; no new visible-motion/render/export/browser proof |
| CA-01/02 | Editing/private preview/review mostly executable and scoped, but **PLAT-R2-01 prevents complete review binding** | A1 absent; no behavioral closure |
| CA-03/04/12 | Historical site/new-write/rollback/PDF/provenance designs allocated | A2 absent; genuine approved PDF/receipts and I1 monitor seam remain dependencies |
| CA-13 and six extensions | Retained explicitly, no narrowed completion claim | NOT RUN / no accepted implementations located |

No production regression was executed or waived. PLAT-R2-01 is an unclosed architectural gap in the new review-binding design. No missing physical/provider test is misreported as a demonstrated device/service failure. No provenance omission is called fabrication.

## Dependency/readiness matrix and concrete handoff

| Work | Current actual status | Exact remaining binding / next owner |
| --- | --- | --- |
| FINISH-00-R2 contract audit | Executed against manifest 65126f6a…; **REWORK advice** | Parent corrects PLAT-R2-01 in a preserved successor review revision, then GPT #2 delta audit and separate Parent ruling |
| Original FINISH-B1 | Unchanged delivery; prior B1-R1…R6 REWORK reused; implementation acceptance unrecorded | Gemini #2 receives accepted R2/P04 correction handoff and returns actual B1-R2 assets/provenance/hashes/captures |
| Original FINISH-C1 | Unchanged 21 bound outputs; prior C1-R1…R7 REWORK reused; implementation acceptance unrecorded | Gemini #3 receives accepted R2/P05 correction handoff and returns actual C1-R2 source/patch/consumer/browser proof |
| FINISH-A1/r2 | Absent | Accepted corrected R2, actual Parent issuance and Gemini #1 delivery with exact base/allowance/patch/build proof |
| A2 / C2 / C3 | No located delivered successor/acceptance | Accepted A1 for A2; accepted B1-R2+C1-R2 and real assembly manifest for C2; accepted C2 for C3 |
| I1 | Absent; canonical app unchanged | Separate Parent canonical integration packet with accepted A1/A2/B1/C1/C2/C3 identities and exact mappings |
| G7 | Status origin=null, deployment/provider/manual proof NOT RUN; authorization G7-OWNER-AUTH-20261006 persists | Actual accepted source, origin/deployment/fallback/schema/service/device/receipt bindings; no repeat consent request |
| Six extensions | Required, no acceptance located | Individually issued B then C packets and cumulative final source/live proof |

Current B1 manifest: `cf0a572a6e1437a68ef0cadf3bbfcd2975d5056dd468850f034d675405e41c7a`, 11,447 bytes. Current C1 manifest: `bffa31be6f51e1ae037ddd69615126803b0fc815fef4beac1b5a1824c38d0814`, 3,173 bytes; current C1 patch: `1ff939a28675ece807831867a17e15e2e610268dd0b9d954b3d28a396b8725e0`, 30,973 bytes. C1 manifest historical self-identity is NOT VERIFIED by the two prior binding ledgers; that limitation is not evidence of a change. Its declared current outputs all verify.

Existing platform/art/runtime upload preflights are real inspected readiness artifacts, not maker implementations or dispatch/acceptance records. R2's prepared first handoffs name exact base/root/allowance, but explicitly depend on an accepted ruling. Successor source/patch/assets/build/assembly/predecessor hashes do not exist yet and cannot be invented by this auditor.

Returned files: this report, input/output hash inventories, path inventory, readiness/dependency records, exact candidate snapshot, independently executable identity/drift/media diagnostics, raw command results and helper review notes. Output manifest explicitly excludes itself; no dependency/cache/credential directory is included. Scoped commit/push outcome and commit identity are reported in the final handoff after Git completes; the report does not attempt to hash its containing commit recursively.

**Next owner: Parent GPT #1. Correct the bound contract, obtain the independent delta advice, then decide contract acceptance and issue the three maker packets.** This audit does not execute P21 maker corrections or P23 Parent acceptance.
