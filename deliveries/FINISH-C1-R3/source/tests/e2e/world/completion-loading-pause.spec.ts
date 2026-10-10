import { expect, test } from "@playwright/test";

type CapturedWorldFrame = {
  activeClip?: string;
  activeClipTimeSec?: number;
  optionalTextureTargets?: Partial<Record<"deskmat" | "wallpaper", readonly string[]>>;
};

test.describe("C1-R3 production loading, cancellation, and pause recovery", () => {
  test("holds a real required request, renders indeterminate ARIA, and exits promptly", async ({ page }, testInfo) => {
    let releaseRequest!: () => void;
    let markRequestSeen!: () => void;
    const held = new Promise<void>((resolve) => { releaseRequest = resolve; });
    const requestSeen = new Promise<void>((resolve) => { markRequestSeen = resolve; });
    let residentFailure: string | null = null;

    page.on("requestfailed", (request) => {
      if (request.url().endsWith("/models/resident-production.glb")) {
        residentFailure = request.failure()?.errorText ?? "failed";
      }
    });
    await page.route("**/models/resident-production.glb", async (route) => {
      markRequestSeen();
      await held;
      try { await route.continue(); } catch { /* The browser may have canceled the request on Continue. */ }
    });

    await page.goto("/?studio=1", { waitUntil: "domcontentloaded" });
    await requestSeen;
    const progress = page.getByTestId("world-loading-progress-bar");
    await expect(progress).toBeVisible();
    expect(await progress.getAttribute("aria-valuenow")).toBeNull();
    await expect(progress).toHaveClass(/progressBarIndeterminate/);
    const progressStats = page.getByTestId("world-loading-percentage");
    await expect(progressStats).toContainText("Required asset bytes: measuring");
    expect(await progressStats.innerText()).not.toMatch(/\b\d+%/);
    await expect(page.getByTestId("world-loading-stage")).toContainText(/resident/i);

    await page.evaluate(() => {
      const button = document.querySelector<HTMLButtonElement>('[data-testid="loading-continue-btn"]');
      if (!button) throw new Error("Continue control is absent");
      const state = window as Window & { __c1CancelStart?: number; __c1CancelLatency?: number };
      const observer = new MutationObserver(() => {
        if (document.querySelector('[data-testid="studio-disclosure"]')) {
          state.__c1CancelLatency = performance.now() - (state.__c1CancelStart ?? performance.now());
          observer.disconnect();
        }
      });
      button.addEventListener("click", () => {
        state.__c1CancelStart = performance.now();
        observer.observe(document.body, { childList: true, subtree: true });
      }, { once: true });
    });
    await page.getByTestId("loading-continue-btn").click();
    releaseRequest();
    await expect(page.getByTestId("studio-disclosure")).toBeVisible();
    const cancelLatencyMs = await page.evaluate(() => {
      return (window as Window & { __c1CancelLatency?: number }).__c1CancelLatency;
    });
    expect(cancelLatencyMs).toEqual(expect.any(Number));
    expect(cancelLatencyMs).toBeLessThan(50);
    await expect.poll(() => residentFailure).not.toBeNull();
    await testInfo.attach("continue-response-latency.json", {
      contentType: "application/json",
      body: JSON.stringify({ cancelLatencyMs, requiredRequestFailed: residentFailure, limitMs: 50 }),
    });
  });

  test("restores paused version-1 preferences after a failed load and real runtime recreation", async ({ page }, testInfo) => {
    await page.addInitScript(() => {
      if (!localStorage.getItem("yor_world_preferences_v1")) {
        localStorage.setItem("yor_world_preferences_v1", JSON.stringify({
          version: 1,
          introCompleted: true,
          soundEnabled: false,
          quality: "auto",
          clock24h: false,
          paused: true,
        }));
      }
      const state = window as Window & { __worldFrames?: CapturedWorldFrame[] };
      state.__worldFrames = [];
      window.addEventListener("yor-world-rendered-frame", (event) => {
        state.__worldFrames?.push((event as CustomEvent<CapturedWorldFrame>).detail);
      }, true);
    });

    let firstAssetAttempts = 0;
    let releaseDeskmat!: () => void;
    let markDeskmatRequested!: () => void;
    const deskmatGate = new Promise<void>((resolve) => { releaseDeskmat = resolve; });
    const deskmatRequested = new Promise<void>((resolve) => { markDeskmatRequested = resolve; });
    let wallpaperLoaded = false;
    const browserErrors: string[] = [];
    page.on("pageerror", (error) => browserErrors.push(error.message));
    page.on("response", (response) => {
      if (response.url().endsWith("/textures/monitor-wallpaper.png")) wallpaperLoaded = true;
    });
    await page.route("**/models/production-room-full.glb", async (route) => {
      firstAssetAttempts += 1;
      if (firstAssetAttempts <= 3) await route.abort("failed");
      else await route.continue();
    });
    await page.route("**/textures/deskmat-topography.png", async (route) => {
      markDeskmatRequested();
      await deskmatGate;
      await route.continue();
    });

    await page.goto("/?studio=1", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("world-fallback-banner")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("fallback-retry-btn")).toBeVisible();
    await page.getByTestId("fallback-retry-btn").click();

    const stage = page.getByTestId("world-stage-container");
    await expect(stage).toHaveAttribute("data-lifecycle-state", "HOME", { timeout: 30_000 });
    await deskmatRequested;
    const pauseSwitch = page.getByTestId("toggle-decorative-pause-btn");
    await expect(pauseSwitch).toHaveAttribute("aria-checked", "true");

    const quality = page.getByTestId("quality-tier-select");
    await quality.selectOption("low");
    const deskmatResponse = page.waitForResponse((response) => response.url().endsWith("/textures/deskmat-topography.png"));
    releaseDeskmat();
    await deskmatResponse;
    await expect.poll(() => wallpaperLoaded).toBe(true);
    await quality.selectOption("high");
    await expect(stage).toHaveAttribute("data-lifecycle-state", "HOME");
    expect(browserErrors).toEqual([]);
    await expect.poll(async () => page.evaluate(() => {
      const state = window as Window & { __worldFrames?: CapturedWorldFrame[] };
      return state.__worldFrames?.length ?? 0;
    })).toBeGreaterThan(0);

    const frames = await page.evaluate(() => (window as Window & { __worldFrames?: CapturedWorldFrame[] }).__worldFrames ?? []);
    const firstFrame = frames[0];
    expect(firstFrame).toBeDefined();
    if (!firstFrame) throw new Error("The production runtime emitted no rendered-frame evidence");
    expect(firstFrame.activeClip).toBe("coding_idle");
    expect(firstFrame.activeClipTimeSec).toBe(0);
    await expect.poll(async () => page.evaluate(() => {
      const captured = (window as Window & { __worldFrames?: CapturedWorldFrame[] }).__worldFrames ?? [];
      const latest = captured.at(-1)?.optionalTextureTargets;
      return Boolean(latest?.deskmat?.length && latest.wallpaper?.length);
    })).toBe(true);
    const latestTargets = await page.evaluate(() => {
      const captured = (window as Window & { __worldFrames?: CapturedWorldFrame[] }).__worldFrames ?? [];
      return captured.at(-1)?.optionalTextureTargets;
    });
    expect(latestTargets?.deskmat?.length).toBeGreaterThan(0);
    expect(latestTargets?.deskmat?.every((name) => /(desk[_\s-]?mat|topography)/i.test(name))).toBe(true);
    expect(latestTargets?.wallpaper?.length).toBeGreaterThan(0);
    expect(latestTargets?.wallpaper?.every((name) => /(monitor[_\s-]?screen[_\s-]?center|wallpaper)/i.test(name))).toBe(true);
    expect(firstAssetAttempts).toBeGreaterThanOrEqual(4);

    await pauseSwitch.click();
    await expect(pauseSwitch).toHaveAttribute("aria-checked", "false");
    await expect.poll(async () => page.evaluate(() => {
      const frames = (window as Window & { __worldFrames?: CapturedWorldFrame[] }).__worldFrames ?? [];
      return frames.some((frame) => frame.activeClip === "coding_idle" && (frame.activeClipTimeSec ?? 0) > 0.05);
    })).toBe(true);
    const codingTimes = await page.evaluate(() => {
      const frames = (window as Window & { __worldFrames?: CapturedWorldFrame[] }).__worldFrames ?? [];
      return frames.filter((frame) => frame.activeClip === "coding_idle").map((frame) => frame.activeClipTimeSec ?? 0).filter((time) => time > 0);
    });
    expect(Math.max(...codingTimes) - Math.min(...codingTimes)).toBeGreaterThan(0);
    await testInfo.attach("pause-and-rendered-action.json", {
      contentType: "application/json",
      body: JSON.stringify({
        restoredPausedBeforeActivation: firstFrame.activeClipTimeSec === 0,
        firstClip: firstFrame.activeClip,
        unpausedCodingTimeSamplesSec: codingTimes,
        rendererFrameCount: frames.length,
        optionalTextureTargets: latestTargets,
      }),
    });

    await pauseSwitch.click();
    await expect(pauseSwitch).toHaveAttribute("aria-checked", "true");
    await page.goto("/about", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/about$/);
    await page.goto("/?studio=1", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("world-stage-container")).toHaveAttribute("data-lifecycle-state", "HOME", { timeout: 30_000 });
    await expect(page.getByTestId("toggle-decorative-pause-btn")).toHaveAttribute("aria-checked", "true");
    await expect.poll(async () => page.evaluate(() => {
      const first = (window as Window & { __worldFrames?: CapturedWorldFrame[] }).__worldFrames?.[0];
      return first?.activeClip === "coding_idle" && first.activeClipTimeSec === 0;
    })).toBe(true);
  });

  test("fails a real required-transfer stall after the watchdog deadline and leaves recovery available", async ({ page }, testInfo) => {
    let releaseRequest!: () => void;
    let markRequestSeen!: () => void;
    const held = new Promise<void>((resolve) => { releaseRequest = resolve; });
    const requestSeen = new Promise<void>((resolve) => { markRequestSeen = resolve; });
    await page.route("**/models/production-room-full.glb", async (route) => {
      markRequestSeen();
      await held;
      try { await route.abort("failed"); } catch { /* Continue may already have canceled this request. */ }
    });

    await page.goto("/?studio=1", { waitUntil: "domcontentloaded" });
    await requestSeen;
    const stallStart = Date.now();
    const fallback = page.getByTestId("world-fallback-banner");
    await expect(fallback).toBeVisible({ timeout: 20_000 });
    const watchdogElapsedMs = Date.now() - stallStart;
    const reason = await fallback.innerText();
    expect(reason).toContain("15 seconds without required progress");
    expect(watchdogElapsedMs).toBeGreaterThanOrEqual(14_000);
    await expect(page.getByTestId("fallback-retry-btn")).toBeVisible();
    await expect(page.getByTestId("fallback-dismiss-btn")).toBeVisible();
    await testInfo.attach("watchdog-stall.json", {
      contentType: "application/json",
      body: JSON.stringify({ watchdogElapsedMs, expectedMs: 15_000, reason }),
    });

    await page.getByTestId("fallback-dismiss-btn").click();
    await expect(page.getByTestId("studio-disclosure")).toBeVisible();
    releaseRequest();
  });
});
