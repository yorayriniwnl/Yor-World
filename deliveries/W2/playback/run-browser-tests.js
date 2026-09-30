const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const { chromium }=require('./dependencies.cjs')('playwright');
const { startServer }=require('./serve');
const root=path.resolve(__dirname,'..'), evidence=path.join(root,'evidence/r2');
const channel=process.argv[2]||'chrome', smoke=process.argv.includes('--smoke');
const prefix=channel+(smoke?'-smoke':'');
async function run(){
 const logs=[], errors=[], network=[], checks=[];
 const check=(name,pass,detail)=>checks.push({name,status:pass?'PASS':'FAIL',detail});
 const server=await startServer(0); let browser;
 try {
  browser=await chromium.launch({channel,headless:true,args:['--use-gl=angle','--use-angle=d3d11','--enable-webgl']});
  const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});
  const page=await context.newPage();
  page.on('console',msg=>{logs.push({type:msg.type(),text:msg.text()});if(msg.type()==='error')errors.push(msg.text());});
  page.on('pageerror',err=>errors.push(err.message));
  page.on('response',r=>network.push({url:r.url(),status:r.status()}));
  await page.goto(server.url+'?manual=1',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.W2?.ready(),{timeout:20000});
  const info=await page.evaluate(()=>W2.info());
  const assetHashes=Object.fromEntries(['avatar-proof.glb','fixture-proof.glb','playback/proof.js'].map(n=>[n,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,n))).digest('hex')]));
  const initial=await page.evaluate(()=>W2.diagnostics());
  console.log(channel,browser.version(),JSON.stringify(info),JSON.stringify(initial));
  await page.screenshot({path:path.join(evidence,prefix+'-coding.png')});
  let samples=[],repeated=[],interruptions=[],seams=[],skips=[];
  if(!smoke){
   const result=await page.evaluate(()=>{
    const w=W2, durations={coding_idle:6,notice_visitor:.6,turn_to_visitor:1.2,greeting_nod:.9,return_to_work:1.3};
    const samples=[];
    for(const [clip,duration] of Object.entries(durations)){
     const n=Math.round(duration*60); for(let i=0;i<=n;i++)samples.push(w.sample(clip,i/60));
    }
    function vertexError(a,b){let max=0;for(let i=0;i<a.length;i+=3)max=Math.max(max,Math.hypot(a[i]-b[i],a[i+1]-b[i+1],a[i+2]-b[i+2]));return max;}
    const boundaries=[['coding_idle',6,'coding_idle',0],['coding_idle',0,'notice_visitor',0],['notice_visitor',.6,'turn_to_visitor',0],['turn_to_visitor',1.2,'greeting_nod',0],['greeting_nod',.9,'return_to_work',0],['return_to_work',1.3,'coding_idle',0]];
    const seams=boundaries.map(([a,ta,b,tb])=>{w.sample(a,ta);const pa=w.positions();w.sample(b,tb);return {from:a,to:b,maxVertexGapM:vertexError(pa,w.positions())};});
    const repeated=[];
    for(let cycle=0;cycle<5;cycle++){w.settle();w.playSequence();let maxRoot=0,maxSync=0,maxHits=0;for(let i=0;i<335;i++){w.advance(1/60);const d=w.diagnostics();maxRoot=Math.max(maxRoot,d.rootErrorM,d.chairRootErrorM);maxSync=Math.max(maxSync,Math.abs(d.chairYawDeg-d.bodyYawDeg));maxHits=Math.max(maxHits,d.tableTriangleHits+d.pedestalTriangleHits);}repeated.push({cycle:cycle+1,maxRootErrorM:maxRoot,maxYawDifferenceDeg:maxSync,maxFurnitureHits:maxHits,final:w.diagnostics()});}
    const interruptions=[],skips=[];
    w.settle();const rest=w.positions();
    for(const [clip,duration] of Object.entries(durations))for(const fraction of [.05,.25,.5,.75,.95]){
      w.inspect(clip,duration*fraction);const before=w.positions();w.cancel();const jump=vertexError(before,w.positions());
      let maxRoot=0,maxSync=0,maxHits=0,maxYawIncrease=0,elapsed=0,previous=Math.abs(w.diagnostics(false).chairYawDeg);
      while(w.diagnostics(false).mode==='safe-return'&&elapsed<3.1){w.advance(1/60);elapsed+=1/60;const d=w.diagnostics();maxRoot=Math.max(maxRoot,d.rootErrorM);maxSync=Math.max(maxSync,Math.abs(d.chairYawDeg-d.bodyYawDeg));maxHits=Math.max(maxHits,d.tableTriangleHits+d.pedestalTriangleHits);maxYawIncrease=Math.max(maxYawIncrease,Math.abs(d.chairYawDeg)-previous);previous=Math.abs(d.chairYawDeg);}
      interruptions.push({clip,fraction,elapsed,cancelPoseJumpM:jump,maxRootErrorM:maxRoot,maxYawDifferenceDeg:maxSync,maxFurnitureHits:maxHits,maxYawIncreaseDeg:maxYawIncrease,final:w.diagnostics()});
      w.inspect(clip,duration*fraction);w.settle();skips.push({clip,fraction,maxVertexErrorM:vertexError(rest,w.positions()),final:w.diagnostics(false)});
    }
    return {samples,seams,repeated,interruptions,skips};
   });
   ({samples,repeated,interruptions,seams,skips}=result);
   check('All 60 Hz samples root and synchronized yaw',samples.every(d=>d.rootErrorM<1e-6&&d.chairRootErrorM<1e-6&&Math.abs(d.bodyYawDeg-d.chairYawDeg)<.001&&d.avatarActionTime===d.fixtureActionTime),{samples:samples.length});
   check('Runtime triangle versus desk/pedestals',samples.every(d=>d.tableTriangleHits===0&&d.pedestalTriangleHits===0&&d.desktopInteriorVertices===0),{maximum:Math.max(...samples.map(d=>d.tableTriangleHits+d.pedestalTriangleHits))});
   check('Seat contact',samples.every(d=>Math.abs(d.seatGapM)<.0002),{maximumGapM:Math.max(...samples.map(d=>Math.abs(d.seatGapM)))});
   check('Foot floor bounds',samples.every(d=>d.feet.footL.sole>=-.0002&&d.feet.footR.sole>=-.0002&&d.feet.footL.sole<.054&&d.feet.footR.sole<.054),{min:Math.min(...samples.flatMap(d=>[d.feet.footL.sole,d.feet.footR.sole])),max:Math.max(...samples.flatMap(d=>[d.feet.footL.sole,d.feet.footR.sole]))});
   let maxPlantedDrift=0;
   for(let i=1;i<samples.length;i++)for(const side of ['footL','footR']){const a=samples[i-1],b=samples[i];if(a.clip===b.clip&&a.feet[side].sole<1e-5&&b.feet[side].sole<1e-5){const p=a.feet[side].ankle,r=b.feet[side].ankle;maxPlantedDrift=Math.max(maxPlantedDrift,Math.hypot(p[0]-r[0],p[2]-r[2]));}}
   check('Planted foot displacement between samples',maxPlantedDrift<.0005,{maxPlantedDriftM:maxPlantedDrift});
   const turning=samples.filter(d=>Math.abs(d.chairYawDeg)>.1);
   check('Hands withdrawn during yaw',turning.every(d=>d.handFrontGapM>.02),{minimumGapM:Math.min(...turning.map(d=>d.handFrontGapM))});
   const greeting=samples.filter(d=>d.clip==='greeting_nod');
   const maxNod=Math.max(...greeting.map(d=>d.headLocalAngleDeg));
   check('Restrained acknowledgment and neutral head endpoints',maxNod>8.9&&maxNod<9.1&&greeting[0].headLocalAngleDeg<.001&&greeting.at(-1).headLocalAngleDeg<.001,{maxNodDeg:maxNod});
   const coding=samples.filter(d=>d.clip==='coding_idle');
   const handKeyGaps=coding.map(d=>d.handMinYM-d.keyTopM);
   check('Typing hands stay 1–3 mm above key surfaces',handKeyGaps.every(g=>g>.0008&&g<.0032),{minimumM:Math.min(...handKeyGaps),maximumM:Math.max(...handKeyGaps)});
   check('125 degree coordinated greeting',greeting.every(d=>Math.abs(d.chairYawDeg-125)<.001),{yaw:greeting[0].chairYawDeg});
   check('Shared clip boundaries and coding loop',seams.every(s=>s.maxVertexGapM<.0001),seams);
   check('Five full cycles settle',repeated.every(r=>r.final.mode==='coding'&&r.maxRootErrorM<1e-6&&r.maxYawDifferenceDeg<.001&&r.maxFurnitureHits===0),repeated.map(r=>({cycle:r.cycle,maxRootErrorM:r.maxRootErrorM,finalMode:r.final.mode})));
   check('25 cancellations settle without yaw reversal or stale work',interruptions.every(r=>r.final.mode==='coding'&&Math.abs(r.final.chairYawDeg)<.001&&r.maxRootErrorM<1e-6&&r.maxYawDifferenceDeg<.001&&r.maxFurnitureHits===0&&r.maxYawIncreaseDeg<.001&&(r.clip==='coding_idle'||r.cancelPoseJumpM<.0001)),{maxSeconds:Math.max(...interruptions.map(r=>r.elapsed)),maxNonCodingJumpM:Math.max(...interruptions.filter(r=>r.clip!=='coding_idle').map(r=>r.cancelPoseJumpM))});
   check('25 immediate skips restore exact coding mesh',skips.every(r=>r.maxVertexErrorM<1e-6&&r.final.pendingSegments===0&&r.final.mode==='coding'),{maxVertexErrorM:Math.max(...skips.map(r=>r.maxVertexErrorM))});
   const conflict=await page.evaluate(()=>{W2.settle();const a=W2.playSequence(),b=W2.playSequence();W2.advance(2.7);W2.cancel();W2.settle();W2.advance(10);return {coalesced:a===b,final:W2.diagnostics()};});
   check('Double input and cancellation leave no stale sequence',conflict.coalesced&&conflict.final.mode==='coding'&&conflict.final.pendingSegments===0&&Math.abs(conflict.final.chairYawDeg)<.001,conflict);
   for(const [label,clip,t] of [['hands-clear','notice_visitor',.6],['greeting','greeting_nod',.45],['returned','return_to_work',1.3]]){
    await page.evaluate(({clip,t})=>W2.inspect(clip,t),{clip,t});await page.screenshot({path:path.join(evidence,channel+'-'+label+'.png')});
   }
   await page.evaluate(()=>{W2.setCamera('side');W2.inspect('coding_idle',0);});await page.screenshot({path:path.join(evidence,channel+'-side-contact.png')});
   // Separate actual wall-clock, requestAnimationFrame playback and WebM capture.
   await page.goto(server.url,{waitUntil:'networkidle'});await page.waitForFunction(()=>window.W2?.ready());
   await page.evaluate(async()=>{await W2.recordStart();W2.playSequence();});
   const live=[];for(let i=0;i<13;i++){await page.waitForTimeout(500);live.push(await page.evaluate(()=>W2.diagnostics(false)));}
   const dataUrl=await page.evaluate(()=>W2.recordStop());
   fs.writeFileSync(path.join(evidence,channel+'-playback.webm'),Buffer.from(dataUrl.split(',')[1],'base64'));
   const liveFinal=await page.evaluate(()=>W2.diagnostics());
   check('Real-time exported browser playback and recording',live.some(d=>d.chairYawDeg>110)&&liveFinal.mode==='coding'&&fs.statSync(path.join(evidence,channel+'-playback.webm')).size>10000,{samples:live,final:liveFinal,recordingBytes:fs.statSync(path.join(evidence,channel+'-playback.webm')).size});
  }
  check('F1 desktop world bounds',Math.abs(info.desk.min.x+1.3)<1e-5&&Math.abs(info.desk.max.x-1.3)<1e-5&&Math.abs(info.desk.max.y-.75)<1e-5&&Math.abs(info.desk.min.z+1.55)<1e-5&&Math.abs(info.desk.max.z+.75)<1e-5,info.desk);
  check('No console errors or failing asset requests',errors.length===0&&network.every(r=>r.status<400),errors);
  const report={timestamp:new Date().toISOString(),browser:{channel,version:browser.version()},assetHashes,info,initial,checks,samples,seams,repeated,interruptions,skips,errors,network,logs,
   protocol:'Local loopback, 1440x900 CSS, DPR 1, unthrottled. Deterministic exported-pose checks at 60 Hz plus real-time wall-clock WebM. Not a performance or physical-device acceptance run.'};
  fs.writeFileSync(path.join(evidence,prefix+'-browser.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(checks.map(c=>({name:c.name,status:c.status})),null,2));
  process.exitCode=checks.some(c=>c.status==='FAIL')?1:0;
 }finally{if(browser)await browser.close();server.server.close();fs.writeFileSync(path.join(evidence,prefix+'-console.json'),JSON.stringify({logs,errors,network},null,2));}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
