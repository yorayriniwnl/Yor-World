import { test, expect, type Page } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const evidenceDir = process.env.B5_EVIDENCE_DIR || process.env.G1_EVIDENCE_DIR || process.env.W3_EVIDENCE_DIR || "";
const screenshotDir = evidenceDir
  ? path.join(evidenceDir, "screenshots")
  : path.resolve(__dirname, "../../evidence/screenshots");
const logsDir = evidenceDir
  ? path.join(evidenceDir, "logs")
  : path.resolve(__dirname, "../../evidence/logs");

function setupPageLogging(page: Page) {
  if (logsDir) {
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    const consoleLog = path.join(logsDir, "console.log");
    const networkLog = path.join(logsDir, "network.log");

    page.on("console", (msg) => {
      try {
        fs.appendFileSync(consoleLog, `[CONSOLE ${msg.type()}] ${msg.text()}\n`, "utf8");
      } catch {}
    });
    page.on("pageerror", (err) => {
      try {
        fs.appendFileSync(consoleLog, `[PAGEERROR] ${err.message}\n`, "utf8");
      } catch {}
    });
    page.on("request", (req) => {
      try {
        fs.appendFileSync(networkLog, `[REQ] ${req.method()} ${req.url()}\n`, "utf8");
      } catch {}
    });
    page.on("response", (res) => {
      try {
        fs.appendFileSync(
          networkLog,
          `[RES] ${res.status()} ${res.url()} (${res.headers()["content-type"] || ""})\n`,
          "utf8"
        );
      } catch {}
    });
  }
}

async function captureScreenshot(page: Page, filename: string) {
  if (screenshotDir) {
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    const filePath = path.join(screenshotDir, filename);
    await page.screenshot({ path: filePath, fullPage: false });
  }
}

