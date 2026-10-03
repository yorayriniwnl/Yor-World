
const fs = require("node:fs");
const path = require("node:path");
const {createRequire} = require("node:module");
const {spawn,execFileSync} = require("node:child_process");
const crypto = require("node:crypto");
const net = require("node:net");
const app="C:/Users/yoray/Projects/Yor World/app";
const outputDir=__dirname,port=3199;
const {chromium}=createRequire(path.join(app,"package.json"))("@playwright/test");
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const prior=fs.readFileSync("C:/Users/yoray/AppData/Local/Temp/yor-world-swiftshader-four-cpu-dpr03-diagnostic-580013d2d3a240978760d42a8060d4d3/measure.cjs","utf8");
eval(prior.slice(prior.indexOf("function sourceBuildHashes()"),prior.indexOf("function ownedBrowserAffinity(")));
let server,browser,browserServer;
const results={scope:"Maker visual diagnostic of calibrated production lighting. Default actual Chromium GPU, no forced software, no timing benchmark, no acceptance or reference fidelity claim.",app,port,sourceBuildHashes:sourceBuildHashes(),buildId:fs.readFileSync(path.join(app,".next/BUILD_ID"),"utf8").trim(),launchArgs:[],views:[],browserErrors:[]};
async function canvasBitmap(page,label) {
  const captured=await page.evaluate(async()=>{
    const canvas=document.querySelector('[data-testid="world-canvas"]');
    if(!canvas)throw new Error("Missing world canvas");
    return new Promise((resolve,reject)=>{
      const timeout=setTimeout(()=>reject(new Error("No production render event before bitmap timeout")),10000);
      canvas.addEventListener("yor-world-rendered-frame",event=>{
        clearTimeout(timeout);
        const gl=canvas.getContext("webgl2"),debug=gl?.getExtension("WEBGL_debug_renderer_info");
        resolve({png:canvas.toDataURL("image/png"),frame:event.detail,at:performance.now(),renderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl?.getParameter(gl.RENDERER),antialias:gl?.getContextAttributes()?.antialias,samples:gl?.getParameter(gl.SAMPLES),multiDrawSupport:!!gl?.getExtension("WEBGL_multi_draw"),canvasSize:{width:canvas.width,height:canvas.height},stage:document.querySelector('[data-testid="world-stage-container"]')?.getAttribute("data-lifecycle-state"),capabilities:{hardwareConcurrency:navigator.hardwareConcurrency,deviceMemoryGb:navigator.deviceMemory,devicePixelRatio,saveData:navigator.connection?.saveData,userAgent:navigator.userAgent}});
      },{once:true});
    });
  });
  const pngPath=path.join(outputDir,label+"-canvas-bitmap.png");
  fs.writeFileSync(pngPath,Buffer.from(captured.png.split(",")[1],"base64"));
  delete captured.png;
  const entry={label,bitmapPath:pngPath,lampUiSelection:results.currentLampSelection,...captured,scope:"Native completed WebGL buffer captured synchronously before discard; excludes DOM overlays; actual production render; preserveDrawingBuffer unchanged."};
  results.views.push(entry);
  console.log(JSON.stringify({stage:"canvas-captured",...entry}));
  fs.writeFileSync(path.join(outputDir,"diagnostic-results.json"),JSON.stringify(results,null,2)+"\n");
  const uiPath=path.join(outputDir,label+"-ui.png");
  await page.getByTestId("world-stage-container").screenshot({path:uiPath,timeout:10000});
  entry.uiPath=uiPath;
}
(async()=>{
 try{
  await new Promise((resolve,reject)=>{const probe=net.createServer();probe.once("error",reject);probe.listen(port,"127.0.0.1",()=>probe.close(resolve));});
  const env={...process.env,NEXT_TELEMETRY_DISABLED:"1"};delete env.YOR_E2E_FIXTURE;delete env.YOR_TEST_DATABASE_PATH;
  server=spawn(process.execPath,[path.join(app,"node_modules/next/dist/bin/next"),"start","--hostname","127.0.0.1","--port",String(port)],{cwd:app,env,windowsHide:true,stdio:["ignore","pipe","pipe"]});
  results.serverPid=server.pid;const serverLog=fs.createWriteStream(path.join(outputDir,"server.log"));server.stdout.pipe(serverLog);server.stderr.pipe(serverLog);
  let ready=false;for(let attempt=0;attempt<40;attempt++){try{if((await fetch("http://127.0.0.1:"+port)).ok){ready=true;break;}}catch{}await sleep(500);}
  if(!ready)throw new Error("Production server not ready");
  browserServer=await chromium.launchServer({headless:true,channel:"chromium",args:[],timeout:35000});
  results.ownedBrowserPid=browserServer.process().pid;
  browser=await chromium.connect(browserServer.wsEndpoint(),{timeout:35000});results.browserVersion=browser.version();
  const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});
  const page=await context.newPage();page.on("pageerror",error=>results.browserErrors.push(error.message));
  await page.addInitScript(()=>{window.__lightingDiagnostic={frames:[]};document.addEventListener("yor-world-rendered-frame",event=>window.__lightingDiagnostic.frames.push({...event.detail,at:performance.now()}),true);});
  await page.goto("http://127.0.0.1:"+port+"/?studio=1",{waitUntil:"domcontentloaded",timeout:35000});
  await page.waitForFunction(()=>document.querySelector('[data-testid="world-stage-container"]')?.getAttribute("data-lifecycle-state")==="HOME",null,{timeout:35000});
  results.scope += ' HIGH/LOW lamp ON/OFF/ON actual GUI sequence; stationary HOME camera but resident animation continues; no pixel-identity claim; frozen task spotlight points horizontal +Z; emissive light bar remains bright independently.';
  for(const tier of ["high","low"]){
    await page.getByTestId("quality-tier-select").selectOption(tier,{timeout:10000});
    await page.waitForTimeout(1000);
    await page.waitForFunction(expected=>window.__lightingDiagnostic.frames.at(-1)?.qualityTier===expected,tier,{timeout:10000});
    for(const [index,enabled] of [true,false,true].entries()){
      await page.getByTestId("toggle-room-controls-btn").click({timeout:10000});
      const lamp=page.getByTestId("control-toggle-lamp");
      await lamp.setChecked(enabled,{timeout:10000});
      results.currentLampSelection={enabled:await lamp.isChecked(),selectedVia:"Actual visible GUI checkbox",tier,index:index+1};
      if(results.currentLampSelection.enabled!==enabled)throw new Error("Lamp GUI checkbox state mismatch");
      await page.getByRole("button",{name:"Close room controls panel"}).click({timeout:10000});
      await page.waitForTimeout(1000);
      await canvasBitmap(page,tier+"-home-lamp-"+(enabled?"on":"off")+"-"+(index+1));
    }
  }
  results.renderEventCount=await page.evaluate(()=>window.__lightingDiagnostic.frames.length);
  await context.close();
 }catch(error){results.error=error.message;process.exitCode=1;console.log(JSON.stringify({error:error.message}));}
 finally{
  if(browser)await browser.close().catch(()=>{});if(browserServer)await browserServer.close().catch(()=>{});
  results.browserServerStopped=!browserServer||browserServer.process().exitCode!==null||browserServer.process().signalCode!==null;
  if(server&&server.exitCode===null&&server.signalCode===null){server.kill();await Promise.race([new Promise(resolve=>server.once("exit",resolve)),sleep(5000)]);if(server.exitCode===null&&server.signalCode===null)server.kill("SIGKILL");}
  results.serverStopped=!server||server.exitCode!==null||server.signalCode!==null;results.serverExitCode=server?.exitCode;results.serverSignalCode=server?.signalCode;
  fs.writeFileSync(path.join(outputDir,"diagnostic-results.json"),JSON.stringify(results,null,2)+"\n");
  console.log(JSON.stringify({stage:"closed",outputDir,views:results.views.length,browserServerStopped:results.browserServerStopped,serverStopped:results.serverStopped,error:results.error||null}));
 }
})();