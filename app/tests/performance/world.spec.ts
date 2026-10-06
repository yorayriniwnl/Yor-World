import { test, expect } from "@playwright/test";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import type { Diagnostics, RenderedWorldFrame } from "../../src/features/world/types";

type ActiveRouteFailureReason =
  | "STATIC_FALLBACK"
  | "CANVAS_DETACHED"
  | "DOCUMENT_HIDDEN"
  | "NO_RENDER_FRAME"
  | "ZERO_RENDER_CALLS"
  | "ZERO_RENDERED_TRIANGLES"
  | "ACTION_TIMEOUT"
  | "MISSING_ACTION"
  | "OTHER_RENDER_STATE_FAILURE";

function calculateStats(samples: number[]): { samples: number[]; median: number; p95: number } {
  if (samples.length === 0) throw new Error("Missing frame samples cannot prove performance.");
  const sorted = [...samples].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const midVal = sorted[mid] ?? 0;
  const midPrev = sorted[mid - 1] ?? midVal;
  const median = sorted.length % 2 !== 0 ? midVal : (midPrev + midVal) / 2;
  const p95Index = Math.min(Math.floor(sorted.length * 0.95), sorted.length - 1);
  const p95 = sorted[p95Index] ?? median;
  return { samples, median: Number(median.toFixed(2)), p95: Number(p95.toFixed(2)) };
}

async function savePerformanceReport(filename: string, data: unknown) {
  const baseDir = process.env.C3_EVIDENCE_DIR || "test-results";
  const dest = path.join(baseDir, filename);
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, JSON.stringify({ canonicalApplicationRoot: "app", buildId: (await readFile(".next/BUILD_ID", "utf8")).trim(), measuredAt: new Date().toISOString(), ...(data as Record<string, unknown>) }, null, 2));
}

