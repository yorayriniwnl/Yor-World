# FINISH-00-R2 asset and animation binding contract

Date: 2026-10-10. Status: Parent design draft for independent contract review and actual Astra advice. This document specifies future FINISH-B1-R2 maker outputs and FINISH-C2 consumers. It does not accept existing art, prove visual fidelity, or assert that the successor bytes exist. Parent retains final architectural and acceptance authority. Historical FINISH-00, B1, IA and RC6 bytes and rulings remain unchanged.

Source inspected: HEAD `f62a43c5e71c00dcb89e28275ea81d842167db80`, canonical `app` tree `42ea29ec235225046a75959eb19eb386ac2f821d`. The final R2 manifest binds this document together with the other R2 documents; dispatch requires the Parent ruling and independent review, not this draft alone.

## 1. Findings and selected architecture

| Actual finding | Successor decision |
| --- | --- |
| B1 has `production-room-full.glb`, lower-case door/prop hooks and no twelve literal FINISH-00 required names | Author conforming exports and literal nodes below in a new root. Do not accept similar names or silently alter old contract/art. |
| Door animation accessor range is 0.0416666667–3.5416666667 s (1/24–85/24); exporter maximum duration is 3.5416666667 s, source rotation 85° | R2 uses the previously permitted direct hinge transform, exactly 0–90° over 2.5 s. No door animation clip is exported in the runtime room. This removes competing mixer ownership and the unintended authored close segment. |
| Claimed hinge (-1.2,0,1.8) differs from actual hinge (-1.65,0,1.8) | Keep the actual intended hinge line (-1.65,0,1.8); -1.2 is the closed panel center, not the hinge. Verify evaluated world geometry and clearances. |
| Actual leaf local translation (-1.2,1.05,1.8) is beneath hinge (-1.65,0,1.8) | The two local transforms add. R2 must author correct local child offsets; literal renaming alone is insufficient. Closed panel center must be (-1.2,1.05,1.8), with local leaf center (.45,1.05,0). |
| All eight resident and fixture clips exist with correct sampler durations; resident has 26 joints, not the report's 14 | Retain actual skeleton, full eight-clip set and paired fixture convention. Correct report/metadata and prove deformations in browser. |
| Actual chair/resident roots are (.30,0,-.36); generator uses F1 4.2×3.6×2.8 m | Preserve these correct anchors/dimensions. Do not move conforming geometry to erroneous maker prose. |
| Full/mobile GLBs are identical 919112-byte files | Shared geometry is permitted only when described and measured honestly. R2 uses one set of geometry URLs across high/medium/low, with runtime tier controls. No false mobile LOD claim. |
| Optional IA, old production groups and full room overlap | One essential visible room owns all catalog base props; no legacy IA in successor sessions. Optional GLTF adds detail only. |
| Browser views are overexposed despite valid GLBs | Correct owned art/harness rendering and submit matched captures; file/hash/validator checks are not visual approval. |

Conforming exports preserve FINISH-00's documented architecture and keep the maker responsible for exporting usable hierarchy. A versioned runtime synonym/transplant adapter would preserve incorrect pivots, multiply old/new mappings and risk a second visible room or second action owner. It is therefore not selected. C2 maps exact nodes to existing interaction IDs; it does not invent a parallel controller or ninth resident clip. This art/runtime/loading compatibility decision requires Parent's actual Astra review before the R2 ruling. No model invocation is asserted here.

## 2. Files, IDs, tiers and visible ownership

Maker write root is only `deliveries/FINISH-B1-R2/`. Filenames below are relative to that root. Logical asset IDs and interaction IDs are separate namespaces.

| File | Manifest group ID | Ready boundary / tiers | Exclusive visible ownership |
| --- | --- | --- | --- |
| `assets/room.glb` | `group-a-essential` | Essential; high/medium/low | Single complete environment: room-shell, desk, door, monitor, gaming reference props, all catalog base props, base lighting/materials and named motion hooks. No resident mesh or chair mesh. |
| `assets/resident.glb` | `resident-avatar-production` | Essential; high/medium/low | One resident rig and one resident-body skinned mesh. |
| `assets/fixture.glb` | `fixture-chair-production` | Essential; high/medium/low | One occupied chair: swivel upper assembly and static base; no exported proof desk/floor/keyboard/monitor. |
| `assets/group-b-props.glb` | `group-b-props` | Late optional; high/medium only | Incremental decorative details under `Optional_Detail_Root`; no shell, desk, chair, resident, door, base project object or required hook already in room. Failure preserves all base actions. |
| `assets/on-demand-projects.glb` | `on-demand-projects` | Optional on explicit project focus; high/medium only | Transient line/diagram/waveform detail under `Project_Effects_Root`, never another PC/model/camera/microphone base. Navigation does not wait past 1.4 s for it. |
| `assets/textures/deskmat-topography.png` | `deskmat-topography` (loading descriptor; existing v1 manifest remains GLTF groups) | Late optional texture; all 3D tiers subject to decoded memory budget | Only map of `desk_mat` / `Desk_MatTopography`. |
| `assets/textures/monitor-wallpaper.png` | `monitor-wallpaper` (loading descriptor) | Late optional texture; all 3D tiers subject to decoded memory budget | Only map of `monitor_screen_center` / `Monitor_ScreenWallpaper`. |

