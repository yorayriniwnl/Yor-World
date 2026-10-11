"""Apply only the three authorized mesh edits and one new node to exact R3 source."""
import ast,bpy,hashlib,json,pathlib,runpy,subprocess
from mathutils import Vector
OUT=pathlib.Path(__file__).resolve().parents[1]
ns=runpy.run_path(str(OUT/'source/blender/scripts/build-environment.py'),run_name='finish25_native_delta')
bpy.ops.wm.open_mainfile(filepath=str(OUT/'inputs/r3/assets/source/room.blend'))
def hv(v):return hashlib.sha256(json.dumps(v,sort_keys=True,separators=(',',':')).encode()).hexdigest()
def meshdata(o):
    if o.type!='MESH':return None
    return dict(vertices=[list(v.co) for v in o.data.vertices],faces=[dict(vertices=list(p.vertices),smooth=p.use_smooth,material=p.material_index) for p in o.data.polygons],uvs={u.name:[list(v.uv) for v in u.data] for u in o.data.uv_layers})
def inventory():
    bpy.context.view_layer.update()
    return {o.name:dict(type=o.type,parent=o.parent.name if o.parent else None,matrix=[list(r) for r in o.matrix_local],materialSlots=[m.name if m else None for m in getattr(o.data,'materials',[])],mesh=meshdata(o)) for o in bpy.data.objects}
before=inventory()
def material_inventory():
    def value(v):
        if isinstance(v,(int,float,str,bool)):return v
        try:return list(v)
        except:return str(v)
    rows=[]
    for m in sorted(bpy.data.materials,key=lambda x:x.name):
        row=dict(name=m.name,surfaceRender=m.surface_render_method,diffuseColor=list(m.diffuse_color),nodes=[])
        if m.use_nodes:
            for n in sorted(m.node_tree.nodes,key=lambda x:x.name):
                row['nodes'].append(dict(name=n.name,type=n.type,inputs={s.name:value(s.default_value) for s in n.inputs if hasattr(s,'default_value')},image=n.image.name if hasattr(n,'image') and n.image else None))
            row['links']=[dict(fromNode=l.from_node.name,fromSocket=l.from_socket.name,toNode=l.to_node.name,toSocket=l.to_socket.name) for l in m.node_tree.links]
        rows.append(row)
    return rows
beforeMaterials=material_inventory();beforeActions=sorted(a.name for a in bpy.data.actions)
def replace_mesh(o,vertices,faces,oldUvs=None,styles=None):
    names=[l.name for l in o.data.uv_layers] or ['UVMap'];mats=list(o.data.materials)
    o.data.clear_geometry();o.data.from_pydata(vertices,[],faces);o.data.update()
    assert list(o.data.materials)==mats
    while o.data.uv_layers:o.data.uv_layers.remove(o.data.uv_layers[0])
    for name in names:
        uv=o.data.uv_layers.new(name=name)
        for i,p in enumerate(o.data.polygons):
            vals=oldUvs[name][i] if oldUvs and i<len(oldUvs[name]) else [(0,0),(1,0),(1,1),(0,1)]
            for index,v in zip(p.loop_indices,vals):uv.data[index].uv=v
            if styles and i<len(styles):p.use_smooth=styles[i][0];p.material_index=styles[i][1]
for name in ['pc_chassis_frame','window_frame']:
    v,f=ns['finish25_native_box_geometry'](name);replace_mesh(bpy.data.objects[name],v,f)
wall=bpy.data.objects['StaticBatch__Room_Root__Wall_SoftLavender'];old=wall.data
selected=set(json.loads((OUT/'evidence/window-occlusion-scope.json').read_text())['wallLeftComponent']['vertexIndices'])
# Blender y is -runtime z; the exact native left-wall component has eight vertices.
assert len(selected)==8,(len(selected),selected)
vertices=[list(v.co) for v in old.vertices];kept=[];styles=[];uvs={u.name:[] for u in old.uv_layers}
removed=[]
for p in old.polygons:
    if set(p.vertices)<=selected:removed.append(p.index);continue
    assert not set(p.vertices)&selected
    kept.append(tuple(p.vertices));styles.append((p.use_smooth,p.material_index))
    for u in old.uv_layers:uvs[u.name].append([list(u.data[i].uv) for i in p.loop_indices])
