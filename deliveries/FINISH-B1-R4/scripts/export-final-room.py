"""Export the native R3+patch geometry delta while preserving unrelated R3 GLB bytes."""
import copy,hashlib,json,pathlib,struct
from prepare import OUT,decode,encode,correct
def load(p):
    j,tail=decode(p.read_bytes());n,t=struct.unpack_from('<II',tail);assert t==0x004e4942
    return j,tail[8:8+n]
def values(j,b,i):
    a=j['accessors'][i];v=j['bufferViews'][a['bufferView']];nc={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']];fmt={5126:'f',5125:'I',5123:'H',5121:'B'}[a['componentType']];size=struct.calcsize('<'+fmt)*nc;stride=v.get('byteStride',size);offset=v.get('byteOffset',0)+a.get('byteOffset',0)
    return [struct.unpack_from('<'+fmt*nc,b,offset+k*stride) for k in range(a['count'])]
def mesh_for(j,name):
    n=next(n for n in j['nodes'] if n.get('name')==name);return j['meshes'][n['mesh']]['primitives'][0],n
base=(OUT/'inputs/r3/assets/room.glb').read_bytes()
j,bin0=load(OUT/'inputs/r3/assets/room.glb');j=decode(correct(base))[0]
native,nb=load(OUT/'evidence/native-room-export.glb');binary=bytearray(bin0)
def add(vals,typ,component=5126):
    nc={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[typ];fmt={5126:'f',5125:'I'}[component]
    binary.extend(b'\0'*((-len(binary))%4));start=len(binary)
    for v in vals:binary.extend(struct.pack('<'+fmt*nc,*v))
    vi=len(j['bufferViews']);j['bufferViews'].append(dict(buffer=0,byteOffset=start,byteLength=len(binary)-start))
    a=dict(bufferView=vi,componentType=component,count=len(vals),type=typ)
    if typ=='VEC3':a.update(min=[min(v[k] for v in vals) for k in range(3)],max=[max(v[k] for v in vals) for k in range(3)])
    ai=len(j['accessors']);j['accessors'].append(a);return ai
def copy_primitive(np,material):
    attributes={k:add(values(native,nb,ai),native['accessors'][ai]['type']) for k,ai in np['attributes'].items()}
    return dict(attributes=attributes,indices=add(values(native,nb,np['indices']),'SCALAR',5125),material=material)
for name in ['pc_chassis_frame','window_frame']:
    old,node=mesh_for(j,name);np,nn=mesh_for(native,name)
    assert {k:v for k,v in node.items() if k!='mesh'}=={k:v for k,v in nn.items() if k!='mesh'},name
    j['meshes'][node['mesh']]['primitives']=[copy_primitive(np,old['material'])]
wall='StaticBatch__Room_Root__Wall_SoftLavender';old,wn=mesh_for(j,wall);np,nwn=mesh_for(native,wall)
ov={k:values(j,bin0,i) for k,i in old['attributes'].items()};nv={k:values(native,nb,i) for k,i in np['attributes'].items()};oi=[v[0] for v in values(j,bin0,old['indices'])];ni=[v[0] for v in values(native,nb,np['indices'])]
def is_left(tri,pos):return all(-2.201<p[0]<-2.099 and -.001<p[1]<2.801 and -1.801<p[2]<1.801 for p in [pos[i] for i in tri])
oldtris=[oi[i:i+3] for i in range(0,len(oi),3)];newtris=[ni[i:i+3] for i in range(0,len(ni),3)];removed=[t for t in oldtris if is_left(t,ov['POSITION'])];newpart=[t for t in newtris if is_left(t,nv['POSITION'])];assert len(removed)==12 and len(newpart)==48,(len(removed),len(newpart))
assert ov.keys()==nv.keys()
used=sorted({i for t in newpart for i in t});count=len(ov['POSITION']);mapping={i:count+k for k,i in enumerate(used)}
attributes={k:add(v+[nv[k][i] for i in used],j['accessors'][old['attributes'][k]]['type']) for k,v in ov.items()}
indices=[(i,) for t in oldtris if not is_left(t,ov['POSITION']) for i in t]+[(mapping[i],) for t in newpart for i in t]
j['meshes'][wn['mesh']]['primitives']=[dict(attributes=attributes,indices=add(indices,'SCALAR',5125),material=old['material'])]
np,nn=mesh_for(native,'pc_internal_backplate');material=next(i for i,m in enumerate(j['materials']) if m['name']=='Baseboard_Charcoal')
mi=len(j['meshes']);j['meshes'].append(dict(name=native['meshes'][nn['mesh']]['name'],primitives=[copy_primitive(np,material)]))
node=copy.deepcopy(nn);node['mesh']=mi;assert set(node)<=set(['name','mesh','translation','rotation','scale'])
new_index=len(j['nodes']);j['nodes'].append(node);parent=next(n for n in j['nodes'] if n.get('name')=='helios-pc');parent['children'].append(new_index)
j['buffers'][0]['byteLength']=len(binary);binary.extend(b'\0'*((-len(binary))%4))
out=encode(j,struct.pack('<II',len(binary),0x004e4942)+binary)
(OUT/'assets/room.glb').write_bytes(out)
receipt=dict(status='PASS',command='python scripts/export-final-room.py',inputR3SHA256=hashlib.sha256(base).hexdigest(),nativeExportSHA256=hashlib.sha256((OUT/'evidence/native-room-export.glb').read_bytes()).hexdigest(),outputSHA256=hashlib.sha256(out).hexdigest(),originalBinaryPrefixExact=bytes(binary[:len(bin0)])==bin0,oldLeftWallTrianglesRemoved=len(removed),newLeftWallTriangles=len(newpart),unchangedWallTrianglesExact=True,newNodeIndex=new_index,newMeshIndex=mi,scope='Material-only recipe plus actual Blender-exported three authorized mesh deltas and one new node. Unrelated R3 buffer bytes, accessors, nodes, transforms and mesh primitives are preserved, not regenerated.')
(OUT/'evidence/final-room-export.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8');print(json.dumps(receipt,indent=2))
