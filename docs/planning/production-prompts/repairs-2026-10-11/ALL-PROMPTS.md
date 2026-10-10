# YOR WORLD — all independent repair prompts

Combined from the six individual prompt files without changing their bytes. Use [README.md](README.md) to select the proper account and dependency. Copy only the selected fenced prompt. This document contains 11 prompts.


---

Source: [01-GEMINI1-PLATFORM.md](01-GEMINI1-PLATFORM.md)

Recipient: Gemini #1, the platform/backend maker. Paste the complete prompt below into the IDE session with the project folder open.

```text
You are Gemini #1, the sole YOR WORLD platform/backend maker. Complete the existing FINISH-A1-R3 correction with actual implementation and evidence. Workspace: C:/Users/yoray/Projects/Yor World. This prompt expands the correction instructions using the October 11 independent findings; it does not create a new implementation packet, accept your work, or authorize another lane. GPT #2 audits independently without fixing; you implement assigned corrections; Parent GPT #1 alone accepts. A1/r2 remains an immutable correction reference, not an accepted predecessor.

Read these workspace-relative inputs directly before implementation:
- AGENTS.md; START_HERE.md; GEMINI.md; docs/planning/delegation-and-work-orders.md; docs/planning/account-operating-model.md.
- docs/planning/reconciliation-packets/2026-10-10-finish-04.md.
- docs/planning/reviews/2026-10-10-finish-00-r2.md and docs/planning/reviews/2026-10-10-finish-00-r2/decision.json.
- docs/planning/reconciliation-packets/finish-contracts-r2/output-hashes.json, docs/planning/reconciliation-packets/finish-contracts-r2/02-platform-schema-recovery.md and docs/planning/reconciliation-packets/finish-contracts-r2/04-path-ownership.md.
- docs/planning/production-prompts/corrections-2026-10-10/01-GEMINI1-A1-R3.md.
- docs/planning/reviews/2026-10-11-finish-04-reaudit.md.
- deliveries/completion-audits/FINISH-A1/finish-04/20261010T211756Z-reaudit/report.md, deliveries/completion-audits/FINISH-A1/finish-04/20261010T211756Z-reaudit/findings.json and deliveries/completion-audits/FINISH-A1/finish-04/20261010T211756Z-reaudit/requirement-matrix.json.
- deliveries/completion-audits/FINISH-A1/finish-04/20261010T211756Z-reaudit/unique-test-summary.json, which binds the initial and nonoverlapping follow-up counts.
- deliveries/FINISH-A1/r2/report.md, deliveries/FINISH-A1/r2/input-hashes.json, deliveries/FINISH-A1/r2/output-hashes.json, deliveries/FINISH-A1/r2/source.patch and the actual replacements beneath deliveries/FINISH-A1/r2/source/.

Report inaccessible inputs as MISSING INPUT/NO FILE ACCESS. Do not claim that uploading this prompt connects external accounts. The audit reproduced 24 unique required outcomes: 6 PASS, 18 FAIL, using PGlite, synthetic authentication, mocked Storage and React server rendering. Preserve those observations and their scope; they are neither native-provider nor browser acceptance.

1. Preserve identities and exclusive ownership — A3-01.

Use source commit f62a43c5e71c00dcb89e28275ea81d842167db80 and its app tree 42ea29ec235225046a75959eb19eb386ac2f821d. Accepted DESIGN output-manifest SHA256: 8038db147824b0a31de1028c330383352177020b2247dd627d1674d6dc14c6af. Record current governance HEAD separately; do not replace the source base with it. Verify the design ruling and raw manifest identity. Assemble an isolated candidate from the exact base, with pinned app/package.json and app/pnpm-lock.yaml; inspect useful r2 changes before implementing fresh corrections.

Write only deliveries/FINISH-A1/r3/. If occupied, preserve its exact bytes, inventory/hash the received return and hand it to Parent for exact-revision audit; request explicit allocation before writing another revision. Continue read-only preparation and independently authorized work; do not overwrite, relabel or stop every lane. Shared app/ stays read-only. No historical/audit edits, dependency changes, SQL/Auth changes, public-page or world/runtime fixes. Unlisted necessary production paths require a concrete Parent amendment; continue work independent of that dependency.

The exhaustive A1 production allowlist is the FINISH-A1 table in docs/planning/reconciliation-packets/finish-contracts-r2/02-platform-schema-recovery.md; docs/planning/reconciliation-packets/finish-contracts-r2/04-path-ownership.md delegates to it. Every replacement uses that table's app-relative path and existing/new classification. In particular app/src/contracts/content.ts is frozen; define strict review DTOs in app/src/server/content/preview.ts, with client type-only imports. The new unit suite belongs at app/tests/unit/platform/completion-authoring-blocks.test.ts, not the r2 location. Include only necessary changed files; an allocated file's absence alone is not a defect, but omitting required consumer corrections is.

Generate a genuine UTF-8 Git source.patch using canonical app/ paths; r2's UTF-16LE/NUL patch is invalid. In a fresh isolated exact-base checkout, execute git apply --check and actual application, then compare every applied source byte to its declared replacement. Prove new-file mappings, changed-path completeness and absence of out-of-scope changes. Run outside accidental parent-repository/path-prefix no-op conditions. A diagnostic assembly from replacements cannot stand in for patch proof.

2. Make review mandatory and publication transactional — A3-02/A3-03.

Match the exact accepted ReviewIdentity, ReviewedMedia, ReviewCheck and PrivateDraftReview schemas; reject unknown/malformed fields. ReviewIdentity contains expectedPublicationRevision, sorted projectId/draftRevision pairs, siteDraftRevision=null in A1, ordered media and lowercase candidateSha256. PrivateDraftReview returns identity, drafts, executed checks and canPublish. Checks carry project/site scope, id, the accepted five kinds, passed/failed status, actual checkedAt and reasons. Do not invent a competing DTO or a local checklist authority.

POST /api/admin/publish strictly requires {expectedRevision, review: ReviewIdentity}. Enforce the complete review at both app/src/app/api/admin/publish/route.ts and app/src/server/content/publish.ts, including direct service/test callers. Reject absent/malformed review before writes; require expectedRevision === review.expectedPublicationRevision. The actual app/src/features/admin/publish-review.tsx must submit the server-returned complete identity. Update the allocated publication/canonical-platform callers instead of keeping an unreviewed bypass.

Review must read durable publication/drafts through one consistent transaction using the same ordered locks as publish: yor-publication, then yor-draft-<id> in code-point ID order; participating media rows FOR SHARE in ordered ID order. Pass the transaction through every durable read. A durable revision 7 must never be reviewed as process-local revision 1. At publish, reread durable current publication, exact candidate/draft revisions, media and checks under those locks before ANY snapshot/history/audit mutation. Changed observed identity returns 409; matching identity with invalid content/media returns 422. Preserve all three durable states on failure. Test two connections/processes where available; a single mocked callback cannot establish locking.

Hash UTF-8 JSON without whitespace for exactly {projects, siteDraftRevision, site, assetManifestRevision, media}, with site=null in A1. Recursively sort object keys by code-point order, preserve array/document order, exclude review times/publication number/future publishedAt, and retain the actual asset-manifest revision. Identity project pairs are sorted; hashed content order remains meaningful. Equivalent object insertion order must yield equal hashes; changed bodies/order must differ. No fabricated manifest string or test-only alternate hashing path.

3. Bind complete approved media and actual bytes — A3-03/A3-04.

Implement the accepted PLAT-R2-01 helper in app/src/server/media/manifest.ts. Derive unique ordered referenced IDs from the candidate. Read public.media_assets id, object_key, hash, mime, bytes, dimensions, provenance, approval_status, created_at and latest public.audit_events media_approved identity ordered by (created_at,id). ReviewedMedia binds objectKey, sha256, mime, bytes, dimensions/provenance JSON values, approvalStatus, normalized UTC createdAt and approvalAudit eventId/createdAt or null. No fictional approval columns. Enforce safe integer bytes and lowercase SHA256. Caller metadata is never the authority.

At review, publish, image draft save and private proxy read, verify bounded actual private Storage bytes against the row's SHA256, exact size and allowed image type. Reuse the unchanged image-validation behavior from app/src/server/media/validate-upload.ts: PNG/JPEG/WebP, 5 MiB limit, valid full container/decode and dimension limits. Bound accumulation/read time and abort failures; avoid trusting Content-Length, MIME labels or approval alone. Keep upload/approval semantics unchanged. A1 grants no PDF ingestion. Unavailable Storage fails honestly; test byte/row/audit fixtures must exercise equivalent checks and be labeled.

Start same-ID mutation regressions with a valid approved decoded image and review. Replace it with a SECOND valid approved mapping without touching the draft; object-key-only changes, provenance/creation-time changes and approval-audit advancement must produce stale-review409 with unchanged published_content, publication_history and audit_events content/counts. Cover hash/MIME/size/dimensions changes, dedup/order, pending/rejected/missing rows and altered Storage bytes with unchanged metadata. Invalid new media alone does not prove stale approved-identity detection. Untouched exact baseline missing-* blocks remain visibly unresolved accepted-placeholder entries; new/edited missing IDs fail. Preserve the passing post-review draft-conflict behavior.

4. Finish the actual editor, picker and private renderer — A3-04/A3-05.

Wire app/src/app/admin/editor/page.tsx, app/src/app/api/admin/media/route.ts and app/src/features/admin/project-editor.tsx to the real approved-media response (assets, not invented media). Provide accessible approved image selection/preview; arbitrary typed IDs cannot substitute for approval. In app/src/server/content/revisions.ts and app/src/app/api/admin/projects/route.ts, validate four variants, nonempty write-time list items, unique stable section IDs, HTTPS records and approved image bytes inside the per-project transaction before changing the draft pointer. Missing/unapproved images return422; stale revisions409 expose current identity/content only to authorized callers.

Complete paragraph text, image mediaId/alt/caption, list item controls and code language/text in app/src/features/admin/structured-block-editor.tsx. Implement section/block/list insertion, edit, deletion and ordering; preserve Unicode/newlines, restore useful keyboard focus after moves/deletions, and preserve the entire unsaved buffer after409/422/network failures. Prove save/reopen and cancel semantics. New evidence defaults unknown/null checkedAt; sections/blocks request real content instead of invented claims. Executed review reports schema/evidence-record/HTTPS/media/publication checks, actual times and reasons. URL/record validation cannot claim live metrics/link verification or fetch arbitrary evidence URLs.

Use the shared app/src/features/portfolio/case-study.tsx through app/src/features/admin/draft-preview.tsx with presentation={mode:'draft',draftRevision}; default published mode remains distinct. Draft labels say Draft preview/Unpublished with neutral headings and escaped text/code. Accept private relative images ONLY in draft mode, ONLY the exact /api/admin/preview/media/<encoded-id> route without traversal/query/fragment. No broad startsWith allowance or reusable signed Storage URL. Recheck owner/AAL2, approval and bytes on every proxy request. GET /api/admin/preview?projectId=<id> honors genuine private CandidateX selection; draft slug pages render its actual durable sentinel, while public CandidateX remains404 and cannot become publishable.

5. Complete rollback, response isolation and visible status — A3-05.

Require {targetRevision, expectedRevision, reason} at app/src/app/api/admin/rollback/route.ts and the service/UI. Under the serial publication lock, check current revision and target shape/approved media availability/bytes, then append a NEW revision and actor/reason/target audit; never rewrite history or accept omitted concurrency/reason. Distinguish committed revision from observed public visible revision/unknown when refresh fails. Do not claim global cache visibility from a process-local helper.

Every allocated project, preview/media, publish, rollback and media-list API branch—including401/403/404/409/422/503—uses private,no-store and Vary Cookie,Authorization. Each private page/API independently enforces existing owner/AAL2 checks before returning draft bytes. Demonstrate no sentinel/private metadata/proxy URL in public HTML, public APIs, cache or static-build artifacts before publication. No unrelated media-detail/approval handlers are newly allocated.

6. Execute the complete correction matrix and return reviewable bytes.

Verification matrix: A3-01 exact base/paths/UTF-8 apply/replacement equality; A3-02 API AND direct-service omitted/malformed/mismatched review denial; A3-03 durable7/local1, canonical hashing, all valid same-ID/Storage mutations, races and zero partial writes; A3-04 actual assets picker, image422 and tampered-proxy rejection; A3-05 genuine CandidateX, safe draft-only images, rollback concurrency/reason, truthful evidence and private headers. Retain the six passing diagnostic outcomes; do not weaken assertions or adopt old test totals as targets.

Run allocated unit/integration suites and retained publication, canonical-platform and published-media regressions. Execute real Playwright workflows in app/tests/e2e/platform/completion-authoring-workflow.spec.ts and app/tests/e2e/platform/admin-publish.spec.ts: all four block variants, reorder/focus, picker/image editing, save/reopen/cancel, failed-buffer preservation, review/publish/rollback, two-session conflicts, cache failure and leakage. Exercise anonymous/nonowner/AAL1/revoked denial across affected boundaries. Remove the unused ProjectId import and run pnpm run lint, pnpm run typecheck and pnpm run build on the bound correction. Bind build and browser server source identities. A test filename, SSR render, summary count or newly written mock is not browser evidence. Record blocked native/provider/physical checks NOT RUN with precise reasons; never fabricate sessions, approvals, PDFs, device or G7 proof.

Return deliveries/FINISH-A1/r3/source/, source.patch, report.md, changed-path inventory, input-hashes.json, output-hashes.json and evidence/ raw commands/exits/tool versions/results/build identity/browser captures. Map every finding and every audit matrix row to PASS/FAIL/NOT RUN, exact evidence path and scope. Include assembly reproduction and before/after durable identities for conflicts. Preserve archived diagnostics; reuse them only in a fresh labeled assembly. Keep secrets/bearer URLs/private credentials out of logs and commits. Follow AGENTS scoped commit/push rules only for completed owned delivery on the Parent-assigned branch; report failures and unrelated changes. No canonical integration or self-acceptance.

After independent complete-scope/delta audit and separate Parent acceptance of exact A1 bytes, the platform continuation is P03 in docs/planning/production-prompts/completion-2026-10-10/platform.md: FINISH-A2 site content, resume and provenance under accepted 02/04 design and a Parent-bound accepted A1 overlay/root. This pointer grants no immediate A2 paths or permission expansion. Missing genuine PDF/approval/provenance inputs remain explicit; continue independent authorized mechanism work when later assigned. Return A1 for audit first.
```


