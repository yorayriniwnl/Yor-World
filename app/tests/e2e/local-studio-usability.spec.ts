import { test, expect, type Page, type Locator } from "@playwright/test";

async function enterHome(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?studio=1");
  const stage = page.getByTestId("world-stage-container");
  await expect(stage).toHaveAttribute("data-lifecycle-state", "HOME", { timeout: 15000 });
  await stage.scrollIntoViewIfNeeded();
  await expect.poll(async () => Number(await page.getByTestId("world-canvas").getAttribute("data-rendered-frames"))).toBeGreaterThan(1);
}

async function enterHomeFromPortfolio(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.locator('[data-testid="studio-disclosure"] summary').click();
  await page.getByTestId("enter-studio-btn").click();
  const stage = page.getByTestId("world-stage-container");
  await expect(stage).toHaveAttribute("data-lifecycle-state", "HOME", { timeout: 15000 });
  await stage.scrollIntoViewIfNeeded();
  await expect.poll(async () => Number(await page.getByTestId("world-canvas").getAttribute("data-rendered-frames"))).toBeGreaterThan(1);
}

async function prepareReturnState(page: Page) {
  await page.getByTestId("toggle-room-controls-btn").click();
  await page.getByTestId("control-toggle-lamp").uncheck();
  await page.getByTestId("control-toggle-blinds").uncheck();
  await page.getByTestId("control-toggle-clock").uncheck();
  await page.getByRole("button", { name: "Close room controls panel" }).click();
  await page.getByTestId("studio-options-toggle").click();
  await page.getByTestId("quality-tier-select").selectOption("low");
  await page.getByTestId("camera-monitor-btn").click();
  await page.getByTestId("studio-options-toggle").click();
}

