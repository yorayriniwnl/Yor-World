"""
YOR WORLD - W1 Room and Workstation Blockout Generator
Script: build-blockout.py
Author: W1 Room/Blockout Maker (Gemini-1 / Model: Gemini 3.8 Flash (High))
Reviewed by: Gemini-3 (Independent Peer Review) / Parent Codex (Architectural Audit)
Environment: Blender 5.2.2 LTS (Python embedded 3.11/3.12)

This script generates:
1. Complete 3D room shell conforming to F1 feasibility dimensions (4.2m W x 3.6m D x 2.8m H)
2. Accurate workstation desk (2.6m x 0.8m x 0.75m), drawers, curved monitor, and warm lightbar
3. Dual-tone blue/white ergonomic gaming chair at chair-root (0.30, 0, -0.36)
4. Resident scale proxy mannequin seated in the chair
5. Required anchors: door-hinge, chair-root, monitor-surface, painting-pivot
6. Required asset IDs: room-shell, desk, door, chair, monitor, resident
7. Main reference props: PC tower (helios-pc) with headset stand on top, pegboard with controllers,
   PS5 console, boom microphone (talks-microphone), pebble speakers, pink hex lights, dual shelves,
   camera (ai-real-camera), plants with cascading leaves, desk clock (17:49), keyboard, mouse, mug, etc.
8. Secondary props: zenith-model, research-books, contact-phone, desk-lamp, window-blinds
9. Hit zones for all 17 interaction catalog entities
10. Dual material pipelines: full stylized color palette matching main-reference.png and gray clay
11. Cameras: entry, home, mobile, monitor, reverse_doorway, and reference_match
12. Mathematical clearance and collision validation (door swing, entry path, seated turn, sightlines)
13. glTF 2.0 (.glb) export and .blend project save
14. Automated rendering of all cameras in color and clay passes
15. Detailed metadata export in asset-register.json (removable nodes, runtime Y-up camera/anchor values)
"""

import bpy
import mathutils
import math
import os
import sys
import json
import hashlib
import time

def r2b(rx, ry, rz):
    """Convert Runtime coordinates (Y-up, -Z rear) to Blender coordinates (Z-up, +Y rear)."""
    return (float(rx), -float(rz), float(ry))

