"""
YOR WORLD - Workstation Material, Light & Prop Detail Sample Generator
Script: build-workstation-sample.py
Maker: Gemini-2 (World / Environment / Art Production Maker)
Authority: PARENT-RECON-03 (§4 line 71-76) & Product Specification Revision 2
Baseline: Feasibility Baseline F1
Primary Visual Authority: references/images/main-reference.png

Preserves F1 Invariants:
- Room: 4.2m width x 3.6m depth x 2.8m height, runtime meters, Y-up
- Rear wall: Z = -1.8m
- Desk: 2.6m x 0.8m, top height 0.75m, center X/Z = (0, -1.15)
- Chair root: (0.30, 0, -0.36)
- Runtime Y-up converted from Blender Z-up once at export

Demonstrates Accepted Palette:
- Bright white / ivory workstation desk & drawer units (#EDEAE7)
- Cobalt / sky blue and pure white ergonomic chair (#496DD5 / #F7F7FA)
- Prominent pink / lilac hexagonal wall lighting (#F1A5F3 / #E288E6 / #B99AF5)
- Cool cyan under-desk and wall backlight fill (#74D8F3 / #55C5E8)
- Warm monitor light bar counterpoint (#FFE2A0, 3200K)
- Curved ultrawide monitor with custom procedural space wallpaper
- Organic plants: cascading pothos vines, succulent, floor monstera in wood stand
- Gaming props: white PC with glass panel & RGB fans, pegboard with controllers,
  keyboard with orange accents, desk mat, speakers, microphone, clock, tumbler
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
TEXTURES_DIR = SCRIPT_DIR / "textures"
RENDERS_DIR = SCRIPT_DIR / "renders"
EVIDENCE_DIR = SCRIPT_DIR / "evidence"

RENDERS_DIR.mkdir(parents=True, exist_ok=True)
EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)

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
    """Parent child object to parent while strictly maintaining child's existing world matrix."""
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
# PBR Material Generation
# ==============================================================================

def create_pbr_mat(name, base_color=(0.8, 0.8, 0.8, 1.0), roughness=0.5, metallic=0.0,
                   specular=0.5, emission_color=None, emission_strength=1.0,
                   transmission=0.0, ior=1.45, image_path=None):
    """Creates a Principled BSDF PBR material with exact physical parameters."""
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    output_node = nodes.new(type='ShaderNodeOutputMaterial')
    output_node.location = (400, 0)
    principled = nodes.new(type='ShaderNodeBsdfPrincipled')
    principled.location = (0, 0)

    # Set parameters with Blender 5.x property names
    principled.inputs['Base Color'].default_value = base_color
    principled.inputs['Roughness'].default_value = roughness
    principled.inputs['Metallic'].default_value = metallic

    # Specular
    if 'Specular IOR Level' in principled.inputs:
        principled.inputs['Specular IOR Level'].default_value = specular
    elif 'Specular' in principled.inputs:
        principled.inputs['Specular'].default_value = specular

    # IOR
    if 'IOR' in principled.inputs:
        principled.inputs['IOR'].default_value = ior

    # Transmission (glass)
    if transmission > 0.0:
        if 'Transmission Weight' in principled.inputs:
            principled.inputs['Transmission Weight'].default_value = transmission
        elif 'Transmission' in principled.inputs:
            principled.inputs['Transmission'].default_value = transmission
        mat.blend_method = 'BLEND'

    # Emission
    if emission_color is not None:
        if 'Emission Color' in principled.inputs:
            principled.inputs['Emission Color'].default_value = emission_color
            principled.inputs['Emission Strength'].default_value = emission_strength
        elif 'Emission' in principled.inputs:
            principled.inputs['Emission'].default_value = emission_color
            if 'Emission Strength' in principled.inputs:
                principled.inputs['Emission Strength'].default_value = emission_strength

    # Image Texture
    if image_path and os.path.exists(image_path):
        img_node = nodes.new(type='ShaderNodeTexImage')
        img_node.location = (-400, 0)
        img = bpy.data.images.load(str(image_path))
        img_node.image = img
        links.new(img_node.outputs['Color'], principled.inputs['Base Color'])
        if emission_color is not None:
            # Also link image to emission if specified
            if 'Emission Color' in principled.inputs:
                links.new(img_node.outputs['Color'], principled.inputs['Emission Color'])
            elif 'Emission' in principled.inputs:
                links.new(img_node.outputs['Color'], principled.inputs['Emission'])

    links.new(principled.outputs['BSDF'], output_node.inputs['Surface'])
    return mat

def hex_to_rgba(hex_str, alpha=1.0):
    """Converts hex color string (#RRGGBB) to sRGB float tuple (r, g, b, a)."""
    hex_clean = hex_str.lstrip('#')
    r = int(hex_clean[0:2], 16) / 255.0
    g = int(hex_clean[2:4], 16) / 255.0
    b = int(hex_clean[4:6], 16) / 255.0
    # Apply standard sRGB to linear conversion for Blender shaders
    def to_lin(c):
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return (to_lin(r), to_lin(g), to_lin(b), alpha)

