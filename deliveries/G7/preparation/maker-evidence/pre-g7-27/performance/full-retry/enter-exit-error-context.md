# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: world.spec.ts >> C3 Performance Benchmarks & Budget Verification >> Enter/exit resource stability over multiple studio cycles
- Location: tests\performance\world.spec.ts:263:3

# Error details

```
Error: expect(locator).toHaveAttribute(expected) failed

Locator:  getByTestId('world-stage-container')
Expected: "HOME"
Received: "LOADING"
Timeout:  15000ms

Call log:
  - Expect "toHaveAttribute" getByTestId('world-stage-container') with timeout 15000ms
  - waiting for getByTestId('world-stage-container')
    2 × locator resolved to <div role="region" data-lifecycle-state="LOADING" data-studio-controls-open="false" aria-label="Interactive 3D Studio" data-testid="world-stage-container" class="world-module__FC9lxW__stageContainer world-module__FC9lxW__fullscreenStage world-module__FC9lxW__studioControlsClosed">…</div>
      - unexpected value "LOADING"

```

```yaml
- region "Interactive 3D Studio":
  - button "Open studio controls": Studio controls
  - heading "Loading 3D Studio" [level=3]
  - paragraph: Loading chair fixture (required)...
  - progressbar
  - text: "70% · Required: 0/3 · Optional: 0/1"
  - button "Continue with Portfolio"
```

# Test source

