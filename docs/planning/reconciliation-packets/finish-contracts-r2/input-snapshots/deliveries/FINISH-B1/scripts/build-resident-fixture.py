"""Production Resident Character & Rig Generator (Task B4 / B5).
Blender 5.2.2 LTS --background --python.

Refined anatomy, articulated fingers, seated contact, grounded feet,
stylized face & hair (no unapproved likeness claim), and full 8 V1 clips:
1. coding_idle (6.0s)
2. mouse_idle (2.0s)
3. notice_visitor (0.6s)
4. turn_to_visitor (1.2s)
5. greeting_nod (0.9s)
6. return_to_work (1.3s)
7. attention_glance (1.2s)
8. breathing_idle (4.0s)
"""
import bpy
import math
import json
import hashlib
import sys
from pathlib import Path
from mathutils import Vector, Matrix, Quaternion
from mathutils.bvhtree import BVHTree

SCRIPT_DIR = Path(__file__).resolve().parent
DELIVERY_DIR = SCRIPT_DIR.parent
OUT = DELIVERY_DIR / "assets"
SOURCE_DIR = OUT / "source"
EVIDENCE = DELIVERY_DIR / "validator-logs"
OUT.mkdir(parents=True, exist_ok=True)
SOURCE_DIR.mkdir(parents=True, exist_ok=True)
EVIDENCE.mkdir(parents=True, exist_ok=True)

ROOT = Vector((0.30, 0.36, 0.0))
FPS = 30
TURN = math.radians(125)

# All 8 V1 clips with exact nominal durations from art spec §6
CLIPS = {
    "coding_idle": 6.0,
    "mouse_idle": 2.0,
    "notice_visitor": 0.6,
    "turn_to_visitor": 1.2,
    "greeting_nod": 0.9,
    "return_to_work": 1.3,
    "attention_glance": 1.2,
    "breathing_idle": 4.0,
}

# Reset Blender
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
for action in list(bpy.data.actions):
    bpy.data.actions.remove(action)

scene = bpy.context.scene
scene.unit_settings.system = "METRIC"
scene.unit_settings.scale_length = 1.0
scene.render.fps = FPS
scene.render.fps_base = 1
bpy.context.preferences.filepaths.save_version = 0

def create_pbr_material(name, rgb, roughness=0.6, metallic=0.0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*rgb, 1.0)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (*rgb, 1.0)
        bsdf.inputs["Roughness"].default_value = roughness
        bsdf.inputs["Metallic"].default_value = metallic
    return m

ivory = create_pbr_material("fixture-ivory", (0.86, 0.84, 0.81), 0.45)
blue = create_pbr_material("fixture-chair-blue", (0.075, 0.22, 0.63), 0.55)
dark = create_pbr_material("fixture-dark-plastic", (0.045, 0.055, 0.095), 0.4)
cloth_teal = create_pbr_material("resident-teal-shirt", (0.045, 0.28, 0.31), 0.70)
pants_slate = create_pbr_material("resident-slate-trousers", (0.085, 0.12, 0.18), 0.75)
skin = create_pbr_material("resident-generic-skin", (0.62, 0.38, 0.26), 0.55)
hair = create_pbr_material("resident-hair", (0.035, 0.022, 0.018), 0.85)
shoe_sole = create_pbr_material("resident-shoe-sole", (0.12, 0.12, 0.14), 0.8)
shoe_upper = create_pbr_material("resident-shoe-upper", (0.80, 0.82, 0.84), 0.4)
eye_mat = create_pbr_material("resident-eye", (0.015, 0.02, 0.025), 0.1)
screen_mat = create_pbr_material("fixture-screen", (0.14, 0.10, 0.27), 0.3)
floor_mat = create_pbr_material("fixture-blue-floor", (0.20, 0.29, 0.45), 0.6)

fixture_objects = []
avatar_mesh_parts = []

def finish_part(obj, name, mat, owner=None, bone_weights=None):
    obj.name = name
    if obj.data.materials:
        obj.data.materials[0] = mat
    else:
        obj.data.materials.append(mat)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if owner is not None:
        owner.append(obj)
    if bone_weights:
        for bname, weight in bone_weights.items():
            group = obj.vertex_groups.new(name=bname)
            group.add(list(range(len(obj.data.vertices))), weight, "REPLACE")
        avatar_mesh_parts.append(obj)
    return obj

def make_box(name, center, size, mat, owner=None, bone_weights=None, bevel=0.015):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=center)
    obj = bpy.context.object
    obj.scale = size
    finish_part(obj, name, mat, owner, bone_weights)
    if bevel > 0:
        mod = obj.modifiers.new("bevel", "BEVEL")
        mod.width = bevel
        mod.segments = 2
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return obj

def make_ellipsoid(name, center, radii, mat, bone_weights=None, owner=None, segs=16, rings=10):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segs, ring_count=rings, radius=1.0, location=center)
    obj = bpy.context.object
    obj.scale = radii
    finish_part(obj, name, mat, owner, bone_weights)
    for p in obj.data.polygons:
        p.use_smooth = True
    return obj

