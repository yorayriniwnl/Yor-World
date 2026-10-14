import { createWriteStream, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const evidenceRoot = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(evidenceRoot, "../../../../..");
const requireFromApp = createRequire(path.join(repositoryRoot, "app/package.json"));
const { chromium } = requireFromApp("@playwright/test");

const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const result = await page.goto("data:text/html,<canvas id='gpu'></canvas>");
  const graphics = await page.evaluate(() => {
    const canvas = document.querySelector("#gpu");
    const context = canvas?.getContext("webgl2") ?? canvas?.getContext("webgl");
    if (!context) return { available: false };
    const debug = context.getExtension("WEBGL_debug_renderer_info");
    return {
      available: true,
      version: context.getParameter(context.VERSION),
      shadingLanguageVersion: context.getParameter(context.SHADING_LANGUAGE_VERSION),
      vendor: debug ? context.getParameter(debug.UNMASKED_VENDOR_WEBGL) : context.getParameter(context.VENDOR),
      renderer: debug ? context.getParameter(debug.UNMASKED_RENDERER_WEBGL) : context.getParameter(context.RENDERER),
      maxTextureSize: context.getParameter(context.MAX_TEXTURE_SIZE),
    };
  });
  const metadata = {
    capturedAt: new Date().toISOString(),
    nodeVersion: process.version,
    browser: "Chrome channel, launched headless by Playwright",
    browserVersion: browser.version(),
    userAgent: await page.evaluate(() => navigator.userAgent),
    platform: await page.evaluate(() => navigator.platform),
    viewport: await page.evaluate(() => ({ width: innerWidth, height: innerHeight, devicePixelRatio })),
    webgl: graphics,
    limitation: "This is browser-emulation metadata, not physical-GPU or real-device evidence.",
  };
  const output = `${JSON.stringify(metadata, null, 2)}\n`;
  writeFileSync(path.join(evidenceRoot, "browser-environment.json"), output, "utf8");
  process.stdout.write(output);
} finally {
  await browser.close();
}
