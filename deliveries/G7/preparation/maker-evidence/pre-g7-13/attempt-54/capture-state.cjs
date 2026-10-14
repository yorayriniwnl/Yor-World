const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("@playwright/test");

const port = Number(process.env.PORT || 3133);
const root = __dirname;
const screenshotDir = path.join(root, "screenshots");
const measurementDir = path.join(root, "measurements");
fs.mkdirSync(screenshotDir, { recursive: true });
fs.mkdirSync(measurementDir, { recursive: true });

async function run(width, height, label, filename) {
  console.log(`[${label}] launch Chrome ${width}x${height}`);
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const events = [];
  await page.addInitScript(() => {
    window.__preG7ContextEvents = [];
    document.addEventListener("webglcontextlost", (event) => window.__preG7ContextEvents.push({ type: "webglcontextlost", time: new Date().toISOString() }), true);
    document.addEventListener("webglcontextrestored", (event) => window.__preG7ContextEvents.push({ type: "webglcontextrestored", time: new Date().toISOString() }), true);
  });
  page.on("console", (message) => {
    if (message.type() === "error") events.push({ type: "console.error", text: message.text() });
  });
  page.on("pageerror", (error) => events.push({ type: "pageerror", text: error.stack || error.message }));
  page.on("requestfailed", (request) => events.push({ type: "requestfailed", url: request.url(), error: request.failure()?.errorText }));
  page.on("response", (response) => {
    if (response.status() >= 400) events.push({ type: "http-error", status: response.status(), url: response.url() });
  });

  const pageState = () => page.evaluate(() => {
    const stage = document.querySelector("[data-testid='world-stage-container']");
    const canvas = document.querySelector("[data-testid='world-canvas']");
    const context = canvas?.getContext("webgl2") || canvas?.getContext("webgl");
    return {
      time: new Date().toISOString(),
      url: location.href,
      readyState: document.readyState,
      stageLifecycle: stage?.dataset.lifecycleState ?? null,
      controlsOpen: stage?.dataset.studioControlsOpen ?? null,
      canvasCount: document.querySelectorAll("[data-testid='world-canvas']").length,
      canvasSize: canvas ? [canvas.width, canvas.height] : null,
      canvasVisible: canvas ? getComputedStyle(canvas).display !== "none" && getComputedStyle(canvas).visibility !== "hidden" : false,
      webglVersion: context?.getParameter(context.VERSION) ?? null,
      glContextLost: context?.isContextLost() ?? null,
      staticFallbackCount: document.querySelectorAll("[data-testid='world-static-container']").length,
      failureFallbackCount: document.querySelectorAll("[data-testid='world-failure-container']").length,
    };
  });

  await page.goto(`http://127.0.0.1:${port}/?studio=enter&pre-g7-evidence=1`, { waitUntil: "domcontentloaded" });
  await page.getByTestId("fullscreen-studio-dialog").waitFor({ state: "visible", timeout: 15000 });
  await page.getByTestId("world-stage-container").waitFor({ state: "visible", timeout: 45000 });
  await page.getByTestId("world-canvas").waitFor({ state: "visible", timeout: 45000 });
  await page.getByTestId("world-loading-overlay").waitFor({ state: "hidden", timeout: 90000 });
  const toggle = page.getByTestId("studio-controls-toggle");
  await toggle.click();
  await page.getByTestId("quality-tier-select").waitFor({ state: "visible" });
  await page.getByTestId("skip-motion-btn").click();
  await page.waitForFunction(() => document.querySelector("[data-testid='world-stage-container']")?.dataset.lifecycleState === "HOME");
  await toggle.click();
  await page.waitForFunction(() => document.querySelector("[data-testid='world-stage-container']")?.dataset.studioControlsOpen === "false");
  await page.waitForTimeout(400);

  const before = await page.evaluate(() => {
    const diagnostics = window.__PRE_G7_13_REFERENCE_DIAGNOSTICS__;
    const referenceComposition = diagnostics?.refresh() ?? diagnostics?.latest ?? null;
    const stage = document.querySelector("[data-testid='world-stage-container']");
    const canvas = document.querySelector("[data-testid='world-canvas']");
    const context = canvas?.getContext("webgl2") || canvas?.getContext("webgl");
    const navigationBounds = Array.from(document.querySelectorAll("nav")).map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        ariaLabel: element.getAttribute("aria-label"),
        text: (element.textContent || "").trim().replace(/\s+/g, " "),
        bounds: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height },
      };
    });
    return {
      capturedAt: new Date().toISOString(),
      url: location.href,
      viewport: { width: innerWidth, height: innerHeight },
      lifecycle: stage?.dataset.lifecycleState ?? null,
      controlsOpen: stage?.dataset.studioControlsOpen ?? null,
      canvasCount: document.querySelectorAll("[data-testid='world-canvas']").length,
      canvasVisible: canvas ? getComputedStyle(canvas).display !== "none" && getComputedStyle(canvas).visibility !== "hidden" : false,
      webglVersion: context?.getParameter(context.VERSION) ?? null,
      contextLost: context?.isContextLost() ?? null,
      staticFallbackCount: document.querySelectorAll("[data-testid='world-static-container']").length,
      failureFallbackCount: document.querySelectorAll("[data-testid='world-failure-container']").length,
      nextChunks: performance.getEntriesByType("resource").map((entry) => entry.name).filter((name) => name.includes("/_next/static/chunks/")),
      referenceComposition,
      navigationBounds,
    };
  });
  const screenshotPath = path.join(screenshotDir, filename);
  await page.screenshot({ path: screenshotPath, fullPage: false });
  const after = await pageState();
  const webglContextEvents = await page.evaluate(() => window.__preG7ContextEvents || []);
  const artifact = { label, viewport: { width, height }, screenshotPath, before, after, events, webglContextEvents };
  fs.writeFileSync(path.join(measurementDir, `${label}-capture-trace.json`), JSON.stringify(artifact, null, 2) + "\n");
  fs.writeFileSync(path.join(measurementDir, `${label}-anchor-diagnostics.json`), JSON.stringify(before.referenceComposition, null, 2) + "\n");
  console.log(`[${label}] screenshot=${screenshotPath}`);
  console.log(`[${label}] before lifecycle=${before.lifecycle} fallbacks=${before.staticFallbackCount}/${before.failureFallbackCount} canvas=${before.canvasVisible} glLost=${before.contextLost}; after lifecycle=${after.stageLifecycle} fallbacks=${after.staticFallbackCount}/${after.failureFallbackCount} canvas=${after.canvasVisible} glLost=${after.glContextLost}`);
  await browser.close();
}

(async () => {
  await run(1440, 900, "desktop-1440x900", "studio-reference-desktop-1440x900.png");
  await run(390, 844, "mobile-390x844", "studio-reference-mobile-390x844.png");
})().catch((error) => {
  fs.writeFileSync(path.join(root, "capture-error.txt"), error.stack || String(error));
  console.error(error.stack || String(error));
  process.exitCode = 1;
});
