"""Amend the pinned authoring source under FINISH-25-R1, then rebuild its exact patch."""
import difflib,pathlib
OUT=pathlib.Path(__file__).resolve().parents[1]
p=OUT/'source/blender/scripts/build-environment.py';text=(OUT/'checkpoints/material-only/source/blender/scripts/build-environment.py').read_text()
definitions='''
# FINISH-25-R1: only the closed PC box, left-wall component and window-frame
# are replaced. All bounds below are runtime local coordinates; old node TRS stay.
def finish25_box_specs(kind):
    if kind == "pc_chassis_frame":
        return [((-0.12,-0.24,-0.24),(0.12,-0.228,0.24)),
                ((-0.12,0.228,-0.24),(0.12,0.24,0.24)),
                ((0.108,-0.228,-0.24),(0.12,0.228,0.24)),
                ((-0.12,-0.228,-0.24),(0.108,0.228,-0.228)),
                ((-0.12,-0.228,0.228),(0.108,0.228,0.24))]
    if kind == "window_frame":
        return [((-0.02,-0.7,-0.6),(0.02,-0.66,0.6)),
                ((-0.02,0.66,-0.6),(0.02,0.7,0.6)),
                ((-0.02,-0.66,-0.6),(0.02,0.66,-0.56)),
                ((-0.02,-0.66,0.56),(0.02,0.66,0.6))]
    if kind == "wall_left":
        return [((-0.05,-1.4,-1.8),(0.05,-0.55,1.8)),
                ((-0.05,0.85,-1.8),(0.05,1.4,1.8)),
                ((-0.05,-0.55,-1.8),(0.05,0.85,-1.2)),
                ((-0.05,-0.55,0.0),(0.05,0.85,1.8))]
    if kind == "pc_internal_backplate":
        return [((-0.004,-0.19,-0.19),(0.004,0.19,0.19))]
    raise ValueError(kind)

def finish25_native_box_geometry(kind):
    vertices, faces = [], []
    for lo, hi in finish25_box_specs(kind):
        x,y,z=lo; X,Y,Z=hi; offset=len(vertices)
        vertices.extend(r2b(*v) for v in [(x,y,z),(X,y,z),(X,Y,z),(x,Y,z),
                                          (x,y,Z),(X,y,Z),(X,Y,Z),(x,Y,Z)])
        faces.extend(tuple(offset+i for i in f) for f in [(0,3,2,1),(4,5,6,7),
                                                          (0,4,7,3),(1,2,6,5),
                                                          (0,1,5,4),(3,7,6,2)])
    return vertices, faces

def add_finish25_mesh(name, r_center, mat, parent, collection):
    mesh=bpy.data.meshes.new(name+"__FINISH25R1")
    vertices,faces=finish25_native_box_geometry(name)
    mesh.from_pydata(vertices,[],faces);mesh.update()
    mesh.materials.append(mat)
    uv=mesh.uv_layers.new(name="UVMap")
    for poly in mesh.polygons:
        for loop,coord in zip(poly.loop_indices,[(0,0),(1,0),(1,1),(0,1)]):
            uv.data[loop].uv=coord
    obj=bpy.data.objects.new(name,mesh);collection.objects.link(obj)
    obj.location=r2b(*r_center);obj.parent=parent
    obj.matrix_parent_inverse=parent.matrix_world.inverted()
    return obj

'''
assert 'def finish25_box_specs' not in text
text=text.replace('# Primitive Geometry Helpers\n','# Primitive Geometry Helpers\n'+definitions)
replacements={
'add_box("wall_left", (-2.15, 1.40, 0.0), (0.10, 2.80, 3.60), mat=mats["Wall_SoftLavender"], parent=shell_root, collection=coll)':'add_finish25_mesh("wall_left", (-2.15, 1.40, 0.0), mats["Wall_SoftLavender"], shell_root, coll)',
'add_box("window_frame", (-2.14, 1.55, -0.60), (0.04, 1.40, 1.20), mat=mats["Baseboard_Charcoal"], parent=shell_root, collection=coll)':'add_finish25_mesh("window_frame", (-2.14, 1.55, -0.60), mats["Baseboard_Charcoal"], shell_root, coll)',
'add_box("pc_chassis_frame", (pc_cx, 1.00, pc_cz), (0.24, 0.48, 0.48), mat=mats["PC_ChassisWhite"], parent=pc_root, collection=coll)':'add_finish25_mesh("pc_chassis_frame", (pc_cx, 1.00, pc_cz), mats["PC_ChassisWhite"], pc_root, coll)\n    add_finish25_mesh("pc_internal_backplate", (1.155, 1.00, pc_cz), mats["Baseboard_Charcoal"], pc_root, coll)'}
for a,b in replacements.items():assert text.count(a)==1,a;text=text.replace(a,b)
# Keep the single new static node out of static merging; its exact identity is frozen.
assert 'STATIC_BATCH_EXACT_EXCLUSIONS = {' in text
text=text.replace('STATIC_BATCH_EXACT_EXCLUSIONS = {','STATIC_BATCH_EXACT_EXCLUSIONS = {\n    "pc_internal_backplate",')
p.write_bytes(text.encode())
base=(OUT/'inputs/r3/source/blender/scripts/build-environment.py').read_text()
src='deliveries/FINISH-B1-R3/source/blender/scripts/build-environment.py'
(OUT/'source.patch').write_bytes(''.join(difflib.unified_diff(base.splitlines(keepends=True),text.splitlines(keepends=True),fromfile='a/'+src,tofile='b/'+src)).encode())
print('Installed bounded source geometry; exact cumulative R3 patch written')
