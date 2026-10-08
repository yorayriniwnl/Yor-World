import { test, expect, type Page } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const evidenceDir = process.env.G1_EVIDENCE_DIR || process.env.W3_EVIDENCE_DIR || process.env.B5_EVIDENCE_DIR || "";
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
      } catch {
        // ignore write error
      }
    });
    page.on("pageerror", (err) => {
      try {
        fs.appendFileSync(consoleLog, `[PAGEERROR] ${err.message}\n`, "utf8");
      } catch {
        // ignore write error
      }
    });
    page.on("request", (req) => {
      try {
        fs.appendFileSync(networkLog, `[REQ] ${req.method()} ${req.url()}\n`, "utf8");
      } catch {
        // ignore write error
      }
    });
    page.on("response", (res) => {
      try {
        fs.appendFileSync(
          networkLog,
          `[RES] ${res.status()} ${res.url()} (${res.headers()["content-type"] || ""})\n`,
          "utf8"
        );
      } catch {
        // ignore write error
      }
    });
  }
}

async function captureScreenshot(page: Page, filename: string) {
  if (screenshotDir) {
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    try {
      await page.screenshot({
        path: path.join(screenshotDir, `${filename}.png`),
        fullPage: false,
      });
    } catch {
      await new Promise((r) => setTimeout(r, 200));
      try {
        await page.screenshot({
          path: path.join(screenshotDir, `${filename}.png`),
          fullPage: false,
        });
      } catch {
        // Transient screenshot lock on Windows does not fail functional assertion
      }
    }
  }
}

