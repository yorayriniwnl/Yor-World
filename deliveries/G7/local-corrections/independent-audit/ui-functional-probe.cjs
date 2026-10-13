const { chromium, expect } = require('../../../../app/node_modules/@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const output=__dirname, target=process.env.AUDIT_URL||'http://127.0.0.1:3140';
const report={target,scope:'Independent functional local browser checks only; no controlled pacing, physical devices, audible output or production certification',checks:[],errors:[],profiles:[]};
const save=()=>fs.writeFileSync(path.join(output,'ui-functional-results.json'),JSON.stringify(report,null,2));
async function check(name,task){try{const evidence=await task();report.checks.push({name,status:'PASS',evidence});console.log('PASS '+name);}catch(e){report.checks.push({name,status:'FAIL',error:e.stack});console.log('FAIL '+name+' '+e.message);}save();}
async function bounds(locator){return locator.evaluate(node=>{const b=node.getBoundingClientRect(),h=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return {x:b.x,y:b.y,width:b.width,height:b.height,right:b.right,bottom:b.bottom,pointer:node===h||node.contains(h),viewport:b.x>=0&&b.y>=0&&b.right<=innerWidth&&b.bottom<=innerHeight};});}
async function runtime(page){return page.evaluate(()=>{
 for(const node of document.querySelectorAll('*')){const key=Object.keys(node).find(k=>k.startsWith('__reactFiber$'));if(!key)continue;
  for(let fiber=node[key];fiber;fiber=fiber.return)for(let hook=fiber.memoizedState;hook;hook=hook.next)if(hook.memoizedState?.current?.rendererOwnerId){window.__auditRuntime=hook.memoizedState.current;return window.__auditRuntime.getDiagnostics();}}
 throw Error('Actual runtime reference not found');
});}
async function diag(page){return page.evaluate(()=>window.__auditRuntime.getDiagnostics());}
async function home(page){await page.emulateMedia({reducedMotion:'reduce'});await page.goto(target+'/?studio=1');await expect(page.getByTestId('world-stage-container')).toHaveAttribute('data-lifecycle-state','HOME',{timeout:45000});await page.getByTestId('world-stage-container').scrollIntoViewIfNeeded();return runtime(page);}
async function options(page){await page.getByTestId('studio-options-toggle').click();await expect(page.getByTestId('studio-options-panel')).toBeVisible();}
async function select(page,tier){await options(page);await page.getByTestId('quality-tier-select').selectOption(tier);}
(async()=>{
const browser=await chromium.launch({channel:'chrome',headless:true});report.browserVersion=browser.version();
for(const viewport of [{width:320,height:844},{width:390,height:844},{width:1440,height:1000},{width:844,height:390}]){
const context=await browser.newContext({viewport,deviceScaleFactor:1});const page=await context.newPage();page.on('pageerror',e=>report.errors.push({viewport,error:e.stack}));
await check('enter HOME '+viewport.width,()=>home(page));
await check('layout and primary pointers '+viewport.width,async()=>{
const stage=await bounds(page.getByTestId('world-stage-container')),canvas=await bounds(page.getByTestId('world-canvas'));
const controls={};for(const id of ['greet-resident-btn','skip-motion-btn','toggle-room-controls-btn','sound-toggle-btn','exit-studio-btn','studio-options-toggle','diagnostics-toggle-btn']){controls[id]=await bounds(page.getByTestId(id));expect(controls[id].width).toBeGreaterThanOrEqual(44);expect(controls[id].height).toBeGreaterThanOrEqual(44);expect(controls[id].pointer).toBe(true);expect(controls[id].viewport).toBe(true);}
const measure=await page.evaluate(()=>{const c=document.querySelector('[data-testid="world-canvas"]').getBoundingClientRect();let hit=0;for(let x=0;x<10;x++)for(let y=0;y<10;y++)if(document.elementFromPoint(c.x+(x+.5)*c.width/10,c.y+(y+.5)*c.height/10)?.tagName==='CANVAS')hit++;return {canvasPointerFraction:hit/100,documentWidth:document.documentElement.scrollWidth};});
expect(stage.width).toBeGreaterThan(viewport.width*.7);expect(canvas.height/stage.height).toBeGreaterThan(.65);expect(measure.canvasPointerFraction).toBeGreaterThanOrEqual(.9);expect(measure.documentWidth).toBeLessThanOrEqual(viewport.width);
await page.screenshot({path:path.join(output,`independent-home-${viewport.width}.png`)});report.profiles.push({viewport,stage,canvas,measure,controls,diagnostics:await diag(page)});return {stage,canvas,measure,controls};});
await check('Room Close sticky pointer and native modal focus '+viewport.width,async()=>{
 const opener=page.getByTestId('toggle-room-controls-btn');await opener.click();const panel=page.getByTestId('room-controls-panel'),close=page.getByRole('button',{name:'Close room controls panel'});await expect(close).toBeFocused();
 await panel.evaluate(n=>n.scrollTop=n.scrollHeight);const b=await bounds(close);expect(b.pointer).toBe(true);expect(b.viewport).toBe(true);await page.screenshot({path:path.join(output,`independent-room-scrolled-${viewport.width}.png`)});await close.click();await expect(opener).toBeFocused();await opener.press('Enter');await close.press('Shift+Tab');expect(await panel.evaluate(n=>n.contains(document.activeElement))).toBe(true);await page.keyboard.press('Escape');await expect(panel).toHaveCount(0);await expect(opener).toBeFocused();return b;
});
await check('all camera options, preference authority and bounded close '+viewport.width,async()=>{
 const cameras=[];for(const [id,preset] of [['camera-home-btn','home-desktop'],['camera-mobile-btn','home-mobile'],['camera-reverse-btn','reverse-doorway'],['camera-monitor-btn','monitor']]){await options(page);await page.getByTestId(id).scrollIntoViewIfNeeded();await page.getByTestId(id).click();const close=page.getByRole('button',{name:'Close studio options'});const b=await bounds(close);expect(b.pointer).toBe(true);await close.click();await expect.poll(async()=>(await diag(page)).cameraPreset).toBe(preset);cameras.push(preset);}
 const tiers=[];for(const tier of ['high','medium','low']){await select(page,tier);await page.getByRole('button',{name:'Close studio options'}).click();await expect.poll(async()=>(await diag(page)).qualityTier).toBe(tier);tiers.push(tier);}return{cameras,tiers};
});
await check('static fallback public links remain scrollable and pointer reachable '+viewport.width,async()=>{
 await select(page,'static');await expect(page.getByTestId('world-static-container')).toBeVisible();await expect(page.locator('canvas')).toHaveCount(0);
 const results={};for(const id of ['static-fallback-retry','static-fallback-continue','static-link-about','static-link-resume','static-link-contact']){const loc=page.getByTestId(id);await loc.scrollIntoViewIfNeeded();results[id]=await bounds(loc);expect(results[id].pointer).toBe(true);expect(results[id].viewport).toBe(true);}return results;
});
await check('static AUTO reconstruction and exit cleanup '+viewport.width,async()=>{
 await page.getByTestId('static-fallback-retry').click();await expect(page.getByTestId('world-stage-container')).toHaveAttribute('data-lifecycle-state','HOME',{timeout:45000});await runtime(page);await expect(page.getByTestId('sound-toggle-btn')).toHaveAttribute('aria-pressed','false');await page.getByTestId('exit-studio-btn').click();await expect(page.locator('canvas')).toHaveCount(0);await expect(page.getByTestId('studio-disclosure')).toBeVisible();return true;
});
await context.close();
}
await browser.close();save();if(report.checks.some(c=>c.status==='FAIL'))process.exitCode=1;
})().catch(e=>{report.fatal=e.stack;save();console.error(e);process.exitCode=1;});
