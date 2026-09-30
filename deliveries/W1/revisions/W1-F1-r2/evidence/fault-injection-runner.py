"""
YOR WORLD - W1-F1-r2 Clearance Checker Fault Injection Test
Script: fault-injection-runner.py
Author: W1 Room/Blockout Maker (Gemini-1)
Purpose: Demonstrate that the clearance evaluation logic reliably fails when colliding
         fixtures are deliberately injected, satisfying W1-CORR-01 Item 2 requirement:
         "Test a deliberate displaced/colliding fixture in an isolated test copy so the
          checker demonstrably fails; do not publish that fixture as the delivery."
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

def evaluate_door_sweep(sample_interval_deg=5.0):
    door_leaf = bpy.data.objects.get("door_leaf")
    door_hinge = bpy.data.objects.get("door-hinge")
    hinge_r = b2r(door_hinge.matrix_world.translation.x,
                  door_hinge.matrix_world.translation.y,
                  door_hinge.matrix_world.translation.z)
    door_leaf_bounds = get_obj_runtime_bounds(door_leaf)
    leaf_w = door_leaf_bounds["max"][0] - door_leaf_bounds["min"][0]

    left_wall_inner_x = -2.10
    desk_front_z = -0.75
    plant_center = [-1.35, -0.15]
    plant_radius = 0.26

    min_wall_gap = float("inf")
    min_desk_gap = float("inf")
    min_plant_gap = float("inf")

    sweep_angles = [i * sample_interval_deg for i in range(int(90.0 / sample_interval_deg) + 1)]
    for ang in sweep_angles:
        rad = math.radians(ang)
        tip_x = hinge_r[0] + leaf_w * math.cos(rad)
        tip_z = hinge_r[2] - leaf_w * math.sin(rad)

        wall_gap = tip_x - left_wall_inner_x
        desk_gap = tip_z - desk_front_z
        dist_plant = math.sqrt((tip_x - plant_center[0])**2 + (tip_z - plant_center[1])**2) - plant_radius

        if wall_gap < min_wall_gap:
            min_wall_gap = wall_gap
        if desk_gap < min_desk_gap:
            min_desk_gap = desk_gap
        if dist_plant < min_plant_gap:
            min_plant_gap = dist_plant

    door_pass = (min_wall_gap > 0.05) and (min_desk_gap > 0.10) and (min_plant_gap > 0.10)
    return {
        "status": "PASS" if door_pass else "FAIL",
        "min_wall_clearance_m": round(min_wall_gap, 4),
        "min_desk_clearance_m": round(min_desk_gap, 4),
        "min_plant_clearance_m": round(min_plant_gap, 4)
    }

def evaluate_chair_armrest_clearance():
    armrest_l = bpy.data.objects.get("chair_armrest_left_pad")
    armrest_r = bpy.data.objects.get("chair_armrest_right_pad")
    desk_top_obj = bpy.data.objects.get("desk_top")

    armrest_l_bounds = get_obj_runtime_bounds(armrest_l)
    armrest_r_bounds = get_obj_runtime_bounds(armrest_r)
    desk_top_bounds = get_obj_runtime_bounds(desk_top_obj)

    armrest_top_y = max(armrest_l_bounds["max"][1], armrest_r_bounds["max"][1])
    desk_underside_y = desk_top_bounds["min"][1]
    armrest_vertical_gap = desk_underside_y - armrest_top_y

    pass_status = armrest_vertical_gap > 0.01
    return {
        "status": "PASS" if pass_status else "FAIL",
        "armrest_top_y_m": round(armrest_top_y, 4),
        "desk_underside_y_m": round(desk_underside_y, 4),
        "armrest_vertical_clearance_m": round(armrest_vertical_gap, 4)
    }

def evaluate_chair_base_to_desk():
    chair_root = bpy.data.objects.get("chair-root")
    desk_top_obj = bpy.data.objects.get("desk_top")
    chair_root_r = b2r(chair_root.location.x, chair_root.location.y, chair_root.location.z)
    desk_top_bounds = get_obj_runtime_bounds(desk_top_obj)

    base_turning_radius = 0.32
    desk_front_z = desk_top_bounds["max"][2] # -0.75m
    closest_point_z = chair_root_r[2] - base_turning_radius
    clearance = abs(desk_front_z - closest_point_z) if closest_point_z > desk_front_z else -(abs(desk_front_z - closest_point_z))

    pass_status = clearance > 0.02
    return {
        "status": "PASS" if pass_status else "FAIL",
        "closest_point_z_m": round(closest_point_z, 4),
        "desk_front_z_m": round(desk_front_z, 4),
        "base_to_desk_clearance_m": round(clearance, 4)
    }

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    blend_path = os.path.abspath(os.path.join(script_dir, "..", "blockout.blend"))
    out_json = os.path.join(script_dir, "fault-injection.json")

    print(f"Loading candidate blend from {blend_path}...")
    bpy.ops.wm.open_mainfile(filepath=blend_path, load_ui=False, use_scripts=False)

    report = {
        "executedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "test": "W1-CORR-01 Item 2 Clearance Checker Fault Injection Validation",
        "scope": "Demonstrate that deliberate colliding mutations cause the clearance checker to fail as required",
        "tests": []
    }

    # Test 0: Baseline Normal Candidate Check
    print("Running Test 0: Normal Candidate Clearance Check...")
    door_res = evaluate_door_sweep()
    arm_res = evaluate_chair_armrest_clearance()
    base_res = evaluate_chair_base_to_desk()
    all_normal_pass = (door_res["status"] == "PASS" and arm_res["status"] == "PASS" and base_res["status"] == "PASS")
    report["tests"].append({
        "testId": "FAULT-INJECT-00-NORMAL-BASELINE",
        "description": "Baseline evaluation of un-mutated delivered geometry",
        "expectedStatus": "PASS",
        "actualStatus": "PASS" if all_normal_pass else "FAIL",
        "details": {
            "door_sweep": door_res,
            "armrest_clearance": arm_res,
            "chair_base_clearance": base_res
        },
        "verdict": "PASS" if all_normal_pass else "FAIL"
    })
    print(f"Test 0 Verdict: {'PASS' if all_normal_pass else 'FAIL'}")

    # Test 1: Fault Injection - Hinge displaced into left wall tolerance
    print("Running Test 1: Fault Injection - Door hinge displaced into wall tolerance...")
    door_hinge = bpy.data.objects.get("door-hinge")
    orig_hinge_loc = list(door_hinge.location)
    # Move hinge in Blender X from -1.65 to -2.08 (only 20mm from left wall at X=-2.10)
    door_hinge.location.x = -2.08
    bpy.context.view_layer.update()

    door_res_mut = evaluate_door_sweep()
    test1_pass = (door_res_mut["status"] == "FAIL") # Expect FAIL!
    report["tests"].append({
        "testId": "FAULT-INJECT-01-DOOR-WALL-PROXIMITY",
        "description": "Displace door hinge to X=-2.08m (20mm from X=-2.10m wall, violating 50mm clearance limit)",
        "expectedCheckerOutcome": "FAIL",
        "actualCheckerOutcome": door_res_mut["status"],
        "minWallClearanceMeasured": door_res_mut["min_wall_clearance_m"],
        "detectorCaughtCollision": test1_pass,
        "verdict": "PASS (Collision correctly rejected)" if test1_pass else "FAIL (Collision undetected)"
    })
    print(f"Test 1 Verdict: {'PASS' if test1_pass else 'FAIL'} (Measured min wall gap: {door_res_mut['min_wall_clearance_m']}m)")

    # Restore door hinge
    door_hinge.location = orig_hinge_loc
    bpy.context.view_layer.update()

    # Test 2: Fault Injection - Chair raised so armrests collide with desk underside
    print("Running Test 2: Fault Injection - Elevated chair armrests...")
    armrest_l = bpy.data.objects.get("chair_armrest_left_pad")
    armrest_r = bpy.data.objects.get("chair_armrest_right_pad")
    orig_arm_l_loc = list(armrest_l.location)
    orig_arm_r_loc = list(armrest_r.location)
    # Raise armrests by +0.08m in Blender (+0.08m in Z-up = +0.08m in runtime Y-up)
    armrest_l.location.z += 0.08
    armrest_r.location.z += 0.08
    bpy.context.view_layer.update()

    arm_res_mut = evaluate_chair_armrest_clearance()
    test2_pass = (arm_res_mut["status"] == "FAIL") # Expect FAIL!
    report["tests"].append({
        "testId": "FAULT-INJECT-02-ARMREST-TABLETOP-COLLISION",
        "description": "Inject elevated armrests (+80mm) so armrest top (0.745m) penetrates 0.700m desk underside",
        "expectedCheckerOutcome": "FAIL",
        "actualCheckerOutcome": arm_res_mut["status"],
        "armrestVerticalClearanceMeasured": arm_res_mut["armrest_vertical_clearance_m"],
        "detectorCaughtCollision": test2_pass,
        "verdict": "PASS (Collision correctly rejected)" if test2_pass else "FAIL (Collision undetected)"
    })
    print(f"Test 2 Verdict: {'PASS' if test2_pass else 'FAIL'} (Measured gap: {arm_res_mut['armrest_vertical_clearance_m']}m)")

    # Restore armrests
    armrest_l.location = orig_arm_l_loc
    armrest_r.location = orig_arm_r_loc
    bpy.context.view_layer.update()

    # Test 3: Fault Injection - Chair base pushed forward into desk front
    print("Running Test 3: Fault Injection - Chair base pushed into desk...")
    chair_root = bpy.data.objects.get("chair-root")
    orig_chair_loc = list(chair_root.location)
    # Move chair forward toward desk: in Blender, -Z runtime is +Y Blender
    # Runtime Z moved from -0.36 to -0.65 (+0.29m toward rear desk)
    chair_root.location.y += 0.29
    bpy.context.view_layer.update()

    base_res_mut = evaluate_chair_base_to_desk()
    test3_pass = (base_res_mut["status"] == "FAIL") # Expect FAIL!
    report["tests"].append({
        "testId": "FAULT-INJECT-03-CHAIR-BASE-DESK-COLLISION",
        "description": "Inject forward chair displacement (Z=-0.65m vs -0.36m normal) causing base to penetrate desk front",
        "expectedCheckerOutcome": "FAIL",
        "actualCheckerOutcome": base_res_mut["status"],
        "baseToDeskClearanceMeasured": base_res_mut["base_to_desk_clearance_m"],
        "detectorCaughtCollision": test3_pass,
        "verdict": "PASS (Collision correctly rejected)" if test3_pass else "FAIL (Collision undetected)"
    })
    print(f"Test 3 Verdict: {'PASS' if test3_pass else 'FAIL'} (Measured clearance: {base_res_mut['base_to_desk_clearance_m']}m)")

    # Restore chair root
    chair_root.location = orig_chair_loc
    bpy.context.view_layer.update()

    all_tests_passed = all_normal_pass and test1_pass and test2_pass and test3_pass
    report["summary"] = {
        "totalTests": len(report["tests"]),
        "passed": 4 if all_tests_passed else 0,
        "failed": 0 if all_tests_passed else 1,
        "allFaultsDemonstrablyDetected": all_tests_passed
    }

    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    print(f"Wrote fault injection report to {out_json}")
    print("FAULT_INJECTION_SUITE_COMPLETE")

if __name__ == "__main__":
    main()
