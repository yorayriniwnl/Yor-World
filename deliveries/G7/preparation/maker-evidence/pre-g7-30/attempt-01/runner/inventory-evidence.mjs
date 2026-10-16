import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { lstatSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const repositoryRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], {
  encoding: "utf8",
}).trim();
const evidenceRoot = path.resolve(process.argv[2] || "");
const outputPath = path.join(evidenceRoot, "evidence-inventory.json");
const relativeRoot = path.relative(repositoryRoot, evidenceRoot).split(path.sep).join("/");
const artifacts = [];

function walk(directory) {
  for (const name of readdirSync(directory).sort((a, b) => a.localeCompare(b, "en"))) {
    const absolute = path.join(directory, name);
    const stat = lstatSync(absolute);
    if (stat.isDirectory()) {
      walk(absolute);
      continue;
    }
    if (!stat.isFile()) throw new Error(`Unsupported evidence entry: ${absolute}`);
    if (absolute === outputPath) continue;
    const bytes = readFileSync(absolute);
    const relative = path.relative(repositoryRoot, absolute).split(path.sep).join("/");
    const gitBlob = execFileSync("git", ["hash-object", absolute], {
      cwd: repositoryRoot,
      encoding: "utf8",
    }).trim();
    artifacts.push({
      path: relative.slice(relativeRoot.length + 1),
      bytes: bytes.byteLength,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      gitBlob,
    });
  }
}

walk(evidenceRoot);
artifacts.sort((a, b) => a.path.localeCompare(b.path, "en"));
const canonical = artifacts
  .map(item => [item.path, item.bytes, item.sha256, item.gitBlob].join("\0"))
  .join("\n") + "\n";
const inventory = {
  schemaVersion: 1,
  packet: "PRE-G7-30",
  generatedAtUtc: new Date().toISOString(),
  root: relativeRoot,
  selfExclusion: "evidence-inventory.json excludes itself because an inventory cannot hash itself",
  artifactCount: artifacts.length,
  totalBytes: artifacts.reduce((total, item) => total + item.bytes, 0),
  canonicalInventorySha256: createHash("sha256").update(canonical).digest("hex"),
  artifacts,
};
writeFileSync(outputPath, `${JSON.stringify(inventory, null, 2)}\n`, "utf8");
process.stdout.write(JSON.stringify({
  packet: inventory.packet,
  artifactCount: inventory.artifactCount,
  totalBytes: inventory.totalBytes,
  canonicalInventorySha256: inventory.canonicalInventorySha256,
  outputPath,
}, null, 2) + "\n");
