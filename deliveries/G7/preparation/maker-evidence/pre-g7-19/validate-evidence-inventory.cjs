const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");

const evidenceRoot = __dirname;
const repoRoot = path.resolve(evidenceRoot, "../../../../..");
const inventoryPath = path.join(evidenceRoot, "evidence-inventory.json");
const inventoryRepoPath = path.relative(repoRoot, inventoryPath).replace(/\\/g, "/");
const manifestRepoPath = "yorayriniwnl.in/source-delivery-manifest.json";
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const gitBlob = (repoPath) => {
  const result = spawnSync("git", ["hash-object", `--path=${repoPath}`, "--", repoPath], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  if (result.status !== 0) throw new Error(result.stderr || `git hash-object failed: ${repoPath}`);
  return result.stdout.trim();
};
const gitOutput = (args) => {
  const result = spawnSync("git", args, { cwd: repoRoot, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || `git ${args.join(" ")} failed`);
  return result.stdout.trim();
};
const gitIndexBlob = (repoPath) => {
  const result = spawnSync("git", ["rev-parse", `:${repoPath}`], { cwd: repoRoot, encoding: "utf8" });
  if (result.status !== 0) return null;
  return result.stdout.trim();
};

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : entry.isFile() ? [full] : [];
  });
}

function recordFor(repoPath) {
  const bytes = fs.readFileSync(path.join(repoRoot, repoPath));
  return {
    path: repoPath,
    bytes: bytes.length,
    rawSha256: sha256(bytes),
    gitBlob: gitBlob(repoPath),
  };
}

const base = {
  schemaVersion: 1,
  packet: "PRE-G7-19",
  sourceIdentity: {
    branch: gitOutput(["branch", "--show-current"]),
    commit: gitOutput(["rev-parse", "HEAD"]),
    sourceTree: gitOutput(["rev-parse", "HEAD^{tree}"]),
    appTree: gitOutput(["rev-parse", "HEAD:app"]),
  },
  scope: "deliveries/G7/preparation/maker-evidence/pre-g7-19/",
};

if (process.argv.includes("--write")) {
  const paths = walk(evidenceRoot)
    .filter((full) => path.resolve(full) !== path.resolve(inventoryPath))
    .map((full) => path.relative(repoRoot, full).replace(/\\/g, "/"))
    .sort();
  const entries = paths.map(recordFor);
  const external = recordFor(manifestRepoPath);
  Object.assign(external, {
    classification: "unchanged historical PRE-G7-13 source-delivery provenance; not bound to the PRE-G7-19 candidate",
  });
  const inventory = {
    ...base,
    entryCount: entries.length,
    entries,
    externalChecks: [external],
    selfReference: {
      path: inventoryRepoPath,
      excludedFromEntries: true,
      reason: "A file cannot contain its own final content hash without a recursive reference.",
    },
  };
  fs.writeFileSync(inventoryPath, `${JSON.stringify(inventory, null, 2)}\n`, "utf8");
}

const inventory = JSON.parse(fs.readFileSync(inventoryPath, "utf8"));
const errors = [];
const actualPaths = walk(evidenceRoot)
  .filter((full) => path.resolve(full) !== path.resolve(inventoryPath))
  .map((full) => path.relative(repoRoot, full).replace(/\\/g, "/"))
  .sort();
const inventoryPaths = inventory.entries.map((entry) => entry.path).sort();
let checkedIndexBlobs = 0;
if (JSON.stringify(actualPaths) !== JSON.stringify(inventoryPaths)) {
  errors.push("inventory entry path set differs from files under evidence scope");
}
if (inventory.entryCount !== inventory.entries.length) errors.push("entryCount mismatch");
if (JSON.stringify(inventory.sourceIdentity) !== JSON.stringify(base.sourceIdentity)) errors.push("source identity mismatch");
if (inventory.packet !== "PRE-G7-19") errors.push("wrong packet identity");
if (inventory.selfReference?.path !== inventoryRepoPath || inventory.selfReference?.excludedFromEntries !== true) {
  errors.push("self-reference exclusion mismatch");
}

for (const entry of inventory.entries) {
  try {
    const actual = recordFor(entry.path);
    for (const field of ["bytes", "rawSha256", "gitBlob"]) {
      if (actual[field] !== entry[field]) errors.push(`${entry.path}: ${field} mismatch`);
    }
    const indexBlob = gitIndexBlob(entry.path);
    if (indexBlob !== null) {
      checkedIndexBlobs += 1;
      if (indexBlob !== entry.gitBlob) errors.push(`${entry.path}: staged index blob mismatch`);
    }
  } catch (error) {
    errors.push(`${entry.path}: ${String(error)}`);
  }
}

