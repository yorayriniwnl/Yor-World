const fs = require("node:fs");

const input = process.argv[2];
if (!input) throw new Error("Pass an anchor-diagnostics JSON path.");
const report = JSON.parse(fs.readFileSync(input, "utf8"));
const required = [
  ...Array.from({ length: 7 }, (_, index) => `hex_panel_${index + 1}`),
  "lightbar_emissive",
  "speaker_left_cabinet",
  "monitor",
  "console-code-native",
  "peg_controller_body",
  "controller-code-native",
  "desk",
  "headset-code-native",
];
for (const name of required) {
  const anchor = report.snapshot.anchors.find((entry) => entry.name === name);
  const hits = anchor?.sampledRegionHits;
  const center = hits?.centerRay;
  console.log(JSON.stringify({
    name,
    pixelBounds: anchor?.pixelBounds,
    samples: hits?.samples,
    targetFirstRenderable: hits?.target,
    targetSurface: hits?.targetSurface,
    chairFirst: hits?.chair,
    residentFirst: hits?.resident,
    otherFirst: hits?.other,
    noRenderableHit: hits?.noRenderableHit,
    rawFirstSceneHit: center?.firstSceneHitName,
    rawFirstRenderable: center?.firstRawSceneHitRenderable,
    firstRenderableSceneHit: center?.firstRenderableSceneHitName,
    targetDirectHitCount: center?.targetDirectHitCount,
    targetDirectHitNames: center?.targetDirectHitNames,
    meshCenterRay: center?.meshCenterRay ? {
      meshName: center.meshCenterRay.meshName,
      directRaycastHitCount: center.meshCenterRay.directRaycastHitCount,
      directRaycastHitNames: center.meshCenterRay.directRaycastHitNames,
      firstSceneHitName: center.meshCenterRay.firstSceneHitName,
      firstRenderableSceneHitName: center.meshCenterRay.firstRenderableSceneHitName,
      rendererSceneHits: center.meshCenterRay.rendererSceneHits?.slice(0, 4),
    } : null,
  }));
}
