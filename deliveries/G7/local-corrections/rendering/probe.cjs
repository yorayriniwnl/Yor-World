const { chromium, expect } = require('../../../../app/node_modules/@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const output = process.env.RENDER_PROBE_OUT ? path.resolve(process.env.RENDER_PROBE_OUT) : __dirname;
fs.mkdirSync(output, { recursive: true });
const sourceFiles = ['WorldRuntime.ts','RigidWorldBatch.ts','LowQualityBatch.ts','RuntimeMaterialQuality.ts','ProductionLighting.ts','WorldRoot.tsx'];
const fingerprints = () => Object.fromEntries(sourceFiles.map(name => [name, crypto.createHash('sha256').update(fs.readFileSync(path.resolve(__dirname,'../../../../app/src/features/world',name))).digest('hex')]));
const report = { target: process.env.RENDER_PROBE_URL || 'http://127.0.0.1:3140', scope: 'Actual local GPU functional draw accounting; development preview, not controlled pacing or production certification', logs: [], profiles: [] };
report.sourceBefore = fingerprints();
report.extensionSuppressed = process.env.RENDER_PROBE_MODE === 'native';
(async () => {
 const browser = await chromium.launch({ channel: 'chrome', headless: true });
 report.chromeVersion = browser.version();
 for (const viewport of [{width:1440,height:1000},{width:390,height:844}]) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  if (report.extensionSuppressed) await page.addInitScript(() => {
    const getExtension = WebGL2RenderingContext.prototype.getExtension;
    WebGL2RenderingContext.prototype.getExtension = function(name) {
      return name === 'WEBGL_multi_draw' ? null : getExtension.call(this, name);
    };
  });
  page.on('pageerror', e => report.logs.push(e.stack));
  await page.goto(report.target + '/?studio=1');
  await expect(page.getByTestId('world-stage-container')).toHaveAttribute('data-lifecycle-state', 'HOME', {timeout:45000});
  await page.evaluate(() => {
   let runtime;
   for (const node of document.querySelectorAll('*')) {
    const key = Object.keys(node).find(key => key.startsWith('__reactFiber$'));
    if (!key) continue;
    for (let fiber = node[key]; fiber && !runtime; fiber = fiber.return) {
     for (let hook = fiber.memoizedState; hook; hook = hook.next) {
      if (hook.memoizedState?.current?.rendererOwnerId) {runtime = hook.memoizedState.current; break;}
     }
    }
    if (runtime) break;
   }
   if (!runtime) throw Error('No real React runtime reference found');
   window.__runtime = runtime;
   window.__passFrames = [];
   const renderer = runtime.renderer;
   const originalDirect = renderer.renderBufferDirect;
   const originalRender = renderer.render;
   let draws = [];
   renderer.renderBufferDirect = function(camera, scene, geometry, material, object, group) {
    const before = this.info.render.calls;
    const result = originalDirect.call(this, camera, scene, geometry, material, object, group);
    const count = this.info.render.calls - before;
    if (count) draws.push({pass: material.isMeshDepthMaterial || material.isMeshDistanceMaterial ? 'shadow' : this.getRenderTarget() ? 'transmission' : 'main', material:material.name || material.type, object:object.name, calls:count});
    return result;
   };
   renderer.render = function(...args) {
    draws = [];
    const result = originalRender.apply(this, args);
    window.__passFrames.push({calls:this.info.render.calls,triangles:this.info.render.triangles,draws});
    if(window.__passFrames.length>200) window.__passFrames.shift();
    return result;
   };
  });
  const profile = {viewport, tiers:[]};
  for (const tier of ['high','medium','low']) {
   await page.getByTestId('studio-options-toggle').click();
   await page.getByTestId('quality-tier-select').selectOption(tier);
   await page.getByTestId('studio-options-toggle').click();
   await page.waitForTimeout(750);
   await page.evaluate(() => {window.__passFrames=[];});
   await page.waitForTimeout(800);
   const result = await page.evaluate(() => {
    const runtime = window.__runtime;
    const materials = new Map();
    let meshes=0,batches=0,casters=0;
    runtime.scene.traverse(object=>{if(object.isMesh){meshes++;if(object.isBatchedMesh)batches++;if(object.castShadow)casters++;for(const mat of Array.isArray(object.material)?object.material:[object.material])materials.set(mat.uuid,{name:mat.name,type:mat.type,transmission:mat.transmission||0});}});
    return {diagnostics:runtime.getDiagnostics(),frames:window.__passFrames,scene:{meshes,batches,casters,materials:[...materials.values()]},multiDraw:!!runtime.renderer.getContext().getExtension('WEBGL_multi_draw')};
   });
   result.tier=tier;
   result.summary={samples:result.frames.length,min:Math.min(...result.frames.map(f=>f.calls)),max:Math.max(...result.frames.map(f=>f.calls))};
   profile.tiers.push(result);
   console.log(JSON.stringify({viewport,tier,...result.summary,passes:result.frames.at(-1)?.draws.reduce((counts,draw)=>{counts[draw.pass]=(counts[draw.pass]||0)+draw.calls;return counts;},{})}));
  }
  await page.screenshot({path:path.join(output,`scene-${viewport.width}.png`)});
  report.profiles.push(profile);
  await context.close();
 }
 await browser.close();
 report.sourceAfter = fingerprints();
 report.sourceStable = JSON.stringify(report.sourceBefore) === JSON.stringify(report.sourceAfter);
 fs.writeFileSync(path.join(output,'probe-results.json'),JSON.stringify(report,null,2));
})().catch(e=>{report.fatal=e.stack;fs.writeFileSync(path.join(output,'probe-results.json'),JSON.stringify(report,null,2));console.error(e);process.exit(1);});
