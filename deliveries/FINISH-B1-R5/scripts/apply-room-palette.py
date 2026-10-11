import ast, hashlib, json, pathlib, runpy
import bpy
OUT=pathlib.Path(__file__).resolve().parents[1]
BASE=OUT/'inputs/r4-02/assets/source/room.blend'
NATIVE=OUT/'assets/source/room.blend'
BUILDER=OUT/'source/blender/scripts/build-environment.py'
PALETTE=OUT/'source/palette.json'
EVIDENCE=OUT/'evidence'

def sha(data): return hashlib.sha256(data).hexdigest()
def digest(value): return sha(json.dumps(value,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode('utf-8'))
def plain(value):
    if isinstance(value,(str,int,float,bool)) or value is None: return value
    try: return [plain(v) for v in value]
    except TypeError: return str(value)
def node_material_snapshot(material):
    nodes={};links=[]
    if material.use_nodes:
        for node in sorted(material.node_tree.nodes,key=lambda n:n.name):
            inputs={socket.name:plain(socket.default_value) for socket in node.inputs if hasattr(socket,'default_value')}
            nodes[node.name]={'type':node.type,'inputs':inputs,'image':node.image.name if hasattr(node,'image') and node.image else None}
        links=[{'fromNode':link.from_node.name,'fromSocket':link.from_socket.name,'toNode':link.to_node.name,'toSocket':link.to_socket.name} for link in material.node_tree.links]
    return {'diffuseColor':plain(material.diffuse_color),'surfaceRender':material.surface_render_method,'useNodes':material.use_nodes,'nodes':nodes,'links':links}
def mesh_signature(mesh):
    vertices=[plain(v.co) for v in mesh.vertices]
    edges=[list(edge.vertices) for edge in mesh.edges]
    polygons=[{'vertices':list(poly.vertices),'loopIndices':list(poly.loop_indices),'smooth':poly.use_smooth,'materialIndex':poly.material_index} for poly in mesh.polygons]
    uv={layer.name:[plain(row.uv) for row in layer.data] for layer in mesh.uv_layers}
    return {'name':mesh.name,'vertices':len(vertices),'edges':len(edges),'polygons':len(polygons),'vertexSHA256':digest(vertices),'edgeSHA256':digest(edges),'polygonSHA256':digest(polygons),'uvLayers':{name:{'count':len(rows),'sha256':digest(rows)} for name,rows in uv.items()}}
def action_inventory():
    rows=[]
    for action in sorted(bpy.data.actions,key=lambda a:a.name):
        curves=[]
        for curve in getattr(action,'fcurves',[]):
            curves.append({'dataPath':curve.data_path,'arrayIndex':curve.array_index,'keys':[[point.co.x,point.co.y] for point in curve.keyframe_points]})
        rows.append({'name':action.name,'frameRange':plain(action.frame_range),'curves':curves})
    return rows
def snapshot():
    objects={}
    for obj in sorted(bpy.data.objects,key=lambda o:o.name):
        row={'type':obj.type,'parent':obj.parent.name if obj.parent else None,'children':sorted(child.name for child in obj.children),
             'matrixLocal':plain(obj.matrix_local),'matrixParentInverse':plain(obj.matrix_parent_inverse),'matrixBasis':plain(obj.matrix_basis),
             'materialSlots':[slot.material.name if slot.material else None for slot in obj.material_slots],
             'customProperties':{key:plain(obj[key]) for key in obj.keys() if key!='_RNA_UI'},'dataName':obj.data.name if obj.data else None}
        if obj.type=='MESH': row['mesh']=mesh_signature(obj.data)
        if obj.type=='CAMERA': row['camera']={'type':obj.data.type,'lens':obj.data.lens,'sensorFit':obj.data.sensor_fit,'sensorWidth':obj.data.sensor_width,'sensorHeight':obj.data.sensor_height,'clipStart':obj.data.clip_start,'clipEnd':obj.data.clip_end,'angle':obj.data.angle}
        if obj.type=='LIGHT': row['light']={'name':obj.data.name,'type':obj.data.type,'color':plain(obj.data.color),'energy':obj.data.energy,'shadowSoftSize':getattr(obj.data,'shadow_soft_size',None),'spotSize':getattr(obj.data,'spot_size',None),'spotBlend':getattr(obj.data,'spot_blend',None),'useShadow':getattr(obj.data,'use_shadow',None)}
        if obj.type=='ARMATURE': row['bones']=[{'name':bone.name,'parent':bone.parent.name if bone.parent else None,'matrixLocal':plain(bone.matrix_local)} for bone in obj.data.bones]
        objects[obj.name]=row
    materials={m.name:node_material_snapshot(m) for m in sorted(bpy.data.materials,key=lambda m:m.name)}
    scenes={scene.name:{'camera':scene.camera.name if scene.camera else None,'renderResolution':[scene.render.resolution_x,scene.render.resolution_y,scene.render.resolution_percentage],'frame':scene.frame_current,'fps':[scene.render.fps,scene.render.fps_base]} for scene in sorted(bpy.data.scenes,key=lambda s:s.name)}
    return {'objects':objects,'materials':materials,'actions':action_inventory(),'scenes':scenes}
def leaf_differences(a,b,prefix=''):
    if type(a)!=type(b): return [(prefix,a,b)]
    if isinstance(a,dict):
        if a.keys()!=b.keys(): return [(prefix+'/@keys',sorted(a),sorted(b))]
        return [row for key in sorted(a) for row in leaf_differences(a[key],b[key],prefix+'/'+str(key))]
    if isinstance(a,list):
        if len(a)!=len(b): return [(prefix+'/@length',len(a),len(b))]
        return [row for index,(x,y) in enumerate(zip(a,b)) for row in leaf_differences(x,y,prefix+'/'+str(index))]
    return [] if a==b else [(prefix,a,b)]
def json_value(value): return json.loads(json.dumps(value))

if bpy.app.version_string!='5.2.2 LTS': raise RuntimeError('Blender 5.2.2 LTS required, got '+bpy.app.version_string)
config=json.loads(PALETTE.read_text(encoding='utf-8'))
r4_manifest=json.loads((OUT/'inputs/r4-02/output-hashes.json').read_text(encoding='utf-8'))
base_row=next(row for row in r4_manifest['files'] if row['path']=='assets/source/room.blend')
if sha(BASE.read_bytes())!=base_row['sha256']: raise RuntimeError('R4 native room source hash mismatch')
if sha(NATIVE.read_bytes())!=base_row['sha256']: raise RuntimeError('candidate starting room source is not exact R4 input')
ns=runpy.run_path(str(BUILDER),run_name='finish35_source_replay')
builder_palette=ns['FINISH35_ROOM_PALETTE']
normalized={name:{'baseColor':list(row[0]),'roughness':row[1],'metallic':row[2],'emissionColor':list(row[3]),'emissionStrength':row[4]} for name,row in builder_palette.items()}
if normalized!=config['roomMaterials']: raise RuntimeError('patched source builder and palette.json differ')
source_tree=ast.parse(BUILDER.read_text(encoding='utf-8'))
source_light_targets={}
for node in ast.walk(source_tree):
    if not isinstance(node,ast.Assign): continue
    for target in node.targets:
        if not (isinstance(target,ast.Attribute) and target.attr=='color' and isinstance(target.value,ast.Name)): continue
        if target.value.id not in {'hex_light_data','cyan_fill_data','ambient_data'}: continue
        value=node.value
        if not (isinstance(value,ast.Subscript) and isinstance(value.value,ast.Name) and value.value.id=='FINISH35_AUTHORED_LIGHT_COLORS'):
            raise RuntimeError('authored light no longer uses the bounded palette input')
        source_light_targets[ast.literal_eval(value.slice)]=target.value.id
expected_targets={'HexWall_PointLight':'hex_light_data','CyanUnderdesk_PointLight':'cyan_fill_data','CeilingAmbient_PointLight':'ambient_data'}
if source_light_targets!=expected_targets: raise RuntimeError('patched builder authored light assignments differ')
source_light_values={name:list(values) for name,values in ns['FINISH35_AUTHORED_LIGHT_COLORS'].items()}
if source_light_values!=config['authoredLightColors']: raise RuntimeError('patched builder and palette config authored-light colors differ')

bpy.ops.wm.open_mainfile(filepath=str(BASE))
before=snapshot()
for name,row in config['roomMaterials'].items():
    material=bpy.data.materials.get(name)
    if material is None or not material.use_nodes: raise RuntimeError('missing room material '+name)
    bsdf=material.node_tree.nodes.get('Principled BSDF')
    if bsdf is None: raise RuntimeError('missing Principled BSDF '+name)
    bsdf.inputs['Base Color'].default_value=tuple(row['baseColor'])
    bsdf.inputs['Roughness'].default_value=row['roughness']
    bsdf.inputs['Metallic'].default_value=row['metallic']
    if 'Emission Color' in bsdf.inputs: bsdf.inputs['Emission Color'].default_value=tuple(row['emissionColor'])
    elif 'Emission' in bsdf.inputs: bsdf.inputs['Emission'].default_value=tuple(row['emissionColor'])
    bsdf.inputs['Emission Strength'].default_value=row['emissionStrength']
    material.diffuse_color=tuple(row['baseColor'])
for data_name,color in config['authoredLightColors'].items():
    light=bpy.data.lights.get(data_name)
    if light is None: raise RuntimeError('missing authored light '+data_name)
    light.color=tuple(color)
expected=snapshot()
if set(before['objects'])!=set(expected['objects']) or set(before['materials'])!=set(expected['materials']): raise RuntimeError('palette edit changed object/material inventory')
if before['actions']!=expected['actions'] or before['scenes']!=expected['scenes']: raise RuntimeError('palette edit changed animation/scene state')
def without_palette_light_colors(objects):
    result=json_value(objects)
    for row in result.values():
        if row['type']=='LIGHT': row['light']['color']='ALLOWLISTED_COLOR'
    return result
if without_palette_light_colors(before['objects'])!=without_palette_light_colors(expected['objects']): raise RuntimeError('palette edit changed node/geometry/UV/TRS/hook/light-state')
material_diff=[]
for name in sorted(before['materials']):
    diff=leaf_differences(before['materials'][name],expected['materials'][name],name)
    if name=='PC_TemperedGlass' and diff: raise RuntimeError('R4 PC glass native material changed')
    allowed={'diffuseColor','nodes/Principled BSDF/inputs/Base Color','nodes/Principled BSDF/inputs/Roughness','nodes/Principled BSDF/inputs/Metallic','nodes/Principled BSDF/inputs/Emission Color','nodes/Principled BSDF/inputs/Emission Strength'}
    if name not in config['roomMaterials'] and diff: raise RuntimeError('unexpected native material change '+name+': '+repr(diff[:4]))
    for path,old,new in diff:
        field=path.split('/',1)[1] if '/' in path else path
        if name in config['roomMaterials'] and not any(field==candidate or field.startswith(candidate+'/') for candidate in allowed): raise RuntimeError('unauthorized native material field '+path)
        material_diff.append({'material':name,'field':field,'before':old,'after':new})
light_diff=[]
for obj_name in sorted(before['objects']):
    a=before['objects'][obj_name];b=expected['objects'][obj_name]
    if a['type']!='LIGHT': continue
    if a['light']!=b['light']:
        d=leaf_differences(a['light'],b['light'],obj_name+'/light')
        for path,old,new in d:
            data_name=a['light']['name']
            if data_name not in config['authoredLightColors'] or 'color' not in path.split('/'): raise RuntimeError('unauthorized light change '+path)
            light_diff.append({'object':obj_name,'data':data_name,'field':'color','before':old,'after':new})
if len(material_diff)==0 or {row['data'] for row in light_diff}!=set(config['authoredLightColors']): raise RuntimeError('expected material/light correction missing')
# Save only the palette-authorized semantic edits, then re-open and compare the full inventories.
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(NATIVE))
bpy.ops.wm.open_mainfile(filepath=str(NATIVE))
reopened=snapshot()
if reopened!=expected: raise RuntimeError('reopened native source differs from pre-save semantic inventory')
export_path=EVIDENCE/'native-room-export.glb';export_path.parent.mkdir(parents=True,exist_ok=True)
ns['export_gltf_group'](bpy.data.objects['Room_Root'],export_path,export_anim=False)
receipt={'status':'PASS','blenderVersion':bpy.app.version_string,'baselineNativeSHA256':base_row['sha256'],'outputNativeSHA256':sha(NATIVE.read_bytes()),
 'sourceBuilderSHA256':sha(BUILDER.read_bytes()),'paletteConfigSHA256':sha(PALETTE.read_bytes()),'objectCount':len(reopened['objects']),'materialCount':len(reopened['materials']),
 'cameraNames':[name for name,row in reopened['objects'].items() if row['type']=='CAMERA'],'actionNames':[row['name'] for row in reopened['actions']],
 'nodeGeometryUVTransformsHooksUnchanged':True,'allNonPaletteMaterialsUnchanged':True,'pcTemperedGlassSemanticallyExact':True,
 'materialDiff':material_diff,'authoredLightDiff':light_diff,'nativeInventorySHA256':digest(reopened),'nativeRoomExport':{'path':'evidence/native-room-export.glb','bytes':export_path.stat().st_size,'sha256':sha(export_path.read_bytes())},
 'scope':'Exact R4 native .blend opened, palette values derived from the patched R4 builder, only allowlisted material fields and three authored point-light colors changed; file reopened and inventoried before Blender export.'}
(EVIDENCE/'native-palette-scope.json').write_text(json.dumps(receipt,indent=2)+chr(10),encoding='utf-8')
print(json.dumps({'status':'PASS','objects':len(reopened['objects']),'materials':len(reopened['materials']),'materialChanges':len(material_diff),'lightChanges':len(light_diff),'nativeExportBytes':export_path.stat().st_size,'nativeSHA256':receipt['outputNativeSHA256']},indent=2))
