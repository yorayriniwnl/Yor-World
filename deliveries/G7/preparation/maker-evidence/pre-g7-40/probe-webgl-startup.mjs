import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../../../');
const appRoot = 'D:\\p38\\app';
const outputRoot = path.join(here, 'diagnostic-run');
const node24 = 'C:\\Users\\ayush\\AppData\\Local\\Temp\\yor-world-node-24.19.0\\unpacked\\node-v24.19.0-win-x64\\node.exe';
const port = 3227;
const baseURL = `http://127.0.0.1:${port}`;
const sourceCommit = '4c3908b61d728babeaf67419d225c1f3978bb779';
const appTree = 'c0ba382dae8bd05f0cee339e40f98a24db40347d';
const sourceCommitDomainTree = 'e9861f48ed2fdf96e7cf7f3dd495679d958f30e6';
const buildIdBytes = fs.readFileSync(path.join(appRoot, '.next/BUILD_ID'));
const buildId = buildIdBytes.toString('utf8').trim();
const buildIdSha256 = createHash('sha256').update(buildIdBytes).digest('hex');
const appRequire = createRequire(path.join(appRoot, 'package.json'));
const { chromium } = appRequire('@playwright/test');
const playwrightVersion = appRequire('@playwright/test/package.json').version;
const observedMethods = ['getProgramInfoLog', 'getShaderInfoLog', 'getProgramParameter', 'getUniformLocation', 'getAttribLocation'];

fs.mkdirSync(outputRoot, { recursive: true });
const startedAt = new Date().toISOString();
const serverStdout = [];
const serverStderr = [];
const browserEvents = [];
let server;
let browser;
let context;
let page;
let browserVersion = null;
let navigation = null;
let browserObservation = null;
let screenshotStatus = 'NOT RUN';
let fatalError = null;

function appendChunk(target, chunk) { target.push(Buffer.from(chunk)); }

