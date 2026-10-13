# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: local-studio-usability.spec.ts >> studio space, bounded controls and real Close at 320x600
- Location: tests\e2e\local-studio-usability.spec.ts:32:3

# Error details

```
Error: locator.click: Target page, context or browser has been closed
Browser logs:

<launching> C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe --disable-field-trial-config --disable-background-networking --disable-background-timer-throttling --disable-backgrounding-occluded-windows --disable-back-forward-cache --disable-breakpad --disable-client-side-phishing-detection --disable-component-extensions-with-background-pages --disable-component-update --no-default-browser-check --disable-default-apps --disable-dev-shm-usage --disable-edgeupdater --disable-extensions --disable-features=AvoidUnnecessaryBeforeUnloadCheckSync,DestroyProfileOnBrowserClose,DialMediaRouteProvider,GlobalMediaControls,HttpsUpgrades,LensOverlay,MediaRouter,PaintHolding,ThirdPartyStoragePartitioning,BlockOriginHeaderModificationOnRedirect,Translate,AutoDeElevate,OptimizationHints,msForceBrowserSignIn,msEdgeUpdateLaunchServicesPreferredVersion --enable-features=CDPScreenshotNewSurface --allow-pre-commit-input --disable-hang-monitor --disable-ipc-flooding-protection --disable-popup-blocking --disable-prompt-on-repost --disable-renderer-backgrounding --disable-updater-scheduler --force-color-profile=srgb --metrics-recording-only --no-first-run --password-store=basic --use-mock-keychain --no-service-autorun --export-tagged-pdf --disable-search-engine-choice-screen --unsafely-disable-devtools-self-xss-warnings --edge-skip-compat-layer-relaunch --disable-infobars --disable-search-engine-choice-screen --disable-sync --enable-unsafe-swiftshader --headless --hide-scrollbars --mute-audio --blink-settings=primaryHoverType=2,availableHoverTypes=2,primaryPointerType=4,availablePointerTypes=4 --no-sandbox --user-data-dir=C:\Users\yoray\AppData\Local\Temp\playwright_chromiumdev_profile-74qwtA --remote-debugging-pipe --no-startup-window
<launched> pid=38408
Call log:
  - waiting for getByRole('button', { name: 'Close studio options' })
    - locator resolved to <button type="button" aria-label="Close studio options" class="world-module__FC9lxW__hudButton">Close</button>
  - attempting click action
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling

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
  24  | for (const viewport of [
  25  |   { width: 1440, height: 1000 },
  26  |   { width: 1920, height: 1080 },
  27  |   { width: 1024, height: 768 },
  28  |   { width: 390, height: 844 },
  29  |   { width: 320, height: 600 },
  30  |   { width: 844, height: 390 },
  31  | ]) {
  32  |   test(`studio space, bounded controls and real Close at ${viewport.width}x${viewport.height}`, async ({ page }, info) => {
  33  |     await page.setViewportSize(viewport);
  34  |     await enterHome(page);
  35  |     const dimensions = await page.evaluate(() => {
  36  |       const stage = document.querySelector('[data-testid="world-stage-container"]')!.getBoundingClientRect();
  37  |       const canvas = document.querySelector('[data-testid="world-canvas"]')!.getBoundingClientRect();
  38  |       let hits = 0;
  39  |       for (let x = 0; x < 10; x++) for (let y = 0; y < 10; y++) {
  40  |         if (document.elementFromPoint(canvas.x + (x + 0.5) * canvas.width / 10, canvas.y + (y + 0.5) * canvas.height / 10)?.tagName === "CANVAS") hits++;
  41  |       }
  42  |       return { stageWidth: stage.width, canvasFraction: canvas.height / stage.height, canvasPointerFraction: hits / 100, documentWidth: document.documentElement.scrollWidth };
  43  |     });
  44  |     expect(dimensions.stageWidth).toBeGreaterThan(viewport.width * 0.7);
  45  |     expect(dimensions.canvasFraction).toBeGreaterThan(0.65);
  46  |     expect(dimensions.canvasPointerFraction).toBeGreaterThanOrEqual(0.9);
  47  |     expect(dimensions.documentWidth).toBeLessThanOrEqual(viewport.width);
  48  |     for (const id of ["greet-resident-btn", "skip-motion-btn", "toggle-room-controls-btn", "open-launcher-btn", "sound-toggle-btn", "exit-studio-btn", "studio-options-toggle", "diagnostics-toggle-btn"]) await expectPointerTarget(page.getByTestId(id));
  49  |     await page.screenshot({ path: info.outputPath("studio-home.png") });
  50  | 
  51  |     await page.getByTestId("studio-options-toggle").click();
  52  |     const options = page.getByTestId("studio-options-panel");
  53  |     await expect(options).toBeVisible();
  54  |     await expect(page.getByTestId("reduced-motion-toggle-btn")).toHaveCount(1);
  55  |     await expect(page.getByTestId("toggle-sound-btn")).toHaveCount(0);
  56  |     await expectPointerTarget(page.getByRole("button", { name: "Close studio options" }));
  57  |     await page.getByTestId("camera-monitor-btn").scrollIntoViewIfNeeded();
  58  |     await page.getByTestId("camera-monitor-btn").click();
> 59  |     await page.getByRole("button", { name: "Close studio options" }).click();
      |                                                                      ^ Error: locator.click: Target page, context or browser has been closed
  60  |     await expect(options).not.toBeVisible();
  61  |     await page.getByTestId("diagnostics-toggle-btn").click();
  62  |     await expect.poll(async () => JSON.parse((await page.getByTestId("world-diagnostics").textContent())!).cameraPreset).toBe("monitor");
  63  |     await page.getByTestId("diagnostics-toggle-btn").click();
  64  | 
  65  |     const opener = page.getByTestId("toggle-room-controls-btn");
  66  |     await opener.click();
  67  |     const panel = page.getByTestId("room-controls-panel");
  68  |     const close = page.getByRole("button", { name: "Close room controls panel" });
  69  |     await expect(panel).toBeVisible();
  70  |     await expect(close).toBeFocused();
  71  |     await expectPointerTarget(close);
  72  |     await panel.evaluate((node) => { node.scrollTop = node.scrollHeight; });
  73  |     await expectPointerTarget(close);
  74  |     await page.screenshot({ path: info.outputPath("room-panel-scrolled.png") });
  75  |     await close.click();
  76  |     await expect(panel).toHaveCount(0);
  77  |     await expect(opener).toBeFocused();
  78  |     await opener.press("Enter");
  79  |     await expect(close).toBeFocused();
  80  |     await page.keyboard.press("Shift+Tab");
  81  |     await expect(page.getByTestId("control-exit-studio")).toBeFocused();
  82  |     await page.keyboard.press("Tab");
  83  |     await expect(close).toBeFocused();
  84  |     await close.press("Enter");
  85  |     await expect(panel).toHaveCount(0);
  86  |     await expect(opener).toBeFocused();
  87  |     await opener.press("Enter");
  88  |     await page.keyboard.press("Escape");
  89  |     await expect(panel).toHaveCount(0);
  90  |     await expect(opener).toBeFocused();
  91  |     await info.attach("measured-layout", { body: JSON.stringify(dimensions), contentType: "application/json" });
  92  |     await page.getByTestId("exit-studio-btn").click();
  93  |     await expect(page.getByTestId("studio-disclosure")).toBeVisible();
  94  |     await expect(page.locator("canvas")).toHaveCount(0);
  95  |   });
  96  | }
  97  | 
  98  | test("one global sound control opts in and keeps runtime preferences synchronized", async ({ page }) => {
  99  |   await enterHome(page);
  100 |   await page.getByTestId("diagnostics-toggle-btn").click();
  101 |   const diagnostic = page.getByTestId("world-diagnostics");
  102 |   const sound = page.getByTestId("sound-toggle-btn");
  103 |   await expect(sound).toContainText("Sound: Off");
  104 |   await expect.poll(async () => JSON.parse((await diagnostic.textContent())!).soundEnabled).toBe(false);
  105 |   await page.getByTestId("toggle-room-controls-btn").click();
  106 |   await expect(page.getByTestId("control-toggle-sound")).toHaveCount(0);
  107 |   await expect(sound).toHaveCount(1);
  108 |   await page.getByRole("button", { name: "Close room controls panel" }).click();
  109 |   await sound.click();
  110 |   await expect(sound).toHaveAttribute("aria-pressed", "true");
  111 |   await expect.poll(async () => {
  112 |     const state = JSON.parse((await diagnostic.textContent())!);
  113 |     return [state.soundEnabled, state.experienceSnapshot.preferences.soundEnabled];
  114 |   }).toEqual([true, true]);
  115 |   await sound.click();
  116 |   await expect(sound).toHaveAttribute("aria-pressed", "false");
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
  134 |   await page.getByTestId("sound-toggle-btn").click();
  135 |   await expect(page.getByTestId("sound-toggle-btn")).toHaveAttribute("aria-pressed", "false");
  136 |   await page.getByTestId("diagnostics-toggle-btn").click();
  137 |   await expect.poll(async () => {
  138 |     const state = JSON.parse((await page.getByTestId("world-diagnostics").textContent())!);
  139 |     return [state.soundEnabled, state.experienceSnapshot.preferences.soundEnabled];
  140 |   }).toEqual([false, false]);
  141 | });
  142 | 
  143 | test("saved quality and sound preferences hydrate without starting audio; sound resumes only after a gesture", async ({ page }) => {
  144 |   await page.addInitScript(() => {
  145 |     localStorage.setItem("yor_world_preferences_v1", JSON.stringify({
  146 |       version: 1, introCompleted: false, soundEnabled: true, quality: "low", clock24h: false,
  147 |     }));
  148 |     const testWindow = window as Window & { __audioResumeCalls?: number };
  149 |     testWindow.__audioResumeCalls = 0;
  150 |     class GestureAudioContext {
  151 |       state: AudioContextState = "suspended";
  152 |       currentTime = 0;
  153 |       destination = {} as AudioDestinationNode;
  154 |       resume() {
  155 |         testWindow.__audioResumeCalls = (testWindow.__audioResumeCalls ?? 0) + 1;
  156 |         this.state = "running";
  157 |         return Promise.resolve();
  158 |       }
  159 |       suspend() { this.state = "suspended"; return Promise.resolve(); }
```