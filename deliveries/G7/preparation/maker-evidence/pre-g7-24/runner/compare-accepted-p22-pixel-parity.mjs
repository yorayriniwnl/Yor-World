import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const evidenceDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(evidenceDir, "../../../../..");
const sharp = createRequire(path.join(repoRoot, "app", "package.json"))("sharp");
const baselineRoot = path.join(repoRoot, "deliveries/G7/preparation/maker-evidence/pre-g7-22/visual-run");
const candidateRoot = path.join(evidenceDir, "attempt-01/visual-run");
const outputRoot = path.join(evidenceDir, "attempt-01/accepted-p22-pixel-comparisons");
const baseline = {
  sourceCommit: "500d10fa5901be48d4ff877e608d65ba0e271bb9",
  appTree: "ba0b709192367e1d12a796618f97801a8fcd5a70",
};
const candidate = {
  sourceCommit: "017bead7813d5ea9875b8789621b93b8a8cd00ce",
  appTree: "b28bf52127947dce6ad9e032d1fd0ffd2577fb47",
};
const captures = [
  { label: "desktop-1440x900-chrome", viewport: { width: 1440, height: 900 }, browser: "Chrome",
    screenshot: "studio-reference-desktop-1440x900-chrome.png" },
  { label: "desktop-1440x900-edge", viewport: { width: 1440, height: 900 }, browser: "Edge",
    screenshot: "studio-reference-desktop-1440x900-edge.png" },
  { label: "mobile-390x844-chrome", viewport: { width: 390, height: 844 }, browser: "Chrome",
    screenshot: "studio-reference-mobile-390x844-chrome.png" },
  { label: "mobile-390x844-edge", viewport: { width: 390, height: 844 }, browser: "Edge",
    screenshot: "studio-reference-mobile-390x844-edge.png" },
];

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const results = [];
fs.mkdirSync(outputRoot, { recursive: true });

