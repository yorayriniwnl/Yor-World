import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const verification = path.resolve(root, "verification");
const patchCheck = path.resolve(root, "patch-check");
const workspace = path.resolve(root, "../../..");
const base = "f62a43c5e71c00dcb89e28275ea81d842167db80";
const expectedAppTree = "42ea29ec235225046a75959eb19eb386ac2f821d";
const allowed = [
  "app/src/app/admin/editor/page.tsx",
  "app/src/app/admin/preview/[slug]/page.tsx",
  "app/src/app/admin/preview/page.tsx",
  "app/src/app/admin/publish/page.tsx",
  "app/src/app/api/admin/media/route.ts",
  "app/src/app/api/admin/preview/media/[id]/route.ts",
  "app/src/app/api/admin/preview/route.ts",
  "app/src/app/api/admin/projects/route.ts",
  "app/src/app/api/admin/publish/route.ts",
  "app/src/app/api/admin/rollback/route.ts",
  "app/src/features/admin/draft-preview.tsx",
  "app/src/features/admin/project-editor.tsx",
  "app/src/features/admin/publish-review.tsx",
  "app/src/features/admin/structured-block-editor.tsx",
  "app/src/features/portfolio/case-study.tsx",
  "app/src/server/content/preview.ts",
  "app/src/server/content/publish.ts",
  "app/src/server/content/revisions.ts",
  "app/src/server/media/manifest.ts",
  "app/tests/e2e/platform/admin-publish.spec.ts",
  "app/tests/e2e/platform/completion-authoring-workflow.spec.ts",
  "app/tests/integration/platform/canonical-platform.test.ts",
  "app/tests/integration/platform/completion-authoring-preview.test.ts",
  "app/tests/integration/platform/publication.test.ts",
  "app/tests/unit/platform/completion-authoring-blocks.test.ts",
];

function sha256(bytes) { return crypto.createHash("sha256").update(bytes).digest("hex"); }
function git(cwd, args, encoding = "utf8") {
  return execFileSync("git", args, { cwd, encoding, maxBuffer: 128 * 1024 * 1024 });
}
function inventory(dir) {
  const files = [];
  function walk(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const absolute = path.join(current, entry.name);
      const rel = path.relative(dir, absolute).split(path.sep).join("/");
      const stat = fs.lstatSync(absolute);
      if (entry.isDirectory() && !entry.isSymbolicLink()) walk(absolute);
      else if (entry.isFile() && !entry.isSymbolicLink()) {
        const bytes = fs.readFileSync(absolute);
        files.push({ path: rel, bytes: bytes.length, sha256: sha256(bytes) });
      } else files.push({ path: rel, kind: entry.isSymbolicLink() ? "symlink" : "other" });
    }
  }
  walk(dir);
  files.sort((a, b) => a.path.localeCompare(b.path));
  return files;
}