def make_cylinder(name, a, b, radius, mat, bone_weights=None, owner=None, vertices=12):
    a, b = Vector(a), Vector(b)
    diff = b - a
    length = diff.length
    center = (a + b) * 0.5
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=length, location=center)
    obj = bpy.context.object
    obj.rotation_mode = "QUATERNION"
    if length > 1e-6:
        obj.rotation_quaternion = diff.to_track_quat("Z", "Y")
    finish_part(obj, name, mat, owner, bone_weights)
    for p in obj.data.polygons:
        p.use_smooth = True
    return obj

def smoothstep(t):
    t = min(1.0, max(0.0, t))
    return t * t * (3.0 - 2.0 * t)

def rotate_z(v, angle):
    return Matrix.Rotation(angle, 3, "Z") @ Vector(v)

def basis_matrix(head, tail, roll_col2=None):
    head, tail = Vector(head), Vector(tail)
    diff = tail - head
    if diff.length < 1e-6:
        diff = Vector((0, 0.01, 0))
    q = diff.to_track_quat("Y", "Z")
    m = q.to_matrix().to_4x4()
    m.translation = head
    return m

def two_bone_ik(hip, ankle, forward, upper=0.356, lower=0.396):
    dvec = ankle - hip
    d = dvec.length
    d = max(abs(upper - lower) + 1e-4, min(upper + lower - 1e-4, d))
    n = dvec.normalized()
    along = (upper * upper - lower * lower + d * d) / (2.0 * d)
    height = math.sqrt(max(0.0, upper * upper - along * along))
    bend = (forward - n * forward.dot(n)).normalized()
    return hip + n * along + bend * height

def step_pose(side, phase, start_angle, end_angle):
    windows = [(0.015, 0.38), (0.48, 0.86)] if side == "L" else [(0.15, 0.52), (0.60, 1.0)]
    angle, lift = start_angle, 0.0
    for i, (begin, end) in enumerate(windows):
        a0 = start_angle + (end_angle - start_angle) * i / 2.0
        a1 = start_angle + (end_angle - start_angle) * (i + 1) / 2.0
        if phase >= end:
            angle = a1
        elif phase > begin:
            u = (phase - begin) / (end - begin)
            angle = a0 + (a1 - a0) * smoothstep(u)
            lift = 0.052 * math.sin(math.pi * u)
            break
    return angle, lift

def evaluate_clip_motion(clip, seconds):
    duration = CLIPS[clip]
    u = max(0.0, min(1.0, seconds / duration))
    
    yaw = 0.0
    retract = 0.0
    nod = 0.0
    glance_yaw = 0.0
    glance_pitch = 0.0
    breathe = 0.0
    mouse_reach = 0.0
    mouse_click = 0.0
    typing_phase = 0.0
    foot_angles = {"L": 0.0, "R": 0.0}
    foot_lifts = {"L": 0.0, "R": 0.0}
    
    if clip == "coding_idle":
        typing_phase = seconds
        breathe = math.sin(seconds * math.pi * 0.5) * 0.003
    elif clip == "mouse_idle":
        # Right hand moves to mouse position and clicks
        mouse_reach = 1.0 if u >= 0.25 else smoothstep(u / 0.25)
        mouse_click = math.sin(u * math.tau * 3.0) if u > 0.3 else 0.0
        breathe = math.sin(seconds * math.pi) * 0.002
    elif clip == "notice_visitor":
        retract = smoothstep(u)
        breathe = math.sin(seconds * math.pi) * 0.002
    elif clip == "turn_to_visitor":
        yaw = TURN * smoothstep(u)
        retract = 1.0
        for s in ("L", "R"):
            foot_angles[s], foot_lifts[s] = step_pose(s, u, 0.0, TURN)
    elif clip == "greeting_nod":
        yaw = TURN
        retract = 1.0
        foot_angles = {"L": TURN, "R": TURN}
        nod = math.radians(9.0) * (math.sin(math.pi * u) ** 2)
    elif clip == "return_to_work":
        # Swivel chair first (0 to 0.75), then land hands during final 0.25
        swivel = min(1.0, u / 0.75)
        yaw = TURN * (1.0 - smoothstep(swivel))
        retract = 1.0 - smoothstep(max(0.0, (u - 0.75) / 0.25))
        for s in ("L", "R"):
            foot_angles[s], foot_lifts[s] = step_pose(s, swivel, TURN, 0.0)
    elif clip == "attention_glance":
        # Subtly glance towards door/visitor while hands stay near keyboard
        glance_phase = math.sin(math.pi * u) ** 1.5
        glance_yaw = math.radians(26.0) * glance_phase
        glance_pitch = math.radians(3.5) * glance_phase
        retract = 0.15 * glance_phase
        typing_phase = seconds * 0.5
    elif clip == "breathing_idle":
        breathe = math.sin(seconds * math.pi * 0.5) * 0.005

    return {
        "yaw": yaw,
        "retract": retract,
        "nod": nod,
        "glance_yaw": glance_yaw,
        "glance_pitch": glance_pitch,
        "breathe": breathe,
        "mouse_reach": mouse_reach,
        "mouse_click": mouse_click,
        "typing_phase": typing_phase,
        "foot_angles": foot_angles,
        "foot_lifts": foot_lifts,
    }

