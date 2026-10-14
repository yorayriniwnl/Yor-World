import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "../../../../../../app/node_modules/@playwright/test/index.mjs";

const evidenceDir = dirname(fileURLToPath(import.meta.url));
const repoDir = resolve(evidenceDir, "../../../../../../");
const appDir = resolve(repoDir, "app");
const port = 3181;
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, [
  "node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port),
], {
  cwd: appDir,
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
  windowsHide: true,
  stdio: ["ignore", "pipe", "pipe"],
});
let serverOutput = "";
server.stdout.on("data", (chunk) => { serverOutput += chunk.toString(); });
server.stderr.on("data", (chunk) => { serverOutput += chunk.toString(); });

const observations = {};
const failures = [];
let supportedBrowser;
let unavailableBrowser;

async function waitForFrames(page, minimum = 5) {
  await page.waitForFunction(
    (threshold) => Number(document.querySelector('[data-testid="world-canvas"]')?.dataset.renderedFrames ?? 0) >= threshold,
    minimum,
    { timeout: 90_000 },
  ).catch(() => {});
}

async function skipEntrance(page) {
  const skip = page.getByTestId("skip-entrance-btn");
  if (await skip.count()) await skip.click();
  await page.waitForFunction(
    () => document.querySelector('[data-testid="world-stage-container"]')?.getAttribute("data-lifecycle-state") === "HOME",
    null,
    { timeout: 20_000 },
  ).catch(() => {});
}

async function readyServer() {
  for (let attempt = 0; attempt < 120; attempt++) {
    if (server.exitCode !== null) throw new Error(`Production server exited ${server.exitCode}: ${serverOutput}`);
    try {
      const response = await fetch(origin);
      if (response.status === 200) return;
    } catch {}
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 500));
  }
  throw new Error(`Production server did not become ready: ${serverOutput}`);
}

