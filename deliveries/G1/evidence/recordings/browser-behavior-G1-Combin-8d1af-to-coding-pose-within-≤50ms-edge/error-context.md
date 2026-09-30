# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: browser-behavior.spec.ts >> G1 Combined World Integration & Browser Behavior >> 8. Skip/Escape: instant settlement to coding pose within ≤50ms
- Location: tests\e2e\browser-behavior.spec.ts:202:3

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:3147/?studio=enter
Call log:
  - navigating to "http://127.0.0.1:3147/?studio=enter", waiting until "load"

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - generic [ref=e6]:
      - heading "Hmmm… can't reach this page" [level=1] [ref=e7]
      - paragraph [ref=e8]:
        - strong [ref=e9]: 127.0.0.1
        - text: refused to connect.
      - generic [ref=e10]:
        - paragraph [ref=e11]: "Try:"
        - list [ref=e12]:
          - listitem [ref=e13]: •Checking the connection
          - listitem [ref=e14]:
            - text: •
            - link "Checking the proxy and the firewall" [ref=e15] [cursor=pointer]:
              - /url: "#buttons"
      - generic [ref=e16]: ERR_CONNECTION_REFUSED
    - button "Refresh" [ref=e19] [cursor=pointer]
  - generic [ref=e20]: Microsoft Edge
```

# Test source

```ts
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
  131 |     expect(diag.cameraPreset).toBe("home-desktop");
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
> 203 |     await page.goto("/?studio=enter");
      |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:3147/?studio=enter
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
  232 |     expect(diag.cameraPosition[2]).toBeCloseTo(-0.5, 1);
  233 |     await captureScreenshot(page, "05-camera-monitor");
  234 | 
  235 |     // Switch to Reverse Doorway
  236 |     await page.click('[data-testid="camera-reverse-btn"]');
  237 |     text = await page.locator('[data-testid="world-diagnostics"]').textContent();
  238 |     diag = JSON.parse(text!);
  239 |     expect(diag.cameraPreset).toBe("reverse-doorway");
  240 |     expect(diag.cameraPosition[0]).toBeCloseTo(0.2, 1);
  241 |     expect(diag.cameraPosition[1]).toBeCloseTo(1.25, 1);
  242 |     expect(diag.cameraPosition[2]).toBeCloseTo(-1.0, 1);
  243 |     await captureScreenshot(page, "06-camera-reverse-doorway");
  244 | 
  245 |     // Switch back to Home
  246 |     await page.click('[data-testid="camera-home-btn"]');
  247 |     text = await page.locator('[data-testid="world-diagnostics"]').textContent();
  248 |     diag = JSON.parse(text!);
  249 |     expect(diag.cameraPreset).toBe("home-desktop");
  250 |   });
  251 | 
  252 |   test("11. Mobile Viewport: touch-friendly HUD and mobile framing", async ({ page }) => {
  253 |     await page.setViewportSize({ width: 390, height: 844 });
  254 |     await page.goto("/?studio=enter");
  255 | 
  256 |     await expect(page.locator('[data-testid="world-canvas"]')).toBeVisible({ timeout: 15000 });
  257 |     await captureScreenshot(page, "07-mobile-viewport");
  258 | 
  259 |     // Buttons must have >= 44px touch height
  260 |     const btnBox = await page.locator('[data-testid="greet-resident-btn"]').boundingBox();
  261 |     expect(btnBox).not.toBeNull();
  262 |     expect(btnBox!.height).toBeGreaterThanOrEqual(44);
  263 | 
  264 |     // Diagnostics should report mobile preset or portrait aspect
  265 |     await page.click('[data-testid="diagnostics-toggle-btn"]');
  266 |     const text = await page.locator('[data-testid="world-diagnostics"]').textContent();
  267 |     const diag = JSON.parse(text!);
  268 |     expect(diag.cameraPreset).toBe("home-mobile");
  269 |   });
  270 | 
  271 |   test("12. Reduced Motion & Sound Defaults", async ({ page }) => {
  272 |     await page.goto("/?studio=enter");
  273 |     await expect(page.locator('[data-testid="world-canvas"]')).toBeVisible({ timeout: 15000 });
  274 |     await page.click('[data-testid="diagnostics-toggle-btn"]');
  275 | 
  276 |     // Default sound is OFF
  277 |     await expect(page.locator('[data-testid="sound-toggle-btn"]')).toContainText("Sound: Off");
  278 |     let text = await page.locator('[data-testid="world-diagnostics"]').textContent();
  279 |     let diag = JSON.parse(text!);
  280 |     expect(diag.soundEnabled).toBe(false);
  281 | 
  282 |     // Toggle sound ON
  283 |     await page.click('[data-testid="sound-toggle-btn"]');
  284 |     await expect(page.locator('[data-testid="sound-toggle-btn"]')).toContainText("Sound: On");
  285 | 
  286 |     // Toggle Reduced Motion ON
  287 |     await page.click('[data-testid="reduced-motion-toggle-btn"]');
  288 |     await expect(page.locator('[data-testid="reduced-motion-toggle-btn"]')).toContainText("Reduced Motion: On");
  289 |     text = await page.locator('[data-testid="world-diagnostics"]').textContent();
  290 |     diag = JSON.parse(text!);
  291 |     expect(diag.reducedMotion).toBe(true);
  292 | 
  293 |     await captureScreenshot(page, "08-reduced-motion");
  294 |   });
  295 | 
  296 |   test("13. Asset Failure: graceful fallback leaves useful HTML", async ({ page }) => {
  297 |     await page.goto("/?simulateAssetError=1");
  298 | 
  299 |     // Verify fallback banner appears
  300 |     const fallback = page.locator('[data-testid="world-fallback-banner"]');
  301 |     await expect(fallback).toBeVisible({ timeout: 5000 });
  302 |     await expect(fallback).toContainText("Accessible Portfolio View");
  303 |     await captureScreenshot(page, "09-asset-fallback");
```