import bpy, hashlib, json, sys
from pathlib import Path
args=sys.argv[sys.argv.index("--")+1:]
if len(args)!=1: raise SystemExit("usage: blender --background FILE.blend --python dump-native-inventory.py -- OUTPUT.json")
out=Path(args[0]);round_to=7

def clean(v):
    if hasattr(v,"to_list"):
        try: v=v.to_list()
        except Exception: pass
    if isinstance(v,(str,int,float,bool)) or v is None:
        return round(float(v),round_to) if isinstance(v,float) else v
    try: return [clean(x) for x in v]
    except Exception: return str(v)

def mesh_payload(mesh):
    return {
      "vertices":[clean(v.co) for v in mesh.vertices],
      "edges":[list(e.vertices) for e in mesh.edges],
      "loops":[[l.vertex_index,l.edge_index] for l in mesh.loops],
      "polygons":[{"vertices":list(p.vertices),"loopStart":p.loop_start,"loopTotal":p.loop_total,"materialIndex":p.material_index} for p in mesh.polygons],
      "uvLayers":[{"name":u.name,"values":[clean(d.uv) for d in u.data]} for u in mesh.uv_layers],
      "attributes":[{"name":a.name,"domain":a.domain,"dataType":a.data_type,"values":[{k:clean(getattr(d,k)) for k in ("value","vector","color","byte_color","quaternion","uv","normal") if hasattr(d,k)} for d in a.data]} for a in mesh.attributes if a.name not in ("position",".edge_verts")]
    }

def action_row(a):
    curves=[]
    for fc in getattr(a,"fcurves",[]):
        curves.append({"dataPath":fc.data_path,"arrayIndex":fc.array_index,"group":fc.group.name if fc.group else None,"keys":[{"co":clean(k.co),"interpolation":k.interpolation,"handleLeft":clean(k.handle_left),"handleRight":clean(k.handle_right)} for k in fc.keyframe_points],"modifiers":[m.type for m in fc.modifiers]})
    return {"name":a.name,"frameRange":clean(a.frame_range),"fcurves":curves,"layers":[getattr(x,"name","") for x in getattr(a,"layers",[])]}

geometry={};objects=[];lights=[]
for o in sorted(bpy.data.objects,key=lambda x:x.name):
    mats=[s.material.name if s.material else None for s in getattr(o,"material_slots",[])]
    row={"name":o.name,"type":o.type,"dataName":o.data.name if o.data else None,"parent":o.parent.name if o.parent else None,"children":sorted(x.name for x in o.children),"materials":mats,"location":clean(o.location),"rotationEuler":clean(o.rotation_euler),"rotationQuaternion":clean(o.rotation_quaternion),"scale":clean(o.scale),"matrixBasis":clean(o.matrix_basis),"matrixWorld":clean(o.matrix_world),"animationAction":o.animation_data.action.name if o.animation_data and o.animation_data.action else None,"nlaTracks":[t.name for t in o.animation_data.nla_tracks] if o.animation_data else [],"drivers":[{"path":d.data_path,"index":d.array_index,"expression":d.driver.expression} for d in getattr(o,"animation_data",None).drivers] if o.animation_data else [],"customProperties":{k:clean(o[k]) for k in o.keys() if k!="_RNA_UI"}}
    objects.append(row)
    if o.type=="MESH":
        payload=mesh_payload(o.data); encoded=json.dumps(payload,sort_keys=True,separators=(",",":"),ensure_ascii=False).encode()
        geometry[o.name]={"meshData":o.data.name,"vertices":len(o.data.vertices),"edges":len(o.data.edges),"loops":len(o.data.loops),"polygons":len(o.data.polygons),"uvLayers":[u.name for u in o.data.uv_layers],"sha256":hashlib.sha256(encoded).hexdigest()}
    elif o.type=="LIGHT":
        d=o.data; lights.append({"object":o.name,"dataName":d.name,"type":d.type,"color":clean(d.color),"energy":clean(d.energy),"cutoffDistance":clean(d.cutoff_distance),"spotSize":clean(getattr(d,"spot_size",None)),"spotBlend":clean(getattr(d,"spot_blend",None)),"shape":getattr(d,"shape",None),"shadow":clean(getattr(d,"use_shadow",None)),"location":clean(o.location),"rotation":clean(o.rotation_euler),"scale":clean(o.scale)})
materials=[]
for m in sorted(bpy.data.materials,key=lambda x:x.name):
    nodes=[];links=[]
    if m.use_nodes and m.node_tree:
        for n in sorted(m.node_tree.nodes,key=lambda x:x.name):
            inputs={}
            for sock in n.inputs:
                try: default=clean(sock.default_value)
                except Exception: default=None
                inputs[sock.name]={"default":default,"linked":bool(sock.is_linked)}
            nodes.append({"name":n.name,"type":n.type,"label":n.label,"inputs":inputs,"image":n.image.name if n.type=="TEX_IMAGE" and n.image else None})
        links=sorted([{"fromNode":l.from_node.name,"fromSocket":l.from_socket.name,"toNode":l.to_node.name,"toSocket":l.to_socket.name} for l in m.node_tree.links],key=lambda x:(x["fromNode"],x["fromSocket"],x["toNode"],x["toSocket"]))
    materials.append({"name":m.name,"diffuseColor":clean(m.diffuse_color),"useNodes":m.use_nodes,"surfaceRenderMethod":getattr(m,"surface_render_method",None),"blendMethod":getattr(m,"blend_method",None),"nodes":nodes,"links":links})
actions=[action_row(a) for a in sorted(bpy.data.actions,key=lambda x:x.name)]
scenes=[{"name":s.name,"camera":s.camera.name if s.camera else None,"world":s.world.name if s.world else None,"renderEngine":s.render.engine,"resolution":[s.render.resolution_x,s.render.resolution_y,s.render.resolution_percentage]} for s in bpy.data.scenes]
receipt={"blenderVersion":bpy.app.version_string,"objects":objects,"meshGeometry":geometry,"lights":lights,"materials":materials,"actions":actions,"scenes":scenes,"counts":{"objects":len(objects),"meshes":sum(1 for o in objects if o["type"]=="MESH"),"materials":len(materials),"lights":len(lights),"actions":len(actions)}}
out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(receipt,indent=2)+"\n",encoding="utf-8")
print(json.dumps(receipt["counts"]))
