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
const expectedEvidenceDir = process.env.PRE_G7_13_EXPECTED_EVIDENCE_DIR;
if (process.env.PRE_G7_13_REQUIRE_ISOLATED_EVIDENCE === "1") {
  if (!evidenceMode || !process.env.PRE_G7_13_EVIDENCE_DIR || !expectedEvidenceDir || evidenceRoot !== path.resolve(expectedEvidenceDir)) {
    throw new Error(`PRE-G7-13 isolated evidence env mismatch: mode=${process.env.PRE_G7_13_EVIDENCE_MODE ?? "<unset>"}, root=${evidenceRoot}, expected=${expectedEvidenceDir ?? "<unset>"}`);
  }
}
const testPanelScale = process.env.PRE_G7_13_TEST_PANEL_SCALE;
const runtimeBudgets = {
  desktop: { renderedTriangles: 300_000, renderCalls: 120 },
  mobile: { renderedTriangles: 140_000, renderCalls: 80 },
} as const;
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
fs.writeFileSync(path.join(evidenceRoot, "test-run-environment.json"), `${JSON.stringify({
  cwd: process.cwd(),
  evidenceMode,
  evidenceRoot,
  evidenceDirEnv: process.env.PRE_G7_13_EVIDENCE_DIR ?? null,
  expectedEvidenceDir: expectedEvidenceDir ?? null,
  testPanelScale: testPanelScale ?? null,
}, null, 2)}\n`, "utf8");

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

async function browserArtifactLabel(page: Page) {
  return page.evaluate(() => navigator.userAgent.includes("Edg/") ? "edge" : "chrome");
}

