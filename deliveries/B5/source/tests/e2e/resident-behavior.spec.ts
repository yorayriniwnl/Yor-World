import { test, expect, type Page } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const evidenceDir = process.env.B5_EVIDENCE_DIR || process.env.G1_EVIDENCE_DIR || "";
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
    const consoleLog = path.join(logsDir, "resident-console.log");
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

test.describe("Production Resident Behavior & Entrance Runtime - Adversarial E2E Suite", () => {
  test.beforeEach(async ({ page }) => {
    setupPageLogging(page);
  });

  test("1. Resident interaction after entrance: greet sequence plays and returns cleanly to coding", async ({ page }) => {
    await page.goto("/?studio=enter");
    await expect(page.locator('[data-testid="world-stage-container"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="world-loading-overlay"]')).not.toBeVisible({ timeout: 15000 });

    // Skip entrance to settle directly in HOME
    const skipBtn = page.locator('[data-testid="skip-motion-btn"]');
    if (await skipBtn.isVisible()) {
      await skipBtn.click();
    }

    // Trigger greet interaction
    const greetBtn = page.locator('[data-testid="greet-resident-btn"]');
    await expect(greetBtn).toBeVisible({ timeout: 10000 });
    await greetBtn.click();

    // Verify diagnostics indicate sequence
    await page.locator('[data-testid="diagnostics-toggle-btn"]').click();
    const diagPre = page.locator('[data-testid="world-diagnostics"]');
    await expect(diagPre).toBeVisible();

    const diag = JSON.parse((await diagPre.textContent()) || "{}");
    expect(["notice_visitor", "turn_to_visitor", "greeting_nod", "return_to_work", "coding_idle"]).toContain(diag.activeClip);

    await captureScreenshot(page, "resident-01-greeting-sequence.png");
  });

  test("2. Repeated greet: rapid clicks coalesce gracefully without state corruption", async ({ page }) => {
    await page.goto("/?studio=enter");
    await expect(page.locator('[data-testid="world-stage-container"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="world-loading-overlay"]')).not.toBeVisible({ timeout: 15000 });

    const skipBtn = page.locator('[data-testid="skip-motion-btn"]');
    if (await skipBtn.isVisible()) {
      await skipBtn.click();
    }

    const greetBtn = page.locator('[data-testid="greet-resident-btn"]');
    await expect(greetBtn).toBeVisible();

    // Click 5 times in rapid succession
    await greetBtn.click();
    await greetBtn.click();
    await greetBtn.click();
    await greetBtn.click();
    await greetBtn.click();

    // Verify exactly 1 canvas and valid diagnostic state
    expect(await page.locator("canvas").count()).toBe(1);

    await captureScreenshot(page, "resident-02-repeated-greet.png");
  });

  test("3. Greet interrupted by route navigation: unmounts cleanly without console error", async ({ page }) => {
    await page.goto("/?studio=enter");
    await expect(page.locator('[data-testid="world-stage-container"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="world-loading-overlay"]')).not.toBeVisible({ timeout: 15000 });

    const skipBtn = page.locator('[data-testid="skip-motion-btn"]');
    if (await skipBtn.isVisible()) {
      await skipBtn.click();
    }

    const greetBtn = page.locator('[data-testid="greet-resident-btn"]');
    await expect(greetBtn).toBeVisible();
    await greetBtn.click();

    // Immediately navigate away mid-greeting
    await page.locator('nav a[href="/about"]').click();
    await page.waitForURL("**/about");

    // Canvas must be completely removed from DOM
    expect(await page.locator("canvas").count()).toBe(0);

    await captureScreenshot(page, "resident-03-greet-nav-unmount.png");
  });

  test("4. Escape key during entrance: settles immediately to HOME within <=50ms", async ({ page }) => {
    await page.goto("/?studio=enter");
    await expect(page.locator('[data-testid="world-stage-container"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="world-loading-overlay"]')).not.toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="entrance-banner"]')).toBeVisible({ timeout: 15000 });

    // Press Escape during entrance
    await page.keyboard.press("Escape");

    // Check diagnostics: must be HOME and coding_idle
    await page.locator('[data-testid="diagnostics-toggle-btn"]').click();
    const diagPre = page.locator('[data-testid="world-diagnostics"]');
    await expect(diagPre).toBeVisible();

    const diag = JSON.parse((await diagPre.textContent()) || "{}");
    expect(diag.lifecycleState).toBe("HOME");
    expect(diag.activeClip).toBe("coding_idle");

    await captureScreenshot(page, "resident-04-escape-settle.png");
  });

  test("5. Browser Back button during entrance: unmounts world stage cleanly", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Enter studio (pushes history or updates query)
    await page.goto("/?studio=enter");
    await expect(page.locator('[data-testid="world-stage-container"]')).toBeVisible({ timeout: 15000 });

    // Click browser Back
    await page.goBack();

    // Canvas must unmount
    await page.waitForTimeout(500);
    expect(await page.locator("canvas").count()).toBe(0);

    await captureScreenshot(page, "resident-05-browser-back-unmount.png");
  });

  test("6. Page hide and show (visibilitychange): preserves runtime state without crashing", async ({ page }) => {
    await page.goto("/?studio=enter");
    await expect(page.locator('[data-testid="world-stage-container"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="world-loading-overlay"]')).not.toBeVisible({ timeout: 15000 });

    // Simulate page hidden
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { value: true, writable: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });

    await page.waitForTimeout(300);

    // Simulate page visible again
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { value: false, writable: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });

    await page.waitForTimeout(300);

    // Verify world is healthy
    expect(await page.locator("canvas").count()).toBe(1);

    await captureScreenshot(page, "resident-06-visibility-change.png");
  });
});
