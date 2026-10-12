from __future__ import annotations
import hashlib,json,pathlib,struct,subprocess
OUT=pathlib.Path(__file__).resolve().parents[1]; REPO=OUT.parents[1]
BASE='e8ea9187c1b6cd47b66ce7de9ad520daf9bd6baf'; R6=OUT/'inputs/r6/FINISH-B1-R6'
def sha(b):return hashlib.sha256(b).hexdigest()
def git(*a):return subprocess.check_output(['git',*a],cwd=REPO).decode().strip()
def read_glb(p):
 raw=p.read_bytes()
 if raw[:4]!=b'glTF' or struct.unpack_from('<I',raw,4)[0]!=2 or struct.unpack_from('<I',raw,8)[0]!=len(raw):raise SystemExit(f'bad GLB container {p}')
 n,t=struct.unpack_from('<II',raw,12)
 if t!=0x4e4f534a:raise SystemExit(f'bad JSON chunk {p}')
 doc=json.loads(raw[20:20+n]);off=20+n;bn,bt=struct.unpack_from('<II',raw,off)
 if bt!=0x004e4942 or off+8+bn>len(raw):raise SystemExit(f'bad BIN chunk {p}')
 return raw,doc,raw[off+8:off+8+bn]
room0=R6/'assets/room.glb';room1=OUT/'assets/room.glb';r0,d0,b0=read_glb(room0);r1,d1,b1=read_glb(room1)
allow_nodes={'pegboard_system','pegboard_panel'}
nodes0={n.get('name',f'#{i}'):n for i,n in enumerate(d0['nodes'])};nodes1={n.get('name',f'#{i}'):n for i,n in enumerate(d1['nodes'])}
if nodes0.keys()!=nodes1.keys():raise SystemExit('room node inventory changed')
node_changes=[]
for name,a in nodes0.items():
 b=nodes1[name]
 if a!=b:
  if name not in allow_nodes:raise SystemExit(f'out-of-scope room node changed: {name}')
  stable_a={k:v for k,v in a.items() if k not in ('translation','rotation','scale','matrix')};stable_b={k:v for k,v in b.items() if k not in ('translation','rotation','scale','matrix')}
  if stable_a!=stable_b:raise SystemExit(f'non-transform fields changed for {name}')
  node_changes.append({'node':name,'before':a,'after':b})
if set(x['node'] for x in node_changes)!=allow_nodes:raise SystemExit(f'expected only pegboard nodes to move; got {node_changes}')
if d0.get('materials')!=d1.get('materials'):raise SystemExit('room materials changed')
if len(d0.get('meshes',[]))!=len(d1.get('meshes',[])):raise SystemExit('room mesh count changed')
mesh_changes=[i for i,(a,b) in enumerate(zip(d0['meshes'],d1['meshes'])) if a!=b]
merge=json.loads((OUT/'evidence/glb-merge.json').read_text())
expected=sorted(x['meshIndex'] for x in merge['changedMeshes'])
if mesh_changes!=expected:raise SystemExit(f'changed mesh list mismatch: {mesh_changes} != {expected}')
for key in ('scenes','scene','animations','cameras','skins','images','textures','samplers','extensions','extensionsUsed','extensionsRequired'):
 if d0.get(key)!=d1.get(key):raise SystemExit(f'protected glTF field changed: {key}')
for key in ('accessors','bufferViews'):
 if d1.get(key,[])[:len(d0.get(key,[]))]!=d0.get(key,[]):raise SystemExit(f'base {key} prefix changed')
if b1[:len(b0)]!=b0:raise SystemExit('R6 BIN prefix not preserved')
for i,n in enumerate(d0['nodes']):
 name=n.get('name','').lower()
 if any(x in name for x in ('door','window','camera')) and n!=d1['nodes'][i]:raise SystemExit(f'protected door/window/camera node changed: {n.get("name")}')
asset_changes=[]
for name in ['resident.glb','fixture.glb','group-b-props.glb','on-demand-projects.glb','textures/deskmat-topography.png','textures/monitor-wallpaper.png']:
 a=(R6/'assets'/name).read_bytes(); b=(OUT/'assets'/name).read_bytes()
 if a!=b:raise SystemExit(f'out-of-scope runtime asset changed: {name}')
 asset_changes.append({'path':'assets/'+name,'unchanged':True,'sha256':sha(b),'bytes':len(b)})