assert len(removed)==6
newv,newf=ns['finish25_native_box_geometry']('wall_left');proxy=bpy.data.objects['wall_left'];offset=len(vertices)
vertices.extend(list(wall.matrix_world.inverted()@(proxy.matrix_world@Vector(v))) for v in newv)
kept.extend(tuple(offset+i for i in f) for f in newf)
replace_mesh(wall,vertices,kept,uvs,styles)
backplate=ns['add_finish25_mesh']('pc_internal_backplate',(1.155,1.0,-1.15),bpy.data.materials['Baseboard_Charcoal'],bpy.data.objects['helios-pc'],bpy.data.objects['helios-pc'].users_collection[0])
m=bpy.data.materials['PC_TemperedGlass'];p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Transmission Weight'].default_value=0;p.inputs['Alpha'].default_value=.18;p.inputs['Base Color'].default_value[3]=.18;m.surface_render_method='BLENDED'
after=inventory();assert set(after)-set(before)=={'pc_internal_backplate'}
afterMaterials=material_inventory();assert [m for m in beforeMaterials if m['name']!='PC_TemperedGlass']==[m for m in afterMaterials if m['name']!='PC_TemperedGlass'];assert beforeActions==sorted(a.name for a in bpy.data.actions)
allowed={'pc_chassis_frame','window_frame','StaticBatch__Room_Root__Wall_SoftLavender'}
for n,a in before.items():
    b=after[n]
    for k in ['type','parent','matrix','materialSlots']:assert a[k]==b[k],(n,k)
    if n not in allowed:assert a['mesh']==b['mesh'],n
# Every surviving original wall face retains exact vertex positions, UVs and shading.
oldmesh=before[wall.name]['mesh'];newmesh=after[wall.name]['mesh'];assert oldmesh['vertices']==newmesh['vertices'][:len(oldmesh['vertices'])]
original_kept=[f for i,f in enumerate(oldmesh['faces']) if i not in removed]
assert newmesh['faces'][:len(original_kept)]==original_kept
for layer,oldvals in oldmesh['uvs'].items():
    expected=[];cursor=0
    for i,f in enumerate(oldmesh['faces']):
        c=len(f['vertices']);vs=oldvals[cursor:cursor+c];cursor+=c
        if i not in removed:expected.extend(vs)
    assert newmesh['uvs'][layer][:len(expected)]==expected
