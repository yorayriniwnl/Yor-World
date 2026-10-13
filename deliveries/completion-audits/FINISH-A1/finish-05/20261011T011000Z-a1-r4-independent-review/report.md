# FINISH-10 independent audit of A1-R4

**Disposition: REWORK.** The exact candidate builds and passes its local suites, but it misses three accepted review and media-integrity requirements. This report does not accept the implementation, authorize canonical integration, or establish production readiness.

The review is bound to candidate commit `2e183eb3a1470427950265fc6bf4dadb8ad6411e`, base commit `f62a43c5e71c00dcb89e28275ea81d842167db80` (app tree `42ea29ec235225046a75959eb19eb386ac2f821d`), candidate app tree `ae4f54e366774969dfd202806451e7e4ec66d10b`, patch SHA-256 `7b2dd8ba10801dfca095191ce4b8c81a05d11a95eac4b016dd32fb433c619604`, and output-manifest SHA-256 `c97e0daa58ad2be10dea1477d593cc8d2bb7f42d82403876aa6e1ed8b2ef7604`. The candidate manifest covers 127 files / 13,347,339 bytes.

## Findings

1. **The candidate hash does not bind project content.** `computeReviewHash` accepts and hashes only the sorted `{projectId, draftRevision}` pairs plus site/media identity. It never receives the actual candidate projects. An audit probe changed paragraph text and reversed section order while keeping the revision pair constant; both inputs produced the same hash. The accepted contract requires changed document bodies and order to change the hash. Normal saves currently increment revisions, so this is not evidence that the existing save route silently reuses a revision; it is a concrete violation of the required hash contract and leaves same-revision durable payload changes outside the review identity. See `source/src/server/content/preview.ts:84-98,203-214` and `evidence/logs/final-probes.log`.

2. **Private Storage reads are unbounded before image validation.** `readReviewedMedia` calls `downloaded.data.arrayBuffer()` and only then calls `validateUpload`, where the 5 MiB limit is enforced. The audit probe materialized 5 MiB + 1 byte before receiving the size rejection. No bounded accumulation, read deadline, or abort is applied at this boundary. This fails the bounded-read contract and can allocate an unexpectedly large private object in full. See `source/src/server/media/manifest.ts:138-150`, `source/src/server/media/validate-upload.ts:184-201`, and `evidence/logs/final-probes.log`.

3. **The private review DTO schema accepts malformed review content.** `PrivateDraftReviewSchema` types `drafts` as `unknown[]` and does not enforce unique project IDs, timestamp formats, or consistency between `canPublish` and the check list. The probe passed a duplicate project vector, a non-DraftRecord object, `createdAt: "not-a-timestamp"`, an empty checks array, and `canPublish: true`. A separate probe confirmed Zod rejects an unsafe integer through `.int()`; that is not a finding. The route parses its generated response with this schema, so the schema does not perform the strict contract validation it claims to provide. This is not a demonstrated publish authorization bypass: publish also recomputes and compares the current `ReviewIdentity`. See `source/src/server/content/preview.ts:22-60`, `source/src/app/api/admin/preview/route.ts:22-31`, and `evidence/logs/final-probes.log`.

The delivery also lacks the standalone `requirement-matrix.json` requested by the maker packet. Its report has a short summary table, but not a complete clause-by-clause matrix. This audit supplies the missing matrix as reviewer evidence; it does not retroactively complete the maker package. The actual approved-image browser selection/preview flow remains **NOT RUN**: the Chromium test asserts the empty picker, edits its alt/caption buffer, then removes that image block before saving. No test selects and previews an approved image. The editor has an accessible select and a separate private draft-preview route, but those do not establish the unrun image flow.

## Verified scope

The current candidate package is internally consistent. I independently rechecked all 127 manifest entries, confirmed the patch hash and exact allowlisted 25-path set, and replayed the UTF-8 patch in a fresh detached worktree from the pinned base. The replay produced app tree `ae4f54e366774969dfd202806451e7e4ec66d10b`; all 25 replacement files matched byte-for-byte. `app/src/contracts/content.ts`, dependencies, migrations, and canonical `app/` were unchanged. The current repository app tree remains `42ea29ec235225046a75959eb19eb386ac2f821d`.

On the exact candidate assembly, offline frozen install passed; unit tests passed (24 files / 314 tests); integration tests passed (28 files / 313 tests); lint, typecheck, and production build passed. The audit build ID was `vI8AVxD6Bjs24bxQxJ7_V`. The two assigned Chromium specs passed 10/10 using the explicit local fixture environment; screenshots are under `evidence/e2e/screenshots/`. A first browser attempt without `YOR_E2E_FIXTURE=1` failed 6/10 because private pages redirected to login; the corrected fixture run passed. Both attempts and their distinct environments are recorded. A scan of `.next` found no `PRIVATE_SENTINEL` or `R4_PRIVATE_WORKFLOW_SENTINEL` matches.

The passing PGlite, synthetic-auth, mocked-Storage, and local-browser results establish only those local behaviors. The integration suite does pass the tested missing-review and no-partial-write cases, durable revision-7 read, ordered lock trace, four valid same-ID media mutations, byte-tamper rejection, save rejection, CandidateX privacy, and selected private-header branches. The editor test covers the four block controls, ordering, focus, failed-buffer retention, save/reopen/cancel, but not selection of an approved image. CDN visibility and storage/provider behavior were not inferred from the local fixture.

## Integrity and evidence limits

The package creator and last writer for `source/`, `source.patch`, and related receipts remain unknown. The intake and preserved live-process snapshots say no matching process was present when queried; that cannot identify an exited writer. Current bytes and their source/patch mapping are independently verified, but the `worker` field in the assembly receipt is not proof of authorship. This review is by local Codex and does not claim an external GPT Plus #2 audit.

The R3 preservation record itself shows a baseline of 358 entries / 270 files and a later inventory of 30,212 entries / 25,402 files, including a new `candidate/node_modules` tree and 17 changed baseline files. The record explicitly leaves attribution unknown and does not establish exact preservation. The late fixture and earlier out-of-root browser artifacts have discrepancy and copy receipts; those records do not establish their historical writer. R3 was not used as the R4 source base. No cause or intent is inferred.

Native Supabase/PostgreSQL/Auth/Storage, multi-process races, provider-approved image selection, complete Storage outage/503 branches, CDN invalidation, live deployment, PDF approval, physical-device, backup/recovery, and G7 checks remain **NOT RUN**. These remain separate from the successful local checks.

## Stable audit artifacts

- `findings.json` — source findings and evidence limits.
- `requirement-matrix.json` — clause-by-clause results.
- `input-hashes.json` and `output-hashes.json` — exact audit input/output identities. The output manifest excludes itself, as its own hash would be recursive.
- `execution-receipts.json` and `evidence/logs/` — commands, exits, fixture scope, and raw logs.
- `evidence/identity-verification.json`, `evidence/patch-replay.json`, and `evidence/build-binding.json` — candidate identity, fresh patch replay, and build binding.
- `evidence/final-validation.json` — final JSON, output-hash, replacement-map, and canonical-tree checks.
- `evidence/audit-r4-probes.test.ts` — audit-only reproductions; it was run from the isolated worktree and is not part of the candidate.

Parent must review these audit bytes and issue a new bounded maker correction packet for the open findings. Canonical `app/` integration and a separate Parent acceptance decision remain pending.