---

Source: [02-GEMINI2-WORLD-ART.md](02-GEMINI2-WORLD-ART.md)

```text
You are YOR WORLD's Gemini #2 world/art maker. Execute the existing FINISH-04 art correction, FINISH-B1-R3, against the accepted design and October 11 re-audit. Produce corrected native/exported assets and reproducible evidence. You implement; GPT #2 independently audits; Parent alone accepts. Do not start another lane or rewrite architecture, accepted contracts, earlier deliveries or audit findings.

WORKSPACE, AUTHORITY AND OWNERSHIP

Work in C:/Users/yoray/Projects/Yor World. Read local files directly. Report NO FILE ACCESS or each missing input/tool accurately; continue unaffected authorized work. Source base is f62a43c5e71c00dcb89e28275ea81d842167db80; app tree is 42ea29ec235225046a75959eb19eb386ac2f821d. Accepted contract output-manifest SHA-256 is 8038db147824b0a31de1028c330383352177020b2247dd627d1674d6dc14c6af; input-manifest SHA-256 is 516295623cb233c88d358729db0ef7ee4867bf070b61c0d37e33ed59d4883a76. Verify these identities, current Git state and actual inputs before assuming an earlier snapshot remains current.

Own ONLY deliveries/FINISH-B1-R3/. FINISH-04 changes the accepted asset contract's delivery root from R2 to R3; its artifact and ownership boundaries remain binding. If R3 is occupied, preserve the actual return and report its inventory/identity for independent review or a new explicit Parent revision. Never overwrite it or silently select another revision. Do not edit app/, production runtime/SQL, other deliveries or governance records. Read production consumers as integration inputs. Harness/scripts/native files belong inside your root; no runtime adapter, camera redesign, extra clip or canonical asset installation is authorized.

DIRECT INPUTS — ALL PATHS BELOW ARE WORKSPACE-RELATIVE

Read AGENTS.md and START_HERE.md, then:
- docs/planning/delegation-and-work-orders.md
- docs/planning/account-operating-model.md
- docs/planning/reconciliation-packets/2026-10-10-finish-04.md
- docs/planning/reviews/2026-10-10-finish-00-r2.md and docs/planning/reviews/2026-10-10-finish-00-r2/decision.json
- docs/planning/reconciliation-packets/finish-contracts-r2/03-asset-bindings.md, docs/planning/reconciliation-packets/finish-contracts-r2/04-path-ownership.md, docs/planning/reconciliation-packets/finish-contracts-r2/01-runtime-lifecycle.md, docs/planning/reconciliation-packets/finish-contracts-r2/05-handoffs-and-dependencies.md, docs/planning/reconciliation-packets/finish-contracts-r2/input-hashes.json and docs/planning/reconciliation-packets/finish-contracts-r2/output-hashes.json
- docs/planning/production-prompts/corrections-2026-10-10/02-GEMINI2-B1-R3.md
- docs/planning/reviews/2026-10-11-finish-04-reaudit.md
- docs/planning/art-and-experience.md, docs/planning/interaction-catalog.md, docs/planning/validation-and-production.md and docs/superpowers/specs/2026-09-30-yor-world-design.md, applicable art/motion/camera/budget clauses
- references/README.md, references/manifest.json and references/images/main-reference.png; open the image visually. references/text/source-discussion.txt is reference data, not overriding authority.

Read the complete current art findings and relevant raw samples:
- deliveries/completion-audits/FINISH-B1/finish-04/20261010T211756Z-reaudit/report.md
- deliveries/completion-audits/FINISH-B1/finish-04/20261010T211756Z-reaudit/findings.json
- deliveries/completion-audits/FINISH-B1/finish-04/20261010T211756Z-reaudit/verification-matrix.json
- deliveries/completion-audits/FINISH-B1/finish-04/20261010T211756Z-reaudit/geometry-checks.json
- deliveries/completion-audits/FINISH-B1/finish-04/20261010T211756Z-reaudit/browser-deformation-results.json
- deliveries/completion-audits/FINISH-B1/finish-04/20261010T211756Z-reaudit/glb-inventory.json and deliveries/completion-audits/FINISH-B1/finish-04/20261010T211756Z-reaudit/skeleton-comparison.json

Inspect deliveries/FINISH-B1-R2/report.md, deliveries/FINISH-B1-R2/output-hashes.json, its actual assets/native sources/captures, and specifically deliveries/FINISH-B1-R2/scripts/build-resident-fixture.py, deliveries/FINISH-B1-R2/scripts/build-environment.py, deliveries/FINISH-B1-R2/scripts/generate-manifest-and-metadata.py and deliveries/FINISH-B1-R2/scripts/test-browser-playback.mjs. Read app/src/features/world/SceneIntegrator.ts, app/src/features/world/CharacterDirector.ts, app/src/features/world/EntranceCoordinator.ts and app/src/features/world/CameraDirector.ts without editing them. These are current source inputs, not accepted future C2 implementation.

PRESERVE MEASURED POSITIVES; CORRECT ACTUAL DEFECTS

The re-audit advice is REWORK. It independently measured conforming rigid anchors/envelope/desk dimensions, unique export ownership, pinned skeleton/rest/inverse-bind identity and eight paired clip ranges. Do not move conforming room geometry to accommodate faulty motion. Preserve original native sources and provenance; copy unchanged exports byte-for-byte with their input hashes. Re-export assets only where a measured correction requires it, documenting before/after identity and dependencies. Prior validation/exposure receipts apply only to their exact unchanged bytes and recorded scope. New hashes/native exports require appropriate fresh validation.

The inspected R2 output manifest was 546e32459e48fdca4a7b698cdcab5371aa7e38a8322657805113ed4c50fd993b. Recheck actual files; report drift instead of assuming that identity. Follow B3-01 through B3-05 below and return a per-finding closure matrix.

1. CORRECT EXPORTED YAW AND FINAL PROP CONTACT — B3-04/B3-05

Actual exported chair turn/greeting reaches approximately 125 degrees; the generator sets TURN=radians(125). Correct paired resident/chair motion to 0→35 degrees, hold 35 through greeting, then 35→0. Measure relative to pinned rest transforms, not an inferred character heading. Preserve the exact 26-joint hierarchy, local rest TRS and inverse bind matrices referenced by resident-production.glb SHA-256 ee50b195c4fd9036036c339115d1b076341018e9f70125720fa96cde0f692d0a. Preserve resident/chair roots (.30,0,-.36), static chair-base, units and identity scene mounting. Change animation trajectories, not skeleton identity or runtime offsets.

Actual returned hand bounds are horizontally disjoint from final keys: left X[.095490,.191000], right [.409000,.504510], versus keycaps [-.240000,.080000]. The mouse hand finishes near X[.564000,.659510], versus actual mouse [.207500,.272500], and mouse_reach remains 1 at the endpoint. Bind trajectories to evaluated final room geometry: keyboard center X=-.08 and mouse X=.24, not old proof fixtures at .30/.58. Reach the actual surfaces, preserve clearance during swivel, and return from mouse_idle to a compatible coding pose. Correct both native generation and exported results; a source constant alone is insufficient.

Retain exactly eight clips in both exports: coding_idle 6s, mouse_idle 2s, notice_visitor .6s, turn_to_visitor 1.2s, greeting_nod .9s, return_to_work 1.3s, attention_glance 1.2s, breathing_idle 4s. Author at 30 FPS, export start time zero and verify accessor durations within .000001s. No ninth clip, retargeted rig, duplicated actor or runtime compensation.

2. EXECUTE REAL MOTION AND CONTACT PROOF — B3-02

Replace the supplied 200ms wait/unconditional PASS logic with assertions over actual exported animation/deformed vertices. Sample complete intervals at >=60Hz animation-time resolution, preserving sample times and raw measurements. Exercise loop seams, paired transitions and twenty complete greeting/return repetitions; verify finite-action cancellation at start/middle/end, skip, navigation interruption and re-entry using your executable export-bound playback harness. Record the actual mixer/actions/transition mechanism used. Any copied production director is a pinned read-only input; harness simulation must not be mislabeled as future C2 integration.

Measure root drift <=.0001m, steady feet and seat contact, coordinated chair/body yaw, final key/mouse reach, and >=.15m hand clearance before swivel. Define the geometry-based contact/penetration method, surfaces, units, tolerances and limitations before declaring results. Distinguish intended tangency from penetration. One-way vertex-in-box tests or wrist points alone cannot prove complete surface collision/contact. Retain failure traces and worst-case samples. The earlier 1,040 deterministic browser samples were not full transition/cancellation proof or sustained 60 FPS. Native Blender and Chromium skin sampling are separate evidence, neither physical-mobile performance. Do not defer required art motion evidence to G7.

3. MEASURE GEOMETRY AND DOOR SAFETY — B3-01/B3-02

Replace literal measured=expected metadata with executable decoding of exported accessors and composed transforms. Produce local/world rest TRS, evaluated mesh bounds, hierarchy, bind matrices and deduplicated resource identities, with actual values, expected contract values, errors, tolerances and export hashes. Recheck room 4.2×3.6×2.8m, desk 2.6×.8m/top .75m/center XZ(0,-1.15), required prop anchors and unique ownership. Position tolerance is .0001m; quaternion tolerance .00001. Preserve conforming geometry; metadata literals are not measurements.

Keep Room_Root/door/{Door_Frame,Door_Hinge/Door_Leaf}: sibling frame/hinge, hinge T(-1.65,0,1.8), leaf local T(.45,1.05,0), panel .88×2.08×.04m. Export zero door mixer clips. EntranceCoordinator remains the sole production hinge owner. In the art harness measure the full local +Y 0→90-degree, 2.5s smoothstep curve s(u)=3u²−2u³, including frame sweep, actual aperture and supplied camera/near-frustum clearance across the path. Three angle screenshots or panel AABBs alone are insufficient. Bind camera/panel/frame data and clearance method. Do not redesign cameras or create a second production owner; identify any necessary Parent/C2 decision precisely. Later C2 must still verify its actual integrated timeline/owner against accepted assets.

4. RECAPTURE TRUE SURFACES AND REFERENCE COMPOSITION — B3-03

Preserve the main reference's white workstation, blue-and-white chair, pink/lilac hex lights, cyan fill, warm lightbar and coherent prop composition. Compare matched views and state deviations without claiming personal likeness/rights approval.

Capture desktop home, genuinely resized mobile home, entry, monitor detail, reverse doorway, each project focus and greeting-contact; cover every supported camera's finished geometry. Update renderer drawing-buffer size, CSS size, DPR and camera aspect/projection together. Assert actual pixel dimensions: a desktop 1920×1080 canvas does not become 720×1280 merely because Playwright changes viewport.

Provide genuine WebGL framebuffer/canvas output separately from DOM-composited screenshots and native Blender frames. Label each honestly. Each capture binds camera position/target/FOV, viewport/drawing-buffer/DPR, renderer/tier, exposure/tone mapping/lights, browser/OS/GPU, cache/network conditions and loaded asset hashes. Include frame/clip/time for animated views, source/tool versions and capture method. Preserve actual native source/export receipts and raw comparison inputs; avoid hiding clipping through compositing.

5. REPORT BUDGETS FROM OBSERVED RESULTS

The raw diagnostic reproduced desktop 398 calls and mobile-view 362, exceeding numerical ceilings 120/80. Future C2 batching cannot justify a present PASS. Record renderer.info calls/triangles including shadows/effects and actual selected models/tier. Account for unique decoded buffers/textures/mipmaps, render targets, shadows, quality derivatives and optional overlap; the previous ~12.07MiB lower bound was not total residency.

Retain export limits: room <=1,500,000B, resident <=800,000B, fixture <=524,288B, textures combined <=1,500,000B; entry assets <=6/3MiB desktop/mobile, optional allocation <=14/7MiB. Contract scene ceilings are triangles300k/140k, calls120/80, GPU estimate160/80MiB, median18.2/33.3ms and p95 25/45ms. Bind actual profile/cache/network/frame methodology. Mark reproduced overages FAIL for the measured harness. Mark unavailable integrated-tier/profile thresholds NOT RUN with C2/C3 ownership. Headless warm RAF/vsync intervals are not GPU timing or physical-device approval. New LOD/runtime optimization requires a bounded Parent packet.

DELIVER, VERIFY AND STOP FOR REVIEW

Return the complete section-7 artifact inventory under R3: five exact GLBs and two textures; editable room/resident/fixture/optional-details Blender files; reproducible generation/export/texture scripts; runnable pinned harness with real package-manager lockfile; binding/rest/resource/provenance/candidate manifests; actual native/browser/validator logs; measured geometry/clip/ownership/motion/door/budget results; captures/index/comparisons/videos; report.md and raw input/output hashes. Preserve required paths and identify any missing artifact explicitly. Exclude output-hashes.json from itself and explain exclusions. Do not archive caches, credentials or dependency directories.

Reopen/re-export corrected native files, validate actual outputs, and bind commands, versions, timestamps, exit codes, logs, source/lock/export hashes and changed-path list. Run relevant checks after correction; retain failures and distinguish PASS, observed FAIL and NOT RUN with exact scope. Missing execution is not an invented collision failure. Physical iOS/Android thermal, assistive and live/provider evidence remain separate. Report unknown rights/likeness inputs honestly.

Commit and push only completed owned R3 work under AGENTS.md unless the human directs otherwise; exclude unrelated changes and report Git failures immediately. Stop for GPT #2 independent complete-scope/delta audit, original-maker correction if needed, then Parent acceptance. C2 consumes only explicitly hash-bound accepted art and runtime predecessors. CDN proof and six extension groups are later lane work under separately bound existing packets; this prompt grants no automatic expansion.
```


