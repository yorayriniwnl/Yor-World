# Bounded Maker Packets: FINISH-A1, FINISH-B1, and FINISH-C1

**Document:** `05-maker-packets.md`  
**Parent Authority:** GPT Plus #1 (Lead Architect)  
**Date:** 2026-10-09  
**Status:** READY FOR MAKER DISPATCH (Pending GPT Plus #2 Contract Audit & Parent Contract Ruling)  

---

## 1. Governance Instructions for Dispatch

1. **Strict Lane Specialization:**
   - **Gemini #1:** Executes FINISH-A1 only.
   - **Gemini #2:** Executes FINISH-B1 only.
   - **Gemini #3:** Executes FINISH-C1 only.
2. **Parallel Isolation:**
   FINISH-A1, FINISH-B1, and FINISH-C1 write to completely disjoint delivery roots (`deliveries/FINISH-A1/`, `deliveries/FINISH-B1/`, `deliveries/FINISH-C1/`). They may be dispatched concurrently to the three Gemini accounts.
3. **Makers Do Not Fix Canonical Code Directly:**
   All changes are staged under `deliveries/<packet>/source/`. Integration into canonical `app/` is performed exclusively by Gemini #3 under `FINISH-I1` after all predecessor packets are accepted.
4. **Stop for Independent Audit:**
   Each maker must stop immediately upon completing its delivery. Self-approval is prohibited. GPT Plus #2 performs maker-independent verification; Parent GPT Plus #1 issues acceptance.

---

## 2. Packet FINISH-A1 — Gemini #1 (Platform Maker)

```text
================================================================================
YOR WORLD WORK ORDER: FINISH-A1
ACCOUNT: Gemini #1 (Platform Maker)
EXCLUSIVE WRITE ROOT: deliveries/FINISH-A1/
PREREQUISITES: Accepted FINISH-00 Parent Contract Gate
COORDINATION COMMIT: ab369d413c7501224e3d79aa78e56172f97839ff
CANONICAL APP TREE: 42ea29ec235225046a75959eb19eb386ac2f821d
================================================================================

You are Gemini #1, the YOR WORLD Platform Maker. Complete FINISH-A1 to address
findings CA-01 and CA-02 from the 2026-10-09 completion audit.

1. SCOPE & REQUIREMENTS:
   - Implement complete, keyboard-accessible structured block editing in the CMS
     UI for all four frozen block types in ContentSectionSchema:
     * paragraph: { type: "paragraph", text: string }
     * image: { type: "image", mediaId: string, alt: string, caption: string }
     * list: { type: "list", items: string[] }
     * code: { type: "code", language: string, text: string }
   - Support adding, editing, deleting, and reordering blocks and sections.
   - Prevent truncation or placeholder substitution; cancel must discard changes.
   - Enforce approved-media boundary: image blocks must reference approved media
     assets in media_assets.
   - Implement optimistic revision conflict detection (HTTP 409) when the base
     revision does not match the current stored revision.
   - Build dedicated owner-only draft preview route (/admin/preview) that renders
     draft content using the exact sanitized CaseStudy component.
   - Guard private preview with active owner + AAL2 MFA (requireOwner). Anonymous,
     non-owner, and AAL1 requests must be rejected (HTTP 401/403).
   - In /admin/publish review interface, replace hardcoded checkmarks with dynamically
     executed verification checks (project schema, approved media, evidence links)
     displaying executed status, timestamp, and reasons.

2. CANONICAL CHANGED-PATH ALLOWLIST (relative to app/):
   - src/features/admin/project-editor.tsx
   - src/features/admin/structured-block-editor.tsx (new)
   - src/features/admin/draft-preview.tsx (new)
   - src/features/admin/publish-review.tsx
   - src/app/admin/editor/page.tsx
   - src/app/admin/publish/page.tsx
   - src/app/admin/preview/page.tsx (new)
   - src/server/content/preview.ts (new)
   - src/app/api/admin/preview/route.ts (new)
   - tests/unit/platform/completion-authoring-blocks.test.ts (new)
   - tests/integration/platform/completion-authoring-preview.test.ts (new)
   - tests/e2e/platform/completion-authoring-workflow.spec.ts (new)

3. FORBIDDEN PATHS:
   - src/contracts/content.ts (frozen schema)
   - supabase/migrations/* (immutable)
   - src/app/(public)/* (public routes reserved for FINISH-A2)
   - All world/art/runtime paths (src/features/world/*, src/features/room/*)
   - Direct modifications to canonical app/

4. OUTCOME VERIFICATION:
   - Playwright E2E test executing complete authoring workflow: create/edit/reorder
     each block type, save, reload page, verify exact persistence.
   - Preview test confirming draft matches published rendering while anonymous/public
     routes continue to see previous public snapshot.
   - Concurrency test verifying HTTP 409 when saving against a modified draft.
   - Unauthorized access test confirming 401/403 on private preview routes.

5. DELIVERABLES UNDER deliveries/FINISH-A1/:
   - source/ (complete replacement files matching canonical relative paths)
   - source.patch
   - report.md (PASS/FAIL/NOT RUN evidence table, exit codes, tool versions)
   - input-hashes.json & output-hashes.json
   - evidence/ (test logs, screenshots)

Follow the human Git rule: commit and push only deliveries/FINISH-A1/.
STOP upon delivery. Do not self-approve or start FINISH-A2.
```

---

## 3. Packet FINISH-B1 — Gemini #2 (World / Art Maker)

```text
================================================================================
YOR WORLD WORK ORDER: FINISH-B1
ACCOUNT: Gemini #2 (World / Art Maker)
EXCLUSIVE WRITE ROOT: deliveries/FINISH-B1/
PREREQUISITES: Accepted FINISH-00 Parent Contract Gate
COORDINATION COMMIT: ab369d413c7501224e3d79aa78e56172f97839ff
CANONICAL APP TREE: 42ea29ec235225046a75959eb19eb386ac2f821d
================================================================================

You are Gemini #2, the YOR WORLD World / Art Maker. Complete FINISH-B1 to address
findings CA-11 (structural visual mismatches) and asset requirements for CA-05/08/09.

1. SCOPE & REQUIREMENTS:
   - Deliver reference-faithful 3D room assets matching references/images/main-reference.png:
     * Prominent hexagonal wall light panels with pink/lilac luminescence (replaces rectangular boxes).
     * Dual round desktop monitor speakers (replaces rectangular cabinet speakers).
     * Blue carpet / floor treatment matching visual reference.
     * Bright white workstation with drawer units and blue-and-white ergonomic chair.
     * Soft cyan ambient fill and warm monitor light bar.
     * Grouped gaming accessories: pegboard, headphones, controllers, plant on shelves.
   - Author the entrance door assembly in room.glb with explicit hierarchy:
     * Door_Frame (static frame)
     * Door_Leaf (door panel)
     * Door_Hinge (rotation pivot at hinge axis)
   - Author stable named nodes for physical interactions:
     * Plant_Leaf_01, Plant_Leaf_02 (leaf deflection anchors)
     * Books_Stack (book nudge anchor)
     * Chair_Seat (chair posture adjustment anchor)
     * PC_Fan_Group, Zenith_Core, Camera_Lens_Ring, Mic_LED (motif anchors)
     * Clock_Face (realtime clock anchor)
   - Export all 8 approved resident character animation clips in resident.glb:
     1. coding_idle
     2. notice_visitor
     3. turn_to_visitor
     4. greeting_nod
     5. return_to_work
     6. attention_glance
     7. mouse_idle
     8. breathing_idle
   - Maintain F1 Proof Baseline coordinates: room 4.2x3.6x2.8m, Y-up runtime,
     desk at (0, -1.15), chair/resident origin at (0.30, 0, -0.36).

2. DELIVERABLES UNDER deliveries/FINISH-B1/:
   - assets/room.glb (Khronos-validated glTF binary, <= 1.5 MB)
   - assets/resident.glb (Khronos-validated glTF binary with all 8 clips, <= 800 KB)
   - assets/textures/* (optimized textures, <= 1.5 MB total)
   - source/blender/models/*.blend (clean source models)
   - source/blender/scripts/build-environment.py & export-assets.py
   - binding-inventory.json (mapping nodes/clips to runtime names)
   - provenance.json
   - captures/ (side-by-side reference comparison, desktop/mobile renders)
   - report.md (dimensions, draw calls, vertex counts, validator logs)
   - input-hashes.json & output-hashes.json

3. FORBIDDEN ACTIONS:
   - Direct modifications to canonical app/
   - Overwriting historical assets in deliveries/production-environment/
   - Inventing personal likeness or unapproved personal objects

4. OUTCOME VERIFICATION:
   - 100% Khronos glTF Validator PASS (0 errors, 0 warnings).
   - Side-by-side visual render matching main-reference.png lighting and silhouettes.
   - Bounding box, anchor positions, and clip duration validation.

Follow the human Git rule: commit and push only deliveries/FINISH-B1/.
STOP upon delivery. Do not self-approve or start post-V1 extensions.
```

---

## 4. Packet FINISH-C1 — Gemini #3 (Runtime Maker)

```text
================================================================================
YOR WORLD WORK ORDER: FINISH-C1
ACCOUNT: Gemini #3 (Runtime Maker)
EXCLUSIVE WRITE ROOT: deliveries/FINISH-C1/
PREREQUISITES: Accepted FINISH-00 Parent Contract Gate
COORDINATION COMMIT: ab369d413c7501224e3d79aa78e56172f97839ff
CANONICAL APP TREE: 42ea29ec235225046a75959eb19eb386ac2f821d
================================================================================

You are Gemini #3, the YOR WORLD Runtime Maker. Complete FINISH-C1 to address
findings CA-06, CA-07, and CA-10 from the 2026-10-09 completion audit.

1. SCOPE & REQUIREMENTS:
   - Character Animation Activation (CA-07):
     * Fix CharacterDirector.ts so that currentClip initializes to "none", ensuring
       that applyClip("coding_idle", 0) in the constructor immediately plays
       coding_idle.
     * Verify that typing and breathing bone transforms change on frame 1 without
       requiring a prior greeting.
   - Decorative Pause Implementation (CA-06):
     * Connect isDecorativePaused in WorldRuntime.ts render loop.
     * When isDecorativePaused is true, freeze character mixer delta, prop physics,
       clock updates, and decorative tweens (delta = 0).
     * Ensure camera navigation, UI controls, and Room Controls modal remain fully
       interactive while paused.
     * Persist pause state across tab switches and room re-entry.
   - Truthful Essential Loading & Retry Contract (CA-10):
     * Decouple Group A (Essential: room, door, resident, chair) from Group B
       (Optional: textures, ambient props).
     * Once Group A is ready, trigger studio entrance immediately; stream Group B
       in the background without blocking. Optional failures must be non-fatal.
     * Display byte progress ONLY when total bytes are verified via Content-Length.
       Otherwise display truthful stage names with indeterminate loading. Zero
       simulated percentages.
     * Maximum 2 automatic retries (3 total attempts) with exponential backoff.
       If essential loading exceeds 15 seconds, display Retry 3D and Continue with Portfolio.
     * Attach AbortSignal to all asset requests; abort immediately on Skip, Exit,
       or route change.

2. CANONICAL CHANGED-PATH ALLOWLIST (relative to app/):
   - src/features/world/CharacterDirector.ts
   - src/features/world/SceneIntegrator.ts
   - src/features/world/WorldRuntime.ts
   - src/features/world/AssetLoader.ts
   - tests/unit/world/completion-character-startup.test.ts (new)
   - tests/unit/world/completion-decorative-pause.test.ts (new)
   - tests/unit/world/completion-essential-loader.test.ts (new)
   - tests/integration/world/completion-runtime-lifecycle.test.ts (new)

3. FORBIDDEN PATHS:
   - UI layout files (WorldRoot.tsx, world.module.css, room-controls.tsx)
   - Shared contracts (src/contracts/*)
   - Platform/CMS files
   - Direct edits to shared canonical app/

4. OUTCOME VERIFICATION:
   - Unit test measuring CharacterDirector bone transforms during the first 1000ms
     confirming immediate typing action activation.
   - Integration test verifying that pausing freezes animation mixer progress while
     camera navigation updates normally.
   - Network fault injection test verifying Group A assets allow entrance when
     optional textures are stalled/failed.
   - Request cancellation test verifying in-flight fetches are aborted on Skip/Exit.

5. DELIVERABLES UNDER deliveries/FINISH-C1/:
   - source/ (replacement files)
   - source.patch
   - report.md (PASS/FAIL/NOT RUN evidence table)
   - evidence/ (diagnostic receipts, test logs)
   - input-hashes.json & output-hashes.json

Follow the human Git rule: commit and push only deliveries/FINISH-C1/.
STOP upon delivery. Do not self-approve or start FINISH-C2.
```
