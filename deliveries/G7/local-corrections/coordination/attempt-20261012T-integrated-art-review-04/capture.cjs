const { chromium } = require(require('node:path').join(process.cwd(), 'app/node_modules/@playwright/test'));
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const repo = process.cwd();
const attemptRoot = __dirname;
const revision = path.join(repo, 'deliveries/production-environment/revisions/local-corrections-r1');
const evidenceRoot = path.join(revision, 'evidence');
const environmentAttempt = process.argv[2] || 'build-attempt-19';
const fixtureAttempt = process.argv[3] || 'fixture-attempt-12';
const target = process.argv[4] || 'http://127.0.0.1:3157';
const output = path.join(attemptRoot, 'captures');
fs.mkdirSync(output, { recursive: false });

const sourceFiles = [
  'app/src/features/experience/return-snapshot.ts',
  'app/src/features/monitor/launcher.tsx',
  'app/src/features/world/CameraDirector.ts',
  'app/src/features/world/CharacterDirector.ts',
  'app/src/features/world/ConstantMaterialBatch.ts',
  'app/src/features/world/LowQualityBatch.ts',
  'app/src/features/world/ProductionLighting.ts',
  'app/src/features/world/RigidWorldBatch.ts',
  'app/src/features/world/SceneIntegrator.ts',
  'app/src/features/world/WorldRoot.tsx',
  'app/src/features/world/WorldRuntime.ts'
];

const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const fileHash = (file) => sha256(fs.readFileSync(file));
const sourceFingerprints = () => Object.fromEntries(
  sourceFiles.map((file) => [file, fileHash(path.join(repo, file))])
);
const assetPath = (attempt, relative) => path.join(evidenceRoot, attempt, 'runtime', relative);
const assetRecord = (attempt, relative) => {
  const file = assetPath(attempt, relative);
  const bytes = fs.readFileSync(file);
  return { attempt, path: path.relative(repo, file), bytes: bytes.length, sha256: sha256(bytes) };
};
const referencePath = path.join(repo, 'references/images/main-reference.png');
const report = {
  kind: 'Parent integrated Chrome visual review; no release or production acceptance',
  target,
  startedAt: new Date().toISOString(),
  environmentAttempt,
  fixtureAttempt,
  sourceBefore: sourceFingerprints(),
  referenceSha256: fileHash(referencePath),
  assetManifestSha256: fileHash(path.join(repo, 'app/public/asset-manifest.json')),
  assets: [
    assetRecord(environmentAttempt, 'production-room-full.glb'),
    assetRecord(fixtureAttempt, 'fixture-production.glb'),
    {
      path: 'app/public/models/resident-production.glb',
      bytes: fs.statSync(path.join(repo, 'app/public/models/resident-production.glb')).size,
      sha256: fileHash(path.join(repo, 'app/public/models/resident-production.glb'))
    }
  ],
  captures: [],
  requests: [],
  responses: [],
  pageErrors: [],
  failedRequests: []
};

function recordCapture(filename, viewport, info) {
  const file = path.join(output, filename);
  const bytes = fs.readFileSync(file);
  report.captures.push({
    filename,
    viewport,
    sha256: sha256(bytes),
    bytes: bytes.length,
    ...info
  });
}

let requestSequence = 0;

async function readyPage(browser, viewport) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  const requestIds = new WeakMap();
  page.on('request', (request) => {
    const id = ++requestSequence;
    requestIds.set(request, id);
    report.requests.push({ id, viewport, method: request.method(), resourceType: request.resourceType(), url: request.url() });
  });
  page.on('response', (response) => {
    const request = response.request();
    report.responses.push({ id: requestIds.get(request), viewport, status: response.status(), url: response.url() });
  });
  page.on('pageerror', (error) => report.pageErrors.push(String(error.stack || error)));
  page.on('requestfailed', (request) => {
    report.failedRequests.push({ id: requestIds.get(request), viewport, pageURL: page.url(), method: request.method(), resourceType: request.resourceType(), url: request.url(), failure: request.failure() });
  });
  await page.goto(target + '/?environment=' + environmentAttempt + '&fixture=' + fixtureAttempt, {
    waitUntil: 'networkidle',
    timeout: 60000
  });
  await page.waitForFunction(() => window.ready === true, { timeout: 30000 });
  await page.waitForTimeout(1200);
  return page;
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  report.chromeVersion = browser.version();

  const viewports = [
    { width: 1440, height: 1000 },
    { width: 1920, height: 1080 },
    { width: 1024, height: 768 },
    { width: 390, height: 844 },
    { width: 320, height: 600 },
    { width: 844, height: 390 }
  ];

  for (const viewport of viewports) {
    const page = await readyPage(browser, viewport);
    const info = await page.evaluate(() => window.art.inspect());
    if (info.nodeCounts.residentCount !== 1
      || info.nodeCounts.chairRootCount !== 1
      || info.nodeCounts.chairBaseCount !== 1
      || info.nodeCounts.deskCount !== 1
      || info.nodeCounts.fixtureStaticCount !== 0) {
      throw new Error('SceneIntegrator node-count invariant failed at ' + viewport.width + 'x' + viewport.height);
    }
    if (!info.renderer || info.calls <= 0 || info.triangles <= 0) {
      throw new Error('Browser did not render the integrated scene at ' + viewport.width + 'x' + viewport.height);
    }
    const filename = 'home-' + viewport.width + 'x' + viewport.height + '.png';
    await page.screenshot({ path: path.join(output, filename) });
    recordCapture(filename, viewport, info);
    await page.waitForTimeout(500);
    await page.close();
  }

  const desktop = { width: 1440, height: 1000 };
  const page = await readyPage(browser, desktop);
  for (const preset of ['monitor', 'reverse-doorway', 'about', 'pc', 'scanner']) {
    await page.evaluate((name) => window.art.setPreset(name), preset);
    await page.waitForTimeout(250);
    const filename = preset + '-1440x1000.png';
    await page.screenshot({ path: path.join(output, filename) });
    recordCapture(filename, desktop, await page.evaluate(() => window.art.inspect()));
  }
  await page.evaluate(() => window.art.setPreset('home-desktop'));
  await page.waitForTimeout(300);
  await page.evaluate(() => window.art.character.playGreeting());
  await page.waitForTimeout(4200);
  const greetingName = 'greeting-1440x1000.png';
  await page.screenshot({ path: path.join(output, greetingName) });
  recordCapture(greetingName, desktop, await page.evaluate(() => window.art.inspect()));
  await page.close();
  await browser.close();

  report.sourceAfter = sourceFingerprints();
  report.sourcesStable = JSON.stringify(report.sourceBefore) === JSON.stringify(report.sourceAfter);
  report.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(attemptRoot, 'report.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({
    captures: report.captures.length,
    pageErrors: report.pageErrors.length,
    failedRequests: report.failedRequests.length,
    sourcesStable: report.sourcesStable,
    output
  }));
  if (report.pageErrors.length || report.failedRequests.length || !report.sourcesStable) process.exitCode = 1;
})().catch((error) => {
  report.pageErrors.push(String(error.stack || error));
  report.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(attemptRoot, 'failure.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  console.error(error);
  process.exitCode = 1;
});






