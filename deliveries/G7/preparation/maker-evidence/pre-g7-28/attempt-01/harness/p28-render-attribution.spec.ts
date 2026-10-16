import { expect, test } from "@playwright/test";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const outputRoot = path.resolve(process.env.P28_ATTRIBUTION_OUTPUT_DIR || "../deliveries/G7/preparation/maker-evidence/pre-g7-28/attempt-01/results");
const source = {
  label: process.env.P28_ATTRIBUTION_SOURCE || "unlabeled-source",
  commit: process.env.P28_ATTRIBUTION_COMMIT || null,
  appTree: process.env.P28_ATTRIBUTION_APP_TREE || null,
  mirrorTree: process.env.P28_ATTRIBUTION_MIRROR_TREE || null,
  temporaryAppTree: process.env.P28_ATTRIBUTION_TEMP_APP_TREE || null,
  observerSha256: process.env.P28_ATTRIBUTION_OBSERVER_SHA256 || null,
  overlaySha256: process.env.P28_ATTRIBUTION_OVERLAY_SHA256 || null,
  harnessSha256: process.env.P28_ATTRIBUTION_HARNESS_SHA256 || null,
};

const viewports = [
  { label: "desktop-1440x900-high", width: 1440, height: 900, expectedTier: "high" },
  { label: "mobile-390x844-medium", width: 390, height: 844, expectedTier: "medium" },
  { label: "compact-320x600-medium", width: 320, height: 600, expectedTier: "medium" },
  { label: "landscape-844x390-high", width: 844, height: 390, expectedTier: "high" },
];

function digest(bytes: Buffer) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

fs.mkdirSync(outputRoot, { recursive: true });

