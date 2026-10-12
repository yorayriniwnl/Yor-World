"""Build FINISH-B1-R7 from the exact R6 editable source, moving only the pegboard group and baked controller detail."""
from __future__ import annotations
import bpy, bmesh, hashlib, json, math, pathlib, struct
from mathutils import Vector

OUT = pathlib.Path(__file__).resolve().parents[1]
R6 = OUT / "inputs" / "r6" / "FINISH-B1-R6"
IN_BLEND = R6 / "assets" / "source" / "room.blend"
OUT_BLEND = OUT / "assets" / "source" / "room.blend"
NATIVE = OUT / "evidence" / "native-room-export.glb"
GEOMETRY = OUT / "evidence" / "geometry-correction.json"
TRANSFORMS = OUT / "evidence" / "pegboard-transforms.json"

if tuple(bpy.app.version[:3]) != (5, 2, 2):
    raise RuntimeError(f"Expected Blender 5.2.2, got {bpy.app.version_string}")
for p in (OUT_BLEND.parent, NATIVE.parent): p.mkdir(parents=True, exist_ok=True)
input_blend_sha = hashlib.sha256(IN_BLEND.read_bytes()).hexdigest()
old_center = Vector((2.05, 0.85, 1.55))
new_center = Vector((1.75, 1.78, 1.97))
scale = Vector((1.0, 0.42, 0.85))
rotation = math.pi / 2

def mapped(v):
    q = Vector((v[0]-old_center.x, (v[1]-old_center.y)*scale.y, (v[2]-old_center.z)*scale.z))
    return Vector((new_center.x-q.y, new_center.y+q.x, new_center.z+q.z))

component_targets = {
    "StaticBatch__Room_Root__Desk_IvoryTop": [
        (1.985,0.588,1.682),(1.985,0.680,1.720),(1.985,0.772,1.682),
        (1.985,0.908,1.432),(1.985,1.000,1.470),(1.985,1.092,1.432)],
    "StaticBatch__Room_Root__Monitor_BezelMatte": [
        (1.948,0.625,1.725),(1.945,0.625,1.725),(1.948,0.735,1.725),(1.945,0.735,1.725),
        (1.948,0.945,1.475),(1.945,0.945,1.475),(1.948,1.055,1.475),(1.945,1.055,1.475)],
    "StaticBatch__Room_Root__Neon_PinkAccent": [
        (1.946,0.625,1.744),(1.946,0.735,1.718),(1.946,0.735,1.744),(1.946,0.735,1.770),
        (1.946,0.945,1.494),(1.946,1.055,1.468),(1.946,1.055,1.494),(1.946,1.055,1.520)]}

def components(mesh):
    parent=list(range(len(mesh.vertices)))
    def find(a):
        while parent[a] != a:
            parent[a]=parent[parent[a]]; a=parent[a]
        return a
    for e in mesh.edges:
        a,b=find(e.vertices[0]),find(e.vertices[1])
        if a!=b: parent[b]=a
    groups={}
    for v in mesh.vertices: groups.setdefault(find(v.index),[]).append(v.index)
    return list(groups.values())

def center_of(mesh, ids):
    c=Vector((0.0,0.0,0.0))
    for i in ids: c+=mesh.vertices[i].co
    return c/len(ids)

bpy.ops.wm.open_mainfile(filepath=str(IN_BLEND))
room_root=bpy.data.objects.get("Room_Root")
peg=bpy.data.objects.get("pegboard_system")
panel=bpy.data.objects.get("pegboard_panel")
if not room_root or not peg or not panel or peg.parent!=room_root or panel.parent!=peg:
    raise RuntimeError("Pinned R6 pegboard hierarchy changed")
peg.location = new_center - Vector((-(old_center.y*scale.y), old_center.x*scale.x, old_center.z*scale.z))
peg.rotation_euler = (0.0, 0.0, rotation)
peg.scale = scale
panel.scale = (1.0, 0.80, 1.0)

component_receipts=[]
for name, targets in component_targets.items():
    obj=bpy.data.objects.get(name)
    if not obj or obj.type!="MESH": raise RuntimeError(f"Missing R6 static batch: {name}")
    mesh=obj.data; pending=list(targets); matched=[]
    for ids in components(mesh):
        c=center_of(mesh,ids)
        hit=next((t for t in pending if (c-Vector(t)).length<0.002),None)
        if hit is None: continue
        pending.remove(hit)
        before=[float(x) for x in c]
        component_index=targets.index(hit)
        first_controller_count=3 if name=="StaticBatch__Room_Root__Desk_IvoryTop" else 4
        layout_offset=Vector((-0.08,0.0,0.0)) if component_index<first_controller_count else Vector((0.0,0.0,0.0))
        for i in ids: mesh.vertices[i].co=mapped(mesh.vertices[i].co)+layout_offset
        after=center_of(mesh,ids)
        matched.append({"sourceCenterBlender":before,"targetCenterBlender":[float(x) for x in after],"layoutOffsetBlender":[float(x) for x in layout_offset],"vertices":len(ids)})
    if pending: raise RuntimeError(f"Could not bind controller components in {name}: {pending}")
    if len(matched)!=len(targets): raise RuntimeError(f"Component count mismatch in {name}")
    mesh.update()
    component_receipts.append({"batch":name,"matchedComponents":len(matched),"components":matched})

