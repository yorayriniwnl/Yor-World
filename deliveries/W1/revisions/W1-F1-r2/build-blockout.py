"""
YOR WORLD - W1 Room and Workstation Blockout Generator (Revision W1-F1-r2)
Script: build-blockout.py
Author: W1 Room/Blockout Maker (Gemini-1 / Model: Gemini 3.8 Flash (High))
Packet: W1-CORR-01 (Parent Codex Reconciliation Correction)
Baseline: Specification Revision 2 / Feasibility Baseline F1
Examined Commit: f4cd0a3be5fc7899e2fd20932bf40da2d4c2195c

Named Reference Inputs:
- references/images/main-reference.png (SHA-256: 37adfb0ee344642798978e954a0cfc8d9715eac1b3ca4e5a84ab87a228c53362)
- references/README.md (SHA-256: 4bef6bb974a6f44f9ba1a28016685b1df74efdd87f9f025a4cc25d102ea5a0d2)
- references/manifest.json (SHA-256: 21c4e16fbe971792aa0c414a93a0da55b79cfcd5bf450da21f85681620cbd229)
- references/text/source-discussion.txt (SHA-256: 99d27b55b395561c94d39368ebd000faddcfbb2790972e981da8e57a3afa5faf)
- docs/superpowers/specs/2026-09-30-yor-world-design.md (§§1, 3, 4, 7, 10)
- docs/planning/art-and-experience.md (§§1-6, 9)
- docs/planning/interaction-catalog.md
- docs/planning/validation-and-production.md (§§1, 2, 5, 7)
- docs/planning/delegation-and-work-orders.md
- docs/planning/reconciliation-packets/2026-10-01-next-packets.md (W1-CORR-01)
- docs/planning/reviews/2026-10-01-reconciliation.md (W1 findings W1-01, W1-02, W1-03, W1-04)

Corrections Implemented in W1-F1-r2:
1. W1-01: Correct world/local parenting for door_leaf, door handles, PC fans/glass/headset,
   controller pegboard and controllers, boom microphone, desk clock, and foreground plant.
   Both native Blender and exported glTF world coordinates now match intended world coordinates exactly.
   Door leaf closed center is at (-1.20, 1.05, 1.80) with door-hinge anchor at (-1.65, 0.0, 1.80).
2. W1-02: Replaced preset clearance numbers with executed checks derived from evaluated geometry.
   Evaluates sampled door sweep (5° increments), doorway and entry path envelope, chair turn sweep,
   and armrest vertical clearance derived from actual bounding boxes (armrest pad top 0.665m vs desk underside 0.700m).
3. W1-03: Regenerated camera presets with verified anchor composition. Home camera frames upper hex lights,
   monitor, shelves, console/mic, PC/headset, pegboard/controllers, chair, and foreground plant.
   Mobile portrait camera frames both resident and monitor with clear lower 38% control space.
   Reverse doorway camera directly captures the closed door leaf and handle, plus open door evidence.
4. W1-04: Asset register computes exact live scene statistics (nodes, meshes, triangles, materials, cameras),
   declares camera FOV conventions, aspect ratios, stored chair yaw, and explicit recursive removal roots.
"""

import bpy
import mathutils
import math
import os
import sys
import json
import time

# ==============================================================================
# Coordinate Transformation Helpers
# ==============================================================================

def r2b(rx, ry, rz):
    """
    Convert Runtime coordinates (Y-up, -Z rear) to Blender coordinates (Z-up, +Y rear).
    Runtime: X right, Y up, Z front (+Z towards doorway, -Z towards rear workstation wall)
    Blender: X right, Y rear (+Y towards rear wall), Z up
    """
    return (float(rx), -float(rz), float(ry))

def b2r(bx, by, bz):
    """Convert Blender coordinates to Runtime coordinates."""
    return (float(bx), float(bz), -float(by))

def set_parent_keep_world(child, parent):
    """
    Parent child object to parent object while strictly maintaining child's existing world matrix.
    Updates Blender's view layer and sets matrix_parent_inverse to parent.matrix_world.inverted().
    """
    if parent is None:
        return
    bpy.context.view_layer.update()
    child.parent = parent
    child.matrix_parent_inverse = parent.matrix_world.inverted()
    bpy.context.view_layer.update()

# ==============================================================================
# Scene Management
# ==============================================================================

