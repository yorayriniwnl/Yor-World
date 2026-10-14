import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = path.resolve(here, "..", "attempt-49", "measurements");
const result = [];
for (const label of ["desktop-1440x900", "mobile-390x844"]) {
  const snapshot = JSON.parse(await readFile(path.join(source, `${label}-projected-anchor-snapshot.json`), "utf8"));
  const plant = snapshot.anchors.find((anchor) => anchor.name === "plants");
  const parts = plant.descendantBounds.filter((part) =>
    part.name.startsWith("monstera_leaf_") || part.name === "pot_monstera" || part.name.startsWith("monstera_stand_leg_"),
  );
  const leaves = parts.filter((part) => part.name.startsWith("monstera_leaf_"));
  const pot = parts.find((part) => part.name === "pot_monstera");
  const foliage = {
    left: Math.min(...leaves.map((part) => part.pixelBounds.left)),
    right: Math.max(...leaves.map((part) => part.pixelBounds.right)),
    top: Math.min(...leaves.map((part) => part.pixelBounds.top)),
    bottom: Math.max(...leaves.map((part) => part.pixelBounds.bottom)),
  };
  result.push({
    label,
    parts,
    foliageEnvelope: foliage,
    pot: pot ? pot.pixelBounds : null,
    verticalGapPx: pot ? Math.max(0, pot.pixelBounds.top - foliage.bottom) : null,
    horizontalOverlapPx: pot ? Math.max(0, Math.min(foliage.right, pot.pixelBounds.right) - Math.max(foliage.left, pot.pixelBounds.left)) : null,
  });
}
await writeFile(path.join(here, "plant-baseline.json"), `${JSON.stringify(result, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
