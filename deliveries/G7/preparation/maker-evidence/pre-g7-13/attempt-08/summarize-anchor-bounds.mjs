import { readFileSync } from "node:fs";

const base = new URL("./measurements/", import.meta.url);
const viewports = ["1440x900", "390x844", "320x600"];
const result = [];
for (const viewport of viewports) {
  const filename = `browser-environment-${viewport}.json`;
  let record;
  try {
    record = JSON.parse(readFileSync(new URL(filename, base), "utf8"));
  } catch {
    if (viewport === "320x600") continue;
    throw new Error(`Missing ${filename}`);
  }
  const scene = record.referenceComposition;
  result.push({
    viewport: scene.viewport,
    url: scene.url,
    camera: scene.camera,
    anchors: scene.anchors.map(({ name, found, worldPosition, worldScale, worldBounds, pixelBounds, materials, sampledRegionHits }) => ({
      name, found, worldPosition, worldScale, worldBounds, pixelBounds, materials, sampledRegionHits,
    })),
    lights: scene.lights,
    interactionNeutralMeshes: scene.interactionNeutralMeshes,
  });
}
const output = `${JSON.stringify(result, null, 2)}\n`;
process.stdout.write(output);