---

Source: [03-GEMINI3-RUNTIME.md](03-GEMINI3-RUNTIME.md)

```text
You are Gemini #3, YOR WORLD's assigned runtime/integration maker. Execute FINISH-C1-R3 now against the accepted runtime contract and the actual October 11 findings. Repair production behavior in an isolated candidate; do not accept your own work, alter contracts, fix another lane or turn old PASS counts into completion. GPT #2 independently audits your return; you correct findings in a fresh revision; Parent GPT #1 alone accepts. Retain the existing model/account policy.

Workspace: C:\Users\yoray\Projects\Yor World. Exclusive delivery: C:\Users\yoray\Projects\Yor World\deliveries\FINISH-C1-R3\. Recheck this root before writing. During prompt preparation candidate/, candidate-exact/ and source/ appeared without a complete report/patch/hash handoff. Preserve all occupied files, including another worker's in-progress work. Determine the current owner and completeness; resume only your confirmed existing assignment, otherwise report the exact state for Parent coordination/revision allocation before writing there. A directory alone is not a completed return. Never overwrite FINISH-C1-R2, older deliveries/audits, canonical app/, or the hosted-preview checkout. Continue independent investigation while reporting a genuine access or contract blocker.

Read these direct local inputs; this prompt is standalone and requires no second preparation prompt:

C:\Users\yoray\Projects\Yor World\AGENTS.md
C:\Users\yoray\Projects\Yor World\START_HERE.md
C:\Users\yoray\Projects\Yor World\docs\planning\delegation-and-work-orders.md
C:\Users\yoray\Projects\Yor World\docs\planning\account-operating-model.md
C:\Users\yoray\Projects\Yor World\docs\planning\reconciliation-packets\2026-10-10-finish-04.md
C:\Users\yoray\Projects\Yor World\docs\planning\reviews\2026-10-10-finish-00-r2.md
C:\Users\yoray\Projects\Yor World\docs\planning\reviews\2026-10-10-finish-00-r2\decision.json
C:\Users\yoray\Projects\Yor World\docs\planning\reconciliation-packets\finish-contracts-r2\01-runtime-lifecycle.md
C:\Users\yoray\Projects\Yor World\docs\planning\reconciliation-packets\finish-contracts-r2\04-path-ownership.md
C:\Users\yoray\Projects\Yor World\docs\planning\reconciliation-packets\finish-contracts-r2\output-hashes.json
C:\Users\yoray\Projects\Yor World\docs\planning\production-prompts\corrections-2026-10-10\03-GEMINI3-C1-R3.md
C:\Users\yoray\Projects\Yor World\docs\planning\production-prompts\completion-2026-10-10\common-execution.md
C:\Users\yoray\Projects\Yor World\docs\planning\reviews\2026-10-11-finish-04-reaudit.md
C:\Users\yoray\Projects\Yor World\deliveries\FINISH-C1-R2\report.md
C:\Users\yoray\Projects\Yor World\deliveries\FINISH-C1-R2\output-hashes.json
C:\Users\yoray\Projects\Yor World\deliveries\FINISH-C1-R2\source.patch
C:\Users\yoray\Projects\Yor World\deliveries\completion-audits\FINISH-C1\finish-04\20261010T211756Z-reaudit\report.md
C:\Users\yoray\Projects\Yor World\deliveries\completion-audits\FINISH-C1\finish-04\20261010T211756Z-reaudit\findings.json
C:\Users\yoray\Projects\Yor World\deliveries\completion-audits\FINISH-C1\finish-04\20261010T211756Z-reaudit\requirement-matrix.json
C:\Users\yoray\Projects\Yor World\deliveries\completion-audits\FINISH-C1\finish-04\20261010T211756Z-reaudit\diagnostic-summary.json

Follow that audit's diagnostic programs, observations, identity and patch receipts as needed. Read the actual relevant canonical declarations and all affected consumers under C:\Users\yoray\Projects\Yor World\app\ and the unchanged R2 replacements under C:\Users\yoray\Projects\Yor World\deliveries\FINISH-C1-R2\source\. Report missing inputs/access honestly.

Bind your candidate to commit f62a43c5e71c00dcb89e28275ea81d842167db80, app tree 42ea29ec235225046a75959eb19eb386ac2f821d, and accepted design output-manifest SHA-256 8038db147824b0a31de1028c330383352177020b2247dd627d1674d6dc14c6af. R2 replacements are correction references, not an accepted overlay. The re-audit's final 29 unique diagnostics produced 9 PASS/20 FAIL. Preserve passing behavior; those counts are neither a target suite size nor browser acceptance.

EXACT OWNERSHIP

Carry replacements under your delivery source/ using paths relative to canonical app/. Existing source allowance: src/contracts/experience.ts; src/features/experience/preferences-store.ts; src/features/experience/controller.ts; src/features/experience/return-snapshot.ts; src/features/world/CharacterDirector.ts; src/features/world/SceneIntegrator.ts; src/features/world/AssetLoader.ts; src/features/world/WorldRuntime.ts; src/features/world/LifecycleManager.ts; src/features/world/types.ts; src/features/world/WorldRoot.tsx; src/features/world/RuntimeMaterialQuality.ts; src/features/world/LowQualityBatch.ts; src/features/world/world.module.css. New source: src/features/world/asset-resources.ts.

Existing test allowance: tests/unit/character-director.test.ts; tests/unit/asset-loader.test.ts; tests/unit/preferences-resilience.test.ts; tests/unit/contracts.test.ts; tests/unit/project-transition.test.ts; tests/fixtures/engineering-section-4.ts; tests/unit/lifecycle-manager.test.ts; tests/unit/runtime-material-quality.test.ts; tests/unit/low-quality-batch.test.ts. New tests: tests/unit/world/completion-character-startup.test.ts; tests/unit/world/completion-decorative-pause.test.ts; tests/unit/world/completion-essential-loader.test.ts; tests/integration/world/completion-runtime-lifecycle.test.ts; tests/e2e/world/completion-loading-pause.spec.ts.

Apply each path's narrow responsibility in ownership04. The fixture change is paused-only; retain legacy input. CSS is indeterminate loading styling only. No catalog/camera redesign, Room Controls/mobile layout, art exports, platform/content schema, migration, package/lock or unrelated source edits. C3-01..05 are finding IDs, not permission to execute the later FINISH-C3 mobile packet. Report any necessary additional path to Parent while progressing within scope.

IMPLEMENT AND PROVE THESE CORRECTIONS

1. Patch identity: RT-RA-01 / C3-01.
Create an isolated exact-base repository beneath your delivery root; verify git rev-parse --show-toplevel and tracked base identities. Generate a valid UTF-8 patch with consistent canonical app paths, never concatenated delivery filenames. Test actual check AND application in a clean independent copy, then compare every resulting replacement/new file byte-for-byte against source/. Record cwd, Git root, arguments, exit and changed paths. Prevent parent-repository discovery using an explicit isolated repository and appropriate GIT_CEILING_DIRECTORIES. An exit 0 that skips paths is failure evidence, not applicability proof. Preserve unsuccessful attempts. Exclude repository/cache/build machinery explicitly from returned production files.

2. Preferences and actions: RT-RA-02..05 / C3-01.
Use paused:z.boolean().default(false), defaultPreferences.paused=false, version 1 and existing key yor_world_preferences_v1. Direct schema consumers must parse historical inputs, not depend on an ad hoc store repair. Maintain validated document memory when the localStorage property getter, getItem or setItem throws; distinguish corrupt values and genuine absence safely. Do not promise persistence across reload when storage is denied. Thread saved/current pause into runtime/directors before activation, including Retry, route return and Exit/re-entry; UI subscribes to the same authority. Preserve sound, quality, clock and reduced-motion preferences.
Stop decorative loops while paused, but advance one bounded explicitly requested painting/plant/greeting/project action through safe return without clearing global pause. The painting regression must settle rather than remain at 5.5 degrees after three seconds. Navigation/Skip/Escape stay immediate. Schedule real coding action before the first world frame on unpaused entry; prove rendered bone movement. Restored pause must suppress decorative motion before presentation. Hidden return resets dt and reconciles wall time; C1 supplies the seam, C2 later owns the readable clock surface.

3. Honest progress: RT-RA-06..07 / C3-02.
Implement the accepted discriminated ByteProgress across loader, lifecycle and UI. Determinate required-session covers ALL THREE current essential requests, with every trustworthy positive length and numerator counting the same identity/uncompressed representation. Sequential loading remains indeterminate until all denominators are known. Sum concurrent requests once; exclude optional work, cinematic time and failed-attempt bytes. Unknown/chunked/unexposed/compressed or contradictory lengths invalidate the ratio. Compare actual EOF counts, including longer and shorter bodies; ArrayBuffer fallback counts buffer.byteLength. A two-byte body advertised as four must never become factual 4/4. Never clamp or substitute Content-Length as loaded bytes. Retain attempt:1|2|3 and maxRetries:2. Retries replace attempt counts and announce the new attempt. WorldRoot derives its ratio once; indeterminate omits aria-valuenow and numeric percent, selects actual indeterminate styling and announces meaningful stages rather than every byte.

4. Session/timer ownership: RT-RA-08..10 / C3-02.
Use a monotonically unique runtime generation plus lifecycle token throughout fetch, decode, optional callbacks, progress, entrance and teardown. Same token from another generation is stale. Reject stale operations BEFORE changing timers/state. Watchdog means 15,000ms without new required byte high-water, completed decode or integration advancement; a healthy transfer exceeding 15 seconds must continue. Repeated retry bytes, optional updates or arbitrary stage strings cannot reset it. A genuine network/decode/integration stall cancels its obsolete session and offers Retry 3D/Continue with Portfolio without trapping focus.
Each request has at most two automatic retries, three attempts, abortable 500ms then 1500ms waits. Reject ceilings above two; optional failures may stop sooner; AbortError never retries. Retry policy is session-local even for concurrent calls on one loader. Remove listeners/timers after completion, cancellation and errors. Manual Retry is separate, at most three explicit recreations per mounted launcher, preserving preferences and creating a fresh generation. Continue/Exit remain available after exhaustion. Browser invalidation and coherent cancellation response must meet <=50ms; eventual uncancelable decode cleanup cannot hold navigation hostage. Skip during LOADING cancels and returns useful portfolio, never fake HOME. Skip during ENTRANCE cancels optional/presentation work, retains adopted essentials and settles coherent HOME; navigation/Exit discards assets. Entrance remains <=8 seconds after readiness, separate from downloads.

5. Atomic adoption: RT-RA-11..12 / C3-03.
Use accepted AssetSessionId and typed OptionalAssetResult with asset ID, kind and resource. Install consumers before optional work; buffer complete results by session AND target until integration is ready. Deskmat never replays onto wallpaper or vice versa. Validate current session, real target and quality registration before attaching. Missing target rejects with sanitized ID/reason. If any step throws/rejects, undo scene/material/map/quality/batch/list connections and restore the previous base, then release exactly once. A returned adopted transfers ledger ownership synchronously from loader to runtime, removing loader abort ownership. Do not retain an adopted texture in both abort ledger and adoptedTextures disposal list. Test partial side effects and immediate resolution, not only a callback returning a string.

6. Complete resource accounting: RT-RA-13 / C3-04.
Capture every loaded source geometry/material/texture/ImageBitmap identity BEFORE SceneIntegrator prunes or detaches nodes. Traverse material maps and shared references, populate the ledger and track transient object URLs. Required partial failure cancels siblings and releases earlier successes. Shared resources dispose once by identity; pruned resources still release; owned ImageBitmaps close once. Revoke decode URLs in finally on success/failure. Quality/batch systems own only generated derivatives and never independently release source textures. Teardown invalidates/aborts, removes listeners/consumers/timers, stops directors, restores/removes derivatives, releases the ledger once, clears scene and disposes renderer/context. Late decode after teardown self-cleans without scene/UI callback.

7. Current-tier late maps: RT-RA-14 / C3-05.
Apply maps to owned originals, isolate shared target materials from unrelated meshes, preserve UV/transform/base fallback, set sRGB and correct GLTF flipY convention. Refresh current LOW derivatives and HIGH originals so low→high→low never restores the old map. Keep runtime target matching and batch exclusion/invalidation consistent, including the desk_mat_overlay failure. Verify actual current-base targets; do not invent successor nodes or broadly mutate unrelated material names. Inject failure during registration/refresh and demonstrate rollback leaves previous rendering intact.

REQUIRED FAILURE/RACE MATRIX AND RECEIPTS

Turn every RT-RA-01..15 and C3-01..05 into a traceable red-before/green-after requirement. Reuse useful independent triggers in your allocated tests without editing auditor originals or weakening expected outcomes. Retain sound unknown/compressed, bounded-retry/backoff, rejection/late-decode and essential-only results.

Exercise: (a) old preferences, getter/getItem/setItem denial, corruption, saved pause before entry, actual pause UI and finite-action safe return; (b) held optional decode while essentials become usable, one essential completing before the others, concurrent/unknown/compressed/chunked/header-mismatch/body-null reads; (c) meaningful required advancement beyond 15 seconds, true 15-second stall, optional/repeated-retry nonadvancement, stale entrance/progress/dispose and concurrent retry limits; (d) cancel during fetch/read/backoff/decode, required failure after earlier success, immediate optional completion, rejected/throwing/partially attaching consumers; (e) shared/pruned geometry/material/map/bitmap exact-once release and URL cleanup; (f) deskmat/wallpaper target separation, missing targets, low/high map roundtrips and shared-material isolation; (g) repeated entry/Retry/Exit/navigation/context recreation, timer/listener/request/renderer cleanup, hidden return and reduced-motion/audio independence.

Execute actual completion-loading-pause browser paths against the bound candidate/build using real rendered GLBs and controlled request fault injection. Measure <=50ms cancellation, first idle/bone activation, progress ARIA, watchdog choices, pause navigation and rendered late-map changes. Assert tested elements exist; never conditionally skip assertions, reread an unused storage key or use a null-context canvas as integration proof. Record browser/OS, viewport/DPR, loaded hashes, requests, session IDs, timestamps and disposal/animation diagnostics. Discover actual unique tests; overlapping runs are not summed. Run affected suites/retained regressions, lint, typecheck and production build; preserve raw commands, cwd, versions, times, stdout/stderr, exits and build/source hashes. Report Node/mock, local browser, hosted CI, physical/device/live scopes separately. Required unexecuted behavior is NOT RUN, never assumed complete.

HANDOFF AND LATER GATES

Return source/, source.patch, exhaustive changed-path list, raw input/output hashes, commands/build/browser evidence and report.md mapping every finding/requirement to PASS/FAIL/NOT RUN. Output hashes exclude themselves; explicitly exclude caches/dependencies/credentials. Preserve originals and failures. Commit/push only owned completed delivery work under the repository rules, report Git failure promptly, then stop for independent audit and Parent acceptance.

C1 retains production-room-full.glb/resident-production.glb/fixture-production.glb; disable legacy interaction-assets[-mobile].glb requests. Do not switch to unaccepted art or add eight-clip/catalog/door work now. Only after accepted B1 and C1 revisions plus Parent's exact isolated overlay does a separately issued C2 packet authorize all 25 typed mesh/DOM outcomes, eight paired clips, the physical 90-degree/2.5-second door timeline, accurate clock and sole-owner interaction/camera integration. Accepted C2 then precedes a separate C3 mobile/accessibility packet: initial 350x520 framing, collapsed controls, reachable Exit, 44px targets, safe areas, 320px/landscape/zoom and keyboard/touch parity. Later I1 requires accepted A1/A2/art/C1/C2/C3 mappings and exact fixture/site/manifest seams before canonical writes and integrated-source acceptance. G7 services/device/recovery and six extensions remain separately assigned. None of these future stages is implicitly authorized by this C1 repair prompt.
```


