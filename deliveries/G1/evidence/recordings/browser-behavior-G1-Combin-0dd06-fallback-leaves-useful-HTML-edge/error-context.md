# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: browser-behavior.spec.ts >> G1 Combined World Integration & Browser Behavior >> 13. Asset Failure: graceful fallback leaves useful HTML
- Location: tests\e2e\browser-behavior.spec.ts:296:3

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:3147/?simulateAssetError=1
Call log:
  - navigating to "http://127.0.0.1:3147/?simulateAssetError=1", waiting until "load"

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
> 297 |     await page.goto("/?simulateAssetError=1");
      |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:3147/?simulateAssetError=1
  298 | 
  299 |     // Verify fallback banner appears
  300 |     const fallback = page.locator('[data-testid="world-fallback-banner"]');
  301 |     await expect(fallback).toBeVisible({ timeout: 5000 });
  302 |     await expect(fallback).toContainText("Accessible Portfolio View");
  303 |     await captureScreenshot(page, "09-asset-fallback");
  304 | 
  305 |     // Direct links to projects and about are present and working
  306 |     await expect(page.locator('[data-testid="fallback-projects-link"]')).toBeVisible();
  307 |     await expect(page.locator('[data-testid="fallback-about-link"]')).toBeVisible();
  308 | 
  309 |     // Verify main page directory remains fully reachable
  310 |     await expect(page.locator("h2#directory-heading")).toContainText("Start anywhere");
  311 |   });
  312 | 
  313 |   test("14. Renderer Failure: WebGL failure caught cleanly leaving useful HTML", async ({ page }) => {
  314 |     await page.goto("/?simulateRendererError=1");
  315 | 
  316 |     // Verify fallback banner appears
  317 |     const fallback = page.locator('[data-testid="world-fallback-banner"]');
  318 |     await expect(fallback).toBeVisible({ timeout: 5000 });
  319 |     await expect(fallback).toContainText("Accessible Portfolio View");
  320 |     await captureScreenshot(page, "10-renderer-fallback");
  321 | 
  322 |     // Page navigation still functions
  323 |     await expect(page.locator('a[href="/projects"]')).toHaveCount(2); // In nav and directory
  324 |   });
  325 | 
  326 |   test("15. Fallback Content with JavaScript Disabled: 100% useful semantic HTML", async ({ browser }) => {
  327 |     const context = await browser.newContext({ javaScriptEnabled: false });
  328 |     const page = await context.newPage();
  329 | 
  330 |     await page.goto("/");
  331 |     await expect(page.locator("h1")).toContainText("A little world");
  332 |     await captureScreenshot(page, "11-fallback-no-javascript");
  333 | 
  334 |     // Details disclosure works natively without JS
  335 |     const disclosure = page.locator('[data-testid="studio-disclosure"]');
  336 |     await expect(disclosure).toBeVisible();
  337 | 
  338 |     // Public links work without JS
  339 |     await page.click('a[href="/about"]');
  340 |     await expect(page.locator("h1")).toContainText("About");
  341 | 
  342 |     await context.close();
  343 |   });
  344 | });
  345 | 
```