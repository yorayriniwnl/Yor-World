import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const inputPath = path.join(here, "projection-input", "baseline-mobile-390x844-chrome-projected-anchor-snapshot.json");
const outputPath = path.join(here, "projection-analysis.json");
const inputBytes = fs.readFileSync(inputPath);
const input = JSON.parse(inputBytes.toString("utf8"));

const requiredNames = [
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

const subtract = (a, b) => a.map((value, index) => value - b[index]);
const dot = (a, b) => a.reduce((sum, value, index) => sum + value * b[index], 0);
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const normalize = (vector) => {
  const length = Math.hypot(...vector);
  return vector.map((value) => value / length);
};

function projectBounds(worldBounds, camera, viewport) {
  const [width, height] = [viewport.width, viewport.height];
  const aspect = camera.aspect;
  const tangent = Math.tan((camera.fov * Math.PI) / 360);
  const forward = normalize(subtract(camera.target, camera.position));
  const right = normalize(cross(forward, [0, 1, 0]));
  const up = normalize(cross(right, forward));
  const pixels = [];

  for (const x of [worldBounds.min[0], worldBounds.max[0]]) {
    for (const y of [worldBounds.min[1], worldBounds.max[1]]) {
      for (const z of [worldBounds.min[2], worldBounds.max[2]]) {
        const relative = subtract([x, y, z], camera.position);
        const depth = dot(relative, forward);
        if (depth <= 0) throw new Error("An anchor corner is behind the projected camera.");
        const ndcX = dot(relative, right) / (depth * tangent * aspect);
        const ndcY = dot(relative, up) / (depth * tangent);
        pixels.push([(ndcX + 1) * width / 2, (1 - ndcY) * height / 2]);
      }
    }
  }

  const xs = pixels.map(([x]) => x);
  const ys = pixels.map(([, y]) => y);
  const left = Math.min(...xs);
  const rightEdge = Math.max(...xs);
  const top = Math.min(...ys);
  const bottom = Math.max(...ys);
  return {
    left,
    top,
    right: rightEdge,
    bottom,
    width: rightEdge - left,
    height: bottom - top,
    edgeMargins: {
      left,
      top,
      right: width - rightEdge,
      bottom: height - bottom,
    },
    insideViewport: left >= 0 && top >= 0 && rightEdge <= width && bottom <= height,
  };
}

const anchors = new Map(input.anchors.map((anchor) => [anchor.name, anchor]));
const missingNames = requiredNames.filter((name) => !anchors.has(name) || !anchors.get(name)?.worldBounds);
if (missingNames.length) throw new Error(`Projection input is missing required world bounds: ${missingNames.join(", ")}`);

const baselineCamera = {
  position: input.camera.position,
  target: input.camera.target,
  fov: input.camera.fov,
  aspect: input.camera.aspect,
};
const candidateCamera = {
  ...baselineCamera,
  target: [baselineCamera.target[0], 0.55, baselineCamera.target[2]],
};
const projected = Object.fromEntries(requiredNames.map((name) => [
  name,
  {
    baseline: anchors.get(name).pixelBounds,
    candidate: projectBounds(anchors.get(name).worldBounds, candidateCamera, input.viewport),
  },
]));
const candidateBounds = Object.fromEntries(Object.entries(projected).map(([name, entry]) => [name, entry.candidate]));
const allMargins = requiredNames.flatMap((name) => Object.entries(candidateBounds[name].edgeMargins).map(([edge, margin]) => ({ name, edge, margin })));
allMargins.sort((a, b) => a.margin - b.margin);
const hexes = requiredNames.filter((name) => name.startsWith("hex_panel_")).map((name) => candidateBounds[name]);
const hexCluster = {
  left: Math.min(...hexes.map((bounds) => bounds.left)),
  top: Math.min(...hexes.map((bounds) => bounds.top)),
  right: Math.max(...hexes.map((bounds) => bounds.right)),
  bottom: Math.max(...hexes.map((bounds) => bounds.bottom)),
};
hexCluster.width = hexCluster.right - hexCluster.left;
hexCluster.height = hexCluster.bottom - hexCluster.top;

const metrics = {
  requiredAnchorCount: requiredNames.length,
  projectedAnchorsInsideViewport: requiredNames.filter((name) => candidateBounds[name].insideViewport).length,
  minimumProjectedEdgeMargin: allMargins[0],
  monitorWidth: candidateBounds.monitor.width,
  sevenPanelClusterWidth: hexCluster.width,
  shelfCameraWidth: candidateBounds["ai-real-camera"].width,
  controllerWidth: candidateBounds.peg_controller_body.width,
  leftSpeaker: {
    width: candidateBounds.speaker_left_cabinet.width,
    height: candidateBounds.speaker_left_cabinet.height,
  },
  rightSpeaker: {
    width: candidateBounds.speaker_right_cabinet.width,
    height: candidateBounds.speaker_right_cabinet.height,
  },
  existingMobileMinimums: {
    monitorAtLeast156px: candidateBounds.monitor.width >= 156,
    hexClusterAtLeast115px: hexCluster.width >= 115,
    shelfCameraAtLeast28px: candidateBounds["ai-real-camera"].width >= 28,
    controllerAtLeast24px: candidateBounds.peg_controller_body.width >= 24,
    speakersAtLeast16px: ["speaker_left_cabinet", "speaker_right_cabinet"].every((name) => candidateBounds[name].width >= 16 && candidateBounds[name].height >= 16),
  },
};

const result = {
  status: requiredNames.every((name) => candidateBounds[name].insideViewport) && Object.values(metrics.existingMobileMinimums).every(Boolean)
    ? "GEOMETRIC PROJECTION PASS"
    : "GEOMETRIC PROJECTION FAIL",
  purpose: "Offline projection of existing AABB world bounds under the PRE-G7-31 candidate mobile camera; this is not a browser test or a visual acceptance.",
  candidate: {
    sourceCommit: "bd01478617b4166866f3f44196c56fc5add94acd",
    appTree: "3975e40c59a04b8696efa2ca3605eb37a0617165",
    domainTree: "8c34adf791c678a4e9e8bfe90f92426026994e68",
    camera: candidateCamera,
  },
  baseline: {
    sourceCandidate: "PRE-G7-25 attempt-02 capture; snapshot does not embed its exact source commit",
    evidenceCommit: "848463d6d5c44e2575ada644baedb327176dc356",
    originalSnapshotPath: "deliveries/G7/preparation/maker-evidence/pre-g7-25/attempt-02/composition-e2e/measurements/mobile-390x844-chrome-projected-anchor-snapshot.json",
    originalSnapshotGitBlob: "e56309b7d13239a65ea12e8d427586c287c94bd2",
    snapshotSha256: crypto.createHash("sha256").update(inputBytes).digest("hex"),
    screenshotPath: "deliveries/G7/preparation/maker-evidence/pre-g7-25/attempt-02/composition-e2e/screenshots/studio-reference-mobile-390x844-chrome.png",
    screenshotGitBlob: "9b59d3246cf7015c3d287742e8eacac6d95a971e",
    screenshotSha256: "f8c529f80cb80b5ea264917f06bd1ac4e154f123ff335d269ae904a824252968",
    viewport: input.viewport,
    recordedCamera: baselineCamera,
    relevantCameraAndSceneFilesMatchCurrentBase: [
      { path: "app/src/features/world/CameraDirector.ts", blob: "bd5d4d73ff2f4606fab01333750314faa85054f4" },
      { path: "app/src/features/world/ReferenceComposition.ts", blob: "7bab6b6c72458f29b66c050af2820e0cc5de5032" },
      { path: "app/src/features/world/SceneIntegrator.ts", blob: "53b389409d2fcffef4423000376b38264b0ea6b8" },
      { path: "app/src/features/world/ProductionLighting.ts", blob: "b90fd4636a5cf3a60861a961c11a11f7d02ce6b6" },
    ],
    sourceBindingLimitation: "The copied snapshot contains no source commit field. PRE-G7-25 reports it under attempt-02; the camera and listed scene files are identical between that candidate and PRE-G7-28. This prior capture is diagnostic input only, not PRE-G7-31 browser evidence.",
  },
  method: {
    projection: "Project all eight corners of each measured world-space AABB through a perspective camera using the stored 390x844 viewport, aspect, and FOV.",
    requiredAnchorNames: requiredNames,
    metrics,
    anchors: projected,
  },
  limitations: [
    "The calculation projects bounding boxes, not rendered pixels or visible mesh fragments.",
    "It does not recalculate occlusion, identify human recognition, sample materials or lights, or model fixed HUD overlap.",
    "The baseline capture is from an earlier PRE-G7-25 run and its snapshot does not embed a source commit.",
    "No PRE-G7-31 browser capture, test, build, or independent visual review was run.",
  ],
};

fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify({ status: result.status, metrics: result.method.metrics, output: outputPath }, null, 2)}\n`);