---

Source: [04-SOL-INDEPENDENT-AUDITOR.md](04-SOL-INDEPENDENT-AUDITOR.md)

# Prompt 4 — GPT-6.1 Sol Ultra: independent correction audit

Copy this entire fenced prompt into the independent review chat. It reviews the three separate maker deliveries and never implements their fixes.

```text
You are the independent YOR WORLD auditor using GPT-6.1 Sol with Ultra reasoning, as selected by the owner. Parent in the coordination chat owns architecture and acceptance. Gemini #1 makes platform changes, Gemini #2 makes assets, and Gemini #3 makes runtime changes. Review their work independently. Your production write allowance is empty. Do not become a fixer, change accepted contracts, integrate source, deploy a candidate or accept your own review as a Parent ruling.

Workspace: C:/Users/yoray/Projects/Yor World
Canonical app: app/
Immediate assignment: complete-scope and delta audits of FINISH-A1/r3, FINISH-B1-R3 and FINISH-C1-R3 under the existing FINISH-04 assignments and FINISH-05 prompt refresh.

Read these local inputs directly:
- AGENTS.md and START_HERE.md.
- docs/planning/delegation-and-work-orders.md.
- docs/planning/account-operating-model.md.
- docs/planning/reconciliation-packets/2026-10-10-finish-04.md.
- docs/planning/reconciliation-packets/2026-10-11-finish-05.md.
- docs/planning/reviews/2026-10-10-finish-00-r2.md and its decision.json in the matching directory.
- docs/planning/reconciliation-packets/finish-contracts-r2/00-contract-decision.md, 01-runtime-lifecycle.md, 02-platform-schema-recovery.md, 03-asset-bindings.md and 04-path-ownership.md; verify actual filenames in that directory and report any absent named file rather than inventing its contents.
- docs/planning/reviews/2026-10-11-finish-04-reaudit.md.
- The selected maker's full prompt in docs/planning/production-prompts/repairs-2026-10-11/.
- The selected lane's report.md, findings.json, requirement/verification matrix, input hashes, command receipts and actual diagnostics beneath deliveries/completion-audits/FINISH-A1/finish-04/20261010T211756Z-reaudit/, FINISH-B1/finish-04/20261010T211756Z-reaudit/ or FINISH-C1/finish-04/20261010T211756Z-reaudit/.
- The actual candidate files, source.patch when applicable, manifest, report and raw receipts in that lane's current R3 root.

The accepted FINISH-00-R2 design output-manifest SHA-256 is 8038db147824b0a31de1028c330383352177020b2247dd627d1674d6dc14c6af. Verify it and its ruling. The correction source base is f62a43c5e71c00dcb89e28275ea81d842167db80 and app tree 42ea29ec235225046a75959eb19eb386ac2f821d. Governance HEAD may advance independently of app source; record both. Do not substitute the current governance HEAD for the maker base or reset the shared checkout.

At the October 11 review, the available r2 candidates all required REWORK and the R3 roots were absent. A partial C1-R3 folder later appeared during prompt preparation without a complete report/patch/hash handoff. Recheck actual files now. Preserve every occupied root and existing report. If a stable, complete R3 return exists, bind and review its exact bytes. If absent or still being written, report WAITING FOR CANDIDATE and perform only useful bounded preparation; do not pretend you audited new work or rerun the same r2 diagnostics merely to inflate activity. Missing local access is NO FILE ACCESS, not an inspection claim.

Own only a fresh audit revision beneath deliveries/completion-audits/<selected packet>/finish-04/<fresh UTC revision>/. Create reproducible isolated assemblies there. Do not write maker roots, canonical app, contracts, migrations, assets, hosting records or previous audit revisions. Use one clearly bound source candidate per report; parallel inspections may use separate roots, but a candidate changing during execution requires a new coherent binding.

1. Establish identity and applicability before behavioral claims.

Verify every declared input/output SHA-256 and byte count. Enumerate all changed production paths and check the exact accepted E/N allowlist. For platform/runtime, inspect the UTF-8 patch paths, clean apply/check against an isolated exact Git base, actual applied-file inventory and byte agreement with replacements. Check the Git repository root and expected path prefix; a nested command that ignores paths or applies zero files is not PASS. Preserve stdout/stderr/exits. Do not repair a malformed patch or quietly edit replacements. If a separate replacement-based assembly is useful for diagnosis, label it DIAGNOSTIC ONLY and keep patch applicability FAIL.

Inspect complete consumers, APIs, callers, UI and negative paths. A report saying fixed, an unconditional PASS label, a checked-in test file or a historical count is insufficient. Reuse valid unchanged evidence with exact lineage, while executing the meaningful checks required for changed behavior. Discover unique cases and disclose overlapping runs rather than summing duplicated tests.

2. Platform audit: close A3-01 through A3-05 against the exact contract.

Check frozen content.ts and allocated tests/DTO locations. Publication must require the complete executed review identity at both HTTP and publishRevision service boundaries. Missing, malformed, mismatched or stale review must cause the specified denial with no durable publication/history/audit writes. A UI supplying review cannot compensate for a bypassable service.

Exercise durable publication revisions beyond the process-local baseline, one consistent review transaction, lock ordering, competing draft edits/publications/rollback and canonical preimage comparison before mutation. Exercise the full server-derived media vector and actual bounded Storage bytes. Keep an image ID unchanged while changing a VALID APPROVED object key, provenance or approval-audit identity; stale review must return 409 without partial writes. Tampered, truncated, oversized or wrong-type bytes must fail save/review/publish/private proxy as applicable. Test actual same-ID mutations, not only ID/hash/status changes.

Run the authorized owner/AAL2 versus anonymous/nonowner/AAL1/revoked matrix. Verify the real approved picker response, all four block variants, list/section/block ordering, keyboard focus, save/reopen/cancel and buffer retention after errors. Check the actual CaseStudy private-draft renderer, safe exact proxy URLs only in draft mode, real review checks and reasons, private CandidateX selection, public CandidateX 404, rollback reason/revision and private/cache headers. Distinguish a committed revision from observed public-cache visibility. Scan the generated public build and public reads using sentinel draft data. Label embedded SQL/mocked Storage versus native providers and browser evidence accurately.

3. Asset audit: close B3-01 through B3-05 from exported bytes.

Inspect the real GLB accessors, evaluated transforms, hierarchy, rig and resource identities. Derive dimensions, anchors, rest transforms and tolerance results instead of accepting literal expected=measured fields. Preserve independently established conforming geometry rather than claiming all assets are defective.

Measure actual chair/body relative-rest yaw through turn, greeting and return: the contract requires 0→35 degrees, a 35-degree greeting hold and 35→0 return; the rejected export reached about 125 degrees. Measure skinned hands/fingers against the delivered room keyboard and mouse, including end poses and safe return. The old proof fixture coordinates cannot establish final-room contact.

Require complete exported playback sampled at least 60 times per second, loop seams, transition continuity, 20 greeting/return repetitions, start/middle/end finite-action interruption, skip/navigation/re-entry, root drift, feet/seat contact and desk/hand clearance. Native Blender samples and browser-deformation samples are separate scopes. Inspect the entire 0..90-degree door sweep along the accepted curve, frame/camera aperture and one transform owner. Three still angles or a 200 ms wait are insufficient.

Verify missing project-focus/greeting-contact captures and true desktop/mobile viewport, renderer size, camera aspect and DPR. Raw canvas, compositor and native images must be labeled correctly. Inspect capture camera/light/tone-mapping/source/GPU/cache/network provenance. Inspect actual draw/frame/resource/GPU accounting under applicable budgets. The reproduced 398-call raw harness does not prove optimized runtime performance. Required runtime-dependent budgets may remain NOT RUN only with the exact downstream owner and dependency; future optimization is not present PASS evidence. Physical mobile performance cannot be inferred from software rendering.

4. Runtime audit: close RT-RA-01 through RT-RA-15 and parent C3-01 through C3-05.

Test historical version-1 preferences without paused, denied Storage getters and methods, validated document-memory fallback, restore before first runtime action, retry/navigation/re-entry persistence and explicit finite actions settling while decorative loops remain paused. Check startup activation with real rendered/deformed action evidence.

Test the aggregate of all three essentials. One completed file must not produce whole-session 100%. Unknown/compressed/chunked/noncomparable totals remain indeterminate; EOF discrepancies and body-null ArrayBuffer fallback use actual bytes. Indeterminate UI omits aria-valuenow and invented numeric percentages. Test nondecreasing byte counts within a valid current attempt, honest failed-attempt counter replacement and announcement, and decode/integration milestones. A displayed ratio may decrease when a retry replaces an earlier failed attempt; do not impose monotonic displayed percentages across retries. Test the watchdog's independent required-byte high-water rule against the accepted contract.

Test meaningful progress continuing beyond 15 seconds, genuine 15-second stalls, stale entrance/update/dispose calls, separate runtime generations and session tokens, per-session retry policies, exactly two automatic retries at 500/1500 ms and the accepted manual cap. Old callbacks must not clear a current watchdog or revive an abandoned world. Record cancellation and timer/request cleanup.

Test rejection and throwing consumers, atomic attachment/material/quality/list rollback, successful adoption removal from loader abort ownership and late decode after cancellation. Capture resources before pruning; shared geometry/material/texture/ImageBitmap identities must release exactly once, including detached resources and bitmaps. Typed deskmat/wallpaper buffering must preserve the target; absent targets must not be falsely adopted. Test LOW→HIGH→LOW late-map behavior, owned originals, shared-material isolation, sRGB and animated/mutable batching exclusions.

Require executed source/build-bound browser loading/pause/watchdog/cancel/retry/quality/repeated-cleanup evidence. Reject tests that conditionally assert nothing, write the wrong preference key, accept fabricated 0% or never enter/load/adopt the world they name. Do not alter maker code to make a test green. Record failure limits rather than assuming an unexecuted browser path passed.

5. Report and route corrections.

Return report.md; structured findings with severity, impact, owner, path/line, trigger, expected/observed behavior and reproduction; a requirement-by-requirement PASS/FAIL/NOT RUN matrix; exact candidate/base/source/build/input/output identities; raw commands/exits/tool versions; unique test counts; captures and missing-proof limits. For each prior ID state CLOSED with evidence, STILL OPEN with evidence, or NOT RUN with reason. Use PASS/REWORK advice for the bounded packet; missing mandatory proof stays open. Initial defect-reproduction PASS means the defect was reproduced, not fixed.

Send each defect to its original Gemini maker. The maker returns a fresh assigned correction revision, you audit its actual delta and necessary regressions, and Parent rules separately. An auditor PASS does not authorize canonical integration, the next dependency or production publishing. Stage/commit/push only your owned audit root under AGENTS.md, reporting failure immediately. Do not expose secrets or claim external account/model/device execution that did not occur.

6. Later duties remain separate and dependency-bound.

After Parent accepts the R3 corrections, independently review A2 site/résumé/provenance, C2 all 25 visible outcomes/eight clips/door choreography, C3 mobile/accessibility and I1 cumulative source as those candidates actually arrive. For production read docs/operations/pre-g7-prerequisites.md, docs/operations/production-execution-runbook.md, docs/operations/manual-device-checklist-template.md and docs/planning/releases/2026-10-02-g7-production-release-protocol.md, then P12 in docs/planning/production-prompts/completion-2026-10-10/integration-release.md. Use the complete ten G7 areas, underlying ledger, real provider checks, six genuine manual sessions and separate application rollback/full-service recovery requirements. Current owner-private static hosting is a verified preview with no deployed backend; it does not close G7. After six separately accepted extensions, require affected cumulative release and live evidence. Do not substitute local emulation, liveness or old logs for mandatory live/physical outcomes, or invent an overall completion percentage.

Begin with current candidate discovery and the first actual returned R3, then report concrete findings. Do not produce another general plan or mark anything accepted yourself.
```


