"""W2/F1 seated-human export proof. Run with Blender 5.2.2 --background --python.

Original procedural mannequin, not a likeness or final B4 character. Coordinates
in this authoring file are Blender meters/Z-up, forward +Y. glTF exporter performs
the only axis conversion. All outputs remain beside this file.
"""
import bpy
import math
import json
import hashlib
import sys
from pathlib import Path
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

OUT = Path(__file__).resolve().parent
EVIDENCE = OUT / "evidence" / "r2"
EVIDENCE.mkdir(parents=True, exist_ok=True)
ROOT = Vector((0.30, 0.36, 0))
FPS = 30
TURN = math.radians(125)
CLIPS = {"coding_idle": 6.0, "notice_visitor": .6, "turn_to_visitor": 1.2,
         "greeting_nod": .9, "return_to_work": 1.3}

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

def material(name, rgb, roughness=.65):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*rgb, 1)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*rgb, 1)
    bsdf.inputs["Roughness"].default_value = roughness
    return m

ivory = material("fixture-ivory", (.86, .84, .81))
blue = material("fixture-chair-blue", (.075, .22, .63), .55)
dark = material("fixture-dark-plastic", (.045, .055, .095))
cloth = material("resident-teal-shirt", (.045, .28, .31))
pants = material("resident-slate-trousers", (.085, .12, .18))
skin = material("resident-generic-skin", (.58, .32, .20))
hair = material("resident-hair", (.035, .018, .014))
shoe = material("resident-shoes", (.73, .76, .80))
eye = material("resident-eye", (.014, .018, .022))
floor_mat = material("fixture-blue-floor", (.20, .29, .45))
screen_mat = material("fixture-screen", (.14, .10, .27))

fixture = []
avatar_parts = []

def finish(obj, name, mat, owner=None, bone=None):
    obj.name = name
    obj.data.materials.append(mat)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if owner is not None:
        owner.append(obj)
    if bone:
        group = obj.vertex_groups.new(name=bone)
        group.add(list(range(len(obj.data.vertices))), 1.0, "REPLACE")
        avatar_parts.append(obj)
    return obj

def box(name, center, size, mat, owner=None, bone=None, bevel=.015):
    bpy.ops.mesh.primitive_cube_add(size=1, location=center)
    obj = bpy.context.object
    obj.scale = size
    finish(obj, name, mat, owner, bone)
    if bevel:
        mod = obj.modifiers.new("rounded-proof-edges", "BEVEL")
        mod.width = bevel
        mod.segments = 2
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return obj

def ellipsoid(name, center, radii, mat, bone=None, owner=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, radius=1, location=center)
    obj = bpy.context.object
    obj.scale = radii
    finish(obj, name, mat, owner, bone)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return obj

def capsule(name, a, b, radius, mat, bone=None, owner=None):
    a, b = Vector(a), Vector(b)
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=radius, depth=(b-a).length, location=(a+b)/2)
    obj = bpy.context.object
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = (b-a).to_track_quat("Z", "Y")
    finish(obj, name, mat, owner, bone)
    for p in obj.data.polygons:
        p.use_smooth = True
    return obj

def smooth(t):
    t = min(1, max(0, t))
    return t*t*(3-2*t)

def rotate(v, angle):
    return Matrix.Rotation(angle, 3, "Z") @ Vector(v)

def basis(head, tail, roll_angle=0):
    """World-space bone matrix, local Y follows head->tail, no scale."""
    head, tail = Vector(head), Vector(tail)
    q = (tail-head).to_track_quat("Y", "Z")
    m = q.to_matrix().to_4x4()
    m.translation = head
    return m

def two_bone(hip, ankle, forward, upper=.356, lower=.396):
    dvec = ankle-hip
    d = dvec.length
    assert abs(upper-lower) < d < upper+lower, ("unreachable leg", d)
    n = dvec.normalized()
    along = (upper*upper - lower*lower + d*d)/(2*d)
    height = math.sqrt(max(0, upper*upper-along*along))
    bend = (forward - n*forward.dot(n)).normalized()
    return hip + n*along + bend*height

