# LOCAL-CORRECTIONS-03 cross-lane architecture advice

Date: 2026-10-09. Executor: local Codex architecture adviser, assigned read-only cross-lane advice. This document is advice, not independent final audit, implementation, acceptance, external-account execution, or G7 evidence. Parent retains all assignment and acceptance authority.

**Recommendation: proceed with a new forward schema migration and a separately versioned art revision.** Preserve accepted R6/RC6-R1, historical migrations, existing public model bytes and historical source deliveries. Release remains v1.0.0-rc6; R7 is pending and RC6-R2 requires independent combined-source review. No additional owner permission is needed for these explicitly requested corrections.

## Evidence actually inspected

Read START_HERE, AGENTS and applicable generated app/AGENTS, delegation opening, LOCAL-CORRECTIONS-01/02/03 and the full owner attachment. Read actual current auth migrations, media manifest/upload code, publication transaction code, media route, auth clients, asset contract/public manifest, loader, SceneIntegrator, cache policy/Next config, release policy/composition/library/validator, environment and resident/fixture builders, and RC6-R1 decision. This is focused architectural source inspection, not a claim of a full independent audit.

The accepted decision records the owner's supplied R6 source/tree/bundle/manifest identities. Actual full-room, props and fixture GLB hashes match the current policy. This adviser did not rehash the entire accepted historical evidence tree; its overall preservation remains Parent/auditor verification.

The new proposed delivery/public roots and R7 root were absent when inspected. Mistyped exploratory reads for `2026-10-09-local-corrections-02.md`, `server/storage/provider.ts` and `world/asset-manifest.ts` failed; the real packet is dated October 8, storage operations live in media code, and the public manifest is `app/public/asset-manifest.json`. These were corrected by inspecting actual files.

| Observation | Result | Evidence / limit |
| --- | --- | --- |
| Current auth.uid reads only legacy subject | FAIL, source-confirmed | A3 migration function body |
| Media publication verifies storage object bytes | FAIL, source-confirmed | checkMediaApproved selects only id/approval_status |
| Certificate, painting and clock exported world transforms | FAIL, reproduced | glb-baseline-attempt-02.json |
| Read-only hierarchy probe execution | PASS on attempt 2 | Node v24.19.0; selected GLB JSON node matrices composed using installed Three |
| First probe attempt | FAIL | Import traversed one directory too far; ERR_MODULE_NOT_FOUND; no production mutation |
| New asset/schema implementations | NOT RUN | Maker work is separately assigned |
| Native Supabase/RLS/storage and concurrency verification | NOT RUN | No provider operation executed by this adviser |
| Final visual quality, combined performance, heap/GPU leak absence | UNKNOWN | No rendered scene or measured performance accepted here |

## Schema amendment and deployment compatibility

Assign `app/supabase/migrations/20261009000000_owner_identity_media_integrity.sql`, with release schema identity **20261009000000_schema_v3**. Its timestamp follows the three existing migration files. Keep those three files byte-identical. New helper stand-ins for embedded tests belong in setup; production repair belongs in the forward migration because the defective function has already been installed by historical A3.

Restore JSON-only subject resolution without weakening AAL2 or the authoritative active-owner lookup. Supabase's published auth migration resolves legacy subject and JSON `request.jwt.claims.sub`; the current project omits the latter. Preserve UUID return type, stable semantics, invoker privilege for identity extraction, explicit safe search paths and intended execute grants. Do not replace auth users or introduce an alternative identity store. Prefer a bounded repair with invalid JSON/UUID returning null and malformed/non-object claims producing no owner authorization. Catch only expected parse errors, rather than converting unrelated database failures into success. Ensure the owner predicate cannot combine a legacy subject for one user with JSON AAL2 for another; deny contradictory contexts. If auth.jwt remains capable of throwing on malformed JSON, contain that failure at the owner predicate or repair it consistently in this migration. Both owner predicates and every policy calling auth.uid need examination.

Test JSON-only active owner/AAL2, anon/no claims, nonowner, inactive/revoked owner, AAL1, empty strings, malformed JSON, array/scalar JSON, invalid UUID, and contradictory subject contexts. Clear transaction-local legacy settings in JSON-only cases; absence of a supplied legacy subject is an assertion. Include migration-from-schema-v2 and clean full-order initialization, with historical hashes checked. An embedded PGlite test cannot establish native role ownership, Supabase migration privileges, PostgREST settings or native concurrency. Record those separately as NOT RUN until executed on the actual supported native environment.

Schema v3 should be additive for media metadata and retain existing columns and publication payload shapes. An old application reading the database should continue to read accepted content. Any tightened mutation rule may intentionally reject unsafe legacy writes; test that explicitly instead of claiming unconditional backward compatibility. Applying schema v3 precedes application rollout. Application rollback retains v3; never restore the defective auth.uid as rollback. Do not claim RTO/RPO proof without the live rehearsal.

