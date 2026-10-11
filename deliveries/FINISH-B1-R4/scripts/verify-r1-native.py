"""Compare R3 and amended R4 authoring scenes before static batching."""

import hashlib
import importlib.util
import json
import sys
from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[1]
R3_BUILDER = ROOT / "inputs" / "r3" / "source" / "blender" / "scripts" / "build-environment.py"
R4_BUILDER = ROOT / "source" / "blender" / "scripts" / "build-environment.py"
ALLOWED_GEOMETRY = {"wall_left", "window_frame", "pc_chassis_frame", "pc_internal_backplate"}
ALLOWED_MATERIAL = "PC_TemperedGlass"
DEBUG_GEOMETRY = {}


def fhex(value):
    return float(value).hex()


def digest(value) -> str:
    raw = json.dumps(value, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def canonical_cycle(sequence):
    """Ignore a polygon's arbitrary starting loop while preserving winding."""
    values = list(sequence)
    return min(tuple(values[index:] + values[:index]) for index in range(len(values))) if values else ()


def load_builder(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot load builder: {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def socket_value(value):
    if hasattr(value, "__iter__") and not isinstance(value, (str, bytes)):
        try:
            return [fhex(item) if isinstance(item, (int, float)) else str(item) for item in value]
        except TypeError:
            return str(value)
    if isinstance(value, float):
        return fhex(value)
    if isinstance(value, (bool, int, str)) or value is None:
        return value
    return str(value)


def material_signature(material):
    result = {
        "name": material.name,
        "diffuseColor": [fhex(v) for v in material.diffuse_color],
        "roughness": fhex(material.roughness),
        "metallic": fhex(material.metallic),
        "surfaceRenderMethod": getattr(material, "surface_render_method", None),
        "blendMethod": getattr(material, "blend_method", None),
        "useNodes": material.use_nodes,
    }
    if material.node_tree:
        nodes = []
        for node in sorted(material.node_tree.nodes, key=lambda item: item.name):
            sockets = []
            for socket in node.inputs:
                if hasattr(socket, "default_value"):
                    sockets.append({"name": socket.name, "default": socket_value(socket.default_value)})
            nodes.append({
                "name": node.name,
                "type": node.bl_idname,
                "label": node.label,
                "image": getattr(getattr(node, "image", None), "name", None),
                "inputs": sockets,
            })
        links = sorted(
            (
                link.from_node.name,
                link.from_socket.name,
                link.to_node.name,
                link.to_socket.name,
            )
            for link in material.node_tree.links
        )
        result["nodes"] = nodes
        result["links"] = links
    return result


def object_signature(obj, builder):
    transform = {
        "parent": obj.parent.name if obj.parent else None,
        "matrixBasis": [[fhex(v) for v in row] for row in obj.matrix_basis],
        "matrixParentInverse": [[fhex(v) for v in row] for row in obj.matrix_parent_inverse],
    }
    result = {"type": obj.type, **transform}
    if obj.type != "MESH":
        result.update({"geometry": None, "uv": None, "triangles": 0, "materialSlots": []})
        return result
    mesh = obj.data
    vertices = [[fhex(v) for v in vertex.co] for vertex in mesh.vertices]
    faces = [list(poly.vertices) for poly in mesh.polygons]
    uv_layers = []
    for layer in mesh.uv_layers:
        uv_layers.append({
            "name": layer.name,
            "values": [[fhex(v) for v in item.uv] for item in layer.data],
        })
    bounds = []
    if mesh.vertices:
        points = []
        for vertex in mesh.vertices:
            point = obj.matrix_world @ vertex.co
            points.append(builder.b2r(point.x, point.y, point.z))
        bounds = [
            [min(point[axis] for point in points).hex() for axis in range(3)],
            [max(point[axis] for point in points).hex() for axis in range(3)],
        ]
    canonical_faces = sorted(canonical_cycle(face) for face in faces)
    canonical_uv_faces = []
    if mesh.uv_layers:
        layer = mesh.uv_layers[0]
        for poly in mesh.polygons:
            corners = [
                (int(vertex_index), tuple(fhex(value) for value in layer.data[loop_index].uv))
                for vertex_index, loop_index in zip(poly.vertices, poly.loop_indices)
            ]
            canonical_uv_faces.append(canonical_cycle(corners))
    result.update({
        "vertexCount": len(vertices),
        "faceCount": len(faces),
        "triangles": sum(max(0, len(face) - 2) for face in faces),
        "geometry": digest({"vertices": vertices, "faces": canonical_faces}),
        "uv": digest(sorted(canonical_uv_faces)),
        "uvLayers": [{"name": layer["name"], "loopCount": len(layer["values"])} for layer in uv_layers],
        "worldBoundsRuntime": bounds,
        "materialSlots": [slot.material.name if slot.material else None for slot in obj.material_slots],
    })
    return result


def build_scene(builder, label):
    builder.clear_scene()
    collections = [bpy.data.collections.new(name) for name in (
        "Room_Collection", "Group_B_Collection", "On_Demand_Collection", "Cameras"
    )]
    for collection in collections:
        bpy.context.scene.collection.children.link(collection)
    room, group_b, on_demand, cameras = collections
    materials = builder.create_all_materials(builder.TEXTURES_DIR)
    builder.build_room_environment(room, materials)
    builder.build_optional_details(group_b, materials)
    builder.build_project_effects(on_demand, materials)
    builder.setup_cameras(cameras)
    bpy.context.view_layer.update()
    return (
        {obj.name: object_signature(obj, builder) for obj in sorted(bpy.data.objects, key=lambda item: item.name)},
        {material.name: material_signature(material) for material in sorted(bpy.data.materials, key=lambda item: item.name)},
    )


def main() -> int:
    r3_builder = load_builder("finish_b1_r3_builder", R3_BUILDER)
    r4_builder = load_builder("finish_b1_r4_builder", R4_BUILDER)
    r3_objects, r3_materials = build_scene(r3_builder, "R3")
    r4_objects, r4_materials = build_scene(r4_builder, "R4-R1")

    added = sorted(set(r4_objects) - set(r3_objects))
    removed = sorted(set(r3_objects) - set(r4_objects))
    if added != ["pc_internal_backplate"] or removed:
        raise RuntimeError(f"scene node inventory changed outside the amendment: added={added}; removed={removed}")
    if set(r3_materials) != set(r4_materials):
        raise RuntimeError("material inventory changed")
    material_differences = [
        name for name in r3_materials
        if r3_materials[name] != r4_materials[name]
    ]
    if material_differences != [ALLOWED_MATERIAL]:
        raise RuntimeError(f"unexpected material changes: {material_differences}")

    common = sorted(set(r3_objects) & set(r4_objects))
    unexpected = []
    for name in common:
        before, after = r3_objects[name], r4_objects[name]
        before_identity = {key: before[key] for key in ("type", "parent", "matrixBasis", "matrixParentInverse", "materialSlots")}
        after_identity = {key: after[key] for key in ("type", "parent", "matrixBasis", "matrixParentInverse", "materialSlots")}
        if before_identity != after_identity:
            unexpected.append({"name": name, "field": "node-transform-hierarchy-material-binding"})
        if name not in ALLOWED_GEOMETRY and before != after:
            unexpected.append({"name": name, "field": "geometry-or-UV"})
    if unexpected:
        raise RuntimeError(f"unapproved object-level changes: {unexpected[:10]}")

    authorized_geometry = {}
    for name in sorted(ALLOWED_GEOMETRY - {"pc_internal_backplate"}):
        before, after = r3_objects[name], r4_objects[name]
        if before["geometry"] == after["geometry"] or before["uv"] == after["uv"]:
            raise RuntimeError(f"authorized geometry component did not change as expected: {name}")
        authorized_geometry[name] = {
            "beforeTriangles": before["triangles"],
            "afterTriangles": after["triangles"],
            "triangleDelta": after["triangles"] - before["triangles"],
            "beforeBounds": before["worldBoundsRuntime"],
            "afterBounds": after["worldBoundsRuntime"],
            "uvLayers": after["uvLayers"],
            "material": after["materialSlots"],
            "parent": after["parent"],
            "matrixBasis": after["matrixBasis"],
            "matrixParentInverse": after["matrixParentInverse"],
        }

    expected_triangles = {
        "pc_chassis_frame": 60,
        "window_frame": 48,
        "wall_left": 48,
        "pc_internal_backplate": 12,
    }
    actual_triangles = {name: r4_objects[name]["triangles"] for name in ALLOWED_GEOMETRY}
    if actual_triangles != expected_triangles:
        raise RuntimeError(f"authorized geometry triangle counts differ: {actual_triangles}")
    expected_bounds = {
        "pc_chassis_frame": ((0.93, 0.76, -1.39), (1.17, 1.24, -0.91)),
        "window_frame": ((-2.16, 0.85, -1.20), (-2.12, 2.25, 0.0)),
        "wall_left": ((-2.20, 0.0, -1.8), (-2.10, 2.8, 1.8)),
        "pc_internal_backplate": ((1.151, 0.81, -1.34), (1.159, 1.19, -0.96)),
    }
    for name, (expected_min, expected_max) in expected_bounds.items():
        actual_min, actual_max = r4_objects[name]["worldBoundsRuntime"]
        actual_min = tuple(float.fromhex(value) for value in actual_min)
        actual_max = tuple(float.fromhex(value) for value in actual_max)
        if any(abs(a - b) > 1e-5 for a, b in zip(actual_min, expected_min)) or any(
            abs(a - b) > 1e-5 for a, b in zip(actual_max, expected_max)
        ):
            raise RuntimeError(f"{name} bounds differ from the FINISH-25-R1 values: {actual_min}, {actual_max}")
    backplate = r4_objects["pc_internal_backplate"]
    if backplate["parent"] != "helios-pc" or backplate["materialSlots"] != ["Baseboard_Charcoal"]:
        raise RuntimeError("PC backplate parent or material differs from FINISH-25-R1")

    report = {
        "status": "PASS",
        "scope": "Unbatched scene built from the exact pinned R3 authoring script and the final R4 builder; comparisons cover every object, mesh topology with winding preserved (polygon ordering/start-loop normalized), UV association, material binding, hierarchy and transform before static batching.",
        "baseBuilder": str(R3_BUILDER),
        "candidateBuilder": str(R4_BUILDER),
        "objectCountR3": len(r3_objects),
        "objectCountR4": len(r4_objects),
        "addedObjects": added,
        "removedObjects": removed,
        "materialInventoryCount": len(r3_materials),
        "changedMaterials": material_differences,
        "changedMaterialStatus": "FINISH-25 PC_TemperedGlass correction only",
        "authorizedGeometry": authorized_geometry,
        "authorizedTriangles": {
            "before": sum(r3_objects[name]["triangles"] for name in ("pc_chassis_frame", "window_frame", "wall_left")),
            "after": sum(actual_triangles.values()),
            "delta": sum(actual_triangles.values()) - sum(r3_objects[name]["triangles"] for name in ("pc_chassis_frame", "window_frame", "wall_left")),
        },
        "unchangedRepresentativeHooks": {
            name: {"geometry": r4_objects[name]["geometry"], "uv": r4_objects[name]["uv"], "parent": r4_objects[name]["parent"], "matrixBasis": r4_objects[name]["matrixBasis"], "materialSlots": r4_objects[name]["materialSlots"]}
            for name in ("PC_Fan_Group", "Helios_Network_LED", "window_glass", "pc_glass_side_panel", "blind_slat_1", "blind_slat_12")
        },
        "nonAuthorizedObjectChanges": [],
        "allOtherObjectGeometryUVHierarchyTRSMaterialBindingsExact": True,
    }
    out = ROOT / "evidence" / "native-parity-r1.json"
    out.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8", newline="\n")
    print("FINISH_B1_R4_R1_NATIVE=" + json.dumps({
        "status": report["status"],
        "objectCountR3": report["objectCountR3"],
        "objectCountR4": report["objectCountR4"],
        "addedObjects": added,
        "authorizedTriangleDeltas": {name: row["triangleDelta"] for name, row in authorized_geometry.items()},
        "evidence": str(out),
    }, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
