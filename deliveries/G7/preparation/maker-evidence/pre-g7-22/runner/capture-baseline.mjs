import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const appRoot = path.resolve(process.cwd(), "app");
const evidenceRoot = path.resolve(process.cwd(), "deliveries/G7/preparation/maker-evidence/pre-g7-22/baseline");
const screenshotRoot = path.join(evidenceRoot, "screenshots");
const measurementRoot = path.join(evidenceRoot, "measurements");
const referencePath = path.resolve(process.cwd(), "references/images/main-reference.png");
const requireFromApp = createRequire(path.join(appRoot, "package.json"));
const { chromium } = requireFromApp("@playwright/test");
const sharp = requireFromApp("sharp");
const port = 3133;
const nodeDirectory = path.dirname(process.execPath);
const pnpmPackage = JSON.parse(fs.readFileSync(path.join(appRoot, "package.json"), "utf8"));
fs.mkdirSync(screenshotRoot, { recursive: true });
fs.mkdirSync(measurementRoot, { recursive: true });

const serverStdout = [];
const serverStderr = [];
const serverEnvironment = { ...process.env, PATH: `${nodeDirectory}${path.delimiter}${process.env.PATH ?? ""}`, NEXT_TELEMETRY_DISABLED: "1" };
const server = spawn(process.execPath, [
  path.join(appRoot, "node_modules/next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", String(port),
], { cwd: appRoot, env: serverEnvironment, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
server.stdout.on("data", (chunk) => serverStdout.push(Buffer.from(chunk)));
server.stderr.on("data", (chunk) => serverStderr.push(Buffer.from(chunk)));
let serverError = null;
server.on("error", (error) => { serverError = error; });
let browser;
let browserVersion = null;

const errors = [];
const viewports = [
  { width: 1440, height: 900, key: "1440x900" },
  { width: 390, height: 844, key: "390x844" },
  { width: 320, height: 600, key: "320x600" },
  { width: 844, height: 390, key: "844x390" },
];

async function waitForServer() {
  const deadline = Date.now() + 60_000;
  let lastError = null;
  while (Date.now() < deadline) {
    if (serverError) throw serverError;
    try {
      const response = await fetch(`http://127.0.0.1:${port}/`);
      if (response.ok) return;
      lastError = new Error(`server responded ${response.status}`);
    } catch (error) { lastError = error; }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`production server did not become ready: ${lastError?.message ?? "unknown error"}`);
}

function sha256(buffer) { return createHash("sha256").update(buffer).digest("hex"); }

async function captureViewport(viewport) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on("console", (message) => { if (message.type() === "error") errors.push({ viewport: viewport.key, kind: "console", message: message.text() }); });
  page.on("pageerror", (error) => errors.push({ viewport: viewport.key, kind: "pageerror", message: error.stack ?? error.message }));
  await page.goto(`http://127.0.0.1:${port}/?studio=enter&pre-g7-evidence=1`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  const dialog = page.getByTestId("fullscreen-studio-dialog");
  await dialog.waitFor({ state: "visible", timeout: 15_000 });
  const stage = page.getByTestId("world-stage-container");
  await stage.waitFor({ state: "visible", timeout: 45_000 });
  await page.getByTestId("world-canvas").waitFor({ state: "visible", timeout: 45_000 });
  await page.getByTestId("world-loading-overlay").waitFor({ state: "hidden", timeout: 90_000 });
  const toggle = page.getByTestId("studio-controls-toggle");
  await toggle.click();
  await page.getByTestId("skip-motion-btn").click();
  await stage.waitFor({ state: "visible" });
  const homeDeadline = Date.now() + 15_000;
  while (await stage.getAttribute("data-lifecycle-state") !== "HOME") {
    if (Date.now() > homeDeadline) throw new Error(`${viewport.key}: stage did not settle to HOME`);
    await page.waitForTimeout(100);
  }
  await toggle.click();
  await page.waitForTimeout(400);

  const diagnostics = await page.evaluate(() => {
    const diagnosticsWindow = window;
    const snapshot = diagnosticsWindow.__PRE_G7_13_REFERENCE_DIAGNOSTICS__?.refresh() ?? null;
    const canvas = document.querySelector("[data-testid='world-canvas']");
    const gl = canvas?.getContext("webgl2") ?? canvas?.getContext("webgl");
    const debug = gl?.getExtension("WEBGL_debug_renderer_info");
    const stageElement = document.querySelector<HTMLElement>("[data-testid='world-stage-container']");
    const chrome = [
      document.querySelector("[data-testid='studio-controls-toggle']"),
      document.querySelector('nav[aria-label="Portfolio destinations and studio exit"]'),
    ].filter(Boolean);
    const chromeBoxes = chrome.map((element) => {
      const rect = element.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, display: getComputedStyle(element).display };
    }).filter((box) => box.display !== "none");
    const coveredArea = chromeBoxes.reduce((sum, box) => sum + box.width * box.height, 0);
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      viewport: { width: innerWidth, height: innerHeight },
      devicePixelRatio,
      pageWidth: document.documentElement.scrollWidth,
      stageRect: stageElement ? (() => { const rect = stageElement.getBoundingClientRect(); return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }; })() : null,
      closedFixedChrome: { boxes: chromeBoxes, coveredArea, ratio: coveredArea / (innerWidth * innerHeight) },
      webgl: gl ? {
        version: gl.getParameter(gl.VERSION),
        vendor: gl.getParameter(gl.VENDOR),
        renderer: gl.getParameter(gl.RENDERER),
        unmaskedVendor: debug ? gl.getParameter(debug.UNMASKED_VENDOR_WEBGL) : null,
        unmaskedRenderer: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : null,
        contextLost: gl.isContextLost(),
        contextAttributes: gl.getContextAttributes(),
      } : null,
      canvas: canvas ? {
        width: canvas.width, height: canvas.height,
        renderedFrames: canvas.dataset.renderedFrames ?? null,
        runtimeCamera: canvas.dataset.preG713RuntimeCamera ? JSON.parse(canvas.dataset.preG713RuntimeCamera) : null,
      } : null,
      referenceComposition: snapshot,
    };
  });
  const screenshotName = `home-${viewport.key}.png`;
  const screenshotPath = path.join(screenshotRoot, screenshotName);
  await page.screenshot({ path: screenshotPath, fullPage: false });
  await toggle.click();
  await page.getByTestId("diagnostics-toggle-btn").click();
  const diagnosticsPanel = page.getByTestId("world-diagnostics");
  await diagnosticsPanel.waitFor({ state: "visible", timeout: 10_000 });
  const runtimeText = await diagnosticsPanel.textContent();
  let runtime = null;
  try { runtime = JSON.parse(runtimeText ?? "{}"); } catch { /* Keep the raw panel text when it is not JSON. */ }
  const fullDiagnostics = {
    sourceCommit: "fc64a18a7ec1d027fb0a33400c2fcd6288d6afbf",
    captureMode: "read-only production baseline; clean Playwright Chrome context; viewport emulation, not a physical device",
    browserChannel: "chrome",
    browserVersion,
    playwrightVersion: pnpmPackage.devDependencies["@playwright/test"],
    viewport: { width: viewport.width, height: viewport.height },
    diagnostics,
    runtime,
    runtimePanelText: runtime === null ? runtimeText : null,
    baselineChecks: {
      webglAvailable: diagnostics.webgl !== null,
      webglContextNotLost: diagnostics.webgl?.contextLost === false,
      noHorizontalOverflow: diagnostics.pageWidth <= viewport.width,
      fixedChromeAtMost20Percent: diagnostics.closedFixedChrome.ratio <= 0.2,
      evidenceProjectionAvailable: diagnostics.referenceComposition !== null,
    },
    screenshot: { path: `screenshots/${screenshotName}`, bytes: fs.statSync(screenshotPath).size, sha256: sha256(fs.readFileSync(screenshotPath)) },
  };
  fs.writeFileSync(path.join(measurementRoot, `home-${viewport.key}.json`), `${JSON.stringify(fullDiagnostics, null, 2)}\n`, "utf8");

  if (viewport.key === "1440x900" || viewport.key === "390x844") {
    const sideBySide = await sharp({ create: { width: viewport.width * 2, height: viewport.height, channels: 4, background: "#0c1017" } })
      .composite([
        { input: await sharp(referencePath).resize(viewport.width, viewport.height, { fit: "contain", background: "#0c1017" }).png().toBuffer(), left: 0, top: 0 },
        { input: await sharp(screenshotPath).png().toBuffer(), left: viewport.width, top: 0 },
      ])
      .png().toBuffer();
    fs.writeFileSync(path.join(screenshotRoot, `home-${viewport.key}-reference-comparison.png`), sideBySide);
  }
  await context.close();
  return { viewport: viewport.key, screenshot: screenshotName, camera: diagnostics.referenceComposition.camera, webgl: diagnostics.webgl, anchorCount: diagnostics.referenceComposition.anchors?.length };
}

