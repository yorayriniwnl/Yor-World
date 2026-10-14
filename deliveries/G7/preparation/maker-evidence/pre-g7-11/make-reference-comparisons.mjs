import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const evidenceRoot = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(evidenceRoot, "../../../../..");
const appRoot = path.join(repositoryRoot, "app");
const requireFromApp = createRequire(path.join(appRoot, "package.json"));
const sharp = requireFromApp("sharp");
const referencePath = path.join(repositoryRoot, "references/images/main-reference.png");
const desktopPath = path.join(evidenceRoot, "screenshots/studio-desktop-1440x900.png");
const mobilePath = path.join(evidenceRoot, "screenshots/studio-mobile-390x844.png");
const outputDirectory = path.join(evidenceRoot, "screenshots");
const referenceBytes = readFileSync(referencePath);

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function heading(label, width) {
  const escaped = label.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  const fontSize = width < 350 ? 13 : 18;
  return Buffer.from(`<svg width="${width}" height="48" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#10151e"/><text x="12" y="30" fill="#f5f7ff" font-family="Arial,sans-serif" font-size="${fontSize}" font-weight="700">${escaped}</text></svg>`);
}

async function saveComparison({ name, screenshotPath, screenshotLabel, screenshotHeight, referenceHeight }) {
  const reference = await sharp(referenceBytes).resize({ height: referenceHeight, fit: "inside" }).png().toBuffer();
  const screenshotBytes = readFileSync(screenshotPath);
  const screenshot = await sharp(screenshotBytes).resize({ height: screenshotHeight, fit: "inside" }).png().toBuffer();
  const referenceMetadata = await sharp(reference).metadata();
  const screenshotMetadata = await sharp(screenshot).metadata();
  const gutter = 28;
  const top = 60;
  const columnWidths = [referenceMetadata.width, screenshotMetadata.width];
  const width = columnWidths[0] + gutter + columnWidths[1];
  const height = top + Math.max(referenceMetadata.height, screenshotMetadata.height) + 16;
  const outputPath = path.join(outputDirectory, name);
  const referenceLeft = 0;
  const screenshotLeft = columnWidths[0] + gutter;
  const referenceTop = top + Math.floor((height - top - 16 - referenceMetadata.height) / 2);
  const screenshotTop = top + Math.floor((height - top - 16 - screenshotMetadata.height) / 2);

  await sharp({ create: { width, height, channels: 4, background: "#10151e" } })
    .composite([
      { input: heading("MAIN REFERENCE · references/images/main-reference.png", columnWidths[0]), left: referenceLeft, top: 0 },
      { input: heading(screenshotLabel, columnWidths[1]), left: screenshotLeft, top: 0 },
      { input: reference, left: referenceLeft, top: referenceTop },
      { input: screenshot, left: screenshotLeft, top: screenshotTop },
    ])
    .png()
    .toFile(outputPath);

  return {
    output: path.relative(repositoryRoot, outputPath).replaceAll("\\", "/"),
    width,
    height,
    reference: {
      path: "references/images/main-reference.png",
      sha256: sha256(referenceBytes),
      resizedWidth: referenceMetadata.width,
      resizedHeight: referenceMetadata.height,
    },
    screenshot: {
      path: path.relative(repositoryRoot, screenshotPath).replaceAll("\\", "/"),
      sha256: sha256(screenshotBytes),
      resizedWidth: screenshotMetadata.width,
      resizedHeight: screenshotMetadata.height,
    },
  };
}

const comparisons = [
  await saveComparison({
    name: "reference-comparison-desktop.png",
    screenshotPath: desktopPath,
    screenshotLabel: "LIVE 3D STUDIO · Chrome · 1440×900",
    screenshotHeight: 480,
    referenceHeight: 480,
  }),
  await saveComparison({
    name: "reference-comparison-mobile.png",
    screenshotPath: mobilePath,
    screenshotLabel: "LIVE STUDIO · 390×844",
    screenshotHeight: 480,
    referenceHeight: 480,
  }),
];

writeFileSync(
  path.join(evidenceRoot, "reference-comparisons.json"),
  `${JSON.stringify({ source: "production-build browser captures; main reference is unmodified before display scaling", comparisons }, null, 2)}\n`,
  "utf8",
);
process.stdout.write(`${JSON.stringify(comparisons, null, 2)}\n`);
