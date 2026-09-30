"""Parent Blender inspection; opens delivered files without saving or re-exporting."""
import json
import math
from pathlib import Path
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[4]
OUT = Path(__file__).resolve().parent


def runtime(v):
    return [float(v.x), float(v.z), float(-v.y)]


def describe(obj):
    data = {"name": obj.name, "type": obj.type, "parent": obj.parent.name if obj.parent else None,
            "runtimeWorldPosition": runtime(obj.matrix_world.translation),
            "localRotationEuler": list(obj.rotation_euler), "hideRender": obj.hide_render}
    if obj.type == "MESH":
        points = [obj.matrix_world @ Vector(p) for p in obj.bound_box]
        converted = [runtime(p) for p in points]
        data["runtimeBounds"] = {"min": [min(v[a] for v in converted) for a in range(3)],
                                 "max": [max(v[a] for v in converted) for a in range(3)]}
    if obj.type == "CAMERA":
        data.update(angleDegrees=math.degrees(obj.data.angle), sensorFit=obj.data.sensor_fit,
                    forwardRuntime=runtime(obj.matrix_world.to_quaternion() @ Vector((0, 0, -1))))
    return data


result = {"tool": bpy.app.version_string, "buildHash": bpy.app.build_hash.decode(),
          "scope": "Independent read-only reopening and object/bounds inspection; no rendering, rebuilding or browser playback", "files": {}}
for path in ["deliveries/W1/blockout.blend", "deliveries/W2/avatar-proof.blend"]:
    bpy.ops.wm.open_mainfile(filepath=str(ROOT / path), load_ui=False, use_scripts=False)
    result["files"][path] = {"objects": [describe(obj) for obj in bpy.data.objects],
                             "fps": bpy.context.scene.render.fps,
                             "actions": [{"name": a.name, "range": list(a.frame_range)} for a in bpy.data.actions]}
(OUT / "native-inspection.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
print("PARENT_NATIVE_INSPECTION_COMPLETE")
