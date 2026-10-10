# FINISH-A1 / FINISH-04 local platform re-audit

**Disposition: REWORK. A3-01 through A3-05 remain open.** The actual `deliveries/FINISH-A1/r2/` candidate does not meet the accepted correction requirements. This record does not accept implementation, integrate the candidate or change production source.

The independent reviewer was invoked through collaboration as `gpt-6.1-sol / ultra`. It completed identity checks and behavioral diagnostics, then reached a usage limit before writing its narrative report. Parent compiled this report from its saved results, scripts, source references and messages. Execution is attributed to that independent reviewer; report compilation and final artifact validation are attributed to Parent. No external GPT/Gemini account execution is claimed.

## Binding and execution

- Intake HEAD: `afc69a9a154d2036562728bb61d9948297871149`.
- Maker source base: `f62a43c5e71c00dcb89e28275ea81d842167db80`.
- Canonical/base app tree: `42ea29ec235225046a75959eb19eb386ac2f821d`.
- Accepted contract output manifest: `8038db147824b0a31de1028c330383352177020b2247dd627d1674d6dc14c6af`.
- All 22 declared maker outputs and all 54 accepted contract outputs match their raw identities. See [identity-verification.json](identity-verification.json).
- The assigned `deliveries/FINISH-A1/r3/` root was absent. This audit assesses available bytes rather than inferring failure solely from a folder name.

The delivered patch begins with a UTF-16LE BOM and contains 109,097 NUL bytes. The exact-base Git check exits 128 with `No valid patches in input`. Applied-patch/replacement agreement is therefore **NOT RUN**. The reviewer separately assembled the declared base plus all 18 byte-identical replacement files for diagnostics. This is not a corrected or accepted patch. [Post-execution integrity](post-execution-integrity.json) confirms all maker outputs remain unchanged and all tested replacements remain unmodified.

**24 unique required-outcome cases executed: 6 PASS, 18 FAIL.** The first run executed 21 cases (5 PASS, 16 FAIL); a targeted follow-up executed three additional cases (1 PASS, 2 FAIL), skipping the previous 21. There is no overlap in the 24-case total. See [unique-test-summary.json](unique-test-summary.json), [initial results](requirement-results.json) and [follow-up results](requirement-delta-results.json).

Scope: embedded PGlite executing application SQL, synthetic authentication, mocked Storage, actual PNG upload validation and React server rendering. These are not real browser, native PostgreSQL/Supabase, live Storage/Auth or physical-device tests. The tests assert required safe outcomes; their failures reproduce defects and are not passing requirements. Earlier broad suites were not repeated merely to reproduce their counts.

## Findings

### A3-01 — HIGH: patch and source ownership are not conforming

Locations: `deliveries/FINISH-A1/r2/source.patch`; `source/src/contracts/content.ts`; `source/tests/unit/completion-authoring-blocks.test.ts`.

Trigger: check the delivered patch against the declared base and compare all replacement paths to the accepted platform allowlist. Expected: an applicable UTF-8 patch and only allocated paths, with `content.ts` unchanged and the new unit suite at `tests/unit/platform/completion-authoring-blocks.test.ts`. Observed: the patch is rejected, the frozen contract is changed and the suite uses the wrong path. Ten allocated files have no replacements; their absence alone is not a defect, but the missing consumer corrections are examined below.

Evidence: `identity-verification.json`, `identity-command-receipts.json`, `diagnostic-assembly-hashes.json`. Gemini #1 must regenerate the patch from its fresh correction, move DTOs to the allocated preview module, use the correct unit path and prove clean application/replacement agreement.

### A3-02 — HIGH: publication commits without the required review

Locations: `source/src/server/content/publish.ts:219`, `:259`, `:448`; `source/src/app/api/admin/publish/route.ts:52`.

Trigger: call the actual durable publish service or owner-authorized API with a valid publication request but no review. Expected: reject before publication/history/audit mutations. Observed: the service commits revision 2 and the API returns 200. A follow-up supplies `review.expectedPublicationRevision=7` while `expectedRevision=1`; the API still returns 200 and writes publication history/audit state. The candidate makes review optional and does not enforce the exact complete DTO and revision agreement at both boundaries.