No GLTF, optional texture, decoder or audio request in static mode. High/medium/low use the same essential filenames and may use byte-identical geometry, explicitly recorded as shared geometry. C1/C2 retain the allocated runtime effects/DPR/shadow/material-quality controls; C3 verifies that accepted tier behavior and mobile budgets with its framing/layout changes. C3 has no implicit permission to rewrite those quality paths. A necessary new performance change receives a separate exact Parent packet. If shared geometry cannot meet mobile ceilings, return a Parent amendment proposal for specific new LOD files and unchanged semantic hooks; do not publish a misleading `mobile-room-lod.glb` alias as optimization.

`room.glb` includes low-cost visible base versions of every required catalog object and hit target. Optional enhancements are not a prerequisite to essential readiness. A pending optional detail can show unavailable detail while its content route and base action remain functional. Exactly one room-shell, desk, resident, chair-root, chair-base, door leaf, main monitor and each project base exists in the assembled scene. Old `production-room-full`, `mobile-room-lod`, legacy group chunks and `interaction-assets[-mobile].glb` are not mounted or fetched for this successor. Historical assets stay in retained releases.

The [runtime lifecycle](01-runtime-lifecycle.md) governs transfer, abort, session identity and disposal. Registration must give `WorldInteractionBinding`, material quality and low-quality batching the current scene without stale duplicate targets. Required moving hooks, independently mutable LEDs, live clock, deskmat and wallpaper targets are excluded from static merged batches or have an explicitly validated affected-batch refresh. The group-b optional root cannot acquire a second camera or character owner. The [exact ownership table](04-path-ownership.md) authorizes C1/C2 sequential source consumers and C3 later layout.

C1-R2 alone continues testing the canonical three existing essential model URLs and late deskmat/wallpaper, with legacy `interactionGltf=null` explicitly transitional. C2 changes the candidate's descriptors to this successor set after accepted B1-R2/C1-R2 inputs. This is a staged transition, not an assertion that C1-R2 implements future art bindings.

## 3. Coordinate, hierarchy and rest-pose contract

Runtime units are meters, Y-up, front +Z, rear -Z. Blender Z-up converts once on export; GLTF scene containers mount at identity (translation zero, quaternion [0,0,0,1], scale [1,1,1]). All mandatory names are unique within their owner export and unique in the assembled scene. No automatic centering, scaling or root-motion compensation may hide a bad export. Float position tolerance is 0.0001 m, quaternion component tolerance 0.00001; these tolerate serialization, not redesign.

Room interior envelope: X[-2.1,2.1], Z[-1.8,1.8], Y[0,2.8]. Rear wall interior at Z=-1.8; entrance extension is outside the front wall and reported separately from interior dimensions. Desk top footprint 2.6×0.8 m, center X/Z=(0,-1.15), upper surface Y=.75. Chair-root and resident world/rest T=(.30,0,-.36), identity quaternion, unit scale. Preserve actual conforming F1 locators; assets do not move to wrong prose values. Compare bound geometry, not only empty locators.

`Room_Root` is identity and owns identity `room-shell`, `desk`, `door`, `monitor` and static organizational groups. The exact tree is `Room_Root/door/{Door_Frame,Door_Hinge/Door_Leaf}`: `Door_Frame` and `Door_Hinge` are siblings under `door`. `Door_Frame` has identity translation/quaternion/unit scale and owns static frame jamb/header geometry. `Door_Hinge` has local/world rest translation T=(-1.65,0,1.8), identity quaternion and unit scale; it owns `Door_Leaf`. Handle meshes are children of leaf, never the frame. `Door_Leaf` local T=(.45,1.05,0), identity quaternion, unit scale, mesh panel width .88 m / height 2.08 m / thickness .04 m. Its evaluated closed world center is (-1.2,1.05,1.8); opening clearance is .9×2.1 m nominal, including frame tolerances. Door rotation is local +Y about the hinge, not about leaf center. `door-hinge` is not a second exported synonym; C2's existing logical anchor maps explicitly to `Door_Hinge`.

`fixture.glb` has two scene-root siblings: `chair-root` and `chair-base`, both rest T=(.30,0,-.36), identity quaternion/unit scale. Upper seat/back/arms descend from chair-root; wheels/pedestal descend from chair-base. `Chair_Seat` local rest T=(0,.42,.025), identity quaternion/unit scale, replacing old chair-seat literally. Upper swivel is driven only by paired clips through CharacterDirector; chair-base stays static. Room may carry a uniquely named `chair-mount` locator at F1 root, but must not export another `chair-root`. No runtime mounting offset is applied to resident/fixture scene containers.

`resident.glb` keeps `resident` and `resident-body`, skin named `resident`; resident root T=(.30,0,-.36), identity quaternion/unit scale. The exact 26-joint hierarchy, inverse bind matrices and local rest TRS are retained from the inspected B1 `resident-production.glb`, SHA-256 `ee50b195c4fd9036036c339115d1b076341018e9f70125720fa96cde0f692d0a`. That hash-bound skeleton is the rest-pose reference, not proof of likeness or future export identity. `body-turn` is resident's child, rest quaternion approximately [-.70710677,0,0,.70710677]; do not zero this legitimate converted skeletal rest rotation. `foot.L`/`foot.R` are separate resident children. Pelvis descends from body-turn; spine→chest→neck→head; each clavicle→upper-arm→forearm→hand→thumb/index/fingers; thigh→shin. Joints: body-turn, pelvis, spine, chest, neck, head; clavicle.L/R, upper-arm.L/R, forearm.L/R, hand.L/R, thumb.L/R, index.L/R, fingers.L/R, thigh.L/R, shin.L/R, foot.L/R. Maker must output the complete local/world rest and bind-matrix inventory derived from successor bytes and compare it to this reference. A new skeleton requires another Parent amendment; silently retargeting these clips is forbidden.

