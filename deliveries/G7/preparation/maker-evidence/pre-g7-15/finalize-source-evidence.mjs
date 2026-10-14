import { execFileSync } from "node:child_process";
import { readFile, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";

const root = process.cwd();
const evidenceRoot = path.join(root, "deliveries/G7/preparation/maker-evidence/pre-g7-15");
const sourceCommit = "8becac4ea3e9decc91ca2807e2004a0aa0407105";
const sourceTree = execFileSync("git", ["rev-parse", `${sourceCommit}:app`], { cwd: root, encoding: "utf8" }).trim();
const acceptedInputCommit = "8056fece5cd0b8113b81313b6d6a22099163bb27";
const acceptedInputTree = "fb4881289d618612b580ef2c576103f1d3e2112c";
const parentPacketCommit = "315bedb791e9500b898ebe4d1e024f0f477f9d67";
const priorEvidenceHead = "c4eeda6be483952e56dae7972633c1d9e82becb2";
const manifestPath = "yorayriniwnl.in/source-delivery-manifest.json";

function git(args, encoding = null) {
  return execFileSync("git", args, { cwd: root, encoding, maxBuffer: 64 * 1024 * 1024 });
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function normalize(bytes) {
  return Buffer.from(bytes.toString("utf8").replace(/\r\n?/g, "\n"), "utf8");
}

function blob(commit, filePath) {
  return git(["show", `${commit}:${filePath}`]);
}

function jsonBytes(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
}

const baseManifestBytes = blob(priorEvidenceHead, manifestPath);
const manifest = JSON.parse(baseManifestBytes.toString("utf8"));
if (manifest.schemaVersion !== 1) throw new Error(`Unexpected source manifest schema: ${manifest.schemaVersion}`);
if (sourceTree === acceptedInputTree) throw new Error("Source commit did not produce a new app tree.");
if (git(["rev-parse", `${acceptedInputCommit}:app`], "utf8").trim() !== acceptedInputTree) {
  throw new Error("Accepted source input tree does not match packet lineage.");
}
if (git(["rev-parse", `${sourceCommit}^`], "utf8").trim() !== acceptedInputCommit) {
  throw new Error("Source commit is not a direct child of the accepted input source commit.");
}
if (git(["rev-parse", `${parentPacketCommit}:docs/planning/reconciliation-packets/2026-10-15-pre-g7-15-webgl-startup-fallback.md`], "utf8").trim().length !== 40) {
  throw new Error("Parent packet commit is missing its authorized PRE-G7-15 packet.");
}

manifest.sourceIdentity = {
  ...manifest.sourceIdentity,
  parentCommit: parentPacketCommit,
  sourceCommit,
  acceptedInputCommit,
  acceptedInputAppTree: acceptedInputTree,
  resultingAppTree: sourceTree,
  sourceBaseCommit: acceptedInputCommit,
  sourceBaseAppTree: acceptedInputTree,
  governingPackets: [...new Set([
    ...(manifest.sourceIdentity.governingPackets ?? []),
    "docs/planning/reconciliation-packets/2026-10-15-pre-g7-15-webgl-startup-fallback.md",
  ])],
  formalAcceptance: "pending independent audit; maker does not self-accept",
};

const comparisons = [];
let rawParityFailures = 0;
let normalizedParityFailures = 0;
for (const category of ["sourceFiles", "testFiles"]) {
  for (const entry of manifest.mirror[category]) {
    const source = blob(sourceCommit, entry.sourcePath);
    const domain = blob(sourceCommit, `yorayriniwnl.in/${entry.domainPath}`);
    const sourceNormalized = normalize(source);
    const domainNormalized = normalize(domain);
    const rawBytesEqual = source.equals(domain);
    const normalizedContentEqual = sourceNormalized.equals(domainNormalized);
    if (!rawBytesEqual) rawParityFailures++;
    if (!normalizedContentEqual) normalizedParityFailures++;
    Object.assign(entry, {
      sourceSha256: sha256(source),
      domainSha256: sha256(domain),
      rawBytesEqual,
      normalizedSha256: sha256(sourceNormalized),
      normalizedContentEqual,
    });
    comparisons.push({
      category,
      sourcePath: entry.sourcePath,
      domainPath: `yorayriniwnl.in/${entry.domainPath}`,
      sourceSha256: sha256(source),
      domainSha256: sha256(domain),
      rawBytesEqual,
      normalizedSha256: sha256(sourceNormalized),
      normalizedContentEqual,
    });
  }
}

const overridePath = "src/config/public-base-url.ts";
const overrideDomainBlob = blob(sourceCommit, `yorayriniwnl.in/${overridePath}`);
const overrideAppBlob = blob(sourceCommit, `app/${overridePath}`);
const priorOverride = JSON.parse(baseManifestBytes.toString("utf8")).mirror.domainOverride;
const overrideBlobSha256 = sha256(overrideDomainBlob);
const appDefaultBlobSha256 = sha256(overrideAppBlob);
const overrideWorktreeSha256 = sha256(await readFile(path.join(root, "yorayriniwnl.in", overridePath)));
const appDefaultWorktreeSha256 = sha256(await readFile(path.join(root, "app", overridePath)));
const overridePreserved = overrideBlobSha256 === priorOverride.gitBlobSha256
  && appDefaultBlobSha256 === priorOverride.appDefaultSha256
  && overrideWorktreeSha256 === priorOverride.sha256
  && appDefaultWorktreeSha256 === priorOverride.appDefaultSha256;
manifest.mirror.domainOverride = {
  ...priorOverride,
  sha256: overrideWorktreeSha256,
  appDefaultSha256: appDefaultWorktreeSha256,
  preserved: overridePreserved,
  gitBlobSha256: overrideBlobSha256,
  normalizedSha256: sha256(normalize(overrideDomainBlob)),
};

const readmeSha256 = sha256(blob(sourceCommit, "yorayriniwnl.in/README.md"));
const sourceCount = manifest.mirror.sourceFiles.length;
const testCount = manifest.mirror.testFiles.length;
const auditStatus = rawParityFailures === 0 && normalizedParityFailures === 0 && overridePreserved
  && sourceCount === 116 && testCount === 10
  ? "PASS"
  : "FAIL";
manifest.mirror.audit = {
  ...manifest.mirror.audit,
  status: auditStatus,
  sourceFiles: sourceCount,
  testFiles: testCount,
  rawParityFailures,
  baseCommit: sourceCommit,
  readmeSha256,
  evidence: "deliveries/G7/preparation/maker-evidence/pre-g7-15/final-mirror-audit.json",
  comparisonBasis: `Git blob bytes at ${sourceCommit}`,
};

const finalMirrorAudit = {
  status: auditStatus,
  sourceCommit,
  sourceTree,
  acceptedInputCommit,
  acceptedInputTree,
  parentPacketCommit,
  priorEvidenceHead,
  schemaVersion: manifest.schemaVersion,
  sourceFiles: sourceCount,
  testFiles: testCount,
  entryCount: comparisons.length,
  rawParityFailures,
  normalizedParityFailures,
  domainOverride: {
    path: overridePath,
    domainGitBlobSha256: overrideBlobSha256,
    domainWorktreeSha256: overrideWorktreeSha256,
    acceptedGitBlobSha256: priorOverride.gitBlobSha256,
    appDefaultGitBlobSha256: appDefaultBlobSha256,
    appDefaultWorktreeSha256,
    acceptedAppDefaultGitBlobSha256: priorOverride.appDefaultSha256,
    preserved: overridePreserved,
  },
  comparisons,
};

const preEdit = JSON.parse(await readFile(path.join(evidenceRoot, "pre-edit-input-audit.json"), "utf8"));
const protectedHashes = [];
const protectedMismatches = [];
for (const prior of preEdit.nonOwnedAssetContractAndCameraHashes) {
  const baseline = blob(acceptedInputCommit, prior.path);
  const current = blob(sourceCommit, prior.path);
  const baselineSha256 = sha256(baseline);
  const currentSha256 = sha256(current);
  const unchanged = baselineSha256 === currentSha256 && baselineSha256 === prior.sha256;
  const row = {
    path: prior.path,
    bytes: current.length,
    acceptedInputSha256: baselineSha256,
    resultingSha256: currentSha256,
    expectedPreEditSha256: prior.sha256,
    unchanged,
  };
  protectedHashes.push(row);
  if (!unchanged) protectedMismatches.push(row);
}
const protectedHashAudit = {
  status: protectedMismatches.length === 0 ? "PASS" : "FAIL",
  acceptedInputCommit,
  sourceCommit,
  protectedPathCount: protectedHashes.length,
  mismatchCount: protectedMismatches.length,
  hashes: protectedHashes,
  mismatches: protectedMismatches,
  additionalRuntimeInvariants: {
    changedPathsAreLimitedToAuthorizedImplementationAndTests: git(["diff", "--name-only", acceptedInputCommit, sourceCommit], "utf8")
      .trim().split(/\r?\n/).filter(Boolean).every((filePath) => [
        "app/src/features/world/WorldRuntime.ts",
        "app/tests/unit/world-runtime-recovery.test.ts",
        "app/tests/e2e/renderer-recovery.spec.ts",
        "yorayriniwnl.in/src/features/world/WorldRuntime.ts",
        "yorayriniwnl.in/tests/unit/world-runtime-recovery.test.ts",
        "yorayriniwnl.in/tests/e2e/renderer-recovery.spec.ts",
      ].includes(filePath)),
    noHydrationSuppression: !git(["show", `${sourceCommit}:app/src/features/world/WorldRuntime.ts`], "utf8").includes("suppressHydrationWarning"),
    startupDiagnosticCaptureIsExactAndScoped: git(["show", `${sourceCommit}:app/src/features/world/WorldRuntime.ts`], "utf8")
      .includes('const webglContextCreationDiagnostic = "THREE.WebGLRenderer: Error creating WebGL context.";'),
    userGpuState: "NOT PROVIDED",
    physicalDeviceChecks: "NOT RUN",
  },
};

const changedPaths = [
  "app/src/features/world/WorldRuntime.ts",
  "app/tests/unit/world-runtime-recovery.test.ts",
  "app/tests/e2e/renderer-recovery.spec.ts",
  "yorayriniwnl.in/src/features/world/WorldRuntime.ts",
  "yorayriniwnl.in/tests/unit/world-runtime-recovery.test.ts",
  "yorayriniwnl.in/tests/e2e/renderer-recovery.spec.ts",
];
const patch = git(["diff", "--binary", acceptedInputCommit, sourceCommit, "--", ...changedPaths]);

await writeFile(path.join(root, manifestPath), jsonBytes(manifest));
await writeFile(path.join(evidenceRoot, "final-mirror-audit.json"), jsonBytes(finalMirrorAudit));
await writeFile(path.join(evidenceRoot, "protected-hash-audit.json"), jsonBytes(protectedHashAudit));
await writeFile(path.join(evidenceRoot, "source.patch.gz"), gzipSync(patch, { level: 9 }));
await unlink(path.join(evidenceRoot, "source.patch")).catch(() => {});

if (auditStatus !== "PASS" || protectedHashAudit.status !== "PASS"
  || !protectedHashAudit.additionalRuntimeInvariants.changedPathsAreLimitedToAuthorizedImplementationAndTests
  || !protectedHashAudit.additionalRuntimeInvariants.noHydrationSuppression
  || !protectedHashAudit.additionalRuntimeInvariants.startupDiagnosticCaptureIsExactAndScoped) {
  throw new Error(`Final audit failed: mirror=${auditStatus}, protected=${protectedHashAudit.status}`);
}

process.stdout.write(`${JSON.stringify({
  sourceCommit,
  sourceTree,
  parentPacketCommit,
  sourceFiles: sourceCount,
  testFiles: testCount,
  rawParityFailures,
  normalizedParityFailures,
  protectedPaths: protectedHashes.length,
  protectedMismatches: protectedMismatches.length,
  overridePreserved,
  auditStatus,
})}\n`);
