"""Prove static-scope changes and emit GLB object/material inventories."""
from __future__ import annotations
import hashlib, json, pathlib, struct

OUT = pathlib.Path(__file__).resolve().parents[1]
R5 = OUT / "inputs" / "r5" / "FINISH-B1-R5"
ASSET_NAMES = ["room.glb", "resident.glb", "fixture.glb", "group-b-props.glb", "on-demand-projects.glb"]

def sha(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()

def glb(p: pathlib.Path):
    raw = p.read_bytes()
    if raw[:4] != b"glTF" or struct.unpack_from("<I", raw, 4)[0] != 2 or struct.unpack_from("<I", raw, 8)[0] != len(raw):
        raise SystemExit(f"Invalid GLB container: {p}")
    n, typ = struct.unpack_from("<II", raw, 12)
    if typ != 0x4E4F534A:
        raise SystemExit(f"Missing JSON chunk: {p}")
    doc = json.loads(raw[20:20+n])
    off = 20+n
    bn, bt = struct.unpack_from("<II", raw, off)
    if bt != 0x004E4942 or off+8+bn > len(raw):
        raise SystemExit(f"Missing/invalid BIN chunk: {p}")
    return raw, doc, raw[off+8:off+8+bn]

merge = json.loads((OUT / "evidence" / "static-geometry-merge.json").read_text(encoding="utf-8"))
merge_by_asset = {x["asset"]: x for x in merge["assets"]}
invariants, inventories = [], []
for name in ASSET_NAMES:
    base_raw, base, base_bin = glb(R5 / "assets" / name)
    out_path = OUT / "assets" / name
    raw, doc, binary = glb(out_path)
    if name not in ("room.glb", "fixture.glb"):
        if raw != base_raw:
            raise SystemExit(f"Out-of-scope asset changed: {name}")
        changed_meshes = []
        binary_prefix = True
        unchanged = True
    else:
        expected = merge_by_asset[name]
        changed_meshes = [x["meshIndex"] for x in expected["changedMeshes"]]
        if doc.get("nodes") != base.get("nodes"):
            raise SystemExit(f"Node/hierarchy/transforms changed in {name}")
        if doc.get("materials") != base.get("materials"):
            raise SystemExit(f"Materials changed in {name}")
        if len(doc.get("meshes", [])) != len(base.get("meshes", [])):
            raise SystemExit(f"Mesh count changed in {name}")
        actual_changed = [i for i,(a,b) in enumerate(zip(base["meshes"], doc["meshes"])) if a != b]
        if actual_changed != sorted(changed_meshes):
            raise SystemExit(f"Unexpected changed mesh indices in {name}: {actual_changed} != {changed_meshes}")
        for key in ("scenes", "scene", "animations", "cameras", "skins", "images", "textures", "samplers",
                    "extensions", "extensionsUsed", "extensionsRequired"):
            if doc.get(key) != base.get(key):
                raise SystemExit(f"{key} changed in {name}")
        for key in ("accessors", "bufferViews"):
            if doc.get(key, [])[:len(base.get(key, []))] != base.get(key, []):
                raise SystemExit(f"Original {key} changed in {name}")
        binary_prefix = binary[:len(base_bin)] == base_bin
        if not binary_prefix:
            raise SystemExit(f"Original BIN data not preserved as prefix in {name}")
        for node in base["nodes"]:
            if "door" in node.get("name", "").lower() or "window" in node.get("name", "").lower() or "camera" in node.get("name", "").lower():
                if doc["nodes"][base["nodes"].index(node)] != node:
                    raise SystemExit(f"Protected transform changed: {node.get('name')}")
        if name == "room.glb":
            glass_node = next(n for n in base["nodes"] if n.get("name") == "StaticBatch__Room_Root__PC_TemperedGlass")
            glass_index = glass_node["mesh"]
            if base["meshes"][glass_index] != doc["meshes"][glass_index]:
                raise SystemExit("PC_TemperedGlass geometry changed")
            for protected in ("StaticBatch__Room_Root__Door_OakWood", "StaticBatch__Room_Root__Baseboard_Charcoal"):
                node = next((n for n in base["nodes"] if n.get("name") == protected), None)
                if node and base["meshes"][node["mesh"]] != doc["meshes"][node["mesh"]]:
                    raise SystemExit(f"Protected door mesh changed: {protected}")
        unchanged = True

    mesh_rows = []
    for ni, node in enumerate(doc.get("nodes", [])):
        if "mesh" not in node:
            continue
        mesh = doc["meshes"][node["mesh"]]
        materials = sorted({doc["materials"][p["material"]].get("name", f"material-{p['material']}")
                            for p in mesh["primitives"] if "material" in p})
        triangle_count = 0
        for primitive in mesh["primitives"]:
            if "indices" in primitive:
                triangle_count += doc["accessors"][primitive["indices"]]["count"] // 3
            elif "POSITION" in primitive.get("attributes", {}):
                triangle_count += doc["accessors"][primitive["attributes"]["POSITION"]]["count"] // 3
        mesh_rows.append({"nodeIndex": ni, "node": node.get("name", f"node-{ni}"), "meshIndex": node["mesh"],
                          "mesh": mesh.get("name", f"mesh-{node['mesh']}"), "materials": materials,
                          "primitives": len(mesh["primitives"]), "triangles": triangle_count})
    inventory = {"asset": name, "bytes": len(raw), "sha256": sha(raw), "nodes": len(doc.get("nodes", [])),
                 "meshes": len(doc.get("meshes", [])), "materials": [m.get("name", f"material-{i}") for i,m in enumerate(doc.get("materials", []))],
                 "meshObjects": mesh_rows}
    inventories.append(inventory)
    invariants.append({"asset": name, "status": "PASS", "outputBytes": len(raw), "sha256": sha(raw),
                       "r5Bytes": len(base_raw), "r5SHA256": sha(base_raw), "nodesExact": True,
                       "materialsExact": True, "changedMeshIndices": changed_meshes,
                       "allOriginalBinaryBytesPreservedAsPrefix": binary_prefix, "unchangedOutsideApprovedMeshes": unchanged})

browser = json.loads((OUT / "evidence" / "browser-results.json").read_text(encoding="utf-8"))
measurements = {(m["variant"],m["key"]): m for m in browser["measurements"]}
for key in ("desktop-home", "mobile-home"):
    a, b = measurements[("R5",key)], measurements[("R6",key)]
    for field in ("camera", "renderer", "loadedModels"):
        if a[field] != b[field]:
            raise SystemExit(f"Matched browser profile changed {field}: {key}")
    invariants.append({"asset": f"browser-profile:{key}", "status": "PASS", "cameraAndRendererExact": True,
                       "R5Calls": a["rendererInfo"]["calls"], "R6Calls": b["rendererInfo"]["calls"],
                       "R5Triangles": a["rendererInfo"]["triangles"], "R6Triangles": b["rendererInfo"]["triangles"],
                       "R6FrameMedianMs": b.get("frameSamples",{}).get("medianMs"),
                       "R6FrameP95Ms": b.get("frameSamples",{}).get("p95Ms")})
responses = browser["assetResponses"]
for variant in ("R5", "R6"):
    rows = responses[variant]
    names = sorted(pathlib.PurePosixPath(x["url"].split("?")[0]).name for x in rows)
    if len(rows) != 5 or names != sorted(ASSET_NAMES):
        raise SystemExit(f"Runtime request set changed/failed for {variant}: {names}")
    if any(x.get("status") != 200 for x in rows):
        raise SystemExit(f"Non-200 runtime asset response in {variant}")
if sorted(pathlib.PurePosixPath(x["url"].split("?")[0]).name for x in responses["R5"]) != sorted(pathlib.PurePosixPath(x["url"].split("?")[0]).name for x in responses["R6"]):
    raise SystemExit("Runtime request set changed between R5 and R6")
invariants.append({"asset": "runtime-requests", "status": "PASS", "R5Requests": 5, "R6Requests": 5,
                   "sameRequestSet": True, "http200": True, "noNewAssetIdsOrLoads": True})

receipt = {"status": "PASS", "scope": "Static room and fixture geometry only; no new nodes, meshes, materials, interactions, or runtime requests.",
           "checks": invariants, "prohibitedChanges": [],
           "limitations": "This is a maker structural check, not independent audit, owner visual approval, or Parent acceptance."}
(OUT / "evidence" / "final-invariants.json").write_text(json.dumps(receipt, indent=2)+"\n", encoding="utf-8")
(OUT / "evidence" / "final-inventory.json").write_text(json.dumps({"status":"PASS","assets":inventories}, indent=2)+"\n", encoding="utf-8")
print(json.dumps({"status":"PASS","assets":len(inventories),"meshObjects":sum(len(x['meshObjects']) for x in inventories),
                  "materials":{x['asset']:len(x['materials']) for x in inventories},"runtimeRequests":5}, indent=2))