All newly introduced moving empty pivots have identity local rest quaternion and unit scale. Reparenting geometry beneath a pivot must preserve its intended world rest placement by computing local offsets; copying world coordinates into a nonidentity translated parent is prohibited. Correct the existing repeated-coordinate defects before art validation. Static geometry/material bounds are measured from the successor bytes at every supported camera; unchanged locator names alone cannot pass.

## 4. Door and eight paired character clips

The successor room has zero door mixer clips. Sole door-transform owner is EntranceCoordinator, using `Door_Hinge` explicitly. For entry elapsed t∈[0,2.5], local yaw is (π/2)×s(t/2.5), s(u)=3u²−2u³. Start yaw=0; end yaw=π/2; hold open through HOME. Resident notice begins at t=2.5 under the same entrance timeline; the sequence must finish within 8 s of decoded essential readiness. Camera crosses the aperture only after actual panel sweep clearance; door/frame bounds and camera frustum clearance are measured across the whole path. This overrides the illustrative earlier storyboard's .8 s door timing for this successor only. The prior Action_Door_Entrance_Swing (85° with closing segment) is neither rescaled nor played concurrently.

Skip/Escape settles HOME, door open, coding pose within one frame/≤50 ms. Exit/navigation/disposal aborts timeline and relinquishes scene objects; returning HOME restores open safe state. Explicit replay resets the visible door closed before starting the new entry timeline after confirmation. Reduced motion settles open HOME without swing/travel. Decorative pause does not block the explicit finite entrance; hidden-tab suspension does not accumulate elapsed animation delta. Only current transition/session may mutate objects.

Both resident.glb and fixture.glb export exactly the eight named clips below (no suffix, duplicate or ninth action). GLTF sampler range starts at 0; maximum input time is the listed duration, tolerance 0.000001 s. Authoring is explicitly 30 FPS with inclusive samples at frames 1 through 1+30d; GLTF is slid to zero and checked from actual accessors. Runtime registers all eight on both mixers and does not truncate to the old five-name CLIP_DURATIONS map.

| Clip | Authoring frame range | GLTF time range / duration | Behavior / paired chair |
| --- | --- | --- | --- |
| coding_idle | 1–181 | 0–6.0 s | Typing/breathing seamless loop; seat and roots stable. |
| mouse_idle | 1–61 | 0–2.0 s | Hand reaches actual mouse then returns safely; chair remains in coding yaw. |
| notice_visitor | 1–19 | 0–.6 s | Stop typing, clear hands, notice door; paired chair does not jump. |
| turn_to_visitor | 1–37 | 0–1.2 s | Body/chair coordinated 0→35° visitor yaw; hand clearance precedes rotation. |
| greeting_nod | 1–28 | 0–.9 s | Friendly nod at 35° yaw; no discontinuity from turn endpoint. |
| return_to_work | 1–40 | 0–1.3 s | 35→0° body/chair yaw, hands return to actual keys. |
| attention_glance | 1–37 | 0–1.2 s | Small head attention response; no chair swivel. |
| breathing_idle | 1–121 | 0–4.0 s | Seated breathing seamless loop, no typing or chair drift. |

Avatar tracks target only resident and the listed 26 joints; paired fixture tracks target only chair-root rotation. Constant chair tracks are valid for clips without swivel. `resident-body` remains skinned to the pinned skeleton. `Chair_Seat` is not independently animated against the occupant. CharacterDirector is sole full-body/chair action owner; attention and small chair-posture reaction reuse these approved assets and bounded procedural offsets on that owner, not a ninth clip. Greeting duplicate/coalescing/cooldown and cancellation follow the interaction catalog (7 s greeting cooldown; chair adjustment 5 s cooldown). Finite actions use compatible seam poses; idle variants safely return to coding pose. Coding idle must be activated on the first render rather than blocked by an already-equal currentClip sentinel.

Maker motion proof samples actual exported deformation at ≥60 Hz, including loop seams, every transition, complete door sweep, 20 greeting/return repetitions, cancellation at start/middle/end of each finite clip, skip, project-navigation interruption and re-entry. Measure no unintended root translation (>0.0001 m drift), steady feet/seat contact, hands outside desk collision volume during swivel and ≥.15 m clearance before turn; distinguish intended seat tangency from penetration. Returning hands must align to the final room keyboard/mouse, not merely old fixture proof geometry. Native source and browser playback checks are separate outcomes.

## 5. Catalog base bindings and physical hooks

Every table target belongs to essential room.glb unless resident/fixture is named. Use the existing 25-row interaction catalog and existing controller/registry in `app/src/features/experience/{controller,interaction-registry}.ts`. No absent alternative experience/experience.ts or room/interaction-registry.ts is created to satisfy old path prose. C2's binding register must contain one entry per catalog row, with target names, visible parent, hit proxy, readiness and DOM equivalent. `candidatex-launcher` and `project-shortcuts` are DOM/monitor outcomes, not extra exported project bases. CandidateX remains unpublished until the existing verification/owner conditions pass.

