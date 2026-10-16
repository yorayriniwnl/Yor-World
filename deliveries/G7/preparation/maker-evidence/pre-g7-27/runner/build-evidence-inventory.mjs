import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { cwd: process.cwd(), encoding: "utf8" }).trim();
const evidenceRelative = "deliveries/G7/preparation/maker-evidence/pre-g7-27";
const evidenceRoot = path.join(root, ...evidenceRelative.split("/"));
const inventoryRelative = `${evidenceRelative}/source/evidence-inventory.json`;
const inventoryPath = path.join(root, ...inventoryRelative.split("/"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) return walk(absolute);
      return entry.isFile() ? [absolute] : [];
    })
    .sort();
}

const artifacts = walk(evidenceRoot)
  .filter((absolute) => path.relative(root, absolute).replaceAll("\\", "/") !== inventoryRelative)
  .map((absolute) => {
    const relative = path.relative(root, absolute).replaceAll("\\", "/");
    const bytes = fs.readFileSync(absolute);
    return { path: relative, bytes: bytes.byteLength, sha256: sha256(bytes) };
  });
const inventory = {
  schemaVersion: 1,
  packet: "PRE-G7-27",
  generatedAtUtc: new Date().toISOString(),
  selfExclusion: "source/evidence-inventory.json is excluded because an inventory cannot hash itself",
  artifactCount: artifacts.length,
  totalBytes: artifacts.reduce((total, artifact) => total + artifact.bytes, 0),
  artifacts,
};

fs.mkdirSync(path.dirname(inventoryPath), { recursive: true });
fs.writeFileSync(inventoryPath, `${JSON.stringify(inventory, null, 2)}\n`, "utf8");
process.stdout.write(`PRE-G7-27 inventory: ${artifacts.length} artifacts, ${inventory.totalBytes} bytes\n`);
