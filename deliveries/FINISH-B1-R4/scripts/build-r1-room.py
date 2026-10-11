"""Rebuild only the native room source and room GLB from the R4 authoring builder."""

import hashlib
import importlib.util
import json
import sys
from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[1]
BUILDER_PATH = ROOT / "source" / "blender" / "scripts" / "build-environment.py"


def identity(path: Path) -> dict:
    raw = path.read_bytes()
    return {"path": str(path), "bytes": len(raw), "sha256": hashlib.sha256(raw).hexdigest()}


def main() -> int:
    blender_args = sys.argv[sys.argv.index("--") + 1 :]
    if len(blender_args) != 2:
        raise SystemExit("usage: blender --background --python build-r1-room.py -- <room.blend> <room.glb>")
    blend_out, glb_out = (Path(value).resolve() for value in blender_args)
    blend_out.parent.mkdir(parents=True, exist_ok=True)
    glb_out.parent.mkdir(parents=True, exist_ok=True)

    spec = importlib.util.spec_from_file_location("finish_b1_r4_builder", BUILDER_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot load R4 builder at {BUILDER_PATH}")
    builder = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = builder
    spec.loader.exec_module(builder)

    builder.clear_scene()
    coll_room = bpy.data.collections.new("Room_Collection")
    coll_group_b = bpy.data.collections.new("Group_B_Collection")
    coll_on_demand = bpy.data.collections.new("On_Demand_Collection")
    coll_cameras = bpy.data.collections.new("Cameras")
    for collection in (coll_room, coll_group_b, coll_on_demand, coll_cameras):
        bpy.context.scene.collection.children.link(collection)

    materials = builder.create_all_materials(builder.TEXTURES_DIR)
    room_root = builder.build_room_environment(coll_room, materials)
    group_b_root = builder.build_optional_details(coll_group_b, materials)
    builder.build_project_effects(coll_on_demand, materials)
    room_batch = builder.batch_static_meshes(room_root, room_root, parent_local=False)
    group_b_batch = builder.batch_static_meshes(group_b_root, group_b_root, parent_local=False)
    builder.setup_cameras(coll_cameras)

    bpy.ops.wm.save_as_mainfile(filepath=str(blend_out))
    glb_bytes = builder.export_gltf_group(room_root, glb_out, export_anim=False)
    result = {
        "status": "PASS",
        "blenderVersion": bpy.app.version_string,
        "builder": identity(BUILDER_PATH),
        "roomBatch": room_batch,
        "groupBBatch": group_b_batch,
        "roomExportBytes": glb_bytes,
        "nativeSource": identity(blend_out),
        "roomGlb": identity(glb_out),
        "otherProductionExports": "NOT RUN; this routine exports only room.glb",
    }
    print("FINISH_B1_R4_R1_BUILD=" + json.dumps(result, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