for (const capture of captures) {
  const baselineMetricPath = path.join(baselineRoot, "measurements", `${capture.label}-runtime-scene.json`);
  const candidateMetricPath = path.join(candidateRoot, "measurements", `${capture.label}-runtime-scene.json`);
  const baselineMetric = JSON.parse(fs.readFileSync(baselineMetricPath, "utf8"));
  const candidateMetric = JSON.parse(fs.readFileSync(candidateMetricPath, "utf8"));
  const baselineImagePath = path.join(baselineRoot, "screenshots", capture.screenshot);
  const candidateImagePath = path.join(candidateRoot, "screenshots", capture.screenshot);
  const baselinePng = fs.readFileSync(baselineImagePath);
  const candidatePng = fs.readFileSync(candidateImagePath);
  const baselineImage = await sharp(baselinePng).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const candidateImage = await sharp(candidatePng).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = baselineImage.info;

  if (baselineMetric.viewport.width !== capture.viewport.width || baselineMetric.viewport.height !== capture.viewport.height
    || candidateMetric.viewport.width !== capture.viewport.width || candidateMetric.viewport.height !== capture.viewport.height) {
    throw new Error(`${capture.label}: measurement viewport mismatch`);
  }
  if (width !== capture.viewport.width || height !== capture.viewport.height
    || candidateImage.info.width !== width || candidateImage.info.height !== height || channels !== 4
    || candidateImage.info.channels !== channels) {
    throw new Error(`${capture.label}: decoded screenshot dimensions/channels mismatch`);
  }

  let absoluteErrorSum = 0;
  let squaredErrorSum = 0;
  let maximumChannelDifference = 0;
  const thresholds = [0, 1, 4, 8, 16, 32];
  const changedPixels = Object.fromEntries(thresholds.map((threshold) => [threshold, 0]));
  const difference = Buffer.alloc(width * height * 4);
  const pixelCount = width * height;

  for (let offset = 0, pixel = 0; offset < baselineImage.data.length; offset += 4, pixel += 1) {
    let pixelMaximum = 0;
    for (let channel = 0; channel < 3; channel += 1) {
      const delta = Math.abs(baselineImage.data[offset + channel] - candidateImage.data[offset + channel]);
      absoluteErrorSum += delta;
      squaredErrorSum += delta * delta;
      maximumChannelDifference = Math.max(maximumChannelDifference, delta);
      pixelMaximum = Math.max(pixelMaximum, delta);
      difference[offset + channel] = Math.min(255, delta * 3);
    }
    difference[offset + 3] = 255;
    for (const threshold of thresholds) if (pixelMaximum > threshold) changedPixels[threshold] += 1;
  }

  const labelDirectory = path.join(outputRoot, capture.label);
  fs.mkdirSync(labelDirectory, { recursive: true });
  await sharp({ create: { width: width * 2, height, channels: 4, background: "#10151d" } })
    .composite([
      { input: baselineImagePath, left: 0, top: 0 },
      { input: candidateImagePath, left: width, top: 0 },
    ])
    .png()
    .toFile(path.join(labelDirectory, "accepted-baseline-vs-candidate.png"));
  await sharp(difference, { raw: { width, height, channels: 4 } })
    .png()
    .toFile(path.join(labelDirectory, "absolute-difference-3x.png"));

  results.push({
    label: capture.label,
    browser: capture.browser,
    viewport: capture.viewport,
    baseline: {
      path: path.relative(repoRoot, baselineImagePath).replaceAll(path.sep, "/"),
      screenshotSha256: sha256(baselinePng),
      sourceCommit: baseline.sourceCommit,
      appTree: baseline.appTree,
      qualityTier: baselineMetric.runtime.qualityTier,
      renderCalls: baselineMetric.runtime.renderCalls,
      renderedTriangles: baselineMetric.runtime.renderedTriangles,
      renderPixelRatio: baselineMetric.runtime.renderPixelRatio,
    },
    candidate: {
      path: path.relative(repoRoot, candidateImagePath).replaceAll(path.sep, "/"),
      screenshotSha256: sha256(candidatePng),
      sourceCommit: candidate.sourceCommit,
      appTree: candidate.appTree,
      qualityTier: candidateMetric.runtime.qualityTier,
      renderCalls: candidateMetric.runtime.renderCalls,
      renderedTriangles: candidateMetric.runtime.renderedTriangles,
      renderPixelRatio: candidateMetric.runtime.renderPixelRatio,
    },
    sameTier: baselineMetric.runtime.qualityTier === candidateMetric.runtime.qualityTier,
    width,
    height,
    channelsCompared: 3,
    pixelCount,
    identicalPixels: pixelCount - changedPixels[0],
    identicalPixelsPercent: Number(((pixelCount - changedPixels[0]) / pixelCount * 100).toFixed(8)),
    pixelsWithAnyChannelDifference: changedPixels[0],
    pixelsWithAnyChannelDifferencePercent: Number((changedPixels[0] / pixelCount * 100).toFixed(8)),
    meanAbsoluteChannelDifference: Number((absoluteErrorSum / (pixelCount * 3)).toFixed(8)),
    rootMeanSquareChannelDifference: Number(Math.sqrt(squaredErrorSum / (pixelCount * 3)).toFixed(8)),
    maximumChannelDifference,
    changedPixels,
    changedPixelPercent: Object.fromEntries(Object.entries(changedPixels)
      .map(([threshold, count]) => [threshold, Number((count / pixelCount * 100).toFixed(8))])),
    sideBySide: path.relative(repoRoot, path.join(labelDirectory, "accepted-baseline-vs-candidate.png")).replaceAll(path.sep, "/"),
    absoluteDifference: path.relative(repoRoot, path.join(labelDirectory, "absolute-difference-3x.png")).replaceAll(path.sep, "/"),
  });
}

const output = {
  schemaVersion: 1,
  generatedAtUtc: new Date().toISOString(),
  nodeVersion: process.version,
  method: "Sharp decoded PNG RGB comparison without crop, resize, alignment, or color normalization",
  baseline,
  candidate,
  comparisons: results,
};
fs.writeFileSync(path.join(outputRoot, "accepted-p22-pixel-parity.json"), `${JSON.stringify(output, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(results.map(({ label, sameTier, baseline: before, candidate: after,
  identicalPixelsPercent, meanAbsoluteChannelDifference }) => ({
  label, baselineTier: before.qualityTier, candidateTier: after.qualityTier, sameTier,
  baselineCalls: before.renderCalls, candidateCalls: after.renderCalls,
  identicalPixelsPercent, meanAbsoluteChannelDifference,
})), null, 2)}\n`);