def step_pose(side, phase, start_angle, end_angle):
    """Two short swivel steps/foot; fixed XY and yaw whenever sole is planted."""
    windows = [(.015,.38), (.48,.86)] if side == "L" else [(.15,.52), (.60,1.0)]
    angle, lift = start_angle, 0.0
    for i, (begin,end) in enumerate(windows):
        a0 = start_angle+(end_angle-start_angle)*i/2
        a1 = start_angle+(end_angle-start_angle)*(i+1)/2
        if phase >= end:
            angle = a1
        elif phase > begin:
            u = (phase-begin)/(end-begin)
            angle = a0+(a1-a0)*smooth(u)
            lift = .052*math.sin(math.pi*u)
            break
    return angle, lift

def motion(clip, seconds):
    u = max(0,min(1,seconds/CLIPS[clip]))
    yaw, retract, nod = 0., 0., 0.
    foot_angles = {"L":0.,"R":0.}
    foot_lifts = {"L":0.,"R":0.}
    if clip == "notice_visitor":
        retract = smooth(u)
    elif clip == "turn_to_visitor":
        yaw, retract = TURN*smooth(u), 1.
        for side in foot_angles:
            foot_angles[side], foot_lifts[side] = step_pose(side,u,0,TURN)
    elif clip == "greeting_nod":
        yaw,retract = TURN,1.
        foot_angles = {"L":TURN,"R":TURN}
        nod = math.radians(9)*math.sin(math.pi*u)**2
    elif clip == "return_to_work":
        # Only land hands after chair reaches desk-facing pose (last .325 sec).
        swivel = min(1,u/.75)
        yaw = TURN*(1-smooth(swivel))
        retract = 1-smooth((u-.75)/.25)
        for side in foot_angles:
            foot_angles[side],foot_lifts[side] = step_pose(side,swivel,TURN,0)
    return yaw,retract,nod,foot_angles,foot_lifts

def skeleton_pose(clip,seconds):
    yaw,retract,nod,foot_angles,foot_lifts = motion(clip,seconds)
    poses = {}
    R = Matrix.Rotation(yaw,4,"Z")
    poses["body-turn"] = R
    pelvis = Vector((0,0,.55))
    poses["pelvis"] = R @ basis(pelvis,(0,0,.69))
    poses["spine"] = R @ basis((0,0,.69),(0,.015,1.055))
    neck = Vector((0,.015,1.075))
    head_m = basis(neck,neck+Vector((0,0,.21)))
    # Global X nod inclines the face downward. No unlimited head tracking.
    head_m = Matrix.Translation(neck) @ Matrix.Rotation(nod,4,"X") @ Matrix.Translation(-neck) @ head_m
    poses["head"] = R @ head_m
    for side,sign in [("L",-1),("R",1)]:
        shoulder = Vector((sign*.205,.015,1.005))
        tap = .001*(1-math.cos(seconds*math.tau*(2 if side=="L" else 2.5))) if clip=="coding_idle" else 0
        wrist = Vector((sign*(.145+.045*retract),.455-.29*retract,.810+.103*retract+tap))
        # Fold elbows beside the ribs as hands withdraw; do not sweep an
        # outward elbow through the desk/keyboard when the chair turns.
        elbow = two_bone(shoulder,wrist,Vector((sign*(.85-.45*retract),-.8*retract,-1)),.276,.282)
        poses[f"upper-arm.{side}"] = R @ basis(shoulder,elbow)
        poses[f"forearm.{side}"] = R @ basis(elbow,wrist)
        poses[f"hand.{side}"] = R @ basis(wrist,wrist+Vector((0,.12,0)))
        hip = rotate((sign*.115,0,.59),yaw)
        ankle = rotate((sign*.17,.32,.11),foot_angles[side])
        ankle.z += foot_lifts[side]
        knee = two_bone(hip,ankle,rotate((sign*.12,1,0),yaw))
        poses[f"thigh.{side}"] = basis(hip,knee)
        poses[f"shin.{side}"] = basis(knee,ankle)
        poses[f"foot.{side}"] = basis(ankle,ankle+rotate((0,.15,0),foot_angles[side]))
    return poses

