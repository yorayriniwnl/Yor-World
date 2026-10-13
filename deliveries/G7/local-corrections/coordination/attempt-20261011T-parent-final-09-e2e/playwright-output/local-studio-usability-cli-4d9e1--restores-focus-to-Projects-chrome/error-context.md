# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: local-studio-usability.spec.ts >> clicking the actual monitor mesh opens its dialog and restores focus to Projects
- Location: tests\e2e\local-studio-usability.spec.ts:247:1

# Error details

```
Error: expect(locator).toHaveAttribute(expected) failed

Locator: getByTestId('world-stage-container')
Expected: "HOME"
Error: element(s) not found

Call log:
  - Expect "toHaveAttribute" getByTestId('world-stage-container') with timeout 15000ms
  - waiting for getByTestId('world-stage-container')
  - Protocol error (Runtime.callFunctionOn): Internal server error, session closed.

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
  - region "Explore the interactive studio": Loading 3D Studio Environment...
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
  1   | import { test, expect, type Page, type Locator } from "@playwright/test";
  2   | 
  3   | async function enterHome(page: Page) {
  4   |   await page.emulateMedia({ reducedMotion: "reduce" });
  5   |   await page.goto("/?studio=1");
  6   |   const stage = page.getByTestId("world-stage-container");
> 7   |   await expect(stage).toHaveAttribute("data-lifecycle-state", "HOME", { timeout: 15000 });
      |                       ^ Error: expect(locator).toHaveAttribute(expected) failed
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
  59  |     await page.getByRole("button", { name: "Close studio options" }).click();
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
```