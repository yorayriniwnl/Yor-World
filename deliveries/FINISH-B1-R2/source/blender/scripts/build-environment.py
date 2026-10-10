"""
YOR WORLD - Reference-Faithful Production Environment Generator (FINISH-B1-R2)
Author: Gemini #2 (World / Art Maker)
Authority: Milestone FINISH-B1-R2 Work Order & Product Specification Revision 2
Primary Visual Authority: references/images/main-reference.png

Preserves F1 Invariants:
- Room Shell: 4.2m width x 3.6m depth x 2.8m height, runtime meters, Y-up
- Rear wall: Z = -1.8m, Front doorway wall: Z = +1.8m
- Desk: 2.60m x 0.80m, top surface height 0.75m, center X/Z = (0, -1.15)
- Chair mount: (0.30, 0.0, -0.36) [fixture.glb exclusively owns chair-root]
- Door hinge pivot: (-1.65, 0.0, 1.80), local Door_Leaf at (+0.45, 1.05, 0.0) -> closed center (-1.20, 1.05, 1.80)
- Monitor surface anchor: (0.0, 1.05, -1.30)
- Painting pivot anchor: (2.08, 1.75, -0.40), hidden-yor-mark sibling at (2.085, 1.45, -0.40)

FINISH-B1-R2 Contract Compliance:
1. Conforming node hierarchy under Room_Root; literal uppercase nodes matching contract table.
2. Door_Hinge at (-1.65, 0.0, 1.80) with Door_Leaf child at local (+0.45, 1.05, 0.0); zero door mixer clips exported.
3. Calibrated lighting & emissives to eliminate overexposure (<5% white clipping).
4. Room.glb exports single complete environment with all 25 base catalog props.
5. Group-B props and On-Demand project effects exported to separate optional GLBs.
"""

import bpy
import mathutils
import math
import os
import sys
import json
import time
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
DELIVERY_DIR = SCRIPT_DIR.parent
TEXTURES_DIR = DELIVERY_DIR / "assets" / "textures"
RUNTIME_DIR = DELIVERY_DIR / "assets"
SOURCE_DIR = RUNTIME_DIR / "source"
BLENDER_MODELS_DIR = DELIVERY_DIR / "source" / "blender" / "models"
BLENDER_SCRIPTS_DIR = DELIVERY_DIR / "source" / "blender" / "scripts"
RENDERS_DIR = DELIVERY_DIR / "captures"
LOGS_DIR = DELIVERY_DIR / "validator-logs"

RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
SOURCE_DIR.mkdir(parents=True, exist_ok=True)
BLENDER_MODELS_DIR.mkdir(parents=True, exist_ok=True)
BLENDER_SCRIPTS_DIR.mkdir(parents=True, exist_ok=True)
LOGS_DIR.mkdir(parents=True, exist_ok=True)
for cam_slug in ["desktop-home", "mobile-home", "entry", "monitor-detail", "reverse-doorway", "comparisons"]:
    (RENDERS_DIR / cam_slug).mkdir(parents=True, exist_ok=True)

# Coordinate Transformation Helpers
def r2b(rx, ry, rz):
    """Runtime (Y-up, -Z rear) to Blender (Z-up, +Y rear)."""
    return (float(rx), -float(rz), float(ry))

def b2r(bx, by, bz):
    """Blender to Runtime."""
    return (float(bx), float(bz), -float(by))

def clear_scene():
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
    for block in list(bpy.data.actions):
        bpy.data.actions.remove(block, do_unlink=True)

_MAT_CACHE = {}

