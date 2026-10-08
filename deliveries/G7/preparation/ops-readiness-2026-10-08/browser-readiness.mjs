import { createRequire } from 'node:module';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const require = createRequire(path.join(root, 'app/package.json'));
const { chromium, firefox, webkit } = require('@playwright/test');
const pkg = require('@playwright/test/package.json');
const playwrightRequire = createRequire(createRequire(require.resolve('@playwright/test/package.json')).resolve('playwright/package.json'));
const browsers = JSON.parse(readFileSync(path.join(path.dirname(playwrightRequire.resolve('playwright-core/package.json')), 'browsers.json'), 'utf8'));
const stage = process.argv[2];
if (!['before','after'].includes(stage)) throw new Error('Supply before or after');
const receipt = { category: 'LOCAL PREPARATION ONLY', stage, executedAt: new Date().toISOString(), nodeVersion: process.version, playwrightVersion: pkg.version, pinnedVersion: '1.63.0', pinnedVersionMatches: pkg.version === '1.63.0', browsers: [], acceptanceClaim: false };
for (const [name, engine] of [['chromium', chromium], ['firefox', firefox], ['webkit', webkit]]) {
  const executablePath = engine.executablePath();
  const pinned = browsers.browsers.find((item) => item.name === name);
  const result = { name, revision: pinned?.revision, expectedVersion: pinned?.browserVersion, executablePath, exists: existsSync(executablePath), launch: 'NOT RUN' };
  if (stage === 'after' && result.exists) {
    try { const browser = await engine.launch({ headless: true }); result.actualVersion = browser.version(); await browser.close(); result.launch = 'PASS'; }
    catch (error) { result.launch = 'FAIL'; result.error = String(error.message).split('\n')[0]; }
  }
  receipt.browsers.push(result);
}
const edgePaths = [process.env['ProgramFiles(x86)'], process.env.ProgramFiles, process.env.LOCALAPPDATA].filter(Boolean).map((base) => path.join(base, 'Microsoft/Edge/Application/msedge.exe'));
const edge = { name: 'edge', executablePath: edgePaths.find(existsSync) ?? null, exists: edgePaths.some(existsSync), launch: 'NOT RUN' };
if (stage === 'after' && edge.exists) {
  try { const browser = await chromium.launch({ channel: 'msedge', headless: true }); edge.actualVersion = browser.version(); await browser.close(); edge.launch = 'PASS'; }
  catch (error) { edge.launch = 'FAIL'; edge.error = String(error.message).split('\n')[0]; }
}
receipt.browsers.push(edge);
receipt.completedAt = new Date().toISOString();
writeFileSync(path.join(root, 'deliveries/G7/preparation/ops-readiness-2026-10-08', `browser-${stage}.json`), JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify(receipt, null, 2));