for (const viewport of viewports) {
  test("P28 " + viewport.label + " item attribution", async ({ browser }, testInfo) => {
    const startedAt = new Date().toISOString();
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
    });
    let page = null as Awaited<ReturnType<typeof context.newPage>> | null;
    const browserErrors: string[] = [];
    const responses: Array<{ status: number; url: string }> = [];
    const row: Record<string, unknown> = {
      schemaVersion: 1,
      source,
      test: {
        title: testInfo.title,
        project: testInfo.project.name,
        workers: testInfo.config.workers,
        retries: 0,
        timeoutMs: testInfo.timeout,
      },
      capture: {
        startedAt,
        viewport: { width: viewport.width, height: viewport.height },
        expectedTier: viewport.expectedTier,
        initialPreference: null,
        initialEffectiveTier: null,
        effectiveTier: null,
        reachedHome: false,
        browser: null,
        browserVersion: browser.version(),
        userAgent: null,
        renderer: null,
        rendererVersion: null,
        multiDrawSupported: null,
        instrumentationWarnings: [],
        consoleErrors: browserErrors,
        failingResponses: responses,
        screenshot: null,
      },
      accounting: null,
      trace: null,
      rowComplete: false,
      testStatus: "STARTED",
      failure: null,
    };
    const browserDirectory = testInfo.project.name.toLowerCase().includes("edge") ? "edge" : "chrome";
    const captureDirectory = path.join(outputRoot, browserDirectory);
    fs.mkdirSync(captureDirectory, { recursive: true });
    const baseName = viewport.label + "-" + browserDirectory;
    const screenshotPath = path.join(captureDirectory, baseName + ".png");
    const jsonPath = path.join(captureDirectory, baseName + "-attribution.json");
    let screenshotWritten = false;

    try {
      page = await context.newPage();
      page.on("console", (message) => {
        if (message.type() === "error") browserErrors.push("[console.error] " + message.text());
      });
      page.on("pageerror", (error) => browserErrors.push("[pageerror] " + (error.stack || error.message)));
      page.on("response", (response) => {
        if (response.status() >= 400) responses.push({ status: response.status(), url: response.url() });
      });
      page.on("requestfailed", (request) => {
        browserErrors.push("[requestfailed] " + request.url() + " " + (request.failure()?.errorText || "unknown"));
      });

      await page.goto("/?studio=enter&pre-g7-evidence=1&p28-render-attribution=1", { waitUntil: "domcontentloaded" });
      await expect(page.getByTestId("fullscreen-studio-dialog")).toHaveAttribute("open", "", { timeout: 10_000 });
      await expect(page.getByTestId("world-stage-container")).toBeVisible({ timeout: 10_000 });
      await expect(page.getByTestId("world-canvas")).toBeVisible({ timeout: 10_000 });
      await expect(page.getByTestId("world-loading-overlay")).toBeHidden({ timeout: 15_000 });

      const stage = page.getByTestId("world-stage-container");
      const toggle = page.getByTestId("studio-controls-toggle");
      await expect(stage).toHaveAttribute("data-studio-controls-open", "false", { timeout: 2_000 });
      await toggle.click();
      const preference = page.getByTestId("quality-tier-select");
      await expect(preference).toHaveValue("auto", { timeout: 2_000 });
      const initial = await page.evaluate(() => {
        const target = window as Window & {
          __P28_RENDER_ATTRIBUTION__?: {
            initialQualityTier?: string | null;
            rendererVersion?: string;
            multiDrawSupported?: boolean;
            warnings?: string[];
          };
        };
        const trace = target.__P28_RENDER_ATTRIBUTION__;
        return {
          initialPreference: document.querySelector<HTMLSelectElement>("[data-testid='quality-tier-select']")?.value ?? null,
          initialEffectiveTier: trace?.initialQualityTier ?? null,
          rendererVersion: trace?.rendererVersion ?? null,
          multiDrawSupported: trace?.multiDrawSupported ?? null,
          instrumentationWarnings: trace?.warnings ?? [],
        };
      });
      (row.capture as Record<string, unknown>).initialPreference = initial.initialPreference;
      (row.capture as Record<string, unknown>).initialEffectiveTier = initial.initialEffectiveTier;
      (row.capture as Record<string, unknown>).rendererVersion = initial.rendererVersion;
      (row.capture as Record<string, unknown>).multiDrawSupported = initial.multiDrawSupported;
      (row.capture as Record<string, unknown>).instrumentationWarnings = initial.instrumentationWarnings;

      await page.getByTestId("skip-motion-btn").click();
      await expect(stage).toHaveAttribute("data-lifecycle-state", "HOME", { timeout: 8_000 });
      await toggle.click();
      await expect(toggle).toHaveAttribute("aria-expanded", "false", { timeout: 2_000 });
      await page.waitForTimeout(250);

      const final = await page.evaluate(() => {
        const target = window as Window & {
          __P28_RENDER_ATTRIBUTION__?: {
            latestFrame?: Record<string, unknown> | null;
            initialQualityTier?: string | null;
            tierHistory?: Array<{ frameId: number; tier: string | null }>;
            rendererVersion?: string;
            multiDrawSupported?: boolean;
            warnings?: string[];
          };
        };
        const trace = target.__P28_RENDER_ATTRIBUTION__;
        const canvas = document.querySelector<HTMLCanvasElement>("[data-testid='world-canvas']");
        const stageElement = document.querySelector<HTMLElement>("[data-testid='world-stage-container']");
        const gl = canvas?.getContext("webgl2") ?? canvas?.getContext("webgl");
        const debug = gl?.getExtension("WEBGL_debug_renderer_info") as { UNMASKED_RENDERER_WEBGL?: number } | null;
        return {
          pathname: window.location.pathname,
          search: window.location.search,
          lifecycleState: stageElement?.getAttribute("data-lifecycle-state") ?? null,
          viewport: { width: window.innerWidth, height: window.innerHeight, devicePixelRatio: window.devicePixelRatio },
          preference: document.querySelector<HTMLSelectElement>("[data-testid='quality-tier-select']")?.value ?? null,
          initialEffectiveTier: trace?.initialQualityTier ?? null,
          effectiveTier: (trace?.latestFrame as { qualityTier?: string } | null)?.qualityTier ?? null,
          tierHistory: trace?.tierHistory ?? [],
          rendererVersion: trace?.rendererVersion ?? null,
          multiDrawSupported: trace?.multiDrawSupported ?? null,
          instrumentationWarnings: trace?.warnings ?? [],
          renderer: gl ? String(gl.getParameter(debug?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER)) : null,
          webglVersion: gl ? String(gl.getParameter(gl.VERSION)) : null,
          webglCapabilities: gl ? {
            webgl2: typeof WebGL2RenderingContext !== "undefined" && gl instanceof WebGL2RenderingContext,
            contextAttributes: gl.getContextAttributes(),
            extensions: [...(gl.getSupportedExtensions() ?? [])].sort(),
            maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
            maxRenderbufferSize: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
            maxVertexAttributes: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
          } : null,
          navigatorCapabilities: {
            hardwareConcurrency: navigator.hardwareConcurrency,
            deviceMemory: (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? null,
            userAgentData: (navigator as Navigator & { userAgentData?: { brands?: unknown; mobile?: boolean; platform?: string } }).userAgentData ?? null,
          },
          traceJson: trace?.latestFrame ? JSON.stringify(trace.latestFrame) : null,
        };
      });

      const userAgent = await page.evaluate(() => navigator.userAgent);
      const detectedBrowser = /Edg\//.test(userAgent) ? "edge" : /Chrome\//.test(userAgent) ? "chrome" : "unknown";
      const trace = final.traceJson ? JSON.parse(final.traceJson) as Record<string, unknown> : null;
      const capture = row.capture as Record<string, unknown>;
      capture.browser = detectedBrowser;
      capture.userAgent = userAgent;
      capture.renderer = final.renderer;
      capture.webglVersion = final.webglVersion;
      capture.webglCapabilities = final.webglCapabilities;
      capture.navigatorCapabilities = final.navigatorCapabilities;
      capture.rendererVersion = final.rendererVersion;
      capture.multiDrawSupported = final.multiDrawSupported;
      capture.instrumentationWarnings = final.instrumentationWarnings;
      capture.initialPreference = initial.initialPreference;
      capture.initialEffectiveTier = final.initialEffectiveTier;
      capture.effectiveTier = final.effectiveTier;
      capture.tierHistory = final.tierHistory;
      capture.actualViewport = final.viewport;
      capture.pathname = final.pathname;
      capture.search = final.search;
      capture.lifecycleState = final.lifecycleState;
      capture.reachedHome = final.lifecycleState === "HOME";
      (row as Record<string, unknown>).trace = trace;

      if (trace) {
        row.accounting = {
          mainRenderBufferDirectInvocations: trace.mainRenderBufferDirectInvocations ?? null,
          shadowRenderBufferDirectInvocations: trace.shadowRenderBufferDirectInvocations ?? null,
          inclusiveRenderBufferDirectInvocations: trace.calls && Array.isArray(trace.calls) ? trace.calls.length : null,
          mainRendererInfoCalls: trace.mainRendererInfoCalls ?? null,
          shadowRendererInfoCalls: trace.shadowRendererInfoCalls ?? null,
          inclusiveRendererInfoCalls: trace.inclusiveRendererInfoCalls ?? null,
          mainRendererInfoTriangles: trace.mainRendererInfoTriangles ?? null,
          shadowRendererInfoTriangles: trace.shadowRendererInfoTriangles ?? null,
          inclusiveRendererInfoTriangles: trace.inclusiveRendererInfoTriangles ?? null,
          mainWebGlDrawApiCalls: trace.mainWebGlDrawApiCalls ?? null,
          shadowWebGlDrawApiCalls: trace.shadowWebGlDrawApiCalls ?? null,
          mainMultiDrawInvocations: trace.mainMultiDrawInvocations ?? null,
          shadowMultiDrawInvocations: trace.shadowMultiDrawInvocations ?? null,
          visibleTriangles: trace.mainRendererInfoTriangles ?? null,
        };
      }

      await page.screenshot({ path: screenshotPath, fullPage: false });
      const screenshotBytes = fs.readFileSync(screenshotPath);
      capture.screenshot = {
        path: path.relative(outputRoot, screenshotPath).replaceAll("\\", "/"),
        bytes: screenshotBytes.length,
        sha256: digest(screenshotBytes),
      };
      screenshotWritten = true;

      const tierMatches = final.initialEffectiveTier === viewport.expectedTier && final.effectiveTier === viewport.expectedTier;
      const viewportMatches = final.viewport.width === viewport.width && final.viewport.height === viewport.height;
      row.rowComplete = Boolean(trace && capture.reachedHome && initial.initialPreference === "auto" && tierMatches && viewportMatches);
      row.testStatus = "CAPTURED";
      expect(capture.reachedHome).toBe(true);
      expect(initial.initialPreference).toBe("auto");
      expect(final.initialEffectiveTier).toBe(viewport.expectedTier);
      expect(final.effectiveTier).toBe(viewport.expectedTier);
      expect(viewportMatches).toBe(true);
      expect(trace, "P28 observer produced a frame").not.toBeNull();
      row.testStatus = "PASS";
    } catch (error) {
      row.testStatus = "FAIL";
      row.failure = error instanceof Error ? { name: error.name, message: error.message, stack: error.stack ?? null } : String(error);
      throw error;
    } finally {
      const capture = row.capture as Record<string, unknown>;
      if (!screenshotWritten && page) {
        try {
          await page.screenshot({ path: screenshotPath, fullPage: false });
          const bytes = fs.readFileSync(screenshotPath);
          capture.screenshot = {
            path: path.relative(outputRoot, screenshotPath).replaceAll("\\", "/"),
            bytes: bytes.length,
            sha256: digest(bytes),
            partial: true,
          };
        } catch (error) {
          capture.screenshotFailure = error instanceof Error ? error.message : String(error);
        }
      }
      capture.completedAt = new Date().toISOString();
      fs.writeFileSync(jsonPath, JSON.stringify(row, null, 2) + "\n", "utf8");
      try {
        await context.close();
      } catch (error) {
        capture.contextCloseError = error instanceof Error ? error.message : String(error);
        fs.writeFileSync(jsonPath, JSON.stringify(row, null, 2) + "\n", "utf8");
      }
    }
  });
}