def get_or_create_pbr_mat(name, base_color=(0.80, 0.80, 0.82, 1.0), roughness=0.5, metallic=0.0,
                          specular=0.5, emission_color=None, emission_strength=1.0,
                          transmission=0.0, ior=1.45, image_path=None):
    if name in _MAT_CACHE:
        return _MAT_CACHE[name]

    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links

    bsdf = nodes.get("Principled BSDF")
    if not bsdf:
        for n in nodes:
            if n.type == "BSDF_PRINCIPLED":
                bsdf = n
                break

    if image_path and os.path.exists(image_path):
        img_node = nodes.new(type="ShaderNodeTexImage")
        img = bpy.data.images.load(str(image_path), check_existing=True)
        img_node.image = img

        if "Base Color" in bsdf.inputs:
            links.new(img_node.outputs["Color"], bsdf.inputs["Base Color"])

        if emission_color:
            if "Emission Color" in bsdf.inputs:
                links.new(img_node.outputs["Color"], bsdf.inputs["Emission Color"])
            elif "Emission" in bsdf.inputs:
                links.new(img_node.outputs["Color"], bsdf.inputs["Emission"])
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
    m = {}

    # 1. Architectural: Deep Blue Carpet & Soft Lavender Walls (calibrated non-clipping tones)
    m["Floor_Slate"] = get_or_create_pbr_mat(
        "Floor_Slate",
        base_color=(0.10, 0.14, 0.32, 1.0),
        roughness=0.75, metallic=0.0,
        image_path=textures_dir / "floor-carpet-blue.png"
    )
    m["Ceiling_Matte"] = get_or_create_pbr_mat(
        "Ceiling_Matte",
        base_color=(0.82, 0.82, 0.84, 1.0),
        roughness=0.88, metallic=0.0
    )
    m["Wall_SoftLavender"] = get_or_create_pbr_mat(
        "Wall_SoftLavender",
        base_color=(0.80, 0.79, 0.84, 1.0),
        roughness=0.78, metallic=0.0
    )
    m["Baseboard_Charcoal"] = get_or_create_pbr_mat(
        "Baseboard_Charcoal",
        base_color=(0.16, 0.16, 0.20, 1.0),
        roughness=0.45, metallic=0.1
    )
    m["Door_OakWood"] = get_or_create_pbr_mat(
        "Door_OakWood",
        base_color=(0.80, 0.76, 0.72, 1.0),
        roughness=0.52, metallic=0.02
    )
    m["Door_HardwareBrass"] = get_or_create_pbr_mat(
        "Door_HardwareBrass",
        base_color=(0.85, 0.72, 0.35, 1.0),
        roughness=0.28, metallic=0.85
    )
    m["Window_BlindsSatin"] = get_or_create_pbr_mat(
        "Window_BlindsSatin",
        base_color=(0.84, 0.84, 0.86, 1.0),
        roughness=0.40, metallic=0.05
    )

    # 2. Workstation & Furniture
    m["Desk_IvoryTop"] = get_or_create_pbr_mat(
        "Desk_IvoryTop",
        base_color=(0.84, 0.84, 0.86, 1.0),
        roughness=0.25, metallic=0.0
    )
    m["Alex_DrawerWhite"] = get_or_create_pbr_mat(
        "Alex_DrawerWhite",
        base_color=(0.84, 0.84, 0.86, 1.0),
        roughness=0.30, metallic=0.0
    )
    m["Desk_MatTopography"] = get_or_create_pbr_mat(
        "Desk_MatTopography",
        base_color=(0.84, 0.84, 0.86, 1.0),
        roughness=0.80, metallic=0.0,
        image_path=textures_dir / "desk-mat-pattern.png"
    )
    m["Acoustic_Backing"] = get_or_create_pbr_mat(
        "Acoustic_Backing",
        base_color=(0.82, 0.80, 0.86, 1.0),
        roughness=0.75, metallic=0.0,
        image_path=textures_dir / "acoustic-panel.png"
    )

    # 3. Chair Materials
    m["Chair_CobaltFabric"] = get_or_create_pbr_mat(
        "Chair_CobaltFabric",
        base_color=(0.08, 0.24, 0.72, 1.0),
        roughness=0.45, metallic=0.0
    )
    m["Chair_WhiteNylon"] = get_or_create_pbr_mat(
        "Chair_WhiteNylon",
        base_color=(0.84, 0.84, 0.86, 1.0),
        roughness=0.30, metallic=0.0
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
        base_color=(0.85, 0.85, 0.90, 1.0),
        roughness=0.15, metallic=0.0,
        emission_color=(0.85, 0.85, 0.90, 1.0),
        emission_strength=1.2,
        image_path=textures_dir / "monitor-wallpaper.png"
    )
    m["Keyboard_Charcoal"] = get_or_create_pbr_mat(
        "Keyboard_Charcoal",
        base_color=(0.14, 0.14, 0.16, 1.0),
        roughness=0.45, metallic=0.10
    )
    m["Keyboard_KeyOrange"] = get_or_create_pbr_mat(
        "Keyboard_KeyOrange",
        base_color=(0.92, 0.45, 0.12, 1.0),
        roughness=0.40, metallic=0.0
    )
    m["Clock_CyanDisplay"] = get_or_create_pbr_mat(
        "Clock_CyanDisplay",
        base_color=(0.0, 0.92, 1.0, 1.0),
        roughness=0.20, metallic=0.0,
        emission_color=(0.0, 0.92, 1.0, 1.0),
        emission_strength=1.5,
        image_path=textures_dir / "clock-display.png"
    )
    m["PC_ChassisWhite"] = get_or_create_pbr_mat(
        "PC_ChassisWhite",
        base_color=(0.84, 0.84, 0.86, 1.0),
        roughness=0.25, metallic=0.10
    )
    m["PC_TemperedGlass"] = get_or_create_pbr_mat(
        "PC_TemperedGlass",
        base_color=(0.95, 0.95, 1.0, 0.35),
        roughness=0.08, metallic=0.05,
        transmission=0.92, ior=1.52
    )

    # 5. Emissive Lights & Reference Accents (Calibrated to resolve B1-R3 overexposure)
    m["Hex_LilacEmissive"] = get_or_create_pbr_mat(
        "Hex_LilacEmissive",
        base_color=(0.94, 0.60, 0.94, 1.0),
        roughness=0.15, metallic=0.0,
        emission_color=(0.94, 0.60, 0.94, 1.0),
        emission_strength=2.0
    )
    m["Hex_VioletEmissive"] = get_or_create_pbr_mat(
        "Hex_VioletEmissive",
        base_color=(0.78, 0.58, 0.96, 1.0),
        roughness=0.15, metallic=0.0,
        emission_color=(0.78, 0.58, 0.96, 1.0),
        emission_strength=1.8
    )
    m["Cyan_UnderdeskFill"] = get_or_create_pbr_mat(
        "Cyan_UnderdeskFill",
        base_color=(0.0, 0.90, 1.0, 1.0),
        roughness=0.20, metallic=0.0,
        emission_color=(0.0, 0.90, 1.0, 1.0),
        emission_strength=1.5
    )
    m["Lightbar_WarmTask"] = get_or_create_pbr_mat(
        "Lightbar_WarmTask",
        base_color=(1.0, 0.86, 0.65, 1.0),
        roughness=0.20, metallic=0.0,
        emission_color=(1.0, 0.86, 0.65, 1.0),
        emission_strength=2.0
    )
    m["Neon_PinkAccent"] = get_or_create_pbr_mat(
        "Neon_PinkAccent",
        base_color=(0.98, 0.22, 0.78, 1.0),
        roughness=0.18, metallic=0.0,
        emission_color=(0.98, 0.22, 0.78, 1.0),
        emission_strength=2.0
    )

    # 6. Pegboard, Art, Plants
    m["Pegboard_Perforated"] = get_or_create_pbr_mat(
        "Pegboard_Perforated",
        base_color=(0.84, 0.84, 0.86, 1.0),
        roughness=0.40, metallic=0.02,
        image_path=textures_dir / "pegboard-pattern.png"
    )
    m["Plant_Foliage"] = get_or_create_pbr_mat(
        "Plant_Foliage",
        base_color=(0.16, 0.52, 0.22, 1.0),
        roughness=0.35, metallic=0.0
    )
    m["Plant_CeramicWhite"] = get_or_create_pbr_mat(
        "Plant_CeramicWhite",
        base_color=(0.84, 0.84, 0.86, 1.0),
        roughness=0.20, metallic=0.0
    )
    m["Wall_ArtPainting"] = get_or_create_pbr_mat(
        "Wall_ArtPainting",
        base_color=(1.0, 1.0, 1.0, 1.0),
        roughness=0.45, metallic=0.05,
        image_path=textures_dir / "wall-painting.png"
    )
    m["Yor_HiddenSignature"] = get_or_create_pbr_mat(
        "Yor_HiddenSignature",
        base_color=(1.0, 0.82, 0.22, 1.0),
        roughness=0.25, metallic=0.40,
        emission_color=(1.0, 0.82, 0.22, 1.0),
        emission_strength=1.5
    )

    # 7. Project Specific Materials
    m["Project_ScannerBlue"] = get_or_create_pbr_mat(
        "Project_ScannerBlue",
        base_color=(0.0, 0.72, 0.90, 1.0),
        roughness=0.20, metallic=0.10,
        emission_color=(0.0, 0.72, 0.90, 1.0),
        emission_strength=1.5
    )
    m["Project_SolarYellow"] = get_or_create_pbr_mat(
        "Project_SolarYellow",
        base_color=(1.0, 0.90, 0.0, 1.0),
        roughness=0.25, metallic=0.10,
        emission_color=(1.0, 0.90, 0.0, 1.0),
        emission_strength=1.5
    )
    m["Project_MicRedLED"] = get_or_create_pbr_mat(
        "Project_MicRedLED",
        base_color=(0.92, 0.20, 0.25, 1.0),
        roughness=0.20, metallic=0.0,
        emission_color=(0.92, 0.20, 0.25, 1.0),
        emission_strength=1.5
    )

    return m

# Primitive Geometry Helpers
def add_box(name, r_center, r_dims, mat=None, parent=None, collection=None):
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
        obj.parent = parent
        # Maintain local offset relative to parent
        obj.matrix_parent_inverse = parent.matrix_world.inverted()
    if collection and obj.name not in collection.objects:
        collection.objects.link(obj)
        if obj.name in bpy.context.scene.collection.objects:
            bpy.context.scene.collection.objects.unlink(obj)
    return obj

def add_cylinder(name, r_center, r_radius, r_height, axis='Y', mat=None, parent=None, vertices=24, collection=None):
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
        obj.matrix_parent_inverse = parent.matrix_world.inverted()
    if collection and obj.name not in collection.objects:
        collection.objects.link(obj)
        if obj.name in bpy.context.scene.collection.objects:
            bpy.context.scene.collection.objects.unlink(obj)
    return obj

def add_hexagon(name, r_center, r_radius, r_depth, mat=None, parent=None, collection=None):
    b_center = r2b(r_center[0], r_center[1], r_center[2])
    b_rot = (math.radians(90), 0, math.radians(30))
    bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=r_radius, depth=r_depth, location=b_center, rotation=b_rot)
    obj = bpy.context.active_object
    obj.name = name
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if mat:
        obj.data.materials.append(mat)
    if parent:
        obj.parent = parent
        obj.matrix_parent_inverse = parent.matrix_world.inverted()
    if collection and obj.name not in collection.objects:
        collection.objects.link(obj)
        if obj.name in bpy.context.scene.collection.objects:
            bpy.context.scene.collection.objects.unlink(obj)
    return obj

def add_sphere(name, r_center, r_radius, mat=None, parent=None, segments=16, ring_count=12, collection=None):
    b_center = r2b(r_center[0], r_center[1], r_center[2])
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r_radius, location=b_center, segments=segments, ring_count=ring_count)
    obj = bpy.context.active_object
    obj.name = name
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if mat:
        obj.data.materials.append(mat)
    if parent:
        obj.parent = parent
        obj.matrix_parent_inverse = parent.matrix_world.inverted()
    if collection and obj.name not in collection.objects:
        collection.objects.link(obj)
        if obj.name in bpy.context.scene.collection.objects:
            bpy.context.scene.collection.objects.unlink(obj)
    return obj

def add_empty_anchor(name, r_location, parent=None, collection=None):
    b_pos = r2b(r_location[0], r_location[1], r_location[2])
    empty = bpy.data.objects.new(name, None)
    empty.empty_display_type = 'ARROWS'
    empty.empty_display_size = 0.25
    empty.location = b_pos
    target_coll = collection or bpy.context.scene.collection
    target_coll.objects.link(empty)
    if parent:
        empty.parent = parent
        empty.matrix_parent_inverse = parent.matrix_world.inverted()
    return empty

def apply_planar_uv(obj, plane='XZ'):
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
# ROOM: Single Complete Environment owning all Base Catalog Objects (room.glb)
# ==============================================================================

