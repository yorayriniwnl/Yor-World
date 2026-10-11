"""Refresh final R1 inspection, issue matrix, report, and package hashes."""

import hashlib
import json
import pathlib
import struct


OUT = pathlib.Path(__file__).resolve().parents[1]


def load(path: str):
    return json.loads((OUT / path).read_text(encoding="utf-8"))


def write(path: str, value) -> None:
    (OUT / path).write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8")


def glb(path: str):
    raw = (OUT / path).read_bytes()
    json_size = struct.unpack_from("<I", raw, 12)[0]
    return json.loads(raw[20:20 + json_size])


old = glb("inputs/r3/assets/room.glb")
new = glb("assets/room.glb")
glass_index = next(index for index, material in enumerate(old["materials"]) if material["name"] == "PC_TemperedGlass")
if old["materials"][:glass_index] + old["materials"][glass_index + 1:] != new["materials"][:glass_index] + new["materials"][glass_index + 1:]:
    raise RuntimeError("a non-glass material changed")
assigned = []
for node_index, node in enumerate(new["nodes"]):
    if "mesh" not in node:
        continue
    for primitive_index, primitive in enumerate(new["meshes"][node["mesh"]]["primitives"]):
        if primitive.get("material") == glass_index:
            old_primitive = old["meshes"][node["mesh"]]["primitives"][primitive_index]
            assigned.append({
                "nodeIndex": node_index,
                "nodeName": node["name"],
                "meshIndex": node["mesh"],
                "primitiveIndex": primitive_index,
                "primitiveExactR3": primitive == old_primitive,
            })
if len(assigned) != 1 or not assigned[0]["primitiveExactR3"]:
    raise RuntimeError(f"PC glass primitive or material assignment changed: {assigned}")
glass_before = old["materials"][glass_index]
glass_after = new["materials"][glass_index]
write("evidence/final-material-inspection.json", {
    "status": "PASS",
    "roomSHA256": hashlib.sha256((OUT / "assets/room.glb").read_bytes()).hexdigest(),
    "glassIndex": glass_index,
    "before": glass_before,
    "after": glass_after,
    "assignedGLBPrimitives": assigned,
    "otherMaterialsExact": True,
    "noTransmissionMaterialInFinalGLB": not any(
        "KHR_materials_transmission" in material.get("extensions", {}) for material in new["materials"]
    ),
})

browser = load("evidence/browser-results-r1.json")
budget = load("evidence/final-budgets-r1.json")
lineage = load("evidence/lineage-r1.json")
final_lineage = load("evidence/final-lineage.json")
native_reopen = load("evidence/native-reopen-r1.json")
repro = load("evidence/final-export-reproducibility.json")
versions = load("evidence/tool-versions.json")
if final_lineage.get("sourcePatchReplayByteExact") is not True or final_lineage.get("totalTriangleDelta") != 132:
    raise RuntimeError("final lineage is missing its exact source replay or authorized triangle delta")
if repro.get("productionRoomMergeByteExact") is not True or native_reopen.get("semanticInventoryByteExact") is not True:
    raise RuntimeError("production merge replay or native semantic reopen check failed")