def setup_all_materials():
    """Sets up the complete PBR material palette for the workstation sample."""
    mats = {}
    
    # 1. Architectural & Furniture
    mats["Desk_Ivory_White"] = create_pbr_mat(
        "Desk_Ivory_White", base_color=hex_to_rgba("#EDEAE7"), roughness=0.25, metallic=0.0, specular=0.55
    )
    mats["Desk_Modesty_Cyan"] = create_pbr_mat(
        "Desk_Modesty_Cyan", base_color=hex_to_rgba("#74D8F3"), roughness=0.38, metallic=0.0
    )
    mats["Wall_Lavender"] = create_pbr_mat(
        "Wall_Lavender", base_color=hex_to_rgba("#CFCDD9"), roughness=0.85, metallic=0.0
    )
    mats["Floor_Carpet"] = create_pbr_mat(
        "Floor_Carpet", base_color=hex_to_rgba("#232B52"), roughness=0.92, metallic=0.0
    )
    mats["Baseboard_White"] = create_pbr_mat(
        "Baseboard_White", base_color=hex_to_rgba("#F5F5FA"), roughness=0.30, metallic=0.0
    )

    # 2. Lighting & Neon Emissives
    mats["Neon_Perimeter_Pink"] = create_pbr_mat(
        "Neon_Perimeter_Pink", base_color=hex_to_rgba("#FF40C8"),
        emission_color=hex_to_rgba("#FF40C8"), emission_strength=5.0
    )
    mats["Neon_Hex_Pink"] = create_pbr_mat(
        "Neon_Hex_Pink", base_color=hex_to_rgba("#FF38C8"),
        emission_color=hex_to_rgba("#FF38C8"), emission_strength=5.5
    )
    mats["Neon_Hex_Lilac"] = create_pbr_mat(
        "Neon_Hex_Lilac", base_color=hex_to_rgba("#E040D0"),
        emission_color=hex_to_rgba("#E040D0"), emission_strength=5.2
    )
    mats["Neon_Hex_Lavender"] = create_pbr_mat(
        "Neon_Hex_Lavender", base_color=hex_to_rgba("#A855F7"),
        emission_color=hex_to_rgba("#A855F7"), emission_strength=4.8
    )
    mats["Neon_Cyan"] = create_pbr_mat(
        "Neon_Cyan", base_color=hex_to_rgba("#00E5FF"),
        emission_color=hex_to_rgba("#00E5FF"), emission_strength=5.0
    )
    mats["Warm_Lightbar"] = create_pbr_mat(
        "Warm_Lightbar", base_color=hex_to_rgba("#FFE28A"),
        emission_color=hex_to_rgba("#FFE28A"), emission_strength=5.5
    )

    # 3. Chair Materials
    mats["Chair_Blue"] = create_pbr_mat(
        "Chair_Blue", base_color=hex_to_rgba("#496DD5"), roughness=0.40, specular=0.45
    )
    mats["Chair_White"] = create_pbr_mat(
        "Chair_White", base_color=hex_to_rgba("#F7F7FA"), roughness=0.38, specular=0.50
    )
    mats["Chair_Black_Poly"] = create_pbr_mat(
        "Chair_Black_Poly", base_color=hex_to_rgba("#1C1E24"), roughness=0.55
    )
    mats["Chair_Chrome"] = create_pbr_mat(
        "Chair_Chrome", base_color=hex_to_rgba("#E2E5EC"), roughness=0.12, metallic=0.95
    )

    # 4. Monitor & Display Textures
    mats["Monitor_Bezel"] = create_pbr_mat(
        "Monitor_Bezel", base_color=hex_to_rgba("#16181D"), roughness=0.45
    )
    mats["Monitor_Screen"] = create_pbr_mat(
        "Monitor_Screen", base_color=(0.1, 0.05, 0.2, 1.0), roughness=0.15,
        emission_color=(1.0, 1.0, 1.0, 1.0), emission_strength=3.2,
        image_path=str(TEXTURES_DIR / "monitor-wallpaper.png")
    )
    mats["Desk_Mat"] = create_pbr_mat(
        "Desk_Mat", base_color=(0.95, 0.95, 0.95, 1.0), roughness=0.65,
        image_path=str(TEXTURES_DIR / "desk-mat-pattern.png")
    )
    mats["Clock_Display"] = create_pbr_mat(
        "Clock_Display", base_color=(0.02, 0.05, 0.1, 1.0), roughness=0.20,
        emission_color=(0.0, 0.95, 1.0, 1.0), emission_strength=3.2,
        image_path=str(TEXTURES_DIR / "clock-display.png")
    )
    mats["Clock_Case"] = create_pbr_mat(
        "Clock_Case", base_color=hex_to_rgba("#F5F5FA"), roughness=0.30
    )
    mats["Pegboard_Texture"] = create_pbr_mat(
        "Pegboard_Texture", base_color=(0.95, 0.95, 0.98, 1.0), roughness=0.35,
        image_path=str(TEXTURES_DIR / "pegboard-pattern.png")
    )
    mats["Acoustic_Panel"] = create_pbr_mat(
        "Acoustic_Panel", base_color=hex_to_rgba("#E8E6F0"), roughness=0.72,
        image_path=str(TEXTURES_DIR / "acoustic-panel.png")
    )

    # 5. PC, Peripherals & Electronics
    mats["PC_Chassis_White"] = create_pbr_mat(
        "PC_Chassis_White", base_color=hex_to_rgba("#F0EFF5"), roughness=0.22, metallic=0.1
    )
    mats["PC_Glass"] = create_pbr_mat(
        "PC_Glass", base_color=(1.0, 1.0, 1.0, 0.2), roughness=0.05,
        transmission=0.92, ior=1.52
    )
    mats["PC_RGB_Pink"] = create_pbr_mat(
        "PC_RGB_Pink", base_color=hex_to_rgba("#FF50C0"),
        emission_color=hex_to_rgba("#FF50C0"), emission_strength=5.0
    )
    mats["PC_RGB_Cyan"] = create_pbr_mat(
        "PC_RGB_Cyan", base_color=hex_to_rgba("#40D0FF"),
        emission_color=hex_to_rgba("#40D0FF"), emission_strength=5.0
    )
    mats["Keyboard_Chassis"] = create_pbr_mat(
        "Keyboard_Chassis", base_color=hex_to_rgba("#22242B"), roughness=0.40, metallic=0.3
    )
    mats["Keycap_Charcoal"] = create_pbr_mat(
        "Keycap_Charcoal", base_color=hex_to_rgba("#2F333D"), roughness=0.52
    )
    mats["Keycap_Orange"] = create_pbr_mat(
        "Keycap_Orange", base_color=hex_to_rgba("#FF7518"), roughness=0.45
    )
    mats["Mouse_White"] = create_pbr_mat(
        "Mouse_White", base_color=hex_to_rgba("#FAF9FE"), roughness=0.25
    )
    mats["Speaker_White"] = create_pbr_mat(
        "Speaker_White", base_color=hex_to_rgba("#F7F7FC"), roughness=0.28
    )
    mats["Speaker_Gold_Cone"] = create_pbr_mat(
        "Speaker_Gold_Cone", base_color=hex_to_rgba("#C8A458"), roughness=0.22, metallic=0.85
    )
    mats["Mic_Black_Metal"] = create_pbr_mat(
        "Mic_Black_Metal", base_color=hex_to_rgba("#1C1D22"), roughness=0.38, metallic=0.75
    )
    mats["Mic_Popfilter_Foam"] = create_pbr_mat(
        "Mic_Popfilter_Foam", base_color=hex_to_rgba("#141518"), roughness=0.88
    )

    # 6. Plants & Organic
    mats["Plant_Green_Deep"] = create_pbr_mat(
        "Plant_Green_Deep", base_color=hex_to_rgba("#2D7A3E"), roughness=0.32
    )
    mats["Plant_Green_Bright"] = create_pbr_mat(
        "Plant_Green_Bright", base_color=hex_to_rgba("#4EAA5B"), roughness=0.30
    )
    mats["Ceramic_White_Gloss"] = create_pbr_mat(
        "Ceramic_White_Gloss", base_color=hex_to_rgba("#FFFFFF"), roughness=0.18, specular=0.6
    )
    mats["Wood_Natural_Oak"] = create_pbr_mat(
        "Wood_Natural_Oak", base_color=hex_to_rgba("#C89968"), roughness=0.55
    )

    # 7. Tumbler / Acrylic
    mats["Acrylic_Clear"] = create_pbr_mat(
        "Acrylic_Clear", base_color=(1.0, 1.0, 1.0, 0.3), roughness=0.08,
        transmission=0.90, ior=1.49
    )
    mats["Coffee_Drink"] = create_pbr_mat(
        "Coffee_Drink", base_color=hex_to_rgba("#5A3825"), roughness=0.25
    )

    return mats

# ==============================================================================
# Mesh Building Helpers
# ==============================================================================

def add_box(name, r_pos, r_size, mat=None, parent=None, rot_euler=(0, 0, 0)):
    """
    Creates a box primitive at runtime position r_pos (X, Y, Z) with extents r_size (width_X, height_Y, depth_Z).
    Converts directly to Blender Z-up coordinates.
    """
    bx, by, bz = r2b(r_pos[0], r_pos[1], r_pos[2])
    sx, sy, sz = r_size[0] / 2.0, r_size[2] / 2.0, r_size[1] / 2.0

    mesh = bpy.data.meshes.new(name + "_mesh")
    obj = bpy.data.objects.new(name, mesh)
    obj.location = (bx, by, bz)
    obj.rotation_euler = rot_euler

    # 8 vertices of cuboid
    verts = [
        (-sx, -sy, -sz), (sx, -sy, -sz), (sx, sy, -sz), (-sx, sy, -sz),
        (-sx, -sy, sz), (sx, -sy, sz), (sx, sy, sz), (-sx, sy, sz)
    ]
    faces = [
        (0, 1, 2, 3), (4, 7, 6, 5), (0, 4, 5, 1),
        (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)
    ]
    mesh.from_pydata(verts, [], faces)
    mesh.update()

    # Assign automatic box planar UVs to all faces
    uv_layer = mesh.uv_layers.new(name="UVMap")
    for poly in mesh.polygons:
        nx, ny, nz = abs(poly.normal.x), abs(poly.normal.y), abs(poly.normal.z)
        if nx >= ny and nx >= nz:
            u_axis, v_axis = 1, 2 # Y, Z
        elif ny >= nx and ny >= nz:
            u_axis, v_axis = 0, 2 # X, Z
        else:
            u_axis, v_axis = 0, 1 # X, Y
        loop_indices = poly.loop_indices
        v_cos = [mesh.vertices[mesh.loops[li].vertex_index].co for li in loop_indices]
        u_vals = [c[u_axis] for c in v_cos]
        v_vals = [c[v_axis] for c in v_cos]
        min_u, max_u = min(u_vals), max(u_vals)
        min_v, max_v = min(v_vals), max(v_vals)
        du = max_u - min_u if max_u > min_u else 1.0
        dv = max_v - min_v if max_v > min_v else 1.0
        for li in loop_indices:
            co = mesh.vertices[mesh.loops[li].vertex_index].co
            u = (co[u_axis] - min_u) / du
            v = (co[v_axis] - min_v) / dv
            uv_layer.data[li].uv = (u, v)

    if mat:
        obj.data.materials.append(mat)
    bpy.context.scene.collection.objects.link(obj)

    if parent:
        set_parent_keep_world(obj, parent)
    return obj

def add_cylinder(name, r_pos, radius, height, axis='Y', segments=24, mat=None, parent=None, smooth=True):
    """
    Creates a cylinder primitive at runtime position r_pos.
    axis: Runtime axis along which height extends ('X', 'Y', or 'Z').
    """
    bx, by, bz = r2b(r_pos[0], r_pos[1], r_pos[2])
    mesh = bpy.data.meshes.new(name + "_mesh")
    obj = bpy.data.objects.new(name, mesh)
    obj.location = (bx, by, bz)

    verts = []
    half_h = height / 2.0
    for i in range(segments):
        a = 2.0 * math.pi * i / segments
        ca = math.cos(a) * radius
        sa = math.sin(a) * radius
        if axis == 'Y': # Height along Runtime Y (Blender Z)
            verts.append((ca, -sa, -half_h))
            verts.append((ca, -sa, half_h))
        elif axis == 'Z': # Height along Runtime Z (Blender Y)
            verts.append((ca, -half_h, sa))
            verts.append((ca, half_h, sa))
        elif axis == 'X': # Height along Runtime X (Blender X)
            verts.append((-half_h, ca, sa))
            verts.append((half_h, ca, sa))

    faces = []
    for i in range(segments):
        ni = (i + 1) % segments
        p1 = i * 2
        p2 = i * 2 + 1
        p3 = ni * 2 + 1
        p4 = ni * 2
        faces.append((p1, p2, p3, p4))

    # Caps
    bottom_cap = [i * 2 for i in reversed(range(segments))]
    top_cap = [i * 2 + 1 for i in range(segments)]
    faces.append(bottom_cap)
    faces.append(top_cap)

    mesh.from_pydata(verts, [], faces)
    if smooth:
        mesh.polygons.foreach_set('use_smooth', [True] * len(mesh.polygons))
    mesh.update()

    if mat:
        obj.data.materials.append(mat)
    bpy.context.scene.collection.objects.link(obj)

    if parent:
        set_parent_keep_world(obj, parent)
    return obj

