import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../../../..");
const inventoryPath = path.join(here, "evidence-inventory.json");
const inventoryRepoPath = path.relative(root, inventoryPath).replaceAll(path.sep, "/");
const extraRepoPaths = [
  "yorayriniwnl.in/README.md",
  "yorayriniwnl.in/source-delivery-manifest.json",
];
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();

function walk(directory) {
  const results = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) results.push(...walk(fullPath));
    else if (entry.isFile() && fullPath !== inventoryPath) results.push(fullPath);
  }
  return results;
}

const repoPaths = [
  ...walk(here).map((fullPath) => path.relative(root, fullPath).replaceAll(path.sep, "/")),
  ...extraRepoPaths,
].sort();
const artifacts = repoPaths.map((repoPath) => {
  const fullPath = path.join(root, repoPath);
  const bytes = fs.readFileSync(fullPath);
  const gitBlob = git("rev-parse", `:${repoPath}`);
  return {
    path: repoPath,
    byteLength: bytes.length,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
    stagedGitBlob: gitBlob,
  };
});
const totalBytes = artifacts.reduce((sum, artifact) => sum + artifact.byteLength, 0);
const inventory = {
  schemaVersion: 1,
  sourceCommit: "bd01478617b4166866f3f44196c56fc5add94acd",
  scope: "PRE-G7-31 evidence plus yorayriniwnl.in README and source delivery manifest",
  inventoryExcludesItsOwnFile: true,
  artifactCount: artifacts.length,
  totalBytes,
  artifacts,
};

fs.writeFileSync(inventoryPath, `${JSON.stringify(inventory, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify({ artifactCount: inventory.artifactCount, totalBytes, output: inventoryRepoPath }, null, 2)}\n`);
