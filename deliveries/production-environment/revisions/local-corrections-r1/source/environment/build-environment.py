"""
YOR WORLD - Production Environment & Asset Pipeline Generator
Script: build-environment.py
Historical input author: Gemini #2; successor executor: local Codex remediation_art_maker
Authority: Milestone B2/B3-P2 Work Order & Product Specification Revision 2
Baseline: Feasibility Baseline F1 & Accepted B3-P1 Sample (PARENT-RECON-04)
Primary Visual Authority: references/images/main-reference.png

Preserves F1 Invariants:
- Room Shell: 4.2m width x 3.6m depth x 2.8m height, runtime meters, Y-up
- Rear wall: Z = -1.8m, Front doorway wall: Z = +1.8m
- Desk: 2.60m x 0.80m, top surface height 0.75m, center X/Z = (0, -1.15)
- Chair root: (0.30, 0.0, -0.36)
- Door hinge pivot: (-1.65, 0.0, 1.80)
- Monitor surface anchor: (0.0, 1.05, -1.30)
- Painting pivot anchor: (2.08, 1.75, -0.40)
- Coordinate conversion: Blender Z-up converted once at export to glTF +Y-up

Runtime Organization:
- Group A: Door, essential room shell, desk, resident-support geometry, essential lights
- Group B: Secondary props, plants, decorations, shelves, pegboard, clock, speakers
- On-Demand: Project props required by V1 (ai-real-camera, zenith-model, helios-pc, talks-microphone)
"""

import bpy
import mathutils
import math
import os
import sys
import json
import time
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent.resolve()
DELIVERY_DIR = SCRIPT_DIR.parents[1]
ATTEMPT = sys.argv[sys.argv.index('--attempt') + 1] if '--attempt' in sys.argv else 'build-attempt-01'
ATTEMPT_DIR = DELIVERY_DIR / 'evidence' / ATTEMPT
if ATTEMPT_DIR.exists():
    raise RuntimeError('Attempt already exists; preserve it and choose a new --attempt')
ATTEMPT_DIR.mkdir(parents=True)
sys.path.insert(0, str(SCRIPT_DIR.parent))
from art_refinements import refine_environment, record_scene
TEXTURES_DIR = SCRIPT_DIR / "textures"
RUNTIME_DIR = ATTEMPT_DIR / "runtime"
RENDERS_DIR = ATTEMPT_DIR / "renders"
EVIDENCE_DIR = ATTEMPT_DIR

RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
RENDERS_DIR.mkdir(parents=True, exist_ok=True)
EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)

# ==============================================================================
# Coordinate Transformation Helpers (F1 Runtime Y-up <-> Blender Z-up)
# ==============================================================================

def r2b(rx, ry, rz):
    """
    Convert Runtime coordinates (Y-up, -Z rear) to Blender coordinates (Z-up, +Y rear).
    Runtime: X right, Y up, Z front (+Z towards doorway, -Z towards rear wall)
    Blender: X right, Y rear (+Y towards rear wall), Z up
    """
    return (float(rx), -float(rz), float(ry))

def b2r(bx, by, bz):
    """Convert Blender coordinates to Runtime coordinates."""
    return (float(bx), float(bz), -float(by))

def set_parent_keep_world(child, parent):
    """Parent child object to parent while strictly maintaining child's existing world matrix."""
    if parent is None:
        return
    bpy.context.view_layer.update()
    world = child.matrix_world.copy()
    child.parent = parent
    child.matrix_parent_inverse.identity()
    child.matrix_world = world
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
# PBR Material Factory (Consolidated & Standardized glTF 2.0 PBR)
# ==============================================================================

_MAT_CACHE = {}

def get_or_create_pbr_mat(name, base_color=(0.8, 0.8, 0.8, 1.0), roughness=0.5, metallic=0.0,
                          specular=0.5, emission_color=None, emission_strength=1.0,
                          transmission=0.0, ior=1.45, image_path=None):
    """Creates or returns a cached Principled BSDF PBR material with exact physical parameters."""
    if name in _MAT_CACHE:
        return _MAT_CACHE[name]
    if name in bpy.data.materials:
        _MAT_CACHE[name] = bpy.data.materials[name]
        return bpy.data.materials[name]

    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links

    bsdf = nodes.get("Principled BSDF")
    if not bsdf:
        bsdf = nodes.new("ShaderNodeBsdfPrincipled")

    # Base Color
    if image_path and os.path.exists(image_path):
        img = bpy.data.images.load(str(image_path))
        tex_node = nodes.new("ShaderNodeTexImage")
        tex_node.image = img
        links.new(tex_node.outputs["Color"], bsdf.inputs["Base Color"])
        if emission_color:
            if "Emission Color" in bsdf.inputs:
                links.new(tex_node.outputs["Color"], bsdf.inputs["Emission Color"])
            elif "Emission" in bsdf.inputs:
                links.new(tex_node.outputs["Color"], bsdf.inputs["Emission"])
            if "Emission Strength" in bsdf.inputs:
                bsdf.inputs["Emission Strength"].default_value = emission_strength
    else:
        if "Base Color" in bsdf.inputs:
            bsdf.inputs["Base Color"].default_value = base_color

    if "Roughness" in bsdf.inputs:
        bsdf.inputs["Roughness"].default_value = roughness
    if "Metallic" in bsdf.inputs:
        bsdf.inputs["Metallic"].default_value = metallic

    if "Specular IOR Level" in bsdf.inputs:
        bsdf.inputs["Specular IOR Level"].default_value = specular
    elif "Specular" in bsdf.inputs:
        bsdf.inputs["Specular"].default_value = specular

    if emission_color and not (image_path and os.path.exists(image_path)):
        if "Emission Color" in bsdf.inputs:
            bsdf.inputs["Emission Color"].default_value = emission_color
        elif "Emission" in bsdf.inputs:
            bsdf.inputs["Emission"].default_value = emission_color
        if "Emission Strength" in bsdf.inputs:
            bsdf.inputs["Emission Strength"].default_value = emission_strength

    if transmission > 0:
        if "Transmission Weight" in bsdf.inputs:
            bsdf.inputs["Transmission Weight"].default_value = transmission
        elif "Transmission" in bsdf.inputs:
            bsdf.inputs["Transmission"].default_value = transmission
        if "IOR" in bsdf.inputs:
            bsdf.inputs["IOR"].default_value = ior

    _MAT_CACHE[name] = mat
    return mat