receipt=dict(status='PASS',version=bpy.app.version_string,before=before,after=after,beforeMaterials=beforeMaterials,afterMaterials=afterMaterials,allOtherNativeMaterialsExact=True,actionsExact=True,changedMeshObjects=sorted(allowed),newNodes=['pc_internal_backplate'],allOldNodeIdentityHierarchyTRSAndMaterialSlotsExact=True,allOtherMeshesAndUVsExact=True,otherWallComponentsExact=True,removedWallPolygonIndices=removed,triangleChanges={n:dict(before=sum(len(f['vertices'])-2 for f in before[n]['mesh']['faces']),after=sum(len(f['vertices'])-2 for f in after[n]['mesh']['faces'])) for n in allowed},backplateTriangles=12)
(OUT/'evidence/native-geometry-diff.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'assets/source/room.blend'))
bpy.ops.wm.open_mainfile(filepath=str(OUT/'assets/source/room.blend'))
reopened=inventory();reopenedMaterials=material_inventory()
if reopened!=after or reopenedMaterials!=afterMaterials:
    def differences(a,b,path=''):
        if type(a)!=type(b):return [(path,a,b)]
        if isinstance(a,dict):return [(path,'keys',list(a),list(b))] if a.keys()!=b.keys() else [d for k in a for d in differences(a[k],b[k],path+'/'+str(k))]
        if isinstance(a,list):return [(path,'length',len(a),len(b))] if len(a)!=len(b) else [d for i,(x,y) in enumerate(zip(a,b)) for d in differences(x,y,path+'/'+str(i))]
        return [] if a==b else [(path,a,b)]
    d=differences(after,reopened)+differences(afterMaterials,reopenedMaterials,'materials')
    (OUT/'evidence/native-reopen-diff.json').write_text(json.dumps(d,indent=2)+'\n',encoding='utf-8');print(d[:20])
assert reopened==after and reopenedMaterials==afterMaterials
receipt['reopenedNativeInventoryExact']=True
(OUT/'evidence/native-geometry-diff.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8')
# Compare the exact contaminated snapshot, using only its eligible native input.
collisionCommit='2cc4419aa9e0670b9b3da36cfbbcdb472231589e'
collisionAvailable=subprocess.run(['git','cat-file','-e',collisionCommit],cwd=OUT.parents[1],capture_output=True).returncode==0
if collisionAvailable:
    oldRaw=subprocess.check_output(['git','show',collisionCommit+':deliveries/FINISH-B1-R4/assets/source/room.blend'],cwd=OUT.parents[1])
    scratch=OUT/'.work/collision-native.blend';scratch.parent.mkdir(parents=True,exist_ok=True);scratch.write_bytes(oldRaw)
    bpy.ops.wm.open_mainfile(filepath=str(scratch));collision=inventory();collisionMaterials=material_inventory()
    def record_differences(a,b,path=''):
        if type(a)!=type(b):return [dict(path=path,collision=a,rebuilt=b)]
        if isinstance(a,dict):
            if a.keys()!=b.keys():return [dict(path=path,collisionKeys=list(a),rebuiltKeys=list(b))]
            return [d for k in a for d in record_differences(a[k],b[k],path+'/'+str(k))]
        if isinstance(a,list):
            if len(a)!=len(b):return [dict(path=path,collisionLength=len(a),rebuiltLength=len(b))]
            return [d for i,(x,y) in enumerate(zip(a,b)) for d in record_differences(x,y,path+'/'+str(i))]
        return [] if a==b else [dict(path=path,collision=a,rebuilt=b)]
    objectDiffs={n:record_differences(collision[n],after[n]) for n in after if collision.get(n)!=after[n]}
    oldExport=subprocess.check_output(['git','show',collisionCommit+':deliveries/FINISH-B1-R4/evidence/native-room-export.glb'],cwd=OUT.parents[1])
    comparison=dict(status='SOURCE CONTAMINATION RESOLVED BY EXACT R3 REBUILD',method='Load exact eligible committed collision .blend and compare every native object type/parent/matrix/material-slot/mesh vertices/faces/UV plus full material node-input/link inventory against fresh R3 + authorized source recipes. No unknown scripts used.',collisionCommit=collisionCommit,collisionNativeBlendSHA256=hashlib.sha256(oldRaw).hexdigest(),collisionNativeExportSHA256=hashlib.sha256(oldExport).hexdigest(),earlierNativeExportComparisonSHA256='d421d5217c495728afb7a83815ac7b399a1516cf5edf80e2b3779cd218deb090',earlierNativeExportComparisonBytesAvailable=False,earlierValueSource='Superseded final-export-reproducibility.json recorded in collision commit; old binary not retained, so no binary-to-binary diff claimed.',differentObjectRecords=objectDiffs,collisionVsRebuiltAllNativeMaterialRecordsExact=collisionMaterials==afterMaterials,allUnauthorizedRebuiltObjectRecordsMatchR3=True,allUnauthorizedRebuiltNativeMaterialsMatchR3=True)
    (OUT/'evidence/native-reopen-diff.json').write_text(json.dumps(comparison,indent=2)+'\n',encoding='utf-8')
    bpy.ops.wm.open_mainfile(filepath=str(OUT/'assets/source/room.blend'));assert inventory()==after and material_inventory()==afterMaterials
    comparison['collisionComparisonReexecuted']=True
else:
    comparison=json.loads((OUT/'evidence/native-reopen-diff.json').read_text());comparison['collisionComparisonReexecuted']=False
    comparison['collisionComparisonStatus']='NOT RUN: preserved unpushed collision commit unavailable; previous hashed comparison retained, fresh R3 rebuild still executed.'
    oldExport=None
ns['export_gltf_group'](bpy.data.objects['Room_Root'],OUT/'evidence/native-room-export.glb',export_anim=False)
newExport=(OUT/'evidence/native-room-export.glb').read_bytes()
def export_parts(raw):
    n=int.from_bytes(raw[12:16],'little');return json.loads(raw[20:20+n]),raw[28+n:]
if oldExport is not None:
    oldJ,oldBin=export_parts(oldExport);newJ,newBin=export_parts(newExport)
    comparison.update(rebuiltNativeExportSHA256=hashlib.sha256(newExport).hexdigest(),collisionNativeExportBytes=len(oldExport),rebuiltNativeExportBytes=len(newExport),nativeExportJSONRecordDiffs=record_differences(oldJ,newJ),nativeExportBinaryComparison=dict(collisionSHA256=hashlib.sha256(oldBin).hexdigest(),rebuiltSHA256=hashlib.sha256(newBin).hexdigest(),collisionBytes=len(oldBin),rebuiltBytes=len(newBin),differentAlignedByteOffsets=sum(a!=b for a,b in zip(oldBin,newBin))))
else:
    comparison['rebuiltNativeExportSHA256']=hashlib.sha256(newExport).hexdigest();comparison['rebuiltNativeExportBytes']=len(newExport)
(OUT/'evidence/native-reopen-diff.json').write_text(json.dumps(comparison,indent=2)+'\n',encoding='utf-8')
print('PASS: exact R3 native + bounded source recipe; only authorized meshes/new node changed; native room exported')
