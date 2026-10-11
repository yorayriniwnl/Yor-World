import bpy, json, pathlib, runpy, struct
OUT=pathlib.Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(OUT/'assets/source/room.blend'))
def fields(m):
    p=m.node_tree.nodes.get('Principled BSDF')
    return dict(color=list(p.inputs['Base Color'].default_value),alpha=p.inputs['Alpha'].default_value,transmission=p.inputs['Transmission Weight'].default_value,roughness=p.inputs['Roughness'].default_value,metallic=p.inputs['Metallic'].default_value,ior=p.inputs['IOR'].default_value,surfaceRender=m.surface_render_method)
native=bpy.data.materials['PC_TemperedGlass'];nativefields=fields(native)
nativecopy=native.copy();nativecopy.name='Glass_Parity_Probe'
ns=runpy.run_path(str(OUT/'source/blender/scripts/build-environment.py'),run_name='material_parity_probe')
builder=ns['create_all_materials'](OUT/'assets/textures')['PC_TemperedGlass'];builderfields=fields(builder)
assert nativefields==builderfields,(nativefields,builderfields)
mesh=bpy.data.meshes.new('Glass_Parity_Triangle');mesh.from_pydata([(0,0,0),(1,0,0),(0,1,0)],[],[(0,1,2)])
probe=bpy.data.objects.new('Glass_Parity_Probe',mesh);bpy.context.collection.objects.link(probe);mesh.materials.append(nativecopy)
bpy.ops.object.select_all(action='DESELECT');probe.select_set(True);bpy.context.view_layer.objects.active=probe
file=OUT/'evidence/native-glass-parity-export.glb'
bpy.ops.export_scene.gltf(filepath=str(file),export_format='GLB',use_selection=True,export_animations=False,export_cameras=False,export_lights=False)
b=file.read_bytes();n=struct.unpack_from('<I',b,12)[0];j=json.loads(b[20:20+n]);m=j['materials'][0]
assert m['alphaMode']=='BLEND' and abs(m['pbrMetallicRoughness']['baseColorFactor'][3]-.18)<1e-7
assert 'KHR_materials_transmission' not in m.get('extensions',{})
prod=(OUT/'assets/room.glb').read_bytes();n=struct.unpack_from('<I',prod,12)[0];pj=json.loads(prod[20:20+n]);pm=next(x for x in pj['materials'] if x['name']=='PC_TemperedGlass')
def eq(a,b):
    if isinstance(a,float) and isinstance(b,(float,int)):return abs(a-b)<1e-7
    if isinstance(a,dict) and isinstance(b,dict):return a.keys()==b.keys() and all(eq(a[k],b[k]) for k in a)
    if isinstance(a,list) and isinstance(b,list):return len(a)==len(b) and all(eq(x,y) for x,y in zip(a,b))
    return a==b
m['name']=pm['name'];assert eq(m,pm),(m,pm)
receipt=dict(status='PASS',blenderVersion=bpy.app.version_string,sourceBuilderFields=builderfields,nativeSourceFields=nativefields,sourceNativeExact=True,nativeProbeExport=m,productionMaterial=pm,nativeExportProductionMaterialEqualWithin1e_7=True,scope='Final amended native glass exported on isolated triangle; builder/native fields exact and production material parity within 1e-7. Full-room authorized mesh export/parity and untouched original records are checked separately by final-lineage.json.')
(OUT/'evidence/native-source-export-parity.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8');print('PASS: builder/native fields exact; actual Blender glass export matches production material within 1e-7')
