const fs = require("node:fs");
const path = require("node:path");
const sharp = require(require.resolve("sharp", { paths: [process.cwd()] }));

async function main() {
  const root = path.resolve(process.argv[2] ?? "../deliveries/G7/preparation/maker-evidence/pre-g7-13/attempt-14");
  const diagnostic = JSON.parse(fs.readFileSync(path.join(root, "measurements/compact-320x600-anchor-diagnostics.json"), "utf8"));
  const bar = diagnostic.snapshot.anchors.find((anchor) => anchor.name === "lightbar_emissive");
  const file = path.join(root, "screenshots/studio-reference-compact-320x600.png");
  const image = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const bounds = bar.pixelBounds;
  const left = Math.max(0, Math.floor(bounds.left));
  const top = Math.max(0, Math.floor(bounds.top));
  const right = Math.min(image.info.width, Math.ceil(bounds.right));
  const bottom = Math.min(image.info.height, Math.ceil(bounds.bottom));
  const colors = new Map();
  let warm = 0;
  let sampled = 0;
  let maxRed = 0;
  for (let y = top; y < bottom; y += 1) {
    for (let x = left; x < right; x += 1) {
      const offset = (y * image.info.width + x) * image.info.channels;
      const r = image.data[offset] ?? 0;
      const g = image.data[offset + 1] ?? 0;
      const b = image.data[offset + 2] ?? 0;
      sampled += 1;
      maxRed = Math.max(maxRed, r);
      if (r > 100 && g > 35 && r > g * 1.18 && g > b * 1.15) warm += 1;
      const rgb = `${r},${g},${b}`;
      colors.set(rgb, (colors.get(rgb) ?? 0) + 1);
    }
  }
  const topColors = [...colors.entries()].sort((leftColor, rightColor) => rightColor[1] - leftColor[1]).slice(0, 12);
  console.log(JSON.stringify({ file, image: image.info, bounds, sampledRegion: { left, top, right, bottom }, sampled, warm, maxRed, topColors }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