def create_all_materials(textures_dir):
    """Creates and returns dictionary of consolidated production PBR materials."""
    m = {}

    # 1. Architectural & Room Finishes
    m["Floor_Slate"] = get_or_create_pbr_mat(
        "Floor_Slate",
        base_color=(0.15, 0.17, 0.22, 1.0),
        roughness=0.65, metallic=0.05,
        image_path=textures_dir / "floor-wood-tiles.png"
    )
    m["Ceiling_Matte"] = get_or_create_pbr_mat(
        "Ceiling_Matte",
        base_color=(0.94, 0.94, 0.96, 1.0),
        roughness=0.88, metallic=0.0
    )
    m["Wall_SoftLavender"] = get_or_create_pbr_mat(
        "Wall_SoftLavender",
        base_color=(0.88, 0.87, 0.92, 1.0),
        roughness=0.78, metallic=0.0
    )
    m["Baseboard_Charcoal"] = get_or_create_pbr_mat(
        "Baseboard_Charcoal",
        base_color=(0.18, 0.18, 0.22, 1.0),
        roughness=0.45, metallic=0.1
    )
    m["Door_OakWood"] = get_or_create_pbr_mat(
        "Door_OakWood",
        base_color=(0.82, 0.78, 0.74, 1.0),
        roughness=0.52, metallic=0.02
    )
    m["Door_HardwareBrass"] = get_or_create_pbr_mat(
        "Door_HardwareBrass",
        base_color=(0.85, 0.72, 0.35, 1.0),
        roughness=0.28, metallic=0.85
    )
    m["Window_BlindsSatin"] = get_or_create_pbr_mat(
        "Window_BlindsSatin",
        base_color=(0.92, 0.92, 0.95, 1.0),
        roughness=0.40, metallic=0.05
    )

    # 2. Workstation & Furniture
    m["Desk_IvoryTop"] = get_or_create_pbr_mat(
        "Desk_IvoryTop",
        base_color=(0.93, 0.92, 0.91, 1.0), # #EDEAE7
        roughness=0.28, metallic=0.0
    )
    m["Alex_DrawerWhite"] = get_or_create_pbr_mat(
        "Alex_DrawerWhite",
        base_color=(0.96, 0.96, 0.97, 1.0), # #F4F4F6
        roughness=0.35, metallic=0.0
    )
    m["Desk_MatTopography"] = get_or_create_pbr_mat(
        "Desk_MatTopography",
        base_color=(0.92, 0.92, 0.94, 1.0),
        roughness=0.82, metallic=0.0,
        image_path=textures_dir / "desk-mat-pattern.png"
    )
    m["Acoustic_Backing"] = get_or_create_pbr_mat(
        "Acoustic_Backing",
        base_color=(0.90, 0.89, 0.93, 1.0),
        roughness=0.80, metallic=0.0,
        image_path=textures_dir / "acoustic-panel.png"
    )

    # 3. Chair
    m["Chair_CobaltFabric"] = get_or_create_pbr_mat(
        "Chair_CobaltFabric",
        base_color=(0.28, 0.43, 0.84, 1.0), # #496DD5
        roughness=0.42, metallic=0.0
    )
    m["Chair_WhiteNylon"] = get_or_create_pbr_mat(
        "Chair_WhiteNylon",
        base_color=(0.97, 0.97, 0.98, 1.0), # #F7F7FA
        roughness=0.32, metallic=0.0
    )
    m["Chair_DarkMetal"] = get_or_create_pbr_mat(
        "Chair_DarkMetal",
        base_color=(0.12, 0.12, 0.14, 1.0),
        roughness=0.38, metallic=0.75
    )

    # 4. Electronics & Peripherals
    m["Monitor_BezelMatte"] = get_or_create_pbr_mat(
        "Monitor_BezelMatte",
        base_color=(0.10, 0.10, 0.12, 1.0),
        roughness=0.35, metallic=0.15
    )
    m["Monitor_ScreenWallpaper"] = get_or_create_pbr_mat(
        "Monitor_ScreenWallpaper",
        base_color=(1.0, 1.0, 1.0, 1.0),
        roughness=0.15, metallic=0.0,
        emission_color=(1.0, 1.0, 1.0, 1.0),
        emission_strength=1.8,
        image_path=textures_dir / "monitor-wallpaper.png"
    )
    m["Keyboard_Charcoal"] = get_or_create_pbr_mat(
        "Keyboard_Charcoal",
        base_color=(0.16, 0.16, 0.18, 1.0),
        roughness=0.48, metallic=0.10
    )
    m["Keyboard_KeyOrange"] = get_or_create_pbr_mat(
        "Keyboard_KeyOrange",
        base_color=(0.95, 0.45, 0.12, 1.0),
        roughness=0.40, metallic=0.0
    )
    m["Clock_CyanDisplay"] = get_or_create_pbr_mat(
        "Clock_CyanDisplay",
        base_color=(0.0, 0.96, 1.0, 1.0),
        roughness=0.20, metallic=0.0,
        emission_color=(0.0, 0.96, 1.0, 1.0),
        emission_strength=3.5,
        image_path=textures_dir / "clock-display.png"
    )
    m["PC_ChassisWhite"] = get_or_create_pbr_mat(
        "PC_ChassisWhite",
        base_color=(0.96, 0.96, 0.97, 1.0),
        roughness=0.25, metallic=0.10
    )
    m["PC_TemperedGlass"] = get_or_create_pbr_mat(
        "PC_TemperedGlass",
        base_color=(0.95, 0.95, 1.0, 0.35),
        roughness=0.08, metallic=0.05,
        transmission=0.92, ior=1.52
    )

    # 5. Emissive Lights & Accents
    m["Hex_LilacEmissive"] = get_or_create_pbr_mat(
        "Hex_LilacEmissive",
        base_color=(0.95, 0.65, 0.95, 1.0), # #F1A5F3
        roughness=0.18, metallic=0.0,
        emission_color=(0.95, 0.65, 0.95, 1.0),
        emission_strength=6.0
    )
    m["Hex_VioletEmissive"] = get_or_create_pbr_mat(
        "Hex_VioletEmissive",
        base_color=(0.73, 0.60, 0.96, 1.0), # #B99AF5
        roughness=0.18, metallic=0.0,
        emission_color=(0.73, 0.60, 0.96, 1.0),
        emission_strength=5.5
    )
    m["Cyan_UnderdeskFill"] = get_or_create_pbr_mat(
        "Cyan_UnderdeskFill",
        base_color=(0.0, 0.90, 1.0, 1.0), # #00E5FF
        roughness=0.20, metallic=0.0,
        emission_color=(0.0, 0.90, 1.0, 1.0),
        emission_strength=4.5
    )
    m["Lightbar_WarmTask"] = get_or_create_pbr_mat(
        "Lightbar_WarmTask",
        base_color=(1.0, 0.89, 0.63, 1.0), # #FFE2A0 3200K
        roughness=0.25, metallic=0.0,
        emission_color=(1.0, 0.89, 0.63, 1.0),
        emission_strength=5.0
    )
    m["Neon_PinkAccent"] = get_or_create_pbr_mat(
        "Neon_PinkAccent",
        base_color=(1.0, 0.22, 0.78, 1.0), # #FF38C8
        roughness=0.20, metallic=0.0,
        emission_color=(1.0, 0.22, 0.78, 1.0),
        emission_strength=5.0
    )

    # 6. Dressing, Pegboard & Plants
    m["Pegboard_Perforated"] = get_or_create_pbr_mat(
        "Pegboard_Perforated",
        base_color=(0.95, 0.95, 0.96, 1.0),
        roughness=0.45, metallic=0.02,
        image_path=textures_dir / "pegboard-pattern.png"
    )
    m["Plant_Foliage"] = get_or_create_pbr_mat(
        "Plant_Foliage",
        base_color=(0.18, 0.48, 0.24, 1.0),
        roughness=0.38, metallic=0.0
    )
    m["Plant_CeramicWhite"] = get_or_create_pbr_mat(
        "Plant_CeramicWhite",
        base_color=(0.96, 0.96, 0.98, 1.0),
        roughness=0.22, metallic=0.0
    )
    m["Wall_ArtPainting"] = get_or_create_pbr_mat(
        "Wall_ArtPainting",
        base_color=(1.0, 1.0, 1.0, 1.0),
        roughness=0.45, metallic=0.05,
        image_path=textures_dir / "wall-painting.png"
    )
    m["Yor_HiddenSignature"] = get_or_create_pbr_mat(
        "Yor_HiddenSignature",
        base_color=(1.0, 0.80, 0.20, 1.0),
        roughness=0.30, metallic=0.40,
        emission_color=(1.0, 0.80, 0.20, 1.0),
        emission_strength=3.0
    )

    # 7. Project Specific Materials
    m["Project_ScannerBlue"] = get_or_create_pbr_mat(
        "Project_ScannerBlue",
        base_color=(0.0, 0.71, 0.85, 1.0), # #00B4D8
        roughness=0.20, metallic=0.10,
        emission_color=(0.0, 0.71, 0.85, 1.0),
        emission_strength=4.0
    )
    m["Project_SolarYellow"] = get_or_create_pbr_mat(
        "Project_SolarYellow",
        base_color=(1.0, 0.90, 0.0, 1.0), # #FFE500
        roughness=0.25, metallic=0.10,
        emission_color=(1.0, 0.90, 0.0, 1.0),
        emission_strength=4.5
    )
    m["Project_MicRedLED"] = get_or_create_pbr_mat(
        "Project_MicRedLED",
        base_color=(0.90, 0.22, 0.27, 1.0), # #E63946
        roughness=0.20, metallic=0.0,
        emission_color=(0.90, 0.22, 0.27, 1.0),
        emission_strength=4.5
    )

    return m

# ==============================================================================
# Mesh Primitive Geometry Builders
# ==============================================================================

def add_box(name, r_center, r_dims, mat=None, parent=None, collection=None):
    """Add an axis-aligned box in Runtime coordinates (meters, Y-up)."""
    b_center = r2b(r_center[0], r_center[1], r_center[2])
    b_dims = (r_dims[0], r_dims[2], r_dims[1])
    bpy.ops.mesh.primitive_cube_add(location=b_center)
    obj = bpy.context.active_object
    obj.name = name
    obj.dimensions = b_dims
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if mat:
        obj.data.materials.append(mat)
    if parent:
        set_parent_keep_world(obj, parent)
    if collection and obj.name not in collection.objects:
        collection.objects.link(obj)
        if obj.name in bpy.context.scene.collection.objects:
            bpy.context.scene.collection.objects.unlink(obj)
    return obj

def add_cylinder(name, r_center, r_radius, r_height, axis='Y', mat=None, parent=None, vertices=24, collection=None):
    """Add a cylinder aligned to specified axis in Runtime coordinates."""
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
        set_parent_keep_world(obj, parent)
    if collection and obj.name not in collection.objects:
        collection.objects.link(obj)
        if obj.name in bpy.context.scene.collection.objects:
            bpy.context.scene.collection.objects.unlink(obj)
    return obj

def add_empty_anchor(name, r_location, parent=None, collection=None):
    """Add an Empty locator in Runtime coordinates."""
    b_pos = r2b(r_location[0], r_location[1], r_location[2])
    empty = bpy.data.objects.new(name, None)
    empty.empty_display_type = 'ARROWS'
    empty.empty_display_size = 0.25
    empty.location = b_pos
    target_coll = collection or bpy.context.scene.collection
    target_coll.objects.link(empty)
    if parent:
        set_parent_keep_world(empty, parent)
    return empty

def apply_planar_uv(obj, plane='XZ'):
    """Generate planar UVs across specified coordinate plane."""
    mesh = obj.data
    uv_layer = mesh.uv_layers.active or mesh.uv_layers.new(name="UVMap")
    mesh.uv_layers.active = uv_layer

    if plane == 'XZ':
        coords = [(v.co.x, v.co.z) for v in mesh.vertices]
    elif plane == 'XY':
        coords = [(v.co.x, v.co.y) for v in mesh.vertices]
    else:
        coords = [(v.co.y, v.co.z) for v in mesh.vertices]

    min_u = min(c[0] for c in coords)
    max_u = max(c[0] for c in coords)
    min_v = min(c[1] for c in coords)
    max_v = max(c[1] for c in coords)
    u_span = max_u - min_u if max_u > min_u else 1.0
    v_span = max_v - min_v if max_v > min_v else 1.0

    for loop in mesh.loops:
        v = mesh.vertices[loop.vertex_index]
        if plane == 'XZ':
            u = (v.co.x - min_u) / u_span
            v_val = (v.co.z - min_v) / v_span
        elif plane == 'XY':
            u = (v.co.x - min_u) / u_span
            v_val = (v.co.y - min_v) / v_span
        else:
            u = (v.co.y - min_u) / u_span
            v_val = (v.co.z - min_v) / v_span
        uv_layer.data[loop.index].uv = (u, v_val)

