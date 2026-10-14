import { createRequire } from "node:module";
import { resolve } from "node:path";
import { writeFile } from "node:fs/promises";

const appRoot = "C:/g7c/app";
const evidenceRoot = resolve("C:/g7c/deliveries/G7/preparation/maker-evidence/pre-g7-10/runtime");
const require = createRequire(resolve(appRoot, "package.json"));
const { chromium } = require("@playwright/test");
const events = [];
const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Users/ayush/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe",
  timeout: 30000,
  args: ["--enable-webgl", "--ignore-gpu-blocklist"],
});
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
page.on("console", (message) => events.push({ type: `console:${message.type()}`, text: message.text() }));
page.on("pageerror", (error) => events.push({ type: "pageerror", text: error.stack ?? error.message }));
page.on("requestfailed", (request) => events.push({ type: "requestfailed", url: request.url(), error: request.failure()?.errorText }));

const result = {
  browser: browser.version(),
  profile: "fresh Playwright browser context; no persistent profile or extensions",
  chromiumExecutable: "C:/Users/ayush/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe",
  flags: ["--enable-webgl", "--ignore-gpu-blocklist"],
  stages: [],
};

try {
  const response = await page.goto("http://127.0.0.1:3200/?studio=1", { waitUntil: "domcontentloaded", timeout: 90000 });
  if (!response || response.status() !== 200) throw new Error(`Production page returned ${response?.status() ?? "no response"}`);
  await page.getByTestId("world-stage-container").waitFor({ state: "visible", timeout: 20000 });
  await page.waitForFunction(() => document.querySelector('[data-testid="world-stage-container"]')?.getAttribute("data-lifecycle-state") === "HOME", null, { timeout: 30000 });
  await page.waitForFunction(() => document.querySelector('canvas[data-testid="world-canvas"]')?.dataset.renderedFrames && Number(document.querySelector('canvas[data-testid="world-canvas"]').dataset.renderedFrames) > 1, null, { timeout: 30000 });
  const oldCanvas = await page.locator('[data-testid="world-canvas"]').elementHandle();
  if (!oldCanvas) throw new Error("Production canvas was not created.");
  const before = await oldCanvas.evaluate((canvas) => {
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (!gl) throw new Error("No WebGL context was available on the rendered canvas.");
    const debug = gl.getExtension("WEBGL_debug_renderer_info");
    return {
      connected: canvas.isConnected,
      width: canvas.width,
      height: canvas.height,
      renderedFrames: Number(canvas.dataset.renderedFrames),
      webglVersion: gl.getParameter(gl.VERSION),
      shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
      vendor: gl.getParameter(debug?.UNMASKED_VENDOR_WEBGL ?? gl.VENDOR),
      renderer: gl.getParameter(debug?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER),
      loseContextExtensionAvailable: Boolean(gl.getExtension("WEBGL_lose_context")),
    };
  });
  if (!before.loseContextExtensionAvailable) throw new Error("WEBGL_lose_context extension unavailable; cannot run real context-loss recovery proof.");
  result.stages.push({ name: "production-render", status: "PASS", url: page.url(), httpStatus: response.status(), canvas: before });
  await page.screenshot({ path: resolve(evidenceRoot, "10-production-render-before-loss.png"), fullPage: true });

  await oldCanvas.evaluate((canvas) => {
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (!gl || gl.isContextLost()) throw new Error("The active production WebGL context was unavailable before loss injection.");
    const pageWindow = window;
    pageWindow.__preG710ContextLossEvents = [];
    canvas.addEventListener("webglcontextlost", (event) => {
      pageWindow.__preG710ContextLossEvents.push({ isTrusted: event.isTrusted, cancelable: event.cancelable });
    });
    const loseContext = gl.getExtension("WEBGL_lose_context");
    if (!loseContext) throw new Error("WEBGL_lose_context was unavailable when context loss was requested.");
    loseContext.loseContext();
  });
  await page.getByTestId("world-fallback-banner").waitFor({ state: "visible", timeout: 15000 });
  await page.waitForFunction((element) => element.getContext("webgl2")?.isContextLost() ?? element.getContext("webgl")?.isContextLost(), await oldCanvas, { timeout: 15000 });
  const fallback = {
    text: await page.getByTestId("world-fallback-banner").innerText(),
    contextLossEvents: await page.evaluate(() => window.__preG710ContextLossEvents ?? []),
    oldContextLost: await oldCanvas.evaluate((canvas) => canvas.getContext("webgl2")?.isContextLost() ?? canvas.getContext("webgl")?.isContextLost()),
    oldCanvasConnected: await oldCanvas.evaluate((canvas) => canvas.isConnected),
    renderedFramesAtFallback: await oldCanvas.evaluate((canvas) => Number(canvas.dataset.renderedFrames)),
  };
  result.stages.push({
    name: "production-webgl-context-loss-fallback",
    status: "PASS",
    trigger: "Called WEBGL_lose_context.loseContext() on the active production renderer's browser WebGL context.",
    fallback,
  });
  await page.screenshot({ path: resolve(evidenceRoot, "11-production-context-loss-fallback.png"), fullPage: true });

  await page.getByTestId("fallback-retry-btn").click();
  await page.getByTestId("world-stage-container").waitFor({ state: "visible", timeout: 20000 });
  await page.waitForFunction(() => document.querySelector('[data-testid="world-stage-container"]')?.getAttribute("data-lifecycle-state") === "HOME", null, { timeout: 30000 });
  await page.waitForFunction(() => {
    const canvas = document.querySelector('canvas[data-testid="world-canvas"]');
    return canvas && Number(canvas.dataset.renderedFrames) > 1;
  }, null, { timeout: 30000 });
  const newCanvas = await page.locator('[data-testid="world-canvas"]').elementHandle();
  if (!newCanvas) throw new Error("Retry did not create a replacement production canvas.");
  const after = await newCanvas.evaluate((canvas) => {
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    const debug = gl?.getExtension("WEBGL_debug_renderer_info");
    return {
      connected: canvas.isConnected,
      width: canvas.width,
      height: canvas.height,
      renderedFrames: Number(canvas.dataset.renderedFrames),
      contextAvailable: Boolean(gl && !gl.isContextLost()),
      webglVersion: gl?.getParameter(gl.VERSION) ?? null,
      vendor: gl?.getParameter(debug?.UNMASKED_VENDOR_WEBGL ?? gl.VENDOR) ?? null,
      renderer: gl?.getParameter(debug?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER) ?? null,
    };
  });
  const recovery = {
    oldCanvasDetached: !(await oldCanvas.evaluate((canvas) => canvas.isConnected)),
    replacementCanvasCount: await page.locator('[data-testid="world-canvas"]').count(),
    fallbackCleared: (await page.getByTestId("world-fallback-banner").count()) === 0,
    lifecycleState: await page.getByTestId("world-stage-container").getAttribute("data-lifecycle-state"),
    replacementCanvas: after,
  };
  if (!recovery.oldCanvasDetached || recovery.replacementCanvasCount !== 1 || !recovery.fallbackCleared || recovery.lifecycleState !== "HOME" || !after.contextAvailable || after.renderedFrames <= 1) {
    throw new Error(`Production retry did not recover to a rendered HOME canvas: ${JSON.stringify(recovery)}`);
  }
  result.stages.push({ name: "production-retry-recovery", status: "PASS", recovery });
  await page.screenshot({ path: resolve(evidenceRoot, "12-production-context-loss-recovered.png"), fullPage: true });
} catch (error) {
  result.error = error.stack ?? String(error);
  result.stages.push({ name: "production-browser-recovery", status: "FAIL", error: result.error });
  throw error;
} finally {
  result.events = events;
  result.finalUrl = page.url();
  await writeFile(resolve(evidenceRoot, "10-production-context-loss-recovery.json"), `${JSON.stringify(result, null, 2)}\n`);
  await context.close();
  await browser.close();
}

console.log(JSON.stringify(result, null, 2));
