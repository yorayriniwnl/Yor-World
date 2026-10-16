import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../../../');
const appRoot = 'D:\\p35\\app';
const outputRoot = path.join(here, 'diagnostic-run');
const node24 = 'C:\\Users\\ayush\\AppData\\Local\\Temp\\yor-world-node-24.19.0\\unpacked\\node-v24.19.0-win-x64\\node.exe';
const port = 3223;
const baseURL = `http://127.0.0.1:${port}`;
const sourceCommit = '5c1e6aedb71d89d46ffc0ada8de522526290131c';
const appTree = '62a08db251ef15254523bfb08b926ce7c6954ebc';
const buildId = 'YeuUJsHpZHf4H1-GP30nT';
const appRequire = createRequire(path.join(appRoot, 'package.json'));
const { chromium } = appRequire('@playwright/test');
const playwrightVersion = appRequire('@playwright/test/package.json').version;

fs.mkdirSync(outputRoot, { recursive: true });
const startedAt = new Date().toISOString();
const serverStdout = [];
const serverStderr = [];
const browserEvents = [];
let server;
let browser;
let browserVersion = null;
let context;
let page;
let cdp;
let tracingStarted = false;
let profilerStarted = false;
let cpuProfile = null;
let cpuProfileResult = 'NOT RUN';
let cpuProfileError = null;
const profilerClock = { beforeStart: null, afterStart: null, beforeStop: null, afterStop: null };
let navigation = null;
let browserObservation = null;
let screenshotResult = 'NOT RUN';
let traceResult = 'NOT RUN';
let fatalError = null;

async function cdpClockProbe() {
  const { metrics } = await cdp.send('Performance.getMetrics');
  const byName = Object.fromEntries(metrics.map((metric) => [metric.name, metric.value]));
  return {
    hostEpochMs: Date.now(),
    cdpTimestampSeconds: byName['Timestamp'] ?? null,
    cdpTimeOriginSeconds: byName['TimeOrigin'] ?? null,
    scriptDurationSeconds: byName['ScriptDuration'] ?? null,
    taskDurationSeconds: byName['TaskDuration'] ?? null,
  };
}

function appendChunk(target, chunk) {
  target.push(Buffer.from(chunk));
}

function withTimeout(promise, durationMs, label) {
  let timer;
  return Promise.race([
    promise,
    new Promise((resolve) => {
      timer = setTimeout(() => resolve({ timeout: true, label }), durationMs);
    }),
  ]).finally(() => clearTimeout(timer));
}

const observerScript = () => {
  const run = {
    timeOrigin: performance.timeOrigin,
    startedAtEpochMs: Date.now(),
    stateChanges: [],
    longTasks: [],
    animationFrameGaps: [],
    pageErrors: [],
    maxAnimationFrameGapMs: 0,
  };
  let previousStateKey = '';
  let previousFrameTime = performance.now();
  let frameCount = 0;

  const recordState = () => {
    const stage = document.querySelector('[data-testid="world-stage-container"]');
    const overlay = document.querySelector('[data-testid="world-loading-overlay"]');
    const progress = document.querySelector('[data-testid="world-loading-percentage"]')?.textContent?.trim() ?? null;
    const loadingStage = document.querySelector('[data-testid="world-loading-stage"]')?.textContent?.trim() ?? null;
    const lifecycleState = stage?.getAttribute('data-lifecycle-state') ?? null;
    const stateKey = `${lifecycleState}|${loadingStage}|${progress}|${Boolean(overlay)}`;
    if (stateKey === previousStateKey) return;
    previousStateKey = stateKey;
    run.stateChanges.push({
      atMs: Number(performance.now().toFixed(2)),
      epochMs: Date.now(),
      lifecycleState,
      loadingStage,
      progress,
      loadingOverlayPresent: Boolean(overlay),
      canvasPresent: Boolean(document.querySelector('[data-testid="world-canvas"]')),
    });
  };

  const mutationObserver = new MutationObserver(recordState);
  const observeDocument = () => {
    if (document.documentElement) mutationObserver.observe(document.documentElement, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['data-lifecycle-state', 'aria-valuenow'],
    });
    recordState();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', observeDocument, { once: true });
  else observeDocument();

  try {
    const longTaskObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) run.longTasks.push({
        startTimeMs: Number(entry.startTime.toFixed(2)),
        durationMs: Number(entry.duration.toFixed(2)),
        name: entry.name,
        attribution: Array.from(entry.attribution ?? []).map((item) => ({
          name: item.name,
          entryType: item.entryType,
          containerType: item.containerType,
          containerName: item.containerName,
          containerId: item.containerId,
        })),
      });
    });
    longTaskObserver.observe({ type: 'longtask', buffered: true });
  } catch (error) {
    run.longTaskObserverError = String(error);
  }

  const frame = (now) => {
    const gap = now - previousFrameTime;
    if (gap > 250) {
      run.animationFrameGaps.push({
        afterMs: Number(previousFrameTime.toFixed(2)),
        atMs: Number(now.toFixed(2)),
        gapMs: Number(gap.toFixed(2)),
      });
      run.maxAnimationFrameGapMs = Math.max(run.maxAnimationFrameGapMs, gap);
    }
    previousFrameTime = now;
    frameCount++;
    if (frameCount % 60 === 0) recordState();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  window.addEventListener('error', (event) => run.pageErrors.push({
    type: 'error',
    atMs: Number(performance.now().toFixed(2)),
    message: event.message,
    filename: event.filename,
    line: event.lineno,
    column: event.colno,
  }));
  window.addEventListener('unhandledrejection', (event) => run.pageErrors.push({
    type: 'unhandledrejection',
    atMs: Number(performance.now().toFixed(2)),
    message: String(event.reason?.stack ?? event.reason),
  }));
  Object.defineProperty(window, '__PRE_G7_36_STARTUP__', { value: run, configurable: false });
};