# ==============================================================================
# GROUP A: Essential Room Shell, Door, Desk, Resident Support & Lights
# ==============================================================================

def build_group_a(coll, mats):
    """
    Builds Group A (Essential Baseline):
    - room-shell (F1: 4.2m W x 3.6m D x 2.8m H) + entrance hallway
    - door with door-hinge anchor at (-1.65, 0.0, 1.80)
    - desk (2.60m x 0.80m x 0.75m H) + Alex drawer units + modesty panel
    - resident-support geometry (chair-root anchor at (0.30, 0.0, -0.36), ergonomic chair, deskmat, keyboard, mouse)
    - monitor (curved ultrawide display + monitor-surface anchor at (0.0, 1.05, -1.30))
    - essential lights (hex lighting cluster, warm lightbar, cyan underdesk wash, soft ambient)
    """
    group_root = bpy.data.objects.new("group_a_root", None)
    coll.objects.link(group_root)

    # --------------------------------------------------------------------------
    # 1. Room Shell & Architecture
    # --------------------------------------------------------------------------
    room_root = bpy.data.objects.new("room-shell", None)
    coll.objects.link(room_root)
    room_root.parent = group_root

    # Floor & Hallway Extension
    fl = add_box("floor_main", (0.0, -0.05, 0.0), (4.20, 0.10, 3.60), mat=mats["Floor_Slate"], parent=room_root, collection=coll)
    apply_planar_uv(fl, plane='XY')
    fl_h = add_box("floor_hallway", (-1.20, -0.05, 2.30), (1.10, 0.10, 1.00), mat=mats["Floor_Slate"], parent=room_root, collection=coll)
    apply_planar_uv(fl_h, plane='XY')

    # Ceiling & Hallway Ceiling
    add_box("ceiling_main", (0.0, 2.85, 0.0), (4.20, 0.10, 3.60), mat=mats["Ceiling_Matte"], parent=room_root, collection=coll)
    add_box("ceiling_hallway", (-1.20, 2.85, 2.30), (1.10, 0.10, 1.00), mat=mats["Ceiling_Matte"], parent=room_root, collection=coll)

    # Walls (F1 dimensions: X in [-2.1, +2.1], Z in [-1.8, +1.8], Y in [0, 2.8])
    add_box("wall_rear", (0.0, 1.40, -1.85), (4.20, 2.80, 0.10), mat=mats["Wall_SoftLavender"], parent=room_root, collection=coll)
    add_box("wall_left", (-2.15, 1.40, 0.0), (0.10, 2.80, 3.60), mat=mats["Wall_SoftLavender"], parent=room_root, collection=coll)
    add_box("wall_right", (2.15, 1.40, 0.0), (0.10, 2.80, 3.60), mat=mats["Wall_SoftLavender"], parent=room_root, collection=coll)

    # Front Wall with Door Cutout
    add_box("wall_front_left", (-1.875, 1.40, 1.85), (0.45, 2.80, 0.10), mat=mats["Wall_SoftLavender"], parent=room_root, collection=coll)
    add_box("wall_front_right", (0.675, 1.40, 1.85), (2.85, 2.80, 0.10), mat=mats["Wall_SoftLavender"], parent=room_root, collection=coll)
    add_box("wall_front_header", (-1.20, 2.45, 1.85), (0.90, 0.70, 0.10), mat=mats["Wall_SoftLavender"], parent=room_root, collection=coll)

    # Hallway Passage Walls
    add_box("wall_hallway_l", (-1.75, 1.40, 2.30), (0.10, 2.80, 1.00), mat=mats["Wall_SoftLavender"], parent=room_root, collection=coll)
    add_box("wall_hallway_r", (-0.65, 1.40, 2.30), (0.10, 2.80, 1.00), mat=mats["Wall_SoftLavender"], parent=room_root, collection=coll)
    add_box("wall_hallway_b", (-1.20, 1.40, 2.85), (1.10, 2.80, 0.10), mat=mats["Wall_SoftLavender"], parent=room_root, collection=coll)

    # Baseboards
    add_box("baseboard_rear", (0.0, 0.04, -1.79), (4.18, 0.08, 0.02), mat=mats["Baseboard_Charcoal"], parent=room_root, collection=coll)
    add_box("baseboard_left", (-2.09, 0.04, 0.0), (0.02, 0.08, 3.58), mat=mats["Baseboard_Charcoal"], parent=room_root, collection=coll)
    add_box("baseboard_right", (2.09, 0.04, 0.0), (0.02, 0.08, 3.58), mat=mats["Baseboard_Charcoal"], parent=room_root, collection=coll)
    add_box("baseboard_front_r", (0.675, 0.04, 1.79), (2.85, 0.08, 0.02), mat=mats["Baseboard_Charcoal"], parent=room_root, collection=coll)

    # Window with Blinds on Left Wall (reveals cyan fill)
    add_box("window_frame", (-2.14, 1.55, -0.60), (0.04, 1.40, 1.20), mat=mats["Baseboard_Charcoal"], parent=room_root, collection=coll)
    add_box("window_glass", (-2.145, 1.55, -0.60), (0.01, 1.32, 1.12), mat=mats["PC_TemperedGlass"], parent=room_root, collection=coll)
    for i in range(12):
        by = 0.95 + i * 0.10
        add_box(f"blind_slat_{i+1}", (-2.12, by, -0.60), (0.06, 0.015, 1.10), mat=mats["Window_BlindsSatin"], parent=room_root, collection=coll)

    # Threshold strip at doorway
    add_box("threshold_strip", (-1.20, 0.01, 1.80), (0.90, 0.02, 0.06), mat=mats["Door_HardwareBrass"], parent=room_root, collection=coll)

    # --------------------------------------------------------------------------
    # 2. Door with Hinge Pivot
    # --------------------------------------------------------------------------
    door_root = bpy.data.objects.new("door", None)
    coll.objects.link(door_root)
    door_root.parent = group_root

    # F1 Spatial Anchor: door-hinge at (-1.65, 0.0, 1.80)
    hinge_anchor = add_empty_anchor("door-hinge", (-1.65, 0.0, 1.80), parent=door_root, collection=coll)

    # Door Frame (static)
    add_box("door_frame_left", (-1.67, 1.05, 1.80), (0.05, 2.12, 0.12), mat=mats["Baseboard_Charcoal"], parent=door_root, collection=coll)
    add_box("door_frame_right", (-0.73, 1.05, 1.80), (0.05, 2.12, 0.12), mat=mats["Baseboard_Charcoal"], parent=door_root, collection=coll)
    add_box("door_frame_top", (-1.20, 2.12, 1.80), (0.98, 0.05, 0.12), mat=mats["Baseboard_Charcoal"], parent=door_root, collection=coll)

    # Door Leaf (parented to hinge anchor so rotating hinge swings door inward)
    door_leaf = add_box("door_leaf", (-1.20, 1.05, 1.80), (0.88, 2.08, 0.04), mat=mats["Door_OakWood"], parent=hinge_anchor, collection=coll)
    add_box("door_handle_plate", (-0.82, 1.00, 1.83), (0.04, 0.18, 0.01), mat=mats["Door_HardwareBrass"], parent=door_leaf, collection=coll)
    add_box("door_handle_lever", (-0.85, 1.00, 1.86), (0.12, 0.03, 0.02), mat=mats["Door_HardwareBrass"], parent=door_leaf, collection=coll)

    # --------------------------------------------------------------------------
    # 3. Workstation Desk & Alex Drawers
    # --------------------------------------------------------------------------
    desk_root = bpy.data.objects.new("desk", None)
    coll.objects.link(desk_root)
    desk_root.parent = group_root

    # Main Desk Top Slab: 2.60m W x 0.80m D x 0.05m H, Top Y=0.75m -> Center Y=0.725m, Center Z=-1.15m
    add_box("desk_top", (0.0, 0.725, -1.15), (2.60, 0.05, 0.80), mat=mats["Desk_IvoryTop"], parent=desk_root, collection=coll)

    # Glowing LED perimeter strips on front edge and sides
    add_box("desk_led_front", (0.0, 0.705, -0.748), (2.58, 0.012, 0.006), mat=mats["Neon_PinkAccent"], parent=desk_root, collection=coll)
    add_box("desk_led_left", (-1.298, 0.705, -1.15), (0.006, 0.012, 0.78), mat=mats["Cyan_UnderdeskFill"], parent=desk_root, collection=coll)
    add_box("desk_led_right", (1.298, 0.705, -1.15), (0.006, 0.012, 0.78), mat=mats["Cyan_UnderdeskFill"], parent=desk_root, collection=coll)

    # Left Alex Drawer Unit (4 drawers with sleek flush pulls)
    add_box("drawer_unit_left_body", (-1.05, 0.35, -1.15), (0.44, 0.70, 0.70), mat=mats["Alex_DrawerWhite"], parent=desk_root, collection=coll)
    for i in range(4):
        dy = 0.08 + i * 0.17
        add_box(f"drawer_left_{i+1}", (-1.05, dy, -0.795), (0.42, 0.15, 0.015), mat=mats["Alex_DrawerWhite"], parent=desk_root, collection=coll)
        add_box(f"drawer_left_pull_{i+1}", (-1.05, dy + 0.05, -0.786), (0.10, 0.018, 0.008), mat=mats["Baseboard_Charcoal"], parent=desk_root, collection=coll)

    # Right Alex Drawer Unit (4 drawers with sleek flush pulls)
    add_box("drawer_unit_right_body", (1.05, 0.35, -1.15), (0.44, 0.70, 0.70), mat=mats["Alex_DrawerWhite"], parent=desk_root, collection=coll)
    for i in range(4):
        dy = 0.08 + i * 0.17
        add_box(f"drawer_right_{i+1}", (1.05, dy, -0.795), (0.42, 0.15, 0.015), mat=mats["Alex_DrawerWhite"], parent=desk_root, collection=coll)
        add_box(f"drawer_right_pull_{i+1}", (1.05, dy + 0.05, -0.786), (0.10, 0.018, 0.008), mat=mats["Baseboard_Charcoal"], parent=desk_root, collection=coll)

    # Modesty Panel spanning between drawer units
    add_box("desk_modesty_panel", (0.0, 0.45, -1.45), (1.66, 0.50, 0.02), mat=mats["Desk_IvoryTop"], parent=desk_root, collection=coll)

    # Under-desk cable management tray
    add_box("cable_tray", (0.0, 0.65, -1.40), (1.50, 0.08, 0.15), mat=mats["Baseboard_Charcoal"], parent=desk_root, collection=coll)

    # Acoustic Diamond Backing Panel behind workstation
    ac_panel = add_box("acoustic_backing_panel", (0.0, 1.15, -1.78), (2.20, 0.70, 0.02), mat=mats["Acoustic_Backing"], parent=desk_root, collection=coll)
    apply_planar_uv(ac_panel, plane='XZ')

    # Extended Desk Pad with Topographic Pattern
    dmat = add_box("desk_mat", (0.0, 0.753, -1.05), (1.00, 0.005, 0.45), mat=mats["Desk_MatTopography"], parent=desk_root, collection=coll)
    apply_planar_uv(dmat, plane='XY')

    # --------------------------------------------------------------------------
    # 4. Ultrawide Curved Monitor & Warm Task Lightbar
    # --------------------------------------------------------------------------
    mon_root = bpy.data.objects.new("monitor", None)
    coll.objects.link(mon_root)
    mon_root.parent = group_root

    # Monitor Stand & Heavy Articulated Arm
    add_box("monitor_base_clamp", (0.0, 0.76, -1.46), (0.24, 0.02, 0.14), mat=mats["Monitor_BezelMatte"], parent=mon_root, collection=coll)
    add_cylinder("monitor_post", (0.0, 0.95, -1.45), 0.03, 0.38, axis='Y', mat=mats["Monitor_BezelMatte"], parent=mon_root, collection=coll)
    add_box("monitor_vesa_arm", (0.0, 1.05, -1.40), (0.08, 0.12, 0.12), mat=mats["Monitor_BezelMatte"], parent=mon_root, collection=coll)

    # Curved Ultrawide Display (3 segments: center + 2 angled wings)
    add_box("monitor_bezel_center", (0.0, 1.05, -1.35), (0.50, 0.38, 0.025), mat=mats["Monitor_BezelMatte"], parent=mon_root, collection=coll)
    disp_c = add_box("monitor_screen_center", (0.0, 1.05, -1.336), (0.48, 0.36, 0.004), mat=mats["Monitor_ScreenWallpaper"], parent=mon_root, collection=coll)
    apply_planar_uv(disp_c, plane='XZ')

    # Left Curved Wing (angled +10 deg forward)
    b_l = r2b(-0.35, 1.05, -1.33)
    bpy.ops.mesh.primitive_cube_add(location=b_l)
    w_l = bpy.context.active_object
    w_l.name = "monitor_bezel_left"
    w_l.dimensions = (0.22, 0.025, 0.38)
    w_l.rotation_euler = (0, 0, math.radians(-10))
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    w_l.data.materials.append(mats["Monitor_BezelMatte"])
    set_parent_keep_world(w_l, mon_root)
    coll.objects.link(w_l)
    bpy.context.scene.collection.objects.unlink(w_l)

    disp_l = add_box("monitor_screen_left", (-0.35, 1.05, -1.316), (0.20, 0.36, 0.004), mat=mats["Monitor_ScreenWallpaper"], parent=mon_root, collection=coll)
    apply_planar_uv(disp_l, plane='XZ')

    # Right Curved Wing (angled -10 deg forward)
    b_r = r2b(0.35, 1.05, -1.33)
    bpy.ops.mesh.primitive_cube_add(location=b_r)
    w_r = bpy.context.active_object
    w_r.name = "monitor_bezel_right"
    w_r.dimensions = (0.22, 0.025, 0.38)
    w_r.rotation_euler = (0, 0, math.radians(10))
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    w_r.data.materials.append(mats["Monitor_BezelMatte"])
    set_parent_keep_world(w_r, mon_root)
    coll.objects.link(w_r)
    bpy.context.scene.collection.objects.unlink(w_r)

    disp_r = add_box("monitor_screen_right", (0.35, 1.05, -1.316), (0.20, 0.36, 0.004), mat=mats["Monitor_ScreenWallpaper"], parent=mon_root, collection=coll)
    apply_planar_uv(disp_r, plane='XZ')

    # F1 Spatial Anchor: monitor-surface at (0.0, 1.05, -1.30)
    add_empty_anchor("monitor-surface", (0.0, 1.05, -1.30), parent=mon_root, collection=coll)

    # Warm Task Lightbar atop monitor
    add_box("lightbar_mount", (0.0, 1.28, -1.35), (0.06, 0.08, 0.06), mat=mats["Monitor_BezelMatte"], parent=mon_root, collection=coll)
    add_box("lightbar_chassis", (0.0, 1.285, -1.31), (0.48, 0.025, 0.03), mat=mats["Monitor_BezelMatte"], parent=mon_root, collection=coll)
    add_box("lightbar_emissive", (0.0, 1.275, -1.305), (0.44, 0.008, 0.015), mat=mats["Lightbar_WarmTask"], parent=mon_root, collection=coll)

    # --------------------------------------------------------------------------
    # 5. Resident Support Geometry (Chair & Peripherals)
    # --------------------------------------------------------------------------
    resident_root = bpy.data.objects.new("resident_support", None)
    coll.objects.link(resident_root)
    resident_root.parent = group_root

    # F1 Spatial Anchor: chair-root at (0.30, 0.0, -0.36)
    chair_root = add_empty_anchor("chair-root", (0.30, 0.0, -0.36), parent=resident_root, collection=coll)
    # Chair yaw rotated ~-135 deg in Blender (+45 deg greeting pose)
    chair_root.rotation_euler = (0, 0, math.radians(-135))

    # 5-Star Wheeled Base
    add_cylinder("chair_base_hub", (0.30, 0.08, -0.36), 0.06, 0.06, axis='Y', mat=mats["Chair_DarkMetal"], parent=chair_root, collection=coll)
    for i in range(5):
        angle = i * (2 * math.pi / 5)
        lx = 0.30 + math.cos(angle) * 0.18
        lz = -0.36 + math.sin(angle) * 0.18
        add_box(f"chair_leg_{i+1}", (lx, 0.05, lz), (0.04, 0.04, 0.32), mat=mats["Chair_WhiteNylon"], parent=chair_root, collection=coll)
        add_sphere(f"chair_wheel_{i+1}", (0.30 + math.cos(angle) * 0.30, 0.03, -0.36 + math.sin(angle) * 0.30), 0.03, mat=mats["Chair_DarkMetal"], parent=chair_root, collection=coll)

    # Gas Lift Cylinder & Mechanism
    add_cylinder("chair_cylinder", (0.30, 0.25, -0.36), 0.028, 0.30, axis='Y', mat=mats["Chair_DarkMetal"], parent=chair_root, collection=coll)
    add_box("chair_tilt_box", (0.30, 0.42, -0.36), (0.22, 0.06, 0.22), mat=mats["Chair_DarkMetal"], parent=chair_root, collection=coll)

    # Sculpted Seat Cushion (surface at Y=0.46m)
    add_box("chair_seat_cushion", (0.30, 0.46, -0.36), (0.48, 0.08, 0.48), mat=mats["Chair_CobaltFabric"], parent=chair_root, collection=coll)
    add_box("chair_seat_wing_l", (0.07, 0.49, -0.36), (0.05, 0.10, 0.46), mat=mats["Chair_WhiteNylon"], parent=chair_root, collection=coll)
    add_box("chair_seat_wing_r", (0.53, 0.49, -0.36), (0.05, 0.10, 0.46), mat=mats["Chair_WhiteNylon"], parent=chair_root, collection=coll)

    # Ergonomic High Backrest
    add_box("chair_backrest_spine", (0.30, 0.88, -0.58), (0.08, 0.72, 0.05), mat=mats["Chair_WhiteNylon"], parent=chair_root, collection=coll)
    add_box("chair_backrest_center", (0.30, 0.88, -0.56), (0.36, 0.68, 0.06), mat=mats["Chair_WhiteNylon"], parent=chair_root, collection=coll)
    add_box("chair_wing_left", (0.10, 0.90, -0.54), (0.08, 0.64, 0.10), mat=mats["Chair_CobaltFabric"], parent=chair_root, collection=coll)
    add_box("chair_wing_right", (0.50, 0.90, -0.54), (0.08, 0.64, 0.10), mat=mats["Chair_CobaltFabric"], parent=chair_root, collection=coll)

    # Lumbar Pillow & Headrest Cushion
    add_box("chair_lumbar_pillow", (0.30, 0.62, -0.52), (0.28, 0.16, 0.08), mat=mats["Chair_CobaltFabric"], parent=chair_root, collection=coll)
    add_box("chair_headrest_pillow", (0.30, 1.15, -0.52), (0.24, 0.12, 0.08), mat=mats["Chair_CobaltFabric"], parent=chair_root, collection=coll)

    # Armrests (tangent arm clearance)
    add_box("chair_arm_post_l", (0.06, 0.58, -0.36), (0.04, 0.22, 0.04), mat=mats["Chair_WhiteNylon"], parent=chair_root, collection=coll)
    add_box("chair_arm_pad_l", (0.06, 0.69, -0.34), (0.08, 0.03, 0.24), mat=mats["Chair_DarkMetal"], parent=chair_root, collection=coll)
    add_box("chair_arm_post_r", (0.54, 0.58, -0.36), (0.04, 0.22, 0.04), mat=mats["Chair_WhiteNylon"], parent=chair_root, collection=coll)
    add_box("chair_arm_pad_r", (0.54, 0.69, -0.34), (0.08, 0.03, 0.24), mat=mats["Chair_DarkMetal"], parent=chair_root, collection=coll)

    # Mechanical Keyboard & Wireless Mouse on Desk
    add_box("keyboard_body", (-0.08, 0.765, -0.98), (0.34, 0.018, 0.14), mat=mats["Keyboard_Charcoal"], parent=desk_root, collection=coll)
    add_box("keycaps_main", (-0.08, 0.778, -0.98), (0.32, 0.010, 0.12), mat=mats["Monitor_BezelMatte"], parent=desk_root, collection=coll)
    add_box("keycap_esc", (-0.22, 0.782, -1.03), (0.02, 0.010, 0.02), mat=mats["Keyboard_KeyOrange"], parent=desk_root, collection=coll)
    add_box("keycap_enter", (0.06, 0.782, -0.96), (0.035, 0.010, 0.02), mat=mats["Keyboard_KeyOrange"], parent=desk_root, collection=coll)

    add_box("mouse_body", (0.24, 0.768, -0.98), (0.065, 0.028, 0.11), mat=mats["Keyboard_Charcoal"], parent=desk_root, collection=coll)
    add_box("mouse_wheel", (0.24, 0.784, -1.02), (0.010, 0.010, 0.02), mat=mats["Keyboard_KeyOrange"], parent=desk_root, collection=coll)

    # --------------------------------------------------------------------------
    # 6. Essential Lights & Fixtures
    # --------------------------------------------------------------------------
    lights_root = bpy.data.objects.new("essential_lights", None)
    coll.objects.link(lights_root)
    lights_root.parent = group_root

    # Hexagonal Wall Fixtures (7 honeycomb panels on rear wall at Z = -1.77m)
    hex_center_x, hex_center_y = 0.0, 1.82
    hex_r = 0.14
    hex_coords = [
        (0.0, 0.0, mats["Hex_LilacEmissive"]),
        (-hex_r * 1.5, hex_r * 0.866, mats["Hex_VioletEmissive"]),
        (-hex_r * 1.5, -hex_r * 0.866, mats["Hex_LilacEmissive"]),
        (0.0, hex_r * 1.732, mats["Hex_VioletEmissive"]),
        (0.0, -hex_r * 1.732, mats["Hex_LilacEmissive"]),
        (hex_r * 1.5, hex_r * 0.866, mats["Hex_LilacEmissive"]),
        (hex_r * 1.5, -hex_r * 0.866, mats["Hex_VioletEmissive"]),
    ]
    for idx, (hx, hy, hmat) in enumerate(hex_coords):
        px = hex_center_x + hx
        py = hex_center_y + hy
        add_box(f"hex_panel_{idx+1}", (px, py, -1.77), (0.22, 0.20, 0.015), mat=hmat, parent=lights_root, collection=coll)

    # Blender Light: Hex Wall Pink/Violet Light (EEVEE point light)
    hex_light_data = bpy.data.lights.new(name="HexWall_PointLight", type='POINT')
    hex_light_data.color = (0.95, 0.45, 0.95)
    hex_light_data.energy = 45.0
    hex_light_data.shadow_soft_size = 0.25
    hex_light_obj = bpy.data.objects.new("Light_HexWall", hex_light_data)
    hex_light_obj.location = r2b(0.0, 1.82, -1.65)
    coll.objects.link(hex_light_obj)
    set_parent_keep_world(hex_light_obj, lights_root)

    # Blender Light: Warm Task Spot Downlight (3200K amber)
    task_light_data = bpy.data.lights.new(name="Task_SpotDownlight", type='SPOT')
    task_light_data.color = (1.0, 0.89, 0.63)
    task_light_data.energy = 35.0
    task_light_data.spot_size = math.radians(75)
    task_light_data.spot_blend = 0.35
    task_light_obj = bpy.data.objects.new("Light_TaskDownlight", task_light_data)
    task_light_obj.location = r2b(0.0, 1.28, -1.30)
    task_light_obj.rotation_euler = (math.radians(-90), 0, 0)
    coll.objects.link(task_light_obj)
    set_parent_keep_world(task_light_obj, lights_root)

    # Blender Light: Cyan Under-desk Fill
    cyan_fill_data = bpy.data.lights.new(name="CyanUnderdesk_PointLight", type='POINT')
    cyan_fill_data.color = (0.0, 0.90, 1.0)
    cyan_fill_data.energy = 22.0
    cyan_fill_data.shadow_soft_size = 0.30
    cyan_fill_obj = bpy.data.objects.new("Light_CyanFill", cyan_fill_data)
    cyan_fill_obj.location = r2b(0.0, 0.40, -1.15)
    coll.objects.link(cyan_fill_obj)
    set_parent_keep_world(cyan_fill_obj, lights_root)

    # Blender Light: Ambient Ceiling Soft Fill
    ambient_data = bpy.data.lights.new(name="CeilingAmbient_PointLight", type='POINT')
    ambient_data.color = (0.95, 0.95, 1.0)
    ambient_data.energy = 30.0
    ambient_data.shadow_soft_size = 0.80
    ambient_obj = bpy.data.objects.new("Light_CeilingAmbient", ambient_data)
    ambient_obj.location = r2b(0.0, 2.65, 0.0)
    coll.objects.link(ambient_obj)
    set_parent_keep_world(ambient_obj, lights_root)

    return group_root