| Catalog IDs | Exact visible target / required child | Hook and ownership |
| --- | --- | --- |
| entrance-door, door-inside | door / {Door_Frame, Door_Hinge→Door_Leaf} | Frame/hinge siblings; common physical door; inside action opens replay confirmation. Separate labels/hit surfaces, not another door. |
| resident | resident / resident-body, body-turn, head (resident.glb) | Paired eight-clip director. |
| chair | chair-root / Chair_Seat, chair-base (fixture.glb) | Bounded posture response from CharacterDirector while idle, blocked during turn. |
| wall-painting | wall-painting / painting-pivot→painting_frame, painting_canvas | Hanging pivot world (2.08,1.75,-.40), tilt ≤6°, damp to neutral ≤1.2 s. |
| hidden-yor-mark | hidden-yor-mark, sibling of painting-pivot beneath wall-painting | Fixed to wall behind painting; initially hidden; reveal only when exposed. It must not rotate with painting. |
| main-monitor | monitor / monitor-surface, monitor_screen_center | DOM launcher alignment; monitor-surface world (0,1.05,-1.30), no tiny-text-only content. |
| candidatex-launcher | launcher DOM control / monitor | Illustrative static evidence motif; no new unverified link. |
| project-shortcuts | existing DOM project rail | Published-project navigation has no asset/effect readiness dependency. |
| keyboard | keyboard_body / key_response_active→keycaps_main | Key pivot world (-.08,.781,-.98), downward local Y stroke ≤.002 m; keyboard rest body center (-.08,.765,-.98); keycaps intended world (-.08,.778,-.98), local offset (0,-.003,0). |
| mouse | mouse_body | Body world (.24,.768,-.98); wake launcher, no parallel camera owner. |
| research-books | research-books / Books_Stack→book_vol_1..5 | Books_Stack pivot world (.45,2.27,-1.68), bounded ≤.02 m local +Z nudge; restores rest; opens Research HTML. |
| plant-leaves | plants / Plant_Leaf_01, Plant_Leaf_02 | Each is a genuine mesh-bearing pivot hierarchy with visible leaves, not an empty fake alias. Leaf1 world (-1.65,.65,.85), Leaf2 (-1.52,.72,.78), identity pivot rotation; ≤6° local Z deflection, damp settle ≤500 ms; RM static response. |
| helios-pc | helios-pc / PC_Fan_Group, Helios_Network_LED | Fan center world (1.05,.99,-.914), local spin axis +Z (fan geometry oriented to axis); LED separate editable emissive material. Network motif is temporary lighting/lines, then Helios route. |
| zenith-model | zenith-model / Zenith_Core | Core pivot world (.70,.805,-1.388); identity pivot with separate oriented geometry; bounded local Y/Z rotation and energy-trace motif, then Zenith route. |
| ai-real-camera | ai-real-camera / Camera_Lens_Ring, Camera_Status_LED | Lens pivot world (-1.45,1.77,-1.635), identity pivot, geometry faces +Z; bounded focusing rotation around local Z; no flash; classification motif then AI vs Real route. |
| talks-microphone | talks-microphone / Mic_LED | LED world (-.62,1.11,-1.08), material Project_MicRedLED; temporary emission/waveform acknowledgement then Talks route. No capture or recording implied by LED. |
| desk-clock | desk_clock_chassis / Clock_Face | Chassis world (-.50,.81,-1.14); face child local (0,0,.026), intended world (-.50,.81,-1.114), unit scale/identity rotation. |
| speakers | speaker_left_cabinet, speaker_right_cabinet / Speaker_LED | Round visible pair; editable LED at world (-.68,.88,-1.17), reflects actual audio state, not desired opt-in alone. |
| desk-lamp | lightbar_chassis, Light_TaskDownlight | Separately switchable local lighting, not permanently baked into base texture. |
| window-blinds | window_frame / blind_slat_1..12 | World centers (-2.12,.95+.10(i−1),-.60) for i=1..12; identity rest pivot and unit scale; slats' long axis local Z; rotate local Z 0→π/2 for closed preset and separate validated fill change. |
| contact-phone | contact_phone_body, contact_phone_screen | Phone center (.45,.755,-.92); opens actual Contact form. |
| skills-board | pegboard_system / skills-board | Sparse added labeled hit area; preserve actual controller/headset grouping; verified skills HTML, no percentages. |
| certificate-frame | certificate_frame | World (-2.08,1.85,.30); decorative until verified credential exists; no invented certificate text. |
| about-personal-object | about-personal-object | Neutral labeled placeholder: identity pivot world (.72,.82,-.84), mesh within .10 m on each axis. No claim of user-approved personal object. Production personal-object acceptance remains awaiting user review. DOM About stays functional. |

For all world positions above, each moving pivot is a direct child of an identity logical base/group unless the explicit child offset is specified. Geometry descendants use local offsets that reproduce intended world rest bounds. Logical bases helios-pc, zenith-model, ai-real-camera and talks-microphone stay identity beneath Room_Root; pivot coordinates are therefore exact local coordinates too. Books volumes retain intended world placement through local offsets. Clock and LED materials must be unique owned instances before runtime mutation; changing Mic_LED cannot tint unrelated geometry. C2 captures original local transforms/material state before every finite response and restores it on cancellation, navigation and disposal.