const observerAndInstrument = (methods) => {
  const programParameterEnums = [
    'DELETE_STATUS',
    'COMPILE_STATUS',
    'LINK_STATUS',
    'VALIDATE_STATUS',
    'INFO_LOG_LENGTH',
    'ATTACHED_SHADERS',
    'ACTIVE_UNIFORMS',
    'ACTIVE_UNIFORM_MAX_LENGTH',
    'ACTIVE_ATTRIBUTES',
    'ACTIVE_ATTRIBUTE_MAX_LENGTH',
    'TRANSFORM_FEEDBACK_VARYINGS',
    'TRANSFORM_FEEDBACK_BUFFER_MODE',
    'TRANSFORM_FEEDBACK_VARYING_MAX_LENGTH',
    'ACTIVE_UNIFORM_BLOCKS',
    'ACTIVE_UNIFORM_BLOCK_MAX_NAME_LENGTH',
  ];
  const parameterName = (context, value) => {
    if (value === 0x91b1) return 'COMPLETION_STATUS_KHR';
    const knownName = programParameterEnums.find((name) => context[name] === value);
    return knownName ?? `UNKNOWN_0x${Number(value).toString(16).toUpperCase()}`;
  };
  const probe = {
    installedAtEpochMs: Date.now(),
    contextRequests: [],
    contextInfo: null,
    extensions: {},
    methodCalls: Object.fromEntries(methods.map((name) => [name, { count: 0, totalMs: 0, maxMs: 0, slowCalls: [], byParameter: {} }])),
    instrumentationErrors: [],
    longTasks: [],
    stateChanges: [],
    maxAnimationFrameGapMs: 0,
    animationFrameGaps: [],
    timeOrigin: performance.timeOrigin,
  };
  let previousFrameTime = performance.now();
  let previousStateKey = '';
  const instrumentedPrototypes = new WeakSet();

  const wrapMethod = (prototype, name) => {
    const original = prototype[name];
    if (typeof original !== 'function') return;
    try {
      Object.defineProperty(prototype, name, {
        configurable: true,
        enumerable: false,
        writable: true,
        value: function (...args) {
          const numericPname = name === 'getProgramParameter' ? args[1] : null;
          const parameterEnum = numericPname === null ? null : parameterName(this, numericPname);
          const started = performance.now();
          try {
            return original.apply(this, args);
          } finally {
            const duration = performance.now() - started;
            const summary = probe.methodCalls[name];
            summary.count += 1;
            summary.totalMs += duration;
            summary.maxMs = Math.max(summary.maxMs, duration);
            if (parameterEnum !== null) {
              const byParameter = summary.byParameter[parameterEnum] ??= { numericPname, count: 0, totalMs: 0, maxMs: 0, slowCalls: [] };
              byParameter.count += 1;
              byParameter.totalMs += duration;
              byParameter.maxMs = Math.max(byParameter.maxMs, duration);
              if (duration >= 50) byParameter.slowCalls.push({ numericPname, durationMs: Number(duration.toFixed(3)), atMs: Number(started.toFixed(2)) });
            }
            if (duration >= 0.05) {
              summary.slowCalls.push({ ...(parameterEnum === null ? {} : { parameterEnum, numericPname }), durationMs: Number(duration.toFixed(3)), atMs: Number(started.toFixed(2)) });
              summary.slowCalls.sort((a, b) => b.durationMs - a.durationMs);
              summary.slowCalls.length = Math.min(summary.slowCalls.length, 12);
            }
          }
        },
      });
    } catch (error) {
      probe.instrumentationErrors.push(`${name}: ${String(error)}`);
    }
  };

  const instrumentContext = (context, requestedType) => {
    if (!context) return;
    const prototype = Object.getPrototypeOf(context);
    if (instrumentedPrototypes.has(prototype)) return;
    instrumentedPrototypes.add(prototype);
    probe.contextInfo = {
      requestedType,
      version: context.getParameter(context.VERSION),
      shadingLanguageVersion: context.getParameter(context.SHADING_LANGUAGE_VERSION),
      createdAtMs: Number(performance.now().toFixed(2)),
    };
    for (const name of methods) wrapMethod(prototype, name);
    const originalGetExtension = prototype.getExtension;
    if (typeof originalGetExtension === 'function') {
      try {
        Object.defineProperty(prototype, 'getExtension', {
          configurable: true,
          enumerable: false,
          writable: true,
          value: function (name) {
            const result = originalGetExtension.call(this, name);
            if (name === 'KHR_parallel_shader_compile' || name === 'WEBGL_debug_renderer_info') {
              probe.extensions[name] = Boolean(result);
            }
            return result;
          },
        });
      } catch (error) {
        probe.instrumentationErrors.push(`getExtension: ${String(error)}`);
      }
    }
  };

  const originalCanvasGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...args) {
    const context = originalCanvasGetContext.call(this, type, ...args);
    if (typeof type === 'string' && /^webgl/i.test(type) && context) {
      probe.contextRequests.push({ type, atMs: Number(performance.now().toFixed(2)) });
      instrumentContext(context, type);
    }
    return context;
  };

  const recordState = () => {
    const stage = document.querySelector('[data-testid="world-stage-container"]');
    const overlay = document.querySelector('[data-testid="world-loading-overlay"]');
    const progress = document.querySelector('[data-testid="world-loading-percentage"]')?.textContent?.trim() ?? null;
    const loadingStage = document.querySelector('[data-testid="world-loading-stage"]')?.textContent?.trim() ?? null;
    const lifecycleState = stage?.getAttribute('data-lifecycle-state') ?? null;
    const key = `${lifecycleState}|${loadingStage}|${progress}|${Boolean(overlay)}`;
    if (key === previousStateKey) return;
    previousStateKey = key;
    probe.stateChanges.push({ atMs: Number(performance.now().toFixed(2)), lifecycleState, loadingStage, progress, loadingOverlayPresent: Boolean(overlay), canvasPresent: Boolean(document.querySelector('[data-testid="world-canvas"]')) });
  };
  const mutationObserver = new MutationObserver(recordState);
  const observeDocument = () => {
    if (document.documentElement) mutationObserver.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['data-lifecycle-state', 'aria-valuenow'] });
    recordState();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', observeDocument, { once: true });
  else observeDocument();
  if (typeof PerformanceObserver !== 'undefined') {
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) probe.longTasks.push({ startTimeMs: Number(entry.startTime.toFixed(2)), durationMs: Number(entry.duration.toFixed(2)) });
      }).observe({ type: 'longtask', buffered: true });
    } catch (error) {
      probe.instrumentationErrors.push(`PerformanceObserver: ${String(error)}`);
    }
  }
  const recordFrame = (currentTime) => {
    const gap = currentTime - previousFrameTime;
    if (gap > 0) {
      probe.maxAnimationFrameGapMs = Math.max(probe.maxAnimationFrameGapMs, gap);
      if (gap >= 100) probe.animationFrameGaps.push({ atMs: Number(currentTime.toFixed(2)), gapMs: Number(gap.toFixed(2)) });
    }
    previousFrameTime = currentTime;
    requestAnimationFrame(recordFrame);
  };
  requestAnimationFrame(recordFrame);
  window.addEventListener('error', (event) => probe.instrumentationErrors.push(`page-error ${event.message} ${event.filename}:${event.lineno}:${event.colno}`));
  window.addEventListener('unhandledrejection', (event) => probe.instrumentationErrors.push(`unhandled-rejection ${String(event.reason?.stack ?? event.reason)}`));
  Object.defineProperty(window, '__PRE_G7_40_WEBGL_PROBE__', { value: probe, configurable: false });
};

