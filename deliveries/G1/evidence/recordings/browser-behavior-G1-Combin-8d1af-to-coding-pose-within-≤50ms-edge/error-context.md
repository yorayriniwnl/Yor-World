# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: browser-behavior.spec.ts >> G1 Combined World Integration & Browser Behavior >> 8. Skip/Escape: instant settlement to coding pose within ≤50ms
- Location: tests\e2e\browser-behavior.spec.ts:208:3

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('[data-testid="status-badge"]')
Expected substring: "coding_idle"
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toContainText" locator('[data-testid="status-badge"]') with timeout 15000ms
  - waiting for locator('[data-testid="status-badge"]')

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
    - paragraph: Ayush Roy / YOR Draft identity
    - paragraph: Software engineer — proposed title
    - paragraph: Name and professional title await owner confirmation.
    - link "View projects":
      - /url: /projects
    - group: Enter studio
    - paragraph: Portfolio preview · Content is awaiting verification.
    - complementary "Studio status":
      - text: YOR / 01 In the making
      - paragraph:
        - text: A space for
        - strong: curiosity.
      - text: Studio coming later Portfolio pages below
  - region "Start anywhere.":
    - paragraph: Take a look around
    - heading "Start anywhere." [level=2]
    - list:
      - listitem:
        - link "01 Projects Case studies, as they are verified":
          - /url: /projects
          - text: "01"
          - strong: Projects
          - text: Case studies, as they are verified
      - listitem:
        - link "02 About Background and skills, in progress":
          - /url: /about
          - text: "02"
          - strong: About
          - text: Background and skills, in progress
      - listitem:
        - link "03 Contact Details awaiting confirmation":
          - /url: /contact
          - text: "03"
          - strong: Contact
          - text: Details awaiting confirmation
- contentinfo:
  - paragraph: YOR WORLD Portfolio preview
  - paragraph: Sound off Explore at your pace
```

# Test source

```ts
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
  135 |     expect(diag.cameraPreset).toBe("home-desktop");
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
> 210 |     await expect(page.locator('[data-testid="status-badge"]')).toContainText("coding_idle", { timeout: 15000 });
      |                                                                ^ Error: expect(locator).toContainText(expected) failed
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
  236 |     expect(diag.cameraPreset).toBe("monitor");
  237 |     expect(diag.cameraPosition[0]).toBeCloseTo(0, 1);
  238 |     expect(diag.cameraPosition[1]).toBeCloseTo(1.08, 1);
  239 |     expect(diag.cameraPosition[2]).toBeCloseTo(-0.5, 1);
  240 |     await captureScreenshot(page, "08-camera-monitor");
  241 | 
  242 |     // Switch to Reverse Doorway
  243 |     await page.click('[data-testid="camera-reverse-btn"]');
  244 |     text = await page.locator('[data-testid="world-diagnostics"]').textContent();
  245 |     diag = JSON.parse(text!);
  246 |     expect(diag.cameraPreset).toBe("reverse-doorway");
  247 |     expect(diag.cameraPosition[0]).toBeCloseTo(0.2, 1);
  248 |     expect(diag.cameraPosition[1]).toBeCloseTo(1.25, 1);
  249 |     expect(diag.cameraPosition[2]).toBeCloseTo(-1.0, 1);
  250 |     await captureScreenshot(page, "09-camera-reverse-doorway");
  251 | 
  252 |     // Switch back to Home
  253 |     await page.click('[data-testid="camera-home-btn"]');
  254 |     text = await page.locator('[data-testid="world-diagnostics"]').textContent();
  255 |     diag = JSON.parse(text!);
  256 |     expect(diag.cameraPreset).toBe("home-desktop");
  257 |   });
  258 | 
  259 |   test("11. Mobile Viewport: touch-friendly HUD and mobile framing", async ({ page }) => {
  260 |     await page.setViewportSize({ width: 390, height: 844 });
  261 |     await page.goto("/?studio=enter");
  262 | 
  263 |     await expect(page.locator('[data-testid="world-canvas"]')).toBeVisible({ timeout: 15000 });
  264 |     await captureScreenshot(page, "10-mobile-viewport");
  265 | 
  266 |     // Buttons must have >= 44px touch height
  267 |     const btnBox = await page.locator('[data-testid="greet-resident-btn"]').boundingBox();
  268 |     expect(btnBox).not.toBeNull();
  269 |     expect(btnBox!.height).toBeGreaterThanOrEqual(44);
  270 | 
  271 |     // Diagnostics should report mobile preset or portrait aspect
  272 |     await page.click('[data-testid="diagnostics-toggle-btn"]');
  273 |     const text = await page.locator('[data-testid="world-diagnostics"]').textContent();
  274 |     const diag = JSON.parse(text!);
  275 |     expect(diag.cameraPreset).toBe("home-mobile");
  276 |   });
  277 | 
  278 |   test("12. Reduced Motion & Sound Defaults", async ({ page }) => {
  279 |     await page.goto("/?studio=enter");
  280 |     await expect(page.locator('[data-testid="world-canvas"]')).toBeVisible({ timeout: 15000 });
  281 |     await page.click('[data-testid="diagnostics-toggle-btn"]');
  282 | 
  283 |     // Default sound is OFF
  284 |     await expect(page.locator('[data-testid="sound-toggle-btn"]')).toContainText("Sound: Off");
  285 |     let text = await page.locator('[data-testid="world-diagnostics"]').textContent();
  286 |     let diag = JSON.parse(text!);
  287 |     expect(diag.soundEnabled).toBe(false);
  288 | 
  289 |     // Toggle sound ON
  290 |     await page.click('[data-testid="sound-toggle-btn"]');
  291 |     await expect(page.locator('[data-testid="sound-toggle-btn"]')).toContainText("Sound: On");
  292 | 
  293 |     // Toggle Reduced Motion ON
  294 |     await page.click('[data-testid="reduced-motion-toggle-btn"]');
  295 |     await expect(page.locator('[data-testid="reduced-motion-toggle-btn"]')).toContainText("Reduced Motion: On");
  296 |     await expect(page.locator('[data-testid="world-diagnostics"]')).toContainText('"reducedMotion": true');
  297 |     text = await page.locator('[data-testid="world-diagnostics"]').textContent();
  298 |     diag = JSON.parse(text!);
  299 |     expect(diag.reducedMotion).toBe(true);
  300 | 
  301 |     await captureScreenshot(page, "11-reduced-motion");
  302 |   });
  303 | 
  304 |   test("13. Asset Failure: graceful fallback leaves useful HTML", async ({ page }) => {
  305 |     await page.goto("/?simulateAssetError=1");
  306 | 
  307 |     // Verify fallback banner appears
  308 |     const fallback = page.locator('[data-testid="world-fallback-banner"]');
  309 |     await expect(fallback).toBeVisible({ timeout: 5000 });
  310 |     await expect(fallback).toContainText("Accessible Portfolio View");
```