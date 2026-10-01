const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module'),{pathToFileURL}=require('node:url');
const app=process.env.G1_AUDIT_APP,req=createRequire(path.join(app,'package.json'));
const THREE=req('three'),ts=req('typescript');
const loaded={};
function load(name,overrides={}){
 if(loaded[name]&&!Object.keys(overrides).length)return loaded[name];
 const source=fs.readFileSync(path.join(app,'src/features/world',name+'.ts'),'utf8');
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const m={exports:{}};const localRequire=id=>overrides[id]|| (id.startsWith('./')?load(id.slice(2)):req(id));
 new Function('require','exports','module',code)(localRequire,m.exports,m);
 if(!Object.keys(overrides).length)loaded[name]=m.exports;return m.exports;
}
global.self=globalThis;
// Texture pixels are irrelevant to graph/mixer probes. Real embedded texture decoding is covered by the browser run.
global.createImageBitmap=async()=>({width:1,height:1,close(){}});
global.ProgressEvent=class extends Event {constructor(type,init){super(type);Object.assign(this,init)}};
const rec={node:process.version,textureDecoding:'stubbed only in this Node graph/mixer probe; production browser run decodes actual images',cases:{}};
(async()=>{
 const {GLTFLoader}=await import(pathToFileURL(req.resolve('three/examples/jsm/loaders/GLTFLoader.js')));
 const loader=new GLTFLoader();async function asset(n){const b=fs.readFileSync(path.join(app,'public/models',n+'.glb'));return loader.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')}
 const {integrateScene}=load('SceneIntegrator'),{CharacterDirector}=load('CharacterDirector');
 const inputs=await Promise.all(['room-blockout','avatar-proof','fixture-proof'].map(asset));
 const integrated=integrateScene(...inputs);const s=integrated;
 const director=new CharacterDirector(s.avatarMixer,s.chairMixer,s.avatarActions,s.chairActions,s.bodyTurn,s.chairRoot);
 const pose=()=>{s.scene.updateMatrixWorld(true);return Object.fromEntries(s.residentBody.skeleton.bones.map(b=>[b.name,[...b.position.toArray(),...b.quaternion.toArray()]]))};
 const before=pose();director.advance(0.37);const after=pose();
 const poseDiff=(a,b)=>Object.keys(a).reduce((max,k)=>Math.max(max,...a[k].map((v,i)=>Math.abs(v-b[k][i]))),0);
 rec.cases.initialIdle={diagnostics:director.getDiagnostics(),avatarScheduled:s.avatarActions.coding_idle.isScheduled(),chairScheduled:s.chairActions.coding_idle.isScheduled(),maxBoneTransformDelta:poseDiff(before,after)};
 director.playGreeting();director.advance(4.1);const returned=pose();director.advance(0.37);rec.cases.idleAfterGreeting={avatarScheduled:s.avatarActions.coding_idle.isScheduled(),chairScheduled:s.chairActions.coding_idle.isScheduled(),maxBoneTransformDelta:poseDiff(returned,pose())};
 const baseline=s.resident.getWorldPosition(new THREE.Vector3()).clone(),chairBase=s.chairRoot.getWorldPosition(new THREE.Vector3()).clone();let maxRootDrift=0,maxPairedYawError=0;const samples=[];
 for(let round=0;round<20;round++){
  const rev1=director.playGreeting(),rev2=director.playGreeting();
  for(let f=0;f<241;f++){
   director.advance(1/60);s.scene.updateMatrixWorld(true);
   maxRootDrift=Math.max(maxRootDrift,s.resident.getWorldPosition(new THREE.Vector3()).distanceTo(baseline),s.chairRoot.getWorldPosition(new THREE.Vector3()).distanceTo(chairBase));
   maxPairedYawError=Math.max(maxPairedYawError,Math.abs(director.getBodyYawDeg()-director.getChairYawDeg()));
   if(round===0&&[0,35,71,107,143,179,240].includes(f))samples.push(director.getDiagnostics());
  }
  if(round===0)rec.cases.doubleGreet={revision1:rev1,revision2:rev2};
 }
 const counts={};s.scene.traverse(x=>counts[x.name]=(counts[x.name]||0)+1);
 rec.cases.realScene={nodeCounts:s.nodeCounts,actualNameCounts:Object.fromEntries(['desk','resident','resident-body','chair-root','chair-base','fixture-static'].map(n=>[n,counts[n]||0])),residentPosition:baseline.toArray(),chairPosition:chairBase.toArray(),maxRootDrift,maxPairedYawError,cycles:20,samples};
 director.playGreeting();director.advance(1.4);const t=performance.now();director.settle();const elapsed=performance.now()-t;director.advance(5);rec.cases.instantSettlement={elapsedMs:elapsed,late:director.getDiagnostics()};
 const {CAMERA_PRESETS}=load('CameraDirector');const camera=new THREE.PerspectiveCamera(60,16/9,.05,30);camera.position.fromArray(CAMERA_PRESETS['home-desktop'].position);
 const containingMeshes=[];s.scene.traverse(x=>{if(x.isMesh&&new THREE.Box3().setFromObject(x).containsPoint(camera.position))containingMeshes.push(x.name)});
 rec.cases.homeCamera={position:camera.position.toArray(),containingMeshes};
 // Deterministic adapter probe of disposed runtime callbacks. No delivery source edits.
 let loads=[];class FakeLoader {loadAsync(url){return new Promise((resolve,reject)=>loads.push({url,resolve,reject}))}}
 let disposeCount=0;
 class FakeRenderer {constructor(){}setPixelRatio(){}getContext(){return {getExtension(){return null},getParameter(){return 'test'}}}shadowMap={};dispose(){disposeCount++}setSize(){}}
 const originalWindow=global.window;global.window={devicePixelRatio:1,innerWidth:1440,innerHeight:900};global.cancelAnimationFrame=()=>{};
 const runtimeModule=load('WorldRuntime',{'three':{...THREE,WebGLRenderer:FakeRenderer},'three/examples/jsm/loaders/GLTFLoader.js':{GLTFLoader:FakeLoader}});
 let errorCalls=0,readyCalls=0;const errors=[];const runtime=new runtimeModule.WorldRuntime({canvas:{parentElement:{clientWidth:1440,clientHeight:900}},onReady:()=>readyCalls++,onError:e=>{errorCalls++;errors.push(e.message)}});
 runtime.dispose();loads[0].reject(new Error('AUDITOR delayed rejection after disposal'));loads[1].resolve(inputs[1]);loads[2].resolve(inputs[2]);await new Promise(r=>setTimeout(r,0));
 rec.cases.staleErrorCallback={disposedBeforeReject:true,disposeCount,errorCalls,readyCalls,errors};global.window=originalWindow;
 fs.writeFileSync(path.join(__dirname,'real-asset-results.json'),JSON.stringify(rec,null,2)+'\n');console.log(JSON.stringify(rec,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
