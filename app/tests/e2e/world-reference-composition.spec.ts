import { expect, test, type Page, type ViewportSize } from "@playwright/test";
import fs from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import sharp from "sharp";

const evidenceRoot = path.resolve(
  process.env.PRE_G7_12_EVIDENCE_DIR || "../deliveries/G7/preparation/maker-evidence/pre-g7-12",
);
const screenshotDir = path.join(evidenceRoot, "screenshots");
const measurementDir = path.join(evidenceRoot, "measurements");
const referencePath = path.resolve(process.cwd(), "../references/images/main-reference.png");
const actionSelector = [
  '[data-testid="studio-controls-toggle"]',
  "#studio-controls-panel button",
  "#studio-controls-panel a[href]",
  "#studio-controls-panel select",
  'nav[aria-label="Portfolio destinations and studio exit"] a[href]',
  'nav[aria-label="Portfolio destinations and studio exit"] button',
].join(", ");

fs.mkdirSync(screenshotDir, { recursive: true });
fs.mkdirSync(measurementDir, { recursive: true });

function recordErrors(page: Page, label: string) {
  const logPath = path.join(evidenceRoot, `${label}-browser.log`);
  const append = (entry: string) => fs.appendFileSync(logPath, `${entry}\n`, "utf8");
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const location = message.location();
    append(`[console.error] ${message.text()} @ ${location.url}:${location.lineNumber}:${location.columnNumber}`);
  });
  page.on("pageerror", (error) => append(`[pageerror] ${error.stack || error.message}`));
  page.on("requestfailed", (request) => append(`[request.failed] ${request.method()} ${request.url()} ${request.failure()?.errorText ?? "unknown"}`));
  page.on("response", (response) => {
    if (response.status() >= 400) append(`[http.${response.status()}] ${response.request().method()} ${response.url()}`);
  });
}
async function enterHome(page: Page, viewport: ViewportSize) {
  await page.setViewportSize(viewport);
  await page.goto("/?studio=enter");
  const dialog = page.getByTestId("fullscreen-studio-dialog");
  await expect(dialog).toHaveAttribute("open", "", { timeout: 15_000 });
  await expect(page.getByTestId("world-stage-container")).toBeVisible({ timeout: 45_000 });
  await expect(page.getByTestId("world-canvas")).toBeVisible({ timeout: 45_000 });
  await expect(page.getByTestId("world-loading-overlay")).toBeHidden({ timeout: 90_000 });

  const stage = page.getByTestId("world-stage-container");
  const toggle = page.getByTestId("studio-controls-toggle");
  await expect(stage).toHaveAttribute("data-studio-controls-open", "false");
  await toggle.click();
  await expect(page.getByTestId("quality-tier-select")).toBeFocused();
  await page.getByTestId("skip-motion-btn").click();
  await expect(stage).toHaveAttribute("data-lifecycle-state", "HOME", { timeout: 15_000 });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");

  const camera = viewport.width <= 640 ? "home-mobile" : "home-desktop";
  const cameraButton = camera === "home-mobile" ? "camera-mobile-btn" : "camera-home-btn";
  await expect(page.getByTestId(cameraButton)).toHaveClass(/hudButtonActive/);
  await page.waitForTimeout(400);
  return { dialog, stage, camera };
}

async function captureAndCompose(page: Page, filename: string, viewport: ViewportSize) {
  const actualPath = path.join(screenshotDir, filename);
  await page.screenshot({ path: actualPath, fullPage: false });
  const center = {
    left: Math.floor(viewport.width * 0.2),
    top: Math.floor(viewport.height * 0.2),
    width: Math.floor(viewport.width * 0.6),
    height: Math.floor(viewport.height * 0.6),
  };
  const pixels = await sharp(actualPath).extract(center).resize(32, 32).removeAlpha().raw().toBuffer();
  const distinctPixelColors = new Set<string>();
  for (let offset = 0; offset < pixels.length; offset += 3) {
    distinctPixelColors.add(`${pixels[offset]},${pixels[offset + 1]},${pixels[offset + 2]}`);
  }
  const renderMeasurement = { screenshot: filename, sampleRegion: center, distinctPixelColors: distinctPixelColors.size };
  fs.writeFileSync(path.join(measurementDir, `${filename.replace(".png", "-scene-pixels.json")}`), `${JSON.stringify(renderMeasurement, null, 2)}\n`, "utf8");
  const sideBySide = await sharp({
    create: { width: viewport.width * 2, height: viewport.height, channels: 4, background: "#0c1017" },
  })
    .composite([
      { input: await sharp(referencePath).resize(viewport.width, viewport.height, { fit: "contain", background: "#0c1017" }).png().toBuffer(), left: 0, top: 0 },
      { input: await sharp(actualPath).resize(viewport.width, viewport.height, { fit: "contain", background: "#0c1017" }).png().toBuffer(), left: viewport.width, top: 0 },
    ])
    .png()
    .toBuffer();
  await fs.promises.writeFile(path.join(screenshotDir, filename.replace(".png", "-reference-comparison.png")), sideBySide);
  return renderMeasurement;
}

