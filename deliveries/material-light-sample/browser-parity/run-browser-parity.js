/**
 * Automated Three.js Browser Parity Runner
 * Launches local HTTP server, loads workstation-sample in headless Chromium via Playwright,
 * verifies WebGL rendering, extracts runtime diagnostics, and captures browser parity screenshots.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
let chromium;
try {
  ({ chromium } = require('@playwright/test'));
} catch (e) {
  ({ chromium } = require('C:/Users/yoray/AppData/Local/Temp/yor-world-g1-proof/app/node_modules/@playwright/test'));
}

const ROOT_DIR = path.resolve(__dirname, '..');
const PORT = 8089;

// Simple static HTTP server
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.glb': 'model/gltf-binary',
  '.png': 'image/png',
  '.css': 'text/css'
};

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let reqPath = decodeURI(req.url.split('?')[0]);
      if (reqPath === '/') reqPath = '/browser-parity/index.html';
      const filePath = path.join(ROOT_DIR, reqPath);
      const exists = fs.existsSync(filePath);
      console.log(`[HTTP ${req.method}] ${req.url} -> ${filePath} (exists: ${exists})`);

      if (!exists) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end(`404 Not Found: ${req.url} -> ${filePath}`);
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*'
      });
      fs.createReadStream(filePath).pipe(res);
    });

    server.listen(PORT, () => {
      console.log(`Local test server running at http://localhost:${PORT}`);
      resolve(server);
    });
  });
}

async function runParity() {
  const server = await startServer();
  let browser;
  const consoleLogs = [];
  const networkLogs = [];

  try {
    console.log('Launching headless Chromium via Playwright...');
    browser = await chromium.launch({
      headless: true,
      args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader']
    });

    const page = await browser.newPage({
      viewport: { width: 1504, height: 1128 },
      deviceScaleFactor: 1
    });

    page.on('console', (msg) => {
      consoleLogs.push({ type: msg.type(), text: msg.text() });
      console.log(`[Browser Console ${msg.type()}]:`, msg.text());
    });

    page.on('request', (req) => {
      networkLogs.push({ method: req.method(), url: req.url() });
    });

    console.log('Navigating to viewer page...');
    await page.goto(`http://localhost:${PORT}/browser-parity/index.html`, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Wait for Three.js to finish loading and rendering
    console.log('Waiting for window.__WORLD_READY__...');
    await page.waitForFunction(() => window.__WORLD_READY__ === true, { timeout: 25000 });
    await page.waitForTimeout(1500); // Allow render settlement

    // Extract diagnostics
    const diagnostics = await page.evaluate(() => window.__DIAGNOSTICS__);
    console.log('Extracted Browser Diagnostics:', diagnostics);

    const parityDir = path.join(ROOT_DIR, 'browser-parity');
    const evidenceDir = path.join(ROOT_DIR, 'evidence');

    // Helper to capture WebGL canvas screenshot
    async function captureCanvas(targetPath) {
      const dataUrl = await page.evaluate(() => window.__GET_SCREENSHOT__());
      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
      fs.writeFileSync(targetPath, Buffer.from(base64Data, 'base64'));
      console.log(`Saved browser render: ${targetPath}`);
    }

    // 1. Reference Match Screenshot (1504x1128)
    await page.evaluate(() => {
      window.__SET_RESOLUTION__(1504, 1128);
      window.__SWITCH_CAMERA__('reference_match');
    });
    await page.waitForTimeout(300);
    const refPath = path.join(parityDir, 'browser-reference-workstation.png');
    await captureCanvas(refPath);

    // 2. Home Desktop Viewport (1920x1080)
    await page.evaluate(() => {
      window.__SET_RESOLUTION__(1920, 1080);
      window.__SWITCH_CAMERA__('home_desktop');
    });
    await page.waitForTimeout(300);
    const homePath = path.join(parityDir, 'browser-home-desktop.png');
    await captureCanvas(homePath);

    // 3. Monitor Detail Viewport (1920x1080)
    await page.evaluate(() => {
      window.__SET_RESOLUTION__(1920, 1080);
      window.__SWITCH_CAMERA__('monitor_detail');
    });
    await page.waitForTimeout(300);
    const monPath = path.join(parityDir, 'browser-monitor-detail.png');
    await captureCanvas(monPath);

    // Save Evidence
    const evidenceData = {
      timestamp: new Date().toISOString(),
      tool: 'playwright-chromium',
      status: 'PASS',
      diagnostics,
      browserScreenshots: [
        'browser-parity/browser-reference-workstation.png',
        'browser-parity/browser-home-desktop.png',
        'browser-parity/browser-monitor-detail.png'
      ],
      consoleLogs,
      networkRequestsCount: networkLogs.length
    };

    fs.writeFileSync(
      path.join(evidenceDir, 'browser-diagnostics.json'),
      JSON.stringify(evidenceData, null, 2),
      'utf-8'
    );
    console.log('Saved browser evidence to evidence/browser-diagnostics.json');

  } catch (err) {
    console.error('Browser parity check failed:', err);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    server.close();
    console.log('Parity check run completed.');
  }
}

runParity();
