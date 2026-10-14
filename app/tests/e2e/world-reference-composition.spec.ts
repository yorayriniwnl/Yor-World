import { expect, test, type Page, type ViewportSize } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const evidenceRoot = path.resolve(
  process.env.PRE_G7_13_EVIDENCE_DIR || "../deliveries/G7/preparation/maker-evidence/pre-g7-13",
);
const screenshotDir = path.join(evidenceRoot, "screenshots");
const measurementDir = path.join(evidenceRoot, "measurements");
const referencePath = path.resolve(process.cwd(), "../references/images/main-reference.png");
const evidenceMode = process.env.PRE_G7_13_EVIDENCE_MODE === "1";
const testPanelScale = process.env.PRE_G7_13_TEST_PANEL_SCALE;
const actionSelector = [
  '[data-testid="studio-controls-toggle"]',
  "#studio-controls-panel button",
  "#studio-controls-panel a[href]",
  "#studio-controls-panel select",
  'nav[aria-label="Portfolio destinations and studio exit"] a[href]',
  'nav[aria-label="Portfolio destinations and studio exit"] button',
].join(", ");

fs.mkdirSync(screenshotDir, { recursive: true });
fs.mkdirSync(measurementDir, { recursive: true });

function recordErrors(page: Page, label: string) {
  const logPath = path.join(evidenceRoot, `${label}-browser.log`);
  page.on("console", (message) => {
    if (message.type() === "error") fs.appendFileSync(logPath, `[console.error] ${message.text()}\n`, "utf8");
  });
  page.on("pageerror", (error) => fs.appendFileSync(logPath, `[pageerror] ${error.stack || error.message}\n`, "utf8"));
}

async function enterHome(page: Page, viewport: ViewportSize) {
  await page.setViewportSize(viewport);
  const evidenceQuery = evidenceMode
    ? `&pre-g7-evidence=1${testPanelScale ? `&pre-g7-test-panel-scale=${encodeURIComponent(testPanelScale)}` : ""}`
    : "";
  await page.goto(`/?studio=enter${evidenceQuery}`);
  const dialog = page.getByTestId("fullscreen-studio-dialog");
  await expect(dialog).toHaveAttribute("open", "", { timeout: 15_000 });
  await expect(page.getByTestId("world-stage-container")).toBeVisible({ timeout: 45_000 });
  await expect(page.getByTestId("world-canvas")).toBeVisible({ timeout: 45_000 });
  await expect(page.getByTestId("world-loading-overlay")).toBeHidden({ timeout: 90_000 });

  const stage = page.getByTestId("world-stage-container");
  const toggle = page.getByTestId("studio-controls-toggle");
  await expect(stage).toHaveAttribute("data-studio-controls-open", "false");
  await toggle.click();
  await expect(page.getByTestId("quality-tier-select")).toBeFocused();
  await page.getByTestId("skip-motion-btn").click();
  await expect(stage).toHaveAttribute("data-lifecycle-state", "HOME", { timeout: 15_000 });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");

  const camera = viewport.width <= 640 ? "home-mobile" : "home-desktop";
  const cameraButton = camera === "home-mobile" ? "camera-mobile-btn" : "camera-home-btn";
  await expect(page.getByTestId(cameraButton)).toHaveClass(/hudButtonActive/);
  await page.waitForTimeout(400);
  return { dialog, stage, camera };
}

type CapturedFrame = {
  label: string;
  screenshot: string;
  snapshot: ProjectedSnapshot | null;
  browser: {
    capturedAt: string;
    pageUrl: string;
    pageOrigin: string;
    loadedNextChunks: string[];
    userAgent: string;
    platform: string;
    devicePixelRatio: number;
    viewport: { width: number; height: number };
    webgl: { version: string; vendor: string; renderer: string; contextLost: boolean } | null;
    runtimeState: Record<string, unknown>;
  };
};

async function captureLiveViewportFrame(page: Page, filename: string, viewport: ViewportSize, label: string) {
  // The complete runtime and anchor snapshot is collected on the live page,
  // then the PNG is captured immediately, before another UI action or route.
  const browser = await page.evaluate(() => {
    const diagnostics = (window as Window & {
      __PRE_G7_13_REFERENCE_DIAGNOSTICS__?: { latest: ProjectedSnapshot; refresh: () => ProjectedSnapshot };
    }).__PRE_G7_13_REFERENCE_DIAGNOSTICS__;
    const referenceComposition = diagnostics?.refresh() ?? diagnostics?.latest ?? null;
    const canvas = document.querySelector<HTMLCanvasElement>("[data-testid='world-canvas']");
    const context = canvas?.getContext("webgl2") ?? canvas?.getContext("webgl");
    const stage = document.querySelector<HTMLElement>("[data-testid='world-stage-container']");
    const canvasRect = canvas?.getBoundingClientRect();
    const debugInfo = context?.getExtension("WEBGL_debug_renderer_info") as
      | { UNMASKED_VENDOR_WEBGL: number; UNMASKED_RENDERER_WEBGL: number }
      | null;
    return {
      capturedAt: new Date().toISOString(),
      pageUrl: window.location.href,
      pageOrigin: window.location.origin,
      loadedNextChunks: performance.getEntriesByType("resource")
        .map((entry) => entry.name)
        .filter((name) => name.includes("/_next/static/chunks/")),
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      devicePixelRatio: window.devicePixelRatio,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      webgl: context ? {
        version: context.getParameter(context.VERSION),
        vendor: context.getParameter(context.VENDOR),
        renderer: context.getParameter(context.RENDERER),
        unmaskedVendor: debugInfo ? context.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : null,
        unmaskedRenderer: debugInfo ? context.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : null,
        contextLost: context.isContextLost(),
      } : null,
      runtimeState: {
        staticFallbackPresent: Boolean(document.querySelector("[data-testid='world-static-container']")),
        failureFallbackPresent: Boolean(document.querySelector("[data-testid='world-failure-container']")),
        stage: stage ? {
          lifecycleState: stage.dataset.lifecycleState ?? null,
          controlsOpen: stage.dataset.studioControlsOpen ?? null,
        } : null,
        canvas: canvas ? {
          count: document.querySelectorAll("[data-testid='world-canvas']").length,
          width: canvas.width,
          height: canvas.height,
          rect: canvasRect ? { x: canvasRect.x, y: canvasRect.y, width: canvasRect.width, height: canvasRect.height } : null,
          display: getComputedStyle(canvas).display,
          visibility: getComputedStyle(canvas).visibility,
        } : null,
        qualityPreference: document.querySelector<HTMLSelectElement>("[data-testid='quality-tier-select']")?.value ?? null,
        staticFallbackCount: document.querySelectorAll("[data-testid='world-static-container']").length,
      },
      referenceComposition,
    };
  });
  const actualPath = path.join(screenshotDir, filename);
  await page.screenshot({ path: actualPath, fullPage: false });
  const capturedFrame: CapturedFrame = {
    label,
    screenshot: path.relative(evidenceRoot, actualPath),
    snapshot: browser.referenceComposition,
    browser,
  };
  fs.writeFileSync(
    path.join(measurementDir, `${label}-capture-frame.json`),
    `${JSON.stringify(capturedFrame, null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(measurementDir, `browser-environment-${viewport.width}x${viewport.height}.json`),
    `${JSON.stringify({ configuredPort: process.env.PORT ?? "3133 (default)", ...browser }, null, 2)}\n`,
    "utf8",
  );
  expect(browser.pageUrl, `${label} URL is captured with its screenshot`).toMatch(/\/\?studio=enter/);
  expect(browser.viewport).toEqual(viewport);
  expect(browser.webgl, `${label} captured a WebGL context`).not.toBeNull();
  expect(browser.webgl?.contextLost).toBe(false);
  if (evidenceMode) {
    expect(browser.pageOrigin).toBe(`http://127.0.0.1:${process.env.PORT ?? "3133"}`);
    expect(browser.loadedNextChunks.some((name) => name.includes("/_next/static/chunks/"))).toBe(true);
    expect(capturedFrame.snapshot, `${label} has source-bound scene diagnostics from the captured page`).not.toBeNull();
  }
  return { capturedFrame, actualPath };
}