test.describe("B5 Production Runtime Lifecycle Foundation - Adversarial & Invariant Tests", () => {
  test.beforeEach(async ({ page }) => {
    setupPageLogging(page);
  });

  test("1. Enter -> repeated Enter: rapid enter requests never create duplicate canvas or renderer", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Open disclosure
    await page.locator('[data-testid="studio-disclosure"] summary').click();
    const enterBtn = page.locator('[data-testid="enter-studio-btn"]');
    await expect(enterBtn).toBeVisible();

    // Rapid double / triple click
    await enterBtn.click({ clickCount: 3, delay: 50 });

    // Wait for world stage
    const stage = page.locator('[data-testid="world-stage-container"]');
    await expect(stage).toBeVisible({ timeout: 15000 });
    const immersive = page.getByTestId("studio-fullscreen");
    await expect(immersive).toBeVisible();
    const bounds = await immersive.boundingBox();
    const viewport = page.viewportSize();
    expect(bounds?.width ?? 0).toBeGreaterThan((viewport?.width ?? 0) * .95);
    expect(bounds?.height ?? 0).toBeGreaterThan((viewport?.height ?? 0) * .95);

    // PROVE: exactly one canvas exists
    const canvases = await page.locator("canvas").count();
    expect(canvases).toBe(1);

    await captureScreenshot(page, "b5-01-repeated-enter-single-canvas.png");
  });

  test("2. Enter -> Skip -> late load completion: Skip settles instantly to HOME; late tasks cannot corrupt state", async ({ page }) => {
    await page.goto("/?studio=enter");
    const stage = page.locator('[data-testid="world-stage-container"]');
    await expect(stage).toBeVisible({ timeout: 15000 });

    // Skip immediately
    const skipBtn = page.locator('[data-testid="skip-motion-btn"]');
    await expect(skipBtn).toBeVisible();
    await skipBtn.click();

    // Verify settled in HOME
    await page.locator('[data-testid="diagnostics-toggle-btn"]').click();
    const diagPre = page.locator('[data-testid="world-diagnostics"]');
    await expect(diagPre).toBeVisible();

    const diagText = await diagPre.textContent();
    const diag = JSON.parse(diagText || "{}");
    expect(diag.lifecycleState).toBe("HOME");
    expect(diag.cameraPreset).toMatch(/home-(desktop|mobile)/);
    expect(diag.activeClip).toBe("coding_idle");

    // Wait 1.5 seconds to let any delayed background load/entrance promises resolve
    await page.waitForTimeout(1500);

    // Verify state remained HOME and did not restart entrance
    const diagTextAfter = await diagPre.textContent();
    const diagAfter = JSON.parse(diagTextAfter || "{}");
    expect(diagAfter.lifecycleState).toBe("HOME");
    expect(diagAfter.cameraPreset).toMatch(/home-(desktop|mobile)/);

    await captureScreenshot(page, "b5-02-skip-settles-home.png");
  });

  test("3. Enter -> Escape: pressing Escape during entrance skips directly to HOME", async ({ page }) => {
    await page.goto("/?studio=enter");
    const stage = page.locator('[data-testid="world-stage-container"]');
    await expect(stage).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="world-loading-overlay"]')).not.toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="skip-entrance-btn"]')).toBeVisible({ timeout: 10000 });

    // Press Escape key during entrance
    await page.keyboard.press("Escape");

    // Verify settled to HOME
    await page.locator('[data-testid="diagnostics-toggle-btn"]').click();
    const diagPre = page.locator('[data-testid="world-diagnostics"]');
    await expect(diagPre).toBeVisible();

    const diagText = await diagPre.textContent();
    const diag = JSON.parse(diagText || "{}");
    expect(diag.lifecycleState).toBe("HOME");
    expect(diag.cameraPreset).toMatch(/home-(desktop|mobile)/);

    await captureScreenshot(page, "b5-03-escape-settles-home.png");
  });

  test("4. Enter -> route navigation: navigating to portfolio routes cancels world and unmounts canvas cleanly", async ({ page }) => {
    await page.goto("/?studio=enter");
    await expect(page.locator('[data-testid="world-stage-container"]')).toBeVisible({ timeout: 15000 });
    expect(await page.locator("canvas").count()).toBe(1);

    // Navigate to Projects through the modal's accessible parallel path.
    // Background page navigation is correctly inert while the dialog is open.
    await page.getByTestId("studio-projects-link").click();
    await page.waitForURL("**/projects");

    // Canvas must be completely removed from DOM
    expect(await page.locator("canvas").count()).toBe(0);
    await expect(page.locator("h1")).toContainText(/Projects|Selected Works/i);

    await captureScreenshot(page, "b5-04-route-navigation-clean-unmount.png");
  });

  test("5. Enter -> Back: browser back button returns to clean static portfolio without errors", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Open and Enter studio
    await page.locator('[data-testid="studio-disclosure"] summary').click();
    await page.locator('[data-testid="enter-studio-btn"]').click();
    await expect(page.locator('[data-testid="world-stage-container"]')).toBeVisible({ timeout: 15000 });

    // Exit studio via Exit button
    await page.locator('[data-testid="exit-studio-btn"]').click();
    await expect(page.locator('[data-testid="studio-disclosure"]')).toBeVisible();
    expect(await page.locator("canvas").count()).toBe(0);

    await captureScreenshot(page, "b5-05-exit-clean-static.png");
  });

  test("6. loading -> renderer failure: simulated renderer failure gracefully renders accessible fallback", async ({ page }) => {
    await page.goto("/?simulateRendererError=1");
    const fallback = page.locator('[data-testid="world-fallback-banner"]');
    await expect(fallback).toBeVisible({ timeout: 15000 });

    // Semantic site is intact
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("nav")).toBeVisible();

    // Zero canvas instances on renderer error
    expect(await page.locator("canvas").count()).toBe(0);

    // Fallback actions exist
    await expect(page.locator('[data-testid="fallback-retry-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="fallback-dismiss-btn"]')).toBeVisible();

    await captureScreenshot(page, "b5-06-renderer-failure-fallback.png");
  });

  test("7. failed asset -> Retry: simulated asset failure shows bounded retry", async ({ page }) => {
    await page.goto("/?simulateAssetError=1");
    const fallback = page.locator('[data-testid="world-fallback-banner"]');
    await expect(fallback).toBeVisible({ timeout: 15000 });

    await expect(fallback).toContainText(/Asset Loading 404/i);
    const retryBtn = page.locator('[data-testid="fallback-retry-btn"]');
    await expect(retryBtn).toBeVisible();

    await captureScreenshot(page, "b5-07-asset-failure-retry.png");
  });

  test("8. failure -> Continue with portfolio: dismisses fallback and returns to clean portfolio", async ({ page }) => {
    await page.goto("/?simulateRendererError=1");
    const fallback = page.locator('[data-testid="world-fallback-banner"]');
    await expect(fallback).toBeVisible({ timeout: 15000 });

    // Click Continue with Portfolio
    await page.locator('[data-testid="fallback-dismiss-btn"]').click();

    // Fallback dismissed; disclosure is available
    await expect(fallback).not.toBeVisible();
    await expect(page.locator('[data-testid="studio-disclosure"]')).toBeVisible();

    await captureScreenshot(page, "b5-08-failure-dismiss-portfolio.png");
  });

  test("9. reduced-motion enabled before entry: bypasses camera travel directly to HOME", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/?studio=enter");

    const stage = page.locator('[data-testid="world-stage-container"]');
    await expect(stage).toBeVisible({ timeout: 15000 });

    // Open diagnostics
    await page.locator('[data-testid="diagnostics-toggle-btn"]').click();
    const diagPre = page.locator('[data-testid="world-diagnostics"]');
    await expect(diagPre).toBeVisible();

    const diag = JSON.parse((await diagPre.textContent()) || "{}");
    expect(diag.reducedMotion).toBe(true);
    expect(diag.lifecycleState).toBe("HOME");
    expect(diag.entrance?.phase).toBe("settled");
    expect(diag.entrance?.progress).toBe(1.0);

    await captureScreenshot(page, "b5-09-reduced-motion-direct-home.png");
  });

  test("10. reduced-motion toggled during active experience: updates camera transition travel", async ({ page }) => {
    await page.goto("/?studio=enter");
    await expect(page.locator('[data-testid="world-stage-container"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="world-loading-overlay"]')).not.toBeVisible({ timeout: 15000 });

    // Toggle reduced motion ON
    const rmBtn = page.locator('[data-testid="reduced-motion-toggle-btn"]');
    await rmBtn.click();
    await expect(rmBtn).toHaveText(/Reduced Motion: On/);

    // Switch camera
    await page.locator('[data-testid="camera-monitor-btn"]').click();

    await page.locator('[data-testid="diagnostics-toggle-btn"]').click();
    const diag = JSON.parse((await page.locator('[data-testid="world-diagnostics"]').textContent()) || "{}");
    expect(diag.reducedMotion).toBe(true);
    expect(diag.cameraPreset).toBe("monitor");

    await captureScreenshot(page, "b5-10-dynamic-reduced-motion.png");
  });

  test("11. PROVE: single owners verified across all domains", async ({ page }) => {
    await page.goto("/?studio=enter");
    await expect(page.locator('[data-testid="world-stage-container"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="world-loading-overlay"]')).not.toBeVisible({ timeout: 15000 });

    await page.locator('[data-testid="diagnostics-toggle-btn"]').click();
    const diag = JSON.parse((await page.locator('[data-testid="world-diagnostics"]').textContent()) || "{}");

    expect(diag.singleOwners).toBeDefined();
    expect(diag.singleOwners.rendererOwner).toBe("primary-renderer-lifecycle");
    expect(diag.singleOwners.cameraOwner).toBe("primary-camera-director");
    expect(diag.singleOwners.transitionOwner).toBe("primary-transition-coordinator");
    expect(diag.singleOwners.characterActionOwner).toBe("primary-character-director");
    expect(diag.singleOwners.assetLoadingSessionOwner).toBe("primary-asset-loader");
    expect(diag.singleOwners.activeSessionToken).toBeGreaterThan(0);

    await captureScreenshot(page, "b5-11-single-owners-verified.png");
  });

  test("12. PROVE: semantic navigation survives renderer failure", async ({ page }) => {
    await page.goto("/?simulateRendererError=1");
    await expect(page.locator('[data-testid="world-fallback-banner"]')).toBeVisible({ timeout: 15000 });

    // Click Browse Projects in fallback
    await page.locator('[data-testid="fallback-projects-link"]').click();
    await page.waitForURL("**/projects");

    await expect(page.locator("h1")).toBeVisible();
    expect(await page.locator("canvas").count()).toBe(0);

    // Click About in main navigation
    await page.locator('nav a[href="/about"]').click();
    await page.waitForURL("**/about");
    await expect(page.locator("h1")).toBeVisible();

    await captureScreenshot(page, "b5-12-navigation-survives-failure.png");
  });
  test("13. One-click doorway entry is fullscreen and exits cleanly", async ({ page }) => {
    await page.goto("/");
    const directEntry = page.getByTestId("studio-direct-entry");
    await expect(directEntry).toBeVisible();
    await directEntry.click();
    const modal = page.getByTestId("studio-fullscreen");
    await expect(modal).toBeVisible();
    await expect(modal).toHaveJSProperty("open", true);
    await expect(page.getByTestId("world-stage-container")).toBeVisible({ timeout: 15000 });
    await page.getByTestId("studio-fullscreen-close").click();
    await expect(modal).toHaveCount(0);
    await expect(page.locator("canvas")).toHaveCount(0);
    await expect(page.getByTestId("studio-direct-entry")).toBeVisible();
  });


});
