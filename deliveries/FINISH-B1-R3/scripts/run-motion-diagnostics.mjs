import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const SCRIPT_DIR=path.dirname(fileURLToPath(import.meta.url));
const DELIVERY_DIR=path.resolve(SCRIPT_DIR,'..');
const OUT=path.join(DELIVERY_DIR,'validator-logs');
const ROOT=path.resolve(DELIVERY_DIR,'../..');
fs.mkdirSync(OUT,{recursive:true});
const require=createRequire(path.join(ROOT,'app/package.json'));
const {chromium}=require('@playwright/test');
const source=fs.readFileSync(path.join(DELIVERY_DIR,'scripts/test-browser-playback.mjs'),'utf8').replace(/\r\n/g,'\n');
let html=source.slice(source.indexOf('const HTML_CONTENT = `')+22,source.indexOf('`;\n\nfunction createServer()'));
// Observability-only extraction: use maker HTML unchanged except exposing existing objects
// and disabling the unattended RAF loop while deterministic clip samples run.
html=html.replace('init().then(() => {\n      animate();\n    });',`window.__audit={THREE,scene,camera,renderer,renderFrame};
    init().then(() => {Object.assign(window.__audit,{roomGroup,residentGroup,fixtureGroup,residentMixer,chairMixer,residentActions,chairActions,doorHingeNode});});`);
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
 await page.goto('http://127.0.0.1:'+server.address().port+'/index.html');
 await page.waitForFunction(()=>window.playbackState?.isReady&&window.__audit.residentGroup, null,{timeout:30000});
 const result=await page.evaluate(()=>{
  const a=window.__audit,T=a.THREE;const v=new T.Vector3(),q=new T.Quaternion();
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
  const surfaceObjects={keycaps:surfaceData(scene.getObjectByName('keycaps_main')),keyboard:surfaceData(scene.getObjectByName('keyboard_body')),mouse:surfaceData(scene.getObjectByName('mouse_body')),mouseWheel:surfaceData(scene.getObjectByName('mouse_wheel')),desk:surfaceData(scene.getObjectByName('desk_top')),floor:surfaceData(scene.getObjectByName('floor_main'))};
  function surfaceMetric(side,target){
   const sd=surfaceObjects[target];let best=Infinity,pairs=0,intersections=0;
   for(const item of handTriangles[side]){
    const p=worldPositions.get(item.m),A=new T.Triangle(p[item.tri[0]],p[item.tri[1]],p[item.tri[2]]),abox=new T.Box3().setFromPoints([A.a,A.b,A.c]);
    for(const other of sd.triangles){if(boxDistanceSq(abox,other.box)>best)continue;pairs++;const d=triangleDistanceSq(A,other.tri);if(d<best)best=d;if(d<1e-12)intersections++;}
   }
   let inside=0,maxDepth=0;const local=new T.Vector3(),bb=sd.g.boundingBox,positions=[];
   for(const {m,labels} of vertexGroups){
    const world=worldPositions.get(m);
    for(let i=0;i<labels.length;i++)if(handNames[side].has(labels[i])){
     sd.obj.worldToLocal(local.copy(world[i]));
     const dx=Math.min(local.x-bb.min.x,bb.max.x-local.x),dy=Math.min(local.y-bb.min.y,bb.max.y-local.y),dz=Math.min(local.z-bb.min.z,bb.max.z-local.z),depth=Math.min(dx,dy,dz);
     if(depth>0.00001){inside++;maxDepth=Math.max(maxDepth,depth);}
    }
   }
   return {minTriangleSurfaceDistanceM:Math.sqrt(best),penetratingVerticesInsideActualBox:inside,maxInwardDepthEstimateM:maxDepth,trianglePairsWithinBestBound:pairs,surfaceIntersectionPairCount:intersections,contactWithin10mm:Math.sqrt(best)<=0.01};
  }
  function surfaceMetricForEntries(entries,target){
   const sd=target.obj?target:surfaceObjects[target];let best=Infinity,pairs=0,intersections=0;
   for(const item of entries){const p=worldPositions.get(item.m),A=new T.Triangle(p[item.tri[0]],p[item.tri[1]],p[item.tri[2]]),abox=new T.Box3().setFromPoints([A.a,A.b,A.c]);for(const other of sd.triangles){if(boxDistanceSq(abox,other.box)>best)continue;pairs++;const d=triangleDistanceSq(A,other.tri);if(d<best)best=d;if(d<1e-12)intersections++;}}
   const ids=new Map();for(const item of entries){let set=ids.get(item.m);if(!set){set=new Set();ids.set(item.m,set);}for(const i of item.tri)set.add(i);}
   let inside=0,maxDepth=0;const local=new T.Vector3(),bb=sd.g.boundingBox;
   for(const [m,set]of ids){const pos=worldPositions.get(m);for(const i of set){sd.obj.worldToLocal(local.copy(pos[i]));const d=Math.min(local.x-bb.min.x,bb.max.x-local.x,local.y-bb.min.y,bb.max.y-local.y,local.z-bb.min.z,bb.max.z-local.z);if(d>0.00001){inside++;maxDepth=Math.max(maxDepth,d);}}}
   return {minTriangleSurfaceDistanceM:Number.isFinite(best)?Math.sqrt(best):null,penetratingVerticesInsideActualBox:inside,maxInwardDepthEstimateM:maxDepth,trianglePairsWithinBestBound:pairs,surfaceIntersectionPairCount:intersections};
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
  const hinge=a.doorHingeNode,leaf=scene.getObjectByName('Door_Leaf'),door=[];
  for(let i=0;i<=150;i++){const t=i/60,u=t/2.5,yaw=Math.PI/2*(3*u*u-2*u*u*u);hinge.rotation.y=yaw;scene.updateMatrixWorld(true);const panel=box('Door_Leaf');door.push({t,yawDegrees:yaw*180/Math.PI,panelBounds:{min:panel.min.toArray(),max:panel.max.toArray()},panelWorldCenter:panel.getCenter(new T.Vector3()).toArray()});}
  a.renderFrame(0);const gl=a.renderer.getContext(),dbg=gl.getExtension('WEBGL_debug_renderer_info');
  const resources={uniqueGeometries:geometry.size,uniqueMaterials:materials.size,uniqueTextures:textures.size,geometryBufferBytes:geometryBytes,textures:texInfo,totalGpuLowerBoundBytes:geometryBytes+texInfo.reduce((n,t)=>n+t.mipmappedEstimateBytes,0),limitations:'Asset buffer + RGBA8/mipmap estimate only; excludes shadows, render targets, driver allocation, post-processing, overlapping replacements and quality derivatives.'};
  return {scope:'Actual Playwright Chromium using unchanged maker exported bytes and maker Three.js HTML with exposed references and unattended RAF disabled. Deterministic CPU skin deformation samples at 1/60 s; not physical-device or real-time FPS proof. No CharacterDirector/EntranceCoordinator mounted.',threeRevision:T.REVISION,loadedModels:window.playbackState.loadedModels,rendererMetrics:window.getRenderMetrics(),gpu:{renderer:gl.getParameter(gl.RENDERER),vendor:gl.getParameter(gl.VENDOR),unmaskedRenderer:dbg?gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL):null},skeletonBoneNames:skinned.flatMap(m=>m.skeleton.bones.map(b=>b.name)),handTriangleCounts:{L:handTriangles.L.length,R:handTriangles.R.length},desktop:desk,keyboard:keys,mouse,resources,clips,doorSweep:{sampleHz:60,durationSec:2.5,rows:door,clearanceStatus:'NOT RUN: absent candidate camera crossing timeline/frustum collision oracle; these panel AABBs alone do not prove frame/camera clearance.'}};
 });
 fs.writeFileSync(path.join(OUT,'browser-deformation-results.json'),JSON.stringify(result,null,2));
 const timings=[];
 for(const cfg of [{preset:'desktop-home',width:1920,height:1080},{preset:'mobile-home',width:720,height:1280}]){
  await page.setViewportSize({width:cfg.width,height:cfg.height});await page.evaluate(name=>window.setCamera(name),cfg.preset);
  const frames=await page.evaluate(async()=>{const a=window.__audit;const values=[];let last;for(let i=0;i<121;i++){const now=await new Promise(requestAnimationFrame);a.renderFrame(1/60);if(last!==undefined)values.push(now-last);last=now;}return {intervalsMs:values,metrics:window.getRenderMetrics()};});
  timings.push({...cfg,dpr:1,cache:'warm same browser context; no network throttling',tier:'maker raw harness; no C2 tier controls',...frames});
 }
 fs.writeFileSync(path.join(OUT,'browser-frame-diagnostic.json'),JSON.stringify({scope:'Bounded local headless warm RAF diagnostic, 120 intervals per viewport. No target-device/performance budget acceptance.',browser:browser.version(),os:os.version(),node:process.version,playwright:require('@playwright/test/package.json').version,runs:timings},null,2));
 console.log(JSON.stringify({browser:browser.version(),gpu:result.gpu,loadedModels:result.loadedModels,metrics:result.rendererMetrics,clips:result.clips.map(c=>({name:c.name,samples:c.rows.length,...c.summary})),doorSamples:result.doorSweep.rows.length},null,2));
} finally{
 fs.writeFileSync(path.join(OUT,'browser-console.json'),JSON.stringify(logs,null,2));if(browser)await browser.close();server.close();
}
