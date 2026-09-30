"""
YOR WORLD - W1-F1-r2 Native Blender Inspection Script
Script: inspect-native.py
Author: W1 Room/Blockout Maker (Gemini-1)
Purpose: Re-opens delivered blockout.blend in Blender read-only and records full object
         transforms, parent links, world bounding boxes, and camera parameters in runtime coordinates.
"""

import json
import math
from pathlib import Path
import bpy
from mathutils import Vector

OUT = Path(__file__).resolve().parent
BLEND_PATH = OUT.parent / "blockout.blend"

def runtime(v):
    return [float(v.x), float(v.z), float(-v.y)]

def describe(obj):
    data = {
        "name": obj.name,
        "type": obj.type,
        "parent": obj.parent.name if obj.parent else None,
        "runtimeWorldPosition": runtime(obj.matrix_world.translation),
        "localRotationEuler": list(obj.rotation_euler),
        "hideRender": obj.hide_render
    }
    if obj.type == "MESH":
        points = [obj.matrix_world @ Vector(p) for p in obj.bound_box]
        converted = [runtime(p) for p in points]
        data["runtimeBounds"] = {
            "min": [min(v[a] for v in converted) for a in range(3)],
            "max": [max(v[a] for v in converted) for a in range(3)]
        }
    if obj.type == "CAMERA":
        data.update(
            angleDegrees=math.degrees(obj.data.angle),
            sensorFit=obj.data.sensor_fit,
            forwardRuntime=runtime(obj.matrix_world.to_quaternion() @ Vector((0, 0, -1)))
        )
    return data

def main():
    bpy.ops.wm.open_mainfile(filepath=str(BLEND_PATH), load_ui=False, use_scripts=False)
    result = {
        "tool": bpy.app.version_string,
        "buildHash": bpy.app.build_hash.decode() if hasattr(bpy.app.build_hash, 'decode') else str(bpy.app.build_hash),
        "blendPath": str(BLEND_PATH),
        "fps": bpy.context.scene.render.fps,
        "objects": [describe(obj) for obj in bpy.data.objects],
        "materials": [m.name for m in bpy.data.materials],
        "cameras": [c.name for c in bpy.data.cameras]
    }
    out_file = OUT / "native-inspection.json"
    out_file.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote native inspection data to {out_file}")
    print("NATIVE_INSPECTION_COMPLETE")

if __name__ == "__main__":
    main()