rest = skeleton_pose("coding_idle",0)
bones = {"body-turn":None,"pelvis":"body-turn","spine":"pelvis","head":"spine"}
for side in ("L","R"):
    bones.update({f"upper-arm.{side}":"spine", f"forearm.{side}":f"upper-arm.{side}",
                  f"hand.{side}":f"forearm.{side}",f"thigh.{side}":"pelvis",
                  f"shin.{side}":f"thigh.{side}",f"foot.{side}":None})
# Independent baked foot roots preserve world-space planted translations between
# 30 FPS keys. Parenting them through interpolating thigh/shin rotations produced
# small floor penetration and sideways excursions between keys in the first run.

arm_data = bpy.data.armatures.new("resident-seated-rig")
rig = bpy.data.objects.new("resident",arm_data)
scene.collection.objects.link(rig)
rig.location = ROOT
rig["assetId"] = "resident"
rig["proofBaseline"] = "F1"
rig["likeness"] = "generic unapproved mannequin"
rig.show_in_front = True
bpy.context.view_layer.objects.active = rig
rig.select_set(True)
bpy.ops.object.mode_set(mode="EDIT")
for name,parent in bones.items():
    b = arm_data.edit_bones.new(name)
    # An uninitialized edit bone has zero length; assigning matrix first loses
    # its intended axis. Set endpoints explicitly, then match local Z roll.
    b.head = rest[name].translation
    b.tail = b.head + rest[name].to_3x3().col[1] * .16
    b.align_roll(rest[name].to_3x3().col[2])
    if parent:
        b.parent = arm_data.edit_bones[parent]
bpy.ops.object.mode_set(mode="OBJECT")

# All geometry below is in armature-local rest coordinates, joined and weighted.
ellipsoid("hips",(0,0,.55),(.205,.14,.09),pants,"pelvis")
ellipsoid("shirt",(0,.005,.865),(.205,.125,.235),cloth,"spine")
capsule("neck",(0,.015,1.055),(0,.015,1.13),.053,skin,"head")
ellipsoid("head-shape",(0,.02,1.245),(.103,.105,.14),skin,"head")
ellipsoid("hair-cap",(0,-.005,1.326),(.109,.106,.075),hair,"head")
ellipsoid("nose",(0,.125,1.236),(.022,.031,.025),skin,"head")
for sign in (-1,1):
    ellipsoid("eye",(sign*.044,.117,1.276),(.012,.008,.015),eye,"head")
    ellipsoid("ear",(sign*.101,.012,1.243),(.018,.025,.033),skin,"head")

for side in ("L","R"):
    upper = rest[f"upper-arm.{side}"].translation
    elbow = rest[f"forearm.{side}"].translation
    wrist = rest[f"hand.{side}"].translation
    hip = rest[f"thigh.{side}"].translation
    knee = rest[f"shin.{side}"].translation
    ankle = rest[f"foot.{side}"].translation
    capsule("sleeve-"+side,upper,upper.lerp(elbow,.62),.063,cloth,f"upper-arm.{side}")
    capsule("arm-"+side,upper.lerp(elbow,.55),elbow,.044,skin,f"upper-arm.{side}")
    ellipsoid("elbow-"+side,elbow,(.046,.046,.046),skin,f"forearm.{side}")
    capsule("forearm-"+side,elbow,wrist,.037,skin,f"forearm.{side}")
    ellipsoid("hand-"+side,wrist+Vector((0,.050,0)),(.040,.078,.019),skin,f"hand.{side}")
    capsule("thigh-"+side,hip,knee,.078,pants,f"thigh.{side}")
    ellipsoid("knee-"+side,knee,(.078,.078,.078),pants,f"shin.{side}")
    capsule("shin-"+side,knee,ankle,.059,pants,f"shin.{side}")
    box("shoe-"+side,ankle+Vector((0,.065,-.055)),(.142,.265,.11),shoe,bone=f"foot.{side}",bevel=.018)

bpy.ops.object.select_all(action="DESELECT")
for obj in avatar_parts:
    obj.select_set(True)
bpy.context.view_layer.objects.active = avatar_parts[0]
bpy.ops.object.join()
body = bpy.context.object
body.name = "resident-body"
# Bake rest geometry positions into mesh, leaving a clean identity transform.
bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
body.location = ROOT
# Keep the skinned mesh a scene root. Joint world transforms already include
# resident placement; parenting the skin beneath resident is redundant in glTF.
mod = body.modifiers.new("seated-deformation", "ARMATURE")
mod.object = rig

