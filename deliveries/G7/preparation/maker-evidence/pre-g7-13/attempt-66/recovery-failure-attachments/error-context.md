# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: renderer-recovery.spec.ts >> C3 Failure Recovery, Context Loss & Mobile Resilience >> WebGL context loss triggers accessible WorldFallback without trapping user
- Location: tests\e2e\renderer-recovery.spec.ts:35:3

# Error details

```
Error: expect(locator).toHaveAttribute(expected) failed

Locator:  getByTestId('world-stage-container')
Expected: "HOME"
Received: "LOADING"
Timeout:  15000ms

Call log:
  - Expect "toHaveAttribute" getByTestId('world-stage-container') with timeout 15000ms
  - waiting for getByTestId('world-stage-container')
    - locator resolved to <div role="region" data-lifecycle-state="LOADING" data-studio-controls-open="false" aria-label="Interactive 3D Studio" data-testid="world-stage-container" class="world-module__FC9lxW__stageContainer world-module__FC9lxW__fullscreenStage world-module__FC9lxW__studioControlsClosed">…</div>
    - unexpected value "LOADING"

```

```yaml
- region "Interactive 3D Studio":
  - button "Open studio controls": Studio controls
  - heading "Loading 3D Studio" [level=3]
  - paragraph: Loading production environment (required)...
  - progressbar
  - text: "15% · Required: 0/3 · Optional: 0/3"
  - button "Continue with Portfolio"
```

# Test source

