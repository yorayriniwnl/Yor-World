import { createRequire } from "node:module";
import { resolve } from "node:path";
import { writeFile } from "node:fs/promises";

const appRoot = "C:/g7c/app";
const evidenceRoot = "C:/g7c/deliveries/G7/preparation/maker-evidence/pre-g7-10/runtime";
const require = createRequire(resolve(appRoot, "package.json"));
const { chromium } = require("@playwright/test");
const executablePath = "C:/Users/ayush/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe";
const result = { disabledWebgl: {}, recovery: {} };

const disabledBrowser = await chromium.launch({ headless: true, executablePath, timeout: 30000, args: ["--disable-webgl"] });
const disabledContext = await disabledBrowser.newContext({ viewport: { width: 1440, height: 1000 } });
const disabledPage = await disabledContext.newPage();
const disabledEvents = [];
disabledPage.on("console", (message) => disabledEvents.push({ type: `console:${message.type()}`, text: message.text() }));
disabledPage.on("pageerror", (error) => disabledEvents.push({ type: "pageerror", text: error.stack ?? error.message }));
disabledPage.on("requestfailed", (request) => disabledEvents.push({ type: "requestfailed", url: request.url(), error: request.failure()?.errorText }));
disabledPage.on("response", (response) => {
  if (response.status() >= 400) disabledEvents.push({ type: "http-error", status: response.status(), url: response.url() });
});

try {
  const response = await disabledPage.goto("http://127.0.0.1:3200/?studio=1", { waitUntil: "domcontentloaded", timeout: 90000 });
  await disabledPage.getByTestId("world-fallback-banner").waitFor({ state: "visible", timeout: 30000 });
  const browserContext = await disabledPage.evaluate(() => {
    const canvas = document.createElement("canvas");
    return {
      webgl2Available: Boolean(canvas.getContext("webgl2")),
      webglAvailable: Boolean(canvas.getContext("webgl")),
    };
  });
  result.disabledWebgl = {
    status: response?.status(),
    browser: disabledBrowser.version(),
    args: ["--disable-webgl"],
    profile: "fresh Playwright context; no persistent profile or extensions",
    browserContext,
    fallbackText: await disabledPage.getByTestId("world-fallback-banner").innerText(),
    retryButtonVisible: await disabledPage.getByTestId("fallback-retry-btn").isVisible(),
    canvasCount: await disabledPage.locator('[data-testid="world-canvas"]').count(),
    pageErrors: disabledEvents.filter((event) => event.type === "pageerror"),
    events: disabledEvents,
  };
  await disabledPage.screenshot({ path: resolve(evidenceRoot, "13-production-webgl-unavailable-fallback.png"), fullPage: true });
  if (response?.status() !== 200 || browserContext.webgl2Available || browserContext.webglAvailable || !result.disabledWebgl.retryButtonVisible || result.disabledWebgl.pageErrors.length !== 0) {
    throw new Error(`WebGL-disabled fallback was not clean and accessible: ${JSON.stringify(result.disabledWebgl)}`);
  }
  await disabledPage.getByTestId("fallback-retry-btn").click();
  await disabledPage.getByTestId("world-fallback-banner").waitFor({ state: "visible", timeout: 30000 });
  result.disabledWebgl.retryLeavesAccessibleFallback = true;
  result.disabledWebgl.canvasCountAfterRetry = await disabledPage.locator('[data-testid="world-canvas"]').count();
  await disabledPage.screenshot({ path: resolve(evidenceRoot, "13-production-webgl-unavailable-retry.png"), fullPage: true });
} finally {
  await disabledContext.close();
  await disabledBrowser.close();
}

const supportedBrowser = await chromium.launch({
  headless: true,
  executablePath,
  timeout: 30000,
  args: ["--enable-webgl", "--ignore-gpu-blocklist"],
});
const supportedContext = await supportedBrowser.newContext({ viewport: { width: 1440, height: 1000 } });
const supportedPage = await supportedContext.newPage();
const supportedEvents = [];
supportedPage.on("pageerror", (error) => supportedEvents.push(error.stack ?? error.message));
try {
  const response = await supportedPage.goto("http://127.0.0.1:3200/?studio=1", { waitUntil: "domcontentloaded", timeout: 90000 });
  await supportedPage.waitForFunction(() => document.querySelector('[data-testid="world-stage-container"]')?.getAttribute("data-lifecycle-state") === "HOME", null, { timeout: 30000 });
  await supportedPage.waitForFunction(() => Number(document.querySelector('canvas[data-testid="world-canvas"]')?.dataset.renderedFrames) > 1, null, { timeout: 30000 });
  result.recovery = {
    status: response?.status(),
    browser: supportedBrowser.version(),
    args: ["--enable-webgl", "--ignore-gpu-blocklist"],
    profile: "new clean Playwright context with WebGL enabled after disabled-profile fallback",
    lifecycleState: await supportedPage.getByTestId("world-stage-container").getAttribute("data-lifecycle-state"),
    canvasCount: await supportedPage.locator('[data-testid="world-canvas"]').count(),
    canvas: await supportedPage.locator('[data-testid="world-canvas"]').evaluate((canvas) => {
      const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
      const debug = gl?.getExtension("WEBGL_debug_renderer_info");
      return {
        connected: canvas.isConnected,
        renderedFrames: Number(canvas.dataset.renderedFrames),
        contextAvailable: Boolean(gl && !gl.isContextLost()),
        vendor: gl?.getParameter(debug?.UNMASKED_VENDOR_WEBGL ?? gl.VENDOR) ?? null,
        renderer: gl?.getParameter(debug?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER) ?? null,
      };
    }),
    pageErrors: supportedEvents,
  };
  await supportedPage.screenshot({ path: resolve(evidenceRoot, "14-production-webgl-enabled-recovery.png"), fullPage: true });
  if (response?.status() !== 200 || result.recovery.lifecycleState !== "HOME" || result.recovery.canvasCount !== 1 || !result.recovery.canvas.contextAvailable || result.recovery.canvas.renderedFrames <= 1 || supportedEvents.length !== 0) {
    throw new Error(`Clean enabled-browser recovery did not reach rendered HOME: ${JSON.stringify(result.recovery)}`);
  }
} finally {
  await writeFile(resolve(evidenceRoot, "13-production-webgl-unavailable-recovery.json"), `${JSON.stringify(result, null, 2)}\n`);
  await supportedContext.close();
  await supportedBrowser.close();
}
console.log(JSON.stringify(result, null, 2));
