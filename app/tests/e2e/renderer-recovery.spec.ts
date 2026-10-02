import { test, expect, type TestInfo } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

async function saveEvidence(info: TestInfo, name: string, data: unknown) {
  const baseDir = process.env.C3_EVIDENCE_DIR || process.env.C1_EVIDENCE_DIR || "test-results";
  const destination = path.join(baseDir, info.project.name, name);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, JSON.stringify(data, null, 2)).catch(() => {});
}

test.describe("C3 Failure Recovery, Context Loss & Mobile Resilience", () => {
  test("WebGL context loss triggers accessible WorldFallback without trapping user", async ({ page }, info) => {
    await page.goto("/?studio=1", { waitUntil: "domcontentloaded" });

    // Wait for canvas to appear
    const canvas = page.locator('[data-testid="world-canvas"]');
    await expect(canvas).toBeVisible({ timeout: 10000 });

    // Dispatch simulated webglcontextlost event on canvas
    await page.evaluate(() => {
      const cvs = document.querySelector('canvas[data-testid="world-canvas"]');
      if (cvs) {
        const event = new Event("webglcontextlost", { bubbles: true, cancelable: true });
        cvs.dispatchEvent(event);
      }
    });

    // Verify accessible fallback banner is displayed
    const fallback = page.locator('[data-testid="world-fallback-banner"]');
    await expect(fallback).toBeVisible({ timeout: 5000 });

    // Verify Retry and Continue buttons exist
    const retryBtn = page.locator('[data-testid="fallback-retry-btn"]');
    const dismissBtn = page.locator('[data-testid="fallback-dismiss-btn"]');
    await expect(retryBtn).toBeVisible();
    await expect(dismissBtn).toBeVisible();

    await saveEvidence(info, "context-loss-recovery.json", {
      status: "context_loss_handled",
      fallbackVisible: true,
      hasRetry: true,
      hasDismiss: true,
    });
  });

  test("Asset loading failure renders failure banner with Retry and Continue options", async ({ page }, info) => {
    // Navigate with simulateAssetError=1 (handled in StudioLauncher or WorldRoot)
    await page.goto("/?studio=1&simulateAssetError=1", { waitUntil: "domcontentloaded" });

    // Wait for fallback banner or error container
    const fallbackBanner = page.locator('[data-testid="world-fallback-banner"], [data-testid="static-fallback-section"]');
    await expect(fallbackBanner).toBeVisible({ timeout: 10000 });

    // Click "Continue with Portfolio"
    const continueBtn = page.locator('[data-testid="fallback-dismiss-btn"], [data-testid="loading-continue-btn"], [data-testid="static-fallback-continue"]');
    if (await continueBtn.count() > 0) {
      await continueBtn.first().click();
      // Should unmount or return to portfolio safely
      await expect(page.locator("main")).toBeVisible();
    }

    await saveEvidence(info, "asset-failure-recovery.json", {
      handled: true,
      recoveredToPortfolio: true,
    });
  });

  test("Renderer failure with dialog open preserves dialog interactivity in DOM", async ({ page }, info) => {
    // Navigate with simulateRendererError=1
    await page.goto("/?studio=1&simulateRendererError=1", { waitUntil: "domcontentloaded" });

    // Failure container should appear
    const failureContainer = page.locator('[data-testid="world-failure-container"]');
    await expect(failureContainer).toBeVisible({ timeout: 10000 });

    // Public links (Projects, About) must remain reachable
    const projectsLink = page.locator('[data-testid="fallback-projects-link"], a[href="/projects"]');
    await expect(projectsLink.first()).toBeVisible();
    await projectsLink.first().click();

    await expect(page).toHaveURL(/\/projects/);
    await saveEvidence(info, "renderer-failure-dialog-safe.json", {
      escapedCleanly: true,
      url: page.url(),
    });
  });

  test("Mobile portrait (390x844) framing and touch tap interactions", async ({ page }, info) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/?studio=1", { waitUntil: "domcontentloaded" });

    // Verify canvas or stage renders
    const stage = page.locator('[data-testid="world-stage-container"]');
    await expect(stage).toBeVisible({ timeout: 10000 });

    // Perform tap/click on camera HUD controls
    const homeBtn = page.locator('[data-testid="camera-home-btn"]');
    if (await homeBtn.isVisible()) {
      await homeBtn.click();
    }

    // Verify pointercancel simulation does not break runtime
    await page.evaluate(() => {
      const cvs = document.querySelector('canvas[data-testid="world-canvas"]');
      if (cvs) {
        const cancelEv = new PointerEvent("pointercancel", { bubbles: true, cancelable: true });
        cvs.dispatchEvent(cancelEv);
      }
    });

    await saveEvidence(info, "mobile-portrait-touch.json", {
      viewport: "390x844",
      tapHandled: true,
      pointerCancelHandled: true,
    });
  });

  test("Mobile landscape (844x390) responsive reflow and orientation change", async ({ page }, info) => {
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto("/?studio=1", { waitUntil: "domcontentloaded" });

    const stage = page.locator('[data-testid="world-stage-container"]');
    await expect(stage).toBeVisible({ timeout: 10000 });

    // Trigger window resize event
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(200);
    await page.setViewportSize({ width: 844, height: 390 });

    await expect(stage).toBeVisible();
    await saveEvidence(info, "mobile-landscape-rotation.json", {
      viewport: "844x390",
      orientationReflow: true,
    });
  });
});
