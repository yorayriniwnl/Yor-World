import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const workspace = path.resolve(import.meta.dirname, '../../../..');
const require = createRequire(path.join(workspace, 'app/package.json'));
const { chromium } = require('@playwright/test');
const browser = await chromium.launch({ channel: 'chromium', headless: true });
const result = { capturedAt: new Date().toISOString(), scope: 'Fresh native Chromium entry screenshots before any HUD/diagnostics interaction; viewport emulation. Geometry measured without DOM/CSS edits.', profiles: [] };
try {
  for (const [name, viewport] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
    const page = await browser.newPage({ viewport });
    await page.goto((process.argv[2] ?? 'http://127.0.0.1:3333') + '/?studio=enter');
    await page.waitForFunction(() => document.querySelector('[data-testid="world-stage-container"]')?.getAttribute('data-lifecycle-state') === 'HOME', null, { timeout: 20_000 });
    const geometry = await page.evaluate(() => {
      const stage = document.querySelector('[data-testid="world-stage-container"]');
      const canvas = stage.querySelector('canvas');
      const rect = stage.getBoundingClientRect();
      const serialize = node => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom }; };
      const buttons = Array.from(stage.querySelectorAll('button')).map(button => ({ name: button.getAttribute('aria-label') ?? button.textContent.trim(), rect: serialize(button), clippedAtStageBottom: button.getBoundingClientRect().bottom > rect.bottom + 1 }));
      return { stage: serialize(stage), canvas: serialize(canvas), stageScrollTop: stage.scrollTop, stageScrollLeft: stage.scrollLeft, buttons };
    });
    const frame = await page.evaluate(() => new Promise(resolve => { const canvas = document.querySelector('canvas'); canvas.addEventListener('yor-world-rendered-frame', event => resolve({ detail: event.detail, png: canvas.toDataURL('image/png') }), { once: true }); }));
    fs.writeFileSync(path.join(import.meta.dirname, `native-${name}-raw.png`), Buffer.from(frame.png.split(',')[1], 'base64'));
    await page.screenshot({ path: path.join(import.meta.dirname, `native-${name}-entry.png`), fullPage: true });
    result.profiles.push({ name, viewport, geometry, renderedFrame: frame.detail });
    await page.close();
  }
} catch (error) { result.failure = error.stack; process.exitCode = 1; }
finally { await browser.close(); fs.writeFileSync(path.join(import.meta.dirname, 'native-entry-result.json'), JSON.stringify(result, null, 2) + '\n'); }
console.log(JSON.stringify(result.profiles.map(p => ({ name: p.name, stage: p.geometry.stage, clip: p.renderedFrame.activeClip, clippedButtons: p.geometry.buttons.filter(b => b.clippedAtStageBottom).map(b => b.name) }))));
