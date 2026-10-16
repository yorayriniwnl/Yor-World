# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: world.spec.ts >> C3 Performance Benchmarks & Budget Verification >> 60-second active interaction route and frame pacing
- Location: tests\performance\world.spec.ts:87:3

# Error details

```
Error: expect(locator).toHaveAttribute(expected) failed

Locator:  locator('[data-testid="world-stage-container"]')
Expected: "HOME"
Received: "LOADING"
Timeout:  15000ms

Call log:
  - Expect "toHaveAttribute" locator('[data-testid="world-stage-container"]') with timeout 15000ms
  - waiting for locator('[data-testid="world-stage-container"]')
    5 × locator resolved to <div role="region" data-lifecycle-state="LOADING" data-studio-controls-open="false" aria-label="Interactive 3D Studio" data-testid="world-stage-container" class="world-module__FC9lxW__stageContainer world-module__FC9lxW__fullscreenStage world-module__FC9lxW__studioControlsClosed">…</div>
      - unexpected value "LOADING"

```

```yaml
- region "Interactive 3D Studio":
  - button "Open studio controls": Studio controls
  - heading "Loading 3D Studio" [level=3]
  - paragraph: Loading resident avatar (required)...
  - progressbar
  - text: "45% · Required: 0/3 · Optional: 0/1"
  - button "Continue with Portfolio"
```

# Test source

