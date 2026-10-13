# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: local-studio-usability.spec.ts >> saved quality and sound preferences hydrate without starting audio; sound resumes only after a gesture
- Location: tests\e2e\local-studio-usability.spec.ts:143:1

# Error details

```
Error: Timeout 5000ms exceeded while waiting on the predicate
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
              - button "Sound On" [active] [pressed] [ref=e59] [cursor=pointer]: "Sound: On"
              - button "Exit 3D Studio and return to portfolio" [ref=e60] [cursor=pointer]: Exit
              - group [ref=e61]:
                - generic "Options" [ref=e62] [cursor=pointer]
                - option "Auto (Adaptive)"
                - option "High (Full Shadows & Bloom)"
                - option "Medium (Balanced)" [selected]
                - option "Low (Optimized)"
                - option "Static (HTML Portfolio Fallback)"
              - button "Diagnostics" [ref=e63] [cursor=pointer]
            - generic: coding_idle / coding
      - region [ref=e64]:
        - generic [ref=e65]:
          - paragraph [ref=e66]: Take a look around
          - heading "Start anywhere." [level=2] [ref=e67]
        - list [ref=e68]:
          - listitem [ref=e69]:
            - link "01 Projects Verified software case studies" [ref=e70] [cursor=pointer]:
              - /url: /projects
              - generic [ref=e71]: "01"
              - generic [ref=e72]:
                - strong [ref=e73]: Projects
                - text: Verified software case studies
              - generic [aria-hidden] [ref=e74]: ↗
          - listitem [ref=e75]:
            - link "02 About Background, education, and technical skills" [ref=e76] [cursor=pointer]:
              - /url: /about
              - generic [ref=e77]: "02"
              - generic [ref=e78]:
                - strong [ref=e79]: About
                - text: Background, education, and technical skills
              - generic [aria-hidden] [ref=e80]: ↗
          - listitem [ref=e81]:
            - link "03 Contact Send a message or use direct channels" [ref=e82] [cursor=pointer]:
              - /url: /contact
              - generic [ref=e83]: "03"
              - generic [ref=e84]:
                - strong [ref=e85]: Contact
                - text: Send a message or use direct channels
              - generic [aria-hidden] [ref=e86]: ↗
    - contentinfo [ref=e87]:
      - paragraph [ref=e88]: YOR WORLD / Ayush Roy Portfolio
      - paragraph [ref=e89]: Sound off · Explore at your pace
  - alert [ref=e91]
```

# Test source

