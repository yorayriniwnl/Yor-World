# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: browser-behavior.spec.ts >> G1 Combined World Integration & Browser Behavior >> 2. Entry & 3. Home Camera: explicit entry mounts world with single resident and chair at F1 coordinates
- Location: tests\e2e\browser-behavior.spec.ts:97:3

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
                - generic [ref=e55]: "{ \"residentCount\": 1, \"chairCount\": 1, \"movingChairCount\": 1, \"deskCount\": 1, \"fixtureStaticDiscarded\": true, \"residentPosition\": [ 0.30000001192092896, 0, -0.36000001430511475 ], \"chairPosition\": [ 0.30000001192092896, 0, -0.36000001430511475 ], \"chairYawDeg\": 0, \"bodyYawDeg\": 0, \"activeClip\": \"coding_idle\", \"currentTime\": 1.0356999999999996, \"cameraPreset\": \"home-mobile\", \"cameraPosition\": [ -1.25, 1.48, 1.15 ], \"cameraFov\": 52, \"soundEnabled\": false, \"reducedMotion\": false, \"webglRenderer\": \"ANGLE (NVIDIA, NVIDIA GeForce RTX 2060 (0x00001E89) Direct3D11 vs_5_0 ps_5_0, D3D11)\", \"mode\": \"coding\" }"
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
  35  |       } catch {
  36  |         // ignore write error
  37  |       }
  38  |     });
  39  |     page.on("request", (req) => {
  40  |       try {
  41  |         fs.appendFileSync(networkLog, `[REQ] ${req.method()} ${req.url()}\n`, "utf8");
  42  |       } catch {
  43  |         // ignore write error
  44  |       }
  45  |     });
  46  |     page.on("response", (res) => {
  47  |       try {
  48  |         fs.appendFileSync(
  49  |           networkLog,
  50  |           `[RES] ${res.status()} ${res.url()} (${res.headers()["content-type"] || ""})\n`,
  51  |           "utf8"
  52  |         );
  53  |       } catch {
  54  |         // ignore write error
  55  |       }
  56  |     });
  57  |   }
  58  | }
  59  | 
  60  | async function captureScreenshot(page: Page, filename: string) {
  61  |   if (screenshotDir) {
  62  |     if (!fs.existsSync(screenshotDir)) {
  63  |       fs.mkdirSync(screenshotDir, { recursive: true });
  64  |     }
  65  |     await page.screenshot({
  66  |       path: path.join(screenshotDir, `${filename}.png`),
  67  |       fullPage: false,
  68  |     });
  69  |   }
  70  | }
  71  | 
  72  | test.describe("G1 Combined World Integration & Browser Behavior", () => {
  73  |   test.beforeEach(async ({ page }) => {
  74  |     setupPageLogging(page);
  75  |   });
  76  | 
  77  |   test("1. Load: public page loads with zero 3D world scripts or models pre-entry", async ({ page }) => {
  78  |     const glbRequests: string[] = [];
  79  |     page.on("request", (req) => {
  80  |       if (req.url().endsWith(".glb")) {
  81  |         glbRequests.push(req.url());
  82  |       }
  83  |     });
  84  | 
  85  |     await page.goto("/");
  86  |     await expect(page.locator("h1")).toContainText("A little world");
  87  |     await captureScreenshot(page, "01-load-landing");
  88  | 
  89  |     await page.locator('[data-testid="studio-disclosure"] summary').click();
  90  |     await expect(page.locator('[data-testid="enter-studio-btn"]')).toBeVisible();
  91  | 
  92  |     // Verify ZERO .glb files were loaded prior to explicit entry
  93  |     expect(glbRequests).toEqual([]);
  94  |     await expect(page.locator('[data-testid="world-canvas"]')).toHaveCount(0);
  95  |   });
  96  | 
  97  |   test("2. Entry & 3. Home Camera: explicit entry mounts world with single resident and chair at F1 coordinates", async ({ page }) => {
  98  |     await page.goto("/?studio=enter");
  99  | 
  100 |     // Wait for world canvas and status badge
  101 |     const canvas = page.locator('[data-testid="world-canvas"]');
  102 |     await expect(canvas).toBeVisible({ timeout: 15000 });
  103 | 
  104 |     const badge = page.locator('[data-testid="status-badge"]');
  105 |     await expect(badge).toBeVisible({ timeout: 15000 });
  106 |     await expect(badge).toContainText("coding_idle");
  107 | 
  108 |     await captureScreenshot(page, "02-entry-home-desktop");
  109 | 
  110 |     // Open diagnostics drawer
  111 |     await page.click('[data-testid="diagnostics-toggle-btn"]');
  112 |     const diagPre = page.locator('[data-testid="world-diagnostics"]');
  113 |     await expect(diagPre).toBeVisible();
  114 | 
  115 |     const text = await diagPre.textContent();
  116 |     expect(text).not.toBeNull();
  117 |     const diag = JSON.parse(text!);
  118 | 
  119 |     // Verify G1 Invariants: exactly 1 resident, 1 moving chair, 1 desk, 0 fixture-static
  120 |     expect(diag.residentCount).toBe(1);
  121 |     expect(diag.chairCount).toBe(1);
  122 |     expect(diag.movingChairCount).toBe(1);
  123 |     expect(diag.deskCount).toBe(1);
  124 |     expect(diag.fixtureStaticDiscarded).toBe(true);
  125 | 
  126 |     // Verify F1 Placement coordinates: (0.30, 0, -0.36)
  127 |     expect(diag.residentPosition[0]).toBeCloseTo(0.3, 1);
  128 |     expect(diag.residentPosition[1]).toBeCloseTo(0, 1);
  129 |     expect(diag.residentPosition[2]).toBeCloseTo(-0.36, 1);
  130 | 
  131 |     expect(diag.chairPosition[0]).toBeCloseTo(0.3, 1);
  132 |     expect(diag.chairPosition[2]).toBeCloseTo(-0.36, 1);
  133 | 
  134 |     // Verify Home Camera Preset
> 135 |     expect(diag.cameraPreset).toBe("home-desktop");
      |                               ^ Error: expect(received).toBe(expected) // Object.is equality
  136 |     expect(diag.activeClip).toBe("coding_idle");
  137 |     expect(diag.soundEnabled).toBe(false);
  138 |   });
  139 | 
  140 |   test("4. Greeting & 5. Return: resident acknowledges visitor with chair turn and returns to work", async ({ page }) => {
  141 |     await page.goto("/?studio=enter");
  142 |     await expect(page.locator('[data-testid="status-badge"]')).toContainText("coding_idle", { timeout: 15000 });
  143 | 
  144 |     // Open diagnostics
  145 |     await page.click('[data-testid="diagnostics-toggle-btn"]');
  146 | 
  147 |     // Trigger Greet
  148 |     await page.click('[data-testid="greet-resident-btn"]');
  149 | 
  150 |     // Verify sequence transitions into notice / turn
  151 |     await expect(page.locator('[data-testid="status-badge"]')).toContainText("notice_visitor");
  152 | 
  153 |     // Wait for turn to visitor
  154 |     await page.waitForTimeout(700);
  155 |     await expect(page.locator('[data-testid="status-badge"]')).toContainText("turn_to_visitor");
  156 | 
  157 |     await captureScreenshot(page, "03-greeting-turn");
  158 | 
  159 |     // Check diagnostics during turn: chair yaw must increase towards 125 degrees
  160 |     const diagText = await page.locator('[data-testid="world-diagnostics"]').textContent();
  161 |     const diag = JSON.parse(diagText!);
  162 |     expect(diag.mode).toBe("sequence");
  163 | 
  164 |     // Wait for greeting nod and return sequence to finish (total sequence ~4.0s)
  165 |     await expect(page.locator('[data-testid="status-badge"]')).toContainText("coding_idle", { timeout: 8000 });
  166 |     await captureScreenshot(page, "04-return-coding");
  167 |   });
  168 | 
  169 |   test("6. Repeat: safe repeated greeting interactions without state corruption", async ({ page }) => {
  170 |     await page.goto("/?studio=enter");
  171 |     await expect(page.locator('[data-testid="status-badge"]')).toContainText("coding_idle", { timeout: 15000 });
  172 | 
  173 |     // First greeting
  174 |     await page.click('[data-testid="greet-resident-btn"]');
  175 |     await page.waitForTimeout(600);
  176 |     await page.click('[data-testid="skip-motion-btn"]');
  177 |     await expect(page.locator('[data-testid="status-badge"]')).toContainText("coding_idle");
  178 | 
  179 |     // Second greeting (repeat)
  180 |     await page.click('[data-testid="greet-resident-btn"]');
  181 |     await expect(page.locator('[data-testid="status-badge"]')).toContainText("notice_visitor");
  182 | 
  183 |     // Third greeting after instant skip
  184 |     await page.click('[data-testid="skip-motion-btn"]');
  185 |     await expect(page.locator('[data-testid="status-badge"]')).toContainText("coding_idle");
  186 |     await captureScreenshot(page, "05-repeat-greeting");
  187 |   });
  188 | 
  189 |   test("7. Cancel: safe cancellation reverses along collision-checked path back to rest", async ({ page }) => {
  190 |     await page.goto("/?studio=enter");
  191 |     await expect(page.locator('[data-testid="status-badge"]')).toContainText("coding_idle", { timeout: 15000 });
  192 | 
  193 |     // Start greeting
  194 |     await page.click('[data-testid="greet-resident-btn"]');
  195 |     await page.waitForTimeout(800); // Wait until turn_to_visitor
  196 | 
  197 |     // Click cancel
  198 |     await page.click('[data-testid="cancel-motion-btn"]');
  199 | 
  200 |     // Should indicate safe-return
  201 |     await expect(page.locator('[data-testid="status-badge"]')).toContainText("safe-return");
  202 | 
  203 |     // Wait for return to finish
  204 |     await expect(page.locator('[data-testid="status-badge"]')).toContainText("coding_idle", { timeout: 5000 });
  205 |     await captureScreenshot(page, "06-cancel-safe-return");
  206 |   });
  207 | 
  208 |   test("8. Skip/Escape: instant settlement to coding pose within ≤50ms", async ({ page }) => {
  209 |     await page.goto("/?studio=enter");
  210 |     await expect(page.locator('[data-testid="status-badge"]')).toContainText("coding_idle", { timeout: 15000 });
  211 | 
  212 |     // Start greeting
  213 |     await page.click('[data-testid="greet-resident-btn"]');
  214 |     await page.waitForTimeout(800); // Mid-turn
  215 | 
  216 |     // Press Escape key
  217 |     const startTime = Date.now();
  218 |     await page.keyboard.press("Escape");
  219 | 
  220 |     // Verify immediate settlement
  221 |     await expect(page.locator('[data-testid="status-badge"]')).toContainText("coding_idle");
  222 |     const elapsed = Date.now() - startTime;
  223 |     expect(elapsed).toBeLessThanOrEqual(500); // Fast UI response
  224 |     await captureScreenshot(page, "07-skip-instant-settle");
  225 |   });
  226 | 
  227 |   test("9. Monitor & 10. Reverse Doorway camera navigation", async ({ page }) => {
  228 |     await page.goto("/?studio=enter");
  229 |     await expect(page.locator('[data-testid="world-canvas"]')).toBeVisible({ timeout: 15000 });
  230 |     await page.click('[data-testid="diagnostics-toggle-btn"]');
  231 | 
  232 |     // Switch to Monitor
  233 |     await page.click('[data-testid="camera-monitor-btn"]');
  234 |     let text = await page.locator('[data-testid="world-diagnostics"]').textContent();
  235 |     let diag = JSON.parse(text!);
```