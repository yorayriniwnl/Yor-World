import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { cwd: process.cwd(), encoding: "utf8" }).trim();
const sourceCommit = "017bead7813d5ea9875b8789621b93b8a8cd00ce";
const baselineCommit = "26e87c8cd41f2745d165a74446ae1366f17f7bc1";
const outputPath = path.join(root, "deliveries/G7/preparation/maker-evidence/pre-g7-24/source/source-binding.json");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }).trim();
const hashFile = (relative) => sha256(fs.readFileSync(path.join(root, relative)));

const sourceParentCommit = git("show", "-s", "--format=%P", sourceCommit).split(/\s+/)[0];
const baselineAppTree = git("rev-parse", `${baselineCommit}:app`);
const resultingAppTree = git("rev-parse", `${sourceCommit}:app`);
let workingTreeAppMatchesSource = true;
try { git("diff", "--quiet", sourceCommit, "--", "app"); } catch { workingTreeAppMatchesSource = false; }
const changedPaths = git("diff-tree", "--no-commit-id", "--name-only", "-r", sourceCommit).split(/\r?\n/).filter(Boolean).sort();
const changedCanonicalPaths = changedPaths.filter((entry) => entry.startsWith("app/"));
const changedBlobs = changedCanonicalPaths.map((sourcePath) => {
  const domainPath = `yorayriniwnl.in/${sourcePath.slice("app/".length)}`;
  const baseSourceExists = git("ls-tree", "-r", "--name-only", baselineCommit, "--", sourcePath).length > 0;
  const baseDomainExists = git("ls-tree", "-r", "--name-only", baselineCommit, "--", domainPath).length > 0;
  const baseSourceBlob = baseSourceExists ? git("rev-parse", `${baselineCommit}:${sourcePath}`) : null;
  const baseDomainBlob = baseDomainExists ? git("rev-parse", `${baselineCommit}:${domainPath}`) : null;
  const sourceBlob = git("rev-parse", `${sourceCommit}:${sourcePath}`);
  const domainBlob = git("rev-parse", `${sourceCommit}:${domainPath}`);
  return {
    sourcePath,
    domainPath,
    baseSourceBlob,
    baseDomainBlob,
    sourceBlob,
    domainBlob,
    candidateMirrorBlobEqual: sourceBlob === domainBlob,
  };
});
const productionRoom = "app/public/models/production-room-full.glb";
const expectedRoomSha256 = "3a02647d24e474c8a2579b0d277cf02a7841212e961c1554f67b6e032e40a307";
const productionRoomSha256 = hashFile(productionRoom);
const assetManifestSha256 = hashFile("app/public/asset-manifest.json");
const parityFailures = changedBlobs.filter((entry) => !entry.candidateMirrorBlobEqual);

const binding = {
  schemaVersion: 1,
  packet: "PRE-G7-24",
  baselineCommit,
  sourceParentCommit,
  sourceCommit,
  baselineAppTree,
  resultingAppTree,
  workingTreeAppMatchesSource,
  changedGitPaths: changedPaths,
  changedBlobs,
  changedBlobMirrorFailures: parityFailures,
  assets: {
    productionRoom,
    expectedProductionRoomSha256: expectedRoomSha256,
    productionRoomSha256,
    productionRoomPreserved: productionRoomSha256 === expectedRoomSha256,
    assetManifest: "app/public/asset-manifest.json",
    assetManifestSha256,
  },
  evidence: {
    mirrorParityAudit: "deliveries/G7/preparation/maker-evidence/pre-g7-24/source/mirror-parity-audit.json",
    visualParity: "deliveries/G7/preparation/maker-evidence/pre-g7-24/visual-parity/pixel-parity.json",
  },
  status: parityFailures.length === 0 && productionRoomSha256 === expectedRoomSha256 && workingTreeAppMatchesSource ? "PASS_SOURCE_BINDING" : "FAIL_SOURCE_BINDING",
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(binding, null, 2)}\n`, "utf8");
process.stdout.write(`${binding.status}: ${changedBlobs.length} changed canonical source/test blobs; ${parityFailures.length} changed-file mirror mismatches; app checkout matches source commit=${workingTreeAppMatchesSource}; room GLB preserved=${binding.assets.productionRoomPreserved}\n`);
if (binding.status !== "PASS_SOURCE_BINDING") process.exitCode = 1;