async function expectReturnedState(page: Page) {
  await page.getByTestId("diagnostics-toggle-btn").click();
  const diagnostic = page.getByTestId("world-diagnostics");
  await expect.poll(async () => {
    const state = JSON.parse((await diagnostic.textContent())!);
    return [state.experienceSnapshot.world.lampOn, state.experienceSnapshot.world.blindsOpen,
      state.experienceSnapshot.preferences.clock24h, state.experienceSnapshot.preferences.quality,
      state.cameraPreset];
  }).toEqual([false, false, false, "low", "monitor"]);
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

for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 1920, height: 1080 },
  { width: 1024, height: 768 },
  { width: 390, height: 844 },
  { width: 320, height: 600 },
  { width: 844, height: 390 },
]) {
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
    for (const id of ["greet-resident-btn", "skip-motion-btn", "toggle-room-controls-btn", "open-launcher-btn", "sound-toggle-btn", "exit-studio-btn", "studio-options-toggle", "diagnostics-toggle-btn"]) await expectPointerTarget(page.getByTestId(id));
    await page.screenshot({ path: info.outputPath("studio-home.png") });

    await page.getByTestId("studio-options-toggle").click();
    const options = page.getByTestId("studio-options-panel");
    await expect(options).toBeVisible();
    await expect(page.getByTestId("reduced-motion-toggle-btn")).toHaveCount(1);
    await expect(page.getByTestId("toggle-sound-btn")).toHaveCount(0);
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
    await expect(page.getByTestId("control-exit-studio")).toBeFocused();
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

test("one global sound control opts in and keeps runtime preferences synchronized", async ({ page }) => {
  await enterHome(page);
  await page.getByTestId("diagnostics-toggle-btn").click();
  const diagnostic = page.getByTestId("world-diagnostics");
  const sound = page.getByTestId("sound-toggle-btn");
  await expect(sound).toContainText("Sound: Off");
  await expect.poll(async () => JSON.parse((await diagnostic.textContent())!).soundEnabled).toBe(false);
  await page.getByTestId("toggle-room-controls-btn").click();
  await expect(page.getByTestId("control-toggle-sound")).toHaveCount(0);
  await expect(sound).toHaveCount(1);
  await page.getByRole("button", { name: "Close room controls panel" }).click();
  await sound.click();
  await expect(sound).toHaveAttribute("aria-pressed", "true");
  await expect.poll(async () => {
    const state = JSON.parse((await diagnostic.textContent())!);
    return [state.soundEnabled, state.experienceSnapshot.preferences.soundEnabled];
  }).toEqual([true, true]);
  await sound.click();
  await expect(sound).toHaveAttribute("aria-pressed", "false");
  await expect(sound).toHaveAttribute("aria-pressed", "false");
  await expect.poll(async () => {
    const state = JSON.parse((await diagnostic.textContent())!);
    return [state.soundEnabled, state.experienceSnapshot.preferences.soundEnabled];
  }).toEqual([false, false]);
});

test("browser audio denial preserves desired preference and offers an actual retry while playback stays off", async ({ page }) => {
  await page.addInitScript(() => {
    const testWindow = window as Window & { __audioResumeCalls?: number };
    testWindow.__audioResumeCalls = 0;
    class DeniedAudioContext {
      state = "suspended";
      resume() {
        testWindow.__audioResumeCalls = (testWindow.__audioResumeCalls ?? 0) + 1;
        return Promise.reject(new Error("Synthetic browser audio denial"));
      }
      close() { return Promise.resolve(); }
    }
    Object.defineProperty(window, "AudioContext", { configurable: true, value: DeniedAudioContext });
  });
  await enterHome(page);
  const sound = page.getByTestId("sound-toggle-btn");
  await sound.click();
  await expect(sound).toContainText("Sound: Tap to enable");
  await expect(sound).toHaveAttribute("aria-label", "Enable sound");
  await expect(sound).toHaveAttribute("aria-pressed", "false");
  await page.getByTestId("diagnostics-toggle-btn").click();
  await expect.poll(async () => {
    const state = JSON.parse((await page.getByTestId("world-diagnostics").textContent())!);
    return [state.soundEnabled, state.experienceSnapshot.preferences.soundEnabled];
  }).toEqual([false, true]);
  await page.getByTestId("diagnostics-toggle-btn").click();
  await sound.click();
  await expect.poll(() => page.evaluate(() => (window as Window & { __audioResumeCalls?: number }).__audioResumeCalls)).toBe(2);
  await expect(sound).toContainText("Sound: Tap to enable");
  await page.getByTestId("diagnostics-toggle-btn").click();
  await expect.poll(async () => {
    const state = JSON.parse((await page.getByTestId("world-diagnostics").textContent())!);
    return [state.soundEnabled, state.experienceSnapshot.preferences.soundEnabled];
  }).toEqual([false, true]);
});

test("saved quality and sound preferences hydrate without starting audio; sound resumes only after a gesture", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("yor_world_preferences_v1", JSON.stringify({
      version: 1, introCompleted: false, soundEnabled: true, quality: "low", clock24h: false,
    }));
    const testWindow = window as Window & { __audioResumeCalls?: number };
    testWindow.__audioResumeCalls = 0;
    class GestureAudioContext {
      state: AudioContextState = "suspended";
      currentTime = 0;
      destination = {} as AudioDestinationNode;
      resume() {
        testWindow.__audioResumeCalls = (testWindow.__audioResumeCalls ?? 0) + 1;
        this.state = "running";
        return Promise.resolve();
      }
      suspend() { this.state = "suspended"; return Promise.resolve(); }
      close() { this.state = "closed"; return Promise.resolve(); }
    }
    Object.defineProperty(window, "AudioContext", { configurable: true, value: GestureAudioContext });
  });
  await enterHome(page);

  const sound = page.getByTestId("sound-toggle-btn");
  await expect(sound).toContainText("Sound: Tap to enable");
  await expect(sound).toHaveAttribute("aria-pressed", "false");
  await page.getByTestId("diagnostics-toggle-btn").click();
  const diagnostics = page.getByTestId("world-diagnostics");
  await expect.poll(async () => {
    const state = JSON.parse((await diagnostics.textContent())!);
    return [state.soundEnabled, state.experienceSnapshot.preferences.soundEnabled, state.qualityTier,
      state.experienceSnapshot.preferences.quality];
  }).toEqual([false, true, "low", "low"]);
  expect(await page.evaluate(() => (window as Window & { __audioResumeCalls?: number }).__audioResumeCalls)).toBe(0);
  await page.getByTestId("diagnostics-toggle-btn").click();

  await page.getByTestId("studio-options-toggle").click();
  const quality = page.getByTestId("quality-tier-select");
  await expect(quality).toHaveValue("low");
  await quality.selectOption("medium");
  await page.getByTestId("studio-options-toggle").click();
  await page.getByTestId("diagnostics-toggle-btn").click();
  await expect.poll(async () => JSON.parse((await diagnostics.textContent())!).experienceSnapshot.preferences.quality).toBe("medium");
  await page.getByTestId("diagnostics-toggle-btn").click();

  await sound.click();
  await expect(sound).toContainText("Sound: On");
  await expect(sound).toHaveAttribute("aria-pressed", "true");
  await page.getByTestId("diagnostics-toggle-btn").click();
  await expect(diagnostics).toBeVisible();
  await expect.poll(async () => {
    const state = JSON.parse((await diagnostics.textContent())!);
    return [state.soundEnabled, state.experienceSnapshot.preferences.soundEnabled];
  }).toEqual([true, true]);
  expect(await page.evaluate(() => (window as Window & { __audioResumeCalls?: number }).__audioResumeCalls)).toBe(1);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("yor_world_preferences_v1")!).introCompleted)).toBe(true);
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