try {
  await readyServer();

  supportedBrowser = await chromium.launch({
    headless: true,
    args: ["--enable-webgl", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
  });
  const supportedContext = await supportedBrowser.newContext();
  const page = await supportedContext.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.stack ?? error.message));

  await page.goto(`${origin}/?studio=1`, { waitUntil: "domcontentloaded" });
  await page.getByTestId("world-canvas").waitFor({ state: "attached", timeout: 30_000 }).catch(() => {});
  await waitForFrames(page);
  await skipEntrance(page);
  const initial = await page.evaluate(() => {
    const canvas = document.querySelector('[data-testid="world-canvas"]');
    const gl = canvas?.getContext("webgl2") ?? canvas?.getContext("webgl");
    const rendererInfo = gl?.getExtension("WEBGL_debug_renderer_info");
    return {
      pageTitle: document.title,
      state: document.querySelector('[data-testid="world-stage-container"]')?.getAttribute("data-lifecycle-state") ?? null,
      fallback: Boolean(document.querySelector('[data-testid="world-failure-container"]')),
      canvasConnected: canvas?.isConnected ?? false,
      renderedFrames: Number(canvas?.dataset.renderedFrames ?? 0),
      webglRenderer: gl && rendererInfo ? gl.getParameter(rendererInfo.UNMASKED_RENDERER_WEBGL) : null,
      contextLost: gl?.isContextLost() ?? null,
      hydrationInjectionAttributes: {
        darkReader: document.documentElement.hasAttribute("data-darkreader-proxy-injected"),
        grammarly: document.body.hasAttribute("data-gr-ext-installed"),
      },
    };
  });

  const lossRequest = await page.evaluate(() => {
    const canvas = document.querySelector('[data-testid="world-canvas"]');
    const gl = canvas?.getContext("webgl2") ?? canvas?.getContext("webgl");
    const extension = gl?.getExtension("WEBGL_lose_context");
    if (!canvas || !extension) return { supported: false };
    window.__preG7OldCanvas = canvas;
    window.__preG7LossObserved = null;
    canvas.addEventListener("webglcontextlost", (event) => {
      window.__preG7LossObserved = { defaultPrevented: event.defaultPrevented };
    }, { once: true });
    extension.loseContext();
    return { supported: true };
  });
  await page.getByTestId("world-failure-container").waitFor({ state: "visible", timeout: 20_000 }).catch(() => {});
  const lostState = await page.evaluate(() => ({
    event: window.__preG7LossObserved ?? null,
    fallbackVisible: Boolean(document.querySelector('[data-testid="world-failure-container"]')),
    fallbackText: document.querySelector('[data-testid="world-fallback-banner"]')?.innerText ?? null,
    oldCanvasConnected: window.__preG7OldCanvas?.isConnected ?? null,
    retryAvailable: Boolean(document.querySelector('[data-testid="fallback-retry-btn"]')),
  }));
  const fallbackRegion = page.getByTestId("world-fallback-banner");
  lostState.accessibleRegion = (await fallbackRegion.getAttribute("role")) === "region"
    && Boolean(await fallbackRegion.getAttribute("aria-labelledby"));

  await page.getByTestId("fallback-retry-btn").click();
  await page.getByTestId("world-canvas").waitFor({ state: "attached", timeout: 30_000 }).catch(() => {});
  await waitForFrames(page);
  await skipEntrance(page);
  const recovered = await page.evaluate(() => {
    const canvas = document.querySelector('[data-testid="world-canvas"]');
    const gl = canvas?.getContext("webgl2") ?? canvas?.getContext("webgl");
    const rendererInfo = gl?.getExtension("WEBGL_debug_renderer_info");
    return {
      state: document.querySelector('[data-testid="world-stage-container"]')?.getAttribute("data-lifecycle-state") ?? null,
      fallback: Boolean(document.querySelector('[data-testid="world-failure-container"]')),
      canvasConnected: canvas?.isConnected ?? false,
      renderedFrames: Number(canvas?.dataset.renderedFrames ?? 0),
      contextLost: gl?.isContextLost() ?? null,
      webglRenderer: gl && rendererInfo ? gl.getParameter(rendererInfo.UNMASKED_RENDERER_WEBGL) : null,
      oldCanvasDetached: window.__preG7OldCanvas?.isConnected === false,
    };
  });
  observations.supportedSwiftShaderContextLossRecovery = {
    browserVersion: supportedBrowser.version(),
    userAgent: await page.evaluate(() => navigator.userAgent),
    launchFlags: ["--enable-webgl", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
    browserProfile: "fresh Playwright context; no extensions",
    initial,
    lossRequest,
    lostState,
    recovered,
    consoleErrors,
    pageErrors,
    pass: initial.state === "HOME" && !initial.fallback && initial.canvasConnected && initial.renderedFrames >= 5
      && initial.contextLost === false && lossRequest.supported && lostState.fallbackVisible
      && lostState.fallbackText?.includes("WebGL graphics context was lost.") && lostState.accessibleRegion
      && lostState.retryAvailable && lostState.event?.defaultPrevented === true
      && recovered.state === "HOME" && !recovered.fallback && recovered.canvasConnected
      && recovered.renderedFrames >= 5 && recovered.contextLost === false && recovered.oldCanvasDetached
      && consoleErrors.length === 0 && pageErrors.length === 0,
  };
  if (!observations.supportedSwiftShaderContextLossRecovery.pass) failures.push("SwiftShader context-loss/recovery smoke failed");
  await supportedContext.close();

  unavailableBrowser = await chromium.launch({ headless: true, args: ["--disable-webgl"] });
  const unavailableContext = await unavailableBrowser.newContext();
  const unavailablePage = await unavailableContext.newPage();
  const unavailableConsoleErrors = [];
  const unavailablePageErrors = [];
  unavailablePage.on("console", (message) => {
    if (message.type() === "error") unavailableConsoleErrors.push(message.text());
  });
  unavailablePage.on("pageerror", (error) => unavailablePageErrors.push(error.stack ?? error.message));
  await unavailablePage.goto(`${origin}/?studio=1`, { waitUntil: "domcontentloaded" });
  await unavailablePage.getByTestId("world-failure-container").waitFor({ state: "visible", timeout: 30_000 }).catch(() => {});
  const unavailableFirstFailure = {
    reason: await unavailablePage.getByTestId("world-fallback-banner").innerText().catch(() => null),
    retryAvailable: await unavailablePage.getByTestId("fallback-retry-btn").count() === 1,
    canvasCount: await unavailablePage.getByTestId("world-canvas").count(),
  };
  await unavailablePage.getByTestId("fallback-retry-btn").click();
  await unavailablePage.getByTestId("world-failure-container").waitFor({ state: "visible", timeout: 30_000 }).catch(() => {});
  const unavailableRetry = {
    fallbackVisible: await unavailablePage.getByTestId("world-failure-container").count() === 1,
    retryAvailable: await unavailablePage.getByTestId("fallback-retry-btn").count() === 1,
    reason: await unavailablePage.getByTestId("world-fallback-banner").innerText().catch(() => null),
  };
  observations.disabledWebGLFallback = {
    browserVersion: unavailableBrowser.version(),
    launchFlags: ["--disable-webgl"],
    browserProfile: "fresh Playwright context; no extensions",
    firstFailure: unavailableFirstFailure,
    retry: unavailableRetry,
    consoleErrors: unavailableConsoleErrors,
    pageErrors: unavailablePageErrors,
    pass: unavailableFirstFailure.reason?.includes("WebGL context creation failed")
      && unavailableFirstFailure.retryAvailable && unavailableFirstFailure.canvasCount === 0
      && unavailableRetry.fallbackVisible && unavailableRetry.retryAvailable && unavailablePageErrors.length === 0,
  };
  if (!observations.disabledWebGLFallback.pass) failures.push("Disabled-WebGL accessible fallback/retry smoke failed");
  await unavailableContext.close();

  console.log(JSON.stringify({
    productionOrigin: origin,
    serverOutput,
    observations,
    failures,
    pass: failures.length === 0,
  }, null, 2));
  if (failures.length > 0) process.exitCode = 1;
} catch (error) {
  console.log(JSON.stringify({ error: error.stack ?? String(error), serverOutput, observations }, null, 2));
  process.exitCode = 1;
} finally {
  await supportedBrowser?.close().catch(() => {});
  await unavailableBrowser?.close().catch(() => {});
  if (server.exitCode === null) server.kill();
}