test.describe("C3 Performance Benchmarks & Budget Verification", () => {
  test("captures actual dynamic public HTML payloads for the current production build", async ({ request }) => {
    const routes = [];
    for (const route of ["/", "/about", "/contact", "/resume", "/projects"]) {
      const response = await request.get(route);
      expect(response.status()).toBe(200);
      routes.push({ route, status: response.status(), html: await response.text() });
    }
    await savePerformanceReport("public-payloads.json", { routes });
  });

  const profiles = [
    { name: "desktop-1440x900", width: 1440, height: 900 },
    { name: "mobile-390x844", width: 390, height: 844 },
    { name: "narrow-320x600", width: 320, height: 600 },
  ];

  for (const profile of profiles) {
    test(`Five cold loads on ${profile.name}`, async ({ browser, baseURL }) => {
      if (!baseURL) throw new Error("Production test baseURL is required.");
      const loadTimes: number[] = [];

      for (let run = 1; run <= 5; run++) {
        // Cold load: completely fresh browser context
        const context = await browser.newContext({
          baseURL,
          viewport: { width: profile.width, height: profile.height },
        });
        const page = await context.newPage();

        const t0 = Date.now();
        await page.goto("/", { waitUntil: "domcontentloaded" });
        const t1 = Date.now();

        loadTimes.push(t1 - t0);
        await context.close();
      }

      const stats = calculateStats(loadTimes);
      await savePerformanceReport(`cold-loads-${profile.name}.json`, {
        profile: profile.name,
        viewport: `${profile.width}x${profile.height}`,
        runs: 5,
        ...stats,
      });

      // Assert cold DOMContentLoaded is within budget (< 3000ms lab ceiling)
      expect(stats.median).toBeLessThan(3000);
    });
  }

  test("60-second active interaction route and frame pacing", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/?studio=1", { waitUntil: "domcontentloaded" });

    const canvas = page.locator('[data-testid="world-canvas"]');
    await expect(canvas).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="world-stage-container"]')).toHaveAttribute("data-lifecycle-state", "HOME", { timeout: 15000 });
    await expect.poll(async () => Number(await canvas.getAttribute("data-rendered-frames"))).toBeGreaterThan(1);

    // AUTO may legitimately remove WebGL after sustained slow windows. This route
    // measures active 3D at an explicit supported tier through the real user control.
    const qualitySelect = page.getByTestId("quality-tier-select");
    await qualitySelect.selectOption("low");
    await expect(qualitySelect).toHaveValue("low");
    await page.getByTestId("diagnostics-toggle-btn").click();
    const diagnostics = page.getByTestId("world-diagnostics");
    await expect.poll(async () => (JSON.parse((await diagnostics.textContent())!) as Diagnostics).qualityTier).toBe("low");
    const initialRenderState = JSON.parse((await diagnostics.textContent())!) as Diagnostics;
    const rendererIdentity = initialRenderState.webglRenderer;
    await page.getByTestId("diagnostics-toggle-btn").click();

    // Samples come from completed production renders, never an independent empty-page RAF.
    const framePacingData = await page.evaluate(async ({ rendererIdentity, initialRenderState }) => {
      const worldCanvas = document.querySelector<HTMLCanvasElement>('[data-testid="world-canvas"]');
      if (!worldCanvas) throw new Error("Missing production world canvas.");
      const frameTimes: number[] = [];
      const rawFrames: RenderedWorldFrame[] = [];
      const tierCounts: Record<string, number> = {};
      const actions: Array<{ action: string; latencyMs: number }> = [];
      const steps = [
        { id: "greet-resident-btn", accepts: (frame: RenderedWorldFrame) => frame.characterMode === "sequence" },
        { id: "cancel-motion-btn", accepts: (frame: RenderedWorldFrame) => frame.characterMode === "safe-return" },
        { id: "skip-motion-btn", accepts: (frame: RenderedWorldFrame) => frame.activeClip === "coding_idle" && frame.characterMode === "coding" },
        { id: "camera-monitor-btn", accepts: (frame: RenderedWorldFrame) => frame.cameraPreset === "monitor" },
        { id: "camera-reverse-btn", accepts: (frame: RenderedWorldFrame) => frame.cameraPreset === "reverse-doorway" },
        { id: "camera-home-btn", accepts: (frame: RenderedWorldFrame) => frame.cameraPreset === "home-desktop" },
      ];
      const startTime = performance.now();
      let lastFrame: RenderedWorldFrame | null = null;
      let currentAction: string | null = null;
      const snapshot = () => {
        const staticFallback = document.querySelector('[data-testid="world-static-container"]') !== null;
        const stage = document.querySelector<HTMLElement>('[data-testid="world-stage-container"]');
        const rect = worldCanvas.getBoundingClientRect();
        const style = getComputedStyle(worldCanvas);
        return {
          qualityTier: staticFallback ? "static" : lastFrame?.qualityTier ?? initialRenderState.qualityTier ?? null,
          lifecycleState: staticFallback ? "STATIC" : stage?.dataset.lifecycleState ?? lastFrame?.lifecycleState ?? initialRenderState.lifecycleState,
          lastRenderedFrameTimestamp: lastFrame?.timestamp ?? initialRenderState.lastRenderedAt ?? null,
          canvasConnected: worldCanvas.isConnected,
          canvasVisible: worldCanvas.isConnected && rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden" && style.visibility !== "collapse",
          visibilityState: document.visibilityState,
          renderCalls: lastFrame?.renderCalls ?? initialRenderState.renderCalls ?? null,
          renderedTriangles: lastFrame?.renderedTriangles ?? initialRenderState.renderedTriangles ?? null,
          currentAction,
          observedUserPreference: document.querySelector<HTMLSelectElement>('[data-testid="quality-tier-select"]')?.value ?? null,
          rendererIdentity,
          elapsedRouteTimeMs: performance.now() - startTime,
        };
      };
      type RenderState = ReturnType<typeof snapshot>;
      return new Promise<{
        frameTimes: number[]; rawFrames: RenderedWorldFrame[]; interactionsCompleted: number; actions: typeof actions; tierCounts: typeof tierCounts;
        requestedUserPreference: "low"; routeDurationMs: number; worldContinuouslyActive: boolean;
        failureReason: ActiveRouteFailureReason | null; failureMessage: string | null; failureDiagnostic: RenderState | null;
        finalRenderState: RenderState; maxRenderCalls: number; maxRenderedTriangles: number;
      }>((resolve) => {
        let lastRenderedAt = startTime;
        let nextAction = 0;
        let pending: { step: (typeof steps)[number]; sentAt: number } | null = null;
        let maxRenderCalls = 0;
        let maxRenderedTriangles = 0;
        let finished = false;
        const finish = (reason: ActiveRouteFailureReason | null, message: string | null = null) => {
          if (finished) return;
          finished = true;
          const finalRenderState = snapshot();
          clearInterval(watchdog);
          clearTimeout(deadline);
          worldCanvas.removeEventListener("yor-world-rendered-frame", onFrame);
          resolve({ frameTimes, rawFrames, interactionsCompleted: actions.length, actions, tierCounts, requestedUserPreference: "low",
            routeDurationMs: finalRenderState.elapsedRouteTimeMs, worldContinuouslyActive: reason === null,
            failureReason: reason, failureMessage: message, failureDiagnostic: reason ? finalRenderState : null,
            finalRenderState, maxRenderCalls, maxRenderedTriangles });
        };
        const checkRenderState = (): boolean => {
          const state = snapshot();
          if (state.qualityTier === "static") { finish("STATIC_FALLBACK", "Production entered the supported STATIC fallback during the active 3D route."); return false; }
          if (!state.canvasConnected) { finish("CANVAS_DETACHED", "The production world canvas was detached."); return false; }
          if (state.visibilityState === "hidden") { finish("DOCUMENT_HIDDEN", "The document became hidden."); return false; }
          if (!state.canvasVisible || !["HOME", "TRANSITION"].includes(state.lifecycleState)
            || state.qualityTier !== "low" || state.observedUserPreference !== "low") {
            finish("OTHER_RENDER_STATE_FAILURE", "The visible HOME/TRANSITION world or explicit LOW preference changed."); return false;
          }
          return true;
        };
        const onFrame = (event: Event) => {
          const frame = (event as CustomEvent<RenderedWorldFrame>).detail;
          lastFrame = frame;
          rawFrames.push(frame);
          lastRenderedAt = performance.now();
          tierCounts[frame.qualityTier] = (tierCounts[frame.qualityTier] ?? 0) + 1;
          if (!checkRenderState()) return;
          if (!["HOME", "TRANSITION"].includes(frame.lifecycleState)) { finish("OTHER_RENDER_STATE_FAILURE", `Unexpected rendered lifecycle: ${frame.lifecycleState}`); return; }
          if (frame.renderCalls <= 0) { finish("ZERO_RENDER_CALLS", "A production frame had no render calls."); return; }
          if (frame.renderedTriangles <= 0) { finish("ZERO_RENDERED_TRIANGLES", "A production frame rendered no triangles."); return; }
          if (frame.durationMs > 0) frameTimes.push(frame.durationMs);
          maxRenderCalls = Math.max(maxRenderCalls, frame.renderCalls);
          maxRenderedTriangles = Math.max(maxRenderedTriangles, frame.renderedTriangles);
          if (pending && pending.step.accepts(frame)) {
            actions.push({ action: pending.step.id, latencyMs: lastRenderedAt - pending.sentAt });
            pending = null;
          }
          if (pending && lastRenderedAt - pending.sentAt > 900) {
            finish("ACTION_TIMEOUT", `World action was not acknowledged within 900 ms: ${pending.step.id}`);
            return;
          }
          if (!pending && lastRenderedAt - startTime >= nextAction * 1000 && nextAction < 60) {
            const step = steps[nextAction % steps.length];
            if (!step) { finish("MISSING_ACTION", "No interaction route step exists."); return; }
            currentAction = step.id;
            const button = document.querySelector<HTMLButtonElement>(`[data-testid="${step.id}"]`);
            if (!button || button.disabled) { finish("MISSING_ACTION", `Missing or disabled live action: ${step.id}`); return; }
            pending = { step, sentAt: performance.now() };
            button.click();
            nextAction++;
          }
        };
        const watchdog = setInterval(() => {
          if (!checkRenderState()) return;
          if (performance.now() - lastRenderedAt > 1000) {
            finish("NO_RENDER_FRAME", "The production renderer emitted no completed frame for more than one second.");
          } else if (pending && performance.now() - pending.sentAt > 900) {
            finish("ACTION_TIMEOUT", `World action was not acknowledged within 900 ms: ${pending.step.id}`);
          }
        }, 100);
        const deadline = setTimeout(() => {
          if (!checkRenderState()) return;
          if (performance.now() - lastRenderedAt > 1000) { finish("NO_RENDER_FRAME", "The production renderer stopped before route completion."); return; }
          if (pending) { finish("ACTION_TIMEOUT", `World action remained unacknowledged at route completion: ${pending.step.id}`); return; }
          if (actions.length !== 60) { finish("MISSING_ACTION", `Only ${actions.length} of 60 actions were acknowledged.`); return; }
          finish(null);
        }, 60_000);
        worldCanvas.addEventListener("yor-world-rendered-frame", onFrame);
      });
    }, { rendererIdentity, initialRenderState });

    // Write failures even when the renderer never supplies a timing sample.
    const stats = framePacingData.frameTimes.length > 0 ? calculateStats(framePacingData.frameTimes) : { samples: [], median: null, p95: null };
    await savePerformanceReport("active-route-frame-pacing.json", {
      ...framePacingData,
      rendererIdentity,
      observedTierCounts: framePacingData.tierCounts,
      measurementSource: "Completed production WebGLRenderer renders and acknowledged world actions",
      frameTimes: undefined,
      totalFramesSampled: framePacingData.frameTimes.length,
      medianFrameTimeMs: stats.median,
      p95FrameTimeMs: stats.p95,
      rawSamples: stats.samples,
    });

    expect(framePacingData.failureReason, JSON.stringify(framePacingData.failureDiagnostic)).toBeNull();
    expect(framePacingData.worldContinuouslyActive).toBe(true);
    expect(framePacingData.frameTimes.length).toBeGreaterThan(0);
    expect(framePacingData.maxRenderCalls).toBeGreaterThan(0);
    expect(framePacingData.maxRenderedTriangles).toBeGreaterThan(0);
    expect(Object.keys(framePacingData.tierCounts)).toEqual(["low"]);
    await expect(qualitySelect).toHaveValue("low");
    expect(framePacingData.routeDurationMs).toBeGreaterThanOrEqual(60_000);
    expect(framePacingData.interactionsCompleted).toBe(60);
    expect(stats.median).toBeLessThanOrEqual(33.3);
    expect(stats.p95).toBeLessThanOrEqual(45.0);
  });

  test("Enter/exit resource stability over multiple studio cycles", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    const cycles = [];

    for (let c = 1; c <= 4; c++) {
      const t0 = Date.now();
      await page.goto("/?studio=1", { waitUntil: "domcontentloaded" });
      await expect(page.getByTestId("world-stage-container")).toHaveAttribute("data-lifecycle-state", "HOME", { timeout: 15000 });
      await page.getByTestId("quality-tier-select").selectOption("low");
      const canvas = page.getByTestId("world-canvas");
      await expect.poll(async () => Number(await canvas.getAttribute("data-rendered-frames"))).toBeGreaterThan(1);
      await page.getByTestId("diagnostics-toggle-btn").click();
      const activeDiagnostics = JSON.parse((await page.getByTestId("world-diagnostics").textContent())!) as Diagnostics;
      expect(activeDiagnostics.renderCalls).toBeGreaterThan(0);
      expect(activeDiagnostics.renderedTriangles).toBeGreaterThan(0);
      const oldCanvas = await canvas.elementHandle();
      if (!oldCanvas) throw new Error("Missing active production canvas.");

      // SPA navigation retains the old canvas's execution context for teardown proof.
      await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: "Projects", exact: true }).click();
      await expect(page).toHaveURL(/\/projects$/);
      await expect(page.locator("h1")).toBeVisible();

      await expect.poll(async () => oldCanvas.evaluate((element) => (element as HTMLCanvasElement).getContext("webgl2")?.isContextLost())).toBe(true);
      const stoppedFrames = await oldCanvas.evaluate((element) => Number(element.dataset.renderedFrames));
      await page.evaluate(() => {
        for (const state of ["hidden", "visible"]) {
          Object.defineProperty(document, "visibilityState", { configurable: true, value: state });
          document.dispatchEvent(new Event("visibilitychange"));
        }
        Reflect.deleteProperty(document, "visibilityState");
      });
      await page.waitForTimeout(1200);
      const afterExit = await oldCanvas.evaluate((element) => ({
        canvasConnected: element.isConnected,
        renderedFrames: Number(element.dataset.renderedFrames),
        contextLost: (element as HTMLCanvasElement).getContext("webgl2")?.isContextLost() ?? null,
      }));

      const canvasCount = await page.locator("canvas").count();
      const durationMs = Date.now() - t0;
      cycles.push({ cycle: c, durationMs, canvasCount, activeDiagnostics, stoppedFrames, afterExit });

      // Assert canvas is cleanly torn down on route exit
      expect(canvasCount).toBe(0);
      expect(afterExit.canvasConnected).toBe(false);
      expect(afterExit.renderedFrames).toBe(stoppedFrames);
      expect(afterExit.contextLost).toBe(true);
    }

    await savePerformanceReport("enter-exit-stability.json", {
      cycles,
      domAndRenderCleanupObserved: cycles.every((cycle) => cycle.canvasCount === 0 && !cycle.afterExit.canvasConnected && cycle.afterExit.renderedFrames === cycle.stoppedFrames && cycle.afterExit.contextLost),
      heapLeakAbsence: "UNKNOWN",
      gpuMemoryLeakAbsence: "UNKNOWN",
      visibilityProof: "simulated document visibility events after SPA exit",
    });
  });
});
