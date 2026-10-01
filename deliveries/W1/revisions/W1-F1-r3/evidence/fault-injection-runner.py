"""
YOR WORLD - W1 Clearance Fault Injection Test Suite (Revision W1-F1-r3)
Script: fault-injection-runner.py
Author: W1 Room Correction Worker (Gemini Pro)
Packet: W1-CORR-02 (Parent Codex Correction Delta Audit Resolution)

Demonstrates that the exact geometry-derived clearance checker detects and rejects
deliberate physical collisions (satisfies W1-02 and resolves parent delta audit counterexamples).
"""

import bpy
import mathutils
import math
import os
import sys
import json
import time

def b2r(bx, by, bz):
    return (float(bx), float(bz), -float(by))

def get_obj_runtime_bounds(obj):
    bpy.context.view_layer.update()
    pts = [obj.matrix_world @ mathutils.Vector(p) for p in obj.bound_box]
    r_pts = [b2r(p.x, p.y, p.z) for p in pts]
    min_b = [min(p[i] for p in r_pts) for i in range(3)]
    max_b = [max(p[i] for p in r_pts) for i in range(3)]
    return {"min": min_b, "max": max_b}

# Import the exact evaluate_clearance_and_collisions function from build-blockout.py
script_dir = os.path.dirname(os.path.abspath(__file__))
r3_root = os.path.dirname(script_dir)
sys.path.insert(0, r3_root)
from importlib.machinery import SourceFileLoader
generator_mod = SourceFileLoader("generator", os.path.join(r3_root, "build-blockout.py")).load_module()
evaluate_clearance_and_collisions = generator_mod.evaluate_clearance_and_collisions

def reopen_blend(blend_path):
    bpy.ops.wm.open_mainfile(filepath=blend_path, load_ui=False, use_scripts=False)
    bpy.context.view_layer.update()

