import hashlib
import json
import math
import struct
import sys
from pathlib import Path


def multiply(a, b):
    return [[sum(a[row][k] * b[k][col] for k in range(4)) for col in range(4)] for row in range(4)]


def local_matrix(node):
    if "matrix" in node:
        values = node["matrix"]
        return [[values[col * 4 + row] for col in range(4)] for row in range(4)]
    tx, ty, tz = node.get("translation", [0, 0, 0])
    sx, sy, sz = node.get("scale", [1, 1, 1])
    x, y, z, w = node.get("rotation", [0, 0, 0, 1])
    return [
        [(1 - 2*y*y - 2*z*z)*sx, (2*x*y - 2*z*w)*sy, (2*x*z + 2*y*w)*sz, tx],
        [(2*x*y + 2*z*w)*sx, (1 - 2*x*x - 2*z*z)*sy, (2*y*z - 2*x*w)*sz, ty],
        [(2*x*z - 2*y*w)*sx, (2*y*z + 2*x*w)*sy, (1 - 2*x*x - 2*y*y)*sz, tz],
        [0, 0, 0, 1],
    ]


def transform_point(matrix, point):
    x, y, z = point
    return [
        matrix[0][0]*x + matrix[0][1]*y + matrix[0][2]*z + matrix[0][3],
        matrix[1][0]*x + matrix[1][1]*y + matrix[1][2]*z + matrix[1][3],
        matrix[2][0]*x + matrix[2][1]*y + matrix[2][2]*z + matrix[2][3],
    ]


def glb_json(path):
    data = path.read_bytes()
    magic, version, declared_length = struct.unpack_from("<4sII", data, 0)
    if magic != b"glTF" or version != 2 or declared_length != len(data):
        raise ValueError("unexpected GLB header")
    offset = 12
    while offset < len(data):
        chunk_length, chunk_type = struct.unpack_from("<II", data, offset)
        offset += 8
        chunk = data[offset:offset + chunk_length]
        offset += chunk_length
        if chunk_type == 0x4E4F534A:
            return data, json.loads(chunk.decode("utf-8"))
    raise ValueError("GLB JSON chunk missing")


def main():
    glb_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2])
    data, gltf = glb_json(glb_path)
    nodes = gltf.get("nodes", [])
    meshes = gltf.get("meshes", [])
    accessors = gltf.get("accessors", [])
    materials = gltf.get("materials", [])
    parents = {}
    for parent_index, node in enumerate(nodes):
        for child_index in node.get("children", []):
            parents[child_index] = parent_index
    scenes = gltf.get("scenes", [])
    scene_index = gltf.get("scene", 0)
    roots = scenes[scene_index].get("nodes", []) if scenes else []
    computed = {}
    paths = {}

    def walk(index, parent_matrix, parent_path):
        node = nodes[index]
        world = multiply(parent_matrix, local_matrix(node))
        name = node.get("name", f"node_{index}")
        node_path = parent_path + [name]
        computed[index] = world
        paths[index] = node_path
        for child in node.get("children", []):
            walk(child, world, node_path)

    identity = [[1.0, 0, 0, 0], [0, 1.0, 0, 0], [0, 0, 1.0, 0], [0, 0, 0, 1.0]]
    for root in roots:
        walk(root, identity, [])

    def node_summary(index):
        node = nodes[index]
        matrix = computed.get(index, local_matrix(node))
        position = [matrix[row][3] for row in range(3)]
        mesh_index = node.get("mesh")
        primitive_summaries = []
        bounds_points = []
        if mesh_index is not None:
            for primitive in meshes[mesh_index].get("primitives", []):
                position_accessor_index = primitive.get("attributes", {}).get("POSITION")
                accessor = accessors[position_accessor_index] if position_accessor_index is not None else {}
                local_min = accessor.get("min")
                local_max = accessor.get("max")
                world_bounds = None
                if local_min and local_max:
                    corners = [transform_point(matrix, [local_min[0] if mask & 1 == 0 else local_max[0], local_min[1] if mask & 2 == 0 else local_max[1], local_min[2] if mask & 4 == 0 else local_max[2]]) for mask in range(8)]
                    world_bounds = {"min": [min(point[axis] for point in corners) for axis in range(3)], "max": [max(point[axis] for point in corners) for axis in range(3)]}
                    bounds_points.extend(corners)
                material_index = primitive.get("material")
                material = materials[material_index] if material_index is not None else None
                primitive_summaries.append({
                    "mode": primitive.get("mode", 4),
                    "positionAccessor": position_accessor_index,
                    "vertexCount": accessor.get("count"),
                    "localPositionBounds": {"min": local_min, "max": local_max} if local_min and local_max else None,
                    "worldBounds": world_bounds,
                    "material": material.get("name") if material else None,
                    "materialIndex": material_index,
                })
        mesh_bounds = None
        if bounds_points:
            mesh_bounds = {"min": [min(p[a] for p in bounds_points) for a in range(3)], "max": [max(p[a] for p in bounds_points) for a in range(3)]}
        return {
            "index": index,
            "name": node.get("name", f"node_{index}"),
            "path": "/".join(paths.get(index, [node.get("name", f"node_{index}")])),
            "parent": nodes[parents[index]].get("name") if index in parents else None,
            "translation": node.get("translation", [0, 0, 0]),
            "rotation": node.get("rotation", [0, 0, 0, 1]),
            "scale": node.get("scale", [1, 1, 1]),
            "worldPosition": position,
            "worldMatrix": matrix,
            "children": [nodes[child].get("name", f"node_{child}") for child in node.get("children", [])],
            "mesh": meshes[mesh_index].get("name") if mesh_index is not None else None,
            "meshBounds": mesh_bounds,
            "primitives": primitive_summaries,
        }

    patterns = ["speaker", "hex_panel", "lightbar", "monitor", "desk", "chair", "resident", "camera", "microphone", "console", "helios", "pegboard", "plant", "controller", "headset", "light_cyan", "light_task", "shelf"]
    relevant = [node_summary(index) for index, node in enumerate(nodes) if any(term in nodes[index].get("name", "").lower() for term in patterns)]
    mesh_primitive_count = sum(len(mesh.get("primitives", [])) for mesh in meshes)
    output = {
        "asset": {"path": str(glb_path), "sha256": hashlib.sha256(data).hexdigest(), "bytes": len(data), "version": gltf.get("asset", {}).get("version"), "generator": gltf.get("asset", {}).get("generator")},
        "sceneRoots": [nodes[index].get("name", f"node_{index}") for index in roots],
        "nodeCount": len(nodes),
        "meshCount": len(meshes),
        "meshPrimitiveCount": mesh_primitive_count,
        "materialCount": len(materials),
        "materials": [{"index": i, "name": m.get("name"), "pbrMetallicRoughness": m.get("pbrMetallicRoughness"), "emissiveFactor": m.get("emissiveFactor"), "doubleSided": m.get("doubleSided")} for i, m in enumerate(materials)],
        "relevantNodes": relevant,
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")
    print(f"nodes={len(nodes)} meshes={len(meshes)} materials={len(materials)} relevant={len(relevant)} sha256={output['asset']['sha256']}")


if __name__ == "__main__":
    main()
