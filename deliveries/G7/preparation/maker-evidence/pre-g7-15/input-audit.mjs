import crypto from "node:crypto";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const baseCommit = "8056fece5cd0b8113b81313b6d6a22099163bb27";
const acceptedAppTree = "fb4881289d618612b580ef2c576103f1d3e2112c";
const priorEvidenceHead = "c4eeda6be483952e56dae7972633c1d9e82becb2";
const evidencePath = "deliveries/G7/preparation/maker-evidence/pre-g7-15/pre-edit-input-audit.json";
const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const git = (args, encoding) => execFileSync("git", args, encoding ? { encoding } : {});
const blob = (commit, path) => git(["show", commit + ":" + path]);
const normalize = (bytes) => Buffer.from(bytes.toString("utf8").replace(/\r\n/g, "\n"), "utf8");
const priorManifest = JSON.parse(blob(priorEvidenceHead, "yorayriniwnl.in/source-delivery-manifest.json").toString("utf8"));
const appTree = git(["rev-parse", baseCommit + ":app"], "utf8").trim();
const entries = [...priorManifest.mirror.sourceFiles, ...priorManifest.mirror.testFiles];
const comparisons = entries.map((entry) => {
  const sourceBytes = blob(baseCommit, entry.sourcePath);
  const domainBytes = blob(baseCommit, "yorayriniwnl.in/" + entry.domainPath);
  const sourceNormalized = normalize(sourceBytes);
  const domainNormalized = normalize(domainBytes);
  return {
    sourcePath: entry.sourcePath,
    domainPath: entry.domainPath,
    sourceSha256: sha(sourceBytes),
    domainSha256: sha(domainBytes),
    rawGitBlobEqual: sourceBytes.equals(domainBytes),
    normalizedSha256: sha(sourceNormalized),
    normalizedContentEqual: sourceNormalized.equals(domainNormalized),
  };
});
const comparisonFailures = comparisons.filter((item) => !item.rawGitBlobEqual || !item.normalizedContentEqual);
const override = priorManifest.mirror.domainOverride;
const overrideBytes = blob(baseCommit, "yorayriniwnl.in/" + override.path);
const appOverrideBytes = blob(baseCommit, "app/" + override.path);
const selected = git(["ls-tree", "-r", "--name-only", baseCommit, "--", "app/public/models", "app/public/textures", "app/src/contracts", "app/src/features/world/CameraDirector.ts", "app/src/features/world/types.ts", "app/src/features/world/EntranceCoordinator.ts"], "utf8")
  .split(/\r?\n/).filter(Boolean)
  .filter((path) => /\.(glb|png)$/i.test(path) || path.startsWith("app/src/contracts/") || /CameraDirector\.ts$|types\.ts$|EntranceCoordinator\.ts$/.test(path))
  .map((path) => {
    const bytes = blob(baseCommit, path);
    return { path, bytes: bytes.length, sha256: sha(bytes) };
  });
const result = {
  purpose: "PRE-G7-15 exact accepted source-input and mirror audit; captured before implementation edits",
  makerRole: "Local Codex worker substitute for Gemini #3; no self-acceptance",
  sourceBaseCommit: baseCommit,
  acceptedInputCommit: baseCommit,
  acceptedInputAppTree: acceptedAppTree,
  actualAppTree: appTree,
  priorFinalEvidenceHead: priorEvidenceHead,
  priorManifestCommit: priorEvidenceHead,
  priorManifestSourceCommit: priorManifest.sourceIdentity.sourceCommit,
  priorManifestResultingAppTree: priorManifest.sourceIdentity.resultingAppTree,
  priorManifestIdentityMatchesBase: priorManifest.sourceIdentity.sourceCommit === baseCommit && priorManifest.sourceIdentity.resultingAppTree === appTree,
  mirror: {
    sourceFiles: priorManifest.mirror.sourceFiles.length,
    testFiles: priorManifest.mirror.testFiles.length,
    entries: entries.length,
    rawGitBlobMismatches: comparisonFailures.filter((item) => !item.rawGitBlobEqual).length,
    normalizedContentMismatches: comparisonFailures.filter((item) => !item.normalizedContentEqual).length,
    failures: comparisonFailures,
    comparisons,
    windowsCheckoutNote: "Git-blob bytes are the binding mirror basis. This Windows checkout's source and domain worktree files can have different line-ending smudge transformations; the accepted PRE-G7-14 audit used the same Git show blob comparison.",
  },
  domainOverride: {
    path: override.path,
    canonicalUrl: override.canonicalUrl,
    reason: override.reason,
    domainGitBlobSha256: sha(overrideBytes),
    appDefaultGitBlobSha256: sha(appOverrideBytes),
    canonicalUrlPreserved: overrideBytes.toString("utf8").includes(override.canonicalUrl),
    unchangedByThisTask: true,
  },
  nonOwnedAssetContractAndCameraHashes: selected,
};
result.status = result.actualAppTree === acceptedAppTree
  && result.priorManifestIdentityMatchesBase
  && result.mirror.rawGitBlobMismatches === 0
  && result.mirror.normalizedContentMismatches === 0
  && result.domainOverride.canonicalUrlPreserved
  ? "PASS" : "FAIL";
fs.writeFileSync(evidencePath, JSON.stringify(result, null, 2) + "\n", "utf8");
console.log(JSON.stringify({
  status: result.status,
  sourceBaseCommit: result.sourceBaseCommit,
  acceptedInputAppTree: result.acceptedInputAppTree,
  actualAppTree: result.actualAppTree,
  priorFinalEvidenceHead: result.priorFinalEvidenceHead,
  mirrorSourceFiles: result.mirror.sourceFiles,
  mirrorTestFiles: result.mirror.testFiles,
  rawGitBlobMismatches: result.mirror.rawGitBlobMismatches,
  normalizedContentMismatches: result.mirror.normalizedContentMismatches,
  domainOverridePreserved: result.domainOverride.canonicalUrlPreserved,
  nonOwnedHashCount: result.nonOwnedAssetContractAndCameraHashes.length,
}, null, 2));
if (result.status !== "PASS") process.exitCode = 1;