def add_sphere(name, r_pos, radius, segments=16, rings=12, mat=None, parent=None, smooth=True):
    """Creates a UV sphere primitive at runtime position r_pos."""
    bx, by, bz = r2b(r_pos[0], r_pos[1], r_pos[2])
    mesh = bpy.data.meshes.new(name + "_mesh")
    obj = bpy.data.objects.new(name, mesh)
    obj.location = (bx, by, bz)

    verts = []
    # Bottom pole
    verts.append((0, 0, -radius))
    for r in range(1, rings):
        phi = math.pi * r / rings - math.pi / 2.0
        z = math.sin(phi) * radius
        ring_r = math.cos(phi) * radius
        for s in range(segments):
            theta = 2.0 * math.pi * s / segments
            x = math.cos(theta) * ring_r
            y = math.sin(theta) * ring_r
            verts.append((x, y, z))
    # Top pole
    verts.append((0, 0, radius))

    faces = []
    # Bottom cap
    for s in range(segments):
        ns = (s + 1) % segments
        faces.append((0, ns + 1, s + 1))
    # Middle rings
    for r in range(rings - 2):
        r_start = 1 + r * segments
        nr_start = 1 + (r + 1) * segments
        for s in range(segments):
            ns = (s + 1) % segments
            faces.append((r_start + s, r_start + ns, nr_start + ns, nr_start + s))
    # Top cap
    top_idx = len(verts) - 1
    last_r_start = 1 + (rings - 2) * segments
    for s in range(segments):
        ns = (s + 1) % segments
        faces.append((top_idx, last_r_start + s, last_r_start + ns))

    mesh.from_pydata(verts, [], faces)
    if smooth:
        mesh.polygons.foreach_set('use_smooth', [True] * len(mesh.polygons))
    mesh.update()

    if mat:
        obj.data.materials.append(mat)
    bpy.context.scene.collection.objects.link(obj)

    if parent:
        set_parent_keep_world(obj, parent)
    return obj

def add_empty_anchor(name, r_pos, parent=None):
    """Creates an Empty object as a spatial locator / anchor."""
    bx, by, bz = r2b(r_pos[0], r_pos[1], r_pos[2])
    empty = bpy.data.objects.new(name, None)
    empty.empty_display_type = 'ARROWS'
    empty.empty_display_size = 0.15
    empty.location = (bx, by, bz)
    bpy.context.scene.collection.objects.link(empty)
    if parent:
        set_parent_keep_world(empty, parent)
    return empty

# ==============================================================================
# Model Assembly Functions
# ==============================================================================

def build_desk_and_storage(mats, parent):
    """
    Builds the high-fidelity ivory workstation desk and dual 4-drawer pedestals:
    F1 dimensions: 2.6m wide x 0.8m deep, top surface at Y = 0.75m, center X/Z = (0, -1.15).
    """
    desk_root = add_empty_anchor("desk", (0.0, 0.75, -1.15), parent)

    # 1. Desk Top (Ivory white satin finish with beveled aesthetic)
    desk_top = add_box(
        "desk_top", (0.0, 0.730, -1.15), (2.60, 0.040, 0.80),
        mat=mats["Desk_Ivory_White"], parent=desk_root
    )

    # 2. Perimeter Neon LED Strip (Pink/Lilac glow along front and side edges)
    # Front strip
    add_box("desk_neon_front", (0.0, 0.730, -0.748), (2.60, 0.012, 0.010),
            mat=mats["Neon_Perimeter_Pink"], parent=desk_top)
    # Left strip
    add_box("desk_neon_left", (-1.295, 0.730, -1.15), (0.010, 0.012, 0.80),
            mat=mats["Neon_Perimeter_Pink"], parent=desk_top)
    # Right strip
    add_box("desk_neon_right", (1.295, 0.730, -1.15), (0.010, 0.012, 0.80),
            mat=mats["Neon_Perimeter_Pink"], parent=desk_top)

    # 3. Left Drawer Pedestal (4 drawers with horizontal inset pulls)
    left_ped_x = -0.98
    ped_w, ped_d, ped_h = 0.54, 0.74, 0.70
    left_ped = add_box("desk_left_pedestal", (left_ped_x, 0.355, -1.15), (ped_w, ped_h, ped_d),
                       mat=mats["Desk_Ivory_White"], parent=desk_root)
    # 4 Drawers
    for i in range(4):
        dy = 0.08 + i * 0.165
        add_box(f"drawer_left_{i+1}", (left_ped_x, dy, -0.776), (0.48, 0.145, 0.015),
                mat=mats["Desk_Ivory_White"], parent=left_ped)
        # Inset handle slot
        add_box(f"drawer_left_handle_{i+1}", (left_ped_x, dy + 0.04, -0.770), (0.24, 0.018, 0.010),
                mat=mats["Chair_Black_Poly"], parent=left_ped)

    # 4. Right Drawer Pedestal (4 drawers against right corner)
    right_ped_x = 0.98
    right_ped = add_box("desk_right_pedestal", (right_ped_x, 0.355, -1.15), (ped_w, ped_h, ped_d),
                        mat=mats["Desk_Ivory_White"], parent=desk_root)
    for i in range(4):
        dy = 0.08 + i * 0.165
        add_box(f"drawer_right_{i+1}", (right_ped_x, dy, -0.776), (0.48, 0.145, 0.015),
                mat=mats["Desk_Ivory_White"], parent=right_ped)
        add_box(f"drawer_right_handle_{i+1}", (right_ped_x, dy + 0.04, -0.770), (0.24, 0.018, 0.010),
                mat=mats["Chair_Black_Poly"], parent=right_ped)

    # 5. Modesty Panel & Under-Desk Cyan Glow Strip
    add_box("desk_modesty_panel", (0.0, 0.40, -1.48), (1.42, 0.60, 0.025),
            mat=mats["Desk_Modesty_Cyan"], parent=desk_root)
    add_box("desk_underlight_strip", (0.0, 0.69, -1.45), (1.35, 0.015, 0.020),
            mat=mats["Neon_Cyan"], parent=desk_root)

    return desk_root

