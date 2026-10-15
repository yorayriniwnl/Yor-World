const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");

const evidenceRoot = __dirname;
const repoRoot = path.resolve(evidenceRoot, "..", "..", "..", "..", "..");
const inventoryPath = path.join(evidenceRoot, "evidence-inventory.json");
const inventoryRepoPath = path.relative(repoRoot, inventoryPath).replaceAll("\\", "/");
const expected = {
  branch: "codex/pre-g7-21-current-source-build-evidence-20261015",
  sourceCommit: "fc64a18a7ec1d027fb0a33400c2fcd6288d6afbf",
  sourceTree: "593f72ad5900dcfe8d5de0f0d0b2483dc8149709",
  appTree: "0804688e4cdd55960e71a19efc8384d4a2f0d071",
  parentPacketCommit: "a6fd3bf6c245aa7207a6373baf3236e2560c710c",
  scope: "deliveries/G7/preparation/maker-evidence/pre-g7-21/",
};
const externalPaths = [
  ["app/package.json", "application package scripts and dependency manifest, unchanged"],
  ["app/pnpm-lock.yaml", "frozen dependency lockfile, unchanged"],
  ["app/next.config.ts", "application configuration, unchanged"],
  ["app/tsconfig.json", "application TypeScript configuration, unchanged"],
  ["app/next-env.d.ts", "generated Next type reference, unchanged by build"],
  [
    "yorayriniwnl.in/source-delivery-manifest.json",
    "historical source-delivery provenance, unchanged",
  ],
];

function git(args) {
  return execFileSync("git", args, { cwd: repoRoot, encoding: "utf8" }).trimEnd();
}

function inspectFile(relativePath, committedPath = false) {
  const absolutePath = path.join(repoRoot, relativePath);
  const bytes = fs.readFileSync(absolutePath);
  return {
    path: relativePath.replaceAll("\\", "/"),
    bytes: bytes.byteLength,
    rawSha256: crypto.createHash("sha256").update(bytes).digest("hex"),
    gitBlob: committedPath
      ? git(["rev-parse", `HEAD:${relativePath}`])
      : git(["hash-object", "--no-filters", "--", relativePath]),
  };
}

function walk(relativeDirectory, files = []) {
  const absoluteDirectory = path.join(repoRoot, relativeDirectory);
  for (const item of fs.readdirSync(absoluteDirectory, { withFileTypes: true })) {
    const relativePath = path.posix.join(relativeDirectory, item.name);
    if (item.isSymbolicLink()) throw new Error(`Inventory contains a symlink: ${relativePath}`);
    if (item.isDirectory()) walk(relativePath, files);
    else if (item.isFile() && relativePath !== inventoryRepoPath) files.push(relativePath);
  }
  return files;
}

