# W1/W2/W3 reconciliation and G1 ruling — 2026-10-01

Authority: parent Codex, architect, coordinator and sole technical gate authority. Scope: feasibility reconciliation, not feature implementation, final art, likeness, V1 acceptance or deployment.

**W1: REWORK. W2: INSUFFICIENT EVIDENCE. W3: REWORK. G1 LOCKED. No proof revision is formally accepted by this audit.**

## REPOSITORY TRUTH

The authoritative repository is [yorayriniwnl/Yor-World](https://github.com/yorayriniwnl/Yor-World), public, branch `main`, remote `https://github.com/yorayriniwnl/Yor-World.git`. At the start of reconciliation, local HEAD, origin/main and the live `git ls-remote` HEAD/main all identified **`fe1a40f797ce3ec839939c09a1857b797c197269`**. The working tree was clean. It contained one initial commit, the plans/reference library, all three delivery roots and Gemini reviews; no root application, G1 delivery, or Claude review was tracked. This audit adds a subsequent scoped coordination commit; it does not change the examined proof bytes.

The old no-Git statements describe earlier observations. They remain untouched in delivery reports, input snapshots, independent reports, archives, the September 30 proof audit and historical handoff records. They are not current repository status. Provider/model names in maker/reviewer reports remain their declarations; repository presence cannot authenticate a provider session.

During reconciliation, another independent Codex session added and pushed **`cb843a3e5fc0f1a03ccd1dfb845e810756085837`**, containing a [W3 implementation review](../../../deliveries/W3/reviews/2026-10-01-independent/report.md) and its evidence. Local HEAD and live GitHub main were rechecked at that commit. The W1/W2/W3 candidate source/assets remain the original examined revisions. This new review was read in full and incorporated before the ruling was finalized. Its 90 manifest members match both checkout and Git bytes: [review integrity audit](2026-10-01-reconciliation/w3-independent-review-audit.json). It is an independent Codex review, not a completed Claude browser review.

Read directly: START_HERE, AGENTS, product revision 2, work orders/account packets, relevant engineering/art/validation/platform/browser-review requirements, all current maker reports and manifests, all three Gemini report files, the newly returned independent W3 Codex review and its fault-injection evidence, and the historical planning audit records. `reviews/gemini-3/review.md` is byte-identical to `w2-review.md`; it is one review, not a second independent opinion. No archived Claude finding can be adjudicated because none is present. An external unarchived chat would require return and revision identification.

Evidence: [revision audit](2026-10-01-reconciliation/revision-audit.json), [read-only native inspection](2026-10-01-reconciliation/native-inspection.json), [native command receipt](2026-10-01-reconciliation/native-command.json), [independent glTF validation](2026-10-01-reconciliation/export-validation.json). All twelve reference copies match their manifest hashes. Original off-repository source copies were not rechecked in this audit.

### Exact baseline and byte identity

The examined requirements baseline is revision 2/F1 at the commit above. F1 remains room 4.2 × 3.6 × 2.8 m, runtime meters/Y-up, rear Z=-1.8; desk 2.6 × 0.8 m, top Y=.75, X/Z=(0,-1.15); chair/resident root=(.30,0,-.36). No F2 or schema change is authorized.

| Baseline file | SHA-256 of Git blob at examined commit |
| --- | --- |
| Product specification | `5791b78b39bed10798eff19c32596078ed92757ab4e944a13b70c25192fc3d81` |
| Engineering/contracts | `be9f439e6f70544e0dbc0b90249b3b5621bdeb3c8331f25ef7ff5372026967c1` |
| Art/experience | `52d65a452bdb13c2127060f76d9964caadbdde129d0fe2998281aa8e6b2a400c` |
| Validation/production | `0efa9bc08ce42f126d5845d33e58548ac9d8bf8904fd0d30497f47fdcba1ddef` |
| Work orders | `5d5dfe311f628bee1362f81b14a160320f4e3071c9d155f9f83f0fc9e0f1af4c` |
| Account packets | `d75be3dfe42053dfa341ec4236e6bb6f72352afbcbec0a68b1eb20ac70ecaaa9` |

Current living status corrections accompanying this report change status text and pointers only. The table pins the pre-correction requirements used for this audit. Future packets record the coordination commit plus their actual input hashes; a status edit must not be represented as a new geometry/contract decision.

W2's handoff snapshot of the product, art, engineering and validation matches the examined baseline. Its three later Markdown differences concern production-track links, browser-context reuse and handoff formatting; the complete [snapshot diff](2026-10-01-reconciliation/handoff-to-base.diff) was inspected. The original build's eight changed input hashes are preserved. The original bodies for every earlier revision are not available, so a complete original-to-handoff diff is NOT RUN. Parent reconciliation adopts the current explicit F1/clip/interface requirements; it does not certify an unavailable historical diff.

W3's engineering contract and A1 plan hashes match its build inputs; six other current inputs differ from its earlier manifest. Its statement that inputs were unchanged at handoff remains historical. Review the corrected candidate against the current packet, rather than pretending its old manifest names today's documents. W1's abbreviated original spec hash and unversioned input descriptions cannot identify a complete original baseline; its correction must return full input hashes.

Git `core.autocrlf=true` means archive/checkout hashes and Git blob hashes must be distinguished. W2's archive verifies **125/125** manifest members; checkout verifies **122/125**. The three differences are only validator `validatedAt` / export-inspection `timestamp`, changed from about 09:44 to 10:15 UTC. Results, assets and source are unchanged. Keep both records; use the immutable ZIP for original maker evidence. W3's archive and checkout verify **127/127** members. Git blob exact matches are 67/125 for W2 and 96/127 for W3; all blob-versus-checkout differences are CRLF normalization. The machine audit records both digests for every member. These explained differences are not geometry/source corruption and do not demand a maker rebuild. W1's 20 ZIP members equal the checkout and all three archives pass CRC checks.

## W1 DECISION — REWORK

There is a substantial returned proof: 65 KB generator, editable Blender scene, 925,628-byte GLB, 232 nodes, 49 materials, 11,020 mesh triangles, register, textures, twelve camera passes, comparison and ZIP. Native reopening and parent Khronos validation pass; required anchors/hit-zone names exist. White furniture, blue chair, pink lights and cyan fill are recognizable at blockout quality. This is useful work, not an absent delivery.

It fails the spatial and camera proof gate:

* **W1-01, P1 — nested placement applied twice.** Parent native inspection finds `door_leaf` world runtime center **(-2.85,1.05,3.60)** instead of approximately **(-1.20,1.05,1.80)** inside the doorway. GLB node 79 stores the world-intended translation under `door-hinge` node 80, adding the hinge again. `gaming_headset` is at **(3.06,3.64,-3.45)**, `pegboard_controller_1` at **(2.52,3.53,-2.40)**, and `talks-microphone` at **(-1.23,1.72,-2.27)**. These are outside the intended room/prop positions. Source: `add_box`/primitive helpers assign a parent after placing world coordinates, and nested calls use world-intended positions (`build-blockout.py:228–276, 322–335, 537–544`). Inspect all similarly parented props, not just the door. The exported file carries the defect; valid glTF syntax does not establish correct placement.
* **W1-02, P1 — clearance PASS is not a geometry test.** `evaluate_clearance_and_collisions()` at line 846 assigns .45 m/.90 m constants, sets `turn_pass=True`, and emits camera PASS strings without inspecting geometry. There are no returned execution logs establishing the claimed measurements. These assertions cannot prove the displaced door's sweep/path or proxy/chair clearance. Actual native armrest top is about .665 m, so the claimed .050 m underside gap also uses the armrest center rather than its top (.035 m actual vertical difference to a .700 m underside). That smaller gap alone is not a failure; it illustrates the measurement problem.
* **W1-03, P1 — required visual anchors/framing not proved.** The actual `camera-home.png` crops the upper light cluster and chair; the delivered comparison/home show a blank pegboard, absent placed controller/headset/microphone details and no properly placed foreground foliage. Several omissions are explained by W1-01. Mobile contains the resident and monitor, but does not establish the reported empty lower 40% for controls. Require readable coarse anchor masses and demonstrated control space, not detailed art or an arbitrary 40% design requirement. The reverse image shows a doorway opening, not the claimed correctly placed working door leaf.
* **W1-04, P2 — review/revision mismatch.** Gemini's review cites 925,572 bytes / 11,280 triangles and a 4512×1188 composite; actual committed values are 925,628 / 11,020 / **4119×1140**. It supplies no asset SHA binding or separate raw execution record. Its framing/clearance conclusions are contradicted by the inspected bytes. Preserve the review, obtain a new hash-bound review, and do not promote its recommendation to acceptance.

Missing Claude-13 export/provenance review remains part of the assigned exit. The maker must correct W1-01–03 and return a fresh revision and evidence, followed by Gemini-3 and Claude-13 review. There is no requirement to finish B3, final textures, likeness or a production monitor launcher.

## W2 DECISION — INSUFFICIENT EVIDENCE

`W2-F1-r2` is an identifiable, substantial motion/export proof. Its avatar/fixture/source/native hashes match the original maker ZIP. Both GLBs independently pass parent Khronos validation with zero errors/warnings; parent reopened the native scene and confirmed 30 FPS and five action ranges (plus paired fixture actions). GLB parsing confirms five clips at 6.0/.6/1.2/.9/1.3 seconds, root-level skin and separate `chair-root`, `chair-base`, `fixture-static` roots. The delivered Chrome/Edge JSON binds to the exact assets and reports 605 sampled poses, five cycles, 25 cancels and 25 instant skips per browser; WebM recordings are present and hash-verified.

Gemini-3's motion review is returned and favorable. It inspected maker recordings and declares native reopen/validator execution. Recording inspection is **independent review of maker evidence**, not independent browser replay. Its raw reviewer command logs are not archived separately. Parent reproduced native reopening and validator checks in this audit; **parent browser motion replay, collision sampling and video viewing are NOT RUN**. The numerical 37.08 mm hand clearance, near-zero drift and contact results remain maker measurements reviewed by Gemini, not newly measured parent results.

No new W2 maker correction is justified by this audit. The original assigned **Claude-01 interface** and **Claude-13 export/provenance** reviews are absent (account packets explicitly require them). Their absence prevents full proof acceptance even though motion evidence is favorable. This is a review-completion hold, not a motion failure. Current-baseline compatibility and timestamp/hash provenance are supplied in the ready review packets.

The 2.667 s reverse-path cancellation is confined to the diagnostic harness. Immediate Skip/Escape is supplied; future navigation must use immediate settlement. Natural velocity easing and proposed 150–250 ms production blends remain downstream. No CharacterDirector, final B4, remaining clips, likeness, physical-device or release-performance acceptance is inferred.

## W3 DECISION — REWORK

W3/A1 source tree is present and hash-verified, with exact pins/lockfile, contracts, five semantic routes, honest empty states and real tests. Maker final logs substantiate **55 unit tests and 18 production-browser tests**, zero final skips/flakes, build/serve, useful no-JS content, keyboard/skip link, blocked world/API requests, sound/WebGL off, reflow, reduced motion and payload observation. Historical failed attempts are preserved. Tests distinguish deliberate blocked probes and antivirus injection; payload is application-origin traffic, not unfiltered physical-device performance. Parent inspected source/test/evidence; **parent frozen install/build/browser reproduction is NOT RUN**.

The independent Codex reviewer separately reproduced a fresh frozen install, lint, typecheck, **55 unit tests, production build and 18 browser tests**, with a distinct build ID `cmgWNarGpCVaRHgBV4J_o`. It also executed additional browser probes and controlled fault injections in external scratch copies. These are **independently reproduced evidence**, not maker labels and not parent execution. Parent verified the review manifest and inspected the supplied fault-injection records against the actual source. The review does not finish the assigned Claude-01/02/05 returns.

**W3-01, P2, gate-blocking — runtime dependency correction is now actionable (independent F1).** The maker accurately recorded that 16.3.8 was unavailable on September 30 at its check. Parent registry requests now return **HTTP 200 for Next 16.3.8 and eslint-config-next 16.3.8**; latest Next is 16.3.8. The [official notice](https://nextjs.org/blog/upcoming-nextjs-security-release-september-2026) says 16.3.7 excludes the scheduled fixes; the [16.3.8 release](https://github.com/vercel/next.js/releases/tag/v16.3.8) exists. Issue a minimal matched patch/lockfile correction before integrating this runtime. Recheck advisory applicability and remaining upstream issues: the notice now separates seven scheduled fixes from two pending upstream issues. Availability of 16.3.8 is not blanket security clearance. No exploitability of this isolated shell was established here; the parent's severity agrees with the independent review's P2 rather than claiming a demonstrated high-severity exposure.

**W3-02, P1 gate evidence gap — Claude review is incomplete.** No Claude-01/02/05 review is archived. Return contracts, source/foundation/security and accessibility reviews of the corrected exact revision. Existing functional maker PASS labels do not fill that requirement. No additional platform feature is requested.

The independent review's remaining findings are adjudicated as follows:

| Reviewer finding | Parent ID / severity | Disposition |
| --- | --- | --- |
| F2: script preloads omitted from JS budget | W3-03 / P2, gate-blocking | Accept finding. `payload.spec.ts:55` counts only initiatorType=script; a 1,970-byte link-initiated JS preload is omitted. Correct JS is **137,034 bytes (133.8 KiB)**, not 135,064. Total transfer remains 160,417 bytes and both budgets still pass. Correct classification/summary and prove a test-only oversized preload fails the budget check. |
| F3: dynamic import bypasses fixture guard | W3-04 / P2, gate-blocking | Accept reproduced finding. `boundaries.test.ts:17–31` scans `from` syntax only. A temporary production dynamic import executed a fixture while all three boundary tests passed. No actual fixture leak exists in the unmodified candidate. Correct import coverage/resolution and add the demonstrated negative case before using this guard in integration. |
| F4: helper swallows audit/list failure | W3-05 / P2, gate-blocking | Accept reproduced finding. `tools/proof.py:97–101` discards child return values; two exit-1 audits yielded helper exit 0. Preserve child logs and propagate aggregate nonzero status; prove all four audit exit combinations and failed list. Actual recorded audit commands did pass; their evidence is not invalidated. |
| F5: unsupported ESLint 9 | P3, non-blocking maintenance item | Accept disclosed limitation. Keep a temporary proof-only disposition; no incompatible forced ESLint 10 upgrade. Resolve compatible maintenance before production/release. |
| F6: Git-normalized text hashes differ | P3, original ambiguity resolved by this parent ledger | Agree with diagnosis. Canonical original-byte target is the immutable ZIP; both Git/checkout identities are now explicit. New handoff must declare and verify its byte policy, preserving the old archive. No historical evidence rewrite. |

Axe incomplete contrast observations need explicit Claude-05 disposition/local measurement requests; a full screen-reader/device/V1 certification is not a W3 prerequisite. The independent review also confirms exact contract/type agreement, useful no-JS routes, honest content, zero world/backend implementation and scoped viewport/focus checks. Its remaining device/screen-reader/real-zoom/complete-contrast limits stay NOT RUN, and its G1 hazards (static sound label, unavailable entry, A1-only dependency guard, preview noindex, structural rather than approval-enforcing asset schemas) are future integration constraints, not requests to implement G1 now.

## BLOCKING DEFECTS

Severity is impact; gate blocking is stated separately. P0 = confirmed critical security/data-loss or equivalent; P1 = high-impact proof failure or required gate evidence missing; P2 = bounded medium issue; P3 = low/cosmetic. Missing review is an evidence gap, not an observed implementation vulnerability.

| ID | Severity | Blocks | Closure |
| --- | --- | --- | --- |
| W1-01 | P1 | W1/G1 start | Correct nested transforms; native/export agreement; door and required props in intended positions |
| W1-02 | P1 | W1/G1 start | Executed geometry-derived sweep/path/turn measurements and logs on corrected hashes |
| W1-03 | P1 | W1/G1 start | Corrected coarse anchor composition, camera coverage and documented mobile control area |
| W1-04 | P2 | W1 acceptance, with P1 findings | New exact-revision Gemini review; report statistics reconciled; Claude-13 review |
| W2-01 | P1 evidence gap | W2/G1 start | Claude-01 + Claude-13 reviews of pinned W2-F1-r2; parent disposition of findings |
| W3-01 | P2 | W3/G1 start | Matched security patch + real lockfile + required regression evidence + advisory disposition |
| W3-02 | P1 evidence gap | W3/G1 start | Claude-01/02/05 reviews on final corrected hashes; close proof-blocking findings |
| W3-03 | P2 | W3/G1 start | Count all initial JS, including preloads; correct summaries; negative budget case |
| W3-04 | P2 | W3/G1 start | Detect dynamic/side-effect/aliased fixture and forbidden contract imports; negative cases |
| W3-05 | P2 | W3/G1 start | Propagate audit/list child failures and preserve their records; fault-injection matrix |

**No P0 is established.** Announced upstream severity is not proof that this private candidate is exploitable. Do not downgrade a reproduced geometry failure into final-art backlog, or upgrade every unimplemented V1 feature into a feasibility blocker.

## NON-BLOCKING DOWNSTREAM ITEMS

| Item | Disposition / owner |
| --- | --- |
| W1 coarse meshes, detailed foliage/fabric/keys, PBR finishing | P2 polish; B3/Gemini-2 after G1; preserve corrected envelopes |
| Blender/WebGL light and color parity | P2; later material sample/runtime validation; no final-art approval here |
| Gemini suggestion to use UnrealBloomPass | Optional technique, not an adopted architecture requirement; assess against browser budgets later |
| Gemini suggestion for a dynamic monitor launcher in G1 | Full launcher belongs to C2; G1 only proves monitor/camera/export feasibility |
| W2 reverse-cancel velocity discontinuity; unimplemented blend tuning | P2; B4/B5 CharacterDirector, while immediate navigation cancellation remains binding |
| Generic mannequin, mitten hands, remaining V1 clips and likeness | B4/user art approval; deliberately outside current proof scope |
| ESLint 9 maintenance status | P3; disclosed temporary proof limitation, compatible-tooling correction before production/release |
| Full physical mobile/Safari/Firefox, screen readers, zoom, sustained thermal/performance budgets | Later C3/release evidence; Chromium emulation/axe does not complete them |
| Backend/auth/contact, verified project/identity/resume content, publication rights, restore/release | Assigned later platform/release gates; retain honest unavailable/empty states now |
| Unknown reference rights | Reference-only use is not a runtime publication license; asset publication review remains later |
| Proof report/editorial numbers and timestamp/line-ending bookkeeping | P3 where fully explained by the new byte ledger; do not rewrite original evidence |

W2's prescribed identity placement, paired clocks, stationary caster base, subtree removal and no duplicate desk are future G1 invariants. For the current W1 graph, recursive `chair` removal includes spokes/casters omitted from the flat name list; remove the resident subtree and dispose/rename the leftover W1 `chair-root` locator before adding the W2 root. Confirm the revised W1 hierarchy after correction. No combined scene was built here.

## ACCEPTED REVISION TABLE

**Accepted set: empty.** Rows identify the authoritative candidates examined, not approvals. All binary/archive SHA-256 values below are identical in Git and the checkout.

| Proof / candidate at `fe1a40f797ce3ec839939c09a1857b797c197269` | Exact identity | Parent decision | Accepted revision |
| --- | --- | --- | --- |
| W1, no reliable maker revision label | `delivery-W1.zip`: `2c49fc066fcb595cf20865f53bc7145828dd7c508c25404183d1d89381b50dd2` | REWORK | None |
| W2-F1-r2 | `w2-avatar-proof-r2.zip`: `74bdcfe5b8402be0753afb7d05715172a053c208fe95d2e31c0da0c1598ef6c2` | INSUFFICIENT EVIDENCE | None |
| W3/A1 current | `W3-A1-handoff.zip`: `8958718285b491fefba811b260a3197f536baeedfa5f4f584b785f2024375b6b` | REWORK | None |

| Core file / tree | Identity |
| --- | --- |
| W1 generator | SHA-256 `99207efa9d86663c21df99dedae3b2be8d94f34e420a1784feb376a9c17758ad` |
| W1 native | SHA-256 `2dbb40a85e183bef974e094ac7c9748dd7379fcb11a88b8cf99f9959be5dd30b` |
| W1 GLB | SHA-256 `d47d10e0b38e357041a4a69723944eec5981c85a4f8d41816a936fd5f9610c88` |
| W2 generator | SHA-256 `13228064b326737142d13e95ec408628c52e26b4c72589f49efe506f412d8685` |
| W2 native | SHA-256 `72f791644f488a7e15dfdcd7ed3c951abead9873223daf0ea9fdf176a2322360` |
| W2 avatar GLB | SHA-256 `eba336b923e7fd8caf20fc006221934bd820f1f61812a0965833c109d7525511` |
| W2 fixture GLB | SHA-256 `7c9b2358b898a26b40baae799506cf3be26a54019f7e14826b7d3b2c9a94a4d7` |
| W3 source | Git tree object `858c425cf2a48407245c9e65e4f08bf5b7908c36` (Git SHA-1, not a SHA-256 file digest) |
| W3 lockfile | SHA-256 `e288f6c1270b2e17681bd807b6eafa5ad2b442913f7d2a053db925aec28c60cf` |

W2 manifest: original archive/checkout SHA-256 `04befb4baf1facd47e9f2dd826e144cca6f1cddaf4c449e4f0d65dc5ace99db8`; Git blob SHA-256 `704c505d4cb5564337f92f5f961816edf7f60295629dbabf92d4be8e86a36ba9`. W3 manifest: original archive/checkout `4e1ae456642460221c68ad548ce1ec210677f42fc1cf4ca2f70bd94335b533e1`; Git blob `85bc05a2110914c863c3eec678abc45c5d266d0f44457e1a3eb5e4b5d0a8a5f6`. Review Git blob digests: W1 `70e7243cd089934bf7c378c4b82b942c1640e161ca389052daf1c95ad61456ec`; W2 `ba414189baac8191f6ab7284d02fd3f8bf131f73b99b888a0279f8ce2ceeb169`.

New W3 independent review at `cb843a3e5fc0f1a03ccd1dfb845e810756085837`: report SHA-256 `882c8386049cdae8f91fcca843c7d8ccb9d6e5dca644c3164d8cf0ad7711f94c`; review-manifest SHA-256 `2632eb8e6182e23c00e0bef452c6359605905fe5613d9fecfcef6ee46958af4d`. It targets the original `fe1a40f` source/lockfile above; it is evidence, not an accepted replacement source revision.

## STALE LIVING-DOC CORRECTIONS

The accompanying coordination changes correct current statements in README, START_HERE, work-order board, account-prompt status/next wave, local-tool status, product status/repository-owner row, engineering/art status and platform setup. They identify returned work and actual reviews, the live GitHub repository, these parent decisions and exact next packets. Historical subsections and all proof/reviewer evidence remain unchanged. Product requirements, F1 dimensions, schemas, future feature scope and acceptance criteria are unchanged. No report is rewritten to pretend a pre-Git check happened in Git.

The September 30 proof-review table remains a dated historical audit, linked from the current record rather than rewritten. Browser-prompt/reference audits remain successful audits of their own narrow scope, not independent approval of W1/W2/W3. Current model preference supplied by the user is Astra for this reconciliation, then Sol High/xHigh for ordinary coordination; Astra returns for architecture disputes, major contract changes, security-critical gates and release candidate. This record does not claim to switch the running model.

## EXACT NEXT PACKETS

See [bounded work orders](../reconciliation-packets/2026-10-01-next-packets.md) for ownership, pinned inputs, outputs, verification and review criteria.

1. **W1-CORR-01 / Gemini-1:** correct parent transforms, real clearance evidence and camera proof; return `W1-F1-r2` in a new revision directory. Then **W1-REV-02 / Gemini-3 + Claude-13**, explicitly addressing contradicted findings on new hashes.
2. **W2-REV-01 / Claude-01** and **W2-REV-13 / Claude-13:** review existing W2-F1-r2; no maker motion rewrite requested. Prepared source/evidence text packets are linked in the work orders. They are locally issued and **not externally dispatched**.
3. **W3-CORR-01 / GPT-1:** patch matching Next/config, correct preload accounting/import guards/helper exits, declare new handoff byte policy, regenerate lockfile externally, and rerun A1 plus negative checks; return `W3-A1-r2`. Then **W3-REV-02 / Claude-01/02/05**, with independent retest evidence for F1–F4, on those final hashes.
4. **PARENT-RECON-02:** adjudicate each returned finding, verify final bytes and required reviews, record separate ACCEPT decisions or further bounded defects. Only then issue an actual G1 assignment with the three accepted revisions and owned output root.

These proof corrections/reviews may proceed independently. Their names are assignments, not a claim that external accounts are running. The parent has not implemented maker corrections or started G1.

## G1 LOCKED

Unlock requires corrected W1 evidence and new reviews; completed W2 interface/provenance reviews; W3 dependency and F2–F4 evidence-tool corrections with completed reviews/retests; and explicit parent ACCEPT entries for all three exact final revisions. A later G1 assignment must pin that accepted set and name its maker/non-maker reviewers. G1 execution and G1 completion are separate gates. No conditional/speculative integration is authorized.
