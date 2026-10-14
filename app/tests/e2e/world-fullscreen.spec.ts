import { test, expect, type Page, type ViewportSize } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
import path from "node:path";

const evidenceRoot = path.resolve(
  process.env.PRE_G7_11_EVIDENCE_DIR || "../deliveries/G7/preparation/maker-evidence/pre-g7-11"
);
const screenshotDir = path.join(evidenceRoot, "screenshots");
const measurementDir = path.join(evidenceRoot, "measurements");

function prepareEvidenceDirectories() {
  fs.mkdirSync(screenshotDir, { recursive: true });
  fs.mkdirSync(measurementDir, { recursive: true });
}

function recordPageErrors(page: Page) {
  prepareEvidenceDirectories();
  const logPath = path.join(evidenceRoot, "world-fullscreen-browser.log");
  page.on("console", (message) => {
    if (message.type() === "error") {
      fs.appendFileSync(logPath, `[console.error] ${message.text()}\n`, "utf8");
    }
  });
  page.on("pageerror", (error) => {
    fs.appendFileSync(logPath, `[pageerror] ${error.stack || error.message}\n`, "utf8");
  });
}

async function enterStudioAtHome(page: Page) {
  await page.goto("/?studio=enter");
  const dialog = page.getByTestId("fullscreen-studio-dialog");
  await expect(dialog).toHaveAttribute("open", "", { timeout: 15_000 });
  expect(await dialog.evaluate((element) => element.matches(":modal"))).toBe(true);
  await expect(page.getByTestId("world-stage-container")).toBeVisible({ timeout: 45_000 });
  await expect(page.getByTestId("world-canvas")).toBeVisible({ timeout: 45_000 });
  await expect(page.getByTestId("world-loading-overlay")).toBeHidden({ timeout: 90_000 });
  await page.getByTestId("studio-controls-toggle").click();
  await page.getByTestId("skip-motion-btn").click();
  await expect(page.getByTestId("world-stage-container")).toHaveAttribute("data-lifecycle-state", "HOME", {
    timeout: 15_000,
  });
}

async function recordBrowserEnvironment(page: Page) {
  prepareEvidenceDirectories();
  const environment = await page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('[data-testid="world-canvas"]');
    const gl = canvas?.getContext("webgl2") ?? canvas?.getContext("webgl");
    const debugInfo = gl?.getExtension("WEBGL_debug_renderer_info") as
      | { UNMASKED_VENDOR_WEBGL: number; UNMASKED_RENDERER_WEBGL: number }
      | null;

    return {
      channel: "chromium",
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      devicePixelRatio: window.devicePixelRatio,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      webgl: gl
        ? {
            version: gl.getParameter(gl.VERSION),
            shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
            vendor: gl.getParameter(gl.VENDOR),
            renderer: gl.getParameter(gl.RENDERER),
            unmaskedVendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : null,
            unmaskedRenderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : null,
            contextLost: gl.isContextLost(),
            debugRendererExtension: Boolean(debugInfo),
          }
        : null,
    };
  });
  fs.writeFileSync(path.join(measurementDir, "browser-environment.json"), JSON.stringify(environment, null, 2), "utf8");
}

async function waitForStudioViewport(page: Page, viewport: ViewportSize) {
  await page.waitForFunction(({ width, height }) => {
    const stage = document.querySelector<HTMLElement>('[data-testid="world-stage-container"]');
    const canvas = document.querySelector<HTMLElement>('[data-testid="world-canvas"]');
    if (!stage || !canvas || window.innerWidth !== width || window.innerHeight !== height) return false;
    const stageBox = stage.getBoundingClientRect();
    const canvasBox = canvas.getBoundingClientRect();
    return Math.abs(stageBox.width - width) <= 1 && Math.abs(stageBox.height - height) <= 1 &&
      Math.abs(canvasBox.width - width) <= 1 && Math.abs(canvasBox.height - height) <= 1;
  }, viewport, { timeout: 10_000 });
}

async function capture(page: Page, name: string) {
  prepareEvidenceDirectories();
  await page.screenshot({ path: path.join(screenshotDir, name), fullPage: false });
}