const sourceRoot = path.join(root, "source");
const sourceFiles = inventory(sourceRoot);
const sourcePatchBytes = fs.readFileSync(path.join(root, "source.patch"));
const sourcePatchText = new TextDecoder("utf-8", { fatal: true }).decode(sourcePatchBytes);
const patchPaths = [...sourcePatchText.matchAll(/^\+\+\+ b\/(.+)$/gm)].map((match) => match[1]);
const sourcePatchSha256 = sha256(sourcePatchBytes);
const sourceTreeByCanonicalPath = new Map(sourceFiles.map((entry) => [`app/${entry.path}`, entry]));
const comparisons = allowed.map((canonicalPath) => {
  const expected = fs.readFileSync(path.resolve(verification, canonicalPath));
  const packagedPath = path.join(sourceRoot, canonicalPath.slice("app/".length));
  const packaged = fs.readFileSync(packagedPath);
  const applied = fs.readFileSync(path.resolve(patchCheck, canonicalPath));
  let crlfPairsInVerification = 0;
  for (let i = 0; i < expected.length - 1; i += 1) if (expected[i] === 13 && expected[i + 1] === 10) crlfPairsInVerification += 1;
  const normalizedVerification = Buffer.from(expected.filter((value, index) => !(value === 13 && expected[index + 1] === 10)));
  return {
    canonicalPath,
    sourcePath: `source/${canonicalPath.slice("app/".length)}`,
    expectedBytes: expected.length,
    expectedSha256: sha256(expected),
    sourceBytes: packaged.length,
    sourceSha256: sha256(packaged),
    patchCheckBytes: applied.length,
    patchCheckSha256: sha256(applied),
    sourceMatchesVerification: expected.equals(packaged),
    verificationCrLfPairs: crlfPairsInVerification,
    sourceMatchesVerificationAfterCrLfNormalization: normalizedVerification.equals(packaged),
    patchCheckMatchesSource: packaged.equals(applied),
  };
});
const verificationDiffBytes = git(verification, ["diff", "--binary", "--full-index", "--no-ext-diff", base, "--", ...allowed], null);
const verificationDiffSha256 = sha256(verificationDiffBytes);
const patchCheckHead = git(patchCheck, ["rev-parse", "HEAD"]).trim();
const patchCheckAppTree = git(patchCheck, ["rev-parse", "HEAD:app"]).trim();
const patchCheckDiffPaths = git(patchCheck, ["diff", "--name-only", base]).trim().split(/\r?\n/).filter(Boolean).sort();
const patchCheckStatus = git(patchCheck, ["status", "--porcelain=v1", "--untracked-files=normal", "-z"]).split("\0").filter(Boolean);
const acceptedManifestPath = path.join(workspace, "docs/planning/reconciliation-packets/finish-contracts-r2/output-hashes.json");
const acceptedManifestBytes = fs.readFileSync(acceptedManifestPath);
const changedPathsBytes = fs.readFileSync(path.join(root, "changed-paths.txt"));
const assemblyBytes = fs.readFileSync(path.join(root, "patch-assembly.json"));
const applicationBytes = fs.readFileSync(path.join(root, "patch-application.json"));
const assembly = JSON.parse(assemblyBytes.toString("utf8").replace(/^\uFEFF/, ""));
const application = JSON.parse(applicationBytes.toString("utf8").replace(/^\uFEFF/, ""));
const assemblyFileMap = new Map((assembly.replacementMapping?.files ?? []).map((entry) => [entry.patchPath, entry]));
const applicationFileMap = new Map((application.files ?? []).map((entry) => [entry.gitPath, entry]));
const assemblyMapMatchesSource = comparisons.every((entry) => {
  const manifest = assemblyFileMap.get(entry.canonicalPath);
  return manifest && manifest.bytes === entry.sourceBytes && manifest.sha256 === entry.sourceSha256 && manifest.path === entry.sourcePath && manifest.patchPath === entry.canonicalPath;
});
const assemblyMapMatchesVerification = comparisons.every((entry) => {
  const manifest = assemblyFileMap.get(entry.canonicalPath);
  return manifest && manifest.bytes === entry.expectedBytes && manifest.sha256 === entry.expectedSha256 && manifest.path === entry.sourcePath && manifest.patchPath === entry.canonicalPath;
});
const assemblyMapMatchesSourceAfterCrLfNormalization = comparisons.every((entry) => {
  const manifest = assemblyFileMap.get(entry.canonicalPath);
  return manifest && entry.sourceMatchesVerificationAfterCrLfNormalization && manifest.bytes === entry.sourceBytes && manifest.sha256 === entry.sourceSha256 && manifest.path === entry.sourcePath && manifest.patchPath === entry.canonicalPath;
});
const applicationMapMatchesSource = comparisons.every((entry) => {
  const manifest = applicationFileMap.get(entry.canonicalPath);
  return manifest && manifest.appliedBytes === entry.sourceBytes && manifest.appliedSha256 === entry.sourceSha256 && manifest.sourcePath === entry.sourcePath && manifest.byteIdenticalToPatchApplied === true;
});
const processQueryBytes = fs.readFileSync(path.join(root, "evidence", "r4-concurrent-process-query.json"));
const processQuery = JSON.parse(processQueryBytes.toString("utf8").replace(/^\uFEFF/, ""));
const patchCheckStat = fs.statSync(patchCheck);
const sourceStat = fs.statSync(sourceRoot);
const rootArtifacts = ["source.patch", "changed-paths.txt", "patch-assembly.json", "patch-application.json"].map((name) => {
  const bytes = fs.readFileSync(path.join(root, name));
  const stat = fs.statSync(path.join(root, name));
  return { path: name, bytes: bytes.length, sha256: sha256(bytes), createdAtUtc: stat.birthtime.toISOString(), modifiedAtUtc: stat.mtime.toISOString() };
});

