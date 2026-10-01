# POST-G1-WAVE-01: returned-candidate intake, 2026-10-01

Authority: parent Codex, continuing the user's bounded post-G1 production wave. G1 remains formally accepted. This record does not change FREEZE-1 or accept maker output. The three original packets were issued at `385c945fddd2de0b45353dcbc0324c001b3276fc`; their original dispatch manifest describes that commit, not later living-document edits. Current repository truth was read at clean local/remote `main` commit `256d2294c144a8e6434df52126e827b293473e90`.

## Current dispositions

| Lane | Actual return | Parent disposition | Exact next packet |
| --- | --- | --- | --- |
| A2 / Gemini #1 | `deliveries/A2/`, source `27ba056e047daaffef87ee11b13e8bc4eda57443` | **REWORK HANDOFF**; content approval evidence **INSUFFICIENT EVIDENCE** | [A2-CORR-01](A2-CORR-01.md), new `A2-r2` |
| B3 / Gemini #2 | Existing `deliveries/material-light-sample/`, accepted as visual benchmark by PARENT-RECON-04 | Preserve recorded benchmark acceptance; append member-identity clarification below. Wave production-overlay compatibility remains pending. | [B3-BIND-01](B3-BIND-01.md); reuse reviewed art, no automatic full-room expansion |
| B5 / Gemini #3 | `deliveries/B5/`, source `12749d49461ed506a44e78a70b764bde3455b0cf` | **REWORK HANDOFF / FOUNDATION** on source-inspected requirements; independent browser reproduction pending | [B5-CORR-01](B5-CORR-01.md), new `B5-P1-r2` |
| GPT Plus #2 | No wave audit return found | Independent audit pending | [AUDIT-NEXT-01](AUDIT-NEXT-01.md) |

These correction packets authorize new revision roots only. Existing application-relative ownership rules and shared-file restrictions remain unchanged. Existing delivery/review files are historical evidence and must not be overwritten. The parent performed receipt inspection and coordination, not maker implementation. No external account dispatch, independent GPT Plus #2 execution, integration, deployment or later gate acceptance is claimed.

## Exact received bytes

| Candidate | ZIP SHA-256 | Bytes |
| --- | --- | ---: |
| A2 | `12f3ff9a520d205d2774498f87d7fbc76d80e3c8d56c26e3d63d1b8e8a41fbd6` | 15,820,561 |
| B5 | `6b2cfc65368a44c36c1ad6b02c1cd608f5a0f72656e41a30a2c1acd3b74d9ad4` | 20,135,578 |
| Accepted B3 benchmark | `f75441ac85533bb9b7ad790a552c4f50373d685b9d6bbc179f219f1ba43b053f` | 39,559,649 |

All three checksum receipts match the archive bytes. [receipt-inspection.json](receipt-inspection.json), produced by [inspect-receipts.py](inspect-receipts.py), records exact Git/archive identities and changed paths. The inspection runs no application, Blender or browser test and installs nothing. Evidence classes are parent source/byte inspection and supplied maker/reviewer evidence; **independent runtime reproduction is NOT RUN**. Internal Codex source-check assistance is not execution by the named external auditor.

Both candidates retain the frozen contracts, dependency/lockfile and copied proof GLBs. Their archive-versus-Git differences are exclusively CRLF/LF text conversion, recorded explicitly in the receipt; no material archive/source disagreement was found. The blockers concern full-source baseline attribution, allowed production destinations and evidence, not a claim that W1/W2 binary bytes changed.

## Blocking findings

