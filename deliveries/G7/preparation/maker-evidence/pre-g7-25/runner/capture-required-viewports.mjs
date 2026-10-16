import { spawn } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const evidenceDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(evidenceDir, "../../../../..");
const appRoot = path.resolve(process.env.PRE_G7_CAPTURE_APP_ROOT || path.join(repoRoot, "app"));
const requireFromApp = createRequire(path.join(appRoot, "package.json"));
const { chromium } = requireFromApp("@playwright/test");
const captureRoot = path.resolve(process.env.PRE_G7_CAPTURE_OUTPUT_ROOT || path.join(evidenceDir, "attempt-02/quality-captures"));
const screenshotRoot = path.join(captureRoot, "screenshots");
const measurementRoot = path.join(captureRoot, "measurements");
const port = Number(process.env.PRE_G7_CAPTURE_PORT || 3133);
const baseUrl = `http://127.0.0.1:${port}`;
const enforceBudgets = process.env.PRE_G7_CAPTURE_ENFORCE_BUDGETS !== "0";
const nodePath = process.execPath;
const source = {
  commit: process.env.PRE_G7_25_SOURCE_COMMIT,
  appTree: process.env.PRE_G7_25_APP_TREE,
  baselineCommit: process.env.PRE_G7_25_BASELINE_COMMIT,
  baselineAppTree: process.env.PRE_G7_25_BASELINE_APP_TREE,
};
const measurementOverlayId = process.env.PRE_G7_CAPTURE_OVERLAY_ID || null;
if (Object.values(source).some((value) => !value)) throw new Error("PRE-G7-25 source bindings are required");

const captures = [
  { browser: "Chrome", channel: "chrome", label: "desktop-1440x900-chrome", viewport: { width: 1440, height: 900 }, tier: "high", screenshot: "studio-reference-desktop-1440x900-chrome.png" },
  { browser: "Chrome", channel: "chrome", label: "mobile-390x844-chrome", viewport: { width: 390, height: 844 }, tier: "medium", screenshot: "studio-reference-mobile-390x844-chrome.png" },
  { browser: "Chrome", channel: "chrome", label: "responsive-320x600-chrome", viewport: { width: 320, height: 600 }, tier: "medium", screenshot: "studio-reference-compact-320x600-chrome.png" },
  { browser: "Chrome", channel: "chrome", label: "responsive-844x390-chrome", viewport: { width: 844, height: 390 }, tier: "high", screenshot: "studio-reference-landscape-844x390-chrome.png" },
  { browser: "Edge", channel: "msedge", label: "desktop-1440x900-edge", viewport: { width: 1440, height: 900 }, tier: "high", screenshot: "studio-reference-desktop-1440x900-edge.png" },
  { browser: "Edge", channel: "msedge", label: "mobile-390x844-edge", viewport: { width: 390, height: 844 }, tier: "medium", screenshot: "studio-reference-mobile-390x844-edge.png" },
  { browser: "Edge", channel: "msedge", label: "responsive-320x600-edge", viewport: { width: 320, height: 600 }, tier: "medium", screenshot: "studio-reference-compact-320x600-edge.png" },
  { browser: "Edge", channel: "msedge", label: "responsive-844x390-edge", viewport: { width: 844, height: 390 }, tier: "high", screenshot: "studio-reference-landscape-844x390-edge.png" },
];

fs.mkdirSync(screenshotRoot, { recursive: true });
fs.mkdirSync(measurementRoot, { recursive: true });
const server = spawn(nodePath, [
  "node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port),
], {
  cwd: appRoot,
  windowsHide: true,
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
  stdio: ["ignore", "pipe", "pipe"],
});
const serverLogs = { stdout: [], stderr: [] };
server.stdout.on("data", (chunk) => serverLogs.stdout.push(Buffer.from(chunk)));
server.stderr.on("data", (chunk) => serverLogs.stderr.push(Buffer.from(chunk)));
const waitForServer = async () => {
  const deadline = Date.now() + 60_000;
  let lastError = null;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`production server exited early: ${server.exitCode}`);
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) { lastError = error; }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`production server did not become ready: ${lastError}`);
};

