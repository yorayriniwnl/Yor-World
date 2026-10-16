import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

const [repoRootArg, commit, attemptRootArg] = process.argv.slice(2);
if (!repoRootArg || !commit || !attemptRootArg) {
  console.error("usage: verify-p28-canonical.mjs <repo-root> <p28-commit> <attempt-root>");
  process.exit(2);
}
const repoRoot = path.resolve(repoRootArg);
const attemptRoot = path.resolve(attemptRootArg);
const manifestPath = path.join(attemptRoot, "p28-input-manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8").replace(/^\uFEFF/, ""));
const copiedBindingsArtifact = manifest.artifacts.find((a) => a.role === "P28 frozen artifact manifest");
if (!copiedBindingsArtifact) throw new Error("P28 binding manifest is missing from the 11 artifact inputs.");
const copiedBindingsPath = path.join(attemptRoot, copiedBindingsArtifact.copyPath.replace(/^attempt-01[\\/]/, ""));
const bindings = JSON.parse(fs.readFileSync(copiedBindingsPath, "utf8").replace(/^\uFEFF/, ""));

function git(args) {
  const result = spawnSync("git", ["-C", repoRoot, ...args], { encoding: null, windowsHide: true });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed (status ${result.status}): ${(result.stderr ?? Buffer.alloc(0)).toString("utf8")}`);
  }
  return result.stdout;
}
function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

const artifactRows = [];
for (const artifact of manifest.artifacts) {
  const spec = `${commit}:${artifact.p28Path}`;
  const blobId = git(["rev-parse", "--verify", spec]).toString("utf8").trim();
  const type = git(["cat-file", "-t", spec]).toString("utf8").trim();
  if (type !== "blob") throw new Error(`${spec} resolved to ${type}, not a blob.`);
  const bytes = git(["cat-file", "blob", spec]);
  const localPath = path.join(attemptRoot, artifact.copyPath.replace(/^attempt-01[\\/]/, ""));
  const localBytes = fs.readFileSync(localPath);
  const row = {
    role: artifact.role,
    p28Path: artifact.p28Path,
    spec,
    actualGitBlobId: blobId,
    expectedGitBlobId: artifact.canonicalGitBlobId,
    bytes: bytes.length,
    expectedBytes: artifact.canonicalBlobBytes,
    sha256: sha256(bytes),
    expectedSha256: artifact.canonicalBlobSha256,
    localCopyBytes: localBytes.length,
    localCopySha256: sha256(localBytes),
    exactCopyMatch: bytes.equals(localBytes),
    verified: blobId === artifact.canonicalGitBlobId &&
      bytes.length === artifact.canonicalBlobBytes &&
      sha256(bytes) === artifact.canonicalBlobSha256 &&
      bytes.equals(localBytes),
  };
  if (!row.verified) throw new Error(`Canonical P28 artifact mismatch: ${artifact.p28Path}`);
  artifactRows.push(row);
}

const sourceRows = [];
for (const source of manifest.expectedSources ?? [
  { name: "accepted-root-500", sourceCommit: "500d10fa5901be48d4ff877e608d65ba0e271bb9", baseAppTree: "ba0b709192367e1d12a796618f97801a8fcd5a70", baseMirrorTree: "34f7ac0731984e50cbb06cf02039911ba65f59a9", temporaryRootTree: "8afcaa76148165caa836ce5cb5e69cfa11f52e61", temporaryAppTree: "15c7a89aab37332d8507f613bc2bd2a94c2a05f5", temporaryMirrorTree: "34f7ac0731984e50cbb06cf02039911ba65f59a9" },
  { name: "p25-donor-28fb", sourceCommit: "28fb4187445206bcc62e2ef0ae2678e44ac6604b", baseAppTree: "f68074b41b8d2eea228d7fa964d3db8358a9fea4", baseMirrorTree: "be03089ce9abae0f487bd829b4f24ddac9bb3dfd", temporaryRootTree: "0c8539473591271beb91f409f618a168e0487866", temporaryAppTree: "133eb2fe33ea54a15b125fbfe8deccea6cafe68d", temporaryMirrorTree: "be03089ce9abae0f487bd829b4f24ddac9bb3dfd" }
]) {
  const binding = bindings.sources.find((s) => s.name === source.name);
  if (!binding) throw new Error(`P28 committed binding omits source ${source.name}`);
  const keys = ["sourceCommit", "baseAppTree", "baseMirrorTree", "temporaryRootTree", "temporaryAppTree", "temporaryMirrorTree"];
  const mismatches = keys.filter((key) => binding[key] !== source[key]);
  if (mismatches.length) throw new Error(`P28 source binding mismatch for ${source.name}: ${mismatches.join(", ")}`);
  const expectedPatch = manifest.artifacts.find((a) => a.role === (source.name === "accepted-root-500" ? "accepted source observer connection overlay" : "P25 donor observer connection overlay"));
  if (!expectedPatch || binding.runtimeOverlay.patch.pathFilteredGitBlob !== expectedPatch.canonicalGitBlobId) {
    throw new Error(`P28 runtime overlay binding mismatch for ${source.name}`);
  }
  sourceRows.push({
    name: source.name,
    sourceCommit: binding.sourceCommit,
    baseAppTree: binding.baseAppTree,
    baseMirrorTree: binding.baseMirrorTree,
    temporaryRootTree: binding.temporaryRootTree,
    temporaryAppTree: binding.temporaryAppTree,
    temporaryMirrorTree: binding.temporaryMirrorTree,
    runtimeOverlayWorldRuntimeBlobId: binding.runtimeOverlay.pathFilteredGitBlob,
    runtimeOverlayPatchBlobId: binding.runtimeOverlay.patch.pathFilteredGitBlob,
    matchesExpected: true,
  });
}

const observer = manifest.artifacts.find((a) => a.role === "measurement observer");
const harness = manifest.artifacts.find((a) => a.role === "Playwright capture spec");
const config = manifest.artifacts.find((a) => a.role === "Playwright config");
if (bindings.observer.pathFilteredGitBlob !== observer.canonicalGitBlobId ||
    bindings.harnessSpec.pathFilteredGitBlob !== harness.canonicalGitBlobId ||
    bindings.harnessConfig.pathFilteredGitBlob !== config.canonicalGitBlobId) {
  throw new Error("P28 committed observer/harness/config IDs do not match the 11-artifact binding.");
}
const bindingBlob = artifactRows.find((r) => r.role === "P28 frozen artifact manifest");
if (!bindingBlob || bindingBlob.actualGitBlobId !== copiedBindingsArtifact.canonicalGitBlobId) {
  throw new Error("P28 committed binding manifest's own blob ID was not verified.");
}

const result = {
  schemaVersion: 1,
  status: "PASS",
  p28Commit: commit,
  p28ManifestArtifactCount: manifest.artifacts.length,
  verifiedCanonicalArtifacts: artifactRows,
  verifiedCanonicalArtifactCount: artifactRows.length,
  p28FrozenArtifactBindingsCrossCheck: {
    observerGitBlobId: bindings.observer.pathFilteredGitBlob,
    harnessSpecGitBlobId: bindings.harnessSpec.pathFilteredGitBlob,
    configGitBlobId: bindings.harnessConfig.pathFilteredGitBlob,
    sources: sourceRows,
  },
  sourceBindingCount: sourceRows.length,
  allGitCommandsChecked: true,
};
process.stdout.write(JSON.stringify(result, null, 2) + "\n");