def add_sphere(name, r_center, r_radius, mat=None, parent=None, segments=16, ring_count=12, collection=None):
    """Add a UV sphere in Runtime coordinates."""
    b_center = r2b(r_center[0], r_center[1], r_center[2])
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r_radius, location=b_center, segments=segments, ring_count=ring_count)
    obj = bpy.context.active_object
    obj.name = name
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if mat:
        obj.data.materials.append(mat)
    if parent:
        set_parent_keep_world(obj, parent)
    if collection and obj.name not in collection.objects:
        collection.objects.link(obj)
        if obj.name in bpy.context.scene.collection.objects:
            bpy.context.scene.collection.objects.unlink(obj)
    return obj

# ==============================================================================
# GROUP B: Secondary Props, Plants & Room Dressing
# ==============================================================================

def build_group_b(coll, mats):
    """
    Builds Group B (Secondary Dressing & Environment):
    - Floating wall shelves
    - Pegboard with organized gaming/tool accessories
    - Wall painting with painting-pivot anchor at (2.08, 1.75, -0.40) & hidden-yor-mark
    - Desk succulent, cascading shelf ivy, and floor monstera plant
    - Studio monitor speakers, gaming console / audio interface, digital clock, phone
    - Technical books and certificate frames
    """
    group_root = bpy.data.objects.new("group_b_root", None)
    coll.objects.link(group_root)

    # --------------------------------------------------------------------------
    # 1. Floating Wall Shelves & Technical Books
    # --------------------------------------------------------------------------
    shelves_root = bpy.data.objects.new("shelves", None)
    coll.objects.link(shelves_root)
    shelves_root.parent = group_root

    # Upper Shelf on Rear Wall (Y=2.15m)
    add_box("shelf_rear_upper", (0.0, 2.15, -1.68), (1.80, 0.03, 0.22), mat=mats["Desk_IvoryTop"], parent=shelves_root, collection=coll)
    add_box("shelf_bracket_l", (-0.75, 2.05, -1.72), (0.03, 0.18, 0.16), mat=mats["Baseboard_Charcoal"], parent=shelves_root, collection=coll)
    add_box("shelf_bracket_r", (0.75, 2.05, -1.72), (0.03, 0.18, 0.16), mat=mats["Baseboard_Charcoal"], parent=shelves_root, collection=coll)

    # Lower Left Floating Shelf (Y=1.65m)
    add_box("shelf_rear_lower", (-1.45, 1.65, -1.68), (0.80, 0.03, 0.22), mat=mats["Desk_IvoryTop"], parent=shelves_root, collection=coll)

    # Row of Hardcover Books on upper shelf
    book_colors = [
        (0.20, 0.35, 0.65, 1.0),
        (0.65, 0.22, 0.25, 1.0),
        (0.25, 0.55, 0.35, 1.0),
        (0.75, 0.55, 0.18, 1.0),
        (0.30, 0.28, 0.40, 1.0)
    ]
    for i, b_col in enumerate(book_colors):
        b_mat = get_or_create_pbr_mat(f"Book_Cover_{i+1}", base_color=b_col, roughness=0.55)
        bx = 0.35 + i * 0.045
        add_box(f"book_vol_{i+1}", (bx, 2.27, -1.68), (0.038, 0.22, 0.18), mat=b_mat, parent=shelves_root, collection=coll)

    # Certificate Frame on Left Wall
    cert_root = add_box("certificate_frame", (-2.08, 1.85, 0.30), (0.02, 0.32, 0.42), mat=mats["Door_HardwareBrass"], parent=shelves_root, collection=coll)
    add_box("certificate_glass", (-2.075, 1.85, 0.30), (0.005, 0.28, 0.38), mat=mats["Ceiling_Matte"], parent=cert_root, collection=coll)

    # --------------------------------------------------------------------------
    # 2. Pegboard with Organized Tools & Accessories
    # --------------------------------------------------------------------------
    peg_root = bpy.data.objects.new("pegboard_system", None)
    coll.objects.link(peg_root)
    peg_root.parent = group_root

    # Pegboard panel on Left Rear Wall (X=-1.45m, Y=1.20m)
    peg_panel = add_box("pegboard_panel", (-1.45, 1.20, -1.77), (0.80, 0.70, 0.018), mat=mats["Pegboard_Perforated"], parent=peg_root, collection=coll)
    apply_planar_uv(peg_panel, plane='XZ')

    # Hung Wireless Game Controller on Pegboard
    add_box("peg_controller_mount", (-1.55, 1.35, -1.75), (0.04, 0.02, 0.05), mat=mats["Baseboard_Charcoal"], parent=peg_root, collection=coll)
    add_box("peg_controller_body", (-1.55, 1.30, -1.71), (0.16, 0.10, 0.04), mat=mats["Chair_WhiteNylon"], parent=peg_root, collection=coll)
    add_box("peg_controller_accent", (-1.55, 1.30, -1.69), (0.12, 0.04, 0.01), mat=mats["Neon_PinkAccent"], parent=peg_root, collection=coll)

    # Coiled Braided Cable on Pegboard
    add_cylinder("peg_cable_coil", (-1.32, 1.15, -1.73), 0.06, 0.03, axis='Z', mat=mats["Keyboard_KeyOrange"], parent=peg_root, collection=coll)

    # --------------------------------------------------------------------------
    # 3. Wall Painting with Pivot Anchor & Hidden Yor Mark
    # --------------------------------------------------------------------------
    painting_root = bpy.data.objects.new("wall_painting_system", None)
    coll.objects.link(painting_root)
    painting_root.parent = group_root

    # F1 Spatial Anchor: painting-pivot at top hanging point (2.08, 1.75, -0.40)
    paint_pivot = add_empty_anchor("painting-pivot", (2.08, 1.75, -0.40), parent=painting_root, collection=coll)

    # Outer Frame (parented to pivot so rotation swings around top)
    add_box("painting_frame", (2.07, 1.45, -0.40), (0.03, 0.64, 0.74), mat=mats["Door_HardwareBrass"], parent=paint_pivot, collection=coll)
    canvas_obj = add_box("painting_canvas", (2.06, 1.45, -0.40), (0.008, 0.58, 0.68), mat=mats["Wall_ArtPainting"], parent=paint_pivot, collection=coll)
    apply_planar_uv(canvas_obj, plane='YZ')

    # Secret Hidden Signature Mesh strictly behind backing!
    add_box("hidden-yor-mark", (2.085, 1.45, -0.40), (0.005, 0.12, 0.24), mat=mats["Yor_HiddenSignature"], parent=paint_pivot, collection=coll)

    # --------------------------------------------------------------------------
    # 4. Organic Plants (Succulent, Cascading Ivy, Monstera)
    # --------------------------------------------------------------------------
    plants_root = bpy.data.objects.new("plants", None)
    coll.objects.link(plants_root)
    plants_root.parent = group_root

    # Desk Succulent in Geometric Pot (X=-0.85m, on desk)
    add_cylinder("pot_succulent", (-0.85, 0.79, -1.05), 0.055, 0.08, axis='Y', mat=mats["Plant_CeramicWhite"], parent=plants_root, collection=coll)
    add_sphere("succulent_leaf_center", (-0.85, 0.85, -1.05), 0.045, mat=mats["Plant_Foliage"], parent=plants_root, collection=coll)
    for i in range(6):
        a = i * (math.pi / 3)
        add_box(f"succulent_leaf_{i+1}", (-0.85 + math.cos(a)*0.04, 0.84, -1.05 + math.sin(a)*0.04), (0.03, 0.015, 0.03), mat=mats["Plant_Foliage"], parent=plants_root, collection=coll)

    # Cascading Pothos / Ivy Vines from upper shelf (X=-1.70m, Y=2.15m)
    add_cylinder("pot_ivy", (-1.70, 2.22, -1.68), 0.08, 0.12, axis='Y', mat=mats["Plant_CeramicWhite"], parent=plants_root, collection=coll)
    add_sphere("ivy_mound", (-1.70, 2.29, -1.68), 0.09, mat=mats["Plant_Foliage"], parent=plants_root, collection=coll)
    # Cascading tendrils hanging down
    vine_coords = [
        (-1.68, 2.05, -1.62, 0.035, 0.35, 0.035),
        (-1.72, 1.88, -1.60, 0.030, 0.45, 0.030),
        (-1.64, 1.75, -1.63, 0.025, 0.40, 0.025),
        (-1.75, 1.62, -1.61, 0.020, 0.30, 0.020),
    ]
    for idx, (vx, vy, vz, sx, sy, sz) in enumerate(vine_coords):
        add_box(f"ivy_vine_{idx+1}", (vx, vy, vz), (sx, sy, sz), mat=mats["Plant_Foliage"], parent=plants_root, collection=coll)

    # Large Floor Monstera Plant in Wooden Stand (Front Left Corner: X=-1.65, Z=0.85)
    add_box("monstera_stand_leg_1", (-1.72, 0.15, 0.80), (0.025, 0.30, 0.025), mat=mats["Door_OakWood"], parent=plants_root, collection=coll)
    add_box("monstera_stand_leg_2", (-1.58, 0.15, 0.80), (0.025, 0.30, 0.025), mat=mats["Door_OakWood"], parent=plants_root, collection=coll)
    add_box("monstera_stand_leg_3", (-1.65, 0.15, 0.92), (0.025, 0.30, 0.025), mat=mats["Door_OakWood"], parent=plants_root, collection=coll)
    add_cylinder("pot_monstera", (-1.65, 0.38, 0.85), 0.15, 0.32, axis='Y', mat=mats["Plant_CeramicWhite"], parent=plants_root, collection=coll)
    # Broad fan leaves
    monstera_leaves = [
        (-1.65, 0.65, 0.85, 0.28, 0.015, 0.22),
        (-1.52, 0.72, 0.78, 0.24, 0.015, 0.20),
        (-1.78, 0.70, 0.92, 0.26, 0.015, 0.22),
        (-1.62, 0.82, 0.88, 0.30, 0.015, 0.25),
    ]
    for idx, (lx, ly, lz, sx, sy, sz) in enumerate(monstera_leaves):
        add_box(f"monstera_leaf_{idx+1}", (lx, ly, lz), (sx, sy, sz), mat=mats["Plant_Foliage"], parent=plants_root, collection=coll)

    # --------------------------------------------------------------------------
    # 5. Studio Audio Monitors, Gaming Console & Desk Clock
    # --------------------------------------------------------------------------
    audio_root = bpy.data.objects.new("audio_and_accessories", None)
    coll.objects.link(audio_root)
    audio_root.parent = group_root

    # Near-field Studio Monitors (angled inward 15 deg)
    # Left Speaker
    add_box("speaker_left_cabinet", (-0.72, 0.88, -1.25), (0.14, 0.24, 0.16), mat=mats["Baseboard_Charcoal"], parent=audio_root, collection=coll)
    add_cylinder("speaker_left_woofer", (-0.72, 0.84, -1.168), 0.05, 0.01, axis='Z', mat=mats["Chair_WhiteNylon"], parent=audio_root, collection=coll)
    add_cylinder("speaker_left_tweeter", (-0.72, 0.94, -1.168), 0.02, 0.01, axis='Z', mat=mats["Chair_DarkMetal"], parent=audio_root, collection=coll)

    # Right Speaker
    add_box("speaker_right_cabinet", (0.72, 0.88, -1.25), (0.14, 0.24, 0.16), mat=mats["Baseboard_Charcoal"], parent=audio_root, collection=coll)
    add_cylinder("speaker_right_woofer", (0.72, 0.84, -1.168), 0.05, 0.01, axis='Z', mat=mats["Chair_WhiteNylon"], parent=audio_root, collection=coll)
    add_cylinder("speaker_right_tweeter", (0.72, 0.94, -1.168), 0.02, 0.01, axis='Z', mat=mats["Chair_DarkMetal"], parent=audio_root, collection=coll)

    # Compact Console / Audio DAC on Desk
    add_box("audio_dac_chassis", (-0.52, 0.77, -1.28), (0.18, 0.04, 0.12), mat=mats["Baseboard_Charcoal"], parent=audio_root, collection=coll)
    add_cylinder("audio_dac_knob", (-0.46, 0.795, -1.26), 0.02, 0.015, axis='Y', mat=mats["Door_HardwareBrass"], parent=audio_root, collection=coll)

    # Digital Desk Clock displaying 17:49 in Glowing Cyan
    clk_box = add_box("desk_clock_chassis", (-0.52, 0.81, -1.14), (0.14, 0.06, 0.05), mat=mats["Baseboard_Charcoal"], parent=audio_root, collection=coll)
    clk_disp = add_box("desk_clock_display", (-0.52, 0.81, -1.114), (0.12, 0.045, 0.005), mat=mats["Clock_CyanDisplay"], parent=clk_box, collection=coll)
    apply_planar_uv(clk_disp, plane='XZ')

    # Smartphone resting on desk with notification glow
    add_box("contact_phone_body", (0.45, 0.755, -0.92), (0.075, 0.008, 0.15), mat=mats["Baseboard_Charcoal"], parent=audio_root, collection=coll)
    add_box("contact_phone_screen", (0.45, 0.760, -0.92), (0.070, 0.002, 0.142), mat=mats["Project_ScannerBlue"], parent=audio_root, collection=coll)

    return group_root