Evidence: the first two failures in `requirement-results.json`, the revision-disagreement failure in `requirement-delta-results.json`, and the corresponding records in `observations.json` / `observations-delta.json`. Gemini #1 must require and validate the complete accepted review at the API and service boundary, then update the actual callers and UI.

### A3-03 — HIGH: review identity does not bind durable state and the full approved media object

Locations: `source/src/server/content/preview.ts:97`, `:118`, `:122`, `:271`, `:289`; `source/src/server/content/publish.ts:448`.

Trigger: create durable publication revision 7 while the process-local baseline remains at 1; execute review; mutate valid approved media under its existing ID after review; then publish using that review. Expected: one consistent ordered transaction, the accepted canonical preimage/full media identity, and stale review rejection with no partial writes.

Observed:

- Review reports revision 1 rather than durable revision 7 and executes zero review transactions.
- The returned DTO lacks the exact accepted identity/check/site/draft-vector shape and synthesizes an asset-manifest revision.
- Valid approved same-ID changes to object key, provenance, creation time and approval-audit identity all publish instead of returning 409.
- Actual Storage bytes are not read and verified as required during review. A follow-up changes the stored bytes without changing the recorded row; publication still commits and performs no Storage reads.
- Equivalent JSON objects with different property insertion order produce different review hashes.

Evidence: `requirement-results.json`, `requirement-delta-results.json`, `observations.json`, `observations-delta.json`. The fixtures exercise valid approved mappings; the result is not merely a test of rejecting an invalid row. A separate post-review draft-mutation test **passes**, returning the expected conflict without changing publication/history/audit counts. That narrower success does not establish complete media/review binding.

Gemini #1 must implement the accepted transaction/lock order, durable publication identity, exact canonical preimage and complete server-derived media/approval/byte vector, then rederive and compare before writes.

### A3-04 — HIGH: image validation and actual picker/save consumers remain disconnected

Locations: `source/src/app/api/admin/preview/media/[id]/route.ts:81`; `source/src/features/admin/project-editor.tsx:53`; retained base `app/src/app/api/admin/media/route.ts` and `app/src/app/api/admin/projects/route.ts` in the diagnostic assembly.

Trigger: request an approved private image whose Storage bytes were altered, save a draft referencing missing/unapproved media, and consume the approved-media list in the editor. Expected: reject invalid bytes/media with 422, preserve the draft/buffer, and populate the picker from the actual approved response.

Observed: the image proxy streams tampered bytes with 200; invalid-media draft save returns 201; the actual media-list response exposes `assets` while the editor only accepts `data.media`. The real PNG fixture itself passes upload validation, so invalid fixture setup does not explain these failures.

Evidence: required-outcome tests and `observations.json`, plus the named consumer source. Buffer/focus/image-edit/save/reopen behavior has no current executed browser proof. Gemini #1 must complete server validation and the real list/picker/editor/proxy path together.

### A3-05 — HIGH: private review, authoring and rollback outcomes remain incomplete

Locations: `source/src/features/admin/project-editor.tsx:164`; `source/src/features/portfolio/case-study.tsx:31`; `source/src/app/api/admin/preview/route.ts`; retained base `app/src/app/api/admin/rollback/route.ts`; `source/src/server/content/preview.ts:10`.

Trigger: privately select a genuine CandidateX draft by `projectId`, omit rollback concurrency/reason fields, render a private-proxy URL outside the exact permitted draft-only form, or create new evidence in the editor.

Observed: the private preview response omits the requested CandidateX sentinel; rollback with missing required identity/reason returns 200; the published renderer accepts a private-proxy path with traversal/query suffix because it uses a broad `startsWith` rule; new evidence defaults to `verified`. The renderer observation is a contract-boundary failure, not a claim that anonymous Storage access or a network exploit was demonstrated. The tested anonymous/nonowner/AAL1/revoked denial subset passed.