def build_room_environment(coll, mats):
    # Root container: Room_Root with identity transform
    room_root = bpy.data.objects.new("Room_Root", None)
    coll.objects.link(room_root)

    # 1. Room Shell & Architecture
    shell_root = bpy.data.objects.new("room-shell", None)
    coll.objects.link(shell_root)
    shell_root.parent = room_root

    # Floor & Hallway Extension with Blue Carpet texture
    fl = add_box("floor_main", (0.0, -0.05, 0.0), (4.20, 0.10, 3.60), mat=mats["Floor_Slate"], parent=shell_root, collection=coll)
    apply_planar_uv(fl, plane='XY')
    fl_h = add_box("floor_hallway", (-1.20, -0.05, 2.30), (1.10, 0.10, 1.00), mat=mats["Floor_Slate"], parent=shell_root, collection=coll)
    apply_planar_uv(fl_h, plane='XY')

    # Ceiling
    add_box("ceiling_main", (0.0, 2.85, 0.0), (4.20, 0.10, 3.60), mat=mats["Ceiling_Matte"], parent=shell_root, collection=coll)
    add_box("ceiling_hallway", (-1.20, 2.85, 2.30), (1.10, 0.10, 1.00), mat=mats["Ceiling_Matte"], parent=shell_root, collection=coll)

    # Walls (F1 dimensions)
    add_box("wall_rear", (0.0, 1.40, -1.85), (4.20, 2.80, 0.10), mat=mats["Wall_SoftLavender"], parent=shell_root, collection=coll)
    add_box("wall_left", (-2.15, 1.40, 0.0), (0.10, 2.80, 3.60), mat=mats["Wall_SoftLavender"], parent=shell_root, collection=coll)
    add_box("wall_right", (2.15, 1.40, 0.0), (0.10, 2.80, 3.60), mat=mats["Wall_SoftLavender"], parent=shell_root, collection=coll)

    # Front Wall with Door Cutout
    add_box("wall_front_left", (-1.875, 1.40, 1.85), (0.45, 2.80, 0.10), mat=mats["Wall_SoftLavender"], parent=shell_root, collection=coll)
    add_box("wall_front_right", (0.675, 1.40, 1.85), (2.85, 2.80, 0.10), mat=mats["Wall_SoftLavender"], parent=shell_root, collection=coll)
    add_box("wall_front_header", (-1.20, 2.45, 1.85), (0.90, 0.70, 0.10), mat=mats["Wall_SoftLavender"], parent=shell_root, collection=coll)

    # Hallway Passage
    add_box("wall_hallway_l", (-1.75, 1.40, 2.30), (0.10, 2.80, 1.00), mat=mats["Wall_SoftLavender"], parent=shell_root, collection=coll)
    add_box("wall_hallway_r", (-0.65, 1.40, 2.30), (0.10, 2.80, 1.00), mat=mats["Wall_SoftLavender"], parent=shell_root, collection=coll)
    add_box("wall_hallway_b", (-1.20, 1.40, 2.85), (1.10, 2.80, 0.10), mat=mats["Wall_SoftLavender"], parent=shell_root, collection=coll)

    # Baseboards
    add_box("baseboard_rear", (0.0, 0.04, -1.79), (4.18, 0.08, 0.02), mat=mats["Baseboard_Charcoal"], parent=shell_root, collection=coll)
    add_box("baseboard_left", (-2.09, 0.04, 0.0), (0.02, 0.08, 3.58), mat=mats["Baseboard_Charcoal"], parent=shell_root, collection=coll)
    add_box("baseboard_right", (2.09, 0.04, 0.0), (0.02, 0.08, 3.58), mat=mats["Baseboard_Charcoal"], parent=shell_root, collection=coll)
    add_box("baseboard_front_r", (0.675, 0.04, 1.79), (2.85, 0.08, 0.02), mat=mats["Baseboard_Charcoal"], parent=shell_root, collection=coll)

    # Window with 12 Rotatable Blinds on Left Wall (window-blinds catalog row)
    add_box("window_frame", (-2.14, 1.55, -0.60), (0.04, 1.40, 1.20), mat=mats["Baseboard_Charcoal"], parent=shell_root, collection=coll)
    add_box("window_glass", (-2.145, 1.55, -0.60), (0.01, 1.32, 1.12), mat=mats["PC_TemperedGlass"], parent=shell_root, collection=coll)
    for i in range(12):
        by = 0.95 + i * 0.10
        add_box(f"blind_slat_{i+1}", (-2.12, by, -0.60), (0.06, 0.015, 1.10), mat=mats["Window_BlindsSatin"], parent=shell_root, collection=coll)

    # 2. Door Hierarchy (FINISH-B1-R2 Exact Tree: Room_Root/door/{Door_Frame, Door_Hinge/Door_Leaf})
    door_group = bpy.data.objects.new("door", None)
    coll.objects.link(door_group)
    door_group.parent = room_root

    # Static Door Frame (Sibling of Door_Hinge under door)
    door_frame = bpy.data.objects.new("Door_Frame", None)
    coll.objects.link(door_frame)
    door_frame.parent = door_group

    add_box("door_frame_left", (-1.67, 1.05, 1.80), (0.05, 2.12, 0.12), mat=mats["Baseboard_Charcoal"], parent=door_frame, collection=coll)
    add_box("door_frame_right", (-0.73, 1.05, 1.80), (0.05, 2.12, 0.12), mat=mats["Baseboard_Charcoal"], parent=door_frame, collection=coll)
    add_box("door_frame_top", (-1.20, 2.12, 1.80), (0.98, 0.05, 0.12), mat=mats["Baseboard_Charcoal"], parent=door_frame, collection=coll)
    add_box("threshold_strip", (-1.20, 0.01, 1.80), (0.90, 0.02, 0.06), mat=mats["Door_HardwareBrass"], parent=door_frame, collection=coll)

    # Moving Door Hinge (Rest T = (-1.65, 0.0, 1.80), identity quat/scale)
    # Sole transform owner is EntranceCoordinator; zero mixer clips exported in room.glb.
    door_hinge = bpy.data.objects.new("Door_Hinge", None)
    door_hinge.empty_display_type = 'ARROWS'
    door_hinge.empty_display_size = 0.20
    door_hinge.location = r2b(-1.65, 0.0, 1.80)
    coll.objects.link(door_hinge)
    door_hinge.parent = door_group

    # Door Leaf (Child of Door_Hinge at local T = (+0.45, 1.05, 0.0), panel dims 0.88 x 2.08 x 0.04m)
    # Closed evaluated world center is (-1.20, 1.05, 1.80).
    b_leaf_local = (0.45, 0.0, 1.05)
    bpy.ops.mesh.primitive_cube_add(location=(0, 0, 0))
    door_leaf = bpy.context.active_object
    door_leaf.name = "Door_Leaf"
    door_leaf.dimensions = (0.88, 0.04, 2.08) # Blender dims: X, Y, Z
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    door_leaf.data.materials.append(mats["Door_OakWood"])
    door_leaf.parent = door_hinge
    door_leaf.location = b_leaf_local
    coll.objects.link(door_leaf)
    bpy.context.scene.collection.objects.unlink(door_leaf)

    # Handles parented directly to Door_Leaf
    b_plate_local = (0.38, -0.025, -0.05)
    bpy.ops.mesh.primitive_cube_add(location=(0, 0, 0))
    h_plate = bpy.context.active_object
    h_plate.name = "door_handle_plate"
    h_plate.dimensions = (0.04, 0.01, 0.18)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    h_plate.data.materials.append(mats["Door_HardwareBrass"])
    h_plate.parent = door_leaf
    h_plate.location = b_plate_local
    coll.objects.link(h_plate)
    bpy.context.scene.collection.objects.unlink(h_plate)

    b_lever_local = (0.35, -0.045, -0.05)
    bpy.ops.mesh.primitive_cube_add(location=(0, 0, 0))
    h_lever = bpy.context.active_object
    h_lever.name = "door_handle_lever"
    h_lever.dimensions = (0.12, 0.02, 0.03)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    h_lever.data.materials.append(mats["Door_HardwareBrass"])
    h_lever.parent = door_leaf
    h_lever.location = b_lever_local
    coll.objects.link(h_lever)
    bpy.context.scene.collection.objects.unlink(h_lever)

    # 3. Workstation Desk & Alex Drawers
    desk_root = bpy.data.objects.new("desk", None)
    coll.objects.link(desk_root)
    desk_root.parent = room_root

    # Desk Top: 2.60m x 0.80m, height 0.75m
    add_box("desk_top", (0.0, 0.725, -1.15), (2.60, 0.05, 0.80), mat=mats["Desk_IvoryTop"], parent=desk_root, collection=coll)

    # Front Glowing Edge Strip & Side Lighting
    add_box("desk_led_strip", (0.0, 0.705, -0.748), (2.58, 0.014, 0.008), mat=mats["Neon_PinkAccent"], parent=desk_root, collection=coll)
    add_box("desk_led_left", (-1.298, 0.705, -1.15), (0.006, 0.012, 0.78), mat=mats["Cyan_UnderdeskFill"], parent=desk_root, collection=coll)
    add_box("desk_led_right", (1.298, 0.705, -1.15), (0.006, 0.012, 0.78), mat=mats["Cyan_UnderdeskFill"], parent=desk_root, collection=coll)

    # Left Alex Drawer Unit (4 drawers with pill pulls)
    add_box("drawer_unit_left_body", (-1.05, 0.35, -1.15), (0.44, 0.70, 0.70), mat=mats["Alex_DrawerWhite"], parent=desk_root, collection=coll)
    for i in range(4):
        dy = 0.08 + i * 0.17
        add_box(f"drawer_left_{i+1}", (-1.05, dy, -0.795), (0.42, 0.15, 0.015), mat=mats["Alex_DrawerWhite"], parent=desk_root, collection=coll)
        add_box(f"drawer_left_pull_{i+1}", (-1.05, dy + 0.05, -0.786), (0.10, 0.018, 0.008), mat=mats["Baseboard_Charcoal"], parent=desk_root, collection=coll)

    # Right Alex Drawer Unit (4 drawers with pill pulls)
    add_box("drawer_unit_right_body", (1.05, 0.35, -1.15), (0.44, 0.70, 0.70), mat=mats["Alex_DrawerWhite"], parent=desk_root, collection=coll)
    for i in range(4):
        dy = 0.08 + i * 0.17
        add_box(f"drawer_right_{i+1}", (1.05, dy, -0.795), (0.42, 0.15, 0.015), mat=mats["Alex_DrawerWhite"], parent=desk_root, collection=coll)
        add_box(f"drawer_right_pull_{i+1}", (1.05, dy + 0.05, -0.786), (0.10, 0.018, 0.008), mat=mats["Baseboard_Charcoal"], parent=desk_root, collection=coll)

    # Modesty Panel & Cable Tray
    add_box("desk_modesty_panel", (0.0, 0.45, -1.45), (1.66, 0.50, 0.02), mat=mats["Desk_IvoryTop"], parent=desk_root, collection=coll)
    add_box("cable_tray", (0.0, 0.65, -1.40), (1.50, 0.08, 0.15), mat=mats["Baseboard_Charcoal"], parent=desk_root, collection=coll)

    # Acoustic Diamond Backing Panel behind monitor
    ac_panel = add_box("acoustic_backing_panel", (0.0, 1.25, -1.78), (2.20, 0.75, 0.02), mat=mats["Acoustic_Backing"], parent=desk_root, collection=coll)
    apply_planar_uv(ac_panel, plane='XZ')
    add_box("acoustic_frame_top", (0.0, 1.63, -1.77), (2.22, 0.015, 0.015), mat=mats["Neon_PinkAccent"], parent=desk_root, collection=coll)
    add_box("acoustic_frame_bottom", (0.0, 0.87, -1.77), (2.22, 0.015, 0.015), mat=mats["Cyan_UnderdeskFill"], parent=desk_root, collection=coll)

    # Extended Desk Mat
    dmat = add_box("desk_mat", (0.0, 0.753, -1.05), (1.00, 0.005, 0.45), mat=mats["Desk_MatTopography"], parent=desk_root, collection=coll)
    apply_planar_uv(dmat, plane='XY')

    # 4. Ultrawide Curved Monitor with Warm Task Lightbar
    mon_root = bpy.data.objects.new("monitor", None)
    coll.objects.link(mon_root)
    mon_root.parent = room_root

    add_box("monitor_base_clamp", (0.0, 0.76, -1.46), (0.24, 0.02, 0.14), mat=mats["Monitor_BezelMatte"], parent=mon_root, collection=coll)
    add_cylinder("monitor_post", (0.0, 0.95, -1.45), 0.03, 0.38, axis='Y', mat=mats["Monitor_BezelMatte"], parent=mon_root, collection=coll)
    add_box("monitor_vesa_arm", (0.0, 1.05, -1.40), (0.08, 0.12, 0.12), mat=mats["Monitor_BezelMatte"], parent=mon_root, collection=coll)

    # Curved Display
    add_box("monitor_bezel_center", (0.0, 1.05, -1.35), (0.50, 0.38, 0.025), mat=mats["Monitor_BezelMatte"], parent=mon_root, collection=coll)
    disp_c = add_box("monitor_screen_center", (0.0, 1.05, -1.336), (0.48, 0.36, 0.004), mat=mats["Monitor_ScreenWallpaper"], parent=mon_root, collection=coll)
    apply_planar_uv(disp_c, plane='XZ')

    # Left Curved Wing
    b_l = r2b(-0.35, 1.05, -1.33)
    bpy.ops.mesh.primitive_cube_add(location=b_l)
    w_l = bpy.context.active_object
    w_l.name = "monitor_bezel_left"
    w_l.dimensions = (0.22, 0.025, 0.38)
    w_l.rotation_euler = (0, 0, math.radians(-10))
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    w_l.data.materials.append(mats["Monitor_BezelMatte"])
    w_l.parent = mon_root
    w_l.matrix_parent_inverse = mon_root.matrix_world.inverted()
    coll.objects.link(w_l)
    bpy.context.scene.collection.objects.unlink(w_l)

    disp_l = add_box("monitor_screen_left", (-0.35, 1.05, -1.316), (0.20, 0.36, 0.004), mat=mats["Monitor_ScreenWallpaper"], parent=mon_root, collection=coll)
    apply_planar_uv(disp_l, plane='XZ')

    # Right Curved Wing
    b_r = r2b(0.35, 1.05, -1.33)
    bpy.ops.mesh.primitive_cube_add(location=b_r)
    w_r = bpy.context.active_object
    w_r.name = "monitor_bezel_right"
    w_r.dimensions = (0.22, 0.025, 0.38)
    w_r.rotation_euler = (0, 0, math.radians(10))
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    w_r.data.materials.append(mats["Monitor_BezelMatte"])
    w_r.parent = mon_root
    w_r.matrix_parent_inverse = mon_root.matrix_world.inverted()
    coll.objects.link(w_r)
    bpy.context.scene.collection.objects.unlink(w_r)

    disp_r = add_box("monitor_screen_right", (0.35, 1.05, -1.316), (0.20, 0.36, 0.004), mat=mats["Monitor_ScreenWallpaper"], parent=mon_root, collection=coll)
    apply_planar_uv(disp_r, plane='XZ')

    # Monitor Surface Anchor for DOM alignment (Catalog Row main-monitor)
    add_empty_anchor("monitor-surface", (0.0, 1.05, -1.30), parent=mon_root, collection=coll)

    # Warm Task Lightbar Mounted atop Monitor (Catalog Row desk-lamp)
    add_box("lightbar_mount", (0.0, 1.28, -1.35), (0.06, 0.08, 0.06), mat=mats["Monitor_BezelMatte"], parent=mon_root, collection=coll)
    add_box("lightbar_chassis", (0.0, 1.285, -1.31), (0.48, 0.025, 0.03), mat=mats["Monitor_BezelMatte"], parent=mon_root, collection=coll)
    add_box("lightbar_emissive", (0.0, 1.275, -1.305), (0.44, 0.008, 0.015), mat=mats["Lightbar_WarmTask"], parent=mon_root, collection=coll)

    # 5. Keyboard & Mouse (Catalog Rows keyboard, mouse)
    # Keyboard body: rest center (-0.08, 0.765, -0.98)
    add_box("keyboard_body", (-0.08, 0.765, -0.98), (0.34, 0.018, 0.14), mat=mats["Keyboard_Charcoal"], parent=desk_root, collection=coll)
    # Key Response Active Pivot at (-0.08, 0.781, -0.98)
    key_resp = add_empty_anchor("key_response_active", (-0.08, 0.781, -0.98), parent=desk_root, collection=coll)
    # Keycaps Main at local offset (0, -0.003, 0) relative to key_response_active -> intended world (-0.08, 0.778, -0.98)
    add_box("keycaps_main", (-0.08, 0.778, -0.98), (0.32, 0.010, 0.12), mat=mats["Keyboard_KeyOrange"], parent=key_resp, collection=coll)

    # Mouse Body at world (0.24, 0.768, -0.98)
    add_box("mouse_body", (0.24, 0.768, -0.98), (0.065, 0.028, 0.11), mat=mats["Chair_WhiteNylon"], parent=desk_root, collection=coll)
    add_box("mouse_wheel", (0.24, 0.784, -1.02), (0.010, 0.010, 0.02), mat=mats["Keyboard_KeyOrange"], parent=desk_root, collection=coll)

    # 6. Spatial Locator for Chair Mount (Contract: chair-mount at F1 root, NOT chair-root)
    add_empty_anchor("chair-mount", (0.30, 0.0, -0.36), parent=room_root, collection=coll)

    # 7. Essential Lights: Hexagons & Studio Lighting (Calibrated energies)
    lights_root = bpy.data.objects.new("essential_lights", None)
    coll.objects.link(lights_root)
    lights_root.parent = room_root

    # Genuine Regular 6-Sided Hexagon Panels (7 Honeycomb Units at rear wall Z=-1.77m)
    hex_center_x, hex_center_y = 0.0, 1.82
    hex_r = 0.145
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
        add_hexagon(f"hex_panel_{idx+1}", (px, py, -1.77), hex_r, 0.018, mat=hmat, parent=lights_root, collection=coll)

    # Hex Wall Pink/Violet Glow Light (energy 12.0)
    hex_light_data = bpy.data.lights.new(name="HexWall_PointLight", type='POINT')
    hex_light_data.color = (0.94, 0.58, 0.94)
    hex_light_data.energy = 12.0
    hex_light_data.shadow_soft_size = 0.30
    hex_light_obj = bpy.data.objects.new("Light_HexWall", hex_light_data)
    hex_light_obj.location = r2b(0.0, 1.82, -1.65)
    coll.objects.link(hex_light_obj)
    hex_light_obj.parent = lights_root

    # Warm Task Spot Downlight (energy 10.0)
    task_light_data = bpy.data.lights.new(name="Task_SpotDownlight", type='SPOT')
    task_light_data.color = (1.0, 0.86, 0.65)
    task_light_data.energy = 10.0
    task_light_data.spot_size = math.radians(75)
    task_light_data.spot_blend = 0.35
    task_light_obj = bpy.data.objects.new("Light_TaskDownlight", task_light_data)
    task_light_obj.location = r2b(0.0, 1.28, -1.30)
    task_light_obj.rotation_euler = (math.radians(-90), 0, 0)
    coll.objects.link(task_light_obj)
    task_light_obj.parent = lights_root

    # Cyan Under-desk Fill (energy 6.0)
    cyan_fill_data = bpy.data.lights.new(name="CyanUnderdesk_PointLight", type='POINT')
    cyan_fill_data.color = (0.0, 0.90, 1.0)
    cyan_fill_data.energy = 6.0
    cyan_fill_data.shadow_soft_size = 0.30
    cyan_fill_obj = bpy.data.objects.new("Light_CyanFill", cyan_fill_data)
    cyan_fill_obj.location = r2b(0.0, 0.40, -1.15)
    coll.objects.link(cyan_fill_obj)
    cyan_fill_obj.parent = lights_root

    # Ambient Ceiling Soft Fill (energy 8.0)
    ambient_data = bpy.data.lights.new(name="CeilingAmbient_PointLight", type='POINT')
    ambient_data.color = (0.95, 0.95, 1.0)
    ambient_data.energy = 8.0
    ambient_data.shadow_soft_size = 0.80
    ambient_obj = bpy.data.objects.new("Light_CeilingAmbient", ambient_data)
    ambient_obj.location = r2b(0.0, 2.65, 0.0)
    coll.objects.link(ambient_obj)
    ambient_obj.parent = lights_root

    # 8. All Base Catalog Props in Room (Contract: room.glb owns all catalog base props)

    # 8a. Audio & Accessories (Catalog rows speakers, desk-clock, contact-phone)
    audio_root = bpy.data.objects.new("audio_and_accessories", None)
    coll.objects.link(audio_root)
    audio_root.parent = room_root

    # Round Desktop Speakers
    add_sphere("speaker_left_cabinet", (-0.68, 0.83, -1.22), 0.065, mat=mats["Alex_DrawerWhite"], parent=audio_root, collection=coll)
    add_cylinder("speaker_left_woofer", (-0.68, 0.83, -1.16), 0.045, 0.015, axis='Z', mat=mats["Chair_DarkMetal"], parent=audio_root, collection=coll)
    add_cylinder("speaker_left_tweeter", (-0.68, 0.83, -1.152), 0.018, 0.010, axis='Z', mat=mats["Door_HardwareBrass"], parent=audio_root, collection=coll)
    # Speaker_LED at world (-0.68, 0.88, -1.17)
    add_sphere("Speaker_LED", (-0.68, 0.88, -1.17), 0.006, mat=mats["Project_ScannerBlue"], parent=audio_root, collection=coll)

    add_sphere("speaker_right_cabinet", (0.68, 0.83, -1.22), 0.065, mat=mats["Alex_DrawerWhite"], parent=audio_root, collection=coll)
    add_cylinder("speaker_right_woofer", (0.68, 0.83, -1.16), 0.045, 0.015, axis='Z', mat=mats["Chair_DarkMetal"], parent=audio_root, collection=coll)
    add_cylinder("speaker_right_tweeter", (0.68, 0.83, -1.152), 0.018, 0.010, axis='Z', mat=mats["Door_HardwareBrass"], parent=audio_root, collection=coll)

    add_box("audio_dac_chassis", (-0.50, 0.77, -1.28), (0.16, 0.035, 0.11), mat=mats["Baseboard_Charcoal"], parent=audio_root, collection=coll)
    add_cylinder("audio_dac_knob", (-0.45, 0.795, -1.26), 0.018, 0.014, axis='Y', mat=mats["Door_HardwareBrass"], parent=audio_root, collection=coll)

    # Desk Clock Chassis at (-0.50, 0.81, -1.14), with Clock_Face child at local (0, 0, 0.026) -> world (-0.50, 0.81, -1.114)
    clk_box = add_box("desk_clock_chassis", (-0.50, 0.81, -1.14), (0.13, 0.06, 0.05), mat=mats["Alex_DrawerWhite"], parent=audio_root, collection=coll)
    clk_face = add_box("Clock_Face", (-0.50, 0.81, -1.114), (0.11, 0.045, 0.005), mat=mats["Clock_CyanDisplay"], parent=clk_box, collection=coll)
    apply_planar_uv(clk_face, plane='XZ')

    # Smartphone (Catalog row contact-phone)
    add_box("contact_phone_body", (0.45, 0.755, -0.92), (0.075, 0.008, 0.15), mat=mats["Baseboard_Charcoal"], parent=audio_root, collection=coll)
    add_box("contact_phone_screen", (0.45, 0.760, -0.92), (0.070, 0.002, 0.142), mat=mats["Project_ScannerBlue"], parent=audio_root, collection=coll)

    # 8b. Floating Wall Shelves & Books (Catalog row research-books, certificate-frame)
    shelves_root = bpy.data.objects.new("shelves", None)
    coll.objects.link(shelves_root)
    shelves_root.parent = room_root

    add_box("shelf_rear_upper", (0.0, 2.15, -1.68), (1.80, 0.03, 0.22), mat=mats["Desk_IvoryTop"], parent=shelves_root, collection=coll)
    add_box("shelf_bracket_l", (-0.75, 2.05, -1.72), (0.03, 0.18, 0.16), mat=mats["Baseboard_Charcoal"], parent=shelves_root, collection=coll)
    add_box("shelf_bracket_r", (0.75, 2.05, -1.72), (0.03, 0.18, 0.16), mat=mats["Baseboard_Charcoal"], parent=shelves_root, collection=coll)
    add_box("shelf_rear_lower", (-1.45, 1.65, -1.68), (0.80, 0.03, 0.22), mat=mats["Desk_IvoryTop"], parent=shelves_root, collection=coll)

    # Research Books: Books_Stack pivot at world (0.45, 2.27, -1.68)
    books_stack = add_empty_anchor("Books_Stack", (0.45, 2.27, -1.68), parent=shelves_root, collection=coll)
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
        add_box(f"book_vol_{i+1}", (bx, 2.27, -1.68), (0.038, 0.22, 0.18), mat=b_mat, parent=books_stack, collection=coll)

    # Certificate Frame on Left Wall (world -2.08, 1.85, 0.30)
    cert_root = add_box("certificate_frame", (-2.08, 1.85, 0.30), (0.02, 0.32, 0.42), mat=mats["Door_HardwareBrass"], parent=shelves_root, collection=coll)
    add_box("certificate_glass", (-2.075, 1.85, 0.30), (0.005, 0.28, 0.38), mat=mats["Ceiling_Matte"], parent=cert_root, collection=coll)

    # 8c. Pegboard System (Catalog row skills-board)
    peg_root = bpy.data.objects.new("pegboard_system", None)
    coll.objects.link(peg_root)
    peg_root.parent = room_root

    peg_panel = add_box("pegboard_panel", (2.05, 1.55, -0.85), (0.018, 0.85, 0.65), mat=mats["Pegboard_Perforated"], parent=peg_root, collection=coll)
    apply_planar_uv(peg_panel, plane='YZ')

    # Controllers & Headset
    add_box("peg_controller_top_body", (2.01, 1.75, -0.85), (0.04, 0.10, 0.15), mat=mats["Chair_CobaltFabric"], parent=peg_root, collection=coll)
    add_box("peg_controller_top_accent", (1.98, 1.75, -0.85), (0.01, 0.04, 0.11), mat=mats["Chair_WhiteNylon"], parent=peg_root, collection=coll)
    add_box("peg_controller_bot_body", (2.01, 1.55, -0.85), (0.04, 0.10, 0.15), mat=mats["Chair_WhiteNylon"], parent=peg_root, collection=coll)
    add_box("peg_controller_bot_accent", (1.98, 1.55, -0.85), (0.01, 0.04, 0.11), mat=mats["Neon_PinkAccent"], parent=peg_root, collection=coll)

    add_cylinder("headset_stand_pole", (2.01, 1.30, -0.85), 0.015, 0.22, axis='Y', mat=mats["Chair_DarkMetal"], parent=peg_root, collection=coll)
    add_cylinder("headset_earcup_l", (2.01, 1.36, -0.92), 0.040, 0.035, axis='Z', mat=mats["Chair_WhiteNylon"], parent=peg_root, collection=coll)
    add_cylinder("headset_earcup_r", (2.01, 1.36, -0.78), 0.040, 0.035, axis='Z', mat=mats["Chair_WhiteNylon"], parent=peg_root, collection=coll)
    add_box("headset_band", (2.01, 1.42, -0.85), (0.02, 0.04, 0.15), mat=mats["Chair_WhiteNylon"], parent=peg_root, collection=coll)

    # Labeled hit area: skills-board
    add_box("skills-board", (2.01, 1.20, -0.85), (0.02, 0.12, 0.35), mat=mats["Baseboard_Charcoal"], parent=peg_root, collection=coll)

    # 8d. Wall Painting & Hidden Yor Mark (Catalog rows wall-painting, hidden-yor-mark)
    painting_group = bpy.data.objects.new("wall-painting", None)
    coll.objects.link(painting_group)
    painting_group.parent = room_root

    # Painting Pivot at world (2.08, 1.75, -0.40)
    paint_pivot = add_empty_anchor("painting-pivot", (2.08, 1.75, -0.40), parent=painting_group, collection=coll)
    add_box("painting_frame", (2.07, 1.45, -0.40), (0.03, 0.64, 0.74), mat=mats["Door_HardwareBrass"], parent=paint_pivot, collection=coll)
    canvas_obj = add_box("painting_canvas", (2.06, 1.45, -0.40), (0.008, 0.58, 0.68), mat=mats["Wall_ArtPainting"], parent=paint_pivot, collection=coll)
    apply_planar_uv(canvas_obj, plane='YZ')

    # hidden-yor-mark: SIBLING of painting-pivot beneath wall-painting, fixed to wall at (2.085, 1.45, -0.40)
    # Does NOT rotate with painting.
    add_box("hidden-yor-mark", (2.085, 1.45, -0.40), (0.005, 0.12, 0.24), mat=mats["Yor_HiddenSignature"], parent=painting_group, collection=coll)

    # 8e. Plants (Catalog row plant-leaves with Plant_Leaf_01 and Plant_Leaf_02)
    plants_root = bpy.data.objects.new("plants", None)
    coll.objects.link(plants_root)
    plants_root.parent = room_root

    add_cylinder("pot_succulent", (-0.85, 0.79, -1.05), 0.055, 0.08, axis='Y', mat=mats["Plant_CeramicWhite"], parent=plants_root, collection=coll)
    add_sphere("succulent_leaf_center", (-0.85, 0.85, -1.05), 0.045, mat=mats["Plant_Foliage"], parent=plants_root, collection=coll)

    add_cylinder("pot_ivy", (-0.25, 1.72, -1.65), 0.065, 0.10, axis='Y', mat=mats["Plant_CeramicWhite"], parent=plants_root, collection=coll)
    add_sphere("ivy_mound", (-0.25, 1.78, -1.65), 0.075, mat=mats["Plant_Foliage"], parent=plants_root, collection=coll)
    for idx, (vx, vy, vz, sx, sy, sz) in enumerate([
        (-0.25, 1.60, -1.60, 0.030, 0.28, 0.030),
        (-0.22, 1.45, -1.58, 0.025, 0.35, 0.025),
        (-0.28, 1.35, -1.59, 0.020, 0.30, 0.020),
    ]):
        add_box(f"ivy_vine_{idx+1}", (vx, vy, vz), (sx, sy, sz), mat=mats["Plant_Foliage"], parent=plants_root, collection=coll)

    add_box("shelf_easel", (0.0, 1.78, -1.65), (0.16, 0.12, 0.04), mat=mats["Door_OakWood"], parent=plants_root, collection=coll)
    add_box("shelf_mini_kb", (0.0, 1.82, -1.63), (0.14, 0.05, 0.02), mat=mats["Keyboard_Charcoal"], parent=plants_root, collection=coll)
    for s_idx, s_col in enumerate([
        (0.0, 0.85, 1.0, 1.0),
        (0.95, 0.30, 0.20, 1.0),
        (0.15, 0.85, 0.35, 1.0),
        (0.95, 0.40, 0.85, 1.0),
    ]):
        s_mat = get_or_create_pbr_mat(f"Symbol_Mat_{s_idx+1}", base_color=s_col, emission_color=s_col, emission_strength=2.0)
        sx = -0.06 + s_idx * 0.04
        add_box(f"shelf_symbol_{s_idx+1}", (sx, 1.73, -1.62), (0.022, 0.022, 0.008), mat=s_mat, parent=plants_root, collection=coll)

    # Monstera Plant Stand and Pot
    for leg_idx, (lx, lz) in enumerate([(-1.72, 0.80), (-1.58, 0.80), (-1.65, 0.92)]):
        add_box(f"monstera_stand_leg_{leg_idx+1}", (lx, 0.15, lz), (0.025, 0.30, 0.025), mat=mats["Door_OakWood"], parent=plants_root, collection=coll)
    add_cylinder("pot_monstera", (-1.65, 0.38, 0.85), 0.15, 0.32, axis='Y', mat=mats["Plant_CeramicWhite"], parent=plants_root, collection=coll)

    # Genuine Mesh-Bearing Pivots for Plant_Leaf_01 and Plant_Leaf_02
    p1 = add_empty_anchor("Plant_Leaf_01", (-1.65, 0.65, 0.85), parent=plants_root, collection=coll)
    add_box("Plant_Leaf_01_Mesh", (-1.65, 0.66, 0.85), (0.30, 0.015, 0.25), mat=mats["Plant_Foliage"], parent=p1, collection=coll)

    p2 = add_empty_anchor("Plant_Leaf_02", (-1.52, 0.72, 0.78), parent=plants_root, collection=coll)
    add_box("Plant_Leaf_02_Mesh", (-1.52, 0.73, 0.78), (0.26, 0.015, 0.22), mat=mats["Plant_Foliage"], parent=p2, collection=coll)

    # 8f. Base Project Props (Catalog rows helios-pc, talks-microphone, ai-real-camera, zenith-model, about-personal-object)

    # Helios PC Chassis (Catalog row helios-pc)
    pc_root = bpy.data.objects.new("helios-pc", None)
    coll.objects.link(pc_root)
    pc_root.parent = room_root

    pc_cx, pc_cz = 1.05, -1.15
    add_box("pc_chassis_frame", (pc_cx, 1.00, pc_cz), (0.24, 0.48, 0.48), mat=mats["PC_ChassisWhite"], parent=pc_root, collection=coll)
    add_box("pc_glass_side_panel", (pc_cx - 0.122, 1.00, pc_cz), (0.005, 0.44, 0.44), mat=mats["PC_TemperedGlass"], parent=pc_root, collection=coll)
    add_box("pc_front_mesh", (pc_cx, 1.00, pc_cz + 0.242), (0.22, 0.44, 0.006), mat=mats["Baseboard_Charcoal"], parent=pc_root, collection=coll)

    for i in range(3):
        fy = 0.85 + i * 0.14
        f_mat = mats["Project_SolarYellow"] if i % 2 == 0 else mats["Cyan_UnderdeskFill"]
        add_cylinder(f"pc_fan_ring_{i+1}", (pc_cx, fy, pc_cz + 0.235), 0.055, 0.015, axis='Z', mat=f_mat, parent=pc_root, collection=coll)
        add_cylinder(f"pc_fan_hub_{i+1}", (pc_cx, fy, pc_cz + 0.237), 0.020, 0.018, axis='Z', mat=mats["Baseboard_Charcoal"], parent=pc_root, collection=coll)

    # PC_Fan_Group at world (1.05, 0.99, -0.914), local spin axis +Z
    fan_group = add_empty_anchor("PC_Fan_Group", (pc_cx, 0.99, pc_cz + 0.236), parent=pc_root, collection=coll)
    add_cylinder("helios_fan_blades", (pc_cx, 0.99, pc_cz + 0.236), 0.045, 0.008, axis='Z', mat=mats["Baseboard_Charcoal"], parent=fan_group, collection=coll)

    # Helios_Network_LED
    add_box("Helios_Network_LED", (pc_cx - 0.032, 0.95, pc_cz), (0.005, 0.02, 0.24), mat=mats["Cyan_UnderdeskFill"], parent=pc_root, collection=coll)

    # Talks Microphone (Catalog row talks-microphone)
    mic_root = bpy.data.objects.new("talks-microphone", None)
    coll.objects.link(mic_root)
    mic_root.parent = room_root

    add_box("mic_desk_clamp", (-0.95, 0.77, -1.35), (0.06, 0.08, 0.06), mat=mats["Chair_DarkMetal"], parent=mic_root, collection=coll)
    add_box("mic_arm_lower", (-0.85, 0.92, -1.25), (0.02, 0.28, 0.02), mat=mats["Chair_DarkMetal"], parent=mic_root, collection=coll)
    add_box("mic_arm_upper", (-0.72, 1.05, -1.15), (0.02, 0.22, 0.02), mat=mats["Chair_DarkMetal"], parent=mic_root, collection=coll)
    add_cylinder("mic_shockmount", (-0.62, 1.05, -1.08), 0.045, 0.06, axis='Y', mat=mats["Baseboard_Charcoal"], parent=mic_root, collection=coll)
    add_cylinder("mic_body", (-0.62, 1.05, -1.08), 0.028, 0.12, axis='Y', mat=mats["Chair_DarkMetal"], parent=mic_root, collection=coll)
    # Mic_LED at world (-0.62, 1.11, -1.08)
    add_cylinder("Mic_LED", (-0.62, 1.11, -1.08), 0.030, 0.012, axis='Y', mat=mats["Project_MicRedLED"], parent=mic_root, collection=coll)

    # AI Real Camera (Catalog row ai-real-camera)
    cam_root = bpy.data.objects.new("ai-real-camera", None)
    coll.objects.link(cam_root)
    cam_root.parent = room_root

    cam_cx, cam_cy, cam_cz = -1.45, 1.68, -1.68
    add_cylinder("ai_cam_hub", (cam_cx, cam_cy + 0.04, cam_cz), 0.025, 0.02, axis='Y', mat=mats["Chair_DarkMetal"], parent=cam_root, collection=coll)
    for i in range(3):
        a = i * (2 * math.pi / 3)
        add_box(f"ai_cam_leg_{i+1}", (cam_cx + math.cos(a)*0.03, cam_cy + 0.02, cam_cz + math.sin(a)*0.03), (0.012, 0.04, 0.012), mat=mats["Door_HardwareBrass"], parent=cam_root, collection=coll)
    add_box("ai_cam_chassis", (cam_cx, cam_cy + 0.09, cam_cz), (0.08, 0.06, 0.07), mat=mats["Baseboard_Charcoal"], parent=cam_root, collection=coll)

    # Camera_Lens_Ring at pivot (-1.45, 1.77, -1.635), geometry facing +Z
    lens_pivot = add_empty_anchor("Camera_Lens_Ring", (cam_cx, cam_cy + 0.09, cam_cz + 0.045), parent=cam_root, collection=coll)
    add_cylinder("ai_camera_lens", (cam_cx, cam_cy + 0.09, cam_cz + 0.045), 0.025, 0.03, axis='Z', mat=mats["Chair_DarkMetal"], parent=lens_pivot, collection=coll)
    # Camera_Status_LED
    add_cylinder("Camera_Status_LED", (cam_cx, cam_cy + 0.09, cam_cz + 0.062), 0.026, 0.005, axis='Z', mat=mats["Project_ScannerBlue"], parent=cam_root, collection=coll)

    # Zenith Model (Catalog row zenith-model)
    zen_root = bpy.data.objects.new("zenith-model", None)
    coll.objects.link(zen_root)
    zen_root.parent = room_root

    zx, zy, zz = 0.65, 0.76, -1.42
    add_box("zenith_pedestal", (zx, zy + 0.015, zz), (0.18, 0.03, 0.14), mat=mats["Alex_DrawerWhite"], parent=zen_root, collection=coll)

    b_sol = r2b(zx - 0.03, zy + 0.06, zz)
    bpy.ops.mesh.primitive_cube_add(location=b_sol)
    sol_panel = bpy.context.active_object
    sol_panel.name = "zenith_solar_panel"
    sol_panel.dimensions = (0.12, 0.08, 0.008)
    sol_panel.rotation_euler = (math.radians(-30), 0, 0)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    sol_panel.data.materials.append(mats["Chair_DarkMetal"])
    sol_panel.parent = zen_root
    sol_panel.matrix_parent_inverse = zen_root.matrix_world.inverted()
    coll.objects.link(sol_panel)
    bpy.context.scene.collection.objects.unlink(sol_panel)

    add_box("zenith_battery_cell", (zx + 0.05, zy + 0.045, zz), (0.04, 0.06, 0.06), mat=mats["Chair_WhiteNylon"], parent=zen_root, collection=coll)

    # Zenith_Core at pivot (0.70, 0.805, -1.388)
    z_core = add_empty_anchor("Zenith_Core", (zx + 0.05, zy + 0.045, zz + 0.032), parent=zen_root, collection=coll)
    add_box("zenith_energy_core_mesh", (zx + 0.05, zy + 0.045, zz + 0.032), (0.02, 0.04, 0.004), mat=mats["Project_SolarYellow"], parent=z_core, collection=coll)

    # About Personal Object (Catalog row about-personal-object)
    # Neutral labeled placeholder at world (0.72, 0.82, -0.84)
    about_pivot = add_empty_anchor("about-personal-object", (0.72, 0.82, -0.84), parent=room_root, collection=coll)
    add_box("about_personal_object_placeholder", (0.72, 0.82, -0.84), (0.08, 0.08, 0.08), mat=mats["Chair_WhiteNylon"], parent=about_pivot, collection=coll)

    return room_root

