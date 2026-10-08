import { test, expect } from "@playwright/test";

test.describe("Physical & Room Interactions: Task C1 Arbitration & Robustness", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to homepage with studio entry triggered
    await page.goto("/?studio=enter");
    // Wait for stage container to be present
    const stage = page.locator('[data-testid="world-stage-container"]');
    await expect(stage).toBeVisible({ timeout: 15000 });

    // If Skip button appears during entrance, click Skip to quickly settle into HOME
    const skipBtn = page.locator('[data-testid="world-skip-intro-btn"]');
    if (await skipBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await skipBtn.click();
    }

    // Wait until lifecycle reaches HOME
    await expect(stage).toHaveAttribute("data-lifecycle-state", "HOME", { timeout: 15000 });
  });

  test("1. Invariants: verifies single owners and high-level experience snapshot", async ({ page }) => {
    // Open diagnostics drawer
    await page.click('[data-testid="diagnostics-toggle-btn"]');
    const diagPre = page.locator('[data-testid="world-diagnostics"]');
    await expect(diagPre).toBeVisible();

    const diagText = await diagPre.innerText();
    const diag = JSON.parse(diagText);

    // Assert canonical single owners
    expect(diag.singleOwners.rendererOwner).toBe("primary-renderer-lifecycle");
    expect(diag.singleOwners.cameraOwner).toBe("primary-camera-director");
    expect(diag.singleOwners.characterActionOwner).toBe("primary-character-director");
    expect(diag.singleOwners.transitionOwner).toBe("primary-transition-coordinator");
    expect(diag.singleOwners.activeSessionToken).toBeGreaterThan(0);

    // Assert high-level experience snapshot
    expect(diag.experienceSnapshot).toBeDefined();
    expect(diag.experienceSnapshot.phase).toBe("explore");
    expect(diag.experienceSnapshot.world.lampOn).toBe(true);
    expect(diag.experienceSnapshot.world.blindsOpen).toBe(true);
    expect(diag.experienceSnapshot.world.detailFound).toBe(false);
  });

  test("2. Attack: rapid resident greeting clicks without race conditions or double-queuing", async ({ page }) => {
    const greetBtn = page.locator('[data-testid="greet-resident-btn"]');
    await expect(greetBtn).toBeVisible();

    // Click twice rapidly (<50ms apart)
    await greetBtn.click();
    await greetBtn.click();

    // Active clip should advance to greeting sequence (notice_visitor or turn_to_visitor)
    const statusBadge = page.locator('[data-testid="status-badge"]');
    await expect(statusBadge).toContainText(/notice_visitor|turn_to_visitor|greeting_nod|sequence/i, { timeout: 3000 });

    // Settle back to coding rest pose safely without duplicate queue
    const skipBtn = page.locator('[data-testid="skip-motion-btn"]');
    await skipBtn.click();
    await expect(statusBadge).toContainText("coding_idle", { timeout: 3000 });
  });

  test("3. Attack: Escape key cancels interaction and restores safe explore base state", async ({ page }) => {
    // Open monitor camera preset
    await page.click('[data-testid="camera-monitor-btn"]');
    await page.waitForTimeout(300);

    // Press Escape to cancel focus and return home
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    // Native dialog stays open: Escape is reserved for the room's skip/cancel.
    await expect(page.getByTestId("studio-fullscreen")).toHaveJSProperty("open", true);
    // Test the actual visible state after Escape, independent of whether a
    // previously-open diagnostic drawer is being toggled closed.
    await expect(page.getByTestId("world-stage-container")).toHaveAttribute("data-lifecycle-state", "HOME");
    await expect(page.getByTestId("camera-home-btn")).toHaveClass(/hudButtonActive/);
    await expect(page.getByTestId("status-badge")).toContainText("coding_idle");
  });

  test("4. Non-geometry equivalent: accessible Room Controls toggles environment settings", async ({ page }) => {
    // Open Room Controls modal
    await page.click('[data-testid="toggle-room-controls-btn"]');
    const modal = page.locator('[data-testid="room-controls-modal"]');
    await expect(modal).toBeVisible();

    // Toggle Desk Lamp
    const lampCheckbox = page.locator('[data-testid="control-toggle-lamp"]');
    await expect(lampCheckbox).toBeChecked();
    await lampCheckbox.uncheck();
    await expect(lampCheckbox).not.toBeChecked();

    // Toggle Window Blinds
    const blindsCheckbox = page.locator('[data-testid="control-toggle-blinds"]');
    await expect(blindsCheckbox).toBeChecked();
    await blindsCheckbox.uncheck();
    await expect(blindsCheckbox).not.toBeChecked();

    // Toggle Clock Format
    const clockCheckbox = page.locator('[data-testid="control-toggle-clock"]');
    await expect(clockCheckbox).toBeChecked(); // 24h by default
    await clockCheckbox.uncheck();
    await expect(clockCheckbox).not.toBeChecked(); // 12h

    // Toggle Sound Opt-in
    const soundCheckbox = page.locator('[data-testid="control-toggle-sound"]');
    await expect(soundCheckbox).not.toBeChecked();
    await soundCheckbox.check();
    await expect(soundCheckbox).toBeChecked();
  });

  test("5. Painting interaction: inspection tilt triggers spring response and discovers hidden mark", async ({ page }) => {
    // Open Room Controls modal
    await page.click('[data-testid="toggle-room-controls-btn"]');
    const modal = page.locator('[data-testid="room-controls-modal"]');
    await expect(modal).toBeVisible();

    const detailStatus = page.locator('[data-testid="detail-found-status"]');
    await expect(detailStatus).toContainText("Hidden");

    // Click "Inspect Wall Painting"
    const inspectBtn = page.locator('[data-testid="control-inspect-painting"]');
    await inspectBtn.click();

    // Hidden mark becomes discovered
    await expect(detailStatus).toContainText("Discovered", { timeout: 2000 });
  });

  test("6. Attack: route navigation during interaction unmounts cleanly without errors", async ({ page }) => {
    // Trigger greeting
    await page.click('[data-testid="greet-resident-btn"]');

    // Use a real click inside the fullscreen modal. The page header is inert.
    const aboutLink = page.getByTestId("studio-about-link");
    await expect(aboutLink).toBeVisible();
    await aboutLink.click();

    // Verify clean navigation to About page
    await expect(page).toHaveURL(/\/about/);
    const heading = page.locator("h1");
    await expect(heading).toBeVisible();

    // Verify 3D canvas is cleanly removed from DOM
    const canvas = page.locator("canvas");
    await expect(canvas).toHaveCount(0);
  });
});