```ts
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
  182 |   await quality.selectOption("medium");
  183 |   await page.getByTestId("studio-options-toggle").click();
  184 |   await page.getByTestId("diagnostics-toggle-btn").click();
  185 |   await expect.poll(async () => JSON.parse((await diagnostics.textContent())!).experienceSnapshot.preferences.quality).toBe("medium");
  186 |   await page.getByTestId("diagnostics-toggle-btn").click();
  187 | 
  188 |   await sound.click();
  189 |   await expect(sound).toContainText("Sound: On");
  190 |   await expect(sound).toHaveAttribute("aria-pressed", "true");
> 191 |   await expect.poll(async () => JSON.parse((await diagnostics.textContent())!).soundEnabled).toBe(true);
      |                                                                                              ^ Error: Timeout 5000ms exceeded while waiting on the predicate
  192 |   expect(await page.evaluate(() => (window as Window & { __audioResumeCalls?: number }).__audioResumeCalls)).toBe(1);
  193 |   expect(await page.evaluate(() => JSON.parse(localStorage.getItem("yor_world_preferences_v1")!).introCompleted)).toBe(true);
  194 | });
  195 | 
  196 | test("available studio copy is honest and existing Y identity supplies the favicon", async ({ page, request }) => {
  197 |   await page.goto("/");
  198 |   await page.locator('[data-testid="studio-disclosure"] summary').click();
  199 |   await expect(page.getByTestId("studio-disclosure")).not.toContainText(/not yet available|G1|Feasibility Proof/);
  200 |   const favicon = await request.get("/favicon.ico");
  201 |   expect(favicon.status()).toBe(200);
  202 |   expect((await favicon.body()).subarray(0, 4)).toEqual(Buffer.from([0, 0, 1, 0]));
  203 |   const svg = await request.get("/icon.svg");
  204 |   expect(svg.status()).toBe(200);
  205 |   expect(await svg.text()).toContain(">Y</text>");
  206 |   await expect(page.locator('link[rel="icon"][href="/favicon.ico"]')).toHaveCount(1);
  207 | });
  208 | 
  209 | test("RouteFocus focuses destination heading on route transition and preserves first-load focus", async ({ page }) => {
  210 |   await page.goto("/");
  211 |   // Initial load does not force heading focus
  212 |   expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe("H1");
  213 |   // Navigate via client-side link to /projects
  214 |   await page.locator('nav a[href="/projects"]').click();
  215 |   await expect(page.locator("main h1")).toBeFocused();
  216 |   // Navigate to /about
  217 |   await page.locator('nav a[href="/about"]').click();
  218 |   await expect(page.locator("main h1")).toBeFocused();
  219 |   await page.goBack();
  220 |   await expect(page).toHaveURL(/\/projects$/);
  221 |   await expect(page.locator("main h1")).toBeFocused();
  222 |   await page.goForward();
  223 |   await expect(page).toHaveURL(/\/about$/);
  224 |   await expect(page.locator("main h1")).toBeFocused();
  225 | });
  226 | 
  227 | test("Launcher dialog focuses its command field and restores canvas-context focus through its fallback", async ({ page }) => {
  228 |   await enterHome(page);
  229 |   const stage = page.getByTestId("world-stage-container");
  230 |   const canvas = page.getByTestId("world-canvas");
  231 |   await canvas.click({ position: { x: 4, y: 4 }, force: true });
  232 |   await expect(stage).toBeFocused();
  233 | 
  234 |   // HTMLElement.click() opens the same controller panel without changing focus,
  235 |   // modeling a scene-object activation whose invoker is the canvas.
  236 |   await page.getByTestId("open-launcher-btn").evaluate((button) => (button as HTMLElement).click());
  237 |   const dialog = page.getByRole("dialog", { name: "Studio Monitor Launcher" });
  238 |   const command = dialog.getByRole("textbox", { name: "Terminal command input" });
  239 |   await expect(command).toBeFocused();
  240 |   await page.keyboard.press("Shift+Tab");
  241 |   expect(await dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true);
  242 |   await dialog.getByRole("button", { name: "Close monitor launcher" }).click();
  243 |   await expect(dialog).toHaveCount(0);
  244 |   await expect(page.getByTestId("open-launcher-btn")).toBeFocused();
  245 | });
  246 | 
  247 | test("clicking the actual monitor mesh opens its dialog and restores focus to Projects", async ({ page }) => {
  248 |   await enterHome(page);
  249 |   const canvas = page.getByTestId("world-canvas");
  250 |   const bounds = await canvas.boundingBox();
  251 |   expect(bounds).not.toBeNull();
  252 |   // In the desktop HOME composition the versioned room monitor is centered near
  253 |   // this canvas point. This is a real canvas pointer gesture through the bound
  254 |   // production mesh/raycaster, not a direct controller or DOM-button shortcut.
  255 |   await page.mouse.click(bounds!.x + bounds!.width * 0.47, bounds!.y + bounds!.height * 0.56);
  256 |   const dialog = page.getByRole("dialog", { name: "Studio Monitor Launcher" });
  257 |   await expect(dialog).toBeVisible({ timeout: 5000 });
  258 |   await expect(dialog.getByRole("textbox", { name: "Terminal command input" })).toBeFocused();
  259 |   await dialog.getByRole("button", { name: "Close monitor launcher" }).click();
  260 |   await expect(dialog).toHaveCount(0);
  261 |   await expect(page.getByTestId("open-launcher-btn")).toBeFocused();
  262 | });
  263 | 
  264 | test("explicit entrance replay and option controls trigger clean re-entry", async ({ page }) => {
  265 |   await enterHome(page);
  266 |   const stage = page.getByTestId("world-stage-container");
  267 | 
  268 |   await page.getByTestId("studio-options-toggle").click();
  269 |   const replayBtn = page.getByTestId("replay-entrance-btn");
  270 |   await expect(replayBtn).toBeVisible();
  271 |   await replayBtn.click();
  272 |   // Replay starts entrance or returns to home safely
  273 |   await expect(stage).toHaveAttribute("data-lifecycle-state", /(ENTRANCE|HOME)/);
  274 | });
  275 | 
  276 | test("validated return snapshot skips intro and restores camera and room preferences", async ({ page }) => {
  277 |   await page.addInitScript(() => {
  278 |     window.sessionStorage.setItem("yor_world_return_snapshot_v1", JSON.stringify({
  279 |       returnToStudio: true,
  280 |       preferences: { version: 1, introCompleted: true, soundEnabled: true, quality: "low", clock24h: false },
  281 |       world: { version: 1, lampOn: false, blindsOpen: false, detailFound: true },
  282 |       lastProjectId: "helios",
  283 |       previousCamera: "monitor",
  284 |       timestamp: Date.now(),
  285 |     }));
  286 |   });
  287 |   await page.goto("/?studio=return");
  288 |   const stage = page.getByTestId("world-stage-container");
  289 |   await expect(stage).toHaveAttribute("data-lifecycle-state", "HOME", { timeout: 15000 });
  290 |   await expect(stage).toBeFocused();
  291 |   await expect(page.getByTestId("sound-toggle-btn")).toContainText("Sound: Tap to enable");
```