# ==============================================================================
# GROUP B: Secondary Optional Detail Props (group-b-props.glb)
# ==============================================================================

def build_optional_details(coll, mats):
    detail_root = bpy.data.objects.new("Optional_Detail_Root", None)
    coll.objects.link(detail_root)

    # Coffee mug on desk
    add_cylinder("opt_coffee_mug", (0.35, 0.79, -1.25), 0.040, 0.08, axis='Y', mat=mats["Alex_DrawerWhite"], parent=detail_root, collection=coll)
    add_cylinder("opt_mug_coaster", (0.35, 0.755, -1.25), 0.050, 0.006, axis='Y', mat=mats["Door_OakWood"], parent=detail_root, collection=coll)

    # Pen holder with pens
    add_cylinder("opt_pen_holder", (-0.35, 0.80, -1.30), 0.035, 0.09, axis='Y', mat=mats["Baseboard_Charcoal"], parent=detail_root, collection=coll)
    add_cylinder("opt_pen_1", (-0.36, 0.84, -1.31), 0.005, 0.12, axis='Y', mat=mats["Door_HardwareBrass"], parent=detail_root, collection=coll)
    add_cylinder("opt_pen_2", (-0.34, 0.84, -1.29), 0.005, 0.12, axis='Y', mat=mats["Keyboard_KeyOrange"], parent=detail_root, collection=coll)

    # Sticky notes pad
    add_box("opt_sticky_notes", (0.42, 0.76, -1.15), (0.075, 0.015, 0.075), mat=mats["Project_SolarYellow"], parent=detail_root, collection=coll)

    # Decorative geometric sculpture on upper shelf
    add_box("opt_shelf_sculpture", (-0.85, 2.22, -1.68), (0.08, 0.10, 0.08), mat=mats["Door_HardwareBrass"], parent=detail_root, collection=coll)

    # Ceramic miniature vase on lower shelf
    add_cylinder("opt_mini_vase", (-1.30, 1.72, -1.68), 0.035, 0.08, axis='Y', mat=mats["Plant_CeramicWhite"], parent=detail_root, collection=coll)

    return detail_root