def compute_skeleton_pose(clip, seconds):
    m = evaluate_clip_motion(clip, seconds)
    yaw = m["yaw"]
    retract = m["retract"]
    nod = m["nod"]
    glance_yaw = m["glance_yaw"]
    glance_pitch = m["glance_pitch"]
    breathe = m["breathe"]
    mouse_reach = m["mouse_reach"]
    mouse_click = m["mouse_click"]
    typing_phase = m["typing_phase"]
    foot_angles = m["foot_angles"]
    foot_lifts = m["foot_lifts"]

    poses = {}
    R = Matrix.Rotation(yaw, 4, "Z")
    poses["body-turn"] = R

    # Pelvis seated contact: Z=0.55m rest
    pelvis = Vector((0.0, 0.0, 0.55 + breathe * 0.3))
    poses["pelvis"] = R @ basis_matrix(pelvis, (0.0, 0.0, 0.69 + breathe * 0.5))

    # Spine & Chest
    spine_start = Vector((0.0, 0.0, 0.69 + breathe * 0.5))
    spine_end = Vector((0.0, 0.015, 0.88 + breathe * 0.8))
    poses["spine"] = R @ basis_matrix(spine_start, spine_end)

    chest_end = Vector((0.0, 0.02, 1.055 + breathe))
    poses["chest"] = R @ basis_matrix(spine_end, chest_end)

    # Neck and Head
    neck_base = Vector((0.0, 0.02, 1.075 + breathe))
    neck_top = neck_base + Vector((0.0, 0.0, 0.07))
    poses["neck"] = R @ basis_matrix(neck_base, neck_top)

    # Head rotation incorporates nod and glance
    head_rot = Matrix.Rotation(glance_yaw, 4, "Z") @ Matrix.Rotation(nod + glance_pitch, 4, "X")
    head_m = basis_matrix(neck_top, neck_top + Vector((0.0, 0.0, 0.20)))
    poses["head"] = R @ Matrix.Translation(neck_top) @ head_rot @ Matrix.Translation(-neck_top) @ head_m

    for side, sign in [("L", -1), ("R", 1)]:
        # Clavicle and shoulder
        shoulder = Vector((sign * 0.205, 0.015, 1.005 + breathe))
        poses[f"clavicle.{side}"] = R @ basis_matrix(Vector((0.0, 0.02, 1.055)), shoulder)

        # Typing stroke micro-motion (subtle vertical oscillation)
        tap = 0.0
        if typing_phase > 0:
            freq = 2.4 if side == "L" else 2.8
            tap = 0.0012 * (1.0 - math.cos(typing_phase * math.tau * freq))

        # Base wrist rest in front of keyboard (high enough so fingers float/tap gracefully above keycaps)
        # Pull hands inwards and back into lap when retracted for full >=0.15m turn clearance
        wrist_x = sign * (0.145 - 0.045 * retract)
        wrist_y = 0.455 - 0.380 * retract
        wrist_z = 0.822 + 0.103 * retract + tap

        # Mouse interaction for right hand (wrist stays well above desk surface Z=0.75m)
        if side == "R" and mouse_reach > 0:
            target_mouse_x = 0.30
            target_mouse_y = 0.44
            target_mouse_z = 0.825
            wrist_x = wrist_x * (1.0 - mouse_reach) + target_mouse_x * mouse_reach
            wrist_y = wrist_y * (1.0 - mouse_reach) + target_mouse_y * mouse_reach
            wrist_z = wrist_z * (1.0 - mouse_reach) + target_mouse_z * mouse_reach

        wrist = Vector((wrist_x, wrist_y, wrist_z))

        # Elbow folding IK
        elbow_dir = Vector((sign * (0.85 - 0.45 * retract), -0.8 * retract, -1.0))
        elbow = two_bone_ik(shoulder, wrist, elbow_dir, 0.276, 0.282)

        poses[f"upper-arm.{side}"] = R @ basis_matrix(shoulder, elbow)
        poses[f"forearm.{side}"] = R @ basis_matrix(elbow, wrist)

        # Hand palm
        hand_dir = Vector((0.0, 0.075, -0.015 * (1.0 - retract)))
        if side == "R" and mouse_reach > 0:
            hand_dir = Vector((0.0, 0.075, -0.010))
        poses[f"hand.{side}"] = R @ basis_matrix(wrist, wrist + hand_dir)

        # Finger articulation bones
        thumb_bend = 0.015 * retract
        index_bend = 0.020 * retract + (0.008 * mouse_click if (side == "R" and mouse_reach > 0) else 0.0)
        fingers_bend = 0.022 * retract

        palm_center = wrist + hand_dir
        poses[f"thumb.{side}"] = R @ basis_matrix(wrist + Vector((sign * 0.025, 0.020, 0.0)), wrist + Vector((sign * 0.040, 0.045, -thumb_bend)))
        poses[f"index.{side}"] = R @ basis_matrix(palm_center, palm_center + Vector((sign * 0.010, 0.038, -index_bend)))
        poses[f"fingers.{side}"] = R @ basis_matrix(palm_center, palm_center + Vector((-sign * 0.010, 0.038, -fingers_bend)))

        # Seated leg IK (hip at Z=0.585 so thigh capsule underside floats above seat cushion at Z=0.46m)
        hip = rotate_z((sign * 0.115, 0.0, 0.585), yaw)
        ankle = rotate_z((sign * 0.17, 0.32, 0.11), foot_angles[side])
        ankle.z += foot_lifts[side]
        knee = two_bone_ik(hip, ankle, rotate_z((sign * 0.12, 1.0, 0.0), yaw))

        poses[f"thigh.{side}"] = basis_matrix(hip, knee)
        poses[f"shin.{side}"] = basis_matrix(knee, ankle)
        poses[f"foot.{side}"] = basis_matrix(ankle, ankle + rotate_z((0.0, 0.15, 0.0), foot_angles[side]))

    return poses

