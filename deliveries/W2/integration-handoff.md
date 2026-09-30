# W2-F1-r2 integration handoff

Maker proposal for review, not acceptance or an instruction to start G1. Use only the exact hashes in `output-hashes.json` after parent acceptance. The complete actual glTF hierarchy, node indices, local TRS, skin joints and animation channel targets are in `evidence/r2/export-hierarchy.txt` and `evidence/r2/export-inspection.json`.

Both GLB scenes load at identity: position `(0,0,0)`, quaternion `(0,0,0,1)`, scale `(1,1,1)`. Their nodes already contain F1 placement. Blender authors meters/Z-up, facing +Y toward the desk. Native export applies `(x,y,z) → (x,z,-y)` exactly once. Bone-local basis rotations remain in the glTF and must be retained; they are not instructions to rotate the imported scene again.

| Export/subtree | G1 use | Placement and ownership |
| --- | --- | --- |
| `avatar-proof.glb` / `resident` | Keep entire skeleton | Root `(0.30,0,-0.36)`; no runtime yaw on this root |
| `avatar-proof.glb` / `resident-body` | Keep as a scene-root skin with its skeleton references | Identity node; inverse bind matrices and joint worlds determine its placement. Do not separately translate it by F1 |
| `fixture-proof.glb` / `chair-root` | Keep all children | Root `(0.30,0,-0.36)`; animated upper chair, seat/back/armrests |
| `fixture-proof.glb` / `chair-base` | Keep all children | Same root position; stationary pedestal/spokes/casters; no yaw tracks |
| `fixture-proof.glb` / `fixture-static` | Discard entire subtree | Independent proof desk, pedestals, keyboard/keys, monitor and floor; identity parent |

Remove the accepted W1 resident proxy and **entire W1 static chair**. Retain its desk/environment. Do not import W2's `fixture-static` into G1. W1's exact removable node names and accepted hashes have not been assigned to this packet; the separately assigned integrator must verify those names from the accepted W1 delivery. No W1 or shared production file was edited here.

The avatar skeleton below uses literal glTF names. Three.js r180 sanitizes periods in names (`hand.L` becomes `handL`, for example); the exported data and the browser's reported bone list document both. Do not build bindings from unverified strings.

```text
resident
  body-turn
    pelvis
      spine
        head
        upper-arm.L -> forearm.L -> hand.L
        upper-arm.R -> forearm.R -> hand.R
      thigh.L -> shin.L
      thigh.R -> shin.R
  foot.L
  foot.R
resident-body [skinned scene-root sibling]
```

`body-turn` owns avatar yaw; `chair-root` owns upper-chair yaw. Their absolute authored curves match. Independent baked foot roots under `resident` preserve floor contact between 30 FPS keys; thighs/shins bend toward those foot placements. Never parent `resident` under `chair-root`, multiply their yaws, or move the whole imported scene to F1 again. Keep both avatar scene roots together when mounting the asset; the skin requires its joint references.

| Clip | Authored inclusive frames at 30 FPS | Export seconds | Motion |
| --- | --- | --- | --- |
| `coding_idle` | 1–181 | 0–6.0 | Common seated rest; 1–3 mm hand proximity to keys; repeating typing |
| `notice_visitor` | 1–19 | 0–0.6 | Hands withdraw 0.29 m, lift 0.103 m, widen 0.045 m per side; elbows fold clear |
| `turn_to_visitor` | 1–37 | 0–1.2 | Upper chair/body turn 0→125° with foot steps; hands stay withdrawn |
| `greeting_nod` | 1–28 | 0–0.9 | Hold 125° with a 9° nod and neutral head endpoints |
| `return_to_work` | 1–40 | 0–1.3 | Swivel finishes at 0.975 s; hands approach keys during final 0.325 s |

All clips share one bind/rest pose. The end/start pose boundaries match; they do not each begin at coding. The proof samples paired exported actions at the same name/local time, with one clock and one owner. It replaces the active queue on interruption and stops prior actions; no runtime angle accumulation is used. This is a proof sampler, not the later `CharacterDirector.play(action, signal)` implementation.

The harness sequence is 1.5 s coding + 4.0 s acknowledgment/return = 5.5 s, followed by coding. For the existing storyboard, the four finite clips map to 3.6–7.6 s. This packet does not implement the doorway, camera entrance, routes or the eight-second coordinator.

Cancel reverses notice/turn from their current sample; from a nod it first reverses the nod, then the turn, then notice. During `return_to_work`, it completes the current return. This reuses the collision-checked poses without an arbitrary blend across the desk. Worst theoretical cancellation is 2.7 s, confined to this private proof. **Skip/Escape settles instantly** to coding. G1/B5 navigation must use immediate settlement when required; do not introduce a 2.7 s route delay. Do not restart a new greeting from an arbitrary partial pose: use cancellation/settlement first.

The specification's proposed 150–250 ms blends are not demonstrated here. Pose-matched boundaries are sampled directly; cancellation follows the authored path. This is an explicit W2 implementation proposal for the parent and motion/interface reviewers, not an amendment to the shared production contract. Blend tuning, velocity continuity and production abort/dispose promises remain later assigned work.

F1 is unchanged: room assumptions 4.2 × 3.6 × 2.8 m, rear wall Z=-1.8; desk 2.6 × 0.8 m, top Y=.75, center X/Z=(0,-1.15); chair/resident root=(.30,0,-.36). No room walls are exported by this fixture. The .52 × .40 m seat, .46 m seat top, .64 m armrest centers and compact stationary base are W2-authored fit assumptions; they are not recovered reference measurements or a change to F1.

Stop: Gemini-3 motion review, Claude-01 interface review, Claude-13 export/provenance review, then parent acceptance. Final likeness, remaining V1 clips and all extensions require their separately assigned packets.
