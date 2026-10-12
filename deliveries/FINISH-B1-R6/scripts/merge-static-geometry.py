"""Merge Blender-authored static geometry into the pinned R5 GLBs.

The binary GLB merger avoids re-exporting unrelated R5 data. It changes only
POSITION/NORMAL/UV/index accessors for existing static-batch primitives;
node trees, materials, hooks, camera profiles, and the original BIN prefix stay
byte-for-byte intact. Blender source/export parity is checked separately.
"""
from __future__ import annotations
import copy, hashlib, json, math, pathlib, struct

OUT=pathlib.Path(__file__).resolve().parents[1]
R5=OUT/'inputs'/'r5'/'FINISH-B1-R5'
GEOMETRY=OUT/'evidence'/'geometry-additions.json'
REPORT=OUT/'evidence'/'static-geometry-merge.json'

def sha(b): return hashlib.sha256(b).hexdigest()
def read_glb(path):
    raw=path.read_bytes()
    if raw[:4]!=b'glTF' or struct.unpack_from('<I',raw,4)[0]!=2 or struct.unpack_from('<I',raw,8)[0]!=len(raw):
        raise RuntimeError(f'Invalid GLB 2 container: {path}')
    json_len,json_type=struct.unpack_from('<II',raw,12)
    if json_type!=0x4E4F534A: raise RuntimeError('GLB first chunk is not JSON')
    doc=json.loads(raw[20:20+json_len])
    offset=20+json_len
    bin_len,bin_type=struct.unpack_from('<II',raw,offset)
    if bin_type!=0x004E4942: raise RuntimeError('GLB second chunk is not BIN')
    binary=raw[offset+8:offset+8+bin_len]
    if doc['buffers'][0]['byteLength']>len(binary): raise RuntimeError('GLB buffer exceeds BIN chunk')
    return raw,doc,binary

def write_glb(doc,binary):
    while len(binary)%4: binary+=b'\0'
    doc['buffers'][0]['byteLength']=len(binary)
    payload=json.dumps(doc,separators=(',',':'),ensure_ascii=False).encode('utf-8')
    payload+=b' '*((-len(payload))%4)
    total=12+8+len(payload)+8+len(binary)
    return struct.pack('<III',0x46546C67,2,total)+struct.pack('<II',len(payload),0x4E4F534A)+payload+struct.pack('<II',len(binary),0x004E4942)+binary

COMP={5120:('b',1),5121:('B',1),5122:('h',2),5123:('H',2),5125:('I',4),5126:('f',4)}
WIDTH={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT2':4,'MAT3':9,'MAT4':16}
def decode_accessor(doc,binary,index):
    a=doc['accessors'][index]; v=doc['bufferViews'][a['bufferView']]
    fmt,size=COMP[a['componentType']]; width=WIDTH[a['type']]; packed=size*width
    stride=v.get('byteStride',packed); offset=v.get('byteOffset',0)+a.get('byteOffset',0)
    result=[]
    for i in range(a['count']):
        vals=struct.unpack_from('<'+fmt*width,binary,offset+i*stride)
        result.append(list(vals) if width>1 else vals[0])
    return result

def unit(v):
    d=math.sqrt(sum(x*x for x in v))
    return [x/d for x in v] if d>1e-20 else [0.0,1.0,0.0]
def added_geometry(row):
    # Blender X/Y/Z -> runtime/glTF X/Y/Z (Y-up) by the one accepted axis conversion.
    pos=[[float(v[0]),float(v[2]),-float(v[1])] for v in row['vertices']]
    accum=[[0.0,0.0,0.0] for _ in pos]; triangles=[]
    for face in row['faces']:
        if len(face)<3: raise RuntimeError('Degenerate source face')
        for k in range(1,len(face)-1):
            tri=[face[0],face[k],face[k+1]]; triangles.append(tri)
            a,b,c=(pos[q] for q in tri)
            ab=[b[i]-a[i] for i in range(3)]; ac=[c[i]-a[i] for i in range(3)]
            n=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]]
            for q in tri:
                for axis in range(3): accum[q][axis]+=n[axis]
    normals=[unit(n) for n in accum]
    if any(len(face)<3 for face in row['faces']): raise RuntimeError('Bad face')
    indices=[i for tri in triangles for i in tri]
    return pos,normals,indices

def append_view(doc,binary,values,typ,component,target):
    fmt,size=COMP[component]; width=WIDTH[typ]
    binary+=b'\0'*((-len(binary))%4); start=len(binary)
    for item in values:
        row=item if width>1 else [item]
        if len(row)!=width: raise RuntimeError('Attribute width mismatch')
        binary+=struct.pack('<'+fmt*width,*row)
    view={'buffer':0,'byteOffset':start,'byteLength':len(binary)-start,'target':target}
    vi=len(doc.setdefault('bufferViews',[])); doc['bufferViews'].append(view)
    acc={'bufferView':vi,'componentType':component,'count':len(values),'type':typ}
    if typ=='VEC3' and component==5126 and values:
        acc['min']=[min(float(v[k]) for v in values) for k in range(3)]
        acc['max']=[max(float(v[k]) for v in values) for k in range(3)]
    ai=len(doc.setdefault('accessors',[])); doc['accessors'].append(acc)
    return binary,ai