try {
  const serverEnv = { ...process.env, PORT: String(port), NEXT_TELEMETRY_DISABLED: '1' };
  for (const key of ['CI', 'NODE_OPTIONS', 'NEXT_PUBLIC_PRE_G7_13_EVIDENCE', 'C3_EVIDENCE_DIR', 'PRE_G7_13_EVIDENCE_MODE', 'PRE_G7_13_REQUIRE_ISOLATED_EVIDENCE', 'PRE_G7_13_EVIDENCE_DIR', 'PRE_G7_13_EXPECTED_EVIDENCE_DIR']) delete serverEnv[key];
  serverEnv.PATH = `${path.dirname(node24)}${path.delimiter}${serverEnv.PATH ?? ''}`;

  server = spawn(node24, [
    path.join(appRoot, 'node_modules/next/dist/bin/next'),
    'start', '--hostname', '127.0.0.1', '--port', String(port),
  ], { cwd: appRoot, env: serverEnv, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  server.stdout.on('data', (chunk) => appendChunk(serverStdout, chunk));
  server.stderr.on('data', (chunk) => appendChunk(serverStderr, chunk));
  server.on('error', (error) => browserEvents.push({ type: 'server-error', message: String(error) }));

  const serverDeadline = Date.now() + 60_000;
  let serverReady = false;
  let lastServerError = null;
  while (Date.now() < serverDeadline) {
    if (server.exitCode !== null) throw new Error(`Next server exited early with code ${server.exitCode}.`);
    try {
      const response = await fetch(`${baseURL}/`);
      if (response.status === 200) {
        serverReady = true;
        break;
      }
      lastServerError = `HTTP ${response.status}`;
    } catch (error) {
      lastServerError = String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  if (!serverReady) throw new Error(`Next server did not become ready: ${lastServerError}`);

  browser = await chromium.launch({ channel: 'chrome', headless: true });
  browserVersion = browser.version();
  context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await context.tracing.start({ screenshots: true, snapshots: true, sources: false });
  tracingStarted = true;
  page = await context.newPage();
  await page.addInitScript(observerScript);
  cdp = await context.newCDPSession(page);
  await cdp.send('Performance.enable');
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.setSamplingInterval', { interval: 1000 });
  profilerClock.beforeStart = await cdpClockProbe();
  await cdp.send('Profiler.start');
  profilerStarted = true;
  profilerClock.afterStart = await cdpClockProbe();
  page.on('console', (message) => browserEvents.push({ type: 'console', messageType: message.type(), text: message.text(), epochMs: Date.now() }));
  page.on('pageerror', (error) => browserEvents.push({ type: 'pageerror', message: String(error.stack ?? error), epochMs: Date.now() }));
  page.on('requestfailed', (request) => browserEvents.push({ type: 'requestfailed', url: request.url(), failure: request.failure()?.errorText ?? null, epochMs: Date.now() }));
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/models/') || url.includes('/_next/static/chunks/')) {
      browserEvents.push({
        type: 'response',
        url,
        status: response.status(),
        requestStartRelativeMs: response.request().timing().startTime,
        receivedAtEpochMs: Date.now(),
      });
    }
  });

  const navigationStartedAt = Date.now();
  try {
    const response = await page.goto(`${baseURL}/?studio=1`, { waitUntil: 'domcontentloaded' });
    navigation = { status: response?.status() ?? null, url: page.url(), elapsedMs: Date.now() - navigationStartedAt };
  } catch (error) {
    navigation = { status: null, url: page.url(), elapsedMs: Date.now() - navigationStartedAt, error: String(error) };
  }

  await new Promise((resolve) => setTimeout(resolve, 40_000));
  const observed = await withTimeout(page.evaluate(() => {
    const stage = document.querySelector('[data-testid="world-stage-container"]');
    const canvas = document.querySelector('[data-testid="world-canvas"]');
    const observer = window.__PRE_G7_36_STARTUP__;
    return {
      timeOrigin: performance.timeOrigin,
      documentVisibility: document.visibilityState,
      url: location.href,
      lifecycleState: stage?.getAttribute('data-lifecycle-state') ?? null,
      loadingStage: document.querySelector('[data-testid="world-loading-stage"]')?.textContent?.trim() ?? null,
      loadingProgress: document.querySelector('[data-testid="world-loading-percentage"]')?.textContent?.trim() ?? null,
      loadingOverlayPresent: Boolean(document.querySelector('[data-testid="world-loading-overlay"]')),
      canvasPresent: Boolean(canvas),
      canvasSize: canvas ? { width: canvas.clientWidth, height: canvas.clientHeight } : null,
      renderedFrames: canvas?.getAttribute('data-rendered-frames') ?? null,
      observer,
      resources: performance.getEntriesByType('resource')
        .filter((entry) => entry.name.includes('/models/') || entry.name.includes('/_next/static/chunks/'))
        .map((entry) => ({ name: entry.name, startTimeMs: Number(entry.startTime.toFixed(2)), durationMs: Number(entry.duration.toFixed(2)), responseEndMs: Number(entry.responseEnd.toFixed(2)), transferSize: entry.transferSize })),
    };
  }), 15_000, 'page-evaluate-after-observation');
  browserObservation = observed?.timeout ? { error: 'Page evaluation did not return within 15 seconds.', timeoutLabel: observed.label } : observed;

  const screenshotPath = path.join(outputRoot, 'startup-cpu-profile-final.png');
  const screenshot = await withTimeout(page.screenshot({ path: screenshotPath, fullPage: false }), 10_000, 'final-screenshot');
  screenshotResult = screenshot?.timeout ? 'TIMEOUT' : 'CAPTURED';
} catch (error) {
  fatalError = String(error?.stack ?? error);
} finally {
  if (cdp && profilerStarted) {
    try {
      profilerClock.beforeStop = await cdpClockProbe();
      const stopped = await cdp.send('Profiler.stop');
      cpuProfile = stopped.profile;
      profilerStarted = false;
      cpuProfileResult = 'CAPTURED';
      fs.writeFileSync(path.join(outputRoot, 'startup-cpu-profile.json'), `${JSON.stringify(cpuProfile)}\n`, 'utf8');
      profilerClock.afterStop = await cdpClockProbe();
    } catch (error) {
      cpuProfileError = String(error?.stack ?? error);
      cpuProfileResult = 'ERROR';
    }
  }
  if (context && tracingStarted) {
    try {
      const tracePath = path.join(outputRoot, 'startup-cpu-profile-trace.zip');
      const result = await withTimeout(context.tracing.stop({ path: tracePath }), 15_000, 'trace-stop');
      traceResult = result?.timeout ? 'TIMEOUT' : 'CAPTURED';
    } catch (error) {
      traceResult = `ERROR: ${String(error)}`;
    }
  }
  if (browser) {
    try { await withTimeout(browser.close(), 10_000, 'browser-close'); } catch {}
  }
  if (server && server.exitCode === null) {
    server.kill();
    await withTimeout(new Promise((resolve) => server.once('exit', resolve)), 5_000, 'server-close');
  }
}

fs.writeFileSync(path.join(outputRoot, 'server.stdout.bin'), Buffer.concat(serverStdout));
fs.writeFileSync(path.join(outputRoot, 'server.stderr.bin'), Buffer.concat(serverStderr));
const result = {
  packet: 'PRE-G7-36',
  sourceCommit,
  appTree,
  sourceCommitDomainTree: '89ca7d46f790f062e63fcae2368c24ae557e03ab',
  reusedBuildId: buildId,
  nodePath: node24,
  nodeVersion: process.version,
  playwrightVersion,
  browserChannel: 'chrome',
  browserVersion,
  headless: true,
  port,
  baseURL,
  route: '/?studio=1',
  observationWindowMs: 40_000,
  profilerSamplingIntervalMicroseconds: 1000,
  profilerClock,
  profiler: {
    status: cpuProfileResult,
    error: cpuProfileError,
    output: cpuProfile ? 'diagnostic-run/startup-cpu-profile.json' : null,
    startTime: cpuProfile?.startTime ?? null,
    endTime: cpuProfile?.endTime ?? null,
    sampleCount: cpuProfile?.samples?.length ?? null,
    nodeCount: cpuProfile?.nodes?.length ?? null,
  },
  startedAt,
  endedAt: new Date().toISOString(),
  navigation,
  browserObservation,
  browserEvents,
  screenshot: screenshotResult,
  trace: traceResult,
  fatalError,
};
fs.writeFileSync(path.join(outputRoot, 'startup-cpu-profile-diagnostic.json'), `${JSON.stringify(result, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
  status: fatalError || cpuProfileResult !== 'CAPTURED' ? 'FAIL' : 'CAPTURED',
  sourceCommit,
  browserVersion: result.browserVersion,
  finalLifecycleState: browserObservation?.lifecycleState ?? browserObservation?.observer?.stateChanges?.at(-1)?.lifecycleState ?? null,
  longTaskCount: browserObservation?.observer?.longTasks?.length ?? null,
  maxAnimationFrameGapMs: browserObservation?.observer?.maxAnimationFrameGapMs ?? null,
  trace: traceResult,
  screenshot: screenshotResult,
  cpuProfile: cpuProfileResult,
  cpuProfileSamples: cpuProfile?.samples?.length ?? null,
  fatalError,
}, null, 2));
if (fatalError || cpuProfileResult !== 'CAPTURED') process.exitCode = 1;