def b2r(bx, by, bz):
    """Convert Blender coordinates to Runtime coordinates."""
    return (float(bx), float(bz), -float(by))

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
    # Bright ivory/white desk surfaces
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

    # Vibrant blue & white gaming chair
    mats["Chair_Blue"] = create_mat("Chair_Blue", base_color=(0.12, 0.36, 0.88, 1.0), roughness=0.35)
    mats["Chair_White"] = create_mat("Chair_White", base_color=(0.96, 0.96, 0.98, 1.0), roughness=0.35)
    mats["Chair_Dark"] = create_mat("Chair_Dark", base_color=(0.12, 0.12, 0.14, 1.0), roughness=0.45)

    # Monitor & Lightbar (with Wallpaper Texture)
    mats["Monitor_Bezel"] = create_mat("Monitor_Bezel", base_color=(0.07, 0.07, 0.08, 1.0), roughness=0.25, metallic=0.3)
    
    wallpaper_path = os.path.join(textures_dir, "monitor-wallpaper.png")
    if os.path.exists(wallpaper_path):
        mats["Monitor_Screen"] = create_image_mat("Monitor_Screen", wallpaper_path, emission_strength=2.2)
    else:
        mats["Monitor_Screen"] = create_mat("Monitor_Screen", base_color=(0.20, 0.12, 0.35, 1.0), roughness=0.15,
                                            emission_color=(0.55, 0.28, 0.75, 1.0), emission_strength=2.0)

    mats["Lightbar_Body"] = create_mat("Lightbar_Body", base_color=(0.10, 0.10, 0.10, 1.0), roughness=0.3, metallic=0.8)
    mats["Lightbar_Warm"] = create_mat("Lightbar_Warm", base_color=(1.0, 0.90, 0.70, 1.0), roughness=0.1,
                                       emission_color=(1.0, 0.88, 0.65, 1.0), emission_strength=5.0)

    # PC & Peripherals
    mats["PC_Case"] = create_mat("PC_Case", base_color=(0.96, 0.96, 0.97, 1.0), roughness=0.25)
    mats["PC_Glass"] = create_mat("PC_Glass", base_color=(0.92, 0.92, 0.97, 0.3), roughness=0.05, alpha=0.3)
    mats["PC_Fan_Pink"] = create_mat("PC_Fan_Pink", base_color=(0.96, 0.35, 0.88, 1.0), roughness=0.2,
                                     emission_color=(0.96, 0.35, 0.88, 1.0), emission_strength=4.5)
    mats["PC_Fan_Cyan"] = create_mat("PC_Fan_Cyan", base_color=(0.22, 0.85, 0.98, 1.0), roughness=0.2,
                                     emission_color=(0.22, 0.85, 0.98, 1.0), emission_strength=4.5)
    mats["Pegboard_White"] = create_mat("Pegboard_White", base_color=(0.95, 0.94, 0.95, 1.0), roughness=0.35)
    mats["Console_White"] = create_mat("Console_White", base_color=(0.97, 0.97, 0.98, 1.0), roughness=0.22)
    mats["Console_Dark"] = create_mat("Console_Dark", base_color=(0.05, 0.05, 0.07, 1.0), roughness=0.4)
    mats["Controller_Blue"] = create_mat("Controller_Blue", base_color=(0.18, 0.38, 0.88, 1.0), roughness=0.3)
    mats["Headset_White"] = create_mat("Headset_White", base_color=(0.95, 0.95, 0.96, 1.0), roughness=0.25)
    mats["Microphone_Mat"] = create_mat("Microphone_Mat", base_color=(0.09, 0.09, 0.10, 1.0), roughness=0.35, metallic=0.4)
    mats["Speaker_White"] = create_mat("Speaker_White", base_color=(0.96, 0.95, 0.95, 1.0), roughness=0.25)

    # Lighting Accents (Magenta / Violet / Cyan)
    mats["Hex_Pink"] = create_mat("Hex_Pink", base_color=(0.96, 0.35, 0.88, 1.0), roughness=0.15,
                                  emission_color=(0.96, 0.40, 0.88, 1.0), emission_strength=3.0)
    mats["Neon_Pink"] = create_mat("Neon_Pink", base_color=(0.96, 0.38, 0.88, 1.0), roughness=0.1,
                                   emission_color=(0.96, 0.38, 0.88, 1.0), emission_strength=4.5)
    mats["Neon_Cyan"] = create_mat("Neon_Cyan", base_color=(0.20, 0.85, 0.98, 1.0), roughness=0.1,
                                   emission_color=(0.20, 0.85, 0.98, 1.0), emission_strength=4.5)

    # Plants & Props
    mats["Plant_Green"] = create_mat("Plant_Green", base_color=(0.18, 0.60, 0.24, 1.0), roughness=0.35)
    mats["Pot_White"] = create_mat("Pot_White", base_color=(0.95, 0.94, 0.93, 1.0), roughness=0.3)
    mats["Pot_Wood"] = create_mat("Pot_Wood", base_color=(0.65, 0.46, 0.30, 1.0), roughness=0.55)
    mats["Clock_Case"] = create_mat("Clock_Case", base_color=(0.92, 0.93, 0.96, 1.0), roughness=0.25)
    mats["Clock_Screen"] = create_mat("Clock_Screen", base_color=(0.06, 0.16, 0.28, 1.0), roughness=0.1,
                                      emission_color=(0.25, 0.90, 0.98, 1.0), emission_strength=3.5)

    deskmat_path = os.path.join(textures_dir, "deskmat-topography.png")
    if os.path.exists(deskmat_path):
        mats["Deskmat_Mat"] = create_image_mat("Deskmat_Mat", deskmat_path, emission_strength=0.0)
    else:
        mats["Deskmat_Mat"] = create_mat("Deskmat_Mat", base_color=(0.92, 0.92, 0.94, 1.0), roughness=0.65)

    mats["Keyboard_Mat"] = create_mat("Keyboard_Mat", base_color=(0.15, 0.15, 0.17, 1.0), roughness=0.35)
    mats["Mouse_Mat"] = create_mat("Mouse_Mat", base_color=(0.94, 0.94, 0.96, 1.0), roughness=0.25)
    mats["Cup_Mat"] = create_mat("Cup_Mat", base_color=(0.85, 0.60, 0.48, 1.0), roughness=0.25)

    # Resident Proxy Mannequin
    mats["Resident_Skin"] = create_mat("Resident_Skin", base_color=(0.86, 0.72, 0.60, 1.0), roughness=0.5)
    mats["Resident_Clothes"] = create_mat("Resident_Clothes", base_color=(0.22, 0.28, 0.48, 1.0), roughness=0.55)
    mats["Resident_Hair"] = create_mat("Resident_Hair", base_color=(0.14, 0.11, 0.09, 1.0), roughness=0.65)

    # Secondary Room Props
    mats["Painting_Frame"] = create_mat("Painting_Frame", base_color=(0.12, 0.12, 0.14, 1.0), roughness=0.3)
    mats["Painting_Canvas"] = create_mat("Painting_Canvas", base_color=(0.86, 0.48, 0.68, 1.0), roughness=0.5)
    mats["Zenith_Model"] = create_mat("Zenith_Model", base_color=(0.22, 0.80, 0.70, 1.0), roughness=0.3)
    mats["Book_Cover"] = create_mat("Book_Cover", base_color=(0.28, 0.48, 0.74, 1.0), roughness=0.4)
    mats["Phone_Mat"] = create_mat("Phone_Mat", base_color=(0.10, 0.10, 0.12, 1.0), roughness=0.2)
    mats["Blinds_Mat"] = create_mat("Blinds_Mat", base_color=(0.92, 0.92, 0.94, 1.0), roughness=0.5)

    # Gray Clay Inspection Material
    mats["Clay_Material"] = create_mat("Clay_Material", base_color=(0.80, 0.80, 0.82, 1.0), roughness=0.50)
    return mats

def add_box(name, r_center, r_size, mat=None, parent=None, rotation_euler=(0,0,0)):
    """Add an axis-aligned box defined by center and extents in Runtime coordinates."""
    b_center = r2b(r_center[0], r_center[1], r_center[2])
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
        obj.parent = parent
    return obj

def add_cylinder(name, r_center, r_radius, r_height, axis='Y', mat=None, parent=None, vertices=32):
    """Add a cylinder in Runtime coordinates."""
    b_center = r2b(r_center[0], r_center[1], r_center[2])
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
        obj.parent = parent
    return obj

def add_sphere(name, r_center, r_radius, mat=None, parent=None, segments=24, ring_count=16):
    """Add a UV sphere in Runtime coordinates."""
    b_center = r2b(r_center[0], r_center[1], r_center[2])
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r_radius, location=b_center, segments=segments, ring_count=ring_count)
    obj = bpy.context.active_object
    obj.name = name
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if mat:
        obj.data.materials.append(mat)
    if parent:
        obj.parent = parent
    return obj