# ==============================================================================
# ON-DEMAND: Project Effects / Motifs (on-demand-projects.glb)
# ==============================================================================

def build_project_effects(coll, mats):
    effects_root = bpy.data.objects.new("Project_Effects_Root", None)
    coll.objects.link(effects_root)

    # Helios Network Path (network data flow trace)
    add_box("Helios_Network_Path", (1.05, 1.00, -1.15), (0.01, 0.40, 0.40), mat=mats["Cyan_UnderdeskFill"], parent=effects_root, collection=coll)

    # Zenith Energy Path (orbital solar arc)
    add_cylinder("Zenith_Energy_Path", (0.70, 0.805, -1.388), 0.08, 0.005, axis='Y', mat=mats["Project_SolarYellow"], parent=effects_root, collection=coll)

    # AI Classification Motif (scanner target rays)
    add_box("AI_Classification_Motif", (-1.45, 1.77, -1.60), (0.06, 0.06, 0.005), mat=mats["Project_ScannerBlue"], parent=effects_root, collection=coll)

    # Talks Waveform (audio waveform visualizer)
    add_box("Talks_Waveform", (-0.62, 1.15, -1.08), (0.08, 0.02, 0.005), mat=mats["Project_MicRedLED"], parent=effects_root, collection=coll)

    return effects_root

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
        direction = b_target - b_pos
        rot_quat = direction.to_track_quat('-Z', 'Y')
        cam_obj.rotation_euler = rot_quat.to_euler()

        coll.objects.link(cam_obj)
        created_cams[cam_name] = cam_obj
    return created_cams