const manifest = inventory.externalChecks?.find((entry) => entry.path === manifestRepoPath);
if (!manifest) {
  errors.push("historical source-delivery manifest external check is missing");
} else {
  try {
    const actual = recordFor(manifestRepoPath);
    for (const field of ["bytes", "rawSha256", "gitBlob"]) {
      if (actual[field] !== manifest[field]) errors.push(`${manifestRepoPath}: ${field} mismatch`);
    }
    if (actual.gitBlob !== "a4a117eacc9ccecf5584a67c11be034723c143a8") errors.push("historical manifest Git blob changed");
    if (actual.rawSha256 !== "2af6525d70510f4d3074dd95d48d762365f1b038bbac25db010f6da4f6155f06") errors.push("historical manifest raw hash changed");
  } catch (error) {
    errors.push(`${manifestRepoPath}: ${String(error)}`);
  }
}

const baseCommit = "fc64a18a7ec1d027fb0a33400c2fcd6288d6afbf";
if (base.sourceIdentity.commit !== baseCommit) errors.push("candidate commit is not the packet source base; no source delta was expected");
const expectedAppTree = "0804688e4cdd55960e71a19efc8384d4a2f0d071";
if (base.sourceIdentity.appTree !== expectedAppTree) errors.push("candidate app tree differs from the packet source base");
const sourceTestPaths = ["app/tests/unit/boundaries.test.ts", "yorayriniwnl.in/tests/unit/boundaries.test.ts"];
const sourceTestBlobs = sourceTestPaths.map((sourcePath) => gitBlob(sourcePath));
if (sourceTestBlobs[0] !== "c2353be846e7c34d2e0d7305f6240245db7f9078" || sourceTestBlobs[0] !== sourceTestBlobs[1]) {
  errors.push("source test and mirror blobs do not match the accepted base pair");
}
const pathSetPath = path.join(evidenceRoot, "profiles/source-path-set.json");
try {
  const pathSet = JSON.parse(fs.readFileSync(pathSetPath, "utf8"));
  if (pathSet.count !== 117 || pathSet.sortedPathSetSha256 !== "41a41d3c89d684a322f5e81ae46ac472f06673f03e61f98d7f0ffa8e65a547e3") {
    errors.push("saved source path-set count/hash differs from PRE-G7-17");
  }
  if (pathSet.traversalPathListSha256 !== "d02064134564b5d071c611aa09d9457d87499b3ecaa41bbf3ecc5bfcc6975294") {
    errors.push("saved source traversal-path hash differs from PRE-G7-18");
  }
} catch (error) {
  errors.push(`saved source path-set result could not be read: ${String(error)}`);
}
for (const entry of inventory.entries) {
  if (entry.path.toLowerCase().endsWith(".json")) {
    try {
      JSON.parse(fs.readFileSync(path.join(repoRoot, entry.path), "utf8"));
    } catch (error) {
      errors.push(`${entry.path}: strict JSON parse failed: ${String(error)}`);
    }
  }
  if (entry.path.toLowerCase().endsWith(".jsonl")) {
    try {
      const content = fs.readFileSync(path.join(repoRoot, entry.path), "utf8");
      content.split(/\r?\n/).filter(Boolean).forEach((line, index) => {
        try { JSON.parse(line); } catch (error) { errors.push(`${entry.path}:${index + 1}: strict JSONL parse failed: ${String(error)}`); }
      });
    } catch (error) {
      errors.push(`${entry.path}: JSONL read failed: ${String(error)}`);
    }
  }
}

const result = {
  packet: "PRE-G7-19",
  mode: process.argv.includes("--write") ? "write-and-validate" : "validate",
  sourceIdentity: base.sourceIdentity,
  evidenceEntryCount: inventory.entries.length,
  stagedIndexBlobCount: checkedIndexBlobs,
  protectedSource: { appTree: base.sourceIdentity.appTree, testAndMirrorBlob: sourceTestBlobs[0], pathCount: 117 },
  strictJsonAndJsonl: "checked",
  manifest: { path: manifestRepoPath, gitBlob: manifest?.gitBlob, unchanged: errors.every((e) => !e.includes("manifest")) },
  errors,
  outcome: errors.length === 0 ? "PASS" : "FAIL",
};
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (errors.length > 0) process.exitCode = 1;