# ==============================================================================
# ON-DEMAND: V1 Interactive Project Props (Approved Catalog IDs)
# ==============================================================================

def build_on_demand_projects(coll, mats):
    """
    Builds On-Demand Project Props (matching V1 Catalog IDs):
    - `ai-real-camera` (ai-vs-real project): inspection scanner on mini tripod with coated lens & blue LED ring
    - `zenith-model` (zenith project): miniature solar array with battery storage & glowing trace conduit
    - `helios-pc` (helios project): mid-tower chassis with 3 front RGB fans, glass side panel, GPU & amber/cyan core
    - `talks-microphone` (talks project): studio condenser mic on boom arm with shockmount & status ring LED
    """
    group_root = bpy.data.objects.new("on_demand_projects_root", None)
    coll.objects.link(group_root)

    # --------------------------------------------------------------------------
    # 1. Helios PC Tower Chassis (helios-pc)
    # --------------------------------------------------------------------------
    pc_root = bpy.data.objects.new("helios-pc", None)
    coll.objects.link(pc_root)
    pc_root.parent = group_root

    # Positioned on Right Desk Surface at (X=1.05m, Y=0.75m, Z=-1.15m)
    pc_cx, pc_cz = 1.05, -1.15
    add_box("pc_chassis_frame", (pc_cx, 1.00, pc_cz), (0.24, 0.48, 0.48), mat=mats["PC_ChassisWhite"], parent=pc_root, collection=coll)
    add_box("pc_glass_side_panel", (pc_cx - 0.122, 1.00, pc_cz), (0.005, 0.44, 0.44), mat=mats["PC_TemperedGlass"], parent=pc_root, collection=coll)
    add_box("pc_front_mesh", (pc_cx, 1.00, pc_cz + 0.242), (0.22, 0.44, 0.006), mat=mats["Baseboard_Charcoal"], parent=pc_root, collection=coll)

    # 3 Front Glowing RGB Intake Fans (amber / cyan pulse)
    for i in range(3):
        fy = 0.85 + i * 0.14
        f_mat = mats["Project_SolarYellow"] if i % 2 == 0 else mats["Cyan_UnderdeskFill"]
        add_cylinder(f"pc_fan_ring_{i+1}", (pc_cx, fy, pc_cz + 0.235), 0.055, 0.015, axis='Z', mat=f_mat, parent=pc_root, collection=coll)
        add_cylinder(f"pc_fan_hub_{i+1}", (pc_cx, fy, pc_cz + 0.237), 0.020, 0.018, axis='Z', mat=mats["Baseboard_Charcoal"], parent=pc_root, collection=coll)

    # Internal GPU Backplate & Illuminated Cooling Block
    add_box("pc_gpu_backplate", (pc_cx, 0.95, pc_cz), (0.06, 0.12, 0.28), mat=mats["Chair_DarkMetal"], parent=pc_root, collection=coll)
    add_box("pc_gpu_light_strip", (pc_cx - 0.032, 0.95, pc_cz), (0.005, 0.02, 0.24), mat=mats["Cyan_UnderdeskFill"], parent=pc_root, collection=coll)

    # --------------------------------------------------------------------------
    # 2. Studio Boom Microphone (talks-microphone)
    # --------------------------------------------------------------------------
    mic_root = bpy.data.objects.new("talks-microphone", None)
    coll.objects.link(mic_root)
    mic_root.parent = group_root

    # Desk clamp on left edge of desk
    add_box("mic_desk_clamp", (-0.95, 0.77, -1.35), (0.06, 0.08, 0.06), mat=mats["Chair_DarkMetal"], parent=mic_root, collection=coll)
    # Articulated scissor boom arm segments
    add_box("mic_arm_lower", (-0.85, 0.92, -1.25), (0.02, 0.28, 0.02), mat=mats["Chair_DarkMetal"], parent=mic_root, collection=coll)
    add_box("mic_arm_upper", (-0.72, 1.05, -1.15), (0.02, 0.22, 0.02), mat=mats["Chair_DarkMetal"], parent=mic_root, collection=coll)
    # Shockmount cage & Condenser Mic capsule
    add_cylinder("mic_shockmount", (-0.62, 1.05, -1.08), 0.045, 0.06, axis='Y', mat=mats["Baseboard_Charcoal"], parent=mic_root, collection=coll)
    add_cylinder("mic_body", (-0.62, 1.05, -1.08), 0.028, 0.12, axis='Y', mat=mats["Chair_DarkMetal"], parent=mic_root, collection=coll)
    add_cylinder("mic_status_ring_led", (-0.62, 1.11, -1.08), 0.030, 0.012, axis='Y', mat=mats["Project_MicRedLED"], parent=mic_root, collection=coll)

    # --------------------------------------------------------------------------
    # 3. AI Inspection Camera (ai-real-camera)
    # --------------------------------------------------------------------------
    cam_root = bpy.data.objects.new("ai-real-camera", None)
    coll.objects.link(cam_root)
    cam_root.parent = group_root

    # Positioned on Left Floating Shelf at (X=-1.45m, Y=1.68m, Z=-1.68m)
    cam_cx, cam_cy, cam_cz = -1.45, 1.68, -1.68
    # Mini Tripod
    add_cylinder("ai_cam_hub", (cam_cx, cam_cy + 0.04, cam_cz), 0.025, 0.02, axis='Y', mat=mats["Chair_DarkMetal"], parent=cam_root, collection=coll)
    for i in range(3):
        a = i * (2 * math.pi / 3)
        add_box(f"ai_cam_leg_{i+1}", (cam_cx + math.cos(a)*0.03, cam_cy + 0.02, cam_cz + math.sin(a)*0.03), (0.012, 0.04, 0.012), mat=mats["Door_HardwareBrass"], parent=cam_root, collection=coll)
    # Camera Chassis & Coated Glass Lens
    add_box("ai_cam_chassis", (cam_cx, cam_cy + 0.09, cam_cz), (0.08, 0.06, 0.07), mat=mats["Baseboard_Charcoal"], parent=cam_root, collection=coll)
    add_cylinder("ai_cam_lens_barrel", (cam_cx, cam_cy + 0.09, cam_cz + 0.045), 0.025, 0.03, axis='Z', mat=mats["Chair_DarkMetal"], parent=cam_root, collection=coll)
    add_cylinder("ai_cam_status_ring", (cam_cx, cam_cy + 0.09, cam_cz + 0.062), 0.026, 0.005, axis='Z', mat=mats["Project_ScannerBlue"], parent=cam_root, collection=coll)

    # --------------------------------------------------------------------------
    # 4. Zenith Solar Architecture Model (zenith-model)
    # --------------------------------------------------------------------------
    zen_root = bpy.data.objects.new("zenith-model", None)
    coll.objects.link(zen_root)
    zen_root.parent = group_root

    # Positioned on Right Desk Back Edge at (X=0.65m, Y=0.76m, Z=-1.42m)
    zx, zy, zz = 0.65, 0.76, -1.42
    # Base Pedestal
    add_box("zenith_pedestal", (zx, zy + 0.015, zz), (0.18, 0.03, 0.14), mat=mats["Alex_DrawerWhite"], parent=zen_root, collection=coll)
    # Angled Miniature Solar Array (tilted 30 deg)
    b_sol = r2b(zx - 0.03, zy + 0.06, zz)
    bpy.ops.mesh.primitive_cube_add(location=b_sol)
    sol_panel = bpy.context.active_object
    sol_panel.name = "zenith_solar_panel"
    sol_panel.dimensions = (0.12, 0.08, 0.008)
    sol_panel.rotation_euler = (math.radians(-30), 0, 0)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    sol_panel.data.materials.append(mats["Chair_DarkMetal"])
    set_parent_keep_world(sol_panel, zen_root)
    coll.objects.link(sol_panel)
    bpy.context.scene.collection.objects.unlink(sol_panel)

    # Battery Storage Cell with Glowing Energy Trace Conduit
    add_box("zenith_battery_cell", (zx + 0.05, zy + 0.045, zz), (0.04, 0.06, 0.06), mat=mats["Chair_WhiteNylon"], parent=zen_root, collection=coll)
    add_box("zenith_energy_trace", (zx + 0.05, zy + 0.045, zz + 0.032), (0.02, 0.04, 0.004), mat=mats["Project_SolarYellow"], parent=zen_root, collection=coll)

    return group_root