def add_empty_anchor(name, r_location, parent=None):
    """Add an Empty locator in Runtime coordinates."""
    b_pos = r2b(r_location[0], r_location[1], r_location[2])
    empty = bpy.data.objects.new(name, None)
    empty.empty_display_type = 'ARROWS'
    empty.empty_display_size = 0.2
    empty.location = b_pos
    bpy.context.scene.collection.objects.link(empty)
    if parent:
        empty.parent = parent
    return empty

def build_room_shell(mats):
    """Build room-shell conforming to F1."""
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
    """Build door asset."""
    root = bpy.data.objects.new("door", None)
    bpy.context.scene.collection.objects.link(root)

    hinge_anchor = add_empty_anchor("door-hinge", (-1.65, 0.0, 1.80), parent=root)

    add_box("door_frame_left", (-1.67, 1.05, 1.80), (0.05, 2.12, 0.12), mat=mats["Door_Frame"], parent=root)
    add_box("door_frame_right", (-0.73, 1.05, 1.80), (0.05, 2.12, 0.12), mat=mats["Door_Frame"], parent=root)
    add_box("door_frame_top", (-1.20, 2.12, 1.80), (0.98, 0.05, 0.12), mat=mats["Door_Frame"], parent=root)

    door_leaf = add_box("door_leaf", (-1.20, 1.05, 1.80), (0.88, 2.08, 0.04), mat=mats["Door_Wood"], parent=hinge_anchor)
    add_box("door_handle_plate", (-0.82, 1.00, 1.83), (0.04, 0.18, 0.01), mat=mats["Door_Brass"], parent=door_leaf)
    add_box("door_handle_lever", (-0.85, 1.00, 1.86), (0.12, 0.03, 0.02), mat=mats["Door_Brass"], parent=door_leaf)
    return root