const result = {
  capturedAtUtc: new Date().toISOString(),
  sourceBase: base,
  expectedAppTree,
  existingArtifacts: rootArtifacts,
  source: {
    path: "source/",
    createdAtUtc: sourceStat.birthtime.toISOString(),
    modifiedAtUtc: sourceStat.mtime.toISOString(),
    fileCount: sourceFiles.length,
    totalBytes: sourceFiles.reduce((sum, entry) => sum + (entry.bytes ?? 0), 0),
    files: sourceFiles,
    exactExhaustiveAllowlistMatch: sourceFiles.length === allowed.length && sourceFiles.every((entry) => entry.kind === undefined && sourceTreeByCanonicalPath.has(`app/${entry.path}`)),
    allFilesMatchVerification: comparisons.every((entry) => entry.sourceMatchesVerification),
    allFilesMatchVerificationAfterCrLfNormalization: comparisons.every((entry) => entry.sourceMatchesVerificationAfterCrLfNormalization),
    allPatchCheckFilesMatchSource: comparisons.every((entry) => entry.patchCheckMatchesSource),
    assemblyManifestMatchesSource: assemblyMapMatchesSource,
    assemblyManifestMatchesVerification: assemblyMapMatchesVerification,
    assemblyManifestContentMatchesSourceAfterCrLfNormalization: assemblyMapMatchesSourceAfterCrLfNormalization,
    applicationManifestMatchesSource: applicationMapMatchesSource,
  },
  sourcePatch: {
    path: "source.patch",
    bytes: sourcePatchBytes.length,
    sha256: sourcePatchSha256,
    validUtf8: true,
    hasBom: sourcePatchText.startsWith("\uFEFF"),
    hasNul: sourcePatchText.includes("\0"),
    patchPaths,
    patchPathsExactlyAllowlisted: JSON.stringify([...patchPaths].sort()) === JSON.stringify([...allowed].sort()),
    matchesCurrentVerificationDiffByteForByte: sourcePatchBytes.equals(verificationDiffBytes),
    currentVerificationDiffSha256: verificationDiffSha256,
  },
  comparisons,
  patchCheck: {
    path: "patch-check/",
    createdAtUtc: patchCheckStat.birthtime.toISOString(),
    modifiedAtUtc: patchCheckStat.mtime.toISOString(),
    head: patchCheckHead,
    appTree: patchCheckAppTree,
    expectedBase: patchCheckHead === base,
    expectedAppTree: patchCheckAppTree === expectedAppTree,
    changedPathCount: patchCheckDiffPaths.length,
    changedPaths: patchCheckDiffPaths,
    pathsExactlyAllowlisted: JSON.stringify(patchCheckDiffPaths) === JSON.stringify([...allowed].sort()),
    statusRows: patchCheckStatus,
  },
  parentReceipts: {
    changedPaths: { path: "changed-paths.txt", bytes: changedPathsBytes.length, sha256: sha256(changedPathsBytes), text: changedPathsBytes.toString("utf8") },
    assembly: { path: "patch-assembly.json", bytes: assemblyBytes.length, sha256: sha256(assemblyBytes), data: assembly },
    application: { path: "patch-application.json", bytes: applicationBytes.length, sha256: sha256(applicationBytes), data: application },
  },
  acceptedManifest: {
    path: "docs/planning/reconciliation-packets/finish-contracts-r2/output-hashes.json",
    bytes: acceptedManifestBytes.length,
    sha256: sha256(acceptedManifestBytes),
    expectedSha256: "8038db147824b0a31de1028c330383352177020b2247dd627d1674d6dc14c6af",
    matchesExpected: sha256(acceptedManifestBytes) === "8038db147824b0a31de1028c330383352177020b2247dd627d1674d6dc14c6af",
  },
  processAudit: {
    path: "evidence/r4-concurrent-process-query.json",
    bytes: processQueryBytes.length,
    sha256: sha256(processQueryBytes),
    capturedAtUtc: processQuery.capturedAtUtc,
    matchingProcessCount: processQuery.matchingProcessCount,
    matches: processQuery.matches,
    attribution: "No active process with matching R4 artifact paths was found. Exited process provenance is not recoverable from this live snapshot.",
  },
  thisWorkerCommands: [
    { command: "node evidence/package-r4.mjs", exitCode: 1, result: "Aborted at the pre-write collision guard after source/ and source.patch were already present; this invocation did not create or change them." },
    { command: "node evidence/capture-late-fixture-inventory.mjs", exitCode: 0, result: "Completed; captured only the preserved late verification fixture inventory under evidence/." },
    { command: "pwsh -NoProfile -File evidence/query-concurrent-processes.ps1", exitCode: 0, result: "Completed; recorded a live snapshot with no matching active R4 artifact process." },
    { command: "node evidence/cleanup-owned-fixtures.mjs", exitCode: "not surfaced by initial exec response", result: "Follow-up confirms the eight exact owned fixture targets are absent and their inventory receipt exists; the late unrecognized fixture was excluded." },
  ],
  integrityAssessment: "The source tree and patch-applied tree match byte-for-byte on all 25 paths; source.patch matches the current Git diff and exact allowlist. Six raw verification-worktree files use CRLF while source/ and patch-check use LF; normalizing those line endings yields byte equality and matches the assembly receipt. Artifact creation provenance remains unresolved because these outputs appeared without a known writer and no live process matched their paths.",
};