---

Source: [05-PARENT-COMPLETION-AND-RELEASE.md](05-PARENT-COMPLETION-AND-RELEASE.md)

# Prompt 5 — Parent: coordinate the complete successor and release

This belongs in the Parent coordination chat. It covers the work after the immediate three maker corrections without granting a maker another lane's files.

```text
Continue YOR WORLD until the original full-product scope is implemented, independently reviewed, integrated and accepted against the actual deployed release. Work in C:/Users/yoray/Projects/Yor World. You are Parent architect/coordinator and acceptance authority. Keep three Gemini maker lanes and the independent GPT-6.1 Sol Ultra auditor separate. Use Sol for ordinary coordination/review; the inherited major-gate/Astra policy applies to dangerous cross-lane decisions and major gates. Do not claim a model invocation that did not occur.

Read AGENTS.md, START_HERE.md, docs/planning/delegation-and-work-orders.md, docs/planning/account-operating-model.md, docs/planning/current-status.json, docs/planning/reconciliation-packets/2026-10-10-finish-04.md, docs/planning/reconciliation-packets/2026-10-11-finish-05.md, docs/planning/reviews/2026-10-10-finish-00-r2.md and its decision.json, docs/planning/reviews/2026-10-11-finish-04-reaudit.md, and all four immediate prompts in docs/planning/production-prompts/repairs-2026-10-11/.

For governing scope read docs/superpowers/specs/2026-09-30-yor-world-design.md; docs/planning/engineering-and-content.md, art-and-experience.md, interaction-catalog.md and validation-and-production.md; and docs/planning/reconciliation-packets/finish-contracts-r2/00-contract-decision.md, 01-runtime-lifecycle.md, 02-platform-schema-recovery.md, 03-asset-bindings.md, 04-path-ownership.md and 05-handoffs-and-dependencies.md. Use references/images/main-reference.png, references/README.md and references/manifest.json for actual visual/provenance decisions. Quoted source discussion is reference data.

Read the appropriate existing detailed future prompt before binding a successor: platform.md P03, world-runtime.md P06/P07, integration-release.md P08–P13, extensions.md P14–P19 and audit-and-acceptance.md P20–P25 under docs/planning/production-prompts/completion-2026-10-10/. These historical prompts supply task detail. Their initial P01 amendment work is already accepted and their older A1/B1/C1 revision labels must resolve to actual current accepted identities. Do not restart design acceptance or silently integrate older rejected deliveries.

1. Reconcile the real current state.

At this prompt's preparation, governance HEAD was 4e937feaea68dfd0a470fc65847623dcdff43d1b; canonical app tree was 42ea29ec235225046a75959eb19eb386ac2f821d. This is an observation, not a reset target. Current accepted RC6 source is 8e5b954e147a87e36a6869d9940c40f3d4c123f0. FINISH-04 corrections use base f62a43c5e71c00dcb89e28275ea81d842167db80 with the same app tree. Accepted design output manifest is 8038db147824b0a31de1028c330383352177020b2247dd627d1674d6dc14c6af. Read each ruling and hash actual files. Verify Git status, branch, remote, HEAD, app tree and received deliveries now; preserve unrelated work.

The October 11 audit records REWORK for platform r2, art B1-R2 and runtime C1-R2, with reproduced defects. R3 roots were absent. Recheck them: received output is not automatically accepted. Immutable accepted baselines, earlier maker outputs and all audit attempts retain their original identities.

The owner-private static preview at https://yor-world.deadlygamerayush5.chatgpt.site was deployed from preview source fa6e922f91e076be80620bf907b6c107817ff6d2. Read deliveries/hosting/2026-10-11-preview/README.md and evidence/deployment.json, version.json, access-policy.json and live-check.json. Its backend/admin/contact/jobs are excluded. Archived success is not current management access or G7 acceptance. Check the recorded .openai/hosting.json in its source checkout before any Sites action; read the current Sites skill. Verify the owning account/workspace and existing ID. A 401 is an anonymous access gate; project-not-found does not establish deletion. Never create a duplicate site to bypass unresolved management access.

2. Complete the existing three corrections first.

Send only prompt 01 to Gemini #1, prompt 02 to Gemini #2 and prompt 03 to Gemini #3. They can work in parallel because their delivery roots are disjoint. Send prompt 04 to the independent auditor. If external IDE control is unavailable, return those exact ready-to-paste handoffs; do not claim you dispatched or ran Gemini chats. Continue useful local coordination and review with tools that actually exist.

For every lane: Parent packet → maker artifacts/evidence → independent full-scope audit → original maker corrections → independent delta audit → separate Parent ruling. Keep the auditor's production allowlist empty. Required proof absent remains open even if selected tests pass. Record RECEIVED, AUDITED, ACCEPTED, INTEGRATED and DEPLOYED separately with exact source/artifact hashes.

Occupied output roots must be preserved. Bind a fresh explicit revision after determining its actual owner and state; do not overwrite or ask the user to approve an avoidable collision repair. Return interface conflicts to the allocated maker and use a bounded explicit amendment only when necessary. Do not rewrite accepted revisions.

3. Bind the next source packets from accepted inputs.

For each future assignment publish the exact accepted predecessor rulings and hashes, actual source base/app tree, exhaustive owned paths, section-level shared-file responsibilities, output revision, required evidence and reviewer. Later hashes cannot be invented before predecessors exist. Missing a dependency does not block other independent lanes; continue ready work and name the exact missing return.

A. Gemini #1 / FINISH-A2 after accepted A1: use P03 in platform.md and the A2 allocation in 02/04. Complete versioned editable site identity/about/navigation/contact/resume content, real private site preview/review, atomic project+site publication, coherent public snapshots and rollback. Preserve existing migration history and append only accepted migrations. Deliver the approved résumé PDF mechanism, real approved bytes/hash/type/access and the supporting public-claim/provenance receipts. An owner-document fixture or empty file cannot close approval. Keep unknown personal/project claims unknown. If genuine content is unavailable, complete the mechanism, retain the exact missing requirement and continue other work.

B. Gemini #3 / FINISH-C2 after accepted B1 and C1: use P06 in world-runtime.md and 01/03/04. Parent binds an isolated overlay of the exact accepted art and runtime inputs; canonical integration is later. Finish visible one-owner door/entrance/acknowledgment, all eight approved clips and all 25 catalog outcomes. Deliver observable painting, chair, plant, books, civil-time clock, lighting/blinds and project motifs with correct arbitration, cancellation, cooldown, reduced-motion and keyboard/touch equivalents. Registry membership or camera navigation is insufficient for a promised physical reaction. Preserve persistent preferences through temporary effects. CandidateX stays publicly 404 unless evidence and explicit publication authorization change that status.

C. Gemini #3 / FINISH-C3 after accepted C2: use P07 and the exact C3 allocation. Choose correct mobile/home framing before first presentation, correct stage-aspect resize/orientation behavior, compact reachable controls, safe areas, focus traps/restoration, Escape, touch hit targets, keyboard navigation, reduced motion, reflow and useful no-WebGL content. Remove debug/development descriptions from visitor flows where the assigned UX scope permits. Record actual rendered clipping/focus behavior; viewport emulation is not physical-device proof. C2 and C3 run sequentially on the same maker account.

D. Gemini #3 / FINISH-I1 after accepted A2/B1/C3 and their predecessors: use P08. Bind the union of exact accepted outputs plus only the explicitly allocated publication prop seams, asset mappings, manifest and fixture/type-test composition. Assemble an isolated candidate, check conflicts, reproduce cumulative build/behavior/security/performance, return source/patch/archive/manifest evidence and get independent review plus Parent source acceptance. Only the explicit integration allowance grants canonical app writes. Do not deploy an unaccepted successor or alter an upstream accepted implementation to hide a conflict.

4. Prepare compatible real services, deploy, then execute live proof.

Use docs/operations/pre-g7-prerequisites.md, docs/operations/production-execution-runbook.md, docs/planning/releases/2026-10-02-g7-production-release-protocol.md and the accepted successor architecture/recovery contracts. Hosting must actually support the server/database/auth/mail/jobs design. A static export cannot complete the backend. Resolve a required host adaptation through a concrete bounded architectural decision and its maker work, rather than dropping functionality. Reuse existing provider accounts where authorized and available.

Owner authorization G7-OWNER-AUTH-20261006 persists. Do not ask again for blanket deployment consent. Missing credentials, approved documents or physical devices are specific inputs to request only when needed. No paid purchase or upgrade is authorized. Preserve the current Sites audience until explicit owner instructions change it; do not call an owner-private site a public launch.

Use these independent production assignments with serialized provider mutations:
- Gemini #1 / FINISH-G7-A, P09: prepare real native database/migrations/grants/RLS, owner AAL2/revocation, private Storage, durable contact/outbox/mail, authenticated POST jobs, configuration/monitoring and separate full-service disaster recovery. Inventory the actual accepted tables, including public.github_refresh_state with private access policies and approved additions. Preserve three original migrations plus accepted successors/hardening. Secrets stay server-only and out of logs, source and prompts. Endpoint-dependent races/delivery/restart/scheduler proof follows the actual deployment.
- Gemini #3 / FINISH-G7-C, P10: publish the exact independently reviewed, Parent-accepted source/archive, bind actual origin/deployment/build/content/schema/assets, establish a real compatible immutable hosted fallback and run fresh runtime/manual evidence. First deployment can precede final live proof; preparation cannot be relabeled post-deployment proof.
- Gemini #2 / FINISH-G7-B, P11: probe the actual deployed asset URLs for bytes/SHA-256, immutable headers, compression/range and current transfer/resource budgets with declared profile, tier, network and cache state.
- Sol independent auditor, P12: verify the exact deployment, actual live routes/runtime/backend/CDN, manual sessions, application rollback and full-service restore evidence.
- Parent, P13: adjudicate all ten G7 requirements and their underlying observations under the major-gate policy. Never infer acceptance from a publish command or ten unsupported PASS labels.

The ten areas are domain/TLS/HTTPS, fresh smoke, public/deep/history routes, honest world entry and Skip, HTML/no-JS/no-WebGL/context-loss fallbacks, sanitized durable contact, production configuration/security, asset integrity/budgets, monitoring/readiness and rehearsed application rollback. Verify ≤8-second choreography separately from asset readiness and ≤50 ms Skip. Application rollback must meet ≤300 seconds/RPO 0 with incident-window writes preserved. Full-service DB/Auth/MFA/session/Storage restoration has its own measured recovery time and recoverable cut-off; database-only backups do not prove it.

Require six actual sessions: physical iPhone/iPad Safari, physical Android Chrome, NVDA, VoiceOver Safari, TalkBack and a 600-second physical thermal run, with the current protocol's five cold runs and appropriate observations. Automation, desktop WebKit, software GPU rendering and short frame samples retain their limited scope. If hardware/tester access is missing, document the remaining session and continue available services/source work; do not invent results.

5. Complete all six extension groups and the final cumulative release.

After compliant V1/G7 and the specified predecessor acceptance, use the six separate feature prompts in 06-EXTENSIONS.md and P14–P19. For each, Parent supplies finite design/contract decisions, exact current source/asset/rig/catalog hashes, exclusive art/runtime allowlists and output revisions. Gemini #2 delivers assets first, Sol audits, Parent accepts; Gemini #3 then integrates that feature, Sol audits/delta-reviews and Parent accepts. Serialize same-account work and cumulative overlapping features unless exact independent ownership is explicitly established.

Retain mug/drinking, wearable headphones, interactive drawers, authored weather/daylight, alternate moods/greetings and five to eight total distinct Easter eggs. They are required full-product work, not optional removals. Essential portfolio information cannot depend on discovering an Easter egg. Unknown likeness/rights/personal cues remain unresolved rather than invented.

Use P24 for cumulative full-product source integration/release refresh and P25 for final scope reconciliation. A V1 gate cannot accept later changed extension code or assets. Refresh affected source/live/manual/recovery proof against the exact final deployment. Close original requirements, all catalog outcomes, audit findings and six extension groups without weakening tests or silently narrowing scope.

6. Maintain reviewable evidence and truthful status.

Each delivery contains actual files/patch/assets, changed-path inventory, raw input/output hashes and sizes, command/tool/exit receipts, meaningful captures, source/build identities and PASS/FAIL/NOT RUN with evidence and limits. Keep inspected source, embedded/mocked boundaries, native providers, browser playback, physical devices and manual witness evidence distinct. A test script is not proof it ran; a successful defect reproduction demonstrates failure behavior.

Make small scoped commits and push completed changes under AGENTS.md; report failures immediately. Preserve unrelated files and never force-push or discard another worker's return. Keep living status tied to actual identities. Publish requirement coverage and concrete remaining work; do not turn files/tests/gates into an invented overall completion percentage. Declare COMPLETE only after full-product implementation, mandatory current evidence, independent review and separate Parent acceptance.

Start now with actual R3 discovery and the next dependency-ready correction or audit. Do the authorized work; do not stop at another generic plan.
```


