# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: local-studio-usability.spec.ts >> studio space, bounded controls and real Close at 1440x1000
- Location: tests\e2e\local-studio-usability.spec.ts:25:3

# Error details

```
Error: expect(locator).toBeFocused() failed

Locator:  getByTestId('toggle-room-controls-btn')
Expected: focused
Received: inactive
Timeout:  5000ms

Call log:
  - Expect "toBeFocused" getByTestId('toggle-room-controls-btn') with timeout 5000ms
  - waiting for getByTestId('toggle-room-controls-btn')
    14 × locator resolved to <button type="button" data-testid="toggle-room-controls-btn" class="world-module__FC9lxW__hudButton" aria-label="Open accessible studio room controls">Room</button>
       - unexpected value "inactive"

```

```yaml
- button "Open accessible studio room controls": Room
```

# Test source

```ts
  1   | import { test, expect, type Page, type Locator } from "@playwright/test";
  2   | 
  3   | async function enterHome(page: Page) {
  4   |   await page.emulateMedia({ reducedMotion: "reduce" });
  5   |   await page.goto("/?studio=1");
  6   |   const stage = page.getByTestId("world-stage-container");
  7   |   await expect(stage).toHaveAttribute("data-lifecycle-state", "HOME", { timeout: 15000 });
  8   |   await stage.scrollIntoViewIfNeeded();
  9   |   await expect.poll(async () => Number(await page.getByTestId("world-canvas").getAttribute("data-rendered-frames"))).toBeGreaterThan(1);
  10  | }
  11  | 
  12  | async function expectPointerTarget(locator: Locator) {
  13  |   const result = await locator.evaluate((node) => {
  14  |     const bounds = node.getBoundingClientRect();
  15  |     const hit = document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  16  |     return { width: bounds.width, height: bounds.height, withinViewport: bounds.x >= 0 && bounds.y >= 0 && bounds.right <= innerWidth && bounds.bottom <= innerHeight, receivesPointer: node === hit || node.contains(hit) };
  17  |   });
  18  |   expect(result.width).toBeGreaterThanOrEqual(44);
  19  |   expect(result.height).toBeGreaterThanOrEqual(44);
  20  |   expect(result.withinViewport).toBe(true);
  21  |   expect(result.receivesPointer).toBe(true);
  22  | }
  23  | 
  24  | for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }, { width: 320, height: 844 }, { width: 844, height: 390 }]) {
  25  |   test(`studio space, bounded controls and real Close at ${viewport.width}x${viewport.height}`, async ({ page }, info) => {
  26  |     await page.setViewportSize(viewport);
  27  |     await enterHome(page);
  28  |     const dimensions = await page.evaluate(() => {
  29  |       const stage = document.querySelector('[data-testid="world-stage-container"]')!.getBoundingClientRect();
  30  |       const canvas = document.querySelector('[data-testid="world-canvas"]')!.getBoundingClientRect();
  31  |       let hits = 0;
  32  |       for (let x = 0; x < 10; x++) for (let y = 0; y < 10; y++) {
  33  |         if (document.elementFromPoint(canvas.x + (x + 0.5) * canvas.width / 10, canvas.y + (y + 0.5) * canvas.height / 10)?.tagName === "CANVAS") hits++;
  34  |       }
  35  |       return { stageWidth: stage.width, canvasFraction: canvas.height / stage.height, canvasPointerFraction: hits / 100, documentWidth: document.documentElement.scrollWidth };
  36  |     });
  37  |     expect(dimensions.stageWidth).toBeGreaterThan(viewport.width * 0.7);
  38  |     expect(dimensions.canvasFraction).toBeGreaterThan(0.65);
  39  |     expect(dimensions.canvasPointerFraction).toBeGreaterThanOrEqual(0.9);
  40  |     expect(dimensions.documentWidth).toBeLessThanOrEqual(viewport.width);
  41  |     for (const id of ["greet-resident-btn", "skip-motion-btn", "toggle-room-controls-btn", "sound-toggle-btn", "exit-studio-btn", "studio-options-toggle", "diagnostics-toggle-btn"]) await expectPointerTarget(page.getByTestId(id));
  42  |     await page.screenshot({ path: info.outputPath("studio-home.png") });
  43  | 
  44  |     await page.getByTestId("studio-options-toggle").click();
  45  |     const options = page.getByTestId("studio-options-panel");
  46  |     await expect(options).toBeVisible();
  47  |     await expectPointerTarget(page.getByRole("button", { name: "Close studio options" }));
  48  |     await page.getByTestId("camera-monitor-btn").scrollIntoViewIfNeeded();
  49  |     await page.getByTestId("camera-monitor-btn").click();
  50  |     await page.getByRole("button", { name: "Close studio options" }).click();
  51  |     await expect(options).not.toBeVisible();
  52  |     await page.getByTestId("diagnostics-toggle-btn").click();
  53  |     await expect.poll(async () => JSON.parse((await page.getByTestId("world-diagnostics").textContent())!).cameraPreset).toBe("monitor");
  54  |     await page.getByTestId("diagnostics-toggle-btn").click();
  55  | 
  56  |     const opener = page.getByTestId("toggle-room-controls-btn");
  57  |     await opener.click();
  58  |     const panel = page.getByTestId("room-controls-panel");
  59  |     const close = page.getByRole("button", { name: "Close room controls panel" });
  60  |     await expect(panel).toBeVisible();
  61  |     await expect(close).toBeFocused();
  62  |     await expectPointerTarget(close);
  63  |     await panel.evaluate((node) => { node.scrollTop = node.scrollHeight; });
  64  |     await expectPointerTarget(close);
  65  |     await page.screenshot({ path: info.outputPath("room-panel-scrolled.png") });
  66  |     await close.click();
  67  |     await expect(panel).toHaveCount(0);
> 68  |     await expect(opener).toBeFocused();
      |                          ^ Error: expect(locator).toBeFocused() failed
  69  |     await opener.press("Enter");
  70  |     await expect(close).toBeFocused();
  71  |     await page.keyboard.press("Shift+Tab");
  72  |     expect(await panel.evaluate((node) => node.contains(document.activeElement))).toBe(true);
  73  |     await page.keyboard.press("Tab");
  74  |     await expect(close).toBeFocused();
  75  |     await close.press("Enter");
  76  |     await expect(panel).toHaveCount(0);
  77  |     await expect(opener).toBeFocused();
  78  |     await opener.press("Enter");
  79  |     await page.keyboard.press("Escape");
  80  |     await expect(panel).toHaveCount(0);
  81  |     await expect(opener).toBeFocused();
  82  |     await info.attach("measured-layout", { body: JSON.stringify(dimensions), contentType: "application/json" });
  83  |     await page.getByTestId("exit-studio-btn").click();
  84  |     await expect(page.getByTestId("studio-disclosure")).toBeVisible();
  85  |     await expect(page.locator("canvas")).toHaveCount(0);
  86  |   });
  87  | }
  88  | 
  89  | test("Room sound opt-in, HUD and actual runtime stay synchronized in both directions", async ({ page }) => {
  90  |   await enterHome(page);
  91  |   await page.getByTestId("diagnostics-toggle-btn").click();
  92  |   const diagnostic = page.getByTestId("world-diagnostics");
  93  |   const sound = page.getByTestId("sound-toggle-btn");
  94  |   await expect(sound).toHaveAttribute("aria-pressed", "false");
  95  |   await expect.poll(async () => JSON.parse((await diagnostic.textContent())!).soundEnabled).toBe(false);
  96  |   await page.getByTestId("toggle-room-controls-btn").click();
  97  |   const roomSound = page.getByTestId("control-toggle-sound");
  98  |   await expect(roomSound).not.toBeChecked();
  99  |   await roomSound.check();
  100 |   await expect(roomSound).toBeChecked();
  101 |   await page.getByRole("button", { name: "Close room controls panel" }).click();
  102 |   await expect(sound).toHaveAttribute("aria-pressed", "true");
  103 |   await expect.poll(async () => {
  104 |     const state = JSON.parse((await diagnostic.textContent())!);
  105 |     return [state.soundEnabled, state.experienceSnapshot.preferences.soundEnabled];
  106 |   }).toEqual([true, true]);
  107 |   await sound.click();
  108 |   await expect(sound).toHaveAttribute("aria-pressed", "false");
  109 |   await page.getByTestId("toggle-room-controls-btn").click();
  110 |   await expect(roomSound).not.toBeChecked();
  111 |   await page.getByRole("button", { name: "Close room controls panel" }).click();
  112 |   await sound.click();
  113 |   await page.getByTestId("toggle-room-controls-btn").click();
  114 |   await expect(roomSound).toBeChecked();
  115 |   await roomSound.uncheck();
  116 |   await page.getByRole("button", { name: "Close room controls panel" }).click();
  117 |   await expect(sound).toHaveAttribute("aria-pressed", "false");
  118 |   await expect.poll(async () => {
  119 |     const state = JSON.parse((await diagnostic.textContent())!);
  120 |     return [state.soundEnabled, state.experienceSnapshot.preferences.soundEnabled];
  121 |   }).toEqual([false, false]);
  122 | });
  123 | 
  124 | test("browser audio denial leaves room preference, HUD and runtime muted", async ({ page }) => {
  125 |   await page.addInitScript(() => {
  126 |     class DeniedAudioContext {
  127 |       state = "suspended";
  128 |       resume() { return Promise.reject(new Error("Synthetic browser audio denial")); }
  129 |       close() { return Promise.resolve(); }
  130 |     }
  131 |     Object.defineProperty(window, "AudioContext", { configurable: true, value: DeniedAudioContext });
  132 |   });
  133 |   await enterHome(page);
  134 |   await page.getByTestId("toggle-room-controls-btn").click();
  135 |   await page.getByTestId("control-toggle-sound").click();
  136 |   await expect(page.getByTestId("control-toggle-sound")).not.toBeChecked();
  137 |   await page.getByRole("button", { name: "Close room controls panel" }).click();
  138 |   await expect(page.getByTestId("sound-toggle-btn")).toHaveAttribute("aria-pressed", "false");
  139 |   await page.getByTestId("diagnostics-toggle-btn").click();
  140 |   await expect.poll(async () => {
  141 |     const state = JSON.parse((await page.getByTestId("world-diagnostics").textContent())!);
  142 |     return [state.soundEnabled, state.experienceSnapshot.preferences.soundEnabled];
  143 |   }).toEqual([false, false]);
  144 | });
  145 | 
  146 | test("available studio copy is honest and existing Y identity supplies the favicon", async ({ page, request }) => {
  147 |   await page.goto("/");
  148 |   await page.locator('[data-testid="studio-disclosure"] summary').click();
  149 |   await expect(page.getByTestId("studio-disclosure")).not.toContainText(/not yet available|G1|Feasibility Proof/);
  150 |   const favicon = await request.get("/favicon.ico");
  151 |   expect(favicon.status()).toBe(200);
  152 |   expect((await favicon.body()).subarray(0, 4)).toEqual(Buffer.from([0, 0, 1, 0]));
  153 |   const svg = await request.get("/icon.svg");
  154 |   expect(svg.status()).toBe(200);
  155 |   expect(await svg.text()).toContain(">Y</text>");
  156 |   await expect(page.locator('link[rel="icon"][href="/favicon.ico"]')).toHaveCount(1);
  157 | });
  158 | 
```