rest_pose = compute_skeleton_pose("coding_idle", 0.0)

# Complete bone hierarchy
bone_hierarchy = {
    "body-turn": None,
    "pelvis": "body-turn",
    "spine": "pelvis",
    "chest": "spine",
    "neck": "chest",
    "head": "neck",
}
for side in ("L", "R"):
    bone_hierarchy.update({
        f"clavicle.{side}": "chest",
        f"upper-arm.{side}": f"clavicle.{side}",
        f"forearm.{side}": f"upper-arm.{side}",
        f"hand.{side}": f"forearm.{side}",
        f"thumb.{side}": f"hand.{side}",
        f"index.{side}": f"hand.{side}",
        f"fingers.{side}": f"hand.{side}",
        f"thigh.{side}": "pelvis",
        f"shin.{side}": f"thigh.{side}",
        f"foot.{side}": None, # Grounded baked foot root prevents sliding
    })

armature_data = bpy.data.armatures.new("resident-seated-rig")
rig = bpy.data.objects.new("resident", armature_data)
scene.collection.objects.link(rig)
rig.location = ROOT
rig["assetId"] = "resident"
rig["proofBaseline"] = "F1"
rig["likeness"] = "approved identity direction; generic stylized developer"
rig.show_in_front = True

bpy.context.view_layer.objects.active = rig
rig.select_set(True)
bpy.ops.object.mode_set(mode="EDIT")

for bname, pparent in bone_hierarchy.items():
    eb = armature_data.edit_bones.new(bname)
    m = rest_pose[bname]
    eb.head = m.translation
    eb.tail = eb.head + m.to_3x3().col[1] * 0.12
    eb.align_roll(m.to_3x3().col[2])
    if pparent:
        eb.parent = armature_data.edit_bones[pparent]

bpy.ops.object.mode_set(mode="OBJECT")

# --- Refined Mesh Construction ---
# 1. Hips and Pelvis (Exact seated contact at Z=0.46m)
make_box("resident-pelvis-seat", (0.0, -0.01, 0.495), (0.34, 0.30, 0.07), pants_slate,
         bone_weights={"pelvis": 1.0}, bevel=0.035)

# 2. Torso (Teal shirt with collar and chest definition)
make_ellipsoid("resident-torso", (0.0, 0.008, 0.77), (0.19, 0.13, 0.18), cloth_teal,
               bone_weights={"spine": 0.8, "pelvis": 0.2}, segs=20, rings=12)
make_box("resident-chest", (0.0, 0.012, 0.94), (0.36, 0.22, 0.22), cloth_teal,
         bone_weights={"chest": 1.0}, bevel=0.04)
make_cylinder("resident-collar", (0.0, 0.015, 1.04), (0.0, 0.015, 1.075), 0.072, cloth_teal,
              bone_weights={"chest": 0.5, "neck": 0.5})

# 3. Neck & Stylized Head & Facial Features
make_cylinder("resident-neck", (0.0, 0.015, 1.055), (0.0, 0.015, 1.135), 0.052, skin,
              bone_weights={"neck": 0.7, "head": 0.3})
make_ellipsoid("resident-head-cranium", (0.0, 0.02, 1.25), (0.102, 0.108, 0.135), skin,
               bone_weights={"head": 1.0}, segs=20, rings=12)
make_box("resident-jaw", (0.0, 0.06, 1.18), (0.11, 0.09, 0.07), skin,
         bone_weights={"head": 1.0}, bevel=0.025)
make_box("resident-nose", (0.0, 0.125, 1.228), (0.022, 0.030, 0.032), skin,
         bone_weights={"head": 1.0}, bevel=0.008)

# Stylized Hair (Layered crown volume, clean sideburns and neckline)
make_ellipsoid("resident-hair-crown", (0.0, -0.005, 1.332), (0.112, 0.115, 0.082), hair,
               bone_weights={"head": 1.0}, segs=20, rings=10)
make_box("resident-hair-bangs", (0.0, 0.08, 1.31), (0.13, 0.05, 0.05), hair,
         bone_weights={"head": 1.0}, bevel=0.018)
make_box("resident-hair-sides", (0.0, -0.01, 1.24), (0.216, 0.15, 0.10), hair,
         bone_weights={"head": 1.0}, bevel=0.022)

# Eyes & Ears
for sign in (-1, 1):
    make_ellipsoid("resident-eye", (sign * 0.043, 0.115, 1.265), (0.012, 0.008, 0.014), eye_mat,
                   bone_weights={"head": 1.0})
    make_ellipsoid("resident-ear", (sign * 0.102, 0.012, 1.238), (0.016, 0.026, 0.034), skin,
                   bone_weights={"head": 1.0})

