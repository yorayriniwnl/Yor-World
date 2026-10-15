const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");

const evidenceRoot = __dirname;
const repoRoot = path.resolve(evidenceRoot, "../../../../..");
const inventoryPath = path.join(evidenceRoot, "evidence-inventory.json");
const inventoryRepoPath = path.relative(repoRoot, inventoryPath).replace(/\\/g, "/");
const evidencePrefix = "deliveries/G7/preparation/maker-evidence/pre-g7-20/";
const candidateCommit = "fc64a18a7ec1d027fb0a33400c2fcd6288d6afbf";
const expectedSourceTree = "593f72ad5900dcfe8d5de0f0d0b2483dc8149709";
const expectedAppTree = "0804688e4cdd55960e71a19efc8384d4a2f0d071";
const parentPacketCommit = "046d1a806f9860d7c5165ae3edfe91b6d2aed288";
const protectedPaths = [
  { path: "app/package.json", classification: "application package scripts and dependency manifest, unchanged" },
  { path: "app/pnpm-lock.yaml", classification: "frozen dependency lockfile, unchanged" },
  { path: "yorayriniwnl.in/source-delivery-manifest.json", classification: "historical PRE-G7-13 provenance, unchanged" },
];
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const git = (args) => {
  const result = spawnSync("git", args, { cwd: repoRoot, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || `git ${args.join(" ")} failed`);
  return result.stdout.trim();
};
const gitBlob = (repoPath) => git(["hash-object", `--path=${repoPath}`, "--", repoPath]);
const indexBlob = (repoPath) => {
  const result = spawnSync("git", ["rev-parse", `:${repoPath}`], { cwd: repoRoot, encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : null;
};
const headBlob = (repoPath) => {
  const result = spawnSync("git", ["rev-parse", `HEAD:${repoPath}`], { cwd: repoRoot, encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : null;
};
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(evidenceRoot, relativePath), "utf8"));

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : entry.isFile() ? [full] : [];
  });
}

function recordFor(repoPath) {
  const bytes = fs.readFileSync(path.join(repoRoot, repoPath));
  return { path: repoPath, bytes: bytes.length, rawSha256: sha256(bytes), gitBlob: gitBlob(repoPath) };
}

const expectedIdentity = {
  branch: git(["branch", "--show-current"]),
  sourceCommit: candidateCommit,
  sourceTree: git(["rev-parse", `${candidateCommit}^{tree}`]),
  appTree: git(["rev-parse", `${candidateCommit}:app`]),
  parentPacketCommit,
};

if (process.argv.includes("--write")) {
  const entries = walk(evidenceRoot)
    .filter((full) => path.resolve(full) !== path.resolve(inventoryPath))
    .map((full) => path.relative(repoRoot, full).replace(/\\/g, "/"))
    .sort()
    .map(recordFor);
  const externalChecks = protectedPaths.map((item) => ({
    ...recordFor(item.path),
    classification: item.classification,
  }));
  const inventory = {
    schemaVersion: 1,
    packet: "PRE-G7-20",
    sourceIdentity: expectedIdentity,
    scope: evidencePrefix,
    entryCount: entries.length,
    entries,
    externalChecks,
    selfReference: {
      path: inventoryRepoPath,
      excludedFromEntries: true,
      reason: "A file cannot contain its own final content hash without a recursive reference.",
    },
  };
  fs.writeFileSync(inventoryPath, `${JSON.stringify(inventory, null, 2)}\n`, "utf8");
}

const inventory = readJson("evidence-inventory.json");
const errors = [];
const actualPaths = walk(evidenceRoot)
  .filter((full) => path.resolve(full) !== path.resolve(inventoryPath))
  .map((full) => path.relative(repoRoot, full).replace(/\\/g, "/"))
  .sort();
const inventoryPaths = inventory.entries.map((entry) => entry.path).sort();
if (JSON.stringify(actualPaths) !== JSON.stringify(inventoryPaths)) errors.push("inventory path set differs from evidence files");
if (inventory.entryCount !== inventory.entries.length) errors.push("inventory entryCount mismatch");
if (JSON.stringify(inventory.sourceIdentity) !== JSON.stringify(expectedIdentity)) errors.push("source identity mismatch");
if (inventory.packet !== "PRE-G7-20" || inventory.scope !== evidencePrefix) errors.push("packet/scope mismatch");
if (inventory.selfReference?.path !== inventoryRepoPath || inventory.selfReference?.excludedFromEntries !== true) errors.push("inventory self-exclusion mismatch");

for (const entry of inventory.entries) {
  try {
    const actual = recordFor(entry.path);
    for (const field of ["bytes", "rawSha256", "gitBlob"]) if (actual[field] !== entry[field]) errors.push(`${entry.path}: ${field} mismatch`);
    const staged = indexBlob(entry.path);
    if (staged !== null && staged !== entry.gitBlob) errors.push(`${entry.path}: staged index blob mismatch`);
    const committed = headBlob(entry.path);
    if (committed !== null && committed !== entry.gitBlob) errors.push(`${entry.path}: committed HEAD blob mismatch`);
  } catch (error) {
    errors.push(`${entry.path}: ${String(error)}`);
  }
}

