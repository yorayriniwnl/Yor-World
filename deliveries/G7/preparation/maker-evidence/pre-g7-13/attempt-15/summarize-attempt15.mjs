import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(path.resolve("app/package.json"));
const sharp = require("sharp");
const attemptRoot = path.resolve("deliveries/G7/preparation/maker-evidence/pre-g7-13/attempt-15");
const views = [
  { label: "desktop-1440x900", image: "studio-reference-desktop-1440x900.png" },
  { label: "mobile-390x844", image: "studio-reference-mobile-390x844.png" },
  { label: "compact-320x600", image: "studio-reference-compact-320x600.png" },
  { label: "compact-landscape-844x390", image: "studio-reference-844x390-drawer.png" },
];

function countPixels(image, bounds, predicate) {
  if (!bounds) return { colored: 0, sampled: 0, ratio: 0 };
  let sampled = 0;
  let colored = 0;
  const left = Math.max(0, Math.floor(bounds.left));
  const top = Math.max(0, Math.floor(bounds.top));
  const right = Math.min(image.info.width, Math.ceil(bounds.right));
  const bottom = Math.min(image.info.height, Math.ceil(bounds.bottom));
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
  return { colored, sampled, ratio: sampled ? colored / sampled : 0 };
}

const report = [];
for (const view of views) {
  const diagnosticPath = path.join(attemptRoot, "measurements", `${view.label}-anchor-diagnostics.json`);
  const diagnostic = JSON.parse(fs.readFileSync(diagnosticPath, "utf8")).snapshot;
  const imagePath = path.join(attemptRoot, "screenshots", view.image);
  const image = await sharp(imagePath).raw().toBuffer({ resolveWithObject: true });
  const byName = new Map(diagnostic.anchors.map((anchor) => [anchor.name, anchor]));
  const lilacPanels = Array.from({ length: 7 }, (_, index) => byName.get(`hex_panel_${index + 1}`));
  const lilacBounds = {
    left: Math.min(...lilacPanels.map((anchor) => anchor?.pixelBounds?.left ?? 0)),
    top: Math.min(...lilacPanels.map((anchor) => anchor?.pixelBounds?.top ?? 0)),
    right: Math.max(...lilacPanels.map((anchor) => anchor?.pixelBounds?.right ?? 0)),
    bottom: Math.max(...lilacPanels.map((anchor) => anchor?.pixelBounds?.bottom ?? 0)),
  };
  report.push({
    label: view.label,
    screenshot: path.relative(attemptRoot, imagePath),
    viewport: diagnostic.viewport,
    camera: {
      source: diagnostic.camera.source,
      activeWorldMatrixMatches: diagnostic.camera.activeWorldMatrixMatches,
      activeProjectionMatrixMatches: diagnostic.camera.activeProjectionMatrixMatches,
      activeRuntime: diagnostic.camera.activeRuntime,
    },
    anchors: ["desk", "plants", "ivy_mound", "pot_ivy", "chair-root", "resident", "hex_panel_1", "lightbar_emissive", "controller-code-native"]
      .map((name) => {
        const anchor = byName.get(name);
        return anchor ? {
          name,
          pixelBounds: anchor.pixelBounds,
          sampledRegionHits: anchor.sampledRegionHits,
          materials: anchor.materials,
        } : { name, found: false };
      }),
    colors: {
      lilac: countPixels(image, lilacBounds, (r, g, b) => r > 65 && b > 65 && r > g * 1.12 && b > g * 1.08),
      warmBar: countPixels(image, byName.get("lightbar_emissive")?.pixelBounds, (r, g, b) => r > 100 && g > 35 && r > g * 1.18 && g > b * 1.15),
    },
    hexPanel1Rays: byName.get("hex_panel_1")?.sampledRegionHits?.centerRay ?? null,
  });
}

const outputPath = path.join(attemptRoot, "attempt-15-measurement-summary.json");
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(`${outputPath}\n`);
process.stdout.write(`${JSON.stringify(report.map((view) => ({
  label: view.label,
  camera: {
    source: view.camera.source,
    activeWorldMatrixMatches: view.camera.activeWorldMatrixMatches,
    activeProjectionMatrixMatches: view.camera.activeProjectionMatrixMatches,
  },
  colors: view.colors,
  anchorCounts: view.anchors.map(({ name, pixelBounds, sampledRegionHits }) => ({
    name,
    pixelBounds,
    target: sampledRegionHits?.target ?? null,
    chair: sampledRegionHits?.chair ?? null,
    resident: sampledRegionHits?.resident ?? null,
    samples: sampledRegionHits?.samples ?? null,
    occluderRatio: sampledRegionHits?.occluderRatio ?? null,
  })),
  hexPanel1Rays: view.hexPanel1Rays ? {
    pixel: view.hexPanel1Rays.pixel,
    targetDirectHitCount: view.hexPanel1Rays.targetDirectHitCount,
    firstSceneHitName: view.hexPanel1Rays.firstSceneHitName,
    firstSceneHitBelongsToTarget: view.hexPanel1Rays.firstSceneHitBelongsToTarget,
    ndc: view.hexPanel1Rays.ndc,
    rayOrigin: view.hexPanel1Rays.rayOrigin,
    rayDirection: view.hexPanel1Rays.rayDirection,
    meshCenterRay: view.hexPanel1Rays.meshCenterRay,
  } : null,
})), null, 2)}\n`);
