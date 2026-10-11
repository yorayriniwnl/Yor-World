"""Fresh-import every production GLB and verify finite transforms."""

import bpy
import hashlib
import json
import math
from pathlib import Path

OUT = Path(__file__).resolve().parents[1]
rows = []
for asset in sorted((OUT / "assets").glob("*.glb")):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(asset))
    objects = list(bpy.data.objects)
    if not all(math.isfinite(value) for obj in objects for row in obj.matrix_world for value in row):
        raise RuntimeError(f"non-finite transform in {asset.name}")
    rows.append({
        "file": f"assets/{asset.name}",
        "sha256": hashlib.sha256(asset.read_bytes()).hexdigest(),
        "objects": len(objects),
        "meshes": sum(obj.type == "MESH" for obj in objects),
        "materials": len(bpy.data.materials),
        "actions": len(bpy.data.actions),
        "status": "PASS",
    })
receipt = {
    "command": "Blender --background --python-exit-code 17 --python scripts/verify-blender-imports-r1.py",
    "version": bpy.app.version_string,
    "files": rows,
    "scope": "Fresh Blender import and finite-transform check for all five exact final GLBs; visual quality and runtime-owner acceptance remain separate.",
}
out = OUT / "evidence" / "blender-imports-r1.json"
out.write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8", newline="\n")
print("FINISH_B1_R4_R1_IMPORTS=" + json.dumps({"status": "PASS", "files": len(rows), "evidence": str(out)}))
