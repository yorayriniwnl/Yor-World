const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("@playwright/test");

const port = Number(process.env.PORT || 3133);
const root = __dirname;
const shots = path.join(root, "trace-screenshots");
fs.mkdirSync(shots, { recursive: true });

async function run(width, height, label) {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const events = [];
  page.on("console", (message) => {
    if (message.type() === "error") events.push({ type: "console.error", text: message.text() });
  });
  page.on("pageerror", (error) => events.push({ type: "pageerror", text: error.stack || error.message }));
  page.on("requestfailed", (request) => events.push({ type: "requestfailed", url: request.url(), error: request.failure()?.errorText }));
  page.on("response", (response) => {
    if (response.status() >= 400) events.push({ type: "http-error", status: response.status(), url: response.url() });
  });

  const state = () => page.evaluate(() => {
    const stage = document.querySelector("[data-testid='world-stage-container']");
    const canvas = document.querySelector("[data-testid='world-canvas']");
    const context = canvas?.getContext("webgl2") || canvas?.getContext("webgl");
    const pixels = context && canvas.width && canvas.height
      ? (() => {
          const pixel = new Uint8Array(4);
          context.readPixels(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1, context.RGBA, context.UNSIGNED_BYTE, pixel);
          return Array.from(pixel);
        })()
      : null;
    return {
      time: new Date().toISOString(),
      url: location.href,
      readyState: document.readyState,
      stageLifecycle: stage?.dataset.lifecycleState ?? null,
      controlsOpen: stage?.dataset.studioControlsOpen ?? null,
      canvasCount: document.querySelectorAll("[data-testid='world-canvas']").length,
      canvasSize: canvas ? [canvas.width, canvas.height] : null,
      canvasVisible: canvas ? getComputedStyle(canvas).display !== "none" && getComputedStyle(canvas).visibility !== "hidden" : false,
      canvasPixelCenter: pixels,
      glContextLost: context?.isContextLost() ?? null,
      staticFallbackCount: document.querySelectorAll("[data-testid='world-static-container']").length,
      failureFallbackCount: document.querySelectorAll("[data-testid='world-failure-container']").length,
      studioText: document.querySelector("[data-testid='world-static-container']")?.innerText?.slice(0, 100) ?? null,
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
  await page.getByTestId("world-stage-container").waitFor({ state: "attached" });
  await page.waitForFunction(() => document.querySelector("[data-testid='world-stage-container']")?.dataset.lifecycleState === "HOME");
  await toggle.click();
  await page.waitForTimeout(400);

  const observations = [];
  observations.push({ point: "before-screenshot", state: await state() });
  const screenshotPath = path.join(shots, `${label}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: false });
  observations.push({ point: "after-screenshot-immediate", state: await state() });
  for (let index = 1; index <= 5; index += 1) {
    await page.waitForTimeout(200);
    observations.push({ point: `after-screenshot-${index * 200}ms`, state: await state() });
  }
  fs.writeFileSync(path.join(root, `${label}-capture-state-trace.json`), JSON.stringify({ label, port, viewport: { width, height }, screenshotPath, observations, events }, null, 2) + "\n");
  await browser.close();
}

(async () => {
  await run(1440, 900, "desktop");
  await run(390, 844, "mobile");
})().catch((error) => {
  fs.writeFileSync(path.join(root, "trace-script-error.txt"), error.stack || String(error));
  process.exitCode = 1;
});
