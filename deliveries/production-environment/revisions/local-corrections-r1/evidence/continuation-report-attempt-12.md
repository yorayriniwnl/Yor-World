# Art continuation: attempt 12

This report binds the attempt-12 source snapshot and isolated Blender exports. It is a candidate implementation record, not visual acceptance, provenance approval, or Parent admission. A subsequent source-camera-only attempt is being prepared after Parent review of the offline desk obstruction; this report remains limited to attempt 12.

## Source and export identity

The attempt-12 source snapshot record is `evidence/build-attempt-12-source-snapshot/source-record.json` (SHA-256 `440ca5c951c229eadac66be2840da609edeac18aa4602cad9b342b10ee9b3343`). Its environment builder SHA-256 is `9650adc4136cb9dc926872d8a7515dba570ffaa4582e9477b4e3d02924d465d0`; `source/art_refinements.py` is `0df9e733db7487f5b98d43020d7cad39515d7b5274713f40802a937029f22472`. All 15 recorded source inputs and both attempt-09 manifest snapshots independently match their snapshot-record SHA-256 values. Blender 5.2.2 LTS built `evidence/build-attempt-12/`; the actual process log is `evidence/environment-execution-attempt-12.log` (SHA-256 `891fe32d7e8fae4310e63e66f360cc60f4d0b364d0e09b17852bf02dd2acdfff`).

| Export | Attempt-12 evidence path | Bytes | SHA-256 | Triangles | Materials | Estimated GPU bytes |
| --- | --- | ---: | --- | ---: | ---: | ---: |
| Group A | `evidence/build-attempt-12/runtime/group-a-essential.glb` | 908,368 | `42e9785dd8c529f78ca3ed9563e88e4ee05b42f2cd16df2cccd799c58a0efee6` | 7,876 | 25 | 7,821,226 |
| Group B | `evidence/build-attempt-12/runtime/group-b-props.glb` | 613,832 | `416ea7b40902a7b5be7ca0684c7a96c3724ed16eadb40e1178c84268930a5cb0` | 7,036 | 24 | 3,903,583 |
| On-demand projects | `evidence/build-attempt-12/runtime/on-demand-projects.glb` | 106,496 | `6c40b1d4fb753685eef11696fc337c6a69ab220b1b449ca7ceb7ded56dad2491` | 1,472 | 11 | 80,856 |
| Full room | `evidence/build-attempt-12/runtime/production-room-full.glb` | 1,620,840 | `8e96d235880c9fb71ec6a60a76719a716c3fff0757290112997019d241cd701e` | 16,384 | 43 | 11,802,161 |
| Mobile LOD | `evidence/build-attempt-12/runtime/mobile-room-lod.glb` | 1,515,500 | `957f3d27180f89dbd70f1bc99e2beaaff09b289f61bf83c55ee77cc8a36134f4` | 12,632 | 43 | 11,695,357 |
| Resident fixture | `evidence/fixture-attempt-04/runtime/fixture-production.glb` | 391,396 | `828a03348604924a3c030e4de9cec566cf3154111d4553ce37488ac860b40da2` | 8,080 | 5 | 342,892 |

## Structural, transform, LOD, and clearance checks

The exact export inspection is `evidence/export-inspection-attempt-12.json` (SHA-256 `0a86e995c000c3e1d136a8773106ba351fc21f16323defcb5116daeaf27fd3dc`). glTF Validator 2.0.0-dev.3.10 reports zero errors and zero warnings for all six exports. Every authored transform and strict bounds check passes: Group A 136/136, Group B 111/111, on-demand 33/33, full room 280/280, mobile 280/280, fixture 68/68.

The per-mesh LOD comparison is `evidence/mobile-lod-comparison-attempt-12.json` (SHA-256 `72f1dedf8ac26fe2950f878f9d6b5c476a2528ca964fd3a1da619a1e7886283b`). The builder applied its 0.55 collapse ratio to 37 eligible meshes; their exported geometry measures 8,240 to 4,488 triangles, an actual aggregate ratio of 0.544660. No eligible mesh exceeds 0.55. Fifteen authored silhouettes/bounds are protected and unchanged. Overall full-to-mobile savings are 3,752 triangles, 105,340 GLB bytes, and 106,804 estimated GPU bytes.

Fixture attempt 04 uses unchanged fixture source SHA-256 `58b0252e1a26b969b794beccef93245fed1b3f89352b24b3c12fbc059fb4c200`. `evidence/fixture-attempt-04/blender-checks.json` records PASS for all eight clips: zero desktop hits, grounded soles, and intended pelvis-to-seat contact only. `turn_to_visitor` hand clearance is 0.16 m; `greeting_nod` is 0.3312 m. These source checks do not establish browser behavior or visual acceptance.

## Offline visual previews and remaining review

The source-render manifest is `evidence/build-attempt-12/renders-preliminary/environment-render-manifest.json`; it contains 1440×1000, 1920×1080, 1024×768, 390×844, 320×600, and 844×390 renders plus entry and monitor-focus views. The fixture preview is `evidence/fixture-attempt-04/runtime/renders-preliminary/fixture-render-manifest.json`. These are offline Blender source-camera previews, not screenshots of the integrated browser runtime.

The attempt-12 desktop source camera places the environment chair back over much of the desk; its source coordinates also differ from the product specification's proposed HOME_DESKTOP camera. Attempt 13 will correct the Blender source-camera preset to the accepted art/spec composition while preserving all F1 furniture and chair transforms. The 390×844 source-camera preview still includes large ceiling and foreground-chair areas; this remains a source-camera limitation until the integrated runtime capture is available. Browser captures at the six required viewports, all-group/on-demand behavior, independent visual/provenance review, and Parent admission remain pending.

`app/public/asset-manifest.json` remains unchanged at SHA-256 `1f432a4a42564e017b5c6377fd6e58a0916656c378ee6a2fa9b474130a990d29`; the revision `manifest.json` remains unchanged at `438026ef73e844f777b5a0aff4237251ce82a82294ce51c53201a82692eb9a3a`. No app/public GLBs or manifest entries were changed or published in attempt 12.