import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";

const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const sharp = createRequire(path.join(root, "app", "package.json"))("sharp");
const candidateRoot = path.join(root, "deliveries/G7/preparation/maker-evidence/pre-g7-24/visual-run");
const baselineRoot = path.join(root, "deliveries/G7/preparation/maker-evidence/pre-g7-24/baseline-26e87/visual-run");
const outputRoot = path.join(root, "deliveries/G7/preparation/maker-evidence/pre-g7-24/visual-parity");
const pairs = [
  { label: "desktop-1440x900-chrome", screenshot: "studio-reference-desktop-1440x900-chrome.png" },
  { label: "mobile-390x844-chrome", screenshot: "studio-reference-mobile-390x844-chrome.png" },
];
const sourceCommits = {
  baseline: "26e87c8cd41f2745d165a74446ae1366f17f7bc1",
  candidate: "017bead7813d5ea9875b8789621b93b8a8cd00ce",
};
const appTrees = {
  baseline: "ab95dafb3276c91ee9097d4f99a313e79c7da7e3",
  candidate: "b28bf52127947dce6ad9e032d1fd0ffd2577fb47",
};
const captureLabels = [
  "desktop-1440x900-chrome",
  "desktop-1440x900-edge",
  "mobile-390x844-chrome",
  "mobile-390x844-edge",
  "responsive-320x600-chrome",
  "responsive-320x600-edge",
  "responsive-844x390-chrome",
  "responsive-844x390-edge",
];
const renderCallComparison = captureLabels.map((label) => {
  const baseline = JSON.parse(fs.readFileSync(path.join(baselineRoot, "measurements", `${label}-runtime-scene.json`), "utf8"));
  const candidate = JSON.parse(fs.readFileSync(path.join(candidateRoot, "measurements", `${label}-runtime-scene.json`), "utf8"));
  return {
    label,
    viewport: baseline.viewport,
    browser: label.endsWith("chrome") ? "Chrome" : "Edge",
    baselineTier: baseline.runtime.qualityTier,
    candidateTier: candidate.runtime.qualityTier,
    sameTier: baseline.runtime.qualityTier === candidate.runtime.qualityTier,
    baselineCalls: baseline.runtime.renderCalls,
    candidateCalls: candidate.runtime.renderCalls,
    callsReduced: baseline.runtime.renderCalls - candidate.runtime.renderCalls,
    baselineTriangles: baseline.runtime.renderedTriangles,
    candidateTriangles: candidate.runtime.renderedTriangles,
    baselineBudgetStatus: baseline.budgetAssessment.status,
    candidateBudgetStatus: candidate.budgetAssessment.status,
  };
});
const result = { schemaVersion: 1, sourceCommits, appTrees, renderCallComparison, comparisons: [] };