browser=json.loads((OUT/'evidence/browser-results.json').read_text()); measures={(x['variant'],x['key']):x for x in browser['measurements']}
for profile in ('desktop-home','mobile-home'):
 a,b=measures['R6',profile],measures['R7',profile]
 for k in ('camera','renderer','loadedModels'):
  if a[k]!=b[k]:raise SystemExit(f'{profile}: profile invariant differs for {k}')
 if (a['width'],a['height'])!=(b['width'],b['height']):raise SystemExit(f'{profile}: viewport changed')
 if b['projectionProbe']['pegboardPanelFullyInside'] is not True or b['projectionProbe']['pegboardControllersFullyInside'] is not True:raise SystemExit(f'{profile}: pegboard anchor bounds fail')
 if b['rendererInfo']['calls']>b['limit']:raise SystemExit(f'{profile}: draw-call ceiling exceeded')
rows=browser['assetResponses']
if len(rows['R6'])!=5 or len(rows['R7'])!=5 or any(x.get('status')!=200 for v in ('R6','R7') for x in rows[v]):raise SystemExit('browser asset responses not five HTTP 200 per variant')
if {x['url'].split('/')[-1] for x in rows['R6']}!={x['url'].split('/')[-1] for x in rows['R7']}:raise SystemExit('runtime request IDs changed')
if browser['exitCode']!=0 or len(browser['captures'])!=14:raise SystemExit('matched browser capture failed/incomplete')
# Application identity is checked here; tracked delivery scope is bound again from raw Git after commit.
head=git('rev-parse','HEAD'); parent=git('rev-parse','HEAD^') if head!=BASE else BASE
if parent!=BASE:raise SystemExit(f'candidate is not directly based on R6: {head} parent={parent}')
app0=git('rev-parse',f'{BASE}:app'); app1=git('rev-parse','HEAD:app')
if app0!=app1:raise SystemExit('canonical app subtree changed')
changed=git('diff','--name-only',BASE,'HEAD').splitlines()
if head!=BASE and any(not p.startswith('deliveries/FINISH-B1-R7/') for p in changed):raise SystemExit(f'change outside R7 delivery: {changed}')
if head!=BASE and any(p.startswith('deliveries/FINISH-B1-R6/') for p in changed):raise SystemExit('R6 inputs changed')
scope_status='DEFERRED_TO_POSTCOMMIT_RAW_GIT_CHECK' if head==BASE else 'PASS'
receipt={'status':'PASS','baseCommit':BASE,'baseTree':git('rev-parse',f'{BASE}^{{tree}}'),'candidateScopeCheck':scope_status,'canonicalAppTreeUnchanged':True,'R6DeliveryUnchanged':True,'room':{'nodesExact':True,'changedNodes':node_changes,'materialsExact':True,'changedMeshIndices':mesh_changes,'expectedChangedMeshIndices':expected,'R6BinaryPrefixExact':True,'doorWindowCameraTransformsExact':True},'runtimeAssetsExactR6':asset_changes,'profiles':{p:{'cameraRendererViewportAndLoadedModelsExact':True,'R6Calls':measures['R6',p]['rendererInfo']['calls'],'R7Calls':measures['R7',p]['rendererInfo']['calls'],'R6Triangles':measures['R6',p]['rendererInfo']['triangles'],'R7Triangles':measures['R7',p]['rendererInfo']['triangles'],'panelInside':True,'twoControllerProbesInside':True} for p in ('desktop-home','mobile-home')},'requestSet':{'R6':len(rows['R6']),'R7':len(rows['R7']),'sameIDs':True,'allHTTP200':True},'scope':'Only pegboard node transforms and three existing static geometry batches changed; no app, camera, door, material, asset ID, or runtime request changes. Maker structural evidence; independent review/acceptance pending.'}
(OUT/'evidence/final-invariants.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'status':'PASS','changedNodes':[x['node'] for x in node_changes],'changedMeshIndices':mesh_changes,'R6BINPrefixExact':True,'profileBindings':'PASS','appTreeUnchanged':True,'trackedScope':'postcommit check deferred to raw Git blob receipt'},indent=2))
