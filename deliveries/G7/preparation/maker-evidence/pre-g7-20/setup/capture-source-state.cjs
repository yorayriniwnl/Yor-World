const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");

const evidenceRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(evidenceRoot, "../../../../..");
const expectedCommit = "fc64a18a7ec1d027fb0a33400c2fcd6288d6afbf";
const expectedAppTree = "0804688e4cdd55960e71a19efc8384d4a2f0d071";
const manifestPath = "yorayriniwnl.in/source-delivery-manifest.json";
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

function git(args) {
  const result = spawnSync("git", args, { cwd: repoRoot, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || `git ${args.join(" ")} failed`);
  return result.stdout.trim();
}

function trackedFile(filePath) {
  const bytes = fs.readFileSync(path.join(repoRoot, filePath));
  return {
    path: filePath,
    bytes: bytes.length,
    rawSha256: sha256(bytes),
    worktreeGitBlob: git(["hash-object", "--path=" + filePath, "--", filePath]),
    headGitBlob: git(["rev-parse", `HEAD:${filePath}`]),
  };
}

const statusLines = git(["status", "--porcelain", "--untracked-files=all"]).split(/\r?\n/).filter(Boolean);
const changed = statusLines.map((line) => ({ code: line.slice(0, 2), path: line.slice(3) }));
const outsideEvidence = changed.filter((item) => !item.path.startsWith("deliveries/G7/preparation/maker-evidence/pre-g7-20/"));
const appDiff = spawnSync("git", ["diff", "--quiet", "HEAD", "--", "app"], { cwd: repoRoot });
if (appDiff.status !== 0) throw new Error("tracked app paths differ from HEAD");
const sourcePackage = trackedFile("app/package.json");
const lockFile = trackedFile("app/pnpm-lock.yaml");
const manifest = trackedFile(manifestPath);
const identity = {
  capturedUtc: new Date().toISOString(),
  branch: git(["branch", "--show-current"]),
  headCommit: git(["rev-parse", "HEAD"]),
  sourceTree: git(["rev-parse", "HEAD^{tree}"]),
  appTree: git(["rev-parse", "HEAD:app"]),
  authorizedParentPacketCommit: "046d1a806f9860d7c5165ae3edfe91b6d2aed288",
  expectedSourceCommit: expectedCommit,
  expectedAppTree: expectedAppTree,
  sourceIdentityMatchesPacket: git(["rev-parse", "HEAD"]) === expectedCommit && git(["rev-parse", "HEAD:app"]) === expectedAppTree,
  trackedAppDiffEmpty: appDiff.status === 0,
  onlyEvidencePathChanges: outsideEvidence.length === 0,
  statusEntries: changed,
  protectedFiles: { sourcePackage, lockFile, historicalManifest: manifest },
};
const outputName = process.argv[2] || "source-state-before.json";
fs.writeFileSync(path.join(evidenceRoot, outputName), `${JSON.stringify(identity, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(identity, null, 2)}\n`);
if (!identity.sourceIdentityMatchesPacket || outsideEvidence.length > 0 || [sourcePackage, lockFile, manifest].some((file) => file.worktreeGitBlob !== file.headGitBlob)) {
  process.exitCode = 1;
}