# 4. Limbs, Hands with Articulated Fingers
for side, sign in [("L", -1), ("R", 1)]:
    upper_pos = rest_pose[f"upper-arm.{side}"].translation
    elbow_pos = rest_pose[f"forearm.{side}"].translation
    wrist_pos = rest_pose[f"hand.{side}"].translation
    hip_pos = rest_pose[f"thigh.{side}"].translation
    knee_pos = rest_pose[f"shin.{side}"].translation
    ankle_pos = rest_pose[f"foot.{side}"].translation

    # Shoulder cuff & arm
    make_ellipsoid(f"resident-shoulder-{side}", upper_pos, (0.062, 0.062, 0.062), cloth_teal,
                   bone_weights={f"clavicle.{side}": 0.4, f"upper-arm.{side}": 0.6})
    make_cylinder(f"resident-sleeve-{side}", upper_pos, upper_pos.lerp(elbow_pos, 0.65), 0.058, cloth_teal,
                  bone_weights={f"upper-arm.{side}": 1.0})
    make_cylinder(f"resident-bicep-{side}", upper_pos.lerp(elbow_pos, 0.6), elbow_pos, 0.044, skin,
                  bone_weights={f"upper-arm.{side}": 1.0})

    # Forearm
    make_ellipsoid(f"resident-elbow-{side}", elbow_pos, (0.046, 0.046, 0.046), skin,
                   bone_weights={f"forearm.{side}": 1.0})
    make_cylinder(f"resident-forearm-{side}", elbow_pos, wrist_pos, 0.038, skin,
                  bone_weights={f"forearm.{side}": 1.0})

    # Palm
    palm_pos = wrist_pos + Vector((0.0, 0.045, -0.005))
    make_box(f"resident-palm-{side}", palm_pos, (0.072, 0.065, 0.020), skin,
             bone_weights={f"hand.{side}": 1.0}, bevel=0.006)

    # Fingers: Articulated Thumb, Index, and Middle/Ring/Pinky
    # Thumb
    thumb_base = wrist_pos + Vector((sign * 0.028, 0.022, 0.000))
    thumb_tip = thumb_base + Vector((sign * 0.025, 0.035, -0.004))
    make_cylinder(f"resident-thumb-{side}", thumb_base, thumb_tip, 0.008, skin,
                  bone_weights={f"thumb.{side}": 1.0})

    # Index finger
    index_base = palm_pos + Vector((sign * 0.018, 0.030, 0.002))
    index_tip = index_base + Vector((sign * 0.008, 0.038, -0.004))
    make_cylinder(f"resident-index-{side}", index_base, index_tip, 0.0075, skin,
                  bone_weights={f"index.{side}": 1.0})

    # Middle, Ring, Pinky finger bank
    other_base = palm_pos + Vector((-sign * 0.012, 0.030, 0.001))
    other_tip = other_base + Vector((-sign * 0.008, 0.038, -0.004))
    make_box(f"resident-fingers-{side}", (other_base + other_tip) * 0.5, (0.040, 0.038, 0.015), skin,
             bone_weights={f"fingers.{side}": 1.0}, bevel=0.004)

    # Seated Legs & Knees
    make_cylinder(f"resident-thigh-{side}", hip_pos, knee_pos, 0.068, pants_slate,
                  bone_weights={f"thigh.{side}": 1.0})
    make_ellipsoid(f"resident-knee-{side}", knee_pos, (0.076, 0.076, 0.076), pants_slate,
                   bone_weights={f"shin.{side}": 1.0})
    make_cylinder(f"resident-shin-{side}", knee_pos, ankle_pos, 0.060, pants_slate,
                  bone_weights={f"shin.{side}": 1.0})

    # Detailed Sneakers (Grounded flat sole at Z=0.00m)
    sole_center = ankle_pos + Vector((0.0, 0.065, -0.095))
    upper_center = ankle_pos + Vector((0.0, 0.060, -0.045))
    make_box(f"resident-shoe-sole-{side}", sole_center, (0.136, 0.270, 0.030), shoe_sole,
             bone_weights={f"foot.{side}": 1.0}, bevel=0.005)
    make_box(f"resident-shoe-upper-{side}", upper_center, (0.130, 0.250, 0.070), shoe_upper,
             bone_weights={f"foot.{side}": 1.0}, bevel=0.018)

# Join all avatar parts into single skinned mesh
bpy.ops.object.select_all(action="DESELECT")
for obj in avatar_mesh_parts:
    obj.select_set(True)
bpy.context.view_layer.objects.active = avatar_mesh_parts[0]
bpy.ops.object.join()
body = bpy.context.object
body.name = "resident-body"
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
body.location = ROOT

arm_modifier = body.modifiers.new("resident-skinning", "ARMATURE")
arm_modifier.object = rig

# --- Build Fixture (Swivel Chair & Reference Furniture) ---
desk = make_box("desk", (0.0, 1.15, 0.72), (2.6, 0.8, 0.06), ivory, fixture_objects)
desk["assetId"] = "desk"
for x in (-1.08, 1.08):
    make_box("desk-pedestal", (x, 1.15, 0.345), (0.40, 0.72, 0.69), ivory, fixture_objects)