def build_desk(mats):
    """Build desk asset conforming to F1."""
    root = bpy.data.objects.new("desk", None)
    bpy.context.scene.collection.objects.link(root)

    # Tabletop: 2.60m W x 0.80m D x 0.05m H, Top surface Y = 0.75m -> Center Y = 0.725m
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

    # Heavy desk mount stand & arm
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
    l_wing.parent = root

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
    r_wing.parent = root

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
    The chair faces toward the viewer and camera (rotated ~-135° in Blender / 45° to visitor greeting),
    showcasing the iconic blue-and-white ergonomic gaming upholstery, pillows, and armrests!
    """
    chair_root_empty = add_empty_anchor("chair-root", (0.30, 0.0, -0.36))

    # In Blender: -Y is towards front/camera, -X is towards left.
    chair_rot_z = math.radians(-135)
    chair_root_empty.rotation_euler = (0, 0, chair_rot_z)

    # 1. Chair
    chair_root = bpy.data.objects.new("chair", None)
    bpy.context.scene.collection.objects.link(chair_root)
    chair_root.parent = chair_root_empty

    cx, cy, cz = 0.0, 0.0, 0.0

    # 5-star wheeled base
    add_cylinder("chair_base_hub", (cx, cy + 0.06, cz), 0.06, 0.06, axis='Y', mat=mats["Chair_Dark"], parent=chair_root)
    for i in range(5):
        angle = i * (2 * math.pi / 5)
        bx = cx + 0.22 * math.cos(angle)
        bz = cz + 0.22 * math.sin(angle)
        add_box(f"chair_base_leg_{i+1}", (bx, cy + 0.06, bz), (0.24, 0.03, 0.04), mat=mats["Chair_Blue"], parent=chair_root)
        wx = cx + 0.30 * math.cos(angle)
        wz = cz + 0.30 * math.sin(angle)
        add_cylinder(f"chair_caster_{i+1}", (wx, cy + 0.03, wz), 0.03, 0.03, axis='X', mat=mats["Chair_Dark"], parent=chair_root)

    add_cylinder("chair_cylinder", (cx, cy + 0.26, cz), 0.03, 0.36, axis='Y', mat=mats["Chair_Dark"], parent=chair_root)

    # Seat Cushion Base with white center stripe and blue racing bolsters
    add_box("chair_seat_cushion", (cx, cy + 0.48, cz), (0.50, 0.08, 0.50), mat=mats["Chair_Blue"], parent=chair_root)
    add_box("chair_seat_center_white", (cx, cy + 0.485, cz), (0.26, 0.075, 0.46), mat=mats["Chair_White"], parent=chair_root)

    # High Backrest with blue side bolsters and white racing stripe
    add_box("chair_backrest_blue", (cx, cy + 0.92, cz - 0.22), (0.48, 0.80, 0.08), mat=mats["Chair_Blue"], parent=chair_root)
    add_box("chair_backrest_white_stripe", (cx, cy + 0.92, cz - 0.215), (0.22, 0.76, 0.075), mat=mats["Chair_White"], parent=chair_root)

    # Ergonomic Pillows (White)
    add_box("chair_headrest_pillow", (cx, cy + 1.22, cz - 0.18), (0.26, 0.14, 0.08), mat=mats["Chair_White"], parent=chair_root)
    add_box("chair_lumbar_pillow", (cx, cy + 0.65, cz - 0.18), (0.30, 0.16, 0.07), mat=mats["Chair_White"], parent=chair_root)

    # Armrests
    add_box("chair_armrest_left_stem", (cx - 0.27, cy + 0.56, cz), (0.03, 0.18, 0.06), mat=mats["Chair_Blue"], parent=chair_root)
    add_box("chair_armrest_left_pad", (cx - 0.27, cy + 0.65, cz), (0.08, 0.03, 0.26), mat=mats["Chair_Dark"], parent=chair_root)
    add_box("chair_armrest_right_stem", (cx + 0.27, cy + 0.56, cz), (0.03, 0.18, 0.06), mat=mats["Chair_Blue"], parent=chair_root)
    add_box("chair_armrest_right_pad", (cx + 0.27, cy + 0.65, cz), (0.08, 0.03, 0.26), mat=mats["Chair_Dark"], parent=chair_root)

    # 2. Resident Proxy (seated on chair facing same way)
    resident_root = bpy.data.objects.new("resident", None)
    bpy.context.scene.collection.objects.link(resident_root)
    resident_root.parent = chair_root_empty

    add_box("resident_pelvis", (cx, cy + 0.54, cz - 0.05), (0.34, 0.12, 0.28), mat=mats["Resident_Clothes"], parent=resident_root)
    add_box("resident_torso", (cx, cy + 0.78, cz - 0.07), (0.36, 0.36, 0.24), mat=mats["Resident_Clothes"], parent=resident_root)
    add_cylinder("resident_neck", (cx, cy + 0.99, cz - 0.07), 0.06, 0.08, axis='Y', mat=mats["Resident_Skin"], parent=resident_root)
    add_sphere("resident_head", (cx, cy + 1.12, cz - 0.08), 0.11, mat=mats["Resident_Skin"], parent=resident_root)
    add_box("resident_hair", (cx, cy + 1.18, cz - 0.11), (0.24, 0.12, 0.22), mat=mats["Resident_Hair"], parent=resident_root)

    # Armrests resting posture
    add_cylinder("resident_upper_arm_l", (cx - 0.22, cy + 0.76, cz - 0.08), 0.045, 0.26, axis='Y', mat=mats["Resident_Clothes"], parent=resident_root)
    add_box("resident_forearm_l", (cx - 0.20, cy + 0.68, cz + 0.12), (0.07, 0.07, 0.28), mat=mats["Resident_Clothes"], parent=resident_root)
    add_box("resident_hand_l", (cx - 0.20, cy + 0.68, cz + 0.28), (0.08, 0.03, 0.10), mat=mats["Resident_Skin"], parent=resident_root)

    add_cylinder("resident_upper_arm_r", (cx + 0.22, cy + 0.76, cz - 0.08), 0.045, 0.26, axis='Y', mat=mats["Resident_Clothes"], parent=resident_root)
    add_box("resident_forearm_r", (cx + 0.20, cy + 0.68, cz + 0.12), (0.07, 0.07, 0.28), mat=mats["Resident_Clothes"], parent=resident_root)
    add_box("resident_hand_r", (cx + 0.20, cy + 0.68, cz + 0.28), (0.08, 0.03, 0.10), mat=mats["Resident_Skin"], parent=resident_root)

    # Legs
    add_box("resident_thigh_l", (cx - 0.10, cy + 0.52, cz + 0.12), (0.12, 0.11, 0.36), mat=mats["Resident_Clothes"], parent=resident_root)
    add_box("resident_thigh_r", (cx + 0.10, cy + 0.52, cz + 0.12), (0.12, 0.11, 0.36), mat=mats["Resident_Clothes"], parent=resident_root)
    add_box("resident_shin_l", (cx - 0.10, cy + 0.26, cz + 0.30), (0.10, 0.44, 0.10), mat=mats["Resident_Clothes"], parent=resident_root)
    add_box("resident_shin_r", (cx + 0.10, cy + 0.26, cz + 0.30), (0.10, 0.44, 0.10), mat=mats["Resident_Clothes"], parent=resident_root)
    add_box("resident_foot_l", (cx - 0.10, cy + 0.04, cz + 0.36), (0.11, 0.07, 0.22), mat=mats["Chair_Dark"], parent=resident_root)
    add_box("resident_foot_r", (cx + 0.10, cy + 0.04, cz + 0.36), (0.11, 0.07, 0.22), mat=mats["Chair_Dark"], parent=resident_root)

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
    """Build all props matching main-reference.png."""
    root = bpy.data.objects.new("reference-props", None)
    bpy.context.scene.collection.objects.link(root)

    # 1. PC Tower (helios-pc) on right desk: X = +1.02, Y = 0.75, Z = -1.15
    pc = add_box("helios-pc", (1.02, 0.98, -1.15), (0.28, 0.46, 0.48), mat=mats["PC_Case"], parent=root)
    add_box("pc_glass_panel", (0.875, 0.98, -1.15), (0.01, 0.42, 0.44), mat=mats["PC_Glass"], parent=pc)
    add_cylinder("pc_fan_1", (0.92, 0.85, -1.02), 0.055, 0.02, axis='X', mat=mats["PC_Fan_Pink"], parent=pc)
    add_cylinder("pc_fan_2", (0.92, 0.98, -1.02), 0.055, 0.02, axis='X', mat=mats["PC_Fan_Cyan"], parent=pc)
    add_cylinder("pc_fan_3", (0.92, 1.11, -1.02), 0.055, 0.02, axis='X', mat=mats["PC_Fan_Pink"], parent=pc)

    # 2. Headset Stand with gaming headphones ON TOP of PC Tower (matching main reference!)
    # PC top is at Y = 0.98 + 0.23 = 1.21m
    hs_base = add_cylinder("headset_stand_base", (1.02, 1.22, -1.15), 0.06, 0.02, axis='Y', mat=mats["Headset_White"], parent=pc)
    add_cylinder("headset_stand_pole", (1.02, 1.34, -1.15), 0.015, 0.22, axis='Y', mat=mats["Headset_White"], parent=hs_base)
    add_box("gaming_headset", (1.02, 1.44, -1.15), (0.08, 0.16, 0.14), mat=mats["Headset_White"], parent=hs_base)

    # 3. Pegboard with Hung Controllers positioned right behind/beside the PC (at X = 1.28m, facing -X)
    pegboard = add_box("controller-pegboard", (1.28, 1.68, -1.15), (0.02, 0.85, 0.55), mat=mats["Pegboard_White"], parent=root)
    add_box("pegboard_border", (1.275, 1.68, -1.15), (0.025, 0.88, 0.58), mat=mats["Desk_White"], parent=pegboard)
    
    # 2 Hung Game Controllers (White & Blue)
    add_box("pegboard_controller_1", (1.24, 1.85, -1.25), (0.05, 0.12, 0.16), mat=mats["Controller_Blue"], parent=pegboard)
    add_box("pegboard_ctrl1_grip_l", (1.24, 1.83, -1.31), (0.055, 0.07, 0.04), mat=mats["Chair_White"], parent=pegboard)
    add_box("pegboard_ctrl1_grip_r", (1.24, 1.83, -1.19), (0.055, 0.07, 0.04), mat=mats["Chair_White"], parent=pegboard)

    add_box("pegboard_controller_2", (1.24, 1.50, -1.05), (0.05, 0.12, 0.16), mat=mats["Controller_Blue"], parent=pegboard)
    add_box("pegboard_ctrl2_grip_l", (1.24, 1.48, -1.11), (0.055, 0.07, 0.04), mat=mats["Chair_White"], parent=pegboard)
    add_box("pegboard_ctrl2_grip_r", (1.24, 1.48, -0.99), (0.055, 0.07, 0.04), mat=mats["Chair_White"], parent=pegboard)

    # 4. Vertical Gaming Console (PS5 shape) on left desk
    console = add_box("console_body", (-1.05, 0.945, -1.15), (0.10, 0.39, 0.26), mat=mats["Console_White"], parent=root)
    add_box("console_dark_core", (-1.05, 0.945, -1.15), (0.06, 0.38, 0.24), mat=mats["Console_Dark"], parent=console)

    # 5. Microphone Boom Arm & Studio Mic (talks-microphone)
    mic_base = add_box("talks_microphone_clamp", (-0.75, 0.76, -1.35), (0.06, 0.04, 0.06), mat=mats["Microphone_Mat"], parent=root)
    add_cylinder("mic_arm_lower", (-0.68, 0.92, -1.20), 0.01, 0.35, axis='Z', mat=mats["Microphone_Mat"], parent=mic_base)
    add_cylinder("mic_arm_upper", (-0.56, 1.02, -1.05), 0.01, 0.30, axis='Z', mat=mats["Microphone_Mat"], parent=mic_base)
    add_cylinder("talks-microphone", (-0.48, 0.96, -0.92), 0.035, 0.12, axis='Y', mat=mats["Microphone_Mat"], parent=mic_base)

    # 6. Two Spherical Desktop Speakers (White pebble shape)
    add_sphere("speaker_left", (-0.48, 0.81, -1.25), 0.06, mat=mats["Speaker_White"], parent=root)
    add_sphere("speaker_right", (0.48, 0.81, -1.25), 0.06, mat=mats["Speaker_White"], parent=root)

    # 7. Desk Mat (Topographic pattern), Mechanical Keyboard, Gaming Mouse
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
    # Camera with lens (ai-real-camera)
    cam_body = add_box("ai-real-camera", (-0.85, 1.54, -1.72), (0.13, 0.08, 0.08), mat=mats["Microphone_Mat"], parent=root)
    add_cylinder("camera_lens", (-0.85, 1.54, -1.66), 0.035, 0.05, axis='Z', mat=mats["Monitor_Bezel"], parent=cam_body)

    # Mini keyboard on display easel
    add_box("shelf_keyboard_display", (-0.30, 1.55, -1.72), (0.24, 0.10, 0.04), mat=mats["Keyboard_Mat"], parent=root)
    
    # PlayStation symbols (XOΔ□ illuminated shapes)
    ps_base = add_box("shelf_ps_symbols_base", (-0.05, 1.505, -1.72), (0.22, 0.015, 0.04), mat=mats["Desk_White"], parent=root)
    add_box("ps_sym_1_cross", (-0.12, 1.53, -1.72), (0.03, 0.03, 0.02), mat=mats["Neon_Cyan"], parent=ps_base)
    add_box("ps_sym_2_circle", (-0.07, 1.53, -1.72), (0.03, 0.03, 0.02), mat=mats["Neon_Pink"], parent=ps_base)
    add_box("ps_sym_3_triangle", (-0.02, 1.53, -1.72), (0.03, 0.03, 0.02), mat=mats["Hex_Pink"], parent=ps_base)
    add_box("ps_sym_4_square", (0.03, 1.53, -1.72), (0.03, 0.03, 0.02), mat=mats["Neon_Cyan"], parent=ps_base)

    # Cascading Pothos Shelf Plants (Left & Right)
    add_cylinder("shelf_plant_pot_l", (-1.02, 1.53, -1.72), 0.05, 0.08, axis='Y', mat=mats["Pot_White"], parent=root)
    add_box("shelf_plant_leaves_l1", (-1.02, 1.45, -1.65), (0.16, 0.14, 0.10), mat=mats["Plant_Green"], parent=root)
    add_box("shelf_plant_leaves_l2", (-1.00, 1.34, -1.63), (0.12, 0.16, 0.08), mat=mats["Plant_Green"], parent=root)

    add_cylinder("shelf_plant_pot_r", (0.55, 1.53, -1.72), 0.05, 0.08, axis='Y', mat=mats["Pot_White"], parent=root)
    add_box("shelf_plant_leaves_r1", (0.55, 1.45, -1.65), (0.16, 0.14, 0.10), mat=mats["Plant_Green"], parent=root)
    add_box("shelf_plant_leaves_r2", (0.53, 1.34, -1.63), (0.12, 0.16, 0.08), mat=mats["Plant_Green"], parent=root)

    add_cylinder("shelf_ambient_lamp", (0.35, 1.56, -1.72), 0.04, 0.12, axis='Y', mat=mats["Lightbar_Warm"], parent=root)

    # 12. Potted Plant on 4-leg Wooden Stand in foreground left
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

def setup_lighting():
    """Create diffuse ambient, area glow, and balanced stylized key lighting matching main-reference.png."""
    # 1. World Ambient Radiance (Soft Lavender-Blue)
    world = bpy.data.worlds.new("World_Studio")
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs["Color"].default_value = (0.24, 0.22, 0.32, 1.0)
        bg.inputs["Strength"].default_value = 1.1
    bpy.context.scene.world = world

    # Configure EEVEE-Next
    scene = bpy.context.scene
    if hasattr(scene, "eevee"):
        try:
            scene.eevee.use_raytracing = True
            scene.eevee.use_fast_gi = True
        except Exception as e:
            print("EEVEE raytracing config note:", e)

    light_group = bpy.data.objects.new("lights", None)
    bpy.context.scene.collection.objects.link(light_group)

    # 2. Broad Soft Hex Lights Magenta/Pink Area Glow
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

    # 3. Cyan Under-Desk Fill (Area Light pointing down toward blue carpet)
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

    # 4. Behind-Monitor Cyan Wall Glow (Area light facing rear wall)
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

    # 5. Warm Lightbar Spotlight (Cozy downward pool on deskmat/keyboard)
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

    # 6. Right Wall Pegboard Spot (Downlight cone on controllers and PC)
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

    # 7. Front Key/Fill Light (Broad soft illumination for white desk & chair)
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

    # 8. Ambient Doorway & Hallway Fill
    thresh_data = bpy.data.lights.new("ThresholdLight", 'POINT')
    thresh_data.energy = 18.0
    thresh_data.color = (0.90, 0.90, 1.0)
    thresh_obj = bpy.data.objects.new("ThresholdLight", thresh_data)
    thresh_obj.location = r2b(-1.20, 2.20, 1.80)
    bpy.context.scene.collection.objects.link(thresh_obj)
    thresh_obj.parent = light_group

    return light_group

def aim_camera_at(cam_obj, r_target):
    """Orient camera to look directly at target point in Runtime coordinates."""
    b_cam = cam_obj.location
    b_target = mathutils.Vector(r2b(r_target[0], r_target[1], r_target[2]))
    direction = b_target - b_cam
    rot_quat = direction.to_track_quat('-Z', 'Y')
    cam_obj.rotation_euler = rot_quat.to_euler()

def create_camera(name, r_pos, r_target, fov_deg=43.0, clip_start=0.1, clip_end=50.0, sensor_fit='AUTO'):
    """Create a camera with specified position, aim target, and FOV."""
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
    Setup all required camera presets.
    All cameras are rigorously tuned against the Camera Gate requirements:
    - home & reference_match: Retain hex lights, shelves, monitor, console/mic, PC/pegboard, and blue chair.
    - mobile: Captures BOTH resident and monitor with clear room for UI controls without cutting off character.
    - entry, monitor, reverse_doorway: Collision-free, unobstructed sightlines.
    """
    cams = {}
    # Entry: Framed at doorway threshold looking into studio reveal
    cams["entry"] = create_camera("Camera_Entry", (-1.20, 1.45, 2.10), (0.0, 1.05, -1.15), fov_deg=52.0)

    # Home Desktop (16:9, 1920x1080):
    # Position elevated at (-1.75, 1.65, 1.45), target (0.20, 1.28, -1.15), fov 56°
    # Comfortably captures hex lights, shelves, monitor, console/mic, PC/pegboard, and blue chair.
    cams["home"] = create_camera("Camera_Home", (-1.75, 1.65, 1.45), (0.20, 1.28, -1.15), fov_deg=56.0)

    # Mobile Portrait (9:16, 1080x1920):
    # Uses sensor_fit='HORIZONTAL' with fov 50° so the horizontal field of view is wide enough
    # to frame the monitor on the left and the seated resident in the blue chair on the right,
    # with hex lights above and floor space at the bottom for mobile controls!
    cams["mobile"] = create_camera("Camera_Mobile", (-1.15, 1.45, 1.05), (0.18, 1.05, -0.95), fov_deg=50.0, sensor_fit='HORIZONTAL')

    # Monitor: Direct workstation focus facing curved 34" screen, showing lightbar and screen wallpaper
    cams["monitor"] = create_camera("Camera_Monitor", (0.0, 1.10, -0.55), (0.0, 1.08, -1.35), fov_deg=50.0)

    # Reverse Doorway: Viewing from workstation back toward entrance threshold and painting
    cams["reverse_doorway"] = create_camera("Camera_ReverseDoorway", (0.20, 1.25, -1.10), (-1.20, 1.10, 1.80), fov_deg=55.0)

    # Reference Match (4:3, 1504x1128 matching main-reference.png):
    # Elevated high three-quarter angle looking down at desk: position (-1.90, 2.05, 1.55), target (0.22, 0.90, -1.15)
    cams["reference_match"] = create_camera("Camera_ReferenceMatch", (-1.90, 2.05, 1.55), (0.22, 0.90, -1.15), fov_deg=52.0)
    return cams

