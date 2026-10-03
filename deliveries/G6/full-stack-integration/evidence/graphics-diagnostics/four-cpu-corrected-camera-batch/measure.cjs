const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");
const { spawn, execFileSync } = require("node:child_process");
const net = require("node:net");
const crypto = require("node:crypto");
const app = "C:/Users/yoray/Projects/Yor World/app";
const outputDir = __dirname;
const { chromium } = createRequire(path.join(app, "package.json"))("@playwright/test");
const port = 3199;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
function sourceBuildHashes() {
  const root=path.dirname(app);
  const git=(...args)=>execFileSync("git",args,{cwd:root,encoding:"utf8"}).trim();
  const hash=bytes=>crypto.createHash("sha256").update(bytes).digest("hex");
  const names=[...new Set(git("ls-files","--cached","--others","--exclude-standard","--","app").split("\n").filter(Boolean))].sort();
  const textFile=name=>/\.(?:[cm]?[jt]sx?|json|ya?ml|md|txt|log|css|html|sql|svg|patch|toml|example)$/.test(name) || /(?:^|\/)(?:\.gitignore|\.npmrc)$/.test(name);
  const files=names.map(name=>{
    const raw=fs.readFileSync(path.join(root,name));
    const bytes=textFile(name) ? Buffer.from(raw.toString("utf8").replace(/\r\n/g,"\n")) : raw;
    return {path:name,bytes:bytes.length,sha256:hash(bytes),hashMode:textFile(name) ? "lf" : "raw"};
  });
  const compiledNames=[".next/BUILD_ID",".next/server/app/(public)/page.js",".next/app-path-routes-manifest.json",".next/server/app-paths-manifest.json"];
  return {gitHead:git("rev-parse","HEAD"),dirtyTrackedPaths:git("diff","--name-only","HEAD","--","app").split("\n").filter(Boolean),untrackedPaths:git("ls-files","--others","--exclude-standard","--","app").split("\n").filter(Boolean),sourceTreeSha256:hash(Buffer.from(files.map(file=>file.path+"\0"+file.sha256+"\0"+file.bytes+"\n").join(""))),sourceTreeHashPolicy:"Sorted tracked/untracked canonical app files, excluding Git-ignored artifacts; per-file text normalized LF, binary raw; SHA256(path NUL digest NUL bytes LF). Uncommitted worktree diagnostic only.",files,build:compiledNames.map(name=>({path:"app/"+name,sha256:hash(fs.readFileSync(path.join(app,name)))}))};
}
function ownedBrowserAffinity(ownedPid, applyMask) {
  if(!Number.isInteger(ownedPid) || ownedPid <= 0) throw new Error("NOT RUN: invalid owned BrowserServer PID");
  const script = String.raw`
$ErrorActionPreference = 'Stop'
$ownedBrowserId = [uint32]${ownedPid}
$shouldApplyMask = ${applyMask ? "$true" : "$false"}
$requestedMask = [int64]15
$snapshot = @(Get-CimInstance Win32_Process -Property ProcessId,ParentProcessId,Name,CreationDate)
$originalRoot = $snapshot | Where-Object { $_.ProcessId -eq $ownedBrowserId } | Select-Object -First 1
if ($null -eq $originalRoot -or $originalRoot.Name -ne 'chrome.exe') { throw 'NOT RUN: owned BrowserServer root not verified as Chromium' }
$ownedSet = [System.Collections.Generic.HashSet[uint32]]::new()
$ownedSet.Add($ownedBrowserId) | Out-Null
do {
  $foundChild = $false
  foreach ($candidateProcess in $snapshot) {
    if ($ownedSet.Contains([uint32]$candidateProcess.ParentProcessId) -and $ownedSet.Add([uint32]$candidateProcess.ProcessId)) { $foundChild = $true }
  }
} while ($foundChild)
$orderedIds = @($ownedBrowserId) + @($ownedSet | Where-Object { $_ -ne $ownedBrowserId } | Sort-Object)
$records = [System.Collections.Generic.List[object]]::new()
foreach ($ownedProcessId in $orderedIds) {
  $originalProcess = $snapshot | Where-Object { $_.ProcessId -eq $ownedProcessId } | Select-Object -First 1
  $currentProcess = Get-CimInstance Win32_Process -Filter ('ProcessId=' + $ownedProcessId) -Property ProcessId,ParentProcessId,Name,CreationDate,CommandLine
  if ($null -eq $currentProcess) { continue }
  if ($currentProcess.CreationDate -ne $originalProcess.CreationDate -or $currentProcess.ParentProcessId -ne $originalProcess.ParentProcessId -or $currentProcess.Name -ne $originalProcess.Name) { throw 'NOT RUN: browser child identity changed before affinity assignment' }
  if ($ownedProcessId -ne $ownedBrowserId -and -not $ownedSet.Contains([uint32]$currentProcess.ParentProcessId)) { throw 'NOT RUN: browser child no longer belongs to owned tree' }
  $nativeProcess = Get-Process -Id $ownedProcessId
  $beforeMask = $nativeProcess.ProcessorAffinity.ToInt64()
  if ($shouldApplyMask) {
    if (($beforeMask -band $requestedMask) -ne $requestedMask) { throw 'NOT RUN: requested four CPUs are outside current allowed affinity' }
    $nativeProcess.ProcessorAffinity = [IntPtr]$requestedMask
    $nativeProcess.Refresh()
  }
  $afterMask = $nativeProcess.ProcessorAffinity.ToInt64()
  if ($afterMask -ne $requestedMask) { throw 'NOT RUN: actual owned browser affinity does not match mask0xF' }
  $processType = if ($ownedProcessId -eq $ownedBrowserId) { 'browser' } elseif ($currentProcess.CommandLine -match '--type=([^ ]+)') { $Matches[1] } else { 'owned-child' }
  $records.Add([pscustomobject]@{processId=[int]$ownedProcessId;parentProcessId=[int]$currentProcess.ParentProcessId;name=$currentProcess.Name;processType=$processType;creationDate=$currentProcess.CreationDate.ToUniversalTime().ToString('o');beforeMask=$beforeMask;afterMask=$afterMask})
}
if (-not ($records | Where-Object { $_.processType -eq 'gpu-process' })) { throw 'NOT RUN: owned GPU child was not observed before timing' }
[pscustomobject]@{ownedBrowserPid=[int]$ownedBrowserId;requestedMask='0xF';logicalCpuCount=4;applyMask=$shouldApplyMask;records=@($records.ToArray());scope='Only verified root BrowserServer PID and its descendants; no other process/system affinity changed'} | ConvertTo-Json -Depth 5 -Compress
`;
  const output=execFileSync("powershell.exe",["-NoProfile","-NonInteractive","-Command",script],{encoding:"utf8",windowsHide:true,timeout:20000});
  const evidence=JSON.parse(output.trim());
  console.log(JSON.stringify({affinity:applyMask ? "assigned" : "verified-after",ownedBrowserPid:ownedPid,processCount:evidence.records.length,actualMasks:[...new Set(evidence.records.map(r=>r.afterMask))]}));
  return evidence;
}
let server, browser, browserServer;
const results = {sourceBuildHashes:sourceBuildHashes(),buildId:fs.readFileSync(path.join(app,".next/BUILD_ID"),"utf8").trim(),implementationBaseCommit:"a48ae908562302b2b5eb2809172f56c1bddb5786",implementationLabel:"a48 plus uncommitted capabilities, reversible LOW Lambert/DPR0.5/batching and corrected production camera geometry",gitHead:"6d819bf699bbf67a56bd9db5ec7ea33dbf1db833",dirtyCanonicalPaths:["app/src/features/room/quality-policy.ts","app/src/features/world/WorldRoot.tsx","app/src/features/world/WorldRuntime.ts","app/tests/unit/quality-policy.test.ts"],scope:"Diagnostic forced SwiftShader with ONLY owned browser tree limited to4 logical CPUs; no final budget PASS or acceptance claim",app,port,launchArgs:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"],cases:[]};
function stats(samples) {
  const s = [...samples].sort((a,b)=>a-b);
  return {count:s.length,median:s.length ? s[Math.floor(s.length/2)] : null,p95:s.length ? s[Math.min(s.length-1,Math.floor(s.length*.95))] : null};
}
async function runCase(mode) {
  const context = await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});
  const page = await context.newPage();
  results.affinityBefore = ownedBrowserAffinity(results.ownedBrowserPid, true);
  const browserErrors = [];
  page.on("pageerror", e => browserErrors.push(e.message));
  await page.addInitScript(() => {
    const d = window.__swiftDiagnostic = {
      timeOrigin:performance.timeOrigin,
      capabilities:{hardwareConcurrency:navigator.hardwareConcurrency,deviceMemoryGb:navigator.deviceMemory,saveData:navigator.connection?.saveData,devicePixelRatio:devicePixelRatio,userAgent:navigator.userAgent},
      frames:[],states:[],firstFrameAt:null,firstHomeAt:null,staticAt:null,renderer:null,antialias:null,samples:null,multiDrawSupport:null,canvasSize:null,explicitPreference:null
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
        d.multiDrawSupport = !!gl?.getExtension("WEBGL_multi_draw");
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
    const summary = {mode,renderer:data.renderer,capabilities:data.capabilities,antialias:data.antialias,samples:data.samples,multiDrawSupport:data.multiDrawSupport,canvasSize:data.canvasSize,timeToFirstFrameMs:data.firstFrameAt,timeToHomeMs:data.firstHomeAt,staticAtMs:data.staticAt,tierProgression:tiers,rawRafStats:stats(data.frames.map(f=>f.durationMs).filter(n=>n>0)),completedRenderStats:stats(data.frames.map(f=>f.completedRenderIntervalMs).filter(n=>n>0)),finalStage:data.finalStage,finalCanvasConnected:data.finalCanvasConnected,explicitPreference:data.explicitPreference,browserErrors};
    results.affinityAfter = ownedBrowserAffinity(results.ownedBrowserPid, false);
    console.log(JSON.stringify({stage:"measurement-complete",summary}));
    const screenshots = [];
    async function captureView(label) {
      const uiPath=path.join(outputDir,label+"-ui.png");
      await page.getByTestId("world-stage-container").screenshot({path:uiPath,timeout:10000});
      screenshots.push({view:label,kind:"normal-ui",path:uiPath,scope:"After 25-second sample snapshot; screenshot overhead excluded"});
      const locatorPath=path.join(outputDir,label+"-canvas-locator.png");
      await page.getByTestId("world-canvas").screenshot({path:locatorPath,timeout:10000});
      screenshots.push({view:label,kind:"canvas-locator-screenshot",path:locatorPath,scope:"Actual canvas bounding box screenshot; DOM overlays may still cover that box"});
      const bitmap=await page.evaluate(async()=>{
        const canvas=document.querySelector('[data-testid="world-canvas"]');
        if(!canvas) throw new Error("Missing active canvas for bitmap capture");
        return new Promise((resolve,reject)=>{
          const timeout=setTimeout(()=>reject(new Error("No completed render for canvas bitmap")),8000);
          canvas.addEventListener("yor-world-rendered-frame",()=>{
            clearTimeout(timeout);
            try {resolve(canvas.toDataURL("image/png"));} catch(error) {reject(error);}
          },{once:true});
        });
      });
      const bitmapPath=path.join(outputDir,label+"-canvas-bitmap.png");
      fs.writeFileSync(bitmapPath,Buffer.from(bitmap.split(",")[1],"base64"));
      screenshots.push({view:label,kind:"canvas-bitmap-no-dom-ui",path:bitmapPath,scope:"Actual completed WebGL render captured synchronously before buffer discard; excludes DOM controls; preserveDrawingBuffer unchanged"});
    }
    if(data.finalCanvasConnected && data.finalStage === "HOME") {
      try {
        await captureView("home");
        await page.getByTestId("camera-monitor-btn").click({timeout:10000});
        await page.waitForTimeout(750);
        await captureView("monitor");
        await page.getByTestId("camera-home-btn").click({timeout:10000});
        await page.getByTestId("quality-tier-select").selectOption("high",{timeout:10000});
        await page.waitForTimeout(750);
        await captureView("explicit-high-home");
        await page.getByTestId("camera-monitor-btn").click({timeout:10000});
        await page.waitForTimeout(750);
        await captureView("explicit-high-monitor");
        screenshots.push({scope:"HIGH captures use actual post-sample user selector preference for visual comparison only; not AUTO timing or performance proof"});
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
    browserServer=await chromium.launchServer({headless:true,channel:"chromium",args:results.launchArgs,timeout:35000});
    results.ownedBrowserPid=browserServer.process().pid;
    browser=await chromium.connect(browserServer.wsEndpoint(),{timeout:35000});
    results.browserVersion=browser.version();
    await runCase("auto");
  } catch(error) {results.error=error.message;process.exitCode=1;}
  finally {
    if(browser) await browser.close().catch(()=>{});
    if(browserServer) await browserServer.close().catch(()=>{});
    results.browserServerStopped=!browserServer || browserServer.process().exitCode!==null || browserServer.process().signalCode!==null;
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