async function captureAndCompose(
  page: Page,
  filename: string,
  viewport: ViewportSize,
  label: string,
) {
  const { capturedFrame, actualPath } = await captureLiveViewportFrame(page, filename, viewport, label);
  const center = {
    left: Math.floor(viewport.width * 0.2),
    top: Math.floor(viewport.height * 0.2),
    width: Math.floor(viewport.width * 0.6),
    height: Math.floor(viewport.height * 0.6),
  };
  const pixels = await sharp(actualPath).extract(center).resize(32, 32).removeAlpha().raw().toBuffer();
  const distinctPixelColors = new Set<string>();
  for (let offset = 0; offset < pixels.length; offset += 3) {
    distinctPixelColors.add(`${pixels[offset]},${pixels[offset + 1]},${pixels[offset + 2]}`);
  }
  const renderMeasurement = { screenshot: filename, sampleRegion: center, distinctPixelColors: distinctPixelColors.size };
  fs.writeFileSync(path.join(measurementDir, `${filename.replace(".png", "-scene-pixels.json")}`), `${JSON.stringify(renderMeasurement, null, 2)}\n`, "utf8");
  const sideBySide = await sharp({
    create: { width: viewport.width * 2, height: viewport.height, channels: 4, background: "#0c1017" },
  })
    .composite([
      { input: await sharp(referencePath).resize(viewport.width, viewport.height, { fit: "contain", background: "#0c1017" }).png().toBuffer(), left: 0, top: 0 },
      { input: await sharp(actualPath).resize(viewport.width, viewport.height, { fit: "contain", background: "#0c1017" }).png().toBuffer(), left: viewport.width, top: 0 },
    ])
    .png()
    .toBuffer();
  await fs.promises.writeFile(path.join(screenshotDir, filename.replace(".png", "-reference-comparison.png")), sideBySide);
  return { renderMeasurement, capturedFrame, actualPath };
}

async function measureFixedChrome(page: Page, viewport: ViewportSize, label: string) {
  const measurement = await page.evaluate(() => {
    const elements = [
      document.querySelector<HTMLElement>("[data-testid='studio-controls-toggle']"),
      document.querySelector<HTMLElement>('nav[aria-label="Portfolio destinations and studio exit"]'),
    ].filter((element): element is HTMLElement => Boolean(element));
    const boxes = elements.map((element) => {
      const rect = element.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, visible: getComputedStyle(element).display !== "none" };
    }).filter((box) => box.visible);
    const area = boxes.reduce((sum, box, index) => {
      let overlap = 0;
      for (const previous of boxes.slice(0, index)) {
        overlap += Math.max(0, Math.min(box.x + box.width, previous.x + previous.width) - Math.max(box.x, previous.x)) *
          Math.max(0, Math.min(box.y + box.height, previous.y + previous.height) - Math.max(box.y, previous.y));
      }
      return sum + box.width * box.height - overlap;
    }, 0);
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      boxes,
      coveredArea: area,
      coveredRatio: area / (window.innerWidth * window.innerHeight),
      documentWidth: document.documentElement.scrollWidth,
      stage: (() => {
        const rect = document.querySelector<HTMLElement>("[data-testid='world-stage-container']")?.getBoundingClientRect();
        return rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null;
      })(),
    };
  });
  expect(measurement.documentWidth, `${label} has no page horizontal overflow`).toBeLessThanOrEqual(viewport.width);
  expect(measurement.coveredRatio, `${label} fixed closed-drawer chrome <= 20%`).toBeLessThanOrEqual(0.2);
  fs.writeFileSync(path.join(measurementDir, `${label}-closed-chrome.json`), `${JSON.stringify(measurement, null, 2)}\n`, "utf8");
  return measurement;
}