issues = [
    {"id": "DRAWS", "status": "PASS LOCAL", "finding": "103 desktop / 75 mobile raw calls; intercepted totals match, one frame each, and no transmission pass.", "evidence": "evidence/browser-results-r1.json"},
    {"id": "GEOMETRY-VISIBILITY", "status": "PASS LOCAL MECHANICAL; REVIEW PENDING", "finding": "Four authorized geometry deltas match the amendment; matched exterior and oblique captures show case depth and fan rings behind alpha glass. Backplate partly occludes the rings.", "evidence": "evidence/final-lineage.json; evidence/capture-reverification-r1.json"},
    {"id": "WINDOW-APERTURE", "status": "PASS LOCAL MECHANICAL; VISUAL LIMIT RECORDED", "finding": "The exterior capture shows room content through blind gaps; the interior close view is dominated by slats and does not independently establish the pane surface.", "evidence": "evidence/capture-reverification-r1.json"},
    {"id": "GLASS-REFLECTIONS", "status": "NOT PROVEN", "finding": "No exterior environment or reference-grade reflection/refraction is established by these local captures.", "evidence": "captures/FINISH-25-R1/"},
    {"id": "FULL-REFERENCE", "status": "FAIL / OPEN", "finding": "The inherited full-room composition remains darker and simpler than the supplied main visual reference; broader art work is outside this amendment.", "evidence": "captures/FINISH-25-R1/R4-R1/desktop-home/"},
    {"id": "DOOR-CAMERA", "status": "OPEN / NOT RUN", "finding": "FINISH-20 positive-Y sweep and production door-transform ownership remain unresolved and outside this amendment."},
    {"id": "PRODUCTION-DEVICES-G7", "status": "NOT RUN", "finding": "No production provider, physical-device, Safari, thermal, or network-entry proof was run."},
    {"id": "EXTERNAL-GPT2", "status": "NOT RUN", "finding": "No independent external GPT Plus #2 review or parent acceptance is claimed."},
    {"id": "SCOPE-LINEAGE", "status": "PASS", "finding": "Pinned source replay, 72-file checkpoint, only four authorized geometry deltas, and six unchanged production outputs.", "evidence": "evidence/lineage-r1.json; evidence/final-lineage.json"},
    {"id": "EXPORT-REPRODUCIBILITY", "status": "PASS WITH RAW INTERMEDIATE CAVEAT", "finding": "Full-scene raw Blender GLB hashes vary; two independent production merges produce the same room asset bytes and preserve the R3 binary prefix.", "evidence": "evidence/final-export-reproducibility.json"},
]
write("issue-matrix.json", {"candidate": "FINISH-B1-R4 amended R1", "makerAcceptance": False, "parentAcceptance": False, "issues": issues})

measurements = []
for variant in ("R3", "material-only", "R4-R1"):
    for row in browser["measurements"]:
        if row["variant"] == variant and row.get("limit"):
            measurements.append(
                f"| {variant} | {row['key']} | {row['rendererInfo']['calls']} | "
                f"{row['byPass'].get('main', 0)} | {row['byPass'].get('transmission', 0)} | "
                f"{row['rendererInfo']['triangles']} |"
            )
budget_rows = [
    f"| {row['profile']} | {row['actual']['calls']} | {row['actual']['triangles']} | "
    f"{row['actual']['allDeliveredUniqueTextureAssetGPUBytesEstimate']} | "
    f"{row['actual']['localMedianMs']:.3f} | {row['actual']['localP95Ms']:.3f} | PASS LOCAL |"
    for row in budget["profiles"]
]

