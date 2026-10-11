import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { expect, test, type Page } from "@playwright/test";
import * as ts from "typescript";

type ProgressSnapshot = { at: number; stage: string; ariaValueNow: string | null; valueText: string | null };
type FetchSnapshot = { url: string; encoding: string | null; contentLength: string | null };
type TimerRecord = { id: number; delay: number; callback: (() => void) | null };
type R6Window = Window & {
  __r6Progress?: ProgressSnapshot[];
  __r6Fetches?: FetchSnapshot[];
  __r6Timers?: { scheduled: TimerRecord[]; cleared: number[] };
};

const appRoot = process.cwd();
const requiredModels = [
  "production-room-full.glb",
  "resident-production.glb",
  "fixture-production.glb",
];

function sha256(bytes: Buffer | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

async function instrumentWorldPage(page: Page, captureTimers = false): Promise<void> {
  await page.addInitScript((shouldCaptureTimers) => {
    localStorage.setItem("yor_world_preferences_v1", JSON.stringify({
      version: 1,
      introCompleted: true,
      soundEnabled: false,
      quality: "auto",
      clock24h: true,
      paused: false,
    }));
    const state = window as R6Window;
    state.__r6Progress = [];
    state.__r6Fetches = [];
    const nativeFetch = window.fetch.bind(window);
    window.fetch = (async (...args: Parameters<typeof window.fetch>) => {
      const response = await nativeFetch(...args);
      const request = args[0];
      const url = request instanceof Request ? request.url : String(request);
      if (url.includes("/models/") && url.endsWith(".glb")) {
        state.__r6Fetches?.push({
          url,
          encoding: response.headers.get("content-encoding"),
          contentLength: response.headers.get("content-length"),
        });
      }
      return response;
    }) as typeof window.fetch;
    const captureProgress = () => {
      const stage = document.querySelector<HTMLElement>('[data-testid="world-loading-stage"]')?.textContent?.trim();
      const bar = document.querySelector<HTMLElement>('[data-testid="world-loading-progress-bar"]');
      if (!stage && !bar) return;
      state.__r6Progress?.push({
        at: performance.now(),
        stage: stage ?? "",
        ariaValueNow: bar?.getAttribute("aria-valuenow") ?? null,
        valueText: bar?.getAttribute("aria-valuetext") ?? null,
      });
    };
    new MutationObserver(captureProgress).observe(document, {
      attributes: true,
      childList: true,
      characterData: true,
      subtree: true,
    });
    if (shouldCaptureTimers) {
      state.__r6Timers = { scheduled: [], cleared: [] };
      const nativeSetTimeout = window.setTimeout.bind(window);
      const nativeClearTimeout = window.clearTimeout.bind(window);
      window.setTimeout = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
        const id = nativeSetTimeout(handler, timeout, ...args);
        if (typeof handler === "function" && timeout === 4000) {
          state.__r6Timers?.scheduled.push({ id, delay: timeout, callback: handler as () => void });
        }
        return id;
      }) as typeof window.setTimeout;
      window.clearTimeout = ((id?: number) => {
        if (id !== undefined) state.__r6Timers?.cleared.push(id);
        nativeClearTimeout(id);
      }) as typeof window.clearTimeout;
    }
  }, captureTimers);
}

async function installRuntimeMaterialProbe(page: Page): Promise<{ sourceHashes: Record<string, string> }> {
  const runtimeSource = readFileSync(path.join(appRoot, "src/features/world/RuntimeMaterialQuality.ts"), "utf8");
  const batchSource = readFileSync(path.join(appRoot, "src/features/world/LowQualityBatch.ts"), "utf8");
  const transpile = (source: string) => ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const runtimeModule = transpile(runtimeSource).replace('from "three"', 'from "/r6-modules/three.module.js"')
    .replace('from "./LowQualityBatch"', 'from "/r6-modules/LowQualityBatch.js"');
  const batchModule = transpile(batchSource).replace('from "three"', 'from "/r6-modules/three.module.js"');
  const modulePaths = new Map<string, Buffer | string>([
    ["/r6-modules/RuntimeMaterialQuality.js", runtimeModule],
    ["/r6-modules/LowQualityBatch.js", batchModule],
    ["/r6-modules/three.module.js", readFileSync(path.join(appRoot, "node_modules/three/build/three.module.js"))],
    ["/r6-modules/three.core.js", readFileSync(path.join(appRoot, "node_modules/three/build/three.core.js"))],
  ]);
  await page.route("**/r6-modules/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    const body = modulePaths.get(pathname);
    if (body === undefined) {
      await route.fulfill({ status: 404, body: "missing R6 browser module" });
      return;
    }
    await route.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body });
  });
  return {
    sourceHashes: {
      runtimeMaterialQuality: sha256(runtimeSource),
      lowQualityBatch: sha256(batchSource),
      threeModule: sha256(modulePaths.get("/r6-modules/three.module.js") as Buffer),
      threeCore: sha256(modulePaths.get("/r6-modules/three.core.js") as Buffer),
    },
  };
}

