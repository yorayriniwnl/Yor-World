import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const OUT=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(OUT,'../../../../..');
const require=createRequire(path.join(ROOT,'app/package.json'));
const {chromium}=require('@playwright/test');
const source=fs.readFileSync(path.join(ROOT,'deliveries/FINISH-B1-R2/scripts/test-browser-playback.mjs'),'utf8');
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
  const chair=fix.getObjectByName('chair-root'),base=fix.getObjectByName('chair-base'),root=res.getObjectByName('resident');
  const initialRoot=root.getWorldPosition(new T.Vector3()),initialBase=base.getWorldPosition(new T.Vector3());
  function setClip(name,t){rm.stopAllAction();cm.stopAllAction();for(const [m,acts]of [[rm,a.residentActions],[cm,a.chairActions]]){acts[name].reset().setLoop(T.LoopOnce,1).play();acts[name].clampWhenFinished=true;m.setTime(t);}scene.updateMatrixWorld(true);for(const m of skinned)m.skeleton.update();}
  function sample(){
   const hands={L:new T.Box3(),R:new T.Box3()},feet={L:new T.Box3(),R:new T.Box3()},pelvis=new T.Box3();let desktopVertexHits=0;
   for(const {m,labels}of vertexGroups)for(let i=0;i<labels.length;i++){
    m.getVertexPosition(i,v).applyMatrix4(m.matrixWorld);const bone=labels[i];
    if(v.x>desk.min.x+.0001&&v.x<desk.max.x-.0001&&v.y>desk.min.y+.0001&&v.y<desk.max.y-.0001&&v.z>desk.min.z+.0001&&v.z<desk.max.z-.0001)desktopVertexHits++;
    for(const side of ['L','R']){if(['hand','thumb','index','fingers'].some(p=>bone===p+side))hands[side].expandByPoint(v);if(bone==='foot'+side)feet[side].expandByPoint(v);}
    if(bone==='pelvis')pelvis.expandByPoint(v);
   }
   const vec=n=>res.getObjectByName(T.PropertyBinding.sanitizeNodeName(n)).getWorldPosition(new T.Vector3()).toArray();
   const bjson=b=>({min:b.min.toArray(),max:b.max.toArray()});
   chair.getWorldQuaternion(q);const yaw=new T.Euler().setFromQuaternion(q,'YXZ').y*180/Math.PI;
   return {chairYawDegrees:yaw,root:root.getWorldPosition(new T.Vector3()).toArray(),rootDriftM:root.getWorldPosition(new T.Vector3()).distanceTo(initialRoot),baseDriftM:base.getWorldPosition(new T.Vector3()).distanceTo(initialBase),hands:{L:bjson(hands.L),R:bjson(hands.R)},feet:{L:bjson(feet.L),R:bjson(feet.R)},pelvis:bjson(pelvis),wristL:vec('hand.L'),wristR:vec('hand.R'),desktopVertexHits,handFrontGapM:Math.min(hands.L.min.z,hands.R.min.z)-desk.max.z,handLKeyAabbDistanceM:keys.distanceToPoint(hands.L.getCenter(new T.Vector3())),handRKeyAabbDistanceM:keys.distanceToPoint(hands.R.getCenter(new T.Vector3())),handRMouseAabbDistanceM:mouse.distanceToPoint(hands.R.getCenter(new T.Vector3()))};
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
  return {scope:'Actual Playwright Chromium using unchanged maker exported bytes and maker Three.js HTML with exposed references and unattended RAF disabled. Deterministic CPU skin deformation samples at 1/60 s; not physical-device or real-time FPS proof. No CharacterDirector/EntranceCoordinator mounted.',threeRevision:T.REVISION,loadedModels:window.playbackState.loadedModels,rendererMetrics:window.getRenderMetrics(),gpu:{renderer:gl.getParameter(gl.RENDERER),vendor:gl.getParameter(gl.VENDOR),unmaskedRenderer:dbg?gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL):null},desktop:desk,keyboard:keys,mouse,resources,clips,doorSweep:{sampleHz:60,durationSec:2.5,rows:door,clearanceStatus:'NOT RUN: absent candidate camera crossing timeline/frustum collision oracle; these panel AABBs alone do not prove frame/camera clearance.'}};
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