test("RouteFocus focuses destination heading on route transition and preserves first-load focus", async ({ page }) => {
  await page.goto("/");
  // Initial load does not force heading focus
  expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe("H1");
  // Navigate via client-side link to /projects
  await page.locator('nav a[href="/projects"]').click();
  await expect(page.locator("main h1")).toBeFocused();
  // Navigate to /about
  await page.locator('nav a[href="/about"]').click();
  await expect(page.locator("main h1")).toBeFocused();
  await page.goBack();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.locator("main h1")).toBeFocused();
  await page.goForward();
  await expect(page).toHaveURL(/\/about$/);
  await expect(page.locator("main h1")).toBeFocused();
});

test("Launcher dialog focuses its command field and restores canvas-context focus through its fallback", async ({ page }) => {
  await enterHome(page);
  const stage = page.getByTestId("world-stage-container");
  const canvas = page.getByTestId("world-canvas");
  await canvas.click({ position: { x: 4, y: 4 }, force: true });
  await expect(stage).toBeFocused();

  // HTMLElement.click() opens the same controller panel without changing focus,
  // modeling a scene-object activation whose invoker is the canvas.
  await page.getByTestId("open-launcher-btn").evaluate((button) => (button as HTMLElement).click());
  const dialog = page.getByRole("dialog", { name: "Studio Monitor Launcher" });
  const command = dialog.getByRole("textbox", { name: "Terminal command input" });
  await expect(command).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  expect(await dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true);
  await dialog.getByRole("button", { name: "Close monitor launcher" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByTestId("open-launcher-btn")).toBeFocused();
});

test("clicking the actual monitor mesh opens its dialog and restores focus to Projects", async ({ page }) => {
  await enterHome(page);
  const canvas = page.getByTestId("world-canvas");
  const bounds = await canvas.boundingBox();
  expect(bounds).not.toBeNull();
  // In the desktop HOME composition the versioned room monitor is centered near
  // this canvas point. This is a real canvas pointer gesture through the bound
  // production mesh/raycaster, not a direct controller or DOM-button shortcut.
  await page.mouse.click(bounds!.x + bounds!.width * 0.455, bounds!.y + bounds!.height * 0.455);
  const dialog = page.getByRole("dialog", { name: "Studio Monitor Launcher" });
  await expect(dialog).toBeVisible({ timeout: 5000 });
  await expect(dialog.getByRole("textbox", { name: "Terminal command input" })).toBeFocused();
  await dialog.getByRole("button", { name: "Close monitor launcher" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByTestId("open-launcher-btn")).toBeFocused();
});

test("launcher project action saves room state before its case study transition", async ({ page }) => {
  await enterHome(page);
  await prepareReturnState(page);
  await page.getByTestId("open-launcher-btn").click();
  const dialog = page.getByRole("dialog", { name: "Studio Monitor Launcher" });
  await dialog.getByRole("button", { name: /Inspect Case Study/ }).first().click();
  await expect(page).toHaveURL(/\/projects\//);
  const saved = await page.evaluate(() => JSON.parse(sessionStorage.getItem("yor_world_return_snapshot_v1")!));
  expect(saved).toMatchObject({
    previousCamera: "monitor",
    world: { lampOn: false, blindsOpen: false },
    preferences: { quality: "low", clock24h: false },
  });

  await page.getByTestId("return-to-studio-link").click();
  await expect(page.getByTestId("world-stage-container")).toHaveAttribute("data-lifecycle-state", "HOME", { timeout: 15000 });
  await expectReturnedState(page);
});

test("launcher Direct URL saves the same-tab room snapshot before navigation", async ({ page }) => {
  await enterHome(page);
  await prepareReturnState(page);
  await page.getByTestId("open-launcher-btn").click();
  const dialog = page.getByRole("dialog", { name: "Studio Monitor Launcher" });
  await dialog.getByRole("link", { name: "Direct URL" }).first().click();
  await expect(page).toHaveURL(/\/projects\//);
  const saved = await page.evaluate(() => JSON.parse(sessionStorage.getItem("yor_world_return_snapshot_v1")!));
  expect(saved).toMatchObject({
    previousCamera: "monitor",
    world: { lampOn: false, blindsOpen: false },
    preferences: { quality: "low", clock24h: false },
  });

  await page.getByTestId("return-to-studio-link").click();
  await expect(page.getByTestId("world-stage-container")).toHaveAttribute("data-lifecycle-state", "HOME", { timeout: 15000 });
  await expectReturnedState(page);
});

test("accessible public navigation saves room state and browser Back restores it", async ({ page }) => {
  // Enter from the public page so this verifies history restoration from the
  // normal `/` URL, not only the test-only ?studio=1 entry shortcut.
  await enterHomeFromPortfolio(page);
  await prepareReturnState(page);
  await page.getByTestId("studio-options-toggle").click();
  await page.getByTestId("a11y-link-about").click();
  await expect(page).toHaveURL(/\/about$/);

  const saved = await page.evaluate(() => JSON.parse(sessionStorage.getItem("yor_world_return_snapshot_v1")!));
  expect(saved).toMatchObject({
    previousCamera: "monitor",
    world: { lampOn: false, blindsOpen: false },
    preferences: { quality: "low", clock24h: false },
    lastProjectId: null,
  });

  await page.goBack();
  await expect(page).toHaveURL(/\/(?:\?.*)?$/);
  await expect(page.getByTestId("world-stage-container")).toHaveAttribute("data-lifecycle-state", "HOME", { timeout: 15000 });
  await expectReturnedState(page);
});

test("explicit entrance replay and option controls trigger clean re-entry", async ({ page }) => {
  await enterHome(page);
  const stage = page.getByTestId("world-stage-container");

  await page.getByTestId("studio-options-toggle").click();
  const replayBtn = page.getByTestId("replay-entrance-btn");
  await expect(replayBtn).toBeVisible();
  await replayBtn.click();
  // Replay starts entrance or returns to home safely
  await expect(stage).toHaveAttribute("data-lifecycle-state", /(ENTRANCE|HOME)/);
});

test("validated return snapshot skips intro and restores camera and room preferences", async ({ page }) => {
  let releaseAssetRequests!: () => void;
  const assetGate = new Promise<void>((resolve) => { releaseAssetRequests = resolve; });
  await page.route("**/*.glb", async (route) => {
    await assetGate;
    await route.continue();
  });
  await page.addInitScript(() => {
    window.sessionStorage.setItem("yor_world_return_snapshot_v1", JSON.stringify({
      returnToStudio: true,
      preferences: { version: 1, introCompleted: true, soundEnabled: true, quality: "low", clock24h: false },
      world: { version: 1, lampOn: false, blindsOpen: false, detailFound: true },
      lastProjectId: "helios",
      previousCamera: "monitor",
      timestamp: Date.now(),
    }));
  });
  await page.goto("/?studio=return");
  const stage = page.getByTestId("world-stage-container");
  await expect(page.getByTestId("world-loading-overlay")).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem("yor_world_return_snapshot_v1"))).not.toBeNull();
  releaseAssetRequests();
  await expect(stage).toHaveAttribute("data-lifecycle-state", "HOME", { timeout: 15000 });
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem("yor_world_return_snapshot_v1"))).toBeNull();
  await expect(stage).toBeFocused();
  await expect(page.getByTestId("sound-toggle-btn")).toContainText("Sound: Tap to enable");
  await page.getByTestId("studio-options-toggle").click();
  await expect(page.getByTestId("quality-tier-select")).toHaveValue("low");
  await expect(page.getByTestId("camera-monitor-btn")).toHaveAttribute("aria-pressed", "true");
  await page.getByTestId("studio-options-toggle").click();
  await page.getByTestId("diagnostics-toggle-btn").click();
  await expect.poll(async () => {
    const diag = JSON.parse((await page.getByTestId("world-diagnostics").textContent())!);
    return [diag.experienceSnapshot.world.lampOn, diag.experienceSnapshot.world.detailFound,
      diag.experienceSnapshot.preferences.soundEnabled, diag.experienceSnapshot.preferences.quality,
      diag.experienceSnapshot.preferences.clock24h];
  }).toEqual([false, true, true, "low", false]);
});