```ts
  171 |             failureReason: reason, failureMessage: message, failureDiagnostic: reason ? finalRenderState : null,
  172 |             finalRenderState, maxRenderCalls, maxRenderedTriangles });
  173 |         };
  174 |         const checkRenderState = (): boolean => {
  175 |           const state = snapshot();
  176 |           if (state.qualityTier === "static") { finish("STATIC_FALLBACK", "Production entered the supported STATIC fallback during the active 3D route."); return false; }
  177 |           if (!state.canvasConnected) { finish("CANVAS_DETACHED", "The production world canvas was detached."); return false; }
  178 |           if (state.visibilityState === "hidden") { finish("DOCUMENT_HIDDEN", "The document became hidden."); return false; }
  179 |           if (!state.canvasVisible || !["HOME", "TRANSITION"].includes(state.lifecycleState)
  180 |             || state.qualityTier !== "low" || state.observedUserPreference !== "low") {
  181 |             finish("OTHER_RENDER_STATE_FAILURE", "The visible HOME/TRANSITION world or explicit LOW preference changed."); return false;
  182 |           }
  183 |           return true;
  184 |         };
  185 |         const onFrame = (event: Event) => {
  186 |           const frame = (event as CustomEvent<RenderedWorldFrame>).detail;
  187 |           lastFrame = frame;
  188 |           rawFrames.push(frame);
  189 |           lastRenderedAt = performance.now();
  190 |           tierCounts[frame.qualityTier] = (tierCounts[frame.qualityTier] ?? 0) + 1;
  191 |           if (!checkRenderState()) return;
  192 |           if (!["HOME", "TRANSITION"].includes(frame.lifecycleState)) { finish("OTHER_RENDER_STATE_FAILURE", `Unexpected rendered lifecycle: ${frame.lifecycleState}`); return; }
  193 |           if (frame.renderCalls <= 0) { finish("ZERO_RENDER_CALLS", "A production frame had no render calls."); return; }
  194 |           if (frame.renderedTriangles <= 0) { finish("ZERO_RENDERED_TRIANGLES", "A production frame rendered no triangles."); return; }
  195 |           if (frame.durationMs > 0) frameTimes.push(frame.durationMs);
  196 |           maxRenderCalls = Math.max(maxRenderCalls, frame.renderCalls);
  197 |           maxRenderedTriangles = Math.max(maxRenderedTriangles, frame.renderedTriangles);
  198 |           if (pending && pending.step.accepts(frame)) {
  199 |             actions.push({ action: pending.step.id, latencyMs: lastRenderedAt - pending.sentAt });
  200 |             pending = null;
  201 |           }
  202 |           if (pending && lastRenderedAt - pending.sentAt > 900) {
  203 |             finish("ACTION_TIMEOUT", `World action was not acknowledged within 900 ms: ${pending.step.id}`);
  204 |             return;
  205 |           }
  206 |           if (!pending && lastRenderedAt - startTime >= nextAction * 1000 && nextAction < 60) {
  207 |             const step = steps[nextAction % steps.length];
  208 |             if (!step) { finish("MISSING_ACTION", "No interaction route step exists."); return; }
  209 |             currentAction = step.id;
  210 |             const button = document.querySelector<HTMLButtonElement>(`[data-testid="${step.id}"]`);
  211 |             if (!button || button.disabled) { finish("MISSING_ACTION", `Missing or disabled live action: ${step.id}`); return; }
  212 |             pending = { step, sentAt: performance.now() };
  213 |             button.click();
  214 |             nextAction++;
  215 |           }
  216 |         };
  217 |         const watchdog = setInterval(() => {
  218 |           if (!checkRenderState()) return;
  219 |           if (performance.now() - lastRenderedAt > 1000) {
  220 |             finish("NO_RENDER_FRAME", "The production renderer emitted no completed frame for more than one second.");
  221 |           } else if (pending && performance.now() - pending.sentAt > 900) {
  222 |             finish("ACTION_TIMEOUT", `World action was not acknowledged within 900 ms: ${pending.step.id}`);
  223 |           }
  224 |         }, 100);
  225 |         const deadline = setTimeout(() => {
  226 |           if (!checkRenderState()) return;
  227 |           if (performance.now() - lastRenderedAt > 1000) { finish("NO_RENDER_FRAME", "The production renderer stopped before route completion."); return; }
  228 |           if (pending) { finish("ACTION_TIMEOUT", `World action remained unacknowledged at route completion: ${pending.step.id}`); return; }
  229 |           if (actions.length !== 60) { finish("MISSING_ACTION", `Only ${actions.length} of 60 actions were acknowledged.`); return; }
  230 |           finish(null);
  231 |         }, 60_000);
  232 |         worldCanvas.addEventListener("yor-world-rendered-frame", onFrame);
  233 |       });
  234 |     }, { rendererIdentity, initialRenderState });
  235 | 
  236 |     // Write failures even when the renderer never supplies a timing sample.
  237 |     const stats = framePacingData.frameTimes.length > 0 ? calculateStats(framePacingData.frameTimes) : { samples: [], median: null, p95: null };
  238 |     await savePerformanceReport("active-route-frame-pacing.json", {
  239 |       ...framePacingData,
  240 |       rendererIdentity,
  241 |       observedTierCounts: framePacingData.tierCounts,
  242 |       measurementSource: "Completed production WebGLRenderer renders and acknowledged world actions",
  243 |       frameTimes: undefined,
  244 |       totalFramesSampled: framePacingData.frameTimes.length,
  245 |       medianFrameTimeMs: stats.median,
  246 |       p95FrameTimeMs: stats.p95,
  247 |       rawSamples: stats.samples,
  248 |     });
  249 | 
  250 |     expect(framePacingData.failureReason, JSON.stringify(framePacingData.failureDiagnostic)).toBeNull();
  251 |     expect(framePacingData.worldContinuouslyActive).toBe(true);
  252 |     expect(framePacingData.frameTimes.length).toBeGreaterThan(0);
  253 |     expect(framePacingData.maxRenderCalls).toBeGreaterThan(0);
  254 |     expect(framePacingData.maxRenderedTriangles).toBeGreaterThan(0);
  255 |     expect(Object.keys(framePacingData.tierCounts)).toEqual(["low"]);
  256 |     await expect(qualitySelect).toHaveValue("low");
  257 |     expect(framePacingData.routeDurationMs).toBeGreaterThanOrEqual(60_000);
  258 |     expect(framePacingData.interactionsCompleted).toBe(60);
  259 |     expect(stats.median).toBeLessThanOrEqual(33.3);
  260 |     expect(stats.p95).toBeLessThanOrEqual(45.0);
  261 |   });
  262 | 
  263 |   test("Enter/exit resource stability over multiple studio cycles", async ({ page }) => {
  264 |     await page.setViewportSize({ width: 1440, height: 900 });
  265 | 
  266 |     const cycles = [];
  267 | 
  268 |     for (let c = 1; c <= 4; c++) {
  269 |       const t0 = Date.now();
  270 |       await page.goto("/?studio=1", { waitUntil: "domcontentloaded" });
> 271 |       await expect(page.getByTestId("world-stage-container")).toHaveAttribute("data-lifecycle-state", "HOME", { timeout: 15000 });
      |                                                               ^ Error: expect(locator).toHaveAttribute(expected) failed
  272 |       const qualitySelect = page.getByTestId("quality-tier-select");
  273 |       await page.getByTestId("studio-controls-toggle").click();
  274 |       await expect(qualitySelect).toBeVisible();
  275 |       await qualitySelect.selectOption("low");
  276 |       const canvas = page.getByTestId("world-canvas");
  277 |       await expect.poll(async () => Number(await canvas.getAttribute("data-rendered-frames"))).toBeGreaterThan(1);
  278 |       await page.getByTestId("diagnostics-toggle-btn").click();
  279 |       const activeDiagnostics = JSON.parse((await page.getByTestId("world-diagnostics").textContent())!) as Diagnostics;
  280 |       expect(activeDiagnostics.renderCalls).toBeGreaterThan(0);
  281 |       expect(activeDiagnostics.renderedTriangles).toBeGreaterThan(0);
  282 |       await page.getByTestId("diagnostics-toggle-btn").click();
  283 |       const controlsToggle = page.getByTestId("studio-controls-toggle");
  284 |       await controlsToggle.click();
  285 |       await expect(controlsToggle).toHaveAttribute("aria-expanded", "false");
  286 |       const oldCanvas = await canvas.elementHandle();
  287 |       if (!oldCanvas) throw new Error("Missing active production canvas.");
  288 | 
  289 |       // SPA navigation retains the old canvas's execution context for teardown proof.
  290 |       await page.getByRole("navigation", { name: "Portfolio destinations and studio exit" }).getByRole("link", { name: "Projects", exact: true }).click();
  291 |       await expect(page).toHaveURL(/\/projects$/);
  292 |       await expect(page.locator("h1")).toBeVisible();
  293 | 
  294 |       await expect.poll(async () => oldCanvas.evaluate((element) => (element as HTMLCanvasElement).getContext("webgl2")?.isContextLost())).toBe(true);
  295 |       const stoppedFrames = await oldCanvas.evaluate((element) => Number(element.dataset.renderedFrames));
  296 |       await page.evaluate(() => {
  297 |         for (const state of ["hidden", "visible"]) {
  298 |           Object.defineProperty(document, "visibilityState", { configurable: true, value: state });
  299 |           document.dispatchEvent(new Event("visibilitychange"));
  300 |         }
  301 |         Reflect.deleteProperty(document, "visibilityState");
  302 |       });
  303 |       await page.waitForTimeout(1200);
  304 |       const afterExit = await oldCanvas.evaluate((element) => ({
  305 |         canvasConnected: element.isConnected,
  306 |         renderedFrames: Number(element.dataset.renderedFrames),
  307 |         contextLost: (element as HTMLCanvasElement).getContext("webgl2")?.isContextLost() ?? null,
  308 |       }));
  309 | 
  310 |       const canvasCount = await page.locator("canvas").count();
  311 |       const durationMs = Date.now() - t0;
  312 |       cycles.push({ cycle: c, durationMs, canvasCount, activeDiagnostics, stoppedFrames, afterExit });
  313 | 
  314 |       // Assert canvas is cleanly torn down on route exit
  315 |       expect(canvasCount).toBe(0);
  316 |       expect(afterExit.canvasConnected).toBe(false);
  317 |       expect(afterExit.renderedFrames).toBe(stoppedFrames);
  318 |       expect(afterExit.contextLost).toBe(true);
  319 |     }
  320 | 
  321 |     await savePerformanceReport("enter-exit-stability.json", {
  322 |       cycles,
  323 |       domAndRenderCleanupObserved: cycles.every((cycle) => cycle.canvasCount === 0 && !cycle.afterExit.canvasConnected && cycle.afterExit.renderedFrames === cycle.stoppedFrames && cycle.afterExit.contextLost),
  324 |       heapLeakAbsence: "UNKNOWN",
  325 |       gpuMemoryLeakAbsence: "UNKNOWN",
  326 |       visibilityProof: "simulated document visibility events after SPA exit",
  327 |     });
  328 |   });
  329 | });
  330 | 
```