async function measureFixedChrome(page: Page, viewport: ViewportSize, label: string) {
  const measurement = await page.evaluate(() => {
    const elements = [
      document.querySelector<HTMLElement>("[data-testid='studio-controls-toggle']"),
      document.querySelector<HTMLElement>('nav[aria-label="Portfolio destinations and studio exit"]'),
    ].filter((element): element is HTMLElement => Boolean(element));
    const boxes = elements.map((element) => {
      const rect = element.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, visible: getComputedStyle(element).display !== "none" };
    }).filter((box) => box.visible);
    const area = boxes.reduce((sum, box, index) => {
      let overlap = 0;
      for (const previous of boxes.slice(0, index)) {
        overlap += Math.max(0, Math.min(box.x + box.width, previous.x + previous.width) - Math.max(box.x, previous.x)) *
          Math.max(0, Math.min(box.y + box.height, previous.y + previous.height) - Math.max(box.y, previous.y));
      }
      return sum + box.width * box.height - overlap;
    }, 0);
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      boxes,
      coveredArea: area,
      coveredRatio: area / (window.innerWidth * window.innerHeight),
      documentWidth: document.documentElement.scrollWidth,
      stage: (() => {
        const rect = document.querySelector<HTMLElement>("[data-testid='world-stage-container']")?.getBoundingClientRect();
        return rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null;
      })(),
    };
  });
  expect(measurement.documentWidth, `${label} has no page horizontal overflow`).toBeLessThanOrEqual(viewport.width);
  expect(measurement.stage).not.toBeNull();
  expect(Math.abs((measurement.stage?.x ?? 999) - 0), `${label} scene starts at the viewport edge`).toBeLessThan(1);
  expect(Math.abs((measurement.stage?.y ?? 999) - 0), `${label} scene starts at the viewport top`).toBeLessThan(1);
  expect(Math.abs((measurement.stage?.width ?? 0) - viewport.width), `${label} scene fills viewport width`).toBeLessThan(1);
  expect(Math.abs((measurement.stage?.height ?? 0) - viewport.height), `${label} scene fills viewport height`).toBeLessThan(1);
  expect(measurement.coveredRatio, `${label} fixed closed-drawer chrome <= 20%`).toBeLessThanOrEqual(0.2);
  fs.writeFileSync(path.join(measurementDir, `${label}-closed-chrome.json`), `${JSON.stringify(measurement, null, 2)}\n`, "utf8");
  return measurement;
}

type ChromeMeasurement = Awaited<ReturnType<typeof measureFixedChrome>>;
type ProjectedAnchor = {
  id: string;
  source: string;
  bounds: { min: number[]; max: number[] } | null;
  projected: { left: number; top: number; right: number; bottom: number; width: number; height: number; visibleAreaRatio: number } | null;
};