async function captureHudScrolledControl(page: Page, testId: string, screenshotName: string) {
  const control = page.getByTestId(testId);
  const scrollState = await control.evaluate((element) => {
    let owner: HTMLElement | null = null;
    for (let ancestor = element.parentElement; ancestor && ancestor.tagName !== "DIALOG"; ancestor = ancestor.parentElement) {
      const style = getComputedStyle(ancestor);
      if (/auto|scroll/.test(style.overflowY) && ancestor.scrollHeight > ancestor.clientHeight + 1) {
        owner = ancestor;
        break;
      }
    }
    if (!owner) return { hasOwner: false, maxTop: 0, visible: false, previousTop: 0 };

    const previousTop = owner.scrollTop;
    owner.scrollTop = owner.scrollHeight;
    const ownerRect = owner.getBoundingClientRect();
    const controlRect = element.getBoundingClientRect();
    return {
      hasOwner: true,
      maxTop: owner.scrollHeight - owner.clientHeight,
      visible: controlRect.top >= Math.max(0, ownerRect.top) - 1 &&
        controlRect.bottom <= Math.min(window.innerHeight, ownerRect.bottom) + 1,
      previousTop,
    };
  });

  expect(scrollState.hasOwner, `${testId} has a vertical scroll owner`).toBe(true);
  expect(scrollState.maxTop, `${testId} scroll owner has range`).toBeGreaterThan(0);
  expect(scrollState.visible, `${testId} is visible after scrolling its owner`).toBe(true);
  await capture(page, screenshotName);
  await control.evaluate((element, previousTop) => {
    for (let ancestor = element.parentElement; ancestor && ancestor.tagName !== "DIALOG"; ancestor = ancestor.parentElement) {
      const style = getComputedStyle(ancestor);
      if (/auto|scroll/.test(style.overflowY) && ancestor.scrollHeight > ancestor.clientHeight + 1) {
        ancestor.scrollTop = previousTop;
        break;
      }
    }
  }, scrollState.previousTop);
}

function assertInsideViewport(box: { x: number; y: number; width: number; height: number }, viewport: ViewportSize, label: string) {
  expect(box.width, `${label} has a measurable width`).toBeGreaterThan(0);
  expect(box.height, `${label} has a measurable height`).toBeGreaterThan(0);
  expect(box.x, `${label} left edge`).toBeGreaterThanOrEqual(-1);
  expect(box.y, `${label} top edge`).toBeGreaterThanOrEqual(-1);
  expect(box.x + box.width, `${label} right edge`).toBeLessThanOrEqual(viewport.width + 1);
  expect(box.y + box.height, `${label} bottom edge`).toBeLessThanOrEqual(viewport.height + 1);
}

