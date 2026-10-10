import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, 'source/package.json'));
const { chromium, expect } = require('@playwright/test');
const root = path.join(here, 'source/out');
const mime = { '.html': 'text/html', '.txt': 'text/plain', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const target = path.resolve(root, '.' + pathname);
    if (target !== root && !target.startsWith(root + path.sep)) throw new Error('Path escapes output');
    let selected;
    for (const candidate of [target, target + '.html', path.join(target, 'index.html')]) {
      try { if ((await stat(candidate)).isFile()) { selected = candidate; break; } } catch {}
    }
    if (!selected) {
      response.writeHead(404, { 'content-type': 'text/html' });
      response.end(await readFile(path.join(root, '404.html')));
      return;
    }
    response.writeHead(200, { 'content-type': mime[path.extname(selected)] ?? 'application/octet-stream' });
    response.end(await readFile(selected));
  } catch {
    response.writeHead(400); response.end('Bad request');
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
const results = [];
const errors = [];
try {
  browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(origin);
  await expect(page.locator('h1')).toContainText('A little world.');
  await page.screenshot({ path: path.join(here, 'evidence/desktop.png'), fullPage: true });
  await page.getByRole('link', { name: /View projects/ }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.locator('h1')).toBeVisible();
  const links = await page.locator('a[href^="/projects/"]').evaluateAll(elements => [...new Set(elements.map(element => element.getAttribute('href')))]);
  expect(links.length).toBe(4);
  for (const route of ['/about', '/resume', '/contact', ...links]) {
    const response = await page.goto(origin + route);
    expect(response.status()).toBe(200);
    await expect(page.locator('h1')).toBeVisible();
    results.push({ route, status: 'PASS', httpStatus: response.status() });
  }
  await page.goto(origin + '/contact');
  await expect(page.getByText('Message sending is not available in this preview. Please use the direct email link below.')).toBeVisible();
  expect(await page.locator('form').count()).toBe(0);
  expect(await page.locator('a[href^="mailto:"]').count()).toBeGreaterThan(0);
  for (const route of ['/projects/candidatex', '/admin', '/api/contact']) {
    const response = await page.goto(origin + route);
    expect(response.status()).toBe(404);
    results.push({ route, status: 'PASS', httpStatus: 404 });
  }
  await page.goto(origin);
  await page.getByTestId('studio-disclosure').locator('summary').click();
  await page.getByTestId('enter-studio-btn').click();
  const canvas = page.getByTestId('world-canvas');
  await expect(canvas).toBeVisible({ timeout: 20000 });
  await expect.poll(async () => Number(await canvas.getAttribute('data-rendered-frames')), { timeout: 20000 }).toBeGreaterThan(5);
  const renderedFrames = Number(await canvas.getAttribute('data-rendered-frames'));
  await page.screenshot({ path: path.join(here, 'evidence/studio.png'), fullPage: true });
  results.push({ route: '/ studio entry', status: 'PASS', renderedFrames, renderer: 'Chromium SwiftShader' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(origin);
  await expect(page.locator('h1')).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
  await page.screenshot({ path: path.join(here, 'evidence/mobile.png'), fullPage: true });
  results.push({ route: '/ mobile layout', status: 'PASS', width: 390, horizontalOverflow: overflow });
  expect(errors).toEqual([]);
  writeFileSync(path.join(here, 'evidence/browser-smoke.json'), JSON.stringify({ status: 'PASS', checkedAt: new Date().toISOString(), results, pageErrors: errors, limitations: 'Local exported-site smoke only; software renderer; no physical device, full interactions, backend or G7 acceptance.' }, null, 2) + '\n');
  console.log(JSON.stringify({ status: 'PASS', checks: results.length, pageErrors: errors.length }));
} catch (error) {
  writeFileSync(path.join(here, 'evidence/browser-smoke.json'), JSON.stringify({ status: 'FAIL', checkedAt: new Date().toISOString(), results, pageErrors: errors, failure: error.message }, null, 2) + '\n');
  console.error(error.message); process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
