const {chromium}=require('../../../../../../app/node_modules/@playwright/test');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),repo=path.resolve(root,'../../../..');
const attempt=process.argv[2]||'browser-art-attempt-01';
const target=process.argv[3]||'http://127.0.0.1:3151';
const output=path.join(root,'evidence',attempt);fs.mkdirSync(output,{recursive:false});
const sourceFiles=['SceneIntegrator.ts','CameraDirector.ts','RigidWorldBatch.ts','LowQualityBatch.ts','ProductionLighting.ts','CharacterDirector.ts','WorldRuntime.ts'];
const fingerprints=()=>Object.fromEntries(sourceFiles.map(name=>[name,crypto.createHash('sha256').update(fs.readFileSync(path.join(repo,'app/src/features/world',name))).digest('hex')]));
const report={kind:'Actual native Chrome integrated art harness; no production/device/performance/visual acceptance',target,executor:'local Codex /root/remediation_art_maker',startedAt:new Date().toISOString(),sourceBefore:fingerprints(),assetManifest:crypto.createHash('sha256').update(fs.readFileSync(path.join(repo,'app/public/asset-manifest.json'))).digest('hex'),captures:[],errors:[]};
(async()=>{
const browser=await chromium.launch({channel:'chrome',headless:true});report.chromeVersion=browser.version();
for(const viewport of [{width:1440,height:1000},{width:1920,height:1080},{width:1024,height:768},{width:390,height:844},{width:320,height:600},{width:844,height:390}]){
 for(const baseline of [true,false]){
  const page=await browser.newPage({viewport,deviceScaleFactor:1});page.on('pageerror',e=>report.errors.push(e.stack));
  await page.goto(target+'/'+(baseline?'?baseline=1':''));await page.waitForFunction(()=>window.ready===true,{timeout:30000});
  await page.waitForTimeout(500);const info=await page.evaluate(()=>window.art.inspect());
  const filename=`${baseline?'before':'after'}-home-${viewport.width}x${viewport.height}.png`;
  await page.screenshot({path:path.join(output,filename)});report.captures.push({filename,viewport,...info});
  if(!baseline && viewport.width===1440){
   for(const preset of ['monitor','reverse-doorway','about','pc','scanner']){
    await page.evaluate(name=>window.art.setPreset(name),preset);await page.waitForTimeout(150);
    const filename=`after-${preset}-1440x1000.png`;await page.screenshot({path:path.join(output,filename)});report.captures.push({filename,viewport,...await page.evaluate(()=>window.art.inspect())});
   }
   await page.evaluate(()=>window.art.character.playGreeting());await page.waitForTimeout(2100);
   await page.evaluate(()=>window.art.setPreset('home-desktop'));await page.waitForTimeout(100);
   await page.screenshot({path:path.join(output,'after-greeting-1440x1000.png')});
  }
  await page.close();
 }
}
await browser.close();report.sourceAfter=fingerprints();report.sourcesStable=JSON.stringify(report.sourceBefore)===JSON.stringify(report.sourceAfter);report.finishedAt=new Date().toISOString();
fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({captures:report.captures.length,errors:report.errors.length,sourcesStable:report.sourcesStable,output}));
if(report.errors.length||!report.sourcesStable)process.exitCode=1;
})().catch(error=>{report.errors.push(error.stack);fs.writeFileSync(path.join(output,'failure.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.error(error);process.exitCode=1;});
