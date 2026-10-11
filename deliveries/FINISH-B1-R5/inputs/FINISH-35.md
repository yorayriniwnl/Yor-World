# FINISH-35 — B1 reference-visual correction

Date: 2026-10-12 UTC. Status: **Parent-authorized bounded maker correction; candidate and Parent acceptance pending.** Owner instruction: “Now start executing. Fix all. Work till you complete all.” This packet addresses the confirmed full-room visual-fidelity failure while preserving the accepted FINISH-00-R2 art/runtime contracts.

## Exact source and governing inputs

- Bounded base candidate: FINISH-B1-R4-02 commit `7936fa981a24fe4af834ff250ffec8a7b02b09b3`, tree `98f37af3f3b490a19a25677160c442fa7daef3fc`, delivery subtree `7df14feefa5b89f02b07c0127992d15189848f7a`. The remote branch was rechecked at this exact commit on 2026-10-12.
- Accepted canonical application tree remains `42ea29ec235225046a75959eb19eb386ac2f821d`; no application source is authorized to change in this packet.
- Main image `references/images/main-reference.png`, SHA-256 `37adfb0ee344642798978e954a0cfc8d9715eac1b3ca4e5a84ab87a228c53362`.
- Art specification `docs/planning/art-and-experience.md`, SHA-256 `763d64d20176c6e3a6d9887bdff233fc71fb2751ee142ebd6fd28ed150126ded`.
- Frozen FINISH-00-R2 asset/animation bindings `docs/planning/reconciliation-packets/finish-contracts-r2/03-asset-bindings.md`, SHA-256 `0f4173cfd4cc7f52562344fc2e087ace13dea5717cb065c7b7a0c0200bfdb360`.
- Exact local cross-lane audit: `deliveries/completion-audits/FINISH-B1/finish-07/20261011T145500Z-b1-r4-independent-review-01/report.md`, commit `b25b0bd0b30fe97d7d7173c40bad694c675f026e`.

Use the committed R4-02 source and exports by their raw Git identities. Do not adopt files from the occupied R4 scratch roots or infer that the R4 bounded glass PASS accepts the whole art lane.

## Confirmed problem

The FINISH-31 audit passes the bounded PC-glass correction and local budgets (103 desktop / 75 mobile calls), but marks full-room reference fidelity **FAIL / OPEN**. Its matched `desktop-home` capture is substantially darker and visually simpler than the user-designated reference. The reference establishes a bright white/ivory workstation, blue-and-white chair, prominent pink/lilac hex lights and cyan fill; the present render has gray/dark walls and desk surfaces, a mostly dark-blue chair, and weak room-wide color separation. The comparison is archived with the exact R4-02 audit evidence.

## Authorized correction and strict boundaries

Create a fresh candidate under `deliveries/FINISH-B1-R5/` from the exact R4-02 package. Improve the rendered home-room palette and illumination to match the named reference anchors while retaining readable screen content and the existing layout. The work may change only material color/roughness/metalness/emissive values and authored punctual-light color values in the existing room and chair-fixture assets, plus the source/export steps needed to reproduce those changes.

Keep the R4-02 PC-glass material and authorized PC/window geometry correction byte-for-byte semantically intact. Do not add/remove scene nodes, materials, meshes, textures, or GLB requests. Do not change geometry, UVs, object names, hierarchy, transforms, animations, prop placement, camera profiles, camera path, doorway, door sweep, runtime/app source, dependencies, asset IDs, interaction hooks, or accepted contracts. Do not modify `app/`, R4-02, earlier candidates, or historical evidence. Preserve all untouched delivered assets byte-for-byte. Unknown reference rights remain unknown; do not copy reference pixels into product textures.

This is a visual candidate only. The owner reviews visual fidelity before art admission. The positive-Y door/camera margin and production door-transform owner remain separate open findings and are not closed by this packet.

## Required proof

1. Rebind the R4-02 Git commit, tree, package manifest and source hashes directly from Git. Replay the new source patch from the exact R4-02 builder inputs. Keep a component-level material/light delta; prove node, geometry, UV, transform, animation, and hook inventories remain unchanged. Verify all unmodified assets stay byte-identical.
2. Use the existing matched Chromium/Three r180 harness and exact `desktop-home` 1920×1080 and `mobile-home` 720×1280 camera, DPR, exposure and runtime-light settings. Produce fresh screenshots and show them beside the supplied reference and R4-02 captures. Record hashes, profiles, runtime/source identity and commands. Do not change camera framing or lighting settings in the harness to make the comparison easier.
3. The result must visibly restore the specified white/ivory work surfaces, blue-and-white chair, prominent pink/lilac lights and cyan fill without washing out screen content or losing the blue floor/material depth. Record unresolved differences plainly; the parent does not infer visual approval from material values or screenshots alone.
4. Re-run the GLB validator and Blender import/replay checks for changed exports. Re-run raw renderer draw-call and triangle/transfer checks in both profiles. Calls must remain ≤120 desktop / ≤80 mobile; all asset and texture budgets in the frozen contracts still apply.
5. Return a complete isolated package: source patch and source inputs, changed exports, input/output hashes, material/light diff, matched captures, logs/tool versions/exit codes, requirement matrix, and `report.md` with PASS/FAIL/NOT RUN for each check. No G7, physical-device, hosted-provider or production claim is allowed.
6. Commit and push only the completed `deliveries/FINISH-B1-R5/` package on a scoped candidate branch. Do not merge or change canonical `app/`. The maker must not approve its own output; Parent audit and owner visual review remain separate.

## Next gates

After delivery, Parent will rebind and inspect the exact package, then assign a separate independent review. A passing bounded palette correction does not accept full B1, resolve door/camera ownership, authorize downstream integration, or qualify production assets. Continue with a separately scoped correction for the door/camera sweep/transform owner and the remaining queued product interactions after their exact requirements and owners are bound.