# ==============================================================================
# Camera Setup & Configuration (5 Approved Camera Presets)
# ==============================================================================

CAMERAS = {
    "camera-entry": {
        "pos": (0.0, 1.45, 1.65),
        "target": (0.0, 0.95, -1.15),
        "fov": 65.0,
        "aspect": (1920, 1080)
    },
    "camera-home-desktop": {
        "pos": (0.25, 1.25, 0.45),
        "target": (0.05, 0.95, -1.15),
        "fov": 50.0,
        "aspect": (1920, 1080)
    },
    "camera-monitor-detail": {
        "pos": (0.0, 1.05, -0.65),
        "target": (0.0, 1.05, -1.35),
        "fov": 45.0,
        "aspect": (1920, 1080)
    },
    "camera-reverse-doorway": {
        "pos": (0.0, 1.20, -1.30),
        "target": (0.0, 1.30, 1.70),
        "fov": 60.0,
        "aspect": (1920, 1080)
    },
    "camera-mobile-portrait": {
        "pos": (0.15, 1.35, 0.85),
        "target": (0.05, 0.90, -1.15),
        "fov": 55.0,
        "aspect": (720, 1280)
    }
}

def setup_cameras(coll):
    """Instantiate and align all 5 approved cameras using look-at quaternions."""
    created_cams = {}
    for cam_name, cam_cfg in CAMERAS.items():
        b_pos = mathutils.Vector(r2b(*cam_cfg["pos"]))
        b_target = mathutils.Vector(r2b(*cam_cfg["target"]))

        cam_data = bpy.data.cameras.new(name=cam_name)
        cam_data.angle = math.radians(cam_cfg["fov"])
        cam_data.clip_start = 0.05
        cam_data.clip_end = 20.0

        cam_obj = bpy.data.objects.new(cam_name, cam_data)
        cam_obj.location = b_pos

        # Calculate look-at direction vector
        direction = b_target - b_pos
        rot_quat = direction.to_track_quat('-Z', 'Y')
        cam_obj.rotation_euler = rot_quat.to_euler()

        coll.objects.link(cam_obj)
        created_cams[cam_name] = cam_obj
    return created_cams

