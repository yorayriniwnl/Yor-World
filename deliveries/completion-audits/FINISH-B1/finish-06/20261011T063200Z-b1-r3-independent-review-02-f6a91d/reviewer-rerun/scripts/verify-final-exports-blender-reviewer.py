import bpy
import hashlib
import json
import sys
from pathlib import Path

SCRIPT = Path(__file__).resolve()
DELIVERY = Path('C:\\Users\\yoray\\Projects\\Yor World\\deliveries\\completion-audits\\FINISH-B1\\finish-06\\20261011T063200Z-b1-r3-independent-review-02-f6a91d\\.work\\source-root\\deliveries\\FINISH-B1-R3')
ASSETS = DELIVERY / "assets"
OUT = Path('C:\\Users\\yoray\\Projects\\Yor World\\deliveries\\completion-audits\\FINISH-B1\\finish-06\\20261011T063200Z-b1-r3-independent-review-02-f6a91d\\reviewer-rerun\\validator-logs\\final-export-blender-import.json')
FILES = [
    "room.glb",
    "resident.glb",
    "fixture.glb",
    "group-b-props.glb",
    "on-demand-projects.glb",
]

rows = []
for filename in FILES:
    filepath = ASSETS / filename
    data = filepath.read_bytes()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(filepath))
    depsgraph = bpy.context.evaluated_depsgraph_get()
    bpy.context.view_layer.update()
    depsgraph = bpy.context.evaluated_depsgraph_get()
    objects = list(bpy.data.objects)
    meshes = [obj for obj in objects if obj.type == "MESH"]
    armatures = [obj for obj in objects if obj.type == "ARMATURE"]
    world_points = []
    triangle_count = 0
    vertex_count = 0
    for obj in meshes:
        evaluated = obj.evaluated_get(depsgraph)
        mesh = evaluated.to_mesh()
        mesh.calc_loop_triangles()
        triangle_count += len(mesh.loop_triangles)
        vertex_count += len(mesh.vertices)
        world_points.extend(obj.matrix_world @ vertex.co for vertex in mesh.vertices)
        evaluated.to_mesh_clear()
    bounds = None
    if world_points:
        bounds = {
            "min": [min(point[i] for point in world_points) for i in range(3)],
            "max": [max(point[i] for point in world_points) for i in range(3)],
        }
    actions = sorted({action.name for action in bpy.data.actions})
    rows.append({
        "file": f"assets/{filename}",
        "bytes": len(data),
        "sha256": hashlib.sha256(data).hexdigest(),
        "status": "PASS" if meshes else "FAIL",
        "sceneObjects": len(objects),
        "meshObjects": len(meshes),
        "meshVertices": vertex_count,
        "triangles": triangle_count,
        "armatureObjects": len(armatures),
        "bones": sum(len(armature.data.bones) for armature in armatures),
        "actions": actions,
        "worldBoundsBlenderAxes": bounds,
    })

result = {
    "scope": "Blender 5.2.2 import-only validation of the exact final full-export GLB bytes. Geometry totals and world bounds are measured after native Blender glTF import. This is distinct from source-builder animation/contact checks.",
    "blenderVersion": bpy.app.version_string,
    "files": rows,
    "summary": {
        "files": len(rows),
        "passed": sum(row["status"] == "PASS" for row in rows),
        "failed": sum(row["status"] == "FAIL" for row in rows),
    },
}
OUT.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
print(json.dumps(result["summary"], indent=2))
if result["summary"]["failed"]:
    sys.exit(1)
