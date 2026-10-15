const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("@playwright/test");

const port = Number(process.env.PORT || 3133);
const root = __dirname;
const runId = process.env.CAPTURE_RUN_ID || "initial";
const screenshotDir = path.join(root, "screenshots", runId);
const measurementDir = path.join(root, "measurements", runId);
fs.mkdirSync(screenshotDir, { recursive: true });
fs.mkdirSync(measurementDir, { recursive: true });

async function run(width, height, label, filename) {
  console.log(`[${label}] launch Chrome ${width}x${height}`);
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const events = [];
  await page.addInitScript(() => {
    window.__preG7ContextEvents = [];
    document.addEventListener("webglcontextlost", (event) => window.__preG7ContextEvents.push({ type: "webglcontextlost", time: new Date().toISOString() }), true);
    document.addEventListener("webglcontextrestored", (event) => window.__preG7ContextEvents.push({ type: "webglcontextrestored", time: new Date().toISOString() }), true);
  });
  page.on("console", (message) => {
    if (message.type() === "error") events.push({ type: "console.error", text: message.text() });
  });
  page.on("pageerror", (error) => events.push({ type: "pageerror", text: error.stack || error.message }));
  page.on("requestfailed", (request) => events.push({ type: "requestfailed", url: request.url(), error: request.failure()?.errorText }));
  page.on("response", (response) => {
    if (response.status() >= 400) events.push({ type: "http-error", status: response.status(), url: response.url() });
  });

  const pageState = () => page.evaluate(() => {
    const stage = document.querySelector("[data-testid='world-stage-container']");
    const canvas = document.querySelector("[data-testid='world-canvas']");
    const context = canvas?.getContext("webgl2") || canvas?.getContext("webgl");
    return {
      time: new Date().toISOString(),
      url: location.href,
      readyState: document.readyState,
      stageLifecycle: stage?.dataset.lifecycleState ?? null,
      controlsOpen: stage?.dataset.studioControlsOpen ?? null,
      canvasCount: document.querySelectorAll("[data-testid='world-canvas']").length,
      canvasSize: canvas ? [canvas.width, canvas.height] : null,
      canvasVisible: canvas ? getComputedStyle(canvas).display !== "none" && getComputedStyle(canvas).visibility !== "hidden" : false,
      webglVersion: context?.getParameter(context.VERSION) ?? null,
      glContextLost: context?.isContextLost() ?? null,
      staticFallbackCount: document.querySelectorAll("[data-testid='world-static-container']").length,
      failureFallbackCount: document.querySelectorAll("[data-testid='world-failure-container']").length,
    };
  });

  await page.goto(`http://127.0.0.1:${port}/?studio=enter&pre-g7-evidence=1`, { waitUntil: "domcontentloaded" });
  await page.getByTestId("fullscreen-studio-dialog").waitFor({ state: "visible", timeout: 15000 });
  await page.getByTestId("world-stage-container").waitFor({ state: "visible", timeout: 45000 });
  await page.getByTestId("world-canvas").waitFor({ state: "visible", timeout: 45000 });
  await page.getByTestId("world-loading-overlay").waitFor({ state: "hidden", timeout: 90000 });
  const toggle = page.getByTestId("studio-controls-toggle");
  await toggle.click();
  await page.getByTestId("quality-tier-select").waitFor({ state: "visible" });
  await page.getByTestId("skip-motion-btn").click();
  await page.waitForFunction(() => document.querySelector("[data-testid='world-stage-container']")?.dataset.lifecycleState === "HOME");
  await toggle.click();
  await page.waitForFunction(() => document.querySelector("[data-testid='world-stage-container']")?.dataset.studioControlsOpen === "false");
  await page.waitForTimeout(400);

  const before = await page.evaluate(() => {
    const diagnostics = window.__PRE_G7_13_REFERENCE_DIAGNOSTICS__;
    const referenceComposition = diagnostics?.refresh() ?? diagnostics?.latest ?? null;
    const stage = document.querySelector("[data-testid='world-stage-container']");
    const canvas = document.querySelector("[data-testid='world-canvas']");
    const context = canvas?.getContext("webgl2") || canvas?.getContext("webgl");
    const navigationElements = Array.from(document.querySelectorAll("nav"));
    const navigationBounds = navigationElements.map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        ariaLabel: element.getAttribute("aria-label"),
        text: (element.textContent || "").trim().replace(/\s+/g, " "),
        bounds: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height },
      };
    });
    const navigationItems = navigationElements.flatMap((navigation) => Array.from(navigation.querySelectorAll("a, button")).map((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        navigationAriaLabel: navigation.getAttribute("aria-label"),
        text: (element.textContent || "").trim().replace(/\s+/g, " "),
        href: element instanceof HTMLAnchorElement ? element.getAttribute("href") : null,
        bounds: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height },
        minWidth: style.minWidth,
        minHeight: style.minHeight,
        display: style.display,
      };
    }));
    const studioNavigationBounds = navigationBounds.find((item) => item.ariaLabel === "Portfolio destinations and studio exit")?.bounds ?? null;
    const studioNavigationItems = navigationItems.filter((item) => item.navigationAriaLabel === "Portfolio destinations and studio exit");
    const toggle = document.querySelector("[data-testid='studio-controls-toggle']");
    const toggleRect = toggle?.getBoundingClientRect();
    const toggleBounds = toggleRect ? { left: toggleRect.left, top: toggleRect.top, right: toggleRect.right, bottom: toggleRect.bottom, width: toggleRect.width, height: toggleRect.height } : null;
    const documentOverflow = {
      htmlScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      viewportWidth: innerWidth,
    };
    return {
      capturedAt: new Date().toISOString(),
      url: location.href,
      viewport: { width: innerWidth, height: innerHeight },
      lifecycle: stage?.dataset.lifecycleState ?? null,
      controlsOpen: stage?.dataset.studioControlsOpen ?? null,
      canvasCount: document.querySelectorAll("[data-testid='world-canvas']").length,
      canvasVisible: canvas ? getComputedStyle(canvas).display !== "none" && getComputedStyle(canvas).visibility !== "hidden" : false,
      webglVersion: context?.getParameter(context.VERSION) ?? null,
      contextLost: context?.isContextLost() ?? null,
      staticFallbackCount: document.querySelectorAll("[data-testid='world-static-container']").length,
      failureFallbackCount: document.querySelectorAll("[data-testid='world-failure-container']").length,
      nextChunks: performance.getEntriesByType("resource").map((entry) => entry.name).filter((name) => name.includes("/_next/static/chunks/")),
      referenceComposition,
      navigationBounds,
      navigationItems,
      studioNavigationBounds,
      studioNavigationItems,
      toggleBounds,
      documentOverflow,
    };
  });
  const screenshotPath = path.join(screenshotDir, filename);
  await page.screenshot({ path: screenshotPath, fullPage: false });
  const after = await pageState();
  const webglContextEvents = await page.evaluate(() => window.__preG7ContextEvents || []);
  const nav = before.studioNavigationBounds;
  const anchors = before.referenceComposition?.anchors ?? [];
  const overlapWithAnchor = (bounds, anchorBounds) => {
    if (!bounds || !anchorBounds) return { x: 0, y: 0, area: 0 };
    const width = Math.max(0, Math.min(bounds.right, anchorBounds.right) - Math.max(bounds.left, anchorBounds.left));
    const height = Math.max(0, Math.min(bounds.bottom, anchorBounds.bottom) - Math.max(bounds.top, anchorBounds.top));
    return { x: width, y: height, area: width * height };
  };
  const navigationAnchorIntersections = anchors.map((anchor) => ({
    name: anchor.name,
    overlap: overlapWithAnchor(nav, anchor.pixelBounds),
  }));
  const navArea = nav ? nav.width * nav.height : 0;
  const toggleArea = before.toggleBounds ? before.toggleBounds.width * before.toggleBounds.height : 0;
  const chromeAreaRatio = (navArea + toggleArea) / (width * height);
  const layoutEvidence = {
    navigationBounds: before.navigationBounds,
    navigationItems: before.studioNavigationItems,
    toggleBounds: before.toggleBounds,
    documentOverflow: before.documentOverflow,
    navigationAnchorIntersections,
    chairBaseNavigationIntersection: navigationAnchorIntersections.find((item) => item.name === "chair-base")?.overlap ?? null,
    navigationActionMinimumWidthPx: before.studioNavigationItems.length ? Math.min(...before.studioNavigationItems.map((item) => item.bounds.width)) : null,
    navigationActionMinimumHeightPx: before.studioNavigationItems.length ? Math.min(...before.studioNavigationItems.map((item) => item.bounds.height)) : null,
    fixedChromeAreaRatio: chromeAreaRatio,
  };
  const artifact = { label, viewport: { width, height }, screenshotPath, before, after, events, webglContextEvents, layoutEvidence };
  fs.writeFileSync(path.join(measurementDir, `${label}-capture-trace.json`), JSON.stringify(artifact, null, 2) + "\n");
  fs.writeFileSync(path.join(measurementDir, `${label}-anchor-diagnostics.json`), JSON.stringify(before.referenceComposition, null, 2) + "\n");
  fs.writeFileSync(path.join(measurementDir, `${label}-navigation-clearance.json`), JSON.stringify(layoutEvidence, null, 2) + "\n");
  console.log(`[${label}] screenshot=${screenshotPath}`);
  console.log(`[${label}] before lifecycle=${before.lifecycle} fallbacks=${before.staticFallbackCount}/${before.failureFallbackCount} canvas=${before.canvasVisible} glLost=${before.contextLost}; after lifecycle=${after.stageLifecycle} fallbacks=${after.staticFallbackCount}/${after.failureFallbackCount} canvas=${after.canvasVisible} glLost=${after.glContextLost}`);
  await browser.close();
}

(async () => {
  const viewports = process.env.CAPTURE_VIEWPORTS || "pair";
  if (viewports === "desktop") {
    await run(1440, 900, "desktop-1440x900", "studio-reference-desktop-1440x900.png");
  } else if (viewports === "mobile") {
    await run(390, 844, "mobile-390x844", "studio-reference-mobile-390x844.png");
  } else {
    await run(1440, 900, "desktop-1440x900", "studio-reference-desktop-1440x900.png");
    await run(390, 844, "mobile-390x844", "studio-reference-mobile-390x844.png");
  }
})().catch((error) => {
  fs.writeFileSync(path.join(root, "capture-error.txt"), error.stack || String(error));
  console.error(error.stack || String(error));
  process.exitCode = 1;
});
