#!/usr/bin/env python3
"""Build reviewer-owned CSV matrices from the exact fresh rerun JSON logs."""
import csv
import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LOGS = ROOT / "reviewer-rerun" / "validator-logs"


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_csv(path, headers, rows):
    with path.open("w", newline="", encoding="utf-8") as stream:
        writer = csv.DictWriter(stream, fieldnames=headers, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


door = read_json(LOGS / "browser-deformation-results.json")
door_rows = door["doorSweep"]["rows"]
positive_rows = [row for row in door_rows if row["yawDegrees"] > 0]
first_negative = next(row for row in positive_rows if row["camera"]["leafNearClipMarginM"] < 0)
worst = min(positive_rows, key=lambda row: row["camera"]["leafNearClipMarginM"])
previous = max(
    (row for row in positive_rows if row["tSec"] < first_negative["tSec"]),
    key=lambda row: row["tSec"],
)

door_csv = []
for row in positive_rows:
    camera = row["camera"]
    bounds = row["panelBounds"]
    door_csv.append({
        "time_sec": row["tSec"],
        "phase": row["phase"],
        "door_elapsed_sec": row["doorElapsedSec"],
        "camera_elapsed_sec": row["cameraElapsedSec"],
        "door_angle_deg": row["yawDegrees"],
        "door_open_progress": row["doorOpenProgress"],
        "entrance_progress": row["entranceProgress"],
        "camera_x_m": camera["position"][0],
        "camera_y_m": camera["position"][1],
        "camera_z_m": camera["position"][2],
        "target_x_m": camera["target"][0],
        "target_y_m": camera["target"][1],
        "target_z_m": camera["target"][2],
        "near_clip_m": camera["nearClipM"],
        "leaf_surface_gap_m": camera["minLeafSurfaceDistanceM"],
        "leaf_near_clip_margin_m": camera["leafNearClipMarginM"],
        "frame_surface_gap_m": camera["minFrameSurfaceDistanceM"],
        "frame_near_clip_margin_m": camera["frameNearClipMarginM"],
        "leaf_frame_surface_clearance_m": row["leafFrame"]["minSurfaceDistanceM"],
        "camera_inside_leaf_aabb": all(
            bounds["min"][i] <= camera["position"][i] <= bounds["max"][i]
            for i in range(3)
        ),
        "near_plane_intersects_leaf_triangles": camera["nearPlaneIntersectsLeaf"],
    })

write_csv(
    LOGS / "positive-y-door-sweep.csv",
    list(door_csv[0].keys()),
    door_csv,
)

door_summary = {
    "evidence_source": "fresh reviewer rerun JSON; the positive-Y script changes only the candidate-direction yaw sign and writes outputs inside this audit root",
    "three_revision": door.get("threeRevision"),
    "sample_hz": door["doorSweep"]["sampleHz"],
    "direction": "positive local Y; computed yawDegrees are +0..+90 (the inherited measuredDirection prose is stale and not relied upon)",
    "sweep_duration_sec": door["doorSweep"]["sweepDurationSec"],
    "camera_path_duration_sec": door["doorSweep"]["cameraPathDurationSec"],
    "camera_start_sec": door["doorSweep"]["cameraStartSec"],
    "total_sequence_duration_sec": door["doorSweep"]["totalSequenceDurationSec"],
    "positive_y_sample_count": len(positive_rows),
    "previous_nonnegative_sample": {
        "time_sec": previous["tSec"],
        "door_angle_deg": previous["yawDegrees"],
        "camera_position_m": previous["camera"]["position"],
        "leaf_surface_gap_m": previous["camera"]["minLeafSurfaceDistanceM"],
        "near_clip_m": previous["camera"]["nearClipM"],
        "near_clip_margin_m": previous["camera"]["leafNearClipMarginM"],
    },
    "first_negative_near_clip_margin_sample": {
        "time_sec": first_negative["tSec"],
        "door_angle_deg": first_negative["yawDegrees"],
        "door_elapsed_sec": first_negative["doorElapsedSec"],
        "door_open_progress": first_negative["doorOpenProgress"],
        "camera_elapsed_sec": first_negative["cameraElapsedSec"],
        "entrance_progress": first_negative["entranceProgress"],
        "camera_position_m": first_negative["camera"]["position"],
        "camera_target_m": first_negative["camera"]["target"],
        "near_clip_m": first_negative["camera"]["nearClipM"],
        "leaf_surface_gap_m": first_negative["camera"]["minLeafSurfaceDistanceM"],
        "leaf_near_clip_margin_m": first_negative["camera"]["leafNearClipMarginM"],
        "frame_surface_gap_m": first_negative["camera"]["minFrameSurfaceDistanceM"],
        "near_plane_intersects_leaf_triangles": first_negative["camera"]["nearPlaneIntersectsLeaf"],
        "panel_bounds_m": first_negative["panelBounds"],
        "leaf_frame_clearance_m": first_negative["leafFrame"]["minSurfaceDistanceM"],
        "interpretation_limit": "negative near-plane margin is a measured clip-margin violation; no sampled camera point intersects leaf triangles, and no screenshot/pixel-level clip claim is made",
    },
    "worst_near_clip_margin_sample": {
        "time_sec": worst["tSec"],
        "door_angle_deg": worst["yawDegrees"],
        "entrance_progress": worst["entranceProgress"],
        "camera_position_m": worst["camera"]["position"],
        "near_clip_m": worst["camera"]["nearClipM"],
        "leaf_surface_gap_m": worst["camera"]["minLeafSurfaceDistanceM"],
        "leaf_near_clip_margin_m": worst["camera"]["leafNearClipMarginM"],
        "panel_bounds_m": worst["panelBounds"],
    },
    "door_contract_relevance": "the leaf reaches +90 degrees at 2.5 s; the camera begins at 2.5 s. First negative margin occurs at 6.1 s with doorOpenProgress=1, after 3.6 s of camera motion while fully open. This is a route/leaf-position conflict, not a door-not-yet-cleared timing sample.",
    "full_sweep_minima": {
        "leaf_frame_clearance_m": door["doorSweep"]["minimumLeafFrameClearanceM"],
        "leaf_frame_intersection_pairs": door["doorSweep"]["leafFrameIntersectionPairs"],
        "camera_leaf_surface_gap_m": door["doorSweep"]["minimumLeafCameraSurfaceGapM"],
        "camera_leaf_near_clip_margin_m": door["doorSweep"]["minimumLeafCameraNearClipMarginM"],
        "near_plane_leaf_triangle_intersections": door["doorSweep"]["nearPlaneLeafIntersections"],
    },
}
(LOGS / "positive-y-door-sweep-summary.json").write_text(
    json.dumps(door_summary, indent=2) + "\n", encoding="utf-8"
)

draw = read_json(LOGS / "draw-call-attribution-callstacks.json")
object_rows = []
owner_material_pass = defaultdict(lambda: {"objects": set(), "render_buffer_calls": 0, "renderer_info_calls_attributed": 0})
profile_pass = defaultdict(lambda: {"render_buffer_calls": 0, "object_material_pass_rows": 0})
for profile in draw["profiles"]:
    key = profile["key"]
    for mesh in profile["byObject"]:
        calls_by_material_pass = defaultdict(list)
        for call in mesh["calls"]:
            stack = " ".join(call.get("stackFrames", []))
            if "renderTransmissionPass" in stack:
                pass_name = "render-transmission-pass"
            elif "renderScene" in stack:
                pass_name = "main-render-scene"
            else:
                pass_name = "other-render-path"
            calls_by_material_pass[(call["materialName"], pass_name)].append(call)
        for (material_name, pass_name), calls in sorted(calls_by_material_pass.items()):
            group = owner_material_pass[(key, pass_name, mesh["owner"], material_name)]
            group["objects"].add(mesh["objectUUID"])
            group["render_buffer_calls"] += len(calls)
            group["renderer_info_calls_attributed"] += sum(
                max(0, call.get("rendererInfoCallsAfter", 0) - call.get("rendererInfoCallsBefore", 0))
                for call in calls
            )
            profile_pass[(key, pass_name)]["render_buffer_calls"] += len(calls)
            profile_pass[(key, pass_name)]["object_material_pass_rows"] += 1
            object_rows.append({
                "profile": key,
                "pass": pass_name,
                "owner_export": mesh["owner"],
                "object_name": mesh["name"],
                "object_uuid_run_local": mesh["objectUUID"],
                "object_id_run_local": mesh["objectId"],
                "hierarchy_path": mesh["hierarchyPath"],
                "material": material_name,
                "calls_in_pass": len(calls),
                "renderer_info_calls_attributed": sum(
                    max(0, call.get("rendererInfoCallsAfter", 0) - call.get("rendererInfoCallsBefore", 0))
                    for call in calls
                ),
                "geometry_group_count": mesh["geometryGroupCount"],
                "material_slot_count": mesh["materialSlotCount"],
                "group_arguments": json.dumps([call.get("group") for call in calls], separators=(",", ":")),
                "material_flags": json.dumps(calls[0]["materialFlags"], sort_keys=True, separators=(",", ":")),
            })

write_csv(
    LOGS / "draw-call-object-material-pass.csv",
    list(object_rows[0].keys()),
    object_rows,
)

owner_material_rows = []
for (profile, pass_name, owner, material), value in sorted(owner_material_pass.items()):
    owner_material_rows.append({
        "profile": profile,
        "pass": pass_name,
        "owner_export": owner,
        "material": material,
        "unique_mesh_object_count": len(value["objects"]),
        "render_buffer_calls": value["render_buffer_calls"],
        "renderer_info_calls_attributed": value["renderer_info_calls_attributed"],
    })
write_csv(
    LOGS / "draw-call-owner-material-pass.csv",
    list(owner_material_rows[0].keys()),
    owner_material_rows,
)

profile_rows = []
for profile in draw["profiles"]:
    profile_rows.append({
        "profile": profile["key"],
        "viewport_width": profile["width"],
        "viewport_height": profile["height"],
        "frozen_draw_limit": profile["limit"],
        "renderer_draw_calls": profile["rendererInfo"]["drawCalls"],
        "direct_render_buffer_calls": profile["interceptedRenderBufferDirectCalls"],
        "per_call_renderer_info_attribution": profile["attributedRendererInfoCalls"],
        "visible_mesh_objects_pre_cull": profile["visibleMeshObjectCount"],
        "distinct_drawn_mesh_objects": len(profile["byObject"]),
        "auto_reset": profile["renderAccounting"]["postMeasurement"]["autoReset"],
        "renderer_frame_before": profile["renderAccounting"]["preMeasurement"]["frame"],
        "renderer_frame_after": profile["renderAccounting"]["postMeasurement"]["frame"],
        "renderer_frame_delta": profile["renderAccounting"]["rendererRenderFrameDelta"],
        "budget_status": profile["budgetStatus"],
        "transmission_pass_calls": profile_pass[(profile["key"], "render-transmission-pass")]["render_buffer_calls"],
        "main_scene_calls": profile_pass[(profile["key"], "main-render-scene")]["render_buffer_calls"],
    })
    assert profile["rendererInfo"]["drawCalls"] == profile["interceptedRenderBufferDirectCalls"]
    assert profile["rendererInfo"]["drawCalls"] == profile["attributedRendererInfoCalls"]
    assert profile["renderAccounting"]["rendererRenderFrameDelta"] == 1
write_csv(
    LOGS / "draw-call-profile-summary.csv",
    list(profile_rows[0].keys()),
    profile_rows,
)

print(json.dumps({
    "positive_y_samples": len(positive_rows),
    "first_negative_time_sec": first_negative["tSec"],
    "worst_time_sec": worst["tSec"],
    "draw_profile_summary": profile_rows,
    "owner_material_pass_rows": len(owner_material_rows),
    "object_material_pass_rows": len(object_rows),
}, indent=2))
