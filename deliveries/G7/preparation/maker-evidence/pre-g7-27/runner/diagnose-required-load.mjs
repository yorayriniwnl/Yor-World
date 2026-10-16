import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const [url, reportPath] = process.argv.slice(2);
if (!url || !reportPath) throw new Error("usage: diagnose-required-load.mjs <url> <report-path>");
const require = createRequire(path.join(process.cwd(), "package.json"));
const { chromium } = require("@playwright/test");

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const startedAtUtc = new Date().toISOString();
const requestMap = new Map();
const consoleErrors = [];
const pageErrors = [];
const bodyTasks = [];

const assetRequest = (request) => /\.(?:glb|png)(?:\?|$)/i.test(new URL(request.url()).pathname);
page.on("request", (request) => {
  if (!assetRequest(request)) return;
  requestMap.set(request, {
    url: request.url(),
    method: request.method(),
    startedAt: Date.now(),
    status: null,
    finishedAt: null,
    bytes: null,
    failure: null,
  });
});
page.on("response", (response) => {
  const entry = requestMap.get(response.request());
  if (!entry) return;
  entry.status = response.status();
  bodyTasks.push(response.body().then((body) => { entry.bytes = body.byteLength; }).catch((error) => {
    entry.failure = `response body unavailable: ${error.message}`;
  }));
});
page.on("requestfinished", (request) => {
  const entry = requestMap.get(request);
  if (entry) entry.finishedAt = Date.now();
});
page.on("requestfailed", (request) => {
  const entry = requestMap.get(request);
  if (entry) entry.failure = request.failure()?.errorText ?? "request failed";
});
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("pageerror", (error) => pageErrors.push({ name: error.name, message: error.message, stack: error.stack ?? null }));

let navigationError = null;
try {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForTimeout(20_000);
} catch (error) {
  navigationError = { name: error.name, message: error.message };
}
await Promise.allSettled(bodyTasks);

const stage = page.locator('[data-testid="world-stage-container"]');
const lifecycleState = await stage.getAttribute("data-lifecycle-state").catch(() => null);
const stageText = await stage.innerText().catch(() => null);
const endedAtUtc = new Date().toISOString();
const requests = [...requestMap.values()].map((entry) => ({
  ...entry,
  durationMs: entry.finishedAt === null ? null : entry.finishedAt - entry.startedAt,
}));
const report = {
  schemaVersion: 1,
  nodeVersion: process.version,
  startedAtUtc,
  endedAtUtc,
  url,
  navigationError,
  lifecycleState,
  stageText,
  assetRequests: requests,
  consoleErrors,
  pageErrors,
};

const resolvedReportPath = path.resolve(reportPath);
fs.mkdirSync(path.dirname(resolvedReportPath), { recursive: true });
fs.writeFileSync(resolvedReportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify({ reportPath: resolvedReportPath, lifecycleState, assetRequests: requests.map(({ url: assetUrl, status, durationMs, bytes, failure }) => ({ url: assetUrl, status, durationMs, bytes, failure })), consoleErrors, pageErrors, navigationError }, null, 2)}\n`);
await browser.close();
