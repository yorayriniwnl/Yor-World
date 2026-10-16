import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const evidenceDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(evidenceDir, "../../../../..");
const requireFromApp = createRequire(path.join(repoRoot, "app", "package.json"));
const sharp = requireFromApp("sharp");
const sourceRoot = path.join(evidenceDir, "attempt-02/accepted-root-captures/screenshots");
const overlayRoot = path.join(evidenceDir, "attempt-02/accepted-root-counter-captures/screenshots");
const outputRoot = path.join(evidenceDir, "attempt-02/counter-overlay-equivalence");
const screenshots = [
  "studio-reference-desktop-1440x900-chrome.png",
  "studio-reference-desktop-1440x900-edge.png",
  "studio-reference-mobile-390x844-chrome.png",
  "studio-reference-mobile-390x844-edge.png",
  "studio-reference-compact-320x600-chrome.png",
  "studio-reference-compact-320x600-edge.png",
  "studio-reference-landscape-844x390-chrome.png",
  "studio-reference-landscape-844x390-edge.png",
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const comparisons = [];
fs.mkdirSync(outputRoot, { recursive: true });

for (const filename of screenshots) {
  const sourcePath = path.join(sourceRoot, filename);
  const overlayPath = path.join(overlayRoot, filename);
  const sourcePng = fs.readFileSync(sourcePath);
  const overlayPng = fs.readFileSync(overlayPath);
  const sourcePixels = await sharp(sourcePng).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const overlayPixels = await sharp(overlayPng).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (sourcePixels.info.width !== overlayPixels.info.width || sourcePixels.info.height !== overlayPixels.info.height
    || sourcePixels.info.channels !== 4 || overlayPixels.info.channels !== 4) {
    throw new Error(`${filename}: source and overlay dimensions/channels differ`);
  }
  let identicalPixels = 0;
  let absoluteError = 0;
  let maximumChannelDifference = 0;
  for (let offset = 0; offset < sourcePixels.data.length; offset += 4) {
    let pixelDifference = 0;
    for (let channel = 0; channel < 3; channel += 1) {
      const difference = Math.abs(sourcePixels.data[offset + channel] - overlayPixels.data[offset + channel]);
      absoluteError += difference;
      maximumChannelDifference = Math.max(maximumChannelDifference, difference);
      pixelDifference = Math.max(pixelDifference, difference);
    }
    if (pixelDifference === 0) identicalPixels += 1;
  }
  const pixelCount = sourcePixels.info.width * sourcePixels.info.height;
  comparisons.push({
    filename,
    dimensions: { width: sourcePixels.info.width, height: sourcePixels.info.height },
    sourceSha256: sha256(sourcePng),
    overlaySha256: sha256(overlayPng),
    pixelCount,
    identicalPixels,
    identicalPixelsPercent: Number((identicalPixels / pixelCount * 100).toFixed(8)),
    meanAbsoluteChannelDifference: Number((absoluteError / (pixelCount * 3)).toFixed(8)),
    maximumChannelDifference,
  });
}

const report = {
  schemaVersion: 1,
  generatedAtUtc: new Date().toISOString(),
  method: "Sharp decoded PNG RGB comparison; accepted source-500 capture against the same source with the reset-boundary counter overlay",
  source: { commit: "500d10fa5901be48d4ff877e608d65ba0e271bb9", appTree: "ba0b709192367e1d12a796618f97801a8fcd5a70" },
  overlay: {
    appTree: "d8956de409e824bbff1490d1fd8d1564d5e25cda",
    patchSha256: "0c762543bb14fd4ad6a0e553753d2ba86376f00c3e91e12bb1925e03faeba1fa",
    scope: "WorldRuntime renderer.info reset-boundary measurement and additive per-pass diagnostic fields only",
  },
  comparisons,
};
fs.writeFileSync(path.join(outputRoot, "accepted-root-overlay-visual-equivalence.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(comparisons.map(({ filename, identicalPixelsPercent, meanAbsoluteChannelDifference, maximumChannelDifference }) => ({ filename, identicalPixelsPercent, meanAbsoluteChannelDifference, maximumChannelDifference })), null, 2)}\n`);