report = f'''# FINISH-B1-R4 — FINISH-25 plus R1 local re-audit

**Reviewable bounded candidate; local packet checks pass, independent review and parent acceptance are pending.** This is not a maker self-acceptance, full B1 acceptance, canonical integration, or release approval.

## Exact inputs and scope

- Pinned base: FINISH-B1-R3 commit `1753b9278c4537b5377c3893172b2a0f26d13b10`, tree `9759ac9879bcc9489770b7c5784ead2f022157b0`.
- FINISH-25 packet: `105d79b1d4d3d36064a933fa745e3ca43a35a8cf`. FINISH-25-R1 authorization: `b33631a9bcbd74cfca9e8f2495140a5eee322a9a`.
- `evidence/lineage-r1.json` verifies 26 raw Git inputs, exact source patch replay, all eight production input identities, and the preserved 72-file material-only checkpoint (10,515,141 bytes; manifest SHA-256 `2957fb72ed270f9d6bd75fdce5f6dc0c1fe3e124da490a8a682fb9cf9731724a`).
- Final builder SHA-256: `{lineage['sourcePatchReplay']['candidateSha256']}`. Patch SHA-256: `{lineage['sourcePatchReplay']['patchSha256']}`.

## Geometry and material results

`PC_TemperedGlass` uses alpha 0.18 and zero transmission. The R1 geometry audit finds only the four allowed component changes. `pc_chassis_frame` changes from 12 to 60 triangles (+48); `pc_internal_backplate` adds 12; the existing wall component changes from 12 to 48 (+36); and `window_frame` changes from 12 to 48 (+36). Total change is +132 triangles. The backplate remains inside the chassis bounds. All other object geometry, UV associations, hierarchy, transforms, and material bindings match the pinned source; the one added node is `pc_internal_backplate`.

The PC fan hook remains centered at `(1.05, 0.99, -0.914)` with runtime +Z axis. The oblique exterior capture shows the three fan rings through the pane, partly occluded by the dark backplate. The window exterior capture shows room content through the blind gaps. Its interior close view is dominated by the slats and does not independently prove the pane surface. These local captures do not establish reference-grade reflections, an exterior environment, daylight, or blind interaction presets.

## Browser and local budgets

| Variant | Profile | Raw calls | Main pass | Transmission pass | Triangles |
| --- | --- | ---: | ---: | ---: | ---: |
{chr(10).join(measurements)}

R1 desktop is 103/120 calls and 15,428 triangles; mobile is 75/80 calls and 14,056 triangles. The intercepted count matches `renderer.info`, each measurement advances one frame, and transmission calls are zero. The run uses the pinned R3 harness with URL remapping, Three {versions['three']}, Playwright {versions['playwright']}, Chromium {versions['browser']}, DPR 1, exposure 0.85, and the same matched cameras/lights/animation state for all three variants. `evidence/browser-results-r1.json` contains per-call stack, owner, material flags, camera, lights, and loaded asset hashes; `evidence/capture-reverification-r1.json` verifies all 24 PNGs and the loaded GLB bodies.

| Profile | Calls | Triangles | GPU estimate bytes | Median ms | P95 ms | Result |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
{chr(10).join(budget_rows)}

Asset transfer, texture, geometry-memory estimate, triangle, and local timing limits pass. The GPU estimate excludes driver and framebuffer overhead; timing is local Chromium only. Provider, physical-device, thermal, production runtime, and G7 checks are **NOT RUN**.

## Exports and validation

Final `assets/room.glb` is {len((OUT / 'assets/room.glb').read_bytes())} bytes, SHA-256 `{hashlib.sha256((OUT / 'assets/room.glb').read_bytes()).hexdigest()}`. The four other production GLBs and two textures match pinned R3 bytes. GLB validation reports five files, zero errors, and zero warnings; fresh Blender import and finite transforms pass for all five.

Two independent Blender {native_reopen['blenderVersion']} builds reopen to the same semantic object, geometry, UV, material graph, hierarchy, and transform inventory. Their saved `.blend` containers and full-scene raw GLB intermediates are not byte-identical. The two raw GLBs have the same size but different hashes; merging either raw export into the pinned R3 records produces the exact same final room GLB bytes while preserving the original binary prefix and unrelated records. See `evidence/final-export-reproducibility.json` for the precise hashes and caveat.

## Acceptance boundary

The authorized glass and window visibility blockers pass local mechanical checks. Full reference fidelity remains **FAIL / OPEN**: the inherited composition is darker and simpler than `references/images/main-reference.png`. The FINISH-20 positive-Y door/camera sweep and production door-transform ownership remain unresolved. External GPT Plus #2 review, physical-device and production/provider checks are **NOT RUN**. No integration, publishing, downstream C2/C3 work, or broad B1 acceptance is authorized by this package.

`evidence/output-hashes-r1.json` lists the R1 source, inputs, assets, captures, and principal audit receipts. `output-hashes.json` and `evidence/package-verification.json` bind the complete delivered package, excluding only their documented self-cycle entries and scratch paths.
'''
(OUT / "report.md").write_text(report, encoding="utf-8")

excluded = {"output-hashes.json", "evidence/package-verification.json"}
ignored = {".work", "node_modules", "__pycache__", ".git"}
files = []
for path in sorted(OUT.rglob("*")):
    relative = path.relative_to(OUT)
    if not path.is_file() or any(part in ignored for part in relative.parts) or path.suffix == ".blend1" or relative.as_posix() in excluded:
        continue
    raw = path.read_bytes()
    files.append({"path": relative.as_posix(), "bytes": len(raw), "sha256": hashlib.sha256(raw).hexdigest()})
write("output-hashes.json", {
    "schemaVersion": 1,
    "candidate": "FINISH-B1-R4 FINISH-25+R1",
    "selfExcluded": sorted(excluded),
    "scratchExcluded": [".work/", "node_modules/", "__pycache__/", ".git/", "*.blend1"],
    "files": files,
    "totalBytes": sum(row["bytes"] for row in files),
})
print(json.dumps({"status": "PASS", "files": len(files), "bytes": sum(row["bytes"] for row in files), "roomSHA256": hashlib.sha256((OUT / "assets/room.glb").read_bytes()).hexdigest()}))