async function recordViewportGeometry(page: Page, label: string, viewport: ViewportSize) {
  const dialog = page.getByTestId("fullscreen-studio-dialog");
  const stage = page.getByTestId("world-stage-container");
  const canvas = page.getByTestId("world-canvas");
  await expect(stage, `${label} lifecycle remains HOME`).toHaveAttribute("data-lifecycle-state", "HOME");
  const dialogBox = await dialog.boundingBox();
  const stageBox = await stage.boundingBox();
  const canvasBox = await canvas.boundingBox();

  expect(dialogBox).not.toBeNull();
  expect(stageBox).not.toBeNull();
  expect(canvasBox).not.toBeNull();
  assertInsideViewport(dialogBox!, viewport, `${label} dialog`);
  assertInsideViewport(stageBox!, viewport, `${label} stage`);
  assertInsideViewport(canvasBox!, viewport, `${label} canvas`);
  expect(Math.abs(dialogBox!.width - viewport.width), `${label} dialog width`).toBeLessThanOrEqual(1);
  expect(Math.abs(dialogBox!.height - viewport.height), `${label} dialog height`).toBeLessThanOrEqual(1);
  expect(Math.abs(stageBox!.width - viewport.width), `${label} stage width`).toBeLessThanOrEqual(1);
  expect(Math.abs(stageBox!.height - viewport.height), `${label} stage height`).toBeLessThanOrEqual(1);

  const controls = page.locator(
    '[data-testid="fullscreen-studio-dialog"] button, [data-testid="fullscreen-studio-dialog"] a[href], [data-testid="fullscreen-studio-dialog"] select'
  );
  const controlMeasurements = await controls.evaluateAll((elements) => elements
    .map((element, index) => {
      if (!element.getClientRects().length) return null;
      const rect = element.getBoundingClientRect();
      let owner: HTMLElement | null = null;
      for (let ancestor = element.parentElement; ancestor && ancestor.tagName !== "DIALOG"; ancestor = ancestor.parentElement) {
        const style = getComputedStyle(ancestor);
        const canScrollX = /auto|scroll/.test(style.overflowX) && ancestor.scrollWidth > ancestor.clientWidth + 1;
        const canScrollY = /auto|scroll/.test(style.overflowY) && ancestor.scrollHeight > ancestor.clientHeight + 1;
        if (canScrollX || canScrollY) {
          owner = ancestor;
          break;
        }
      }
      const ownerRect = owner?.getBoundingClientRect();
      return {
        index,
        label: element.getAttribute("aria-label") || element.getAttribute("data-testid") ||
          element.textContent?.trim() || `control-${index}`,
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        ownerType: owner ? (owner.tagName === "NAV" ? "portfolio-nav" : "hud") : null,
        ownerBox: ownerRect ? { x: ownerRect.x, y: ownerRect.y, width: ownerRect.width, height: ownerRect.height } : null,
        ownerScroll: owner ? {
          left: owner.scrollLeft,
          top: owner.scrollTop,
          maxLeft: Math.max(0, owner.scrollWidth - owner.clientWidth),
          maxTop: Math.max(0, owner.scrollHeight - owner.clientHeight),
          overflowX: getComputedStyle(owner).overflowX,
          overflowY: getComputedStyle(owner).overflowY,
        } : null,
      };
    })
    .filter((measurement) => measurement !== null));

  const reachabilityChecks: Array<{
    index: number;
    label: string;
    reachable: boolean;
    via: "already-visible" | "scroll-owner";
    ownerType: string | null;
    maxLeft: number;
    maxTop: number;
  }> = [];

  for (const measurement of controlMeasurements) {
    expect(measurement.width, `${label} control ${measurement.label} width`).toBeGreaterThan(0);
    expect(measurement.height, `${label} control ${measurement.label} height`).toBeGreaterThan(0);
    const insideViewport =
      measurement.x >= -1 &&
      measurement.y >= -1 &&
      measurement.x + measurement.width <= viewport.width + 1 &&
      measurement.y + measurement.height <= viewport.height + 1;
    const ownerBox = measurement.ownerBox;
    const insideOwner = !ownerBox || (
      measurement.x >= ownerBox.x - 1 &&
      measurement.y >= ownerBox.y - 1 &&
      measurement.x + measurement.width <= ownerBox.x + ownerBox.width + 1 &&
      measurement.y + measurement.height <= ownerBox.y + ownerBox.height + 1
    );

    if (insideViewport && insideOwner) {
      reachabilityChecks.push({
        index: measurement.index,
        label: measurement.label,
        reachable: true,
        via: "already-visible",
        ownerType: measurement.ownerType,
        maxLeft: measurement.ownerScroll?.maxLeft ?? 0,
        maxTop: measurement.ownerScroll?.maxTop ?? 0,
      });
      continue;
    }

    expect(measurement.ownerType, `${label} clipped control ${measurement.label} has a scroll owner`).not.toBeNull();
    const verticalScrollNeeded = measurement.y < Math.max(0, ownerBox?.y ?? 0) ||
      measurement.y + measurement.height > Math.min(viewport.height, ownerBox ? ownerBox.y + ownerBox.height : viewport.height);
    const horizontalScrollNeeded = measurement.x < Math.max(0, ownerBox?.x ?? 0) ||
      measurement.x + measurement.width > Math.min(viewport.width, ownerBox ? ownerBox.x + ownerBox.width : viewport.width);
    if (verticalScrollNeeded) {
      expect(measurement.ownerScroll?.overflowY, `${label} ${measurement.label} vertical overflow`).toMatch(/auto|scroll/);
      expect(measurement.ownerScroll?.maxTop, `${label} ${measurement.label} has vertical scroll range`).toBeGreaterThan(0);
    }
    if (horizontalScrollNeeded) {
      expect(measurement.ownerScroll?.overflowX, `${label} ${measurement.label} horizontal overflow`).toMatch(/auto|scroll/);
      expect(measurement.ownerScroll?.maxLeft, `${label} ${measurement.label} has horizontal scroll range`).toBeGreaterThan(0);
    }

    const revealed = await controls.nth(measurement.index).evaluate((element) => {
      let owner: HTMLElement | null = null;
      for (let ancestor = element.parentElement; ancestor && ancestor.tagName !== "DIALOG"; ancestor = ancestor.parentElement) {
        const style = getComputedStyle(ancestor);
        const canScrollX = /auto|scroll/.test(style.overflowX) && ancestor.scrollWidth > ancestor.clientWidth + 1;
        const canScrollY = /auto|scroll/.test(style.overflowY) && ancestor.scrollHeight > ancestor.clientHeight + 1;
        if (canScrollX || canScrollY) {
          owner = ancestor;
          break;
        }
      }
      if (!owner) return false;
      const previousTop = owner.scrollTop;
      const previousLeft = owner.scrollLeft;
      const ownerRect = owner.getBoundingClientRect();
      const before = element.getBoundingClientRect();
      if (before.top < ownerRect.top) owner.scrollTop += before.top - ownerRect.top;
      else if (before.bottom > ownerRect.bottom) owner.scrollTop += before.bottom - ownerRect.bottom;
      if (before.left < ownerRect.left) owner.scrollLeft += before.left - ownerRect.left;
      else if (before.right > ownerRect.right) owner.scrollLeft += before.right - ownerRect.right;
      const after = element.getBoundingClientRect();
      const currentOwner = owner.getBoundingClientRect();
      const canReach = after.left >= Math.max(0, currentOwner.left) - 1 &&
        after.top >= Math.max(0, currentOwner.top) - 1 &&
        after.right <= Math.min(window.innerWidth, currentOwner.right) + 1 &&
        after.bottom <= Math.min(window.innerHeight, currentOwner.bottom) + 1;
      owner.scrollTop = previousTop;
      owner.scrollLeft = previousLeft;
      return canReach;
    });
    expect(revealed, `${label} clipped control ${measurement.label} can be reached by scrolling its owner`).toBe(true);
    reachabilityChecks.push({
      index: measurement.index,
      label: measurement.label,
      reachable: revealed,
      via: "scroll-owner",
      ownerType: measurement.ownerType,
      maxLeft: measurement.ownerScroll?.maxLeft ?? 0,
      maxTop: measurement.ownerScroll?.maxTop ?? 0,
    });
  }

  expect(controlMeasurements.length, `${label} controls measured`).toBeGreaterThan(0);
  expect(reachabilityChecks, `${label} reachability recorded for every control`).toHaveLength(controlMeasurements.length);
  fs.writeFileSync(
    path.join(measurementDir, `${label}.json`),
    JSON.stringify({ viewport, dialog: dialogBox, stage: stageBox, canvas: canvasBox, controls: controlMeasurements, reachability: reachabilityChecks }, null, 2),
    "utf8"
  );
}

