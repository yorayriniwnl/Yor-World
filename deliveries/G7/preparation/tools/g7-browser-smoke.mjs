#!/usr/bin/env node
/** Standalone root-invoked public-browser evidence. No backend submissions or acceptance. */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const hash = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const read = (filename) => JSON.parse(fs.readFileSync(filename, "utf8"));
function check(condition, reason) { if (!condition) throw new Error(reason); }
function safe(filename) {
  const resolved = path.resolve(root, filename);
  check(resolved.startsWith(root + path.sep), "Input/output path must stay inside workspace");
  return resolved;
}
async function main() {
  const { values } = parseArgs({ options: { authorization: { type: "string" }, manifest: { type: "string" }, output: { type: "string" }, browsers: { type: "string", default: "chromium,edge,firefox,webkit" }, help: { type: "boolean" } } });
  if (values.help) {
    console.log("Root only after actual deployment: node deliveries/G7/preparation/tools/g7-browser-smoke.mjs --authorization <operational-binding.json> --manifest <candidate-manifest.json> --output deliveries/G7/evidence/live-browser.json [--browsers chromium,edge,firefox,webkit]. Missing browsers remain NOT RUN; physical/screen-reader/service/rollback criteria remain NOT RUN. --help performs no browser/network actions.");
    return;
  }
  check(values.authorization && values.manifest && values.output, "Explicit authorization/manifest/output is required");
  const manifestPath = safe(values.manifest);
  const manifest = read(manifestPath);
  const binding = read(safe(values.authorization));
  check(binding.status === "AUTHORIZED" && binding.ownerAuthorizationReference && binding.acceptedSuccessorReference && binding.deploymentId,
    "Actual authorized accepted-successor deployment binding is required");
  for (const key of ["releaseId", "sourceCommit", "sourceAppTree"]) check(binding[key] === manifest[key], `Operational binding differs: ${key}`);
  check(binding.manifestSha256 === hash(Buffer.from(fs.readFileSync(manifestPath, "utf8").replace(/\r\n/g, "\n"))), "Operational manifest hash is stale");
  check(Number.isFinite(Date.parse(binding.deployedAt)) && Date.parse(binding.deployedAt) <= Date.now(), "Actual postdeployment timestamp required");
  const origin = new URL(binding.targetOrigin);
  check(origin.protocol === "https:" && !origin.username && !origin.password && origin.pathname === "/"
    && !origin.search && !origin.hash && !["localhost", "127.0.0.1", "::1"].includes(origin.hostname), "Authorized public HTTPS origin required");
  const output = safe(values.output);
  check(output.startsWith(path.join(root, "deliveries/G7/evidence") + path.sep) && !fs.existsSync(output), "Preserve prior receipts; choose new output inside deliveries/G7/evidence");
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const artifactDir = output.slice(0, -path.extname(output).length) + "-raw";
  fs.mkdirSync(artifactDir, { recursive: true });
  const require = createRequire(path.join(root, "app/package.json"));
  const playwright = require("@playwright/test");
  const executedAt = new Date().toISOString();
  const browsers = [];
  const artifacts = [];
  function archive(filename) {
    const bytes = fs.readFileSync(filename);
    const result = { path: path.relative(root, filename).split(path.sep).join("/"), bytes: bytes.length, sha256: hash(bytes), hashMode: "raw" };
    artifacts.push(result); return result;
  }
  for (const name of values.browsers.split(",")) {
    check(["chromium", "edge", "firefox", "webkit"].includes(name), "Unsupported browser name");
    let browser;
    try {
      browser = await (name === "edge" ? playwright.chromium : playwright[name]).launch({ headless: true, ...(name === "edge" ? { channel: "msedge" } : name === "chromium" ? { channel: "chromium" } : {}) });
    } catch (error) {
      browsers.push({ browser: name, status: "NOT RUN", reason: "Actual browser unavailable", error: error.message });
      continue;
    }
    const result = { browser: name, actualVersion: browser.version(), status: "PASS", cases: [], pageErrors: [], requestFailures: [], consoleErrors: [] };
    const context = await browser.newContext({ baseURL: origin.origin, viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    await context.tracing.start({ screenshots: true, snapshots: true, sources: false });
    const page = await context.newPage();
    page.on("pageerror", (error) => result.pageErrors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") result.consoleErrors.push(message.text()); });
    page.on("requestfailed", (request) => result.requestFailures.push({ method: request.method(), url: request.url(), error: request.failure()?.errorText }));
    async function test(id, body) {
      const startedAt = new Date().toISOString(); const start = performance.now();
      try { const measured = await body(); result.cases.push({ id, status: "PASS", startedAt, durationMs: performance.now() - start, ...measured }); }
      catch (error) { result.status = "FAIL"; result.cases.push({ id, status: "FAIL", startedAt, durationMs: performance.now() - start, error: error.message }); }
    }
    try {
      const routes = ["/", "/about", "/contact", "/resume", "/projects", "/projects/ai-vs-real", "/projects/zenith", "/projects/helios", "/projects/talks", "/projects/candidatex"];
      for (const route of routes) await test("direct-refresh-" + route, async () => {
        const response = await page.goto(route, { waitUntil: "domcontentloaded" });
        const expected = route.endsWith("candidatex") ? 404 : 200;
        check(response?.status() === expected, `Direct status ${response?.status()} expected ${expected}`);
        check(await page.locator("h1").count() > 0, "Useful semantic heading absent");
        const refreshed = await page.reload({ waitUntil: "domcontentloaded" });
        check(refreshed?.status() === expected, "Hard refresh status differs");
        check(await page.locator('a[href="/projects/candidatex"]').count() === 0, "CandidateX appears in a public launcher");
        const screenshot = path.join(artifactDir, name + "-route-" + (route.slice(1).replaceAll("/", "_") || "root") + ".png");
        await page.screenshot({ path: screenshot });
        return { route, directStatus: response.status(), refreshStatus: refreshed.status(), screenshot: archive(screenshot) };
      });
      await test("client-navigation-history", async () => {
        await page.goto("/", { waitUntil: "domcontentloaded" });
        await page.locator('nav a[href="/about"]').first().click();
        await page.waitForURL("**/about");
        await page.goBack({ waitUntil: "domcontentloaded" }); check(new URL(page.url()).pathname === "/", "Back did not return HOME route");
        await page.goForward({ waitUntil: "domcontentloaded" }); check(new URL(page.url()).pathname === "/about", "Forward did not restore route");
        return { actualRoutes: ["/", "/about", "/", "/about"] };
      });
      await test("real-control-entry-entrance", async () => {
        await page.goto("/", { waitUntil: "domcontentloaded" });
        await page.getByTestId("studio-disclosure").locator("summary").click();
        const timeline = await page.evaluate(() => new Promise((resolve, reject) => {
          const button = document.querySelector('[data-testid="enter-studio-btn"]');
          if (!button) { reject(new Error("Real Enter Studio control absent")); return; }
          const start = performance.now(); const phases = []; let loadingSeen = false;
          const inspect = () => {
            loadingSeen ||= document.querySelector('[data-testid="world-loading-overlay"]') !== null;
            const stage = document.querySelector('[data-testid="world-stage-container"]');
            const state = stage?.getAttribute("data-lifecycle-state");
            if (state && phases.at(-1)?.state !== state) phases.push({ state, elapsedMs: performance.now() - start });
            const canvas = document.querySelector('[data-testid="world-canvas"]');
            if (state === "HOME" && Number(canvas?.getAttribute("data-rendered-frames")) > 0) {
              clearTimeout(deadline); observer.disconnect();
              const entrance = phases.find((phase) => phase.state === "ENTRANCE");
              resolve({ phases, loadingSeen, totalEntryMs: performance.now() - start, entranceDurationMs: entrance ? performance.now() - start - entrance.elapsedMs : null,
                renderedFrames: Number(canvas.getAttribute("data-rendered-frames")), canvasConnected: canvas.isConnected });
            }
          };
          const observer = new MutationObserver(inspect);
          observer.observe(document.body, { childList: true, subtree: true, attributes: true });
          const deadline = setTimeout(() => { observer.disconnect(); reject(new Error("No actual rendered HOME within 15000 ms")); }, 15000);
          button.click(); inspect();
        }));
        check(timeline.entranceDurationMs !== null && timeline.entranceDurationMs <= 8000, "Actual cinematic entrance exceeds 8000 ms or was not observed");
        check(timeline.loadingSeen, "Loading progress was not observed");
        return timeline;
      });
      await test("real-control-skip-home", async () => {
        await page.goto("/?studio=enter", { waitUntil: "domcontentloaded" });
        await page.getByTestId("skip-entrance-btn").waitFor({ state: "visible", timeout: 15000 });
        const skip = await page.evaluate(() => new Promise((resolve, reject) => {
          const button = document.querySelector('[data-testid="skip-entrance-btn"]');
          const start = performance.now();
          const inspect = () => {
            const stage = document.querySelector('[data-testid="world-stage-container"]');
            if (stage?.getAttribute("data-lifecycle-state") === "HOME") { clearTimeout(deadline); observer.disconnect(); resolve({ elapsedMs: performance.now() - start, lifecycleState: "HOME" }); }
          };
          const observer = new MutationObserver(inspect); observer.observe(document.body, { attributes: true, childList: true, subtree: true });
          const deadline = setTimeout(() => { observer.disconnect(); reject(new Error("Skip did not reach HOME")); }, 1000);
          button?.click(); inspect();
        }));
        check(skip.elapsedMs <= 50, `Actual Skip-to-HOME ${skip.elapsedMs} ms exceeds 50 ms`);
        return skip;
      });
      await test("javascript-disabled-public-html", async () => {
        const noJs = await browser.newContext({ baseURL: origin.origin, javaScriptEnabled: false });
        try {
          const html = await noJs.newPage(); const observed = [];
          for (const route of ["/", "/about", "/projects", "/projects/helios", "/contact", "/resume"]) {
            const response = await html.goto(route, { waitUntil: "domcontentloaded" });
            check(response?.status() === 200 && await html.locator("h1").count() > 0, `No-JS useful HTML missing: ${route}`);
            observed.push({ route, status: response.status(), heading: await html.locator("h1").first().innerText() });
          }
          return { javaScriptEnabled: false, observations: observed, scope: "Useful HTML headings/direct routes only; full assistive/manual usability remains separate." };
        } finally { await noJs.close(); }
      });
      await test("webgl-disabled-fallback", async () => {
        const disabled = await browser.newContext({ baseURL: origin.origin });
        try {
          await disabled.addInitScript(() => { const original = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function(type, ...args) { return /^(webgl2?|experimental-webgl)$/.test(type) ? null : original.call(this, type, ...args); }; });
          const fallback = await disabled.newPage(); await fallback.goto("/?studio=1", { waitUntil: "domcontentloaded" });
          await fallback.getByTestId("world-static-container").waitFor({ state: "visible", timeout: 15000 });
          const response = await fallback.goto("/projects", { waitUntil: "domcontentloaded" });
          check(response?.status() === 200 && await fallback.locator("h1").count() > 0, "Portfolio unusable without WebGL");
          return { method: "Actual browser WebGL API disabled by test instrumentation", actualStaticFallback: true, portfolioAccessible: true, physicalHardwareProof: "NOT RUN" };
        } finally { await disabled.close(); }
      });
      if (result.pageErrors.length) result.status = "FAIL";
    } finally {
      const trace = path.join(artifactDir, name + ".trace.zip");
      await context.tracing.stop({ path: trace }); archive(trace);
      await context.close(); await browser.close();
    }
    browsers.push(result);
  }
  const receipt = { releaseId: manifest.releaseId, sourceCommit: manifest.sourceCommit, sourceAppTree: manifest.sourceAppTree,
    manifestSha256: binding.manifestSha256, deploymentId: binding.deploymentId, deployedAt: binding.deployedAt, targetOrigin: origin.origin,
    executedAt, completedAt: new Date().toISOString(), evidenceCategory: "LIVE BROWSER AUTOMATED", browsers, artifactHashes: artifacts,
    observationStatus: browsers.some((browser) => browser.status === "FAIL") ? "FAIL" : browsers.some((browser) => browser.status === "NOT RUN") ? "NOT RUN" : "PASS",
    requirements: [2, 3, 4, 5].map((id) => ({ id, status: "NOT RUN", observations: [], remaining: "This public automated smoke receipt is partial; reconcile every protocol subcriterion with actual service/manual/independent proof before completing the requirement." })),
    physicalDeviceSessions: "NOT RUN", assistiveSpeechSessions: "NOT RUN", physicalThermalSession: "NOT RUN",
    contactSubmissionAndNativeServiceProof: "NOT RUN", contextLossAndAvatarFullContract: "NOT RUN", rollbackRehearsal: "NOT RUN",
    heapGpuLeakAbsence: "UNKNOWN", independentReview: "NOT RUN", overallStatus: "NOT RUN", acceptanceClaim: false };
  fs.writeFileSync(output, JSON.stringify(receipt, null, 2) + "\n");
  console.log(`Actual automated public browser observations: ${receipt.observationStatus}; complete G7 and manual/service proofs remain NOT RUN.`);
  if (receipt.observationStatus !== "PASS") process.exitCode = 1;
}
main().catch((error) => { console.error(`FAIL browser observation tooling: ${error.message}`); process.exitCode = 1; });