# ==============================================================================
# Rendering Pipeline (Blender EEVEE)
# ==============================================================================

def render_camera_passes(cameras, renders_dir):
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_EEVEE'
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'

    print("\n--- Starting Blender EEVEE Camera Renders ---")
    for cam_name, cam_obj in cameras.items():
        cam_cfg = CAMERAS[cam_name]
        scene.camera = cam_obj
        scene.render.resolution_x = cam_cfg["aspect"][0]
        scene.render.resolution_y = cam_cfg["aspect"][1]
        scene.render.resolution_percentage = 100

        clean_slug = cam_name.replace("camera-", "")
        if clean_slug == "entry":
            out_path = renders_dir / "entry" / "raw-frame.png"
        elif clean_slug == "home-desktop":
            out_path = renders_dir / "desktop-home" / "raw-frame.png"
        elif clean_slug == "mobile-portrait":
            out_path = renders_dir / "mobile-home" / "raw-frame.png"
        elif clean_slug == "monitor-detail":
            out_path = renders_dir / "monitor-detail" / "raw-frame.png"
        elif clean_slug == "reverse-doorway":
            out_path = renders_dir / "reverse-doorway" / "raw-frame.png"
        else:
            out_path = renders_dir / f"blender-{clean_slug}.png"

        scene.render.filepath = str(out_path)
        print(f"Rendering {cam_name} -> {out_path.name} ({cam_cfg['aspect'][0]}x{cam_cfg['aspect'][1]})...")
        bpy.ops.render.render(write_still=True)
        print(f"Render complete: {out_path} ({out_path.stat().st_size} bytes)")

