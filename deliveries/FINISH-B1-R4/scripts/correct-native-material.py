"""Run with Blender 5.2.2; alter only PC_TemperedGlass and save a new native source."""
import bpy, hashlib, json, pathlib
OUT=pathlib.Path(__file__).resolve().parents[1]
def sha(v):return hashlib.sha256(json.dumps(v,sort_keys=True,separators=(',',':')).encode()).hexdigest()
def val(v):
    if isinstance(v,(int,float,str,bool)):return v
    try:return list(v)
    except:return str(v)
def inventory():
    objects=[]
    for o in sorted(bpy.data.objects,key=lambda x:x.name):
        row=dict(name=o.name,type=o.type,parent=o.parent.name if o.parent else None,matrix=[list(r) for r in o.matrix_local],materials=[m.name if m else None for m in getattr(o.data,'materials',[])])
        if o.type=='MESH':
            row['geometrySHA256']=sha(dict(vertices=[list(v.co) for v in o.data.vertices],loops=[l.vertex_index for l in o.data.loops],polygons=[dict(start=p.loop_start,total=p.loop_total,material=p.material_index,smooth=p.use_smooth) for p in o.data.polygons],uvs={layer.name:[list(u.uv) for u in layer.data] for layer in o.data.uv_layers}))
        objects.append(row)
    materials=[]
    for m in sorted(bpy.data.materials,key=lambda x:x.name):
        row=dict(name=m.name,surface_render_method=m.surface_render_method,diffuse_color=list(m.diffuse_color),nodes=[])
        if m.use_nodes:
            for n in sorted(m.node_tree.nodes,key=lambda x:x.name):row['nodes'].append(dict(name=n.name,type=n.type,inputs={s.name:val(s.default_value) for s in n.inputs if hasattr(s,'default_value')}))
            row['links']=[dict(from_node=l.from_node.name,from_socket=l.from_socket.name,to_node=l.to_node.name,to_socket=l.to_socket.name) for l in m.node_tree.links]
        materials.append(row)
    return dict(objects=objects,materials=materials,actions=sorted(a.name for a in bpy.data.actions),scene=[dict(name=s.name,frame_start=s.frame_start,frame_end=s.frame_end) for s in bpy.data.scenes])
bpy.ops.wm.open_mainfile(filepath=str(OUT/'inputs/r3/assets/source/room.blend'))
before=inventory();m=bpy.data.materials['PC_TemperedGlass'];p=m.node_tree.nodes.get('Principled BSDF')
p.inputs['Transmission Weight'].default_value=0.0
p.inputs['Alpha'].default_value=0.18
p.inputs['Base Color'].default_value[3]=0.18
m.surface_render_method='BLENDED'
after=inventory()
assert before['objects']==after['objects'];assert before['actions']==after['actions'];assert before['scene']==after['scene']
assert [m for m in before['materials'] if m['name']!='PC_TemperedGlass']==[m for m in after['materials'] if m['name']!='PC_TemperedGlass']
(OUT/'assets/source').mkdir(parents=True,exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'assets/source/room.blend'))
bpy.ops.wm.open_mainfile(filepath=str(OUT/'assets/source/room.blend'))
assert inventory()==after
result=dict(toolVersion=bpy.app.version_string,before=before,after=after,geometryHierarchyActionsUnchanged=True,otherMaterialsUnchanged=True,reopenExact=True)
(OUT/'evidence/native-material-diff.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
print('PASS: native objects/mesh topology/UVs/transforms/actions/other materials exact; changed glass only; reopened exact')