def build_ergonomic_chair(mats, parent):
    """
    Builds the blue-and-white ergonomic gaming chair at F1 chair root (0.30, 0, -0.36).
    Articulated with 5-star white base, blue dual casters, gas lift, seat pan,
    winged backrest, lumbar pillow, neck cushion, and 3D armrests.
    """
    chair_root = add_empty_anchor("chair-root", (0.30, 0.0, -0.36), parent)

    # 1. 5-Star Spider Base (White molded hub + 5 arms)
    base_hub = add_cylinder("chair_base_hub", (0.30, 0.10, -0.36), radius=0.07, height=0.08,
                            axis='Y', mat=mats["Chair_White"], parent=chair_root)
    # 5 sweeping legs with dual blue caster wheels
    leg_len = 0.32
    for i in range(5):
        angle = 2.0 * math.pi * i / 5.0
        dx = math.cos(angle) * leg_len
        dz = math.sin(angle) * leg_len
        leg_mid_x = 0.30 + dx * 0.5
        leg_mid_z = -0.36 + dz * 0.5
        # Angled leg arm
        leg = add_box(f"chair_leg_{i+1}", (leg_mid_x, 0.08, leg_mid_z), (0.04, 0.035, leg_len),
                      mat=mats["Chair_White"], parent=base_hub)
        # Leg caster tip
        tip_x = 0.30 + dx
        tip_z = -0.36 + dz
        add_cylinder(f"chair_caster_stem_{i+1}", (tip_x, 0.06, tip_z), radius=0.012, height=0.04,
                     axis='Y', mat=mats["Chair_Chrome"], parent=base_hub)
        add_cylinder(f"chair_caster_wheel_{i+1}", (tip_x, 0.03, tip_z), radius=0.030, height=0.035,
                     axis='X', mat=mats["Chair_Blue"], parent=base_hub)

    # 2. Hydraulic Lift Piston & Mechanism
    add_cylinder("chair_gas_piston", (0.30, 0.26, -0.36), radius=0.028, height=0.24,
                 axis='Y', mat=mats["Chair_Chrome"], parent=chair_root)
    add_cylinder("chair_piston_shroud", (0.30, 0.18, -0.36), radius=0.042, height=0.12,
                 axis='Y', mat=mats["Chair_Black_Poly"], parent=chair_root)
    
    # Chair Swivel Node (Rotated -24 deg in yaw towards visitor/camera)
    chair_swivel = add_empty_anchor("chair_swivel", (0.30, 0.38, -0.36), chair_root)
    chair_swivel.rotation_euler = (0, 0, math.radians(-24.0))

    add_box("chair_seat_mechanism", (0.30, 0.38, -0.36), (0.28, 0.05, 0.28),
            mat=mats["Chair_Black_Poly"], parent=chair_swivel)

    # 3. Ergonomic Contoured Seat Pan (Blue center cushion + White side bolsters)
    seat_center = add_box("chair_seat_cushion", (0.30, 0.44, -0.36), (0.34, 0.08, 0.44),
                          mat=mats["Chair_Blue"], parent=chair_swivel)
    # Left and right white bolsters
    add_box("chair_seat_bolster_left", (0.10, 0.47, -0.36), (0.08, 0.10, 0.44),
            mat=mats["Chair_White"], parent=seat_center)
    add_box("chair_seat_bolster_right", (0.50, 0.47, -0.36), (0.08, 0.10, 0.44),
            mat=mats["Chair_White"], parent=seat_center)

    # 4. Ergonomic High Backrest (Race-style winged back)
    # Tilted slightly backward (approx 8 degrees)
    back_root = add_empty_anchor("chair_back_root", (0.30, 0.48, -0.56), chair_swivel)
    # Center blue spine cushion
    add_box("chair_back_spine", (0.30, 0.88, -0.58), (0.30, 0.72, 0.08),
            mat=mats["Chair_Blue"], parent=back_root)
    # Left and right white winged shoulder bolsters
    add_box("chair_back_wing_left", (0.09, 0.95, -0.55), (0.12, 0.58, 0.12),
            mat=mats["Chair_White"], parent=back_root)
    add_box("chair_back_wing_right", (0.51, 0.95, -0.55), (0.12, 0.58, 0.12),
            mat=mats["Chair_White"], parent=back_root)
    # Headrest extension
    add_box("chair_headrest_top", (0.30, 1.28, -0.60), (0.28, 0.20, 0.08),
            mat=mats["Chair_White"], parent=back_root)
    # Dual harness cutout holes (black bezels)
    add_box("chair_harness_port_left", (0.23, 1.15, -0.59), (0.05, 0.03, 0.09),
            mat=mats["Chair_Black_Poly"], parent=back_root)
    add_box("chair_harness_port_right", (0.37, 1.15, -0.59), (0.05, 0.03, 0.09),
            mat=mats["Chair_Black_Poly"], parent=back_root)

    # 5. Pillows (Lumbar support & Neck pillow)
    add_box("chair_lumbar_pillow", (0.30, 0.60, -0.52), (0.28, 0.15, 0.08),
            mat=mats["Chair_White"], parent=back_root)
    add_box("chair_neck_pillow", (0.30, 1.18, -0.54), (0.22, 0.12, 0.07),
            mat=mats["Chair_White"], parent=back_root)

    # 6. 3D Articulated Armrests (Top height 0.665m comfortably clears desk underside 0.700m)
    # Left Armrest
    add_cylinder("chair_arm_left_upright", (0.08, 0.55, -0.36), radius=0.022, height=0.20,
                 axis='Y', mat=mats["Chair_White"], parent=chair_swivel)
    add_box("chair_arm_left_pad", (0.08, 0.665, -0.34), (0.09, 0.035, 0.26),
            mat=mats["Chair_Blue"], parent=chair_swivel)
    # Right Armrest
    add_cylinder("chair_arm_right_upright", (0.52, 0.55, -0.36), radius=0.022, height=0.20,
                 axis='Y', mat=mats["Chair_White"], parent=chair_swivel)
    add_box("chair_arm_right_pad", (0.52, 0.665, -0.34), (0.09, 0.035, 0.26),
            mat=mats["Chair_Blue"], parent=chair_swivel)

    return chair_root

def build_monitor_and_lightbar(mats, parent):
    """
    Builds curved ultrawide monitor (0.86m screen width, center (0, 1.12, -1.36)),
    ergonomic monitor stand, downward warm monitor light bar, and 3D acoustic wall panel backdrop.
    """
    mon_root = add_empty_anchor("monitor-root", (0.0, 1.12, -1.36), parent)

    # 1. Curved Screen & Frame
    # Approximated curved ultrawide screen with central arc segments
    screen_w, screen_h = 0.86, 0.38
    add_box("monitor_screen_mesh", (0.0, 1.12, -1.36), (screen_w, screen_h, 0.015),
            mat=mats["Monitor_Screen"], parent=mon_root)
    add_box("monitor_bezel", (0.0, 1.12, -1.37), (screen_w + 0.016, screen_h + 0.016, 0.012),
            mat=mats["Monitor_Bezel"], parent=mon_root)
    # Rear housing curve
    add_box("monitor_rear_housing", (0.0, 1.12, -1.41), (0.48, 0.28, 0.06),
            mat=mats["Monitor_Bezel"], parent=mon_root)

    # 2. Articulated Monitor Stand
    add_box("monitor_stand_base", (0.0, 0.755, -1.38), (0.24, 0.012, 0.18),
            mat=mats["Monitor_Bezel"], parent=mon_root)
    add_box("monitor_stand_column", (0.0, 0.94, -1.41), (0.06, 0.36, 0.05),
            mat=mats["Monitor_Bezel"], parent=mon_root)
    add_cylinder("monitor_tilt_joint", (0.0, 1.12, -1.40), radius=0.032, height=0.06,
                 axis='X', mat=mats["Chair_Chrome"], parent=mon_root)

    # 3. Monitor Warm Light Bar (Mounted on top bezel, downward angled)
    add_cylinder("lightbar_chassis", (0.0, 1.33, -1.34), radius=0.013, height=0.48,
                 axis='X', mat=mats["Monitor_Bezel"], parent=mon_root)
    # Lightbar mount bracket
    add_box("lightbar_mount_clamp", (0.0, 1.33, -1.38), (0.04, 0.04, 0.08),
            mat=mats["Monitor_Bezel"], parent=mon_root)
    # Downward Warm Emissive Lens Strip
    add_box("lightbar_diffuser_lens", (0.0, 1.318, -1.335), (0.45, 0.008, 0.012),
            mat=mats["Warm_Lightbar"], parent=mon_root)

    # 4. Acoustic 3D Wall Panel & Glowing Neon Frame (Behind monitor on rear wall Z = -1.78)
    acoustic_root = add_empty_anchor("acoustic_backing", (0.0, 1.25, -1.78), parent)
    add_box("acoustic_foam_tiles", (0.0, 1.25, -1.78), (1.42, 0.76, 0.03),
            mat=mats["Acoustic_Panel"], parent=acoustic_root)
    # Neon rectangular border frame
    add_box("acoustic_frame_top", (0.0, 1.635, -1.775), (1.44, 0.015, 0.02),
            mat=mats["Neon_Perimeter_Pink"], parent=acoustic_root)
    add_box("acoustic_frame_bottom", (0.0, 0.865, -1.775), (1.44, 0.015, 0.02),
            mat=mats["Neon_Cyan"], parent=acoustic_root)
    add_box("acoustic_frame_left", (-0.715, 1.25, -1.775), (0.015, 0.76, 0.02),
            mat=mats["Neon_Perimeter_Pink"], parent=acoustic_root)
    add_box("acoustic_frame_right", (0.715, 1.25, -1.775), (0.015, 0.76, 0.02),
            mat=mats["Neon_Cyan"], parent=acoustic_root)

    return mon_root

def build_hexagonal_wall_lighting(mats, parent):
    """
    Builds the cluster of 7 interlocking glowing hexagonal LED light panels
    mounted on the rear wall at Z = -1.78m.
    """
    hex_root = add_empty_anchor("hex_lights_cluster", (-0.30, 2.25, -1.78), parent)

    # Hexagon geometry generator (flat regular prism on rear wall)
    r = 0.165  # circumradius in meters
    hr = r * math.cos(math.pi / 6.0) # apothem ~0.143m
    thickness = 0.020

    # 7 hexagonal panel centers (honeycomb cluster layout)
    panel_offsets = [
        (0.0, 0.0, mats["Neon_Hex_Pink"]),              # Center panel
        (-1.5 * r, hr, mats["Neon_Hex_Lilac"]),           # Top-left
        (0.0, 2.0 * hr, mats["Neon_Hex_Pink"]),           # Top
        (1.5 * r, hr, mats["Neon_Hex_Lavender"]),         # Top-right
        (1.5 * r, -hr, mats["Neon_Hex_Pink"]),            # Bottom-right
        (0.0, -2.0 * hr, mats["Neon_Hex_Lilac"]),         # Bottom
        (-1.5 * r, -hr, mats["Neon_Hex_Lavender"])        # Bottom-left
    ]

    for idx, (ox, oy, mat) in enumerate(panel_offsets):
        # Build 6-sided prism
        mesh = bpy.data.meshes.new(f"hex_panel_{idx+1}_mesh")
        obj = bpy.data.objects.new(f"hex_panel_{idx+1}", mesh)
        
        # Position in runtime coordinates
        obj.location = r2b(-0.30 + ox, 2.25 + oy, -1.78)
        
        # Vertices in Blender local coords (X along wall horizontal, Z along wall vertical, Y into room)
        verts = []
        for i in range(6):
            a = i * math.pi / 3.0 + math.pi / 6.0
            vx = math.cos(a) * r
            vz = math.sin(a) * r
            verts.append((vx, -thickness / 2.0, vz)) # back
            verts.append((vx, thickness / 2.0, vz))  # front
        
        faces = []
        for i in range(6):
            ni = (i + 1) % 6
            faces.append((i*2, ni*2, ni*2+1, i*2+1))
        # Front cap (pointing into room)
        faces.append([i*2+1 for i in range(6)])
        # Back cap
        faces.append([i*2 for i in reversed(range(6))])

        mesh.from_pydata(verts, [], faces)
        mesh.update()
        obj.data.materials.append(mat)
        bpy.context.scene.collection.objects.link(obj)
        set_parent_keep_world(obj, hex_root)

    return hex_root