type ProjectedAnchor = {
  name: string;
  found: boolean;
  worldScale?: number[];
  worldBounds?: { min: number[]; max: number[] } | null;
  pixelBounds?: {
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
    visibleAreaRatio: number;
  } | null;
  materials?: Array<{ name?: string; color?: string; emissive?: string; emissiveIntensity?: number }>;
  geometry?: {
    meshName?: string;
    parentName?: string | null;
    runtimeGeometryUuid?: string;
    sourceGeometryUuid?: string | null;
    vertices?: number;
    indices?: number;
    groups?: number;
    materialSlotCount?: number;
    sides?: number;
    width?: number;
    height?: number;
    depth?: number;
    sourceWidth?: number;
    sourceHeight?: number;
    sourceDepth?: number;
  };
  sampledRegionHits?: {
    samples: number;
    target: number;
    targetSurface: number;
    chair: number;
    resident: number;
    other: number;
    noRenderableHit: number;
    occluderRatio: number | null;
    centerRay?: {
      pixel: [number, number];
      targetDirectHitCount: number;
      targetDirectHitNames: string[];
      firstSceneHitName: string | null;
      firstRawSceneHitRenderable: boolean | null;
      firstRenderableSceneHitName: string | null;
      firstRenderableSceneHitBelongsToTarget: boolean;
      firstSceneHitBelongsToTarget: boolean;
      renderedFirstHit: Record<string, unknown> | null;
      ndc: number[];
      rayOrigin: number[];
      rayDirection: number[];
      cameraSource: string;
      meshCenterRay: {
        meshName: string;
        worldCenter: number[];
        pixel: number[];
        ndc: number[];
        directRaycastHitCount: number;
        directRaycastHitNames: string[];
        firstSceneHitName: string | null;
        firstRenderableSceneHitName: string | null;
        rendererSceneHits: Array<Record<string, unknown>>;
        sceneIdentity: {
          sceneIsTargetMesh: boolean;
          sceneLookupFindsTargetById: boolean;
          targetAncestorChainContainsScene: boolean;
          sceneIntersectionCount: number;
          sceneIntersectionNames: string[];
          raycasterLayerMask: number;
          cameraLayerMask: number;
          targetMeshLayerMask: number;
          sceneLayerMask: number;
        };
        ancestorQueries: Array<{
          name: string;
          type: string;
          id: number;
          isSceneRoot: boolean;
          sceneLookupIdentityMatches: boolean;
          containsTargetMesh: boolean;
          intersectionCount: number;
          hitNames: string[];
        }>;
      } | null;
    };
  } | null;
};

type ProjectedSnapshot = {
  viewport: { width: number; height: number };
  camera: {
    source: "active-runtime-camera" | "preset-reconstruction";
    activeRuntime: {
      preset: string;
      position: number[];
      target: number[];
      quaternion: number[];
      layerMask: number;
      fov: number;
      aspect: number;
      projectionMatrix: number[];
      worldMatrix: number[];
    } | null;
    activeWorldMatrixMatches: boolean | null;
    activeProjectionMatrixMatches: boolean | null;
    preset: string;
    position: number[];
    target: number[];
    fov: number;
    aspect: number;
    projectionMatrix: number[];
    worldMatrix: number[];
  };
  rendererCamera: {
    architecture: "WorldRuntime-WebGLRenderer";
    rendererCameraUuid: string;
    rendererCameraType: string;
    cameraDirectorUuid: string | null;
    cameraObjectIdentityMatchesDirector: boolean;
    rendererCameraLayerMask: number;
    cameraDirectorLayerMask: number | null;
    rendererCameraSeesPanelMeshLayer: boolean | null;
    sceneUuid: string;
    sceneType: string;
    sceneHasPanelNode: boolean;
    panelNode: { id: number; uuid: string; name: string; type: string; layerMask: number; isMesh: boolean } | null;
    panelMesh: { id: number; uuid: string; name: string; type: string; layerMask: number } | null;
    panelBatchMemberships: Array<{
      batchId: number;
      batchUuid: string;
      batchVisible: boolean;
      batchLayerMask: number;
      panelOriginalLayerMask: number;
    }>;
    hexPanelBatchMemberships: Array<{
      panelName: string;
      panelUuid: string | null;
      panelLayerMask: number | null;
      batches: Array<{
        batchObjectId: number;
        batchUuid: string;
        batchVisible: boolean;
        batchLayerMask: number;
        batchInstanceIndex: number;
        panelOriginalLayerMask: number;
      }>;
    }>;
    visibleLowQualityBatches: Array<{ id: number; uuid: string; layerMask: number }>;
    rendererCanvasMatchesWorldCanvas: boolean;
    rendererFrame: number | null;
    rendererCalls: number | null;
    rendererTriangles: number | null;
    contextLost: boolean | null;
    qualityTier: string;
  } | null;
  raycastScene: {
    source: "live-renderer-scene" | "composition-root";
    id: number;
    uuid: string;
    name: string;
    type: string;
    layerMask: number;
    batchEntryCount: number;
  };
  lowQualityBatchRaycastsSuppressedAfterSampling: number;
  testPanelScale: number | null;
  anchors: ProjectedAnchor[];
  lights: Array<{ name: string; found: boolean; color?: string; intensity?: number; position?: number[] }>;
  interactionNeutralMeshes: { total: number; raycastsSuppressedAfterSampling: number };
};