for (const pair of pairs) {
  const baselineMetric = JSON.parse(fs.readFileSync(path.join(baselineRoot, "measurements", `${pair.label}-runtime-scene.json`), "utf8"));
  const candidateMetric = JSON.parse(fs.readFileSync(path.join(candidateRoot, "measurements", `${pair.label}-runtime-scene.json`), "utf8"));
  if (JSON.stringify(baselineMetric.viewport) !== JSON.stringify(candidateMetric.viewport)) throw new Error(`${pair.label}: viewport differs`);
  if (baselineMetric.runtime.qualityTier !== candidateMetric.runtime.qualityTier) throw new Error(`${pair.label}: quality tier differs (${baselineMetric.runtime.qualityTier} vs ${candidateMetric.runtime.qualityTier})`);

  const baselinePath = path.join(baselineRoot, "screenshots", pair.screenshot);
  const candidatePath = path.join(candidateRoot, "screenshots", pair.screenshot);
  const baseline = await sharp(baselinePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const candidate = await sharp(candidatePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = baseline.info;
  if (width !== candidate.info.width || height !== candidate.info.height || channels !== candidate.info.channels) throw new Error(`${pair.label}: image dimensions or channels differ`);

  let absoluteErrorSum = 0;
  let squaredErrorSum = 0;
  let maxChannelDifference = 0;
  const changedPixels = Object.fromEntries([1, 4, 8, 16, 32].map((threshold) => [threshold, 0]));
  const difference = Buffer.alloc(baseline.data.length);
  let pixelCount = 0;
  for (let offset = 0; offset < baseline.data.length; offset += channels) {
    let pixelMax = 0;
    for (let channel = 0; channel < 3; channel += 1) {
      const delta = Math.abs(baseline.data[offset + channel] - candidate.data[offset + channel]);
      absoluteErrorSum += delta;
      squaredErrorSum += delta * delta;
      maxChannelDifference = Math.max(maxChannelDifference, delta);
      pixelMax = Math.max(pixelMax, delta);
      difference[offset + channel] = Math.min(255, delta * 3);
    }
    difference[offset + 3] = 255;
    for (const threshold of [1, 4, 8, 16, 32]) if (pixelMax > threshold) changedPixels[threshold] += 1;
    pixelCount += 1;
  }

  const imageDirectory = path.join(outputRoot, pair.label);
  fs.mkdirSync(imageDirectory, { recursive: true });
  await sharp({ create: { width: width * 2, height, channels: 4, background: "#10151d" } })
    .composite([{ input: baselinePath, left: 0, top: 0 }, { input: candidatePath, left: width, top: 0 }])
    .png()
    .toFile(path.join(imageDirectory, "baseline-vs-candidate.png"));
  await sharp(difference, { raw: { width, height, channels } })
    .png()
    .toFile(path.join(imageDirectory, "absolute-difference-3x.png"));

  result.comparisons.push({
    label: pair.label,
    viewport: baselineMetric.viewport,
    qualityTier: baselineMetric.runtime.qualityTier,
    baseline: { renderCalls: baselineMetric.runtime.renderCalls, renderedTriangles: baselineMetric.runtime.renderedTriangles },
    candidate: { renderCalls: candidateMetric.runtime.renderCalls, renderedTriangles: candidateMetric.runtime.renderedTriangles },
    pixelCount,
    meanAbsoluteChannelDifference: Number((absoluteErrorSum / (pixelCount * 3)).toFixed(4)),
    rootMeanSquareChannelDifference: Number(Math.sqrt(squaredErrorSum / (pixelCount * 3)).toFixed(4)),
    maxChannelDifference,
    changedPixels,
    changedPixelPercent: Object.fromEntries(Object.entries(changedPixels).map(([threshold, count]) => [threshold, Number((count / pixelCount * 100).toFixed(4))])),
    sideBySide: `deliveries/G7/preparation/maker-evidence/pre-g7-24/visual-parity/${pair.label}/baseline-vs-candidate.png`,
    absoluteDifference: `deliveries/G7/preparation/maker-evidence/pre-g7-24/visual-parity/${pair.label}/absolute-difference-3x.png`,
  });
}

fs.mkdirSync(outputRoot, { recursive: true });
fs.writeFileSync(path.join(outputRoot, "pixel-parity.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
fs.writeFileSync(path.join(outputRoot, "render-call-comparison.json"), `${JSON.stringify({ sourceCommits, appTrees, captures: renderCallComparison }, null, 2)}\n`, "utf8");
process.stdout.write(JSON.stringify({
  captures: renderCallComparison.map(({ label, baselineTier, candidateTier, baselineCalls, candidateCalls, callsReduced, baselineBudgetStatus, candidateBudgetStatus }) => ({ label, baselineTier, candidateTier, baselineCalls, candidateCalls, callsReduced, baselineBudgetStatus, candidateBudgetStatus })),
  pixelComparisons: result.comparisons.map(({ label, qualityTier, baseline, candidate, meanAbsoluteChannelDifference, changedPixelPercent }) => ({ label, qualityTier, baselineCalls: baseline.renderCalls, candidateCalls: candidate.renderCalls, meanAbsoluteChannelDifference, changedPixelPercent })),
}, null, 2));
