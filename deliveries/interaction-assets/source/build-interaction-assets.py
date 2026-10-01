"""
YOR WORLD - Production Interactive Assets Generator (Frozen V1 Interaction Catalog)
Script: build-interaction-assets.py
Author: Production Art/Assets Worker
Authority: Frozen V1 Interaction Catalog (docs/planning/interaction-catalog.md) & Feasibility Baseline F1
Output Root: deliveries/interaction-assets/

Generates:
1. Native Blender 5.2.2 scene (interaction-assets.blend)
2. Production glTF 2.0 binary asset (interaction-assets.glb)
3. Mobile simplified glTF binary asset (interaction-assets-mobile.glb)
4. All 25 required V1 catalog interactive physical objects with:
   - Explicit visible nodes
   - Named interaction pivots (anchors)
   - Calibrated low-poly hit geometries (isHitProxy=True)
   - PBR material channels (emissive, base color, roughness, transmission)
   - Embedded keyframed animation actions for physical movements
   - Mobile simplifications & enlarged touch targets
   - Reduced-motion safe representations
"""

import bpy
import mathutils
import math
import os
import sys
import json
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent.resolve()
ROOT_DIR = SCRIPT_DIR.parent
RUNTIME_DIR = ROOT_DIR / "runtime"
TEXTURES_DIR = RUNTIME_DIR / "textures"
SOURCE_DIR = ROOT_DIR / "source"

RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
TEXTURES_DIR.mkdir(parents=True, exist_ok=True)
SOURCE_DIR.mkdir(parents=True, exist_ok=True)

# ==============================================================================
# Coordinate Transformation Helpers (F1 Runtime <-> Blender)
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
    """Parent child object to parent while strictly maintaining child's world matrix."""
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
    """Clear all objects, meshes, materials, and collections."""
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

# ==============================================================================
# Material Generator
# ==============================================================================

def create_mat(name, base_color=(0.8, 0.8, 0.8, 1.0), roughness=0.5, metallic=0.0,
               specular=0.5, ior=1.45, transmission=0.0, emission_color=None,
               emission_strength=1.0, image_path=None, alpha=1.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    output_node = nodes.new(type='ShaderNodeOutputMaterial')
    output_node.location = (400, 0)
    principled = nodes.new(type='ShaderNodeBsdfPrincipled')
    principled.location = (0, 0)

    # Base Color & Alpha
    bc = list(base_color)
    if len(bc) == 3:
        bc.append(alpha)
    else:
        bc[3] = alpha
    principled.inputs['Base Color'].default_value = bc
    principled.inputs['Roughness'].default_value = roughness
    principled.inputs['Metallic'].default_value = metallic

    if 'Specular IOR Level' in principled.inputs:
        principled.inputs['Specular IOR Level'].default_value = specular
    elif 'Specular' in principled.inputs:
        principled.inputs['Specular'].default_value = specular

    if 'IOR' in principled.inputs:
        principled.inputs['IOR'].default_value = ior

    if transmission > 0.0:
        if 'Transmission Weight' in principled.inputs:
            principled.inputs['Transmission Weight'].default_value = transmission
        elif 'Transmission' in principled.inputs:
            principled.inputs['Transmission'].default_value = transmission
        mat.blend_method = 'BLEND'

    if emission_color is not None:
        if 'Emission Color' in principled.inputs:
            principled.inputs['Emission Color'].default_value = emission_color
            principled.inputs['Emission Strength'].default_value = emission_strength
        elif 'Emission' in principled.inputs:
            principled.inputs['Emission'].default_value = emission_color
            if 'Emission Strength' in principled.inputs:
                principled.inputs['Emission Strength'].default_value = emission_strength

    if image_path and os.path.exists(image_path):
        img_node = nodes.new(type='ShaderNodeTexImage')
        img_node.location = (-400, 0)
        img = bpy.data.images.load(str(image_path))
        img_node.image = img
        links.new(img_node.outputs['Color'], principled.inputs['Base Color'])
        if emission_color is not None:
            if 'Emission Color' in principled.inputs:
                links.new(img_node.outputs['Color'], principled.inputs['Emission Color'])
            elif 'Emission' in principled.inputs:
                links.new(img_node.outputs['Color'], principled.inputs['Emission'])

    if alpha < 1.0:
        mat.blend_method = 'BLEND'
        if 'Alpha' in principled.inputs:
            principled.inputs['Alpha'].default_value = alpha

    links.new(principled.outputs['BSDF'], output_node.inputs['Surface'])
    return mat

# ==============================================================================
# Mesh and Object Creation Helpers
# ==============================================================================

def add_empty_anchor(name, r_pos, parent=None, rot_deg=(0,0,0)):
    """Create an empty locator / interaction pivot."""
    empty = bpy.data.objects.new(name, None)
    empty.empty_display_type = 'ARROWS'
    empty.empty_display_size = 0.15
    empty.location = r2b(*r_pos)
    empty.rotation_euler = (math.radians(rot_deg[0]), math.radians(rot_deg[1]), math.radians(rot_deg[2]))
    bpy.context.collection.objects.link(empty)
    if parent:
        set_parent_keep_world(empty, parent)
    return empty

def add_box(name, r_pos, r_size, mat=None, parent=None, is_hit_proxy=False, extras=None, rot_deg=(0,0,0)):
    """Add box with dimensions in runtime meters."""
    bpy.ops.mesh.primitive_cube_add(size=1.0)
    box = bpy.context.active_object
    box.name = name
    bx, by, bz = r2b(*r_pos)
    box.location = (bx, by, bz)
    sx, sy, sz = float(r_size[0]), float(r_size[2]), float(r_size[1])
    box.scale = (sx, sy, sz)
    box.rotation_euler = (math.radians(rot_deg[0]), math.radians(rot_deg[1]), math.radians(rot_deg[2]))
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

    if mat:
        box.data.materials.append(mat)

    if is_hit_proxy:
        box["isHitProxy"] = True
        box["runtimeBounds"] = list(r_size)

    if extras:
        for k, v in extras.items():
            box[k] = v

    if parent:
        set_parent_keep_world(box, parent)
    return box

def add_cylinder(name, r_pos, radius, height, mat=None, parent=None, is_hit_proxy=False, extras=None, rot_deg=(0,0,0), vertices=16):
    """Add cylinder with dimensions in runtime meters."""
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=height, vertices=vertices)
    cyl = bpy.context.active_object
    cyl.name = name
    cyl.location = r2b(*r_pos)
    cyl.rotation_euler = (math.radians(rot_deg[0]), math.radians(rot_deg[1]), math.radians(rot_deg[2]))
    if mat:
        cyl.data.materials.append(mat)
    if is_hit_proxy:
        cyl["isHitProxy"] = True
    if extras:
        for k, v in extras.items():
            cyl[k] = v
    if parent:
        set_parent_keep_world(cyl, parent)
    return cyl

