import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const workspace = path.resolve(import.meta.dirname, '../../../..');
const require = createRequire(path.join(workspace, 'app/package.json'));
const { chromium } = require('@playwright/test');
const baseURL = process.argv[2] ?? 'http://127.0.0.1:3333';
const browser = await chromium.launch({ headless: true });
const result = { scope: 'Local production build in headless Chromium. One optional texture is intentionally held by a browser route to diagnose readiness; this is fault injection, not actual network or production evidence.', baseURL, requests: [] };
let releaseOptional;
const holdOptional = new Promise(resolve => { releaseOptional = resolve; });
try {
  const page = await browser.newPage();
  page.on('request', request => { if (/\.(glb|png)$/.test(new URL(request.url()).pathname)) result.requests.push(new URL(request.url()).pathname); });
  let markRequested;
  const requested = new Promise(resolve => { markRequested = resolve; });
  await page.route('**/textures/deskmat-topography.png', async route => { markRequested(); await holdOptional; await route.continue(); });
  await page.goto(baseURL + '/?studio=enter', { waitUntil: 'domcontentloaded' });
  await requested;
  await page.waitForTimeout(16_200);
  result.after16Seconds = {
    state: await page.getByTestId('world-stage-container').getAttribute('data-lifecycle-state'),
    stats: await page.getByTestId('world-loading-percentage').textContent(),
    loadingOverlayVisible: await page.getByTestId('world-loading-overlay').isVisible(),
    retryVisible: await page.getByRole('button', { name: /retry/i }).isVisible().catch(() => false),
    continueVisible: await page.getByTestId('loading-continue-btn').isVisible(),
  };
  await page.screenshot({ path: path.join(import.meta.dirname, 'optional-stall.png'), fullPage: true });
  releaseOptional();
  await page.waitForFunction(() => document.querySelector('[data-testid="world-stage-container"]')?.getAttribute('data-lifecycle-state') === 'HOME', null, { timeout: 20_000 });
  result.afterRelease = await page.getByTestId('world-stage-container').getAttribute('data-lifecycle-state');
  result.result = result.after16Seconds.state === 'LOADING' && result.after16Seconds.stats.includes('3/3') ? 'FAIL: completed essential assets await optional texture; no elapsed-time Retry offered' : 'INCONCLUSIVE';
} catch (error) { result.error = error.stack; process.exitCode = 1; }
finally { releaseOptional(); await browser.close(); fs.writeFileSync(path.join(import.meta.dirname, 'optional-load-result.json'), JSON.stringify(result, null, 2) + '\n'); }
console.log(JSON.stringify(result));