Release maker must explicitly own updates to `rc6-policy.json`, `validate-release.mjs` and corresponding tests for the fourth migration. Current validator hardcodes only three migrations plus the operational grant-hardening SQL. Require exact ordered migration path/hash inventory in new binding evidence, not a free-standing schema string. Parent updates living setup/migration/recovery/release docs; preserved RC6-R1 docs stay unchanged. Include `harden-publication-grants.sql` ordering and verify none of its denied grants reappear.

## Media integrity and race boundary

Current publish/rollback already run inside a DB transaction and acquire the `yor-publication` advisory transaction lock. Media rows use FOR SHARE, but only approval is checked; approval itself updates a row, and the inspected media route exposes GET, not a DELETE handler. Upload uses service-role storage, `upsert:false`, then inserts a row, and on DB failure removes the object. Existing object identity is a hash/filename key plus a deployment environment bucket, not a persisted bucket binding.

Use the following bounded lifecycle in the backend maker's implementation:

1. Persist exact bucket/key identity for new media, and use a unique never-reused upload key. An additive bucket field can leave legacy rows unverified until an explicit verified binding/backfill is performed; do not invent a bucket at migration time or silently treat an environment switch as the same object. Legacy unbound rows fail publication closed. Private signed access uses the same recorded bucket/key.
2. Read object bytes through a genuinely bounded/cancellable provider operation, verify byte count and SHA-256 against the immutable approval tuple, and check the expected supported content type. Bound retained bytes and overall/per-object duration; existing upload ceiling is 5 MiB. ETag, row hash text, HEAD success and signed URL issuance are insufficient proof of SHA-256. Never expose service credentials or arbitrary external URL fetching.
3. Verify before approval and reverify before publish/rollback. In the publication transaction, hold the publication lock and lock all referenced media rows in stable ID order before verification and snapshot writes. Failure leaves history, published_content, audit publication event and active in-memory/cache snapshot unchanged.
4. Serialize every application approval/rejection/deletion/identity mutation with the same lifecycle lock order. Enforce database-side immutability of bucket/key/hash/bytes/mime for approved or retained referenced media, and protect media needed by current or historical rollback snapshots. A trigger or constrained server mutation path must cover direct authenticated SQL privileges as well as HTTP handlers; a row lock by itself ends at commit. Keep retention explicit and do not add a disposal route merely to demonstrate the rule.
5. Never overwrite approved objects. Retain objects referenced by publication history for the promised rollback horizon. Cleanup may delete only its own newly uploaded, unregistered unique key. Current deterministic key reuse can make cleanup unsafe if a stale existing row references a newly re-created object and the insert then fails; unique keys and exact ownership checks avoid that case.
6. Deletion in object storage is not a participant in the PostgreSQL transaction. RLS cannot restrain a service key: enforce the lifecycle in every application service-role write path, prohibit out-of-band object mutation operationally, and detect loss with actual availability/integrity probes. Provider outages or privileged operator deletion cannot be mathematically prevented by a row lock. Record this boundary honestly; it is not a reason to skip local race corrections.

Required independent reproductions include deleted object, wrong bytes/hash/length, provider timeout or permanently pending read, successful verification, approval withdrawal/delete ordering on both sides of the lock, direct DB identity mutation, late upload cleanup, and rollback failure with no partial publication. Concurrent transaction mocks show intent only; native races require separate native evidence.

