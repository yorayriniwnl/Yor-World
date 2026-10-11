import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const SCRIPT_DIR=path.dirname(fileURLToPath(import.meta.url));
const DELIVERY_DIR=path.resolve("C:/Users/yoray/Projects/Yor World/deliveries/completion-audits/FINISH-B1/finish-06/20261011T063200Z-b1-r3-independent-review-02-f6a91d/.work/source-root/deliveries/FINISH-B1-R3");
const OUT=path.resolve("C:/Users/yoray/Projects/Yor World/deliveries/completion-audits/FINISH-B1/finish-06/20261011T063200Z-b1-r3-independent-review-02-f6a91d/reviewer-rerun/validator-logs");
const ROOT=path.resolve("C:/Users/yoray/Projects/Yor World/deliveries/completion-audits/FINISH-B1/finish-06/20261011T063200Z-b1-r3-independent-review-02-f6a91d/.work/source-root");
const REVIEW_CAPTURE_OUT=path.resolve("C:/Users/yoray/Projects/Yor World/deliveries/completion-audits/FINISH-B1/finish-06/20261011T063200Z-b1-r3-independent-review-02-f6a91d/reviewer-rerun/captures");
const HARNESS_DIR=path.join(DELIVERY_DIR,'source','harness');
const LOCAL_NODE_MODULES=path.join(HARNESS_DIR,'node_modules');
const USE_LOCAL_DEPS=fs.existsSync(path.join(LOCAL_NODE_MODULES,'@playwright','test'))&&fs.existsSync(path.join(LOCAL_NODE_MODULES,'three'));
const NODE_MODULES_DIR=USE_LOCAL_DEPS?LOCAL_NODE_MODULES:path.join(ROOT,'app','node_modules');
fs.mkdirSync(OUT,{recursive:true});
const require=createRequire(USE_LOCAL_DEPS?path.join(HARNESS_DIR,'package.json'):path.join(ROOT,'app/package.json'));
const {chromium}=require('@playwright/test');
const exportFiles=['room.glb','resident.glb','fixture.glb','group-b-props.glb','on-demand-projects.glb','textures/deskmat-topography.png','textures/monitor-wallpaper.png'];
const assetHashes={};for(const f of exportFiles){const b=fs.readFileSync(path.join(DELIVERY_DIR,'assets',f));assetHashes[f]={bytes:b.length,sha256:crypto.createHash('sha256').update(b).digest('hex')};}
const source=fs.readFileSync(path.join(DELIVERY_DIR,'scripts/test-browser-playback.mjs'),'utf8').replace(/\r\n/g,'\n');
let html=source.slice(source.indexOf('const HTML_CONTENT = `')+22,source.indexOf('`;\n\nfunction createServer()'));
// Observability-only extraction: use maker HTML unchanged except exposing existing objects
// and disabling the unattended RAF loop while deterministic clip samples run.
html=html.replace('init().then(() => {\n      animate();\n    });',`window.__audit={THREE,scene,camera,renderer,renderFrame,cameraPresets:CAMERA_PRESETS,currentTarget};
    init().then(() => {const setClipTime=(name,t)=>{residentMixer.stopAllAction();chairMixer.stopAllAction();for(const [m,acts]of [[residentMixer,residentActions],[chairMixer,chairActions]]){acts[name].reset().setLoop(THREE.LoopOnce,1).play();acts[name].clampWhenFinished=true;acts[name].paused=true;acts[name].time=t;m.update(0);}scene.updateMatrixWorld(true);residentGroup.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update();});renderFrame(0);};Object.assign(window.__audit,{roomGroup,residentGroup,fixtureGroup,residentMixer,chairMixer,residentActions,chairActions,doorHingeNode,setClipTime});});`);