async function recordVisualAnchorEvidence(
  capturedFrame: CapturedFrame,
  screenshotPath: string,
  viewport: ViewportSize,
  label: string,
) {
  const snapshot = capturedFrame.snapshot;
  fs.writeFileSync(
    path.join(measurementDir, `${label}-anchor-diagnostics.json`),
    `${JSON.stringify({
      label,
      screenshot: path.relative(evidenceRoot, screenshotPath),
      viewport,
      captureFrame: capturedFrame,
      snapshot,
    }, null, 2)}\n`,
    "utf8",
  );
  expect(snapshot, `${label} captured diagnostics from the same live page as its PNG`).not.toBeNull();
  const measured = snapshot as ProjectedSnapshot;
  expect(measured.viewport).toEqual(viewport);
  expect(measured.camera.source, `${label} uses the live CameraDirector pose`).toBe("active-runtime-camera");
  expect(measured.camera.activeWorldMatrixMatches, `${label} diagnostic camera transform matches the live runtime matrix`).toBe(true);
  expect(measured.camera.activeProjectionMatrixMatches, `${label} diagnostic projection matches the live runtime projection`).toBe(true);
  if (viewport.width < 640) {
    expect(measured.camera.target[1], `${label} uses the mobile down-aim for the compact portrait frame`).toBeCloseTo(0.55, 3);
    expect(measured.camera.fov, `${label} preserves the mobile portrait FOV`).toBe(100);
  } else if (viewport.height <= 420) {
    expect(measured.camera.fov, `${label} uses short-landscape vertical breathing room`).toBe(56);
  } else {
    expect(measured.camera.fov, `${label} preserves the desktop reference FOV`).toBe(48);
  }
  expect(measured.rendererCamera, `${label} records the live renderer camera separately`).not.toBeNull();
  const rendererCamera = measured.rendererCamera!;
  expect(rendererCamera.architecture, `${label} identifies the raw WebGLRenderer camera path`).toBe("WorldRuntime-WebGLRenderer");
  expect(rendererCamera.cameraObjectIdentityMatchesDirector, `${label} renderer and CameraDirector share one camera object`).toBe(true);
  expect(rendererCamera.rendererCameraUuid, `${label} renderer camera identity matches CameraDirector`).toBe(rendererCamera.cameraDirectorUuid);
  expect(rendererCamera.rendererCameraLayerMask, `${label} records the actual renderer camera mask`).toBe(rendererCamera.cameraDirectorLayerMask);
  expect(rendererCamera.sceneHasPanelNode, `${label} actual renderer scene contains the named panel`).toBe(true);
  expect(rendererCamera.panelMesh, `${label} records the actual rendered panel mesh`).not.toBeNull();
  expect(rendererCamera.rendererCameraSeesPanelMeshLayer, `${label} records whether the actual renderer camera includes the panel layer`).not.toBeNull();
  if (rendererCamera.qualityTier === "low") {
    expect(
      rendererCamera.panelBatchMemberships.some((batch) =>
        batch.batchVisible && (batch.batchLayerMask & rendererCamera.rendererCameraLayerMask) !== 0,
      ),
      `${label} confirms the visible low-quality batch contains the source panel mesh on a camera-visible layer`,
    ).toBe(true);
  }
  expect(rendererCamera.rendererCanvasMatchesWorldCanvas, `${label} probes the canvas used by WorldRuntime's renderer`).toBe(true);
  expect(rendererCamera.rendererFrame, `${label} samples a live rendered frame`).toBeGreaterThan(0);
  expect(rendererCamera.contextLost, `${label} renderer context remains live`).toBe(false);
  expect(measured.interactionNeutralMeshes.total, `${label} code-native meshes are interaction-neutral`).toBeGreaterThan(0);
  expect(measured.interactionNeutralMeshes.raycastsSuppressedAfterSampling, `${label} temporary diagnostic raycasts were restored`).toBe(measured.interactionNeutralMeshes.total);
  const required = [
    ...Array.from({ length: 7 }, (_, index) => `hex_panel_${index + 1}`),
    "lightbar_emissive",
    "ai-real-camera",
    "plants",
    "monitor",
    "speaker_left_cabinet",
    "speaker_right_cabinet",
    "talks-microphone",
    "console-code-native",
    "helios-pc",
    "pegboard_system",
    "peg_controller_body",
    "controller-code-native",
    "headset-stand-code-native",
    "headset-code-native",
    "desk",
  ];
  const byName = new Map(measured.anchors.map((anchor) => [anchor.name, anchor]));
  const hexBatchAudit = rendererCamera.hexPanelBatchMemberships.map((membership) => {
    const panel = byName.get(membership.panelName);
    const centerRay = panel?.sampledRegionHits?.centerRay?.meshCenterRay;
    return {
      panelName: membership.panelName,
      panelUuid: membership.panelUuid,
      panelLayerMask: membership.panelLayerMask,
      batches: membership.batches,
      sourceMeshDirectSurfaceSamples: panel?.sampledRegionHits?.targetSurface ?? null,
      renderedBatchSurfaceSamples: panel?.sampledRegionHits?.target ?? null,
      sameRayIntersections: centerRay?.rendererSceneHits ?? [],
    };
  });
  console.log(`[PRE-G7-13 panel batch and same-ray evidence] ${label} ${JSON.stringify(hexBatchAudit.map((entry) => ({
    panelName: entry.panelName,
    sourceMeshDirectSurfaceSamples: entry.sourceMeshDirectSurfaceSamples,
    renderedBatchSurfaceSamples: entry.renderedBatchSurfaceSamples,
    batches: entry.batches.map((batch) => ({
      batchObjectId: batch.batchObjectId,
      batchVisible: batch.batchVisible,
      batchLayerMask: batch.batchLayerMask,
      batchInstanceIndex: batch.batchInstanceIndex,
    })),
    sameRayIntersections: entry.sameRayIntersections.map((hit) => ({
      renderedObjectName: hit["renderedObjectName"],
      batchObjectId: hit["batchObjectId"],
      batchId: hit["batchId"],
      mappedSourceName: hit["mappedSourceName"],
      batchEntryContainsSource: hit["batchEntryContainsSource"],
      rendered: (hit["renderState"] as { rendered?: boolean } | undefined)?.rendered,
    })),
  })))}`);
  expect(rendererCamera.hexPanelBatchMemberships, `${label} enumerates all seven named panel batch memberships`).toHaveLength(7);
  for (let index = 1; index <= 7; index += 1) {
    const panelName = `hex_panel_${index}`;
    const membership = rendererCamera.hexPanelBatchMemberships.find((entry) => entry.panelName === panelName);
    expect(membership?.panelUuid, `${label} live low-quality inventory resolves ${panelName}`).toBeTruthy();
    expect(membership?.panelLayerMask, `${label} records ${panelName}'s source layer`).toBeGreaterThan(0);
    if (rendererCamera.qualityTier === "low") {
      const visibleMembership = membership?.batches.find((batch) =>
        batch.batchVisible && (batch.batchLayerMask & rendererCamera.rendererCameraLayerMask) !== 0,
      );
      expect(visibleMembership, `${label} ${panelName} belongs to a visible camera-layer low-quality batch`).toBeDefined();
      const meshCenterHits = byName.get(panelName)?.sampledRegionHits?.centerRay?.meshCenterRay?.rendererSceneHits ?? [];
      const sameBatchHit = meshCenterHits.find((hit) =>
        hit["mappedSourceName"] === panelName &&
        hit["batchObjectId"] === visibleMembership?.batchObjectId,
      );
      expect(sameBatchHit, `${label} same-ray visible batch hit maps to ${panelName}`).toBeDefined();
      expect(sameBatchHit?.["batchEntryContainsSource"], `${label} same-ray batch index resolves the exact ${panelName} source mesh`).toBe(true);
      expect(sameBatchHit?.["batchInstanceIndex"], `${label} same-ray batch index matches the inventory instance index`).toBe(visibleMembership?.batchInstanceIndex);
      expect(
        byName.get(panelName)?.sampledRegionHits?.targetSurface,
        `${label} ${panelName} source mesh is not directly ray visible after LOW batching`,
      ).toBe(0);
      expect(
        byName.get(panelName)?.sampledRegionHits?.target,
        `${label} ${panelName} still has visible same-frame batch-mapped surface samples`,
      ).toBeGreaterThan(0);
    }
    const panelCenterRay = byName.get(panelName)?.sampledRegionHits?.centerRay;
    if (panelCenterRay?.firstRenderableSceneHitBelongsToTarget) {
      expect(
        panelCenterRay.firstRenderableSceneHitName,
        `${label} unobstructed first renderable scene hit maps back to ${panelName}`,
      ).toBe(panelName);
    }
  }
  expect(byName.get("hex_panel_1")?.sampledRegionHits?.centerRay?.meshCenterRay, `${label} logs a direct mesh ray at the actual projected panel center`).not.toBeNull();
  const runtimePanelGeometryIds = new Set<string>();
  for (const name of required) {
    const anchor = byName.get(name);
    expect(anchor?.found, `${label} GLB/code-native anchor ${name} exists`).toBe(true);
    expect(anchor?.pixelBounds, `${label} ${name} has projected bounds`).not.toBeNull();
    const bounds = anchor!.pixelBounds!;
    expect(bounds.left, `${label} ${name} is inside the left edge`).toBeGreaterThanOrEqual(0);
    expect(bounds.top, `${label} ${name} is inside the top edge`).toBeGreaterThanOrEqual(0);
    expect(bounds.right, `${label} ${name} is inside the right edge`).toBeLessThanOrEqual(viewport.width);
    expect(bounds.bottom, `${label} ${name} is inside the bottom edge`).toBeLessThanOrEqual(viewport.height);
    expect(bounds.visibleAreaRatio, `${label} ${name} is not clipped`).toBeGreaterThanOrEqual(0.98);
  }
  for (let index = 1; index <= 7; index += 1) {
    const panel = byName.get(`hex_panel_${index}`)!;
    const geometry = panel.geometry;
    expect(geometry?.meshName, `${label} hex_panel_${index} keeps its named mesh`).toBe(`hex_panel_${index}`);
    expect(geometry?.sides, `${label} hex_panel_${index} runtime silhouette has six sides`).toBe(6);
    expect(geometry?.width).toBeCloseTo(0.22, 3);
    expect(geometry?.height).toBeCloseTo(0.190525, 4);
    expect(geometry?.depth).toBeCloseTo(0.015, 3);
    expect(geometry?.sourceWidth).toBeCloseTo(0.22, 3);
    expect(geometry?.sourceHeight).toBeCloseTo(0.2, 3);
    expect(geometry?.sourceDepth).toBeCloseTo(0.015, 3);
    expect(geometry?.vertices).toBe(36);
    expect(geometry?.indices).toBe(60);
    expect(geometry?.groups).toBe(0);
    expect(geometry?.materialSlotCount).toBe(1);
    expect(geometry?.runtimeGeometryUuid).toBeTruthy();
    expect(geometry?.runtimeGeometryUuid).not.toBe(geometry?.sourceGeometryUuid);
    expect(runtimePanelGeometryIds.has(geometry!.runtimeGeometryUuid!), `${label} hex_panel_${index} has isolated geometry`).toBe(false);
    runtimePanelGeometryIds.add(geometry!.runtimeGeometryUuid!);
  }
  for (const name of ["chair-root", "chair-base", "resident"]) {
    const actor = byName.get(name);
    expect(actor?.found, `${label} named ${name} is present for occlusion measurements`).toBe(true);
    expect(actor?.pixelBounds, `${label} ${name} has measurable bounds`).not.toBeNull();
  }

  const lowerShelfBounds = byName.get("shelf_rear_lower")?.worldBounds;
  const cameraWorldBounds = byName.get("ai-real-camera")?.worldBounds;
  expect(lowerShelfBounds, `${label} lower camera shelf has measured world bounds`).toBeDefined();
  expect(cameraWorldBounds, `${label} camera has measured world bounds`).toBeDefined();
  expect(cameraWorldBounds!.min[1]!).toBeCloseTo(lowerShelfBounds!.max[1]!, 3);

  for (const name of ["ivy_mound", "ivy_vine_1", "ivy_vine_2", "ivy_vine_3", "ivy_vine_4", "pot_ivy"]) {
    const ivyPart = byName.get(name);
    expect(ivyPart?.found, `${label} named ivy child ${name} is present`).toBe(true);
    expect(ivyPart?.pixelBounds, `${label} ivy child ${name} has measured viewport bounds`).not.toBeNull();
    const bounds = ivyPart!.pixelBounds!;
    expect(bounds.left, `${label} ivy child ${name} stays in the left frame`).toBeGreaterThanOrEqual(0);
    expect(bounds.top, `${label} ivy child ${name} stays in the top frame`).toBeGreaterThanOrEqual(0);
    expect(bounds.right, `${label} ivy child ${name} stays in the right frame`).toBeLessThanOrEqual(viewport.width);
    expect(bounds.bottom, `${label} ivy child ${name} stays in the bottom frame`).toBeLessThanOrEqual(viewport.height);
  }

  if (measured.testPanelScale !== null) {
    for (let index = 1; index <= 7; index += 1) {
      expect(byName.get(`hex_panel_${index}`)?.worldScale?.[0]).toBeCloseTo(measured.testPanelScale, 4);
    }
    const proof = {
      label,
      screenshot: path.relative(evidenceRoot, screenshotPath),
      viewport,
      camera: measured.camera,
      testPanelScale: measured.testPanelScale,
      anchors: measured.anchors,
      lights: measured.lights,
      interpretation: "The temporary panel scale is a test-only source-liveness probe. This view is not final visual-quality evidence.",
    };
    fs.writeFileSync(path.join(measurementDir, `${label}-live-source-probe.json`), `${JSON.stringify(proof, null, 2)}\n`, "utf8");
    return proof;
  }

  if (viewport.width === 390 && viewport.height === 844) {
    expect(byName.get("ai-real-camera")!.pixelBounds!.width, "phone camera silhouette is large enough to inspect").toBeGreaterThanOrEqual(28);
    expect(byName.get("ai-real-camera")!.pixelBounds!.height, "phone camera silhouette is large enough to inspect").toBeGreaterThanOrEqual(20);
    expect(byName.get("peg_controller_body")!.pixelBounds!.width, "phone controller silhouette is large enough to inspect").toBeGreaterThanOrEqual(24);
    expect(byName.get("peg_controller_body")!.pixelBounds!.height, "phone controller silhouette is large enough to inspect").toBeGreaterThanOrEqual(18);
    expect(byName.get("controller-code-native")!.pixelBounds!.width, "phone controller controls remain individually visible").toBeGreaterThanOrEqual(18);
    expect(byName.get("controller-code-native")!.pixelBounds!.height, "phone controller controls remain individually visible").toBeGreaterThanOrEqual(10);
  }

  const occlusionNames = required;
  for (const name of occlusionNames) {
    const samples = byName.get(name)?.sampledRegionHits;
    expect(samples && samples.samples > 0, `${label} ${name} has screen-region occlusion samples`).toBe(true);
    if (rendererCamera.qualityTier !== "low") {
      expect(samples!.targetSurface, `${label} ${name} has direct surface intersections inside its projected bounds`).toBeGreaterThan(0);
    }
    expect(samples!.target, `${label} ${name} has visible surface samples`).toBeGreaterThan(0);
    expect(samples!.occluderRatio, `${label} ${name} has measurable chair/resident coverage`).not.toBeNull();
    expect(samples!.occluderRatio!, `${label} ${name} is not hidden by chair/resident`).toBeLessThanOrEqual(0.1);
  }

  const image = await sharp(screenshotPath).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const countColor = (
    anchorNames: string[],
    predicate: (r: number, g: number, b: number) => boolean,
    edgePadding = 0,
  ) => {
    let colored = 0;
    let sampled = 0;
    const regions: Array<{ name: string; left: number; top: number; right: number; bottom: number }> = [];
    for (const name of anchorNames) {
      const bounds = byName.get(name)?.pixelBounds;
      if (!bounds) continue;
      const left = Math.max(0, Math.floor(bounds.left - edgePadding));
      const top = Math.max(0, Math.floor(bounds.top - edgePadding));
      const right = Math.min(viewport.width, Math.ceil(bounds.right + edgePadding));
      const bottom = Math.min(viewport.height, Math.ceil(bounds.bottom + edgePadding));
      regions.push({ name, left, top, right, bottom });
      for (let y = top; y < bottom; y += 1) {
        for (let x = left; x < right; x += 1) {
          const offset = (y * image.info.width + x) * image.info.channels;
          const r = image.data[offset] ?? 0;
          const g = image.data[offset + 1] ?? 0;
          const b = image.data[offset + 2] ?? 0;
          sampled += 1;
          if (predicate(r, g, b)) colored += 1;
        }
      }
    }
    return { colored, sampled, ratio: sampled ? colored / sampled : 0, regions };
  };
  const lilacPixels = countColor(
    Array.from({ length: 7 }, (_, index) => `hex_panel_${index + 1}`),
    (r, g, b) => r > 65 && b > 65 && r > g * 1.12 && b > g * 1.08,
  );
  const warmPixels = countColor(
    ["lightbar_emissive"],
    (r, g, b) => r > 100 && g > 35 && r > g * 1.18 && g > b * 1.15,
    2,
  );
  const barMaterials = byName.get("lightbar_emissive")?.materials ?? [];
  const expectedHexMaterials = [
    { name: "Hex_LilacEmissive", color: "ec24d0", emissive: "ff35e6", emissiveIntensity: 1.65, panels: [1, 3, 5, 6] },
    { name: "Hex_VioletEmissive", color: "8e52e0", emissive: "9d64ff", emissiveIntensity: 1.55, panels: [2, 4, 7] },
  ];
  for (const expected of expectedHexMaterials) {
    for (const index of expected.panels) {
      const material = byName.get(`hex_panel_${index}`)?.materials?.find((entry) => entry.name === expected.name);
      expect(material, `${label} panel ${index} reports its named ${expected.name} material`).toBeDefined();
      expect(material?.color?.toLowerCase()).toBe(expected.color);
      expect(material?.emissive?.toLowerCase()).toBe(expected.emissive);
      expect(material?.emissiveIntensity).toBeCloseTo(expected.emissiveIntensity, 3);
    }
  }
  expect(lilacPixels.colored, `${label} rendered lilac/pink pixels are present in the seven panel bounds`).toBeGreaterThanOrEqual(viewport.width === 1440 ? 24 : 8);
  expect(barMaterials.some((material) => material.name === "Lightbar_WarmTask" && material.color?.toLowerCase() === "f08a18" && material.emissive?.toLowerCase() === "ff4b00" && material.emissiveIntensity === 0.9)).toBe(true);
  expect(warmPixels.colored, `${label} rendered warm pixels are present in the monitor bar bounds`).toBeGreaterThanOrEqual(viewport.width === 1440 ? 8 : 2);

  const expectedLights = [
    ["Light_CeilingAmbient", 0.12],
    ["Light_CyanFill", 1.65],
    ["Light_HexWall", 0.08],
    ["Light_TaskDownlight", 2.5],
  ] as const;
  for (const [name, intensity] of expectedLights) {
    const light = measured.lights.find((entry) => entry.name === name);
    expect(light?.found, `${label} live runtime light ${name} exists`).toBe(true);
    expect(light?.intensity, `${label} live runtime light ${name} uses the bounded calibration`).toBeCloseTo(intensity, 3);
  }

  const evidence = {
    label,
    screenshot: path.relative(evidenceRoot, screenshotPath),
    viewport,
    camera: measured.camera,
    testPanelScale: measured.testPanelScale,
    anchors: measured.anchors,
    lights: measured.lights,
    colorPixels: { lilac: lilacPixels, warmBar: warmPixels },
    interpretation: "Projected bounds and sampled ray hits measure framing and chair/resident occlusion; they do not replace the required human recognition review.",
  };
  fs.writeFileSync(path.join(measurementDir, `${label}-anchor-visibility.json`), `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  return evidence;
}

async function captureControlDomState(page: Page, label: string) {
  const state = await page.evaluate(() => ({
    url: window.location.href,
    stageCount: document.querySelectorAll('[data-testid="world-stage-container"]').length,
    staticFallbackCount: document.querySelectorAll('[data-testid="world-static-container"]').length,
    failureFallbackCount: document.querySelectorAll('[data-testid="world-failure-container"]').length,
    canvasCount: document.querySelectorAll('[data-testid="world-canvas"]').length,
    lifecycleState: document.querySelector<HTMLElement>('[data-testid="world-stage-container"]')?.dataset.lifecycleState ?? null,
    toggleCount: document.querySelectorAll('[data-testid="studio-controls-toggle"]').length,
    toggleExpanded: document.querySelector<HTMLElement>('[data-testid="studio-controls-toggle"]')?.getAttribute("aria-expanded") ?? null,
  }));
  fs.writeFileSync(path.join(measurementDir, `${label}-control-dom-state.json`), `${JSON.stringify(state, null, 2)}\n`, "utf8");
  return state;
}

async function clickControlsToggle(page: Page, label: string) {
  const before = await captureControlDomState(page, `${label}-before-toggle`);
  expect(before.stageCount, `${label} remains on the interactive world stage`).toBe(1);
  expect(before.staticFallbackCount, `${label} has not switched to static fallback`).toBe(0);
  expect(before.failureFallbackCount, `${label} has no runtime failure fallback`).toBe(0);
  try {
    await page.getByTestId("studio-controls-toggle").click();
  } catch (error) {
    const after = await captureControlDomState(page, `${label}-toggle-click-failure`);
    fs.writeFileSync(
      path.join(measurementDir, `${label}-toggle-click-error.txt`),
      `${String(error)}\n\nDOM immediately after the failed click:\n${JSON.stringify(after, null, 2)}\n`,
      "utf8",
    );
    throw error;
  }
}

async function assertCompactDrawerTargets(page: Page, viewport: ViewportSize, label: string) {
  const stage = page.getByTestId("world-stage-container");
  const toggle = page.getByTestId("studio-controls-toggle");
  await expect(stage).toHaveAttribute("data-lifecycle-state", "HOME");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  const chrome = await measureFixedChrome(page, viewport, label);
  expect(chrome.coveredRatio, `${label} closed chrome <= 20%`).toBeLessThanOrEqual(0.2);
  await clickControlsToggle(page, `${label}-open`);
  await expect(stage).toHaveAttribute("data-studio-controls-open", "true");
  await expect(page.getByTestId("quality-tier-select")).toBeFocused();
  const actions = await page.locator(actionSelector).evaluateAll((elements) => elements
    .map((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        visible: style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0,
        width: rect.width,
        height: rect.height,
      };
    })
    .filter((item) => item.visible));
  expect(actions, `${label} exposes all 26 visible actions`).toHaveLength(26);
  expect(actions.every((item) => item.width >= 44 && item.height >= 44), `${label} preserves 44px targets`).toBe(true);
  await clickControlsToggle(page, `${label}-close`);
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).toBeFocused();
}

test.describe("PRE-G7-13 reference composition and compact mobile controls", () => {
  test("captures the opening desktop room beside the user reference", async ({ page }) => {
    test.setTimeout(150_000);
    recordErrors(page, "desktop-composition");
    const viewport = { width: 1440, height: 900 };
    const { camera } = await enterHome(page, viewport);
    expect(camera).toBe("home-desktop");
    const capture = await captureAndCompose(page, "studio-reference-desktop-1440x900.png", viewport, "desktop-1440x900");
    if (evidenceMode) {
      await recordVisualAnchorEvidence(capture.capturedFrame, capture.actualPath, viewport, "desktop-1440x900");
    }
    expect(capture.renderMeasurement.distinctPixelColors, "desktop GLB frame is visibly rendered").toBeGreaterThan(16);
    const existingControlCount = await page.locator(
      '[data-testid="fullscreen-studio-dialog"] button, [data-testid="fullscreen-studio-dialog"] a[href], [data-testid="fullscreen-studio-dialog"] select',
    ).count();
    expect(existingControlCount - 1).toBe(25);
    const chrome = await measureFixedChrome(page, viewport, "desktop-1440x900");
    expect(chrome.coveredRatio, "closed desktop chrome leaves the room unobscured").toBeLessThanOrEqual(0.2);
  });

  test("captures the fresh phone-sized 390x844 room", async ({ page }) => {
    test.setTimeout(150_000);
    const viewport = { width: 390, height: 844 };
    await enterHome(page, viewport);
    const capture = await captureAndCompose(page, "studio-reference-mobile-390x844.png", viewport, "mobile-390x844");
    if (evidenceMode) {
      await recordVisualAnchorEvidence(capture.capturedFrame, capture.actualPath, viewport, "mobile-390x844");
    }
    expect(capture.renderMeasurement.distinctPixelColors, "mobile GLB frame is visibly rendered").toBeGreaterThan(16);
    await measureFixedChrome(page, viewport, "mobile-390x844");
  });

  test("starts compact and preserves every mobile action with Diagnostics-first Escape", async ({ page }) => {
    test.setTimeout(180_000);
    recordErrors(page, "mobile-drawer");
    const viewport = { width: 390, height: 844 };
    await enterHome(page, viewport);
    const toggle = page.getByTestId("studio-controls-toggle");
    const panel = page.locator("#studio-controls-panel");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    const diagnostics = page.getByTestId("diagnostics-toggle-btn");
    await toggle.click();
    await diagnostics.click();
    await expect(page.getByTestId("world-diagnostics")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("world-diagnostics")).toBeHidden();
    await expect(panel).toBeVisible();
    await expect(diagnostics).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(toggle).toBeFocused();

    await toggle.click();
    await expect(page.getByTestId("quality-tier-select")).toBeFocused();
    await page.emulateMedia({ reducedMotion: "reduce" });
    const reducedMotionDuration = await page.getByTestId("greet-resident-btn").evaluate((element) => getComputedStyle(element).transitionDuration);
    expect(reducedMotionDuration).toBe("0s");

    const actions = page.locator(actionSelector);
    const visibleActions = await actions.evaluateAll((elements) => elements
      .map((element, index) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        if (style.display === "none" || style.visibility === "hidden" || !rect.width || !rect.height) return null;
        return { index, testId: element.getAttribute("data-testid"), text: element.textContent?.trim() ?? "", width: rect.width, height: rect.height };
      })
      .filter((item) => item !== null));
    expect(visibleActions).toHaveLength(26);
    expect(visibleActions.every((item) => item.height >= 44 && item.width >= 44)).toBe(true);

    const reached = new Set<number>();
    for (let index = 0; index < visibleActions.length * 2; index += 1) {
      await page.keyboard.press("Tab");
      const focusedIndex = await page.evaluate((selector) =>
        Array.from(document.querySelectorAll(selector)).findIndex((element) => element === document.activeElement), actionSelector,
      );
      if (focusedIndex >= 0) reached.add(focusedIndex);
    }
    for (const action of visibleActions) expect(reached.has(action.index), `keyboard reaches action ${action.testId || action.text}`).toBe(true);

    for (const href of ["/projects", "/about", "/contact", "/resume"]) {
      await expect(page.locator('nav[aria-label="Portfolio destinations and studio exit"]').locator(`a[href="${href}"]`)).toHaveAttribute("href", href);
    }
    await expect(page.locator('nav[aria-label="Portfolio destinations and studio exit"]').getByRole("button", { name: "Exit Studio" })).toBeVisible();

    await toggle.click();
    await expect(toggle).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("fullscreen-studio-dialog")).toBeHidden();
    await expect(page.getByTestId("enter-studio-btn")).toBeFocused();

    const navigationPage = await page.context().newPage();
    await navigationPage.goto("/?studio=enter");
    await expect(navigationPage.getByTestId("fullscreen-studio-dialog")).toHaveAttribute("open", "", { timeout: 15_000 });
    await navigationPage.locator('nav[aria-label="Portfolio destinations and studio exit"]').getByRole("link", { name: "Projects", exact: true }).click();
    await expect(navigationPage).toHaveURL(/\/projects\/?$/);
    await navigationPage.close();
  });

  test("captures the required compact 320x600 room", async ({ page }) => {
    test.setTimeout(150_000);
    recordErrors(page, "compact-capture");
    const viewport = { width: 320, height: 600 };
    await enterHome(page, viewport);
    const capture = await captureAndCompose(page, "studio-reference-compact-320x600.png", viewport, "compact-320x600");
    if (evidenceMode) {
      await recordVisualAnchorEvidence(capture.capturedFrame, capture.actualPath, viewport, "compact-320x600");
    }
    expect(capture.renderMeasurement.distinctPixelColors, "compact GLB frame is visibly rendered").toBeGreaterThan(16);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
  });

  test("captures the exact short-landscape 844x390 room", async ({ page }) => {
    test.setTimeout(150_000);
    recordErrors(page, "landscape-capture");
    const viewport = { width: 844, height: 390 };
    await enterHome(page, viewport);
    const capture = await captureAndCompose(page, "studio-reference-landscape-844x390.png", viewport, "compact-landscape-844x390");
    if (evidenceMode) {
      await recordVisualAnchorEvidence(capture.capturedFrame, capture.actualPath, viewport, "compact-landscape-844x390");
    }
    expect(capture.renderMeasurement.distinctPixelColors, "short-landscape GLB frame is visibly rendered").toBeGreaterThan(16);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
  });

  test("keeps the compact 320x600 drawer and touch targets usable", async ({ page }) => {
    test.setTimeout(150_000);
    recordErrors(page, "compact-controls");
    const viewport = { width: 320, height: 600 };
    await enterHome(page, viewport);
    await assertCompactDrawerTargets(page, viewport, "compact-320x600");
  });

  test("keeps the short-landscape 844x390 drawer and touch targets usable", async ({ page }) => {
    test.setTimeout(150_000);
    recordErrors(page, "landscape-controls");
    const viewport = { width: 844, height: 390 };
    await enterHome(page, viewport);
    await assertCompactDrawerTargets(page, viewport, "landscape-844x390");
  });

  test("records all seven named panels in visible low-quality render batches", async ({ page }) => {
    test.setTimeout(180_000);
    recordErrors(page, "low-quality-batch");
    const viewport = { width: 1440, height: 900 };
    await enterHome(page, viewport);
    await clickControlsToggle(page, "low-quality-open");
    await page.getByTestId("quality-tier-select").selectOption("low");
    await expect.poll(async () => page.evaluate(() => {
      const probe = (window as Window & { __PRE_G7_13_RENDERER_CAMERA__?: () => { qualityTier: string } | null }).__PRE_G7_13_RENDERER_CAMERA__;
      return probe?.()?.qualityTier ?? null;
    }), { timeout: 45_000 }).toBe("low");
    await clickControlsToggle(page, "low-quality-close");
    const capture = await captureAndCompose(page, "studio-reference-low-quality-1440x900.png", viewport, "low-quality-1440x900");
    expect(capture.capturedFrame.snapshot?.rendererCamera?.qualityTier).toBe("low");
    if (evidenceMode) {
      await recordVisualAnchorEvidence(capture.capturedFrame, capture.actualPath, viewport, "low-quality-1440x900");
    }
  });
});
