import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const OUT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ROOT=path.resolve(OUT,'../..');
const DEP=path.resolve(process.env.FINISH_B1_DEPENDENCY_ROOT||path.join(ROOT,'app'));
const require=createRequire(path.join(DEP,'package.json'));
const {chromium}=require('@playwright/test');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const inherited=fs.readFileSync(path.join(OUT,'inputs/r6/FINISH-B1-R6/inputs/r5/FINISH-B1-R5/inputs/r4-02/inputs/r3/validator-logs/instrumented-maker-harness.html'),'utf8');
// Preserve the exact pinned R3 renderer, camera, lighting, animation state and HTML.
// The sole harness alteration remaps delivery URLs to hash-bound R6 inputs or the R7 candidate.
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/'){
    const variant=url.searchParams.get('variant');
    const prefix=variant==='R6'?'/deliveries/FINISH-B1-R7/inputs/r6/FINISH-B1-R6':'/deliveries/FINISH-B1-R7';
    res.writeHead(200,{'Content-Type':'text/html'});res.end(inherited.replaceAll('/deliveries/FINISH-B1-R3',prefix));return;
  }
  const base=url.pathname.startsWith('/app/node_modules/')?DEP:ROOT;
  const p=path.resolve(base,'.'+decodeURI(base===DEP?url.pathname.slice(4):url.pathname));
  if(!p.startsWith(base+path.sep)||!fs.existsSync(p)){res.writeHead(404);res.end();return;}
  res.writeHead(200,{'Content-Type':({'.js':'text/javascript','.glb':'model/gltf-binary','.png':'image/png'})[path.extname(p)]||'application/octet-stream'});fs.createReadStream(p).pipe(res);
});
const files=['room.glb','resident.glb','fixture.glb','group-b-props.glb','on-demand-projects.glb','textures/deskmat-topography.png','textures/monitor-wallpaper.png'];
const hashes=variant=>Object.fromEntries(files.map(f=>{const b=fs.readFileSync(path.join(OUT,variant==='R6'?'inputs/r6/FINISH-B1-R6/assets':'assets',f));return[f,{bytes:b.length,sha256:sha(b)}];}));
const profiles=[{key:'desktop-home',preset:'desktop-home',width:1920,height:1080,limit:120},{key:'mobile-home',preset:'mobile-home',width:720,height:1280,limit:80}];
const closeViews=[{key:'pc-glass-outside',width:1280,height:960,camera:{position:[0.55,1.18,-0.77],target:[0.928,1.00,-1.15],fov:48}},{key:'pc-glass-inside',width:1280,height:960,camera:{position:[1.07,1.05,-1.15],target:[0.928,1.05,-1.15],fov:80}},{key:'window-glass',width:1280,height:960,camera:{position:[-1.48,1.52,-0.17],target:[-2.145,1.55,-0.60],fov:48}}];
closeViews.push({key:'window-glass-outside',width:1280,height:960,camera:{position:[-2.58,1.62,-0.95],target:[-2.145,1.55,-0.60],fov:56}});
closeViews.push({key:'pc-glass-outside-base',width:1280,height:960,excludeOnDemand:true,camera:{position:[0.55,1.18,-0.77],target:[0.928,1.00,-1.15],fov:48}});
let browser;const result={command:'node deliveries/FINISH-B1-R7/scripts/verify-browser.mjs',scope:'Local Chromium, exact pinned Three r180 harness and matched R6/R7 asset captures; URL remap only. No production runtime/device/provider acceptance.',harnessSHA256:sha(Buffer.from(inherited)),assetHashes:{R6:hashes('R6'),R7:hashes('R7')},measurements:[],captures:[],console:[]};
try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=default','--enable-webgl']});
 Object.assign(result,{browser:browser.version(),playwright:require('@playwright/test/package.json').version,three:JSON.parse(fs.readFileSync(path.join(DEP,'node_modules/three/package.json'),'utf8')).version,node:process.version,dependencyRoot:DEP});
 for(const variant of ['R6','R7']){
  const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
  page.on('console',m=>result.console.push({variant,type:m.type(),text:m.text()}));page.on('pageerror',e=>result.console.push({variant,type:'pageerror',text:e.message}));
  const loads=[],pendingResponses=[];page.on('response',response=>{const url=response.url();if(/\.(glb|png)$/.test(new URL(url).pathname))pendingResponses.push((async()=>{const bytes=await response.body();loads.push({url,status:response.status(),bytes:bytes.length,sha256:sha(bytes)});})());});
  page.on('requestfailed',request=>result.console.push({variant,type:'requestfailed',url:request.url(),text:request.failure()?.errorText||'unknown'}));
  await page.goto(`http://127.0.0.1:${server.address().port}/?variant=${variant}`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.playbackState?.isReady&&window.__audit?.residentGroup,null,{timeout:30000});
  for(const profile of [...profiles,...closeViews]){
   await page.setViewportSize({width:profile.width,height:profile.height});
   const measurement=await page.evaluate(profile=>{
    const a=window.__audit,r=a.renderer,s=a.scene,c=a.camera;
    a.setClipTime('coding_idle',0);
    // Supplemental base-room view: preserve exact exports, hide only the named
    // on-demand effects root in all three variants. Budget profiles keep it visible.
    const effects=s.getObjectByName('Project_Effects_Root');if(effects)effects.visible=!profile.excludeOnDemand;
    if(profile.preset)window.setCamera(profile.preset);
    else{r.setPixelRatio(1);r.setSize(profile.width,profile.height,false);c.aspect=profile.width/profile.height;c.fov=profile.camera.fov;c.position.set(...profile.camera.position);a.currentTarget.set(...profile.camera.target);c.lookAt(a.currentTarget);c.updateProjectionMatrix();a.renderFrame(0);}
    const roots=s.children.filter(o=>o.type==='Group');const names=window.playbackState.loadedModels;
    const ownerOf=o=>{while(o){const i=roots.indexOf(o);if(i!==-1)return names[i];o=o.parent;}return 'unknown';};
    const before={frame:r.info.render.frame,calls:r.info.render.calls,autoReset:r.info.autoReset};
    const original=r.renderBufferDirect,calls=[];
    r.renderBufferDirect=function(...args){const obj=args[4],m=args[3],stack=new Error().stack.split('\n').slice(2,9),call={owner:ownerOf(obj),name:obj.name,material:m.name,pass:stack.some(x=>x.includes('renderTransmissionPass'))?'transmission':'main',flags:{transparent:m.transparent,opacity:m.opacity,transmission:m.transmission??0,side:m.side,forceSinglePass:m.forceSinglePass},stackFrames:stack,before:r.info.render.calls};const v=original.apply(this,args);call.after=r.info.render.calls;calls.push(call);return v;};
    try{a.renderFrame(0);}finally{r.renderBufferDirect=original;}
    s.updateMatrixWorld(true);
    const projectLocal=(nodeName,xyz)=>{const o=s.getObjectByName(nodeName);if(!o)return{missingNode:true};const v=c.position.clone().set(...xyz).applyMatrix4(o.matrixWorld).project(c);return{node:nodeName,x:Math.round((v.x+1)*profile.width/2),y:Math.round((1-v.y)*profile.height/2),inside:v.z>=-1&&v.z<=1&&Math.abs(v.x)<=1&&Math.abs(v.y)<=1};};
    const probe={};
    for(const [name,x,y,z] of [['hex-left',-.54,1.785,2.62],['hex-center',0,1.785,2.33],['hex-right',.54,1.785,2.62]])probe[name]=projectLocal('StaticBatch__Room_Root__Neon_PinkAccent',[x,z,-y]);
    for(const [name,node,xyz] of [
      ['hex-fit-left','StaticBatch__Room_Root__Neon_PinkAccent',[.15,2.05,-1.75]],['hex-fit-center','StaticBatch__Room_Root__Neon_PinkAccent',[.55,2.05,-1.75]],['hex-fit-right','StaticBatch__Room_Root__Neon_PinkAccent',[.95,2.05,-1.75]],
      ['shelf-plant','StaticBatch__Room_Root__Plant_CeramicWhite',[.65,1.85,-1.60]],['shelf-camera','StaticBatch__Room_Root__Monitor_BezelMatte',[.35,1.85,-1.60]],
      ['mini-controller','StaticBatch__Room_Root__Desk_IvoryTop',[.82,1.85,-1.75]],['mini-pc','StaticBatch__Room_Root__Monitor_BezelMatte',[.30,1.02,-1.10]],
      ['audio-console','StaticBatch__Room_Root__Desk_IvoryTop',[-.20,.82,-.70]],['microphone','StaticBatch__Room_Root__Chair_DarkMetal',[.35,1.10,-.90]],
      ['headset','StaticBatch__Room_Root__Monitor_BezelMatte',[.48,1.02,-.72]],['warm-lightbar','StaticBatch__Room_Root__Project_SolarYellow',[0,1.43,-1.32]],
      ['drawer-fit-left','StaticBatch__Room_Root__Desk_IvoryTop',[-.48,.56,-.78]],['drawer-fit-center','StaticBatch__Room_Root__Desk_IvoryTop',[-.10,.56,-.78]],['drawer-fit-right','StaticBatch__Room_Root__Desk_IvoryTop',[.28,.56,-.78]],
      ['console-fit-left','StaticBatch__Room_Root__Desk_IvoryTop',[-.65,.92,-.75]],['console-fit-center','StaticBatch__Room_Root__Desk_IvoryTop',[-.42,.92,-.75]],['console-fit-forward','StaticBatch__Room_Root__Desk_IvoryTop',[-.65,.92,-.95]],
      ['mic-fit-left','StaticBatch__Room_Root__Monitor_BezelMatte',[-.65,1.10,-.90]],['mic-fit-center','StaticBatch__Room_Root__Monitor_BezelMatte',[-.42,1.10,-.90]],
      ['speaker-left','StaticBatch__Room_Root__Monitor_BezelMatte',[-.68,.875,-1.175]],['speaker-right','StaticBatch__Room_Root__Monitor_BezelMatte',[.68,.875,-1.175]],
      ['speaker-fit-left','StaticBatch__Room_Root__Monitor_BezelMatte',[-.28,.90,-1.20]],['speaker-fit-right','StaticBatch__Room_Root__Monitor_BezelMatte',[.28,.90,-1.20]]
    ])probe[name]=projectLocal(node,xyz);
    probe.camera=projectLocal('StaticBatch__Room_Root__Monitor_BezelMatte',[-1.43,1.82,-1.56]);
    probe.pc=projectLocal('StaticBatch__Room_Root__Monitor_BezelMatte',[1.05,.855,-.887]);
    probe.controller=projectLocal('StaticBatch__Room_Root__Desk_IvoryTop',[1.985,1.72,-.68]);
    const panel=s.getObjectByName('pegboard_panel');if(panel){panel.geometry.computeBoundingBox();const b=panel.geometry.boundingBox,pts=[];for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z])pts.push(projectLocal('pegboard_panel',[x,y,z]));probe.pegboardPanelCorners=pts;probe.pegboardPanelFullyInside=pts.length===8&&pts.every(p=>p.inside);}else{probe.pegboardPanelCorners=[];probe.pegboardPanelFullyInside=false;}
    const controllerBox=(node,center,half)=>{const pts=[];for(const x of [center[0]-half[0],center[0]+half[0]])for(const y of [center[1]-half[1],center[1]+half[1]])for(const z of [center[2]-half[2],center[2]+half[2]])pts.push(projectLocal(node,[x,y,z]));return{corners:pts,fullyInside:pts.every(p=>p.inside)};};
    probe.pegboardControllerA=controllerBox('StaticBatch__Room_Root__Desk_IvoryTop',[1.7414,2.1145,-1.715],[.061,.051,.032]);probe.pegboardControllerB=controllerBox('StaticBatch__Room_Root__Desk_IvoryTop',[1.687,1.902,-1.715],[.061,.051,.032]);probe.pegboardControllersFullyInside=probe.pegboardControllerA.fullyInside&&probe.pegboardControllerB.fullyInside;
    probe.headset=projectLocal('StaticBatch__Room_Root__Desk_IvoryTop',[1.48,.775,-1.30]);
    const byPass={},byOwner={};for(const call of calls){byPass[call.pass]=(byPass[call.pass]||0)+call.after-call.before;byOwner[call.owner]=(byOwner[call.owner]||0)+call.after-call.before;}
    const lights=[];s.traverse(o=>{if(o.isLight)lights.push({name:o.name,type:o.type,color:o.color.toArray(),intensity:o.intensity,position:o.position.toArray(),distance:o.distance??null,castShadow:o.castShadow});});
    const materials=[];s.traverse(o=>{if(o.isMesh&&o.material?.name==='PC_TemperedGlass')materials.push({object:o.name,type:o.material.type,opacity:o.material.opacity,transmission:o.material.transmission??0,transparent:o.material.transparent,side:o.material.side});});
    const geometries=new Set(),textures=new Set();s.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);for(const mat of Array.isArray(o.material)?o.material:[o.material])for(const v of Object.values(mat))if(v?.isTexture)textures.add(v);}});
    let geometryBytes=0;for(const g of geometries)for(const attr of [...Object.values(g.attributes),g.index].filter(Boolean))geometryBytes+=(attr.isInterleavedBufferAttribute?attr.data.array:attr.array).byteLength;
    const textureRows=[...textures].map(t=>{const im=t.source?.data??t.image;return{name:t.name,width:im?.width??0,height:im?.height??0,mipmappedRGBA8EstimateBytes:Math.ceil((im?.width??0)*(im?.height??0)*4*(t.generateMipmaps?4/3:1))};});
    return{animationState:{clip:'coding_idle',seconds:0,paused:true},rendererInfo:{...r.info.render,memory:{...r.info.memory}},before,frameDelta:r.info.render.frame-before.frame,interceptedCalls:calls.length,byPass,byOwner,calls,loadedModels:names,camera:{position:c.position.toArray(),target:a.currentTarget.toArray(),fov:c.fov,aspect:c.aspect,near:c.near,far:c.far},renderer:{dpr:r.getPixelRatio(),toneMapping:r.toneMapping,exposure:r.toneMappingExposure,outputColorSpace:r.outputColorSpace,shadowEnabled:r.shadowMap.enabled},projectionProbe:probe,lights,glassMaterials:materials,resourceCensus:{uniqueGeometries:geometries.size,geometryAttributeIndexEstimateBytes:geometryBytes,textures:textureRows,assetDecodedEstimateBytes:geometryBytes+textureRows.reduce((n,t)=>n+t.mipmappedRGBA8EstimateBytes,0),scope:'Loaded asset attribute/index buffers and RGBA8 mipmapped texture estimate; excludes driver overhead, framebuffers and optional maps not yet mounted.'},webglRenderer:r.getContext().getParameter(r.getContext().RENDERER),userAgent:navigator.userAgent};
   },profile);
   const dest=path.join(OUT,'captures',variant,profile.key);fs.mkdirSync(dest,{recursive:true});
   const canvasURL=await page.evaluate(()=>document.getElementById('webgl-canvas').toDataURL('image/png'));
   fs.writeFileSync(path.join(dest,'webgl-canvas.png'),Buffer.from(canvasURL.split(',')[1],'base64'));
   const b=fs.readFileSync(path.join(dest,'webgl-canvas.png'));
   result.captures.push({variant,view:profile.key,file:path.relative(OUT,path.join(dest,'webgl-canvas.png')).replaceAll('\\','/'),sha256:sha(b),bytes:b.length,width:b.readUInt32BE(16),height:b.readUInt32BE(20),camera:measurement.camera});
   if(variant==='R7'&&profile.limit){
    measurement.frameSamples=await page.evaluate(async()=>{const a=window.__audit,gl=a.renderer.getContext();for(const acts of [a.residentActions,a.chairActions])acts.coding_idle.paused=false;for(let i=0;i<30;i++){await new Promise(requestAnimationFrame);a.renderFrame(1/60);gl.finish();}const samples=[];for(let i=0;i<180;i++){await new Promise(requestAnimationFrame);const start=performance.now();a.renderFrame(1/60);gl.finish();samples.push(performance.now()-start);}const sorted=[...samples].sort((a,b)=>a-b);return{warmupFrames:30,samplesMs:samples,medianMs:sorted[Math.floor(sorted.length*.5)],p95Ms:sorted[Math.floor(sorted.length*.95)],method:'After the matched still capture: CPU wall-clock duration of animated standalone renderFrame(1/60) plus blocking WebGL finish, scheduled on RAF; local browser only, not production/device timing qualification.'};});
   }
   result.measurements.push({variant,...profile,...measurement,budgetStatus:profile.limit?(measurement.rendererInfo.calls<=profile.limit?'PASS':'FAIL'):'NOT APPLICABLE'});
  }
  await Promise.all(pendingResponses);result.assetResponses??={};result.assetResponses[variant]=loads;
  result.transferSummary??={};result.transferSummary[variant]={requestCount:loads.length,totalResponseBytes:loads.reduce((n,x)=>n+x.bytes,0),allHTTP200:loads.every(x=>x.status===200),files:loads.map(x=>({path:new URL(x.url).pathname.split('/').slice(-1)[0],bytes:x.bytes,sha256:x.sha256,status:x.status}))};
  await page.close();
 }
 const checked=result.measurements.filter(x=>x.variant==='R7'&&x.limit);
 const failures=checked.filter(x=>x.budgetStatus!=='PASS'||x.rendererInfo.calls!==x.interceptedCalls||x.frameDelta!==1||x.byPass.transmission);
 const pegboardFailures=result.measurements.filter(x=>x.variant==='R7'&&['desktop-home','mobile-home'].includes(x.key)&&(!x.projectionProbe.pegboardPanelFullyInside||!x.projectionProbe.pegboardControllersFullyInside));
 result.exitCode=failures.length||pegboardFailures.length?1:0;
 fs.writeFileSync(path.join(OUT,'evidence/browser-results.json'),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({pegboardFailures:pegboardFailures.map(x=>({profile:x.key,panel:x.projectionProbe.pegboardPanelFullyInside,controllers:x.projectionProbe.pegboardControllersFullyInside})),browser:result.browser,profiles:result.measurements.filter(x=>x.limit).map(x=>({variant:x.variant,profile:x.key,calls:x.rendererInfo.calls,byPass:x.byPass,byOwner:x.byOwner,budgetStatus:x.budgetStatus})),captureCount:result.captures.length,exitCode:result.exitCode},null,2));process.exitCode=result.exitCode;
}finally{await browser?.close();server.close();}