async function recordProjectedAnchors(label: string, viewport: ViewportSize, chrome: ChromeMeasurement) {
  const evidencePath = path.join(measurementDir, "projected-anchor-bounds.json");
  const modelPath = path.resolve(process.cwd(), "public/models/production-room-full.glb");
  const modelSha256 = createHash("sha256").update(fs.readFileSync(modelPath)).digest("hex");
  expect(modelSha256, "the anchor ledger uses the frozen production GLB").toBe("3a02647d24e474c8a2579b0d277cf02a7841212e961c1554f67b6e032e40a307");
  const fixturePath = path.resolve(process.cwd(), "public/models/fixture-production.glb");
  const fixtureSha256 = createHash("sha256").update(fs.readFileSync(fixturePath)).digest("hex");
  expect(fixtureSha256, "the chair anchor uses the frozen production fixture").toBe("8e413b1aa407841b5fd268a9c00bb66718688957c6507551f3b79104132d81d8");
  const projection = JSON.parse(fs.readFileSync(evidencePath, "utf8")) as {
    modelSha256: string;
    fixtureSha256: string;
    viewports: Array<{ viewport: ViewportSize; cameraPreset: string; anchors: ProjectedAnchor[]; panelCenters: Array<{ id: string; x: number; y: number; z: number }> }>;
  };
  expect(projection.modelSha256).toBe(modelSha256);
  expect(projection.fixtureSha256).toBe(fixtureSha256);
  const view = projection.viewports.find((entry) => entry.viewport.width === viewport.width && entry.viewport.height === viewport.height);
  expect(view, `${label} has projected bounds for this viewport`).toBeDefined();
  const anchorLedger = view!.anchors.map((anchor) => {
    expect(anchor.source, `${anchor.id} records its source geometry`).toBeTruthy();
    expect(anchor.projected, `${anchor.id} intersects the ${label} camera frustum`).not.toBeNull();
    const bounds = anchor.projected!;
    expect(bounds.visibleAreaRatio, `${anchor.id} is not fully clipped by the viewport`).toBeGreaterThan(0);
    const visible = {
      left: Math.max(0, bounds.left),
      top: Math.max(0, bounds.top),
      right: Math.min(viewport.width, bounds.right),
      bottom: Math.min(viewport.height, bounds.bottom),
    };
    const fullArea = Math.max(0, visible.right - visible.left) * Math.max(0, visible.bottom - visible.top);
    const occludedArea = chrome.boxes.reduce((covered, box, index) => {
      const overlap = {
        left: Math.max(visible.left, box.x),
        top: Math.max(visible.top, box.y),
        right: Math.min(visible.right, box.x + box.width),
        bottom: Math.min(visible.bottom, box.y + box.height),
      };
      const area = Math.max(0, overlap.right - overlap.left) * Math.max(0, overlap.bottom - overlap.top);
      const previous = chrome.boxes.slice(0, index).reduce((sum, prior) => {
        const priorArea = Math.max(0, Math.min(overlap.right, prior.x + prior.width) - Math.max(overlap.left, prior.x)) *
          Math.max(0, Math.min(overlap.bottom, prior.y + prior.height) - Math.max(overlap.top, prior.y));
        return sum + priorArea;
      }, 0);
      return covered + Math.max(0, area - previous);
    }, 0);
    const unobscuredArea = Math.max(0, fullArea - occludedArea);
    expect(unobscuredArea, `${anchor.id} is not completely hidden by closed HUD chrome`).toBeGreaterThan(0);
    return { id: anchor.id, source: anchor.source, worldBounds: anchor.bounds, projectedBounds: bounds, unobscuredArea };
  });
  const record = { viewport: { width: viewport.width, height: viewport.height }, cameraPreset: view!.cameraPreset, fixedChrome: chrome.boxes, anchors: anchorLedger, lilacPixelCount: 0, panelCenterColorEvidence: [] as Array<{ id: string; coloredPixels: number }> };
  fs.writeFileSync(path.join(measurementDir, `${label}-anchor-ledger.json`), `${JSON.stringify(record, null, 2)}\n`, "utf8");

  const panels = anchorLedger.find((anchor) => anchor.id === "pink/lilac panel cluster");
  expect(panels, `${label} includes the existing lit panel cluster`).toBeDefined();
  const left = Math.max(0, Math.floor(panels!.projectedBounds.left));
  const top = Math.max(0, Math.floor(panels!.projectedBounds.top));
  const right = Math.min(viewport.width, Math.ceil(panels!.projectedBounds.right));
  const bottom = Math.min(viewport.height, Math.ceil(panels!.projectedBounds.bottom));
  const screenshotPath = path.join(screenshotDir, label.startsWith("desktop")
    ? "studio-reference-desktop-1440x900.png"
    : "studio-reference-mobile-390x844.png");
  const { data, info } = await sharp(screenshotPath).extract({ left, top, width: right - left, height: bottom - top }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let lilacPixels = 0;
  for (let offset = 0; offset < data.length; offset += info.channels) {
    const red = data[offset] ?? 0;
    const green = data[offset + 1] ?? 0;
    const blue = data[offset + 2] ?? 0;
    if (red > 105 && blue > 120 && red > green * 1.04 && blue > green * 1.04 && Math.max(red, green, blue) - Math.min(red, green, blue) > 24) lilacPixels += 1;
  }
  const panelCenterColorEvidence = view!.panelCenters.map((center) => {
    const centerX = Math.round(center.x) - left;
    const centerY = Math.round(center.y) - top;
    let coloredPixels = 0;
    for (let y = Math.max(0, centerY - 3); y <= Math.min(info.height - 1, centerY + 3); y += 1) {
      for (let x = Math.max(0, centerX - 3); x <= Math.min(info.width - 1, centerX + 3); x += 1) {
        const offset = (y * info.width + x) * info.channels;
        const red = data[offset] ?? 0;
        const green = data[offset + 1] ?? 0;
        const blue = data[offset + 2] ?? 0;
        if (red > 90 && blue > 125 && red > green * 1.1 && blue > green * 1.1 && Math.max(red, green, blue) - Math.min(red, green, blue) > 30) coloredPixels += 1;
      }
    }
    return { id: center.id, coloredPixels };
  });
  expect(panelCenterColorEvidence.filter((center) => center.coloredPixels > 0).length, `${label} colors at least five of seven panel centers`).toBeGreaterThanOrEqual(5);
  record.panelCenterColorEvidence = panelCenterColorEvidence;
  record.lilacPixelCount = lilacPixels;
  expect(lilacPixels, `${label} renders lilac/pink color inside the panel cluster bounds`).toBeGreaterThan(viewport.width > 640 ? 200 : 40);
  fs.writeFileSync(path.join(measurementDir, `${label}-anchor-ledger.json`), `${JSON.stringify(record, null, 2)}\n`, "utf8");
}
async function recordBrowserEnvironment(page: Page) {
  const environment = await page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>("[data-testid='world-canvas']");
    const gl = canvas?.getContext("webgl2") ?? canvas?.getContext("webgl");
    const debugInfo = gl?.getExtension("WEBGL_debug_renderer_info") as
      | { UNMASKED_VENDOR_WEBGL: number; UNMASKED_RENDERER_WEBGL: number }
      | null;
    return {
      browser: "Playwright-managed Chromium; emulated viewport, not a physical mobile device",
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      devicePixelRatio: window.devicePixelRatio,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      webgl: gl ? {
        version: gl.getParameter(gl.VERSION),
        vendor: gl.getParameter(gl.VENDOR),
        renderer: gl.getParameter(gl.RENDERER),
        unmaskedVendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : null,
        unmaskedRenderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : null,
        contextLost: gl.isContextLost(),
      } : null,
    };
  });
  fs.writeFileSync(path.join(measurementDir, "browser-environment.json"), `${JSON.stringify(environment, null, 2)}\n`, "utf8");
  expect(environment.webgl, "the focused browser run has a WebGL context").not.toBeNull();
  expect(environment.webgl?.contextLost).toBe(false);
}