board_width=0.85*scale.y*panel.scale.y
board_height=0.65*scale.z*panel.scale.z
cols,rows=6,8
margin_x,margin_z=0.025,0.035
hole_radius,hole_depth=0.0065,0.004
front_y=new_center.y-0.009
hole_centers=[]
for row in range(rows):
    z=new_center.z-board_height/2+margin_z+row*(board_height-2*margin_z)/(rows-1)
    for col in range(cols):
        x=new_center.x-board_width/2+margin_x+col*(board_width-2*margin_x)/(cols-1)
        hole_centers.append((x,front_y-0.001,z))
monitor=bpy.data.objects["StaticBatch__Room_Root__Monitor_BezelMatte"]
bm=bmesh.new(); bm.from_mesh(monitor.data)
added_faces=[]; hole_vertices=[]; hole_faces=[]
for cx,cy,cz in hole_centers:
    start=len(hole_vertices)
    for yy in (cy-hole_depth/2,cy+hole_depth/2):
        for i in range(8):
            a=2*math.pi*i/8
            hole_vertices.append([cx+hole_radius*math.cos(a),yy,cz+hole_radius*math.sin(a)])
    for i in range(8):
        j=(i+1)%8
        hole_faces.append([start+i,start+j,start+8+j,start+8+i])
    hole_faces.append([start+i for i in range(8)])
    hole_faces.append([start+8+i for i in range(8)])
    verts=[bm.verts.new(v) for v in hole_vertices[start:start+16]]
    for face in hole_faces[-10:]:
        f=bm.faces.new([verts[i-start] for i in face]); f.material_index=monitor.data.materials.find("Monitor_BezelMatte"); added_faces.append(f)
bmesh.ops.recalc_face_normals(bm,faces=added_faces)
bm.to_mesh(monitor.data); bm.free(); monitor.data.update()

bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(OUT_BLEND))
bpy.ops.wm.open_mainfile(filepath=str(OUT_BLEND))
def export_root(root_obj,target):
    bpy.ops.object.select_all(action="DESELECT")
    def select_tree(o):
        o.select_set(True)
        for c in o.children: select_tree(c)
    select_tree(root_obj); bpy.context.view_layer.objects.active=root_obj
    bpy.ops.export_scene.gltf(filepath=str(target),export_format="GLB",use_selection=True,export_yup=True,
        export_apply=False,export_materials="EXPORT",export_lights=True,export_cameras=False,
        export_animations=False,export_animation_mode="ACTIONS",export_image_format="AUTO")
    if not target.exists() or target.stat().st_size<1000: raise RuntimeError("No real Blender room export was produced")
export_root(bpy.data.objects["Room_Root"],NATIVE)

def read_glb_nodes(path):
    raw=path.read_bytes(); jl,jt=struct.unpack_from("<II",raw,12)
    if raw[:4]!=b"glTF" or struct.unpack_from("<I",raw,4)[0]!=2: raise RuntimeError("Invalid native GLB")
    return json.loads(raw[20:20+jl])["nodes"]
nodes=read_glb_nodes(NATIVE)
node_rows={n["name"]:{k:n[k] for k in ("translation","rotation","scale","matrix") if k in n}
           for n in nodes if n.get("name") in ("pegboard_system","pegboard_panel")}
if set(node_rows)!={"pegboard_system","pegboard_panel"}: raise RuntimeError("Native export lost a pegboard node")
TRANSFORMS.write_text(json.dumps({"status":"PASS","sourceBlendSHA256":hashlib.sha256(OUT_BLEND.read_bytes()).hexdigest(),"nodes":node_rows},indent=2)+"\n",encoding="utf-8")
geometry={"schemaVersion":1,"status":"PASS","baseCommit":"e8ea9187c1b6cd47b66ce7de9ad520daf9bd6baf",
 "blenderVersion":bpy.app.version_string,"inputRoomBlendSHA256":input_blend_sha,
 "edit":{"parent":"pegboard_system","sourceCenterBlender":list(old_center),"targetCenterBlender":list(new_center),"rotationEulerRadians":[0.0,0.0,rotation],"scaleBlender":list(scale),"panelLocalScale":[1.0,0.80,1.0],"faceNormalBlender":[0.0,-1.0,0.0],"runtimeAnchor":"right rear wall / beside PC and headset"},
 "movedControllerComponents":component_receipts,"controllerOffsetsBlender":{"controllerA":[-0.08,0.0,0.0],"controllerB":[0.0,0.0,0.0]},
 "perforations":{"columns":cols,"rows":rows,"holes":len(hole_centers),"radiusMeters":hole_radius,"sharedMaterial":"Monitor_BezelMatte","vertices":hole_vertices,"faces":hole_faces},
 "nativeRoomExport":{"path":"evidence/native-room-export.glb","bytes":NATIVE.stat().st_size,"sha256":hashlib.sha256(NATIVE.read_bytes()).hexdigest()},
 "geometryBatches":[{"asset":"room.glb","mesh":"StaticBatch__Room_Root__Monitor_BezelMatte","material":"Monitor_BezelMatte","coordinateSpace":"room-root-local / Blender X-right,Y-depth,Z-up","vertices":hole_vertices,"faces":hole_faces}]}
GEOMETRY.write_text(json.dumps(geometry,indent=2)+"\n",encoding="utf-8")
print(json.dumps({"status":"PASS","blender":bpy.app.version_string,"roomBlendBytes":OUT_BLEND.stat().st_size,"nativeExportBytes":NATIVE.stat().st_size,"movedComponentCounts":{x['batch']:x['matchedComponents'] for x in component_receipts},"holes":len(hole_centers),"addedFaces":len(hole_faces),"pegboardTransforms":node_rows},indent=2))