Primary references checked: [Supabase auth function migration](https://raw.githubusercontent.com/supabase/auth/master/migrations/20220224000811_update_auth_functions.up.sql) and [Storage access control](https://supabase.com/docs/guides/storage/security/access-control). The latter documents the service-key RLS bypass; the lifecycle design above is architectural advice derived from that boundary and the inspected application.

## Exact art allocation and integration handoff

Recommend new owned root **deliveries/production-environment/revisions/local-corrections-r1/** with `source/environment/`, `source/resident-fixture/`, optional explicitly amended `source/interactions/`, `runtime/`, `manifest.json`, `provenance.json`, and `evidence/`. Candidate asset revision: **world-art-local-corrections-20261009-r1**. Old environment, B4, interaction deliveries and all old app/public/models/*.glb stay unchanged.

Art maker owns this entire new root plus **app/public/models/world-art-local-corrections-20261009-r1/** and the current **app/public/asset-manifest.json**. Copy required authoring scripts/textures into the new root and change output paths before executing them: existing builders create directories and exports at import/run time. Do not run the historical builders against historical roots. Record input script/texture/export hashes and actual local executor. Existing manifest lane text says Gemini; the successor must not claim that external execution.

Use changed model filenames carrying a SHA-256-derived suffix under the new public directory, e.g. `production-room-full.<hash>.glb`. A full-hash filename avoids collision ambiguity. Unchanged files may continue using accepted original URLs and hashes. Logical IDs and schemaVersion 1 stay stable. New bytes are candidate assets, with approval/acceptance status kept honest; do not copy approved:true as evidence of Parent acceptance. If runtime admission requires that flag, Parent must define its narrow provenance meaning separately from source acceptance rather than maker self-approving.

Why both source groups are necessary: SceneIntegrator removes the environment `chair-root`/`chair`/`resident`, discards fixture-static, and retains the chair in **fixture-production.glb**. `deliveries/B4/source/build-resident-production.py` exports that fixture and the resident. Geometry improvements confined to the environment chair vanish during integration. The art packet should explicitly allow improving the copied fixture chair while preserving chair-root/chair-base, eight action clips, authored roots and seated contact. Reexporting an unchanged resident is optional; do not change its bytes merely because the builder emits it. Preserve source provenance and avoid accidentally copying a new resident without recording its changed identity.

The environment builder defines `set_parent_keep_world` but never calls it. Geometry helper functions set an absolute-looking position and then directly assign parent. For these helpers, explicitly maintain world pose on parenting or author a true local transform using inverse(parentWorld) * desiredWorld. Do not apply a blanket fix to intentionally local resident/rig coordinates. Preserve pivot hierarchies and animation bindings; baking away the pivots would repair static appearance while breaking interactions.

Actual full-room and group-b exported values reproduced by the probe:

| Node | Current world XYZ | Intended source world XYZ |
| --- | --- | --- |
| certificate_glass | -4.155, 3.700, 0.600 | -2.075, 1.850, 0.300 |
| painting_canvas | 4.140, 3.200, -0.800 | 2.060, 1.450, -0.400 |
| desk_clock_display | -1.040, 1.620, -2.254 | -0.520, 0.810, -1.114 |

Audit every parented descendant, not only those three: door leaf/handles, painting signature, chair support and other translated/rotated parents. Verify exported matrixWorld and transformed mesh bounds, mounting surfaces, room bounds, entrances as documented exceptions, anchors, click targets and clip samples. Keep full/group/mobile exports mutually consistent and verify exactly one integrated desk/resident/chair. No duplicate-furniture explanation is warranted from current evidence.

Ownership handoff after art output is ready:

| Owner | Exclusive integration paths |
| --- | --- |
| Art maker | New source/runtime/public revision root, public asset manifest, exact candidate asset metrics/provenance; no loader or release policy |
| Runtime maker | AssetLoader and new explicit URL mapping if needed, SceneIntegrator and runtime tests; actual new URLs must be consumed, including optional assets |
| Release maker, by explicit amendment | rc6-policy.json, release-lib.mjs assetFiles(), check-release-composition.mjs, validate-release.mjs, validate-gltf-assets.mjs as needed, associated tests; app/src/security/policy.ts immutable URL list and cache regression tests |
| Parent | Packet, living status/docs, commits, final combined source freeze, assignment coordination and acceptance |

Existing next.config.ts derives immutable headers from frozenModelPaths in security/policy.ts. Add exact versioned paths, preserve old ones, and test their actual response headers. Keep the mutable manifest revalidated/non-immutable. New filename hashes permit repeated pre-acceptance exports without stale cache collisions.

Current release assetFiles() accepts GLBs by hash/bytes only and requires legacy basename URLs. Extend it to verify the exact **URL/path + logical ID + hash + bytes + revision** mapping, distinguishing preserved historical assets from active runtime assets. Do not overwrite the legacy acceptedAssets entries with new hashes. A separate candidate revision list is clearer; if changing structure is unnecessary, use explicit URL entries plus original retained entries and honest candidate terminology. Keep all files in bundle integrity inventory but count only actually loaded active assets in transfer/runtime budgets. Recount triangles, materials and GPU estimates from actual exports; do not copy old metrics. Composition currently discovers literal model URLs, so computed runtime URLs require a checked explicit mapping rather than disappearing from validation.

The existing TypeScript AssetManifestSchema is strict, allows HTTPS URLs only and excludes lane/notice/generatedAt, while the actual public manifest uses same-origin URLs and those extra keys. This is already a mismatch. Do not silently claim it validates the new public manifest. Parent should explicitly assign a bounded canonical-shape/same-origin validation correction or preserve the unused contract and add the required release-side manifest validation with a documented distinction.

Exit evidence must include fresh GLB validation and geometry/clip checks, rendered desktop/narrow/mobile visual comparisons, controls and interaction outcomes, selected-quality fidelity, and combined inclusive render budgets after UI+runtime+art integration. A structurally valid export does not establish visual acceptance. Only the independent reviewer and Parent can close this successor.