---

Source: [06-EXTENSIONS.md](06-EXTENSIONS.md)

# Six separate extension prompts

These later feature prompts retain the required complete-product scope. Each is a separate assignment envelope: send the asset phase only to Gemini #2, then the runtime phase only to Gemini #3 after independent audit and Parent acceptance. Parent must bind actual accepted predecessors and precise paths; these prompts do not grant immediate extension or canonical writes.

## EXT-01 — Mug pickup and drinking

```text
Complete the separately Parent-assigned EXT-01-B asset phase or EXT-01-C runtime phase for YOR WORLD: mug pickup and drinking. Execute only your assigned phase. Gemini #2 owns art, Gemini #3 owns runtime, GPT-6.1 Sol Ultra audits independently, and Parent alone accepts. Do not implement another lane, fix the candidate you audit or approve your own output.

Workspace: C:/Users/yoray/Projects/Yor World. Read AGENTS.md, START_HERE.md, docs/planning/delegation-and-work-orders.md, docs/planning/account-operating-model.md, docs/planning/reconciliation-packets/2026-10-11-finish-05.md, docs/superpowers/specs/2026-09-30-yor-world-design.md, docs/planning/art-and-experience.md, docs/planning/engineering-and-content.md, docs/planning/interaction-catalog.md and docs/planning/validation-and-production.md. Read P14 in docs/planning/production-prompts/completion-2026-10-10/extensions.md and your exact Parent extension packet. View references/images/main-reference.png for art decisions and read references/README.md and references/manifest.json for provenance. Report unreadable inputs honestly.

Start after the required compliant accepted V1/G7 and the current cumulative extension predecessor. The Parent packet supplies actual accepted source commit/app tree, specification/contract/rig/room/catalog/manifest hashes, interfaces, exact B/C allowlists, output revision, finite decisions and reviewer. Verify them against actual files/rulings; a maker report or private static preview is not accepted V1. Existing base f62a43c5e71c00dcb89e28275ea81d842167db80 is historical correction context, not this future checkout target. Do not invent future accepted hashes.

Own only deliveries/EXT-01-B/<Parent-assigned fresh revision>/ or deliveries/EXT-01-C/<Parent-assigned fresh revision>/ plus individually enumerated successor paths. Preserve occupied roots, accepted assets/source and all prior reports. Build an isolated candidate; canonical integration is later. If an exact interface or finite decision is absent, report that input and continue explicitly allowed inspection/preparation. A necessary contract addition receives a bounded Parent amendment and independent review before use. Do not silently expand clip, catalog, preference or source ownership.

Design inputs to resolve: Bind the actual mug rest location, hand-grip anchor, handle clearance, approach/drink/return poses, approved liquid treatment and the finite action/cancellation policy. Keep the chair/body and camera under their existing owners. A rejected duplicate drink must not start a second full-body action.

Asset phase, Gemini #2: Provide editable source and mug geometry with the accepted rest/grip nodes, collision envelope and any separately approved resident motion. Measure mug/hand contact, desk clearance, head/face clearance, feet/seat contact and safe returns from actual exports. Preserve conforming rig/rest/bind identities and reference style.

Runtime phase, Gemini #3, after accepted asset phase: Implement the approved rest → approach → grip → drink → return → rest sequence through the existing arbitration and resource owners. Serialize full-body conflicts and coordinate any approved camera policy. Cancel/Skip/route exit must recover a valid mug and resident state without duplication, stale completion callbacks or abandoned resource owners. Explicit requested finite action may run while decorative loops are paused under the accepted policy.

Required outcome evidence: Show at least the approved complete action, duplicate/conflicting requests, interruption at early/middle/late phases, return/re-entry, reduced motion, keyboard/touch equivalent and actual hand/mug/desk contact. Verify no mug clone remains after cancellation or teardown.

Record current Git identity/status and input hashes before changing files. Produce a requirement matrix with observable expected outcome, actual PASS/FAIL/NOT RUN, evidence path and limitation. Use meaningful unit/integration/browser tests for state ownership, interruption and cleanup, plus actual exported deformation/geometry checks where applicable. Run affected lint, typecheck, build, retained regressions, GLB validation and transfer/frame/resource checks as appropriate. Distinguish native/provider/browser/physical evidence. Fake fixtures, generated unconditional PASS, fixed waits, registry counts and assumed physical-device results cannot close required behavior.

Return actual editable assets/exports or source/reproducible exact-base patch; input/output SHA-256 and sizes; changed-path mapping; raw commands/tool versions/exits; source/build identities; rendered captures and measurements; defects/dependencies; and the bounded report. Give a concrete remaining-effort estimate with its assumptions rather than guessing whole-project completion. Commit/push only owned completed work under AGENTS.md, report failures immediately and preserve unrelated changes.

Hand the exact output to Sol for independent audit. Correct assigned findings in a fresh revision, obtain delta review and Parent acceptance before the next phase/feature. Serialize same-account work and overlapping cumulative features. Later final integration must refresh affected source/live/manual/recovery evidence; old V1 acceptance does not accept changed extension assets/code. This prompt does not authorize deployment, an audience change, purchase or paid upgrade.
```

