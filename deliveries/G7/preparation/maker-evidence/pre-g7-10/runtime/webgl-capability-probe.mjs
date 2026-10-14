import { createRequire } from "node:module";
import { resolve } from "node:path";
import { writeFile } from "node:fs/promises";

const appRoot = "C:/g7c/app";
const evidenceRoot = "C:/g7c/deliveries/G7/preparation/maker-evidence/pre-g7-10/runtime";
const require = createRequire(resolve(appRoot, "package.json"));
const { chromium } = require("@playwright/test");
const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Users/ayush/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe",
  timeout: 30000,
  args: ["--enable-webgl", "--ignore-gpu-blocklist"],
});
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const result = { browser: browser.version(), args: ["--enable-webgl", "--ignore-gpu-blocklist"], profile: "fresh Playwright browser context" };
try {
  const response = await page.goto("http://127.0.0.1:3200/?studio=1", { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForFunction(() => document.querySelector('[data-testid="world-stage-container"]')?.getAttribute("data-lifecycle-state") === "HOME", null, { timeout: 30000 });
  await page.waitForFunction(() => Number(document.querySelector('canvas[data-testid="world-canvas"]')?.dataset.renderedFrames) > 1, null, { timeout: 30000 });
  result.status = response?.status();
  result.canvas = await page.locator('[data-testid="world-canvas"]').evaluate((canvas) => {
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    const debug = gl?.getExtension("WEBGL_debug_renderer_info");
    return {
      connected: canvas.isConnected,
      renderedFrames: Number(canvas.dataset.renderedFrames),
      contextPresent: Boolean(gl),
      contextLost: gl?.isContextLost() ?? null,
      loseContextExtensionAvailable: Boolean(gl?.getExtension("WEBGL_lose_context")),
      extensions: gl?.getSupportedExtensions() ?? [],
      version: gl?.getParameter(gl.VERSION) ?? null,
      vendor: gl?.getParameter(debug?.UNMASKED_VENDOR_WEBGL ?? gl.VENDOR) ?? null,
      renderer: gl?.getParameter(debug?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER) ?? null,
    };
  });
} catch (error) {
  result.error = error.stack ?? String(error);
  throw error;
} finally {
  await writeFile(resolve(evidenceRoot, "12-webgl-capability-probe.json"), `${JSON.stringify(result, null, 2)}\n`);
  await context.close();
  await browser.close();
}
console.log(JSON.stringify(result, null, 2));