# ==============================================================================
# glTF 2.0 Binary Export Pipeline
# ==============================================================================

def export_gltf_group(root_obj, export_filepath, export_anim=False):
    bpy.ops.object.select_all(action='DESELECT')

    def select_recursive(obj):
        obj.select_set(True)
        for child in obj.children:
            select_recursive(child)

    select_recursive(root_obj)
    bpy.context.view_layer.objects.active = root_obj

    print(f"\nExporting {root_obj.name} -> {export_filepath.name} (animations={export_anim})...")
    bpy.ops.export_scene.gltf(
        filepath=str(export_filepath),
        export_format='GLB',
        use_selection=True,
        export_yup=True,
        export_apply=False,
        export_materials='EXPORT',
        export_lights=True,
        export_cameras=False,
        export_animations=export_anim,
        export_animation_mode="NLA_TRACKS" if export_anim else "ACTIONS",
        export_image_format='AUTO'
    )
    file_size = export_filepath.stat().st_size
    print(f"Export successful: {export_filepath.name} ({file_size} bytes)")
    return file_size

# Master Execution Routine
def main():
    start_time = time.time()
    print("=" * 80)
    print("YOR WORLD - BUILDING REFERENCE-FAITHFUL PRODUCTION ENVIRONMENT (FINISH-B1-R2)")
    print("=" * 80)

    clear_scene()

    coll_room = bpy.data.collections.new("Room_Collection")
    coll_group_b = bpy.data.collections.new("Group_B_Collection")
    coll_on_demand = bpy.data.collections.new("On_Demand_Collection")
    coll_cameras = bpy.data.collections.new("Cameras")

    bpy.context.scene.collection.children.link(coll_room)
    bpy.context.scene.collection.children.link(coll_group_b)
    bpy.context.scene.collection.children.link(coll_on_demand)
    bpy.context.scene.collection.children.link(coll_cameras)

    # 1. Register PBR Materials
    print("\n[Step 1/5] Registering PBR materials...")
    materials = create_all_materials(TEXTURES_DIR)
    print(f"Registered {len(materials)} PBR materials.")

    # 2. Build Collections
    print("\n[Step 2/5] Building Complete Room Environment (Room_Root)...")
    room_root = build_room_environment(coll_room, materials)

    print("\n[Step 3/5] Building Group B: Optional Detail Props...")
    group_b_root = build_optional_details(coll_group_b, materials)

    print("\n[Step 4/5] Building On-Demand: Project Effects & Motifs...")
    on_demand_root = build_project_effects(coll_on_demand, materials)

    # 3. Setup Cameras
    print("\n[Step 5/5] Setting up 5 Approved Production Cameras...")
    cameras = setup_cameras(coll_cameras)

    # Save Native Blender Source Files
    blend_path_room = SOURCE_DIR / "room.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path_room))
    print(f"\nSaved native Blender scene: {blend_path_room} ({blend_path_room.stat().st_size} bytes)")

    # Also save into source/blender/models/
    bpy.ops.wm.save_as_mainfile(filepath=str(BLENDER_MODELS_DIR / "room.blend"))
    bpy.ops.wm.save_as_mainfile(filepath=str(BLENDER_MODELS_DIR / "optional-details.blend"))

    # Copy script to source/blender/scripts/
    import shutil
    shutil.copy2(SCRIPT_DIR / "build-environment.py", BLENDER_SCRIPTS_DIR / "build-environment.py")
    if (SCRIPT_DIR / "build-resident-fixture.py").exists():
        shutil.copy2(SCRIPT_DIR / "build-resident-fixture.py", BLENDER_SCRIPTS_DIR / "build-resident-fixture.py")
    if (SCRIPT_DIR / "generate-textures.py").exists():
        shutil.copy2(SCRIPT_DIR / "generate-textures.py", BLENDER_SCRIPTS_DIR / "generate-textures.py")

    # 4. Binary glTF 2.0 Exports
    print("\n--- Executing glTF 2.0 Binary Exports ---")
    # room.glb: zero animations exported (export_anim=False)
    glb_room_size = export_gltf_group(room_root, RUNTIME_DIR / "room.glb", export_anim=False)
    glb_b_size = export_gltf_group(group_b_root, RUNTIME_DIR / "group-b-props.glb", export_anim=False)
    glb_od_size = export_gltf_group(on_demand_root, RUNTIME_DIR / "on-demand-projects.glb", export_anim=False)

    # 5. Renders
    render_camera_passes(cameras, RENDERS_DIR)

    elapsed = time.time() - start_time
    print("=" * 80)
    print(f"FINISH-B1-R2 ENVIRONMENT BUILD COMPLETE in {elapsed:.2f}s!")
    print(f"- room.glb:             {glb_room_size:,} bytes")
    print(f"- group-b-props.glb:    {glb_b_size:,} bytes")
    print(f"- on-demand-projects.glb: {glb_od_size:,} bytes")
    print("=" * 80)

if __name__ == "__main__":
    main()
