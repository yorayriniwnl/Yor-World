"""Successor geometry refinements. World-authored environment and local rig coordinates stay distinct."""
import math
import json
from mathutils import Vector, Matrix


def bevel(bpy, obj, width=0.01, segments=2):
    bpy.context.view_layer.objects.active = obj
    mod = obj.modifiers.new("reference-soft-edge", "BEVEL")
    mod.width = width
    mod.segments = segments
    bpy.ops.object.modifier_apply(modifier=mod.name)


def replace_mesh(bpy, obj, vertices, faces):
    old = obj.data
    data = bpy.data.meshes.new(obj.name + "-refined")
    data.from_pydata(vertices, [], faces)
    data.update()
    for mat in old.materials:
        data.materials.append(mat)
    obj.data = data
    if old.users == 0:
        bpy.data.meshes.remove(old)


def record_scene(bpy, path, b2r):
    bpy.context.view_layer.update()
    rows = []
    for obj in sorted(bpy.context.scene.objects, key=lambda o: o.name):
        if obj.type not in ("MESH", "EMPTY", "LIGHT", "ARMATURE"):
            continue
        mat = obj.matrix_world
        center = b2r(*mat.translation)
        row = {"name": obj.name, "parent": obj.parent.name if obj.parent else None,
               "type": obj.type, "worldPosition": [round(v, 7) for v in center],
               "worldMatrixBlender": [[round(v, 7) for v in line] for line in mat]}
        if obj.type == "MESH":
            points = [b2r(*(mat @ Vector(c))) for c in obj.bound_box]
            row["worldBounds"] = {"min": [min(p[i] for p in points) for i in range(3)],
                                  "max": [max(p[i] for p in points) for i in range(3)]}
            row["materials"] = [m.name for m in obj.data.materials]
            row["polygons"] = len(obj.data.polygons)
        rows.append(row)
    path.write_text(json.dumps({"kind": "actual authored rest-pose transforms; compare with exported GLB", "nodes": rows}, indent=2) + "\n", encoding="utf-8")


def leaf_mesh(bpy, obj, r2b, center, direction, length, width, thickness=0.006):
    """Closed pointed, folded blade, authored in world coordinates without billboard behavior."""
    forward = Vector(direction).normalized()
    side = forward.cross(Vector((0, 1, 0)))
    if side.length < 0.01:
        side = Vector((1, 0, 0))
    side.normalize()
    normal = side.cross(forward).normalized()
    center_v = Vector(center)
    outline = []
    for t in (0.0, 0.18, 0.40, 0.63, 0.84, 1.0):
        halfwidth = width * 0.5 * math.sin(math.pi * t) ** 0.7
        spine = center_v + forward * ((t - 0.5) * length) + normal * (0.025 * math.sin(math.pi * t))
        outline.append(spine + side * halfwidth)
    for t in (0.84, 0.63, 0.40, 0.18):
        halfwidth = width * 0.5 * math.sin(math.pi * t) ** 0.7
        spine = center_v + forward * ((t - 0.5) * length) + normal * (0.025 * math.sin(math.pi * t))
        outline.append(spine - side * halfwidth)
    n = len(outline)
    world_vertices = [p + normal * (sign * thickness * 0.5) for sign in (-1, 1) for p in outline]
    origin_b = Vector(r2b(*center))
    vertices = [Vector(r2b(*p)) - origin_b for p in world_vertices]
    faces = [tuple(reversed(range(n))), tuple(range(n, 2*n))]
    faces += [(i, (i+1) % n, (i+1) % n+n, i+n) for i in range(n)]
    replace_mesh(bpy, obj, vertices, faces)
    obj.matrix_world = Matrix.Translation(origin_b)
    for polygon in obj.data.polygons:
        polygon.use_smooth = False


