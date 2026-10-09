import { createRequire } from 'node:module';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
const require=createRequire(path.resolve('app/package.json')); const {chromium}=require('@playwright/test');
const out=path.resolve('deliveries/audits/2026-10-09-completion/world/fresh-browser'); await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true}); const results={scope:'Headless Chromium, viewport emulation; no physical device or production origin claim',baseURL:process.argv[2]||process.env.BASE_URL||'http://127.0.0.1:3333',profiles:[]};
try {for(const [name,viewport] of [['desktop',{width:1440,height:900}],['mobile',{width:390,height:844}]]){
 const page=await browser.newPage({viewport}); const r={name,viewport,events:[],errors:[]}; results.profiles.push(r); page.on('pageerror',e=>r.errors.push(e.message));
 await page.addInitScript(()=>{window.__auditFrames=[];document.addEventListener('yor-world-rendered-frame',e=>window.__auditFrames.push(e.detail),true)});
 await page.goto(results.baseURL+'/?studio=enter',{waitUntil:'domcontentloaded'}); const stage=page.getByTestId('world-stage-container'); await stage.waitFor({timeout:20000});
 await page.waitForFunction(()=>document.querySelector('[data-testid="world-stage-container"]')?.getAttribute('data-lifecycle-state')==='HOME',{},{timeout:25000});
 await page.screenshot({path:path.join(out,name+'-ui.png'),fullPage:true}); await page.locator('canvas').first().screenshot({path:path.join(out,name+'-canvas.png')});
 const diag=page.getByTestId('diagnostics-toggle-btn'); await diag.click(); r.beforePause=JSON.parse(await page.getByTestId('world-diagnostics').innerText());
 const pause=page.getByRole('button',{name:/Decorative:/}); if(await pause.count()){await pause.click();await page.waitForTimeout(1200);r.afterPause=JSON.parse(await page.getByTestId('world-diagnostics').innerText());}
 r.events=await page.evaluate(()=>window.__auditFrames); r.eventName='yor-world-rendered-frame'; await page.close();
 }} catch(e){results.failure=e.stack} finally{await browser.close();await writeFile(path.join(out,'results.json'),JSON.stringify(results,null,2)+'\n')}
if(results.failure){console.error(results.failure);process.exitCode=1}else console.log(JSON.stringify(results.profiles.map(p=>({name:p.name,events:p.events.length,beforePause:p.beforePause?.activeClip,afterPause:p.afterPause?.activeClip}))))
