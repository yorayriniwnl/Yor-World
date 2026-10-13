# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: local-studio-usability.spec.ts >> studio space, bounded controls and real Close at 844x390
- Location: tests\e2e\local-studio-usability.spec.ts:32:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Page snapshot

```yaml
- generic [ref=e1]:
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
          - link "View projects" [ref=e32] [cursor=pointer]:
            - /url: /projects
            - text: View projects
            - generic [aria-hidden] [ref=e33]: ↗
          - paragraph [ref=e34]: Four verified project case studies. Explore the studio whenever you like.
        - complementary "Studio status" [ref=e35]:
          - generic [ref=e36]:
            - generic [ref=e37]: YOR / 01
            - generic [ref=e38]: In the making
          - generic [ref=e41]: "Y"
          - generic [ref=e45]:
            - paragraph [ref=e46]:
              - text: A space for
              - strong [ref=e47]: curiosity.
            - generic [ref=e48]: Interactive studioPortfolio pages below
      - region "Explore the interactive studio" [ref=e49]:
        - region "Interactive 3D Studio" [ref=e50]:
          - generic "3D Room view showing resident, workstation, and moving chair" [ref=e52]
          - generic [ref=e53]:
            - generic [ref=e54]:
              - button "Acknowledge and greet resident" [ref=e55] [cursor=pointer]: Greet
              - button "Instant skip to coding pose (Escape)" [ref=e56] [cursor=pointer]: Skip (Esc)
              - button "Open accessible studio room controls" [ref=e57] [cursor=pointer]: Room
              - button "Open studio project launcher" [ref=e58] [cursor=pointer]: Projects
              - button "Sound Off" [ref=e59] [cursor=pointer]: "Sound: Off"
              - button "Exit 3D Studio and return to portfolio" [ref=e60] [cursor=pointer]: Exit
              - group [ref=e61]:
                - generic "Options" [ref=e62] [cursor=pointer]
                - option "Auto (Adaptive)" [selected]
                - option "High (Full Shadows & Bloom)"
                - option "Medium (Balanced)"
                - option "Low (Optimized)"
                - option "Static (HTML Portfolio Fallback)"
              - button "Diagnostics" [ref=e63] [cursor=pointer]
            - generic: coding_idle / coding
          - dialog "Studio Room Controls" [ref=e64]:
            - generic [ref=e65]:
              - heading "Room controls" [level=2] [ref=e66]
              - button "Close room controls panel" [ref=e67] [cursor=pointer]: ✕
            - generic [ref=e68]:
              - heading "Character & Avatar" [level=3] [ref=e69]
              - button "Greet Creator (coding_idle)" [ref=e70] [cursor=pointer]
              - button "Adjust Chair Posture" [ref=e71] [cursor=pointer]
            - generic [ref=e72]:
              - heading "Workstation & Display" [level=3] [ref=e73]
              - button "Open Studio Launcher (Monitor / Keyboard / Mouse)" [ref=e74] [cursor=pointer]
            - generic [ref=e75]:
              - heading "Artwork & Discoveries" [level=3] [ref=e76]
              - 'button "Inspect Wall Painting (Tilt: 0.0°)" [ref=e77] [cursor=pointer]'
              - generic [ref=e78]:
                - text: "Hidden Signature:"
                - strong [ref=e79]: Hidden
            - generic [ref=e80]:
              - heading "Environment & Lighting" [level=3] [ref=e81]
              - generic [ref=e82] [cursor=pointer]:
                - checkbox "Desk Task Lamp (ON)" [checked] [ref=e83]
                - text: Desk Task Lamp (ON)
              - generic [ref=e84] [cursor=pointer]:
                - checkbox "Window Blinds (OPEN)" [checked] [ref=e85]
                - text: Window Blinds (OPEN)
              - generic [ref=e86] [cursor=pointer]:
                - checkbox "Clock Format (24-Hour)" [checked] [ref=e87]
                - text: Clock Format (24-Hour)
            - generic [ref=e88]:
              - heading "Desk Decoration" [level=3] [ref=e89]
              - button "Nudge Plant Leaves" [ref=e90] [cursor=pointer]
            - generic [ref=e91]:
              - heading "Direct Project Navigation (Accessible Rail)" [level=3] [ref=e92]
              - navigation "Direct Project Destinations" [ref=e93]:
                - link "CandidateX" [ref=e94] [cursor=pointer]:
                  - /url: /projects/candidatex
                - link "Helios Kernel" [ref=e95] [cursor=pointer]:
                  - /url: /projects/helios
                - link "Zenith Energy" [ref=e96] [cursor=pointer]:
                  - /url: /projects/zenith
                - link "AI Scanner" [ref=e97] [cursor=pointer]:
                  - /url: /projects/ai-camera
                - link "Yor Talks" [ref=e98] [cursor=pointer]:
                  - /url: /projects/yor-talks
            - generic [ref=e99]:
              - heading "Studio Exit & Replay" [level=3] [ref=e100]
              - button "Replay Entrance (Interior Door)" [ref=e101] [cursor=pointer]
              - button "Reset View / Escape to Explore (Escape Key)" [ref=e102] [cursor=pointer]
      - region [ref=e103]:
        - generic [ref=e104]:
          - paragraph [ref=e105]: Take a look around
          - heading "Start anywhere." [level=2] [ref=e106]
        - list [ref=e107]:
          - listitem [ref=e108]:
            - link "01 Projects Verified software case studies" [ref=e109] [cursor=pointer]:
              - /url: /projects
              - generic [ref=e110]: "01"
              - generic [ref=e111]:
                - strong [ref=e112]: Projects
                - text: Verified software case studies
              - generic [aria-hidden] [ref=e113]: ↗
          - listitem [ref=e114]:
            - link "02 About Background, education, and technical skills" [ref=e115] [cursor=pointer]:
              - /url: /about
              - generic [ref=e116]: "02"
              - generic [ref=e117]:
                - strong [ref=e118]: About
                - text: Background, education, and technical skills
              - generic [aria-hidden] [ref=e119]: ↗
          - listitem [ref=e120]:
            - link "03 Contact Send a message or use direct channels" [ref=e121] [cursor=pointer]:
              - /url: /contact
              - generic [ref=e122]: "03"
              - generic [ref=e123]:
                - strong [ref=e124]: Contact
                - text: Send a message or use direct channels
              - generic [aria-hidden] [ref=e125]: ↗
    - contentinfo [ref=e126]:
      - paragraph [ref=e127]: YOR WORLD / Ayush Roy Portfolio
      - paragraph [ref=e128]: Sound off · Explore at your pace
  - alert [ref=e130]
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
> 81  |     expect(await panel.evaluate((node) => node.contains(document.activeElement))).toBe(true);
      |                                                                                   ^ Error: expect(received).toBe(expected) // Object.is equality
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
  160 |       close() { this.state = "closed"; return Promise.resolve(); }
  161 |     }
  162 |     Object.defineProperty(window, "AudioContext", { configurable: true, value: GestureAudioContext });
  163 |   });
  164 |   await enterHome(page);
  165 | 
  166 |   const sound = page.getByTestId("sound-toggle-btn");
  167 |   await expect(sound).toContainText("Sound: Tap to enable");
  168 |   await expect(sound).toHaveAttribute("aria-pressed", "false");
  169 |   await page.getByTestId("diagnostics-toggle-btn").click();
  170 |   const diagnostics = page.getByTestId("world-diagnostics");
  171 |   await expect.poll(async () => {
  172 |     const state = JSON.parse((await diagnostics.textContent())!);
  173 |     return [state.soundEnabled, state.experienceSnapshot.preferences.soundEnabled, state.qualityTier,
  174 |       state.experienceSnapshot.preferences.quality];
  175 |   }).toEqual([false, true, "low", "low"]);
  176 |   expect(await page.evaluate(() => (window as Window & { __audioResumeCalls?: number }).__audioResumeCalls)).toBe(0);
  177 |   await page.getByTestId("diagnostics-toggle-btn").click();
  178 | 
  179 |   await page.getByTestId("studio-options-toggle").click();
  180 |   const quality = page.getByTestId("quality-tier-select");
  181 |   await expect(quality).toHaveValue("low");
```