# FINISH-B1-R3 independent audit

**Recommendation for Parent consideration: REWORK.** This is not an acceptance and does not authorize C2/I1 integration.

## Candidate and review boundary

- Candidate commit: 1753b9278c4537b5377c3893172b2a0f26d13b10
- Candidate tree: 9759ac9879bcc9489770b7c5784ead2f022157b0
- Candidate delivery subtree: 0bc042af5add583314a7e0713c6db8793f5ca18b
- Parent delivery commit: 54c2448bbabb8bfb8bd7fd55ff4a25b3a4343feb
- Accepted source/app baseline: f62a43c5e71c00dcb89e28275ea81d842167db80; app tree 42ea29ec235225046a75959eb19eb386ac2f821d
- Exclusive output: deliveries/completion-audits/FINISH-B1/finish-06/20261011T063200Z-b1-r3-independent-review-02-f6a91d/

The review followed FINISH-18, the FINISH-20 root reallocation, the FINISH-04 ruling/prompt chain, the assigned R3 maker packet, and frozen 03-asset-bindings.md. The earlier FINISH-05 partial root and unexpected FINISH-04 root were preserved and not used as evidence. Candidate files, earlier deliveries, contracts, and canonical app files were not modified. No commit or push was made.

## Decision summary

The frozen draw-call ceiling is a confirmed hard FAIL: 202/120 desktop and 146/80 mobile. The positive-Y sweep also exposes a door/camera margin concern: the first negative proxy margin occurs after the door is fully open, when the configured route reaches the open leaf envelope. The measurement proves a negative near-plane margin, not a visible pixel clip or a sampled near-plane/triangle intersection. The accepted app source has a camera entrance coordinator but no door-transform writer. The draw-call failure warrants rework; the positive-Y path and production owner need resolution before Parent considers acceptance or downstream integration.

The package manifest is internally complete: 204/204 declared rows match; the tracked package contains 206 files and 93,466,246 bytes, including the manifest and its read-back receipt. Fresh structural validators, Blender imports, capture hash/dimension checks, and browser asset-harness measurements completed. Geometry comparison is not a blanket PASS: triangle-key comparison differs for room and fixture, while point-set checks show extremely small nearest-point distances and two rounded-bin differences in room. This supports preserved vertex locations but does not prove identical topology, shading, or visual quality.

## Findings

### B1-R3-F01 — BLOCKER: raw draw-call budget fails on both profiles

The frozen ceilings remain 120 desktop and 80 mobile. Fresh Chromium/Three r180 attribution produced:

| Profile | Frozen ceiling | Measured calls | Result | Main render calls | Transmission-pass calls | Drawn mesh objects |
|---|---:|---:|---|---:|---:|---:|
| desktop-home, 1920×1080 | 120 | 202 | FAIL | 101 | 101 | 101 |
| mobile-home, 720×1280 | 80 | 146 | FAIL | 73 | 73 | 73 |

The room contains one mesh named StaticBatch__Room_Root__PC_TemperedGlass with material transmission 0.9200000167. Its transmission material activates Three r180's renderTransmissionPass before renderScene. Each unique in-frustum mesh object is counted once in each pass. Main-pass calls per export are desktop room 78, fixture 5, group-b 7, resident 7, on-demand 4; mobile room 53, fixture 5, group-b 6, resident 7, on-demand 2. The transmission pass duplicates those owner counts exactly.

Accounting is not cumulative leakage: renderer.info.autoReset is true, the measured frame delta is one render on each profile (desktop frame 2→3; mobile 5→6), and renderer.info.drawCalls equals intercepted renderBufferDirect calls and pass/object attribution. The assertion exits 1 because both frozen limits fail. Static batching or unrun target-tier controls do not change this raw result.

Evidence: reviewer-rerun/validator-logs/draw-call-attribution-callstacks.json, draw-call-profile-summary.csv, draw-call-owner-material-pass.csv, draw-call-object-material-pass.csv, and reviewer-rerun/draw-budget-assertion.log.

