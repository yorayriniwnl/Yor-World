/**
 * Browser WebGL Parity Test for YOR WORLD Production Environment
 * Executes Playwright headless Chromium with WebGL enabled.
 * Renders identical cameras in Three.js r180 and validates lighting state restoration.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

let chromium;
try {
  ({ chromium } = require('@playwright/test'));
} catch (e) {
  try {
    ({ chromium } = require('C:/Users/yoray/AppData/Local/Temp/yor-world-g1-proof/app/node_modules/@playwright/test'));
  } catch (e2) {
    ({ chromium } = require('playwright'));
  }
}

const DELIVERY_DIR = path.resolve(__dirname, '..');
const BROWSER_PARITY_DIR = path.join(DELIVERY_DIR, 'browser-parity');
const EVIDENCE_DIR = path.join(DELIVERY_DIR, 'evidence');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.glb': 'model/gltf-binary',
  '.css': 'text/css'
};

function createStaticServer(port = 8089) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let cleanUrl = req.url.split('?')[0];
      let filePath = path.join(DELIVERY_DIR, cleanUrl);

      if (cleanUrl === '/' || cleanUrl === '/index.html') {
        filePath = path.join(BROWSER_PARITY_DIR, 'index.html');
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end(`Not Found: ${cleanUrl}`);
          return;
        }
        res.writeHead(200, {
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*'
        });
        res.end(data);
      });
    });

    server.listen(port, () => {
      console.log(`Local test server running at http://localhost:${port}/`);
      resolve(server);
    });
  });
}

async function runBrowserParity() {
  console.log('='.repeat(80));
  console.log('STARTING BROWSER WebGL PARITY VALIDATION SUITE');
  console.log('='.repeat(80));

  const PORT = 8089;
  const server = await createStaticServer(PORT);

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--disable-web-security'
    ]
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1
  });

  const page = await context.newPage();

  page.on('console', (msg) => {
    console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`);
  });
  page.on('pageerror', (err) => {
    console.error(`[Browser Error] ${err.message}`);
  });

  console.log(`Navigating to http://localhost:${PORT}/browser-parity/index.html...`);
  await page.goto(`http://localhost:${PORT}/browser-parity/index.html`);

  console.log('Waiting for Three.js GLB scene readiness...');
  await page.waitForFunction(() => window.__YOR_SCENE_READY === true, { timeout: 30000 });
  console.log('Three.js scene is READY in browser WebGL!');

  // Capture all 5 Camera Presets
  const CAMERAS = [
    { name: 'entry', slug: 'entry', width: 1920, height: 1080 },
    { name: 'home-desktop', slug: 'home-desktop', width: 1920, height: 1080 },
    { name: 'monitor-detail', slug: 'monitor-detail', width: 1920, height: 1080 },
    { name: 'reverse-doorway', slug: 'reverse-doorway', width: 1920, height: 1080 },
    { name: 'mobile-portrait', slug: 'mobile-portrait', width: 720, height: 1280 }
  ];

  const captures = [];

  for (const cam of CAMERAS) {
    console.log(`\nSetting up camera preset: ${cam.name} (${cam.width}x${cam.height})...`);
    await page.setViewportSize({ width: cam.width, height: cam.height });
    await page.evaluate(({ name, width, height }) => {
      window.__YOR_API.resize(width, height);
      window.__YOR_API.applyCameraPreset(name);
    }, cam);

    // Wait for frame rendering to settle
    await page.waitForTimeout(600);

    const outPath = path.join(BROWSER_PARITY_DIR, `browser-${cam.slug}.png`);
    const dataUrl = await page.evaluate(() => window.__YOR_API.getScreenshot());
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
    fs.writeFileSync(outPath, Buffer.from(base64Data, 'base64'));
    const stat = fs.statSync(outPath);
    console.log(`Captured screenshot: ${outPath} (${stat.size.toLocaleString()} bytes)`);

    captures.push({
      camera: cam.name,
      slug: cam.slug,
      resolution: `${cam.width}x${cam.height}`,
      bytes: stat.size,
      filePath: outPath
    });
  }

  // --------------------------------------------------------------------------
  // Lighting State Restoration Invariant Test
  // --------------------------------------------------------------------------
  console.log('\n--- Running Lighting State Restoration Invariant Test ---');
  const snap0 = await page.evaluate(() => window.__YOR_API.getLightingSnapshot());
  console.log('Baseline snapshot:', snap0);

  console.log('Activating project focus lighting mode...');
  await page.evaluate(() => window.__YOR_API.setLightingFocus(true));
  const snapFocus = await page.evaluate(() => window.__YOR_API.getLightingSnapshot());
  console.log('Focus snapshot:', snapFocus);

  console.log('Releasing project focus lighting mode...');
  await page.evaluate(() => window.__YOR_API.setLightingFocus(false));
  const snap1 = await page.evaluate(() => window.__YOR_API.getLightingSnapshot());
  console.log('Restored snapshot:', snap1);

  let delta = 0;
  for (const k of Object.keys(snap0)) {
    delta += Math.abs(snap0[k] - snap1[k]);
  }
  console.log(`Restoration Invariant Delta (delta): ${delta.toFixed(8)}`);

  const passedRestoration = delta === 0;
  console.log(`Restoration Status: ${passedRestoration ? 'PASS' : 'FAIL'}`);

  // Summary Report
  const parityReport = {
    timestamp: new Date().toISOString(),
    renderer: 'Three.js 0.180.0 (WebGL SwiftShader)',
    toneMapping: 'ACESFilmicToneMapping',
    exposure: 1.0,
    captures,
    lightingRestoration: {
      baseline: snap0,
      focus: snapFocus,
      restored: snap1,
      delta: Number(delta.toFixed(8)),
      passed: passedRestoration
    },
    allPassed: passedRestoration && captures.length === 5
  };

  const reportPath = path.join(EVIDENCE_DIR, 'browser-parity-results.json');
  fs.writeFileSync(reportPath, JSON.stringify(parityReport, null, 2) + '\n');
  console.log(`\nSaved parity results: ${reportPath}`);

  await browser.close();
  server.close();

  if (!parityReport.allPassed) {
    console.error('BROWSER PARITY TEST FAILED');
    process.exit(1);
  } else {
    console.log('\nSUCCESS: BROWSER PARITY TESTS COMPLETE AND VERIFIED!');
  }
}

runBrowserParity().catch((err) => {
  console.error(err);
  process.exit(1);
});
