# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: browser-behavior.spec.ts >> G1 Combined World Integration & Browser Behavior >> 2. Entry & 3. Home Camera: explicit entry mounts world with single resident and chair at F1 coordinates
- Location: tests\e2e\browser-behavior.spec.ts:93:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: "home-desktop"
Received: "home-mobile"
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
              - text: Ayush Roy / YOR
              - generic [ref=e28]: Draft identity
            - paragraph [ref=e29]: Software engineer — proposed title
            - paragraph [ref=e30]: Name and professional title await owner confirmation.
          - generic [ref=e31]:
            - link "View projects" [ref=e32] [cursor=pointer]:
              - /url: /projects
              - text: View projects
              - generic [aria-hidden] [ref=e33]: ↗
            - region "Interactive 3D Studio" [ref=e35]:
              - generic "3D Room view showing resident, workstation, and moving chair" [ref=e36]
              - generic:
                - generic [ref=e37]:
                  - generic [ref=e38]:
                    - button "Acknowledge and greet resident" [ref=e39] [cursor=pointer]: Greet Resident
                    - button "Safely cancel motion and return to work" [ref=e40] [cursor=pointer]: Cancel
                    - button "Instant skip to coding pose (Escape)" [ref=e41] [cursor=pointer]: Skip (Esc)
                  - generic [ref=e42]:
                    - button "Sound Off" [ref=e43] [cursor=pointer]: "Sound: Off"
                    - button "Reduced Motion Off" [ref=e44] [cursor=pointer]: "Reduced Motion: Off"
                    - button "Exit 3D Studio and return to portfolio" [ref=e45] [cursor=pointer]: Exit Studio
                - generic [ref=e46]:
                  - generic [ref=e47]:
                    - button "Home Camera" [ref=e48] [cursor=pointer]
                    - button "Monitor" [ref=e49] [cursor=pointer]
                    - button "Reverse Doorway" [ref=e50] [cursor=pointer]
                    - button "Mobile View" [ref=e51] [cursor=pointer]
                  - generic [ref=e52]:
                    - button "Diagnostics" [active] [ref=e53] [cursor=pointer]
                    - generic [ref=e54]: coding_idle · coding
                - generic [ref=e55]: "{ \"residentCount\": 1, \"chairCount\": 1, \"movingChairCount\": 1, \"deskCount\": 1, \"fixtureStaticDiscarded\": true, \"residentPosition\": [ 0.30000001192092896, 0, -0.36000001430511475 ], \"chairPosition\": [ 0.30000001192092896, 0, -0.36000001430511475 ], \"chairYawDeg\": 0, \"bodyYawDeg\": 0, \"activeClip\": \"coding_idle\", \"currentTime\": 2.5614999999999997, \"cameraPreset\": \"home-mobile\", \"cameraPosition\": [ -1.25, 1.48, 1.15 ], \"cameraFov\": 52, \"soundEnabled\": false, \"reducedMotion\": false, \"webglRenderer\": \"ANGLE (NVIDIA, NVIDIA GeForce RTX 2060 (0x00001E89) Direct3D11 vs_5_0 ps_5_0, D3D11)\", \"mode\": \"coding\" }"
          - paragraph [ref=e56]: Portfolio preview · Content is awaiting verification.
        - complementary "Studio status" [ref=e57]:
          - generic [ref=e58]:
            - generic [ref=e59]: YOR / 01
            - generic [ref=e60]: In the making
          - generic [ref=e63]: "Y"
          - generic [ref=e67]:
            - paragraph [ref=e68]:
              - text: A space for
              - strong [ref=e69]: curiosity.
            - generic [ref=e70]: Studio coming laterPortfolio pages below
      - region [ref=e71]:
        - generic [ref=e72]:
          - paragraph [ref=e73]: Take a look around
          - heading "Start anywhere." [level=2] [ref=e74]
        - list [ref=e75]:
          - listitem [ref=e76]:
            - link "01 Projects Case studies, as they are verified" [ref=e77] [cursor=pointer]:
              - /url: /projects
              - generic [ref=e78]: "01"
              - generic [ref=e79]:
                - strong [ref=e80]: Projects
                - text: Case studies, as they are verified
              - generic [aria-hidden] [ref=e81]: ↗
          - listitem [ref=e82]:
            - link "02 About Background and skills, in progress" [ref=e83] [cursor=pointer]:
              - /url: /about
              - generic [ref=e84]: "02"
              - generic [ref=e85]:
                - strong [ref=e86]: About
                - text: Background and skills, in progress
              - generic [aria-hidden] [ref=e87]: ↗
          - listitem [ref=e88]:
            - link "03 Contact Details awaiting confirmation" [ref=e89] [cursor=pointer]:
              - /url: /contact
              - generic [ref=e90]: "03"
              - generic [ref=e91]:
                - strong [ref=e92]: Contact
                - text: Details awaiting confirmation
              - generic [aria-hidden] [ref=e93]: ↗
    - contentinfo [ref=e94]:
      - paragraph [ref=e95]: YOR WORLD / Portfolio preview
      - paragraph [ref=e96]: Sound off · Explore at your pace
  - alert [ref=e98]
