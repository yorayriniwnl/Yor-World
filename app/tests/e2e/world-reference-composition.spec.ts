import { expect, test, type Page, type ViewportSize } from "@playwright/test";
import fs from "node:fs";
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
  page.on("console", (message) => {
    if (message.type() === "error") fs.appendFileSync(logPath, `[console.error] ${message.text()}\n`, "utf8");
  });
  page.on("pageerror", (error) => fs.appendFileSync(logPath, `[pageerror] ${error.stack || error.message}\n`, "utf8"));
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
  expect(measurement.coveredRatio, `${label} fixed closed-drawer chrome <= 20%`).toBeLessThanOrEqual(0.2);
  fs.writeFileSync(path.join(measurementDir, `${label}-closed-chrome.json`), `${JSON.stringify(measurement, null, 2)}\n`, "utf8");
  return measurement;
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

    const toggle = page.getByTestId("studio-controls-toggle");
    const diagnostics = page.getByTestId("diagnostics-toggle-btn");
    await toggle.click();
    await diagnostics.click();
    await expect(page.getByTestId("world-diagnostics")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("world-diagnostics")).toBeHidden();
    await expect(diagnostics).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(toggle).toBeFocused();

    // The moved camera mesh remains underneath the frozen ai-real-camera
    // interaction root; this point is within its visible desktop pixels.
    await page.mouse.click(410, 110);
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
    await measureFixedChrome(page, viewport, "mobile-390x844");
    const renderMeasurement = await captureAndCompose(page, "studio-reference-mobile-390x844.png", viewport);
    expect(renderMeasurement.distinctPixelColors, "mobile GLB frame is visibly rendered").toBeGreaterThan(16);

    const diagnostics = page.getByTestId("diagnostics-toggle-btn");
    await toggle.click();
    await diagnostics.click();
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
      await page.getByTestId("studio-controls-toggle").click();
      await expect(page.getByTestId("studio-controls-toggle")).toBeFocused();
    }
  });
});
