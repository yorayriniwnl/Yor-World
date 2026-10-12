"""Apply only the FINISH-47 pegboard transforms and perforation/controller geometry to exact R6 GLB bytes."""
from __future__ import annotations
import copy, hashlib, json, math, pathlib, struct
OUT=pathlib.Path(__file__).resolve().parents[1]
R6=OUT/'inputs'/'r6'/'FINISH-B1-R6'
BASE=R6/'assets'/'room.glb'
OUTPUT=OUT/'assets'/'room.glb'
GEOMETRY=OUT/'evidence'/'geometry-correction.json'
TRANSFORMS=OUT/'evidence'/'pegboard-transforms.json'
REPORT=OUT/'evidence'/'glb-merge.json'
SX,SY,SZ=1.0,0.42,0.85
OLD=(2.05,0.85,1.55)

def sha(b): return hashlib.sha256(b).hexdigest()
def read_glb(path):
    raw=path.read_bytes()
    if raw[:4]!=b'glTF' or struct.unpack_from('<I',raw,4)[0]!=2 or struct.unpack_from('<I',raw,8)[0]!=len(raw): raise RuntimeError(f'Invalid GLB: {path}')
    jl,jt=struct.unpack_from('<II',raw,12)
    if jt!=0x4E4F534A: raise RuntimeError('GLB first chunk is not JSON')
    doc=json.loads(raw[20:20+jl]); offset=20+jl
    bl,bt=struct.unpack_from('<II',raw,offset)
    if bt!=0x004E4942 or offset+8+bl>len(raw): raise RuntimeError('Missing/invalid BIN chunk')
    return raw,doc,raw[offset+8:offset+8+bl]
def write_glb(doc,binary):
    while len(binary)%4: binary+=b'\0'
    doc['buffers'][0]['byteLength']=len(binary)
    payload=json.dumps(doc,separators=(',',':'),ensure_ascii=False).encode('utf-8'); payload+=b' '*((-len(payload))%4)
    total=12+8+len(payload)+8+len(binary)
    return struct.pack('<III',0x46546C67,2,total)+struct.pack('<II',len(payload),0x4E4F534A)+payload+struct.pack('<II',len(binary),0x004E4942)+binary
COMP={5120:('b',1),5121:('B',1),5122:('h',2),5123:('H',2),5125:('I',4),5126:('f',4)}
WIDTH={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT2':4,'MAT3':9,'MAT4':16}
def decode(doc,binary,index):
    a=doc['accessors'][index]; v=doc['bufferViews'][a['bufferView']]; fmt,size=COMP[a['componentType']]; width=WIDTH[a['type']]
    stride=v.get('byteStride',size*width); off=v.get('byteOffset',0)+a.get('byteOffset',0); out=[]
    for i in range(a['count']):
        row=struct.unpack_from('<'+fmt*width,binary,off+i*stride); out.append(list(row) if width>1 else row[0])
    return out
def append_accessor(doc,binary,values,typ,component,target):
    fmt,size=COMP[component]; width=WIDTH[typ]; binary+=b'\0'*((-len(binary))%4); start=len(binary)
    for item in values:
        row=item if width>1 else [item]
        if len(row)!=width: raise RuntimeError('Accessor width mismatch')
        binary+=struct.pack('<'+fmt*width,*row)
    vi=len(doc.setdefault('bufferViews',[])); doc['bufferViews'].append({'buffer':0,'byteOffset':start,'byteLength':len(binary)-start,'target':target})
    acc={'bufferView':vi,'componentType':component,'count':len(values),'type':typ}
    if typ=='VEC3' and component==5126 and values:
        acc['min']=[min(float(v[k]) for v in values) for k in range(3)]; acc['max']=[max(float(v[k]) for v in values) for k in range(3)]
    ai=len(doc.setdefault('accessors',[])); doc['accessors'].append(acc); return binary,ai
def unit(v):
    d=math.sqrt(sum(x*x for x in v)); return [x/d for x in v] if d>1e-20 else [0.0,1.0,0.0]
def triangulate(row):
    pos=[[float(v[0]),float(v[2]),-float(v[1])] for v in row['vertices']]
    accum=[[0.0,0.0,0.0] for _ in pos]; triangles=[]
    for face in row['faces']:
        if len(face)<3: raise RuntimeError('Degenerate source face')
        for k in range(1,len(face)-1):
            tri=[face[0],face[k],face[k+1]]; triangles.append(tri)
            a,b,c=(pos[q] for q in tri); ab=[b[i]-a[i] for i in range(3)]; ac=[c[i]-a[i] for i in range(3)]
            n=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]]
            for q in tri:
                for axis in range(3): accum[q][axis]+=n[axis]
    return pos,[unit(n) for n in accum],[i for tri in triangles for i in tri]
