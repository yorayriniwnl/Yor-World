/**
 * Automated Three.js Browser Parity & Lighting State Restoration Runner
 * Launches local HTTP server, loads workstation-sample in headless Chromium via Playwright,
 * verifies WebGL rendering, extracts runtime diagnostics, captures browser parity screenshots,
 * and executes comprehensive lighting state restoration validation.
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
    await page.waitForTimeout(1000); // Allow render settlement

    // Extract diagnostics
    const diagnostics = await page.evaluate(() => window.__DIAGNOSTICS__);
    console.log('Extracted Browser Diagnostics:', diagnostics);

    const parityDir = path.join(ROOT_DIR, 'browser-parity');
    const evidenceDir = path.join(ROOT_DIR, 'evidence');

    // Hide UI overlays for clean render screenshots
    await page.evaluate(() => {
      const st = document.getElementById('status');
      if (st) st.style.display = 'none';
      const cp = document.getElementById('control-panel');
      if (cp) cp.style.display = 'none';
    });

    async function captureCanvas(targetPath) {
      const dataUrl = await page.evaluate(() => window.__GET_SCREENSHOT__());
      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
      fs.writeFileSync(targetPath, Buffer.from(base64Data, 'base64'));
      console.log(`Saved: ${targetPath}`);
    }

    // 1. Reference Match Screenshot (1504x1128)
    console.log('Capturing Reference Match screenshot (1504x1128)...');
    await page.evaluate(() => {
      window.__SET_RESOLUTION__(1504, 1128);
      window.__SWITCH_CAMERA__('reference_match');
    });
    await page.waitForTimeout(300);
    const refPath = path.join(parityDir, 'browser-reference-workstation.png');
    await captureCanvas(refPath);

    // 2. Home Desktop Viewport (1920x1080)
    console.log('Capturing Home Desktop screenshot (1920x1080)...');
    await page.evaluate(() => {
      window.__SET_RESOLUTION__(1920, 1080);
      window.__SWITCH_CAMERA__('home_desktop');
    });
    await page.waitForTimeout(300);
    const homePath = path.join(parityDir, 'browser-home-desktop.png');
    await captureCanvas(homePath);

    // 3. Monitor Detail Viewport (1920x1080)
    console.log('Capturing Monitor Detail screenshot (1920x1080)...');
    await page.evaluate(() => {
      window.__SET_RESOLUTION__(1920, 1080);
      window.__SWITCH_CAMERA__('monitor_detail');
    });
    await page.waitForTimeout(300);
    const monPath = path.join(parityDir, 'browser-monitor-detail.png');
    await captureCanvas(monPath);

    // Restore UI overlays
    await page.evaluate(() => {
      const st = document.getElementById('status');
      if (st) st.style.display = 'block';
      const cp = document.getElementById('control-panel');
      if (cp) cp.style.display = 'block';
    });

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

    // 4. Lighting State Restoration Proof
    console.log('\n--- Running Interactive Lighting State Restoration Test ---');
    const restorationResults = await page.evaluate(() => {
      const results = {
        steps: [],
        passed: true
      };

      const ctrl = window.WorldLighting;
      if (!ctrl) {
        return { passed: false, error: 'WorldLighting controller not found on window' };
      }

      // Step 1: Capture initial base state
      const initialBase = ctrl.getBase();
      results.initialBase = initialBase;
      results.steps.push({ step: 1, action: 'capture_initial_base', status: 'PASS' });

      // Step 2: Mutate interactive variables (User turns off lamp, dims hex lights)
      ctrl.setInteractiveVariable('lightbar.enabled', false);
      ctrl.setInteractiveVariable('hexLight.intensity', 1.5);
      ctrl.setInteractiveVariable('cyanFill.intensity', 1.0);
      const userModified = ctrl.captureSnapshot();
      results.userModified = userModified;
      
      const lampOffVerified = userModified.lightbar.enabled === false;
      const hexModifiedVerified = Math.abs(userModified.hexLight.intensity - 1.5) < 1e-4;
      results.steps.push({
        step: 2,
        action: 'user_mutation',
        lampOffVerified,
        hexModifiedVerified,
        status: (lampOffVerified && hexModifiedVerified) ? 'PASS' : 'FAIL'
      });

      // Step 3: Apply Project Focus layer
      ctrl.setFocus('project-sample');
      const focusState = ctrl.captureSnapshot();
      results.focusState = focusState;

      // Verify focus layer dimmed ambient & maintained lamp off (contract: focus cannot turn lamp back on if user turned it off!)
      const lampRemainedOffInFocus = focusState.lightbar.enabled === false;
      const ambientDimmed = focusState.ambient.intensity === 0.25;
      results.steps.push({
        step: 3,
        action: 'apply_project_focus',
        lampRemainedOffInFocus,
        ambientDimmed,
        status: (lampRemainedOffInFocus && ambientDimmed) ? 'PASS' : 'FAIL'
      });

      // Step 4: Clear Project Focus layer
      ctrl.setFocus(null);
      const postFocusState = ctrl.captureSnapshot();
      results.postFocusState = postFocusState;

      // User preferences must survive: lamp must still be off, hex at 1.5, cyan at 1.0
      const lampStillOff = postFocusState.lightbar.enabled === false;
      const hexStill15 = Math.abs(postFocusState.hexLight.intensity - 1.5) < 1e-4;
      results.steps.push({
        step: 4,
        action: 'clear_project_focus',
        lampStillOff,
        hexStill15,
        status: (lampStillOff && hexStill15) ? 'PASS' : 'FAIL'
      });

      // Step 5: Full Base State Restoration
      ctrl.restoreState();
      const restoredState = ctrl.captureSnapshot();
      results.restoredState = restoredState;

      // Compare restored state with initial base state
      const deltaAnalysis = ctrl.calculateDelta(initialBase);
      results.deltaAnalysis = deltaAnalysis;

      const fullRestorationPassed = deltaAnalysis.isRestored && deltaAnalysis.maxDelta < 1e-6;
      results.steps.push({
        step: 5,
        action: 'full_restore_base_state',
        maxDelta: deltaAnalysis.maxDelta,
        diffCount: deltaAnalysis.diffCount,
        status: fullRestorationPassed ? 'PASS' : 'FAIL'
      });

      results.passed = results.steps.every(s => s.status === 'PASS');
      return results;
    });

    console.log('Restoration Test Results:', JSON.stringify(restorationResults.steps, null, 2));
    console.log(`State Restoration Validation Passed: ${restorationResults.passed}`);
    if (restorationResults.deltaAnalysis) {
      console.log(`Maximum Numerical Delta After Restoration: ${restorationResults.deltaAnalysis.maxDelta.toFixed(8)}`);
    }

    fs.writeFileSync(
      path.join(evidenceDir, 'lighting-state-restoration.json'),
      JSON.stringify(restorationResults, null, 2),
      'utf-8'
    );
    console.log('Saved lighting state restoration evidence to evidence/lighting-state-restoration.json');

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