def split_monstera_leaf_mesh(bpy, obj, r2b, center, direction, length, width, thickness=0.008):
    """A broad, folded leaf with natural edge lobes instead of a box or plain oval."""
    forward = Vector(direction).normalized()
    side = forward.cross(Vector((0, 1, 0)))
    if side.length < 0.01:
        side = Vector((1, 0, 0))
    side.normalize()
    normal = side.cross(forward).normalized()
    center_v = Vector(center)
    # Alternating shoulders and inward notches produce the split silhouette of
    # a young monstera leaf while keeping it a single compact export mesh.
    profile = (
        (0.00, 0.00), (0.10, 0.24), (0.22, 0.47), (0.34, 0.65),
        (0.40, 0.48), (0.45, 0.31), (0.52, 0.44), (0.63, 0.65),
        (0.69, 0.54), (0.73, 0.34), (0.79, 0.46), (0.89, 0.46),
        (0.96, 0.27), (1.00, 0.00),
    )
    outline = []
    for sign in (1, -1):
        points = profile if sign == 1 else tuple(reversed(profile))
        for t, halfwidth in points:
            spine = center_v + forward * ((t - 0.5) * length)
            spine += normal * (0.035 * math.sin(math.pi * t))
            outline.append(spine + side * (sign * width * halfwidth))
    n = len(outline)
    world_vertices = [p + normal * (sign * thickness * 0.5)
                      for sign in (-1, 1) for p in outline]
    origin_b = Vector(r2b(*center))
    vertices = [Vector(r2b(*p)) - origin_b for p in world_vertices]
    faces = [tuple(reversed(range(n))), tuple(range(n, 2*n))]
    faces += [(i, (i+1) % n, (i+1) % n+n, i+n) for i in range(n)]
    replace_mesh(bpy, obj, vertices, faces)
    obj.matrix_world = Matrix.Translation(origin_b)
    for polygon in obj.data.polygons:
        polygon.use_smooth = False


