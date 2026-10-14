import { createRequire } from "node:module";
import { resolve } from "node:path";
import { writeFile } from "node:fs/promises";

const baselineApp = "C:/Users/ayush/AppData/Local/Temp/pre-g7-10-rc6-baseline/app";
const require = createRequire(resolve(baselineApp, "package.json"));
const { chromium } = require("@playwright/test");
const evidenceRoot = resolve("deliveries/G7/preparation/maker-evidence/pre-g7-10/runtime");
const events = [];
console.log(`launching Chromium executable ${chromium.executablePath()} with a new temporary browser context`);
const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Users/ayush/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe",
  timeout: 15000,
  dumpio: true,
  args: ["--enable-webgl", "--ignore-gpu-blocklist"],
});
console.log(`Chromium ${browser.version()} launched`);
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
page.on("console", (message) => events.push({ type: `console:${message.type()}`, text: message.text() }));
page.on("pageerror", (error) => events.push({ type: "pageerror", text: error.stack ?? error.message }));
page.on("requestfailed", (request) => events.push({ type: "requestfailed", url: request.url(), error: request.failure()?.errorText }));

try {
  console.log("navigating to accepted baseline development server");
  const response = await page.goto("http://127.0.0.1:3190", { waitUntil: "domcontentloaded", timeout: 90000 });
  console.log(`page response ${response?.status()}`);
  await page.waitForTimeout(2500);
  const initial = {
    status: response?.status(),
    title: await page.title(),
    buttons: await page.getByRole("button").allTextContents(),
    headings: await page.getByRole("heading").allTextContents(),
    canvases: await page.locator("canvas").count(),
  };
  console.log("initial controls", JSON.stringify(initial));
  await page.locator('[data-testid="studio-disclosure"] summary').click();
  await page.waitForTimeout(1500);
  const launch = page.getByTestId("enter-studio-btn");
  console.log("studio launch visible", await launch.isVisible());
  if (await launch.isVisible()) await launch.click();
  await page.waitForTimeout(9000);
  const result = {
    browser: browser.version(),
    profile: "fresh Playwright browser context; no persistent profile or extensions",
    initial,
    finalUrl: page.url(),
    finalTitle: await page.title(),
    canvasCount: await page.locator("canvas").count(),
    canvasStates: await page.locator("canvas").evaluateAll((canvases) => canvases.map((canvas) => ({
      connected: canvas.isConnected,
      width: canvas.width,
      height: canvas.height,
      renderedFrames: canvas.dataset.renderedFrames ?? null,
      webglContext: Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl")),
    }))),
    fallbackText: await page.getByTestId("world-fallback-banner").allTextContents(),
    buttons: await page.getByRole("button").allTextContents(),
    events,
  };
  await page.screenshot({ path: resolve(evidenceRoot, "01-baseline-dev-repro.png"), fullPage: true });
  await writeFile(resolve(evidenceRoot, "01-baseline-dev-repro.json"), `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
} finally {
  await context.close();
  await browser.close();
}
