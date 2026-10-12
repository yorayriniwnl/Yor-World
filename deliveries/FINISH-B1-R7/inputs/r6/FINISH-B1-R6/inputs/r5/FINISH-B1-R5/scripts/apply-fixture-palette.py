import hashlib,json,pathlib,struct
import bpy
OUT=pathlib.Path(__file__).resolve().parents[1]
SOURCE=OUT/'inputs/r4-02/assets/fixture.glb'
DEST=OUT/'assets/fixture.glb'
EXPORT=OUT/'evidence/native-fixture-export.glb'
CONFIG=json.loads((OUT/'source/palette.json').read_text(encoding='utf-8'))
def sha(b): return hashlib.sha256(b).hexdigest()
def digest(v): return sha(json.dumps(v,sort_keys=True,separators=(',',':')).encode('utf-8'))
def plain(v):
    if isinstance(v,(str,int,float,bool)) or v is None:return v
    try:return [plain(x) for x in v]
    except TypeError:return str(v)
def mesh_sig(mesh):
    vertices=[plain(v.co) for v in mesh.vertices]
    edges=[list(e.vertices) for e in mesh.edges]
    faces=[{'v':list(p.vertices),'loops':list(p.loop_indices),'smooth':p.use_smooth,'material':p.material_index} for p in mesh.polygons]
    uv={layer.name:[plain(row.uv) for row in layer.data] for layer in mesh.uv_layers}
    return {'name':mesh.name,'vertices':len(vertices),'edges':len(edges),'faces':len(faces),'vertexHash':digest(vertices),'edgeHash':digest(edges),'faceHash':digest(faces),'uvHash':digest(uv)}
def objects():
    rows={}
    for obj in sorted(bpy.data.objects,key=lambda o:o.name):
        row={'type':obj.type,'parent':obj.parent.name if obj.parent else None,'children':sorted(c.name for c in obj.children),
             'local':plain(obj.matrix_local),'parentInverse':plain(obj.matrix_parent_inverse),'basis':plain(obj.matrix_basis),
             'custom':{k:plain(obj[k]) for k in obj.keys() if k!='_RNA_UI'},
             'materials':[s.material.name if s.material else None for s in obj.material_slots]}
        if obj.type=='MESH':row['mesh']=mesh_sig(obj.data)
        if obj.type=='ARMATURE':row['bones']=[{'name':b.name,'parent':b.parent.name if b.parent else None,'matrix':plain(b.matrix_local)} for b in obj.data.bones]
        rows[obj.name]=row
    return rows
if bpy.app.version_string!='5.2.2 LTS':raise RuntimeError('Blender 5.2.2 LTS required')
if sha(SOURCE.read_bytes())!=sha(DEST.read_bytes()):raise RuntimeError('candidate fixture did not start from exact R4 raw input')
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(SOURCE))
before=objects();actions_before=sorted(a.name for a in bpy.data.actions)
material_before={m.name:{'color':plain(m.diffuse_color),'roughness':m.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value,
 'metallic':m.node_tree.nodes.get('Principled BSDF').inputs['Metallic'].default_value} for m in bpy.data.materials if m.name in CONFIG['fixtureMaterials']}
for name,row in CONFIG['fixtureMaterials'].items():
    mat=bpy.data.materials.get(name)
    if mat is None or not mat.use_nodes:raise RuntimeError('missing fixture material '+name)
    bsdf=mat.node_tree.nodes.get('Principled BSDF')
    if bsdf is None:raise RuntimeError('missing Principled BSDF '+name)
    bsdf.inputs['Base Color'].default_value=tuple(row['baseColor'])
    bsdf.inputs['Roughness'].default_value=row['roughness']
    bsdf.inputs['Metallic'].default_value=row['metallic']
    emission=list(row['emissionColor'])
    if len(emission)==3:emission.append(1.0)
    if 'Emission Color' in bsdf.inputs:bsdf.inputs['Emission Color'].default_value=tuple(emission)
    elif 'Emission' in bsdf.inputs:bsdf.inputs['Emission'].default_value=tuple(emission)
    bsdf.inputs['Emission Strength'].default_value=row['emissionStrength']
    mat.diffuse_color=tuple(row['baseColor'])
after=objects();actions_after=sorted(a.name for a in bpy.data.actions)
if before!=after:raise RuntimeError('fixture palette edit changed node/geometry/UV/TRS/material-hook inventory')
if actions_before!=actions_after:raise RuntimeError('fixture palette edit changed action inventory')
material_after={m.name:{'color':plain(m.diffuse_color),'baseColor':plain(m.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value),
 'roughness':m.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value,'metallic':m.node_tree.nodes.get('Principled BSDF').inputs['Metallic'].default_value,
 'emissionColor':plain(m.node_tree.nodes.get('Principled BSDF').inputs['Emission Color'].default_value),'emissionStrength':m.node_tree.nodes.get('Principled BSDF').inputs['Emission Strength'].default_value}
 for m in sorted(bpy.data.materials,key=lambda m:m.name) if m.name in CONFIG['fixtureMaterials']}
if set(material_after)!=set(CONFIG['fixtureMaterials']):raise RuntimeError('fixture material set differs')
EXPORT.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.context.view_layer.objects.active=next((o for o in bpy.context.scene.objects if o.select_get()),None)
bpy.ops.export_scene.gltf(filepath=str(EXPORT),export_format='GLB',use_selection=True,export_apply=False,export_materials='EXPORT',export_lights=False,export_cameras=False,export_animations=False,export_image_format='AUTO')
receipt={'status':'PASS','blenderVersion':bpy.app.version_string,'inputFixtureSHA256':sha(SOURCE.read_bytes()),'candidateFixtureInputSHA256':sha(DEST.read_bytes()),'nativeExportSHA256':sha(EXPORT.read_bytes()),
 'objectCount':len(after),'actionNames':actions_after,'nodeGeometryUVTransformsHooksUnchanged':True,'materialCount':len(material_after),'materialBefore':material_before,'materialAfter':material_after,
 'nativeExport':{'path':'evidence/native-fixture-export.glb','bytes':EXPORT.stat().st_size,'sha256':sha(EXPORT.read_bytes())},
 'scope':'Exact R4 chair fixture GLB imported into Blender, existing blue/ivory materials changed, full native export emitted for material parity; no geometry, node, UV, transform, hook or action edits.'}
(OUT/'evidence/fixture-palette-scope.json').write_text(json.dumps(receipt,indent=2)+chr(10),encoding='utf-8')
print(json.dumps({'status':'PASS','objects':len(after),'materials':len(material_after),'exportBytes':EXPORT.stat().st_size,'sha256':receipt['nativeExportSHA256']},indent=2))