const moduleRootUrl='/'+path.relative(ROOT,NODE_MODULES_DIR).replaceAll('\\','/');
html=html.replaceAll('/app/node_modules/three',moduleRootUrl+'/three');
if(!html.startsWith('<!DOCTYPE html>')||!html.includes('window.__audit'))throw Error('HTML extraction mismatch');
fs.writeFileSync(path.join(OUT,'instrumented-maker-harness.html'),html);
const mime={'.html':'text/html','.js':'text/javascript','.glb':'model/gltf-binary','.png':'image/png'};
const server=http.createServer((req,res)=>{
  if(req.url==='/'||req.url==='/index.html'){res.writeHead(200,{'Content-Type':'text/html'});res.end(html);return;}
  const p=path.resolve(ROOT,'.'+decodeURI(req.url.split('?')[0]));
  if(!p.startsWith(ROOT+path.sep)||!fs.existsSync(p)){res.writeHead(404);res.end();return;}
  res.writeHead(200,{'Content-Type':mime[path.extname(p)]||'application/octet-stream'});fs.createReadStream(p).pipe(res);
});
const logs=[];let browser;
try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=default','--enable-webgl']});
 const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
 page.on('console',m=>logs.push({type:m.type(),text:m.text()}));page.on('pageerror',e=>logs.push({type:'pageerror',text:e.message}));
 await page.goto('http://127.0.0.1:'+server.address().port+'/index.html',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.playbackState?.isReady&&window.__audit.residentGroup, null,{timeout:30000});
 const result=await page.evaluate(()=>{
  const a=window.__audit,T=a.THREE,camera=a.camera;const v=new T.Vector3(),q=new T.Quaternion();
  const scene=a.scene,res=a.residentGroup,fix=a.fixtureGroup,rm=a.residentMixer,cm=a.chairMixer;
  const skinned=[];res.traverse(o=>{if(o.isSkinnedMesh)skinned.push(o);});
  const allMeshes=[];scene.traverse(o=>{if(o.isMesh)allMeshes.push(o);});
  const geometry=new Set(),materials=new Set(),textures=new Set();
  for(const m of allMeshes){geometry.add(m.geometry);for(const mat of Array.isArray(m.material)?m.material:[m.material]){materials.add(mat);for(const value of Object.values(mat))if(value?.isTexture)textures.add(value);}}
  let geometryBytes=0;for(const g of geometry){const buffers=new Set();for(const x of [...Object.values(g.attributes),g.index].filter(Boolean)){const b=x.isInterleavedBufferAttribute?x.data.array:x.array;if(!buffers.has(b.buffer)){buffers.add(b.buffer);geometryBytes+=b.byteLength;}}}
  const texInfo=[...textures].map(t=>{const im=t.source?.data||t.image;const w=im?.width||0,h=im?.height||0;return{name:t.name,width:w,height:h,rgba8Bytes:w*h*4,mipmappedEstimateBytes:Math.ceil(w*h*4*(t.generateMipmaps?4/3:1))};});
  const vertexGroups=skinned.map(m=>{const si=m.geometry.attributes.skinIndex,sw=m.geometry.attributes.skinWeight,bones=m.skeleton.bones;const labels=[];for(let i=0;i<si.count;i++){let best=0;for(let j=1;j<4;j++)if(sw.getComponent(i,j)>sw.getComponent(i,best))best=j;labels.push(bones[si.getComponent(i,best)]?.name);}return {m,labels};});
  const box=name=>new T.Box3().setFromObject(scene.getObjectByName(name));
  const desk=box('desk_top'),keys=box('keycaps_main'),mouse=box('mouse_body');
  const chair=fix.getObjectByName('chair-root'),base=fix.getObjectByName('chair-base'),root=res.getObjectByName('resident'),bodyTurn=res.getObjectByName('body-turn');
  const initialRoot=root.getWorldPosition(new T.Vector3()),initialBase=base.getWorldPosition(new T.Vector3()),initialChairQuaternion=chair.getWorldQuaternion(new T.Quaternion()),initialBodyQuaternion=bodyTurn.getWorldQuaternion(new T.Quaternion());
  function setClip(name,t){rm.stopAllAction();cm.stopAllAction();for(const [m,acts]of [[rm,a.residentActions],[cm,a.chairActions]]){acts[name].reset().setLoop(T.LoopOnce,1).play();acts[name].clampWhenFinished=true;m.setTime(t);}scene.updateMatrixWorld(true);for(const m of skinned)m.skeleton.update();}
  const handNames={L:new Set(['handL','thumbL','indexL','fingersL']),R:new Set(['handR','thumbR','indexR','fingersR'])};
  const handTriangles={L:[],R:[]},footTriangles={L:[],R:[]},pelvisTriangles=[],allResidentTriangles=[];
  const worldPositions=new Map();
  for(const {m,labels} of vertexGroups){
   worldPositions.set(m,Array.from({length:m.geometry.attributes.position.count},()=>new T.Vector3()));
   const idx=m.geometry.index?.array, count=idx?idx.length:m.geometry.attributes.position.count;
   for(let i=0;i+2<count;i+=3){
    const tri=[idx?idx[i]:i,idx?idx[i+1]:i+1,idx?idx[i+2]:i+2];
    const boneLabels=tri.map(k=>labels[k]);allResidentTriangles.push({m,tri});
    for(const side of ['L','R'])if(tri.every(k=>handNames[side].has(labels[k])))handTriangles[side].push({m,tri});
    for(const side of ['L','R'])if(boneLabels.every(n=>n==='foot'+side))footTriangles[side].push({m,tri});
    if(boneLabels.every(n=>n==='pelvis'))pelvisTriangles.push({m,tri});
   }
  }
  function boxDistanceSq(a,b){const dx=Math.max(0,a.min.x-b.max.x,b.min.x-a.max.x),dy=Math.max(0,a.min.y-b.max.y,b.min.y-a.max.y),dz=Math.max(0,a.min.z-b.max.z,b.min.z-a.max.z);return dx*dx+dy*dy+dz*dz;}
  function segmentDistanceSq(p1,q1,p2,q2){
   const u=q1.clone().sub(p1),v=q2.clone().sub(p2),w=p1.clone().sub(p2),aa=u.dot(u),bb=u.dot(v),cc=v.dot(v),dd=u.dot(w),ee=v.dot(w),D=aa*cc-bb*bb;
   let sN,sD=D,tN,tD=D;
   if(D<1e-12){sN=0;sD=1;tN=ee;tD=cc;}else{sN=bb*ee-cc*dd;tN=aa*ee-bb*dd;if(sN<0){sN=0;tN=ee;tD=cc;}else if(sN>sD){sN=sD;tN=ee+bb;tD=cc;}}
   if(tN<0){tN=0;if(-dd<0)sN=0;else if(-dd>aa)sN=sD;else{sN=-dd;sD=aa;}}
   else if(tN>tD){tN=tD;if(-dd+bb<0)sN=0;else if(-dd+bb>aa)sN=sD;else{sN=-dd+bb;sD=aa;}}
   const sc=Math.abs(sN)<1e-12?0:sN/sD,tc=Math.abs(tN)<1e-12?0:tN/tD;
   return w.addScaledVector(u,sc).addScaledVector(v,-tc).lengthSq();
  }
  function triangleDistanceSq(A,B){
   let best=Infinity;const tmp=new T.Vector3();
   for(const p of [A.a,A.b,A.c]){B.closestPointToPoint(p,tmp);best=Math.min(best,p.distanceToSquared(tmp));}
   for(const p of [B.a,B.b,B.c]){A.closestPointToPoint(p,tmp);best=Math.min(best,p.distanceToSquared(tmp));}
   const ea=[[A.a,A.b],[A.b,A.c],[A.c,A.a]],eb=[[B.a,B.b],[B.b,B.c],[B.c,B.a]];
   for(const x of ea)for(const y of eb)best=Math.min(best,segmentDistanceSq(x[0],x[1],y[0],y[1]));
   return best;
  }
  function surfaceData(obj){
   obj.updateWorldMatrix(true,false);const g=obj.geometry;g.computeBoundingBox();const pos=g.attributes.position,idx=g.index?.array,triangles=[],vertices=[];
   for(let i=0;i<pos.count;i++)vertices.push(obj.localToWorld(new T.Vector3().fromBufferAttribute(pos,i)));
   const count=idx?idx.length:pos.count;
   for(let i=0;i+2<count;i+=3){const tri=new T.Triangle(vertices[idx?idx[i]:i],vertices[idx?idx[i+1]:i+1],vertices[idx?idx[i+2]:i+2]);triangles.push({tri,box:new T.Box3().setFromPoints([tri.a,tri.b,tri.c])});}
   return {obj,g,triangles,vertices};
  }
  function pointInsideClosedMesh(point,triangles){
   const directions=[[0.917421,0.313117,0.246731],[-0.273511,0.923771,0.268113],[0.193217,-0.381119,0.904621]].map(d=>new T.Vector3(...d).normalize());
   const parities=directions.map(direction=>{const ray=new T.Ray(point.clone(),direction),hits=[],hitPoint=new T.Vector3();for(const item of triangles){if(ray.intersectTriangle(item.tri.a,item.tri.b,item.tri.c,false,hitPoint)){const distance=hitPoint.clone().sub(point).dot(direction);if(distance>1e-7)hits.push(distance);}}hits.sort((x,y)=>x-y);let unique=0,last=-Infinity;for(const distance of hits)if(distance-last>1e-6){unique++;last=distance;}return unique%2===1;});
   return {inside:parities[0],stable:parities.every(x=>x===parities[0]),parities};
  }
  const surfaceObjects={keycaps:surfaceData(scene.getObjectByName('keycaps_main')),keyboard:surfaceData(scene.getObjectByName('keyboard_body')),mouse:surfaceData(scene.getObjectByName('mouse_body')),mouseWheel:surfaceData(scene.getObjectByName('mouse_wheel')),desk:surfaceData(scene.getObjectByName('desk_top')),floor:surfaceData(scene.getObjectByName('floor_main'))};
  function surfaceMetric(side,target){
   const sd=surfaceObjects[target];let best=Infinity,pairs=0,intersections=0;
   for(const item of handTriangles[side]){
    const p=worldPositions.get(item.m),A=new T.Triangle(p[item.tri[0]],p[item.tri[1]],p[item.tri[2]]),abox=new T.Box3().setFromPoints([A.a,A.b,A.c]);
    for(const other of sd.triangles){if(boxDistanceSq(abox,other.box)>best)continue;pairs++;const d=triangleDistanceSq(A,other.tri);if(d<best)best=d;if(d<1e-12)intersections++;}
   }
   let insideAabbProxy=0,insideMesh=0,ambiguousMesh=0,maxDepth=0;const insideMeshDetails=[],local=new T.Vector3(),bb=sd.g.boundingBox;
   for(const {m,labels} of vertexGroups){
    const world=worldPositions.get(m);
    for(let i=0;i<labels.length;i++)if(handNames[side].has(labels[i])){
     sd.obj.worldToLocal(local.copy(world[i]));
     const dx=Math.min(local.x-bb.min.x,bb.max.x-local.x),dy=Math.min(local.y-bb.min.y,bb.max.y-local.y),dz=Math.min(local.z-bb.min.z,bb.max.z-local.z),depth=Math.min(dx,dy,dz);
     if(depth>0.00001){insideAabbProxy++;maxDepth=Math.max(maxDepth,depth);if(target==='mouse'){const hit=pointInsideClosedMesh(world[i],sd.triangles);if(hit.stable&&hit.inside){insideMesh++;insideMeshDetails.push({vertexIndex:i,boneName:labels[i],world:world[i].toArray(),nearestMouseSurfaceGapM:pointSetDistance(world[i],sd.triangles),aabbInwardDepthM:depth,rayParities:hit.parities});}else if(!hit.stable)ambiguousMesh++;}}
    }
   }
   return {minTriangleSurfaceDistanceM:Math.sqrt(best),verticesInsideGeometryAabbProxy:insideAabbProxy,verticesInsideMouseClosedSurface:target==='mouse'?insideMesh:null,insideMouseSurfaceDetails:target==='mouse'?insideMeshDetails:null,ambiguousMouseVolumeRayTests:target==='mouse'?ambiguousMesh:null,maxAabbInwardDepthM:maxDepth,trianglePairsWithinBestBound:pairs,surfaceIntersectionPairCount:intersections,contactWithin10mm:Math.sqrt(best)<=0.01};
  }
  function surfaceMetricForEntries(entries,target){
   const sd=target.obj?target:surfaceObjects[target];let best=Infinity,pairs=0,intersections=0;
   for(const item of entries){const p=worldPositions.get(item.m),A=new T.Triangle(p[item.tri[0]],p[item.tri[1]],p[item.tri[2]]),abox=new T.Box3().setFromPoints([A.a,A.b,A.c]);for(const other of sd.triangles){if(boxDistanceSq(abox,other.box)>best)continue;pairs++;const d=triangleDistanceSq(A,other.tri);if(d<best)best=d;if(d<1e-12)intersections++;}}
   const ids=new Map();for(const item of entries){let set=ids.get(item.m);if(!set){set=new Set();ids.set(item.m,set);}for(const i of item.tri)set.add(i);}
   let insideAabbProxy=0,insideMesh=0,ambiguousMesh=0,maxDepth=0;const local=new T.Vector3(),bb=sd.g.boundingBox;
   for(const [m,set]of ids){const pos=worldPositions.get(m);for(const i of set){sd.obj.worldToLocal(local.copy(pos[i]));const d=Math.min(local.x-bb.min.x,bb.max.x-local.x,local.y-bb.min.y,bb.max.y-local.y,local.z-bb.min.z,bb.max.z-local.z);if(d>0.00001){insideAabbProxy++;maxDepth=Math.max(maxDepth,d);if(target==='desk'||target.obj){const hit=pointInsideClosedMesh(pos[i],sd.triangles);if(hit.stable&&hit.inside)insideMesh++;else if(!hit.stable)ambiguousMesh++;}}}}
   return {minTriangleSurfaceDistanceM:Number.isFinite(best)?Math.sqrt(best):null,verticesInsideTargetGeometryAabbProxy:insideAabbProxy,verticesInsideTargetClosedSurface:(target==='desk'||target.obj)?insideMesh:null,ambiguousTargetVolumeRayTests:(target==='desk'||target.obj)?ambiguousMesh:null,maxAabbInwardDepthM:maxDepth,trianglePairsWithinBestBound:pairs,surfaceIntersectionPairCount:intersections};
  }
  function sample(){
   const hands={L:new T.Box3(),R:new T.Box3()},feet={L:new T.Box3(),R:new T.Box3()},pelvis=new T.Box3();let desktopVertexHits=0;
   for(const {m,labels}of vertexGroups)for(let i=0;i<labels.length;i++){
    m.getVertexPosition(i,v).applyMatrix4(m.matrixWorld);const bone=labels[i];
    worldPositions.get(m)[i].copy(v);
    if(v.x>desk.min.x+.0001&&v.x<desk.max.x-.0001&&v.y>desk.min.y+.0001&&v.y<desk.max.y-.0001&&v.z>desk.min.z+.0001&&v.z<desk.max.z-.0001)desktopVertexHits++;
    for(const side of ['L','R']){if(['hand','thumb','index','fingers'].some(p=>bone===p+side))hands[side].expandByPoint(v);if(bone==='foot'+side)feet[side].expandByPoint(v);}
    if(bone==='pelvis')pelvis.expandByPoint(v);
   }
   const vec=n=>res.getObjectByName(T.PropertyBinding.sanitizeNodeName(n)).getWorldPosition(new T.Vector3()).toArray();
   const bjson=b=>({min:b.min.toArray(),max:b.max.toArray()});
   const yawRelative=(obj,rest)=>{const current=obj.getWorldQuaternion(new T.Quaternion()),delta=current.multiply(rest.clone().invert()),forward=new T.Vector3(0,0,-1).applyQuaternion(delta);return Math.atan2(-forward.x,-forward.z)*180/Math.PI;};const chairYaw=yawRelative(chair,initialChairQuaternion),bodyYaw=yawRelative(bodyTurn,initialBodyQuaternion);
   const seat=surfaceData(fix.getObjectByName('Chair_Seat'));
   return {chairYawDegrees:chairYaw,bodyYawDegrees:bodyYaw,bodyChairYawErrorDegrees:Math.abs(chairYaw-bodyYaw),root:root.getWorldPosition(new T.Vector3()).toArray(),rootDriftM:root.getWorldPosition(new T.Vector3()).distanceTo(initialRoot),baseDriftM:base.getWorldPosition(new T.Vector3()).distanceTo(initialBase),hands:{L:bjson(hands.L),R:bjson(hands.R)},feet:{L:bjson(feet.L),R:bjson(feet.R)},pelvis:bjson(pelvis),wristL:vec('hand.L'),wristR:vec('hand.R'),desktopVertexHits,handFrontGapM:Math.min(hands.L.min.z,hands.R.min.z)-desk.max.z,handLKeyAabbDistanceM:keys.distanceToPoint(hands.L.getCenter(new T.Vector3())),handRKeyAabbDistanceM:mouse.distanceToPoint(hands.R.getCenter(new T.Vector3())),surface:{leftKey:surfaceMetric('L','keycaps'),rightKey:surfaceMetric('R','keycaps'),rightMouse:surfaceMetric('R','mouse'),rightMouseWheel:surfaceMetric('R','mouseWheel')},support:{leftFootFloor:surfaceMetricForEntries(footTriangles.L,'floor'),rightFootFloor:surfaceMetricForEntries(footTriangles.R,'floor'),pelvisSeat:surfaceMetricForEntries(pelvisTriangles,seat),residentDeskTop:surfaceMetricForEntries(allResidentTriangles,'desk')}};
  }
  const clips=[];
  for(const [name,act]of Object.entries(a.residentActions)){
   const duration=act.getClip().duration,rows=[];const count=Math.round(duration*60);
   for(let i=0;i<=count;i++){setClip(name,Math.min(i/60,duration));rows.push({t:Math.min(i/60,duration),...sample()});}
   const first=rows[0],last=rows.at(-1);clips.push({name,duration,chairDuration:a.chairActions[name].getClip().duration,sampleHz:60,rows,summary:{minHandFrontGapM:Math.min(...rows.map(r=>r.handFrontGapM)),maxRootDriftM:Math.max(...rows.map(r=>r.rootDriftM)),totalDeskInteriorVertexHits:rows.reduce((n,r)=>n+r.desktopVertexHits,0),startChairYawDegrees:first.chairYawDegrees,endChairYawDegrees:last.chairYawDegrees,maxChairYawDegrees:Math.max(...rows.map(r=>r.chairYawDegrees))}});
  }
  setClip('coding_idle',0);
  const hinge=a.doorHingeNode,leaf=scene.getObjectByName('Door_Leaf'),frame=scene.getObjectByName('Door_Frame'),door=[];
  function subtreeTriangles(rootNode){const out=[];rootNode.traverse(o=>{if(o.isMesh)out.push(...surfaceData(o).triangles);});return out;}
  function triangleSetDistance(A,B){let best=Infinity,pairs=0,intersections=0;for(const x of A)for(const y of B){if(boxDistanceSq(x.box,y.box)>best)continue;pairs++;const d=triangleDistanceSq(x.tri,y.tri);if(d<best)best=d;if(d<1e-12)intersections++;}return {minSurfaceDistanceM:Number.isFinite(best)?Math.sqrt(best):null,trianglePairsWithinBestBound:pairs,intersectionPairCount:intersections};}
  function pointSetDistance(p,triangles){let best=Infinity;const q=new T.Vector3();for(const item of triangles){item.tri.closestPointToPoint(p,q);best=Math.min(best,p.distanceToSquared(q));}return Math.sqrt(best);}
  function nearPlaneIntersects(triangles){const near=camera.near,halfY=near*Math.tan(T.MathUtils.degToRad(camera.fov/2)),halfX=halfY*camera.aspect,local=[];camera.updateMatrixWorld(true);for(const item of triangles){const tri=item.tri;for(const p of [tri.a,tri.b,tri.c])local.push(camera.worldToLocal(p.clone()));for(const [p,q]of [[tri.a,tri.b],[tri.b,tri.c],[tri.c,tri.a]]){const cp=camera.worldToLocal(p.clone()),cq=camera.worldToLocal(q.clone()),d1=-cp.z,d2=-cq.z;if((d1-near)*(d2-near)<=0&&Math.abs(d1-d2)>1e-12){const u=(near-d1)/(d2-d1),hit=cp.clone().lerp(cq,u);if(Math.abs(hit.x)<=halfX&&Math.abs(hit.y)<=halfY)return true;}}}return local.some(p=>Math.abs(-p.z-near)<=1e-5&&Math.abs(p.x)<=halfX&&Math.abs(p.y)<=halfY);}
  const frameTriangles=subtreeTriangles(frame),doorDuration=2.5,cameraStartSec=2.5,cameraDuration=5.0,totalSequenceDuration=cameraStartSec+cameraDuration;
  function entrancePositionAt(travel,isMobile=false){const p=Math.max(0,Math.min(travel,1)),hallway=new T.Vector3(-1.2,1.7,2.65),doorway=new T.Vector3(-1.2,1.7,1.5),home=new T.Vector3(...a.cameraPresets[isMobile?'mobile-home':'desktop-home'].position);return p<=0.65?hallway.lerp(doorway,p/0.65):doorway.lerp(home,(p-0.65)/0.35);}
  for(let i=0;i<=Math.round(totalSequenceDuration*60);i++){
   const t=i/60,cameraElapsedSec=Math.max(0,t-cameraStartSec),progress=Math.min(1,cameraElapsedSec/cameraDuration),ease=progress<0.5?2*progress*progress:-1+(4-2*progress)*progress,u=Math.min(1,t/doorDuration),yaw=-Math.PI/2*(3*u*u-2*u*u*u);
   hinge.rotation.y=yaw;scene.updateMatrixWorld(true);
   const leafTriangles=subtreeTriangles(leaf),leafBox=box('Door_Leaf'),leafFrame=triangleSetDistance(leafTriangles,frameTriangles);
   const config=a.cameraPresets['desktop-home'],homeTarget=new T.Vector3(...config.target),hallTarget=new T.Vector3(0.12,1.25,-1.15),cameraTarget=hallTarget.lerp(homeTarget,ease),cameraPosition=entrancePositionAt(ease,false);
   camera.position.copy(cameraPosition);camera.fov=60+(config.fov-60)*ease;camera.lookAt(cameraTarget);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
   const cameraLeaf=pointSetDistance(cameraPosition,leafTriangles),cameraFrame=pointSetDistance(cameraPosition,frameTriangles);
   door.push({tSec:t,phase:t<cameraStartSec?'door-opening-camera-held':'camera-entry-door-held-open',doorElapsedSec:Math.min(t,doorDuration),cameraElapsedSec,entranceProgress:progress,entranceEase:ease,doorOpenProgress:u,yawDegrees:yaw*180/Math.PI,doorMagnitudeDegrees:Math.abs(yaw*180/Math.PI),panelBounds:{min:leafBox.min.toArray(),max:leafBox.max.toArray()},panelWorldCenter:leafBox.getCenter(new T.Vector3()).toArray(),camera:{position:cameraPosition.toArray(),target:cameraTarget.toArray(),fovDegrees:camera.fov,aspect:camera.aspect,nearClipM:camera.near,minLeafSurfaceDistanceM:cameraLeaf,leafNearClipMarginM:cameraLeaf-camera.near,minFrameSurfaceDistanceM:cameraFrame,frameNearClipMarginM:cameraFrame-camera.near,nearPlaneIntersectsLeaf:nearPlaneIntersects(leafTriangles),nearPlaneIntersectsFrame:nearPlaneIntersects(frameTriangles)},leafFrame});
  }
  setClip('coding_idle',0);hinge.rotation.y=0;scene.updateMatrixWorld(true);
  const transitionRows=[],transitionSummaries=[];
  function yawRest(obj,rest){const cur=obj.getWorldQuaternion(new T.Quaternion()),d=cur.multiply(rest.clone().invert()),f=new T.Vector3(0,0,-1).applyQuaternion(d);return Math.atan2(-f.x,-f.z)*180/Math.PI;}
  class ExportBoundPlaybackDirector{
   constructor(){this.avatarMixer=rm;this.chairMixer=cm;this.avatarActions=a.residentActions;this.chairActions=a.chairActions;this.bodyTurn=bodyTurn;this.chairRoot=chair;this.restBody=bodyTurn.getWorldQuaternion(new T.Quaternion());this.restChair=chair.getWorldQuaternion(new T.Quaternion());this.mode='coding';this.currentClip='coding_idle';this.currentTime=0;this.queue=[];this.revision=0;this.applyClip('coding_idle',0);}
   applyClip(clip,time){const duration=this.avatarActions[clip]?.getClip().duration;if(duration===undefined)throw new Error('unknown clip '+clip);const t=T.MathUtils.clamp(time,0,duration);for(const [m,acts] of [[this.avatarMixer,this.avatarActions],[this.chairMixer,this.chairActions]]){const action=acts[clip];if(action){if(this.currentClip!==clip){m.stopAllAction();action.reset().setEffectiveWeight(1).setLoop(T.LoopOnce,1).play();action.clampWhenFinished=true;action.paused=true;}action.time=t;m.update(0);}}this.currentClip=clip;this.currentTime=t;scene.updateMatrixWorld(true);for(const mesh of skinned)mesh.skeleton.update();}
   playGreeting(){if(this.mode==='sequence')return this.revision;this.revision++;this.queue=[{clip:'notice_visitor',from:0,to:.6,elapsed:0},{clip:'turn_to_visitor',from:0,to:1.2,elapsed:0},{clip:'greeting_nod',from:0,to:.9,elapsed:0},{clip:'return_to_work',from:0,to:1.3,elapsed:0}];this.mode='sequence';if(this.queue.length)this.applyClip(this.queue[0].clip,this.queue[0].from);return this.revision;}
   cancel(){if(this.mode==='safe-return'||this.mode==='coding')return this.revision;this.revision++;const c=this.currentClip,t=this.currentTime,s=[];if(c==='notice_visitor')s.push({clip:c,from:t,to:0,elapsed:0});else if(c==='turn_to_visitor')s.push({clip:c,from:t,to:0,elapsed:0},{clip:'notice_visitor',from:.6,to:0,elapsed:0});else if(c==='greeting_nod')s.push({clip:c,from:t,to:0,elapsed:0},{clip:'turn_to_visitor',from:1.2,to:0,elapsed:0},{clip:'notice_visitor',from:.6,to:0,elapsed:0});else if(c==='return_to_work')s.push({clip:c,from:t,to:1.3,elapsed:0});this.queue=s;this.mode=s.length?'safe-return':'coding';if(this.queue.length)this.applyClip(this.queue[0].clip,this.queue[0].from);else this.applyClip('coding_idle',0);return this.revision;}
   settle(){this.revision++;this.queue=[];this.mode='coding';this.applyClip('coding_idle',0);return this.revision;}
   advance(dt){if(!Number.isFinite(dt)||dt<0)return;let remaining=dt;while(this.queue.length){const seg=this.queue[0];if(!seg)break;const duration=Math.abs(seg.to-seg.from),take=Math.min(remaining,Math.max(0,duration-seg.elapsed));seg.elapsed+=take;remaining-=take;const progress=duration>0?seg.elapsed/duration:1,sampleTime=seg.from+(seg.to-seg.from)*progress;this.applyClip(seg.clip,sampleTime);if(seg.elapsed<duration-1e-6)return;this.applyClip(seg.clip,seg.to);this.queue.shift();if(this.queue.length){const next=this.queue[0];if(next)this.applyClip(next.clip,next.from);}else{this.mode='coding';this.applyClip('coding_idle',0);}if(remaining<1e-6)return;}if(this.mode==='coding'){const duration=this.avatarActions.coding_idle.getClip().duration;this.applyClip('coding_idle',(this.currentTime+remaining)%duration);}}
   diagnostic(){return{clip:this.currentClip,time:this.currentTime,mode:this.mode,queueLength:this.queue.length,chairYawDegrees:yawRest(this.chairRoot,this.restChair),bodyYawDegrees:yawRest(this.bodyTurn,this.restBody),root:this.chairRoot.parent.getObjectByName('resident')?.getWorldPosition(new T.Vector3()).toArray()||root.getWorldPosition(new T.Vector3()).toArray()};}
  }
  const maxSequenceFrames=240;
  for(let repetition=1;repetition<=20;repetition++){
   const d=new ExportBoundPlaybackDirector();d.playGreeting();let maxPair=0,maxRoot=0,frames=0;
   for(;frames<maxSequenceFrames&&d.mode!=='coding';frames++){
    d.advance(1/60);const diag=d.diagnostic(),drift=root.getWorldPosition(new T.Vector3()).distanceTo(initialRoot);maxPair=Math.max(maxPair,Math.abs(diag.chairYawDegrees-diag.bodyYawDegrees));maxRoot=Math.max(maxRoot,drift);
    transitionRows.push({repetition,frame:frames+1,timeSec:(frames+1)/60,...diag,rootDriftM:drift});
   }
   transitionSummaries.push({repetition,framesUntilCoding:frames,final:d.diagnostic(),maxBodyChairYawErrorDegrees:maxPair,maxRootDriftM:maxRoot,status:d.mode==='coding'&&Math.abs(d.diagnostic().chairYawDegrees)<.01&&Math.abs(d.diagnostic().bodyYawDegrees)<.01?'PASS':'FAIL'});
  }
  function cancelScenario(name,preFrames){const d=new ExportBoundPlaybackDirector();d.playGreeting();for(let i=0;i<preFrames;i++)d.advance(1/60);const at=d.diagnostic();d.cancel();let frames=0,maxYaw=0;while(d.mode!=='coding'&&frames<600){d.advance(1/60);const x=d.diagnostic();maxYaw=Math.max(maxYaw,Math.abs(x.chairYawDegrees-x.bodyYawDegrees));frames++;}const end=d.diagnostic();return{name,preFrames,cancelAt:at,framesToCoding:frames,final:end,maxBodyChairYawErrorDegrees:maxYaw,maxRootDriftM:root.getWorldPosition(new T.Vector3()).distanceTo(initialRoot),status:d.mode==='coding'&&Math.abs(end.chairYawDegrees)<.01&&Math.abs(end.bodyYawDegrees)<.01?'PASS':'FAIL'};}
  const cancellations=[cancelScenario('start',0),cancelScenario('middle',72),cancelScenario('end',239)];
  const skipDirector=new ExportBoundPlaybackDirector();skipDirector.playGreeting();for(let i=0;i<60;i++)skipDirector.advance(1/60);const skipBefore=skipDirector.diagnostic();skipDirector.settle();const skipAfter=skipDirector.diagnostic();
  const navDirector=new ExportBoundPlaybackDirector();navDirector.playGreeting();for(let i=0;i<120;i++)navDirector.advance(1/60);const navBefore=navDirector.diagnostic();navDirector.settle();const navSettled=navDirector.diagnostic();navDirector.playGreeting();let navFrames=0;for(;navFrames<240&&navDirector.mode!=='coding';navFrames++)navDirector.advance(1/60);const navAfter=navDirector.diagnostic();
  const transitionEvidence={source:'Playback scheduling copied from read-only app/src/features/world/CharacterDirector.ts; exporter-bound Three.js AnimationMixer/actions on actual resident.glb and fixture.glb; no C2 runtime integration claimed.',fps:60,clipSequence:['notice_visitor','turn_to_visitor','greeting_nod','return_to_work'],repetitions:20,rows:transitionRows,summaries:transitionSummaries,cancellations,skip:{before:skipBefore,after:skipAfter,status:skipAfter.mode==='coding'&&Math.abs(skipAfter.chairYawDegrees)<.01?'PASS':'FAIL'},navigation:{before:navBefore,settled:navSettled,reentryFrames:navFrames,after:navAfter,status:navAfter.mode==='coding'&&Math.abs(navAfter.chairYawDegrees)<.01?'PASS':'FAIL'}};
  a.renderFrame(0);const gl=a.renderer.getContext(),dbg=gl.getExtension('WEBGL_debug_renderer_info');
  const resources={uniqueGeometries:geometry.size,uniqueMaterials:materials.size,uniqueTextures:textures.size,geometryBufferBytes:geometryBytes,textures:texInfo,totalGpuLowerBoundBytes:geometryBytes+texInfo.reduce((n,t)=>n+t.mipmappedEstimateBytes,0),limitations:'Asset buffer + RGBA8/mipmap estimate only; excludes shadows, render targets, driver allocation, post-processing, overlapping replacements and quality derivatives.'};
  return {scope:'Actual Playwright Chromium using unchanged maker exported bytes and maker Three.js HTML with exposed references and unattended RAF disabled. Deterministic CPU skin deformation samples at 1/60 s; not physical-device or real-time FPS proof. No CharacterDirector/EntranceCoordinator mounted.',threeRevision:T.REVISION,loadedModels:window.playbackState.loadedModels,rendererMetrics:window.getRenderMetrics(),gpu:{renderer:gl.getParameter(gl.RENDERER),vendor:gl.getParameter(gl.VENDOR),unmaskedRenderer:dbg?gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL):null},skeletonBoneNames:skinned.flatMap(m=>m.skeleton.bones.map(b=>b.name)),handTriangleCounts:{L:handTriangles.L.length,R:handTriangles.R.length},desktop:desk,keyboard:keys,mouse,resources,clips,transitionEvidence,doorOwnership:{frameParent:frame.parent?.name,hingeParent:hinge.parent?.name,leafParent:leaf.parent?.name,roomMixerClipCount:window.playbackState.clips.filter(x=>x.target==='room').length,productionOwnerStatus:'NOT FOUND: no supplied production source writes Door_Hinge; no room-target clip is exported. EntranceCoordinator owns camera path only.'},doorSweep:{sampleHz:60,sweepDurationSec:doorDuration,cameraPathDurationSec:cameraDuration,cameraStartSec,totalSequenceDurationSec:totalSequenceDuration,measuredDirection:'negative local Y, 90 degree magnitude; positive concurrent sweep approached within 0.4 mm and negative concurrent sweep reached 0 mm, so the verified clearance schedule opens the door first while camera holds in the hallway, then starts the 5 s camera path',curve:'smoothstep over the first 2.5 s; hold at 90 degrees through the following 5 s EntranceCoordinator camera path',rows:door,minimumLeafFrameClearanceM:Math.min(...door.map(r=>r.leafFrame.minSurfaceDistanceM)),leafFrameIntersectionPairs:door.reduce((n,r)=>n+r.leafFrame.intersectionPairCount,0),minimumLeafCameraSurfaceGapM:Math.min(...door.map(r=>r.camera.minLeafSurfaceDistanceM)),minimumFrameCameraSurfaceGapM:Math.min(...door.map(r=>r.camera.minFrameSurfaceDistanceM)),minimumLeafCameraNearClipMarginM:Math.min(...door.map(r=>r.camera.leafNearClipMarginM)),minimumFrameCameraNearClipMarginM:Math.min(...door.map(r=>r.camera.frameNearClipMarginM)),nearPlaneLeafIntersections:door.filter(r=>r.camera.nearPlaneIntersectsLeaf).length,nearPlaneFrameIntersections:door.filter(r=>r.camera.nearPlaneIntersectsFrame).length}};
 });
 result.assetHashes=assetHashes;
 fs.writeFileSync(path.join(OUT,'browser-deformation-results.json'),JSON.stringify(result,null,2));

 const captureTargets=[
  {key:'desktop-home',preset:'desktop-home',width:1920,height:1080},
  {key:'mobile-home',preset:'mobile-home',width:720,height:1280},
  {key:'entry',preset:'entry',width:1920,height:1080},
  {key:'monitor-detail',preset:'monitor-detail',width:1920,height:1080},
  {key:'reverse-doorway',preset:'reverse-doorway',width:1920,height:1080},
  {key:'project-focus-pc',preset:'pc',width:1920,height:1080},
  {key:'project-focus-energy',preset:'energy',width:1920,height:1080},
  {key:'project-focus-scanner',preset:'scanner',width:1920,height:1080},
  {key:'project-focus-microphone',preset:'microphone',width:1920,height:1080},
  {key:'project-focus-about',preset:'about',width:1920,height:1080},
  {key:'project-focus-contact',preset:'contact',width:1920,height:1080},
  {key:'greeting-contact',preset:'desktop-home',width:1920,height:1080,clip:'greeting_nod',clipTime:.45},
  {key:'entry-door-closed',preset:'entry',width:1920,height:1080,doorAngle:0},
  {key:'entry-door-minus-45deg',preset:'entry',width:1920,height:1080,doorAngle:-Math.PI/4},
  {key:'entry-door-minus-90deg',preset:'entry',width:1920,height:1080,doorAngle:-Math.PI/2}
 ];
 const captureRows=[];
 for(const target of captureTargets){
  await page.setViewportSize({width:target.width,height:target.height});
  await page.evaluate(x=>{window.setCamera(x.preset);window.setDoorAngle(x.doorAngle??0);window.__audit.setClipTime(x.clip||'coding_idle',x.clipTime??0);window.__audit.renderFrame(0);},target);
  const state=await page.evaluate(()=>{const a=window.__audit,c=document.getElementById('webgl-canvas'),size=a.renderer.getDrawingBufferSize(new a.THREE.Vector2()),gl=a.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info'),lights=[];a.scene.traverse(o=>{if(o.isLight)lights.push({name:o.name,type:o.type,intensity:o.intensity,color:o.color?.getHexString()});});return{camera:{position:a.camera.position.toArray(),target:a.currentTarget.toArray(),fovDegrees:a.camera.fov,aspect:a.camera.aspect,near:a.camera.near,far:a.camera.far},viewport:{innerWidth:innerWidth,innerHeight:innerHeight,devicePixelRatio:devicePixelRatio,canvasCss:{width:c.getBoundingClientRect().width,height:c.getBoundingClientRect().height},canvasBackingPixels:[c.width,c.height],drawingBufferPixels:size.toArray()},renderer:{threeRevision:a.THREE.REVISION,rendererInfo:window.getRenderMetrics(),toneMapping:a.renderer.toneMapping,toneMappingExposure:a.renderer.toneMappingExposure,outputColorSpace:a.renderer.outputColorSpace,shadowMapEnabled:a.renderer.shadowMap.enabled,shadowMapType:a.renderer.shadowMap.type,preserveDrawingBuffer:true},lights,gpu:{renderer:gl.getParameter(gl.RENDERER),vendor:gl.getParameter(gl.VENDOR),unmaskedRenderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):null},loadedModels:window.playbackState.loadedModels};});
  const dataUrl=await page.evaluate(()=>document.getElementById('webgl-canvas').toDataURL('image/png'));
  if(!dataUrl.startsWith('data:image/png;base64,'))throw new Error('Canvas PNG capture failed: '+target.key);
  const canvasBytes=Buffer.from(dataUrl.slice(dataUrl.indexOf(',')+1),'base64');
  const outDir=path.join(REVIEW_CAPTURE_OUT,target.key);fs.mkdirSync(outDir,{recursive:true});
  const canvasPath=path.join(outDir,'webgl-canvas.png'),domPath=path.join(outDir,'dom-ui.png');fs.writeFileSync(canvasPath,canvasBytes);await page.screenshot({path:domPath});
  const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
  captureRows.push({key:target.key,method:'WebGL canvas.toDataURL PNG, preserveDrawingBuffer; no DOM overlay',domMethod:'Playwright full-page viewport screenshot containing DOM overlay and WebGL canvas',clip:target.clip||'coding_idle',clipTimeSec:target.clipTime??0,doorAngleRad:target.doorAngle??0,doorAngleDegrees:(target.doorAngle??0)*180/Math.PI,doorMagnitudeDegrees:Math.abs((target.doorAngle??0)*180/Math.PI),expectedPixels:[target.width,target.height],actualPixels:state.viewport.canvasBackingPixels,viewport:state.viewport,camera:state.camera,renderer:state.renderer,lights:state.lights,gpu:state.gpu,browser:{name:'Chromium',version:browser.version(),playwright:require('@playwright/test/package.json').version,os:os.version(),platform:os.platform(),deviceScaleFactor:1},network:{server:'localhost loopback; local workspace asset files',throttling:'none',cache:'warm same page after one initial asset load'},rendererTier:'standalone raw art harness; no C2 tier controller',loadedModels:state.loadedModels,loadedAssetHashes:assetHashes,files:{webglCanvas:{path:path.relative(DELIVERY_DIR,canvasPath).replaceAll('\\','/'),bytes:canvasBytes.length,sha256:hash(canvasBytes)},domUi:{path:path.relative(DELIVERY_DIR,domPath).replaceAll('\\','/'),bytes:fs.statSync(domPath).size,sha256:hash(fs.readFileSync(domPath))}},pixelDimensionStatus:state.viewport.canvasBackingPixels[0]===target.width&&state.viewport.canvasBackingPixels[1]===target.height?'PASS':'FAIL'});
 }
 fs.writeFileSync(path.join(REVIEW_CAPTURE_OUT,'index.json'),JSON.stringify({scope:'Actual raw canvas and DOM captures, separately hashed; all views use named CameraDirector presets. Pixel size reports drawing buffer and CSS viewport separately.',tool:{browser:browser.version(),threeRevision:result.threeRevision,playwright:require('@playwright/test/package.json').version,os:os.version()},reference:{path:'references/images/main-reference.png',sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,'references/images/main-reference.png'))).digest('hex')},assetHashes,captures:captureRows},null,2));
 const timings=[];
 for(const cfg of [{preset:'desktop-home',width:1920,height:1080},{preset:'mobile-home',width:720,height:1280}]){
  await page.setViewportSize({width:cfg.width,height:cfg.height});await page.evaluate(name=>window.setCamera(name),cfg.preset);
  const frames=await page.evaluate(async()=>{const a=window.__audit;const values=[];let last;for(let i=0;i<121;i++){const now=await new Promise(requestAnimationFrame);a.renderFrame(1/60);if(last!==undefined)values.push(now-last);last=now;}return {intervalsMs:values,metrics:window.getRenderMetrics()};});
  timings.push({...cfg,dpr:1,cache:'warm same browser context; no network throttling',tier:'maker raw harness; no C2 tier controls',...frames});
 }
 fs.writeFileSync(path.join(OUT,'browser-frame-diagnostic.json'),JSON.stringify({scope:'Bounded local headless warm RAF diagnostic, 120 intervals per viewport. No target-device/performance budget acceptance.',assetHashes,browser:browser.version(),os:os.version(),node:process.version,playwright:require('@playwright/test/package.json').version,runs:timings},null,2));
 console.log(JSON.stringify({browser:browser.version(),gpu:result.gpu,loadedModels:result.loadedModels,metrics:result.rendererMetrics,clips:result.clips.map(c=>({name:c.name,samples:c.rows.length,...c.summary})),doorSamples:result.doorSweep.rows.length},null,2));
} finally{
 fs.writeFileSync(path.join(OUT,'browser-console.json'),JSON.stringify({assetHashes,entries:logs},null,2));if(browser)await browser.close();server.close();
}
