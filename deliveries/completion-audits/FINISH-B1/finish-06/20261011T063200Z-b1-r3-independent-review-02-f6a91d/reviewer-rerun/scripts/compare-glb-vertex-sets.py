#!/usr/bin/env python3
"""Compare source GLB world-space unique vertex sets by material across batching."""
import collections
import hashlib
import json
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FINAL = ROOT / ".work" / "source-root" / "deliveries" / "FINISH-B1-R3" / "assets"
PRE = ROOT / "reviewer-rerun" / "prebatch-inputs" / "assets"
OUT = ROOT / "reviewer-rerun" / "validator-logs" / "vertex-set-comparison.json"
NEAREST_OUT = ROOT / "reviewer-rerun" / "validator-logs" / "vertex-nearest-distance-diagnostic.json"
COMP = {5120: ("b", 1), 5121: ("B", 1), 5122: ("h", 2), 5123: ("H", 2), 5125: ("I", 4), 5126: ("f", 4)}
WIDTH = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT2": 4, "MAT3": 9, "MAT4": 16}
PRECISION = 4  # decimal meters, i.e. 0.1 mm coordinate bins


def file_identity(path):
    raw = path.read_bytes()
    return {"bytes": len(raw), "sha256": hashlib.sha256(raw).hexdigest()}


def identity():
    return [[1.0 if r == c else 0.0 for c in range(4)] for r in range(4)]


def multiply(a, b):
    return [[sum(a[r][k] * b[k][c] for k in range(4)) for c in range(4)] for r in range(4)]


def transform(m, point):
    v = [point[0], point[1], point[2], 1.0]
    return tuple(sum(m[r][c] * v[c] for c in range(4)) for r in range(3))