# Coarse fixture only: it is explicitly excluded from the avatar GLB.
desk = box("desk",(0,1.15,.72),(2.6,.8,.06),ivory,fixture)
desk["assetId"] = "desk"
for x in (-1.08,1.08):
    box("desk-pedestal",(x,1.15,.345),(.40,.72,.69),ivory,fixture)
keyboard = box("keyboard-proof",(.30,.94,.766),(.47,.20,.032),dark,fixture,bevel=.008)
for row in range(3):
    for col in range(11):
        box("key",(.095+col*.041,.864+row*.061,.786),(.034,.046,.008),ivory,fixture,bevel=.003)
box("monitor-proof",(0,1.38,1.08),(.81,.07,.46),dark,fixture)
box("monitor-screen-proof",(0,1.335,1.08),(.75,.015,.4),screen_mat,fixture,bevel=.008)
box("monitor-stand-proof",(0,1.40,.84),(.08,.10,.20),ivory,fixture)
floor = box("fixture-floor",(0,0,-.025),(4.2,3.6,.05),floor_mat,fixture,bevel=0)
static = bpy.data.objects.new("fixture-static",None)
scene.collection.objects.link(static)
static["proofOnly"] = True
static["integrationUse"] = "discard entire subtree; retain accepted W1 desk/environment"
for obj in fixture:
    obj.parent = static
fixture.append(static)
chair = bpy.data.objects.new("chair-root",None)
scene.collection.objects.link(chair)
chair.location = ROOT
chair["assetId"] = "chair"
chair["proofBaseline"] = "F1"
chair_parts=[]
box("chair-seat",(0,-.025,.42),(.52,.40,.08),blue,chair_parts,bevel=.035)
box("chair-back",(0,-.215,.81),(.46,.08,.72),blue,chair_parts,bevel=.035)
box("chair-back-insert",(0,-.162,.85),(.27,.03,.57),ivory,chair_parts,bevel=.020)
for sign in (-1,1):
    box("chair-arm",(sign*.33,.015,.64),(.065,.34,.055),blue,chair_parts,bevel=.02)
    box("chair-arm-support",(sign*.32,-.04,.5175),(.04,.04,.195),ivory,chair_parts)
base = bpy.data.objects.new("chair-base",None)
scene.collection.objects.link(base)
base.location = ROOT
base["assetId"] = "chair"
base["integrationUse"] = "keep with chair-root; stationary swivel base"
base_parts=[]
capsule("chair-pedestal",(0,0,.07),(0,0,.38),.05,dark,owner=base_parts)
for i in range(5):
    angle = i*math.tau/5
    end = Vector((math.cos(angle)*.22,math.sin(angle)*.22,.075))
    capsule("chair-spoke",(0,0,.13),end,.026,ivory,owner=base_parts)
    ellipsoid("chair-caster",end-Vector((0,0,.031)),(.041,.030,.044),dark,owner=base_parts)
for obj in chair_parts:
    obj.parent = chair
fixture += [chair]+chair_parts
for obj in base_parts:
    obj.parent = base
fixture += [base]+base_parts

def action_setup(obj,name):
    obj.animation_data_create()
    action = bpy.data.actions.new(name)
    action.use_fake_user = True
    obj.animation_data.action = action
    return action