for (const protectedFile of protectedPaths) {
  const expected = inventory.externalChecks?.find((entry) => entry.path === protectedFile.path);
  if (!expected) {
    errors.push(`external check missing: ${protectedFile.path}`);
    continue;
  }
  try {
    const actual = recordFor(protectedFile.path);
    for (const field of ["bytes", "rawSha256", "gitBlob"]) if (actual[field] !== expected[field]) errors.push(`${protectedFile.path}: ${field} mismatch`);
    if (actual.gitBlob !== headBlob(protectedFile.path)) errors.push(`${protectedFile.path}: HEAD blob mismatch`);
  } catch (error) {
    errors.push(`${protectedFile.path}: ${String(error)}`);
  }
}

if (expectedIdentity.sourceCommit !== candidateCommit || expectedIdentity.sourceTree !== expectedSourceTree || expectedIdentity.appTree !== expectedAppTree) {
  errors.push("packet source identity constants do not resolve to the authorized base");
}
if (git(["cat-file", "-t", parentPacketCommit]) !== "commit") errors.push("authorizing parent packet commit is unavailable");
if (git(["rev-parse", "HEAD:app"]) !== expectedAppTree) errors.push("current HEAD app tree differs from authorized source");
const committedPaths = git(["diff", "--name-only", candidateCommit, "HEAD"]).split(/\r?\n/).filter(Boolean);
if (committedPaths.some((repoPath) => !repoPath.startsWith(evidencePrefix))) errors.push("committed delta contains a path outside the evidence scope");
const status = git(["status", "--porcelain", "--untracked-files=all"]).split(/\r?\n/).filter(Boolean);
if (status.some((line) => !line.slice(3).startsWith(evidencePrefix))) errors.push("worktree contains a change outside the evidence scope");
const appDiff = spawnSync("git", ["diff", "--quiet", "HEAD", "--", "app"], { cwd: repoRoot });
if (appDiff.status !== 0) errors.push("tracked app tree is modified in the worktree");

for (const statePath of ["source-state-before.json", "source-state-before-gates.json", "source-state-after-gates.json"]) {
  try {
    const state = readJson(statePath);
    if (state.headCommit !== candidateCommit || state.sourceTree !== expectedSourceTree || state.appTree !== expectedAppTree) errors.push(`${statePath}: source identity changed`);
    if (!state.sourceIdentityMatchesPacket || !state.trackedAppDiffEmpty || !state.onlyEvidencePathChanges) errors.push(`${statePath}: source cleanliness check failed`);
  } catch (error) {
    errors.push(`${statePath}: ${String(error)}`);
  }
}

const install = readJson("setup/install-run.json");
if (install.exitCode !== 0 || install.node !== "v24.19.0" || install.pnpmVersion !== "9.15.9") errors.push("pinned frozen install receipt failed/mismatched");
const lint = readJson("lint/lint-run.json");
const typecheck = readJson("typecheck/typecheck-run.json");
const quality = readJson("quality-run-summary.json");
for (const [receipt, command] of [[lint, "pnpm run lint"], [typecheck, "pnpm run typecheck"]]) {
  if (receipt.command !== command || receipt.exitCode !== 0 || receipt.node !== "v24.19.0" || receipt.resolvedChildNode !== "v24.19.0" || receipt.pnpmVersion !== "9.15.9") errors.push(`${command}: receipt does not show exact pinned PASS`);
}
if (quality.gates?.length !== 2 || quality.gates[0]?.command !== "pnpm run lint" || quality.gates[1]?.command !== "pnpm run typecheck" || !quality.appTrackedDiffEmpty) {
  errors.push("quality summary is missing ordered exact gates or reports a tracked app change");
}

for (const entry of inventory.entries) {
  if (entry.path.toLowerCase().endsWith(".json")) {
    try { JSON.parse(fs.readFileSync(path.join(repoRoot, entry.path), "utf8")); }
    catch (error) { errors.push(`${entry.path}: strict JSON parse failed: ${String(error)}`); }
  }
  if (entry.path.toLowerCase().endsWith(".jsonl")) {
    try {
      fs.readFileSync(path.join(repoRoot, entry.path), "utf8").split(/\r?\n/).filter(Boolean).forEach((line, index) => {
        try { JSON.parse(line); } catch (error) { errors.push(`${entry.path}:${index + 1}: strict JSONL parse failed: ${String(error)}`); }
      });
    } catch (error) { errors.push(`${entry.path}: JSONL read failed: ${String(error)}`); }
  }
}

const result = {
  packet: "PRE-G7-20",
  mode: process.argv.includes("--write") ? "write-and-validate" : "validate",
  sourceIdentity: expectedIdentity,
  evidenceEntryCount: inventory.entries.length,
  stagedEntryBlobChecks: "performed when present",
  committedEntryBlobChecks: "performed when present",
  exactQualityCommands: [lint.command, typecheck.command],
  protectedFiles: inventory.externalChecks.map((entry) => ({ path: entry.path, gitBlob: entry.gitBlob })),
  strictJsonAndJsonl: "checked",
  errors,
  outcome: errors.length === 0 ? "PASS" : "FAIL",
};
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (errors.length > 0) process.exitCode = 1;