Targeted ESLint execution also fails on unused `ProjectId` at `preview.ts:10:8` under `--max-warnings=0`. Missing browser/build/negative-matrix proof remains a separate limitation; source labels and test counts do not establish the full editing workflow or draft/cache isolation.

Gemini #1 must finish the allocated editor/private-preview/rollback/header/publication-visibility work, default new evidence truthfully, correct lint and return actual workflow and leakage evidence.

## Complete current correction matrix

Each result applies only to the named scope. Required unexecuted proof remains open.

| FINISH-04 clause | Requirement | Result | Evidence / limit |
| --- | --- | --- | --- |
| 1 | Exact raw input/output identities | PASS | 22 maker outputs and 54 contract outputs match |
| 1 | Applicable UTF-8 patch and applied/replacement equivalence | FAIL / NOT RUN | Exact-base patch rejects; diagnostic replacements match but do not repair applicability |
| 2 | Frozen content contract, exact DTO location/shape and unit-test path | FAIL | Excluded contract edited, suite mislocated, DTO required-outcome check fails |
| 3 | Complete required review at API/service and matching expected revision | FAIL | Omitted/disagreed review commits instead of rejecting |
| 4 | Durable consistent review, ordered locks and canonical hash | FAIL | Local revision 1 vs durable 7, zero review transactions, key-order-sensitive hash |
| 5 | Complete media object/approval identity and actual Storage verification | FAIL | Four valid same-ID mutations publish; review/publish do not verify altered stored bytes |
| 5 | Changed draft review conflicts without partial publication writes | PASS | Follow-up test preserves snapshot/history/audit counts |
| 6 | Real approved picker/list/save/proxy contract | FAIL | `assets`/`media` mismatch, invalid image save 201, tampered proxy 200 |
| 6–7 | Four block types, ordering, focus, failed-buffer preservation, save/reopen/cancel | NOT RUN | Existing schema/component source is not complete browser workflow proof |
| 7 | Truthful default evidence and executed exact review DTO/checks | FAIL | New evidence defaults verified; exact DTO check fails |
| 8 | Private CandidateX selection, rollback identity/reason and safe draft-only proxy URLs | FAIL | Targeted handler/server-render diagnostics fail |
| 8 | Durable commit versus observed cache visibility, all private headers | NOT RUN | Complete affected consumer/browser/cache matrix not established by these diagnostics |
| 9 | Nonowner/AAL1/revoked route-denial subset and anonymous preview | PASS | Synthetic-auth boundary tests only; no real provider/session claim |
| 9 | Targeted source lint | FAIL | Unused ProjectId, exit 1 |
| 9 | Independent required-outcome diagnostics | FAIL | 24 unique cases: 6 PASS / 18 FAIL |
| 9 | Complete authoring/picker/preview/publish/rollback browser evidence | NOT RUN | No actual browser run in this re-audit; required maker proof absent |
| 9 | Production build/typecheck, full leakage/cache matrix and native multi-process races | NOT RUN | Prior narrower reports preserved; no unchanged broad rerun or native-provider proof inferred |
| Outside local scope | Physical device, hosted service and G7 production checks | NOT RUN | No deployment/provider mutations or physical sessions performed |

## Receipts and handoff

[Execution receipts](execution-receipts.json) preserve setup failures as well as actual test/lint outcomes. The initial standalone runner/config and filename attempts did not execute behavior and are not included in the test count. The successful diagnostic runner executed from the isolated candidate with retained pinned dependencies. [Tool versions](tool-versions.json), [input hashes](input-hashes.json), raw JSON results, observations and the initial/final diagnostic source make the actual scope reviewable.

Use the saved diagnostics only in a fresh correction/audit assembly. Do not rerun generators over this archived evidence root or modify the maker to obtain a passing audit. The current assigned maker remains Gemini #1 under `01-GEMINI1-A1-R3.md`; it must return a fresh `deliveries/FINISH-A1/r3/` candidate, followed by independent complete-scope/delta review and a separate Parent ruling. No A2 or canonical integration prerequisite is satisfied by this report.
