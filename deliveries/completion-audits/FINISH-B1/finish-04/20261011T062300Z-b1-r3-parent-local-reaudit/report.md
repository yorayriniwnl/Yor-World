# FINISH-B1-R3 parent local re-audit

Advice: **REWORK for full-contract completion; no Parent implementation acceptance.** The candidate contains substantial measured work and hash-consistent evidence. Its raw draw-call gate correctly remains **FAIL** at 202/120 desktop and 146/80 mobile. Four required items remain incomplete: per-finite-clip cancellation coverage, production door ownership, full-room reference comparison/deviation records, and a cold-load performance profile.

Candidate commit: 1753b9278c4537b5377c3893172b2a0f26d13b10. Manifest SHA-256: 338a04d5cc00a9b78fbc5d1bc13785b1e2ded0aac6e8e85d17a08a6e118976b3 (204 verified rows). Current branch tip: 9f1a1c30bd68b03c5756e50dbecfa033544c857d. Canonical app tree matches the frozen maker base: True.

## Findings

### B1-R3-AUD-01 — HIGH — missing_required_behavior_evidence

Only 3 cancellation cases cover positions in the four-clip greeting sequence. The frozen contract requires start/middle/end cancellation for each finite clip: mouse_idle, notice_visitor, turn_to_visitor, greeting_nod, return_to_work, attention_glance (18 cases). mouse_idle and attention_glance have no cancellation coverage. The 3/3 PASS claim is narrower than the required matrix.

Required next step: Add and pass a per-finite-clip by start/middle/end cancellation matrix against exact exported clips and paired chair; record compatible settled poses.

### B1-R3-AUD-02 — HIGH — unresolved_production_ownership

Standalone 451-row door/camera sweep reports clearance, but the exact asset-bound receipt says: NOT FOUND: no supplied production source writes Door_Hinge; no room-target clip is exported. EntranceCoordinator owns camera path only.. The inspected base EntranceCoordinator only moves the camera; WorldInteractionBinding maps the door hook but does not write the hinge.

Required next step: Parent must bind a sole production Door_Hinge transform owner in C2 and require a production-owner-bound sweep test before closing the door requirement.

### B1-R3-AUD-03 — MEDIUM — missing_reference_comparison_and_deviations

Native captures are explicitly character-only; no full-room same-camera comparison or per-view deviation record is present. Five raw-frame files are not referenced by captures/index.json. The desktop DOM overlay says reference-faithful while the rendered scene visibly differs from the main image.

Required next step: Supply hash-bound same-camera full-room comparisons and truthful per-view deviation notes; bind the origin and camera metadata for every delivered frame and qualify the reference-faithful overlay.

### B1-R3-AUD-04 — MEDIUM — incomplete_performance_profiles

120 warm RAF intervals are recorded at each viewport; no cold-load sample is present. The GPU resource figure is a lower bound and excludes overlapping replacements/quality derivatives. Runtime tier thresholds are honestly marked NOT RUN with C2/C3 owners; raw calls remain FAIL.

Required next step: Add cold-load and applicable overlap resource/frame observations in the owner-approved profile packet; preserve target-tier FAIL/NOT RUN until actual C2/C3 results exist.

## Verified results

- Package integrity: 204/204 manifest rows matched; no missing, extra, or changed files. The read-back manifest record matches the output-manifest SHA.
- Captures: 15 views present; indexed canvas/DOM PNGs, seven loaded assets, and per-view camera/renderer/GPU/browser/network/cache/hash metadata reverified.
- Geometry: 25 checks report 25 PASS, 0 FAIL; the five final GLB validation/import receipts are present. These maker suite commands were not rerun.
- Browser: 1040 samples over eight clips at 60 Hz; 20 visitor-sequence repetitions PASS in the standalone export-bound harness. Skip and navigation/re-entry receipts PASS.
- Door: 451 samples cover a 2.5-second swing plus five-second camera path; the standalone receipt reports no frame or near-plane intersections.
- Source scope: the two maker commits touch only the B1-R3 delivery root; the source patch changes the two assigned Blender builders; canonical app source is unchanged.
- Physical iOS/Android, thermal/accessibility, user art/likeness approval, production C2/C3 threshold validation, and external GPT Plus #2 review remain NOT RUN.

## Review boundary

This local Parent review does not replace the required external GPT Plus #2 review or the separate Parent acceptance decision. The canonical application was not changed.