def groups(positions,indices):
    parent=list(range(len(positions)))
    def find(a):
        while parent[a]!=a: parent[a]=parent[parent[a]]; a=parent[a]
        return a
    for k in range(0,len(indices),3):
        a,b,c=(int(x) for x in indices[k:k+3]); ra,rb,rc=find(a),find(b),find(c); parent[rb]=ra; parent[rc]=ra
    result={}
    for i in range(len(positions)): result.setdefault(find(i),[]).append(i)
    return list(result.values())
def blender_center(positions,ids):
    n=len(ids); return (sum(positions[i][0] for i in ids)/n, -sum(positions[i][2] for i in ids)/n, sum(positions[i][1] for i in ids)/n)
def move_position(p,new_center):
    bx,by,bz=(p[0],-p[2],p[1]); ox,oy,oz=OLD
    qx=bx-ox; qy=(by-oy)*SY; qz=(bz-oz)*SZ
    nx=new_center[0]-qy; ny=new_center[1]+qx; nz=new_center[2]+qz
    return [nx,nz,-ny]
def move_normal(n):
    # Blender normal -> scale inverse -> Rz(+90) -> glTF Y-up.
    nx,ny,nz=n[0],-n[2],n[1]
    bx=-ny/SY; by=nx/SX; bz=nz/SZ
    return unit([bx,bz,-by])

raw,doc,binary=read_glb(BASE); baseline=copy.deepcopy(doc); original_bin=binary
geo=json.loads(GEOMETRY.read_text(encoding='utf-8'))
if geo['baseCommit']!='e8ea9187c1b6cd47b66ce7de9ad520daf9bd6baf' or sha(BASE.read_bytes())!=geo.get('inputRoomGlbSHA256',sha(BASE.read_bytes())): raise RuntimeError('R6 room input binding mismatch')
transforms=json.loads(TRANSFORMS.read_text(encoding='utf-8'))['nodes']
node_by_name={n.get('name'):n for n in doc['nodes'] if n.get('name')}
if 'pegboard_system' not in node_by_name or 'pegboard_panel' not in node_by_name: raise RuntimeError('Pinned pegboard nodes missing')
for key,values in transforms['pegboard_system'].items(): node_by_name['pegboard_system'][key]=values
# The child keeps its exact R6 local position/rotation; only local panel width is reduced.
node_by_name['pegboard_panel']['scale']=transforms['pegboard_panel']['scale']

expected={
 'StaticBatch__Room_Root__Desk_IvoryTop':[(1.985,.588,1.682),(1.985,.680,1.720),(1.985,.772,1.682),(1.985,.908,1.432),(1.985,1.000,1.470),(1.985,1.092,1.432)],
 'StaticBatch__Room_Root__Monitor_BezelMatte':[(1.948,.625,1.725),(1.945,.625,1.725),(1.948,.735,1.725),(1.945,.735,1.725),(1.948,.945,1.475),(1.945,.945,1.475),(1.948,1.055,1.475),(1.945,1.055,1.475)],
 'StaticBatch__Room_Root__Neon_PinkAccent':[(1.946,.625,1.744),(1.946,.735,1.718),(1.946,.735,1.744),(1.946,.735,1.770),(1.946,.945,1.494),(1.946,1.055,1.468),(1.946,1.055,1.494),(1.946,1.055,1.520)]}