actions={}
chair_actions={}
for clip,duration in CLIPS.items():
    action = action_setup(rig,clip)
    chair_action = action_setup(chair,"fixture-"+clip)
    count = round(duration*FPS)
    previous_rotations={}
    for frame in range(1,count+2):
        seconds = (frame-1)/FPS
        pose = skeleton_pose(clip,seconds)
        # Parent-first assignment plus dependency updates computes local bases.
        for name in bones:
            pb = rig.pose.bones[name]
            pb.rotation_mode="QUATERNION"
            pb.matrix = pose[name]
            bpy.context.view_layer.update()
            # q and -q encode the same rotation, but component interpolation in
            # the editable source must never pass through their zero midpoint.
            quat=pb.rotation_quaternion.copy()
            if name in previous_rotations and quat.dot(previous_rotations[name])<0:
                quat.negate(); pb.rotation_quaternion=quat
                bpy.context.view_layer.update()
            previous_rotations[name]=quat
            pb.keyframe_insert("location",frame=frame,group=name)
            pb.keyframe_insert("rotation_quaternion",frame=frame,group=name)
            pb.keyframe_insert("scale",frame=frame,group=name)
        chair.rotation_euler = (0,0,motion(clip,seconds)[0])
        chair.keyframe_insert("rotation_euler",frame=frame)
    for a in (action,chair_action):
        a.use_frame_range=True
        a.frame_start=1
        a.frame_end=count+1
        for layer in a.layers:
            for strip in layer.strips:
                for bag in strip.channelbags:
                    for curve in bag.fcurves:
                        for point in curve.keyframe_points:
                            point.interpolation="LINEAR"
    actions[clip]=action
    chair_actions[clip]=chair_action

def track_actions(obj,lookup):
    obj.animation_data.action=None
    for name,action in lookup.items():
        track=obj.animation_data.nla_tracks.new()
        track.name=name
        track.mute=True
        strip=track.strips.new(name,1,action)
        strip.extrapolation="NOTHING"
    obj.animation_data.action=lookup["coding_idle"]

track_actions(rig,actions)
track_actions(chair,chair_actions)
scene.frame_set(1)

def choose(obj,action):
    obj.animation_data.action=action
    # Layered actions have a slot; Blender normally chooses it automatically.
    if action.slots:
        obj.animation_data.action_slot=action.slots[0]

def gather_measurements():
    results=[]
    for clip,duration in CLIPS.items():
        choose(rig,actions[clip]); choose(chair,chair_actions[clip])
        feet_min=100.; pelvis_min=100.; desktop_hits=0; hand_turn_gap=100.
        surface_hits = {}
        arm_torso_hits=0
        min_leg_scale=100.; max_leg_scale=0.
        for sample in range(round(duration*FPS)*2+1):
            frame=1+sample/2
            scene.frame_set(int(frame),subframe=frame-int(frame))
            deps=bpy.context.evaluated_depsgraph_get()
            ev=body.evaluated_get(deps)
            mesh=ev.to_mesh()
            world_vertices = [ev.matrix_world @ v.co for v in mesh.vertices]
            body_bvh = BVHTree.FromPolygons(world_vertices, [tuple(p.vertices) for p in mesh.polygons])
            def bone_polygons(prefixes):
                return [tuple(p.vertices) for p in mesh.polygons if all(
                    any(body.vertex_groups[g.group].name.startswith(prefixes) and g.weight>.9
                        for g in body.data.vertices[vi].groups) for vi in p.vertices)]
            torso_bvh=BVHTree.FromPolygons(world_vertices,bone_polygons(("spine",)))
            arms_bvh=BVHTree.FromPolygons(world_vertices,bone_polygons(("forearm.","hand.")))
            arm_torso_hits+=len(torso_bvh.overlap(arms_bvh))
            # Surface intersections, including triangle edges with no contained
            # vertices. Intentional floor/seat contact is reported separately.
            for obj in fixture:
                if obj.type != "MESH" or obj == floor:
                    continue
                f_ev=obj.evaluated_get(deps)
                f_mesh=f_ev.to_mesh()
                bvh=BVHTree.FromPolygons([f_ev.matrix_world @ v.co for v in f_mesh.vertices],
                                         [tuple(p.vertices) for p in f_mesh.polygons])
                hits=body_bvh.overlap(bvh)
                if hits:
                    row=surface_hits.setdefault(obj.name, {"pairs":0,"frames":[],"bones":set()})
                    row["pairs"]+=len(hits); row["frames"].append(frame)
                    for poly_index,_ in hits:
                        for vi in mesh.polygons[poly_index].vertices:
                            row["bones"].update(body.vertex_groups[g.group].name for g in body.data.vertices[vi].groups if g.weight>.9)
                f_ev.to_mesh_clear()
            for v in mesh.vertices:
                p=ev.matrix_world @ v.co
                names=[body.vertex_groups[g.group].name for g in body.data.vertices[v.index].groups if g.weight>.9]
                if any(n.startswith("foot.") for n in names): feet_min=min(feet_min,p.z)
                if "pelvis" in names: pelvis_min=min(pelvis_min,p.z)
                if -1.3<p.x<1.3 and .75<p.y<1.55 and .69<p.z<.75: desktop_hits+=1
                if clip in ("turn_to_visitor","greeting_nod") and any(n.startswith("hand.") for n in names):
                    hand_turn_gap=min(hand_turn_gap,.75-p.y)
            ev.to_mesh_clear()
            for name in bones:
                if name.startswith(("thigh.","shin.")):
                    for s in rig.pose.bones[name].matrix.to_scale():
                        min_leg_scale=min(min_leg_scale,s); max_leg_scale=max(max_leg_scale,s)
        results.append({"clip":clip,"authoredFrames":round(duration*FPS)+1,"samples60Hz":round(duration*FPS)*2+1,
                        "minimumSoleHeightM":feet_min,"minimumPelvisBottomM":pelvis_min,
                        "desktopInteriorVertexSamples":desktop_hits,
                        "minimumHandFrontGapDuringTurnM":hand_turn_gap if hand_turn_gap<100 else None,
                        "legScaleRange":[min_leg_scale,max_leg_scale],
                        "forearmHandTorsoSurfacePairs":arm_torso_hits,
                        "furnitureSurfaceIntersections":{name:{**row,"bones":sorted(row["bones"])} for name,row in surface_hits.items()}})
    return results

