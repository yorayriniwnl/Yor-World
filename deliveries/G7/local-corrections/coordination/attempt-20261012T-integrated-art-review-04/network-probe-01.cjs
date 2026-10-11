const { chromium } = require(require('node:path').join(process.cwd(), 'app/node_modules/@playwright/test'));
const fs = require('node:fs');
const path = require('node:path');
const target = 'http://127.0.0.1:3157';
const attemptRoot = __dirname;
const report = { startedAt: new Date().toISOString(), viewport: { width: 320, height: 600 }, requests: [], responses: [], failures: [], pageErrors: [] };
let sequence = 0;
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  report.chromeVersion = browser.version();
  const page = await browser.newPage({ viewport: report.viewport, deviceScaleFactor: 1 });
  const ids = new WeakMap();
  const candidateResponses = [];
  const elapsed = () => Math.round(performance.now() - started);
  const started = performance.now();
  page.on('request', (request) => {
    const id = ++sequence; ids.set(request, id);
    report.requests.push({ id, atMs: elapsed(), url: request.url(), resourceType: request.resourceType() });
  });
  page.on('response', (response) => {
    const request = response.request();
    const entry = { id: ids.get(request), atMs: elapsed(), status: response.status(), url: response.url() };
    report.responses.push(entry);
    if (response.url().includes('production-room-full.glb')) {
      candidateResponses.push(response.finished().then((error) => {
        report.responses.find((row) => row.id === entry.id).bodyFinished = error ? String(error) : 'complete';
      }).catch((error) => {
        report.responses.find((row) => row.id === entry.id).bodyFinished = 'rejected: ' + String(error);
      }));
    }
  });
  page.on('requestfailed', (request) => report.failures.push({ id: ids.get(request), atMs: elapsed(), url: request.url(), failure: request.failure() }));
  page.on('pageerror', (error) => report.pageErrors.push(String(error.stack || error)));
  await page.goto(target + '/?environment=build-attempt-19&fixture=fixture-attempt-12', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForFunction(() => window.ready === true, { timeout: 30000 });
  await page.waitForTimeout(1000);
  report.scene = await page.evaluate(() => ({ ready: window.ready, inspect: window.art.inspect() }));
  report.beforeClose = { atMs: elapsed(), failures: report.failures.length };
  await Promise.race([Promise.all(candidateResponses), new Promise((resolve) => setTimeout(resolve, 5000))]);
  report.afterResponseWait = { atMs: elapsed(), failures: report.failures.length, responses: report.responses.filter((row) => row.url.includes('production-room-full.glb')) };
  await page.close();
  await new Promise((resolve) => setTimeout(resolve, 500));
  report.afterClose = { atMs: elapsed(), failures: report.failures };
  await browser.close();
  report.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(attemptRoot, 'network-probe-01.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ pageErrors: report.pageErrors.length, candidateResponses: report.responses.filter((row) => row.url.includes('production-room-full.glb')), failures: report.failures, output: path.join(attemptRoot, 'network-probe-01.json') }));
})().catch((error) => { console.error(error); process.exitCode = 1; });