def local_matrix(node):
    if "matrix" in node:
        values = node["matrix"]
        return [[float(values[c * 4 + r]) for c in range(4)] for r in range(4)]
    x, y, z, w = node.get("rotation", [0, 0, 0, 1])
    sx, sy, sz = node.get("scale", [1, 1, 1])
    tx, ty, tz = node.get("translation", [0, 0, 0])
    rotation = [
        [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
        [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
        [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)],
    ]
    m = identity()
    for i, scale in enumerate((sx, sy, sz)):
        for j in range(3):
            m[j][i] = rotation[j][i] * scale
    m[0][3], m[1][3], m[2][3] = tx, ty, tz
    return m


class GLB:
    def __init__(self, path):
        self.path = path
        raw = path.read_bytes()
        magic, version, size = struct.unpack_from("<III", raw, 0)
        if (magic, version, size) != (0x46546C67, 2, len(raw)):
            raise ValueError(f"Invalid GLB header: {path}")
        chunks = {}
        offset = 12
        while offset < len(raw):
            length, kind = struct.unpack_from("<II", raw, offset)
            offset += 8
            chunks[kind] = raw[offset:offset + length]
            offset += length
        self.doc = json.loads(chunks[0x4E4F534A])
        self.binary = chunks.get(0x004E4942, b"")
        self.nodes = self.doc.get("nodes", [])
        self.parents = {child: index for index, node in enumerate(self.nodes) for child in node.get("children", [])}
        self.world = {}

    def world_matrix(self, index):
        if index not in self.world:
            matrix = local_matrix(self.nodes[index])
            parent = self.parents.get(index)
            if parent is not None:
                matrix = multiply(self.world_matrix(parent), matrix)
            self.world[index] = matrix
        return self.world[index]

    def accessor(self, index):
        accessor = self.doc["accessors"][index]
        count = accessor["count"]
        width = WIDTH[accessor["type"]]
        fmt, size = COMP[accessor["componentType"]]
        if "sparse" in accessor:
            raise ValueError(f"Sparse accessors are unsupported: {self.path}:{index}")
        view = self.doc["bufferViews"][accessor["bufferView"]]
        base = view.get("byteOffset", 0) + accessor.get("byteOffset", 0)
        stride = view.get("byteStride", width * size)
        return [struct.unpack_from("<" + fmt * width, self.binary, base + row * stride) for row in range(count)]

    def reachable(self):
        scene_index = self.doc.get("scene", 0)
        roots = self.doc.get("scenes", [{}])[scene_index].get("nodes", [])
        seen = set()

        def visit(index):
            if index in seen:
                return
            seen.add(index)
            for child in self.nodes[index].get("children", []):
                visit(child)

        for index in roots:
            visit(index)
        return seen


def material_vertices(glb):
    materials = glb.doc.get("materials", [])
    all_points = collections.defaultdict(set)
    raw_points = collections.defaultdict(set)
    counts = collections.Counter()
    mesh_instances = collections.Counter()
    for node_index in sorted(glb.reachable()):
        node = glb.nodes[node_index]
        if "mesh" not in node:
            continue
        world = glb.world_matrix(node_index)
        mesh = glb.doc["meshes"][node["mesh"]]
        for primitive in mesh.get("primitives", []):
            material_index = primitive.get("material")
            material = materials[material_index].get("name", f"material-{material_index}") if material_index is not None else "<default>"
            positions = glb.accessor(primitive["attributes"]["POSITION"])
            mesh_instances[material] += 1
            for position in positions:
                raw_point = tuple(transform(world, position[:3]))
                raw_points[material].add(raw_point)
                all_points[material].add(tuple(round(value, PRECISION) for value in raw_point))
                counts[material] += 1
    return all_points, raw_points, counts, mesh_instances


def max_nearest(source, target):
    if not source or not target:
        return None
    max_distance = 0.0
    over_1e5 = 0
    over_1e4 = 0
    for point in source:
        nearest = min(
            sum((point[i] - candidate[i]) ** 2 for i in range(3)) ** 0.5
            for candidate in target
        )
        max_distance = max(max_distance, nearest)
        over_1e5 += nearest > 1e-5
        over_1e4 += nearest > 1e-4
    return {"maxNearestDistanceM": max_distance, "pointsOver1e-5M": over_1e5, "pointsOver1e-4M": over_1e4}


assets = sorted(set(path.stem for path in FINAL.glob("*.glb")) & set(path.stem for path in PRE.glob("*.glb")))
comparisons = []
nearest_comparisons = []
for asset in assets:
    pre_path = PRE / f"{asset}.glb"
    final_path = FINAL / f"{asset}.glb"
    pre_points, pre_raw, pre_counts, pre_meshes = material_vertices(GLB(pre_path))
    final_points, final_raw, final_counts, final_meshes = material_vertices(GLB(final_path))
    material_rows = []
    for material in sorted(set(pre_points) | set(final_points)):
        pre_set = pre_points[material]
        final_set = final_points[material]
        missing = sorted(pre_set - final_set)
        extra = sorted(final_set - pre_set)
        raw_distance_pre_to_final = max_nearest(pre_raw[material], final_raw[material])
        raw_distance_final_to_pre = max_nearest(final_raw[material], pre_raw[material])
        material_rows.append({
            "material": material,
            "prebatchMeshPrimitiveInstances": pre_meshes[material],
            "finalMeshPrimitiveInstances": final_meshes[material],
            "prebatchVertexOccurrences": pre_counts[material],
            "finalVertexOccurrences": final_counts[material],
            "prebatchUniqueWorldVertices": len(pre_set),
            "finalUniqueWorldVertices": len(final_set),
            "missingUniqueVertices": len(missing),
            "extraUniqueVertices": len(extra),
            "sampleMissing": missing[:8],
            "sampleExtra": extra[:8],
            "maxNearestPreToFinal": raw_distance_pre_to_final,
            "maxNearestFinalToPre": raw_distance_final_to_pre,
            "status": "PASS" if not missing and not extra else "DIFFERENCE",
        })
        nearest_comparisons.append({
            "asset": asset,
            "material": material,
            "prebatchUniqueWorldVertices": len(pre_raw[material]),
            "finalUniqueWorldVertices": len(final_raw[material]),
            "maxNearestPreToFinal": raw_distance_pre_to_final,
            "maxNearestFinalToPre": raw_distance_final_to_pre,
        })
    comparisons.append({
        "asset": asset,
        "prebatch": file_identity(pre_path),
        "final": file_identity(final_path),
        "materialComparisons": material_rows,
        "differenceMaterials": [row["material"] for row in material_rows if row["status"] != "PASS"],
        "status": "PASS" if all(row["status"] == "PASS" for row in material_rows) else "DIFFERENCE",
    })

result = {
    "scope": "Independent binary accessor decode of default-scene world-space POSITION values, grouped by glTF material. Comparison uses unique coordinate sets rounded to 0.1 mm; it avoids treating triangle diagonal/index ordering or duplicate vertex multiplicity as geometry change. It does not prove identical topology, shading, or visual quality.",
    "precisionDecimalPlacesMeters": PRECISION,
    "assets": comparisons,
    "summary": {
        "comparedAssets": len(comparisons),
        "differenceAssets": [asset["asset"] for asset in comparisons if asset["status"] != "PASS"],
        "differenceMaterialCount": sum(len(asset["differenceMaterials"]) for asset in comparisons),
    },
}
OUT.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
nearest_result = {
    "scope": "Independent nearest-point diagnostic over full-precision unique world-space POSITION coordinate sets by material. Reports symmetric nearest distances and counts beyond 0.01 mm and 0.1 mm. This is a vertex-location comparison, not a triangle-surface or topology proof.",
    "comparedMaterials": nearest_comparisons,
}
NEAREST_OUT.write_text(json.dumps(nearest_result, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"vertexSetSummary": result["summary"], "nearestDistanceMaterialCount": len(nearest_comparisons)}, indent=2))