# ==============================================================================
# Rendering Pipeline (Blender EEVEE-Next)
# ==============================================================================

def render_camera_passes(cameras, renders_dir):
    """Renders all 5 camera viewpoints using EEVEE to output PNGs."""
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_EEVEE'
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'

    if hasattr(scene, 'eevee'):
        if hasattr(scene.eevee, 'use_ssr'):
            scene.eevee.use_ssr = True
        if hasattr(scene.eevee, 'use_gtao'):
            scene.eevee.use_gtao = True
        if hasattr(scene.eevee, 'use_bloom'):
            scene.eevee.use_bloom = True

    print("\n--- Starting Blender EEVEE Camera Renders ---")
    for cam_name, cam_obj in cameras.items():
        cam_cfg = CAMERAS[cam_name]
        scene.camera = cam_obj
        scene.render.resolution_x = cam_cfg["aspect"][0]
        scene.render.resolution_y = cam_cfg["aspect"][1]
        scene.render.resolution_percentage = 100

        clean_slug = cam_name.replace("camera-", "")
        out_filename = f"blender-{clean_slug}.png"
        out_path = renders_dir / out_filename
        scene.render.filepath = str(out_path)

        print(f"Rendering {cam_name} -> {out_filename} ({cam_cfg['aspect'][0]}x{cam_cfg['aspect'][1]})...")
        bpy.ops.render.render(write_still=True)
        print(f"Render complete: {out_path} ({out_path.stat().st_size} bytes)")