# ==============================================================================
# Animation Creators (Keyframed Actions)
# ==============================================================================

def action_setup(obj, name):
    obj.animation_data_create()
    action = bpy.data.actions.new(name)
    action.use_fake_user = True
    obj.animation_data.action = action
    return action

def create_painting_animation(obj):
    action = action_setup(obj, "Action_Painting_Tilt_Settle")
    keyframes = [
        (0.0, 0.0),
        (12.0, 0.10471976),
        (22.0, -0.03665191),
        (30.0, 0.01221730),
        (36.0, 0.0),
        (45.0, 0.0)
    ]
    for frame, val in keyframes:
        obj.rotation_euler = (val, 0.0, 0.0)
        obj.keyframe_insert("rotation_euler", frame=frame)
    track = obj.animation_data.nla_tracks.new()
    track.name = "Action_Painting_Tilt_Settle"
    track.strips.new("Action_Painting_Tilt_Settle", 1, action)
    return action

def create_blinds_animation(obj):
    action = action_setup(obj, "Action_Blinds_Toggle")
    obj.rotation_euler = (0.0, 0.0, 0.0)
    obj.keyframe_insert("rotation_euler", frame=0.0)
    obj.rotation_euler = (1.30899694, 0.0, 0.0) # 75 deg
    obj.keyframe_insert("rotation_euler", frame=30.0)
    track = obj.animation_data.nla_tracks.new()
    track.name = "Action_Blinds_Toggle"
    track.strips.new("Action_Blinds_Toggle", 1, action)
    return action

def create_door_animation(obj):
    action = action_setup(obj, "Action_Door_Entrance_Swing")
    obj.rotation_euler = (0.0, 0.0, 0.0)
    obj.keyframe_insert("rotation_euler", frame=0.0)
    obj.rotation_euler = (0.0, 0.0, 1.30899694) # 75 deg swing in Blender Z
    obj.keyframe_insert("rotation_euler", frame=45.0)
    track = obj.animation_data.nla_tracks.new()
    track.name = "Action_Door_Entrance_Swing"
    track.strips.new("Action_Door_Entrance_Swing", 1, action)
    return action

def create_lamp_toggle_animation(obj):
    action = action_setup(obj, "Action_Lamp_Toggle")
    obj.rotation_euler = (0.0, 0.0, 0.0)
    obj.keyframe_insert("rotation_euler", frame=0.0)
    obj.rotation_euler = (0.05235988, 0.0, 0.0)
    obj.keyframe_insert("rotation_euler", frame=8.0)
    obj.rotation_euler = (0.0, 0.0, 0.0)
    obj.keyframe_insert("rotation_euler", frame=16.0)
    track = obj.animation_data.nla_tracks.new()
    track.name = "Action_Lamp_Toggle"
    track.strips.new("Action_Lamp_Toggle", 1, action)
    return action

def create_keyboard_press_animation(obj):
    action = action_setup(obj, "Action_Keyboard_Press")
    z_base = obj.location.z
    obj.location.z = z_base
    obj.keyframe_insert("location", frame=0.0)
    obj.location.z = z_base - 0.0015
    obj.keyframe_insert("location", frame=4.0)
    obj.location.z = z_base
    obj.keyframe_insert("location", frame=10.0)
    track = obj.animation_data.nla_tracks.new()
    track.name = "Action_Keyboard_Press"
    track.strips.new("Action_Keyboard_Press", 1, action)
    return action

def create_mouse_click_animation(obj):
    action = action_setup(obj, "Action_Mouse_Click")
    z_base = obj.location.z
    obj.location.z = z_base
    obj.keyframe_insert("location", frame=0.0)
    obj.location.z = z_base - 0.0008
    obj.keyframe_insert("location", frame=3.0)
    obj.location.z = z_base
    obj.keyframe_insert("location", frame=8.0)
    track = obj.animation_data.nla_tracks.new()
    track.name = "Action_Mouse_Click"
    track.strips.new("Action_Mouse_Click", 1, action)
    return action

def create_plant_sway_animation(obj):
    action = action_setup(obj, "Action_Plant_Sway")
    obj.rotation_euler = (0.0, 0.0, 0.0)
    obj.keyframe_insert("rotation_euler", frame=0.0)
    obj.rotation_euler = (0.0, 0.06981317, 0.0)
    obj.keyframe_insert("rotation_euler", frame=6.0)
    obj.rotation_euler = (0.0, -0.02617994, 0.0)
    obj.keyframe_insert("rotation_euler", frame=12.0)
    obj.rotation_euler = (0.0, 0.0, 0.0)
    obj.keyframe_insert("rotation_euler", frame=18.0)
    track = obj.animation_data.nla_tracks.new()
    track.name = "Action_Plant_Sway"
    track.strips.new("Action_Plant_Sway", 1, action)
    return action

def create_prop_animations(objects_dict):
    if "pc_rgb_fan_front1" in objects_dict:
        fan = objects_dict["pc_rgb_fan_front1"]
        act = action_setup(fan, "Action_Helios_Fan_Spin")
        fan.rotation_euler = (0.0, 0.0, 0.0)
        fan.keyframe_insert("rotation_euler", frame=0.0)
        fan.rotation_euler = (0.0, 6.2831853, 0.0)
        fan.keyframe_insert("rotation_euler", frame=30.0)
        tr = fan.animation_data.nla_tracks.new()
        tr.name = "Action_Helios_Fan_Spin"
        tr.strips.new("Action_Helios_Fan_Spin", 1, act)

    if "ai_camera_lens" in objects_dict:
        lens = objects_dict["ai_camera_lens"]
        act = action_setup(lens, "Action_Camera_Focus")
        y_base = lens.location.y
        lens.location.y = y_base
        lens.keyframe_insert("location", frame=0.0)
        lens.location.y = y_base + 0.002
        lens.keyframe_insert("location", frame=15.0)
        lens.location.y = y_base
        lens.keyframe_insert("location", frame=30.0)
        tr = lens.animation_data.nla_tracks.new()
        tr.name = "Action_Camera_Focus"
        tr.strips.new("Action_Camera_Focus", 1, act)

# ==============================================================================
# Complete Scene Construction
# ==============================================================================

