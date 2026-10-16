import { expect, test } from "@playwright/test";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const outputRoot = path.resolve(process.env.P26_ATTRIBUTION_OUTPUT_DIR || "../deliveries/G7/preparation/maker-evidence/pre-g7-26/attempt-01/attribution");
const sourceLabel = process.env.P26_ATTRIBUTION_SOURCE || "unlabeled-source";
const viewports = [
  { label: "desktop-1440x900", width: 1440, height: 900 },
  { label: "mobile-390x844", width: 390, height: 844 },
  { label: "compact-320x600", width: 320, height: 600 },
  { label: "landscape-844x390", width: 844, height: 390 },
];

fs.mkdirSync(outputRoot, { recursive: true });

test("P26 renderer item attribution across required viewports", async ({ page, browserName }) => {
  const browserErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push("[console.error] " + message.text());
  });
  page.on("pageerror", (error) => browserErrors.push("[pageerror] " + (error.stack || error.message)));

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/?studio=enter&pre-g7-evidence=1&p26-render-attribution=1");
    await expect(page.getByTestId("fullscreen-studio-dialog")).toHaveAttribute("open", "", { timeout: 15_000 });
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
    await page.waitForTimeout(500);

    const result = await page.evaluate(() => {
      const target = window as Window & {
        __P26_RENDER_ATTRIBUTION__?: {
          latestFrame?: Record<string, unknown> | null;
          rendererVersion?: string;
          multiDrawSupported?: boolean;
          warnings?: string[];
        };
      };
      const trace = target.__P26_RENDER_ATTRIBUTION__;
      const canvas = document.querySelector<HTMLCanvasElement>("[data-testid='world-canvas']");
      const gl = canvas?.getContext("webgl2") ?? canvas?.getContext("webgl");
      const rendererInfo = gl?.getParameter(gl.RENDERER) ?? null;
      return {
        trace: trace?.latestFrame ?? null,
        rendererVersion: trace?.rendererVersion ?? null,
        multiDrawSupported: trace?.multiDrawSupported ?? null,
        instrumentationWarnings: trace?.warnings ?? [],
        rendererInfo,
        qualityTier: (trace?.latestFrame as { qualityTier?: string } | null)?.qualityTier ?? null,
      };
    });
    expect(result.trace, "instrumented renderer produced a frame").not.toBeNull();

    const browser = /Edg\//.test(await page.evaluate(() => navigator.userAgent)) ? "edge" : browserName;
    const captureDir = path.join(outputRoot, sourceLabel, browser);
    fs.mkdirSync(captureDir, { recursive: true });
    const baseName = viewport.label + "-" + browser;
    const screenshotPath = path.join(captureDir, baseName + ".png");
    await page.screenshot({ path: screenshotPath, fullPage: false });
    const screenshotBytes = fs.readFileSync(screenshotPath);
    const jsonPath = path.join(captureDir, baseName + "-attribution.json");
    const record = {
      schemaVersion: 1,
      source: {
        label: sourceLabel,
        commit: process.env.P26_ATTRIBUTION_COMMIT ?? null,
        appTree: process.env.P26_ATTRIBUTION_APP_TREE ?? null,
      },
      capture: {
        browser,
        browserName,
        userAgent: await page.evaluate(() => navigator.userAgent),
        viewport: { width: viewport.width, height: viewport.height },
        qualityTier: result.qualityTier,
        rendererVersion: result.rendererVersion,
        rendererInfo: result.rendererInfo,
        multiDrawSupported: result.multiDrawSupported,
        instrumentationWarnings: result.instrumentationWarnings,
        screenshot: {
          path: path.relative(outputRoot, screenshotPath).replaceAll("\\", "/"),
          bytes: screenshotBytes.length,
          sha256: crypto.createHash("sha256").update(screenshotBytes).digest("hex"),
        },
        browserErrors,
      },
      trace: result.trace,
    };
    fs.writeFileSync(jsonPath, JSON.stringify(record, null, 2) + "\n");
  }
});