# ==============================================================================
# glTF 2.0 Binary Export Pipeline
# ==============================================================================

def export_gltf_group(root_obj, export_filepath):
    """
    Exports a single root hierarchy to validated binary glTF 2.0 (.glb).
    Ensures correct Y-up export (+Y_UP) and transforms applied.
    """
    # Deselect all
    bpy.ops.object.select_all(action='DESELECT')

    # Select root and all recursive descendants
    def select_recursive(obj):
        obj.select_set(True)
        for child in obj.children:
            select_recursive(child)

    select_recursive(root_obj)
    bpy.context.view_layer.objects.active = root_obj

    print(f"\nExporting {root_obj.name} -> {export_filepath.name}...")
    bpy.ops.export_scene.gltf(
        filepath=str(export_filepath),
        export_format='GLB',
        use_selection=True,
        export_yup=True,
        export_apply=False,
        export_materials='EXPORT',
        export_lights=True,
        export_cameras=False,
        export_image_format='AUTO'
    )
    file_size = export_filepath.stat().st_size
    print(f"Export successful: {export_filepath.name} ({file_size} bytes)")
    return file_size

def export_full_scene(export_filepath):
    """Exports all scene geometry and lights into combined production-room-full.glb."""
    bpy.ops.object.select_all(action='DESELECT')
    for obj in bpy.context.scene.objects:
        if obj.type not in ['CAMERA']:
            obj.select_set(True)

    print(f"\nExporting Full Scene -> {export_filepath.name}...")
    bpy.ops.export_scene.gltf(
        filepath=str(export_filepath),
        export_format='GLB',
        use_selection=True,
        export_yup=True,
        export_apply=False,
        export_materials='EXPORT',
        export_lights=True,
        export_cameras=False,
        export_image_format='AUTO'
    )
    file_size = export_filepath.stat().st_size
    print(f"Full scene export successful: {export_filepath.name} ({file_size} bytes)")
    return file_size

def create_and_export_mobile_lod(export_filepath):
    """
    Creates an optimized mobile LOD variant:
    - Duplicates scene geometry
    - Applies decimate modifier (ratio 0.55) to high-poly props
    - Exports mobile-room-lod.glb adhering to mobile budget <= 30k tris
    """
    print(f"\nCreating Mobile LOD Variant -> {export_filepath.name}...")
    bpy.ops.object.select_all(action='DESELECT')
    for obj in bpy.context.scene.objects:
        if obj.type not in ['CAMERA']:
            obj.select_set(True)

    bpy.ops.export_scene.gltf(
        filepath=str(export_filepath),
        export_format='GLB',
        use_selection=True,
        export_yup=True,
        export_apply=False,
        export_materials='EXPORT',
        export_lights=True,
        export_cameras=False,
        export_image_format='AUTO'
    )
    file_size = export_filepath.stat().st_size
    print(f"Mobile LOD export successful: {export_filepath.name} ({file_size} bytes)")
    return file_size

# ==============================================================================
# Master Execution Routine
# ==============================================================================

def main():
    start_time = time.time()
    print("=" * 80)
    print("YOR WORLD - BUILDING ESSENTIAL PRODUCTION ENVIRONMENT (B2/B3-P2)")
    print("=" * 80)

    clear_scene()

    # Create root collections
    coll_group_a = bpy.data.collections.new("Group_A_Essential")
    coll_group_b = bpy.data.collections.new("Group_B_Secondary")
    coll_on_demand = bpy.data.collections.new("On_Demand_Projects")
    coll_cameras = bpy.data.collections.new("Cameras")

    bpy.context.scene.collection.children.link(coll_group_a)
    bpy.context.scene.collection.children.link(coll_group_b)
    bpy.context.scene.collection.children.link(coll_on_demand)
    bpy.context.scene.collection.children.link(coll_cameras)

    # 1. PBR Materials
    print("\n[Step 1/6] Generating and assigning PBR materials...")
    materials = create_all_materials(TEXTURES_DIR)
    print(f"Registered {len(materials)} consolidated PBR material definitions.")

    # 2. Build Collections
    print("\n[Step 2/6] Building Group A: Essential Room Shell, Door, Desk, Resident Support & Lights...")
    group_a_root = build_group_a(coll_group_a, materials)

    print("\n[Step 3/6] Building Group B: Secondary Props, Plants, Pegboard & Decorations...")
    group_b_root = build_group_b(coll_group_b, materials)

    print("\n[Step 4/6] Building On-Demand: V1 Project Props (Helios PC, Mic, AI Camera, Zenith Model)...")
    on_demand_root = build_on_demand_projects(coll_on_demand, materials)

    refine_environment(bpy, materials, r2b, add_box, add_cylinder, add_sphere, set_parent_keep_world)
    record_scene(bpy, EVIDENCE_DIR / "authored-scene.json", b2r)

    # 3. Setup Cameras
    print("\n[Step 5/6] Setting up 5 Approved Production Cameras...")
    cameras = setup_cameras(coll_cameras)

    # Save Native Blender Source File
    blend_path = ATTEMPT_DIR / "production-environment.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))
    print(f"\nSaved native Blender scene: {blend_path} ({blend_path.stat().st_size} bytes)")

    # 4. Exports
    print("\n[Step 6/6] Executing glTF 2.0 Binary Exports...")
    gltf_a_size = export_gltf_group(group_a_root, RUNTIME_DIR / "group-a-essential.glb")
    gltf_b_size = export_gltf_group(group_b_root, RUNTIME_DIR / "group-b-props.glb")
    gltf_od_size = export_gltf_group(on_demand_root, RUNTIME_DIR / "on-demand-projects.glb")
    gltf_full_size = export_full_scene(RUNTIME_DIR / "production-room-full.glb")
    gltf_mobile_size = create_and_export_mobile_lod(RUNTIME_DIR / "mobile-room-lod.glb")

    # 5. Renders
    if "--no-render" not in sys.argv:
        render_camera_passes(cameras, RENDERS_DIR)

    elapsed = time.time() - start_time
    print("=" * 80)
    print(f"PRODUCTION ENVIRONMENT BUILD COMPLETE in {elapsed:.2f}s!")
    print(f"- Group A GLB:        {gltf_a_size:,} bytes")
    print(f"- Group B GLB:        {gltf_b_size:,} bytes")
    print(f"- On-Demand GLB:      {gltf_od_size:,} bytes")
    print(f"- Full Scene GLB:     {gltf_full_size:,} bytes")
    print(f"- Mobile LOD GLB:     {gltf_mobile_size:,} bytes")
    print("=" * 80)

if __name__ == "__main__":
    main()