```ts
  1   | import { test, expect } from "@playwright/test";
  2   | import { mkdir, writeFile, readFile } from "node:fs/promises";
  3   | import path from "node:path";
  4   | import type { Diagnostics, RenderedWorldFrame } from "../../src/features/world/types";
  5   | 
  6   | type ActiveRouteFailureReason =
  7   |   | "STATIC_FALLBACK"
  8   |   | "CANVAS_DETACHED"
  9   |   | "DOCUMENT_HIDDEN"
  10  |   | "NO_RENDER_FRAME"
  11  |   | "ZERO_RENDER_CALLS"
  12  |   | "ZERO_RENDERED_TRIANGLES"
  13  |   | "ACTION_TIMEOUT"
  14  |   | "MISSING_ACTION"
  15  |   | "OTHER_RENDER_STATE_FAILURE";
  16  | 
  17  | function calculateStats(samples: number[]): { samples: number[]; median: number; p95: number } {
  18  |   if (samples.length === 0) throw new Error("Missing frame samples cannot prove performance.");
  19  |   const sorted = [...samples].sort((a, b) => a - b);
  20  |   const mid = Math.floor(sorted.length / 2);
  21  |   const midVal = sorted[mid] ?? 0;
  22  |   const midPrev = sorted[mid - 1] ?? midVal;
  23  |   const median = sorted.length % 2 !== 0 ? midVal : (midPrev + midVal) / 2;
  24  |   const p95Index = Math.min(Math.floor(sorted.length * 0.95), sorted.length - 1);
  25  |   const p95 = sorted[p95Index] ?? median;
  26  |   return { samples, median: Number(median.toFixed(2)), p95: Number(p95.toFixed(2)) };
  27  | }
  28  | 
  29  | async function savePerformanceReport(filename: string, data: unknown) {
  30  |   const baseDir = process.env.C3_EVIDENCE_DIR || "test-results";
  31  |   const dest = path.join(baseDir, filename);
  32  |   await mkdir(path.dirname(dest), { recursive: true });
  33  |   await writeFile(dest, JSON.stringify({ canonicalApplicationRoot: "app", buildId: (await readFile(".next/BUILD_ID", "utf8")).trim(), measuredAt: new Date().toISOString(), ...(data as Record<string, unknown>) }, null, 2));
  34  | }
  35  | 
  36  | test.describe("C3 Performance Benchmarks & Budget Verification", () => {
  37  |   test("captures actual dynamic public HTML payloads for the current production build", async ({ request }) => {
  38  |     const routes = [];
  39  |     for (const route of ["/", "/about", "/contact", "/resume", "/projects"]) {
  40  |       const response = await request.get(route);
  41  |       expect(response.status()).toBe(200);
  42  |       routes.push({ route, status: response.status(), html: await response.text() });
  43  |     }
  44  |     await savePerformanceReport("public-payloads.json", { routes });
  45  |   });
  46  | 
  47  |   const profiles = [
  48  |     { name: "desktop-1440x900", width: 1440, height: 900 },
  49  |     { name: "mobile-390x844", width: 390, height: 844 },
  50  |     { name: "narrow-320x600", width: 320, height: 600 },
  51  |   ];
  52  | 
  53  |   for (const profile of profiles) {
  54  |     test(`Five cold loads on ${profile.name}`, async ({ browser, baseURL }) => {
  55  |       if (!baseURL) throw new Error("Production test baseURL is required.");
  56  |       const loadTimes: number[] = [];
  57  | 
  58  |       for (let run = 1; run <= 5; run++) {
  59  |         // Cold load: completely fresh browser context
  60  |         const context = await browser.newContext({
  61  |           baseURL,
  62  |           viewport: { width: profile.width, height: profile.height },
  63  |         });
  64  |         const page = await context.newPage();
  65  | 
  66  |         const t0 = Date.now();
  67  |         await page.goto("/", { waitUntil: "domcontentloaded" });
  68  |         const t1 = Date.now();
  69  | 
  70  |         loadTimes.push(t1 - t0);
  71  |         await context.close();
  72  |       }
  73  | 
  74  |       const stats = calculateStats(loadTimes);
  75  |       await savePerformanceReport(`cold-loads-${profile.name}.json`, {
  76  |         profile: profile.name,
  77  |         viewport: `${profile.width}x${profile.height}`,
  78  |         runs: 5,
  79  |         ...stats,
  80  |       });
  81  | 
  82  |       // Assert cold DOMContentLoaded is within budget (< 3000ms lab ceiling)
  83  |       expect(stats.median).toBeLessThan(3000);
  84  |     });
  85  |   }
  86  | 
  87  |   test("60-second active interaction route and frame pacing", async ({ page }) => {
  88  |     await page.setViewportSize({ width: 1440, height: 900 });
  89  |     await page.goto("/?studio=1", { waitUntil: "domcontentloaded" });
  90  | 
  91  |     const canvas = page.locator('[data-testid="world-canvas"]');
  92  |     await expect(canvas).toBeVisible({ timeout: 15000 });
> 93  |     await expect(page.locator('[data-testid="world-stage-container"]')).toHaveAttribute("data-lifecycle-state", "HOME", { timeout: 15000 });
      |                                                                         ^ Error: expect(locator).toHaveAttribute(expected) failed
  94  |     await expect.poll(async () => Number(await canvas.getAttribute("data-rendered-frames"))).toBeGreaterThan(1);
  95  | 
  96  |     // AUTO may legitimately remove WebGL after sustained slow windows. This route
  97  |     // measures active 3D at an explicit supported tier through the real user control.
  98  |     const qualitySelect = page.getByTestId("quality-tier-select");
  99  |     await page.getByTestId("studio-controls-toggle").click();
  100 |     await expect(qualitySelect).toBeVisible();
  101 |     await qualitySelect.selectOption("low");
  102 |     await expect(qualitySelect).toHaveValue("low");
  103 |     await page.getByTestId("diagnostics-toggle-btn").click();
  104 |     const diagnostics = page.getByTestId("world-diagnostics");
  105 |     await expect.poll(async () => (JSON.parse((await diagnostics.textContent())!) as Diagnostics).qualityTier).toBe("low");
  106 |     const initialRenderState = JSON.parse((await diagnostics.textContent())!) as Diagnostics;
  107 |     const rendererIdentity = initialRenderState.webglRenderer;
  108 |     await page.getByTestId("diagnostics-toggle-btn").click();
  109 | 
  110 |     // Samples come from completed production renders, never an independent empty-page RAF.
  111 |     const framePacingData = await page.evaluate(async ({ rendererIdentity, initialRenderState }) => {
  112 |       const worldCanvas = document.querySelector<HTMLCanvasElement>('[data-testid="world-canvas"]');
  113 |       if (!worldCanvas) throw new Error("Missing production world canvas.");
  114 |       const frameTimes: number[] = [];
  115 |       const rawFrames: RenderedWorldFrame[] = [];
  116 |       const tierCounts: Record<string, number> = {};
  117 |       const actions: Array<{ action: string; latencyMs: number }> = [];
  118 |       const steps = [
  119 |         { id: "greet-resident-btn", accepts: (frame: RenderedWorldFrame) => frame.characterMode === "sequence" },
  120 |         { id: "cancel-motion-btn", accepts: (frame: RenderedWorldFrame) => frame.characterMode === "safe-return" },
  121 |         { id: "skip-motion-btn", accepts: (frame: RenderedWorldFrame) => frame.activeClip === "coding_idle" && frame.characterMode === "coding" },
  122 |         { id: "camera-monitor-btn", accepts: (frame: RenderedWorldFrame) => frame.cameraPreset === "monitor" },
  123 |         { id: "camera-reverse-btn", accepts: (frame: RenderedWorldFrame) => frame.cameraPreset === "reverse-doorway" },
  124 |         { id: "camera-home-btn", accepts: (frame: RenderedWorldFrame) => frame.cameraPreset === "home-desktop" },
  125 |       ];
  126 |       const startTime = performance.now();
  127 |       let lastFrame: RenderedWorldFrame | null = null;
  128 |       let currentAction: string | null = null;
  129 |       const snapshot = () => {
  130 |         const staticFallback = document.querySelector('[data-testid="world-static-container"]') !== null;
  131 |         const stage = document.querySelector<HTMLElement>('[data-testid="world-stage-container"]');
  132 |         const rect = worldCanvas.getBoundingClientRect();
  133 |         const style = getComputedStyle(worldCanvas);
  134 |         return {
  135 |           qualityTier: staticFallback ? "static" : lastFrame?.qualityTier ?? initialRenderState.qualityTier ?? null,
  136 |           lifecycleState: staticFallback ? "STATIC" : stage?.dataset.lifecycleState ?? lastFrame?.lifecycleState ?? initialRenderState.lifecycleState,
  137 |           lastRenderedFrameTimestamp: lastFrame?.timestamp ?? initialRenderState.lastRenderedAt ?? null,
  138 |           canvasConnected: worldCanvas.isConnected,
  139 |           canvasVisible: worldCanvas.isConnected && rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden" && style.visibility !== "collapse",
  140 |           visibilityState: document.visibilityState,
  141 |           renderCalls: lastFrame?.renderCalls ?? initialRenderState.renderCalls ?? null,
  142 |           renderedTriangles: lastFrame?.renderedTriangles ?? initialRenderState.renderedTriangles ?? null,
  143 |           currentAction,
  144 |           observedUserPreference: document.querySelector<HTMLSelectElement>('[data-testid="quality-tier-select"]')?.value ?? null,
  145 |           rendererIdentity,
  146 |           elapsedRouteTimeMs: performance.now() - startTime,
  147 |         };
  148 |       };
  149 |       type RenderState = ReturnType<typeof snapshot>;
  150 |       return new Promise<{
  151 |         frameTimes: number[]; rawFrames: RenderedWorldFrame[]; interactionsCompleted: number; actions: typeof actions; tierCounts: typeof tierCounts;
  152 |         requestedUserPreference: "low"; routeDurationMs: number; worldContinuouslyActive: boolean;
  153 |         failureReason: ActiveRouteFailureReason | null; failureMessage: string | null; failureDiagnostic: RenderState | null;
  154 |         finalRenderState: RenderState; maxRenderCalls: number; maxRenderedTriangles: number;
  155 |       }>((resolve) => {
  156 |         let lastRenderedAt = startTime;
  157 |         let nextAction = 0;
  158 |         let pending: { step: (typeof steps)[number]; sentAt: number } | null = null;
  159 |         let maxRenderCalls = 0;
  160 |         let maxRenderedTriangles = 0;
  161 |         let finished = false;
  162 |         const finish = (reason: ActiveRouteFailureReason | null, message: string | null = null) => {
  163 |           if (finished) return;
  164 |           finished = true;
  165 |           const finalRenderState = snapshot();
  166 |           clearInterval(watchdog);
  167 |           clearTimeout(deadline);
  168 |           worldCanvas.removeEventListener("yor-world-rendered-frame", onFrame);
  169 |           resolve({ frameTimes, rawFrames, interactionsCompleted: actions.length, actions, tierCounts, requestedUserPreference: "low",
  170 |             routeDurationMs: finalRenderState.elapsedRouteTimeMs, worldContinuouslyActive: reason === null,
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
```