### B1-R3-F02 — HIGH: positive-Y sweep loses camera near-plane margin after full opening

The door reaches +90° at t=2.5 s, and the camera path starts at t=2.5 s. The last nonnegative sampled margin is +1.111 mm at t=6.083333 s. At t=6.100000 s, the first negative sample is:

- Door: +90°, doorOpenProgress 1.0; cameraElapsedSec 3.6; entrance progress 0.72.
- Camera position: (-1.5864, 1.7, 1.5276) m; target: (0.12, 1.25, -1.15) m.
- Nearest leaf surface gap: 43.600 mm; near plane: 50 mm; margin: −6.400 mm.
- Frame gap: 220.335 mm; leaf/frame clearance: 1.517 mm.
- Sampled near-plane/leaf triangle intersections: zero.

The open panel world AABB is x=[−1.6700,−1.5950], y=[0.0100,2.0899999], z=[0.9100,1.7900] m. The worst sampled margin is −49.600 mm at t=6.300000 s, still at +90°, with camera position (−1.6696, 1.7, 1.533543) m and leaf surface gap 0.400 mm; this camera point is inside that AABB. The full sweep's minimum leaf/frame clearance is about 0.002586 mm, with zero sampled leaf/frame intersection pairs.

This is not a door-that-has-not-cleared-in-time sample: the door is fully open for 3.6 s before the first negative margin. It is a conflict between the positive-Y open leaf position and later camera route. The data does not prove pixel-level clipping; no near-plane triangle intersection occurred. It also does not decide whether leaf dimensions or route geometry should change. The inherited negative-Y rerun retains +21.545 mm minimum near-plane margin, so direction matters.

Evidence: reviewer-rerun/validator-logs/positive-y-door-sweep.csv, positive-y-door-sweep-summary.json, and reviewer-rerun/inherited-direction/validator-logs/browser-deformation-results.json. The positive-Y raw JSON has a stale inherited direction-description string; this audit relies on sampled yawDegrees values and the reviewer script variant that changed only the yaw sign.

### B1-R3-F03 — GATE UNRESOLVED: production door-transform owner not found

The exact accepted app tree is 42ea29ec235225046a75959eb19eb386ac2f821d. A scoped read-only search of app/src found no Door_Hinge, Door_Leaf, door-angle, or door-rotation writer. EntranceCoordinator.ts lines 15–24 define the camera position path, and lines 189–202 update camera position, target, and FOV. The final room GLB has Door_Leaf parented under Door_Hinge, but its room animation count is zero. Production door-transform ownership therefore remains unresolved. This audit did not mount C2 runtime or infer that the camera coordinator controls the door.

Evidence: reviewer-rerun/validator-logs/production-door-owner-source-search.json and independent-glb-audit.json.

### B1-R3-F04 — LOW: source patch has an EOL-sensitive application caveat

The packaged R3 source.patch contains exactly the two assigned builder paths. It is an incremental patch on exact R2 builder inputs, not a direct patch from f62a43c5. A cumulative comparison from the accepted baseline also shows only those two builder files changed.

On exact R2 input, default patch check fails for the resident builder because that file is CRLF. Applying in reviewer scratch with git apply --ignore-space-change succeeds. The environment builder bytes then match final exactly; normalized resident-builder text matches final, but raw line endings differ because the applied scratch file is mixed-EOL while final R3 source is CRLF. This is a reproduction caveat; no source/export mismatch was demonstrated. The direct-to-f62 patch failure is not the intended application base.

Evidence: reviewer-rerun/validator-logs/r2-patch-eol-options.json, r2-source-delta-eol-diagnostic.json, and r2-source-delta-ignore-space-apply.json.

### B1-R3-F05 — LOW / INCONCLUSIVE: triangle-key geometry comparison differs