mesh_results=[]; moved_counts={}
for node_name,targets in expected.items():
    node=node_by_name[node_name]; mesh=doc['meshes'][node['mesh']]; prim=mesh['primitives'][0]
    pos_i=prim['attributes']['POSITION']; norm_i=prim['attributes']['NORMAL']; ind_i=prim['indices']
    positions=decode(doc,binary,pos_i); normals=decode(doc,binary,norm_i); indices=decode(doc,binary,ind_i)
    if len(positions)!=len(normals): raise RuntimeError(f'Position/normal count mismatch: {node_name}')
    pending=list(targets); moved=[]
    for ids in groups(positions,indices):
        c=blender_center(positions,ids); hit=next((t for t in pending if sum((c[j]-t[j])**2 for j in range(3))<0.002**2),None)
        if hit is None: continue
        pending.remove(hit)
        before=list(c)
        component_index=targets.index(hit)
        first_controller_count=3 if node_name=='StaticBatch__Room_Root__Desk_IvoryTop' else 4
        offset=geo['controllerOffsetsBlender']['controllerA'][0] if component_index<first_controller_count else geo['controllerOffsetsBlender']['controllerB'][0]
        for i in ids:
            positions[i]=move_position(positions[i],(1.75,1.78,1.97)); positions[i][0]+=offset; normals[i]=move_normal(normals[i])
        moved.append({'sourceCenterBlender':before,'layoutOffsetBlender':[offset,0.0,0.0],'vertices':len(ids)})
    if pending or len(moved)!=len(targets): raise RuntimeError(f'R6 controller component binding failed for {node_name}: missing={pending}')
    binary,new_pos=append_accessor(doc,binary,positions,'VEC3',5126,34962)
    binary,new_norm=append_accessor(doc,binary,normals,'VEC3',5126,34962)
    prim['attributes']['POSITION']=new_pos; prim['attributes']['NORMAL']=new_norm
    added_triangles=0
    if node_name=='StaticBatch__Room_Root__Monitor_BezelMatte':
        row=geo['geometryBatches'][0]
        add_pos,add_norm,add_idx=triangulate(row); old_count=len(positions)
        full_pos=positions+add_pos; full_norm=normals+add_norm
        # Existing UVs are retained and zero-filled for the dot cylinders.
        uv_i=prim['attributes'].get('TEXCOORD_0')
        if uv_i is not None:
            uv=decode(doc,binary,uv_i)
            if len(uv)!=old_count: raise RuntimeError('Unexpected UV count')
            binary,new_uv=append_accessor(doc,binary,uv+[[0.0,0.0] for _ in add_pos],'VEC2',5126,34962); prim['attributes']['TEXCOORD_0']=new_uv
        # Replace position and normal accessors with full arrays including holes.
        binary,new_pos=append_accessor(doc,binary,full_pos,'VEC3',5126,34962)
        binary,new_norm=append_accessor(doc,binary,full_norm,'VEC3',5126,34962)
        prim['attributes']['POSITION']=new_pos; prim['attributes']['NORMAL']=new_norm
        new_indices=[int(v) for v in indices]+[old_count+int(v) for v in add_idx]
        binary,new_ind=append_accessor(doc,binary,new_indices,'SCALAR',5125,34963); prim['indices']=new_ind
        added_triangles=len(add_idx)//3
    mesh_results.append({'node':node_name,'meshIndex':node['mesh'],'movedComponents':moved,'addedTriangles':added_triangles})
    moved_counts[node_name]=len(moved)

if not binary.startswith(original_bin): raise RuntimeError('R6 BIN prefix was not preserved')
# Structural scope: exact node/material lists and only the three approved batches change.
if [n.get('name') for n in doc['nodes']] != [n.get('name') for n in baseline['nodes']]: raise RuntimeError('Node inventory changed')
if doc['materials']!=baseline['materials']: raise RuntimeError('Material inventory changed')
allowed={node_by_name[n]['mesh'] for n in expected}
actual={i for i,(a,b) in enumerate(zip(baseline['meshes'],doc['meshes'])) if a!=b}
if actual!=allowed: raise RuntimeError(f'Unexpected mesh changes: {actual} != {allowed}')
for i,(a,b) in enumerate(zip(baseline['nodes'],doc['nodes'])):
    if i not in (doc['nodes'].index(node_by_name['pegboard_system']),doc['nodes'].index(node_by_name['pegboard_panel'])) and a!=b: raise RuntimeError(f'Unexpected node transform change: {a.get("name")}')
raw_out=write_glb(doc,binary); OUTPUT.parent.mkdir(parents=True,exist_ok=True); OUTPUT.write_bytes(raw_out)
receipt={'status':'PASS','baseCommit':'e8ea9187c1b6cd47b66ce7de9ad520daf9bd6baf','inputBytes':len(raw),'inputSHA256':sha(raw),'outputBytes':len(raw_out),'outputSHA256':sha(raw_out),'originalR6BINPrefixExact':True,'changedNodes':['pegboard_system','pegboard_panel'],'changedMeshes':mesh_results,'newNodes':0,'newMaterials':0,'newRuntimeAssets':0,'newDrawCalls':0,'addedPerforationTriangles':sum(x['addedTriangles'] for x in mesh_results)}
REPORT.write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'status':'PASS','roomBytes':len(raw_out),'sha256':sha(raw_out),'changedNodes':receipt['changedNodes'],'movedComponents':moved_counts,'addedPerforationTriangles':receipt['addedPerforationTriangles'],'R6BINPrefixExact':True},indent=2))