def merge_asset(asset,rows):
    source=R5/'assets'/asset; out=OUT/'assets'/asset
    original,doc,binary=read_glb(source)
    baseline=copy.deepcopy(doc); input_bin=binary
    nodes={n.get('name'):n for n in doc.get('nodes',[]) if n.get('name')}
    materials={m.get('name'):i for i,m in enumerate(doc.get('materials',[]))}
    changed=[]
    for row in rows:
        if row['asset']!=asset: continue
        name=row['mesh']
        if name not in nodes: raise RuntimeError(f'Missing R5 node {name}')
        node=nodes[name]; mesh=doc['meshes'][node['mesh']]
        if mesh.get('name')!=name: raise RuntimeError(f'Mesh name mismatch: {name}/{mesh.get("name")}')
        if len(mesh.get('primitives',[]))!=1: raise RuntimeError(f'Expected one draw primitive in {name}')
        prim=mesh['primitives'][0]
        if doc['materials'][prim['material']]['name']!=row['material']: raise RuntimeError(f'Material mismatch for {name}')
        if row['material'] not in materials: raise RuntimeError(f'Missing existing material {row["material"]}')
        if prim['material']!=materials[row['material']]: raise RuntimeError('Primitive material index changed')
        added_pos,added_norm,added_indices=added_geometry(row)
        old_position_index=prim['attributes']['POSITION']; old_positions=decode_accessor(doc,binary,old_position_index)
        old_count=len(old_positions)
        if old_count+len(added_pos)>65535 and prim['indices'] is None: raise RuntimeError('Unexpected unindexed primitive')
        combined={}
        for semantic,index in prim['attributes'].items():
            old_values=decode_accessor(doc,binary,index)
            if len(old_values)!=old_count: raise RuntimeError(f'Attribute count mismatch {name}/{semantic}')
            if semantic=='POSITION': extension=added_pos
            elif semantic=='NORMAL': extension=added_norm
            elif semantic=='TEXCOORD_0': extension=[[0.0,0.0] for _ in added_pos]
            elif semantic=='COLOR_0': extension=[[1.0,1.0,1.0,1.0] for _ in added_pos]
            else: raise RuntimeError(f'Unplanned vertex attribute {name}/{semantic}')
            if len(extension)!=len(added_pos): raise RuntimeError('New attribute count mismatch')
            acc=doc['accessors'][index]
            component=acc['componentType']; typ=acc['type']
            vals=old_values+extension
            binary,new_index=append_view(doc,binary,vals,typ,component,34962)
            combined[semantic]=new_index
        old_indices=decode_accessor(doc,binary,prim['indices'])
        old_indices=[int(x if not isinstance(x,list) else x[0]) for x in old_indices]
        added_indices=[old_count+i for i in added_indices]
        binary,new_indices=append_view(doc,binary,old_indices+added_indices,'SCALAR',5125,34963)
        prim['attributes']=combined; prim['indices']=new_indices
        changed.append({'node':name,'meshIndex':node['mesh'],'material':row['material'],
            'baseVertexCount':old_count,'addedVertexCount':len(added_pos),'addedFaceCount':row['faceCount'],
            'addedTriangleCount':len(added_indices)//3,'finalVertexCount':old_count+len(added_pos),
            'finalIndexCount':len(old_indices)+len(added_indices),'baseIndicesRetained':len(old_indices),
            'newTriangleIndices':len(added_indices),'sourceGeometryCoordinateSpace':row['coordinateSpace']})
    if not changed: raise RuntimeError(f'No geometry updates for {asset}')
    # All pre-existing nodes, meshes, materials, animation, light, and accessors remain unchanged;
    # only target primitive accessor pointers plus new accessors/bufferViews are appended.
    if doc['nodes']!=baseline['nodes']: raise RuntimeError('Node/hook/camera/anchor inventory changed')
    if doc['materials']!=baseline['materials']: raise RuntimeError('Material inventory or values changed')
    if doc.get('animations',[])!=baseline.get('animations',[]): raise RuntimeError('Animations changed')
    if doc.get('extensions',{})!=baseline.get('extensions',{}): raise RuntimeError('Extensions/lights changed')
    if not binary.startswith(input_bin): raise RuntimeError('Original R5 BIN payload not preserved')
    raw=write_glb(doc,binary); out.write_bytes(raw)
    # Compare nodes, object names, asset IDs, lights and all untargeted mesh definitions.
    target_indices={c['meshIndex'] for c in changed}
    for i,(before,after) in enumerate(zip(baseline['meshes'],doc['meshes'])):
        if i not in target_indices and before!=after: raise RuntimeError(f'Untargeted mesh changed at index {i}')
    return {'asset':asset,'inputSHA256':sha(original),'inputBytes':len(original),'outputSHA256':sha(raw),'outputBytes':len(raw),
        'originalBinaryPrefixExact':binary[:len(input_bin)]==input_bin,'nodeInventoryExact':True,'materialInventoryExact':True,
        'animationInventoryExact':True,'extensionsLightsExact':True,'changedMeshes':changed}

root=json.loads(GEOMETRY.read_text(encoding='utf-8'))
rows=root['geometryBatches']
results=[merge_asset(name,rows) for name in ('room.glb','fixture.glb')]
receipt={'schemaVersion':1,'status':'PASS','sourceCommit':'a5ebcc88170703751a5f504f67aed637d2f7d8e9',
    'command':'python scripts/merge-static-geometry.py','axisConversion':'Blender XYZ -> glTF XYZ [x,z,-y]; the geometry data came from source/build-static-details.py and is converted once.',
    'newRuntimeRequests':0,'newNodes':0,'newMeshNodes':0,'newMaterials':0,'newGLBPrimitives':0,
    'allUnchangedBinaryBytesPreservedAsPrefix':True,'assets':results}
REPORT.write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'status':'PASS','assets':[{'asset':r['asset'],'bytes':r['outputBytes'],'changedMeshes':len(r['changedMeshes']),'addedTriangles':sum(m['addedTriangleCount'] for m in r['changedMeshes'])} for r in results]},indent=2))