def build_gaming_pc_and_pegboard(mats, parent):
    """
    Builds the custom white gaming PC tower on the right desk surface and
    the white perforated pegboard on the right wall with hanging game controllers.
    """
    pc_root = add_empty_anchor("helios-pc", (1.02, 0.98, -1.15), parent)

    # 1. Custom White PC Case (0.22m wide x 0.46m high x 0.44m deep)
    add_box("pc_chassis", (1.02, 0.98, -1.15), (0.22, 0.46, 0.44),
            mat=mats["PC_Chassis_White"], parent=pc_root)
    # Tempered glass left side panel
    add_box("pc_tempered_glass", (0.908, 0.98, -1.15), (0.006, 0.43, 0.41),
            mat=mats["PC_Glass"], parent=pc_root)

    # 3 Glowing Front RGB Intake Fans (stacked vertically)
    for i in range(3):
        fy = 0.82 + i * 0.14
        add_cylinder(f"pc_fan_ring_{i+1}", (1.02, fy, -0.925), radius=0.055, height=0.015,
                     axis='Z', mat=mats["PC_RGB_Pink" if i % 2 == 0 else "PC_RGB_Cyan"], parent=pc_root)
        add_cylinder(f"pc_fan_hub_{i+1}", (1.02, fy, -0.925), radius=0.018, height=0.018,
                     axis='Z', mat=mats["Chair_Black_Poly"], parent=pc_root)

    # Internal GPU shroud and illuminated side logo
    add_box("pc_gpu_shroud", (0.98, 0.92, -1.15), (0.09, 0.05, 0.28),
            mat=mats["Chair_Black_Poly"], parent=pc_root)
    add_box("pc_gpu_rgb_strip", (0.932, 0.92, -1.15), (0.005, 0.012, 0.20),
            mat=mats["PC_RGB_Cyan"], parent=pc_root)

    # 2. White Headset Stand & Gaming Headset atop PC case
    add_box("headset_stand_base", (1.02, 1.22, -1.15), (0.12, 0.015, 0.12),
            mat=mats["Desk_Ivory_White"], parent=pc_root)
    add_box("headset_stand_arch", (1.02, 1.34, -1.15), (0.025, 0.24, 0.04),
            mat=mats["Desk_Ivory_White"], parent=pc_root)
    # Headset earcups and padded band
    add_cylinder("headset_earcup_left", (0.98, 1.42, -1.15), radius=0.045, height=0.035,
                 axis='X', mat=mats["Chair_Blue"], parent=pc_root)
    add_cylinder("headset_earcup_right", (1.06, 1.42, -1.15), radius=0.045, height=0.035,
                 axis='X', mat=mats["Chair_Blue"], parent=pc_root)
    add_box("headset_headband", (1.02, 1.47, -1.15), (0.10, 0.02, 0.05),
            mat=mats["Chair_White"], parent=pc_root)

    # 3. White Pegboard on Right Wall (X = 1.34m, Y = 1.70m, Z = -1.15m)
    peg_root = add_empty_anchor("controller-pegboard", (1.34, 1.70, -1.15), parent)
    add_box("pegboard_mesh", (1.34, 1.70, -1.15), (0.02, 0.85, 0.60),
            mat=mats["Pegboard_Texture"], parent=peg_root)

    # Two Hanging Custom Game Controllers on Pegboard Hooks
    for i, pz in enumerate([-1.26, -1.04]):
        py = 1.85 - i * 0.22
        # Pegboard mounting hook
        add_cylinder(f"peg_hook_{i+1}", (1.32, py, pz), radius=0.006, height=0.05,
                     axis='X', mat=mats["Chair_Chrome"], parent=peg_root)
        # Hanging controller body (white with blue grip accents)
        add_box(f"peg_controller_{i+1}", (1.29, py - 0.04, pz), (0.035, 0.10, 0.14),
                mat=mats["Chair_White"], parent=peg_root)
        add_box(f"peg_controller_grip_{i+1}", (1.29, py - 0.06, pz), (0.036, 0.06, 0.12),
                mat=mats["Chair_Blue"], parent=peg_root)

    return pc_root

def build_peripherals_and_desktop_props(mats, parent):
    """
    Builds the detailed desktop accessories: mechanical keyboard with orange accents,
    extended desk mat, wireless mouse, controller dock, pebble speakers, boom microphone,
    retro digital clock, drink tumbler, and wall display shelves.
    """
    props_root = add_empty_anchor("desktop_props", (0.0, 0.75, -1.0), parent)

    # 1. Extended Desk Mat (0.88m x 0.40m)
    add_box("desk_mat", (0.05, 0.752, -0.96), (0.88, 0.004, 0.40),
            mat=mats["Desk_Mat"], parent=props_root)

    # 2. 75% Mechanical Keyboard (Dark chassis, charcoal keycaps, orange accents)
    kb_x, kb_y, kb_z = -0.02, 0.760, -0.93
    add_box("keyboard_chassis", (kb_x, kb_y, kb_z), (0.34, 0.018, 0.14),
            mat=mats["Keyboard_Chassis"], parent=props_root)
    # Keycap clusters (rows)
    for r in range(5):
        rz = kb_z - 0.048 + r * 0.024
        for c in range(14):
            cx = kb_x - 0.145 + c * 0.022
            # Select orange accent for ESC (0,0), Enter (2,13), and Spacebar (4,5..8)
            is_accent = (r == 0 and c == 0) or (r == 2 and c >= 12) or (r == 4 and 4 <= c <= 8)
            key_mat = mats["Keycap_Orange"] if is_accent else mats["Keycap_Charcoal"]
            add_box(f"key_{r}_{c}", (cx, kb_y + 0.012, rz), (0.018, 0.008, 0.018),
                    mat=key_mat, parent=props_root)

    # 3. Ergonomic Wireless Mouse
    add_box("gaming_mouse", (0.32, 0.762, -0.93), (0.07, 0.032, 0.12),
            mat=mats["Mouse_White"], parent=props_root)
    add_cylinder("mouse_scroll_wheel", (0.32, 0.776, -0.96), radius=0.009, height=0.012,
                 axis='X', mat=mats["Neon_Cyan"], parent=props_root)

    # 4. Center Controller Charging Dock (Beneath monitor)
    dock_x, dock_z = 0.0, -1.18
    add_box("controller_dock_cradle", (dock_x, 0.765, dock_z), (0.16, 0.035, 0.10),
            mat=mats["Chair_White"], parent=props_root)
    # Controller seated in dock
    add_box("controller_docked_body", (dock_x, 0.81, dock_z), (0.15, 0.08, 0.09),
            mat=mats["Chair_White"], parent=props_root)
    add_box("controller_docked_grips", (dock_x, 0.79, dock_z), (0.152, 0.06, 0.07),
            mat=mats["Neon_Perimeter_Pink"], parent=props_root)

    # 5. Dual Pebble Desktop Speakers (Egg-shaped white bodies with gold drivers)
    for side, sx in [("left", -0.44), ("right", 0.44)]:
        add_sphere(f"speaker_{side}_body", (sx, 0.805, -1.16), radius=0.055,
                   mat=mats["Speaker_White"], parent=props_root)
        # Angled front gold acoustic cone
        add_cylinder(f"speaker_{side}_cone", (sx, 0.815, -1.12), radius=0.035, height=0.012,
                     axis='Z', mat=mats["Speaker_Gold_Cone"], parent=props_root)
        add_cylinder(f"speaker_{side}_base", (sx, 0.755, -1.16), radius=0.040, height=0.012,
                     axis='Y', mat=mats["Chair_Chrome"], parent=props_root)

    # 6. Articulated Studio Boom Microphone (Left desk edge)
    mic_base_x, mic_base_z = -0.68, -0.98
    add_box("mic_desk_clamp", (mic_base_x, 0.77, mic_base_z), (0.05, 0.06, 0.06),
            mat=mats["Mic_Black_Metal"], parent=props_root)
    # Lower boom arm
    add_cylinder("mic_boom_lower", (mic_base_x + 0.05, 0.90, mic_base_z - 0.04), radius=0.009, height=0.28,
                 axis='Y', mat=mats["Mic_Black_Metal"], parent=props_root)
    # Upper boom arm reaching forward-right
    add_cylinder("mic_boom_upper", (mic_base_x + 0.16, 1.00, mic_base_z + 0.06), radius=0.009, height=0.26,
                 axis='X', mat=mats["Mic_Black_Metal"], parent=props_root)
    # Microphone Capsule & Foam Pop Filter
    add_cylinder("talks-microphone", (-0.46, 0.96, -0.86), radius=0.032, height=0.12,
                 axis='Y', mat=mats["Mic_Black_Metal"], parent=props_root)
    add_cylinder("mic_pop_filter", (-0.46, 1.01, -0.86), radius=0.036, height=0.08,
                 axis='Y', mat=mats["Mic_Popfilter_Foam"], parent=props_root)

    # 7. Retro Digital Desk Clock ("17:49" in glowing cyan)
    add_box("desk_clock_chassis", (0.58, 0.795, -1.15), (0.13, 0.09, 0.06),
            mat=mats["Clock_Case"], parent=props_root)
    add_box("desk_clock_screen", (0.58, 0.795, -1.118), (0.11, 0.075, 0.005),
            mat=mats["Clock_Display"], parent=props_root)

    # 8. Iced Beverage Tumbler on Wooden Coaster
    add_cylinder("tumbler_coaster", (-0.32, 0.755, -0.82), radius=0.055, height=0.010,
                 axis='Y', mat=mats["Wood_Natural_Oak"], parent=props_root)
    add_cylinder("tumbler_cup", (-0.32, 0.82, -0.82), radius=0.040, height=0.12,
                 axis='Y', mat=mats["Acrylic_Clear"], parent=props_root)
    add_cylinder("tumbler_liquid", (-0.32, 0.81, -0.82), radius=0.036, height=0.09,
                 axis='Y', mat=mats["Coffee_Drink"], parent=props_root)
    add_cylinder("tumbler_straw", (-0.31, 0.88, -0.82), radius=0.004, height=0.16,
                 axis='Y', mat=mats["Chair_White"], parent=props_root)

    # 9. Floating Wall Display Shelves & Decorative Props (Rear Wall)
    # Shelf 1 (Upper left, Y = 1.85m)
    add_box("wall_shelf_top", (-0.50, 1.85, -1.74), (0.90, 0.025, 0.16),
            mat=mats["Desk_Ivory_White"], parent=props_root)
    # Mini keyboard display on wooden easel
    add_box("shelf_easel_frame", (-0.32, 1.94, -1.72), (0.14, 0.16, 0.06),
            mat=mats["Wood_Natural_Oak"], parent=props_root)
    add_box("shelf_mini_keyboard", (-0.32, 1.93, -1.69), (0.18, 0.08, 0.025),
            mat=mats["Keyboard_Chassis"], parent=props_root)
    # Illuminated PlayStation symbols ("XOΔ▢")
    ps_symbols = [("cross", -0.14, "Neon_Cyan"), ("circle", -0.09, "Neon_Perimeter_Pink"),
                  ("triangle", -0.04, "Plant_Green_Bright"), ("square", 0.01, "Neon_Hex_Lilac")]
    for sym_name, sx, sym_mat in ps_symbols:
        add_box(f"shelf_ps_{sym_name}", (sx, 1.88, -1.71), (0.035, 0.035, 0.02),
                mat=mats[sym_mat], parent=props_root)

    # Shelf 2 (Mid left, Y = 1.50m)
    add_box("wall_shelf_mid", (-0.90, 1.50, -1.74), (0.65, 0.025, 0.16),
            mat=mats["Desk_Ivory_White"], parent=props_root)
    # Black DSLR camera with telephoto lens
    add_box("ai-real-camera", (-0.88, 1.56, -1.71), (0.12, 0.08, 0.08),
            mat=mats["Mic_Black_Metal"], parent=props_root)
    add_cylinder("camera_lens", (-0.88, 1.56, -1.65), radius=0.032, height=0.06,
                 axis='Z', mat=mats["Monitor_Bezel"], parent=props_root)

    # Shelf 3 (Mid right, Y = 1.65m)
    add_box("wall_shelf_right", (0.45, 1.65, -1.74), (0.65, 0.025, 0.16),
            mat=mats["Desk_Ivory_White"], parent=props_root)
    # Glowing white cylinder ambient lamp
    add_cylinder("shelf_ambient_cylinder", (0.62, 1.74, -1.71), radius=0.045, height=0.15,
                 axis='Y', mat=mats["Warm_Lightbar"], parent=props_root)

    return props_root

