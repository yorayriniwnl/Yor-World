"""Reopen two independently rebuilt R4 .blend files and compare semantics."""

import hashlib
import importlib.util
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


OUT = Path(__file__).resolve().parents[1]
BLENDER_ROOT = OUT / "source" / "blender" / "scripts"
BUILDER_PATH = BLENDER_ROOT / "build-environment.py"
HELPER_PATH = Path(__file__).with_name("verify-r1-native.py")
FIRST_BLEND = OUT / ".work" / "repro-r1" / "room.blend"
FINAL_BLEND = OUT / "assets" / "source" / "room.blend"


def load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot load verifier helper: {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def digest(value) -> str:
    raw = json.dumps(value, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def snapshot(path: Path, helper, builder) -> dict:
    bpy.ops.wm.open_mainfile(filepath=str(path))
    objects = {obj.name: helper.object_signature(obj, builder) for obj in sorted(bpy.data.objects, key=lambda item: item.name)}
    materials = {mat.name: helper.material_signature(mat) for mat in sorted(bpy.data.materials, key=lambda item: item.name)}
    if not all(math.isfinite(value) for obj in bpy.data.objects for row in obj.matrix_world for value in row):
        raise RuntimeError(f"non-finite native transform in {path}")

    required = (
        "Room_Root", "room-shell", "helios-pc", "pc_chassis_frame", "pc_internal_backplate",
        "pc_glass_side_panel", "PC_Fan_Group", "helios_fan_blades", "Helios_Network_LED",
        "window_frame", "window_glass", "blind_slat_1", "blind_slat_12",
        "StaticBatch__Room_Root__PC_TemperedGlass",
        "StaticBatch__Room_Root__Wall_SoftLavender",
    )
    missing = [name for name in required if name not in objects]
    if missing:
        raise RuntimeError(f"native scene is missing required nodes {missing}: {path}")
    parents = {name: objects[name]["parent"] for name in required}
    expected_parents = {
        "pc_chassis_frame": "helios-pc",
        "pc_internal_backplate": "helios-pc",
        "pc_glass_side_panel": "helios-pc",
        "PC_Fan_Group": "helios-pc",
        "helios_fan_blades": "PC_Fan_Group",
        "Helios_Network_LED": "helios-pc",
        "window_glass": "room-shell",
        "window_frame": "room-shell",
    }
    for name, parent in expected_parents.items():
        if parents[name] != parent:
            raise RuntimeError(f"native hierarchy changed for {name}: {parents[name]} != {parent}")

    pc_material = materials.get("PC_TemperedGlass")
    if pc_material is None:
        raise RuntimeError("PC_TemperedGlass is absent from the reopened native scene")
    shader = bpy.data.materials["PC_TemperedGlass"].node_tree.nodes.get("Principled BSDF")
    if shader is None:
        raise RuntimeError("PC_TemperedGlass has no Principled BSDF")
    alpha = float(shader.inputs["Alpha"].default_value)
    transmission = float(shader.inputs["Transmission Weight"].default_value)
    if abs(alpha - 0.18) > 1e-6 or transmission != 0.0:
        raise RuntimeError(f"reopened glass differs from R1: alpha={alpha}, transmission={transmission}")
    glass_batch = bpy.data.objects["StaticBatch__Room_Root__PC_TemperedGlass"]
    glass_slots = [slot.material.name if slot.material else None for slot in glass_batch.material_slots]
    if glass_slots != ["PC_TemperedGlass"]:
        raise RuntimeError(f"batched PC/window glass material binding changed: {glass_slots}")
    if any(bpy.data.objects[name].type != "EMPTY" for name in ("pc_glass_side_panel", "window_glass")):
        raise RuntimeError("glass source anchors should remain non-rendering empties after static batching")

    fan = bpy.data.objects["PC_Fan_Group"]
    fan_center = builder.b2r(*fan.matrix_world.translation)
    if any(abs(value - expected) > 1e-5 for value, expected in zip(fan_center, (1.05, 0.99, -0.914))):
        raise RuntimeError(f"PC fan-group world center changed: {fan_center}")
    runtime_axis = builder.b2r(*(fan.matrix_world.to_3x3() @ Vector((0.0, -1.0, 0.0))))
    if any(abs(value - expected) > 1e-5 for value, expected in zip(runtime_axis, (0.0, 0.0, 1.0))):
        raise RuntimeError(f"fan runtime +Z axis changed: {runtime_axis}")

    return {
        "path": str(path.relative_to(OUT)),
        "bytes": path.stat().st_size,
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "objectCount": len(objects),
        "meshCount": sum(obj.type == "MESH" for obj in bpy.data.objects),
        "materialCount": len(materials),
        "actionCount": len(bpy.data.actions),
        "objectInventoryGeometryHierarchyTransformMaterialSHA256": digest(objects),
        "materialInventoryNodeGraphSHA256": digest(materials),
        "requiredParents": parents,
        "glass": {"alpha": alpha, "transmission": transmission, "material": "PC_TemperedGlass"},
        "glassBatchMaterialSlots": glass_slots,
        "fanWorldCenter": list(fan_center),
        "fanRuntimeAxis": list(runtime_axis),
        "allTransformsFinite": True,
        "status": "PASS",
    }


def main() -> int:
    if not FIRST_BLEND.is_file() or not FINAL_BLEND.is_file():
        raise RuntimeError("both independent native Blender builds must be present")
    helper = load_module("finish_b1_native_compare", HELPER_PATH)
    builder = load_module("finish_b1_r4_native_reopen_builder", BUILDER_PATH)
    first = snapshot(FIRST_BLEND, helper, builder)
    final = snapshot(FINAL_BLEND, helper, builder)
    if first["objectInventoryGeometryHierarchyTransformMaterialSHA256"] != final["objectInventoryGeometryHierarchyTransformMaterialSHA256"]:
        raise RuntimeError("independent native .blend object/geometry/UV/hierarchy/transform/material inventories differ")
    if first["materialInventoryNodeGraphSHA256"] != final["materialInventoryNodeGraphSHA256"]:
        raise RuntimeError("independent native .blend material node graphs differ")
    receipt = {
        "status": "PASS",
        "command": "Blender --background --python-exit-code 17 --python scripts/verify-native-reopen-r1.py",
        "blenderVersion": bpy.app.version_string,
        "semanticInventoryByteExact": True,
        "nativeBlendContainerByteExact": first["sha256"] == final["sha256"],
        "independentBuilds": [first, final],
        "scope": "Reopened full authoring scenes; canonical mesh-face ordering preserves winding and checks every object, vertex, UV association, material binding, hierarchy and transform. Container timestamps may vary.",
    }
    out = OUT / "evidence" / "native-reopen-r1.json"
    out.write_text(json.dumps(receipt, indent=2, sort_keys=True) + "\n", encoding="utf-8", newline="\n")
    print("FINISH_B1_R4_R1_NATIVE_REOPEN=" + json.dumps({"status": "PASS", "objectInventorySHA256": final["objectInventoryGeometryHierarchyTransformMaterialSHA256"], "evidence": str(out)}, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