const browserMetadata = async (page) => page.evaluate(() => {
  const canvas = document.querySelector("[data-testid='world-canvas']");
  const gl = canvas?.getContext("webgl2") ?? canvas?.getContext("webgl");
  const debugInfo = gl?.getExtension("WEBGL_debug_renderer_info");
  return {
    pageUrl: location.href,
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    viewport: { width: innerWidth, height: innerHeight },
    devicePixelRatio,
    webgl: gl ? {
      version: gl.getParameter(gl.VERSION),
      vendor: gl.getParameter(gl.VENDOR),
      renderer: gl.getParameter(gl.RENDERER),
      unmaskedVendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : null,
      unmaskedRenderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : null,
      contextLost: gl.isContextLost(),
    } : null,
  };
});

const qualityCeilings = (viewport) => ({
  inclusiveRenderCalls: viewport.width === 1440 || viewport.width === 844 ? 120 : 80,
  visibleTriangles: viewport.width === 1440 ? 300_000 : 140_000,
});

const main = async () => {
  const browsers = new Map();
  const results = [];
  try {
    await waitForServer();
    for (const capture of captures) {
      let browser = browsers.get(capture.channel);
      if (!browser) {
        browser = await chromium.launch({ channel: capture.channel, headless: true });
        browsers.set(capture.channel, browser);
      }
      const context = await browser.newContext({ viewport: capture.viewport, deviceScaleFactor: 1 });
      const page = await context.newPage();
      const errors = [];
      page.on("console", (message) => { if (message.type() === "error") errors.push(`[console.error] ${message.text()}`); });
      page.on("pageerror", (error) => errors.push(`[pageerror] ${error.stack || error.message}`));
      await page.goto(`${baseUrl}/?studio=enter&pre-g7-evidence=1`);
      await page.getByTestId("fullscreen-studio-dialog").waitFor({ state: "visible", timeout: 15_000 });
      await page.getByTestId("world-stage-container").waitFor({ state: "visible", timeout: 45_000 });
      await page.getByTestId("world-canvas").waitFor({ state: "visible", timeout: 45_000 });
      await page.getByTestId("world-loading-overlay").waitFor({ state: "hidden", timeout: 90_000 });
      const toggle = page.getByTestId("studio-controls-toggle");
      await toggle.click();
      await page.getByTestId("quality-tier-select").waitFor({ state: "visible" });
      await page.getByTestId("skip-motion-btn").click();
      await page.waitForFunction(() => document.querySelector("[data-testid='world-stage-container']")?.getAttribute("data-lifecycle-state") === "HOME", null, { timeout: 15_000 });
      await page.evaluate(() => {
        const canvas = document.querySelector("[data-testid='world-canvas']");
        if (!canvas) throw new Error("world canvas missing before frame capture");
        window.__p25LastRenderedFrame = null;
        canvas.addEventListener("yor-world-rendered-frame", (event) => {
          window.__p25LastRenderedFrame = event.detail;
        });
      });
      await page.getByTestId("quality-tier-select").selectOption(capture.tier);
      await page.waitForFunction((tier) => window.__p25LastRenderedFrame?.qualityTier === tier, capture.tier, { timeout: 20_000 });
      const frame = await page.evaluate(() => window.__p25LastRenderedFrame);
      const metadata = await browserMetadata(page);
      const diagnosticsToggle = page.getByTestId("diagnostics-toggle-btn");
      await diagnosticsToggle.click();
      const diagnosticsElement = page.getByTestId("world-diagnostics");
      await diagnosticsElement.waitFor({ state: "visible" });
      const diagnostics = JSON.parse((await diagnosticsElement.textContent()) || "{}");
      if (diagnostics.qualityTier !== capture.tier) throw new Error(`${capture.label}: requested ${capture.tier}, diagnostics report ${diagnostics.qualityTier}`);
      await diagnosticsToggle.click();
      await toggle.click();
      await page.waitForTimeout(400);
      const settledFrame = await page.evaluate(() => window.__p25LastRenderedFrame);
      if (!settledFrame || settledFrame.qualityTier !== capture.tier) throw new Error(`${capture.label}: no settled ${capture.tier} frame`);
      if (!metadata.webgl || metadata.webgl.contextLost) throw new Error(`${capture.label}: missing or lost WebGL context`);
      const screenshotPath = path.join(screenshotRoot, capture.screenshot);
      await page.screenshot({ path: screenshotPath, fullPage: false });
      const ceilings = qualityCeilings(capture.viewport);
      const measurement = {
        label: capture.label,
        browser: capture.browser,
        source,
        measurementOverlayId,
        viewport: capture.viewport,
        qualityTierRequested: capture.tier,
        qualityTier: settledFrame.qualityTier,
        browserEnvironment: metadata,
        runtime: {
          renderCalls: settledFrame.renderCalls,
          shadowRenderCalls: settledFrame.shadowRenderCalls,
          mainRenderCalls: settledFrame.mainRenderCalls,
          renderedTriangles: settledFrame.renderedTriangles,
          renderPixelRatio: diagnostics.renderPixelRatio,
          renderedFrame: settledFrame.frame,
          lifecycleState: diagnostics.lifecycleState,
        },
        ceilings,
        budgetAssessment: {
          inclusiveCallsPass: settledFrame.renderCalls <= ceilings.inclusiveRenderCalls,
          visibleTrianglesPass: settledFrame.renderedTriangles <= ceilings.visibleTriangles,
        },
        screenshot: {
          path: path.relative(repoRoot, screenshotPath).replaceAll(path.sep, "/"),
        },
        browserErrors: errors,
      };
      const measurementPath = path.join(measurementRoot, `${capture.label}-runtime-scene.json`);
      fs.writeFileSync(measurementPath, `${JSON.stringify(measurement, null, 2)}\n`, "utf8");
      results.push(measurement);
      await context.close();
    }
  } finally {
    await Promise.all([...browsers.values()].map((browser) => browser.close().catch(() => {})));
    if (server.exitCode === null) server.kill();
    await new Promise((resolve) => {
      if (server.exitCode !== null) resolve();
      else server.once("close", resolve);
      setTimeout(resolve, 5_000).unref();
    });
    fs.writeFileSync(path.join(captureRoot, "production-server.stdout.bin"), Buffer.concat(serverLogs.stdout));
    fs.writeFileSync(path.join(captureRoot, "production-server.stderr.bin"), Buffer.concat(serverLogs.stderr));
  }
  const report = {
    schemaVersion: 1,
    generatedAtUtc: new Date().toISOString(),
    nodeVersion: process.version,
    server: { command: `node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port ${port}`, baseUrl, appRoot },
    source,
    measurementOverlayId,
    enforceBudgets,
    captures: results.map(({ label, browser, viewport, qualityTier, runtime, ceilings, budgetAssessment, screenshot, browserErrors }) => ({
      label, browser, viewport, qualityTier, runtime, ceilings, budgetAssessment, screenshot, browserErrors,
    })),
  };
  fs.writeFileSync(path.join(captureRoot, "required-viewports.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(report.captures.map(({ label, qualityTier, runtime, budgetAssessment }) => ({ label, qualityTier, renderCalls: runtime.renderCalls, shadowRenderCalls: runtime.shadowRenderCalls, mainRenderCalls: runtime.mainRenderCalls, renderedTriangles: runtime.renderedTriangles, budgetAssessment })), null, 2)}\n`);
  if (enforceBudgets && results.some(({ budgetAssessment }) => !budgetAssessment.inclusiveCallsPass || !budgetAssessment.visibleTrianglesPass)) process.exitCode = 2;
};

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
