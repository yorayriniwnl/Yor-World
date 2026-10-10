import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const input = await new Promise((resolve, reject) => {
  let text = '';
  const terminal = process.stdin.isTTY;
  const finish = () => {
    process.stdin.off('data', onData);
    if (terminal) process.stdin.setRawMode(false);
    process.stdin.pause();
    try { resolve(JSON.parse(text)); } catch { reject(new Error('Invalid hidden input')); }
  };
  const onData = chunk => { text += chunk; if (text.includes('\n') || text.includes('\r')) finish(); };
  if (terminal) { process.stdin.setRawMode(true); process.stderr.write('Ready for live-check JSON on stdin (input is hidden).\n'); }
  process.stdin.setEncoding('utf8'); process.stdin.on('data', onData); process.stdin.resume();
});
const origin = new URL(input.url).origin;
if (origin !== 'https://yor-world.deadlygamerayush5.chatgpt.site' || !input.token) throw new Error('Selected Site input differs');
const headers = { 'OAI-Sites-Authorization': `Bearer ${input.token}` };
const checks = [];
let browser;
try {
  const anonymous = await fetch(origin, { redirect: 'manual' });
  const anonymousHtml = await anonymous.text();
  const anonymousDenied = [301, 302, 303, 307, 308, 401, 403].includes(anonymous.status) ||
    (anonymous.status === 200 && !anonymousHtml.includes('A little world.') && /sign.?in|log.?in|access/i.test(anonymousHtml));
  if (!anonymousDenied) throw new Error('Owner-only anonymous gate not confirmed');
  checks.push({ check: 'anonymous request gated', status: 'PASS', httpStatus: anonymous.status });
  for (const route of ['/', '/about', '/projects', '/projects/ai-vs-real', '/projects/zenith', '/projects/helios', '/projects/talks', '/resume', '/contact']) {
    const response = await fetch(origin + route, { headers, redirect: 'manual' });
    if (response.status !== 200) throw new Error(`Published page unavailable: ${route} (${response.status})`);
    const html = await response.text();
    if (!html.includes('<h1')) throw new Error(`Published page lacks expected content: ${route}`);
    if (route === '/contact' && !html.includes('Message sending is not available in this preview.')) throw new Error('Contact preview notice missing');
    checks.push({ check: route, status: 'PASS', httpStatus: response.status });
  }
  for (const route of ['/admin', '/api/contact', '/projects/candidatex']) {
    const response = await fetch(origin + route, { headers, redirect: 'manual' });
    if (response.status !== 404) throw new Error(`Excluded route is not 404: ${route}`);
    checks.push({ check: route, status: 'PASS', httpStatus: response.status });
  }
  const manifest = JSON.parse(readFileSync(path.join(here, 'source/public/asset-manifest.json'), 'utf8'));
  for (const asset of manifest.groups) {
    const response = await fetch(origin + asset.url, { headers, redirect: 'manual' });
    if (response.status !== 200) throw new Error(`Published model unavailable: ${asset.url}`);
    const data = Buffer.from(await response.arrayBuffer());
    if (data.length !== asset.bytes || createHash('sha256').update(data).digest('hex') !== asset.sha256) throw new Error(`Published model differs: ${asset.url}`);
    checks.push({ check: asset.url, status: 'PASS', bytes: data.length, sha256: asset.sha256 });
  }
  const require = createRequire(path.join(here, 'source/package.json'));
  const { chromium, expect } = require('@playwright/test');
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.route('**/*', route => {
    if (new URL(route.request().url()).origin === origin) return route.continue({ headers: { ...route.request().headers(), ...headers } });
    return route.continue();
  });
  await page.goto(origin);
  await expect(page.locator('h1')).toContainText('A little world.');
  await page.getByRole('link', { name: /View projects/ }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.locator('h1')).toBeVisible();
  checks.push({ check: 'live browser client navigation', status: 'PASS' });
  await page.screenshot({ path: path.join(here, 'evidence/live-projects.png'), fullPage: true });
  writeFileSync(path.join(here, 'evidence/live-check.json'), JSON.stringify({ status: 'PASS', checkedAt: new Date().toISOString(), origin, checks, limitations: 'Service-bypass content check and anonymous access gate; owner browser SIWC sign-in flow, physical-device and full G7 tests not run.' }, null, 2) + '\n');
  console.log(JSON.stringify({ status: 'PASS', checks: checks.length, origin }));
} catch (error) {
  const failure = error.message.split(input.token).join('[redacted]');
  writeFileSync(path.join(here, 'evidence/live-check.json'), JSON.stringify({ status: 'FAIL', checkedAt: new Date().toISOString(), origin, checks, failure }, null, 2) + '\n');
  console.error(failure); process.exitCode = 1;
} finally {
  if (browser) await browser.close();
}
