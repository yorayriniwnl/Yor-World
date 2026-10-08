# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: local-studio-usability.spec.ts >> studio space, bounded controls and real Close at 1440x1000
- Location: tests\e2e\local-studio-usability.spec.ts:25:3

# Error details

```
Error: expect(received).toBeGreaterThan(expected)

Expected: > 1007.9999999999999
Received:   574.78125
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "Skip to content" [ref=e2] [cursor=pointer]:
    - /url: "#main-content"
  - generic [ref=e3]:
    - banner [ref=e4]:
      - link "Yor World home" [ref=e5] [cursor=pointer]:
        - /url: /
        - generic [aria-hidden] [ref=e6]: "Y"
        - generic [ref=e7]:
          - text: YOR WORLD
          - generic [ref=e8]: A studio in progress
      - navigation "Primary navigation" [ref=e9]:
        - list [ref=e10]:
          - listitem [ref=e11]:
            - link "Projects" [ref=e12] [cursor=pointer]:
              - /url: /projects
          - listitem [ref=e13]:
            - link "About" [ref=e14] [cursor=pointer]:
              - /url: /about
          - listitem [ref=e15]:
            - link "Contact" [ref=e16] [cursor=pointer]:
              - /url: /contact
          - listitem [ref=e17]:
            - link "Résumé" [ref=e18] [cursor=pointer]:
              - /url: /resume
    - main [ref=e19]:
      - region [ref=e20]:
        - generic [ref=e21]:
          - paragraph [ref=e22]: The door is taking shape
          - heading [level=1] [ref=e23]:
            - text: A little world.
            - emphasis [ref=e24]: A closer look.
          - paragraph [ref=e25]: A personal studio for exploring the work, the thinking, and the person behind it.
          - generic [ref=e26]:
            - paragraph [ref=e27]:
              - text: Ayush Roy
              - generic [ref=e28]: Verified identity
            - paragraph [ref=e29]: Full-Stack & Systems Developer
            - paragraph [ref=e30]: Building realtime systems, 3D product interfaces, and applied ML.
          - generic [ref=e31]:
            - link "View projects" [ref=e32] [cursor=pointer]:
              - /url: /projects
              - text: View projects
              - generic [aria-hidden] [ref=e33]: ↗
            - region "Interactive 3D Studio" [ref=e35]:
              - generic "3D Room view showing resident, workstation, and moving chair" [ref=e36]
              - generic:
                - region "Accessibility and Studio Presentation Controls" [ref=e38]:
                  - generic [ref=e39]:
                    - generic [ref=e40]: "Quality:"
                    - combobox "Visual Quality Tier" [ref=e41] [cursor=pointer]:
                      - option "Auto (Adaptive)" [selected]
                      - option "High (Full Shadows & Bloom)"
                      - option "Medium (Balanced)"
                      - option "Low (Optimized)"
                      - option "Static (HTML Portfolio Fallback)"
                  - switch "Toggle Reduced Motion" [checked] [ref=e43] [cursor=pointer]: "Reduced Motion: ON"
                  - switch "Toggle Audio Sound" [ref=e45] [cursor=pointer]: "Sound: OFF (Muted)"
                  - switch "Pause Decorative Animations" [ref=e47] [cursor=pointer]: "Decorative: PLAYING"
                  - navigation "Accessible Portfolio Destinations" [ref=e48]:
                    - link "All Projects" [ref=e49] [cursor=pointer]:
                      - /url: /projects
                    - link "About" [ref=e50] [cursor=pointer]:
                      - /url: /about
                    - link "Résumé" [ref=e51] [cursor=pointer]:
                      - /url: /resume
                    - link "Contact" [ref=e52] [cursor=pointer]:
                      - /url: /contact
                - generic [ref=e53]:
                  - generic [ref=e54]:
                    - button "Acknowledge and greet resident" [ref=e55] [cursor=pointer]: Greet Resident
                    - button "Safely cancel motion and return to work" [ref=e56] [cursor=pointer]: Cancel
                    - button "Instant skip to coding pose (Escape)" [ref=e57] [cursor=pointer]: Skip (Esc)
                    - button "Toggle accessible studio room controls" [ref=e58] [cursor=pointer]: Room Controls
                  - generic [ref=e59]:
                    - button "Sound Off" [ref=e60] [cursor=pointer]: "Sound: Off"
                    - button "Reduced Motion On" [ref=e61] [cursor=pointer]: "Reduced Motion: On"
                    - button "Exit 3D Studio and return to portfolio" [ref=e62] [cursor=pointer]: Exit Studio
                - generic [ref=e63]:
                  - generic [ref=e64]:
                    - button "Home Camera" [ref=e65] [cursor=pointer]
                    - button "Monitor" [ref=e66] [cursor=pointer]
                    - button "Reverse Doorway" [ref=e67] [cursor=pointer]
                    - button "Mobile View" [ref=e68] [cursor=pointer]
                  - generic [ref=e69]:
                    - button "Diagnostics" [ref=e70] [cursor=pointer]
                    - generic [ref=e71]: coding_idle · coding
          - paragraph [ref=e72]: Four verified project case studies. Explore the studio whenever you like.
        - complementary "Studio status" [ref=e73]:
          - generic [ref=e74]:
            - generic [ref=e75]: YOR / 01
            - generic [ref=e76]: In the making
          - generic [ref=e79]: "Y"
          - generic [ref=e83]:
            - paragraph [ref=e84]:
              - text: A space for
              - strong [ref=e85]: curiosity.
            - generic [ref=e86]: Interactive studioPortfolio pages below
      - region [ref=e87]:
        - generic [ref=e88]:
          - paragraph [ref=e89]: Take a look around
          - heading "Start anywhere." [level=2] [ref=e90]
        - list [ref=e91]:
          - listitem [ref=e92]:
            - link "01 Projects Verified software case studies" [ref=e93] [cursor=pointer]:
              - /url: /projects
              - generic [ref=e94]: "01"
              - generic [ref=e95]:
                - strong [ref=e96]: Projects
                - text: Verified software case studies
              - generic [aria-hidden] [ref=e97]: ↗
          - listitem [ref=e98]:
            - link "02 About Background, education, and technical skills" [ref=e99] [cursor=pointer]:
              - /url: /about
              - generic [ref=e100]: "02"
              - generic [ref=e101]:
                - strong [ref=e102]: About
                - text: Background, education, and technical skills
              - generic [aria-hidden] [ref=e103]: ↗
          - listitem [ref=e104]:
            - link "03 Contact Send a message or use direct channels" [ref=e105] [cursor=pointer]:
              - /url: /contact
              - generic [ref=e106]: "03"
              - generic [ref=e107]:
                - strong [ref=e108]: Contact
                - text: Send a message or use direct channels
              - generic [aria-hidden] [ref=e109]: ↗
    - contentinfo [ref=e110]:
      - paragraph [ref=e111]: YOR WORLD / Ayush Roy Portfolio
      - paragraph [ref=e112]: Sound off · Explore at your pace
  - alert [ref=e114]
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
> 37  |     expect(dimensions.stageWidth).toBeGreaterThan(viewport.width * 0.7);
      |                                   ^ Error: expect(received).toBeGreaterThan(expected)
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
  68  |     await expect(opener).toBeFocused();
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
```