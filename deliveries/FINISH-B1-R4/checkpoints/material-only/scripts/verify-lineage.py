"""Binary GLB, native receipt, exact source patch replay and package lineage checks."""
import copy, hashlib, json, pathlib, shutil, subprocess, sys
from prepare import ROOT,OUT,COMMIT,decode,correct
def hashbytes(b):return hashlib.sha256(b).hexdigest()
def read(p):return (OUT/p).read_bytes()
def write(p,v):(OUT/p).write_text(json.dumps(v,indent=2)+'\n',encoding='utf-8')
runtime=['room.glb','resident.glb','fixture.glb','group-b-props.glb','on-demand-projects.glb','textures/deskmat-topography.png','textures/monitor-wallpaper.png','source/room.blend']
rows=[]
for p in runtime:
    before=read('inputs/r3/assets/'+p);after=read('assets/'+p)
    raw=subprocess.check_output(['git','show',COMMIT+':deliveries/FINISH-B1-R3/assets/'+p],cwd=ROOT)
    assert raw==before
    same=before==after
    assert same==(p not in ['room.glb','source/room.blend'])
    rows.append(dict(path='assets/'+p,baseCommit=COMMIT,baseSHA256=hashbytes(before),candidateSHA256=hashbytes(after),baseBytes=len(before),candidateBytes=len(after),byteIdentical=same,expectedChange=not same))
write('evidence/production-lineage.json',dict(productionUniverse='Every recursively listed file in exact R3 assets/; 5 runtime GLB, 2 textures, 1 native source. Other archive/scratch copies in R3 are not successor runtime outputs.',files=rows))
actual=subprocess.check_output(['git','ls-tree','-r','--name-only',COMMIT,'deliveries/FINISH-B1-R3/assets'],cwd=ROOT).decode().splitlines()
assert sorted('deliveries/FINISH-B1-R3/'+r['path'] for r in rows)==sorted(actual)
old,oldbin=decode(read('inputs/r3/assets/room.glb'));new,newbin=decode(read('assets/room.glb'))
assert oldbin==newbin
mi=next(i for i,m in enumerate(old['materials']) if m['name']=='PC_TemperedGlass')
changes=[]
def compare(a,b,p=''):
    if isinstance(a,dict) and isinstance(b,dict):
        for k in sorted(set(a)|set(b)):
            if k not in a or k not in b:changes.append(dict(path=p+'/'+k,before=a.get(k,'ABSENT'),after=b.get(k,'ABSENT')))
            else:compare(a[k],b[k],p+'/'+k)
    elif isinstance(a,list) and isinstance(b,list) and len(a)==len(b):
        for i,(x,y) in enumerate(zip(a,b)):compare(x,y,p+'/'+str(i))
    elif a!=b:changes.append(dict(path=p,before=a,after=b))
compare(old,new)
allowed=[f'/materials/{mi}/alphaMode',f'/materials/{mi}/pbrMetallicRoughness/baseColorFactor/3',f'/materials/{mi}/extensions','/extensionsUsed']
assert sorted(c['path'] for c in changes)==sorted(allowed)
assignments=[]
for i,n in enumerate(new['nodes']):
    if 'mesh' not in n:continue
    for j,p in enumerate(new['meshes'][n['mesh']]['primitives']):
        if p.get('material')==mi:assignments.append(dict(nodeIndex=i,nodeName=n.get('name'),meshIndex=n['mesh'],primitiveIndex=j,positionAccessor=p['attributes']['POSITION']))
assert read('assets/room.glb')==correct(read('inputs/r3/assets/room.glb'))
assert new['nodes']==old['nodes'] and new['meshes']==old['meshes']
assert all(a==b for i,(a,b) in enumerate(zip(old['materials'],new['materials'])) if i!=mi)
write('evidence/glb-material-diff.json',dict(status='PASS',changes=changes,glassIndex=mi,glassBefore=old['materials'][mi],glassAfter=new['materials'][mi],assignedNodes=assignments,binaryChunkByteIdentical=True,binaryChunkSHA256=hashbytes(oldbin),allOtherJSONExceptAllowedDiffsExact=True,geometryUVsTopologyHierarchyTRSAnimationsExact=True,otherMaterialsExact=True,deterministicReplayByteIdentical=True))
scratch=OUT/'.work/patch-replay'
scratch.mkdir(parents=True,exist_ok=True)
src='deliveries/FINISH-B1-R3/source/blender/scripts/build-environment.py'
(scratch/src).parent.mkdir(parents=True,exist_ok=True);(scratch/src).write_bytes(read('inputs/r3/source/blender/scripts/build-environment.py'))
subprocess.run(['git','init','--quiet',str(scratch)],check=True)
subprocess.run(['git','config','core.autocrlf','false'],cwd=scratch,check=True)
cmd=['git','apply','--check',str(OUT/'source.patch')];c=subprocess.run(cmd,cwd=scratch,capture_output=True,text=True)
assert c.returncode==0,c.stderr
cmd2=['git','apply',str(OUT/'source.patch')];a=subprocess.run(cmd2,cwd=scratch,capture_output=True,text=True);assert a.returncode==0,a.stderr
assert (scratch/src).read_bytes()==read('source/blender/scripts/build-environment.py')
write('evidence/source-patch-replay.json',dict(status='PASS',baseCommit=COMMIT,basePath=src,patchSHA256=hashbytes(read('source.patch')),checkCommand=cmd,checkExit=c.returncode,checkStderr=c.stderr,applyCommand=cmd2,applyExit=a.returncode,applyStderr=a.stderr,appliedSHA256=hashbytes((scratch/src).read_bytes()),exactCandidateSourceBytes=True))
write('evidence/export-reproducibility.json',dict(status='PASS',command='python scripts/verify-lineage.py',recipe='scripts/prepare.py:correct(raw exact R3 room GLB)',secondReplaySHA256=hashbytes(correct(read('inputs/r3/assets/room.glb'))),outputSHA256=hashbytes(read('assets/room.glb')),byteExact=True,scope='Deterministic material-only production GLB transform; not a full Blender geometry rebuild. Native-source parity checked separately.'))
print('PASS: exact R3 inputs, 8-output lineage, BIN identical, exactly four permitted JSON diffs, source patch exact-byte replay, deterministic export replay')
