import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const root = path.resolve(import.meta.dirname, '../../../..');
const require = createRequire(path.join(root, 'app/package.json'));
const { chromium } = require('@playwright/test');
const attempt = process.argv[2];
if (!attempt || !/^profile-attempt-\d+$/.test(attempt)) throw new Error('A new profile-attempt-N is required');
const output = path.join(import.meta.dirname, attempt);
await mkdir(output);
const binding = { source: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), url: 'http://127.0.0.1:3140', preview: 'changing development source; no production certification', capturedAt: new Date().toISOString() };
await writeFile(path.join(output, 'binding.json'), JSON.stringify(binding, null, 2));
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const results = [];
try {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }, { width: 320, height: 600 }]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${binding.url}/?studio=1`);
    await page.getByTestId('world-stage-container').waitFor();
    await page.waitForFunction(() => document.querySelector('[data-testid="world-stage-container"]')?.getAttribute('data-lifecycle-state') === 'HOME', { timeout: 30000 });
    for (const tier of ['high', 'medium', 'low']) {
      await page.getByTestId('studio-options-toggle').click();
      await page.getByTestId('quality-tier-select').selectOption(tier);
      await page.getByTestId('studio-options-toggle').click();
      const frames = await page.getByTestId('world-canvas').evaluate((tier) => new Promise((resolve) => {
        const frames = [];
        const timer = setTimeout(() => { document.querySelector('[data-testid="world-canvas"]')?.removeEventListener('yor-world-rendered-frame', onFrame); resolve(frames); }, 10000);
        const onFrame = (event) => {
          // Retain effective tiers too: mismatches are failures, never silent samples.
          frames.push(event.detail);
          if (frames.length === 60) { clearTimeout(timer); event.target.removeEventListener('yor-world-rendered-frame', onFrame); resolve(frames); }
        };
        document.querySelector('[data-testid="world-canvas"]').addEventListener('yor-world-rendered-frame', onFrame);
      }), tier);
      await page.getByTestId('diagnostics-toggle-btn').click();
      const diagnosticText = await page.getByTestId('world-diagnostics').textContent();
      await page.getByTestId('diagnostics-toggle-btn').click();
      await page.screenshot({ path: path.join(output, `${viewport.width}x${viewport.height}-${tier}.png`) });
      const calls = frames.map((frame) => frame.renderCalls);
      const result = { viewport, tier, minCalls: Math.min(...calls), maxCalls: Math.max(...calls), ceiling: viewport.width < 640 ? 80 : 120, frames, diagnosticText, errors };
      results.push(result);
      await writeFile(path.join(output, 'results.json'), JSON.stringify({ binding, results }, null, 2));
      process.stdout.write(JSON.stringify({ viewport, tier, minCalls: result.minCalls, maxCalls: result.maxCalls, ceiling: result.ceiling, errors }) + '\n');
    }
    await context.close();
  }
} finally { await browser.close(); }
