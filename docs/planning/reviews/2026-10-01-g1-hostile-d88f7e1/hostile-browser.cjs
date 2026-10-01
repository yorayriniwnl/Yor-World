/* Reviewer-only fault injection. No candidate source is changed. */
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const { createRequire } = require('node:module');
const crypto = require('node:crypto');
const out = __dirname;
const execution = JSON.parse(fs.readFileSync(path.join(out, 'execution.json'), 'utf8'));
const appRequire = createRequire(path.join(execution.app, 'package.json'));
const { chromium } = appRequire('@playwright/test');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const report = { evidenceClass:'REVIEWER EXECUTED', sourceRevision:execution.sourceRevision, startedAt:new Date().toISOString(), cases:[] };
const extra = process.argv[2] === 'extra';
let browser, server, base;
const save = () => fs.writeFileSync(path.join(out,extra?'browser-extra-results.json':'browser-results.json'), JSON.stringify(report,null,2));
function instrumentation() {
  const state = {frames:0,pending:new Set(),alloc:{},deleted:{},contexts:[],audioConstructors:0};
  window.__audit = state;
  const raf = window.requestAnimationFrame.bind(window), cancel = window.cancelAnimationFrame.bind(window);
  window.requestAnimationFrame = callback => {
    let id = raf(t => {state.pending.delete(id);state.frames++;callback(t);});
    state.pending.add(id);return id;
  };
  window.cancelAnimationFrame = id => {state.pending.delete(id);return cancel(id);};
  for (const name of ['AudioContext','webkitAudioContext','Audio']) {
    const original = window[name];
    if (original) window[name] = new Proxy(original,{construct(target,args,newTarget){state.audioConstructors++;return Reflect.construct(target,args,newTarget);}});
  }
  const getContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function(...args) {
    const ctx = getContext.apply(this,args);
    if (ctx && typeof ctx.createBuffer === 'function' && !state.contexts.includes(ctx)) state.contexts.push(ctx);
    return ctx;
  };
  for (const name of ['WebGLRenderingContext','WebGL2RenderingContext']) {
    const proto = window[name]?.prototype;
    if (!proto) continue;
    for (const kind of ['Buffer','Texture','Program','Framebuffer','Renderbuffer','VertexArray']) {
      for (const verb of ['create','delete']) {
        const fn = proto[verb+kind];if(!fn)continue;
        proto[verb+kind] = function(...args) {
          const result = fn.apply(this,args);
          const counts = verb==='create'?state.alloc:state.deleted;
          if (verb==='create'?result:args[0]) counts[kind]=(counts[kind]||0)+1;
          return result;
        };
      }
    }
  }
  const eventRefs = new Map();
  state.events=eventRefs;
  for (const target of [window,document]) {
    const add=target.addEventListener.bind(target),remove=target.removeEventListener.bind(target);
    target.addEventListener=(name,fn,options)=>{if(['resize','keydown','pagehide','visibilitychange'].includes(name)){const key=(target===window?'window:':'document:')+name; if(!eventRefs.has(key))eventRefs.set(key,new Set());eventRefs.get(key).add(fn);}return add(name,fn,options);};
    target.removeEventListener=(name,fn,options)=>{eventRefs.get((target===window?'window:':'document:')+name)?.delete(fn);return remove(name,fn,options);};
  }
}
async function snapshot(page) {
  return page.evaluate(()=>({frames:window.__audit.frames,pending:window.__audit.pending.size,allocated:window.__audit.alloc,deleted:window.__audit.deleted,audioConstructors:window.__audit.audioConstructors,events:Object.fromEntries([...window.__audit.events].map(([k,v])=>[k,v.size])),canvas:document.querySelectorAll('[data-testid="world-canvas"]').length,main:document.querySelectorAll('main').length,heading:document.querySelector('h1')?.textContent,url:location.href}));
}
async function enter(page) {
  await page.locator('[data-testid="studio-disclosure"] summary').click();
  await page.getByTestId('enter-studio-btn').click();
}
async function ready(page) {
  await page.waitForFunction(()=>document.querySelector('[data-testid="status-badge"]')?.textContent.includes('coding_idle'),{},{timeout:25000});
}
async function diag(page) {
  if(!await page.getByTestId('world-diagnostics').count())await page.getByTestId('diagnostics-toggle-btn').click();
  return JSON.parse(await page.getByTestId('world-diagnostics').textContent());
}
async function test(name, fn) {
  if ((Number(name.slice(0,2)) > 11) !== extra) return;
  const context = await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'no-preference'});
  await context.addInitScript(instrumentation);
  const page=await context.newPage();page.setDefaultTimeout(7000);
  const rec={name,console:[],errors:[],requests:[]};report.cases.push(rec);save();
  page.on('console',m=>{if(['warning','error'].includes(m.type()))rec.console.push({type:m.type(),text:m.text().slice(0,600)});});
  page.on('pageerror',e=>rec.errors.push(e.message));
  page.on('request',r=>{if(r.url().includes('.glb')||r.url().includes('/_next/static/chunks/'))rec.requests.push(r.url().replace(base,''));});
  await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
  try {await fn(page,context,rec);rec.completed=true;}catch(e){rec.harnessError=String(e.stack||e);}
  try {rec.final=await snapshot(page);await page.screenshot({path:path.join(out,name+'.png'),fullPage:false});}catch(e){rec.captureError=String(e);}
  save();await context.close();console.log(name,rec.completed?'RECORDED':'HARNESS ERROR');
}
(async()=>{
  const port=await new Promise(resolve=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});});
  base='http://127.0.0.1:'+port;
  const log=fs.openSync(path.join(out,extra?'production-server-extra.log':'production-server.log'),'w');
  const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>['PATH','SYSTEMROOT','WINDIR','COMSPEC','PATHEXT','TEMP','TMP','LOCALAPPDATA','APPDATA','USERPROFILE','PROGRAMFILES','PROGRAMFILES(X86)'].includes(k.toUpperCase())));
  env.NEXT_TELEMETRY_DISABLED='1';env.NODE_ENV='production';
  const args=[path.join(execution.app,'node_modules/next/dist/bin/next'),'start','--hostname','127.0.0.1','--port',String(port)];
  server=spawn(execution.node,args,{cwd:execution.app,env,windowsHide:true,stdio:['ignore',log,log]});
  report.server={argv:[execution.node,...args],pid:server.pid,base};save();
  for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}await sleep(200);}
  browser=await chromium.launch({channel:'chrome',headless:true});report.browser=browser.version();save();
  await test('01-repeat-cancel-exit',async(page,context,r)=>{
    await page.goto(base);r.before=await snapshot(page);
    r.preEntryModels=r.requests.filter(x=>x.endsWith('.glb'));
    await page.locator('[data-testid="studio-disclosure"] summary').click();
    await page.getByTestId('enter-studio-btn').evaluate(b=>{b.click();b.click();});
    await ready(page);r.ready=await diag(page);r.resourcesReady=await snapshot(page);
    await page.getByTestId('greet-resident-btn').evaluate(b=>{b.click();b.click();});
    await page.waitForTimeout(1100);r.doubleGreet=await diag(page);
    await page.keyboard.press('Escape');r.escape=await diag(page);
    await page.waitForTimeout(4500);r.afterLateWindow=await diag(page);
    await page.getByTestId('greet-resident-btn').click();await page.waitForTimeout(1000);
    await page.getByTestId('cancel-motion-btn').click();await page.getByTestId('skip-motion-btn').click();
    await page.waitForTimeout(3000);r.cancelThenSkip=await diag(page);
    await page.getByTestId('exit-studio-btn').click();await page.waitForTimeout(300);r.afterExit=await snapshot(page);
    r.focusAfterExit=await page.evaluate(()=>({tag:document.activeElement?.tagName,id:document.activeElement?.id,text:document.activeElement?.textContent?.slice(0,100)}));
    await enter(page);await ready(page);r.secondReady=await snapshot(page);
    await page.getByTestId('greet-resident-btn').click();await page.getByTestId('exit-studio-btn').click();await page.waitForTimeout(300);r.secondExit=await snapshot(page);
  });
  await test('02-route-and-back',async(page,context,r)=>{
    await page.goto(base+'/about');await page.goto(base);await enter(page);await ready(page);await page.getByTestId('greet-resident-btn').click();
    await page.locator('a[href="/projects"]').first().click();await page.waitForURL('**/projects');await page.waitForTimeout(250);r.afterRoute=await snapshot(page);
    await page.goBack();await page.waitForTimeout(500);r.afterBack=await snapshot(page);
    if(await page.getByTestId('studio-disclosure').count()) {await enter(page);await ready(page);}
    await page.getByTestId('greet-resident-btn').click();await page.goBack();await page.waitForTimeout(250);r.greetBack=await snapshot(page);
  });
  await test('03-slow-load-escape-exit-late',async(page,context,r)=>{
    let release;const gate=new Promise(x=>release=x);let intercepted=0;
    await page.route('**/models/*.glb',async route=>{intercepted++;await gate;await route.continue().catch(()=>{});});
    await page.goto(base);await enter(page);await page.getByTestId('world-canvas').waitFor();
    await page.waitForTimeout(300);await page.getByTestId('skip-motion-btn').click();await page.keyboard.press('Escape');r.loading=await snapshot(page);
    await page.getByTestId('exit-studio-btn').click();r.exit=await snapshot(page);release();await page.waitForTimeout(1800);r.late=await snapshot(page);r.intercepted=intercepted;
  });
  await test('04-missing-glb',async(page,context,r)=>{
    await page.route('**/models/avatar-proof.glb',route=>route.fulfill({status:404,body:'reviewer missing asset'}));
    await page.goto(base);await enter(page);await page.getByTestId('fallback-dismiss-btn').waitFor();
    r.fallbackText=await page.locator('body').innerText();r.retryButtons=await page.getByTestId('fallback-retry-btn').count();r.failed=await snapshot(page);
  });
  await test('05-corrupt-glb',async(page,context,r)=>{
    await page.route('**/models/room-blockout.glb',route=>route.fulfill({status:200,contentType:'model/gltf-binary',body:Buffer.from('not-a-glb-reviewer')}));
    await page.goto(base);await enter(page);await page.getByTestId('fallback-dismiss-btn').waitFor();r.retryButtons=await page.getByTestId('fallback-retry-btn').count();r.failed=await snapshot(page);
  });
  await test('06-real-context-loss',async(page,context,r)=>{
    await page.goto(base);await enter(page);await ready(page);r.before=await diag(page);await page.getByTestId('greet-resident-btn').click();
    r.extension=await page.evaluate(()=>{const gl=window.__audit.contexts[0],ext=gl?.getExtension('WEBGL_lose_context');if(ext)ext.loseContext();return !!ext;});
    await page.waitForTimeout(1200);r.contextLost=await page.evaluate(()=>window.__audit.contexts[0]?.isContextLost());r.after=await diag(page);r.fallbackCount=await page.getByTestId('fallback-dismiss-btn').count();r.retryCount=await page.getByTestId('fallback-retry-btn').count();r.resources=await snapshot(page);
  });
  await test('07-lazy-chunk-failure',async(page,context,r)=>{
    await page.goto(base);await page.waitForTimeout(700);let blocked=[];
    await page.route('**/_next/static/chunks/*.js',route=>{blocked.push(route.request().url().replace(base,''));return route.abort('failed');});
    await enter(page);await page.waitForTimeout(2000);r.blocked=blocked;r.body=await page.locator('body').innerText();r.fallbackCount=await page.getByTestId('fallback-dismiss-btn').count();r.projectLinks=await page.locator('a[href="/projects"]').count();
  });
  await test('08-reduced-motion-active',async(page,context,r)=>{
    await page.goto(base);await enter(page);await ready(page);await diag(page);
    await page.getByTestId('greet-resident-btn').click();await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(1200);
    r.systemChange=await diag(page);r.systemMatches=await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
    await page.getByTestId('reduced-motion-toggle-btn').click();await page.getByTestId('skip-motion-btn').click();await page.getByTestId('greet-resident-btn').click();await page.waitForTimeout(1200);r.manualReduceGreeting=await diag(page);
  });
  await test('09-page-hide-synthetic',async(page,context,r)=>{
    await page.goto(base);await enter(page);await ready(page);await diag(page);await page.getByTestId('greet-resident-btn').click();
    r.before=await diag(page);
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});Object.defineProperty(document,'visibilityState',{configurable:true,get:()=> 'hidden'});document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));});
    await page.waitForTimeout(1200);r.hidden=await diag(page);r.state=await snapshot(page);r.method='Synthetic pagehide and visibilitychange with hidden getters; real OS background throttling is not measured.';
  });
  await test('10-resize-rotate',async(page,context,r)=>{
    await page.goto(base);await enter(page);await ready(page);await page.getByTestId('greet-resident-btn').click();r.sizes=[];
    for(const [width,height] of [[390,844],[844,390],[1440,1000],[390,844],[1440,1000]]){
      await page.setViewportSize({width,height});await page.waitForTimeout(150);
      r.sizes.push({width,height,diag:await diag(page),layout:await page.evaluate(()=>{const s=document.querySelector('[data-testid="world-stage-container"]').getBoundingClientRect();return [...document.querySelectorAll('[data-testid="world-stage-container"] button')].map(b=>{const x=b.getBoundingClientRect();return {id:b.dataset.testid,w:x.width,h:x.height,insideStage:x.left>=s.left&&x.right<=s.right&&x.top>=s.top&&x.bottom<=s.bottom};});})});
    }
  });
  await test('11-old-valid-room-asset',async(page,context,r)=>{
    const oldPath=path.resolve(out,'../../../../deliveries/W1/room-blockout.glb');
    if(!fs.existsSync(oldPath)){r.notRun='Original W1 GLB unavailable at '+oldPath;return;}
    const bytes=fs.readFileSync(oldPath);r.injectedHash=crypto.createHash('sha256').update(bytes).digest('hex');
    await page.route('**/models/room-blockout.glb',route=>route.fulfill({status:200,contentType:'model/gltf-binary',body:bytes,headers:{'cache-control':'public, max-age=31536000'}}));
    await page.goto(base);await enter(page);await ready(page);r.diag=await diag(page);r.method='Intercepted successful model response with older compatible GLB bytes; not a claim that the production server currently sends stale cache headers.';
  });
  await test('12-slow-world-chunk',async(page,context,r)=>{
    await page.goto(base);await page.waitForTimeout(400);let release;const gate=new Promise(x=>release=x);
    await page.route('**/_next/static/chunks/*.js',async route=>{await gate;await route.continue().catch(()=>{});});
    await enter(page);await page.getByTestId('world-loading-placeholder').waitFor();
    r.skipCount=await page.getByTestId('skip-motion-btn').count();r.exitCount=await page.getByTestId('exit-studio-btn').count();
    await page.keyboard.press('Escape');r.afterEscape=await snapshot(page);release();await ready(page);r.afterLateChunk=await snapshot(page);
  });
  await test('13-escape-before-asset-ready',async(page,context,r)=>{
    let release;const gate=new Promise(x=>release=x);
    await page.route('**/models/*.glb',async route=>{await gate;await route.continue().catch(()=>{});});
    await page.goto(base);await enter(page);await page.getByTestId('world-canvas').waitFor();await page.getByTestId('skip-motion-btn').click();await page.keyboard.press('Escape');r.beforeRelease=await diag(page);
    release();await ready(page);r.afterRelease=await diag(page);
  });
  await test('14-render-call-throws',async(page,context,r)=>{
    await page.goto(base);await enter(page);await ready(page);await diag(page);
    await page.evaluate(()=>{const gl=window.__audit.contexts[0];gl.drawElements=()=>{throw new Error('REVIEWER_INJECTED_RENDER_FAILURE');};});
    await page.waitForTimeout(300);r.errorCount=r.errors.length;r.fallbackCount=await page.getByTestId('fallback-dismiss-btn').count();r.after=await snapshot(page);
  });
  await test('15-landscape-and-fast-resize',async(page,context,r)=>{
    await page.goto(base);await enter(page);await ready(page);
    for(let i=0;i<20;i++)await page.setViewportSize(i%2?{width:390,height:844}:{width:844,height:390});
    await page.setViewportSize({width:844,height:390});await page.waitForTimeout(200);
    r.rectangles=await page.evaluate(()=>{const stage=document.querySelector('[data-testid="world-stage-container"]');return {stage:stage.getBoundingClientRect().toJSON(),overflow:getComputedStyle(stage).overflow,buttons:[...stage.querySelectorAll('button')].map(b=>({id:b.dataset.testid,rect:b.getBoundingClientRect().toJSON()}))};});
    try{await page.getByTestId('camera-mobile-btn').click({timeout:1500});r.mobileButtonClickable=true;}catch(e){r.mobileButtonClickable=false;r.clickFailure=String(e).slice(0,1200);}
    r.state=await snapshot(page);
  });
  await test('16-loading-route-and-back',async(page,context,r)=>{
    let release;const gate=new Promise(x=>release=x);
    await page.route('**/models/*.glb',async route=>{await gate;await route.continue().catch(()=>{});});
    await page.goto(base+'/about');await page.goto(base);await enter(page);await page.getByTestId('world-canvas').waitFor();
    await page.locator('a[href="/projects"]').first().click();await page.waitForURL('**/projects');release();await page.waitForTimeout(800);r.afterLateRoute=await snapshot(page);await page.goBack();await page.waitForTimeout(300);r.back=await snapshot(page);
  });
  await test('17-failed-renderer-reentry',async(page,context,r)=>{
    await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;let fail=true;HTMLCanvasElement.prototype.getContext=function(kind,...args){if(fail&&String(kind).includes('webgl'))return null;return get.call(this,kind,...args);};window.__allowRenderer=()=>{fail=false;};});
    await page.goto(base);await enter(page);await page.getByTestId('fallback-dismiss-btn').waitFor();r.retryCount=await page.getByTestId('fallback-retry-btn').count();r.failure=await snapshot(page);
    await page.evaluate(()=>window.__allowRenderer());await page.getByTestId('fallback-dismiss-btn').click();await enter(page);await ready(page);r.reentry=await diag(page);
  });
  report.finishedAt=new Date().toISOString();save();
})().catch(e=>{report.fatalError=String(e.stack||e);save();process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();if(server)server.kill();});