Clock material `Clock_CyanDisplay` binds only `Clock_Face`, with readable UV face and a runtime CanvasTexture replacing any illustrative 17:49 source texture. Format is the persisted 12h/24h preference; civil time is Asia/Kolkata, explicitly labeled. Decorative pause freezes decorative movement while visible civil time remains accurate; hidden-tab resume recomputes current civil time before presentation, without replaying missed ticks. Bitmap examples may demonstrate style but are not live time. Canvas texture is session-owned, updated only when displayed civil minute/format changes, and disposed exactly once.

Project effects are optional enhancements to existing finite presentation, ≤1.4 s total delay and immediately cancelable. Optional GLTF nodes `Helios_Network_Path`, `Zenith_Energy_Path`, `AI_Classification_Motif`, `Talks_Waveform` descend from Project_Effects_Root and are inactive by default. CandidateX motif is an illustrative monitor layer; it never bypasses unpublished-state checks. RM uses static icons/diagrams and direct navigation. No persistent lamp/blinds/sound override survives focus cancellation. Base nodes and DOM outcomes work without optional effects.

Deskmat and wallpaper textures use sRGB color space with GLTF UV convention (`flipY=false`); they do not change bounds or hit testing. Base room includes inexpensive fallback maps/colors/UVs. Optional texture failure leaves base materials intact. Late success applies only to the current session's named material consumers, including low-tier derived materials; quality upgrades/downgrades never restore a stale map. Material quality/batching register each late mesh/resource before applying current tier. Loader/lifecycle ownership is defined in the runtime contract; no independent TextureLoader leak, cloned unowned map or duplicate disposal is allowed.

## 6. Budgets, visual and evidence boundaries

Retain old packet export limits: room.glb ≤1.5 MB (1,500,000 bytes), resident.glb ≤800 KB (800,000 bytes); fixture.glb ≤524,288 bytes as its bounded existing export allocation. All delivered textures ≤1.5 MB (1,500,000 bytes) combined, including embedded copies counted once by actual resource identity for inventory and counted by request transfer where fetched. This document makes decimal packet limits explicit; overall validation uses MiB as specified. Entry asset totals are ≤6 MiB desktop and ≤3 MiB mobile, including all essential embedded textures/buffers; full optional allocation ≤14 MiB desktop / ≤7 MiB mobile. Other 3D JS/decoder/audio allocations remain unchanged. Essential group+resident+fixture limits fit the mobile entry allocation but do not themselves prove mobile performance.

Combined desktop/mobile ceilings: visible home triangles ≤300k/140k; draws including effects and shadows ≤120/80; asset-derived decoded GPU estimate ≤160/80 MiB; median frame time ≤18.2/33.3 ms and p95 ≤25/45 ms. Record actual renderer.info triangles/calls, texture/buffer accounting and measured frame samples. A hardcoded 60 FPS or DRAW CALLS OK label is not evidence. Measure cold/warm cache, optional overlap, decoded residency and entry time on the validation plan's network/device profiles. Exact full-service/live G7 thresholds remain in the release protocol; local art proof does not close G7.

Every supported camera must expose finished geometry: hallway, entry, reveal, greeting, home-desktop, home-mobile, monitor, pc, energy, scanner, microphone, about, contact, plus reverse-doorway evidence. Use canonical CameraDirector positions/FOV as inputs. C2 explicitly owns narrow retargeting of existing energy/scanner/microphone/contact presets to the actual Zenith_Core (.70,.805,-1.388), Camera_Lens_Ring (-1.45,1.77,-1.635), microphone (-.62,1.05,-1.08) and contact_phone_body (.45,.755,-.92) centers; retain safe position/FOV and prove visibility/collision clearance. It also explicitly adds the frozen reveal/greeting names when missing from the actual preset map: reveal uses the existing home-desktop position/FOV with desk/resident composition; greeting uses the same safe position/FOV looking at the evaluated resident head during the visitor pose. Bind the exact resulting vectors in the C2 candidate inventory and receipts. No art maker edits cameras; a position/FOV change beyond this approved narrow contract requires a Parent amendment before it is accepted. C3 later chooses initial home-desktop/home-mobile framing from actual viewport without changing C2 object-target or entrance ownership. Mandatory matched captures: reference-matching desktop home, mobile home, monitor detail, entry, reverse doorway; also each project focus and greeting contact. Preserve white/ivory drawer desk, blue-and-white chair, actual hexagonal pink/lilac lights, cyan fill, warm lightbar, round speakers, blue floor, shelves/plants, console, PC/pegboard/headset/controllers. Unseen additions do not crowd or replace these anchors.

Return native Blender source/export receipts using installed Blender 5.2.2 LTS and actual browser playback receipts with versions/commands/exit codes/source and output hashes. Declare all source lineage including reused B4 rig/generator and prior environment sources. Raw Blender frames, raw WebGL canvas frames and DOM-composited browser images are separately labeled and bound; no DOM overlay is presented as framebuffer output. Record viewport, DPR, camera vectors/FOV, renderer/tier, tone mapping/exposure/lights, browser/OS, GPU/device, network/cache and loaded asset hashes per capture. Compare the same camera in Blender/browser and retain honest reference deviations. Fix clipped exposure instead of masking it in comparison compositing.