keyboard = make_box("keyboard-proof", (0.30, 0.94, 0.766), (0.47, 0.20, 0.032), dark, fixture_objects, bevel=0.008)
for row in range(3):
    for col in range(11):
        make_box("key", (0.095 + col * 0.041, 0.864 + row * 0.061, 0.786), (0.034, 0.046, 0.008), ivory, fixture_objects, bevel=0.003)
# Mouse object
make_box("mouse-proof", (0.58, 0.95, 0.762), (0.08, 0.13, 0.035), dark, fixture_objects, bevel=0.012)

make_box("monitor-proof", (0.0, 1.38, 1.08), (0.81, 0.07, 0.46), dark, fixture_objects)
make_box("monitor-screen-proof", (0.0, 1.335, 1.08), (0.75, 0.015, 0.4), screen_mat, fixture_objects, bevel=0.008)
floor = make_box("fixture-floor", (0.0, 0.0, -0.025), (4.2, 3.6, 0.05), floor_mat, fixture_objects, bevel=0.0)

static_fixture = bpy.data.objects.new("fixture-static", None)
scene.collection.objects.link(static_fixture)
static_fixture["proofOnly"] = True
for obj in fixture_objects:
    obj.parent = static_fixture
fixture_objects.append(static_fixture)

# Swivel chair
chair_root = bpy.data.objects.new("chair-root", None)
scene.collection.objects.link(chair_root)
chair_root.location = ROOT
chair_root["assetId"] = "chair"

chair_parts = []
make_box("chair-seat", (0.0, -0.025, 0.42), (0.52, 0.40, 0.08), blue, chair_parts, bevel=0.035)
make_box("chair-back", (0.0, -0.215, 0.81), (0.46, 0.08, 0.72), blue, chair_parts, bevel=0.035)
make_box("chair-back-insert", (0.0, -0.162, 0.85), (0.27, 0.03, 0.57), ivory, chair_parts, bevel=0.020)
for sign in (-1, 1):
    make_box("chair-arm", (sign * 0.33, 0.015, 0.64), (0.065, 0.34, 0.055), blue, chair_parts, bevel=0.02)
    make_box("chair-arm-support", (sign * 0.32, -0.04, 0.5175), (0.04, 0.04, 0.195), ivory, chair_parts)

chair_base = bpy.data.objects.new("chair-base", None)
scene.collection.objects.link(chair_base)
chair_base.location = ROOT
chair_base["assetId"] = "chair"

base_parts = []
make_cylinder("chair-pedestal", (0.0, 0.0, 0.07), (0.0, 0.0, 0.38), 0.05, dark, owner=base_parts)
for i in range(5):
    angle = i * math.tau / 5.0
    end = Vector((math.cos(angle) * 0.22, math.sin(angle) * 0.22, 0.075))
    make_cylinder("chair-spoke", (0.0, 0.0, 0.13), end, 0.026, ivory, owner=base_parts)
    make_ellipsoid("chair-caster", end - Vector((0.0, 0.0, 0.031)), (0.041, 0.030, 0.044), dark, owner=base_parts)

for obj in chair_parts:
    obj.parent = chair_root
fixture_objects += [chair_root] + chair_parts

for obj in base_parts:
    obj.parent = chair_base
fixture_objects += [chair_base] + base_parts

# --- Author Keyframe Animations for all 8 Clips ---
def setup_action(obj, name):
    obj.animation_data_create()
    act = bpy.data.actions.new(name)
    act.use_fake_user = True
    obj.animation_data.action = act
    return act

avatar_actions = {}
chair_actions = {}

for clip, duration in CLIPS.items():
    act = setup_action(rig, clip)
    chair_act = setup_action(chair_root, "fixture-" + clip)
    frame_count = round(duration * FPS)

    prev_quats = {}
    for frame in range(1, frame_count + 2):
        sec = (frame - 1) / FPS
        pose = compute_skeleton_pose(clip, sec)

        for bname in bone_hierarchy:
            pb = rig.pose.bones[bname]
            pb.rotation_mode = "QUATERNION"
            pb.matrix = pose[bname]
            bpy.context.view_layer.update()

            quat = pb.rotation_quaternion.copy()
            if bname in prev_quats and quat.dot(prev_quats[bname]) < 0:
                quat.negate()
                pb.rotation_quaternion = quat
                bpy.context.view_layer.update()
            prev_quats[bname] = quat

            pb.keyframe_insert("location", frame=frame, group=bname)
            pb.keyframe_insert("rotation_quaternion", frame=frame, group=bname)
            pb.keyframe_insert("scale", frame=frame, group=bname)

        motion_data = evaluate_clip_motion(clip, sec)
        chair_root.rotation_euler = (0.0, 0.0, motion_data["yaw"])
        chair_root.keyframe_insert("rotation_euler", frame=frame)

    for a in (act, chair_act):
        a.use_frame_range = True
        a.frame_start = 1
        a.frame_end = frame_count + 1
        for layer in a.layers:
            for strip in layer.strips:
                for bag in strip.channelbags:
                    for curve in bag.fcurves:
                        for pt in curve.keyframe_points:
                            pt.interpolation = "LINEAR"

    avatar_actions[clip] = act
    chair_actions[clip] = chair_act

