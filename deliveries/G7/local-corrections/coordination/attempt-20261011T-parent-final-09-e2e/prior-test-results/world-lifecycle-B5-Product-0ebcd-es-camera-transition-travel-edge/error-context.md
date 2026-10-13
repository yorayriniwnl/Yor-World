# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: world-lifecycle.spec.ts >> B5 Production Runtime Lifecycle Foundation - Adversarial & Invariant Tests >> 10. reduced-motion toggled during active experience: updates camera transition travel
- Location: tests\e2e\world-lifecycle.spec.ts:246:3

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator: locator('[data-testid="reduced-motion-toggle-btn"]')
Expected pattern: /Reduced Motion: On/
Received string:  "Reduced Motion: ON"
Timeout: 5000ms

Call log:
  - Expect "toHaveText" locator('[data-testid="reduced-motion-toggle-btn"]') with timeout 5000ms
  - waiting for locator('[data-testid="reduced-motion-toggle-btn"]')
    13 × locator resolved to <button type="button" role="switch" aria-checked="true" aria-label="Toggle Reduced Motion" data-testid="reduced-motion-toggle-btn" class="accessibility-controls-module__lOl7oq__toggleButton accessibility-controls-module__lOl7oq__toggleButtonActive">Reduced Motion: ON</button>
       - unexpected value "Reduced Motion: ON"