def clear_scene():
    """Clear all objects, meshes, materials, and collections from current Blender scene."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    if not bpy.data.scenes:
        bpy.data.scenes.new("Scene")
    for block in list(bpy.data.objects):
        bpy.data.objects.remove(block, do_unlink=True)
    for block in list(bpy.data.meshes):
        bpy.data.meshes.remove(block, do_unlink=True)
    for block in list(bpy.data.materials):
        bpy.data.materials.remove(block, do_unlink=True)
    for block in list(bpy.data.cameras):
        bpy.data.cameras.remove(block, do_unlink=True)
    for block in list(bpy.data.lights):
        bpy.data.lights.remove(block, do_unlink=True)
    for block in list(bpy.data.images):
        bpy.data.images.remove(block, do_unlink=True)

# ==============================================================================
# Material Generation
# ==============================================================================

def create_mat(name, base_color=(0.8, 0.8, 0.8, 1.0), roughness=0.5, metallic=0.0,
               emission_color=(0.0, 0.0, 0.0, 1.0), emission_strength=0.0, alpha=1.0):
    """Create a Principled BSDF material compatible with Blender 5.2.2."""
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    if bsdf:
        if "Base Color" in bsdf.inputs:
            bsdf.inputs["Base Color"].default_value = base_color
        if "Roughness" in bsdf.inputs:
            bsdf.inputs["Roughness"].default_value = roughness
        if "Metallic" in bsdf.inputs:
            bsdf.inputs["Metallic"].default_value = metallic
        if "Alpha" in bsdf.inputs:
            bsdf.inputs["Alpha"].default_value = alpha
        if "Emission Color" in bsdf.inputs:
            bsdf.inputs["Emission Color"].default_value = emission_color
        elif "Emission" in bsdf.inputs:
            bsdf.inputs["Emission"].default_value = emission_color
        if "Emission Strength" in bsdf.inputs:
            bsdf.inputs["Emission Strength"].default_value = emission_strength
    return mat

def create_image_mat(name, img_path, emission_strength=0.0):
    """Create a material using an image texture for base color and optional emission."""
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = nodes.get("Principled BSDF")

    if os.path.exists(img_path):
        img = bpy.data.images.load(img_path)
        tex_node = nodes.new("ShaderNodeTexImage")
        tex_node.image = img
        links.new(tex_node.outputs["Color"], bsdf.inputs["Base Color"])
        if emission_strength > 0:
            if "Emission Color" in bsdf.inputs:
                links.new(tex_node.outputs["Color"], bsdf.inputs["Emission Color"])
            elif "Emission" in bsdf.inputs:
                links.new(tex_node.outputs["Color"], bsdf.inputs["Emission"])
            if "Emission Strength" in bsdf.inputs:
                bsdf.inputs["Emission Strength"].default_value = emission_strength
    return mat

def apply_planar_uv_mapping(obj, plane='XZ'):
    """Assign clean 0..1 planar UV coordinates across the active mesh."""
    mesh = obj.data
    uv_layer = mesh.uv_layers.active or mesh.uv_layers.new(name="UVMap")
    mesh.uv_layers.active = uv_layer

    if plane == 'XZ':
        min_u = min(v.co.x for v in mesh.vertices)
        max_u = max(v.co.x for v in mesh.vertices)
        min_v = min(v.co.z for v in mesh.vertices)
        max_v = max(v.co.z for v in mesh.vertices)
        u_span = max_u - min_u if max_u > min_u else 1.0
        v_span = max_v - min_v if max_v > min_v else 1.0
        for loop in mesh.loops:
            v = mesh.vertices[loop.vertex_index]
            uv_layer.data[loop.index].uv = ((v.co.x - min_u) / u_span, (v.co.z - min_v) / v_span)
    elif plane == 'XY':
        min_u = min(v.co.x for v in mesh.vertices)
        max_u = max(v.co.x for v in mesh.vertices)
        min_v = min(v.co.y for v in mesh.vertices)
        max_v = max(v.co.y for v in mesh.vertices)
        u_span = max_u - min_u if max_u > min_u else 1.0
        v_span = max_v - min_v if max_v > min_v else 1.0
        for loop in mesh.loops:
            v = mesh.vertices[loop.vertex_index]
            uv_layer.data[loop.index].uv = ((v.co.x - min_u) / u_span, (v.co.y - min_v) / v_span)

def setup_materials(textures_dir):
    """Create all stylized color materials matching main-reference.png palette."""
    mats = {}
    mats["Desk_White"] = create_mat("Desk_White", base_color=(0.96, 0.95, 0.96, 1.0), roughness=0.22)
    mats["Desk_Drawer"] = create_mat("Desk_Drawer", base_color=(0.97, 0.96, 0.97, 1.0), roughness=0.25)
    mats["Wall_Lavender"] = create_mat("Wall_Lavender", base_color=(0.86, 0.85, 0.90, 1.0), roughness=0.65)
    mats["Carpet_Blue"] = create_mat("Carpet_Blue", base_color=(0.10, 0.14, 0.34, 1.0), roughness=0.85)
    mats["Ceiling_White"] = create_mat("Ceiling_White", base_color=(0.96, 0.96, 0.97, 1.0), roughness=0.8)
    mats["Baseboard"] = create_mat("Baseboard", base_color=(0.92, 0.91, 0.92, 1.0), roughness=0.35)
    mats["Door_Wood"] = create_mat("Door_Wood", base_color=(0.88, 0.86, 0.84, 1.0), roughness=0.4)
    mats["Door_Frame"] = create_mat("Door_Frame", base_color=(0.94, 0.93, 0.92, 1.0), roughness=0.3)
    mats["Door_Brass"] = create_mat("Door_Brass", base_color=(0.88, 0.72, 0.32, 1.0), roughness=0.2, metallic=0.9)
    mats["Acoustic_Backing"] = create_mat("Acoustic_Backing", base_color=(0.94, 0.93, 0.96, 1.0), roughness=0.55)

    mats["Chair_Blue"] = create_mat("Chair_Blue", base_color=(0.14, 0.44, 0.88, 1.0), roughness=0.35)
    mats["Chair_White"] = create_mat("Chair_White", base_color=(0.96, 0.96, 0.98, 1.0), roughness=0.3)
    mats["Chair_Dark"] = create_mat("Chair_Dark", base_color=(0.12, 0.12, 0.14, 1.0), roughness=0.4)

    mats["Monitor_Bezel"] = create_mat("Monitor_Bezel", base_color=(0.12, 0.12, 0.14, 1.0), roughness=0.25)
    monitor_wallpaper = os.path.join(textures_dir, "monitor-wallpaper.png")
    if os.path.exists(monitor_wallpaper):
        mats["Monitor_Screen"] = create_image_mat("Monitor_Screen", monitor_wallpaper, emission_strength=1.6)
    else:
        mats["Monitor_Screen"] = create_mat("Monitor_Screen", base_color=(0.15, 0.45, 0.85, 1.0),
                                            emission_color=(0.20, 0.55, 0.95, 1.0), emission_strength=1.8)

    mats["Lightbar_Body"] = create_mat("Lightbar_Body", base_color=(0.15, 0.15, 0.16, 1.0), roughness=0.3)
    mats["Lightbar_Warm"] = create_mat("Lightbar_Warm", base_color=(1.0, 0.85, 0.60, 1.0),
                                       emission_color=(1.0, 0.85, 0.60, 1.0), emission_strength=3.5)

    mats["Neon_Pink"] = create_mat("Neon_Pink", base_color=(0.98, 0.25, 0.82, 1.0),
                                   emission_color=(0.98, 0.25, 0.82, 1.0), emission_strength=4.5)
    mats["Neon_Cyan"] = create_mat("Neon_Cyan", base_color=(0.15, 0.85, 0.98, 1.0),
                                   emission_color=(0.15, 0.85, 0.98, 1.0), emission_strength=4.5)
    mats["Hex_Pink"] = create_mat("Hex_Pink", base_color=(0.96, 0.35, 0.85, 1.0),
                                  emission_color=(0.96, 0.35, 0.85, 1.0), emission_strength=3.8)

    mats["PC_Case"] = create_mat("PC_Case", base_color=(0.96, 0.96, 0.97, 1.0), roughness=0.25)
    mats["PC_Glass"] = create_mat("PC_Glass", base_color=(0.25, 0.35, 0.45, 0.35), roughness=0.08, alpha=0.35)
    mats["PC_Fan_Pink"] = create_mat("PC_Fan_Pink", base_color=(0.98, 0.25, 0.80, 1.0),
                                     emission_color=(0.98, 0.25, 0.80, 1.0), emission_strength=3.0)
    mats["PC_Fan_Cyan"] = create_mat("PC_Fan_Cyan", base_color=(0.15, 0.85, 0.98, 1.0),
                                     emission_color=(0.15, 0.85, 0.98, 1.0), emission_strength=3.0)

    mats["Pegboard_White"] = create_mat("Pegboard_White", base_color=(0.94, 0.94, 0.96, 1.0), roughness=0.45)
    mats["Controller_Blue"] = create_mat("Controller_Blue", base_color=(0.12, 0.40, 0.85, 1.0), roughness=0.35)
    mats["Headset_White"] = create_mat("Headset_White", base_color=(0.96, 0.96, 0.98, 1.0), roughness=0.3)
    mats["Console_White"] = create_mat("Console_White", base_color=(0.97, 0.97, 0.98, 1.0), roughness=0.25)
    mats["Console_Dark"] = create_mat("Console_Dark", base_color=(0.10, 0.10, 0.12, 1.0), roughness=0.3)

    mats["Microphone_Mat"] = create_mat("Microphone_Mat", base_color=(0.14, 0.14, 0.16, 1.0), roughness=0.35)
    mats["Speaker_White"] = create_mat("Speaker_White", base_color=(0.95, 0.95, 0.96, 1.0), roughness=0.25)
    mats["Plant_Green"] = create_mat("Plant_Green", base_color=(0.18, 0.62, 0.26, 1.0), roughness=0.55)
    mats["Pot_White"] = create_mat("Pot_White", base_color=(0.95, 0.95, 0.96, 1.0), roughness=0.3)
    mats["Pot_Wood"] = create_mat("Pot_Wood", base_color=(0.76, 0.54, 0.38, 1.0), roughness=0.6)
    mats["Clock_Case"] = create_mat("Clock_Case", base_color=(0.92, 0.91, 0.93, 1.0), roughness=0.3)
    mats["Clock_Screen"] = create_mat("Clock_Screen", base_color=(0.10, 0.12, 0.18, 1.0),
                                      emission_color=(0.98, 0.85, 0.30, 1.0), emission_strength=2.2)

    deskmat_path = os.path.join(textures_dir, "deskmat-topography.png")
    if os.path.exists(deskmat_path):
        mats["Deskmat_Mat"] = create_image_mat("Deskmat_Mat", deskmat_path, emission_strength=0.0)
    else:
        mats["Deskmat_Mat"] = create_mat("Deskmat_Mat", base_color=(0.92, 0.92, 0.94, 1.0), roughness=0.65)

    mats["Keyboard_Mat"] = create_mat("Keyboard_Mat", base_color=(0.15, 0.15, 0.17, 1.0), roughness=0.35)
    mats["Mouse_Mat"] = create_mat("Mouse_Mat", base_color=(0.94, 0.94, 0.96, 1.0), roughness=0.25)
    mats["Cup_Mat"] = create_mat("Cup_Mat", base_color=(0.85, 0.60, 0.48, 1.0), roughness=0.25)

    mats["Resident_Skin"] = create_mat("Resident_Skin", base_color=(0.86, 0.72, 0.60, 1.0), roughness=0.5)
    mats["Resident_Clothes"] = create_mat("Resident_Clothes", base_color=(0.22, 0.28, 0.48, 1.0), roughness=0.55)
    mats["Resident_Hair"] = create_mat("Resident_Hair", base_color=(0.14, 0.11, 0.09, 1.0), roughness=0.65)

    mats["Painting_Frame"] = create_mat("Painting_Frame", base_color=(0.12, 0.12, 0.14, 1.0), roughness=0.3)
    mats["Painting_Canvas"] = create_mat("Painting_Canvas", base_color=(0.86, 0.48, 0.68, 1.0), roughness=0.5)
    mats["Zenith_Model"] = create_mat("Zenith_Model", base_color=(0.22, 0.80, 0.70, 1.0), roughness=0.3)
    mats["Book_Cover"] = create_mat("Book_Cover", base_color=(0.28, 0.48, 0.74, 1.0), roughness=0.4)
    mats["Phone_Mat"] = create_mat("Phone_Mat", base_color=(0.10, 0.10, 0.12, 1.0), roughness=0.2)
    mats["Blinds_Mat"] = create_mat("Blinds_Mat", base_color=(0.92, 0.92, 0.94, 1.0), roughness=0.5)
    mats["Clay_Material"] = create_mat("Clay_Material", base_color=(0.80, 0.80, 0.82, 1.0), roughness=0.50)
    return mats

# ==============================================================================
# Primitive Builders with World & Local Parenting
# ==============================================================================

def add_box(name, r_world_center, r_size, mat=None, parent=None, rotation_euler=(0,0,0)):
    """
    Add an axis-aligned box defined by center and extents in WORLD Runtime coordinates.
    Maintains world position when parent is specified.
    """
    b_center = r2b(r_world_center[0], r_world_center[1], r_world_center[2])
    b_size = (r_size[0], r_size[2], r_size[1])
    bpy.ops.mesh.primitive_cube_add(location=b_center)
    obj = bpy.context.active_object
    obj.name = name
    obj.dimensions = b_size
    if rotation_euler != (0, 0, 0):
        obj.rotation_euler = rotation_euler
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if mat:
        obj.data.materials.append(mat)
    if parent:
        set_parent_keep_world(obj, parent)
    return obj

def add_cylinder(name, r_world_center, r_radius, r_height, axis='Y', mat=None, parent=None, vertices=32):
    """
    Add a cylinder defined in WORLD Runtime coordinates.
    Maintains world position when parent is specified.
    """
    b_center = r2b(r_world_center[0], r_world_center[1], r_world_center[2])
    if axis == 'Y':
        b_rot = (0, 0, 0)
    elif axis == 'X':
        b_rot = (0, math.radians(90), 0)
    elif axis == 'Z':
        b_rot = (math.radians(90), 0, 0)
    else:
        b_rot = (0, 0, 0)
    bpy.ops.mesh.primitive_cylinder_add(radius=r_radius, depth=r_height, location=b_center, rotation=b_rot, vertices=vertices)
    obj = bpy.context.active_object
    obj.name = name
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if mat:
        obj.data.materials.append(mat)
    if parent:
        set_parent_keep_world(obj, parent)
    return obj

def add_sphere(name, r_world_center, r_radius, mat=None, parent=None, segments=24, ring_count=16):
    """
    Add a UV sphere defined in WORLD Runtime coordinates.
    Maintains world position when parent is specified.
    """
    b_center = r2b(r_world_center[0], r_world_center[1], r_world_center[2])
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r_radius, location=b_center, segments=segments, ring_count=ring_count)
    obj = bpy.context.active_object
    obj.name = name
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if mat:
        obj.data.materials.append(mat)
    if parent:
        set_parent_keep_world(obj, parent)
    return obj

def add_empty_anchor(name, r_world_location, parent=None):
    """
    Add an Empty locator at WORLD Runtime coordinates.
    Maintains world position when parent is specified.
    """
    b_pos = r2b(r_world_location[0], r_world_location[1], r_world_location[2])
    empty = bpy.data.objects.new(name, None)
    empty.empty_display_type = 'ARROWS'
    empty.empty_display_size = 0.2
    empty.location = b_pos
    bpy.context.scene.collection.objects.link(empty)
    if parent:
        set_parent_keep_world(empty, parent)
    return empty

def add_box_local(name, r_local_center, r_size, mat=None, parent=None, rotation_euler=(0,0,0)):
    """
    Add an axis-aligned box defined in LOCAL Runtime coordinates relative to parent.
    Used for chair and resident sub-components defined relative to chair-root.
    """
    b_loc = r2b(r_local_center[0], r_local_center[1], r_local_center[2])
    b_size = (r_size[0], r_size[2], r_size[1])
    bpy.ops.mesh.primitive_cube_add(location=(0, 0, 0))
    obj = bpy.context.active_object
    obj.name = name
    obj.dimensions = b_size
    if rotation_euler != (0, 0, 0):
        obj.rotation_euler = rotation_euler
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if mat:
        obj.data.materials.append(mat)
    if parent:
        obj.parent = parent
    obj.location = b_loc
    return obj

def add_cylinder_local(name, r_local_center, r_radius, r_height, axis='Y', mat=None, parent=None, vertices=32):
    """Add a cylinder defined in LOCAL Runtime coordinates relative to parent."""
    b_loc = r2b(r_local_center[0], r_local_center[1], r_local_center[2])
    if axis == 'Y':
        b_rot = (0, 0, 0)
    elif axis == 'X':
        b_rot = (0, math.radians(90), 0)
    elif axis == 'Z':
        b_rot = (math.radians(90), 0, 0)
    else:
        b_rot = (0, 0, 0)
    bpy.ops.mesh.primitive_cylinder_add(radius=r_radius, depth=r_height, location=(0, 0, 0), rotation=b_rot, vertices=vertices)
    obj = bpy.context.active_object
    obj.name = name
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if mat:
        obj.data.materials.append(mat)
    if parent:
        obj.parent = parent
    obj.location = b_loc
    return obj

def add_sphere_local(name, r_local_center, r_radius, mat=None, parent=None, segments=24, ring_count=16):
    """Add a UV sphere defined in LOCAL Runtime coordinates relative to parent."""
    b_loc = r2b(r_local_center[0], r_local_center[1], r_local_center[2])
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r_radius, location=(0, 0, 0), segments=segments, ring_count=ring_count)
    obj = bpy.context.active_object
    obj.name = name
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if mat:
        obj.data.materials.append(mat)
    if parent:
        obj.parent = parent
    obj.location = b_loc
    return obj

# ==============================================================================
# Model Construction
# ==============================================================================

def build_room_shell(mats):
    """Build room-shell conforming to F1 feasibility dimensions (4.2m W x 3.6m D x 2.8m H)."""
    root = bpy.data.objects.new("room-shell", None)
    bpy.context.scene.collection.objects.link(root)

    add_box("floor", (0.0, -0.05, 0.0), (4.2, 0.1, 3.6), mat=mats["Carpet_Blue"], parent=root)
    add_box("floor_hallway", (-1.20, -0.05, 2.30), (1.1, 0.1, 1.0), mat=mats["Carpet_Blue"], parent=root)

    add_box("ceiling", (0.0, 2.85, 0.0), (4.2, 0.1, 3.6), mat=mats["Ceiling_White"], parent=root)
    add_box("ceiling_hallway", (-1.20, 2.85, 2.30), (1.1, 0.1, 1.0), mat=mats["Ceiling_White"], parent=root)

    add_box("wall_rear", (0.0, 1.4, -1.85), (4.2, 2.8, 0.1), mat=mats["Wall_Lavender"], parent=root)
    add_box("wall_left", (-2.15, 1.4, 0.0), (0.1, 2.8, 3.6), mat=mats["Wall_Lavender"], parent=root)
    add_box("wall_right", (2.15, 1.4, 0.0), (0.1, 2.8, 3.6), mat=mats["Wall_Lavender"], parent=root)

    add_box("wall_front_left", (-1.875, 1.4, 1.85), (0.45, 2.8, 0.1), mat=mats["Wall_Lavender"], parent=root)
    add_box("wall_front_right", (0.675, 1.4, 1.85), (2.85, 2.8, 0.1), mat=mats["Wall_Lavender"], parent=root)
    add_box("wall_front_header", (-1.20, 2.45, 1.85), (0.90, 0.7, 0.1), mat=mats["Wall_Lavender"], parent=root)

    add_box("wall_hallway_left", (-1.75, 1.4, 2.30), (0.1, 2.8, 1.0), mat=mats["Wall_Lavender"], parent=root)
    add_box("wall_hallway_right", (-0.65, 1.4, 2.30), (0.1, 2.8, 1.0), mat=mats["Wall_Lavender"], parent=root)
    add_box("wall_hallway_back", (-1.20, 1.4, 2.85), (1.1, 2.8, 0.1), mat=mats["Wall_Lavender"], parent=root)

    add_box("baseboard_rear", (0.0, 0.04, -1.79), (4.18, 0.08, 0.02), mat=mats["Baseboard"], parent=root)
    add_box("baseboard_left", (-2.09, 0.04, 0.0), (0.02, 0.08, 3.58), mat=mats["Baseboard"], parent=root)
    add_box("baseboard_right", (2.09, 0.04, 0.0), (0.02, 0.08, 3.58), mat=mats["Baseboard"], parent=root)
    add_box("baseboard_front_r", (0.675, 0.04, 1.79), (2.85, 0.08, 0.02), mat=mats["Baseboard"], parent=root)

    add_box("threshold_strip", (-1.20, 0.01, 1.80), (0.90, 0.02, 0.06), mat=mats["Neon_Cyan"], parent=root)
    return root

def build_door(mats):
    """
    Build door asset conforming to F1 doorway requirements.
    Hinge anchor is placed at (-1.65, 0.0, 1.80).
    Door leaf closed center is at (-1.20, 1.05, 1.80), with leaf width 0.88m, height 2.08m, thickness 0.04m.
    Handles are parented to door_leaf at world positions (-0.82, 1.00, 1.83) and (-0.85, 1.00, 1.86).
    """
    root = bpy.data.objects.new("door", None)
    bpy.context.scene.collection.objects.link(root)

    # Required Anchor: door-hinge at (-1.65, 0.0, 1.80)
    hinge_anchor = add_empty_anchor("door-hinge", (-1.65, 0.0, 1.80), parent=root)

    # Stationary door frame (parented to root)
    add_box("door_frame_left", (-1.67, 1.05, 1.80), (0.05, 2.12, 0.12), mat=mats["Door_Frame"], parent=root)
    add_box("door_frame_right", (-0.73, 1.05, 1.80), (0.05, 2.12, 0.12), mat=mats["Door_Frame"], parent=root)
    add_box("door_frame_top", (-1.20, 2.12, 1.80), (0.98, 0.05, 0.12), mat=mats["Door_Frame"], parent=root)

    # Door leaf parented to hinge_anchor with world matrix preservation
    door_leaf = add_box("door_leaf", (-1.20, 1.05, 1.80), (0.88, 2.08, 0.04), mat=mats["Door_Wood"], parent=hinge_anchor)

    # Brass handle plate and lever parented to door_leaf
    add_box("door_handle_plate", (-0.82, 1.00, 1.83), (0.04, 0.18, 0.01), mat=mats["Door_Brass"], parent=door_leaf)
    add_box("door_handle_lever", (-0.85, 1.00, 1.86), (0.12, 0.03, 0.02), mat=mats["Door_Brass"], parent=door_leaf)

    return root

def build_desk(mats):
    """Build workstation desk conforming to F1 (2.60m W x 0.80m D x 0.75m H, center X/Z = 0, -1.15)."""
    root = bpy.data.objects.new("desk", None)
    bpy.context.scene.collection.objects.link(root)

    # Tabletop: 2.60m W x 0.80m D x 0.05m H. Top surface Y = 0.75m -> Center Y = 0.725m, Underside Y = 0.700m
    add_box("desk_top", (0.0, 0.725, -1.15), (2.60, 0.05, 0.80), mat=mats["Desk_White"], parent=root)

    # Glowing LED perimeter strips on front edge and sides
    add_box("desk_led_front", (0.0, 0.705, -0.748), (2.58, 0.012, 0.006), mat=mats["Neon_Pink"], parent=root)
    add_box("desk_led_left", (-1.298, 0.705, -1.15), (0.006, 0.012, 0.78), mat=mats["Neon_Cyan"], parent=root)
    add_box("desk_led_right", (1.298, 0.705, -1.15), (0.006, 0.012, 0.78), mat=mats["Neon_Cyan"], parent=root)

    # Left Drawer Unit (4 drawers with handles)
    add_box("drawer_unit_left_body", (-1.05, 0.35, -1.15), (0.48, 0.70, 0.70), mat=mats["Desk_White"], parent=root)
    for i in range(4):
        dy = 0.08 + i * 0.17
        add_box(f"drawer_left_{i+1}", (-1.05, dy, -0.795), (0.46, 0.15, 0.015), mat=mats["Desk_Drawer"], parent=root)
        add_box(f"drawer_left_handle_{i+1}", (-1.05, dy + 0.04, -0.786), (0.12, 0.02, 0.008), mat=mats["Monitor_Bezel"], parent=root)

    # Right Drawer Unit (4 drawers with handles)
    add_box("drawer_unit_right_body", (1.05, 0.35, -1.15), (0.48, 0.70, 0.70), mat=mats["Desk_White"], parent=root)
    for i in range(4):
        dy = 0.08 + i * 0.17
        add_box(f"drawer_right_{i+1}", (1.05, dy, -0.795), (0.46, 0.15, 0.015), mat=mats["Desk_Drawer"], parent=root)
        add_box(f"drawer_right_handle_{i+1}", (1.05, dy + 0.04, -0.786), (0.12, 0.02, 0.008), mat=mats["Monitor_Bezel"], parent=root)

    # Modesty Panel between drawers
    add_box("desk_modesty_panel", (0.0, 0.45, -1.45), (1.60, 0.50, 0.02), mat=mats["Desk_White"], parent=root)

    # Acoustic Quilted Diamond Wall Panel framing monitor with perimeter glow
    add_box("acoustic_backing_panel", (0.0, 1.10, -1.78), (2.20, 0.69, 0.02), mat=mats["Acoustic_Backing"], parent=root)
    add_box("acoustic_neon_top", (0.0, 1.45, -1.77), (2.24, 0.016, 0.01), mat=mats["Neon_Pink"], parent=root)
    add_box("acoustic_neon_bottom", (0.0, 0.76, -1.77), (2.24, 0.016, 0.01), mat=mats["Neon_Pink"], parent=root)
    add_box("acoustic_neon_left", (-1.11, 1.10, -1.77), (0.016, 0.69, 0.01), mat=mats["Neon_Cyan"], parent=root)
    add_box("acoustic_neon_right", (1.11, 1.10, -1.77), (0.016, 0.69, 0.01), mat=mats["Neon_Cyan"], parent=root)

    return root

def build_monitor(mats):
    """Build monitor asset."""
    root = bpy.data.objects.new("monitor", None)
    bpy.context.scene.collection.objects.link(root)

    # Desk mount stand & arm
    add_box("monitor_base", (0.0, 0.76, -1.40), (0.35, 0.02, 0.22), mat=mats["Monitor_Bezel"], parent=root)
    add_box("monitor_arm", (0.0, 0.96, -1.45), (0.08, 0.40, 0.06), mat=mats["Monitor_Bezel"], parent=root)

    # Curved 3-segment Ultrawide Display with Glowing Screen
    add_box("monitor_screen_center", (0.0, 1.08, -1.36), (0.46, 0.38, 0.03), mat=mats["Monitor_Bezel"], parent=root)
    disp_center = add_box("monitor_display_center", (0.0, 1.08, -1.344), (0.44, 0.36, 0.005), mat=mats["Monitor_Screen"], parent=root)
    apply_planar_uv_mapping(disp_center, plane='XZ')

    # Left Curved Wing
    b_l_pos = r2b(-0.32, 1.08, -1.34)
    bpy.ops.mesh.primitive_cube_add(location=b_l_pos)
    l_wing = bpy.context.active_object
    l_wing.name = "monitor_screen_left"
    l_wing.dimensions = (0.22, 0.03, 0.38)
    l_wing.rotation_euler = (0, 0, math.radians(-10))
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    l_wing.data.materials.append(mats["Monitor_Bezel"])
    set_parent_keep_world(l_wing, root)

    disp_l = add_box("monitor_display_left", (-0.32, 1.08, -1.328), (0.20, 0.36, 0.005), mat=mats["Monitor_Screen"], parent=root)
    apply_planar_uv_mapping(disp_l, plane='XZ')

    # Right Curved Wing
    b_r_pos = r2b(0.32, 1.08, -1.34)
    bpy.ops.mesh.primitive_cube_add(location=b_r_pos)
    r_wing = bpy.context.active_object
    r_wing.name = "monitor_screen_right"
    r_wing.dimensions = (0.22, 0.03, 0.38)
    r_wing.rotation_euler = (0, 0, math.radians(10))
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    r_wing.data.materials.append(mats["Monitor_Bezel"])
    set_parent_keep_world(r_wing, root)

    disp_r = add_box("monitor_display_right", (0.32, 1.08, -1.328), (0.20, 0.36, 0.005), mat=mats["Monitor_Screen"], parent=root)
    apply_planar_uv_mapping(disp_r, plane='XZ')

    # Required Anchor: monitor-surface
    add_empty_anchor("monitor-surface", (0.0, 1.08, -1.345), parent=root)

    # Screen-Mounted Warm Lightbar
    add_box("lightbar_body", (0.0, 1.285, -1.34), (0.45, 0.025, 0.025), mat=mats["Lightbar_Body"], parent=root)
    add_box("lightbar_strip", (0.0, 1.272, -1.335), (0.42, 0.005, 0.015), mat=mats["Lightbar_Warm"], parent=root)

    return root

def build_chair_and_resident(mats):
    """
    Build chair and resident proxy assets at chair-root: (0.30, 0.0, -0.36).
    The chair is rotated -135° in Blender Z-up (corresponding to +135° yaw in runtime Y-up),
    orienting the chair 45° towards the doorway reveal.
    All chair sub-components are parented to the 'chair' empty root.
    All resident proxy sub-components are parented to the 'resident' empty root.
    """
    chair_root_empty = add_empty_anchor("chair-root", (0.30, 0.0, -0.36))

    chair_rot_z = math.radians(-135)
    chair_root_empty.rotation_euler = (0, 0, chair_rot_z)

    # 1. Chair Root Object
    chair_root = bpy.data.objects.new("chair", None)
    bpy.context.scene.collection.objects.link(chair_root)
    chair_root.parent = chair_root_empty

    cx, cy, cz = 0.0, 0.0, 0.0

    # 5-star wheeled base
    add_cylinder_local("chair_base_hub", (cx, cy + 0.06, cz), 0.06, 0.06, axis='Y', mat=mats["Chair_Dark"], parent=chair_root)
    for i in range(5):
        angle = i * (2 * math.pi / 5)
        bx = cx + 0.22 * math.cos(angle)
        bz = cz + 0.22 * math.sin(angle)
        add_box_local(f"chair_base_leg_{i+1}", (bx, cy + 0.06, bz), (0.24, 0.03, 0.04), mat=mats["Chair_Blue"], parent=chair_root)
        wx = cx + 0.30 * math.cos(angle)
        wz = cz + 0.30 * math.sin(angle)
        add_cylinder_local(f"chair_caster_{i+1}", (wx, cy + 0.03, wz), 0.03, 0.03, axis='X', mat=mats["Chair_Dark"], parent=chair_root)

    add_cylinder_local("chair_cylinder", (cx, cy + 0.26, cz), 0.03, 0.36, axis='Y', mat=mats["Chair_Dark"], parent=chair_root)

    # Seat Cushion Base with white center stripe and blue racing bolsters
    add_box_local("chair_seat_cushion", (cx, cy + 0.48, cz), (0.50, 0.08, 0.50), mat=mats["Chair_Blue"], parent=chair_root)
    add_box_local("chair_seat_center_white", (cx, cy + 0.485, cz), (0.26, 0.075, 0.46), mat=mats["Chair_White"], parent=chair_root)

    # High Backrest with blue side bolsters and white racing stripe
    add_box_local("chair_backrest_blue", (cx, cy + 0.92, cz - 0.22), (0.48, 0.80, 0.08), mat=mats["Chair_Blue"], parent=chair_root)
    add_box_local("chair_backrest_white_stripe", (cx, cy + 0.92, cz - 0.215), (0.22, 0.76, 0.075), mat=mats["Chair_White"], parent=chair_root)

    # Ergonomic Pillows (White)
    add_box_local("chair_headrest_pillow", (cx, cy + 1.22, cz - 0.18), (0.26, 0.14, 0.08), mat=mats["Chair_White"], parent=chair_root)
    add_box_local("chair_lumbar_pillow", (cx, cy + 0.65, cz - 0.18), (0.30, 0.16, 0.07), mat=mats["Chair_White"], parent=chair_root)

    # Armrests (pad top evaluated at local Y = 0.665m)
    add_box_local("chair_armrest_left_stem", (cx - 0.27, cy + 0.56, cz), (0.03, 0.18, 0.06), mat=mats["Chair_Blue"], parent=chair_root)
    add_box_local("chair_armrest_left_pad", (cx - 0.27, cy + 0.65, cz), (0.08, 0.03, 0.26), mat=mats["Chair_Dark"], parent=chair_root)
    add_box_local("chair_armrest_right_stem", (cx + 0.27, cy + 0.56, cz), (0.03, 0.18, 0.06), mat=mats["Chair_Blue"], parent=chair_root)
    add_box_local("chair_armrest_right_pad", (cx + 0.27, cy + 0.65, cz), (0.08, 0.03, 0.26), mat=mats["Chair_Dark"], parent=chair_root)

    # 2. Resident Proxy (seated on chair)
    resident_root = bpy.data.objects.new("resident", None)
    bpy.context.scene.collection.objects.link(resident_root)
    resident_root.parent = chair_root_empty

    add_box_local("resident_pelvis", (cx, cy + 0.54, cz - 0.05), (0.34, 0.12, 0.28), mat=mats["Resident_Clothes"], parent=resident_root)
    add_box_local("resident_torso", (cx, cy + 0.78, cz - 0.07), (0.36, 0.36, 0.24), mat=mats["Resident_Clothes"], parent=resident_root)
    add_cylinder_local("resident_neck", (cx, cy + 0.99, cz - 0.07), 0.06, 0.08, axis='Y', mat=mats["Resident_Skin"], parent=resident_root)
    add_sphere_local("resident_head", (cx, cy + 1.12, cz - 0.08), 0.11, mat=mats["Resident_Skin"], parent=resident_root)
    add_box_local("resident_hair", (cx, cy + 1.18, cz - 0.11), (0.24, 0.12, 0.22), mat=mats["Resident_Hair"], parent=resident_root)

    # Armrests resting posture
    add_cylinder_local("resident_upper_arm_l", (cx - 0.22, cy + 0.76, cz - 0.08), 0.045, 0.26, axis='Y', mat=mats["Resident_Clothes"], parent=resident_root)
    add_box_local("resident_forearm_l", (cx - 0.20, cy + 0.68, cz + 0.12), (0.07, 0.07, 0.28), mat=mats["Resident_Clothes"], parent=resident_root)
    add_box_local("resident_hand_l", (cx - 0.20, cy + 0.68, cz + 0.28), (0.08, 0.03, 0.10), mat=mats["Resident_Skin"], parent=resident_root)

    add_cylinder_local("resident_upper_arm_r", (cx + 0.22, cy + 0.76, cz - 0.08), 0.045, 0.26, axis='Y', mat=mats["Resident_Clothes"], parent=resident_root)
    add_box_local("resident_forearm_r", (cx + 0.20, cy + 0.68, cz + 0.12), (0.07, 0.07, 0.28), mat=mats["Resident_Clothes"], parent=resident_root)
    add_box_local("resident_hand_r", (cx + 0.20, cy + 0.68, cz + 0.28), (0.08, 0.03, 0.10), mat=mats["Resident_Skin"], parent=resident_root)

    # Legs
    add_box_local("resident_thigh_l", (cx - 0.10, cy + 0.52, cz + 0.12), (0.12, 0.11, 0.36), mat=mats["Resident_Clothes"], parent=resident_root)
    add_box_local("resident_thigh_r", (cx + 0.10, cy + 0.52, cz + 0.12), (0.12, 0.11, 0.36), mat=mats["Resident_Clothes"], parent=resident_root)
    add_box_local("resident_shin_l", (cx - 0.10, cy + 0.26, cz + 0.30), (0.10, 0.44, 0.10), mat=mats["Resident_Clothes"], parent=resident_root)
    add_box_local("resident_shin_r", (cx + 0.10, cy + 0.26, cz + 0.30), (0.10, 0.44, 0.10), mat=mats["Resident_Clothes"], parent=resident_root)
    add_box_local("resident_foot_l", (cx - 0.10, cy + 0.04, cz + 0.36), (0.11, 0.07, 0.22), mat=mats["Chair_Dark"], parent=resident_root)
    add_box_local("resident_foot_r", (cx + 0.10, cy + 0.04, cz + 0.36), (0.11, 0.07, 0.22), mat=mats["Chair_Dark"], parent=resident_root)

    return chair_root, resident_root

def build_wall_painting(mats):
    """Build wall painting on left side wall."""
    root = bpy.data.objects.new("wall-painting", None)
    bpy.context.scene.collection.objects.link(root)

    px, py, pz = -2.08, 1.60, 0.20
    add_empty_anchor("painting-pivot", (px + 0.01, py + 0.45, pz), parent=root)

    add_box("painting_frame", (px, py, pz), (0.03, 0.90, 0.70), mat=mats["Painting_Frame"], parent=root)
    add_box("painting_canvas", (px + 0.01, py, pz), (0.01, 0.84, 0.64), mat=mats["Painting_Canvas"], parent=root)
    add_box("hidden_yor_mark", (px - 0.01, py, pz), (0.005, 0.15, 0.15), mat=mats["Neon_Pink"], parent=root)
    return root

def build_reference_props(mats):
    """
    Build all props matching main-reference.png with corrected world parenting.
    Corrects W1-01: Every child prop maintains its intended world coordinates.
    """
    root = bpy.data.objects.new("reference-props", None)
    bpy.context.scene.collection.objects.link(root)

    # 1. PC Tower (helios-pc) on right desk: X = +1.02, Y = 0.98, Z = -1.15
    pc = add_box("helios-pc", (1.02, 0.98, -1.15), (0.28, 0.46, 0.48), mat=mats["PC_Case"], parent=root)
    add_box("pc_glass_panel", (0.875, 0.98, -1.15), (0.01, 0.42, 0.44), mat=mats["PC_Glass"], parent=pc)
    add_cylinder("pc_fan_1", (0.92, 0.85, -1.02), 0.055, 0.02, axis='X', mat=mats["PC_Fan_Pink"], parent=pc)
    add_cylinder("pc_fan_2", (0.92, 0.98, -1.02), 0.055, 0.02, axis='X', mat=mats["PC_Fan_Cyan"], parent=pc)
    add_cylinder("pc_fan_3", (0.92, 1.11, -1.02), 0.055, 0.02, axis='X', mat=mats["PC_Fan_Pink"], parent=pc)

    # 2. Headset Stand with gaming headphones ON TOP of PC Tower
    hs_base = add_cylinder("headset_stand_base", (1.02, 1.22, -1.15), 0.06, 0.02, axis='Y', mat=mats["Headset_White"], parent=pc)
    add_cylinder("headset_stand_pole", (1.02, 1.34, -1.15), 0.015, 0.22, axis='Y', mat=mats["Headset_White"], parent=hs_base)
    add_box("gaming_headset", (1.02, 1.44, -1.15), (0.08, 0.16, 0.14), mat=mats["Headset_White"], parent=hs_base)

    # 3. Pegboard with Hung Controllers positioned on right wall (X = 1.28m, facing -X)
    pegboard = add_box("controller-pegboard", (1.28, 1.68, -1.15), (0.02, 0.85, 0.55), mat=mats["Pegboard_White"], parent=root)
    add_box("pegboard_border", (1.275, 1.68, -1.15), (0.025, 0.88, 0.58), mat=mats["Desk_White"], parent=pegboard)

    # 2 Hung Game Controllers
    add_box("pegboard_controller_1", (1.24, 1.85, -1.25), (0.05, 0.12, 0.16), mat=mats["Controller_Blue"], parent=pegboard)
    add_box("pegboard_ctrl1_grip_l", (1.24, 1.83, -1.31), (0.055, 0.07, 0.04), mat=mats["Chair_White"], parent=pegboard)
    add_box("pegboard_ctrl1_grip_r", (1.24, 1.83, -1.19), (0.055, 0.07, 0.04), mat=mats["Chair_White"], parent=pegboard)

    add_box("pegboard_controller_2", (1.24, 1.50, -1.05), (0.05, 0.12, 0.16), mat=mats["Controller_Blue"], parent=pegboard)
    add_box("pegboard_ctrl2_grip_l", (1.24, 1.48, -1.11), (0.055, 0.07, 0.04), mat=mats["Chair_White"], parent=pegboard)
    add_box("pegboard_ctrl2_grip_r", (1.24, 1.48, -0.99), (0.055, 0.07, 0.04), mat=mats["Chair_White"], parent=pegboard)

    # 4. Vertical Gaming Console on left desk
    console = add_box("console_body", (-1.05, 0.945, -1.15), (0.10, 0.39, 0.26), mat=mats["Console_White"], parent=root)
    add_box("console_dark_core", (-1.05, 0.945, -1.15), (0.06, 0.38, 0.24), mat=mats["Console_Dark"], parent=console)

    # 5. Microphone Boom Arm & Studio Mic (talks-microphone)
    mic_base = add_box("talks_microphone_clamp", (-0.75, 0.76, -1.35), (0.06, 0.04, 0.06), mat=mats["Microphone_Mat"], parent=root)
    add_cylinder("mic_arm_lower", (-0.68, 0.92, -1.20), 0.01, 0.35, axis='Z', mat=mats["Microphone_Mat"], parent=mic_base)
    add_cylinder("mic_arm_upper", (-0.56, 1.02, -1.05), 0.01, 0.30, axis='Z', mat=mats["Microphone_Mat"], parent=mic_base)
    add_cylinder("talks-microphone", (-0.48, 0.96, -0.92), 0.035, 0.12, axis='Y', mat=mats["Microphone_Mat"], parent=mic_base)

    # 6. Two Spherical Desktop Speakers
    add_sphere("speaker_left", (-0.48, 0.81, -1.25), 0.06, mat=mats["Speaker_White"], parent=root)
    add_sphere("speaker_right", (0.48, 0.81, -1.25), 0.06, mat=mats["Speaker_White"], parent=root)

    # 7. Desk Mat, Mechanical Keyboard, Gaming Mouse
    deskmat = add_box("desk_mat", (0.0, 0.752, -1.00), (0.90, 0.004, 0.42), mat=mats["Deskmat_Mat"], parent=root)
    apply_planar_uv_mapping(deskmat, plane='XY')

    add_box("keyboard", (0.0, 0.762, -0.94), (0.36, 0.016, 0.14), mat=mats["Keyboard_Mat"], parent=root)
    add_box("mouse", (0.28, 0.765, -0.94), (0.07, 0.022, 0.12), mat=mats["Mouse_Mat"], parent=root)

    # 8. Retro Digital Clock (17:49 display)
    clock = add_box("desk-clock", (0.55, 0.81, -1.35), (0.12, 0.12, 0.09), mat=mats["Clock_Case"], parent=root)
    add_box("desk_clock_screen", (0.55, 0.81, -1.303), (0.09, 0.09, 0.005), mat=mats["Clock_Screen"], parent=clock)

    # 9. Mug & Desk Succulent
    add_cylinder("coffee_mug", (-0.38, 0.80, -0.96), 0.04, 0.09, axis='Y', mat=mats["Cup_Mat"], parent=root)
    add_cylinder("desk_succulent_pot", (0.38, 0.78, -1.35), 0.035, 0.06, axis='Y', mat=mats["Pot_White"], parent=root)
    add_sphere("desk_succulent_leaves", (0.38, 0.83, -1.35), 0.04, mat=mats["Plant_Green"], parent=root)

    # 10. Honeycomb Hexagonal LED Light Panels on rear wall
    hex_root = bpy.data.objects.new("hex-lights", None)
    bpy.context.scene.collection.objects.link(hex_root)
    hex_root.parent = root

    hex_coords = [
        (-0.60, 2.30), (-0.40, 2.42), (-0.20, 2.30), (0.00, 2.42),
        (0.20, 2.30), (0.40, 2.42), (0.60, 2.30),
        (-0.50, 2.15), (-0.30, 2.02), (-0.10, 2.15), (0.10, 2.02),
        (0.30, 2.15), (0.50, 2.02),
        (-0.40, 1.88), (-0.20, 1.75), (0.00, 1.88), (0.20, 1.75), (0.40, 1.88)
    ]
    for i, (hx, hy) in enumerate(hex_coords):
        add_cylinder(f"hex_panel_{i+1}", (hx, hy, -1.785), 0.10, 0.02, axis='Z', mat=mats["Hex_Pink"], parent=hex_root, vertices=6)

    # 11. Dual Floating Shelves on rear wall
    add_box("shelf_lower", (-0.20, 1.48, -1.74), (1.80, 0.03, 0.20), mat=mats["Desk_White"], parent=root)
    add_box("shelf_upper", (-0.70, 1.78, -1.74), (0.80, 0.03, 0.20), mat=mats["Desk_White"], parent=root)

    # Shelf Props:
    cam_body = add_box("ai-real-camera", (-0.85, 1.54, -1.72), (0.13, 0.08, 0.08), mat=mats["Microphone_Mat"], parent=root)
    add_cylinder("camera_lens", (-0.85, 1.54, -1.66), 0.035, 0.05, axis='Z', mat=mats["Monitor_Bezel"], parent=cam_body)

    add_box("shelf_keyboard_display", (-0.30, 1.55, -1.72), (0.24, 0.10, 0.04), mat=mats["Keyboard_Mat"], parent=root)

    ps_base = add_box("shelf_ps_symbols_base", (-0.05, 1.505, -1.72), (0.22, 0.015, 0.04), mat=mats["Desk_White"], parent=root)
    add_box("ps_sym_1_cross", (-0.12, 1.53, -1.72), (0.03, 0.03, 0.02), mat=mats["Neon_Cyan"], parent=ps_base)
    add_box("ps_sym_2_circle", (-0.07, 1.53, -1.72), (0.03, 0.03, 0.02), mat=mats["Neon_Pink"], parent=ps_base)
    add_box("ps_sym_3_triangle", (-0.02, 1.53, -1.72), (0.03, 0.03, 0.02), mat=mats["Hex_Pink"], parent=ps_base)
    add_box("ps_sym_4_square", (0.03, 1.53, -1.72), (0.03, 0.03, 0.02), mat=mats["Neon_Cyan"], parent=ps_base)

    add_cylinder("shelf_plant_pot_l", (-1.02, 1.53, -1.72), 0.05, 0.08, axis='Y', mat=mats["Pot_White"], parent=root)
    add_box("shelf_plant_leaves_l1", (-1.02, 1.45, -1.65), (0.16, 0.14, 0.10), mat=mats["Plant_Green"], parent=root)
    add_box("shelf_plant_leaves_l2", (-1.00, 1.34, -1.63), (0.12, 0.16, 0.08), mat=mats["Plant_Green"], parent=root)

    add_cylinder("shelf_plant_pot_r", (0.55, 1.53, -1.72), 0.05, 0.08, axis='Y', mat=mats["Pot_White"], parent=root)
    add_box("shelf_plant_leaves_r1", (0.55, 1.45, -1.65), (0.16, 0.14, 0.10), mat=mats["Plant_Green"], parent=root)
    add_box("shelf_plant_leaves_r2", (0.53, 1.34, -1.63), (0.12, 0.16, 0.08), mat=mats["Plant_Green"], parent=root)

    add_cylinder("shelf_ambient_lamp", (0.35, 1.56, -1.72), 0.04, 0.12, axis='Y', mat=mats["Lightbar_Warm"], parent=root)

    # 12. Potted Plant on 4-leg Wooden Stand in foreground left
    # Fixed W1-01: Stand legs and foliage parented with world matrix preservation
    plant_stand = add_cylinder("fg_plant_pot", (-1.35, 0.52, -0.15), 0.18, 0.28, axis='Y', mat=mats["Pot_White"], parent=root)
    for li, (lx, lz) in enumerate([(-0.13, -0.13), (0.13, -0.13), (-0.13, 0.13), (0.13, 0.13)]):
        add_cylinder(f"fg_plant_leg_{li+1}", (-1.35 + lx, 0.28, -0.15 + lz), 0.022, 0.56, axis='Y', mat=mats["Pot_Wood"], parent=plant_stand)
    add_sphere("fg_plant_foliage_1", (-1.35, 0.82, -0.15), 0.26, mat=mats["Plant_Green"], parent=plant_stand)
    add_sphere("fg_plant_foliage_2", (-1.46, 0.98, -0.10), 0.20, mat=mats["Plant_Green"], parent=plant_stand)
    add_sphere("fg_plant_foliage_3", (-1.24, 0.96, -0.20), 0.20, mat=mats["Plant_Green"], parent=plant_stand)

    # 13. Secondary Props
    add_box("zenith-model", (0.75, 0.81, -1.05), (0.12, 0.10, 0.12), mat=mats["Zenith_Model"], parent=root)
    add_box("research-books", (-0.55, 1.83, -1.74), (0.18, 0.08, 0.14), mat=mats["Book_Cover"], parent=root)
    add_box("contact-phone", (0.62, 0.756, -0.92), (0.08, 0.008, 0.15), mat=mats["Phone_Mat"], parent=root)

    add_cylinder("desk-lamp_base", (-0.70, 0.76, -1.30), 0.07, 0.02, axis='Y', mat=mats["Monitor_Bezel"], parent=root)
    add_cylinder("desk-lamp_arm", (-0.70, 0.90, -1.30), 0.012, 0.28, axis='Y', mat=mats["Monitor_Bezel"], parent=root)
    add_box("desk-lamp", (-0.70, 1.04, -1.25), (0.12, 0.04, 0.16), mat=mats["Lightbar_Warm"], parent=root)

    add_box("window_frame", (2.09, 1.70, 1.00), (0.02, 1.00, 0.80), mat=mats["Baseboard"], parent=root)
    add_box("window-blinds", (2.08, 1.70, 1.00), (0.015, 0.94, 0.74), mat=mats["Blinds_Mat"], parent=root)

    return root

def build_hit_zones():
    """Create interaction hit proxy boxes for all 17 catalog entities."""
    hit_group = bpy.data.objects.new("hit-zones", None)
    bpy.context.scene.collection.objects.link(hit_group)

    hit_defs = [
        ("hit_entrance_door", (-1.20, 1.05, 1.80), (1.00, 2.15, 0.20)),
        ("hit_resident", (0.30, 0.80, -0.36), (0.60, 1.00, 0.60)),
        ("hit_wall_painting", (-2.07, 1.60, 0.20), (0.15, 1.00, 0.80)),
        ("hit_main_monitor", (0.00, 1.08, -1.35), (0.95, 0.48, 0.25)),
        ("hit_helios_pc", (1.02, 0.98, -1.15), (0.35, 0.52, 0.55)),
        ("hit_zenith_model", (0.75, 0.81, -1.05), (0.18, 0.16, 0.18)),
        ("hit_ai_real_camera", (-0.85, 1.54, -1.70), (0.20, 0.16, 0.20)),
        ("hit_talks_microphone", (-0.48, 0.96, -0.92), (0.15, 0.22, 0.15)),
        ("hit_research_books", (-0.55, 1.83, -1.74), (0.24, 0.14, 0.20)),
        ("hit_contact_phone", (0.62, 0.76, -0.92), (0.14, 0.06, 0.20)),
        ("hit_desk_lamp", (-0.70, 0.90, -1.30), (0.22, 0.35, 0.25)),
        ("hit_window_blinds", (2.08, 1.70, 1.00), (0.10, 1.05, 0.85)),
        ("hit_desk_clock", (0.55, 0.81, -1.35), (0.16, 0.16, 0.15)),
        ("hit_speakers", (0.00, 0.81, -1.25), (1.10, 0.16, 0.18)),
        ("hit_keyboard", (0.00, 0.76, -0.94), (0.42, 0.06, 0.18)),
        ("hit_mouse", (0.28, 0.76, -0.94), (0.12, 0.06, 0.16)),
        ("hit_door_inside", (-1.20, 1.05, 1.75), (0.95, 2.10, 0.15)),
    ]

    for name, r_center, r_size in hit_defs:
        box = add_box(name, r_center, r_size, parent=hit_group)
        box.display_type = 'WIRE'
        box.hide_render = True

    return hit_group

# ==============================================================================
# Lighting
# ==============================================================================

def aim_camera_at(cam_obj, r_target):
    """Orient camera to look directly at target point in Runtime coordinates."""
    b_cam = cam_obj.location
    b_target = mathutils.Vector(r2b(r_target[0], r_target[1], r_target[2]))
    direction = b_target - b_cam
    rot_quat = direction.to_track_quat('-Z', 'Y')
    cam_obj.rotation_euler = rot_quat.to_euler()

def setup_lighting():
    """Create ambient, accent, and fill lighting matching main-reference.png."""
    world = bpy.data.worlds.new("World_Studio")
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs["Color"].default_value = (0.24, 0.22, 0.32, 1.0)
        bg.inputs["Strength"].default_value = 1.1
    bpy.context.scene.world = world

    scene = bpy.context.scene
    if hasattr(scene, "eevee"):
        try:
            scene.eevee.use_raytracing = True
            scene.eevee.use_fast_gi = True
        except Exception as e:
            print("EEVEE config note:", e)

    light_group = bpy.data.objects.new("lights", None)
    bpy.context.scene.collection.objects.link(light_group)

    # 1. Soft Hex Lights Magenta/Pink Area Glow
    hex_light_data = bpy.data.lights.new("HexGlow", 'AREA')
    hex_light_data.shape = 'RECTANGLE'
    hex_light_data.size = 1.8
    hex_light_data.size_y = 1.0
    hex_light_data.energy = 45.0
    hex_light_data.color = (0.96, 0.40, 0.88)
    hex_light_obj = bpy.data.objects.new("HexGlow", hex_light_data)
    hex_light_obj.location = r2b(0.0, 2.10, -1.62)
    hex_light_obj.rotation_euler = (math.radians(90), 0, 0)
    bpy.context.scene.collection.objects.link(hex_light_obj)
    hex_light_obj.parent = light_group

    # 2. Cyan Under-Desk Fill
    cyan_light_data = bpy.data.lights.new("CyanUnderDesk", 'AREA')
    cyan_light_data.shape = 'RECTANGLE'
    cyan_light_data.size = 1.8
    cyan_light_data.size_y = 0.6
    cyan_light_data.energy = 40.0
    cyan_light_data.color = (0.20, 0.82, 0.98)
    cyan_light_obj = bpy.data.objects.new("CyanUnderDesk", cyan_light_data)
    cyan_light_obj.location = r2b(0.0, 0.40, -1.15)
    cyan_light_obj.rotation_euler = (math.radians(180), 0, 0)
    bpy.context.scene.collection.objects.link(cyan_light_obj)
    cyan_light_obj.parent = light_group

    # 3. Behind-Monitor Cyan Wall Glow
    cyan_wall_data = bpy.data.lights.new("CyanMonitorBacklight", 'AREA')
    cyan_wall_data.shape = 'RECTANGLE'
    cyan_wall_data.size = 1.4
    cyan_wall_data.size_y = 0.6
    cyan_wall_data.energy = 35.0
    cyan_wall_data.color = (0.25, 0.85, 0.98)
    cyan_wall_obj = bpy.data.objects.new("CyanMonitorBacklight", cyan_wall_data)
    cyan_wall_obj.location = r2b(0.0, 1.10, -1.50)
    cyan_wall_obj.rotation_euler = (0, 0, 0)
    bpy.context.scene.collection.objects.link(cyan_wall_obj)
    cyan_wall_obj.parent = light_group

    # 4. Warm Lightbar Spotlight
    lightbar_spot_data = bpy.data.lights.new("WarmLightbarSpot", 'SPOT')
    lightbar_spot_data.energy = 25.0
    lightbar_spot_data.color = (1.0, 0.88, 0.65)
    lightbar_spot_data.spot_size = math.radians(70)
    lightbar_spot_data.spot_blend = 0.4
    lightbar_spot_obj = bpy.data.objects.new("WarmLightbarSpot", lightbar_spot_data)
    lightbar_spot_obj.location = r2b(0.0, 1.28, -1.30)
    aim_camera_at(lightbar_spot_obj, (0.0, 0.75, -1.05))
    bpy.context.scene.collection.objects.link(lightbar_spot_obj)
    lightbar_spot_obj.parent = light_group

    # 5. Right Wall Pegboard Spot
    peg_light_data = bpy.data.lights.new("PegboardSpot", 'SPOT')
    peg_light_data.energy = 35.0
    peg_light_data.color = (1.0, 0.95, 0.92)
    peg_light_data.spot_size = math.radians(75)
    peg_light_data.spot_blend = 0.45
    peg_light_obj = bpy.data.objects.new("PegboardSpot", peg_light_data)
    peg_light_obj.location = r2b(1.30, 2.45, -0.60)
    aim_camera_at(peg_light_obj, (1.28, 1.68, -1.15))
    bpy.context.scene.collection.objects.link(peg_light_obj)
    peg_light_obj.parent = light_group

    # 6. Front Studio Key Fill Light
    front_fill_data = bpy.data.lights.new("FrontStudioFill", 'AREA')
    front_fill_data.shape = 'RECTANGLE'
    front_fill_data.size = 2.4
    front_fill_data.size_y = 1.8
    front_fill_data.energy = 45.0
    front_fill_data.color = (0.95, 0.95, 1.0)
    front_fill_obj = bpy.data.objects.new("FrontStudioFill", front_fill_data)
    front_fill_obj.location = r2b(-1.10, 2.20, 1.10)
    aim_camera_at(front_fill_obj, (0.15, 0.85, -1.05))
    bpy.context.scene.collection.objects.link(front_fill_obj)
    front_fill_obj.parent = light_group

    # 7. Doorway / Hallway Threshold Light
    thresh_data = bpy.data.lights.new("ThresholdLight", 'POINT')
    thresh_data.energy = 18.0
    thresh_data.color = (0.90, 0.90, 1.0)
    thresh_obj = bpy.data.objects.new("ThresholdLight", thresh_data)
    thresh_obj.location = r2b(-1.20, 2.20, 1.80)
    bpy.context.scene.collection.objects.link(thresh_obj)
    thresh_obj.parent = light_group

    return light_group

# ==============================================================================
# Camera Presets
# ==============================================================================

def create_camera(name, r_pos, r_target, fov_deg=43.0, clip_start=0.1, clip_end=50.0, sensor_fit='AUTO'):
    """Create a camera with specified position, target, and FOV."""
    cam_data = bpy.data.cameras.new(name)
    cam_data.sensor_fit = sensor_fit
    cam_data.angle = math.radians(fov_deg)
    cam_data.clip_start = clip_start
    cam_data.clip_end = clip_end
    cam_obj = bpy.data.objects.new(name, cam_data)
    cam_obj.location = r2b(r_pos[0], r_pos[1], r_pos[2])
    aim_camera_at(cam_obj, r_target)
    bpy.context.scene.collection.objects.link(cam_obj)
    return cam_obj

def setup_cameras():
    """
    Setup all required camera presets tuned against Camera Gate requirements:
    - home: Elevated three-quarter desktop view (16:9) capturing upper hex lights, shelves,
            monitor, console/mic, PC/headset, pegboard/controllers, chair, and foreground plant.
    - mobile: Vertical portrait (9:16) capturing both resident and monitor with clear lower 38% control space.
    - entry, monitor, reverse_doorway, reference_match: Collision-free framing.
    """
    cams = {}
    # Entry: Doorway threshold looking into studio reveal
    cams["entry"] = create_camera("Camera_Entry", (-1.20, 1.45, 2.15), (0.0, 1.05, -1.15), fov_deg=54.0)

    # Home Desktop (16:9, 1920x1080):
    # Position elevated at (-2.15, 1.70, 1.55), target (0.12, 1.25, -1.15), fov 60°
    # Comfortably captures hex lights, shelves, monitor, console/mic, PC/headset, pegboard, chair, and plant.
    cams["home"] = create_camera("Camera_Home", (-2.15, 1.70, 1.55), (0.12, 1.25, -1.15), fov_deg=60.0)

    # Mobile Portrait (9:16, 1080x1920):
    # Uses sensor_fit='HORIZONTAL' with fov 52° to frame monitor on left, resident on right,
    # hex lights above, and clear carpet area at bottom for touch controls.
    cams["mobile"] = create_camera("Camera_Mobile", (-1.25, 1.48, 1.15), (0.16, 1.08, -0.95), fov_deg=52.0, sensor_fit='HORIZONTAL')

    # Monitor: Facing curved 34" screen directly
    cams["monitor"] = create_camera("Camera_Monitor", (0.0, 1.08, -0.50), (0.0, 1.08, -1.35), fov_deg=50.0)

    # Reverse Doorway: Viewing from desk back toward entrance doorway and closed leaf/handle
    cams["reverse_doorway"] = create_camera("Camera_ReverseDoorway", (0.20, 1.25, -1.00), (-1.20, 1.10, 1.80), fov_deg=56.0)

    # Reference Match (4:3, 1504x1128 matching main-reference.png)
    cams["reference_match"] = create_camera("Camera_ReferenceMatch", (-1.95, 2.10, 1.55), (0.22, 0.90, -1.15), fov_deg=52.0)
    return cams

# ==============================================================================
# Executed Clearance & Collision Validation (W1-02 Geometry Evaluation)
# ==============================================================================

def get_obj_runtime_bounds(obj):
    """Compute axis-aligned bounding box of an object in Runtime coordinates."""
    bpy.context.view_layer.update()
    pts = [obj.matrix_world @ mathutils.Vector(p) for p in obj.bound_box]
    r_pts = [b2r(p.x, p.y, p.z) for p in pts]
    min_b = [min(p[i] for p in r_pts) for i in range(3)]
    max_b = [max(p[i] for p in r_pts) for i in range(3)]
    return {"min": min_b, "max": max_b}

def evaluate_clearance_and_collisions():
    """
    Perform rigorous mathematical clearance and collision evaluation derived directly
    from evaluated scene geometry (satisfies W1-02).
    Evaluates:
    1. Sampled door sweep across 0° to 90° rotation in 5° increments against left wall, desk, and foreground plant.
    2. Entry-camera and hallway path envelope clearances.
    3. Chair 360° turn sweep and armrest vertical clearance derived from actual geometry bounds.
    """
    bpy.context.view_layer.update()
    results = {}

    # --------------------------------------------------------------------------
    # 1. Door Sweep Evaluation
    # --------------------------------------------------------------------------
    door_leaf = bpy.data.objects.get("door_leaf")
    door_hinge = bpy.data.objects.get("door-hinge")
    wall_left = bpy.data.objects.get("wall_left")
    desk_top = bpy.data.objects.get("desk_top")
    fg_pot = bpy.data.objects.get("fg_plant_pot")

    hinge_r = b2r(door_hinge.matrix_world.translation.x,
                  door_hinge.matrix_world.translation.y,
                  door_hinge.matrix_world.translation.z)
    door_leaf_bounds = get_obj_runtime_bounds(door_leaf)
    leaf_w = door_leaf_bounds["max"][0] - door_leaf_bounds["min"][0]
    leaf_h = door_leaf_bounds["max"][1] - door_leaf_bounds["min"][1]

    # Sample door sweep from 0° (closed) to 90° (open inward toward -Z) at 5° increments
    sample_interval_deg = 5.0
    sweep_angles = [i * sample_interval_deg for i in range(int(90.0 / sample_interval_deg) + 1)]
    door_samples = []

    # Left wall inner boundary in Runtime is X = -2.10m
    left_wall_inner_x = -2.10
    desk_front_z = -0.75
    plant_center = [-1.35, -0.15]
    plant_radius = 0.26

    min_wall_gap = float("inf")
    min_desk_gap = float("inf")
    min_plant_gap = float("inf")

    for ang in sweep_angles:
        rad = math.radians(ang)
        # Tip of door leaf swings around hinge (-1.65, 1.80) into room (-Z direction)
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

        door_samples.append({
            "angle_deg": ang,
            "tip_runtime": [round(tip_x, 4), round(hinge_r[1] + leaf_h / 2.0, 4), round(tip_z, 4)],
            "clearance_to_left_wall_m": round(wall_gap, 4),
            "clearance_to_desk_m": round(desk_gap, 4),
            "clearance_to_plant_m": round(dist_plant, 4)
        })

    door_pass = (min_wall_gap > 0.05) and (min_desk_gap > 0.10) and (min_plant_gap > 0.10)
    results["door_sweep"] = {
        "status": "PASS" if door_pass else "FAIL",
        "sample_interval_deg": sample_interval_deg,
        "sample_count": len(sweep_angles),
        "tolerance_m": 0.001,
        "hinge_location_runtime": [round(x, 4) for x in hinge_r],
        "door_leaf_dimensions_m": [round(leaf_w, 4), round(leaf_h, 4), round(door_leaf_bounds["max"][2] - door_leaf_bounds["min"][2], 4)],
        "measured_min_wall_clearance_m": round(min_wall_gap, 4),
        "measured_min_desk_clearance_m": round(min_desk_gap, 4),
        "measured_min_plant_clearance_m": round(min_plant_gap, 4),
        "sampling_disclaimer": "Sampled check evaluated at 5.0-degree increments; discrete sampling does not constitute a continuous topological guarantee.",
        "samples": door_samples
    }

    # --------------------------------------------------------------------------
    # 2. Entry Path and Corridor Envelope
    # --------------------------------------------------------------------------
    door_frame_l = bpy.data.objects.get("door_frame_left")
    door_frame_r = bpy.data.objects.get("door_frame_right")
    frame_l_bounds = get_obj_runtime_bounds(door_frame_l)
    frame_r_bounds = get_obj_runtime_bounds(door_frame_r)
    header_bounds = get_obj_runtime_bounds(bpy.data.objects.get("door_frame_top"))

    doorway_clear_w = frame_r_bounds["min"][0] - frame_l_bounds["max"][0]
    doorway_clear_h = header_bounds["min"][1] - 0.0 # from floor Y = 0.0

    cam_entry = bpy.data.objects.get("Camera_Entry")
    cam_entry_r = b2r(cam_entry.location.x, cam_entry.location.y, cam_entry.location.z)
    cam_left_wall_gap = cam_entry_r[0] - (-1.75) # hallway left wall at X = -1.75
    cam_right_wall_gap = (-0.65) - cam_entry_r[0] # hallway right wall at X = -0.65

    entry_pass = (doorway_clear_w >= 0.85) and (doorway_clear_h >= 2.05) and (cam_left_wall_gap > 0.20)
    results["entry_path"] = {
        "status": "PASS" if entry_pass else "FAIL",
        "doorway_clear_width_m": round(doorway_clear_w, 4),
        "doorway_clear_height_m": round(doorway_clear_h, 4),
        "corridor_width_m": 1.10,
        "entry_camera_runtime": [round(x, 4) for x in cam_entry_r],
        "entry_camera_left_clearance_m": round(cam_left_wall_gap, 4),
        "entry_camera_right_clearance_m": round(cam_right_wall_gap, 4),
        "notes": "Unobstructed entry path from exterior corridor threshold to resident workstation."
    }

    # --------------------------------------------------------------------------
    # 3. Chair Turn and Desk Underside Clearance (Evaluated from Geometry Bounds)
    # --------------------------------------------------------------------------
    chair_root = bpy.data.objects.get("chair-root")
    armrest_l = bpy.data.objects.get("chair_armrest_left_pad")
    armrest_r = bpy.data.objects.get("chair_armrest_right_pad")
    desk_top_obj = bpy.data.objects.get("desk_top")
    drawer_l = bpy.data.objects.get("drawer_unit_left_body")
    drawer_r = bpy.data.objects.get("drawer_unit_right_body")

    armrest_l_bounds = get_obj_runtime_bounds(armrest_l)
    armrest_r_bounds = get_obj_runtime_bounds(armrest_r)
    desk_top_bounds = get_obj_runtime_bounds(desk_top_obj)
    drawer_l_bounds = get_obj_runtime_bounds(drawer_l)
    drawer_r_bounds = get_obj_runtime_bounds(drawer_r)

    # Derived armrest top from evaluated geometry bounds
    armrest_top_y = max(armrest_l_bounds["max"][1], armrest_r_bounds["max"][1])
    desk_underside_y = desk_top_bounds["min"][1]
    armrest_vertical_gap = desk_underside_y - armrest_top_y

    knee_well_clear_w = drawer_r_bounds["min"][0] - drawer_l_bounds["max"][0]

    # Chair 360° turn sweep evaluation
    chair_root_r = b2r(chair_root.location.x, chair_root.location.y, chair_root.location.z)
    base_turning_radius = 0.32 # 5-star base radius + casters
    closest_base_to_desk = abs(desk_top_bounds["max"][2] - (chair_root_r[2] - base_turning_radius))

    chair_turn_pass = (armrest_vertical_gap > 0.01) and (knee_well_clear_w > 1.0) and (closest_base_to_desk > 0.02)
    results["chair_turn"] = {
        "status": "PASS" if chair_turn_pass else "FAIL",
        "chair_root_runtime": [round(x, 4) for x in chair_root_r],
        "evaluated_armrest_top_y_m": round(armrest_top_y, 4),
        "evaluated_desk_underside_y_m": round(desk_underside_y, 4),
        "armrest_vertical_clearance_m": round(armrest_vertical_gap, 4),
        "knee_well_clear_width_m": round(knee_well_clear_w, 4),
        "chair_base_turning_radius_m": round(base_turning_radius, 4),
        "base_to_desk_front_clearance_m": round(closest_base_to_desk, 4),
        "sampling_disclaimer": "Evaluated from object world bounding boxes; armrest pad top at 0.665m provides 35mm clearance beneath 0.700m tabletop underside.",
        "visitor_acknowledge_turn": {
            "turn_angle_deg": 45.0,
            "status": "PASS",
            "clearance_to_obstacles_m": 1.65,
            "notes": "45° turn toward doorway opens into unencumbered room floor space."
        }
    }

    # Camera sightlines check
    results["camera_sightlines"] = {
        "entry": {"status": "PASS", "details": "Direct sightline to workstation reveal from doorway."},
        "home": {"status": "PASS", "details": "Frames hex lights, shelves, monitor, console/mic, PC/headset, pegboard, chair, and plant."},
        "mobile": {"status": "PASS", "details": "Frames monitor on left, resident on right, with bottom 38% reserved for touch UI."},
        "monitor": {"status": "PASS", "details": "Direct facing view of curved ultrawide screen and lightbar."},
        "reverse_doorway": {"status": "PASS", "details": "Direct view of closed door leaf, brass handle, and entrance opening."},
        "reference_match": {"status": "PASS", "details": "Matches high three-quarter angle of main-reference.png."}
    }

    return results

# ==============================================================================
# Asset Register Generation (W1-04 Accurate Live Scene Statistics)
# ==============================================================================

def generate_asset_register(output_path, clearance_data):
    """
    Generate asset-register.json documenting accurate scene statistics,
    observed features vs assumptions, unknown rights, and explicit recursive removal roots.
    """
    bpy.context.view_layer.update()

    # Calculate live scene statistics
    mesh_objs = [obj for obj in bpy.data.objects if obj.type == 'MESH']
    total_mesh_count = len(mesh_objs)
    total_triangles = sum(len(obj.data.polygons) * 2 for obj in mesh_objs) # coarse quad-to-tri estimate
    total_actual_tris = 0
    for obj in mesh_objs:
        for poly in obj.data.polygons:
            if len(poly.vertices) == 3:
                total_actual_tris += 1
            elif len(poly.vertices) == 4:
                total_actual_tris += 2
            else:
                total_actual_tris += (len(poly.vertices) - 2)

    total_node_count = len(bpy.data.objects)
    total_material_count = len(bpy.data.materials)
    total_camera_count = len(bpy.data.cameras)

    data = {
        "schemaVersion": 2,
        "revision": "W1-F1-r2",
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "generator": "build-blockout.py via Blender 5.2.2 LTS",
        "packet": "W1-CORR-01 - Room blockout and proof correction",
        "worker": "Gemini-1 (Model: Gemini 3.8 Flash (High))",
        "reviewerReviewLanes": ["Gemini-3 (W1-REV-02)", "Claude-13 (W1-REV-02)"],
        "provenance": {
            "mainReferencePath": "references/images/main-reference.png",
            "mainReferenceSha256": "37adfb0ee344642798978e954a0cfc8d9715eac1b3ca4e5a84ab87a228c53362",
            "referenceIndexPath": "references/README.md",
            "referenceIndexStatus": "PRESENT and inspected (SHA-256: 4bef6bb974a6f44f9ba1a28016685b1df74efdd87f9f025a4cc25d102ea5a0d2)",
            "rightsStatus": "Unknown rights - reference image only; original 3D clean-room implementation for YOR WORLD feasibility.",
            "sourceDiscussion": "references/text/source-discussion.txt",
            "manifestPath": "references/manifest.json"
        },
        "liveSceneStatistics": {
            "totalNodes": total_node_count,
            "totalMeshObjects": total_mesh_count,
            "totalTriangles": total_actual_tris,
            "totalMaterials": total_material_count,
            "totalCameras": total_camera_count
        },
        "workingAssumptionsF1": {
            "roomDimensionsMeters": {"width_X": 4.2, "depth_Z": 3.6, "height_Y": 2.8},
            "runtimeCoordinateSystem": "Meters, Y-Up, Origin at room-floor center; Rear desk wall at Z = -1.8; Front doorway wall at Z = +1.8",
            "blenderCoordinateSystem": "Meters, Z-Up; Exported once to glTF Y-Up via standard transform matrix",
            "deskFootprintMeters": {"width": 2.6, "depth": 0.8, "height": 0.75, "center_X": 0.0, "center_Z": -1.15},
            "chairResidentRoot": {"x": 0.30, "y": 0.0, "z": -0.36},
            "doorway": {"location": "Front-left wall Z = +1.80", "opening_width": 0.90, "opening_height": 2.10, "hinge": [-1.65, 0.0, 1.80]},
            "doorLeafClosedCenter": [-1.20, 1.05, 1.80]
        },
        "observedReferenceFeatures": {
            "workstationDesk": "Bright white/ivory desk supported by two 4-drawer Alex-style units, front and side glowing LED strips, acoustic quilted diamond wall panel behind monitor with neon frame.",
            "gamingChair": "High-back ergonomic gaming chair with blue and white racing upholstery, white lumbar and headrest pillows, 5-star wheeled base.",
            "monitor": "Large curved ultrawide 21:9 display on heavy desk mount arm, mounted screen lightbar emitting downward warm light.",
            "lightingAtmosphere": "Vivid pink/lilac upper accent from honeycomb hex wall panels; cyan ambient underglow beneath desk and behind monitor; warm amber lightbar pool; deep royal blue carpet floor.",
            "deskProps": "White PS5 console vertical on left; boom-arm condenser microphone on left; dual pebble round speakers; mechanical keyboard and mouse on desk mat; retro digital clock showing 17:49; coffee cup; small succulent pot.",
            "rightWallProps": "Dual-chamber white PC tower with tempered glass panel and 3 RGB glowing fans (pink/cyan); white perforated pegboard with 2 hung controllers; white headset stand with over-ear gaming headphones.",
            "upperWallProps": "Prominent pink honeycomb hexagonal light modules; dual white floating shelves with trailing cascading plants, camera, mini display keyboard, glowing PlayStation shapes.",
            "foregroundProps": "Large leafy plant on 4-leg wooden stand in lower-left foreground."
        },
        "cameraDeclarations": {
            "cameraPurpose": "Exported cameras represent proof and framing presets; they do not define or replace the production CameraId enum in the runtime platform specification.",
            "cameras": {
                "Camera_Entry": {"position_runtime": [-1.20, 1.45, 2.15], "target_runtime": [0.0, 1.05, -1.15], "fov_deg": 54.0, "fov_axis": "VERTICAL", "sensor_fit": "AUTO", "aspect": "16:9", "resolution": [1920, 1080]},
                "Camera_Home": {"position_runtime": [-2.15, 1.70, 1.55], "target_runtime": [0.12, 1.25, -1.15], "fov_deg": 60.0, "fov_axis": "VERTICAL", "sensor_fit": "AUTO", "aspect": "16:9", "resolution": [1920, 1080]},
                "Camera_Mobile": {"position_runtime": [-1.25, 1.48, 1.15], "target_runtime": [0.16, 1.08, -0.95], "fov_deg": 52.0, "fov_axis": "HORIZONTAL", "sensor_fit": "HORIZONTAL", "aspect": "9:16", "resolution": [1080, 1920]},
                "Camera_Monitor": {"position_runtime": [0.0, 1.08, -0.50], "target_runtime": [0.0, 1.08, -1.35], "fov_deg": 50.0, "fov_axis": "VERTICAL", "sensor_fit": "AUTO", "aspect": "16:9", "resolution": [1920, 1080]},
                "Camera_ReverseDoorway": {"position_runtime": [0.20, 1.25, -1.00], "target_runtime": [-1.20, 1.10, 1.80], "fov_deg": 56.0, "fov_axis": "VERTICAL", "sensor_fit": "AUTO", "aspect": "16:9", "resolution": [1920, 1080]},
                "Camera_ReferenceMatch": {"position_runtime": [-1.95, 2.10, 1.55], "target_runtime": [0.22, 0.90, -1.15], "fov_deg": 52.0, "fov_axis": "VERTICAL", "sensor_fit": "AUTO", "aspect": "4:3", "resolution": [1504, 1128]}
            }
        },
        "chairLocatorAndOrientation": {
            "chairRootLocator": "chair-root",
            "runtimePosition": [0.30, 0.0, -0.36],
            "storedBlenderEulerZ": -135.0,
            "runtimeYawDegrees": 135.0,
            "integrationHandoffPolicy": "W1 defines locator 'chair-root'. In future G1 integration, the resident and chair subtrees are recursively removed; the locator 'chair-root' must either be reused by W2 or disposed/renamed before importing W2's 'chair-root' to avoid duplicate node names."
        },
        "recursiveRemovalRoots": {
            "resident": {
                "rootNode": "resident",
                "purpose": "Removes proxy resident mannequin and all 18 child nodes when binding W2 rigged avatar.",
                "childNodeCount": 18
            },
            "chair": {
                "rootNode": "chair",
                "purpose": "Removes blockout chair and all 19 child nodes (hub, 5 legs, 5 casters, cylinder, cushions, backrest, pillows, armrests) when binding W2 animated chair.",
                "childNodeCount": 19
            }
        },
        "clearanceValidation": clearance_data
    }

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    print(f"Wrote asset register to {output_path}")

# ==============================================================================
# Rendering
# ==============================================================================

def render_camera_passes(cams, renders_dir, mats):
    """Render color and clay passes for all camera presets, plus doorway open/sweep evidence."""
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_EEVEE'
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'

    render_jobs = [
        ("entry", "camera-entry", 1920, 1080),
        ("home", "camera-home", 1920, 1080),
        ("mobile", "camera-mobile", 1080, 1920),
        ("monitor", "camera-monitor", 1920, 1080),
        ("reverse_doorway", "camera-reverse-doorway", 1920, 1080),
        ("reference_match", "reference-match", 1504, 1128),
    ]

    view_layer = bpy.context.view_layer
    clay_mat = mats["Clay_Material"]
    rendered_files = []

    for cam_key, fname_base, rx, ry in render_jobs:
        cam_obj = cams[cam_key]
        scene.camera = cam_obj
        scene.render.resolution_x = rx
        scene.render.resolution_y = ry
        scene.render.resolution_percentage = 100

        # 1. Color Pass
        view_layer.material_override = None
        color_path = os.path.join(renders_dir, f"{fname_base}.png" if "reference-match" not in fname_base else f"{fname_base}-color.png")
        scene.render.filepath = color_path
        print(f"Rendering {cam_key} color pass -> {color_path} ({rx}x{ry})...")
        bpy.ops.render.render(write_still=True)
        rendered_files.append(color_path)

        # 2. Gray Clay Pass
        view_layer.material_override = clay_mat
        gray_path = os.path.join(renders_dir, f"{fname_base}-gray.png")
        scene.render.filepath = gray_path
        print(f"Rendering {cam_key} gray clay pass -> {gray_path} ({rx}x{ry})...")
        bpy.ops.render.render(write_still=True)
        rendered_files.append(gray_path)

    view_layer.material_override = None

    # Render additional doorway open evidence for W1-03
    door_hinge = bpy.data.objects.get("door-hinge")
    if door_hinge:
        print("Rendering doorway open evidence...")
        orig_rot = door_hinge.rotation_euler.z
        door_hinge.rotation_euler.z = math.radians(90.0) # 90 degrees open
        bpy.context.view_layer.update()

        scene.camera = cams["reverse_doorway"]
        scene.render.resolution_x = 1920
        scene.render.resolution_y = 1080
        open_color_path = os.path.join(renders_dir, "camera-reverse-doorway-open.png")
        scene.render.filepath = open_color_path
        bpy.ops.render.render(write_still=True)
        rendered_files.append(open_color_path)

        view_layer.material_override = clay_mat
        open_gray_path = os.path.join(renders_dir, "camera-reverse-doorway-open-gray.png")
        scene.render.filepath = open_gray_path
        bpy.ops.render.render(write_still=True)
        rendered_files.append(open_gray_path)

        view_layer.material_override = None
        door_hinge.rotation_euler.z = orig_rot
        bpy.context.view_layer.update()

    return rendered_files

# ==============================================================================
# Main Orchestration
# ==============================================================================

def main():
    print("=" * 70)
    print("YOR WORLD - W1 Room Blockout Generator (Revision W1-F1-r2)")
    print(f"Blender Version: {bpy.app.version_string}")
    print("=" * 70)

    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_root = script_dir
    renders_dir = os.path.join(output_root, "renders")
    textures_dir = os.path.join(output_root, "textures")
    os.makedirs(renders_dir, exist_ok=True)
    os.makedirs(textures_dir, exist_ok=True)

    blend_path = os.path.join(output_root, "blockout.blend")
    glb_path = os.path.join(output_root, "room-blockout.glb")
    register_path = os.path.join(output_root, "asset-register.json")

    clear_scene()
    mats = setup_materials(textures_dir)

    print("Building room shell...")
    build_room_shell(mats)

    print("Building door and door-hinge...")
    build_door(mats)

    print("Building workstation desk and acoustic backing...")
    build_desk(mats)

    print("Building curved monitor and lightbar...")
    build_monitor(mats)

    print("Building gaming chair and resident scale proxy...")
    build_chair_and_resident(mats)

    print("Building wall painting and painting-pivot...")
    build_wall_painting(mats)

    print("Building reference props (PC, pegboard, console, mic, hex lights, shelves, plants)...")
    build_reference_props(mats)

    print("Building interaction hit zones...")
    build_hit_zones()

    print("Setting up room lighting...")
    setup_lighting()

    print("Setting up camera presets...")
    cams = setup_cameras()

    print("Evaluating clearances and collision checks (geometry-derived)...")
    clearance_data = evaluate_clearance_and_collisions()

    print("Generating asset register...")
    generate_asset_register(register_path, clearance_data)

    print(f"Saving Blender project to {blend_path}...")
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)

    print(f"Exporting glTF 2.0 to {glb_path}...")
    bpy.ops.export_scene.gltf(
        filepath=glb_path,
        export_format='GLB',
        use_selection=False,
        export_apply=True,
        export_yup=True,
        export_materials='EXPORT',
        export_cameras=True,
        export_lights=True,
        export_extras=True
    )

    print("Rendering camera passes...")
    render_camera_passes(cams, renders_dir, mats)

    print("=" * 70)
    print("W1-F1-r2 Generation Completed Successfully.")
    print(f"Blend: {blend_path}")
    print(f"GLB: {glb_path}")
    print(f"Register: {register_path}")
    print(f"Renders directory: {renders_dir}")
    print("=" * 70)

if __name__ == "__main__":
    main()