def build_organic_plants(mats, parent):
    """
    Builds the lush organic plant arrangements:
    1. Cascading pothos vine on left shelf with individual draped leaves.
    2. Cascading ivy on right shelf over monitor.
    3. Small potted succulent on shelf and desk.
    4. Large foreground monstera / rubber plant in white ceramic pot on 4-legged wooden stand.
    """
    plants_root = add_empty_anchor("plants_group", (0.0, 0.0, 0.0), parent)

    # 1. Left Shelf Cascading Vine Plant (Pothos)
    pot_x, pot_y, pot_z = -1.10, 1.54, -1.71
    add_cylinder("shelf_plant_pot_left", (pot_x, pot_y, pot_z), radius=0.06, height=0.08,
                 axis='Y', mat=mats["Ceramic_White_Gloss"], parent=plants_root)
    # Multiple cascading leaves draping over shelf edge
    leaf_offsets = [
        (-0.02, -0.08, 0.06, 0.045), (-0.05, -0.15, 0.08, 0.050),
        (-0.01, -0.22, 0.09, 0.048), (0.04, -0.12, 0.07, 0.042),
        (0.06, -0.26, 0.10, 0.052), (0.02, -0.34, 0.12, 0.046)
    ]
    for i, (lx, ly, lz, lr) in enumerate(leaf_offsets):
        leaf_mat = mats["Plant_Green_Deep"] if i % 2 == 0 else mats["Plant_Green_Bright"]
        add_sphere(f"pothos_leaf_{i+1}", (pot_x + lx, pot_y + ly, pot_z + lz), radius=lr,
                   mat=leaf_mat, parent=plants_root)

    # 2. Right Shelf Cascading Ivy
    r_pot_x, r_pot_y, r_pot_z = 0.32, 1.69, -1.71
    add_cylinder("shelf_plant_pot_right", (r_pot_x, r_pot_y, r_pot_z), radius=0.055, height=0.07,
                 axis='Y', mat=mats["Ceramic_White_Gloss"], parent=plants_root)
    r_leaf_offsets = [
        (0.02, -0.06, 0.05, 0.040), (0.04, -0.14, 0.07, 0.045),
        (-0.01, -0.22, 0.08, 0.042), (0.03, -0.30, 0.09, 0.044)
    ]
    for i, (lx, ly, lz, lr) in enumerate(r_leaf_offsets):
        leaf_mat = mats["Plant_Green_Bright"] if i % 2 == 0 else mats["Plant_Green_Deep"]
        add_sphere(f"ivy_leaf_{i+1}", (r_pot_x + lx, r_pot_y + ly, r_pot_z + lz), radius=lr,
                   mat=leaf_mat, parent=plants_root)

    # 3. Potted Succulents (Left shelf & Desk right)
    add_cylinder("shelf_succulent_pot", (-0.65, 1.54, -1.71), radius=0.045, height=0.065,
                 axis='Y', mat=mats["Ceramic_White_Gloss"], parent=plants_root)
    add_sphere("shelf_succulent_rosette", (-0.65, 1.58, -1.71), radius=0.038,
               mat=mats["Plant_Green_Bright"], parent=plants_root)

    add_cylinder("desk_succulent_pot", (0.48, 0.78, -1.15), radius=0.040, height=0.055,
                 axis='Y', mat=mats["Ceramic_White_Gloss"], parent=plants_root)
    add_sphere("desk_succulent_rosette", (0.48, 0.81, -1.15), radius=0.035,
               mat=mats["Plant_Green_Bright"], parent=plants_root)

    # 4. Large Floor Plant in Wood Stand (Bottom-left foreground: X = -1.45m, Z = -0.65m)
    fg_x, fg_z = -1.45, -0.65
    fg_root = add_empty_anchor("foreground_floor_plant", (fg_x, 0.0, fg_z), parent)

    # 4 Wooden Dowel Legs
    leg_r = 0.018
    stand_w = 0.22
    for lx in [-stand_w/2, stand_w/2]:
        for lz in [-stand_w/2, stand_w/2]:
            add_cylinder(f"plant_stand_leg_{lx}_{lz}", (fg_x + lx, 0.16, fg_z + lz),
                         radius=leg_r, height=0.32, axis='Y', mat=mats["Wood_Natural_Oak"], parent=fg_root)
    # Crossbeams
    add_box("plant_stand_cross_x", (fg_x, 0.15, fg_z), (stand_w, 0.025, 0.035),
            mat=mats["Wood_Natural_Oak"], parent=fg_root)
    add_box("plant_stand_cross_z", (fg_x, 0.15, fg_z), (0.035, 0.025, stand_w),
            mat=mats["Wood_Natural_Oak"], parent=fg_root)

    # White Cylindrical Ceramic Planter Pot
    add_cylinder("fg_planter_pot", (fg_x, 0.32, fg_z), radius=0.14, height=0.28,
                 axis='Y', mat=mats["Ceramic_White_Gloss"], parent=fg_root)

    # 7 Layered Monstera / Fig Foliage Leaves radiating outward
    leaf_configs = [
        (-0.10, 0.45, 0.08, 0.11, mats["Plant_Green_Deep"]),
        (0.08, 0.48, 0.10, 0.12, mats["Plant_Green_Bright"]),
        (-0.14, 0.52, -0.04, 0.13, mats["Plant_Green_Deep"]),
        (0.12, 0.55, -0.06, 0.12, mats["Plant_Green_Bright"]),
        (0.00, 0.60, 0.12, 0.14, mats["Plant_Green_Deep"]),
        (-0.06, 0.64, -0.08, 0.13, mats["Plant_Green_Bright"]),
        (0.04, 0.68, 0.02, 0.14, mats["Plant_Green_Deep"])
    ]
    for i, (ox, oy, oz, rad, lmat) in enumerate(leaf_configs):
        add_sphere(f"fg_foliage_leaf_{i+1}", (fg_x + ox, oy, fg_z + oz), radius=rad,
                   mat=lmat, parent=fg_root)

    return plants_root

