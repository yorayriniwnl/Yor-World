import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DELIVERY_DIR = path.resolve(SCRIPT_DIR, '..');
const OUT_DIR = path.join(DELIVERY_DIR, 'validator-logs');
const ROOT = path.resolve(DELIVERY_DIR, '../..');
const HARNESS_DIR = path.join(DELIVERY_DIR, 'source', 'harness');
const localModules = path.join(HARNESS_DIR, 'node_modules');
const useLocalModules = fs.existsSync(path.join(localModules, '@playwright', 'test')) &&
  fs.existsSync(path.join(localModules, 'three'));
const require = createRequire(useLocalModules
  ? path.join(HARNESS_DIR, 'package.json')
  : path.join(ROOT, 'app', 'package.json'));
const { chromium } = require('@playwright/test');
const htmlPath = path.join(OUT_DIR, 'instrumented-maker-harness.html');
if (!fs.existsSync(htmlPath)) throw new Error('Run run-r3-verification.mjs first to generate the maker harness.');
const html = fs.readFileSync(htmlPath, 'utf8');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.glb': 'model/gltf-binary', '.png': 'image/png' };

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
    return;
  }
  const filePath = path.resolve(ROOT, '.' + decodeURI(req.url.split('?')[0]));
  if (!filePath.startsWith(ROOT + path.sep) || !fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end();
    return;
  }
  res.writeHead(200, { 'Content-Type': mime[path.extname(filePath)] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
});

const files = [
  'room.glb', 'resident.glb', 'fixture.glb', 'group-b-props.glb', 'on-demand-projects.glb',
  'textures/deskmat-topography.png', 'textures/monitor-wallpaper.png'
];
const hashes = Object.fromEntries(files.map(file => {
  const bytes = fs.readFileSync(path.join(DELIVERY_DIR, 'assets', file));
  return [file, { bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') }];
}));

let browser;
try {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=default', '--enable-webgl'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const consoleRows = [];
  page.on('console', message => consoleRows.push({ type: message.type(), text: message.text() }));
  page.on('pageerror', error => consoleRows.push({ type: 'pageerror', text: error.message }));
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.playbackState?.isReady && window.__audit?.residentGroup, null, { timeout: 30000 });

  const runs = [];
  for (const profile of [
    { key: 'desktop-home', width: 1920, height: 1080, preset: 'desktop-home', limit: 120 },
    { key: 'mobile-home', width: 720, height: 1280, preset: 'mobile-home', limit: 80 }
  ]) {
    await page.setViewportSize({ width: profile.width, height: profile.height });
    const measured = await page.evaluate(({ preset }) => {
      const audit = window.__audit;
      const renderer = audit.renderer;
      const scene = audit.scene;
      const loadedModels = window.playbackState.loadedModels;
      const gltfRoots = scene.children.filter(root => root.type === 'Group');
      if (gltfRoots.length !== loadedModels.length) throw new Error(`Cannot bind GLB roots to loadedModels order: ${gltfRoots.length} roots / ${loadedModels.length} models`);
      const roots = loadedModels.map((asset, index) => [asset, gltfRoots[index]]);
      function ownerOf(object) {
        let node = object;
        while (node) {
          const match = roots.find(([, root]) => root === node);
          if (match) return match[0];
          node = node.parent;
        }
        let top = object;
        while (top?.parent && top.parent !== scene) top = top.parent;
        return top?.name ? `scene-root:${top.name}` : 'scene-root:unnamed';
      }
      const visibleMeshes = [];
      scene.traverse(object => {
        if (object.isMesh && object.visible) visibleMeshes.push(object);
      });
      window.setCamera(preset);
      const original = renderer.renderBufferDirect;
      const rows = new Map();
      renderer.renderBufferDirect = function (...args) {
        const object = args[4];
        const name = object?.name || '<unnamed mesh>';
        const key = `${ownerOf(object)}\u0000${name}`;
        const row = rows.get(key) || { owner: ownerOf(object), name, interceptedCalls: 0, attributedRendererInfoCalls: 0, materials: {} };
        const beforeCalls = renderer.info.render.calls;
        row.interceptedCalls += 1;
        const material = args[3];
        const materialName = material?.name || material?.type || '<unnamed material>';
        row.materials[materialName] = (row.materials[materialName] || 0) + 1;
        const result = original.apply(this, args);
        const afterCalls = renderer.info.render.calls;
        if (afterCalls > beforeCalls) row.attributedRendererInfoCalls += afterCalls - beforeCalls;
        rows.set(key, row);
        return result;
      };
      try {
        audit.renderFrame(0);
      } finally {
        renderer.renderBufferDirect = original;
      }
      const values = [...rows.values()].sort((a, b) => b.attributedRendererInfoCalls - a.attributedRendererInfoCalls || a.owner.localeCompare(b.owner) || a.name.localeCompare(b.name));
      const byOwner = {};
      const byObjectDraws = {};
      for (const row of values) {
        byOwner[row.owner] = (byOwner[row.owner] || 0) + row.attributedRendererInfoCalls;
        byObjectDraws[row.owner] = (byObjectDraws[row.owner] || 0) + row.interceptedCalls;
      }
      const info = window.getRenderMetrics();
      return {
        visibleMeshObjectCount: visibleMeshes.length,
        rendererInfo: info,
        interceptedRenderBufferDirectCalls: values.reduce((total, row) => total + row.interceptedCalls, 0),
        attributedRendererInfoCalls: values.reduce((total, row) => total + row.attributedRendererInfoCalls, 0),
        byOwner,
        interceptedCallsByOwner: byObjectDraws,
        byObject: values,
        loadedModels,
        sceneRootMapping: roots.map(([asset, root]) => ({ asset, name: root.name, visibleMeshCount: (() => { let count = 0; root.traverse(x => { if (x.isMesh && x.visible) count++; }); return count; })() })),
        sceneRoots: scene.children.map(root => ({
          name: root.name || '<unnamed>',
          type: root.type,
          visible: root.visible,
          meshDescendants: (() => { let count = 0; root.traverse(x => { if (x.isMesh && x.visible) count++; }); return count; })()
        }))
      };
    }, profile);
    runs.push({ ...profile, ...measured, budgetStatus: measured.rendererInfo.drawCalls <= profile.limit ? 'PASS' : 'FAIL' });
  }

  const result = {
    scope: 'Per-object draw attribution from the actual Playwright Chromium maker harness, with the exact current R3 exports loaded. The wrapper counts WebGLRenderer.renderBufferDirect calls and is checked against renderer.info.',
    generatedAt: new Date().toISOString(),
    command: 'node scripts/measure-draw-attribution.mjs',
    exitCode: 0,
    browser: browser.version(),
    playwright: require('@playwright/test/package.json').version,
    assetHashes: hashes,
    profiles: runs,
    console: consoleRows
  };
  fs.writeFileSync(path.join(OUT_DIR, 'draw-call-attribution.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ browser: result.browser, profiles: runs.map(run => ({
    key: run.key,
    rendererInfo: run.rendererInfo,
    interceptedRenderBufferDirectCalls: run.interceptedRenderBufferDirectCalls,
    byOwner: run.byOwner,
    topObjects: run.byObject.slice(0, 15),
    budgetStatus: run.budgetStatus
  })) }, null, 2));
} finally {
  if (browser) await browser.close();
  server.close();
}