| ID | Severity | Finding and decisive source | Disposition |
| --- | --- | --- | --- |
| A2-I01 | P1 | A2 manifest declares baseline `e763e4256a70f8bc0358bde16995079780cf850c`, not the frozen accepted G1 archive. Its archived app differs at 29 source members, 19 outside A2 ownership, including world/shared files. | Reconstruct exact baseline; return only owned overlay and honest inherited-change attribution. |
| A2-I02 | P1 | `source/src/content/approved-publication.ts:4` claims an approved snapshot authored by Parent Codex/GPT-1. Returned register names sources but supplies no immutable claim/measurement/owner-approval receipts. In particular the 78.5% measurement is labeled verified with a null source URL. | Supply real receipts or omit dependent claims; public-content acceptance remains insufficient. This finding does not assert that the claims are false. |
| A2-I03 | P1 | Same snapshot line 14 binds `manifest-20261001-r1`, whereas FREEZE-1 binds `G1-R1`. | Correct the candidate binding without editing shared schema. |
| A2-I04 | P2 | Manifest lists itself with a stale digest; the other 232 listed archive members agree. | Exclude self-hash; hash completed manifest/archive separately. |
| A2-I05 | P2 | Provider/account/model attribution and Talks destinations differ among report, register and execution record. | Reconcile factual declarations and checked destinations in the new return. |
| B5-I01 | P1 | Both input manifests identify G1-F1-r1 ZIP `4a27a976...`, 24,282,330 bytes, instead of accepted G1-R1 ZIP `10eb041c...`, 6,419,527 bytes. | Preserve old provenance; derive the new candidate against the frozen archive. |
| B5-I02 | P1 | No wave revision root/overlay/change-map; 21 changed source members include shared Playwright configuration and seven tests outside the allowlist. | Return bounded overlay; private harness owns fault/config adaptations. |
| B5-I03 | P1 | All 11 source hashes in `report.md:210` disagree with actual returned source. Archive/source agreement does not repair incorrect report metadata. | Generate new hashes mechanically and bind runs to those bytes. |
| B5-I04 | P1 | Launcher permits public query auto-entry and exposes no lazy-stage Cancel/import error boundary; Retry changes lifecycle state without clearing error or starting a clean runtime; loader gets no AbortSignal; active render exceptions lack teardown. | Bounded original-foundation correction and actual regressions in B5-CORR-01. |
| B5-I05 | P1 | Supplied tests titled Back, Retry and late completion do not perform those actions; hard-coded owner strings do not count live owners. Other required hostile sequences lack execution receipts. | Honest requirement matrix plus exact-source runtime evidence; independent reproduction remains pending. |
| B5-I06 | P2 | Newly returned archives exceed the repository's 10 MiB ZIP/trace rule without a storage decision. A2 exceeds it too. | New corrections use canonical source/assets plus manifest or an approved concrete storage channel. Existing archives remain preserved. |

No P0 was established by this intake. Source-confirmed requirement/evidence failures are P1; they are not presented as independently reproduced browser failures. P3 polish was not pursued. Full art, full interactions, authentication/admin/contact, physical-device release coverage, asset-delivery rollout and C-track integration remain downstream requirements.

## Append-only B3 benchmark identity clarification

PARENT-RECON-04 at `e763e4256a70f8bc0358bde16995079780cf850c` binds the benchmark archive above at `fa649a74c66cf86338a55d32517204d39652eec9`. That archive, pinned Git blobs and current Git blobs agree on the following members:

| Member | Actual SHA-256 |
| --- | --- |
| `workstation-sample.glb` | `aa1618d690f0e65db4c072adb5bf83db259d03b55ab65db9bcd6f4e55df8d4c0` |
| `workstation-sample.blend` | `3f347fd7c1e2f1badae16ae880ed7b225fe3ee83572c371b269974ca31758b91` |

The ruling/reviews instead list `fc96aa...` / `9713ef...` in their individual-member digest cells. Those cells are inconsistent with their identified archive. This append records the archive's actual member identities; it changes no binary and does not rewrite the ruling or review evidence. Consumers must use the full archive/member identities recorded here rather than the incorrect cells.

The existing review reports 484 draw calls and uses a 500-call sample threshold. FREEZE-1 preserves existing production targets of 120 desktop / 80 mobile; this intake grants no budget waiver. Benchmark acceptance is available as visual/reference input, not automatic acceptance of a production overlay, shared WorldLighting signature, replacement chair, or full-room assembly. B3-BIND-01 checks that boundary before new art is commissioned.

## Handoff and later integration

Give Gemini #1 A2-CORR-01, Gemini #3 B5-CORR-01, Gemini #2 B3-BIND-01, and GPT Plus #2 AUDIT-NEXT-01 with the original freeze. Each may continue independent owned work. No lane changes another lane or shared production files. Only after independent reviews and exact parent ACCEPT records can a new single-owner integration packet be issued. Default/escalation model policy remains exactly as recorded in FREEZE-1.