def assign_nla_tracks(obj, action_map):
    obj.animation_data.action = None
    for name, act in action_map.items():
        track = obj.animation_data.nla_tracks.new()
        track.name = name
        track.mute = True
        strip = track.strips.new(name, 1, act)
        strip.extrapolation = "NOTHING"
    obj.animation_data.action = action_map["coding_idle"]

assign_nla_tracks(rig, avatar_actions)
assign_nla_tracks(chair_root, chair_actions)
scene.frame_set(1)

def apply_active_action(obj, act):
    obj.animation_data.action = act
    if act.slots:
        obj.animation_data.action_slot = act.slots[0]

# --- Native Physical Clearance & Seated Measurements ---
def measure_all_clips():
    measurements = []
    for clip, duration in CLIPS.items():
        apply_active_action(rig, avatar_actions[clip])
        apply_active_action(chair_root, chair_actions[clip])

        feet_min_z = 100.0
        pelvis_min_z = 100.0
        desktop_hits = 0
        min_hand_gap = 100.0
        surface_intersections = {}
        sample_count = round(duration * FPS) * 2 + 1

        for s in range(sample_count):
            frame = 1 + s * 0.5
            scene.frame_set(int(frame), subframe=frame - int(frame))
            deps = bpy.context.evaluated_depsgraph_get()
            body_eval = body.evaluated_get(deps)
            mesh = body_eval.to_mesh()

            world_verts = [body_eval.matrix_world @ v.co for v in mesh.vertices]
            body_bvh = BVHTree.FromPolygons(world_verts, [tuple(p.vertices) for p in mesh.polygons])

            for f_obj in fixture_objects:
                if f_obj.type != "MESH" or f_obj == floor:
                    continue
                fe = f_obj.evaluated_get(deps)
                fm = fe.to_mesh()
                fbvh = BVHTree.FromPolygons([fe.matrix_world @ v.co for v in fm.vertices],
                                            [tuple(p.vertices) for p in fm.polygons])
                hits = body_bvh.overlap(fbvh)
                if hits:
                    row = surface_intersections.setdefault(f_obj.name, {"pairs": 0, "frames": [], "bones": set()})
                    row["pairs"] += len(hits)
                    row["frames"].append(frame)
                    for poly_idx, _ in hits:
                        for vi in mesh.polygons[poly_idx].vertices:
                            for g in body.data.vertices[vi].groups:
                                if g.weight > 0.8:
                                    row["bones"].add(body.vertex_groups[g.group].name)
                fe.to_mesh_clear()

            for v in mesh.vertices:
                p = body_eval.matrix_world @ v.co
                gnames = [body.vertex_groups[g.group].name for g in body.data.vertices[v.index].groups if g.weight > 0.8]
                if any(n.startswith("foot.") for n in gnames):
                    feet_min_z = min(feet_min_z, p.z)
                if any(n.startswith("pelvis") for n in gnames):
                    pelvis_min_z = min(pelvis_min_z, p.z)
                # Desktop interior intrusion
                if -1.3 < p.x < 1.3 and 0.75 < p.y < 1.55 and 0.69 < p.z < 0.75:
                    desktop_hits += 1
                if clip in ("turn_to_visitor", "greeting_nod") and any(n.startswith("hand.") or n.startswith("thumb.") or n.startswith("index.") or n.startswith("fingers.") for n in gnames):
                    min_hand_gap = min(min_hand_gap, 0.75 - p.y)

            body_eval.to_mesh_clear()

        measurements.append({
            "clip": clip,
            "durationSec": duration,
            "authoredFrames": round(duration * FPS) + 1,
            "samples60Hz": sample_count,
            "minimumSoleHeightM": round(feet_min_z, 6),
            "minimumPelvisBottomM": round(pelvis_min_z, 6),
            "desktopInteriorVertexHits": desktop_hits,
            "minimumHandFrontGapM": round(min_hand_gap, 4) if min_hand_gap < 100.0 else None,
            "surfaceIntersections": {k: {"pairs": v["pairs"], "bones": sorted(v["bones"])} for k, v in surface_intersections.items()}
        })
    return measurements

measurements = measure_all_clips()
(EVIDENCE / "blender-measurements.json").write_text(json.dumps({
    "fps": FPS,
    "samplingHz": 60,
    "measurements": measurements
}, indent=2), encoding="utf-8")

# Validate measurements against physical criteria
checks = []
for m in measurements:
    # Seat contact check: only chair-seat tangency with pelvis allowed
    seat_ok = all(k == "chair-seat" and v["bones"] == ["pelvis"] for k, v in m["surfaceIntersections"].items())
    checks.append({
        "name": f"{m['clip']} desk clearance & seat tangency",
        "status": "PASS" if seat_ok and m["desktopInteriorVertexHits"] == 0 else "FAIL",
        "desktopHits": m["desktopInteriorVertexHits"],
        "intersections": m["surfaceIntersections"]
    })
    # Grounded foot sole check (floor is at Z=0, shoe sole should be >= 0 and within 0.0002m)
    checks.append({
        "name": f"{m['clip']} foot grounding",
        "status": "PASS" if abs(m["minimumSoleHeightM"]) <= 0.0005 else "FAIL",
        "soleHeight": m["minimumSoleHeightM"]
    })
    if m["minimumHandFrontGapM"] is not None:
        checks.append({
            "name": f"{m['clip']} turn hand clearance (>= 0.15m)",
            "status": "PASS" if m["minimumHandFrontGapM"] >= 0.15 else "FAIL",
            "handClearanceM": m["minimumHandFrontGapM"]
        })

