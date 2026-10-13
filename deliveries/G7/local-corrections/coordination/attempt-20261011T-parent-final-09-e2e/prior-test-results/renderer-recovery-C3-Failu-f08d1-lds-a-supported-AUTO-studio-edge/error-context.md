# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: renderer-recovery.spec.ts >> C3 Failure Recovery, Context Loss & Mobile Resilience >> Explicit STATIC stops the old renderer and Retry rebuilds a supported AUTO studio
- Location: tests\e2e\renderer-recovery.spec.ts:83:3

# Error details

```
Error: expect(locator).toHaveAttribute(expected) failed

Locator: getByTestId('world-stage-container')
Expected: "HOME"
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toHaveAttribute" getByTestId('world-stage-container') with timeout 15000ms
  - waiting for getByTestId('world-stage-container')

```

```yaml
- link "Skip to content":
  - /url: "#main-content"
- banner:
  - link "Yor World home":
    - /url: /
    - text: YOR WORLD A studio in progress
  - navigation "Primary navigation":
    - list:
      - listitem:
        - link "Projects":
          - /url: /projects
      - listitem:
        - link "About":
          - /url: /about
      - listitem:
        - link "Contact":
          - /url: /contact
      - listitem:
        - link "Résumé":
          - /url: /resume
- main:
  - region "A little world. A closer look.":
    - paragraph: The door is taking shape
    - heading "A little world. A closer look." [level=1]:
      - text: A little world.
      - emphasis: A closer look.
    - paragraph: A personal studio for exploring the work, the thinking, and the person behind it.
    - paragraph: Ayush Roy Verified identity
    - paragraph: Full-Stack & Systems Developer
    - paragraph: Building realtime systems, 3D product interfaces, and applied ML.
    - link "View projects":
      - /url: /projects
    - paragraph: Four verified project case studies. Explore the studio whenever you like.
    - complementary "Studio status":
      - text: YOR / 01 In the making
      - paragraph:
        - text: A space for
        - strong: curiosity.
      - text: Interactive studio Portfolio pages below
  - region "Explore the interactive studio":
    - region "Full Portfolio Mode":
      - text: Accessible Static Presentation
      - heading "Full Portfolio Mode" [level=2]
      - paragraph: Accessible Static Presentation active. Interactive 3D graphics are bypassed.
      - button "Retry 3D Studio"
      - button "Continue with Portfolio"
      - heading "Published Projects" [level=3]
      - list:
        - listitem:
          - link "AI vs. Real Image Detector ? A probability-aware image classifier built from handcrafted texture features and a calibrated support vector machine.":
            - /url: /projects/ai-vs-real
            - strong: AI vs. Real Image Detector
            - text: "? A probability-aware image classifier built from handcrafted texture features and a calibrated support vector machine."
        - listitem:
          - link "Yor Zenith ? A full-stack solar feasibility platform combining 3D roof planning, energy-output simulation, and financial analysis.":
            - /url: /projects/zenith
            - strong: Yor Zenith
            - text: "? A full-stack solar feasibility platform combining 3D roof planning, energy-output simulation, and financial analysis."
        - listitem:
          - link "Yor Helios ? An energy-monitoring platform streaming anomaly and threshold events into channel-specific operator dashboards.":
            - /url: /projects/helios
            - strong: Yor Helios
            - text: "? An energy-monitoring platform streaming anomaly and threshold events into channel-specific operator dashboards."
        - listitem:
          - link "Yor Talks V2 ? A full-stack communication platform with realtime messaging, typed interface components, and a documented public-beta path.":
            - /url: /projects/talks
            - strong: Yor Talks V2
            - text: "? A full-stack communication platform with realtime messaging, typed interface components, and a documented public-beta path."
      - link "About Yor":
        - /url: /about
      - link "Résumé":
        - /url: /resume
      - link "Contact":
        - /url: /contact
  - region "Start anywhere.":
    - paragraph: Take a look around
    - heading "Start anywhere." [level=2]
    - list:
      - listitem:
        - link "01 Projects Verified software case studies":
          - /url: /projects
          - text: "01"
          - strong: Projects
          - text: Verified software case studies
      - listitem:
        - link "02 About Background, education, and technical skills":
          - /url: /about
          - text: "02"
          - strong: About
          - text: Background, education, and technical skills
      - listitem:
        - link "03 Contact Send a message or use direct channels":
          - /url: /contact
          - text: "03"
          - strong: Contact
          - text: Send a message or use direct channels
- contentinfo:
  - paragraph: YOR WORLD Ayush Roy Portfolio
  - paragraph: Sound off Explore at your pace
- alert
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
  22  |   await expect(page.getByTestId("world-stage-container")).toHaveAttribute("data-lifecycle-state", "HOME", { timeout: 15000 });
  23  |   await page.getByTestId("studio-options-toggle").click();
  24  |   await page.getByTestId("quality-tier-select").selectOption("low");
  25  |   await page.getByTestId("studio-options-toggle").click();
  26  |   const canvas = page.getByTestId("world-canvas");
  27  |   await expect.poll(async () => Number(await canvas.getAttribute("data-rendered-frames"))).toBeGreaterThan(1);
  28  |   return canvas;
  29  | }
  30  | 
  31  | test.describe("C3 Failure Recovery, Context Loss & Mobile Resilience", () => {
  32  |   test("WebGL context loss triggers accessible WorldFallback without trapping user", async ({ page }, info) => {
  33  |     const canvas = await enterRenderedHome(page);
  34  |     const oldCanvas = await canvas.elementHandle();
  35  |     if (!oldCanvas) throw new Error("Missing rendered canvas.");
  36  | 
  37  |     // Dispatch simulated webglcontextlost event on canvas
  38  |     await page.evaluate(() => {
  39  |       const cvs = document.querySelector('canvas[data-testid="world-canvas"]');
  40  |       if (cvs) {
  41  |         const event = new Event("webglcontextlost", { bubbles: true, cancelable: true });
  42  |         cvs.dispatchEvent(event);
  43  |       }
  44  |     });
  45  | 
  46  |     // Verify accessible fallback banner is displayed
  47  |     const fallback = page.locator('[data-testid="world-fallback-banner"]');
  48  |     await expect(fallback).toBeVisible({ timeout: 5000 });
  49  |     await expect(page.locator("#fallback-heading")).toBeFocused();
  50  | 
  51  |     // Verify Retry and Continue buttons exist
  52  |     const retryBtn = page.locator('[data-testid="fallback-retry-btn"]');
  53  |     const dismissBtn = page.locator('[data-testid="fallback-dismiss-btn"]');
  54  |     await expect(retryBtn).toBeVisible();
  55  |     await expect(dismissBtn).toBeVisible();
  56  | 
  57  |     await expect.poll(async () => oldCanvas.evaluate((element) => (element as HTMLCanvasElement).getContext("webgl2")?.isContextLost())).toBe(true);
  58  |     const stoppedFrames = await oldCanvas.evaluate((element) => Number(element.dataset.renderedFrames));
  59  |     await simulateVisibility(page, "hidden");
  60  |     await simulateVisibility(page, "visible");
  61  |     await page.waitForTimeout(1200);
  62  |     expect(await oldCanvas.evaluate((element) => Number(element.dataset.renderedFrames))).toBe(stoppedFrames);
  63  | 
  64  |     await retryBtn.click();
  65  |     await expect(page.getByTestId("world-stage-container")).toHaveAttribute("data-lifecycle-state", "HOME", { timeout: 15000 });
  66  |     await expect(canvas).toBeVisible();
  67  |     await expect.poll(async () => Number(await canvas.getAttribute("data-rendered-frames"))).toBeGreaterThan(1);
  68  |     await expect(page.getByTestId("quality-tier-select")).toHaveValue("low");
  69  |     expect(await page.locator("canvas").count()).toBe(1);
  70  |     expect(await oldCanvas.evaluate((element) => element.isConnected)).toBe(false);
  71  |     await expect(fallback).toHaveCount(0);
  72  | 
  73  |     await saveEvidence(info, "context-loss-recovery.json", {
  74  |       status: "recovered_to_rendered_HOME",
  75  |       stoppedOldFrames: stoppedFrames,
  76  |       oldCanvasDetached: true,
  77  |       oldContextLost: true,
  78  |       explicitLowRetained: true,
  79  |       visibilityProof: "simulated document visibility events",
  80  |     });
  81  |   });
  82  | 
  83  |   test("Explicit STATIC stops the old renderer and Retry rebuilds a supported AUTO studio", async ({ page }, info) => {
  84  |     const canvas = await enterRenderedHome(page);
  85  |     const oldCanvas = await canvas.elementHandle();
  86  |     if (!oldCanvas) throw new Error("Missing rendered canvas.");
  87  |     await page.getByTestId("studio-options-toggle").click();
  88  |     await page.getByTestId("quality-tier-select").selectOption("static");
  89  |     await expect(page.getByTestId("world-static-container")).toBeVisible();
  90  |     await expect(page.locator("canvas")).toHaveCount(0);
  91  |     await expect.poll(async () => oldCanvas.evaluate((element) => (element as HTMLCanvasElement).getContext("webgl2")?.isContextLost())).toBe(true);
  92  |     const stoppedFrames = await oldCanvas.evaluate((element) => Number(element.dataset.renderedFrames));
  93  |     await simulateVisibility(page, "hidden");
  94  |     await simulateVisibility(page, "visible");
  95  |     await page.waitForTimeout(1200);
  96  |     expect(await oldCanvas.evaluate((element) => Number(element.dataset.renderedFrames))).toBe(stoppedFrames);
  97  |     expect(await oldCanvas.evaluate((element) => element.isConnected)).toBe(false);
  98  | 
  99  |     await page.getByTestId("static-fallback-retry").click();
> 100 |     await expect(page.getByTestId("world-stage-container")).toHaveAttribute("data-lifecycle-state", "HOME", { timeout: 15000 });
      |                                                             ^ Error: expect(locator).toHaveAttribute(expected) failed
  101 |     await expect(page.getByTestId("quality-tier-select")).toHaveValue("auto");
  102 |     await expect.poll(async () => Number(await canvas.getAttribute("data-rendered-frames"))).toBeGreaterThan(1);
  103 |     expect(await page.locator("canvas").count()).toBe(1);
  104 |     await saveEvidence(info, "static-reentry.json", { requestedPreference: "auto", reachedRenderedHome: true, stoppedOldFrames: stoppedFrames, oldContextLost: true, visibilityProof: "simulated document visibility events" });
  105 |   });
  106 | 
  107 |   test("Persistent renderer failures exhaust exactly three reconstruction retries", async ({ page }, info) => {
  108 |     await page.goto("/?studio=1&simulateRendererError=1", { waitUntil: "domcontentloaded" });
  109 |     const fallback = page.getByTestId("world-fallback-banner");
  110 |     await expect(fallback).toBeVisible();
  111 |     for (let attempt = 1; attempt <= 3; attempt++) {
  112 |       await page.getByTestId("fallback-retry-btn").click();
  113 |       await expect(fallback).toBeVisible();
  114 |       await expect(page.locator("canvas")).toHaveCount(0);
  115 |       if (attempt < 3) await expect(page.getByTestId("fallback-retry-btn")).toBeVisible();
  116 |     }
  117 |     await expect(page.getByTestId("fallback-retry-btn")).toHaveCount(0);
  118 |     await page.getByTestId("fallback-dismiss-btn").click();
  119 |     await expect(page.locator("main")).toBeVisible();
  120 |     await expect(fallback).toHaveCount(0);
  121 |     await saveEvidence(info, "bounded-retry.json", { reconstructionRetries: 3, retryExhausted: true, continueAvailable: true });
  122 |   });
  123 | 
  124 |   test("Healthy visibility restoration resumes rendering; a detached canvas never resumes", async ({ page }, info) => {
  125 |     const canvas = await enterRenderedHome(page);
  126 |     const retainedCanvas = await canvas.elementHandle();
  127 |     if (!retainedCanvas) throw new Error("Missing rendered canvas.");
  128 |     await simulateVisibility(page, "hidden");
  129 |     const pausedFrames = Number(await canvas.getAttribute("data-rendered-frames"));
  130 |     await page.waitForTimeout(250);
  131 |     expect(Number(await canvas.getAttribute("data-rendered-frames"))).toBe(pausedFrames);
  132 |     await simulateVisibility(page, "visible");
  133 |     await expect.poll(async () => Number(await canvas.getAttribute("data-rendered-frames"))).toBeGreaterThan(pausedFrames);
  134 | 
  135 |     await retainedCanvas.evaluate((element) => element.remove());
  136 |     await simulateVisibility(page, "hidden");
  137 |     const detachedFrames = await retainedCanvas.evaluate((element) => Number(element.dataset.renderedFrames));
  138 |     await simulateVisibility(page, "visible");
  139 |     await page.waitForTimeout(1200);
  140 |     expect(await retainedCanvas.evaluate((element) => Number(element.dataset.renderedFrames))).toBe(detachedFrames);
  141 |     expect(await retainedCanvas.evaluate((element) => element.isConnected)).toBe(false);
  142 |     await saveEvidence(info, "visibility-render-guards.json", { healthyResumeObserved: true, detachedFrames, detachedResumePrevented: true, visibilityProof: "simulated document visibility events" });
  143 |   });
  144 | 
  145 |   test("Accessibility toolbar accepts real pointer controls and Projects navigation", async ({ page }, info) => {
  146 |     // GitHub-hosted SwiftShader can make this real-renderer pointer path exceed the suite default while still completing correctly.
  147 |     test.setTimeout(45_000);
  148 |     await enterRenderedHome(page);
  149 |     await page.getByTestId("studio-options-toggle").click();
  150 |     const qualitySelect = page.getByTestId("quality-tier-select");
  151 |     // A real mouse click must reach the select before native keyboard selection.
  152 |     await qualitySelect.click();
  153 |     await page.keyboard.press("Escape");
  154 |     await expect(qualitySelect).toBeFocused();
  155 |     await page.keyboard.press("Home");
  156 |     await page.keyboard.press("ArrowDown");
  157 |     await page.keyboard.press("ArrowDown");
  158 |     await expect(qualitySelect).toHaveValue("medium");
  159 |     await page.getByTestId("diagnostics-toggle-btn").click();
  160 |     await expect.poll(async () => JSON.parse((await page.getByTestId("world-diagnostics").textContent())!).qualityTier).toBe("medium");
  161 |     await page.getByTestId("diagnostics-toggle-btn").click();
  162 | 
  163 |     const reducedMotion = page.getByTestId("reduced-motion-toggle-btn");
  164 |     await expect(reducedMotion).toHaveAttribute("aria-checked", "true");
  165 |     await reducedMotion.click();
  166 |     await expect(reducedMotion).toHaveAttribute("aria-checked", "false");
  167 |     await page.getByTestId("a11y-link-projects").click();
  168 |     await expect(page).toHaveURL(/\/projects$/);
  169 |     await expect(page.locator("canvas")).toHaveCount(0);
  170 |     await saveEvidence(info, "toolbar-pointer-controls.json", { pointerQualityControlReached: true, appliedTier: "medium", pointerReducedMotionToggleApplied: true, pointerProjectsNavigationApplied: true });
  171 |   });
  172 | 
  173 |   test("Asset loading failure renders failure banner with Retry and Continue options", async ({ page }, info) => {
  174 |     // Navigate with simulateAssetError=1 (handled in StudioLauncher or WorldRoot)
  175 |     await page.goto("/?studio=1&simulateAssetError=1", { waitUntil: "domcontentloaded" });
  176 | 
  177 |     // Wait for fallback banner or error container
  178 |     const fallbackBanner = page.locator('[data-testid="world-fallback-banner"], [data-testid="static-fallback-section"]');
  179 |     await expect(fallbackBanner).toBeVisible({ timeout: 10000 });
  180 | 
  181 |     // Click "Continue with Portfolio"
  182 |     const continueBtn = page.locator('[data-testid="fallback-dismiss-btn"], [data-testid="loading-continue-btn"], [data-testid="static-fallback-continue"]');
  183 |     if (await continueBtn.count() > 0) {
  184 |       await continueBtn.first().click();
  185 |       // Should unmount or return to portfolio safely
  186 |       await expect(page.locator("main")).toBeVisible();
  187 |     }
  188 | 
  189 |     await saveEvidence(info, "asset-failure-recovery.json", {
  190 |       handled: true,
  191 |       recoveredToPortfolio: true,
  192 |     });
  193 |   });
  194 | 
  195 |   test("Renderer failure with dialog open preserves dialog interactivity in DOM", async ({ page }, info) => {
  196 |     // Navigate with simulateRendererError=1
  197 |     await page.goto("/?studio=1&simulateRendererError=1", { waitUntil: "domcontentloaded" });
  198 | 
  199 |     // Failure container should appear
  200 |     const failureContainer = page.locator('[data-testid="world-failure-container"]');
```