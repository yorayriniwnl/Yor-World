import json,struct,pathlib,math,hashlib
ROOT=pathlib.Path.cwd(); PKG=ROOT/'deliveries/FINISH-B1-R3'; AUD=ROOT/'deliveries/completion-audits/FINISH-B1/finish-05/20261011T062300Z-b1-r3-independent-review-01'
FMT={5120:('b',1),5121:('B',1),5122:('h',2),5123:('H',2),5125:('I',4),5126:('f',4)}; TYPES={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}
def matmul(a,b): return [[sum(a[i][k]*b[k][j] for k in range(4)) for j in range(4)] for i in range(4)]
def local(n):
 if 'matrix' in n:
  m=n['matrix']; return [[m[c*4+r] for c in range(4)] for r in range(4)]
 t=n.get('translation',[0,0,0]); q=n.get('rotation',[0,0,0,1]); s=n.get('scale',[1,1,1]); x,y,z,w=q
 R=[[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]]
 return [[R[i][j]*s[j] for j in range(3)]+[t[i]] for i in range(3)]+[[0,0,0,1]]
def point(m,p):
 v=[*p,1]; return [sum(m[i][j]*v[j] for j in range(4)) for i in range(3)]
def read_glb(p):
 b=p.read_bytes(); magic,version,total=struct.unpack_from('<4sII',b,0); assert magic==b'glTF' and version==2 and total==len(b)
 off=12; doc=None; blob=None
 while off<len(b):
  n,typ=struct.unpack_from('<I4s',b,off); dat=b[off+8:off+8+n]; off+=8+n
  if typ==b'JSON': doc=json.loads(dat.decode('utf-8').rstrip('\x00 \t\r\n'))
  elif typ==b'BIN\x00': blob=dat
 assert doc is not None and blob is not None
 def values(ai):
  a=doc['accessors'][ai]; bv=doc['bufferViews'][a['bufferView']]; fmt,size=FMT[a['componentType']]; width=TYPES[a['type']]; stride=bv.get('byteStride',size*width); start=bv.get('byteOffset',0)+a.get('byteOffset',0); out=[]
  for i in range(a['count']):
   vals=struct.unpack_from('<'+fmt*width,blob,start+i*stride); out.append(vals)
  return a,out
 nodes=doc.get('nodes',[]); parents={}
 for i,n in enumerate(nodes):
  for ch in n.get('children',[]): parents[ch]=i
 worlds={}
 def wm(i):
  if i in worlds:return worlds[i]
  M=local(nodes[i]); worlds[i]=matmul(wm(parents[i]),M) if i in parents else M; return worlds[i]
 names={}; dup=[]
 for i,n in enumerate(nodes):
  name=n.get('name','')
  if name in names and name: dup.append(name)
  names[name]=i
 meshes=set(); prim_count=triangles=vertices=0; bounds=[float('inf')]*3+[float('-inf')]*3
 for ni,n in enumerate(nodes):
  wm(ni)
  if 'mesh' not in n: continue
  meshes.add(n['mesh'])
  for prim in doc['meshes'][n['mesh']]['primitives']:
   prim_count+=1; ai=prim['attributes']['POSITION']; acc,ps=values(ai); vertices+=acc['count']
   for row in ps:
    v=point(worlds[ni],row[:3])
    for j in range(3): bounds[j]=min(bounds[j],v[j]); bounds[j+3]=max(bounds[j+3],v[j])
   mode=prim.get('mode',4)
   if mode==4:
    if 'indices' in prim: triangles+=doc['accessors'][prim['indices']]['count']//3
    else: triangles+=acc['count']//3
   elif mode==5 or mode==6: triangles+=max(0,(doc['accessors'][prim['indices']]['count'] if 'indices' in prim else acc['count'])-2)
 anim=[]
 for a in doc.get('animations',[]):
  times=[]; targets=[]
  for s in a.get('samplers',[]):
   ac=doc['accessors'][s['input']]; times.extend(ac.get('max',[0])); times.extend(ac.get('min',[0]))
  for ch in a.get('channels',[]):
   ti=ch['target']['node']; targets.append(nodes[ti].get('name',str(ti)))
  anim.append({'name':a.get('name'),'durationSec':max(times)-min(times) if times else None,'targetNodes':sorted(set(targets))})
 important={}
 for name in ['Room_Root','door','Door_Frame','Door_Hinge','Door_Leaf','keyboard_body','keycaps_main','mouse_body','resident','resident-body','body-turn','chair-root','Chair_Seat','chair-base']:
  if name in names:
   i=names[name]; n=nodes[i]; M=wm(i); important[name]={'parent':nodes[parents[i]].get('name') if i in parents else None,'localTranslation':n.get('translation',[0,0,0]),'worldTranslation':[M[x][3] for x in range(3)],'hasMesh':'mesh' in n,'children':[nodes[c].get('name') for c in n.get('children',[])]}
 return {'file':p.name,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest(),'nodeCount':len(nodes),'uniqueNamedNodeCount':len(set(n.get('name') for n in nodes if n.get('name'))),'duplicateNodeNames':sorted(set(dup)),'meshDefinitionCount':len(doc.get('meshes',[])),'meshNodeInstances':sum('mesh' in n for n in nodes),'primitiveCount':prim_count,'vertexAccessorCount':vertices,'triangles':triangles,'materials':len(doc.get('materials',[])),'textures':len(doc.get('textures',[])),'defaultScene':doc.get('scene',0),'worldBoundsYUp':{'min':bounds[:3],'max':bounds[3:]},'anchors':important,'animations':anim}
files=['room.glb','resident.glb','fixture.glb','group-b-props.glb','on-demand-projects.glb']; result={'method':'Independent GLB v2 JSON/BIN chunk parse; raw POSITION accessors, composed glTF TRS/matrix hierarchy, primitive index counts, and animation input accessor ranges. For skinned resident vertices, reported bounds are undeformed node-world accessor bounds, not a skin-deformed envelope.','files':[read_glb(PKG/'assets'/n) for n in files]}; out=AUD/'independent-glb-inspection.json'; out.write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8'); print(json.dumps(result,indent=2))