```

# Test source

```ts
  31  |       } catch {
  32  |         // ignore write error
  33  |       }
  34  |     });
  35  |     page.on("request", (req) => {
  36  |       try {
  37  |         fs.appendFileSync(networkLog, `[REQ] ${req.method()} ${req.url()}\n`, "utf8");
  38  |       } catch {
  39  |         // ignore write error
  40  |       }
  41  |     });
  42  |     page.on("response", (res) => {
  43  |       try {
  44  |         fs.appendFileSync(
  45  |           networkLog,
  46  |           `[RES] ${res.status()} ${res.url()} (${res.headers()["content-type"] || ""})\n`,
  47  |           "utf8"
  48  |         );
  49  |       } catch {
  50  |         // ignore write error
  51  |       }
  52  |     });
  53  |   }
  54  | }
  55  | 
  56  | async function captureScreenshot(page: Page, filename: string) {
  57  |   if (screenshotDir) {
  58  |     if (!fs.existsSync(screenshotDir)) {
  59  |       fs.mkdirSync(screenshotDir, { recursive: true });
  60  |     }
  61  |     await page.screenshot({
  62  |       path: path.join(screenshotDir, `${filename}.png`),
  63  |       fullPage: false,
  64  |     });
  65  |   }
  66  | }
  67  | 
  68  | test.describe("G1 Combined World Integration & Browser Behavior", () => {
  69  |   test.beforeEach(async ({ page }) => {
  70  |     setupPageLogging(page);
  71  |   });
  72  | 
  73  |   test("1. Load: public page loads with zero 3D world scripts or models pre-entry", async ({ page }) => {
  74  |     const glbRequests: string[] = [];
  75  |     page.on("request", (req) => {
  76  |       if (req.url().endsWith(".glb")) {
  77  |         glbRequests.push(req.url());
  78  |       }
  79  |     });
  80  | 
  81  |     await page.goto("/");
  82  |     await expect(page.locator("h1")).toContainText("A little world");
  83  |     await captureScreenshot(page, "01-load-landing");
  84  | 
  85  |     await page.locator('[data-testid="studio-disclosure"] summary').click();
  86  |     await expect(page.locator('[data-testid="enter-studio-btn"]')).toBeVisible();
  87  | 
  88  |     // Verify ZERO .glb files were loaded prior to explicit entry
  89  |     expect(glbRequests).toEqual([]);
  90  |     await expect(page.locator('[data-testid="world-canvas"]')).toHaveCount(0);
  91  |   });
  92  | 
  93  |   test("2. Entry & 3. Home Camera: explicit entry mounts world with single resident and chair at F1 coordinates", async ({ page }) => {
  94  |     await page.goto("/?studio=enter");
  95  | 
  96  |     // Wait for world canvas and status badge
  97  |     const canvas = page.locator('[data-testid="world-canvas"]');
  98  |     await expect(canvas).toBeVisible({ timeout: 15000 });
  99  | 
  100 |     const badge = page.locator('[data-testid="status-badge"]');
  101 |     await expect(badge).toBeVisible({ timeout: 15000 });
  102 |     await expect(badge).toContainText("coding_idle");
  103 | 
  104 |     await captureScreenshot(page, "02-entry-home-desktop");
  105 | 
  106 |     // Open diagnostics drawer
  107 |     await page.click('[data-testid="diagnostics-toggle-btn"]');
  108 |     const diagPre = page.locator('[data-testid="world-diagnostics"]');
  109 |     await expect(diagPre).toBeVisible();
  110 | 
  111 |     const text = await diagPre.textContent();
  112 |     expect(text).not.toBeNull();
  113 |     const diag = JSON.parse(text!);
  114 | 
  115 |     // Verify G1 Invariants: exactly 1 resident, 1 moving chair, 1 desk, 0 fixture-static
  116 |     expect(diag.residentCount).toBe(1);
  117 |     expect(diag.chairCount).toBe(1);
  118 |     expect(diag.movingChairCount).toBe(1);
  119 |     expect(diag.deskCount).toBe(1);
  120 |     expect(diag.fixtureStaticDiscarded).toBe(true);
  121 | 
  122 |     // Verify F1 Placement coordinates: (0.30, 0, -0.36)
  123 |     expect(diag.residentPosition[0]).toBeCloseTo(0.3, 1);
  124 |     expect(diag.residentPosition[1]).toBeCloseTo(0, 1);
  125 |     expect(diag.residentPosition[2]).toBeCloseTo(-0.36, 1);
  126 | 
  127 |     expect(diag.chairPosition[0]).toBeCloseTo(0.3, 1);
  128 |     expect(diag.chairPosition[2]).toBeCloseTo(-0.36, 1);
  129 | 
  130 |     // Verify Home Camera Preset
> 131 |     expect(diag.cameraPreset).toBe("home-desktop");
      |                               ^ Error: expect(received).toBe(expected) // Object.is equality
  132 |     expect(diag.activeClip).toBe("coding_idle");
  133 |     expect(diag.soundEnabled).toBe(false);
  134 |   });
  135 | 
  136 |   test("4. Greeting & 5. Return: resident acknowledges visitor with chair turn and returns to work", async ({ page }) => {
  137 |     await page.goto("/?studio=enter");
  138 |     await expect(page.locator('[data-testid="status-badge"]')).toContainText("coding_idle", { timeout: 15000 });
  139 | 
  140 |     // Open diagnostics
  141 |     await page.click('[data-testid="diagnostics-toggle-btn"]');
  142 | 
  143 |     // Trigger Greet
  144 |     await page.click('[data-testid="greet-resident-btn"]');
  145 | 
  146 |     // Verify sequence transitions into notice / turn
  147 |     await expect(page.locator('[data-testid="status-badge"]')).toContainText("notice_visitor");
  148 | 
  149 |     // Wait for turn to visitor
  150 |     await page.waitForTimeout(700);
  151 |     await expect(page.locator('[data-testid="status-badge"]')).toContainText("turn_to_visitor");
  152 | 
  153 |     await captureScreenshot(page, "03-greeting-turn");
  154 | 
  155 |     // Check diagnostics during turn: chair yaw must increase towards 125 degrees
  156 |     const diagText = await page.locator('[data-testid="world-diagnostics"]').textContent();
  157 |     const diag = JSON.parse(diagText!);
  158 |     expect(diag.mode).toBe("sequence");
  159 | 
  160 |     // Wait for greeting nod and return sequence to finish (total sequence ~4.0s)
  161 |     await expect(page.locator('[data-testid="status-badge"]')).toContainText("coding_idle", { timeout: 8000 });
  162 |     await captureScreenshot(page, "04-return-to-work");
  163 |   });
  164 | 
  165 |   test("6. Repeat: safe repeated greeting interactions without state corruption", async ({ page }) => {
  166 |     await page.goto("/?studio=enter");
  167 |     await expect(page.locator('[data-testid="status-badge"]')).toContainText("coding_idle", { timeout: 15000 });
  168 | 
  169 |     // First greeting
  170 |     await page.click('[data-testid="greet-resident-btn"]');
  171 |     await page.waitForTimeout(600);
  172 |     await page.click('[data-testid="skip-motion-btn"]');
  173 |     await expect(page.locator('[data-testid="status-badge"]')).toContainText("coding_idle");
  174 | 
  175 |     // Second greeting (repeat)
  176 |     await page.click('[data-testid="greet-resident-btn"]');
  177 |     await expect(page.locator('[data-testid="status-badge"]')).toContainText("notice_visitor");
  178 | 
  179 |     // Third greeting after instant skip
  180 |     await page.click('[data-testid="skip-motion-btn"]');
  181 |     await expect(page.locator('[data-testid="status-badge"]')).toContainText("coding_idle");
  182 |   });
  183 | 
  184 |   test("7. Cancel: safe cancellation reverses along collision-checked path back to rest", async ({ page }) => {
  185 |     await page.goto("/?studio=enter");
  186 |     await expect(page.locator('[data-testid="status-badge"]')).toContainText("coding_idle", { timeout: 15000 });
  187 | 
  188 |     // Start greeting
  189 |     await page.click('[data-testid="greet-resident-btn"]');
  190 |     await page.waitForTimeout(800); // Wait until turn_to_visitor
  191 | 
  192 |     // Click cancel
  193 |     await page.click('[data-testid="cancel-motion-btn"]');
  194 | 
  195 |     // Should indicate safe-return
  196 |     await expect(page.locator('[data-testid="status-badge"]')).toContainText("safe-return");
  197 | 
  198 |     // Wait for return to finish
  199 |     await expect(page.locator('[data-testid="status-badge"]')).toContainText("coding_idle", { timeout: 5000 });
  200 |   });
  201 | 
  202 |   test("8. Skip/Escape: instant settlement to coding pose within ≤50ms", async ({ page }) => {
  203 |     await page.goto("/?studio=enter");
  204 |     await expect(page.locator('[data-testid="status-badge"]')).toContainText("coding_idle", { timeout: 15000 });
  205 | 
  206 |     // Start greeting
  207 |     await page.click('[data-testid="greet-resident-btn"]');
  208 |     await page.waitForTimeout(800); // Mid-turn
  209 | 
  210 |     // Press Escape key
  211 |     const startTime = Date.now();
  212 |     await page.keyboard.press("Escape");
  213 | 
  214 |     // Verify immediate settlement
  215 |     await expect(page.locator('[data-testid="status-badge"]')).toContainText("coding_idle");
  216 |     const elapsed = Date.now() - startTime;
  217 |     expect(elapsed).toBeLessThanOrEqual(500); // Fast UI response
  218 |   });
  219 | 
  220 |   test("9. Monitor & 10. Reverse Doorway camera navigation", async ({ page }) => {
  221 |     await page.goto("/?studio=enter");
  222 |     await expect(page.locator('[data-testid="world-canvas"]')).toBeVisible({ timeout: 15000 });
  223 |     await page.click('[data-testid="diagnostics-toggle-btn"]');
  224 | 
  225 |     // Switch to Monitor
  226 |     await page.click('[data-testid="camera-monitor-btn"]');
  227 |     let text = await page.locator('[data-testid="world-diagnostics"]').textContent();
  228 |     let diag = JSON.parse(text!);
  229 |     expect(diag.cameraPreset).toBe("monitor");
  230 |     expect(diag.cameraPosition[0]).toBeCloseTo(0, 1);
  231 |     expect(diag.cameraPosition[1]).toBeCloseTo(1.08, 1);
```