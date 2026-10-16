import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../../../..");
const sourceCommit = "bd01478617b4166866f3f44196c56fc5add94acd";
const expectedAppTree = "3975e40c59a04b8696efa2ca3605eb37a0617165";
const expectedSourceDomainTree = "8c34adf791c678a4e9e8bfe90f92426026994e68";
const expectedPacketCommit = "b8fe473cb27fd0b39880c4bca80b420e45522f57";
const node24 = "C:\\Users\\ayush\\AppData\\Local\\Temp\\yor-world-node-24.19.0\\unpacked\\node-v24.19.0-win-x64\\node.exe";
const corepack = "C:\\Program Files\\nodejs\\node_modules\\corepack\\dist\\corepack.js";
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
const issues = [];

const nodeVersion = spawnSync(node24, ["--version"], { cwd: root, encoding: "utf8" });
const pnpmVersion = spawnSync(node24, [corepack, "pnpm@9.15.9", "--version"], { cwd: root, encoding: "utf8" });
const head = git("rev-parse", "HEAD");
const status = git("status", "--porcelain");
const sourceStatus = git("status", "--porcelain", "--", "app", "yorayriniwnl.in/src", "yorayriniwnl.in/tests");
const statusLines = status ? status.split(/\r?\n/).filter(Boolean) : [];
const unexpectedWorkingTreeEntries = statusLines.filter((line) => !line.includes("deliveries/G7/preparation/maker-evidence/pre-g7-32/"));
const currentAppTree = git("rev-parse", "HEAD:app");
const sourceAppTree = git("rev-parse", `${sourceCommit}:app`);
const currentSourceDomainTree = git("rev-parse", `${sourceCommit}:yorayriniwnl.in`);
const currentWorktreeDomainTree = git("rev-parse", "HEAD:yorayriniwnl.in");
const sourceDomainAuditPath = path.join(root, "deliveries/G7/preparation/maker-evidence/pre-g7-31/source-mirror-parity-audit.json");
const sourceDomainAudit = JSON.parse(fs.readFileSync(sourceDomainAuditPath, "utf8"));
const currentManifest = JSON.parse(fs.readFileSync(path.join(root, "yorayriniwnl.in/source-delivery-manifest.json"), "utf8"));

if (nodeVersion.status !== 0 || nodeVersion.stdout.trim() !== "v24.19.0") issues.push("Pinned Node 24.19.0 did not verify.");
if (pnpmVersion.status !== 0 || pnpmVersion.stdout.trim() !== "9.15.9") issues.push("Pinned pnpm 9.15.9 did not verify.");
if (head !== expectedPacketCommit) issues.push(`Expected validation packet commit ${expectedPacketCommit} at HEAD; got ${head}.`);
if (sourceStatus !== "") issues.push("Canonical application or domain source/test paths were dirty at preflight.");
if (unexpectedWorkingTreeEntries.length) issues.push("Worktree contains changes outside this packet's expected evidence directory.");
if (currentAppTree !== expectedAppTree || sourceAppTree !== expectedAppTree) issues.push("Canonical app tree does not match PRE-G7-31 source.");
if (currentSourceDomainTree !== expectedSourceDomainTree) issues.push("PRE-G7-31 source-commit domain tree does not match its manifest.");
if (sourceDomainAudit.status !== "PASS" || sourceDomainAudit.normalizedParityFailures !== 0 || sourceDomainAudit.gitBlobParityFailures !== 0) issues.push("PRE-G7-31 source/mirror audit is not a clean parity result.");
if (currentManifest.sourceIdentity.sourceCommit !== sourceCommit) issues.push("Domain source manifest does not point to the exact PRE-G7-31 source commit.");

const parityResults = sourceDomainAudit.files.map((entry) => {
  const sourceGitBlob = git("rev-parse", `HEAD:${entry.sourcePath}`);
  const domainGitBlob = git("rev-parse", `HEAD:${entry.domainPath}`);
  return {
    kind: entry.kind,
    sourcePath: entry.sourcePath,
    domainPath: entry.domainPath,
    expectedSourceGitBlob: entry.sourceGitBlob,
    currentSourceGitBlob: sourceGitBlob,
    expectedDomainGitBlob: entry.domainGitBlob,
    currentDomainGitBlob: domainGitBlob,
    pass: sourceGitBlob === entry.sourceGitBlob && domainGitBlob === entry.domainGitBlob && sourceGitBlob === domainGitBlob,
  };
});
const parityFailures = parityResults.filter((entry) => !entry.pass);
if (parityFailures.length) issues.push(`${parityFailures.length} mapped app/domain source/test Git blobs changed since PRE-G7-31.`);

const result = {
  status: issues.length === 0 ? "PASS" : "FAIL",
  validationPacketCommit: head,
  sourceCommit,
  canonicalAppTree: currentAppTree,
  sourceCommitDomainTree: currentSourceDomainTree,
  currentWorktreeDomainTree,
  toolchain: {
    nodePath: node24,
    nodeVersion: nodeVersion.stdout.trim(),
    corepackPath: corepack,
    pnpmVersion: pnpmVersion.stdout.trim(),
  },
  worktreeClean: status === "",
  productSourceClean: sourceStatus === "",
  expectedEvidenceWorktreeEntries: statusLines.filter((line) => line.includes("deliveries/G7/preparation/maker-evidence/pre-g7-32/")),
  unexpectedWorkingTreeEntries,
  sourceMirrorFileCount: parityResults.filter((entry) => entry.kind === "source").length,
  sourceMirrorTestCount: parityResults.filter((entry) => entry.kind === "test").length,
  sourceMirrorParityFailures: parityFailures.length,
  appNodeModulesPresent: fs.existsSync(path.join(root, "app/node_modules")),
  issues,
  parityResults,
};

const outputPath = path.join(here, "preflight.json");
fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify({ status: result.status, sourceCommit, appTree: currentAppTree, sourceFiles: result.sourceMirrorFileCount, testFiles: result.sourceMirrorTestCount, parityFailures: parityFailures.length, output: path.relative(root, outputPath).replaceAll(path.sep, "/") }, null, 2)}\n`);
if (issues.length) process.exitCode = 1;