async function captureAndCompose(page: Page, filename: string, viewport: ViewportSize) {
  const actualPath = path.join(screenshotDir, filename);
  await page.screenshot({ path: actualPath, fullPage: false });
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
  return renderMeasurement;
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

async function recordBrowserEnvironment(page: Page, browserLabel: string) {
  const environment = await page.evaluate(() => {
    const diagnostics = (window as Window & {
      __PRE_G7_13_REFERENCE_DIAGNOSTICS__?: { latest: ProjectedSnapshot; refresh: (probePixel?: [number, number] | null) => ProjectedSnapshot };
    }).__PRE_G7_13_REFERENCE_DIAGNOSTICS__;
    const firstComposition = diagnostics?.refresh() ?? diagnostics?.latest ?? null;
    const repeatedComposition = diagnostics?.refresh() ?? null;
    const initialCameraAnchor = firstComposition?.anchors.find((anchor) => anchor.name === "ai-real-camera");
    const summarizeCamera = (snapshot: ProjectedSnapshot | null) => {
      const cameraAnchor = snapshot?.anchors.find((anchor) => anchor.name === "ai-real-camera");
      return snapshot && cameraAnchor ? {
        camera: snapshot.camera,
        worldBounds: cameraAnchor.worldBounds ?? null,
        pixelBounds: cameraAnchor.pixelBounds ?? null,
        sampledRegionHits: cameraAnchor.sampledRegionHits ?? null,
      } : null;
    };
    const canvas = document.querySelector<HTMLCanvasElement>("[data-testid='world-canvas']");
    const gl = canvas?.getContext("webgl2") ?? canvas?.getContext("webgl");
    const debugInfo = gl?.getExtension("WEBGL_debug_renderer_info") as
      | { UNMASKED_VENDOR_WEBGL: number; UNMASKED_RENDERER_WEBGL: number }
      | null;
    return {
      browser: "Playwright-managed Chromium; emulated viewport, not a physical mobile device",
      pageUrl: window.location.href,
      pageOrigin: window.location.origin,
      loadedNextChunks: performance.getEntriesByType("resource")
        .map((entry) => entry.name)
        .filter((name) => name.includes("/_next/static/chunks/")),
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      devicePixelRatio: window.devicePixelRatio,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      webgl: gl ? {
        version: gl.getParameter(gl.VERSION),
        vendor: gl.getParameter(gl.VENDOR),
        renderer: gl.getParameter(gl.RENDERER),
        unmaskedVendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : null,
        unmaskedRenderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : null,
        contextLost: gl.isContextLost(),
      } : null,
      cameraProbePixel: initialCameraAnchor?.sampledRegionHits?.rayTrace?.firstTargetPixel ?? null,
      referenceComposition: firstComposition,
      referenceCompositionImmediateRepeat: summarizeCamera(repeatedComposition),
    };
  });
  const evidenceRecord = {
    configuredPort: process.env.PORT ?? "3133 (default)",
    ...environment,
  };
  fs.writeFileSync(
    path.join(measurementDir, `browser-environment-${environment.viewport.width}x${environment.viewport.height}-${browserLabel}.json`),
    `${JSON.stringify(evidenceRecord, null, 2)}\n`,
    "utf8",
  );
  expect(environment.webgl, "the focused browser run has a WebGL context").not.toBeNull();
  expect(environment.webgl?.contextLost).toBe(false);
  if (evidenceMode) {
    expect(environment.pageOrigin).toBe(`http://127.0.0.1:${process.env.PORT ?? "3133"}`);
    expect(environment.loadedNextChunks.some((name) => name.includes("/_next/static/chunks/"))).toBe(true);
    expect(environment.referenceComposition).not.toBeNull();
    expect(environment.cameraProbePixel, "the initial camera surface rays provide a repeatable screen sample").not.toBeNull();
  }
  return evidenceRecord;
}

type ProjectedAnchor = {
  name: string;
  found: boolean;
  worldPosition?: number[];
  worldScale?: number[];
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
  runtimeGeometry?: { sides: number; width: number; height: number; depth: number } | null;
  sampledRegionHits?: {
    samples: number;
    targetSamples: number;
    target: number;
    chair: number;
    resident: number;
    other: number;
    occluderRatio: number | null;
    rayTrace?: {
      targetRootUuid: string;
      targetRaySamples: number;
      firstHitLineages: Record<string, number>;
      firstTargetPixel: [number, number] | null;
      cameraProbe: Record<string, unknown> | null;
    };
  } | null;
  worldBounds?: { min: number[]; max: number[] } | null;
};

type ProjectedSnapshot = {
  viewport: { width: number; height: number };
  camera: { preset: string; position: number[]; target: number[]; fov: number; aspect: number; source: "camera-director" | "preset-fallback" };
  testPanelScale: number | null;
  anchors: ProjectedAnchor[];
  lights: Array<{
    name: string;
    found: boolean;
    type?: string;
    color?: string;
    intensity?: number;
    position?: number[];
    distance?: number | null;
    decay?: number | null;
  }>;
  supportContacts: {
    console: {
      surfaceNode: string;
      surfaceTopY: number;
      baseBottomY: number;
      contactDeltaY: number;
      baseBounds: { min: number[]; max: number[] };
      surfaceBounds: { min: number[]; max: number[] };
      baseFootprintWithinSurface: boolean;
      microphoneBounds: { min: number[]; max: number[] } | null;
      horizontalGapToMicrophoneMeters: number;
    } | null;
    shelfCamera: {
      surfaceNode: string;
      surfaceTopY: number;
      verticalToleranceMeters: number;
      footprintMarginMeters: number;
      feet: Array<{
        name: string;
        contactDeltaY: number;
        insideFootprintWithMargin: boolean;
      }>;
      allFeetSupported: boolean;
    } | null;
  };
};

async function recordVisualAnchorEvidence(
  page: Page,
  screenshotPath: string,
  viewport: ViewportSize,
  label: string,
  probePixel: [number, number] | null,
) {
  const capture = await page.evaluate((fixedProbePixel) => {
    const diagnostics = (window as Window & {
      __PRE_G7_13_REFERENCE_DIAGNOSTICS__?: {
        latest: ProjectedSnapshot;
        refresh: (probePixel?: [number, number] | null) => ProjectedSnapshot;
      };
    }).__PRE_G7_13_REFERENCE_DIAGNOSTICS__;
    const snapshot = diagnostics?.refresh(fixedProbePixel) ?? null;
    const repeated = diagnostics?.refresh(fixedProbePixel) ?? null;
    const cameraAnchor = repeated?.anchors.find((anchor) => anchor.name === "ai-real-camera");
    const canvas = document.querySelector<HTMLCanvasElement>("[data-testid='world-canvas']");
    const gl = canvas?.getContext("webgl2") ?? canvas?.getContext("webgl");
    return {
      snapshot,
      probePixel: fixedProbePixel,
      webglState: {
        canvasConnected: canvas?.isConnected ?? false,
        canvasSize: canvas ? { width: canvas.width, height: canvas.height } : null,
        contextAvailable: Boolean(gl),
        contextLost: gl?.isContextLost() ?? null,
        contextAttributes: gl?.getContextAttributes() ?? null,
        version: gl ? gl.getParameter(gl.VERSION) : null,
      },
      immediateRepeat: repeated && cameraAnchor ? {
        camera: repeated.camera,
        worldBounds: cameraAnchor.worldBounds ?? null,
        pixelBounds: cameraAnchor.pixelBounds ?? null,
        sampledRegionHits: cameraAnchor.sampledRegionHits ?? null,
      } : null,
    };
  }, probePixel);
  const snapshot = capture?.snapshot ?? null;
  expect(snapshot, `${label} captured diagnostics from the live scene`).not.toBeNull();
  const measured = snapshot as ProjectedSnapshot;
  fs.mkdirSync(measurementDir, { recursive: true });
  fs.writeFileSync(
    path.join(measurementDir, `${label}-projected-anchor-snapshot.json`),
    `${JSON.stringify({
      label,
      screenshot: path.relative(evidenceRoot, screenshotPath),
      probePixel: capture?.probePixel ?? null,
      webglState: capture?.webglState ?? null,
      ...measured,
      immediateRepeat: capture?.immediateRepeat ?? null,
    }, null, 2)}\n`,
    "utf8",
  );
  expect(measured.viewport).toEqual(viewport);
  expect(measured.camera.source, `${label} projection uses the active CameraDirector pose`).toBe("camera-director");
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
    "headset-stand-code-native",
    "headset-code-native",
    "desk",
  ];
  const byName = new Map(measured.anchors.map((anchor) => [anchor.name, anchor]));
  const consoleSupport = measured.supportContacts.console;
  expect(consoleSupport, `${label} console support placement is measured from the live scene`).not.toBeNull();
  expect(consoleSupport!.surfaceNode).toBe("desk_top");
  expect(Math.abs(consoleSupport!.contactDeltaY), `${label} audio console base contacts the actual desktop within 1mm`).toBeLessThanOrEqual(0.001);
  expect(consoleSupport!.baseFootprintWithinSurface, `${label} audio console footprint stays on the tabletop`).toBe(true);
  expect(consoleSupport!.microphoneBounds, `${label} microphone is measured beside the console`).not.toBeNull();
  expect(consoleSupport!.horizontalGapToMicrophoneMeters, `${label} console remains adjacent to the microphone`).toBeLessThanOrEqual(0.5);
  const cameraSupport = measured.supportContacts.shelfCamera;
  expect(cameraSupport, `${label} shelf camera support placement is measured from the live scene`).not.toBeNull();
  expect(cameraSupport!.surfaceNode).toBe("shelf_rear_upper");
  expect(cameraSupport!.allFeetSupported, `${label} all named shelf-camera feet contact the shelf within footprint margins`).toBe(true);
  expect(cameraSupport!.feet).toHaveLength(3);
  for (const foot of cameraSupport!.feet) {
    expect(Math.abs(foot.contactDeltaY), `${label} ${foot.name} contacts shelf within 1mm`).toBeLessThanOrEqual(0.001);
    expect(foot.insideFootprintWithMargin, `${label} ${foot.name} footprint has at least 5mm shelf edge margin`).toBe(true);
  }
  const pc = byName.get("helios-pc");
  const headsetStand = byName.get("headset-stand-code-native");
  expect(pc?.worldBounds && headsetStand?.worldBounds, `${label} headset stand and PC support bounds are recorded`).toBeTruthy();
  const headsetSupportDelta = headsetStand!.worldBounds!.min[1]! - pc!.worldBounds!.max[1]!;
  expect(Math.abs(headsetSupportDelta), `${label} headset stand base rests on the existing PC within 1mm`).toBeLessThanOrEqual(0.001);
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
  for (const name of ["chair-root", "chair-base", "resident"]) {
    const actor = byName.get(name);
    expect(actor?.found, `${label} named ${name} is present for occlusion measurements`).toBe(true);
    expect(actor?.pixelBounds, `${label} ${name} has measurable bounds`).not.toBeNull();
    expect(actor!.pixelBounds!.left, `${label} ${name} stays inside the left edge`).toBeGreaterThanOrEqual(0);
    expect(actor!.pixelBounds!.top, `${label} ${name} stays inside the top edge`).toBeGreaterThanOrEqual(0);
    expect(actor!.pixelBounds!.right, `${label} ${name} stays inside the right edge`).toBeLessThanOrEqual(viewport.width);
    expect(actor!.pixelBounds!.bottom, `${label} ${name} stays inside the bottom edge`).toBeLessThanOrEqual(viewport.height);
    expect(actor!.pixelBounds!.visibleAreaRatio, `${label} ${name} remains fully within the projected viewport`).toBeGreaterThanOrEqual(0.98);
  }

  const panelBounds = Array.from({ length: 7 }, (_, index) => byName.get(`hex_panel_${index + 1}`)!.pixelBounds!);
  const hexCluster = panelBounds.reduce((bounds, panel) => ({
    left: Math.min(bounds.left, panel.left),
    right: Math.max(bounds.right, panel.right),
    top: Math.min(bounds.top, panel.top),
    bottom: Math.max(bounds.bottom, panel.bottom),
  }), { left: Number.POSITIVE_INFINITY, right: Number.NEGATIVE_INFINITY, top: Number.POSITIVE_INFINITY, bottom: Number.NEGATIVE_INFINITY });
  for (let first = 0; first < panelBounds.length; first += 1) {
    for (let second = first + 1; second < panelBounds.length; second += 1) {
      const a = panelBounds[first]!;
      const b = panelBounds[second]!;
      const overlapWidth = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
      const overlapHeight = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
      expect(overlapWidth * overlapHeight, `${label} hex panels ${first + 1} and ${second + 1} have separate projected panels`).toBeLessThanOrEqual(1);
    }
  }
  const leftSpeaker = byName.get("speaker_left_cabinet")!;
  const rightSpeaker = byName.get("speaker_right_cabinet")!;
  const minimumSpeakerPixels = viewport.width >= 1200 ? 24 : viewport.width === 390 ? 16 : 12;
  expect(leftSpeaker.worldPosition?.[1], `${label} left round speaker shares the matched desk height`).toBeCloseTo(rightSpeaker.worldPosition?.[1] ?? Number.NaN, 4);
  expect(leftSpeaker.worldPosition?.[2], `${label} left round speaker shares the front desk depth`).toBeCloseTo(rightSpeaker.worldPosition?.[2] ?? Number.NaN, 4);
  expect(leftSpeaker.pixelBounds!.width, `${label} left speaker has a rendered desktop-scale silhouette`).toBeGreaterThanOrEqual(minimumSpeakerPixels);
  expect(rightSpeaker.pixelBounds!.width, `${label} right speaker has a rendered desktop-scale silhouette`).toBeGreaterThanOrEqual(minimumSpeakerPixels);
  expect(leftSpeaker.pixelBounds!.height, `${label} left speaker shows its paired round-driver assembly`).toBeGreaterThanOrEqual(minimumSpeakerPixels);
  expect(rightSpeaker.pixelBounds!.height, `${label} right speaker shows its paired round-driver assembly`).toBeGreaterThanOrEqual(minimumSpeakerPixels);

  if (viewport.width === 1440 && viewport.height === 900) {
    expect(byName.get("monitor")!.pixelBounds!.width, `${label} monitor is at least 28% of desktop width`).toBeGreaterThanOrEqual(403);
    expect(hexCluster.right - hexCluster.left, `${label} distinct hex cluster is at least 25% of desktop width`).toBeGreaterThanOrEqual(360);
    expect(byName.get("desk")!.pixelBounds!.width, `${label} desk remains at least 55% of desktop width`).toBeGreaterThanOrEqual(792);
  }
  if (viewport.width === 390 && viewport.height === 844) {
    expect(byName.get("monitor")!.pixelBounds!.width, `${label} monitor is at least 40% of phone width`).toBeGreaterThanOrEqual(156);
    expect(hexCluster.right - hexCluster.left, `${label} seven-panel cluster is recognizable across the phone viewport`).toBeGreaterThanOrEqual(115);
    expect(byName.get("ai-real-camera")!.pixelBounds!.width, `${label} shelf camera silhouette is large enough to inspect`).toBeGreaterThanOrEqual(28);
    expect(byName.get("peg_controller_body")!.pixelBounds!.width, `${label} controller silhouette is large enough to inspect`).toBeGreaterThanOrEqual(24);
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
  }

  const occlusionNames = [
    "ai-real-camera", "plants", "monitor", "speaker_left_cabinet", "speaker_right_cabinet",
    "talks-microphone", "console-code-native", "helios-pc", "peg_controller_body",
    "headset-stand-code-native", "headset-code-native",
  ];
  for (const name of occlusionNames) {
    const samples = byName.get(name)?.sampledRegionHits;
    expect(samples && samples.samples > 0, `${label} ${name} has screen-region occlusion samples`).toBe(true);
    expect(samples!.target, `${label} ${name} has visible surface samples`).toBeGreaterThan(0);
    expect(samples!.occluderRatio, `${label} ${name} has measurable chair/resident coverage`).not.toBeNull();
    expect(samples!.occluderRatio!, `${label} ${name} is not hidden by chair/resident`).toBeLessThanOrEqual(0.1);
  }
  const occlusionEvidence = [...required, "chair-root", "chair-base", "resident"].map((name) => {
    const anchor = byName.get(name);
    const samples = anchor?.sampledRegionHits;
    if (["chair-root", "chair-base", "resident"].includes(name)) {
      return { name, status: "NOT_APPLICABLE", reason: "This named anchor is itself part of the chair/resident occluder set.", pixelBounds: anchor?.pixelBounds ?? null };
    }
    return samples
      ? { name, status: "MEASURED", method: "13x13 projected-anchor ray grid", chairHits: samples.chair, residentHits: samples.resident, targetSamples: samples.targetSamples, occluderRatio: samples.occluderRatio, pixelBounds: anchor?.pixelBounds ?? null }
      : { name, status: "NOT_MEASURED", reason: "The frozen SceneIntegrator evidence sampler does not ray-sample this anchor; preserve null rather than infer occlusion from its AABB.", pixelBounds: anchor?.pixelBounds ?? null };
  });

  const image = await sharp(screenshotPath).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const countColor = (anchorNames: string[], predicate: (r: number, g: number, b: number) => boolean) => {
    let colored = 0;
    let sampled = 0;
    for (const name of anchorNames) {
      const bounds = byName.get(name)?.pixelBounds;
      if (!bounds) continue;
      const left = Math.max(0, Math.floor(bounds.left));
      const top = Math.max(0, Math.floor(bounds.top));
      const right = Math.min(viewport.width, Math.ceil(bounds.right));
      const bottom = Math.min(viewport.height, Math.ceil(bounds.bottom));
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
    return { colored, sampled, ratio: sampled ? colored / sampled : 0 };
  };
  const lilacPixels = countColor(
    Array.from({ length: 7 }, (_, index) => `hex_panel_${index + 1}`),
    (r, g, b) => r > 65 && b > 65 && r > g * 1.12 && b > g * 1.08,
  );
  const lilacPanelEvidence = Array.from({ length: 7 }, (_, index) => {
    const name = `hex_panel_${index + 1}`;
    const anchor = byName.get(name)!;
    const bounds = anchor.pixelBounds!;
    return {
      name,
      bounds,
      runtimeGeometry: anchor.runtimeGeometry,
      coloredPixels: countColor([name], (r, g, b) => r > 65 && b > 65 && r > g * 1.12 && b > g * 1.08).colored,
    };
  });
  const warmPixels = countColor(["lightbar_emissive"], (r, g, b) => r > 100 && g > 35 && r > g * 1.18 && g > b * 1.15);
  const floorRegion = viewport.width === 1440
    ? { name: "desktop-foreground-cyan-floor", left: Math.round(viewport.width * 0.45), top: Math.round(viewport.height * 0.82), width: Math.round(viewport.width * 0.1), height: Math.round(viewport.height * 0.1) }
    : viewport.width === 844
      ? { name: "landscape-floor-classifier-sample", left: Math.round(viewport.width * 0.85), top: Math.round(viewport.height * 0.62), width: Math.round(viewport.width * 0.1), height: Math.round(viewport.height * 0.1) }
      : { name: "portrait-underdesk-cyan-floor", left: Math.round(viewport.width * 0.45), top: Math.round(viewport.height * 0.64), width: Math.round(viewport.width * 0.1), height: Math.round(viewport.height * 0.1) };
  const floorRegions = [floorRegion];
  const floorFillPixels = floorRegions.map((region) => {
    const left = Math.max(0, region.left);
    const top = Math.max(0, region.top);
    const right = Math.min(viewport.width, region.left + region.width);
    const bottom = Math.min(viewport.height, region.top + region.height);
    let red = 0;
    let green = 0;
    let blue = 0;
    let cyan = 0;
    let sampled = 0;
    for (let y = top; y < bottom; y += 1) {
      for (let x = left; x < right; x += 1) {
        const offset = (y * image.info.width + x) * image.info.channels;
        const r = image.data[offset] ?? 0;
        const g = image.data[offset + 1] ?? 0;
        const b = image.data[offset + 2] ?? 0;
        red += r;
        green += g;
        blue += b;
        sampled += 1;
        if (g - r >= 8 && b - r >= 14 && g >= 40 && b >= 45) cyan += 1;
      }
    }
    return {
      name: region.name,
      bounds: { left, top, right, bottom },
      sampled,
      meanRGB: sampled ? [red / sampled, green / sampled, blue / sampled].map((value) => Number(value.toFixed(2))) : null,
      cyanPixels: cyan,
      cyanRatio: sampled ? Number((cyan / sampled).toFixed(5)) : 0,
      classifier: "G-R >= 8, B-R >= 14, G >= 40, B >= 45",
    };
  });
  const minimumFloorCyanRatio = 0.1;
  const overlapsBounds = (
    a: { left: number; top: number; right: number; bottom: number },
    b: { left: number; top: number; right: number; bottom: number },
  ) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  const actorBounds = ["chair-root", "resident"].map((name) => ({
    name,
    bounds: byName.get(name)?.pixelBounds,
  }));
  for (const actor of actorBounds) {
    expect(actor.bounds, `${label} ${actor.name} bounds are available to exclude actor pixels from floor evidence`).not.toBeNull();
  }
  const exposedFloorRegions = floorFillPixels.filter((region) => actorBounds.every((actor) =>
    !overlapsBounds(region.bounds, actor.bounds!),
  ));
  expect(exposedFloorRegions.length, `${label} floor-color ROI is outside chair/resident projected bounds`).toBeGreaterThan(0);
  const floorClassifierApplies = !(viewport.width === 844 && viewport.height === 390);
  if (floorClassifierApplies) {
    expect(exposedFloorRegions[0]!.cyanRatio, `${label} has cyan fill in the measured floor ROI outside chair/resident bounds`).toBeGreaterThanOrEqual(minimumFloorCyanRatio);
  }
  const paleSurfaceRegions = viewport.height > viewport.width
    ? [{ name: "portrait-workstation-left-tabletop", left: Math.round(viewport.width * 0.12), top: Math.round(viewport.height * 0.51), width: Math.round(viewport.width * 0.18), height: Math.max(1, Math.round(viewport.height * 0.04)) }]
    : [{ name: "landscape-workstation-left-tabletop", left: Math.round(viewport.width * 0.35), top: Math.round(viewport.height * 0.5), width: Math.round(viewport.width * 0.14), height: Math.max(1, Math.round(viewport.height * 0.08)) }];
  const paleSurfacePixels = paleSurfaceRegions.map((region) => {
    let red = 0;
    let green = 0;
    let blue = 0;
    let pale = 0;
    let sampled = 0;
    for (let y = region.top; y < Math.min(viewport.height, region.top + region.height); y += 1) {
      for (let x = region.left; x < Math.min(viewport.width, region.left + region.width); x += 1) {
        const offset = (y * image.info.width + x) * image.info.channels;
        const r = image.data[offset] ?? 0;
        const g = image.data[offset + 1] ?? 0;
        const b = image.data[offset + 2] ?? 0;
        red += r;
        green += g;
        blue += b;
        sampled += 1;
        if (r >= 190 && g >= 190 && b >= 190) pale += 1;
      }
    }
    return {
      name: region.name,
      bounds: region,
      sampled,
      meanRGB: sampled ? [red / sampled, green / sampled, blue / sampled].map((value) => Number(value.toFixed(2))) : null,
      brightNeutralPixels: pale,
      brightNeutralRatio: sampled ? Number((pale / sampled).toFixed(5)) : 0,
      classifier: "R, G, B >= 190",
    };
  });
  const cyanFillLight = measured.lights.find((light) => light.name === "Light_CyanFill");
  expect(cyanFillLight?.found, `${label} records the existing cyan point light`).toBe(true);
  expect(cyanFillLight?.type, `${label} preserves the source point-light type`).toBe("PointLight");
  expect(cyanFillLight?.intensity, `${label} records the bounded runtime cyan-light intensity`).toBe(1.6);
  expect(cyanFillLight?.position, `${label} records the calibrated world position of the cyan light`).toEqual([0, 0.15, -0.45]);
  const lilacMaterials = Array.from({ length: 7 }, (_, index) => byName.get(`hex_panel_${index + 1}`)?.materials ?? []).flat();
  const barMaterials = byName.get("lightbar_emissive")?.materials ?? [];
  expect(lilacMaterials.some((material) => material.name === "Hex_LilacEmissive" && (material.emissiveIntensity ?? 0) >= 1)).toBe(true);
  expect(lilacPixels.colored, `${label} rendered lilac/pink pixels are present in the seven panel bounds`).toBeGreaterThanOrEqual(viewport.width === 1440 ? 24 : 8);
  for (const panel of lilacPanelEvidence) {
    expect(panel.runtimeGeometry?.sides, `${label} ${panel.name} retains its named live six-sided replacement geometry`).toBe(6);
    expect(panel.runtimeGeometry?.width, `${label} ${panel.name} geometry stays within the authorized width`).toBeLessThanOrEqual(0.22);
    expect(panel.runtimeGeometry?.height, `${label} ${panel.name} geometry stays within the authorized height`).toBeLessThanOrEqual(0.2);
    expect(panel.runtimeGeometry?.depth, `${label} ${panel.name} geometry stays within the authorized depth`).toBeLessThanOrEqual(0.015);
    expect(panel.coloredPixels, `${label} ${panel.name} contributes actual pink/lilac pixels`).toBeGreaterThan(0);
  }
  expect(barMaterials.some((material) => material.name === "Lightbar_WarmTask" && material.color?.toLowerCase().startsWith("ff"))).toBe(true);
  expect(warmPixels.colored, `${label} rendered warm pixels are present in the monitor bar bounds`).toBeGreaterThanOrEqual(viewport.width === 1440 ? 8 : 2);

  const evidence = {
    label,
    screenshot: path.relative(evidenceRoot, screenshotPath),
    viewport,
    camera: measured.camera,
    supports: { headsetStandOnPc: { surfaceNode: "helios-pc", contactDeltaY: headsetSupportDelta } },
    speakerAssembly: {
      frozenGlbSha256: "3a02647d24e474c8a2579b0d277cf02a7841212e961c1554f67b6e032e40a307",
      roots: [leftSpeaker, rightSpeaker].map((speaker) => ({
        name: speaker.name,
        worldPosition: speaker.worldPosition,
        worldBounds: speaker.worldBounds,
        pixelBounds: speaker.pixelBounds,
        materials: speaker.materials,
      })),
      existingRoundDriverNodes: {
        left: ["speaker_left_woofer", "speaker_left_tweeter"],
        right: ["speaker_right_woofer", "speaker_right_tweeter"],
      },
      newDriverGeometry: 0,
      newDriverMaterials: 0,
      additionalDrawCalls: 0,
      additionalTriangles: 0,
      interpretation: "The frozen GLB already contains the round driver meshes. Runtime composition reparents those existing meshes under their matching interaction roots and adds no speaker geometry or materials.",
    },
    testPanelScale: measured.testPanelScale,
    anchors: measured.anchors,
    occlusionEvidence,
    occlusionCoverage: {
      requiredNamedAnchors: required.length,
      raySampled: occlusionEvidence.filter((item) => item.status === "MEASURED").length,
      notMeasured: occlusionEvidence.filter((item) => item.status === "NOT_MEASURED").map((item) => item.name),
      notApplicableSelfOccluders: occlusionEvidence.filter((item) => item.status === "NOT_APPLICABLE").map((item) => item.name),
    },
    lights: measured.lights,
    colorPixels: {
      lilac: lilacPixels,
      lilacPanels: lilacPanelEvidence,
      warmBar: warmPixels,
      floorFill: floorFillPixels,
      floorFillThreshold: {
        minimumCyanRatio: minimumFloorCyanRatio,
        status: floorClassifierApplies ? "APPLICABLE" : "NOT APPLICABLE; landscape raw frame retained for human review",
        region: viewport.width === 1440
          ? "10% by 10% clear foreground-floor tile at x=45%, y=82%, below the desk apron and above fixed studio actions"
          : viewport.width === 844
            ? "10% by 10% clear floor sample at x=85%, y=62%; current landscape HUD can hide or color-shift saturated floor pixels, so no automated cyan threshold is applied"
            : "10% by 10% underdesk scene tile at x=45%, y=64%",
      },
      paleWorkstation: paleSurfacePixels,
    },
    interpretation: "Projected bounds and the frozen ray sampler provide framing and partial chair/resident occlusion measurements. Uninstrumented anchors remain explicitly NOT_MEASURED; the source packet does not authorize changing SceneIntegrator.ts. This does not replace human recognition review.",
  };
  fs.writeFileSync(path.join(measurementDir, `${label}-anchor-visibility.json`), `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  return evidence;
}

async function recordRuntimeSceneState(page: Page, label: string) {
  const toggle = page.getByTestId("studio-controls-toggle");
  const wasOpen = await toggle.getAttribute("aria-expanded") === "true";
  if (!wasOpen) await toggle.click();
  const diagnosticsToggle = page.getByTestId("diagnostics-toggle-btn");
  await diagnosticsToggle.click();
  const diagnostics = page.getByTestId("world-diagnostics");
  await expect(diagnostics).toBeVisible();
  const runtime = JSON.parse((await diagnostics.textContent()) || "{}");
  const canvas = await page.evaluate(() => {
    const element = document.querySelector<HTMLCanvasElement>("[data-testid='world-canvas']");
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    const gl = element.getContext("webgl2") ?? element.getContext("webgl");
    return {
      width: element.width,
      height: element.height,
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      computed: { display: getComputedStyle(element).display, visibility: getComputedStyle(element).visibility },
      gl: gl ? { version: gl.getParameter(gl.VERSION), contextLost: gl.isContextLost() } : null,
      runtimeCamera: element.dataset.preG713RuntimeCamera ? JSON.parse(element.dataset.preG713RuntimeCamera) : null,
    };
  });
  if (evidenceMode) expect(canvas?.runtimeCamera, `${label} records the CameraDirector position and target`).not.toBeNull();
  const viewport = page.viewportSize();
  const mobileBudget = (viewport?.width ?? 0) < 900;
  const budget = mobileBudget ? runtimeBudgets.mobile : runtimeBudgets.desktop;
  const actual = {
    renderedTriangles: typeof runtime.renderedTriangles === "number" ? runtime.renderedTriangles : null,
    renderCalls: typeof runtime.renderCalls === "number" ? runtime.renderCalls : null,
    renderPixelRatio: typeof runtime.renderPixelRatio === "number" ? runtime.renderPixelRatio : null,
    qualityTier: typeof runtime.qualityTier === "string" ? runtime.qualityTier : null,
  };
  const withinBudget = {
    renderedTriangles: actual.renderedTriangles !== null && actual.renderedTriangles <= budget.renderedTriangles,
    renderCalls: actual.renderCalls !== null && actual.renderCalls <= budget.renderCalls,
  };
  const record = {
    label,
    viewport,
    canvas,
    runtime: actual,
    runtimeSnapshot: runtime,
    budget: { deviceClass: mobileBudget ? "mobile-emulated" : "desktop-browser", ...budget },
    budgetAssessment: {
      status: Object.values(withinBudget).every(Boolean) ? "PASS" : "FAIL",
      withinBudget,
      limitation: "Playwright viewport emulation records renderer diagnostics; it does not establish physical-device performance or thermal behavior.",
    },
  };
  fs.writeFileSync(path.join(measurementDir, `${label}-runtime-scene.json`), `${JSON.stringify(record, null, 2)}\n`, "utf8");
  await diagnosticsToggle.click();
  if (!wasOpen) await toggle.click();
}

test.describe("PRE-G7-22 reference composition and compact mobile controls", () => {
  test("captures the opening desktop room beside the user reference", async ({ page }) => {
    test.setTimeout(150_000);
    recordErrors(page, "desktop-composition");
    const viewport = { width: 1440, height: 900 };
    const { camera } = await enterHome(page, viewport);
    expect(camera).toBe("home-desktop");
    const browser = await browserArtifactLabel(page);
    const browserEnvironment = await recordBrowserEnvironment(page, browser);
    const cameraProbePixel = browserEnvironment.cameraProbePixel as [number, number] | null;
    await recordRuntimeSceneState(page, `desktop-1440x900-${browser}`);

    const existingControlCount = await page.locator(
      '[data-testid="fullscreen-studio-dialog"] button, [data-testid="fullscreen-studio-dialog"] a[href], [data-testid="fullscreen-studio-dialog"] select',
    ).count();
    expect(existingControlCount - 1).toBe(25);
    const screenshotName = `studio-reference-desktop-1440x900-${browser}.png`;
    const renderMeasurement = await captureAndCompose(page, screenshotName, viewport);
    if (evidenceMode) {
      await recordVisualAnchorEvidence(
        page,
        path.join(screenshotDir, screenshotName),
        viewport,
        `desktop-1440x900-${browser}`,
        cameraProbePixel,
      );
    }
    expect(renderMeasurement.distinctPixelColors, "desktop GLB frame is visibly rendered").toBeGreaterThan(16);
    const chrome = await measureFixedChrome(page, viewport, `desktop-1440x900-${browser}`);
    expect(chrome.coveredRatio, "closed desktop chrome leaves the room unobscured").toBeLessThanOrEqual(0.2);

    const toggle = page.getByTestId("studio-controls-toggle");
    const diagnostics = page.getByTestId("diagnostics-toggle-btn");
    await toggle.click();
    await diagnostics.click();
    await expect(page.getByTestId("world-diagnostics")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("world-diagnostics")).toBeHidden();
    await expect(diagnostics).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(toggle).toBeFocused();

    // Click the center of the visible camera mesh using the build-gated
    // source-bound projection; a fixed screen coordinate becomes stale when
    // the permitted home-camera framing changes.
    const cameraClick = await page.evaluate(() => {
      const diagnosticWindow = window as Window & {
        __PRE_G7_13_REFERENCE_DIAGNOSTICS__?: {
          refresh: (probePixel?: [number, number] | null) => { anchors: Array<{
            name: string;
            pixelBounds?: { left: number; top: number; width: number; height: number } | null;
            sampledRegionHits?: { rayTrace?: { firstTargetPixel?: [number, number] | null } | null } | null;
          }> };
        };
      };
      const snapshot = diagnosticWindow.__PRE_G7_13_REFERENCE_DIAGNOSTICS__?.refresh();
      const camera = snapshot?.anchors.find((anchor) => anchor.name === "ai-real-camera");
      const bounds = camera?.pixelBounds;
      const targetPixel = camera?.sampledRegionHits?.rayTrace?.firstTargetPixel;
      const insideBounds = Boolean(bounds && targetPixel &&
        targetPixel[0] >= bounds.left && targetPixel[0] <= bounds.left + bounds.width &&
        targetPixel[1] >= bounds.top && targetPixel[1] <= bounds.top + bounds.height);
      return insideBounds && targetPixel ? { x: targetPixel[0], y: targetPixel[1], insideBounds } : null;
    });
    expect(cameraClick, "ray-verified visible shelf-camera surface lies inside its projected bounds").not.toBeNull();
    expect(cameraClick!.insideBounds, "shelf-camera click uses a projected pixel with a real target-mesh ray hit").toBe(true);
    await page.mouse.click(cameraClick!.x, cameraClick!.y);
    await expect(page).toHaveURL(/\/projects\/ai-vs-real\/?$/, { timeout: 15_000 });
  });

  test("starts compact on a fresh phone-sized view and preserves every action with Diagnostics-first Escape", async ({ page }) => {
    test.setTimeout(180_000);
    recordErrors(page, "mobile-drawer");
    const viewport = { width: 390, height: 844 };
    await enterHome(page, viewport);
    const browser = await browserArtifactLabel(page);
    const browserEnvironment = await recordBrowserEnvironment(page, browser);
    const cameraProbePixel = browserEnvironment.cameraProbePixel as [number, number] | null;
    await recordRuntimeSceneState(page, `mobile-390x844-${browser}`);

    const toggle = page.getByTestId("studio-controls-toggle");
    const panel = page.locator("#studio-controls-panel");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await measureFixedChrome(page, viewport, `mobile-390x844-${browser}`);
    const screenshotName = `studio-reference-mobile-390x844-${browser}.png`;
    const renderMeasurement = await captureAndCompose(page, screenshotName, viewport);
    if (evidenceMode) {
      await recordVisualAnchorEvidence(
        page,
        path.join(screenshotDir, screenshotName),
        viewport,
        `mobile-390x844-${browser}`,
        cameraProbePixel,
      );
    }
    expect(renderMeasurement.distinctPixelColors, "mobile GLB frame is visibly rendered").toBeGreaterThan(16);

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

  test("keeps the compact drawer, touch targets, and scene viewport usable at phone and short-landscape sizes", async ({ page }) => {
    test.setTimeout(180_000);
    recordErrors(page, "compact-viewports");
    for (const viewport of [{ width: 320, height: 600 }, { width: 844, height: 390 }]) {
      const browser = await browserArtifactLabel(page);
      const label = `${viewport.width}x${viewport.height}-${browser}`;
      await enterHome(page, viewport);
      const browserEnvironment = await recordBrowserEnvironment(page, browser);
      const cameraProbePixel = browserEnvironment.cameraProbePixel as [number, number] | null;
      await recordRuntimeSceneState(page, `responsive-${label}`);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
      const closedChrome = await measureFixedChrome(page, viewport, label);
      expect(closedChrome.coveredRatio).toBeLessThanOrEqual(0.2);

      const screenshotName = viewport.width === 320
        ? `studio-reference-compact-320x600-${browser}.png`
        : `studio-reference-landscape-844x390-${browser}.png`;
      const screenshotPath = path.join(screenshotDir, screenshotName);
      await page.screenshot({ path: screenshotPath, fullPage: false });
      if (evidenceMode) await recordVisualAnchorEvidence(page, screenshotPath, viewport, label, cameraProbePixel);

      const toggle = page.getByTestId("studio-controls-toggle");
      if (await toggle.getAttribute("aria-expanded") !== "true") await toggle.click();
      await expect(page.getByTestId("quality-tier-select")).toBeFocused();
      const actionBounds = await page.locator(actionSelector).evaluateAll((elements) => elements
        .map((element) => {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return { visible: style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0, width: rect.width, height: rect.height };
        })
        .filter((item) => item.visible));
      expect(actionBounds).toHaveLength(26);
      expect(actionBounds.every((item) => item.width >= 44 && item.height >= 44)).toBe(true);
      await page.screenshot({ path: path.join(screenshotDir, `studio-reference-${viewport.width}x${viewport.height}-${browser}-drawer.png`), fullPage: false });
      await page.getByTestId("studio-controls-toggle").click();
      await expect(page.getByTestId("studio-controls-toggle")).toBeFocused();
    }
  });
});
