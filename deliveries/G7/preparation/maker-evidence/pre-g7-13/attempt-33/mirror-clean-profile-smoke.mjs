import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire('C:\\p13-iso\\yorayriniwnl.in\\package.json');
const { chromium } = require('@playwright/test');
const evidenceRoot = 'C:\\p13-iso\\deliveries\\G7\\preparation\\maker-evidence\\pre-g7-13\\attempt-33';
const smokeDir = path.join(evidenceRoot, 'mirror-clean-profile-smoke');
fs.mkdirSync(smokeDir, { recursive: true });
const errors = [];
let browser;
let context;
let page;
let failure = null;
let pageState = null;
try {
  browser = await chromium.launch({ headless: true });
  context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  page = await context.newPage();
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`console.error: ${message.text()}`); });
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.stack || error.message}`));
  page.on('requestfailed', (request) => errors.push(`requestfailed: ${request.url()} :: ${request.failure()?.errorText ?? 'unknown'}`));
  const response = await page.goto('http://127.0.0.1:3136/?studio=enter', { waitUntil: 'domcontentloaded', timeout: 60000 });
  if (response?.status() !== 200) throw new Error(`Home response status was ${response?.status() ?? 'null'}`);
  const dialog = page.getByTestId('fullscreen-studio-dialog');
  await dialog.waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForFunction(() => {
    const canvas = document.querySelector('[data-testid="world-canvas"]');
    return Boolean(canvas && Number(canvas.getAttribute('data-rendered-frames') || 0) > 5);
  }, null, { timeout: 60000 });
  const toggle = page.getByTestId('studio-controls-toggle');
  if (await toggle.isVisible()) await toggle.click();
  const skip = page.getByTestId('skip-motion-btn');
  if (await skip.isVisible()) await skip.click();
  const stage = page.getByTestId('world-stage-container');
  await stage.waitFor({ state: 'visible', timeout: 15000 });
  const state = await page.evaluate(() => {
    const canvas = document.querySelector('[data-testid="world-canvas"]');
    const gl = canvas?.getContext('webgl2') ?? canvas?.getContext('webgl') ?? null;
    const stage = document.querySelector('[data-testid="world-stage-container"]');
    const dialog = document.querySelector('[data-testid="fullscreen-studio-dialog"]');
    const loading = document.querySelector('[data-testid="world-loading-overlay"]');
    const contextInfo = gl ? {
      version: gl.getParameter(gl.VERSION),
      shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
      vendor: gl.getParameter(gl.VENDOR),
      renderer: gl.getParameter(gl.RENDERER),
      contextLost: gl.isContextLost(),
    } : null;
    const rect = canvas?.getBoundingClientRect();
    return {
      capturedAt: new Date().toISOString(),
      url: location.href,
      origin: location.origin,
      title: document.title,
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      viewport: { width: innerWidth, height: innerHeight },
      dialogOpen: Boolean(dialog?.open),
      dialogModal: Boolean(dialog?.matches(':modal')),
      lifecycleState: stage?.dataset.lifecycleState ?? null,
      canvasVisible: Boolean(canvas && rect && rect.width > 0 && rect.height > 0),
      canvasRect: rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null,
      renderedFrames: Number(canvas?.dataset.renderedFrames ?? 0),
      loadingOverlayHidden: !loading || getComputedStyle(loading).display === 'none' || getComputedStyle(loading).visibility === 'hidden',
      fallbackVisible: Boolean(document.querySelector('[data-testid="world-fallback-banner"]')),
      staticPresentationVisible: Boolean(document.querySelector('[data-testid="world-static-container"]')),
      webgl: contextInfo,
      loadedNextChunks: [...new Set(performance.getEntriesByType('resource').map((entry) => new URL(entry.name).pathname).filter((pathname) => pathname.startsWith('/_next/static/chunks/')))],
    };
  });
  pageState = state;
  if (!state.canvasVisible) throw new Error('Canvas was not visible in the clean profile.');
  if (!state.webgl || state.webgl.contextLost) throw new Error('A healthy WebGL context was not present.');
  if (state.renderedFrames <= 5) throw new Error(`Expected >5 rendered frames, got ${state.renderedFrames}.`);
  if (state.lifecycleState !== 'HOME') throw new Error(`Expected HOME lifecycle, got ${state.lifecycleState}.`);
  await page.screenshot({ path: path.join(smokeDir, 'clean-profile-home-1440x900.png'), fullPage: false });
} catch (error) {
  failure = error instanceof Error ? `${error.stack || error.message}` : String(error);
  if (page) {
    try {
      pageState = await page.evaluate(() => {
        const canvas = document.querySelector('[data-testid="world-canvas"]');
        const gl = canvas?.getContext('webgl2') ?? canvas?.getContext('webgl') ?? null;
        const stage = document.querySelector('[data-testid="world-stage-container"]');
        const dialog = document.querySelector('[data-testid="fullscreen-studio-dialog"]');
        const rect = canvas?.getBoundingClientRect();
        return {
          capturedAt: new Date().toISOString(), url: location.href, title: document.title,
          userAgent: navigator.userAgent, platform: navigator.platform,
          viewport: { width: innerWidth, height: innerHeight }, dialogOpen: Boolean(dialog?.open),
          dialogModal: Boolean(dialog?.matches(':modal')), lifecycleState: stage?.dataset.lifecycleState ?? null,
          canvasVisible: Boolean(canvas && rect && rect.width > 0 && rect.height > 0),
          canvasRect: rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null,
          renderedFrames: Number(canvas?.dataset.renderedFrames ?? 0),
          fallbackVisible: Boolean(document.querySelector('[data-testid="world-fallback-banner"]')),
          staticPresentationVisible: Boolean(document.querySelector('[data-testid="world-static-container"]')),
          webgl: gl ? { version: gl.getParameter(gl.VERSION), vendor: gl.getParameter(gl.VENDOR), renderer: gl.getParameter(gl.RENDERER), contextLost: gl.isContextLost() } : null,
        };
      });
      await page.screenshot({ path: path.join(smokeDir, 'clean-profile-home-failure.png'), fullPage: false });
    } catch {}
  }
}
const result = {
  result: failure ? 'FAIL' : 'PASS',
  nodeVersion: process.version,
  browserVersion: browser ? browser.version() : null,
  serverOrigin: 'http://127.0.0.1:3136',
  profile: 'fresh Playwright browser context; no persisted profile state',
  pageState,
  errors,
  failure,
};
fs.writeFileSync(path.join(smokeDir, 'clean-profile-smoke.json'), JSON.stringify(result, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(result, null, 2));
await context?.close();
await browser?.close();
if (failure) process.exitCode = 1;