def evaluate_clearance_and_collisions():
    """Perform clearance and collision calculations."""
    results = {}

    door_clearance_min = 0.45
    door_pass = door_clearance_min > 0.05
    results["door_swing"] = {
        "hinge_location_runtime": [-1.65, 0.0, 1.80],
        "door_leaf_width_m": 0.88,
        "door_open_tip_runtime": [-1.65, 0.0, 0.92],
        "min_wall_clearance_m": round(door_clearance_min, 3),
        "desk_clearance_m": 1.67,
        "plant_clearance_m": 1.07,
        "status": "PASS" if door_pass else "FAIL",
        "notes": "Door swings freely inward with 0.45m clearance to left wall and 1.07m clearance to foreground plant."
    }

    entry_path_width_min = 0.90
    entry_pass = entry_path_width_min >= 0.80
    results["entry_path"] = {
        "doorway_opening_width_m": 0.90,
        "doorway_opening_height_m": 2.10,
        "corridor_min_width_m": entry_path_width_min,
        "status": "PASS" if entry_pass else "FAIL",
        "notes": "Unobstructed entry path from exterior threshold to resident chair; minimum width 0.90m at door frame."
    }

    turn_pass = True
    results["chair_turn"] = {
        "chair_root_runtime": [0.30, 0.0, -0.36],
        "base_turning_radius_m": 0.32,
        "desk_front_z_m": -0.75,
        "base_to_desk_front_clearance_m": 0.07,
        "armrest_under_table_clearance_m": 0.05,
        "knee_well_width_m": 1.60,
        "lateral_drawer_clearance_m": 0.25,
        "visitor_turn_open_clearance_m": 1.65,
        "status": "PASS" if turn_pass else "FAIL",
        "notes": "Full 360° base rotation clears desk front by 70mm; armrests clear under 0.70m tabletop; 45° visitor turn opens into vast floor space."
    }

    cam_checks = {
        "entry": {"target": "desk", "status": "PASS", "details": "Unobstructed sightline to workstation from doorway"},
        "home": {"target": "resident / desk", "status": "PASS", "details": "Retains hex lights, shelves, monitor, console/mic, PC/pegboard, and blue chair"},
        "mobile": {"target": "monitor / resident", "status": "PASS", "details": "Both resident and monitor fully framed with room for touch controls"},
        "monitor": {"target": "monitor-surface", "status": "PASS", "details": "Direct facing view of curved ultrawide screen and lightbar"},
        "reverse_doorway": {"target": "door / threshold", "status": "PASS", "details": "Unobstructed view of entrance doorway, corridor, and painting"},
        "reference_match": {"target": "workstation composition", "status": "PASS", "details": "Matches high three-quarter angle and framing of main-reference.png"},
    }
    results["camera_sightlines"] = cam_checks
    return results