def main():
    blend_path = os.path.join(r3_root, "blockout.blend")
    report_path = os.path.join(script_dir, "fault-injection.json")

    print(f"Loading candidate blend from {blend_path}...")
    reopen_blend(blend_path)

    tests = []

    # --------------------------------------------------------------------------
    # Test 0: Normal Baseline Candidate Geometry
    # --------------------------------------------------------------------------
    print("Running Test 0: Normal Candidate Clearance Check...")
    r0 = evaluate_clearance_and_collisions()
    pass0 = (
        r0["door_sweep"]["status"] == "PASS" and
        r0["entry_path"]["status"] == "PASS" and
        r0["chair_turn"]["status"] == "PASS"
    )
    print(f"Test 0 Verdict: {'PASS' if pass0 else 'FAIL'}")
    tests.append({
        "testId": "FAULT-INJECT-00",
        "description": "Baseline delivery scene clearance verification",
        "mutation": "Un-mutated candidate geometry",
        "expectedOutcome": "PASS",
        "actualOutcome": "PASS" if pass0 else "FAIL",
        "detectorAction": "All clearances evaluated clear above thresholds",
        "details": {
            "door_sweep": r0["door_sweep"]["status"],
            "entry_path": r0["entry_path"]["status"],
            "chair_turn": r0["chair_turn"]["status"],
            "min_door_wall_clearance_m": r0["door_sweep"]["measured_min_wall_clearance_m"],
            "min_door_desk_clearance_m": r0["door_sweep"]["measured_min_desk_clearance_m"],
            "chair_base_to_desk_clearance_m": r0["chair_turn"]["base_to_desk_front_clearance_m"],
            "armrest_vertical_clearance_m": r0["chair_turn"]["armrest_vertical_clearance_m"]
        },
        "verdict": "PASS" if pass0 else "FAIL"
    })

    # --------------------------------------------------------------------------
    # Test 1: Chair Base Desk Collision (Parent Counterexample 1)
    # Displace chair-root forward by +0.29m in Blender Y (Runtime Z = -0.65m)
    # --------------------------------------------------------------------------
    print("Running Test 1: Fault Injection - Chair base pushed into desk (Runtime Z = -0.65m)...")
    reopen_blend(blend_path)
    chair_root = bpy.data.objects.get("chair-root")
    chair_root.location.y += 0.29 # Moves forward in Blender +Y (-Z runtime)
    bpy.context.view_layer.update()

    r1 = evaluate_clearance_and_collisions()
    status1 = r1["chair_turn"]["status"]
    measured_gap1 = r1["chair_turn"]["base_to_desk_front_clearance_m"]
    # Must FAIL because signed clearance is negative (-0.22m)
    detected1 = (status1 == "FAIL") and (measured_gap1 < 0.0)
    print(f"Test 1 Verdict: {'PASS' if detected1 else 'FAIL'} (Measured gap: {measured_gap1}m, Status: {status1})")
    tests.append({
        "testId": "FAULT-INJECT-01",
        "description": "Chair base forward desk collision fault (Parent Counterexample 1)",
        "mutation": "Displace chair-root by +0.29m in Blender Y (Runtime Z = -0.65m, penetrating desk front Z = -0.75m)",
        "expectedOutcome": "FAIL",
        "actualOutcome": status1,
        "detectorAction": f"Clearance checker detected signed clearance {measured_gap1}m <= 0.02m and rejected collision",
        "verdict": "PASS" if detected1 else "FAIL"
    })

    # --------------------------------------------------------------------------
    # Test 2: Wall Left Door Leaf Collision (Parent Counterexample 2)
    # Displace wall_left to X = -1.20m, colliding with closed door leaf
    # --------------------------------------------------------------------------
    print("Running Test 2: Fault Injection - Wall left moved into closed door (X = -1.20m)...")
    reopen_blend(blend_path)
    wall_left = bpy.data.objects.get("wall_left")
    wall_left.location.x = -1.20 # Moves left wall inward
    bpy.context.view_layer.update()

    r2 = evaluate_clearance_and_collisions()
    status2 = r2["door_sweep"]["status"]
    measured_gap2 = r2["door_sweep"]["measured_min_wall_clearance_m"]
    detected2 = (status2 == "FAIL") and (measured_gap2 < 0.05)
    print(f"Test 2 Verdict: {'PASS' if detected2 else 'FAIL'} (Measured min wall gap: {measured_gap2}m, Status: {status2})")
    tests.append({
        "testId": "FAULT-INJECT-02",
        "description": "Left wall inward displacement door collision fault (Parent Counterexample 2)",
        "mutation": "Displace wall_left center to X = -1.20m (overlapping door leaf closed X in [-1.64, -0.76])",
        "expectedOutcome": "FAIL",
        "actualOutcome": status2,
        "detectorAction": f"Clearance checker detected wall clearance {measured_gap2}m <= 0.05m and rejected collision",
        "verdict": "PASS" if detected2 else "FAIL"
    })

    # --------------------------------------------------------------------------
    # Test 3: Entry Camera Right Corridor Boundary Violation (Parent Counterexample 3)
    # Move Camera_Entry to X = 0.0m (beyond right corridor frame at -0.65m)
    # --------------------------------------------------------------------------
    print("Running Test 3: Fault Injection - Entry camera moved past right corridor wall (X = 0.0m)...")
    reopen_blend(blend_path)
    cam_entry = bpy.data.objects.get("Camera_Entry")
    cam_entry.location.x = 0.0 # runtime X = 0.0
    bpy.context.view_layer.update()

    r3 = evaluate_clearance_and_collisions()
    status3 = r3["entry_path"]["status"]
    right_gap3 = r3["entry_path"]["entry_camera_right_clearance_m"]
    detected3 = (status3 == "FAIL") and (right_gap3 < 0.20)
    print(f"Test 3 Verdict: {'PASS' if detected3 else 'FAIL'} (Measured right gap: {right_gap3}m, Status: {status3})")
    tests.append({
        "testId": "FAULT-INJECT-03",
        "description": "Entry camera corridor boundary violation fault (Parent Counterexample 3)",
        "mutation": "Displace Camera_Entry to X = 0.0m (past right corridor frame boundary X = -0.65m)",
        "expectedOutcome": "FAIL",
        "actualOutcome": status3,
        "detectorAction": f"Clearance checker detected right clearance {right_gap3}m <= 0.20m and rejected boundary violation",
        "verdict": "PASS" if detected3 else "FAIL"
    })

    # --------------------------------------------------------------------------
    # Test 4: Elevated Armrests Tabletop Collision
    # Elevate armrests +80mm (Y = 0.745m, penetrating 0.700m desk underside)
    # --------------------------------------------------------------------------
    print("Running Test 4: Fault Injection - Elevated chair armrests (+80mm)...")
    reopen_blend(blend_path)
    armrest_l = bpy.data.objects.get("chair_armrest_left_pad")
    armrest_r = bpy.data.objects.get("chair_armrest_right_pad")
    armrest_l.location.z += 0.08 # +80mm in Blender Z (+Y runtime)
    armrest_r.location.z += 0.08
    bpy.context.view_layer.update()

    r4 = evaluate_clearance_and_collisions()
    status4 = r4["chair_turn"]["status"]
    vertical_gap4 = r4["chair_turn"]["armrest_vertical_clearance_m"]
    detected4 = (status4 == "FAIL") and (vertical_gap4 < 0.01)
    print(f"Test 4 Verdict: {'PASS' if detected4 else 'FAIL'} (Measured vertical gap: {vertical_gap4}m, Status: {status4})")
    tests.append({
        "testId": "FAULT-INJECT-04",
        "description": "Armrest tabletop penetration collision fault",
        "mutation": "Elevate chair armrests +80mm to Y = 0.745m (penetrating 0.700m desk underside by 45mm)",
        "expectedOutcome": "FAIL",
        "actualOutcome": status4,
        "detectorAction": f"Clearance checker detected vertical clearance {vertical_gap4}m <= 0.01m and rejected collision",
        "verdict": "PASS" if detected4 else "FAIL"
    })

    # Restore clean blend state
    reopen_blend(blend_path)

    all_passed = all(t["verdict"] == "PASS" for t in tests)
    output = {
        "executedAtUtc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "blenderVersion": bpy.app.version_string,
        "suiteVerdict": "PASS" if all_passed else "FAIL",
        "totalTests": len(tests),
        "passedTests": sum(1 for t in tests if t["verdict"] == "PASS"),
        "testResults": tests
    }

    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2)

    print(f"Wrote fault injection report to {report_path}")
    print(f"FAULT_INJECTION_SUITE_COMPLETE: {'PASS' if all_passed else 'FAIL'}")

if __name__ == "__main__":
    main()
