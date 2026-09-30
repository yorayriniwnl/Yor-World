"""
YOR WORLD - Gemini-3 Independent Reviewer Verification Script
Script: reviewer-verify-w1-r2.py
Reviewer: Gemini-3 (W1-REV-02)
Target Candidate: W1-F1-r2 (deliveries/W1/revisions/W1-F1-r2/)
"""

import bpy
import mathutils
import math
import os
import sys
import json
import struct
import time
from pathlib import Path

def get_png_dimensions(path):
    with open(path, "rb") as f:
        f.seek(16)
        w, h = struct.unpack(">II", f.read(8))
        return [w, h]

ROOT = Path(__file__).resolve().parents[3]
DELIVERY_DIR = ROOT / "deliveries/W1/revisions/W1-F1-r2"
BLEND_PATH = DELIVERY_DIR / "blockout.blend"
GLB_PATH = DELIVERY_DIR / "room-blockout.glb"
RENDERS_DIR = DELIVERY_DIR / "renders"
OUT_JSON = Path(__file__).resolve().parent / "gemini3-reproduced-evidence.json"

def b2r(bx, by, bz):
    return [float(bx), float(bz), float(-by)]

def get_obj_runtime_bounds(obj):
    bpy.context.view_layer.update()
    pts = [obj.matrix_world @ mathutils.Vector(p) for p in obj.bound_box]
    r_pts = [b2r(p.x, p.y, p.z) for p in pts]
    min_b = [min(p[i] for p in r_pts) for i in range(3)]
    max_b = [max(p[i] for p in r_pts) for i in range(3)]
    return {"min": min_b, "max": max_b}

def main():
    print(f"Gemini-3 reopening {BLEND_PATH}...")
    bpy.ops.wm.open_mainfile(filepath=str(BLEND_PATH), load_ui=False, use_scripts=False)

    evidence = {
        "reviewer": "Gemini-3 (Independent Peer Reviewer)",
        "tool": bpy.app.version_string,
        "buildHash": bpy.app.build_hash.decode() if hasattr(bpy.app.build_hash, 'decode') else str(bpy.app.build_hash),
        "executedAtUtc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "targetCandidate": "deliveries/W1/revisions/W1-F1-r2/",
        "nativeInspections": {},
        "clearanceChecks": {},
        "renderInspections": {},
        "glbInspections": {}
    }

    # 1. Native Object Positions and Bounds
    key_objects = [
        "door-hinge", "door_leaf", "door_handle_plate", "door_handle_lever",
        "helios-pc", "gaming_headset", "controller-pegboard", "pegboard_controller_1",
        "talks-microphone", "fg_plant_pot", "desk_top", "chair-root",
        "chair_armrest_left_pad", "chair_armrest_right_pad",
        "drawer_unit_left_body", "drawer_unit_right_body"
    ]
    for name in key_objects:
        obj = bpy.data.objects.get(name)
        if obj:
            t = obj.matrix_world.translation
            bounds = get_obj_runtime_bounds(obj) if obj.type == 'MESH' else None
            evidence["nativeInspections"][name] = {
                "parent": obj.parent.name if obj.parent else None,
                "runtimeWorldPos": [round(x, 4) for x in b2r(t.x, t.y, t.z)],
                "runtimeBounds": {
                    "min": [round(x, 4) for x in bounds["min"]],
                    "max": [round(x, 4) for x in bounds["max"]]
                } if bounds else None
            }

    # 2. Geometry-Derived Clearance Evaluations
    door_leaf = bpy.data.objects.get("door_leaf")
    door_hinge = bpy.data.objects.get("door-hinge")
    hinge_r = b2r(door_hinge.matrix_world.translation.x,
                  door_hinge.matrix_world.translation.y,
                  door_hinge.matrix_world.translation.z)
    leaf_bounds = get_obj_runtime_bounds(door_leaf)
    leaf_w = leaf_bounds["max"][0] - leaf_bounds["min"][0]

    # Sample door sweep
    min_wall_gap = float("inf")
    min_desk_gap = float("inf")
    min_plant_gap = float("inf")
    for ang in [i * 5.0 for i in range(19)]:
        rad = math.radians(ang)
        tip_x = hinge_r[0] + leaf_w * math.cos(rad)
        tip_z = hinge_r[2] - leaf_w * math.sin(rad)
        w_gap = tip_x - (-2.10)
        d_gap = tip_z - (-0.75)
        p_gap = math.sqrt((tip_x - (-1.35))**2 + (tip_z - (-0.15))**2) - 0.26
        if w_gap < min_wall_gap: min_wall_gap = w_gap
        if d_gap < min_desk_gap: min_desk_gap = d_gap
        if p_gap < min_plant_gap: min_plant_gap = p_gap

    # Armrest vs Tabletop Underside
    arm_l_bounds = get_obj_runtime_bounds(bpy.data.objects.get("chair_armrest_left_pad"))
    arm_r_bounds = get_obj_runtime_bounds(bpy.data.objects.get("chair_armrest_right_pad"))
    desk_bounds = get_obj_runtime_bounds(bpy.data.objects.get("desk_top"))

    armrest_top_y = max(arm_l_bounds["max"][1], arm_r_bounds["max"][1])
    desk_underside_y = desk_bounds["min"][1]
    vertical_clearance = desk_underside_y - armrest_top_y

    evidence["clearanceChecks"] = {
        "doorSweep": {
            "minWallClearanceMeters": round(min_wall_gap, 4),
            "minDeskClearanceMeters": round(min_desk_gap, 4),
            "minPlantClearanceMeters": round(min_plant_gap, 4),
            "pass": min_wall_gap > 0.05 and min_desk_gap > 0.10 and min_plant_gap > 0.10
        },
        "armrestTabletop": {
            "armrestTopY": round(armrest_top_y, 4),
            "deskUndersideY": round(desk_underside_y, 4),
            "verticalClearanceMeters": round(vertical_clearance, 4),
            "pass": vertical_clearance > 0.01
        }
    }

    # 3. Render Image Checks
    render_files = [
        "camera-entry.png", "camera-home.png", "camera-mobile.png",
        "camera-monitor.png", "camera-reverse-doorway.png",
        "camera-reverse-doorway-open.png", "reference-match-color.png",
        "reference-comparison.png"
    ]
    for r_file in render_files:
        p = RENDERS_DIR / r_file
        if p.exists():
            dims = get_png_dimensions(str(p))
            evidence["renderInspections"][r_file] = {
                "dimensions": dims,
                "byteSize": p.stat().st_size,
                "aspect": f"{dims[0]}:{dims[1]}"
            }

    # 4. GLB Node World Transforms
    with open(GLB_PATH, "rb") as f:
        magic, ver, length = struct.unpack("<4sII", f.read(12))
        chunk_len, chunk_type = struct.unpack("<I4s", f.read(8))
        glb_json = json.loads(f.read(chunk_len).decode("utf-8"))

    evidence["glbInspections"] = {
        "byteLength": length,
        "nodeCount": len(glb_json.get("nodes", [])),
        "meshCount": len(glb_json.get("meshes", [])),
        "materialCount": len(glb_json.get("materials", [])),
        "cameraCount": len(glb_json.get("cameras", []))
    }

    OUT_JSON.write_text(json.dumps(evidence, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote Gemini-3 independent reproduced evidence to {OUT_JSON}")
    print("GEMINI3_VERIFICATION_COMPLETE")

if __name__ == "__main__":
    main()