def refine_environment(bpy, mats, r2b, add_box, add_cylinder, add_sphere, keep_world):
    # Soften the working surface, cabinetry and electronics without changing F1 contact planes.
    for name in ("desk_top", "drawer_unit_left_body", "drawer_unit_right_body",
                 "speaker_left_cabinet", "speaker_right_cabinet", "desk_clock_chassis",
                 "peg_controller_body", "contact_phone_body", "pc_chassis_frame",
                 "shelf_rear_upper", "shelf_rear_upper_right", "shelf_rear_lower",
                 "desk_modesty_panel", "shelf_camera_body", "desk_mug_coaster", "desk_mug_body"):
        obj = bpy.data.objects.get(name)
        width = (0.014 if name == "desk_top" else 0.004 if name == "desk_mug_coaster"
                 else 0.010 if name.startswith("shelf_") else 0.008)
        bevel(bpy, obj, width, 4 if name == "desk_top" else 3)
    for obj in list(bpy.data.objects):
        if obj.name.startswith("drawer_left_") or obj.name.startswith("drawer_right_"):
            if "pull" not in obj.name:
                bevel(bpy, obj, 0.005, 3)

    # Hex lights are actual six-sided diffusers, not rectangular panels labelled as hexagons.
    for idx in range(1, 8):
        housing = bpy.data.objects[f"hex_housing_{idx}"]
        housing_radius, housing_depth = 0.205, 0.018
        hvertices = [(math.cos(i*math.tau/6)*housing_radius, sign*housing_depth/2,
                      math.sin(i*math.tau/6)*housing_radius)
                     for sign in (-1, 1) for i in range(6)]
        hfaces = [tuple(reversed(range(6))), tuple(range(6, 12))]
        hfaces += [(i, (i+1)%6, (i+1)%6+6, i+6) for i in range(6)]
        replace_mesh(bpy, housing, hvertices, hfaces)
        bevel(bpy, housing, 0.004, 2)
        obj = bpy.data.objects[f"hex_panel_{idx}"]
        radius, depth = 0.18, 0.018
        vertices = [(math.cos(i*math.tau/6)*radius, sign*depth/2, math.sin(i*math.tau/6)*radius)
                    for sign in (-1, 1) for i in range(6)]
        faces = [tuple(reversed(range(6))), tuple(range(6, 12))]
        faces += [(i, (i+1)%6, (i+1)%6+6, i+6) for i in range(6)]
        replace_mesh(bpy, obj, vertices, faces)
        bevel(bpy, obj, 0.004, 2)
    # Keep colorful diffusers readable under the runtime tone mapper instead of clipping to white.
    for key, strength in (("Hex_LilacEmissive", 1.0), ("Hex_VioletEmissive", 0.9)):
        mats[key].node_tree.nodes.get("Principled BSDF").inputs["Emission Strength"].default_value = strength
    mats["Desk_IvoryTop"].node_tree.nodes.get("Principled BSDF").inputs["Roughness"].default_value = 0.38

    # One coherent gently curved ultrawide surface: preserve the three required logical screen names.
    for name, left, right in (("monitor_screen_left", -0.46, -0.25),
                             ("monitor_screen_center", -0.25, 0.25),
                             ("monitor_screen_right", 0.25, 0.46)):
        obj = bpy.data.objects[name]
        origin = obj.matrix_world.translation.copy()
        vertices, faces = [], []
        uv = []
        for i in range(7):
            x = left + (right-left) * i/6
            z = -1.336 + 0.065 * (x/0.46) ** 2
            for y in (0.87, 1.23):
                vertices.append(Vector(r2b(x, y, z))-origin)
                uv.append(((x+0.46)/0.92, (y-0.87)/0.36))
        for i in range(6):
            faces.append((2*i, 2*i+2, 2*i+3, 2*i+1))
        replace_mesh(bpy, obj, vertices, faces)
        uv_layer = obj.data.uv_layers.new(name="UVMap")
        for loop in obj.data.loops:
            uv_layer.data[loop.index].uv = uv[loop.vertex_index]
        # The surface remains single-sided toward the viewer; geometry normals face runtime +Z.
        for polygon in obj.data.polygons:
            polygon.use_smooth = True

    # The casing follows the same curve behind the display. Straight wing boxes
    # previously crossed its front and made one ultrawide look like three monitors.
    for name, left, right in (("monitor_bezel_left", -0.48, -0.25),
                             ("monitor_bezel_center", -0.25, 0.25),
                             ("monitor_bezel_right", 0.25, 0.48)):
        obj = bpy.data.objects[name]
        inverse = obj.matrix_world.inverted()
        vertices, faces = [], []
        for i in range(7):
            x = left + (right-left)*i/6
            screen_z = -1.336 + 0.065*(x/0.46)**2
            for y,z in ((0.86,screen_z-0.003),(1.24,screen_z-0.003),
                        (1.24,screen_z-0.028),(0.86,screen_z-0.028)):
                vertices.append(inverse @ Vector(r2b(x,y,z)))
        for i in range(6):
            for side in range(4):
                a=i*4+side; b=i*4+(side+1)%4
                faces.append((a,a+4,b+4,b))
        faces.extend([(0,1,2,3), (27,26,25,24)])
        replace_mesh(bpy,obj,vertices,faces)
        # Preserve ordinary UV layout for compatible material batching; no
        # screen artwork is assigned to this opaque casing material.
        uv_layer=obj.data.uv_layers.new(name="UVMap")
        for loop in obj.data.loops:
            uv_layer.data[loop.index].uv=(0.0,0.0)

    # Reauthor foliage as pointed curved blades with connected stems and real shelf support.
    plants = bpy.data.objects["plants"]
    coll = plants.users_collection[0]
    ivy = bpy.data.objects["pot_ivy"]
    ivy.matrix_world.translation = Vector(r2b(-1.58, 1.725, -1.65))
    mound = bpy.data.objects["ivy_mound"]
    mound.matrix_world.translation = Vector(r2b(-1.58, 1.80, -1.65))
    for i in range(1, 5):
        obj = bpy.data.objects[f"ivy_vine_{i}"]
        x = -1.58 + (i-2.5)*0.055
        center = (x, 1.54-(i%2)*0.09, -1.58+0.035*math.sin(i))
        # Curved trailing stalk; its leaf geometry is no longer a disconnected vertical green box.
        mesh = obj.data
        oldmats = list(mesh.materials)
        bpy.data.objects.remove(obj, do_unlink=True)
        stalk = add_cylinder(f"ivy_vine_{i}", center, 0.005, 0.38+(i%2)*0.16,
                             mat=mats["Plant_Foliage"], parent=plants, vertices=8, collection=coll)
        for j in range(5):
            side_sign = -1 if (i+j) % 2 else 1
            c = (x + side_sign*0.035, center[1]+0.13-j*0.085, center[2]+0.015*math.sin(i+j))
            leaf_mat = mats["Plant_Foliage_Light"] if (i+j) % 3 == 0 else mats["Plant_Foliage"]
            blade = add_box(f"ivy_leaf_{i}_{j+1}", c, (0.12, 0.08, 0.015), mat=leaf_mat, parent=plants, collection=coll)
            leaf_mesh(bpy, blade, r2b, c, (side_sign*0.78, -0.54, 0.20), 0.135, 0.088)
    for i in range(1, 7):
        obj = bpy.data.objects[f"succulent_leaf_{i}"]
        a = (i-1)*math.tau/6
        c = (-0.85+math.cos(a)*0.032, 0.855, -1.05+math.sin(a)*0.032)
        leaf_mesh(bpy, obj, r2b, c, (math.cos(a)*0.55, 0.85, math.sin(a)*0.55), 0.085, 0.036, 0.012)
    leaves = [((-1.75,0.88,0.82),(-0.60,0.78,-0.18),0.54,0.30),
              ((-1.50,0.93,0.78),(0.62,0.72,-0.24),0.52,0.30),
              ((-1.84,0.97,0.94),(-0.50,0.78,0.24),0.56,0.31),
              ((-1.61,1.10,0.88),(0.12,0.96,0.18),0.60,0.32),
              ((-1.83,0.88,0.70),(-0.34,0.72,0.54),0.52,0.30),
              ((-1.48,0.94,1.00),(0.48,0.78,-0.40),0.54,0.30)]
    for i, (c, direction, length, width) in enumerate(leaves, 1):
        obj = bpy.data.objects[f"monstera_leaf_{i}"]
        if i % 2 == 0:
            obj.data.materials.clear()
            obj.data.materials.append(mats["Plant_Foliage_Light"])
        split_monstera_leaf_mesh(bpy, obj, r2b, c, direction, length, width)
        start = Vector((-1.65, 0.53, 0.85))
        end = Vector(c) - Vector(direction).normalized()*length*0.38
        stalk = add_cylinder(f"monstera_stem_{i}", (start+end)*0.5, 0.005, (end-start).length,
                            mat=mats["Plant_Foliage"], parent=plants, vertices=8, collection=coll)
        q = (Vector(r2b(*end))-Vector(r2b(*start))).to_track_quat("Z", "Y")
        stalk.matrix_world = Matrix.Translation(Vector(r2b(*(start+end)*0.5))) @ q.to_matrix().to_4x4()