measurements=gather_measurements()
(EVIDENCE/"blender-measurements.json").write_text(json.dumps({"fps":FPS,"samplingHz":60,"sampleType":"authored frames and half-frames; evaluated skin vertices plus BVH polygon surface overlap with each furniture mesh; no continuous swept-volume claim", "measurements":measurements},indent=2))
native_checks=[]
for m in measurements:
    permitted=all(name=="chair-seat" and row["bones"]==["pelvis"]
                  for name,row in m["furnitureSurfaceIntersections"].items())
    native_checks.append({"name":m["clip"]+" native furniture clearance","status":"PASS" if permitted and m["desktopInteriorVertexSamples"]==0 else "FAIL",
       "reason":"Only pelvis/seat tangency within 0.2 mm contact tolerance is permitted; floor contact tested separately.",
       "surfaceIntersections":m["furnitureSurfaceIntersections"]})
    native_checks.append({"name":m["clip"]+" forearm/hand versus torso","status":"PASS" if m["forearmHandTorsoSurfacePairs"]==0 else "FAIL","pairs":m["forearmHandTorsoSurfacePairs"]})
    native_checks.append({"name":m["clip"]+" seat and floor lower bounds","status":"PASS" if abs(m["minimumPelvisBottomM"]-.46)<.0002 and abs(m["minimumSoleHeightM"])<.0002 else "FAIL"})
(EVIDENCE/"blender-checks.json").write_text(json.dumps(native_checks,indent=2))

def export_group(path,objects):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects: obj.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(path),export_format="GLB",use_selection=True,
        export_yup=True,export_apply=False,export_animations=True,
        export_anim_slide_to_zero=True,export_texcoords=False,
        export_animation_mode="NLA_TRACKS",export_force_sampling=True,
        export_frame_range=False,export_frame_step=1,export_skins=True,
        export_extras=True,export_cameras=False,export_lights=False,
        export_optimize_animation_size=True,
        export_optimize_animation_keep_anim_object=True)

choose(rig,actions["coding_idle"]); choose(chair,chair_actions["coding_idle"])
scene.frame_set(1)
export_group(OUT/"avatar-proof.glb",[rig,body])
export_group(OUT/"fixture-proof.glb",fixture)

# Blender inspection cameras use runtime equivalents documented in the harness.
def camera(name,runtime_location,runtime_target):
    cv=lambda p:Vector((p[0],-p[2],p[1]))
    bpy.ops.object.camera_add(location=cv(runtime_location))
    cam=bpy.context.object;cam.name=name
    cam.rotation_euler=(cv(runtime_target)-cam.location).to_track_quat("-Z","Y").to_euler()
    cam.data.sensor_fit="VERTICAL"
    cam.data.sensor_height=24
    cam.data.lens=24/(2*math.tan(math.radians(44)/2))
    return cam