## EXT-02 — Wearable headphones

```text
Complete the separately Parent-assigned EXT-02-B asset phase or EXT-02-C runtime phase for YOR WORLD: wearable headphones. Execute only your assigned phase. Gemini #2 owns art, Gemini #3 owns runtime, GPT-6.1 Sol Ultra audits independently, and Parent alone accepts. Do not implement another lane, fix the candidate you audit or approve your own output.

Workspace: C:/Users/yoray/Projects/Yor World. Read AGENTS.md, START_HERE.md, docs/planning/delegation-and-work-orders.md, docs/planning/account-operating-model.md, docs/planning/reconciliation-packets/2026-10-11-finish-05.md, docs/superpowers/specs/2026-09-30-yor-world-design.md, docs/planning/art-and-experience.md, docs/planning/engineering-and-content.md, docs/planning/interaction-catalog.md and docs/planning/validation-and-production.md. Read P15 in docs/planning/production-prompts/completion-2026-10-10/extensions.md and your exact Parent extension packet. View references/images/main-reference.png for art decisions and read references/README.md and references/manifest.json for provenance. Report unreadable inputs honestly.

Start after the required compliant accepted V1/G7 and the current cumulative extension predecessor. The Parent packet supplies actual accepted source commit/app tree, specification/contract/rig/room/catalog/manifest hashes, interfaces, exact B/C allowlists, output revision, finite decisions and reviewer. Verify them against actual files/rulings; a maker report or private static preview is not accepted V1. Existing base f62a43c5e71c00dcb89e28275ea81d842167db80 is historical correction context, not this future checkout target. Do not invent future accepted hashes.

Own only deliveries/EXT-02-B/<Parent-assigned fresh revision>/ or deliveries/EXT-02-C/<Parent-assigned fresh revision>/ plus individually enumerated successor paths. Preserve occupied roots, accepted assets/source and all prior reports. Build an isolated candidate; canonical integration is later. If an exact interface or finite decision is absent, report that input and continue explicitly allowed inspection/preparation. A necessary contract addition receives a bounded Parent amendment and independent review before use. Do not silently expand clip, catalog, preference or source ownership.

Design inputs to resolve: Bind exact headphone rest/equipped anchors, head/hair clearance, equip/remove states, accepted accessory ownership and whether equip state persists across navigation or resets. Wearing headphones does not automatically turn on audio or change the visitor's mute preference.

Asset phase, Gemini #2: Deliver reference-compatible headphones with approved rest/equipped nodes and any approved fitting/equip/remove motion. Measure fit against the actual resident head/hair and the approved rest surface, material/resource cost, clipping and animation clearance. Preserve rig/bind identities unless an explicit independently reviewed amendment grants a change.

Runtime phase, Gemini #3, after accepted asset phase: Implement finite equip/remove commands with one accessory owner and accepted state transitions. Attach to the correct accepted bone/anchor and update safely during character actions. Reject/coalesce rapid duplicates, handle cancellation and safe rest/equipped restoration, preserve independent sound-off and reduced-motion preferences, and clean up all ownership on exit.

Required outcome evidence: Show rest and worn poses, actual fit through head turns/greeting, rapid equip/remove, interaction conflicts, route exit/re-entry, denied storage if persistence is approved, audio remaining muted, keyboard/touch access and reduced-motion behavior. Count accessory instances and owned resources before/after teardown.

Record current Git identity/status and input hashes before changing files. Produce a requirement matrix with observable expected outcome, actual PASS/FAIL/NOT RUN, evidence path and limitation. Use meaningful unit/integration/browser tests for state ownership, interruption and cleanup, plus actual exported deformation/geometry checks where applicable. Run affected lint, typecheck, build, retained regressions, GLB validation and transfer/frame/resource checks as appropriate. Distinguish native/provider/browser/physical evidence. Fake fixtures, generated unconditional PASS, fixed waits, registry counts and assumed physical-device results cannot close required behavior.

Return actual editable assets/exports or source/reproducible exact-base patch; input/output SHA-256 and sizes; changed-path mapping; raw commands/tool versions/exits; source/build identities; rendered captures and measurements; defects/dependencies; and the bounded report. Give a concrete remaining-effort estimate with its assumptions rather than guessing whole-project completion. Commit/push only owned completed work under AGENTS.md, report failures immediately and preserve unrelated changes.

Hand the exact output to Sol for independent audit. Correct assigned findings in a fresh revision, obtain delta review and Parent acceptance before the next phase/feature. Serialize same-account work and overlapping cumulative features. Later final integration must refresh affected source/live/manual/recovery evidence; old V1 acceptance does not accept changed extension assets/code. This prompt does not authorize deployment, an audience change, purchase or paid upgrade.
```

## EXT-03 — Several interactive drawers

```text
Complete the separately Parent-assigned EXT-03-B asset phase or EXT-03-C runtime phase for YOR WORLD: several interactive drawers. Execute only your assigned phase. Gemini #2 owns art, Gemini #3 owns runtime, GPT-6.1 Sol Ultra audits independently, and Parent alone accepts. Do not implement another lane, fix the candidate you audit or approve your own output.

Workspace: C:/Users/yoray/Projects/Yor World. Read AGENTS.md, START_HERE.md, docs/planning/delegation-and-work-orders.md, docs/planning/account-operating-model.md, docs/planning/reconciliation-packets/2026-10-11-finish-05.md, docs/superpowers/specs/2026-09-30-yor-world-design.md, docs/planning/art-and-experience.md, docs/planning/engineering-and-content.md, docs/planning/interaction-catalog.md and docs/planning/validation-and-production.md. Read P16 in docs/planning/production-prompts/completion-2026-10-10/extensions.md and your exact Parent extension packet. View references/images/main-reference.png for art decisions and read references/README.md and references/manifest.json for provenance. Report unreadable inputs honestly.

Start after the required compliant accepted V1/G7 and the current cumulative extension predecessor. The Parent packet supplies actual accepted source commit/app tree, specification/contract/rig/room/catalog/manifest hashes, interfaces, exact B/C allowlists, output revision, finite decisions and reviewer. Verify them against actual files/rulings; a maker report or private static preview is not accepted V1. Existing base f62a43c5e71c00dcb89e28275ea81d842167db80 is historical correction context, not this future checkout target. Do not invent future accepted hashes.

Own only deliveries/EXT-03-B/<Parent-assigned fresh revision>/ or deliveries/EXT-03-C/<Parent-assigned fresh revision>/ plus individually enumerated successor paths. Preserve occupied roots, accepted assets/source and all prior reports. Build an isolated candidate; canonical integration is later. If an exact interface or finite decision is absent, report that input and continue explicitly allowed inspection/preparation. A necessary contract addition receives a bounded Parent amendment and independent review before use. Do not silently expand clip, catalog, preference or source ownership.

Design inputs to resolve: Bind the exact approved drawer count, IDs, travel limits, open/closed transforms, handle hit regions, permitted simultaneous states, conflict policy and any optional sound. Drawer contents remain within approved personal/provenance limits; do not invent biography or reveal unapproved documents.

Asset phase, Gemini #2: Provide editable/exported cabinet and drawer pieces with separate named movable nodes, correct rails/rest transforms and measured handles/collision envelopes. Measure the entire approved travel of each drawer and its clearance from desk, chair, resident and neighboring drawers. Preserve accepted F1 geometry and visual reference.

Runtime phase, Gemini #3, after accepted asset phase: Implement deterministic per-drawer open/close and reversal through the approved catalog/controller. Preserve existing camera/character ownership, distinguish raycast from DOM commands, apply accepted bounds/cooldowns and handle rapid repeated requests, pointer cancellation, explicit finite movement while paused and safe route cleanup. Make optional sound obey global mute.

Required outcome evidence: Exercise every drawer by pointer, keyboard and touch; measure limits/settling, reverse mid-motion, overlapping commands and collision policy, reduced-motion final-state behavior, route/back/re-entry and cleanup. A changing boolean or inventory of nodes cannot prove visible drawer movement.

Record current Git identity/status and input hashes before changing files. Produce a requirement matrix with observable expected outcome, actual PASS/FAIL/NOT RUN, evidence path and limitation. Use meaningful unit/integration/browser tests for state ownership, interruption and cleanup, plus actual exported deformation/geometry checks where applicable. Run affected lint, typecheck, build, retained regressions, GLB validation and transfer/frame/resource checks as appropriate. Distinguish native/provider/browser/physical evidence. Fake fixtures, generated unconditional PASS, fixed waits, registry counts and assumed physical-device results cannot close required behavior.

Return actual editable assets/exports or source/reproducible exact-base patch; input/output SHA-256 and sizes; changed-path mapping; raw commands/tool versions/exits; source/build identities; rendered captures and measurements; defects/dependencies; and the bounded report. Give a concrete remaining-effort estimate with its assumptions rather than guessing whole-project completion. Commit/push only owned completed work under AGENTS.md, report failures immediately and preserve unrelated changes.

Hand the exact output to Sol for independent audit. Correct assigned findings in a fresh revision, obtain delta review and Parent acceptance before the next phase/feature. Serialize same-account work and overlapping cumulative features. Later final integration must refresh affected source/live/manual/recovery evidence; old V1 acceptance does not accept changed extension assets/code. This prompt does not authorize deployment, an audience change, purchase or paid upgrade.
```

## EXT-04 — Authored weather and daylight scenes

