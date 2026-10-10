# FINISH-00-R2 architecture delta advice, revision 3

**Advice: PASS for the current bounded design correction.** PLAT-R2-01's reviewed-media identity gap is addressed by the current contract. This actual Astra advice is scoped to architectural feasibility and identity/ownership consistency; independent contract delta audit and Parent ruling remain separate. No received maker implementation is reviewed or accepted here.

Model: **gpt-6-astra (Astra)**, actual Parent agent invocation assignment, not independent serving-infrastructure inspection. Date: 2026-10-10. Own output: `deliveries/completion-audits/FINISH-00-R2/architecture/r3/`. Prior architecture r1/r2 and the independent REWORK report remain preserved. The earlier limited architecture PASS did not override the subsequently established independent finding.

## Exact identity

Reviewed output manifest SHA-256: **8038db147824b0a31de1028c330383352177020b2247dd627d1674d6dc14c6af**. Input manifest SHA-256: **516295623cb233c88d358729db0ef7ee4867bf070b61c0d37e33ed59d4883a76**. Prior reviewed output `65126f6a196449f0167263574b84bbc8aaa439760f17323e2cca447f1f74056d` is preserved in the independent `20261010T120420Z/candidate-snapshot/` and remains the identity for the historical PLAT-R2-01 finding.

Pinned source base: `f62a43c5e71c00dcb89e28275ea81d842167db80`. Observed HEAD: `9fce876096ed4948ec383c7a4ccc745290c3e2d5`. App tree remains `42ea29ec235225046a75959eb19eb386ac2f821d`. No source, asset, contract or earlier evidence was edited; no commit was made.

## Media correction assessment

**PLAT-R2-01 CLOSED at design level.** The independent finding correctly demonstrated that unchanged project/image mediaId could hash identically after a different valid media mapping. The corrected `02-platform-schema-recovery.md` now supplies the missing observable identity and specifies how it is consumed:

- `ReviewIdentity.media` is server-derived and includes each referenced image plus A2's referenced resume, deduplicated and deterministically ordered. Its entries bind actual media row ID/object key/hash/MIME/size/dimensions/provenance/approval state/creation time and the defined approval audit identity. The hash preimage now includes this vector. JSON object order is canonicalized while array order and nulls remain meaningful.
- The actual immutable migration contains all nine named media columns. Actual `audit_events` supplies id, action, entity_type/entity_id and created_at. The existing approval service updates the media row and inserts `media_approved` in one transaction. The proposed audit lookup needs no fictional approved_at/approved_by column or historical migration change. It binds the defined latest audit record, not an invented total history of direct SQL edits; the contract explicitly limits that claim.
- Review and publish acquire the same ordered publication/draft locks, with A2's site lock and ordered media FOR SHARE locks. Publish rederives the vector and compares reviewed revision/content/media identity before mutations. Therefore another valid row mapping produces stale-review409 even when its mediaId and draft revision remain unchanged. Media invalidity with a current matching identity is separately 422. Existing service-mediated approval updates conflict with the shared media row lock and retain transactional event insertion.
- Bounded Storage byte/hash/type verification runs at both review and publish. A row that remains identical cannot authorize different object bytes. Missing or unavailable Storage yields failed review/error. This is a required maker check, not a claim that this documentation review executed Storage transactions or guarantees storage immutability forever.
- Accepted missing placeholders have explicit unresolved identity; unrelated missing or pending/rejected media cannot produce canPublish=true. The hash retains the full ordered project/site blocks, so the placeholder entry does not erase their content identity. Strict DTOs belong to the already allocated preview service; API and direct service callers must supply complete review identity, with expected publication revisions agreeing.
- The correction assigns vector/byte checking to the existing allocated manifest service and names the regression for a second valid approved mapping under one ID, approval-event advancement, equivalent JSON ordering, missing review, Storage failure, placeholder behavior and no partial publication/history/audit writes. A2 repeats the case for its resume. These future behavior checks are executable obligations; none has passed by architectural prose alone.

**PLAT-R2-C01 clarification addressed.** Private cache headers now explicitly cover allocated project/preview/publish/rollback/media-list and A2 site/resume handlers. They do not silently expand permission to unallocated media-detail/approval handlers. No additional production path is needed for the selected correction.

## Other delta and retained boundaries

The explicit fixture/type-test section exception in `04` matches the previously allocated I1 composition: independent A2 and runtime sections may coexist in separate delivery roots, while production ownership stays sequential. Received-candidate amendments in `00/05/06` preserve occupied roots and require fresh continuation/correction packets and independent acceptance. They do not retroactively accept deliveries. This review read that governance change but did not inspect those new implementations or adopt their reported audit results.

Runtime and asset decision documents are semantically unchanged from architecture/r2: AR2-01 remains closed, the door has one owner, optional adoption is atomic, one visible room owns base props, and pause/quality disposal rules retain their allocated owners. The isolated assembly DAG and narrow I1 site seam remain intact.

Portable input binding now retains observed raw snapshots and separately verifies each pinned Git blob. The validator's EOL reconstruction is accepted only when it reproduces the previously recorded raw SHA-256, and is labeled as reconstruction. That preserves observed-byte provenance without treating a different Git byte representation as the same raw file. Validation here ran without `--bind`.

## Actual checks and limits

PASS: direct reading of the independent PLAT-R2-01 report; complete relevant semantic delta against its preserved candidate; actual media schema/audit schema/approval and manifest consumers; independently recomputed **146 input + 54 output raw identities**, zero mismatches; independently checked **146 base Git blob identities**, zero mismatches. Read-only packet validator exited 0: **200 raw hash checks, 146 blob checks, 134 allowlist checks, 24 local links, 3 migrations, 16 public tables**, no errors. Final manifest identities were rechecked before writing this advice.

NOT RUN: maker implementation tests, DB transactions/native races, actual Storage byte operations, application suites/builds, browser/render/export/device tests, provider deployment and recovery. No production behavior, security gate, art quality, maker acceptance or G7 completion follows from this PASS. The independent auditor must verify the same final manifest before Parent decides contract acceptance.