try {
  const serverEnv = { ...process.env, PORT: String(port), NEXT_TELEMETRY_DISABLED: '1' };
  for (const key of ['CI', 'NODE_OPTIONS', 'NEXT_PUBLIC_PRE_G7_13_EVIDENCE', 'C3_EVIDENCE_DIR', 'PRE_G7_13_EVIDENCE_MODE', 'PRE_G7_13_REQUIRE_ISOLATED_EVIDENCE', 'PRE_G7_13_EVIDENCE_DIR', 'PRE_G7_13_EXPECTED_EVIDENCE_DIR']) delete serverEnv[key];
  serverEnv.PATH = `${path.dirname(node24)}${path.delimiter}${serverEnv.PATH ?? ''}`;
  server = spawn(node24, [path.join(appRoot, 'node_modules/next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', String(port)], { cwd: appRoot, env: serverEnv, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  server.stdout.on('data', (chunk) => appendChunk(serverStdout, chunk));
  server.stderr.on('data', (chunk) => appendChunk(serverStderr, chunk));
  const serverDeadline = Date.now() + 60_000;
  let ready = false;
  let lastServerError = null;
  while (Date.now() < serverDeadline) {
    if (server.exitCode !== null) throw new Error(`P35 server exited early with code ${server.exitCode}.`);
    try {
      const response = await fetch(`${baseURL}/`);
      if (response.status === 200) { ready = true; break; }
      lastServerError = `HTTP ${response.status}`;
    } catch (error) { lastServerError = String(error); }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  if (!ready) throw new Error(`P35 server did not become ready: ${lastServerError}`);

  browser = await chromium.launch({ channel: 'chrome', headless: true });
  browserVersion = browser.version();
  context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  page = await context.newPage();
  await page.addInitScript(observerAndInstrument, observedMethods);
  page.on('console', (message) => browserEvents.push({ type: 'console', messageType: message.type(), text: message.text(), epochMs: Date.now() }));
  page.on('pageerror', (error) => browserEvents.push({ type: 'pageerror', message: String(error.stack ?? error), epochMs: Date.now() }));
  page.on('requestfailed', (request) => browserEvents.push({ type: 'requestfailed', url: request.url(), failure: request.failure()?.errorText ?? null, epochMs: Date.now() }));
  page.on('response', (response) => {
    if (response.url().includes('/models/') || response.url().includes('/_next/static/chunks/')) browserEvents.push({ type: 'response', url: response.url(), status: response.status(), epochMs: Date.now() });
  });
  const navigationStartedAt = Date.now();
  try {
    const response = await page.goto(`${baseURL}/?studio=1`, { waitUntil: 'domcontentloaded' });
    navigation = { status: response?.status() ?? null, url: page.url(), elapsedMs: Date.now() - navigationStartedAt };
  } catch (error) {
    navigation = { status: null, url: page.url(), elapsedMs: Date.now() - navigationStartedAt, error: String(error) };
  }
  await new Promise((resolve) => setTimeout(resolve, 40_000));
  browserObservation = await page.evaluate(() => {
    const canvas = document.querySelector('[data-testid="world-canvas"]');
    const stage = document.querySelector('[data-testid="world-stage-container"]');
    const probe = window.__PRE_G7_40_WEBGL_PROBE__;
    let gl = null;
    let rendererName = null;
    let vendorName = null;
    let webglVersion = null;
    let parallelExtension = null;
    try {
      gl = canvas?.getContext('webgl2') ?? canvas?.getContext('webgl') ?? null;
      if (gl) {
        parallelExtension = Boolean(gl.getExtension('KHR_parallel_shader_compile'));
        probe.extensions.KHR_parallel_shader_compile = parallelExtension;
        const debug = gl.getExtension('WEBGL_debug_renderer_info');
        probe.extensions.WEBGL_debug_renderer_info = Boolean(debug);
        rendererName = debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
        vendorName = debug ? gl.getParameter(debug.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR);
        webglVersion = gl.getParameter(gl.VERSION);
      }
    } catch (error) {
      probe.instrumentationErrors.push(`capability-query: ${String(error)}`);
    }
    for (const summary of Object.values(probe.methodCalls)) {
      summary.totalMs = Number(summary.totalMs.toFixed(3));
      summary.maxMs = Number(summary.maxMs.toFixed(3));
      for (const byParameter of Object.values(summary.byParameter)) {
        byParameter.totalMs = Number(byParameter.totalMs.toFixed(3));
        byParameter.maxMs = Number(byParameter.maxMs.toFixed(3));
      }
    }
    return {
      url: location.href,
      timeOrigin: performance.timeOrigin,
      finalLifecycleState: stage?.getAttribute('data-lifecycle-state') ?? null,
      loadingStage: document.querySelector('[data-testid="world-loading-stage"]')?.textContent?.trim() ?? null,
      loadingProgress: document.querySelector('[data-testid="world-loading-percentage"]')?.textContent?.trim() ?? null,
      loadingOverlayPresent: Boolean(document.querySelector('[data-testid="world-loading-overlay"]')),
      renderedFrames: canvas?.getAttribute('data-rendered-frames') ?? null,
      canvasSize: canvas ? { width: canvas.clientWidth, height: canvas.clientHeight } : null,
      gl: { contextRequests: probe.contextRequests, contextInfo: probe.contextInfo, webglVersion, rendererName, vendorName, extensions: probe.extensions, parallelExtension },
      methodCalls: probe.methodCalls,
      instrumentationErrors: probe.instrumentationErrors,
      longTasks: probe.longTasks,
      maxAnimationFrameGapMs: Number(probe.maxAnimationFrameGapMs.toFixed(2)),
      animationFrameGaps: probe.animationFrameGaps,
      stateChanges: probe.stateChanges,
      resources: performance.getEntriesByType('resource').filter((entry) => entry.name.includes('/models/')).map((entry) => ({ name: entry.name, startTimeMs: Number(entry.startTime.toFixed(2)), durationMs: Number(entry.duration.toFixed(2)), responseEndMs: Number(entry.responseEnd.toFixed(2)), transferSize: entry.transferSize })),
    };
  });
  const screenshotPath = path.join(outputRoot, 'webgl-probe-final.png');
  try { await page.screenshot({ path: screenshotPath, fullPage: false, timeout: 10_000 }); screenshotStatus = 'CAPTURED'; }
  catch (error) { screenshotStatus = `ERROR: ${String(error)}`; }
} catch (error) {
  fatalError = String(error?.stack ?? error);
} finally {
  if (browser) { try { await browser.close(); } catch {} }
  if (server && server.exitCode === null) {
    server.kill();
    await new Promise((resolve) => { const timer = setTimeout(resolve, 5_000); server.once('exit', () => { clearTimeout(timer); resolve(); }); });
  }
}

fs.writeFileSync(path.join(outputRoot, 'server.stdout.bin'), Buffer.concat(serverStdout));
fs.writeFileSync(path.join(outputRoot, 'server.stderr.bin'), Buffer.concat(serverStderr));
const result = { packet: 'PRE-G7-40', priorDiagnosticPacket: 'PRE-G7-39', sourceCommit, appTree, sourceCommitDomainTree, reusedBuildId: buildId, reusedBuildIdSha256: buildIdSha256, nodePath: node24, nodeVersion: process.version, playwrightVersion, browserChannel: 'chrome', browserVersion, headless: true, port, baseURL, route: '/?studio=1', observationWindowMs: 40_000, instrumentationMethods: observedMethods, getProgramParameterInstrumentation: 'records numeric pname, resolved WebGL enum name, per-enum count/total/max duration, and timestamps for calls >=50ms', navigation, browserObservation, browserEvents, screenshot: screenshotStatus, startedAt, endedAt: new Date().toISOString(), fatalError };
fs.writeFileSync(path.join(outputRoot, 'webgl-capability-diagnostic.json'), `${JSON.stringify(result, null, 2)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify({ status: fatalError ? 'FAIL' : 'CAPTURED', browserVersion, navigationStatus: navigation?.status ?? null, finalLifecycleState: browserObservation?.finalLifecycleState ?? null, khrParallelShaderCompile: browserObservation?.gl?.extensions?.KHR_parallel_shader_compile ?? null, rendererName: browserObservation?.gl?.rendererName ?? null, longTaskCount: browserObservation?.longTasks?.length ?? null, getProgramParameterByEnum: browserObservation?.methodCalls?.getProgramParameter?.byParameter ?? null, screenshot: screenshotStatus, fatalError }, null, 2)}\n`);
if (fatalError) process.exitCode = 1;
