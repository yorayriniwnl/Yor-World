// Auditor-only harness. Exercises the unmodified production build through browser APIs.
const fs = require('node:fs');
const path = require('node:path');
const {createRequire} = require('node:module');
const app = process.env.G1_AUDIT_APP;
const req = createRequire(path.join(app, 'package.json'));
const {chromium} = req('@playwright/test');
const out = __dirname;
const base = process.env.G1_AUDIT_URL || 'http://127.0.0.1:3197';
const channel = process.env.G1_AUDIT_CHANNEL || 'chrome';
const suffix = process.env.G1_AUDIT_SUFFIX || '';
const filter = process.env.G1_AUDIT_FILTER ? new RegExp(process.env.G1_AUDIT_FILTER) : null;
const chunks = fs.readdirSync(path.join(app,'.next/static/chunks'));
const worldChunk = chunks.find(n => n.endsWith('.js') && fs.readFileSync(path.join(app,'.next/static/chunks',n),'utf8').includes('Simulated WebGL Renderer Context Failure'));
const results = {channel,base,worldChunk,started:new Date().toISOString(),cases:[]};
let browser;
function instrument() {
  const a = window.__hostile = {raf:new Map(),rafCalls:0,rafFired:0,intervals:new Map(),listeners:[],gl:[],audio:0,draws:0,throwDraws:0};
  const raf=requestAnimationFrame, cancel=cancelAnimationFrame;
  window.requestAnimationFrame = function(fn) {let id=raf.call(window,t=>{a.raf.delete(id);a.rafFired++;fn(t)});a.raf.set(id,new Error().stack);a.rafCalls++;return id;};
  window.cancelAnimationFrame = function(id){a.raf.delete(id);return cancel.call(window,id);};
  const si=setInterval, ci=clearInterval;
  window.setInterval = function(fn,ms,...args){let id=si.call(window,fn,ms,...args);a.intervals.set(id,{ms,stack:new Error().stack});return id;};
  window.clearInterval = function(id){a.intervals.delete(id);return ci.call(window,id);};
  const add=EventTarget.prototype.addEventListener,remove=EventTarget.prototype.removeEventListener;
  const types=['resize','keydown','visibilitychange','pagehide','webglcontextlost','webglcontextrestored'];
  EventTarget.prototype.addEventListener=function(type,fn,opts){if(types.includes(type)&&!a.listeners.some(x=>x.target===this&&x.type===type&&x.fn===fn&&x.active)){a.listeners.push({target:this,type,fn,active:true,stack:new Error().stack})}return add.call(this,type,fn,opts);};
  EventTarget.prototype.removeEventListener=function(type,fn,opts){for(const x of a.listeners)if(x.target===this&&x.type===type&&x.fn===fn)x.active=false;return remove.call(this,type,fn,opts);};
  const get=HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext=function(type,...args){const gl=get.call(this,type,...args);if(gl&&/webgl/.test(type)&&!a.gl.some(x=>x.context===gl)){
    const row={canvas:this,context:gl,resources:{},deleted:{},created:{}};a.gl.push(row);
    for(const kind of ['Buffer','Texture','Program','Framebuffer','Renderbuffer','VertexArray','Shader']){
      row.resources[kind]=new Set();row.created[kind]=0;row.deleted[kind]=0;
      const create=gl['create'+kind],del=gl['delete'+kind];
      if(create)gl['create'+kind]=function(...arg){const obj=create.apply(this,arg);if(obj){row.resources[kind].add(obj);row.created[kind]++;}return obj;};
      if(del)gl['delete'+kind]=function(obj){if(row.resources[kind].delete(obj))row.deleted[kind]++;return del.call(this,obj);};
    }
    for(const method of ['drawElements','drawArrays']){const draw=gl[method];gl[method]=function(...arg){a.draws++;if(a.throwDraws>0){a.throwDraws--;throw new Error('AUDITOR injected post-ready draw failure')}return draw.apply(this,arg)};}
  }return gl;};
  if(window.AudioContext){const AC=window.AudioContext;window.AudioContext=new Proxy(AC,{construct(target,args){a.audio++;return Reflect.construct(target,args)}});}
  a.snapshot=()=>({rafPending:a.raf.size,rafCalls:a.rafCalls,rafFired:a.rafFired,intervals:[...a.intervals.values()].map(x=>x.ms),listeners:a.listeners.filter(x=>x.active).map(x=>({type:x.type,target:x.target===window?'window':x.target===document?'document':x.target.tagName||'other'})),contexts:a.gl.map(x=>({connected:x.canvas.isConnected,lost:x.context.isContextLost(),live:Object.fromEntries(Object.entries(x.resources).map(([k,s])=>[k,s.size])),created:x.created,deleted:x.deleted})),audio:a.audio,draws:a.draws});
}
async function snap(page){return page.evaluate(()=>window.__hostile.snapshot());}
async function diag(page){return page.getByTestId('world-diagnostics').evaluate(e=>JSON.parse(e.textContent)).catch(()=>null);}
async function enter(page, double=false){await page.locator('[data-testid="studio-disclosure"] summary').click();await page.getByTestId('enter-studio-btn').evaluate((el,d)=>{el.click();if(d)el.click()},double);}
async function ready(page){await page.getByTestId('diagnostics-toggle-btn').click();await page.waitForFunction(()=>{const e=document.querySelector('[data-testid="world-diagnostics"]');return e&&JSON.parse(e.textContent).residentCount===1},{},{timeout:25000});}
async function run(name,fn,opts={}){
  if(filter && !filter.test(name))return;
  const context=await browser.newContext({viewport:{width:1440,height:900},...opts});await context.addInitScript(instrument);
  const page=await context.newPage();page.setDefaultTimeout(8000);
  const row={name,requests:[],pageErrors:[],consoleErrors:[]};
  page.on('request',r=>row.requests.push({url:r.url(),method:r.method()}));
  page.on('pageerror',e=>row.pageErrors.push(e.message));page.on('console',m=>{if(m.type()==='error')row.consoleErrors.push(m.text())});
  try{row.observed=await fn(page,context,row);row.executed=true;}catch(e){row.harnessError=String(e.stack);row.executed=false;}
  await page.screenshot({path:path.join(out,channel+'-'+name+'.png'),fullPage:true}).catch(()=>{});
  row.final=await snap(page).catch(()=>null);results.cases.push(row);
  fs.writeFileSync(path.join(out,channel+suffix+'-hostile-results.json'),JSON.stringify(results,null,2)+'\n');
  console.log(name,JSON.stringify(row.observed||row.harnessError));await context.close();
}
async function delayAsset(page,asset='room-blockout'){
  let release;const gate=new Promise(r=>release=r);let arrived;const started=new Promise(r=>arrived=r);
  await page.route('**/models/'+asset+'.glb',async route=>{arrived();await gate;await route.continue().catch(()=>{})});
  return {release,started};
}
async function navProjects(page){await page.locator('a[href="/projects"]').first().click();await page.waitForURL('**/projects');}
(async()=>{
 browser=await chromium.launch({channel,headless:true});results.browserVersion=browser.version();
 await run('double-enter-and-settlement',async page=>{
  await page.goto(base);const pre=await snap(page);await enter(page,true);await ready(page);const entered=await diag(page);
  await page.getByTestId('greet-resident-btn').evaluate(el=>{el.click();el.click()});await page.waitForTimeout(850);const greeted=await diag(page);
  const escape=await page.evaluate(()=>{const t=performance.now();window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));return {elapsed:performance.now()-t}});await page.waitForTimeout(150);const escaped=await diag(page);
  await page.getByTestId('greet-resident-btn').click();await page.waitForTimeout(850);await page.getByTestId('skip-motion-btn').click();await page.waitForTimeout(100);const skipped=await diag(page);
  const beforeExit=await snap(page);await page.getByTestId('exit-studio-btn').click();await page.waitForTimeout(250);const afterExit=await snap(page);
  await enter(page);await ready(page);const second=await snap(page);await page.getByTestId('exit-studio-btn').click();await page.waitForTimeout(250);
  return {pre,entered,greeted,escape,escaped,skipped,beforeExit,afterExit,second,afterSecondExit:await snap(page)};
 });
 await run('loading-escape-skip-late-success',async page=>{
  const hold=await delayAsset(page);await page.goto(base);await enter(page);await hold.started;await page.getByTestId('diagnostics-toggle-btn').click();await page.keyboard.press('Escape');await page.getByTestId('skip-motion-btn').click();
  await page.waitForTimeout(16000);const stillWaiting={diag:await diag(page),retry:await page.getByTestId('fallback-retry-btn').count(),canvas:await page.getByTestId('world-canvas').count(),semantic:await page.locator('h1').innerText()};
  hold.release();await page.waitForFunction(()=>JSON.parse(document.querySelector('[data-testid="world-diagnostics"]').textContent).residentCount===1);return {stillWaiting,late:await diag(page)};
 });
 await run('loading-exit-late-success',async page=>{
  const hold=await delayAsset(page);await page.goto(base);await enter(page);await hold.started;await page.getByTestId('exit-studio-btn').click();const exited=await snap(page);hold.release();await page.waitForTimeout(1800);return {exited,late:await snap(page),canvas:await page.getByTestId('world-canvas').count(),fallback:await page.getByTestId('world-fallback-banner').count()};
 });
 await run('loading-route-late-rejection',async page=>{
  let release,arrived;const gate=new Promise(r=>release=r),started=new Promise(r=>arrived=r);
  await page.route('**/models/avatar-proof.glb',async route=>{arrived();await gate;await route.fulfill({status:404,body:'missing'}).catch(()=>{})});
  await page.goto(base);await enter(page);await started;await navProjects(page);release();await page.waitForTimeout(1500);return {url:page.url(),h1:await page.locator('h1').innerText(),state:await snap(page)};
 });
 for(const mode of ['missing','corrupt']) await run('asset-'+mode+'-retry',async page=>{
  await page.route('**/models/avatar-proof.glb',route=>route.fulfill({status:mode==='missing'?404:200,contentType:'model/gltf-binary',body:mode==='missing'?'missing':Buffer.from('glTFcorrupt and truncated')}));
  await page.goto(base);await enter(page);await page.getByTestId('world-fallback-banner').waitFor();const failure={text:await page.getByTestId('world-fallback-banner').innerText(),retry:await page.getByTestId('fallback-retry-btn').count(),state:await snap(page),h1:await page.locator('h1').innerText()};
  await page.unroute('**/models/avatar-proof.glb');await page.getByTestId('fallback-dismiss-btn').click();await enter(page);await ready(page);return {failure,reentered:await diag(page),reenteredState:await snap(page)};
 });
 await run('context-loss-after-greet',async page=>{
  await page.goto(base);await enter(page);await ready(page);await page.getByTestId('greet-resident-btn').click();await page.waitForTimeout(850);
  await page.evaluate(()=>{window.__hostile.loseExtension=window.__hostile.gl[0].context.getExtension('WEBGL_lose_context');window.__hostile.loseExtension.loseContext()});await page.waitForTimeout(450);
  const lost={diag:await diag(page),state:await snap(page),fallback:await page.getByTestId('world-fallback-banner').count(),retry:await page.getByTestId('fallback-retry-btn').count(),h1:await page.locator('h1').innerText()};
  await page.screenshot({path:path.join(out,channel+'-context-loss-blank.png'),fullPage:true});
  await page.evaluate(()=>window.__hostile.loseExtension.restoreContext());await page.waitForTimeout(700);return {lost,afterBrowserRestore:await snap(page)};
 });
 await run('post-ready-render-exception',async page=>{
  await page.goto(base);await enter(page);await ready(page);await page.evaluate(()=>window.__hostile.throwDraws=3);await page.waitForTimeout(600);return {diag:await diag(page),fallback:await page.getByTestId('world-fallback-banner').count(),state:await snap(page)};
 });
 await run('greet-preference-hide-resize-rotate',async page=>{
  await page.goto(base);await enter(page);await ready(page);await page.getByTestId('greet-resident-btn').click();await page.waitForTimeout(750);const beforeRM=await diag(page);
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(250);const osRM={matches:await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),diag:await diag(page)};
  await page.getByTestId('reduced-motion-toggle-btn').click();await page.waitForTimeout(200);const uiRM=await diag(page);
  const beforeHide=await snap(page);await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,get:()=> 'hidden'});Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));});
  await page.waitForTimeout(350);const afterHide={state:await snap(page),diag:await diag(page)};
  await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,get:()=> 'visible'});Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));});
  for(const [width,height] of [[390,844],[844,390],[380,800],[1440,900],[500,600],[1200,700],[390,844]])await page.setViewportSize({width,height});
  await page.waitForTimeout(200);const portrait=await diag(page);await page.setViewportSize({width:844,height:390});await page.waitForTimeout(200);return {beforeRM,osRM,uiRM,beforeHide,afterHide,portrait,landscape:await diag(page),state:await snap(page)};
 });
 for(const state of ['loading','greet'])await run(state+'-browser-back',async page=>{
  await page.goto(base+'/about');await page.locator('a[href="/"]').first().click();await page.waitForURL(base+'/');
  let hold;if(state==='loading')hold=await delayAsset(page);
  await enter(page);if(hold)await hold.started;else{await ready(page);await page.getByTestId('greet-resident-btn').click();await page.waitForTimeout(850);}
  const before=await snap(page);await page.goBack();await page.waitForURL('**/about');hold?.release();await page.waitForTimeout(1400);return {before,url:page.url(),h1:await page.locator('h1').innerText(),after:await snap(page)};
 });
 await run('greet-project-navigation',async page=>{
  await page.goto(base);await enter(page);await ready(page);await page.getByTestId('greet-resident-btn').click();await page.waitForTimeout(850);const before=await diag(page);await navProjects(page);await page.waitForTimeout(300);return {before,url:page.url(),h1:await page.locator('h1').innerText(),after:await snap(page)};
 });
 await run('dynamic-chunk-failure',async page=>{
  await page.route('**/'+worldChunk,route=>route.abort('failed'));await page.goto(base);await enter(page);await page.waitForTimeout(2000);return {body:await page.locator('body').innerText(),h1:await page.locator('h1').count(),navigation:await page.locator('a[href="/projects"]').count(),fallback:await page.getByTestId('world-fallback-banner').count()};
 });
 await run('dynamic-chunk-slow-escape',async page=>{
  let release,arrived;const gate=new Promise(r=>release=r),started=new Promise(r=>arrived=r);await page.route('**/'+worldChunk,async route=>{arrived();await gate;await route.continue().catch(()=>{})});
  await page.goto(base);await enter(page);await started;await page.keyboard.press('Escape');await page.waitForTimeout(500);const during={loading:await page.getByTestId('world-loading-placeholder').count(),skip:await page.getByTestId('skip-motion-btn').count(),exit:await page.getByTestId('exit-studio-btn').count(),state:await snap(page)};release();await ready(page);return {during,late:await diag(page)};
 });
 await run('cached-old-asset-manifest',async page=>{
  const old=fs.readFileSync(process.env.G1_OLD_W1);const crypto=require('node:crypto');let manifestRequests=0;
  await page.route('**/*manifest*.json',async route=>{manifestRequests++;await route.fulfill({status:200,body:JSON.stringify({revision:'W1-F1',groups:[]}),contentType:'application/json'})});
  await page.route('**/models/room-blockout.glb',route=>route.fulfill({status:200,contentType:'model/gltf-binary',headers:{'cache-control':'public,max-age=31536000,immutable','age':'86400'},body:old}));
  await page.goto(base);await enter(page);await ready(page);return {injection:'HTTP route supplies historical GLB as a stale cache response; no actual cache reuse claimed',servedW1Hash:crypto.createHash('sha256').update(old).digest('hex'),manifestRequests,accepted:await diag(page),fallback:await page.getByTestId('world-fallback-banner').count()};
 });
 await run('direct-query-without-entry',async page=>{
  await page.goto(base+'/?studio=enter');await ready(page);return {noEntryClick:true,diag:await diag(page),state:await snap(page)};
 });
 await run('renderer-creation-failure-reentry',async page=>{
  await page.goto(base);await page.evaluate(()=>{window.__hostile.savedGetContext=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/.test(type)?null:window.__hostile.savedGetContext.call(this,type,...args)}});
  await enter(page);await page.getByTestId('world-fallback-banner').waitFor();const failure={text:await page.getByTestId('world-fallback-banner').innerText(),retry:await page.getByTestId('fallback-retry-btn').count(),state:await snap(page)};
  await page.evaluate(()=>HTMLCanvasElement.prototype.getContext=window.__hostile.savedGetContext);await page.getByTestId('fallback-dismiss-btn').click();await enter(page);await ready(page);return {failure,afterReentry:await diag(page),state:await snap(page)};
 });
 await run('cancel-escape-no-late-resume',async page=>{
  await page.goto(base);await enter(page);await ready(page);await page.getByTestId('greet-resident-btn').click();await page.waitForTimeout(1000);await page.getByTestId('cancel-motion-btn').click();const cancelled=await diag(page);await page.keyboard.press('Escape');await page.waitForTimeout(4500);return {cancelled,late:await diag(page),state:await snap(page)};
 });
 await run('greet-navigation-delayed-route',async page=>{
  let release,arrived;const gate=new Promise(r=>release=r),started=new Promise(r=>arrived=r);
  await page.route('**/projects?*',async route=>{arrived();await gate;await route.continue().catch(()=>{})});
  await page.goto(base);await enter(page);await ready(page);await page.getByTestId('greet-resident-btn').click();await page.waitForTimeout(850);const before=await diag(page);
  await page.locator('a[href="/projects"]').first().click();await started;await page.waitForTimeout(350);const waiting={url:page.url(),diag:await diag(page),state:await snap(page)};
  release();await page.waitForURL('**/projects');await page.waitForTimeout(200);return {before,after350msPendingNavigation:waiting,arrived:await snap(page)};
 });
 await run('greet-component-unmount',async page=>{
  await page.goto(base);await enter(page);await ready(page);await page.getByTestId('greet-resident-btn').click();await page.waitForTimeout(850);const before=await diag(page);await page.getByTestId('exit-studio-btn').click();const exited=await snap(page);await page.waitForTimeout(500);return {before,exited,late:await snap(page)};
 });
 await run('camera-visible-surface',async page=>{
  await page.goto(base);await enter(page);await ready(page);const views=[];
  for(const preset of ['home','mobile','monitor']){
   await page.getByTestId('camera-'+preset+'-btn').click();await page.waitForTimeout(100);const d=await diag(page);const png=await page.getByTestId('world-canvas').evaluate(el=>el.toDataURL('image/png'));
   fs.writeFileSync(path.join(out,channel+'-raw-canvas-'+preset+'.png'),Buffer.from(png.split(',')[1],'base64'));views.push({preset,diagnostics:d});
  }return {views};
 });
 await run('initial-render-failure-detached-loop',async page=>{
  await page.goto(base);await page.evaluate(()=>window.__hostile.throwDraws=1);await enter(page);await page.getByTestId('world-fallback-banner').waitFor();const immediate=await snap(page);await page.waitForTimeout(500);return {immediate,late:await snap(page),fallback:await page.getByTestId('world-fallback-banner').innerText(),retry:await page.getByTestId('fallback-retry-btn').count(),h1:await page.locator('h1').innerText()};
 });
 await browser.close();results.finished=new Date().toISOString();fs.writeFileSync(path.join(out,channel+suffix+'-hostile-results.json'),JSON.stringify(results,null,2)+'\n');
})().catch(async e=>{console.error(e);await browser?.close();process.exitCode=1});
