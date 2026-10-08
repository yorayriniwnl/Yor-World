import { test, expect, type Page, type Locator } from "@playwright/test";

async function enterHome(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?studio=1");
  const stage = page.getByTestId("world-stage-container");
  await expect(stage).toHaveAttribute("data-lifecycle-state", "HOME", { timeout: 15000 });
  await stage.scrollIntoViewIfNeeded();
  await expect.poll(async () => Number(await page.getByTestId("world-canvas").getAttribute("data-rendered-frames"))).toBeGreaterThan(1);
}

async function expectPointerTarget(locator: Locator) {
  const result = await locator.evaluate((node) => {
    const bounds = node.getBoundingClientRect();
    const hit = document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    return { width: bounds.width, height: bounds.height, withinViewport: bounds.x >= 0 && bounds.y >= 0 && bounds.right <= innerWidth && bounds.bottom <= innerHeight, receivesPointer: node === hit || node.contains(hit) };
  });
  expect(result.width).toBeGreaterThanOrEqual(44);
  expect(result.height).toBeGreaterThanOrEqual(44);
  expect(result.withinViewport).toBe(true);
  expect(result.receivesPointer).toBe(true);
}

for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }, { width: 320, height: 844 }, { width: 844, height: 390 }]) {
  test(`studio space, bounded controls and real Close at ${viewport.width}x${viewport.height}`, async ({ page }, info) => {
    await page.setViewportSize(viewport);
    await enterHome(page);
    const dimensions = await page.evaluate(() => {
      const stage = document.querySelector('[data-testid="world-stage-container"]')!.getBoundingClientRect();
      const canvas = document.querySelector('[data-testid="world-canvas"]')!.getBoundingClientRect();
      let hits = 0;
      for (let x = 0; x < 10; x++) for (let y = 0; y < 10; y++) {
        if (document.elementFromPoint(canvas.x + (x + 0.5) * canvas.width / 10, canvas.y + (y + 0.5) * canvas.height / 10)?.tagName === "CANVAS") hits++;
      }
      return { stageWidth: stage.width, canvasFraction: canvas.height / stage.height, canvasPointerFraction: hits / 100, documentWidth: document.documentElement.scrollWidth };
    });
    expect(dimensions.stageWidth).toBeGreaterThan(viewport.width * 0.7);
    expect(dimensions.canvasFraction).toBeGreaterThan(0.65);
    expect(dimensions.canvasPointerFraction).toBeGreaterThanOrEqual(0.9);
    expect(dimensions.documentWidth).toBeLessThanOrEqual(viewport.width);
    for (const id of ["greet-resident-btn", "skip-motion-btn", "toggle-room-controls-btn", "sound-toggle-btn", "exit-studio-btn", "studio-options-toggle", "diagnostics-toggle-btn"]) await expectPointerTarget(page.getByTestId(id));
    await page.screenshot({ path: info.outputPath("studio-home.png") });

    await page.getByTestId("studio-options-toggle").click();
    const options = page.getByTestId("studio-options-panel");
    await expect(options).toBeVisible();
    await expectPointerTarget(page.getByRole("button", { name: "Close studio options" }));
    await page.getByTestId("camera-monitor-btn").scrollIntoViewIfNeeded();
    await page.getByTestId("camera-monitor-btn").click();
    await page.getByRole("button", { name: "Close studio options" }).click();
    await expect(options).not.toBeVisible();
    await page.getByTestId("diagnostics-toggle-btn").click();
    await expect.poll(async () => JSON.parse((await page.getByTestId("world-diagnostics").textContent())!).cameraPreset).toBe("monitor");
    await page.getByTestId("diagnostics-toggle-btn").click();

    const opener = page.getByTestId("toggle-room-controls-btn");
    await opener.click();
    const panel = page.getByTestId("room-controls-panel");
    const close = page.getByRole("button", { name: "Close room controls panel" });
    await expect(panel).toBeVisible();
    await expect(close).toBeFocused();
    await expectPointerTarget(close);
    await panel.evaluate((node) => { node.scrollTop = node.scrollHeight; });
    await expectPointerTarget(close);
    await page.screenshot({ path: info.outputPath("room-panel-scrolled.png") });
    await close.click();
    await expect(panel).toHaveCount(0);
    await expect(opener).toBeFocused();
    await opener.press("Enter");
    await expect(close).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    expect(await panel.evaluate((node) => node.contains(document.activeElement))).toBe(true);
    await page.keyboard.press("Tab");
    await expect(close).toBeFocused();
    await close.press("Enter");
    await expect(panel).toHaveCount(0);
    await expect(opener).toBeFocused();
    await opener.press("Enter");
    await page.keyboard.press("Escape");
    await expect(panel).toHaveCount(0);
    await expect(opener).toBeFocused();
    await info.attach("measured-layout", { body: JSON.stringify(dimensions), contentType: "application/json" });
    await page.getByTestId("exit-studio-btn").click();
    await expect(page.getByTestId("studio-disclosure")).toBeVisible();
    await expect(page.locator("canvas")).toHaveCount(0);
  });
}