const startedAt = new Date();
let captures = [];
let failed = null;
try {
  browser = await chromium.launch({ headless: true, channel: "chrome" });
  browserVersion = browser.version();
  await waitForServer();
  for (const viewport of viewports) captures.push(await captureViewport(viewport));
} catch (error) {
  failed = error;
} finally {
  if (browser) await browser.close();
  server.kill();
  await new Promise((resolve) => {
    if (server.exitCode !== null) return resolve();
    const timer = setTimeout(resolve, 2_000);
    server.once("close", () => { clearTimeout(timer); resolve(); });
  });
  const stdout = Buffer.concat(serverStdout);
  const stderr = Buffer.concat(serverStderr);
  fs.writeFileSync(path.join(evidenceRoot, "production-server.stdout.bin"), stdout);
  fs.writeFileSync(path.join(evidenceRoot, "production-server.stderr.bin"), stderr);
  fs.writeFileSync(path.join(evidenceRoot, "browser-errors.json"), `${JSON.stringify(errors, null, 2)}\n`, "utf8");
  fs.writeFileSync(path.join(evidenceRoot, "capture-run.json"), `${JSON.stringify({
    sourceCommit: "fc64a18a7ec1d027fb0a33400c2fcd6288d6afbf",
    command: "read-only capture-baseline.mjs; production server: node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3133",
    nodeVersion: process.version,
    nodeExecutable: process.execPath,
    browserChannel: "chrome",
    browserVersion,
    startedAtUtc: startedAt.toISOString(),
    endedAtUtc: new Date().toISOString(),
    captures,
    serverExitCode: server.exitCode,
    serverError: serverError ? { name: serverError.name, message: serverError.message, code: serverError.code } : null,
    browserErrors: errors,
    failure: failed ? { name: failed.name, message: failed.message, stack: failed.stack } : null,
    serverLogs: {
      stdoutBytes: stdout.length, stdoutSha256: sha256(stdout),
      stderrBytes: stderr.length, stderrSha256: sha256(stderr),
    },
  }, null, 2)}\n`, "utf8");
}
if (failed) throw failed;
console.log(`Captured baseline viewports: ${captures.map((capture) => capture.viewport).join(", ")}`);