const auditPath = path.join(root, "evidence", "r4-concurrent-package-audit.json");
fs.writeFileSync(auditPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  auditPath: "evidence/r4-concurrent-package-audit.json",
  sourceCount: result.source.fileCount,
  sourceBytes: result.source.totalBytes,
  sourceMatchesVerification: result.source.allFilesMatchVerification,
  sourceMatchesVerificationAfterCrLfNormalization: result.source.allFilesMatchVerificationAfterCrLfNormalization,
  sourcePatchBytes: result.sourcePatch.bytes,
  sourcePatchSha256: result.sourcePatch.sha256,
  sourcePatchMatchesVerificationDiff: result.sourcePatch.matchesCurrentVerificationDiffByteForByte,
  patchPathsExactlyAllowlisted: result.sourcePatch.patchPathsExactlyAllowlisted,
  patchCheckHead: result.patchCheck.head,
  patchCheckAppTree: result.patchCheck.appTree,
  patchCheckPathsExactlyAllowlisted: result.patchCheck.pathsExactlyAllowlisted,
  assemblyManifestMatchesSource: result.source.assemblyManifestMatchesSource,
  assemblyManifestMatchesVerification: result.source.assemblyManifestMatchesVerification,
  assemblyManifestContentMatchesSourceAfterCrLfNormalization: result.source.assemblyManifestContentMatchesSourceAfterCrLfNormalization,
  applicationManifestMatchesSource: result.source.applicationManifestMatchesSource,
  matchingProcesses: result.processAudit.matchingProcessCount,
  integrityAssessment: result.integrityAssessment,
}, null, 2));
