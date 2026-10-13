#!/usr/bin/env python3
"""Read-only recross-checks for B1-R3 assets, captures, and builder output."""
from __future__ import annotations

import hashlib
import json
import pathlib
import re
import struct

OUT = pathlib.Path(__file__).resolve().parent
ROOT = OUT.parents[4]
CAND = ROOT / "deliveries" / "FINISH-B1-R3"
SCRATCH = OUT / ".work" / "replay" / "deliveries" / "FINISH-B1-R3"


def sha(path: pathlib.Path) -> dict:
    data = path.read_bytes()
    return {"bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}


def png_dimensions(path: pathlib.Path):
    data = path.read_bytes()
    if len(data) < 24 or data[:8] != b"\x89PNG\r\n\x1a\n" or data[12:16] != b"IHDR":
        return None
    return [int.from_bytes(data[16:20], "big"), int.from_bytes(data[20:24], "big")]


def raw_nodes(path: pathlib.Path):
    data = path.read_bytes()
    cursor = 12
    gltf = None
    while cursor < len(data):
        length, kind = struct.unpack_from("<I4s", data, cursor)
        cursor += 8
        chunk = data[cursor:cursor + length]
        cursor += length
        if kind == b"JSON":
            gltf = json.loads(chunk.decode("utf-8").rstrip("\0 \t\r\n"))
            break
    if gltf is None:
        raise ValueError(f"No JSON chunk in {path}")
    nodes = gltf.get("nodes", [])
    parents = {}
    for i, node in enumerate(nodes):
        for child in node.get("children", []):
            parents[child] = i
    return gltf, nodes, parents


inspection = json.loads((OUT / "independent-glb-inspection.json").read_text(encoding="utf-8"))
files = {item["file"]: item for item in inspection["files"]}
room = files["room.glb"]
fixture = files["fixture.glb"]
resident = files["resident.glb"]
named = {
    "room": room["anchors"],
    "fixture": fixture["anchors"],
    "resident": resident["anchors"],
}
asset_paths = {"room": CAND / "assets" / "room.glb", "fixture": CAND / "assets" / "fixture.glb", "resident": CAND / "assets" / "resident.glb"}
raw_asset_data = {k: raw_nodes(p) for k, p in asset_paths.items()}
raw_name_maps = {
    asset: {n.get("name"): (idx, n) for idx, n in enumerate(data[1]) if n.get("name")}
    for asset, data in raw_asset_data.items()
}
required = {
    "room": ["Room_Root", "door", "Door_Frame", "Door_Hinge", "Door_Leaf", "keyboard_body", "keycaps_main", "mouse_body", "Zenith_Core", "Camera_Lens_Ring", "Mic_LED", "Clock_Face", "Speaker_LED"],
    "fixture": ["chair-root", "chair-base", "Chair_Seat"],
    "resident": ["resident", "resident-body", "body-turn", "foot.L", "foot.R"],
}
ownership = {}
for asset, names in required.items():
    anchors = named[asset]
    ownership[asset] = {}
    nodes = raw_asset_data[asset][1]
    parents = raw_asset_data[asset][2]
    raw_map = raw_name_maps[asset]
    for name in names:
        if name in anchors:
            ownership[asset][name] = anchors[name]
        elif name in raw_map:
            idx, node = raw_map[name]
            parent_idx = parents.get(idx)
            ownership[asset][name] = {
                "parent": nodes[parent_idx].get("name") if parent_idx is not None else None,
                "localTranslation": node.get("translation", [0, 0, 0]),
                "hasMesh": "mesh" in node,
                "skin": node.get("skin"),
                "status": "PASS raw GLB JSON node inspection",
            }
        else:
            ownership[asset][name] = {"status": "MISSING"}
    ownership[asset]["rawNamedNodeCount"] = sum(n.get("name") is not None for n in nodes)
    ownership[asset]["rawDuplicateNodeNames"] = sorted({n.get("name") for n in nodes if n.get("name")} - {name for name in {n.get("name") for n in nodes if n.get("name")} if sum(1 for x in nodes if x.get("name") == name) == 1})
ownership["duplicateNodeNames"] = {name: files[name]["duplicateNodeNames"] for name in files}
ownership["semanticCounts"] = {
    name: {k: files[name][k] for k in ("nodeCount", "meshDefinitionCount", "meshNodeInstances", "primitiveCount", "vertexAccessorCount", "triangles", "materials")}
    for name in files
}
ownership["staticBatchPolicy"] = json.loads((CAND / "validator-logs" / "static-batch-report.json").read_text(encoding="utf-8-sig"))["policy"]
ownership["fixtureStaticBatchPolicy"] = json.loads((CAND / "validator-logs" / "fixture-static-batch-report.json").read_text(encoding="utf-8-sig"))["policy"]
ownership["roomStaticBatchExclusions"] = json.loads((CAND / "validator-logs" / "static-batch-report.json").read_text(encoding="utf-8-sig"))["unmergedCandidateSkips"]
ownership["chairSeatStatus"] = json.loads((CAND / "validator-logs" / "fixture-static-batch-report.json").read_text(encoding="utf-8-sig"))["contactTarget"]
(OUT / "ownership-recheck.json").write_text(json.dumps(ownership, indent=2) + "\n", encoding="utf-8")

capture_index = json.loads((CAND / "captures" / "index.json").read_text(encoding="utf-8-sig"))
capture_rows = []
indexed_paths = set()
for row in capture_index["captures"]:
    expected_size = row.get("expectedPixels")
    image_results = {}
    for kind, item in row.get("files", {}).items():
        path = CAND / pathlib.PurePosixPath(item["path"])
        actual = sha(path) if path.is_file() else None
        dimensions = png_dimensions(path) if path.is_file() else None
        indexed_paths.add(item["path"])
        image_results[kind] = {
            "path": item["path"],
            "expected": {"bytes": item.get("bytes"), "sha256": item.get("sha256")},
            "actual": actual,
            "pngDimensions": dimensions,
            "dimensionsMatchExpected": dimensions == expected_size,
            "hashAndSizePass": bool(actual and actual["bytes"] == item.get("bytes") and actual["sha256"] == item.get("sha256")),
        }
    capture_rows.append({"key": row["key"], "expectedPixels": expected_size, "actualPixels": row.get("actualPixels"), "viewport": row.get("viewport"), "camera": row.get("camera"), "renderer": row.get("renderer"), "browser": row.get("browser"), "gpu": row.get("gpu"), "loadedAssetHashes": row.get("loadedAssetHashes"), "files": image_results})
native_index = json.loads((CAND / "captures" / "native" / "index.json").read_text(encoding="utf-8-sig"))
capture_files = {p.relative_to(CAND).as_posix() for p in (CAND / "captures").rglob("*") if p.is_file()}
native_index_paths = {item["path"] for item in native_index.get("files", [])}
indexed_capture_relpaths = indexed_paths | native_index_paths | {"captures/index.json", "captures/native/index.json"}
unindexed_capture_files = sorted(capture_files - indexed_capture_relpaths)
native_results = []
for item in native_index.get("files", []):
    path = CAND / pathlib.PurePosixPath(item["path"])
    actual = sha(path) if path.is_file() else None
    native_results.append({"path": item["path"], "expected": {"bytes": item.get("bytes"), "sha256": item.get("sha256")}, "actual": actual, "pass": bool(actual and actual["bytes"] == item.get("bytes") and actual["sha256"] == item.get("sha256"))})
capture_summary = {
    "indexedViewCount": len(capture_rows),
    "indexedBrowserImages": sum(len(r["files"]) for r in capture_rows),
    "browserImageHashPass": sum(x["hashAndSizePass"] for row in capture_rows for x in row["files"].values()),
    "browserImageHashFail": sum(not x["hashAndSizePass"] for row in capture_rows for x in row["files"].values()),
    "browserImageDimensionsPass": sum(x["dimensionsMatchExpected"] for row in capture_rows for x in row["files"].values()),
    "unindexedCaptureFiles": unindexed_capture_files,
    "nativeCaptureCount": len(native_results),
    "nativeCapturePassed": sum(r["pass"] for r in native_results),
    "nativeCaptureFailed": sum(not r["pass"] for r in native_results),
    "nativeScope": native_index.get("scope"),
    "comparisonDirectoryExists": (CAND / "captures" / "comparisons").is_dir(),
    "comparisonFileCount": sum(1 for p in (CAND / "captures" / "comparisons").rglob("*") if p.is_file()) if (CAND / "captures" / "comparisons").is_dir() else 0,
    "perViewDeviationFieldPresent": any(any("deviation" in key.lower() for key in row) for row in capture_rows),
    "captureRows": capture_rows,
    "nativeFiles": native_results,
}
(OUT / "capture-recheck.json").write_text(json.dumps(capture_summary, indent=2) + "\n", encoding="utf-8")

log_bytes = (OUT / "resident-builder-rerun.log").read_bytes()
builder_log = log_bytes.decode("utf-16", errors="replace") if log_bytes.startswith(b"\xff\xfe") else log_bytes.decode("utf-8", errors="replace")
match = re.search(r"RESIDENT_GENERATION_SUCCESS\s+(\{[^\r\n]*\})", builder_log)
if not match:
    raise SystemExit("Could not locate builder success payload in reviewer log")
rerun_payload = json.loads(match.group(1))
final_resident = sha(CAND / "assets" / "resident.glb")
scratch_resident = sha(SCRATCH / "assets" / "resident.glb")
scratch_fixture = sha(SCRATCH / "assets" / "fixture.glb")
path_guard = json.loads((CAND / "validator-logs" / "path-guard-and-baseline-restoration.json").read_text(encoding="utf-8-sig"))
builder = {
    "command": "Blender 5.2.2 --background --python <isolated-copy>/deliveries/FINISH-B1-R3/source/blender/scripts/build-resident-fixture.py",
    "exitCode": 0,
    "blenderVersion": "5.2.2 LTS (d13f752e3b9c)",
    "log": "resident-builder-rerun.log",
    "candidateAsset": {"bytes": final_resident["bytes"], "sha256": final_resident["sha256"]},
    "makerPriorBuilderHash": path_guard["residentBaseline"]["nativeStaticBatchBuildOutputHash"],
    "reviewerRerunPayload": rerun_payload,
    "reviewerRerunScratchResident": scratch_resident,
    "reviewerRerunScratchFixture": scratch_fixture,
    "reviewerRunMatchesDeliveredResident": scratch_resident["sha256"] == final_resident["sha256"],
    "reviewerRunMatchesMakerPriorBuilderHash": scratch_resident["sha256"] == path_guard["residentBaseline"]["nativeStaticBatchBuildOutputHash"],
    "reviewerRunFixtureMatchesDeliveredFixture": scratch_fixture["sha256"] == sha(CAND / "assets" / "fixture.glb")["sha256"],
    "makerFinalExportDisposition": path_guard["residentBaseline"]["disposition"],
}
(OUT / "resident-builder-recheck.json").write_text(json.dumps(builder, indent=2) + "\n", encoding="utf-8")

print(json.dumps({
    "capture": {k: capture_summary[k] for k in ("indexedViewCount", "indexedBrowserImages", "browserImageHashPass", "browserImageHashFail", "browserImageDimensionsPass", "unindexedCaptureFiles", "nativeCaptureCount", "nativeCapturePassed", "nativeCaptureFailed", "comparisonDirectoryExists", "comparisonFileCount", "perViewDeviationFieldPresent")},
    "builder": {k: builder[k] for k in ("candidateAsset", "makerPriorBuilderHash", "reviewerRerunScratchResident", "reviewerRunMatchesDeliveredResident", "reviewerRunMatchesMakerPriorBuilderHash", "reviewerRunFixtureMatchesDeliveredFixture")},
    "ownership": {"roomNodes": room["nodeCount"], "roomTriangles": room["triangles"], "residentNodes": resident["nodeCount"], "fixtureNodes": fixture["nodeCount"], "allNodeNamesUnique": all(not f["duplicateNodeNames"] for f in files.values())}
}, indent=2))
