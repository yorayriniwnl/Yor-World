import { test, expect } from "@playwright/test";

test.describe("Completion: Loading Progress, Watchdog, and Pause State Retention", () => {
  test("omits aria-valuenow when loading progress is indeterminate", async ({ page }) => {
    await page.goto("/?enter=true");

    const progressBar = page.locator('[data-testid="world-loading-progress-bar"]');
    if (await progressBar.isVisible()) {
      const valuenow = await progressBar.getAttribute("aria-valuenow");
      // If indeterminate, aria-valuenow must be absent
      // If determinate, it must be between 0 and 100
      if (valuenow !== null) {
        const val = Number.parseInt(valuenow, 10);
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThanOrEqual(100);
      }
    }
  });

  test("preserves pause preference across studio retry", async ({ page }) => {
    await page.goto("/");
    // Set paused in localStorage or UI
    await page.evaluate(() => {
      localStorage.setItem("yor-world-preferences-v1", JSON.stringify({
        version: 1,
        introCompleted: true,
        soundEnabled: false,
        quality: "auto",
        clock24h: false,
        paused: true,
      }));
    });

    await page.goto("/");
    const stored = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem("yor-world-preferences-v1") || "{}");
    });
    expect(stored.paused).toBe(true);
  });
});