def profile_mesh(bpy, obj, outline, front_y, back_y, edge_bevel=0.012):
    """Chair outline uses intentional chair-local Blender XYZ, not world environment coordinates."""
    n = len(outline)
    center = obj.location.copy()
    vertices = [(x-center.x, y-center.y, z-center.z) for y in (front_y, back_y) for x,z in outline]
    # Counterclockwise outline in X/Z; exterior winding is repaired below.
    faces = [tuple(range(n)), tuple(reversed(range(n,2*n)))]
    faces += [(i, i+n, (i+1)%n+n, (i+1)%n) for i in range(n)]
    replace_mesh(bpy, obj, vertices, faces)
    bevel(bpy, obj, edge_bevel, 3)


def refine_fixture(bpy, blue, ivory, dark, chair_root, chair_base, chair_parts, base_parts, fixture_objects, make_box, make_cylinder):
    # Preserve chair-seat's exact top contact plane and the seated resident; refine the silhouette around it.
    blue.node_tree.nodes.get("Principled BSDF").inputs["Base Color"].default_value = (0.12,0.29,0.70,1)
    ivory.node_tree.nodes.get("Principled BSDF").inputs["Base Color"].default_value = (0.94,0.94,0.97,1)
    blue.node_tree.nodes.get("Principled BSDF").inputs["Roughness"].default_value = 0.62
    back = bpy.data.objects["chair-back"]
    outline = [(-0.17,0.48),(-0.235,0.63),(-0.235,0.92),(-0.19,1.075),
               (-0.13,1.17),(0.13,1.17),(0.19,1.075),(0.235,0.92),(0.235,0.63),(0.17,0.48)]
    profile_mesh(bpy, back, outline, -0.165, -0.255)
    inset = bpy.data.objects["chair-back-insert"]
    inset_outline = [(-0.105,0.57),(-0.13,0.69),(-0.13,0.97),(-0.09,1.10),
                     (0.09,1.10),(0.13,0.97),(0.13,0.69),(0.105,0.57)]
    profile_mesh(bpy, inset, inset_outline, -0.150, -0.165)
    # Rounded white backing and upholstery bolsters echo the blue/white racing chair reference.
    rear = make_box("chair-white-shell", (0,-0.265,0.83),(0.48,0.04,0.70),blue,chair_parts,bevel=0.012)
    profile_mesh(bpy, rear, [(x*1.03,z) for x,z in outline], -0.25,-0.29)
    rear_accent = make_box("chair-rear-accent", (0,-0.296,0.83),(0.28,0.008,0.50),ivory,chair_parts,bevel=0.002)
    rear_accent_outline = [(-0.115,0.59),(-0.135,0.70),(-0.135,0.97),(-0.095,1.075),
                           (0.095,1.075),(0.135,0.97),(0.135,0.70),(0.115,0.59)]
    profile_mesh(bpy, rear_accent, rear_accent_outline, -0.292, -0.300, edge_bevel=0.002)
    for sign in (-1,1):
        bolster = make_box(f"chair-back-bolster-{sign}", (sign*0.18,-0.215,0.85),(0.060,0.050,0.41),blue,chair_parts,bevel=0.020)
        bolster.rotation_euler[1] = sign*math.radians(5)
    # These pads stay behind the resident's body and retain arm/desk clearance.
    make_box("chair-lumbar-pad", (0,-0.137,0.60),(0.24,0.035,0.12),blue,chair_parts,bevel=0.015)
    make_box("chair-headrest-pad", (0,-0.133,1.075),(0.21,0.025,0.10),blue,chair_parts,bevel=0.012)
    for obj in chair_parts:
        if obj.parent is None:
            obj.parent = chair_root
            fixture_objects.append(obj)
    # Keep the non-swivelling base and eight action tracks exactly as authored by the B4 source.