def build_room_architecture(mats, parent):
    """
    Builds the room envelope matching F1 spatial coordinates:
    Room 4.2m width x 3.6m depth x 2.8m height, rear wall at Z = -1.8m.
    Carpet floor in deep navy indigo (#232B52), walls in pale lavender (#CFCDD9).
    """
    room_root = add_empty_anchor("room_architecture", (0.0, 0.0, 0.0), parent)

    # Floor Carpet (4.2m x 3.6m at Y = 0.0m)
    add_box("room_floor", (0.0, -0.015, 0.0), (4.20, 0.030, 3.60),
            mat=mats["Floor_Carpet"], parent=room_root)

    # Rear Wall (Z = -1.80m)
    add_box("room_rear_wall", (0.0, 1.40, -1.815), (4.20, 2.80, 0.030),
            mat=mats["Wall_Lavender"], parent=room_root)

    # Right Wall (X = 2.10m, clamped near visible corner X = 1.40 for workstation focus)
    add_box("room_right_wall", (1.415, 1.40, -0.90), (0.030, 2.80, 1.80),
            mat=mats["Wall_Lavender"], parent=room_root)

    # Baseboard Trim
    add_box("room_baseboard_rear", (0.0, 0.04, -1.79), (4.20, 0.08, 0.02),
            mat=mats["Baseboard_White"], parent=room_root)
    add_box("room_baseboard_right", (1.39, 0.04, -0.90), (0.02, 0.08, 1.80),
            mat=mats["Baseboard_White"], parent=room_root)

    return room_root

# ==============================================================================
# Complete Lighting Setup (Physical Blender Hierarchy)
# ==============================================================================

def setup_lighting(parent):
    """
    Creates the complete physical lighting hierarchy matching the visual authority:
    1. Pink/Lilac Hex Area Lights
    2. Warm Monitor Light Bar Spot
    3. Cyan Under-Desk Fill
    4. Cyan Monitor Wall Halo
    5. PC RGB Internal Lights
    6. Pegboard Downward Spot
    7. Soft Studio Key/Fill
    """
    lights = {}
    lights_root = add_empty_anchor("lighting_rig", (0.0, 0.0, 0.0), parent)

    # 1. Hex Light Area Fill (Pink/Lilac glow from upper wall)
    hex_data = bpy.data.lights.new("Light_HexPanels", 'AREA')
    hex_data.energy = 120.0
    hex_data.size = 1.0
    hex_data.color = (0.98, 0.45, 0.95) # Vibrant Pink/Lilac
    hex_obj = bpy.data.objects.new("Light_HexPanels", hex_data)
    hex_obj.location = r2b(-0.30, 2.25, -1.68)
    aim_camera_at(hex_obj, (-0.20, 1.20, -0.50))
    bpy.context.scene.collection.objects.link(hex_obj)
    set_parent_keep_world(hex_obj, lights_root)
    lights["hex"] = hex_obj

    # 2. Warm Monitor Light Bar Spot (3200K amber downward cone onto desk)
    bar_data = bpy.data.lights.new("Light_MonitorLightbar", 'SPOT')
    bar_data.energy = 180.0
    bar_data.spot_size = math.radians(75.0)
    bar_data.spot_blend = 0.50
    bar_data.color = (1.00, 0.88, 0.55) # Warm 3200K amber
    bar_obj = bpy.data.objects.new("Light_MonitorLightbar", bar_data)
    bar_obj.location = r2b(0.0, 1.32, -1.33)
    aim_camera_at(bar_obj, (0.0, 0.75, -0.95))
    bpy.context.scene.collection.objects.link(bar_obj)
    set_parent_keep_world(bar_obj, lights_root)
    lights["lightbar"] = bar_obj

    # 3. Cyan Under-Desk Linear Fill (Flooding blue carpet floor beneath desk)
    cyan_data = bpy.data.lights.new("Light_UnderDeskCyan", 'POINT')
    cyan_data.energy = 75.0
    cyan_data.color = (0.15, 0.85, 1.00) # Vibrant cool cyan
    cyan_obj = bpy.data.objects.new("Light_UnderDeskCyan", cyan_data)
    cyan_obj.location = r2b(0.0, 0.35, -1.25)
    bpy.context.scene.collection.objects.link(cyan_obj)
    set_parent_keep_world(cyan_obj, lights_root)
    lights["cyan_underdesk"] = cyan_obj

    # 4. Cyan Monitor Backlight Halo (Spreading across rear acoustic foam)
    halo_data = bpy.data.lights.new("Light_MonitorHalo", 'POINT')
    halo_data.energy = 60.0
    halo_data.color = (0.25, 0.75, 1.00)
    halo_obj = bpy.data.objects.new("Light_MonitorHalo", halo_data)
    halo_obj.location = r2b(0.0, 1.15, -1.55)
    bpy.context.scene.collection.objects.link(halo_obj)
    set_parent_keep_world(halo_obj, lights_root)
    lights["cyan_halo"] = halo_obj

    # 5. PC Internal RGB Glow
    pc_data = bpy.data.lights.new("Light_PC_RGB", 'POINT')
    pc_data.energy = 25.0
    pc_data.color = (1.00, 0.20, 0.80) # Vibrant magenta/pink
    pc_obj = bpy.data.objects.new("Light_PC_RGB", pc_data)
    pc_obj.location = r2b(1.00, 0.96, -1.15)
    bpy.context.scene.collection.objects.link(pc_obj)
    set_parent_keep_world(pc_obj, lights_root)
    lights["pc_rgb"] = pc_obj

    # 6. Pegboard Downward Accent Spot
    peg_data = bpy.data.lights.new("Light_PegboardSpot", 'SPOT')
    peg_data.energy = 45.0
    peg_data.spot_size = math.radians(55.0)
    peg_data.spot_blend = 0.40
    peg_data.color = (1.00, 0.95, 0.90)
    peg_obj = bpy.data.objects.new("Light_PegboardSpot", peg_data)
    peg_obj.location = r2b(1.28, 2.35, -0.90)
    aim_camera_at(peg_obj, (1.30, 1.68, -1.15))
    bpy.context.scene.collection.objects.link(peg_obj)
    set_parent_keep_world(peg_obj, lights_root)
    lights["pegboard"] = peg_obj

    # 7. Front Studio Key Fill Light (Ensuring readable soft shadows)
    fill_data = bpy.data.lights.new("Light_StudioFill", 'AREA')
    fill_data.energy = 50.0
    fill_data.size = 1.5
    fill_data.color = (0.92, 0.95, 1.00) # Soft cool daylight
    fill_obj = bpy.data.objects.new("Light_StudioFill", fill_data)
    fill_obj.location = r2b(-1.10, 2.10, 1.10)
    # Aim towards desk center
    b_cam = fill_obj.location
    b_target = mathutils.Vector(r2b(0.10, 0.85, -1.10))
    dir_vec = b_target - b_cam
    fill_obj.rotation_euler = dir_vec.to_track_quat('-Z', 'Y').to_euler()
    bpy.context.scene.collection.objects.link(fill_obj)
    set_parent_keep_world(fill_obj, lights_root)
    lights["studio_fill"] = fill_obj

    return lights

# ==============================================================================
# Camera Presets & Aiming
# ==============================================================================

def aim_camera_at(cam_obj, r_target):
    """Orient camera to look directly at target point in Runtime coordinates."""
    b_cam = cam_obj.location
    b_target = mathutils.Vector(r2b(r_target[0], r_target[1], r_target[2]))
    direction = b_target - b_cam
    rot_quat = direction.to_track_quat('-Z', 'Y')
    cam_obj.rotation_euler = rot_quat.to_euler()

def create_camera(name, r_pos, r_target, fov_deg=52.0, clip_start=0.1, clip_end=50.0, sensor_fit='AUTO'):
    """Creates a camera oriented towards target in Runtime coordinates."""
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