test.describe("FINISH-09 R6 source-bound Chromium runtime evidence", () => {
  test("real required-load UI recovers after a compressed room parse failure and reports only current identity attempts", async ({ page, browser }, testInfo) => {
    await instrumentWorldPage(page);
    let roomAttempts = 0;
    let releaseRetry!: () => void;
    let markRetryRequested!: () => void;
    const retryGate = new Promise<void>((resolve) => { releaseRetry = resolve; });
    const retryRequested = new Promise<void>((resolve) => { markRetryRequested = resolve; });
    const requestOrder: string[] = [];
    await page.route("**/models/*.glb", async (route) => {
      const name = path.basename(new URL(route.request().url()).pathname);
      if (!requiredModels.includes(name)) return route.continue();
      requestOrder.push(name);
      if (name === "production-room-full.glb") {
        roomAttempts += 1;
        if (roomAttempts === 1) {
          const compressedInvalidGlb = gzipSync(Buffer.from([0, 1, 2, 3]));
          await route.fulfill({
            status: 200,
            headers: {
              "content-type": "model/gltf-binary",
              "content-encoding": "gzip",
              "content-length": String(compressedInvalidGlb.byteLength),
            },
            body: compressedInvalidGlb,
          });
          return;
        }
        markRetryRequested();
        await retryGate;
      }
      const body = readFileSync(path.join(appRoot, "public/models", name));
      await route.fulfill({
        status: 200,
        headers: {
          "content-type": "model/gltf-binary",
          "content-encoding": "identity",
          "content-length": String(body.byteLength),
        },
        body,
      });
    });

    try {
      await page.goto("/?studio=1", { waitUntil: "domcontentloaded" });
      await retryRequested;
      await expect(page.getByTestId("world-loading-overlay")).toBeVisible();
      await expect(page.getByTestId("world-loading-stage")).toContainText(/production environment|retry/i);
      await page.getByTestId("world-loading-overlay").scrollIntoViewIfNeeded();
      await testInfo.attach("compressed-attempt-retry-ui.png", {
        contentType: "image/png",
        body: await page.screenshot({ fullPage: false }),
      });
      releaseRetry();
      const stage = page.getByTestId("world-stage-container");
      await expect(stage).toHaveAttribute("data-lifecycle-state", "HOME", { timeout: 30_000 });
      const observed = await page.evaluate(() => {
        const state = window as R6Window;
        return { progress: state.__r6Progress ?? [], fetches: state.__r6Fetches ?? [] };
      });
      await page.getByTestId("diagnostics-toggle-btn").click();
      const diagnosticsText = await page.getByTestId("world-diagnostics").textContent();
      if (!diagnosticsText) throw new Error("Runtime diagnostics were not rendered after required-load completion");
      const diagnostics = JSON.parse(diagnosticsText) as {
        loadingProgress: { stage: string; requiredLoaded: number; bytes: { kind: string; loaded?: number; total?: number } };
      };
      const roomFetches = observed.fetches.filter((entry) => entry.url.endsWith("/models/production-room-full.glb"));
      expect(roomAttempts).toBe(2);
      expect(requestOrder).toEqual([
        "production-room-full.glb",
        "production-room-full.glb",
        "resident-production.glb",
        "fixture-production.glb",
      ]);
      expect(roomFetches).toHaveLength(2);
      expect(roomFetches[0]?.encoding).toBe("gzip");
      expect(roomFetches[1]).toMatchObject({ encoding: "identity", contentLength: String(readFileSync(path.join(appRoot, "public/models/production-room-full.glb")).byteLength) });
      for (const model of ["resident-production.glb", "fixture-production.glb"]) {
        expect(observed.fetches.find((entry) => entry.url.endsWith(`/models/${model}`))).toMatchObject({
          encoding: "identity",
          contentLength: String(readFileSync(path.join(appRoot, "public/models", model)).byteLength),
        });
      }
      expect(observed.progress.some((entry) => /Retrying production-room-full\.glb/i.test(entry.stage))).toBe(true);
      const currentAttemptTotal = requiredModels.reduce((sum, model) => sum + readFileSync(path.join(appRoot, "public/models", model)).byteLength, 0);
      expect(diagnostics.loadingProgress).toMatchObject({
        stage: "Integrating required scene assets...",
        requiredLoaded: 3,
        bytes: { kind: "determinate", scope: "required-session", loaded: currentAttemptTotal, total: currentAttemptTotal },
      });
      await testInfo.attach("required-current-attempt-progress.json", {
        contentType: "application/json",
        body: JSON.stringify({
          browser: { name: browser.browserType().name(), version: browser.version() },
          buildId: readFileSync(path.join(appRoot, ".next/BUILD_ID"), "utf8").trim(),
          buildIdSha256: sha256(readFileSync(path.join(appRoot, ".next/BUILD_ID"))),
          sourceSha256: sha256(readFileSync(path.join(appRoot, "src/features/world/AssetLoader.ts"))),
          requestOrder,
          fetches: observed.fetches,
          capturedStages: observed.progress.map((entry) => entry.stage),
          loadingOverlayAriaSnapshots: observed.progress.map((entry) => ({ stage: entry.stage, ariaValueNow: entry.ariaValueNow, valueText: entry.valueText })),
          finalRuntimeDiagnostics: diagnostics.loadingProgress,
          aggregateBytesFromCurrentAttempts: currentAttemptTotal,
          failedCompressedBodyBytes: 4,
        }, null, 2),
      });
    } finally {
      releaseRetry();
    }
  });

  test("actual RuntimeMaterialQuality and real Three.js objects roll back a second-target failure atomically", async ({ page, browser }, testInfo) => {
    const moduleIdentity = await installRuntimeMaterialProbe(page);
    await page.goto("/about", { waitUntil: "domcontentloaded" });
    const result = await page.evaluate(async () => {
      const threeModuleUrl = "/r6-modules/three.module.js";
      const qualityModuleUrl = "/r6-modules/RuntimeMaterialQuality.js";
      const THREE = await import(threeModuleUrl);
      const qualityModule = await import(qualityModuleUrl);
      const scene = new THREE.Scene();
      const baseMap = new THREE.Texture();
      const secondBaseMap = new THREE.Texture();
      const optionalTexture = new THREE.Texture();
      optionalTexture.flipY = false;
      let baseMapDisposals = 0;
      let secondBaseMapDisposals = 0;
      let optionalTextureDisposals = 0;
      baseMap.addEventListener("dispose", () => baseMapDisposals++);
      secondBaseMap.addEventListener("dispose", () => secondBaseMapDisposals++);
      optionalTexture.addEventListener("dispose", () => optionalTextureDisposals++);
      const sharedMaterial = new THREE.MeshStandardMaterial({ map: baseMap });
      const secondMaterial = new THREE.MeshStandardMaterial({ map: secondBaseMap });
      const first = new THREE.Mesh(new THREE.BoxGeometry(), sharedMaterial);
      first.name = "desk_mat";
      const unrelated = new THREE.Mesh(new THREE.BoxGeometry(), sharedMaterial);
      unrelated.name = "unrelated-shared-user";
      const second = new THREE.Mesh(new THREE.BoxGeometry(), secondMaterial);
      second.name = "Desk_MatTopography";
      scene.add(first, unrelated, second);
      const quality = new qualityModule.RuntimeMaterialQuality(scene);
      const before = {
        originals: quality.originals.size,
        simplified: quality.simplified.size,
        generatedSimplified: quality.generatedSimplified.size,
        generatedClones: quality.generatedClones.size,
        generatedTextures: quality.generatedTextures.size,
        firstOriginal: quality.originals.get(first) === sharedMaterial,
        secondOriginal: quality.originals.get(second) === secondMaterial,
      };
      const firstDescriptor = Object.getOwnPropertyDescriptor(first, "material")!;
      const secondDescriptor = Object.getOwnPropertyDescriptor(second, "material")!;
      let firstVisible = sharedMaterial;
      let derivativeMaterialDisposals = 0;
      let derivativeTextureDisposals = 0;
      let derivativeMaterial = null;
      let derivativeTexture = null;
      Object.defineProperty(first, "material", {
        configurable: true,
        get: () => firstVisible,
        set: (value) => {
          firstVisible = value;
          if (value && value.isMeshStandardMaterial && value !== sharedMaterial) {
            derivativeMaterial = value;
            value.addEventListener("dispose", () => derivativeMaterialDisposals++);
            if (value.map && value.map !== baseMap && value.map !== optionalTexture) {
              derivativeTexture = value.map;
              value.map.addEventListener("dispose", () => derivativeTextureDisposals++);
            }
          }
        },
      });
      let secondAssignmentFailures = 0;
      Object.defineProperty(second, "material", {
        configurable: true,
        get: () => secondMaterial,
        set: () => {
          secondAssignmentFailures++;
          throw new Error("R6 controlled second-target assignment failure");
        },
      });
      const targetBefore = first.material;
      const unrelatedBefore = unrelated.material;
      const secondBefore = second.material;
      let returnedTargets = null;
      let injectedError = "";
      try {
        returnedTargets = qualityModule.installOptionalTextureOnScene("deskmat", scene, optionalTexture, quality);
      } catch (error) {
        injectedError = error instanceof Error ? error.message : String(error);
      }
      const after = {
        originals: quality.originals.size,
        simplified: quality.simplified.size,
        generatedSimplified: quality.generatedSimplified.size,
        generatedClones: quality.generatedClones.size,
        generatedTextures: quality.generatedTextures.size,
        firstOriginal: quality.originals.get(first) === sharedMaterial,
        secondOriginal: quality.originals.get(second) === secondMaterial,
      };
      const visibleRestored = first.material === targetBefore && second.material === secondBefore;
      const unrelatedUnchanged = unrelated.material === unrelatedBefore && unrelated.material === sharedMaterial;
      const originalMapsPreserved = sharedMaterial.map === baseMap && secondMaterial.map === secondBaseMap;
      Object.defineProperty(first, "material", firstDescriptor);
      Object.defineProperty(second, "material", secondDescriptor);
      quality.apply("low");
      const lowTierMapsPreserved = first.material.map === baseMap && unrelated.material.map === baseMap && second.material.map === secondBaseMap;
      quality.apply("high");
      const highTierRestored = first.material === sharedMaterial && unrelated.material === sharedMaterial && second.material === secondMaterial;
      quality.dispose();
      return {
        returnedTargets,
        injectedError,
        secondAssignmentFailures,
        before,
        after,
        visibleRestored,
        unrelatedUnchanged,
        originalMapsPreserved,
        lowTierMapsPreserved,
        highTierRestored,
        derivativeMaterialCaptured: derivativeMaterial !== null,
        derivativeTextureCaptured: derivativeTexture !== null,
        derivativeMaterialDisposals,
        derivativeTextureDisposals,
        baseMapDisposals,
        secondBaseMapDisposals,
        optionalTextureDisposals,
      };
    });
    expect(result.returnedTargets).toBeNull();
    expect(result.injectedError).toBe("R6 controlled second-target assignment failure");
    expect(result.secondAssignmentFailures).toBeGreaterThan(0);
    expect(result.after).toEqual(result.before);
    expect(result.visibleRestored).toBe(true);
    expect(result.unrelatedUnchanged).toBe(true);
    expect(result.originalMapsPreserved).toBe(true);
    expect(result.lowTierMapsPreserved).toBe(true);
    expect(result.highTierRestored).toBe(true);
    expect(result.derivativeMaterialCaptured).toBe(true);
    expect(result.derivativeTextureCaptured).toBe(true);
    expect(result.derivativeMaterialDisposals).toBe(1);
    expect(result.derivativeTextureDisposals).toBe(1);
    expect(result.baseMapDisposals).toBe(0);
    expect(result.secondBaseMapDisposals).toBe(0);
    expect(result.optionalTextureDisposals).toBe(0);
    await testInfo.attach("optional-map-rollback-observation.json", {
      contentType: "application/json",
      body: JSON.stringify({
        browser: { name: browser.browserType().name(), version: browser.version() },
        buildId: readFileSync(path.join(appRoot, ".next/BUILD_ID"), "utf8").trim(),
        buildIdSha256: sha256(readFileSync(path.join(appRoot, ".next/BUILD_ID"))),
        sourceHashes: moduleIdentity.sourceHashes,
        result,
      }, null, 2),
    });
  });

  test("WorldRuntime greeting replacement, stale callbacks, and disposal use browser timers", async ({ page, browser }, testInfo) => {
    await instrumentWorldPage(page, true);
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.goto("/?studio=1", { waitUntil: "domcontentloaded" });
    const stage = page.getByTestId("world-stage-container");
    await expect(stage).toHaveAttribute("data-lifecycle-state", "HOME", { timeout: 30_000 });
    const greet = page.getByTestId("greet-resident-btn");

    await greet.click();
    await expect(stage).toHaveAttribute("data-lifecycle-state", "TRANSITION");
    const firstTimerId = await page.evaluate(() => (window as R6Window).__r6Timers!.scheduled.filter((timer) => timer.delay === 4000).at(-1)!.id);
    const transitionScreenshot = await page.screenshot({ fullPage: false });
    await testInfo.attach("greeting-transition.png", { contentType: "image/png", body: transitionScreenshot });
    await page.waitForTimeout(3100);

    await greet.click();
    await expect(stage).toHaveAttribute("data-lifecycle-state", "TRANSITION");
    const secondTimerId = await page.evaluate(() => (window as R6Window).__r6Timers!.scheduled.filter((timer) => timer.delay === 4000).at(-1)!.id);
    expect(secondTimerId).not.toBe(firstTimerId);
    expect(await page.evaluate((id) => (window as R6Window).__r6Timers!.cleared.includes(id), firstTimerId)).toBe(true);
    await page.evaluate((id) => {
      const stale = (window as R6Window).__r6Timers!.scheduled.find((timer) => timer.id === id)?.callback;
      stale?.();
    }, firstTimerId);
    await page.waitForTimeout(1200);
    await expect(stage).toHaveAttribute("data-lifecycle-state", "TRANSITION");
    await expect(stage).toHaveAttribute("data-lifecycle-state", "HOME", { timeout: 5000 });

    await greet.click();
    await expect(stage).toHaveAttribute("data-lifecycle-state", "TRANSITION");
    const disposalTimerId = await page.evaluate(() => (window as R6Window).__r6Timers!.scheduled.filter((timer) => timer.delay === 4000).at(-1)!.id);
    await page.getByTestId("a11y-link-about").click();
    await expect(page).toHaveURL(/\/about(?:#.*)?$/);
    expect(await page.evaluate((id) => (window as R6Window).__r6Timers!.cleared.includes(id), disposalTimerId)).toBe(true);
    await page.evaluate((id) => {
      const staleAfterDispose = (window as R6Window).__r6Timers!.scheduled.find((timer) => timer.id === id)?.callback;
      staleAfterDispose?.();
    }, disposalTimerId);
    expect(await page.getByTestId("world-stage-container").count()).toBe(0);
    expect(pageErrors).toEqual([]);
    const timerEvidence = await page.evaluate(() => {
      const timers = (window as R6Window).__r6Timers!;
      return { scheduled4000ms: timers.scheduled.map((timer) => timer.id), cleared: timers.cleared };
    });
    await testInfo.attach("world-runtime-browser-timer-evidence.json", {
      contentType: "application/json",
      body: JSON.stringify({
        browser: { name: browser.browserType().name(), version: browser.version() },
        buildId: readFileSync(path.join(appRoot, ".next/BUILD_ID"), "utf8").trim(),
        buildIdSha256: sha256(readFileSync(path.join(appRoot, ".next/BUILD_ID"))),
        sourceSha256: sha256(readFileSync(path.join(appRoot, "src/features/world/WorldRuntime.ts"))),
        firstTimerId,
        replacementTimerId: secondTimerId,
        disposedTimerId: disposalTimerId,
        staleCallbackRejectedBeforeOldDeadline: true,
        disposedCallbackInvokedAfterRouteUnmount: true,
        timerEvidence,
      }, null, 2),
    });
  });
});