async function recordMobileSceneState(page: Page, label: string) {
  const toggle = page.getByTestId("studio-controls-toggle");
  const wasOpen = await toggle.getAttribute("aria-expanded") === "true";
  if (!wasOpen) await toggle.click();
  const diagnosticsToggle = page.getByTestId("diagnostics-toggle-btn");
  await diagnosticsToggle.click();
  const diagnostics = page.getByTestId("world-diagnostics");
  await expect(diagnostics).toBeVisible();
  const runtime = JSON.parse((await diagnostics.textContent()) || "{}");
  const canvas = await page.evaluate(() => {
    const element = document.querySelector<HTMLCanvasElement>("[data-testid='world-canvas']");
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    const gl = element.getContext("webgl2") ?? element.getContext("webgl");
    return {
      width: element.width,
      height: element.height,
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      computed: { display: getComputedStyle(element).display, visibility: getComputedStyle(element).visibility },
      gl: gl ? { version: gl.getParameter(gl.VERSION), contextLost: gl.isContextLost() } : null,
    };
  });
  const record = { label, viewport: page.viewportSize(), canvas, runtime };
  expect(runtime.cameraPreset, `${label} uses the named home camera preset`).toBe((page.viewportSize()?.width ?? 0) <= 640 ? "home-mobile" : "home-desktop");
  fs.writeFileSync(path.join(measurementDir, `${label}-runtime-scene.json`), `${JSON.stringify(record, null, 2)}\n`, "utf8");
  await diagnosticsToggle.click();
  if (!wasOpen) await toggle.click();
}