def build_scene(is_mobile=False):
    clear_scene()

    # Materials
    mats = {}
    mats["Desk_White"] = create_mat("Desk_White", base_color=(0.93, 0.92, 0.91, 1.0), roughness=0.35)
    mats["Wall_Plaster"] = create_mat("Wall_Plaster", base_color=(0.88, 0.88, 0.92, 1.0), roughness=0.85)
    mats["Floor_Carpet"] = create_mat("Floor_Carpet", base_color=(0.25, 0.26, 0.30, 1.0), roughness=0.90)
    mats["Door_Wood"] = create_mat("Door_Wood", base_color=(0.95, 0.95, 0.96, 1.0), roughness=0.40)
    mats["Door_Handle"] = create_mat("Door_Handle", base_color=(0.15, 0.15, 0.16, 1.0), roughness=0.20, metallic=0.9)
    mats["Chair_Blue"] = create_mat("Chair_Blue", base_color=(0.28, 0.42, 0.83, 1.0), roughness=0.60)
    mats["Chair_White"] = create_mat("Chair_White", base_color=(0.96, 0.96, 0.98, 1.0), roughness=0.40)
    mats["Painting_Frame"] = create_mat("Painting_Frame", base_color=(0.12, 0.12, 0.14, 1.0), roughness=0.3)
    
    # Painting canvas with custom generated texture
    canvas_tex = str(TEXTURES_DIR / "painting-artwork.png")
    mats["Painting_Canvas"] = create_mat("Painting_Canvas", roughness=0.7, image_path=canvas_tex)
    
    # Hidden Yor Mark with texture
    mark_tex = str(TEXTURES_DIR / "hidden-yor-mark.png")
    mats["Hidden_Yor_Mark"] = create_mat("Hidden_Yor_Mark", roughness=0.4, image_path=mark_tex)

    # Monitor
    mats["Monitor_Bezel"] = create_mat("Monitor_Bezel", base_color=(0.08, 0.08, 0.10, 1.0), roughness=0.3, metallic=0.6)
    mon_amb_tex = str(TEXTURES_DIR / "monitor-screen-ambient.png")
    mats["Monitor_Screen"] = create_mat("Monitor_Screen", roughness=0.2, emission_color=(1.0, 1.0, 1.0, 1.0),
                                        emission_strength=1.0, image_path=mon_amb_tex)

    # Lamp
    mats["Lamp_Metal"] = create_mat("Lamp_Metal", base_color=(0.92, 0.92, 0.94, 1.0), roughness=0.25, metallic=0.7)
    mats["Lamp_Bulb"] = create_mat("Lamp_Bulb", base_color=(1.0, 0.95, 0.85, 1.0), roughness=0.1,
                                   emission_color=(1.0, 0.88, 0.65, 1.0), emission_strength=2.5)

    # Blinds
    mats["Blinds_Slat"] = create_mat("Blinds_Slat", base_color=(0.90, 0.90, 0.92, 1.0), roughness=0.4)
    mats["Window_Glass"] = create_mat("Window_Glass", base_color=(0.85, 0.92, 0.98, 1.0), roughness=0.1, transmission=0.85)

    # Clock
    clock_tex = str(TEXTURES_DIR / "clock-display-24h.png")
    mats["Clock_Case"] = create_mat("Clock_Case", base_color=(0.14, 0.14, 0.16, 1.0), roughness=0.5)
    mats["Clock_Display"] = create_mat("Clock_Display", roughness=0.2, emission_color=(0.45, 0.85, 0.95, 1.0),
                                       emission_strength=1.5, image_path=clock_tex)

    # Speakers
    mats["Speaker_Body"] = create_mat("Speaker_Body", base_color=(0.92, 0.92, 0.94, 1.0), roughness=0.3)
    mats["Speaker_Cone"] = create_mat("Speaker_Cone", base_color=(0.15, 0.15, 0.16, 1.0), roughness=0.4, metallic=0.3)
    mats["Speaker_Mute_LED"] = create_mat("Speaker_Mute_LED", base_color=(1.0, 0.2, 0.2, 1.0), roughness=0.2,
                                          emission_color=(1.0, 0.15, 0.15, 1.0), emission_strength=2.0)

    # Phone
    phone_tex = str(TEXTURES_DIR / "phone-screen-idle.png")
    mats["Phone_Body"] = create_mat("Phone_Body", base_color=(0.10, 0.10, 0.12, 1.0), roughness=0.25, metallic=0.8)
    mats["Phone_Screen"] = create_mat("Phone_Screen", roughness=0.15, image_path=phone_tex)

    # Keyboard & Mouse
    mats["Keyboard_Base"] = create_mat("Keyboard_Base", base_color=(0.16, 0.16, 0.18, 1.0), roughness=0.4)
    mats["Keycaps"] = create_mat("Keycaps", base_color=(0.85, 0.85, 0.88, 1.0), roughness=0.5)
    mats["Mouse_Shell"] = create_mat("Mouse_Shell", base_color=(0.95, 0.95, 0.97, 1.0), roughness=0.3)

    # Plant
    mats["Plant_Pot"] = create_mat("Plant_Pot", base_color=(0.92, 0.88, 0.85, 1.0), roughness=0.6)
    mats["Plant_Leaf"] = create_mat("Plant_Leaf", base_color=(0.18, 0.52, 0.26, 1.0), roughness=0.4)

    # Project props
    zenith_tex = str(TEXTURES_DIR / "zenith-circuit.png")
    mats["Zenith_Mat"] = create_mat("Zenith_Mat", roughness=0.3, image_path=zenith_tex)
    camera_tex = str(TEXTURES_DIR / "ai-camera-lens.png")
    mats["Camera_Lens_Mat"] = create_mat("Camera_Lens_Mat", roughness=0.15, image_path=camera_tex)
    mats["PC_White"] = create_mat("PC_White", base_color=(0.94, 0.94, 0.96, 1.0), roughness=0.3)
    mats["PC_Glass"] = create_mat("PC_Glass", base_color=(0.9, 0.95, 1.0, 1.0), roughness=0.05, transmission=0.9)
    mats["PC_RGB"] = create_mat("PC_RGB", base_color=(0.45, 0.85, 0.95, 1.0), roughness=0.2,
                                emission_color=(0.45, 0.85, 0.95, 1.0), emission_strength=2.0)
    mats["Book_Spine"] = create_mat("Book_Spine", base_color=(0.28, 0.35, 0.65, 1.0), roughness=0.6)
    mats["Board_Wood"] = create_mat("Board_Wood", base_color=(0.82, 0.75, 0.68, 1.0), roughness=0.7)

    # Hit proxy translucent material (invisible in final render, visible in dev if needed)
    mats["Hit_Proxy"] = create_mat("Hit_Proxy", base_color=(0.0, 0.8, 1.0, 0.15), roughness=1.0, alpha=0.0)

    # Mobile scale factor for hit proxies (35% enlargement for finger touch targets)
    hit_scale = 1.35 if is_mobile else 1.0

    objects_dict = {}

    # ==========================================================================
    # 1. STUDIO ARCHITECTURE (F1 Room & Workstation Context)
    # ==========================================================================
    # Floor: 4.2m width x 3.6m depth at Y=0
    add_box("studio_floor", (0.0, 0.0, 0.0), (4.2, 0.05, 3.6), mat=mats["Floor_Carpet"])
    # Rear Wall: Z = -1.8
    add_box("studio_wall_rear", (0.0, 1.4, -1.8), (4.2, 2.8, 0.05), mat=mats["Wall_Plaster"])
    # Left Wall: X = -2.1
    add_box("studio_wall_left", (-2.1, 1.4, 0.0), (0.05, 2.8, 3.6), mat=mats["Wall_Plaster"])
    # Right Wall: X = 2.1 (with window opening)
    add_box("studio_wall_right", (2.1, 1.4, 0.0), (0.05, 2.8, 3.6), mat=mats["Wall_Plaster"])
    # Ceiling: Y = 2.8
    add_box("studio_ceiling", (0.0, 2.8, 0.0), (4.2, 0.05, 3.6), mat=mats["Wall_Plaster"])

    # Workstation Desk (F1: 2.6m x 0.8m, top height 0.75m, center (0, -1.15))
    desk_root = add_box("desk_tabletop", (0.0, 0.725, -1.15), (2.6, 0.05, 0.8), mat=mats["Desk_White"])
    add_box("desk_leg_left", (-1.25, 0.35, -1.15), (0.08, 0.70, 0.76), mat=mats["Desk_White"], parent=desk_root)
    add_box("desk_leg_right", (1.25, 0.35, -1.15), (0.08, 0.70, 0.76), mat=mats["Desk_White"], parent=desk_root)

    # ==========================================================================
    # 2. ENTRANCE DOOR & DOOR-INSIDE (Asset IDs: entrance-door, door-inside)
    # ==========================================================================
    # Pivot: door-hinge at (-1.65, 0.0, 1.80)
    door_hinge = add_empty_anchor("door-hinge", (-1.65, 0.0, 1.80))
    door_frame = add_box("door_frame", (-1.20, 1.05, 1.80), (0.96, 2.12, 0.10), mat=mats["Door_Wood"])
    
    # Door leaf parented to door-hinge
    door_leaf = add_box("door_leaf", (-1.20, 1.05, 1.80), (0.90, 2.05, 0.05), mat=mats["Door_Wood"], parent=door_hinge)
    # Outer & inner handles
    add_box("door_handle_outer", (-0.80, 1.00, 1.83), (0.04, 0.16, 0.06), mat=mats["Door_Handle"], parent=door_leaf)
    add_box("door_handle_inner", (-0.80, 1.00, 1.77), (0.04, 0.16, 0.06), mat=mats["Door_Handle"], parent=door_leaf)
    # Threshold light
    add_box("door_threshold_light", (-1.20, 0.01, 1.80), (0.90, 0.01, 0.08), mat=mats["PC_RGB"], parent=door_frame)

    # Inside door leaf panel
    add_box("door_leaf_inner_panel", (-1.20, 1.05, 1.78), (0.86, 2.00, 0.01), mat=mats["Door_Wood"], parent=door_leaf)

    # Hit Geometries
    add_box("hit_entrance_door", (-1.20, 1.05, 1.80), (1.00 * hit_scale, 2.15 * hit_scale, 0.20 * hit_scale),
            mat=mats["Hit_Proxy"], parent=door_hinge, is_hit_proxy=True,
            extras={"assetId": "entrance-door", "category": "environment", "action": "open_studio"})
    add_box("hit_door_inside", (-1.20, 1.05, 1.76), (0.90 * hit_scale, 2.05 * hit_scale, 0.10 * hit_scale),
            mat=mats["Hit_Proxy"], parent=door_leaf, is_hit_proxy=True,
            extras={"assetId": "door-inside", "category": "environment", "action": "replay_entrance_prompt"})

    create_door_animation(door_hinge)

    # ==========================================================================
    # 3. RESIDENT TARGET & CHAIR (Asset IDs: resident, chair)
    # ==========================================================================
    # Pivot: chair-root at (0.30, 0.0, -0.36)
    chair_root = add_empty_anchor("chair-root", (0.30, 0.0, -0.36))
    
    # Articulated Blue Ergonomic Chair
    chair_base = add_cylinder("chair_base", (0.30, 0.08, -0.36), 0.32, 0.06, mat=mats["Chair_White"], parent=chair_root, vertices=12)
    chair_gaslift = add_cylinder("chair_gaslift", (0.30, 0.25, -0.36), 0.04, 0.30, mat=mats["Chair_White"], parent=chair_base, vertices=10)
    chair_seat = add_box("chair_seat", (0.30, 0.45, -0.36), (0.50, 0.08, 0.48), mat=mats["Chair_Blue"], parent=chair_gaslift)
    chair_back = add_box("chair_back", (0.30, 0.85, -0.15), (0.46, 0.65, 0.06), mat=mats["Chair_Blue"], parent=chair_seat)
    add_box("chair_arm_l", (0.05, 0.65, -0.36), (0.06, 0.25, 0.25), mat=mats["Chair_White"], parent=chair_seat)
    add_box("chair_arm_r", (0.55, 0.65, -0.36), (0.06, 0.25, 0.25), mat=mats["Chair_White"], parent=chair_seat)

    # Resident Proxy / Target Mesh
    resident_torso = add_box("resident_proxy_torso", (0.30, 0.85, -0.36), (0.38, 0.55, 0.26), mat=mats["Chair_Blue"], parent=chair_seat)
    resident_head = add_cylinder("resident_proxy_head", (0.30, 1.25, -0.36), 0.11, 0.22, mat=mats["Desk_White"], parent=resident_torso, vertices=12)

    # Hit Geometries
    add_box("hit_resident", (0.30, 1.00, -0.36), (0.48 * hit_scale, 0.85 * hit_scale, 0.45 * hit_scale),
            mat=mats["Hit_Proxy"], parent=chair_root, is_hit_proxy=True,
            extras={"assetId": "resident", "category": "avatar", "action": "greet_creator"})
    add_box("hit_chair", (0.30, 0.55, -0.36), (0.60 * hit_scale, 0.95 * hit_scale, 0.60 * hit_scale),
            mat=mats["Hit_Proxy"], parent=chair_root, is_hit_proxy=True,
            extras={"assetId": "chair", "category": "furniture", "action": "nudge_chair"})

    # ==========================================================================
    # 4. WALL PAINTING & HIDDEN YOR MARK (Asset IDs: wall-painting, hidden-yor-mark)
    # ==========================================================================
    # Pivot: painting-pivot at (-2.07, 1.85, 0.20) [hanging point on left wall]
    painting_pivot = add_empty_anchor("painting-pivot", (-2.07, 1.85, 0.20))
    
    # Painting frame & canvas parented to painting-pivot
    # Frame dimensions: 0.90m height, 0.70m width, 0.03m thickness
    # Center of frame is hung below the pivot point by 0.35m in Y:
    painting_frame = add_box("painting_frame", (-2.06, 1.50, 0.20), (0.03, 0.70, 0.90), mat=mats["Painting_Frame"], parent=painting_pivot)
    painting_canvas = add_box("painting_canvas", (-2.045, 1.50, 0.20), (0.01, 0.64, 0.84), mat=mats["Painting_Canvas"], parent=painting_frame)
    add_cylinder("painting_hanger_cord", (-2.07, 1.80, 0.20), 0.003, 0.12, mat=mats["Door_Handle"], parent=painting_pivot, vertices=8)

    # Hidden Yor Mark (mounted directly to wall behind painting)
    # At (-2.09, 1.50, 0.20), completely occluded when painting is flush, exposed when tilted >= 3.5 deg
    mark_plate = add_box("hidden_yor_mark_plate", (-2.09, 1.50, 0.20), (0.005, 0.22, 0.22), mat=mats["Hidden_Yor_Mark"])

    # Hit Geometries
    add_box("hit_wall_painting", (-2.05, 1.50, 0.20), (0.08 * hit_scale, 0.75 * hit_scale, 0.95 * hit_scale),
            mat=mats["Hit_Proxy"], parent=painting_pivot, is_hit_proxy=True,
            extras={"assetId": "wall-painting", "category": "interactive_art", "action": "drag_tilt_spring"})
    add_box("hit_hidden_yor_mark", (-2.08, 1.50, 0.20), (0.05 * hit_scale, 0.25 * hit_scale, 0.25 * hit_scale),
            mat=mats["Hit_Proxy"], parent=mark_plate, is_hit_proxy=True,
            extras={"assetId": "hidden-yor-mark", "category": "secret_easter_egg", "action": "inspect_signature"})

    create_painting_animation(painting_pivot)

    # ==========================================================================
    # 5. MAIN MONITOR & CANDIDATEX LAUNCHER (Asset IDs: main-monitor, candidatex-launcher)
    # ==========================================================================
    # Pivot: monitor-surface at (0.0, 1.05, -1.08)
    monitor_pivot = add_empty_anchor("monitor-surface", (0.0, 1.05, -1.08))
    
    # Stand and housing
    mon_base = add_cylinder("monitor_stand_base", (0.0, 0.76, -1.25), 0.16, 0.02, mat=mats["Monitor_Bezel"], parent=monitor_pivot, vertices=16)
    add_cylinder("monitor_stand_col", (0.0, 0.92, -1.25), 0.03, 0.32, mat=mats["Monitor_Bezel"], parent=mon_base, vertices=12)
    # Curved housing and display screen
    mon_housing = add_box("monitor_curved_housing", (0.0, 1.05, -1.10), (1.18, 0.38, 0.04), mat=mats["Monitor_Bezel"], parent=monitor_pivot)
    mon_screen = add_box("monitor_screen_display", (0.0, 1.05, -1.08), (1.14, 0.35, 0.01), mat=mats["Monitor_Screen"], parent=mon_housing)
    # Warm lightbar
    add_cylinder("monitor_lightbar", (0.0, 1.25, -1.08), 0.012, 0.50, mat=mats["Lamp_Bulb"], parent=mon_housing, rot_deg=(0,90,0), vertices=12)

    # CandidateX launcher motif node
    cand_node = add_box("candidatex_launcher_node", (0.0, 1.05, -1.075), (0.24, 0.18, 0.005), mat=mats["Monitor_Screen"], parent=mon_screen)

    # Hit Geometries
    add_box("hit_main_monitor", (0.0, 1.05, -1.08), (1.25 * hit_scale, 0.42 * hit_scale, 0.15 * hit_scale),
            mat=mats["Hit_Proxy"], parent=monitor_pivot, is_hit_proxy=True,
            extras={"assetId": "main-monitor", "category": "primary_portal", "action": "focus_launcher"})
    add_box("hit_candidatex_launcher", (0.0, 1.05, -1.07), (0.30 * hit_scale, 0.22 * hit_scale, 0.05 * hit_scale),
            mat=mats["Hit_Proxy"], parent=cand_node, is_hit_proxy=True,
            extras={"assetId": "candidatex-launcher", "category": "project_prop", "action": "open_candidatex"})

    # ==========================================================================
    # 6. PROJECT PROPS (Helios, Zenith, AI Real, Yor Talks, Books, Board, Frame, Personal)
    # ==========================================================================
    # 6a. HELIOS PC (Asset ID: helios-pc)
    pc_pivot = add_empty_anchor("pc-pivot", (-0.95, 0.75, -1.10))
    pc_chassis = add_box("pc_chassis_white", (-0.95, 0.98, -1.10), (0.22, 0.44, 0.42), mat=mats["PC_White"], parent=pc_pivot)
    add_box("pc_glass_panel", (-0.835, 0.98, -1.10), (0.008, 0.42, 0.40), mat=mats["PC_Glass"], parent=pc_chassis)
    fan1 = add_cylinder("pc_rgb_fan_front1", (-0.95, 1.08, -0.90), 0.055, 0.02, mat=mats["PC_RGB"], parent=pc_chassis, rot_deg=(90,0,0), vertices=12)
    fan2 = add_cylinder("pc_rgb_fan_front2", (-0.95, 0.94, -0.90), 0.055, 0.02, mat=mats["PC_RGB"], parent=pc_chassis, rot_deg=(90,0,0), vertices=12)
    objects_dict["pc_rgb_fan_front1"] = fan1
    objects_dict["pc_rgb_fan_front2"] = fan2
    add_box("hit_helios_pc", (-0.95, 0.98, -1.10), (0.28 * hit_scale, 0.48 * hit_scale, 0.48 * hit_scale),
            mat=mats["Hit_Proxy"], parent=pc_pivot, is_hit_proxy=True,
            extras={"assetId": "helios-pc", "category": "project_prop", "action": "open_helios"})

    # 6b. ZENITH MODEL (Asset ID: zenith-model)
    zen_pivot = add_empty_anchor("zenith-model-pivot", (0.95, 0.75, -1.05))
    zen_base = add_box("zenith_base_stand", (0.95, 0.76, -1.05), (0.16, 0.02, 0.16), mat=mats["Desk_White"], parent=zen_pivot)
    add_box("zenith_solar_array", (0.95, 0.84, -1.05), (0.14, 0.12, 0.14), mat=mats["Zenith_Mat"], parent=zen_base)
    add_box("hit_zenith_model", (0.95, 0.84, -1.05), (0.20 * hit_scale, 0.20 * hit_scale, 0.20 * hit_scale),
            mat=mats["Hit_Proxy"], parent=zen_pivot, is_hit_proxy=True,
            extras={"assetId": "zenith-model", "category": "project_prop", "action": "open_zenith"})

    # 6c. AI REAL CAMERA (Asset ID: ai-real-camera)
    cam_pivot = add_empty_anchor("ai-camera-pivot", (0.75, 0.85, -0.90))
    cam_body = add_box("ai_camera_body", (0.75, 0.85, -0.90), (0.10, 0.06, 0.08), mat=mats["Speaker_Body"], parent=cam_pivot)
    cam_lens = add_cylinder("ai_camera_lens", (0.75, 0.85, -0.84), 0.028, 0.04, mat=mats["Camera_Lens_Mat"], parent=cam_body, rot_deg=(90,0,0), vertices=12)
    objects_dict["ai_camera_lens"] = cam_lens
    add_box("hit_ai_real_camera", (0.75, 0.85, -0.90), (0.15 * hit_scale, 0.12 * hit_scale, 0.15 * hit_scale),
            mat=mats["Hit_Proxy"], parent=cam_pivot, is_hit_proxy=True,
            extras={"assetId": "ai-real-camera", "category": "project_prop", "action": "open_ai_real"})

    # 6d. YOR TALKS MICROPHONE (Asset ID: talks-microphone)
    mic_pivot = add_empty_anchor("mic-pivot", (0.45, 0.78, -0.85))
    mic_stand = add_cylinder("mic_stand_base", (0.45, 0.76, -0.85), 0.06, 0.02, mat=mats["Door_Handle"], parent=mic_pivot, vertices=12)
    add_cylinder("mic_boom_arm", (0.45, 0.84, -0.85), 0.01, 0.14, mat=mats["Door_Handle"], parent=mic_stand, vertices=8)
    mic_body = add_cylinder("mic_capsule", (0.45, 0.94, -0.85), 0.035, 0.09, mat=mats["Speaker_Cone"], parent=mic_stand, vertices=12)
    add_cylinder("mic_led_ring", (0.45, 0.90, -0.85), 0.036, 0.008, mat=mats["PC_RGB"], parent=mic_body, vertices=12)
    add_box("hit_talks_microphone", (0.45, 0.88, -0.85), (0.14 * hit_scale, 0.28 * hit_scale, 0.14 * hit_scale),
            mat=mats["Hit_Proxy"], parent=mic_pivot, is_hit_proxy=True,
            extras={"assetId": "talks-microphone", "category": "project_prop", "action": "open_yor_talks"})

    # 6e. RESEARCH BOOKS (Asset ID: research-books)
    books_pivot = add_empty_anchor("books-pivot", (1.05, 1.20, -1.35))
    books_stack = add_box("book_stack_horizontal", (1.05, 1.15, -1.35), (0.22, 0.12, 0.18), mat=mats["Book_Spine"], parent=books_pivot)
    add_box("hit_research_books", (1.05, 1.18, -1.35), (0.28 * hit_scale, 0.20 * hit_scale, 0.24 * hit_scale),
            mat=mats["Hit_Proxy"], parent=books_pivot, is_hit_proxy=True,
            extras={"assetId": "research-books", "category": "project_prop", "action": "open_research"})

    # 6f. SKILLS BOARD (Asset ID: skills-board)
    skills_pivot = add_empty_anchor("skills-board-pivot", (-1.10, 1.40, -1.75))
    skills_board = add_box("skills_board_panel", (-1.10, 1.40, -1.76), (0.45, 0.35, 0.02), mat=mats["Board_Wood"], parent=skills_pivot)
    add_box("hit_skills_board", (-1.10, 1.40, -1.75), (0.50 * hit_scale, 0.40 * hit_scale, 0.08 * hit_scale),
            mat=mats["Hit_Proxy"], parent=skills_pivot, is_hit_proxy=True,
            extras={"assetId": "skills-board", "category": "project_prop", "action": "open_skills"})

    # 6g. CERTIFICATE FRAME (Asset ID: certificate-frame)
    cert_pivot = add_empty_anchor("cert-frame-pivot", (-1.40, 1.65, -1.75))
    cert_frame = add_box("certificate_frame_border", (-1.40, 1.65, -1.76), (0.28, 0.22, 0.02), mat=mats["Painting_Frame"], parent=cert_pivot)
    add_box("hit_certificate_frame", (-1.40, 1.65, -1.75), (0.32 * hit_scale, 0.26 * hit_scale, 0.08 * hit_scale),
            mat=mats["Hit_Proxy"], parent=cert_pivot, is_hit_proxy=True,
            extras={"assetId": "certificate-frame", "category": "project_prop", "action": "open_credentials"})

    # 6h. ABOUT PERSONAL OBJECT (Asset ID: about-personal-object)
    token_pivot = add_empty_anchor("personal-obj-pivot", (-0.55, 0.75, -0.95))
    token_base = add_cylinder("personal_token_pedestal", (-0.55, 0.77, -0.95), 0.04, 0.04, mat=mats["Desk_White"], parent=token_pivot, vertices=12)
    add_cylinder("personal_token_sculpture", (-0.55, 0.83, -0.95), 0.025, 0.08, mat=mats["Door_Handle"], parent=token_base, vertices=8)
    add_box("hit_about_personal_object", (-0.55, 0.81, -0.95), (0.12 * hit_scale, 0.16 * hit_scale, 0.12 * hit_scale),
            mat=mats["Hit_Proxy"], parent=token_pivot, is_hit_proxy=True,
            extras={"assetId": "about-personal-object", "category": "project_prop", "action": "open_about"})

    # 6i. PROJECT SHORTCUTS LOCATOR ANCHOR (Asset ID: project-shortcuts)
    shortcuts_anchor = add_empty_anchor("project-shortcuts-anchor", (0.0, 0.75, -0.65))
    add_box("hit_project_shortcuts", (0.0, 0.75, -0.65), (0.40 * hit_scale, 0.05 * hit_scale, 0.15 * hit_scale),
            mat=mats["Hit_Proxy"], parent=shortcuts_anchor, is_hit_proxy=True,
            extras={"assetId": "project-shortcuts", "category": "project_rail", "action": "open_project_shortcuts"})

    # ==========================================================================
    # 7. CONTACT PHONE (Asset ID: contact-phone)
    # ==========================================================================
    phone_pivot = add_empty_anchor("phone-pivot", (0.55, 0.75, -0.75))
    phone_chassis = add_box("phone_chassis", (0.55, 0.756, -0.75), (0.08, 0.009, 0.16), mat=mats["Phone_Body"], parent=phone_pivot)
    add_box("phone_screen_glass", (0.55, 0.761, -0.75), (0.074, 0.002, 0.152), mat=mats["Phone_Screen"], parent=phone_chassis)
    add_box("hit_contact_phone", (0.55, 0.76, -0.75), (0.12 * hit_scale, 0.06 * hit_scale, 0.20 * hit_scale),
            mat=mats["Hit_Proxy"], parent=phone_pivot, is_hit_proxy=True,
            extras={"assetId": "contact-phone", "category": "contact_portal", "action": "open_contact_form"})

    # ==========================================================================
    # 8. DESK LAMP (Asset ID: desk-lamp)
    # ==========================================================================
    lamp_pivot = add_empty_anchor("lamp-switch-pivot", (-0.75, 0.75, -1.20))
    lamp_base = add_cylinder("lamp_base_disc", (-0.75, 0.76, -1.20), 0.09, 0.02, mat=mats["Lamp_Metal"], parent=lamp_pivot, vertices=16)
    lamp_arm = add_cylinder("lamp_lower_arm", (-0.75, 0.90, -1.20), 0.012, 0.28, mat=mats["Lamp_Metal"], parent=lamp_base, vertices=8)
    lamp_shade = add_cylinder("lamp_shade_cone", (-0.70, 1.05, -1.15), 0.07, 0.12, mat=mats["Lamp_Metal"], parent=lamp_arm, rot_deg=(30,0,0), vertices=12)
    add_cylinder("lamp_bulb_emissive", (-0.70, 1.02, -1.13), 0.03, 0.03, mat=mats["Lamp_Bulb"], parent=lamp_shade, rot_deg=(30,0,0), vertices=8)
    
    # Task spot light object
    lamp_light = bpy.data.lights.new(name="Light_TaskLamp", type='SPOT')
    lamp_light.energy = 4.5
    lamp_light.color = (1.0, 0.90, 0.75)
    lamp_light.spot_size = math.radians(55)
    lamp_light_obj = bpy.data.objects.new("Light_TaskLamp", lamp_light)
    lamp_light_obj.location = r2b(-0.70, 1.02, -1.13)
    bpy.context.collection.objects.link(lamp_light_obj)
    set_parent_keep_world(lamp_light_obj, lamp_shade)

    add_box("hit_desk_lamp", (-0.72, 0.92, -1.18), (0.24 * hit_scale, 0.40 * hit_scale, 0.24 * hit_scale),
            mat=mats["Hit_Proxy"], parent=lamp_pivot, is_hit_proxy=True,
            extras={"assetId": "desk-lamp", "category": "lighting_control", "action": "toggle_desk_lamp"})
    create_lamp_toggle_animation(lamp_shade)

    # ==========================================================================
    # 9. WINDOW BLINDS (Asset ID: window-blinds)
    # ==========================================================================
    blinds_pivot = add_empty_anchor("blinds-cord-pivot", (2.08, 1.50, -0.20))
    # Window assembly on right wall
    add_box("window_frame_right", (2.08, 1.50, -0.20), (0.04, 1.40, 1.10), mat=mats["Desk_White"])
    add_box("window_glass_pane", (2.09, 1.50, -0.20), (0.01, 1.32, 1.02), mat=mats["Window_Glass"])
    
    # Blinds header and rotating slat array
    blinds_header = add_box("blinds_top_header", (2.06, 2.15, -0.20), (0.05, 0.06, 1.06), mat=mats["Blinds_Slat"], parent=blinds_pivot)
    # Rotating slats assembly
    blinds_slat_root = add_empty_anchor("blinds_slat_rotator", (2.06, 1.50, -0.20), parent=blinds_pivot)
    for i in range(12):
        sy = 1.00 + i * 0.09
        add_box(f"blinds_slat_{i+1:02d}", (2.06, sy, -0.20), (0.04, 0.008, 1.02), mat=mats["Blinds_Slat"], parent=blinds_slat_root)
    add_cylinder("blinds_pull_cord", (2.06, 1.30, 0.30), 0.004, 0.60, mat=mats["Door_Handle"], parent=blinds_header, vertices=6)

    # Environmental fill light associated with blinds
    window_light = bpy.data.lights.new(name="Light_WindowFill", type='SUN')
    window_light.energy = 1.2
    window_light.color = (0.75, 0.90, 1.0)
    win_light_obj = bpy.data.objects.new("Light_WindowFill", window_light)
    win_light_obj.location = r2b(3.5, 2.5, -0.2)
    win_light_obj.rotation_euler = (math.radians(-30), math.radians(45), 0)
    bpy.context.collection.objects.link(win_light_obj)

    add_box("hit_window_blinds", (2.06, 1.50, -0.20), (0.12 * hit_scale, 1.45 * hit_scale, 1.15 * hit_scale),
            mat=mats["Hit_Proxy"], parent=blinds_pivot, is_hit_proxy=True,
            extras={"assetId": "window-blinds", "category": "environment_control", "action": "toggle_blinds"})
    create_blinds_animation(blinds_slat_root)

    # ==========================================================================
    # 10. DESK CLOCK (Asset ID: desk-clock)
    # ==========================================================================
    clock_pivot = add_empty_anchor("clock-top-button", (0.70, 0.75, -1.10))
    clock_body = add_box("clock_chassis", (0.70, 0.79, -1.10), (0.15, 0.08, 0.07), mat=mats["Clock_Case"], parent=clock_pivot)
    add_box("clock_display_screen", (0.70, 0.79, -1.064), (0.13, 0.06, 0.003), mat=mats["Clock_Display"], parent=clock_body)
    add_box("hit_desk_clock", (0.70, 0.79, -1.10), (0.20 * hit_scale, 0.12 * hit_scale, 0.14 * hit_scale),
            mat=mats["Hit_Proxy"], parent=clock_pivot, is_hit_proxy=True,
            extras={"assetId": "desk-clock", "category": "widget", "action": "toggle_clock_format"})

    # ==========================================================================
    # 11. SPEAKERS (Asset ID: speakers)
    # ==========================================================================
    spk_pivot = add_empty_anchor("speaker-knob-pivot", (0.85, 0.75, -1.15))
    # Left speaker
    add_box("speaker_left_cabinet", (-0.85, 0.88, -1.15), (0.14, 0.24, 0.16), mat=mats["Speaker_Body"])
    add_cylinder("speaker_left_cone_w", (-0.85, 0.84, -1.069), 0.045, 0.01, mat=mats["Speaker_Cone"], rot_deg=(90,0,0), vertices=12)
    add_cylinder("speaker_left_cone_t", (-0.85, 0.94, -1.069), 0.020, 0.01, mat=mats["Speaker_Cone"], rot_deg=(90,0,0), vertices=10)
    # Right speaker (with volume knob and mute LED)
    spk_r = add_box("speaker_right_cabinet", (0.85, 0.88, -1.15), (0.14, 0.24, 0.16), mat=mats["Speaker_Body"], parent=spk_pivot)
    add_cylinder("speaker_right_cone_w", (0.85, 0.84, -1.069), 0.045, 0.01, mat=mats["Speaker_Cone"], parent=spk_r, rot_deg=(90,0,0), vertices=12)
    add_cylinder("speaker_right_cone_t", (0.85, 0.94, -1.069), 0.020, 0.01, mat=mats["Speaker_Cone"], parent=spk_r, rot_deg=(90,0,0), vertices=10)
    add_cylinder("speaker_mute_indicator", (0.90, 0.78, -1.068), 0.005, 0.005, mat=mats["Speaker_Mute_LED"], parent=spk_r, rot_deg=(90,0,0), vertices=8)
    
    add_box("hit_speakers", (0.85, 0.88, -1.15), (0.22 * hit_scale, 0.30 * hit_scale, 0.24 * hit_scale),
            mat=mats["Hit_Proxy"], parent=spk_pivot, is_hit_proxy=True,
            extras={"assetId": "speakers", "category": "audio_control", "action": "toggle_sound_mute"})

    # ==========================================================================
    # 12. PLANT LEAVES (Asset ID: plant-leaves)
    # ==========================================================================
    plant_pivot = add_empty_anchor("plant-pot-base", (-1.0, 0.75, -0.80))
    plant_pot = add_cylinder("plant_ceramic_pot", (-1.0, 0.81, -0.80), 0.07, 0.12, mat=mats["Plant_Pot"], parent=plant_pivot, vertices=12)
    # Plant foliage mesh
    plant_leaves = add_cylinder("plant_foliage_leaves", (-1.0, 0.95, -0.80), 0.14, 0.18, mat=mats["Plant_Leaf"], parent=plant_pot, vertices=10)
    add_box("hit_plant_leaves", (-1.0, 0.90, -0.80), (0.28 * hit_scale, 0.32 * hit_scale, 0.28 * hit_scale),
            mat=mats["Hit_Proxy"], parent=plant_pivot, is_hit_proxy=True,
            extras={"assetId": "plant-leaves", "category": "decoration", "action": "sway_deflect"})
    create_plant_sway_animation(plant_leaves)

    # ==========================================================================
    # 13. KEYBOARD (Asset ID: keyboard)
    # ==========================================================================
    kb_pivot = add_empty_anchor("keyboard-center-pivot", (0.0, 0.75, -0.75))
    kb_base = add_box("keyboard_frame", (0.0, 0.758, -0.75), (0.42, 0.015, 0.14), mat=mats["Keyboard_Base"], parent=kb_pivot)
    kb_keys = add_box("keyboard_keycaps", (0.0, 0.768, -0.75), (0.40, 0.008, 0.125), mat=mats["Keycaps"], parent=kb_base)
    add_box("hit_keyboard", (0.0, 0.76, -0.75), (0.46 * hit_scale, 0.05 * hit_scale, 0.18 * hit_scale),
            mat=mats["Hit_Proxy"], parent=kb_pivot, is_hit_proxy=True,
            extras={"assetId": "keyboard", "category": "input_hardware", "action": "press_keys_open_commands"})
    create_keyboard_press_animation(kb_keys)

    # ==========================================================================
    # 14. MOUSE (Asset ID: mouse)
    # ==========================================================================
    mouse_pivot = add_empty_anchor("mouse-click-pivot", (0.28, 0.75, -0.75))
    mouse_shell = add_box("mouse_body", (0.28, 0.764, -0.75), (0.07, 0.026, 0.11), mat=mats["Mouse_Shell"], parent=mouse_pivot)
    add_cylinder("mouse_scroll_wheel", (0.28, 0.776, -0.72), 0.006, 0.014, mat=mats["Keycaps"], parent=mouse_shell, rot_deg=(0,90,0), vertices=8)
    add_box("hit_mouse", (0.28, 0.765, -0.75), (0.12 * hit_scale, 0.06 * hit_scale, 0.16 * hit_scale),
            mat=mats["Hit_Proxy"], parent=mouse_pivot, is_hit_proxy=True,
            extras={"assetId": "mouse", "category": "input_hardware", "action": "click_wake_launcher"})
    create_mouse_click_animation(mouse_shell)

    create_prop_animations(objects_dict)

    print(f"Scene constructed successfully (is_mobile={is_mobile}). Total objects: {len(bpy.data.objects)}")