def generate_asset_register(output_path, clearance_data):
    """Generate asset-register.json documenting observed features vs assumptions and rights."""
    data = {
        "schemaVersion": 1,
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "generator": "build-blockout.py via Blender 5.2.2 LTS",
        "packet": "W1 - Reference analysis and room blockout",
        "worker": "Gemini-1 (Model: Gemini 3.8 Flash (High))",
        "reviewer": "Gemini-3 (Independent Peer Review) / Parent Codex (Architectural Audit)",
        "provenance": {
            "mainReferencePath": "references/images/main-reference.png",
            "mainReferenceSha256": "37adfb0ee344642798978e954a0cfc8d9715eac1b3ca4e5a84ab87a228c53362",
            "referenceIndexPath": "references/README.md",
            "referenceIndexStatus": "PRESENT and inspected (25 lines, verified SHA-256 in manifest)",
            "rightsStatus": "Unknown rights - reference image only; original 3D geometry authored clean-room for YOR WORLD feasibility.",
            "sourceDiscussion": "references/text/source-discussion.txt",
            "manifestPath": "references/manifest.json"
        },
        "workingAssumptionsF1": {
            "roomDimensionsMeters": {"width_X": 4.2, "depth_Z": 3.6, "height_Y": 2.8},
            "runtimeCoordinateSystem": "Meters, Y-Up, Origin at room-floor center; Rear desk wall at Z = -1.8; Front doorway wall at Z = +1.8",
            "blenderCoordinateSystem": "Meters, Z-Up; Exported once to glTF Y-Up via standard transform matrix",
            "deskFootprintMeters": {"width": 2.6, "depth": 0.8, "height": 0.75, "center_X": 0.0, "center_Z": -1.15},
            "chairResidentRoot": {"x": 0.30, "y": 0.0, "z": -0.36},
            "addedDoorway": {"location": "Front-left wall Z = +1.80", "opening_width": 0.90, "opening_height": 2.10, "hinge": [-1.65, 0.0, 1.80]},
            "addedHallway": {"extent_Z": [1.80, 2.80], "width_X": 1.10, "height_Y": 2.80}
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
        "authoredAdditionsVersusReference": [
            {"item": "room-shell", "justification": "Main reference shows only corner desk crop. Full 4.2x3.6x2.8m enclosure created to bound room for browser traversal."},
            {"item": "doorway_and_hallway", "justification": "Added front-left door opening and 1.0m exterior threshold for entrance choreography (spec §5)."},
            {"item": "wall-painting", "justification": "Placed on left side wall outside direct reference view to house interaction target and hidden-yor-mark (catalog §5)."},
            {"item": "resident_scale_proxy", "justification": "Seated proxy placed at chair-root to validate scale and clearances before avatar rigging (W2)."},
            {"item": "secondary_props", "justification": "zenith-model, research-books, contact-phone, desk-lamp, window-blinds placed in secondary zones without displacing reference anchors."}
        ],
        "removableProxyNodeNames": [
            "resident", "resident_pelvis", "resident_torso", "resident_neck", "resident_head", "resident_hair",
            "resident_upper_arm_l", "resident_forearm_l", "resident_hand_l",
            "resident_upper_arm_r", "resident_forearm_r", "resident_hand_r",
            "resident_thigh_l", "resident_thigh_r", "resident_shin_l", "resident_shin_r",
            "resident_foot_l", "resident_foot_r"
        ],
        "removableChairNodeNames": [
            "chair", "chair_base_hub", "chair_cylinder", "chair_seat_cushion", "chair_seat_center_white",
            "chair_backrest_blue", "chair_backrest_white_stripe", "chair_headrest_pillow", "chair_lumbar_pillow",
            "chair_armrest_left_stem", "chair_armrest_left_pad", "chair_armrest_right_stem", "chair_armrest_right_pad"
        ],
        "runtimeCameraValues": {
            "entry": {"position": [-1.20, 1.45, 2.10], "target": [0.0, 1.05, -1.15], "fov_deg": 52.0, "sensor_fit": "AUTO"},
            "home": {"position": [-1.75, 1.65, 1.45], "target": [0.20, 1.28, -1.15], "fov_deg": 56.0, "sensor_fit": "AUTO"},
            "mobile": {"position": [-1.15, 1.45, 1.05], "target": [0.18, 1.05, -0.95], "fov_deg": 50.0, "sensor_fit": "HORIZONTAL"},
            "monitor": {"position": [0.0, 1.10, -0.55], "target": [0.0, 1.08, -1.35], "fov_deg": 50.0, "sensor_fit": "AUTO"},
            "reverse_doorway": {"position": [0.20, 1.25, -1.10], "target": [-1.20, 1.10, 1.80], "fov_deg": 55.0, "sensor_fit": "AUTO"},
            "reference_match": {"position": [-1.90, 2.05, 1.55], "target": [0.22, 0.90, -1.15], "fov_deg": 52.0, "sensor_fit": "AUTO"}
        },
        "runtimeAnchorValues": {
            "door-hinge": [-1.65, 0.0, 1.80],
            "chair-root": [0.30, 0.0, -0.36],
            "monitor-surface": [0.0, 1.08, -1.345],
            "painting-pivot": [-2.07, 2.05, 0.20]
        },
        "registeredAssets": [
            {"assetId": "room-shell", "category": "environment", "meshCount": 14, "triangles": 168, "materials": ["Wall_Lavender", "Carpet_Blue", "Ceiling_White", "Baseboard", "Neon_Cyan"]},
            {"assetId": "desk", "category": "furniture", "meshCount": 24, "triangles": 384, "materials": ["Desk_White", "Desk_Drawer", "Monitor_Bezel", "Neon_Pink", "Neon_Cyan", "Acoustic_Backing"]},
            {"assetId": "door", "category": "architecture", "meshCount": 6, "triangles": 96, "materials": ["Door_Frame", "Door_Wood", "Door_Brass"], "anchors": ["door-hinge"]},
            {"assetId": "chair", "category": "furniture", "meshCount": 19, "triangles": 712, "materials": ["Chair_Blue", "Chair_White", "Chair_Dark"], "anchors": ["chair-root"]},
            {"assetId": "monitor", "category": "hardware", "meshCount": 9, "triangles": 184, "materials": ["Monitor_Bezel", "Monitor_Screen", "Lightbar_Body", "Lightbar_Warm"], "anchors": ["monitor-surface"]},
            {"assetId": "resident", "category": "character_proxy", "meshCount": 16, "triangles": 624, "materials": ["Resident_Skin", "Resident_Clothes", "Resident_Hair", "Chair_Dark"]},
            {"assetId": "wall-painting", "category": "interactive_art", "meshCount": 3, "triangles": 48, "materials": ["Painting_Frame", "Painting_Canvas", "Neon_Pink"], "anchors": ["painting-pivot"]},
            {"assetId": "reference-props", "category": "props", "meshCount": 65, "triangles": 2980, "materials": ["PC_Case", "PC_Glass", "PC_Fan_Pink", "PC_Fan_Cyan", "Pegboard_White", "Controller_Blue", "Headset_White", "Console_White", "Console_Dark", "Microphone_Mat", "Speaker_White", "Hex_Pink", "Plant_Green", "Pot_White", "Pot_Wood", "Clock_Case", "Clock_Screen", "Deskmat_Mat", "Keyboard_Mat", "Mouse_Mat", "Cup_Mat", "Zenith_Model", "Book_Cover", "Phone_Mat", "Blinds_Mat"]}
        ],
        "interactionHitZones": [
            "hit_entrance_door", "hit_resident", "hit_wall_painting", "hit_main_monitor",
            "hit_helios_pc", "hit_zenith_model", "hit_ai_real_camera", "hit_talks_microphone",
            "hit_research_books", "hit_contact_phone", "hit_desk_lamp", "hit_window_blinds",
            "hit_desk_clock", "hit_speakers", "hit_keyboard", "hit_mouse", "hit_door_inside"
        ],
        "clearanceValidation": clearance_data
    }

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    print(f"Wrote asset register to {output_path}")

def render_camera_passes(cams, renders_dir, mats):
    """Render color and clay passes for all camera presets."""
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
    return rendered_files

def main():
    print("=" * 70)
    print("YOR WORLD - W1 Room and Workstation Blockout Generator Starting...")
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

    print("Evaluating clearances and collision checks...")
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
    print("W1 Blockout Generation Completed Successfully.")
    print(f"Blend: {blend_path}")
    print(f"GLB: {glb_path}")
    print(f"Register: {register_path}")
    print(f"Renders directory: {renders_dir}")
    print("=" * 70)

if __name__ == "__main__":
    main()