function collectInventory() {
  const files = walk(expected.scope.slice(0, -1)).sort((a, b) => a.localeCompare(b));
  const sourceIdentity = {
    branch: expected.branch,
    sourceCommit: expected.sourceCommit,
    sourceTree: expected.sourceTree,
    appTree: expected.appTree,
    parentPacketCommit: expected.parentPacketCommit,
  };
  return {
    schemaVersion: 1,
    packet: "PRE-G7-21",
    sourceIdentity,
    scope: expected.scope,
    entryCount: files.length,
    entries: files.map((relativePath) => inspectFile(relativePath)),
    externalChecks: externalPaths.map(([relativePath, classification]) => ({
      ...inspectFile(relativePath, true),
      classification,
    })),
    selfReference: {
      path: inventoryRepoPath,
      excludedFromEntries: true,
      reason: "A file cannot contain its own final raw hash and Git blob without recursion.",
    },
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function verifyInventory(inventory) {
  assert(inventory.schemaVersion === 1, "Unexpected schemaVersion");
  assert(inventory.packet === "PRE-G7-21", "Unexpected packet name");
  assert(inventory.scope === expected.scope, "Unexpected evidence scope");
  assert(inventory.sourceIdentity.branch === expected.branch, "Unexpected branch identity");
  assert(inventory.sourceIdentity.sourceCommit === expected.sourceCommit, "Unexpected source commit");
  assert(inventory.sourceIdentity.sourceTree === expected.sourceTree, "Unexpected source tree");
  assert(inventory.sourceIdentity.appTree === expected.appTree, "Unexpected app tree");
  assert(
    inventory.sourceIdentity.parentPacketCommit === expected.parentPacketCommit,
    "Unexpected parent packet commit",
  );
  assert(git(["branch", "--show-current"]) === expected.branch, "Checked out branch changed");
  assert(git(["rev-parse", `${expected.sourceCommit}^{tree}`]) === expected.sourceTree, "Source tree mismatch");
  assert(git(["rev-parse", `${expected.sourceCommit}:app`]) === expected.appTree, "Source app tree mismatch");
  assert(git(["rev-parse", "HEAD:app"]) === expected.appTree, "Current HEAD app tree changed");
  execFileSync("git", ["cat-file", "-e", `${expected.parentPacketCommit}^{commit}`], { cwd: repoRoot });

  assert(Array.isArray(inventory.entries), "entries must be an array");
  assert(inventory.entryCount === inventory.entries.length, "entryCount does not match entries length");
  const seen = new Set();
  for (const entry of inventory.entries) {
    assert(entry.path.startsWith(expected.scope), `Entry outside owned scope: ${entry.path}`);
    assert(!entry.path.includes("\\"), `Inventory path must use forward slashes: ${entry.path}`);
    assert(!entry.path.split("/").includes(".."), `Traversal path is not allowed: ${entry.path}`);
    assert(entry.path !== inventoryRepoPath, "Inventory may not list itself");
    assert(!seen.has(entry.path), `Duplicate entry: ${entry.path}`);
    seen.add(entry.path);
    const actual = inspectFile(entry.path);
    assert(actual.bytes === entry.bytes, `Byte size mismatch: ${entry.path}`);
    assert(actual.rawSha256 === entry.rawSha256, `Raw SHA-256 mismatch: ${entry.path}`);
    assert(actual.gitBlob === entry.gitBlob, `Git blob mismatch: ${entry.path}`);
    const committedBlob = git(["rev-parse", `HEAD:${entry.path}`]);
    assert(committedBlob === entry.gitBlob, `Committed Git blob mismatch: ${entry.path}`);
  }

  assert(Array.isArray(inventory.externalChecks), "externalChecks must be an array");
  assert(inventory.externalChecks.length === externalPaths.length, "Unexpected external check count");
  for (let index = 0; index < externalPaths.length; index += 1) {
    const [relativePath, classification] = externalPaths[index];
    const entry = inventory.externalChecks[index];
    assert(entry.path === relativePath, `Unexpected external check at index ${index}`);
    assert(entry.classification === classification, `Unexpected classification for ${relativePath}`);
    const actual = inspectFile(relativePath, true);
    assert(actual.bytes === entry.bytes, `External byte size mismatch: ${relativePath}`);
    assert(actual.rawSha256 === entry.rawSha256, `External raw SHA-256 mismatch: ${relativePath}`);
    assert(actual.gitBlob === entry.gitBlob, `External Git blob mismatch: ${relativePath}`);
    assert(git(["rev-parse", `HEAD:${relativePath}`]) === entry.gitBlob, `External committed blob mismatch: ${relativePath}`);
  }

  assert(inventory.selfReference.path === inventoryRepoPath, "Incorrect inventory self-reference path");
  assert(inventory.selfReference.excludedFromEntries === true, "Inventory self-reference must be excluded");
  assert(fs.existsSync(inventoryPath), "Inventory file is missing");
}

const writeMode = process.argv[2] === "--write";
assert(process.argv.length === (writeMode ? 3 : 2), "Usage: validate-evidence-inventory.cjs [--write]");

if (writeMode) {
  const inventory = collectInventory();
  fs.writeFileSync(inventoryPath, `${JSON.stringify(inventory, null, 2)}\n`, "utf8");
} else {
  const inventory = JSON.parse(fs.readFileSync(inventoryPath, "utf8"));
  verifyInventory(inventory);
  const inventoryBytes = fs.readFileSync(inventoryPath);
  const inventoryBlob = git(["hash-object", "--no-filters", "--", inventoryRepoPath]);
  const committedInventoryBlob = git(["rev-parse", `HEAD:${inventoryRepoPath}`]);
  assert(inventoryBlob === committedInventoryBlob, "Committed inventory Git blob mismatch");
  process.stdout.write(
    `${JSON.stringify({
      result: "PASS",
      packet: inventory.packet,
      entryCount: inventory.entryCount,
      externalCheckCount: inventory.externalChecks.length,
      inventoryBytes: inventoryBytes.byteLength,
      inventoryRawSha256: crypto.createHash("sha256").update(inventoryBytes).digest("hex"),
      inventoryGitBlob: inventoryBlob,
      committedHead: git(["rev-parse", "HEAD"]),
    }, null, 2)}\n`,
  );
}
