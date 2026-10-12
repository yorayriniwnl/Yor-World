import copy,hashlib,json,pathlib,struct,subprocess
from prepare import ROOT,OUT,COMMIT,decode,correct
def sha(b):return hashlib.sha256(b).hexdigest()
def read(p):return (OUT/p).read_bytes()
def write(p,j):(OUT/p).write_text(json.dumps(j,indent=2)+'\n',encoding='utf-8')
def glb(p):
    j,tail=decode(read(p));n,t=struct.unpack_from('<II',tail);assert t==0x004e4942;return j,tail[8:8+n]
def vals(j,b,i):
    a=j['accessors'][i];v=j['bufferViews'][a['bufferView']];nc={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']];fmt={5126:'f',5125:'I',5123:'H',5121:'B'}[a['componentType']];size=struct.calcsize('<'+fmt)*nc;stride=v.get('byteStride',size);offset=v.get('byteOffset',0)+a.get('byteOffset',0)
    return [struct.unpack_from('<'+fmt*nc,b,offset+k*stride) for k in range(a['count'])]
def mesh_for(j,name):
    n=next(n for n in j['nodes'] if n.get('name')==name);return j['meshes'][n['mesh']]['primitives'][0],n
def signatures(j,b,name,left_only=False):
    p,n=mesh_for(j,name);attrs={k:vals(j,b,v) for k,v in p['attributes'].items()};idx=[v[0] for v in vals(j,b,p['indices'])]
    # Per-triangle records include full vertex position/normal/UV values, rotation
    # invariant under index ordering while preserving triangle winding.
    out=[]
    for i in range(0,len(idx),3):
        if left_only and not all(-2.201<attrs['POSITION'][v][0]<-2.099 for v in idx[i:i+3]):continue
        tri=[tuple((k,tuple(attrs[k][v])) for k in sorted(attrs)) for v in idx[i:i+3]]
        out.append(min(tuple(tri[k:]+tri[:k]) for k in range(3)))
    return sorted(out)
old,ob=glb('inputs/r3/assets/room.glb');new,nb=glb('assets/room.glb');native,natb=glb('evidence/native-room-export.glb')
assert nb[:len(ob)]==ob
assert new['accessors'][:len(old['accessors'])]==old['accessors']
assert new['bufferViews'][:len(old['bufferViews'])]==old['bufferViews']
assert len(new['nodes'])==len(old['nodes'])+1
assert len(new['meshes'])==len(old['meshes'])+1
assert len(new['materials'])==len(old['materials'])
newnode=new['nodes'][-1];assert newnode['name']=='pc_internal_backplate'
for i,n in enumerate(old['nodes']):
    expected=copy.deepcopy(n)
    if n.get('name')=='helios-pc':expected['children'].append(len(old['nodes']))
    assert new['nodes'][i]==expected,(i,n.get('name'))
names=['pc_chassis_frame','window_frame','StaticBatch__Room_Root__Wall_SoftLavender']
allowed={next(n['mesh'] for n in old['nodes'] if n.get('name')==name) for name in names}
for i,m in enumerate(old['meshes']):
    if i not in allowed:assert new['meshes'][i]==m,('unauthorized mesh changed',i)
    else:
        assert new['meshes'][i]['name']==m['name']
        assert len(new['meshes'][i]['primitives'])==1
        assert new['meshes'][i]['primitives'][0]['material']==m['primitives'][0]['material']
matbase=decode(correct(read('inputs/r3/assets/room.glb')))[0]
assert new['materials']==matbase['materials']
for k,v in old.items():
    if k not in ['nodes','meshes','materials','accessors','bufferViews','buffers','extensionsUsed']:assert new[k]==v,k
assert new.get('extensionsUsed')==matbase.get('extensionsUsed')
counts=[]
for name in names+['pc_internal_backplate']:
    p,n=mesh_for(new,name);np,nn=mesh_for(native,name)
    if name!='StaticBatch__Room_Root__Wall_SoftLavender':assert signatures(new,nb,name)==signatures(native,natb,name),('native geometry parity',name)
    before=0 if name=='pc_internal_backplate' else old['accessors'][mesh_for(old,name)[0]['indices']]['count']//3
    after=new['accessors'][p['indices']]['count']//3
    counts.append(dict(name=name,beforeTriangles=before,afterTriangles=after,delta=after-before))
assert sum(r['delta'] for r in counts)==132
# Unmodified wall records are exact, not a tolerance/nearest-point claim.
wall=names[2];op,_=mesh_for(old,wall);np,_=mesh_for(new,wall);oldattrs={k:vals(old,ob,ai) for k,ai in op['attributes'].items()};newattrs={k:vals(new,nb,ai) for k,ai in np['attributes'].items()}
for k,vs in oldattrs.items():assert newattrs[k][:len(vs)]==vs
oi=[v[0] for v in vals(old,ob,op['indices'])];ni=[v[0] for v in vals(new,nb,np['indices'])]
def left(t,pos):return all(-2.201<p[0]<-2.099 and -.001<p[1]<2.801 and -1.801<p[2]<1.801 for p in [pos[i] for i in t])
kept=[i for k in range(0,len(oi),3) if not left(oi[k:k+3],oldattrs['POSITION']) for i in oi[k:k+3]]
assert ni[:len(kept)]==kept
assert signatures(new,nb,wall,True)==signatures(native,natb,wall,True),'native left-wall geometry/normal/UV parity'
def bounds(j,b,name):
    p,n=mesh_for(j,name);pos=vals(j,b,p['attributes']['POSITION']);idx={v[0] for v in vals(j,b,p['indices'])};t=n.get('translation',[0,0,0]);used=[tuple(pos[i][k]+t[k] for k in range(3)) for i in idx]
    return dict(min=[min(v[k] for v in used) for k in range(3)],max=[max(v[k] for v in used) for k in range(3)])
boundsRows=[]
for name in ['pc_chassis_frame','window_frame']:
    a=bounds(old,ob,name);b=bounds(new,nb,name);assert a==b,(name,a,b)
    boundsRows.append(dict(name=name,old=a,new=b,exact=True))
bp=bounds(new,nb,'pc_internal_backplate');ch=bounds(new,nb,'pc_chassis_frame')
assert all(ch['min'][k]<=bp['min'][k]<=bp['max'][k]<=ch['max'][k] for k in range(3))
assert all(bp['max'][k]-bp['min'][k]<=limit+1e-7 for k,limit in enumerate([.008,.38,.38]))
runtime=['room.glb','resident.glb','fixture.glb','group-b-props.glb','on-demand-projects.glb','textures/deskmat-topography.png','textures/monitor-wallpaper.png','source/room.blend'];lineage=[]
for p in runtime:
    raw=subprocess.check_output(['git','show',COMMIT+':deliveries/FINISH-B1-R3/assets/'+p],cwd=ROOT)
    assert raw==read('inputs/r3/assets/'+p)
    current=read('assets/'+p);same=raw==current;assert same==(p not in ['room.glb','source/room.blend'])
    lineage.append(dict(path='assets/'+p,baseCommit=COMMIT,baseSHA256=sha(raw),outputSHA256=sha(current),baseBytes=len(raw),outputBytes=len(current),byteIdentical=same))
actual=subprocess.check_output(['git','ls-tree','-r','--name-only',COMMIT,'deliveries/FINISH-B1-R3/assets'],cwd=ROOT).decode().splitlines()
assert sorted('deliveries/FINISH-B1-R3/'+r['path'] for r in lineage)==sorted(actual)
scratch=OUT/'.work/final-patch-replay';scratch.mkdir(parents=True,exist_ok=True);src='deliveries/FINISH-B1-R3/source/blender/scripts/build-environment.py';(scratch/src).parent.mkdir(parents=True,exist_ok=True);(scratch/src).write_bytes(read('inputs/r3/source/blender/scripts/build-environment.py'))
subprocess.run(['git','init','--quiet',str(scratch)],check=True);subprocess.run(['git','config','core.autocrlf','false'],cwd=scratch,check=True)
for args in [['git','apply','--check',str(OUT/'source.patch')],['git','apply',str(OUT/'source.patch')]]:subprocess.run(args,cwd=scratch,check=True)
assert (scratch/src).read_bytes()==read('source/blender/scripts/build-environment.py')
checkpoint=OUT/'checkpoints/material-only';manifest=(checkpoint/'checkpoint-hashes.json').read_bytes();assert sha(manifest)=='2957fb72ed270f9d6bd75fdce5f6dc0c1fe3e124da490a8a682fb9cf9731724a'
for row in json.loads(manifest)['files']:
    b=(checkpoint/row['path']).read_bytes();assert len(b)==row['bytes'] and sha(b)==row['sha256'],row['path']
receipt=dict(status='PASS',command='python scripts/verify-final-lineage.py',productionLineage=lineage,originalBinaryPrefixSHA256=sha(ob),originalBinaryPrefixExact=True,allOriginalAccessorsAndBufferViewsExact=True,allUnauthorisedMeshPrimitivesExact=True,allOriginalNodeIdentityHierarchyTRSExactExceptSingleNewChildBinding=True,otherMaterialDefinitionsExact=True,glassDefinitionMatchesSealedMaterialOnlyStage=True,nonLeftWallIndicesAndFullOriginalAttributesExact=True,newNode=newnode,triangleChanges=counts,totalTriangleDelta=132,exactOuterBounds=boundsRows,backplateBounds=bp,backplateInsideOriginalCase=True,sourcePatchReplayByteExact=True,sourcePatchSHA256=sha(read('source.patch')),sourceOutputSHA256=sha(read('source/blender/scripts/build-environment.py')),sealedCheckpointRowsVerified=72,checkpointManifestSHA256=sha(manifest),nativeTargetGeometryNormalsUVParityExact=True)
write('evidence/final-lineage.json',receipt);print('PASS: exact original records/binary, 4 authorized geometry deltas (+132 triangles), bounds, six unchanged outputs, exact source patch, 72-row immutable checkpoint')
