import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const require = createRequire(path.resolve(process.cwd(), "app/package.json"));
const { chromium } = require("@playwright/test");
const outputPath = path.resolve(process.argv[2]);
const channel = process.argv[3] || "chrome";
const viewport = { width: Number(process.argv[4] || 1440), height: Number(process.argv[5] || 900) };
const browser = await chromium.launch({ channel, headless: true });
const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
await context.addInitScript(() => {
  const frames = [];
  const drawCounts = new WeakMap();
  const instrumentedContexts = new WeakSet();
  const instrumentedExtensions = new WeakSet();
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...args) {
    const context = originalGetContext.call(this, type, ...args);
    if (!context || !/^webgl2?$/.test(type) || instrumentedContexts.has(context)) return context;
    instrumentedContexts.add(context);
    const counts = { drawApiCalls: 0, multiDrawApiCalls: 0, multiDrawSubdraws: 0, methods: {} };
    drawCounts.set(context, counts);
    for (const method of ["drawArrays", "drawElements", "drawArraysInstanced", "drawElementsInstanced"]) {
      const original = context[method].bind(context);
      context[method] = (...values) => {
        counts.drawApiCalls += 1;
        counts.methods[method] = (counts.methods[method] ?? 0) + 1;
        return original(...values);
      };
    }
    const originalGetExtension = context.getExtension.bind(context);
    context.getExtension = (name) => {
      const extension = originalGetExtension(name);
      if (name !== "WEBGL_multi_draw" || !extension || instrumentedExtensions.has(extension)) return extension;
      instrumentedExtensions.add(extension);
      for (const method of ["multiDrawArraysWEBGL", "multiDrawElementsWEBGL", "multiDrawArraysInstancedWEBGL", "multiDrawElementsInstancedWEBGL"]) {
        if (typeof extension[method] !== "function") continue;
        const original = extension[method].bind(extension);
        extension[method] = (...values) => {
          counts.drawApiCalls += 1;
          counts.multiDrawApiCalls += 1;
          counts.multiDrawSubdraws += values.at(-1) ?? 0;
          counts.methods[method] = (counts.methods[method] ?? 0) + 1;
          return original(...values);
        };
      }
      return extension;
    };
    return context;
  };
  Object.defineProperty(window, "__PRE_G7_23_FRAME_CAPTURE__", { value: frames });
  document.addEventListener("yor-world-rendered-frame", (event) => {
    const detail = event.detail;
    frames.push({
      frame: detail.frame,
      timestamp: detail.timestamp,
      durationMs: detail.durationMs,
      qualityTier: detail.qualityTier,
      renderCalls: detail.renderCalls,
      renderedTriangles: detail.renderedTriangles,
      lifecycleState: detail.lifecycleState,
      ...(() => {
        const target = event.target;
        const counts = target instanceof HTMLCanvasElement
          ? drawCounts.get(target.getContext("webgl2"))
          : null;
        const snapshot = counts ? { ...counts, methods: { ...counts.methods } } : null;
        if (counts) {
          for (const key of Object.keys(counts.methods)) delete counts.methods[key];
          counts.drawApiCalls = 0;
          counts.multiDrawApiCalls = 0;
          counts.multiDrawSubdraws = 0;
        }
        return { gl: snapshot };
      })(),
    });
  }, true);
});
const page = await context.newPage();
await page.goto("http://127.0.0.1:3134/?studio=enter&pre-g7-evidence=1");
const dialog = page.getByTestId("fullscreen-studio-dialog");
try {
  await dialog.waitFor({ state: "visible", timeout: 5000 });
} catch {
  // Preserve the local site path if auto-entry does not open in this session.
  await page.getByTestId("enter-studio-btn").click();
  await dialog.waitFor({ state: "visible", timeout: 15000 });
}
await page.getByTestId("world-stage-container").waitFor({ state: "visible", timeout: 45000 });
await page.getByTestId("world-loading-overlay").waitFor({ state: "hidden", timeout: 90000 });
const capabilities = await page.evaluate(() => {
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl2", { antialias: false });
  const debug = gl?.getExtension("WEBGL_debug_renderer_info");
  return {
    hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemory: navigator.deviceMemory ?? null,
    saveData: navigator.connection?.saveData ?? null,
    isMobile: window.innerWidth < 640,
    userAgent: navigator.userAgent,
    maxTextureSize: gl?.getParameter(gl.MAX_TEXTURE_SIZE) ?? null,
    multiDrawAvailable: Boolean(gl?.getExtension("WEBGL_multi_draw")),
    unmaskedRenderer: debug ? gl?.getParameter(debug.UNMASKED_RENDERER_WEBGL) : null,
    reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
  };
});
const toggle = page.getByTestId("studio-controls-toggle");
await toggle.click();
const select = page.getByTestId("quality-tier-select");
await select.waitFor({ state: "visible", timeout: 10000 });
const initialQualityPreference = await select.count() ? await select.inputValue() : null;
await page.getByTestId("skip-motion-btn").click();
await page.getByTestId("world-stage-container").waitFor({ state: "visible" });
await page.waitForFunction(() => document.querySelector("[data-testid='world-stage-container']")?.getAttribute("data-lifecycle-state") === "HOME", null, { timeout: 15000 });
await toggle.click();
await page.waitForTimeout(15000);
const capture = await page.evaluate(() => {
  const frames = (window).__PRE_G7_23_FRAME_CAPTURE__ ?? [];
  const counts = {};
  for (const frame of frames) {
    const key = `${frame.qualityTier}:${frame.lifecycleState}`;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  const transitions = [];
  for (const frame of frames) {
    const previous = transitions.at(-1);
    if (!previous || previous.qualityTier !== frame.qualityTier || previous.lifecycleState !== frame.lifecycleState) {
      transitions.push({ frame: frame.frame, timestamp: frame.timestamp, durationMs: frame.durationMs, qualityTier: frame.qualityTier, lifecycleState: frame.lifecycleState, renderCalls: frame.renderCalls });
    }
  }
  const home = frames.filter((frame) => frame.lifecycleState === "HOME");
  const last = home.slice(-120);
  const sortedDurations = last.map((frame) => frame.durationMs).sort((a, b) => a - b);
  const passProfiles = {};
  for (const frame of frames) {
    const key = `${frame.qualityTier}:${frame.lifecycleState}`;
    const profile = JSON.stringify({ renderCalls: frame.renderCalls, gl: frame.gl });
    passProfiles[key] ??= {};
    passProfiles[key][profile] = (passProfiles[key][profile] ?? 0) + 1;
  }
  return {
    frameCount: frames.length,
    qualityLifecycleCounts: counts,
    transitions,
    lastHomeFrames: last.length,
    lastHomeQualityTiers: [...new Set(last.map((frame) => frame.qualityTier))],
    lastHomeRenderCalls: [...new Set(last.map((frame) => frame.renderCalls))],
    lastHomeP95FrameIntervalMs: sortedDurations[Math.min(Math.floor(sortedDurations.length * 0.95), Math.max(0, sortedDurations.length - 1))] ?? null,
    lastHomeDurationMaxMs: sortedDurations.at(-1) ?? null,
    passProfiles,
  };
});
const result = { channel, viewport, initialQualityPreference, capabilities, capture };
mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
await browser.close();