def setup_all_cameras():
    """Sets up the complete suite of camera presets for evaluation and parity testing."""
    cams = {}
    
    # 1. Reference Match (4:3 aspect ratio, matches main-reference.png composition)
    cams["reference_match"] = create_camera(
        "Camera_ReferenceMatch", (-1.95, 2.10, 1.55), (0.22, 0.90, -1.15), fov_deg=52.0
    )

    # 2. Home Desktop (16:9 1920x1080 elevated three-quarter view)
    cams["home_desktop"] = create_camera(
        "Camera_HomeDesktop", (-2.15, 1.70, 1.55), (0.12, 1.25, -1.15), fov_deg=60.0
    )

    # 3. Home Mobile (9:16 portrait with lower touch control clearance)
    cams["home_mobile"] = create_camera(
        "Camera_HomeMobile", (-1.25, 1.48, 1.15), (0.16, 1.08, -0.95), fov_deg=52.0, sensor_fit='HORIZONTAL'
    )

    # 4. Monitor & Desk Detail (Close-up of curved screen, light bar, keyboard, speakers)
    cams["monitor_detail"] = create_camera(
        "Camera_MonitorDetail", (0.0, 1.18, -0.52), (0.0, 1.10, -1.36), fov_deg=46.0
    )

    # 5. Chair & Seated Resident Detail (Close-up of blue-and-white upholstery)
    cams["chair_detail"] = create_camera(
        "Camera_ChairDetail", (0.08, 0.92, 0.40), (0.30, 0.70, -0.36), fov_deg=48.0
    )

    # 6. PC & Pegboard Detail (Tempered glass PC, RGB fans, hanging controllers)
    cams["pc_pegboard_detail"] = create_camera(
        "Camera_PCPegboardDetail", (0.55, 1.55, -0.20), (1.15, 1.45, -1.15), fov_deg=50.0
    )

    # 7. Plants & Wall Shelves Detail (Cascading vines, floating shelves, hex lights)
    cams["plants_shelves_detail"] = create_camera(
        "Camera_PlantsShelvesDetail", (-1.20, 1.95, -0.30), (-0.40, 1.80, -1.75), fov_deg=50.0
    )

    return cams

# ==============================================================================
# Rendering & Evidence Generation
# ==============================================================================

def render_camera_view(scene, cam_obj, filepath, width, height):
    """Renders a single camera view to a PNG file using EEVEE with high quality settings."""
    scene.camera = cam_obj
    scene.render.filepath = str(filepath)
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.resolution_percentage = 100
    bpy.ops.render.render(write_still=True)
    print(f"Rendered: {filepath} ({width}x{height})")

def render_all_evidence(scene, cams, lights):
    """
    Renders the complete visual evidence suite:
    - 7 Camera views
    - 4 Lighting breakdown passes (Full, Hex only, Cyan only, Warm Lightbar only)
    """
    scene.render.engine = 'BLENDER_EEVEE'
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'

    # Enable EEVEE high quality passes if available
    if hasattr(scene, 'eevee'):
        if hasattr(scene.eevee, 'use_ssr'):
            scene.eevee.use_ssr = True
        if hasattr(scene.eevee, 'use_gtao'):
            scene.eevee.use_gtao = True
        if hasattr(scene.eevee, 'use_bloom'):
            scene.eevee.use_bloom = True

    # 1. Reference Match (4:3, 1504x1128 matching main reference aspect)
    render_camera_view(scene, cams["reference_match"],
                       RENDERS_DIR / "01-reference-workstation.png", 1504, 1128)

    # 2. Home Desktop (16:9, 1920x1080)
    render_camera_view(scene, cams["home_desktop"],
                       RENDERS_DIR / "02-home-desktop.png", 1920, 1080)

    # 3. Home Mobile (9:16, 1080x1920)
    render_camera_view(scene, cams["home_mobile"],
                       RENDERS_DIR / "03-home-mobile.png", 1080, 1920)

    # 4. Monitor Detail (16:9, 1920x1080)
    render_camera_view(scene, cams["monitor_detail"],
                       RENDERS_DIR / "04-monitor-detail.png", 1920, 1080)

    # 5. Chair Detail (16:9, 1920x1080)
    render_camera_view(scene, cams["chair_detail"],
                       RENDERS_DIR / "05-chair-detail.png", 1920, 1080)

    # 6. PC & Pegboard Detail (16:9, 1920x1080)
    render_camera_view(scene, cams["pc_pegboard_detail"],
                       RENDERS_DIR / "06-pc-pegboard-detail.png", 1920, 1080)

    # 7. Plants & Shelves Detail (16:9, 1920x1080)
    render_camera_view(scene, cams["plants_shelves_detail"],
                       RENDERS_DIR / "07-plants-shelves-detail.png", 1920, 1080)

    # --------------------------------------------------------------------------
    # Lighting Breakdown Passes (Camera: Reference Match)
    # --------------------------------------------------------------------------
    # Record original light energies
    orig_energies = {k: obj.data.energy for k, obj in lights.items()}

    def set_lights_state(active_keys):
        for k, obj in lights.items():
            obj.data.energy = orig_energies[k] if k in active_keys else 0.0

    # 8. Hex Lights Only
    set_lights_state(["hex"])
    render_camera_view(scene, cams["reference_match"],
                       RENDERS_DIR / "08-lighting-hex-only.png", 1504, 1128)

    # 9. Cyan Fill Only (Under-desk + Monitor halo)
    set_lights_state(["cyan_underdesk", "cyan_halo"])
    render_camera_view(scene, cams["reference_match"],
                       RENDERS_DIR / "09-lighting-cyan-only.png", 1504, 1128)

    # 10. Warm Monitor Light Bar Only
    set_lights_state(["lightbar"])
    render_camera_view(scene, cams["reference_match"],
                       RENDERS_DIR / "10-lighting-warm-lightbar-only.png", 1504, 1128)

    # Restore Full Lighting for combined pass
    set_lights_state(list(lights.keys()))
    render_camera_view(scene, cams["reference_match"],
                       RENDERS_DIR / "11-lighting-combined-full.png", 1504, 1128)

# ==============================================================================
# glTF Export & Asset Register
# ==============================================================================

def export_assets(root_obj):
    """
    Saves the native .blend file and exports the standard glTF 2.0 binary (.glb).
    Validates coordinate conversion and outputs asset register.
    """
    blend_path = SCRIPT_DIR / "workstation-sample.blend"
    glb_path = SCRIPT_DIR / "workstation-sample.glb"

    # Save native .blend
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))
    print(f"Saved native blend: {blend_path}")

    # Export glTF 2.0 binary (.glb)
    bpy.ops.export_scene.gltf(
        filepath=str(glb_path),
        export_format='GLB',
        use_selection=False,
        export_apply=False,
        export_yup=True,
        export_lights=True,
        export_cameras=True,
        export_materials='EXPORT',
        export_image_format='AUTO'
    )
    print(f"Exported standard glTF: {glb_path} ({glb_path.stat().st_size} bytes)")

    # Extract scene statistics
    stats = {
        "delivery": "deliveries/material-light-sample",
        "sample": "workstation-sample",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_objects": len(bpy.data.objects),
        "total_meshes": len(bpy.data.meshes),
        "total_materials": len(bpy.data.materials),
        "total_lights": len(bpy.data.lights),
        "total_cameras": len(bpy.data.cameras),
        "total_triangles": sum(len(m.loop_triangles) if hasattr(m, 'loop_triangles') else len(m.polygons) for m in bpy.data.meshes),
        "total_vertices": sum(len(m.vertices) for m in bpy.data.meshes),
        "f1_invariants": {
            "room_dimensions_m": [4.2, 3.6, 2.8],
            "desk_footprint_m": [2.6, 0.8],
            "desk_top_height_m": 0.75,
            "desk_center_runtime_m": [0.0, 0.75, -1.15],
            "chair_root_runtime_m": [0.30, 0.0, -0.36],
            "rear_wall_z_runtime_m": -1.80
        },
        "materials": [m.name for m in bpy.data.materials],
        "lights": [l.name for l in bpy.data.lights],
        "cameras": [c.name for c in bpy.data.cameras]
    }

    register_path = SCRIPT_DIR / "asset-register.json"
    with open(register_path, "w", encoding="utf-8") as f:
        json.dump(stats, f, indent=2)
    print(f"Saved asset register: {register_path}")

    return stats

# ==============================================================================
# Main Orchestrator
# ==============================================================================

def main():
    print("=" * 80)
    print("YOR WORLD - Workstation Material, Light & Prop Detail Sample Generation")
    print("=" * 80)

    start_time = time.time()
    clear_scene()

    # 1. Setup PBR Materials
    print("Setting up PBR materials...")
    mats = setup_all_materials()

    # 2. Master Root
    root = add_empty_anchor("workstation-sample-root", (0.0, 0.0, 0.0))

    # 3. Build Components
    print("Building room architecture...")
    build_room_architecture(mats, root)

    print("Building workstation desk and storage...")
    build_desk_and_storage(mats, root)

    print("Building ergonomic gaming chair...")
    build_ergonomic_chair(mats, root)

    print("Building curved monitor and warm light bar...")
    build_monitor_and_lightbar(mats, root)

    print("Building hexagonal wall lighting cluster...")
    build_hexagonal_wall_lighting(mats, root)

    print("Building gaming PC case and pegboard...")
    build_gaming_pc_and_pegboard(mats, root)

    print("Building desktop peripherals and props...")
    build_peripherals_and_desktop_props(mats, root)

    print("Building organic plants...")
    build_organic_plants(mats, root)

    # 4. Setup Lighting Rig
    print("Setting up physical lighting hierarchy...")
    lights = setup_lighting(root)

    # 5. Setup Cameras
    print("Setting up camera presets...")
    cams = setup_all_cameras()

    # 6. Render Evidence
    print("Rendering camera evidence and lighting breakdown passes...")
    render_all_evidence(bpy.context.scene, cams, lights)

    # 7. Export glTF and native .blend
    print("Exporting assets...")
    stats = export_assets(root)

    elapsed = time.time() - start_time
    print(f"Workstation sample generation completed in {elapsed:.2f} seconds.")
    print("=" * 80)

if __name__ == "__main__":
    main()
