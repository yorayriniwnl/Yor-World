import json, hashlib, struct, platform, sys, collections, io
from pathlib import Path
import numpy as np
from PIL import Image

SCRIPT=Path(__file__).resolve()
DELIVERY=SCRIPT.parents[1]
ROOT=SCRIPT.parents[3]
OUT=DELIVERY/'validator-logs'
OUT.mkdir(parents=True,exist_ok=True)
CAND=DELIVERY
def sha(p):
    b=p.read_bytes(); return {'bytes':len(b), 'sha256':hashlib.sha256(b).hexdigest()}
def write(name,data): (OUT/name).write_text(json.dumps(data,indent=2)+'\n',encoding='utf-8')
class GLB:
    def __init__(self,path):
        self.path=path; raw=path.read_bytes(); self.raw=raw
        assert struct.unpack_from('<III',raw)==(0x46546c67,2,len(raw))
        off=12; chunks={}
        while off<len(raw):
            n,t=struct.unpack_from('<II',raw,off); off+=8; chunks[t]=raw[off:off+n]; off+=n
        self.g=json.loads(chunks[0x4e4f534a]); self.bin=chunks.get(0x004e4942,b'')
        self.nodes=self.g.get('nodes',[]); self.names={n.get('name',str(i)):i for i,n in enumerate(self.nodes)}
        self.parents={c:i for i,n in enumerate(self.nodes) for c in n.get('children',[])}
        self.world={}
        for i in range(len(self.nodes)): self.matrix(i)
    def accessor(self,i):
        a=self.g['accessors'][i]; v=self.g['bufferViews'][a['bufferView']]
        d={5120:'i1',5121:'u1',5122:'<i2',5123:'<u2',5125:'<u4',5126:'<f4'}[a['componentType']]
        width={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']]
        dtype=np.dtype(d); off=v.get('byteOffset',0)+a.get('byteOffset',0); stride=v.get('byteStride',width*dtype.itemsize)
        return np.ndarray((a['count'],width),dtype=dtype,buffer=self.bin,offset=off,strides=(stride,dtype.itemsize)).copy()
    def matrix(self,i):
        if i in self.world:return self.world[i]
        n=self.nodes[i]
        if 'matrix' in n: m=np.array(n['matrix']).reshape(4,4).T
        else:
            x,y,z,w=n.get('rotation',[0,0,0,1]); s=n.get('scale',[1,1,1]); m=np.eye(4)
            m[:3,:3]=np.array([[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]])@np.diag(s)
            m[:3,3]=n.get('translation',[0,0,0])
        if i in self.parents:m=self.matrix(self.parents[i])@m
        self.world[i]=m;return m
    def points(self,i,descend=True):
        n=self.nodes[i]; arrays=[]
        if 'mesh' in n:
            for p in self.g['meshes'][n['mesh']]['primitives']:
                a=self.accessor(p['attributes']['POSITION']); arrays.append(np.c_[a,np.ones(len(a))]@self.world[i].T)
        if descend:
            for c in n.get('children',[]):
                a=self.points(c)
                if len(a):arrays.append(a)
        return np.concatenate(arrays) if arrays else np.zeros((0,4))
    def primitive_statistics(self,mesh_index):
        mesh=self.g['meshes'][mesh_index]
        vertices=0;triangles=0;primitive_rows=[]
        for primitive_index,primitive in enumerate(mesh.get('primitives',[])):
            positions=self.accessor(primitive['attributes']['POSITION'])
            indices=self.accessor(primitive['indices'])[:,0] if 'indices' in primitive else None
            mode=primitive.get('mode',4)
            if mode==4:
                index_count=len(indices) if indices is not None else len(positions)
                if index_count%3:
                    raise ValueError(f"Non-triangle index count in mesh {mesh_index} primitive {primitive_index}")
                triangles+=index_count//3
            vertices+=len(positions)
            primitive_rows.append({'primitiveIndex':primitive_index,'mode':mode,'vertexCount':len(positions),
                'indexCount':len(indices) if indices is not None else None,'triangleCount':(len(indices) if indices is not None else len(positions))//3 if mode==4 else None})
        return {'vertexCount':vertices,'triangleCount':triangles,'primitiveCount':len(primitive_rows),'primitives':primitive_rows}
    def geometry_summary(self):
        scene_index=self.g.get('scene',0)
        scene=self.g.get('scenes',[{}])[scene_index]
        reachable=set()
        def visit(index):
            if index in reachable:return
            reachable.add(index)
            for child in self.nodes[index].get('children',[]):visit(child)
        for index in scene.get('nodes',[]):visit(index)
        mesh_nodes=[i for i in sorted(reachable) if 'mesh' in self.nodes[i]]
        all_mesh_nodes=[i for i,n in enumerate(self.nodes) if 'mesh' in n]
        positions=[];instance_vertices=0;instance_triangles=0
        for i in mesh_nodes:
            points=self.points(i,False)
            if len(points):positions.append(points[:,:3])
            stats=self.primitive_statistics(self.nodes[i]['mesh'])
            instance_vertices+=stats['vertexCount'];instance_triangles+=stats['triangleCount']
        unique_meshes=sorted({self.nodes[i]['mesh'] for i in mesh_nodes})
        unique_stats=[self.primitive_statistics(index) for index in unique_meshes]
        bounds={'min':np.concatenate(positions).min(axis=0).tolist(),'max':np.concatenate(positions).max(axis=0).tolist()} if positions else None
        return {'sceneIndex':scene_index,'sceneMeshNodeCount':len(mesh_nodes),'allMeshNodeCount':len(all_mesh_nodes),
            'uniqueMeshCount':len(unique_meshes),'sceneInstanceVertexCount':instance_vertices,'sceneInstanceTriangleCount':instance_triangles,
            'uniqueMeshVertexCount':sum(row['vertexCount'] for row in unique_stats),'uniqueMeshTriangleCount':sum(row['triangleCount'] for row in unique_stats),
            'worldBounds':bounds,'meshNodeIndicesNotInDefaultScene':[i for i in all_mesh_nodes if i not in reachable]}
    def inventory(self):
        rows=[]
        for i,n in enumerate(self.nodes):
            pts=self.points(i,False); stats=self.primitive_statistics(n['mesh']) if 'mesh' in n else {'vertexCount':0,'triangleCount':0,'primitiveCount':0,'primitives':[]}
            rows.append({'index':i,'name':n.get('name'), 'parent':self.nodes[self.parents[i]].get('name') if i in self.parents else None,
                'localTranslation':n.get('translation',[0,0,0]),'localRotation':n.get('rotation',[0,0,0,1]),'localScale':n.get('scale',[1,1,1]),'worldMatrix':self.world[i].T.reshape(-1).tolist(),
                'vertexCount':len(pts),'triangleCount':stats['triangleCount'],'primitiveCount':stats['primitiveCount'],'primitives':stats['primitives'],
                'worldBounds':{'min':pts[:,:3].min(0).tolist(),'max':pts[:,:3].max(0).tolist()} if len(pts) else None,
                'mesh':n.get('mesh'),'skin':n.get('skin')})
        anim=[]
        for a in self.g.get('animations',[]):
            sam=[self.accessor(s['input']) for s in a['samplers']]; anim.append({'name':a.get('name'),'start':min(float(t.min()) for t in sam),'end':max(float(t.max()) for t in sam),'channels':[{'node':self.nodes[c['target']['node']].get('name'),'path':c['target']['path'],'interpolation':a['samplers'][c['sampler']].get('interpolation','LINEAR')} for c in a['channels']]})
        return {'identity':sha(self.path),'geometrySummary':self.geometry_summary(),'nodes':rows,'animations':anim,'scenes':self.g['scenes'],'skins':[{'name':s.get('name'),'joints':[self.nodes[j].get('name') for j in s['joints']],'inverseBindMatrices':self.accessor(s['inverseBindMatrices']).tolist()} for s in self.g.get('skins',[])]}

assets={p.stem:GLB(p) for p in CAND.joinpath('assets').glob('*.glb')}
write('glb-inventory.json',{k:a.inventory() for k,a in assets.items()})
checks=[]
def anchor(asset,name,expected,local=False):
    a=assets[asset]; i=a.names[name]; actual=np.array(a.nodes[i].get('translation',[0,0,0]) if local else a.world[i][:3,3]); error=float(abs(actual-np.array(expected)).max())
    checks.append({'kind':'translation','asset':asset,'node':name,'space':'local' if local else 'world','expected':expected,'actual':actual.tolist(),'maxErrorM':error,'toleranceM':.0001,'status':'PASS' if error<=.0001 else 'FAIL'})
for a,n,e,l in [('room','Room_Root',[0,0,0],False),('room','Door_Hinge',[-1.65,0,1.8],False),('room','Door_Leaf',[.45,1.05,0],True),('room','Door_Leaf',[-1.2,1.05,1.8],False),('fixture','chair-root',[.3,0,-.36],False),('fixture','chair-base',[.3,0,-.36],False),('fixture','Chair_Seat',[0,.42,.025],True),('resident','resident',[.3,0,-.36],False),('room','painting-pivot',[2.08,1.75,-.4],False),('room','hidden-yor-mark',[2.085,1.45,-.4],False),('room','monitor-surface',[0,1.05,-1.3],False),('room','Books_Stack',[.45,2.27,-1.68],False),('room','Plant_Leaf_01',[-1.65,.65,.85],False),('room','Plant_Leaf_02',[-1.52,.72,.78],False),('room','PC_Fan_Group',[1.05,.99,-.914],False),('room','Zenith_Core',[.7,.805,-1.388],False),('room','Camera_Lens_Ring',[-1.45,1.77,-1.635],False),('room','Mic_LED',[-.62,1.11,-1.08],False),('room','Clock_Face',[-.5,.81,-1.114],False),('room','Speaker_LED',[-.68,.88,-1.17],False),('room','contact_phone_body',[.45,.755,-.92],False),('room','about-personal-object',[.72,.82,-.84],False),('room','key_response_active',[-.08,.781,-.98],False),('room','mouse_body',[.24,.768,-.98],False)]:anchor(a,n,e,l)
room=assets['room']; bounds={}
for name,i in room.names.items():
    if any(t in name.lower() for t in ['floor','wall','desk','door','keyboard','keycap','mouse','ceiling']):
        p=room.points(i,False)
        if len(p):bounds[name]={'min':p[:,:3].min(0).tolist(),'max':p[:,:3].max(0).tolist(),'size':np.ptp(p[:,:3],axis=0).tolist(),'center':((p[:,:3].min(0)+p[:,:3].max(0))/2).tolist()}
leaf=room.points(room.names['Door_Leaf'],False)
checks.append({'kind':'geometryExtent','asset':'room','node':'Door_Leaf','expected':[.88,2.08,.04],'actual':np.ptp(leaf[:,:3],axis=0).tolist(),'status':'PASS' if abs(np.ptp(leaf[:,:3],axis=0)-[.88,2.08,.04]).max()<.0001 else 'FAIL','toleranceM':.0001})
write('geometry-checks.json',{'method':'Decoded binary POSITION accessors and composed node TRS world matrices, no metadata measured values used. Unskinned rigid geometry only.','checks':checks,'roomRigidBounds':bounds})
nameowners=collections.defaultdict(list)
for key in ['room','resident','fixture','group-b-props','on-demand-projects']:
    for n in assets[key].nodes:nameowners[n.get('name')].append(key)
write('ownership-checks.json',{'duplicateNodeNames':{k:v for k,v in nameowners.items() if len(v)>1},'roomClipCount':len(room.g.get('animations',[])),'doorParent':room.nodes[room.parents[room.names['Door_Hinge']]].get('name'),'frameParent':room.nodes[room.parents[room.names['Door_Frame']]].get('name'),'leafParent':room.nodes[room.parents[room.names['Door_Leaf']]].get('name')})
baseline=GLB(ROOT/'deliveries/FINISH-B1/assets/resident-production.glb'); now=assets['resident']; oldskin=baseline.g['skins'][0]; newskin=now.g['skins'][0]; skeleton=[]
for oj,nj in zip(oldskin['joints'],newskin['joints']):
    old=baseline.nodes[oj]; new=now.nodes[nj]; errors={k:float(abs(np.array(old.get(k,default))-np.array(new.get(k,default))).max()) for k,default in [('translation',[0,0,0]),('rotation',[0,0,0,1]),('scale',[1,1,1])]}
    skeleton.append({'referenceName':old.get('name'),'currentName':new.get('name'),'maxErrors':errors,'status':'PASS' if old.get('name')==new.get('name') and max(errors.values())<1e-5 else 'FAIL'})
write('skeleton-comparison.json',{'reference':sha(baseline.path),'current':sha(now.path),'joints':skeleton,'inverseBindMaxError':float(abs(baseline.accessor(oldskin['inverseBindMatrices'])-now.accessor(newskin['inverseBindMatrices'])).max())})

manifest_paths=[ROOT/'deliveries/FINISH-B1-R2/output-hashes.json', ROOT/'deliveries/FINISH-B1-R2/captures/index.json', ROOT/'docs/planning/reconciliation-packets/finish-contracts-r2/output-hashes.json']
manifests=[]
for mf in manifest_paths:
    data=json.loads(mf.read_text('utf-8-sig')); rows=data.get('files',data); base=mf.parent; result=[]
    if 'outputs' in data: rows={r['path']:r for r in data['outputs']}
    for key,expected in rows.items():
        if not isinstance(expected,dict) or 'sha256' not in expected:continue
        p=base/key
        if not p.exists():p=ROOT/key
        result.append({'path':key,'expected':expected,'actual':sha(p) if p.exists() else None,'status':'PASS' if p.exists() and sha(p)['sha256']==expected['sha256'] and sha(p)['bytes']==expected.get('bytes',sha(p)['bytes']) else 'FAIL'})
    manifests.append({'manifest':str(mf.relative_to(ROOT)).replace('\\','/'),'identity':sha(mf),'rows':result})
current={str(p.relative_to(CAND)).replace('\\','/'):sha(p) for p in sorted(CAND.rglob('*')) if p.is_file() and 'node_modules' not in p.parts}
write('candidate-current-inventory.json',current)
declared_path=CAND/'output-hashes.json'
declared=json.loads(declared_path.read_text()) if declared_path.exists() else {}
write('manifest-verification.json',{'manifestChecks':manifests,'currentFileCount':len(current),'declaredFileCount':len(declared),'undeclaredFiles':sorted(set(current)-set(declared)) if declared else 'NOT RUN: final output manifest not yet generated'})
inputs=[ROOT/'AGENTS.md',ROOT/'START_HERE.md',ROOT/'docs/planning/delegation-and-work-orders.md',ROOT/'docs/planning/account-operating-model.md',ROOT/'docs/planning/reconciliation-packets/2026-10-10-finish-04.md',ROOT/'docs/planning/reviews/2026-10-10-finish-00-r2.md',ROOT/'docs/planning/reviews/2026-10-10-finish-00-r2/decision.json',ROOT/'docs/planning/reviews/2026-10-10-finish-04/readiness.md',ROOT/'references/README.md',ROOT/'references/manifest.json',ROOT/'references/images/main-reference.png',ROOT/'app/src/features/world/CameraDirector.ts']
inputs+=list((ROOT/'docs/planning/reconciliation-packets/finish-contracts-r2').glob('*.md'))+[ROOT/'docs/planning/reconciliation-packets/finish-contracts-r2/output-hashes.json']
inputs+=[ROOT/'docs/planning/production-prompts/corrections-2026-10-10/02-GEMINI2-B1-R3.md',ROOT/'docs/planning/production-prompts/corrections-2026-10-10/04-GPT2-AUDITOR.md']
audit=ROOT/'deliveries/completion-audits/FINISH-B1/finish-04/20261010T211756Z-reaudit'
inputs+=list(audit.glob('*.json'))+[audit/'report.md',baseline.path]+[p for p in CAND.rglob('*') if p.is_file() and 'node_modules' not in p.parts]
write('input-hashes.json',{'policy':'Raw bytes; includes exhaustive current candidate inventory, named contracts/governance/references and prior evidence. No normalized line endings.','files':{str(p.relative_to(ROOT)).replace('\\','/'):sha(p) for p in sorted(set(inputs)) if p.is_file()}})
prior=json.loads((ROOT/'deliveries/completion-audits/FINISH-B1/finish-04/20261010T211756Z-reaudit/input-hashes.json').read_text())['files']
write('prior-evidence-binding.json',{'currentCandidateFilesMatchingPriorInputs':[{'path':p,'actual':sha(ROOT/p),'prior':v,'matches':sha(ROOT/p)==v} for p,v in prior.items() if p.startswith('deliveries/FINISH-B1-R2/') and (ROOT/p).exists()]})
exposure=[]
capture_index=CAND/'captures/index.json'
if capture_index.is_file():
    for row in json.loads(capture_index.read_text('utf-8-sig')).get('captures',[]):
        p=CAND/row['files']['webglCanvas']['path']
        if not p.is_file():continue
        im=np.asarray(Image.open(p).convert('RGB')); exposure.append({'path':str(p.relative_to(ROOT)).replace('\\','/'),'identity':sha(p),'dimensions':[im.shape[1],im.shape[0]],'whiteClippingPercent':float(np.all(im>=245,axis=2).mean()*100),'meanLuminance':float((im@np.array([.2126,.7152,.0722])).mean())})
write('capture-exposure-check.json',exposure)
print(json.dumps({'tools':{'python':sys.version,'numpy':np.__version__,'platform':platform.platform()},'candidateFiles':len(current),'manifestFailures':sum(r['status']=='FAIL' for m in manifests for r in m['rows']),'geometryChecks':len(checks),'geometryFailures':[c for c in checks if c['status']=='FAIL'],'skeletonFailures':[s for s in skeleton if s['status']=='FAIL']},indent=2))