```ts
  1   | import { test, expect, type Page, type TestInfo } from "@playwright/test";
  2   | import { mkdir, writeFile } from "node:fs/promises";
  3   | import path from "node:path";
  4   | 
  5   | async function saveEvidence(info: TestInfo, name: string, data: unknown) {
  6   |   const baseDir = process.env.C3_EVIDENCE_DIR || process.env.C1_EVIDENCE_DIR || "test-results";
  7   |   const destination = path.join(baseDir, info.project.name, name);
  8   |   await mkdir(path.dirname(destination), { recursive: true });
  9   |   await writeFile(destination, JSON.stringify(data, null, 2)).catch(() => {});
  10  | }
  11  | 
  12  | async function simulateVisibility(page: Page, state: "hidden" | "visible") {
  13  |   await page.evaluate((visibilityState) => {
  14  |     Object.defineProperty(document, "visibilityState", { configurable: true, value: visibilityState });
  15  |     document.dispatchEvent(new Event("visibilitychange"));
  16  |   }, state);
  17  | }
  18  | 
  19  | async function enterRenderedHome(page: Page) {
  20  |   await page.emulateMedia({ reducedMotion: "reduce" });
  21  |   await page.goto("/?studio=1", { waitUntil: "domcontentloaded" });
> 22  |   await expect(page.getByTestId("world-stage-container")).toHaveAttribute("data-lifecycle-state", "HOME", { timeout: 15000 });
      |                                                           ^ Error: expect(locator).toHaveAttribute(expected) failed
  23  |   const controlsToggle = page.getByTestId("studio-controls-toggle");
  24  |   if (await controlsToggle.getAttribute("aria-expanded") !== "true") await controlsToggle.click();
  25  |   await expect(controlsToggle).toHaveAttribute("aria-expanded", "true");
  26  |   const qualityTier = page.getByTestId("quality-tier-select");
  27  |   await expect(qualityTier).toBeVisible();
  28  |   await qualityTier.selectOption("low");
  29  |   const canvas = page.getByTestId("world-canvas");
  30  |   await expect.poll(async () => Number(await canvas.getAttribute("data-rendered-frames"))).toBeGreaterThan(1);
  31  |   return canvas;
  32  | }
  33  | 
  34  | test.describe("C3 Failure Recovery, Context Loss & Mobile Resilience", () => {
  35  |   test("WebGL context loss triggers accessible WorldFallback without trapping user", async ({ page }, info) => {
  36  |     const canvas = await enterRenderedHome(page);
  37  |     const oldCanvas = await canvas.elementHandle();
  38  |     if (!oldCanvas) throw new Error("Missing rendered canvas.");
  39  | 
  40  |     // Dispatch simulated webglcontextlost event on canvas
  41  |     await page.evaluate(() => {
  42  |       const cvs = document.querySelector('canvas[data-testid="world-canvas"]');
  43  |       if (cvs) {
  44  |         const event = new Event("webglcontextlost", { bubbles: true, cancelable: true });
  45  |         cvs.dispatchEvent(event);
  46  |       }
  47  |     });
  48  | 
  49  |     // Verify accessible fallback banner is displayed
  50  |     const fallback = page.locator('[data-testid="world-fallback-banner"]');
  51  |     await expect(fallback).toBeVisible({ timeout: 5000 });
  52  | 
  53  |     // Verify Retry and Continue buttons exist
  54  |     const retryBtn = page.locator('[data-testid="fallback-retry-btn"]');
  55  |     const dismissBtn = page.locator('[data-testid="fallback-dismiss-btn"]');
  56  |     await expect(retryBtn).toBeVisible();
  57  |     await expect(dismissBtn).toBeVisible();
  58  | 
  59  |     await expect.poll(async () => oldCanvas.evaluate((element) => (element as HTMLCanvasElement).getContext("webgl2")?.isContextLost())).toBe(true);
  60  |     const stoppedFrames = await oldCanvas.evaluate((element) => Number(element.dataset.renderedFrames));
  61  |     await simulateVisibility(page, "hidden");
  62  |     await simulateVisibility(page, "visible");
  63  |     await page.waitForTimeout(1200);
  64  |     expect(await oldCanvas.evaluate((element) => Number(element.dataset.renderedFrames))).toBe(stoppedFrames);
  65  | 
  66  |     await retryBtn.click();
  67  |     await expect(page.getByTestId("world-stage-container")).toHaveAttribute("data-lifecycle-state", "HOME", { timeout: 15000 });
  68  |     await expect(canvas).toBeVisible();
  69  |     await expect.poll(async () => Number(await canvas.getAttribute("data-rendered-frames"))).toBeGreaterThan(1);
  70  |     await expect(page.getByTestId("quality-tier-select")).toHaveValue("low");
  71  |     expect(await page.locator("canvas").count()).toBe(1);
  72  |     expect(await oldCanvas.evaluate((element) => element.isConnected)).toBe(false);
  73  |     await expect(fallback).toHaveCount(0);
  74  | 
  75  |     await saveEvidence(info, "context-loss-recovery.json", {
  76  |       status: "recovered_to_rendered_HOME",
  77  |       stoppedOldFrames: stoppedFrames,
  78  |       oldCanvasDetached: true,
  79  |       oldContextLost: true,
  80  |       explicitLowRetained: true,
  81  |       visibilityProof: "simulated document visibility events",
  82  |     });
  83  |   });
  84  | 
  85  |   test("Explicit STATIC stops the old renderer and Retry rebuilds a supported AUTO studio", async ({ page }, info) => {
  86  |     const canvas = await enterRenderedHome(page);
  87  |     const oldCanvas = await canvas.elementHandle();
  88  |     if (!oldCanvas) throw new Error("Missing rendered canvas.");
  89  |     await page.getByTestId("quality-tier-select").selectOption("static");
  90  |     await expect(page.getByTestId("world-static-container")).toBeVisible();
  91  |     await expect(page.locator("canvas")).toHaveCount(0);
  92  |     await expect.poll(async () => oldCanvas.evaluate((element) => (element as HTMLCanvasElement).getContext("webgl2")?.isContextLost())).toBe(true);
  93  |     const stoppedFrames = await oldCanvas.evaluate((element) => Number(element.dataset.renderedFrames));
  94  |     await simulateVisibility(page, "hidden");
  95  |     await simulateVisibility(page, "visible");
  96  |     await page.waitForTimeout(1200);
  97  |     expect(await oldCanvas.evaluate((element) => Number(element.dataset.renderedFrames))).toBe(stoppedFrames);
  98  |     expect(await oldCanvas.evaluate((element) => element.isConnected)).toBe(false);
  99  | 
  100 |     await page.getByTestId("static-fallback-retry").click();
  101 |     await expect(page.getByTestId("world-stage-container")).toHaveAttribute("data-lifecycle-state", "HOME", { timeout: 15000 });
  102 |     await expect(page.getByTestId("quality-tier-select")).toHaveValue("auto");
  103 |     await expect.poll(async () => Number(await canvas.getAttribute("data-rendered-frames"))).toBeGreaterThan(1);
  104 |     expect(await page.locator("canvas").count()).toBe(1);
  105 |     await saveEvidence(info, "static-reentry.json", { requestedPreference: "auto", reachedRenderedHome: true, stoppedOldFrames: stoppedFrames, oldContextLost: true, visibilityProof: "simulated document visibility events" });
  106 |   });
  107 | 
  108 |   test("Persistent renderer failures exhaust exactly three reconstruction retries", async ({ page }, info) => {
  109 |     await page.goto("/?studio=1&simulateRendererError=1", { waitUntil: "domcontentloaded" });
  110 |     const fallback = page.getByTestId("world-fallback-banner");
  111 |     await expect(fallback).toBeVisible();
  112 |     for (let attempt = 1; attempt <= 3; attempt++) {
  113 |       await page.getByTestId("fallback-retry-btn").click();
  114 |       await expect(fallback).toBeVisible();
  115 |       await expect(page.locator("canvas")).toHaveCount(0);
  116 |       if (attempt < 3) await expect(page.getByTestId("fallback-retry-btn")).toBeVisible();
  117 |     }
  118 |     await expect(page.getByTestId("fallback-retry-btn")).toHaveCount(0);
  119 |     await page.getByTestId("fallback-dismiss-btn").click();
  120 |     await expect(page.locator("main")).toBeVisible();
  121 |     await expect(fallback).toHaveCount(0);
  122 |     await saveEvidence(info, "bounded-retry.json", { reconstructionRetries: 3, retryExhausted: true, continueAvailable: true });
```