function relativeLuminance(rgb: number[]) {
  const linearize = (channel: number) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  const red = linearize(rgb[0]!);
  const green = linearize(rgb[1]!);
  const blue = linearize(rgb[2]!);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function parseRgb(value: string) {
  const channels = value.match(/[\d.]+/g)?.slice(0, 3).map(Number);
  if (!channels || channels.length !== 3) throw new Error(`Could not parse computed RGB color: ${value}`);
  return channels;
}

function contrastRatio(foreground: string, background: string) {
  const first = relativeLuminance(parseRgb(foreground));
  const second = relativeLuminance(parseRgb(background));
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

test.describe("PRE-G7-11 fullscreen studio", () => {
  test.beforeEach(async ({ page }) => recordPageErrors(page));

  test("opens a native modal, returns focus on Escape and Exit, and preserves semantic destinations", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("studio-disclosure").locator("summary").click();
    const launch = page.getByTestId("enter-studio-btn");
    await expect(launch).toBeVisible();
    await launch.click();

    const dialog = page.getByTestId("fullscreen-studio-dialog");
    await expect(dialog).toHaveAttribute("open", "");
    expect(await dialog.evaluate((element) => element.matches(":modal"))).toBe(true);
    await expect(dialog).toBeFocused();
    await expect(page.getByTestId("world-stage-container")).toBeVisible({ timeout: 45_000 });

    const destinationNav = dialog.getByRole("navigation", { name: "Portfolio destinations and studio exit" });
    for (const [name, href] of [
      ["Projects", "/projects"],
      ["About", "/about"],
      ["Contact", "/contact"],
      ["Résumé", "/resume"],
    ] as const) {
      await expect(destinationNav.getByRole("link", { name, exact: true })).toHaveAttribute("href", href);
    }

    await page.getByTestId("fullscreen-exit-studio-btn").click();
    await expect(dialog).toBeHidden();
    await expect(launch).toBeFocused();

    await launch.click();
    await expect(dialog).toHaveAttribute("open", "");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(launch).toBeFocused();
    await capture(page, "studio-entry-exit-focus-return.png");
  });

  test("fills desktop, mobile, compact, and short-landscape viewports with measurable stage and controls", async ({ page }) => {
    test.setTimeout(120_000);
    const viewports: Array<{ label: string; size: ViewportSize; screenshot: string }> = [
      { label: "desktop-1440x900", size: { width: 1440, height: 900 }, screenshot: "studio-desktop-1440x900.png" },
      { label: "mobile-390x844", size: { width: 390, height: 844 }, screenshot: "studio-mobile-390x844.png" },
      { label: "compact-320x600", size: { width: 320, height: 600 }, screenshot: "studio-compact-320x600.png" },
      { label: "landscape-844x390", size: { width: 844, height: 390 }, screenshot: "studio-landscape-844x390.png" },
    ];

    let entered = false;
    for (const viewport of viewports) {
      await page.setViewportSize(viewport.size);
      if (!entered) {
        await enterStudioAtHome(page);
        entered = true;
        await recordBrowserEnvironment(page);
      } else {
        await waitForStudioViewport(page, viewport.size);
      }
      await capture(page, viewport.screenshot);
      await recordViewportGeometry(page, viewport.label, viewport.size);
      if (viewport.label === "compact-320x600") {
        await captureHudScrolledControl(page, "camera-home-btn", "studio-compact-320x600-hud-scrolled.png");
      }
    }
  });

  test("captures existing room camera presets for reference-anchor inventory", async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await enterStudioAtHome(page);
    const captures = [
      { testId: "camera-monitor-btn", file: "studio-angle-monitor.png", preset: "monitor" },
      { testId: "camera-reverse-btn", file: "studio-angle-reverse-doorway.png", preset: "reverse-doorway" },
      { testId: "camera-mobile-btn", file: "studio-angle-mobile.png", preset: "home-mobile" },
      { testId: "camera-home-btn", file: "studio-angle-home.png", preset: "home-desktop" },
    ];
    for (const view of captures) {
      const button = page.getByTestId(view.testId);
      await button.click();
      await expect(button).toHaveClass(/hudButtonActive/);
      await page.waitForTimeout(1_500);
      await capture(page, view.file);
    }
    fs.writeFileSync(
      path.join(evidenceRoot, "camera-angle-captures.json"),
      `${JSON.stringify({ viewport: { width: 1440, height: 900 }, captures, scope: "Existing runtime camera presets; room geometry and artwork unchanged." }, null, 2)}\n`,
      "utf8",
    );
  });

  test("fallback actions retain behavior, meet text contrast, and expose visible keyboard focus", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/?simulateRendererError=1");
    const dialog = page.getByTestId("fullscreen-studio-dialog");
    const fallback = page.getByTestId("world-fallback-banner");
    await expect(dialog).toHaveAttribute("open", "", { timeout: 15_000 });
    await expect(fallback).toBeVisible({ timeout: 45_000 });
    await expect(fallback).toContainText("Accessible Portfolio View");

    const actions = [
      page.getByTestId("fallback-retry-btn"),
      page.getByTestId("fallback-dismiss-btn"),
      page.getByTestId("fallback-projects-link"),
      page.getByTestId("fallback-about-link"),
    ];
    for (const action of actions) {
      await expect(action).toBeVisible();
      const colors = await action.evaluate((element) => {
        const style = getComputedStyle(element);
        return { foreground: style.color, background: style.backgroundColor };
      });
      expect(contrastRatio(colors.foreground, colors.background), `${colors.foreground} on ${colors.background}`).toBeGreaterThanOrEqual(4.5);
    }

    const accessibility = await new AxeBuilder({ page })
      .include('[data-testid="world-fallback-banner"]')
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(accessibility.violations.map(({ id, help }) => `${id}: ${help}`)).toEqual([]);

    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => document.activeElement?.getAttribute("data-testid"));
    expect(focused).toBe("fallback-retry-btn");
    const focusStyle = await actions[0]!.evaluate((element) => {
      const style = getComputedStyle(element);
      return { visible: element.matches(":focus-visible"), outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth };
    });
    expect(focusStyle.visible).toBe(true);
    expect(focusStyle.outlineStyle).not.toBe("none");
    expect(parseFloat(focusStyle.outlineWidth)).toBeGreaterThanOrEqual(2);
    await capture(page, "fallback-actions-contrast-focus.png");

    await page.getByTestId("fallback-dismiss-btn").click();
    await expect(dialog).toBeHidden();
    await expect(page.getByTestId("studio-disclosure")).toBeVisible();
  });
});