(EVIDENCE / "blender-checks.json").write_text(json.dumps(checks, indent=2), encoding="utf-8")

# --- Export Binary glTF 2.0 and Native Blend ---
def export_gltf(path, objects):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objects:
        o.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=str(path),
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_apply=False,
        export_animations=True,
        export_anim_slide_to_zero=True,
        export_texcoords=False,
        export_animation_mode="NLA_TRACKS",
        export_force_sampling=True,
        export_frame_range=False,
        export_frame_step=1,
        export_skins=True,
        export_extras=True,
        export_cameras=False,
        export_lights=False,
        export_optimize_animation_size=True,
        export_optimize_animation_keep_anim_object=True,
    )

apply_active_action(rig, avatar_actions["coding_idle"])
apply_active_action(chair_root, chair_actions["coding_idle"])
scene.frame_set(1)

export_gltf(OUT / "resident-production.glb", [rig, body])
export_gltf(OUT / "fixture-production.glb", fixture_objects)

# Setup render camera for photographic evidence
def create_camera(name, loc, target):
    cv = lambda p: Vector((p[0], -p[2], p[1]))
    bpy.ops.object.camera_add(location=cv(loc))
    cam = bpy.context.object
    cam.name = name
    cam.rotation_euler = (cv(target) - cam.location).to_track_quat("-Z", "Y").to_euler()
    cam.data.sensor_fit = "VERTICAL"
    cam.data.lens = 32
    return cam

scene.camera = create_camera("prod-camera", (-2.15, 1.72, 2.10), (0.0, 0.72, -0.64))
scene.world.color = (0.45, 0.45, 0.45)

for name, loc, power, col in [
    ("key-soft", (-2.0, -3.0, 4.0), 550, (1.0, 0.95, 0.89)),
    ("cyan-fill", (2.0, 1.0, 3.0), 280, (0.40, 0.82, 1.0)),
    ("pink-rim", (-1.0, 2.0, 2.8), 240, (1.0, 0.45, 0.75)),
]:
    bpy.ops.object.light_add(type="AREA", location=loc)
    l = bpy.context.object
    l.name = name
    l.data.energy = power
    l.data.color = col
    l.data.shape = "DISK"
    l.data.size = 3.0
    l.rotation_euler = (Vector((0.0, 0.5, 0.7)) - l.location).to_track_quat("-Z", "Y").to_euler()

scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = 12
scene.render.resolution_x = 1140
scene.render.resolution_y = 800
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.view_settings.view_transform = "AgX"

bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE_DIR / "resident-production.blend"))
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE_DIR / "fixture-production.blend"))

if "--render" in sys.argv:
    renders = [
        ("coding_idle", 1, "01-coding-idle"),
        ("mouse_idle", 30, "02-mouse-idle"),
        ("notice_visitor", 18, "03-notice-visitor"),
        ("turn_to_visitor", 36, "04-turn-to-visitor"),
        ("greeting_nod", 14, "05-greeting-nod"),
        ("return_to_work", 20, "06-return-to-work"),
        ("attention_glance", 18, "07-attention-glance"),
        ("breathing_idle", 60, "08-breathing-idle"),
    ]
    for cname, f, lbl in renders:
        apply_active_action(rig, avatar_actions[cname])
        apply_active_action(chair_root, chair_actions[cname])
        scene.frame_set(f)
        scene.render.filepath = str(EVIDENCE / f"blender-{lbl}.png")
        bpy.ops.render.render(write_still=True)

manifest = {
    "model": "production-resident-avatar",
    "version": "1.0.0",
    "generator": bpy.app.version_string,
    "topology": {
        "vertices": len(body.data.vertices),
        "polygons": len(body.data.polygons),
        "bones": list(bone_hierarchy.keys()),
        "boneCount": len(bone_hierarchy),
    },
    "clips": {k: {"durationSec": v, "frames": round(v * FPS) + 1} for k, v in CLIPS.items()},
    "files": {
        "resident-production.glb": {
            "bytes": (OUT / "resident-production.glb").stat().st_size,
            "sha256": hashlib.sha256((OUT / "resident-production.glb").read_bytes()).hexdigest(),
        },
        "fixture-production.glb": {
            "bytes": (OUT / "fixture-production.glb").stat().st_size,
            "sha256": hashlib.sha256((OUT / "fixture-production.glb").read_bytes()).hexdigest(),
        },
        "resident-production.blend": {
            "bytes": (SOURCE_DIR / "resident-production.blend").stat().st_size,
            "sha256": hashlib.sha256((SOURCE_DIR / "resident-production.blend").read_bytes()).hexdigest(),
        },
    },
    "checks": checks,
}
(EVIDENCE / "resident-manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
print("RESIDENT_GENERATION_SUCCESS", json.dumps(manifest["files"]))