test("Room sound opt-in, HUD and actual runtime stay synchronized in both directions", async ({ page }) => {
  await enterHome(page);
  await page.getByTestId("diagnostics-toggle-btn").click();
  const diagnostic = page.getByTestId("world-diagnostics");
  const sound = page.getByTestId("sound-toggle-btn");
  await expect(sound).toContainText("Sound: Off");
  await expect.poll(async () => JSON.parse((await diagnostic.textContent())!).soundEnabled).toBe(false);
  await page.getByTestId("toggle-room-controls-btn").click();
  const roomSound = page.getByTestId("control-toggle-sound");
  await expect(roomSound).not.toBeChecked();
  await roomSound.check();
  await expect(roomSound).toBeChecked();
  await expect.poll(async () => {
    const state = JSON.parse((await diagnostic.textContent())!);
    return [state.soundEnabled, state.experienceSnapshot.preferences.soundEnabled];
  }).toEqual([true, true]);
  await page.getByRole("button", { name: "Close room controls panel" }).click();
  await expect(sound).toHaveAttribute("aria-pressed", "true");
  await expect.poll(async () => {
    const state = JSON.parse((await diagnostic.textContent())!);
    return [state.soundEnabled, state.experienceSnapshot.preferences.soundEnabled];
  }).toEqual([true, true]);
  await sound.click();
  await expect(sound).toHaveAttribute("aria-pressed", "false");
  await page.getByTestId("toggle-room-controls-btn").click();
  await expect(roomSound).not.toBeChecked();
  await page.getByRole("button", { name: "Close room controls panel" }).click();
  await sound.click();
  await page.getByTestId("toggle-room-controls-btn").click();
  await expect(roomSound).toBeChecked();
  await roomSound.uncheck();
  await page.getByRole("button", { name: "Close room controls panel" }).click();
  await expect(sound).toHaveAttribute("aria-pressed", "false");
  await expect.poll(async () => {
    const state = JSON.parse((await diagnostic.textContent())!);
    return [state.soundEnabled, state.experienceSnapshot.preferences.soundEnabled];
  }).toEqual([false, false]);
});

test("browser audio denial leaves room preference, HUD and runtime muted", async ({ page }) => {
  await page.addInitScript(() => {
    class DeniedAudioContext {
      state = "suspended";
      resume() { return Promise.reject(new Error("Synthetic browser audio denial")); }
      close() { return Promise.resolve(); }
    }
    Object.defineProperty(window, "AudioContext", { configurable: true, value: DeniedAudioContext });
  });
  await enterHome(page);
  await page.getByTestId("toggle-room-controls-btn").click();
  await page.getByTestId("control-toggle-sound").click();
  await expect(page.getByTestId("control-toggle-sound")).not.toBeChecked();
  await page.getByRole("button", { name: "Close room controls panel" }).click();
  await expect(page.getByTestId("sound-toggle-btn")).toHaveAttribute("aria-pressed", "false");
  await page.getByTestId("diagnostics-toggle-btn").click();
  await expect.poll(async () => {
    const state = JSON.parse((await page.getByTestId("world-diagnostics").textContent())!);
    return [state.soundEnabled, state.experienceSnapshot.preferences.soundEnabled];
  }).toEqual([false, false]);
});

test("available studio copy is honest and existing Y identity supplies the favicon", async ({ page, request }) => {
  await page.goto("/");
  await page.locator('[data-testid="studio-disclosure"] summary').click();
  await expect(page.getByTestId("studio-disclosure")).not.toContainText(/not yet available|G1|Feasibility Proof/);
  const favicon = await request.get("/favicon.ico");
  expect(favicon.status()).toBe(200);
  expect((await favicon.body()).subarray(0, 4)).toEqual(Buffer.from([0, 0, 1, 0]));
  const svg = await request.get("/icon.svg");
  expect(svg.status()).toBe(200);
  expect(await svg.text()).toContain(">Y</text>");
  await expect(page.locator('link[rel="icon"][href="/favicon.ico"]')).toHaveCount(1);
});