scene.camera=camera("proof-fixed-camera",(-2.15,1.72,2.10),(.0,.72,-.64))
scene.world.color=(.45,.45,.45)
for name,loc,power,color,size in [
    ("soft-white",(-2,-3,4),550,(1,.95,.89),4),
    ("cyan-fill",(2,1,3),250,(.40,.82,1),3),
    ("pink-rim",(-1,2,2.8),220,(1,.45,.75),2)]:
    bpy.ops.object.light_add(type="AREA",location=loc)
    lamp=bpy.context.object;lamp.name=name;lamp.data.energy=power;lamp.data.color=color;lamp.data.shape="DISK";lamp.data.size=size
    lamp.rotation_euler=(Vector((0,.5,.7))-lamp.location).to_track_quat("-Z","Y").to_euler()
scene.render.engine="CYCLES"
scene.cycles.device="CPU"
scene.cycles.samples=12
scene.render.resolution_x=1140
scene.render.resolution_y=800
scene.render.resolution_percentage=100
scene.render.image_settings.file_format="PNG"
scene.view_settings.view_transform="AgX"
scene.frame_start=1;scene.frame_end=181
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/"avatar-proof.blend"))
if "--no-render" not in sys.argv:
    for clip,frame,label in [("coding_idle",1,"coding"),("notice_visitor",19,"hands-clear"),("greeting_nod",14,"greeting")]:
        choose(rig,actions[clip]); choose(chair,chair_actions[clip]);scene.frame_set(frame)
        scene.render.filepath=str(EVIDENCE/f"blender-{label}.png")
        bpy.ops.render.render(write_still=True)

metadata={"sourceRevision":"W2-F1-r2","exportRevision":"W2-F1-r2","baseline":"F1","specRevision":2,
 "blenderVersion":bpy.app.version_string,"fps":FPS,"runtimeAxes":"meters Y-up; rear -Z",
 "rootRuntime":[.30,0,-.36],"deskRuntime":{"centerXZ":[0,-1.15],"width":2.6,"depth":.8,"top":.75},
 "clipSeconds":CLIPS,"turnDegrees":125,"character":"generic procedural rigid-weight mannequin; unapproved likeness",
 "meshVertices":len(body.data.vertices),"meshPolygons":len(body.data.polygons),"bones":list(bones),"boneParents":bones,
 "sourceSha256":hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
 "license":"No asset license or publication approval assigned. Original procedural geometry, with inherited W2 source preserved in history.",
 "approval":{"makerAccepted":False,"parentAccepted":False,"likenessApproved":False},
 "textures":[],"provenance":{"geometry":"Original procedural W2 source; no external mesh, texture or audio", "visualReference":"main-reference.png guides fixture color/form only; reference rights unknown"},
 "status":"maker evidence only; pending independent review and parent acceptance; not final B4",
 "provider":"OpenAI","model":"GPT-6 (session developer identity; serving build not exposed)",
 "placement":"Load both GLB scenes at identity; exported nodes carry F1 translations. No extra rotations or root offsets.",
 "integration":{"avatar":"Keep all avatar-proof.glb roots and skeleton links together at identity.",
   "fixtureKeep":["chair-root","chair-base"],"fixtureDiscard":["fixture-static"],
   "chairYawOwner":"chair-root local rotation, not chair-base; avatar body-turn bone has matching absolute yaw.",
   "sync":"Both clip players sample same named clip at same local time; never parent resident under chair-root.",
   "W1":"Integrator removes accepted W1 resident proxy and entire static chair subtree, retains W1 desk/environment. Exact W1 names and hashes require accepted G1 inputs."},
 "files":{name:{"bytes":(OUT/name).stat().st_size,"sha256":hashlib.sha256((OUT/name).read_bytes()).hexdigest()} for name in ("avatar-proof.glb","fixture-proof.glb","avatar-proof.blend")}}
(OUT/"asset-metadata.json").write_text(json.dumps(metadata,indent=2))
print("W2_BUILD_COMPLETE",json.dumps(metadata["files"]))
assert all(c["status"]=="PASS" for c in native_checks), "Native physical checks failed; inspect evidence/r2/blender-checks.json"