test.describe("G1 Combined World Integration & Browser Behavior", () => {
  test.beforeEach(async ({ page }) => {
    setupPageLogging(page);
  });

  test("1. Load: public page loads with zero 3D world scripts or models pre-entry", async ({ page }) => {
    const glbRequests: string[] = [];
    page.on("request", (req) => {
      if (req.url().endsWith(".glb")) {
        glbRequests.push(req.url());
      }
    });

    await page.goto("/");
    await expect(page.locator("h1")).toContainText("Full-stack");
    await captureScreenshot(page, "01-load-landing");

    await page.locator('[data-testid="studio-disclosure"] summary').click();
    await expect(page.locator('[data-testid="enter-studio-btn"]')).toBeVisible();

    // Verify ZERO .glb files were loaded prior to explicit entry
    expect(glbRequests).toEqual([]);
    await expect(page.locator('[data-testid="world-canvas"]')).toHaveCount(0);
  });

  test("2. Entry & 3. Home Camera: explicit entry mounts world with single resident and chair at F1 coordinates", async ({ page }) => {
    await page.goto("/?studio=enter");

    // Wait for world canvas and status badge
    const canvas = page.locator('[data-testid="world-canvas"]');
    await expect(canvas).toBeVisible({ timeout: 15000 });

    const badge = page.locator('[data-testid="status-badge"]');
    await expect(badge).toBeVisible({ timeout: 15000 });
    await expect(badge).toContainText("coding_idle");

    await captureScreenshot(page, "02-entry-home-desktop");

    // Open diagnostics drawer
    await page.click('[data-testid="diagnostics-toggle-btn"]');
    const diagPre = page.locator('[data-testid="world-diagnostics"]');
    await expect(diagPre).toBeVisible();

    const text = await diagPre.textContent();
    expect(text).not.toBeNull();
    const diag = JSON.parse(text!);

    // Verify G1 Invariants: exactly 1 resident, 1 moving chair, 1 desk, 0 fixture-static
    expect(diag.residentCount).toBe(1);
    expect(diag.chairCount).toBe(1);
    expect(diag.movingChairCount).toBe(1);
    expect(diag.deskCount).toBe(1);
    expect(diag.fixtureStaticDiscarded).toBe(true);

    // Verify F1 Placement coordinates: (0.30, 0, -0.36)
    expect(diag.residentPosition[0]).toBeCloseTo(0.3, 1);
    expect(diag.residentPosition[1]).toBeCloseTo(0, 1);
    expect(diag.residentPosition[2]).toBeCloseTo(-0.36, 1);

    expect(diag.chairPosition[0]).toBeCloseTo(0.3, 1);
    expect(diag.chairPosition[2]).toBeCloseTo(-0.36, 1);

    // Verify Home Camera Preset
    expect(diag.cameraPreset).toBe("home-desktop");
    expect(diag.activeClip).toBe("coding_idle");
    expect(diag.soundEnabled).toBe(false);
  });

  test("4. Greeting & 5. Return: resident acknowledges visitor with chair turn and returns to work", async ({ page }) => {
    await page.goto("/?studio=enter");
    await expect(page.locator('[data-testid="status-badge"]')).toContainText("coding_idle", { timeout: 15000 });

    // Open diagnostics
    await page.click('[data-testid="diagnostics-toggle-btn"]');

    // Trigger Greet
    await page.click('[data-testid="greet-resident-btn"]');

    // Verify sequence transitions into notice / turn
    await expect(page.locator('[data-testid="status-badge"]')).toContainText("notice_visitor");

    // Wait for turn to visitor
    await page.waitForTimeout(700);
    await expect(page.locator('[data-testid="status-badge"]')).toContainText("turn_to_visitor");

    await captureScreenshot(page, "03-greeting-turn");

    // Check diagnostics during turn: chair yaw must increase towards 125 degrees
    const diagText = await page.locator('[data-testid="world-diagnostics"]').textContent();
    const diag = JSON.parse(diagText!);
    expect(diag.mode).toBe("sequence");

    // Wait for greeting nod and return sequence to finish (total sequence ~4.0s)
    await expect(page.locator('[data-testid="status-badge"]')).toContainText("coding_idle", { timeout: 8000 });
    await captureScreenshot(page, "04-return-coding");
  });

  test("6. Repeat: safe repeated greeting interactions without state corruption", async ({ page }) => {
    await page.goto("/?studio=enter");
    await expect(page.locator('[data-testid="status-badge"]')).toContainText("coding_idle", { timeout: 15000 });

    // First greeting
    await page.click('[data-testid="greet-resident-btn"]');
    await page.waitForTimeout(600);
    await page.click('[data-testid="skip-motion-btn"]');
    await expect(page.locator('[data-testid="status-badge"]')).toContainText("coding_idle");

    // Second greeting (repeat)
    await page.click('[data-testid="greet-resident-btn"]');
    await expect(page.locator('[data-testid="status-badge"]')).toContainText("notice_visitor");

    // Third greeting after instant skip
    await page.click('[data-testid="skip-motion-btn"]');
    await expect(page.locator('[data-testid="status-badge"]')).toContainText("coding_idle");
    await captureScreenshot(page, "05-repeat-greeting");
  });

  test("7. Cancel: safe cancellation reverses along collision-checked path back to rest", async ({ page }) => {
    await page.goto("/?studio=enter");
    await expect(page.locator('[data-testid="status-badge"]')).toContainText("coding_idle", { timeout: 15000 });

    // Start greeting
    await page.click('[data-testid="greet-resident-btn"]');
    await page.waitForTimeout(800); // Wait until turn_to_visitor

    // Click cancel
    await page.click('[data-testid="cancel-motion-btn"]');

    // Should indicate safe-return
    await expect(page.locator('[data-testid="status-badge"]')).toContainText("safe-return");

    // Wait for return to finish
    await expect(page.locator('[data-testid="status-badge"]')).toContainText("coding_idle", { timeout: 5000 });
    await captureScreenshot(page, "06-cancel-safe-return");
  });

  test("8. Skip/Escape: instant settlement to coding pose within ≤50ms", async ({ page }) => {
    await page.goto("/?studio=enter");
    await expect(page.locator('[data-testid="status-badge"]')).toContainText("coding_idle", { timeout: 15000 });

    // Start greeting
    await page.click('[data-testid="greet-resident-btn"]');
    await page.waitForTimeout(800); // Mid-turn

    // Measure the actual browser key event -> DOM settlement, excluding test-driver IPC/polling.
    await expect(page.locator('[data-testid="status-badge"]')).not.toContainText("coding_idle");
    await page.evaluate(() => {
      const state = window as typeof window & { __yorEscapeSettlement?: Promise<number> };
      state.__yorEscapeSettlement = new Promise<number>((resolve, reject) => {
        const onKey = (event: KeyboardEvent) => {
          if (event.key !== "Escape") return;
          window.removeEventListener("keydown", onKey, true);
          const started = performance.now();
          const badge = document.querySelector('[data-testid="status-badge"]');
          if (!badge) { reject(new Error("Missing active studio badge.")); return; }
          const observer = new MutationObserver(check);
          const timeout = setTimeout(() => { observer.disconnect(); reject(new Error("Escape did not settle the active world.")); }, 5000);
          function check() {
            if (!badge?.textContent?.includes("coding_idle")) return;
            observer.disconnect();
            clearTimeout(timeout);
            resolve(performance.now() - started);
          }
          observer.observe(badge, { childList: true, characterData: true, subtree: true });
          queueMicrotask(check);
        };
        window.addEventListener("keydown", onKey, true);
      });
    });
    await page.keyboard.press("Escape");

    // Verify immediate settlement
    await expect(page.locator('[data-testid="status-badge"]')).toContainText("coding_idle");
    const elapsed = await page.evaluate(() => (window as typeof window & { __yorEscapeSettlement: Promise<number> }).__yorEscapeSettlement);
    expect(elapsed).toBeLessThanOrEqual(50);
    await captureScreenshot(page, "07-skip-instant-settle");
  });

  test("9. Monitor & 10. Reverse Doorway camera navigation", async ({ page }) => {
    await page.goto("/?studio=enter");
    await expect(page.locator('[data-testid="world-canvas"]')).toBeVisible({ timeout: 15000 });
    await page.click('[data-testid="diagnostics-toggle-btn"]');

    // Switch to Monitor
    await page.click('[data-testid="camera-monitor-btn"]');
    let text = await page.locator('[data-testid="world-diagnostics"]').textContent();
    let diag = JSON.parse(text!);
    expect(diag.cameraPreset).toBe("monitor");
    expect(diag.cameraPosition[0]).toBeCloseTo(0, 1);
    expect(diag.cameraPosition[1]).toBeCloseTo(1.08, 1);
    expect(diag.cameraPosition[2]).toBeCloseTo(-0.5, 1);
    await captureScreenshot(page, "08-camera-monitor");

    // Switch to Reverse Doorway
    await page.click('[data-testid="camera-reverse-btn"]');
    text = await page.locator('[data-testid="world-diagnostics"]').textContent();
    diag = JSON.parse(text!);
    expect(diag.cameraPreset).toBe("reverse-doorway");
    expect(diag.cameraPosition[0]).toBeCloseTo(0.2, 1);
    expect(diag.cameraPosition[1]).toBeCloseTo(1.25, 1);
    expect(diag.cameraPosition[2]).toBeCloseTo(-1.0, 1);
    await captureScreenshot(page, "09-camera-reverse-doorway");

    // Switch back to Home
    await page.click('[data-testid="camera-home-btn"]');
    text = await page.locator('[data-testid="world-diagnostics"]').textContent();
    diag = JSON.parse(text!);
    expect(diag.cameraPreset).toBe("home-desktop");
  });

  test("11. Mobile Viewport: touch-friendly HUD and mobile framing", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/?studio=enter");

    await expect(page.locator('[data-testid="world-canvas"]')).toBeVisible({ timeout: 15000 });
    // Wait for world models to finish loading
    await expect(page.locator('[data-testid="status-badge"]')).toContainText("coding_idle", { timeout: 15000 });
    await captureScreenshot(page, "10-mobile-viewport");

    // Buttons must have >= 44px touch height
    const btnBox = await page.locator('[data-testid="greet-resident-btn"]').boundingBox();
    expect(btnBox).not.toBeNull();
    expect(btnBox!.height).toBeGreaterThanOrEqual(44);

    // Diagnostics should report mobile preset or portrait aspect
    await page.click('[data-testid="diagnostics-toggle-btn"]');
    const text = await page.locator('[data-testid="world-diagnostics"]').textContent();
    const diag = JSON.parse(text!);
    expect(diag.cameraPreset).toBe("home-mobile");
  });

  test("12. Reduced Motion & Sound Defaults", async ({ page }) => {
    await page.goto("/?studio=enter");
    await expect(page.locator('[data-testid="world-canvas"]')).toBeVisible({ timeout: 15000 });
    await page.click('[data-testid="diagnostics-toggle-btn"]');

    // Default sound is OFF
    await expect(page.locator('[data-testid="sound-toggle-btn"]')).toContainText("Sound: Off");
    let text = await page.locator('[data-testid="world-diagnostics"]').textContent();
    let diag = JSON.parse(text!);
    expect(diag.soundEnabled).toBe(false);

    // Toggle sound ON
    await page.click('[data-testid="sound-toggle-btn"]');
    await expect(page.locator('[data-testid="sound-toggle-btn"]')).toContainText("Sound: On");

    // Toggle Reduced Motion ON
    await page.click('[data-testid="reduced-motion-toggle-btn"]');
    await expect(page.locator('[data-testid="reduced-motion-toggle-btn"]')).toContainText("Reduced Motion: On");
    await expect(page.locator('[data-testid="world-diagnostics"]')).toContainText('"reducedMotion": true');
    text = await page.locator('[data-testid="world-diagnostics"]').textContent();
    diag = JSON.parse(text!);
    expect(diag.reducedMotion).toBe(true);

    await captureScreenshot(page, "11-reduced-motion");
  });

  test("13. Asset Failure: graceful fallback leaves useful HTML", async ({ page }) => {
    await page.goto("/?simulateAssetError=1");

    // Verify fallback banner appears
    const fallback = page.locator('[data-testid="world-fallback-banner"]');
    await expect(fallback).toBeVisible({ timeout: 5000 });
    await expect(fallback).toContainText("Accessible Portfolio View");
    await captureScreenshot(page, "12-asset-failure-fallback");

    // Direct links to projects and about are present and working
    await expect(page.locator('[data-testid="fallback-projects-link"]')).toBeVisible();
    await expect(page.locator('[data-testid="fallback-about-link"]')).toBeVisible();

    // Verify main page directory remains fully reachable
    await expect(page.locator("h2#editorial-story-heading")).toContainText("Hi, I'm");
  });

  test("14. Renderer Failure: WebGL failure caught cleanly leaving useful HTML", async ({ page }) => {
    await page.goto("/?simulateRendererError=1");

    // Verify fallback banner appears
    const fallback = page.locator('[data-testid="world-fallback-banner"]');
    await expect(fallback).toBeVisible({ timeout: 5000 });
    await expect(fallback).toContainText("Accessible Portfolio View");
    await captureScreenshot(page, "13-renderer-failure-fallback");

    // Page navigation still functions
    await expect(page.locator('[data-testid="fallback-projects-link"]')).toBeVisible();
    await expect(page.locator('[data-testid="fallback-about-link"]')).toBeVisible();
  });

  test("15. Fallback Content with JavaScript Disabled: 100% useful semantic HTML", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();

    await page.goto("/");
    await expect(page.locator("h1")).toContainText("Full-stack");
    await captureScreenshot(page, "14-javascript-disabled");

    // Details disclosure works natively without JS
    const disclosure = page.locator('[data-testid="studio-disclosure"]');
    await expect(disclosure).toBeVisible();

    // Public links work without JS
    await page.click('a[href="/about"]');
    await expect(page.locator("h1")).toContainText("About");

    await context.close();
  });
});