Independent validator/node/hash and authored-script inspection can PASS without visual/browser/device approval. User likeness/outfit/hair/face/signature/personal-object review remains required, with unverified identity honestly labeled. Reference-image rights remain **unknown**; references are design inputs, not licensed textures/meshes/screen artwork. Newly generated assets need their own source/license ledger. Physical iPhone/Safari and mid-range Android/Chrome thermal/performance runs remain NOT RUN until executed on actual devices. A valid GLB or headless image is not their substitute.

## 7. Exact B1-R2 delivery and C2/I1 boundary

| Required artifact under deliveries/FINISH-B1-R2/ | Purpose |
| --- | --- |
| assets/room.glb; assets/resident.glb; assets/fixture.glb | Exact essential successor exports. |
| assets/group-b-props.glb; assets/on-demand-projects.glb | Disjoint optional detail/effects, validated separately. |
| assets/textures/deskmat-topography.png; assets/textures/monitor-wallpaper.png | Exact late optional color maps. |
| source/blender/models/room.blend; resident.blend; fixture.blend; optional-details.blend | Editable native source files, actual generated/saved bytes. |
| source/blender/scripts/build-environment.py; build-resident-fixture.py; export-assets.py; generate-textures.py | Reproducible maker source, exact 30 FPS and export settings. |
| source/harness/package.json; source/harness/lockfile; source/harness/index.html; source/harness/main.ts | Executable isolated playback/capture harness; lockfile uses real package-manager filename and actual resolved pins. |
| binding-inventory.json; rest-transforms.json; asset-register.json; candidate-asset-manifest.json; provenance.json | Every exact filename/group/logical ID/node/parent/local+world TRS/rest bounds/clip sampler range/duration/target/skin; triangle/material/texture/decoded memory/rights/lineage records. candidate manifest retains schema v1 group shape and valid URL policy. Texture descriptors are separate, not extra ad hoc manifest fields. |
| validator-logs/{export-validation,dimensions-anchors-check,rest-pose-check,clip-inventory,duplicate-ownership-check,browser-playback-evidence,budget-evidence}.json | Actual executed results with input/output/tool/command identity; measured geometry, ownership, intervals and budgets. |
| validator-logs/{native-export,browser-playback}.log | Actual command, versions, timestamps, exit codes and stderr, with redacted environment only. |
| captures/ and captures/index.json; captures/comparisons/ | Labeled native/canvas/DOM/reference camera capture inventory, animation/door interruption video, per-capture source identity and deviations. |
| report.md; input-hashes.json; output-hashes.json | PASS/FAIL/NOT RUN by requirement with receipts; input raw SHA-256; every output bytes/hash, deliberate self-exclusion documented. No claims based solely on generated filenames. |

Other baked maps may be embedded in room or placed under assets/textures with their exact list and hashes in the candidate inventory; they do not become separate optional loading requests implicitly. Maker must report missing required artifacts explicitly. Future output hashes are produced after implementation, never fabricated or demanded before maker generation.

B1-R2 maker only writes its new delivery root. Independent GPT #2 audits actual bytes/proof, then Parent decides art-input acceptance with limits. C2 consumes the accepted, hash-bound B1-R2 exports and accepted C1-R2 overlay in its isolated candidate on the unchanged app-tree base, as defined in the R2 ownership/dependency documents. C2 updates exact existing SceneIntegrator/CharacterDirector/EntranceCoordinator/WorldInteractionBinding and existing controller/registry consumers allowed by its packet; it does not alter accepted input deliveries or canonical app. C2 must test all 25 catalog rows, eight paired clips, door motion, optional fail/late-load/cancel, pointer capture/cooldowns, RM, Pause/audio independence and matched reference/browser output.

Canonical I1 integration happens later after accepted C2/C3/A2 and other listed predecessor gates. Only I1 maps accepted B1-R2 assets to `app/public/models/{room,resident,fixture,group-b-props,on-demand-projects}.glb`, textures to `app/public/textures/{deskmat-topography,monitor-wallpaper}.png`, and updates `app/public/asset-manifest.json` with actual successor hashes/revision and approved status supported by Parent ruling. Historical release manifests stay immutable. `approved:true` is not maker self-approval. This document does not write those canonical paths, accept current B1 bytes, or issue G7/whole-product completion.

## 8. Inspection ledger and unavailable proof

Actual local checks for this design contribution: PASS direct file reads and Python standard-library parsing of all seven B1 GLB JSON chunks (without modification), node/parent/local TRS, skin targets, sampler min/max and raw SHA-256; PASS actual main-reference viewing using view_image; PASS source HEAD/app-tree identity. NOT RUN native Blender rerun, new GLTF validator execution, browser playback, full world-space/deformed bounds audit, visual art acceptance, physical devices, maker-independent acceptance and successor export generation. Independent B1 report's validator/capture outcomes are attributed to that report, not relabeled as this contributor's execution.

Initially guessed filenames `finish-contracts/03-asset-bindings.md`, `completion-2026-10-10/b1-rework.md`, `WorldLoader.ts` and `asset-loader.ts` do not exist. Actual old contract is `00-contract-decision.md` plus `05-maker-packets.md`; actual prompt is `world-runtime.md`; actual loader is `AssetLoader.ts`. These guesses were resolved before contract authoring; no required asset input was inaccessible. Future B1-R2 bytes, exact successor command receipts, native/device capture runs and personal-object/likeness approvals are unavailable and assigned to the art maker/user/independent reviewer at their gates.

