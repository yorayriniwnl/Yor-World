import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const repositoryRoot = process.cwd();
const evidenceRoot = "deliveries/G7/preparation/maker-evidence/pre-g7-22";
const inventoryRelativePath = evidenceRoot + "/delta-07/delta-evidence-inventory.json";
const evidenceAbsolutePath = path.resolve(repositoryRoot, evidenceRoot);
const stagedListing = execFileSync("git", ["ls-files", "--stage", "--", evidenceRoot], { encoding: "utf8" });
const stagedOids = new Map();
for (const line of stagedListing.split(/\r?\n/)) {
  if (!line) continue;
  const tab = line.indexOf("\t");
  if (tab < 0) throw new Error("Unexpected git ls-files --stage row: " + line);
  const metadata = line.slice(0, tab).split(" ");
  const stagedPath = line.slice(tab + 1).replaceAll("\\", "/");
  stagedOids.set(stagedPath, { mode: metadata[0], oid: metadata[1] });
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name))
    .flatMap((entry) => {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) return walk(absolute);
      if (!entry.isFile()) throw new Error("Unexpected non-file evidence artifact: " + absolute);
      return [absolute];
    });
}

const entries = walk(evidenceAbsolutePath)
  .map((absolute) => {
    const relativePath = path.relative(repositoryRoot, absolute).split(path.sep).join("/");
    if (relativePath === inventoryRelativePath) return null;
    const bytes = fs.readFileSync(absolute);
    const staged = stagedOids.get(relativePath);
    if (!staged) throw new Error("Evidence file must be staged before inventory generation: " + relativePath);
    return {
      path: relativePath.slice((evidenceRoot + "/").length),
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      gitBlob: staged.oid,
      gitMode: staged.mode,
    };
  })
  .filter(Boolean)
  .sort((left, right) => left.path.localeCompare(right.path));

const inventory = {
  schemaVersion: 1,
  root: evidenceRoot + "/",
  sourceCommit: "7b63604979db4426d334b16f049bd1be3b84f16e",
  sourceTree: "46ece6472248ee768418d4030e52022932605873",
  appTree: "8ef938d8fbfb048b6f98020819b5fb9997e3c3c0",
  bindingCommit: "97fa25769eb46c12347bbc0cb37bc98ec79667cb",
  inventoryExclusion: "delta-07/delta-evidence-inventory.json (self-reference is impossible; all other evidence files are listed)",
  entryCount: entries.length,
  entries,
};
fs.writeFileSync(path.resolve(repositoryRoot, inventoryRelativePath), JSON.stringify(inventory, null, 2) + "\n", "utf8");
process.stdout.write("Inventory entries: " + entries.length + "\n");
