# Art candidate attempt 14 — reproducibility and integration check

Status: **candidate only; not independently approved or admitted**. This attempt branches from the preserved attempt-13 source snapshot and changes deterministic UV assignment for bevelled boxes and fixed-order UV-sphere geometry. It does not change the public app manifest or replace any accepted asset.

## Results

- **Build: PASS.** Blender 5.2.2 LTS completed the authored scene and five runtime GLBs with exit 0. The six-asset inspection, including the carried attempt-04 fixture, reports zero glTF errors/warnings and zero transform/bounds failures (136 Group A, 111 Group B, 33 on-demand, 280 full-room, 280 mobile-room, 68 fixture checks).
- **Deterministic replay: PASS.** A second no-render export from the same candidate source produced all five GLBs byte-identical to the first export. Exact source and output hashes are in `source-output-record.json`.
- **Mobile LOD: PASS.** All 37 eligible meshes total 8,240 source triangles and 4,488 mobile triangles (0.54466 against the 0.55 ceiling); 15 protected meshes are unchanged. Full/mobile scene totals are 16,384/12,632 triangles.
- **Integrated browser capture: PASS for execution only.** The actual Chrome SceneIntegrator harness captured 17 views across 1440×1000, 1920×1080, 1024×768, 390×844, 320×600 and 844×390. It recorded zero JavaScript errors and stable runtime-source fingerprints. It is a local diagnostic harness, not production, device, performance or visual acceptance proof.
- **Reference fidelity: OPEN / REWORK.** The desktop and mobile captures retain a bright workstation, blue chair, pink hex lights and cyan floor, but the rendered room is much paler than the main reference’s saturated blue-violet/cyan lighting, and the seated resident/chair occupy too much of the foreground. The higher-density pegboard, headphone and accessory grouping is also less legible. Those observations identify a remaining composition/lighting review item; they do not isolate whether the cause is the candidate meshes, the current runtime camera/lighting, or both.

## Binding and limits

The candidate is not admitted in `app/public/asset-manifest.json`; that manifest remains bound to the earlier attempt-09 asset URLs. The browser harness substituted attempt-14 full-room art and the carried attempt-04 fixture without changing the public manifest. No source provenance review, independent art audit, Parent asset admission, device review or final combined release acceptance is recorded here. Keep the attempt-14 assets and manifest state candidate-only until those gates are completed.

Evidence: `evidence/build-attempt-14/`, `evidence/build-attempt-14-replay/`, `evidence/export-inspection-attempt-14.json`, `evidence/mobile-lod-comparison-attempt-14.json`, `evidence/browser-art-attempt-14/`, and `references/images/main-reference.png`.