The following hashes are raw file SHA-256 computed locally for inspected inputs. They identify reference bytes, not future implementation or accepted art. The actual main-reference hash is `37adfb0ee344642798978e954a0cfc8d9715eac1b3ca4e5a84ab87a228c53362`; the old maker provenance lists a different hash. Its reference-manifest hash also differs from the actual bytes below. B1-R2 must correct these declarations and retain the original inaccurate provenance as historical input, without treating it as observed input identity.


| Input path | Raw SHA-256 |
| --- | --- |
| `AGENTS.md` | `06738f97b03662ccac542fc29f25b77e476d167600f78411f34eb4ff14f4a0c4` |
| `START_HERE.md` | `3c376b0033819f60bebb26964641a02ab5bb74330beecbbfc8c35e5a01f14587` |
| `docs/planning/delegation-and-work-orders.md` | `de3ecb22b80938155ac4e1e939d3fc501285aa43373596c465286e87a882bee2` |
| `docs/planning/account-operating-model.md` | `a8be4c2ee026a2b0950b0b0bd95943a249270668ace1de26fcfb190367a21da9` |
| `docs/planning/reconciliation-packets/2026-10-10-finish-02.md` | `e7d638685af7a8eb55ce4196be789fe3a10b4ce1b01c6390497314d17e6418ab` |
| `docs/planning/production-prompts/completion-2026-10-10/parent-amendment.md` | `e8ba580e266c7af4ccd39f40d677c3e347f9b68999b7f6a34005cd8efb46fae4` |
| `docs/planning/production-prompts/completion-2026-10-10/common-execution.md` | `239ff5844e8d95ff5e544762eaed3d56c09ea344721cab9e3c12bd1be333a777` |
| `docs/planning/production-prompts/completion-2026-10-10/world-runtime.md` | `e09a1c2f87d1584286a145c8cb75433832190526f25b7b6596fb322c649a5e80` |
| `docs/planning/reviews/2026-10-10-completion-recheck.md` | `5fe489c7206b04bb0a24431557d1a0a7097a29a090f9ce2b39c228659da756e7` |
| `docs/planning/reviews/2026-10-09-finish-00-contract-ruling.md` | `33777afa242d3b1b0a2f9c8e6209ae8f799d3d364a39671bdbb4856557ef0e5b` |
| `docs/planning/reconciliation-packets/finish-contracts/00-contract-decision.md` | `bb51a57ea6891898c6d48eaa817026c82a3c10bb369386aaaa53126eea004e48` |
| `docs/planning/reconciliation-packets/finish-contracts/01-path-ownership-and-allowlists.md` | `5f80c9d0e2bde92efe73928ae1981801dfa33e2d6aa3c4bc18b1dfdf8347850f` |
| `docs/planning/reconciliation-packets/finish-contracts/02-coverage-and-dependencies.md` | `5d49661956703bef13a7774ea84e2f331c8a010d50be08e5bbd17242c7c1c7de` |
| `docs/planning/reconciliation-packets/finish-contracts/05-maker-packets.md` | `a83095abb23e190591202a3764200639f725051fd25663b9ddabfdb942a5dba3` |
| `docs/superpowers/specs/2026-09-30-yor-world-design.md` | `c5e14f1f7c662041734d6332aa90e86909d152422b27fdcd40a2d47921c013c4` |
| `docs/planning/art-and-experience.md` | `763d64d20176c6e3a6d9887bdff233fc71fb2751ee142ebd6fd28ed150126ded` |
| `docs/planning/engineering-and-content.md` | `43525c95089f5150a0b413d462502acf5e82c01c29ad689d202b6ca5b58ea391` |
| `docs/planning/validation-and-production.md` | `0efa9bc08ce42f126d5845d33e58548ac9d8bf8904fd0d30497f47fdcba1ddef` |
| `docs/planning/interaction-catalog.md` | `c64127bcf4fb4fe4a1ffe86161e2180c079274a4f2bb3d14051ec9b4592e2806` |
| `references/README.md` | `4bef6bb974a6f44f9ba1a28016685b1df74efdd87f9f025a4cc25d102ea5a0d2` |
| `references/manifest.json` | `21c4e16fbe971792aa0c414a93a0da55b79cfcd5bf450da21f85681620cbd229` |
| `references/images/main-reference.png` | `37adfb0ee344642798978e954a0cfc8d9715eac1b3ca4e5a84ab87a228c53362` |
| `deliveries/completion-audits/FINISH-B1/2026-10-10-r1/report.md` | `ea8989c3d572ae7260fd19de4e094217a225d7b359ce9e355fcf95dbb2556ee3` |
| `deliveries/FINISH-B1/report.md` | `b0db389a9c5a684e402e4c65aee7447e4a2a7f5fb3b105776fe8578b4b78d79b` |
| `deliveries/FINISH-B1/binding-inventory.json` | `480ab35968ca4ef829f657f688057afb6d0cb0a6e588add1cecd6bb3b6f11ade` |
| `deliveries/FINISH-B1/provenance.json` | `407e05e05701b4316cbb2b4f6188856cf635b7f1c49909fc65ae0ccfa3e1a4bf` |
| `deliveries/FINISH-B1/candidate-asset-manifest.json` | `8d9002a94b0a9949cf371ca4d037f4cd3424952e8bbd6c7f6f0f302d947d65a6` |
| `deliveries/FINISH-B1/validator-logs/resident-manifest.json` | `d1eb4e2a447ea98a91b310d93b9e7abe3ae6b868de34da6536785b111c2712f2` |
| `deliveries/FINISH-B1/validator-logs/blender-measurements.json` | `06490053533a754c885b61e57815f9d0dab0d7f2524b0858a1df2033aa2150a3` |
| `deliveries/FINISH-B1/validator-logs/dimensions-anchors-check.json` | `e5eb7563ed58be409a835e3e03b4661949c1280123f1c20f80928f7620ad8bdb` |
| `deliveries/FINISH-B1/scripts/build-environment.py` | `e658775648e2cb82d110eee0ae48216e65c6337921c8de0bd7d835842db80c86` |
| `deliveries/FINISH-B1/scripts/build-resident-fixture.py` | `b967f9c342117d9a2a78cb3cc95ecbb7b8cd42b9dd94d595dd4772be110bb87c` |
| `deliveries/FINISH-B1/scripts/adapt_resident.py` | `2164b5793fb3cc2a1c11907ff41911f91ab6717f7f6f558fea4501687d15911d` |
| `app/public/asset-manifest.json` | `e387205a5f4faaaf65de27128c152dbbbc9320869f512e37b65f3070b8cd37d0` |
| `app/src/contracts/assets.ts` | `5c61117a8ed66f6acfef3ecfeb9742530320ba6d58713c94d6f6375044419f00` |
| `app/src/features/world/AssetLoader.ts` | `88be4c799cbf03549a118ba104f69965b29363fdaa8c2413b36d6ee9af2fb2f4` |
| `app/src/features/world/SceneIntegrator.ts` | `b5a5941769ca9ef183492843dd6e55702102445ca5db5b8f5cff0650a3b4c63b` |
| `app/src/features/world/CharacterDirector.ts` | `5a3cb8a341ec5cea721f55b8fc049cda41a500d80bca566afb3a5b53f81348d4` |
| `app/src/features/world/EntranceCoordinator.ts` | `fc8533f60a8c8b7f1b7e48b39585dda3e791934f0bf94b72b9abc45423649b7c` |
| `app/src/features/world/WorldInteractionBinding.ts` | `65c5c90423183489d5e816363a685e02cb0245cb03bce5568b5d7bb5535fea53` |
| `app/src/features/world/WorldRuntime.ts` | `2f21cf32cd0c8f04a77f809ca459ff490fb47f5ed48f790766ea5fdcd43f46ce` |
| `app/src/features/world/RuntimeMaterialQuality.ts` | `cb9e39eb24618a5b65704743b707a55599b49233f0b1d49ac94424c173521fb4` |
| `deliveries/FINISH-B1/assets/fixture-production.glb` | `c4b48f1998d87d9c148b3fac15d999e85ad4a7ecf3c528f8c96941cf4bbef9d7` |
| `deliveries/FINISH-B1/assets/group-a-essential.glb` | `78b0fae71c30a628b98a2552e3d456cfb18ce674c5ba785f0831f7a18b00222d` |
| `deliveries/FINISH-B1/assets/group-b-props.glb` | `af4f4cb9fa7aaee1f995aff4057102bd9bd2d67887ea1ed4097be5811bd0b6e3` |
| `deliveries/FINISH-B1/assets/mobile-room-lod.glb` | `51acad9b1c2737b912da09b7a9276369d996c7d86af6ea2f7511ff408f90e084` |
| `deliveries/FINISH-B1/assets/on-demand-projects.glb` | `4f063c5c82510c022802b23aabc76240befa6a885f06c5be564e0fd4172e88fe` |
| `deliveries/FINISH-B1/assets/production-room-full.glb` | `51acad9b1c2737b912da09b7a9276369d996c7d86af6ea2f7511ff408f90e084` |
| `deliveries/FINISH-B1/assets/resident-production.glb` | `ee50b195c4fd9036036c339115d1b076341018e9f70125720fa96cde0f692d0a` |
| `app/src/contracts/experience.ts` | `88727c6fd98fa4562d28e1700658285e73e225281b02414a1ab6c82afe86771f` |
| `app/src/features/experience/controller.ts` | `df0474a6dfa5d98585b3c1d0e3e010c989792234bd4ab0061c00e055f7cb5aaa` |
| `app/src/features/experience/interaction-registry.ts` | `03cc10c739d0884a0154946494cf5497a0983e58ceca176cbfaae4ed0bee1e58` |
| `app/src/features/world/CameraDirector.ts` | `82692fed88ba839e95022e23040e5e5d36231cb26f1f129fb37873ca5d6edfa7` |
| `app/src/features/world/ProductionLighting.ts` | `098003f3b3e9b8fdeb30beaa7952fb073d68e87707d41726a256545b8b8ebf32` |
| `app/src/features/world/LowQualityBatch.ts` | `26366dcaf463e6d2065d2ab88ca9f106f30b707c5bf22e8f87458bbb30c2f1d9` |
| `deliveries/FINISH-B1/scripts/generate-textures.py` | `7ef11b30841183f7c27676893539dcf004bb321349621fa22624852c8dae000f` |