```

```yaml
- switch "Toggle Reduced Motion" [checked]: "Reduced Motion: ON"
```

# Test source

```ts
  155 |     // Canvas must be completely removed from DOM
  156 |     expect(await page.locator("canvas").count()).toBe(0);
  157 |     await expect(page.locator("h1")).toContainText(/Projects|Selected Works/i);
  158 | 
  159 |     await captureScreenshot(page, "b5-04-route-navigation-clean-unmount.png");
  160 |   });
  161 | 
  162 |   test("5. Enter -> Back: browser back button returns to clean static portfolio without errors", async ({ page }) => {
  163 |     await page.goto("/");
  164 |     await page.waitForLoadState("domcontentloaded");
  165 | 
  166 |     // Open and Enter studio
  167 |     await page.locator('[data-testid="studio-disclosure"] summary').click();
  168 |     await page.locator('[data-testid="enter-studio-btn"]').click();
  169 |     await expect(page.locator('[data-testid="world-stage-container"]')).toBeVisible({ timeout: 15000 });
  170 | 
  171 |     // Exit studio via Exit button
  172 |     await page.locator('[data-testid="exit-studio-btn"]').click();
  173 |     await expect(page.locator('[data-testid="studio-disclosure"]')).toBeVisible();
  174 |     expect(await page.locator("canvas").count()).toBe(0);
  175 | 
  176 |     await captureScreenshot(page, "b5-05-exit-clean-static.png");
  177 |   });
  178 | 
  179 |   test("6. loading -> renderer failure: simulated renderer failure gracefully renders accessible fallback", async ({ page }) => {
  180 |     await page.goto("/?simulateRendererError=1");
  181 |     const fallback = page.locator('[data-testid="world-fallback-banner"]');
  182 |     await expect(fallback).toBeVisible({ timeout: 15000 });
  183 | 
  184 |     // Semantic site is intact
  185 |     await expect(page.locator("main")).toBeVisible();
  186 |     await expect(page.locator("nav")).toBeVisible();
  187 | 
  188 |     // Zero canvas instances on renderer error
  189 |     expect(await page.locator("canvas").count()).toBe(0);
  190 | 
  191 |     // Fallback actions exist
  192 |     await expect(page.locator('[data-testid="fallback-retry-btn"]')).toBeVisible();
  193 |     await expect(page.locator('[data-testid="fallback-dismiss-btn"]')).toBeVisible();
  194 | 
  195 |     await captureScreenshot(page, "b5-06-renderer-failure-fallback.png");
  196 |   });
  197 | 
  198 |   test("7. failed asset -> Retry: simulated asset failure shows bounded retry", async ({ page }) => {
  199 |     await page.goto("/?simulateAssetError=1");
  200 |     const fallback = page.locator('[data-testid="world-fallback-banner"]');
  201 |     await expect(fallback).toBeVisible({ timeout: 15000 });
  202 | 
  203 |     await expect(fallback).toContainText(/required asset failure/i);
  204 |     const retryBtn = page.locator('[data-testid="fallback-retry-btn"]');
  205 |     await expect(retryBtn).toBeVisible();
  206 | 
  207 |     await captureScreenshot(page, "b5-07-asset-failure-retry.png");
  208 |   });
  209 | 
  210 |   test("8. failure -> Continue with portfolio: dismisses fallback and returns to clean portfolio", async ({ page }) => {
  211 |     await page.goto("/?simulateRendererError=1");
  212 |     const fallback = page.locator('[data-testid="world-fallback-banner"]');
  213 |     await expect(fallback).toBeVisible({ timeout: 15000 });
  214 | 
  215 |     // Click Continue with Portfolio
  216 |     await page.locator('[data-testid="fallback-dismiss-btn"]').click();
  217 | 
  218 |     // Fallback dismissed; disclosure is available
  219 |     await expect(fallback).not.toBeVisible();
  220 |     await expect(page.locator('[data-testid="studio-disclosure"]')).toBeVisible();
  221 | 
  222 |     await captureScreenshot(page, "b5-08-failure-dismiss-portfolio.png");
  223 |   });
  224 | 
  225 |   test("9. reduced-motion enabled before entry: bypasses camera travel directly to HOME", async ({ page }) => {
  226 |     await page.emulateMedia({ reducedMotion: "reduce" });
  227 |     await page.goto("/?studio=enter");
  228 | 
  229 |     const stage = page.locator('[data-testid="world-stage-container"]');
  230 |     await expect(stage).toBeVisible({ timeout: 15000 });
  231 | 
  232 |     // Open diagnostics
  233 |     await page.locator('[data-testid="diagnostics-toggle-btn"]').click();
  234 |     const diagPre = page.locator('[data-testid="world-diagnostics"]');
  235 |     await expect(diagPre).toBeVisible();
  236 | 
  237 |     const diag = JSON.parse((await diagPre.textContent()) || "{}");
  238 |     expect(diag.reducedMotion).toBe(true);
  239 |     expect(diag.lifecycleState).toBe("HOME");
  240 |     expect(diag.entrance?.phase).toBe("settled");
  241 |     expect(diag.entrance?.progress).toBe(1.0);
  242 | 
  243 |     await captureScreenshot(page, "b5-09-reduced-motion-direct-home.png");
  244 |   });
  245 | 
  246 |   test("10. reduced-motion toggled during active experience: updates camera transition travel", async ({ page }) => {
  247 |     await page.goto("/?studio=enter");
  248 |     await expect(page.locator('[data-testid="world-stage-container"]')).toBeVisible({ timeout: 15000 });
  249 |     await expect(page.locator('[data-testid="world-loading-overlay"]')).not.toBeVisible({ timeout: 15000 });
  250 | 
  251 |     // Toggle reduced motion ON
  252 |     await page.getByTestId("studio-options-toggle").click();
  253 |     const rmBtn = page.locator('[data-testid="reduced-motion-toggle-btn"]');
  254 |     await rmBtn.click();
> 255 |     await expect(page.getByRole("switch", { name: "Toggle Reduced Motion" })).toHaveAttribute("aria-checked", "true");
      |                         ^ Error: expect(locator).toHaveText(expected) failed
  256 | 
  257 |     // Switch camera
  258 |     await page.locator('[data-testid="camera-monitor-btn"]').click();
  259 | 
  260 |     await page.locator('[data-testid="diagnostics-toggle-btn"]').click();
  261 |     const diag = JSON.parse((await page.locator('[data-testid="world-diagnostics"]').textContent()) || "{}");
  262 |     expect(diag.reducedMotion).toBe(true);
  263 |     expect(diag.cameraPreset).toBe("monitor");
  264 | 
  265 |     await captureScreenshot(page, "b5-10-dynamic-reduced-motion.png");
  266 |   });
  267 | 
  268 |   test("11. PROVE: single owners verified across all domains", async ({ page }) => {
  269 |     await page.goto("/?studio=enter");
  270 |     await expect(page.locator('[data-testid="world-stage-container"]')).toBeVisible({ timeout: 15000 });
  271 |     await expect(page.locator('[data-testid="world-loading-overlay"]')).not.toBeVisible({ timeout: 15000 });
  272 | 
  273 |     await page.locator('[data-testid="diagnostics-toggle-btn"]').click();
  274 |     const diag = JSON.parse((await page.locator('[data-testid="world-diagnostics"]').textContent()) || "{}");
  275 | 
  276 |     expect(diag.singleOwners).toBeDefined();
  277 |     expect(diag.singleOwners.rendererOwner).toBe("primary-renderer-lifecycle");
  278 |     expect(diag.singleOwners.cameraOwner).toBe("primary-camera-director");
  279 |     expect(diag.singleOwners.transitionOwner).toBe("primary-transition-coordinator");
  280 |     expect(diag.singleOwners.characterActionOwner).toBe("primary-character-director");
  281 |     expect(diag.singleOwners.assetLoadingSessionOwner).toBe("primary-asset-loader");
  282 |     expect(diag.singleOwners.activeSessionToken).toBeGreaterThan(0);
  283 | 
  284 |     await captureScreenshot(page, "b5-11-single-owners-verified.png");
  285 |   });
  286 | 
  287 |   test("12. PROVE: semantic navigation survives renderer failure", async ({ page }) => {
  288 |     await page.goto("/?simulateRendererError=1");
  289 |     await expect(page.locator('[data-testid="world-fallback-banner"]')).toBeVisible({ timeout: 15000 });
  290 | 
  291 |     // Click Browse Projects in fallback
  292 |     await page.locator('[data-testid="fallback-projects-link"]').click();
  293 |     await page.waitForURL("**/projects");
  294 | 
  295 |     await expect(page.locator("h1")).toBeVisible();
  296 |     expect(await page.locator("canvas").count()).toBe(0);
  297 | 
  298 |     // Click About in main navigation
  299 |     await page.locator('nav a[href="/about"]').click();
  300 |     await page.waitForURL("**/about");
  301 |     await expect(page.locator("h1")).toBeVisible();
  302 | 
  303 |     await captureScreenshot(page, "b5-12-navigation-survives-failure.png");
  304 |   });
  305 | });
  306 | 
```