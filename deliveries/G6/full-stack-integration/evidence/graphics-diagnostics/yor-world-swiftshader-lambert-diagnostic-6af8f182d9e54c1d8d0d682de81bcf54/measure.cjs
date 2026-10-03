const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");
const { spawn } = require("node:child_process");
const net = require("node:net");
const app = "C:/Users/yoray/Projects/Yor World/app";
const outputDir = __dirname;
const { chromium } = createRequire(path.join(app, "package.json"))("@playwright/test");
const port = 3199;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let server, browser;
const results = {implementationBaseCommit:"a48ae908562302b2b5eb2809172f56c1bddb5786",implementationLabel:"a48 plus uncommitted capabilities and reversible LOW MeshLambertMaterial strategy",gitHead:"6d819bf699bbf67a56bd9db5ec7ea33dbf1db833",dirtyCanonicalPaths:["app/src/features/room/quality-policy.ts","app/src/features/world/WorldRoot.tsx","app/src/features/world/WorldRuntime.ts","app/tests/unit/quality-policy.test.ts"],scope:"Diagnostic forced SwiftShader; no budget PASS or acceptance claim",app,port,launchArgs:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"],cases:[]};
function stats(samples) {
  const s = [...samples].sort((a,b)=>a-b);
  return {count:s.length,median:s.length ? s[Math.floor(s.length/2)] : null,p95:s.length ? s[Math.min(s.length-1,Math.floor(s.length*.95))] : null};
}
async function runCase(mode) {
  const context = await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});
  const page = await context.newPage();
  const browserErrors = [];
  page.on("pageerror", e => browserErrors.push(e.message));
  await page.addInitScript(() => {
    const d = window.__swiftDiagnostic = {
      timeOrigin:performance.timeOrigin,
      capabilities:{hardwareConcurrency:navigator.hardwareConcurrency,deviceMemoryGb:navigator.deviceMemory,saveData:navigator.connection?.saveData,devicePixelRatio:devicePixelRatio,userAgent:navigator.userAgent},
      frames:[],states:[],firstFrameAt:null,firstHomeAt:null,staticAt:null,renderer:null,antialias:null,samples:null,canvasSize:null,explicitPreference:null
    };
    let state = null, lastDelivered = null;
    document.addEventListener("yor-world-rendered-frame", event => {
      const now = performance.now(), frame = event.detail;
      d.firstFrameAt ??= now;
      if(frame.lifecycleState === "HOME") d.firstHomeAt ??= now;
      d.frames.push({...frame,deliveredAt:now,completedRenderIntervalMs:lastDelivered === null ? null : now-lastDelivered});
      lastDelivered = now;
      if(d.renderer === null) {
        const canvas = event.target;
        const gl = canvas.getContext("webgl2");
        const debug = gl?.getExtension("WEBGL_debug_renderer_info");
        d.renderer = debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl?.getParameter(gl.RENDERER);
        d.antialias = gl?.getContextAttributes()?.antialias;
        d.samples = gl?.getParameter(gl.SAMPLES);
        d.canvasSize = {width:canvas.width,height:canvas.height};
      }
    },true);
    const recordState = () => {
      const stage = document.querySelector('[data-testid="world-stage-container"]');
      const next = document.querySelector('[data-testid="world-static-container"]') ? "STATIC" : document.querySelector('[data-testid="world-failure-container"]') ? "FAILURE" : stage?.getAttribute("data-lifecycle-state") || "ABSENT";
      if(next !== state) {
        d.states.push({state:next,at:performance.now()});
        if(next === "STATIC") d.staticAt ??= performance.now();
        state = next;
      }
    };
    new MutationObserver(recordState).observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:["data-lifecycle-state"]});
  });
  try {
    console.log("START "+mode);
    await page.goto("http://127.0.0.1:"+port+"/?studio=1",{waitUntil:"domcontentloaded",timeout:35000});
    if(mode.includes("explicit-low-ui")) {
      await page.getByTestId("quality-tier-select").selectOption("low",{timeout:25000});
      await page.evaluate(() => {window.__swiftDiagnostic.explicitPreference={value:"low",selectedAt:performance.now(),label:"Actual UI preference, diagnostic only"};});
    }
    await page.waitForFunction(() => window.__swiftDiagnostic.firstFrameAt !== null || window.__swiftDiagnostic.staticAt !== null,{timeout:35000});
    console.log("FIRST_FRAME "+mode);
    await page.waitForTimeout(25000);
    const data = await page.evaluate(() => ({...window.__swiftDiagnostic,capturedAt:performance.now(),finalStage:document.querySelector('[data-testid="world-stage-container"]')?.getAttribute("data-lifecycle-state") || null,finalCanvasConnected:!!document.querySelector('[data-testid="world-canvas"]'),fallbackText:document.querySelector('[data-testid="world-static-container"],[data-testid="world-failure-container"]')?.textContent || null}));
    const tiers = [];
    for(const frame of data.frames) if(tiers.at(-1)?.tier !== frame.qualityTier) tiers.push({tier:frame.qualityTier,at:frame.deliveredAt});
    const summary = {mode,renderer:data.renderer,capabilities:data.capabilities,antialias:data.antialias,samples:data.samples,canvasSize:data.canvasSize,timeToFirstFrameMs:data.firstFrameAt,timeToHomeMs:data.firstHomeAt,staticAtMs:data.staticAt,tierProgression:tiers,rawRafStats:stats(data.frames.map(f=>f.durationMs).filter(n=>n>0)),completedRenderStats:stats(data.frames.map(f=>f.completedRenderIntervalMs).filter(n=>n>0)),finalStage:data.finalStage,finalCanvasConnected:data.finalCanvasConnected,explicitPreference:data.explicitPreference,browserErrors};
    const screenshots = [];
    if(data.finalCanvasConnected && data.finalStage === "HOME") {
      try {
        const homePath = path.join(outputDir,"home.png");
        await page.getByTestId("world-stage-container").screenshot({path:homePath,timeout:10000});
        screenshots.push({view:"HOME",path:homePath,scope:"After 25-second sample snapshot; screenshot overhead excluded from reported samples"});
        await page.getByTestId("camera-monitor-btn").click({timeout:10000});
        await page.waitForTimeout(750);
        const pcPath = path.join(outputDir,"monitor-camera.png");
        await page.getByTestId("world-stage-container").screenshot({path:pcPath,timeout:10000});
        screenshots.push({view:"monitor-camera",path:pcPath,scope:"Actual camera-monitor UI; after timing sample"});
      } catch(error) { screenshots.push({error:error.message}); }
    }
    const entry = {summary,data,screenshots};
    results.cases.push(entry);
    fs.writeFileSync(path.join(outputDir,mode+".json"),JSON.stringify(entry,null,2)+"\n");
    console.log(JSON.stringify(summary));
  } catch(error) {
    const entry = {mode,error:error.message,browserErrors};
    try {entry.data = await page.evaluate(() => window.__swiftDiagnostic);} catch{}
    results.cases.push(entry);
    fs.writeFileSync(path.join(outputDir,mode+".json"),JSON.stringify(entry,null,2)+"\n");
    console.log(JSON.stringify({mode,error:error.message}));
  } finally {await context.close();}
}
(async()=>{
  try {
    await new Promise((resolve,reject)=>{
      const probe=net.createServer();
      probe.once("error",reject);
      probe.listen(port,"127.0.0.1",()=>probe.close(resolve));
    });
    const env={...process.env,NEXT_TELEMETRY_DISABLED:"1"};
    delete env.YOR_E2E_FIXTURE; delete env.YOR_TEST_DATABASE_PATH;
    server=spawn(process.execPath,[path.join(app,"node_modules/next/dist/bin/next"),"start","--hostname","127.0.0.1","--port",String(port)],{cwd:app,env,windowsHide:true,stdio:["ignore","pipe","pipe"]});
    results.serverPid=server.pid;
    const serverLog=fs.createWriteStream(path.join(outputDir,"server.log"));
    server.stdout.pipe(serverLog); server.stderr.pipe(serverLog);
    let ready=false;
    for(let attempt=0;attempt<40;attempt++){try{const response=await fetch("http://127.0.0.1:"+port);if(response.ok){ready=true;break;}}catch{}await sleep(500);}
    if(!ready) throw new Error("Diagnostic production server did not become ready.");
    browser=await chromium.launch({headless:true,channel:"chromium",args:results.launchArgs,timeout:35000});
    results.browserVersion=browser.version();
    await runCase("auto");
  } catch(error) {results.error=error.message;process.exitCode=1;}
  finally {
    if(browser) await browser.close().catch(()=>{});
    if(server && server.exitCode===null && server.signalCode===null) {
      server.kill();
      await Promise.race([new Promise(resolve=>server.once("exit",resolve)),sleep(5000)]);
      if(server.exitCode===null && server.signalCode===null) server.kill("SIGKILL");
    }
    results.serverStopped=!server || server.exitCode !== null || server.signalCode !== null;
    results.serverExitCode=server?.exitCode; results.serverSignalCode=server?.signalCode;
    fs.writeFileSync(path.join(outputDir,"diagnostic-results.json"),JSON.stringify(results,null,2)+"\n");
    console.log(JSON.stringify({outputDir,serverStopped:results.serverStopped,cases:results.cases.length,error:results.error||null}));
  }
})();