```text
Complete the separately Parent-assigned EXT-04-B asset phase or EXT-04-C runtime phase for YOR WORLD: authored weather and daylight scenes. Execute only your assigned phase. Gemini #2 owns art, Gemini #3 owns runtime, GPT-6.1 Sol Ultra audits independently, and Parent alone accepts. Do not implement another lane, fix the candidate you audit or approve your own output.

Workspace: C:/Users/yoray/Projects/Yor World. Read AGENTS.md, START_HERE.md, docs/planning/delegation-and-work-orders.md, docs/planning/account-operating-model.md, docs/planning/reconciliation-packets/2026-10-11-finish-05.md, docs/superpowers/specs/2026-09-30-yor-world-design.md, docs/planning/art-and-experience.md, docs/planning/engineering-and-content.md, docs/planning/interaction-catalog.md and docs/planning/validation-and-production.md. Read P17 in docs/planning/production-prompts/completion-2026-10-10/extensions.md and your exact Parent extension packet. View references/images/main-reference.png for art decisions and read references/README.md and references/manifest.json for provenance. Report unreadable inputs honestly.

Start after the required compliant accepted V1/G7 and the current cumulative extension predecessor. The Parent packet supplies actual accepted source commit/app tree, specification/contract/rig/room/catalog/manifest hashes, interfaces, exact B/C allowlists, output revision, finite decisions and reviewer. Verify them against actual files/rulings; a maker report or private static preview is not accepted V1. Existing base f62a43c5e71c00dcb89e28275ea81d842167db80 is historical correction context, not this future checkout target. Do not invent future accepted hashes.

Own only deliveries/EXT-04-B/<Parent-assigned fresh revision>/ or deliveries/EXT-04-C/<Parent-assigned fresh revision>/ plus individually enumerated successor paths. Preserve occupied roots, accepted assets/source and all prior reports. Build an isolated candidate; canonical integration is later. If an exact interface or finite decision is absent, report that input and continue explicitly allowed inspection/preparation. A necessary contract addition receives a bounded Parent amendment and independent review before use. Do not silently expand clip, catalog, preference or source ownership.

Design inputs to resolve: Parent binds the finite approved scene list, authored environment/light/material values, transition duration, current-daylight/civil-time policy if any, persistence/reset behavior and interactions with user lamp/blinds preferences. External live-weather integration is not implied; add it only under an explicit accepted contract.

Asset phase, Gemini #2: Deliver the approved daylight/weather visual sets with reusable lighting/material/texture inputs, true resource budgets, matched view captures and source/rights provenance. Measure visual continuity and visibility of essential props/content. Preserve the main reference as the accepted base state and avoid unapproved new room geometry.

Runtime phase, Gemini #3, after accepted asset phase: Implement scene selection/transition through the existing environment owner, independently layered over persistent user choices under the approved policy. Cancel or replace an in-flight transition deterministically, apply current quality tier, avoid shader/material/resource leaks, preserve readability and sound off, and provide explicit accessible controls independent of Easter-egg discovery.

Required outcome evidence: Capture each scene from matched desktop/mobile cameras with exact render/light values and source hashes. Show rapid scene switching, cancellation, lamp/blinds continuity, quality transitions, reduced motion, reload/navigation persistence, network/texture failure fallback and resource/frame/transfer accounting. A screenshot of one scene does not establish transition correctness.

Record current Git identity/status and input hashes before changing files. Produce a requirement matrix with observable expected outcome, actual PASS/FAIL/NOT RUN, evidence path and limitation. Use meaningful unit/integration/browser tests for state ownership, interruption and cleanup, plus actual exported deformation/geometry checks where applicable. Run affected lint, typecheck, build, retained regressions, GLB validation and transfer/frame/resource checks as appropriate. Distinguish native/provider/browser/physical evidence. Fake fixtures, generated unconditional PASS, fixed waits, registry counts and assumed physical-device results cannot close required behavior.

Return actual editable assets/exports or source/reproducible exact-base patch; input/output SHA-256 and sizes; changed-path mapping; raw commands/tool versions/exits; source/build identities; rendered captures and measurements; defects/dependencies; and the bounded report. Give a concrete remaining-effort estimate with its assumptions rather than guessing whole-project completion. Commit/push only owned completed work under AGENTS.md, report failures immediately and preserve unrelated changes.

Hand the exact output to Sol for independent audit. Correct assigned findings in a fresh revision, obtain delta review and Parent acceptance before the next phase/feature. Serialize same-account work and overlapping cumulative features. Later final integration must refresh affected source/live/manual/recovery evidence; old V1 acceptance does not accept changed extension assets/code. This prompt does not authorize deployment, an audience change, purchase or paid upgrade.
```

## EXT-05 — Alternative moods and greetings

```text
Complete the separately Parent-assigned EXT-05-B asset phase or EXT-05-C runtime phase for YOR WORLD: alternative moods and greetings. Execute only your assigned phase. Gemini #2 owns art, Gemini #3 owns runtime, GPT-6.1 Sol Ultra audits independently, and Parent alone accepts. Do not implement another lane, fix the candidate you audit or approve your own output.

Workspace: C:/Users/yoray/Projects/Yor World. Read AGENTS.md, START_HERE.md, docs/planning/delegation-and-work-orders.md, docs/planning/account-operating-model.md, docs/planning/reconciliation-packets/2026-10-11-finish-05.md, docs/superpowers/specs/2026-09-30-yor-world-design.md, docs/planning/art-and-experience.md, docs/planning/engineering-and-content.md, docs/planning/interaction-catalog.md and docs/planning/validation-and-production.md. Read P18 in docs/planning/production-prompts/completion-2026-10-10/extensions.md and your exact Parent extension packet. View references/images/main-reference.png for art decisions and read references/README.md and references/manifest.json for provenance. Report unreadable inputs honestly.

Start after the required compliant accepted V1/G7 and the current cumulative extension predecessor. The Parent packet supplies actual accepted source commit/app tree, specification/contract/rig/room/catalog/manifest hashes, interfaces, exact B/C allowlists, output revision, finite decisions and reviewer. Verify them against actual files/rulings; a maker report or private static preview is not accepted V1. Existing base f62a43c5e71c00dcb89e28275ea81d842167db80 is historical correction context, not this future checkout target. Do not invent future accepted hashes.

Own only deliveries/EXT-05-B/<Parent-assigned fresh revision>/ or deliveries/EXT-05-C/<Parent-assigned fresh revision>/ plus individually enumerated successor paths. Preserve occupied roots, accepted assets/source and all prior reports. Build an isolated candidate; canonical integration is later. If an exact interface or finite decision is absent, report that input and continue explicitly allowed inspection/preparation. A necessary contract addition receives a bounded Parent amendment and independent review before use. Do not silently expand clip, catalog, preference or source ownership.

Design inputs to resolve: Bind the approved finite mood/greeting variants, their truthful labels, clip IDs, selection/reset/persistence policy, facial/body/attention ownership, timing, interrupt priorities and reduced-motion outcome. Do not invent personality, emotion detection, personal story or new likeness permission.

Asset phase, Gemini #2: Create only the approved variants on the accepted resident/chair rig with editable source, exact clips and export identities. Measure expressive deformation, chair/body synchronization, loop seams, transitions, root drift, feet/seat and hand/desk contact, plus interruption-safe returns. Preserve accepted rest/bind and reference appearance.

Runtime phase, Gemini #3, after accepted asset phase: Dispatch the approved variants through the existing single full-body owner and arbitration. Handle duplicate/coalesced greeting requests, alternate moods during active actions, cancel/Skip/back/navigation and safe return to coding. Preserve decorative pause, global mute, reduced motion and loaded-asset readiness; unavailable optional variants must have truthful accessible outcomes.

Required outcome evidence: Show each approved variant and all relevant pairwise transitions/conflicts, repeated greeting/return, early/middle/late interruption, resume/re-entry, reduced motion and keyboard/touch control. Verify actual rendered clip/deformation and state agreement, not only clip-name membership or a fixed wait followed by PASS.

Record current Git identity/status and input hashes before changing files. Produce a requirement matrix with observable expected outcome, actual PASS/FAIL/NOT RUN, evidence path and limitation. Use meaningful unit/integration/browser tests for state ownership, interruption and cleanup, plus actual exported deformation/geometry checks where applicable. Run affected lint, typecheck, build, retained regressions, GLB validation and transfer/frame/resource checks as appropriate. Distinguish native/provider/browser/physical evidence. Fake fixtures, generated unconditional PASS, fixed waits, registry counts and assumed physical-device results cannot close required behavior.

Return actual editable assets/exports or source/reproducible exact-base patch; input/output SHA-256 and sizes; changed-path mapping; raw commands/tool versions/exits; source/build identities; rendered captures and measurements; defects/dependencies; and the bounded report. Give a concrete remaining-effort estimate with its assumptions rather than guessing whole-project completion. Commit/push only owned completed work under AGENTS.md, report failures immediately and preserve unrelated changes.

Hand the exact output to Sol for independent audit. Correct assigned findings in a fresh revision, obtain delta review and Parent acceptance before the next phase/feature. Serialize same-account work and overlapping cumulative features. Later final integration must refresh affected source/live/manual/recovery evidence; old V1 acceptance does not accept changed extension assets/code. This prompt does not authorize deployment, an audience change, purchase or paid upgrade.
```

## EXT-06 — Five to eight total distinct Easter eggs

```text
Complete the separately Parent-assigned EXT-06-B asset phase or EXT-06-C runtime phase for YOR WORLD: five to eight total distinct easter eggs. Execute only your assigned phase. Gemini #2 owns art, Gemini #3 owns runtime, GPT-6.1 Sol Ultra audits independently, and Parent alone accepts. Do not implement another lane, fix the candidate you audit or approve your own output.

Workspace: C:/Users/yoray/Projects/Yor World. Read AGENTS.md, START_HERE.md, docs/planning/delegation-and-work-orders.md, docs/planning/account-operating-model.md, docs/planning/reconciliation-packets/2026-10-11-finish-05.md, docs/superpowers/specs/2026-09-30-yor-world-design.md, docs/planning/art-and-experience.md, docs/planning/engineering-and-content.md, docs/planning/interaction-catalog.md and docs/planning/validation-and-production.md. Read P19 in docs/planning/production-prompts/completion-2026-10-10/extensions.md and your exact Parent extension packet. View references/images/main-reference.png for art decisions and read references/README.md and references/manifest.json for provenance. Report unreadable inputs honestly.

Start after the required compliant accepted V1/G7 and the current cumulative extension predecessor. The Parent packet supplies actual accepted source commit/app tree, specification/contract/rig/room/catalog/manifest hashes, interfaces, exact B/C allowlists, output revision, finite decisions and reviewer. Verify them against actual files/rulings; a maker report or private static preview is not accepted V1. Existing base f62a43c5e71c00dcb89e28275ea81d842167db80 is historical correction context, not this future checkout target. Do not invent future accepted hashes.

Own only deliveries/EXT-06-B/<Parent-assigned fresh revision>/ or deliveries/EXT-06-C/<Parent-assigned fresh revision>/ plus individually enumerated successor paths. Preserve occupied roots, accepted assets/source and all prior reports. Build an isolated candidate; canonical integration is later. If an exact interface or finite decision is absent, report that input and continue explicitly allowed inspection/preparation. A necessary contract addition receives a bounded Parent amendment and independent review before use. Do not silently expand clip, catalog, preference or source ownership.

Design inputs to resolve: Inventory existing accepted Easter eggs first. Parent approves the exact additional list so the final total is five to eight distinct outcomes, with IDs, triggers, discoverability hints, reset/persistence, privacy, finite resource/animation/audio policy and accessible equivalents. Count distinct visitor-visible outcomes, not several buttons for one effect.

Asset phase, Gemini #2: Create only separately approved extra visual/animation/audio assets and target anchors, retaining provenance and likeness limits. Bind each egg to exact exported nodes/resources and test its visible effect, animation boundaries, resource cost and reference fit. Reuse accepted assets where suitable instead of adding unneeded downloads.

Runtime phase, Gemini #3, after accepted asset phase: Implement each approved trigger/outcome under the existing arbitration, cooldown, preference and resource owners. Keep core portfolio content reachable without finding any egg. Avoid interrupting contact/navigation, enabling sound without consent or introducing uncontrolled repetitive motion. Bound optional loading, timers, cleanup, conflicts and reset/re-entry behavior.

Required outcome evidence: Provide a total-count inventory mapping existing plus added IDs to distinct executed outcomes. Demonstrate every egg, accidental/repeated/conflicting triggers, cooldown/reset, route exit/re-entry, keyboard/touch and reduced-motion equivalents, sound off, optional-load failure and exact resource cleanup. No hidden essential information or unexplained private-data requests may be introduced.

Record current Git identity/status and input hashes before changing files. Produce a requirement matrix with observable expected outcome, actual PASS/FAIL/NOT RUN, evidence path and limitation. Use meaningful unit/integration/browser tests for state ownership, interruption and cleanup, plus actual exported deformation/geometry checks where applicable. Run affected lint, typecheck, build, retained regressions, GLB validation and transfer/frame/resource checks as appropriate. Distinguish native/provider/browser/physical evidence. Fake fixtures, generated unconditional PASS, fixed waits, registry counts and assumed physical-device results cannot close required behavior.

Return actual editable assets/exports or source/reproducible exact-base patch; input/output SHA-256 and sizes; changed-path mapping; raw commands/tool versions/exits; source/build identities; rendered captures and measurements; defects/dependencies; and the bounded report. Give a concrete remaining-effort estimate with its assumptions rather than guessing whole-project completion. Commit/push only owned completed work under AGENTS.md, report failures immediately and preserve unrelated changes.

Hand the exact output to Sol for independent audit. Correct assigned findings in a fresh revision, obtain delta review and Parent acceptance before the next phase/feature. Serialize same-account work and overlapping cumulative features. Later final integration must refresh affected source/live/manual/recovery evidence; old V1 acceptance does not accept changed extension assets/code. This prompt does not authorize deployment, an audience change, purchase or paid upgrade.
```