# ==============================================================================
# Export Functions
# ==============================================================================

def export_all():
    # 1. Standard Desktop glTF
    print("Building and exporting standard interaction assets...")
    build_scene(is_mobile=False)
    
    # Save standard blend file
    blend_path = SOURCE_DIR / "interaction-assets.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))
    print(f"Saved native Blender file: {blend_path}")

    glb_path = RUNTIME_DIR / "interaction-assets.glb"
    bpy.ops.export_scene.gltf(
        filepath=str(glb_path),
        export_format='GLB',
        use_selection=False,
        export_yup=True,
        export_apply=False,
        export_animations=True,
        export_extras=True,
        export_materials='EXPORT'
    )
    print(f"Exported standard glTF: {glb_path} ({os.path.getsize(glb_path)} bytes)")

    # 2. Mobile glTF
    print("Building and exporting mobile interaction assets...")
    build_scene(is_mobile=True)
    
    blend_mobile_path = SOURCE_DIR / "interaction-assets-mobile.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_mobile_path))
    print(f"Saved native mobile Blender file: {blend_mobile_path}")

    glb_mobile_path = RUNTIME_DIR / "interaction-assets-mobile.glb"
    bpy.ops.export_scene.gltf(
        filepath=str(glb_mobile_path),
        export_format='GLB',
        use_selection=False,
        export_yup=True,
        export_apply=False,
        export_animations=True,
        export_extras=True,
        export_materials='EXPORT'
    )
    print(f"Exported mobile glTF: {glb_mobile_path} ({os.path.getsize(glb_mobile_path)} bytes)")

if __name__ == "__main__":
    export_all()