test.describe("PRE-G7-12 reference composition and compact mobile controls", () => {
  test("captures the opening desktop room beside the user reference", async ({ page }) => {
    test.setTimeout(150_000);
    recordErrors(page, "desktop-composition");
    const viewport = { width: 1440, height: 900 };
    const { camera } = await enterHome(page, viewport);
    expect(camera).toBe("home-desktop");
    await recordBrowserEnvironment(page);

    const existingControlCount = await page.locator(
      '[data-testid="fullscreen-studio-dialog"] button, [data-testid="fullscreen-studio-dialog"] a[href], [data-testid="fullscreen-studio-dialog"] select',
    ).count();
    expect(existingControlCount - 1).toBe(25);
    const renderMeasurement = await captureAndCompose(page, "studio-reference-desktop-1440x900.png", viewport);
    expect(renderMeasurement.distinctPixelColors, "desktop GLB frame is visibly rendered").toBeGreaterThan(16);
    const chrome = await measureFixedChrome(page, viewport, "desktop-1440x900");
    expect(chrome.coveredRatio, "closed desktop chrome leaves the room unobscured").toBeLessThanOrEqual(0.2);
    await recordProjectedAnchors("desktop-1440x900", viewport, chrome);

    const toggle = page.getByTestId("studio-controls-toggle");
    const diagnostics = page.getByTestId("diagnostics-toggle-btn");
    await toggle.click();
    await diagnostics.click({ force: true, timeout: 10_000 });
    await expect(page.getByTestId("world-diagnostics")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("world-diagnostics")).toBeHidden();
    await expect(diagnostics).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(toggle).toBeFocused();

    // The moved camera mesh remains underneath the frozen ai-real-camera
    // interaction root; the point is the projected center from the exact GLB camera bounds.
    await page.mouse.click(150, 220);
    await expect(page).toHaveURL(/\/projects\/ai-vs-real\/?$/, { timeout: 15_000 });
  });

  test("starts compact on a fresh phone-sized view and preserves every action with Diagnostics-first Escape", async ({ page }) => {
    test.setTimeout(180_000);
    recordErrors(page, "mobile-drawer");
    const viewport = { width: 390, height: 844 };
    await enterHome(page, viewport);
    await recordMobileSceneState(page, "mobile-390x844");

    const toggle = page.getByTestId("studio-controls-toggle");
    const panel = page.locator("#studio-controls-panel");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    const mobileChrome = await measureFixedChrome(page, viewport, "mobile-390x844");
    const renderMeasurement = await captureAndCompose(page, "studio-reference-mobile-390x844.png", viewport);
    await recordProjectedAnchors("mobile-390x844", viewport, mobileChrome);
    expect(renderMeasurement.distinctPixelColors, "mobile GLB frame is visibly rendered").toBeGreaterThan(16);

    const diagnostics = page.getByTestId("diagnostics-toggle-btn");
    await toggle.click();
    await diagnostics.click({ force: true, timeout: 10_000 });
    await expect(page.getByTestId("world-diagnostics")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("world-diagnostics")).toBeHidden();
    await expect(panel).toBeVisible();
    await expect(diagnostics).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(toggle).toBeFocused();

    await toggle.click();
    await expect(page.getByTestId("quality-tier-select")).toBeFocused();
    await page.emulateMedia({ reducedMotion: "reduce" });
    const reducedMotionDuration = await page.getByTestId("greet-resident-btn").evaluate((element) => getComputedStyle(element).transitionDuration);
    expect(reducedMotionDuration).toBe("0s");

    const actions = page.locator(actionSelector);
    const visibleActions = await actions.evaluateAll((elements) => elements
      .map((element, index) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        if (style.display === "none" || style.visibility === "hidden" || !rect.width || !rect.height) return null;
        return { index, testId: element.getAttribute("data-testid"), text: element.textContent?.trim() ?? "", width: rect.width, height: rect.height };
      })
      .filter((item) => item !== null));
    expect(visibleActions).toHaveLength(26);
    expect(visibleActions.every((item) => item.height >= 44 && item.width >= 44)).toBe(true);

    const reached = new Set<number>();
    for (let index = 0; index < visibleActions.length * 2; index += 1) {
      await page.keyboard.press("Tab");
      const focusedIndex = await page.evaluate((selector) =>
        Array.from(document.querySelectorAll(selector)).findIndex((element) => element === document.activeElement), actionSelector,
      );
      if (focusedIndex >= 0) reached.add(focusedIndex);
    }
    for (const action of visibleActions) expect(reached.has(action.index), `keyboard reaches action ${action.testId || action.text}`).toBe(true);

    for (const href of ["/projects", "/about", "/contact", "/resume"]) {
      await expect(page.locator('nav[aria-label="Portfolio destinations and studio exit"]').locator(`a[href="${href}"]`)).toHaveAttribute("href", href);
    }
    await expect(page.locator('nav[aria-label="Portfolio destinations and studio exit"]').getByRole("button", { name: "Exit Studio" })).toBeVisible();

    await toggle.click();
    await expect(toggle).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("fullscreen-studio-dialog")).toBeHidden();
    await expect(page.getByTestId("enter-studio-btn")).toBeFocused();

    const navigationPage = await page.context().newPage();
    await navigationPage.goto("/?studio=enter");
    await expect(navigationPage.getByTestId("fullscreen-studio-dialog")).toHaveAttribute("open", "", { timeout: 15_000 });
    await navigationPage.locator('nav[aria-label="Portfolio destinations and studio exit"]').getByRole("link", { name: "Projects", exact: true }).click();
    await expect(navigationPage).toHaveURL(/\/projects\/?$/);
    await navigationPage.close();
  });

  test("keeps the compact drawer, touch targets, and scene viewport usable at phone and short-landscape sizes", async ({ page }) => {
    test.setTimeout(180_000);
    recordErrors(page, "compact-viewports");
    const initial = { width: 320, height: 600 };
    await enterHome(page, initial);
    await recordMobileSceneState(page, "compact-320x600");
    await measureFixedChrome(page, initial, "compact-320x600");
    const renderMeasurement = await captureAndCompose(page, "studio-reference-compact-320x600.png", initial);
    expect(renderMeasurement.distinctPixelColors, "compact GLB frame is visibly rendered").toBeGreaterThan(16);

    for (const viewport of [{ width: 320, height: 600 }, { width: 844, height: 390 }]) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(150);
      await expect(page.getByTestId("world-stage-container")).toHaveAttribute("data-lifecycle-state", "HOME");
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
      const closedChrome = await measureFixedChrome(page, viewport, `${viewport.width}x${viewport.height}`);
      expect(closedChrome.coveredRatio).toBeLessThanOrEqual(0.2);

      const toggle = page.getByTestId("studio-controls-toggle");
      if (await toggle.getAttribute("aria-expanded") !== "true") await toggle.click();
      await expect(page.getByTestId("quality-tier-select")).toBeFocused();
      const actionBounds = await page.locator(actionSelector).evaluateAll((elements) => elements
        .map((element) => {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return { visible: style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0, width: rect.width, height: rect.height };
        })
        .filter((item) => item.visible));
      expect(actionBounds).toHaveLength(26);
      expect(actionBounds.every((item) => item.width >= 44 && item.height >= 44)).toBe(true);
      await captureAndCompose(page, `studio-reference-${viewport.width}x${viewport.height}-drawer.png`, viewport);
      await expect(toggle).toBeVisible();
      await toggle.click({ force: true, timeout: 10_000 });
      await expect(page.getByTestId("studio-controls-toggle")).toBeFocused();
    }
  });
});
