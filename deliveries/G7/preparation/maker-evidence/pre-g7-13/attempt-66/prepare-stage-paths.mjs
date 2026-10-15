import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const evidenceRoot = path.join(repoRoot, "deliveries/G7/preparation/maker-evidence/pre-g7-13");
const inventory = JSON.parse(await readFile(path.join(evidenceRoot, "final-checksums.json"), "utf8"));
const paths = new Set();
for (const entry of inventory.files) {
  const absolute = path.resolve(evidenceRoot, entry.path);
  await access(absolute);
  paths.add(path.relative(repoRoot, absolute).split(path.sep).join("/"));
}
paths.add("deliveries/G7/preparation/maker-evidence/pre-g7-13/final-checksums.json");
const listPath = path.join(process.env.TEMP ?? process.env.TMP ?? "C:/Users/ayush/AppData/Local/Temp", "pre-g7-13-final-stage-paths.nul");
await writeFile(listPath, Buffer.from(`${[...paths].sort().join("\0")}\0`));
console.log(JSON.stringify({ inventoryPaths: inventory.files.length, gitPathspecCount: paths.size, pathspecList: listPath }, null, 2));