Binary-derived world-space triangle keys at 1 mm quantization differ for 144 fixture and 932 room triangle keys, although total triangle counts match. A separate unique-position comparison at 0.1 mm resolution passes fixture, group-b props, on-demand projects, and resident; room has two differing material sets, Hex_LilacEmissive and Hex_VioletEmissive. Full-precision symmetric nearest-point distance is at most 1.8083×10⁻⁷ m across compared material points, with no point over 1×10⁻⁵ m or 1×10⁻⁴ m.

The location data is consistent with triangulation/index ordering and float precision changes, and provides no confirmed substantive vertex displacement. Because triangle keys and two rounded coordinate sets differ, this audit does not claim identical topology, shading, or visual quality.

Evidence: reviewer-rerun/validator-logs/independent-glb-audit.json, vertex-set-comparison.json, and vertex-nearest-distance-diagnostic.json.

## Verified results and evidence boundaries

| Area | Status | Scope |
|---|---|---|
| Candidate package manifest | PASS | Reviewer independently recomputed 204/204 rows. Manifest and read-back receipt are the two self-referential exclusions. |
| Five final GLB structural checks | PASS | Fresh glTF validator: 0 errors, 0 warnings; informational empty-node notices remain. |
| Anchors, hierarchy, required nodes, clip durations | PASS | Fresh independent binary decoder: 31 contract checks pass, including Door_Leaf hierarchy, required nodes, 8 paired clip durations, and no room door mixer animation. |
| Blender imports | PASS | Fresh Blender 5.2.2 LTS import of all five exact final GLB hashes, 5/5. This is import validation, not source-builder contact acceptance. |
| Browser clip/contact harness | PASS for standalone asset harness | Fresh Chromium 153 / Three r180 rerun over 8 clips and 1,040 samples; zero resident root drift and zero desk-interior vertex hits. It does not mount CharacterDirector/EntranceCoordinator or C2. |
| Fresh capture evidence | PASS for recorded bytes/dimensions | Reviewer capture index has 15 views; 30 actual PNGs were rehashed and PNG IHDR dimensions checked. This is capture provenance, not aesthetic acceptance. |
| Browser console | PASS for rerun | One harness initialization log; no console/page errors. |
| Native builder contact receipt | INHERITED ONLY | Maker 18/18 receipt refers to a different/non-final resident hash; not fresh proof for the final restored resident. |
| Historical native proxy failures | INHERITED ONLY / UNKNOWN | Maker logs preserve three failure IDs but no original failing frames. Historical frames remain UNKNOWN. |
| Static-batch source exclusions/path guard/restoration history | INHERITED ONLY | Candidate source and receipts were inspected; those maker checks were not independently rerun as source-builder operations. |
| Runtime tier / C2-C3 integration | NOT RUN | Standalone asset harness only; no tier controller or integrated runtime. |
| Physical iOS/Android, deployment/CDN, external reviewer | NOT RUN | No device, deployment, GPT Plus #2, Astra, or manual art review is claimed. |

## Audit artifacts

- report.md — this review and Parent recommendation
- findings.json — machine-readable findings, evidence, and severities
- requirement-matrix.json — requirement-level PASS/FAIL/INHERITED/NOT RUN status
- candidate-binding.json, candidate-package-verification.json, candidate-package-hashes.csv, input-hashes.json — candidate/package identity and hash evidence
- audit-output-hashes.json — reviewer-output inventory; excludes .work scratch and itself
- commands-and-exits.txt and tool-versions.json — commands, exits, and versions
- reviewer-rerun/ — fresh scripts, browser evidence, raw logs, attribution, geometry comparisons, captures, and validator receipts
- inherited-evidence/candidate/ — selected maker-evidence subset; all 41 copied files match exact candidate package hashes and remain labeled as inherited unless separately rerun

Parent retains separate acceptance and downstream integration authority. No external proof, target-tier qualification, production door owner, or canonical acceptance is inferred from this review.
