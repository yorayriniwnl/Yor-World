from pathlib import Path
import collections, hashlib, json, math, struct, sys, platform
ROOT=Path.cwd()
FINAL=ROOT/'.work'/'source-root'/'deliveries'/'FINISH-B1-R3'/'assets'
PRE=ROOT/'reviewer-rerun'/'prebatch-inputs'/'assets'
OUT=ROOT/'reviewer-rerun'/'validator-logs'/'independent-glb-audit.json'
COMP={'5120':('b',1),'5121':('B',1),'5122':('h',2),'5123':('H',2),'5125':('I',4),'5126':('f',4)}
WIDTH={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT2':4,'MAT3':9,'MAT4':16}

def sha(path):
 b=path.read_bytes(); return {'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def identity(): return [[1.0 if r==c else 0.0 for c in range(4)] for r in range(4)]
def mm(a,b): return [[sum(a[r][k]*b[k][c] for k in range(4)) for c in range(4)] for r in range(4)]
def trn(m,p):
 v=[p[0],p[1],p[2],1.0]
 q=[sum(m[r][c]*v[c] for c in range(4)) for r in range(4)]
 return tuple(q[:3])
def local_matrix(n):
 if 'matrix' in n:
  v=n['matrix']; return [[float(v[c*4+r]) for c in range(4)] for r in range(4)]
 x,y,z,w=n.get('rotation',[0,0,0,1]); sx,sy,sz=n.get('scale',[1,1,1]); t=n.get('translation',[0,0,0])
 r=[[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]]
 m=identity()
 for i,s in enumerate([sx,sy,sz]):
  for j in range(3):m[j][i]=r[j][i]*s
 for i in range(3):m[i][3]=float(t[i])
 return m
class GLB:
 def __init__(self,path):
  self.path=path; self.raw=path.read_bytes()
  magic,ver,size=struct.unpack_from('<III',self.raw,0)
  if (magic,ver,size)!=(0x46546c67,2,len(self.raw)):raise ValueError(f'bad header: {path}')
  chunks={}; off=12
  while off<len(self.raw):
   n,typ=struct.unpack_from('<II',self.raw,off); off+=8; chunks[typ]=self.raw[off:off+n]; off+=n
  self.doc=json.loads(chunks[0x4e4f534a]); self.bin=chunks.get(0x004e4942,b'')
  self.nodes=self.doc.get('nodes',[]); self.parents={c:i for i,n in enumerate(self.nodes) for c in n.get('children',[])}
  self.names=collections.defaultdict(list)
  for i,n in enumerate(self.nodes):self.names[n.get('name','<unnamed>')].append(i)
  self.world={}
  for i in range(len(self.nodes)):self.world_matrix(i)
 def world_matrix(self,i):
  if i not in self.world:
   m=local_matrix(self.nodes[i]); p=self.parents.get(i)
   if p is not None:m=mm(self.world_matrix(p),m)
   self.world[i]=m
  return self.world[i]
 def accessor(self,i):
  a=self.doc['accessors'][i]; count=a['count']; width=WIDTH[a['type']]; fmt,sz=COMP[str(a['componentType'])]
  if 'sparse' in a:raise ValueError(f'sparse accessor unsupported: {self.path}:{i}')
  view=self.doc['bufferViews'][a['bufferView']]; base=view.get('byteOffset',0)+a.get('byteOffset',0); stride=view.get('byteStride',width*sz)
  rows=[]
  for row in range(count):rows.append(struct.unpack_from('<'+fmt*width,self.bin,base+row*stride))
  return rows
 def scene_reachable(self):
  idx=self.doc.get('scene',0); roots=self.doc.get('scenes',[{}])[idx].get('nodes',[]); seen=set()
  def walk(i):
   if i in seen:return
   seen.add(i)
   for c in self.nodes[i].get('children',[]):walk(c)
  for i in roots:walk(i)
  return seen
 def summarize(self):
  seen=self.scene_reachable(); meshes=[]; world_points=[]; instance_v=instance_t=0; unique_v=unique_t=0
  for mi,mesh in enumerate(self.doc.get('meshes',[])):
   v=t=0
   for prim in mesh.get('primitives',[]):
    positions=self.accessor(prim['attributes']['POSITION']); v+=len(positions)
    mode=prim.get('mode',4)
    if mode==4:
     inds=self.accessor(prim['indices']) if 'indices' in prim else [(x,) for x in range(len(positions))]; t+=len(inds)//3
   unique_v+=v; unique_t+=t
  for ni in sorted(seen):
   node=self.nodes[ni]
   if 'mesh' not in node:continue
   mesh=self.doc['meshes'][node['mesh']]; node_v=node_t=0; node_points=[]
   for prim in mesh.get('primitives',[]):
    pos=self.accessor(prim['attributes']['POSITION']); node_v+=len(pos); mode=prim.get('mode',4)
    if mode==4:
     inds=self.accessor(prim['indices']) if 'indices' in prim else [(x,) for x in range(len(pos))]; node_t+=len(inds)//3
    node_points.extend(trn(self.world_matrix(ni),p[:3]) for p in pos)
   instance_v+=node_v; instance_t+=node_t; world_points.extend(node_points)
   meshes.append({'node':node.get('name'), 'nodeIndex':ni,'meshIndex':node['mesh'],'vertexCount':node_v,'triangles':node_t,'worldBounds':bounds(node_points)})
  anim=[]
  for a in self.doc.get('animations',[]):
   sam=[]
   for s in a['samplers']:
    times=self.accessor(s['input']); flat=[float(x[0]) for x in times]
    sam.append({'min':min(flat),'max':max(flat),'duration':max(flat)-min(flat)})
   targets=[{'node':self.nodes[c['target']['node']].get('name'), 'path':c['target']['path']} for c in a['channels']]
   anim.append({'name':a.get('name'), 'samplers':sam,'targets':targets})
  return {'identity':sha(self.path),'defaultSceneReachableNodeCount':len(seen),'meshInstanceCount':len(meshes),'uniqueMeshCount':len(self.doc.get('meshes',[])),'sceneInstanceVertices':instance_v,'sceneInstanceTriangles':instance_t,'uniqueMeshVertices':unique_v,'uniqueMeshTriangles':unique_t,'worldBounds':bounds(world_points),'materials':[m.get('name',f'material-{i}') for i,m in enumerate(self.doc.get('materials',[]))],'images':len(self.doc.get('images',[])),'textures':len(self.doc.get('textures',[])),'meshInstances':meshes,'animations':anim,'skinJointCounts':[len(s['joints']) for s in self.doc.get('skins',[])], 'duplicateNodeNames':{k:v for k,v in self.names.items() if len(v)>1}}
def bounds(points):
 if not points:return None
 return {'min':[min(p[i] for p in points) for i in range(3)],'max':[max(p[i] for p in points) for i in range(3)]}
def tri_counter(glb):
 c=collections.Counter(); scene=glb.scene_reachable(); mats=glb.doc.get('materials',[])
 for ni in sorted(scene):
  n=glb.nodes[ni]
  if 'mesh' not in n:continue
  for prim in glb.doc['meshes'][n['mesh']].get('primitives',[]):
   mode=prim.get('mode',4)
   if mode!=4:continue
   pos=glb.accessor(prim['attributes']['POSITION']); ids=[int(x[0]) for x in glb.accessor(prim['indices'])] if 'indices' in prim else list(range(len(pos)))
   mat_idx=prim.get('material'); mat=mats[mat_idx].get('name',f'material-{mat_idx}') if mat_idx is not None else '<default>'
   world=glb.world_matrix(ni)
   for k in range(0,len(ids)-2,3):
    verts=tuple(sorted(tuple(round(v,3) for v in trn(world,pos[ix][:3])) for ix in ids[k:k+3]))
    c[(mat,verts)]+=1
 return c
def node_record(g,name):
 ids=g.names.get(name,[])
 if not ids:return None
 i=ids[0]; n=g.nodes[i]; world=g.world_matrix(i)
 return {'index':i,'name':name,'parent':g.nodes[g.parents[i]].get('name') if i in g.parents else None,'children':[g.nodes[c].get('name') for c in n.get('children',[])],'localTranslation':n.get('translation',[0,0,0]),'localRotation':n.get('rotation',[0,0,0,1]),'localScale':n.get('scale',[1,1,1]),'worldTranslation':[world[r][3] for r in range(3)],'mesh':n.get('mesh'),'skin':n.get('skin')}

finals={p.stem:GLB(p) for p in sorted(FINAL.glob('*.glb'))}; pres={p.stem:GLB(p) for p in sorted(PRE.glob('*.glb'))}
required={
 'room':['Room_Root','door','Door_Frame','Door_Hinge','Door_Leaf','desk','keyboard_body','keycaps_main','mouse_body','mouse_wheel','chair-mount','blind_slat_1','blind_slat_12','Clock_Face','Mic_LED','Camera_Lens_Ring','Zenith_Core'],
 'resident':['resident','body-turn','resident-body','foot.L','foot.R'],
 'fixture':['chair-root','chair-base','Chair_Seat'],
 'on-demand-projects':['Project_Effects_Root','Helios_Network_Path','Zenith_Energy_Path','AI_Classification_Motif','Talks_Waveform'],
 'group-b-props':['Optional_Detail_Root']}
file_rows={name:g.summarize() for name,g in finals.items()}
checks=[]
def trans_check(asset,name,expected,space='world',tol=.0001):
 r=node_record(finals[asset],name)
 actual=(r['localTranslation'] if space=='local' else r['worldTranslation']) if r else None
 err=max(abs(float(actual[i])-expected[i]) for i in range(3)) if actual else None
 checks.append({'asset':asset,'node':name,'space':space,'expected':expected,'actual':actual,'maxErrorM':err,'toleranceM':tol,'status':'PASS' if err is not None and err<=tol else 'FAIL'})
for a,n,e,s in [('room','Room_Root',[0,0,0],'world'),('room','Door_Hinge',[-1.65,0,1.8],'world'),('room','Door_Leaf',[.45,1.05,0],'local'),('room','Door_Leaf',[-1.2,1.05,1.8],'world'),('resident','resident',[.3,0,-.36],'world'),('fixture','chair-root',[.3,0,-.36],'world'),('fixture','chair-base',[.3,0,-.36],'world'),('fixture','Chair_Seat',[0,.42,.025],'local')]:trans_check(a,n,e,s)
room=finals['room']; hinge=node_record(room,'Door_Hinge'); frame=node_record(room,'Door_Frame'); leaf=node_record(room,'Door_Leaf')
checks.append({'check':'doorSiblingHierarchy','frameParent':frame['parent'] if frame else None,'hingeParent':hinge['parent'] if hinge else None,'leafParent':leaf['parent'] if leaf else None,'status':'PASS' if frame and hinge and leaf and frame['parent']==hinge['parent'] and leaf['parent']=='Door_Hinge' else 'FAIL'})
checks.append({'check':'roomHasNoDoorMixerAnimation','roomAnimationCount':len(room.doc.get('animations',[])),'status':'PASS' if not room.doc.get('animations') else 'FAIL'})
expected_clips={'coding_idle':6.0,'mouse_idle':2.0,'notice_visitor':.6,'turn_to_visitor':1.2,'greeting_nod':.9,'return_to_work':1.3,'attention_glance':1.2,'breathing_idle':4.0}
for asset in ['resident','fixture']:
 found={a['name']:a for a in finals[asset].summarize()['animations']}
 for name,duration in expected_clips.items():
  a=found.get(name); actual=a['samplers'][0]['duration'] if a and a['samplers'] else None
  checks.append({'check':'pairedClipDuration','asset':asset,'clip':name,'expectedSeconds':duration,'actualSeconds':actual,'toleranceSeconds':1e-6,'status':'PASS' if actual is not None and abs(actual-duration)<=1e-6 else 'FAIL'})
for name,req in required.items():
 g=finals[name]; checks.append({'check':'requiredNodePresence','asset':name,'required':req,'missing':[x for x in req if not g.names.get(x)],'status':'PASS' if all(g.names.get(x) for x in req) else 'FAIL'})
compare=[]
for name in sorted(set(finals)&set(pres)):
 a,b=tri_counter(pres[name]),tri_counter(finals[name]); keys=set(a)|set(b)
 differences=[{'material':k[0],'prebatchCount':a[k],'finalCount':b[k],'triangle':k[1]} for k in keys if a[k]!=b[k]]
 compare.append({'asset':name,'prebatch':sha(pres[name].path),'final':sha(finals[name].path),'prebatchTriangleInstances':sum(a.values()),'finalTriangleInstances':sum(b.values()),'uniqueMaterialTriangleKeysPrebatch':len(a),'uniqueMaterialTriangleKeysFinal':len(b),'mismatchedTriangleKeys':len(differences),'sampleMismatches':differences[:12],'status':'PASS' if not differences else 'FAIL'})
result={'scope':'Reviewer-authored standard-library GLB binary decoder. Decodes POSITION/index bytes, applies node matrices/TRS, measures default-scene mesh instances/bounds, reads clip input accessors, validates frozen anchor/hierarchy/clip expectations, and compares pre-static-batching to final world-space triangles by material at 1e-4 m contract tolerance. Skin deformation is separately measured by fresh browser samples; static triangle comparison is not a likeness/visual acceptance.','python':sys.version,'platform':platform.platform(),'finalAssets':file_rows,'requiredNodeRecords':{a:{n:node_record(finals[a],n) for n in ns} for a,ns in required.items()},'contractChecks':checks,'prebatchGeometryComparisons':compare,'summary':{'assets':len(finals),'contractChecks':len(checks),'contractFailures':[x for x in checks if x['status']=='FAIL'],'prebatchComparedAssets':len(compare),'geometryComparisonFailures':[x for x in compare if x['status']=='FAIL']}}
OUT.write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
print(json.dumps(result['summary'],indent=2))
