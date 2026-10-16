import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../../../..");
const manifestPath = path.join(root, "yorayriniwnl.in", "source-delivery-manifest.json");
const auditPath = path.join(here, "source-mirror-parity-audit.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const sourceCommit = "bd01478617b4166866f3f44196c56fc5add94acd";
const taskPacketCommit = "074ccbcb7fa5d8c5f89eb98aab9315cebb9100fb";
const sourceBaseCommit = "d86d3d68c34fcdff6319c7945c7d74e87ce81946";
const mirrorRoot = manifest.mirror.deliveryRoot.replace(/\/$/, "");
const hash = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const normalize = (bytes) => Buffer.from(bytes.toString("utf8").replace(/\r\n?/g, "\n"), "utf8");
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();

if (git("rev-parse", "HEAD") !== sourceCommit) {
  throw new Error(`Expected source commit ${sourceCommit} at HEAD before evidence packaging.`);
}

const currentAppTree = git("rev-parse", `${sourceCommit}:app`);
const currentMirrorTree = git("rev-parse", `${sourceCommit}:${mirrorRoot}`);
const allResults = [];

function auditEntries(entries, kind) {
  for (const entry of entries) {
    const sourcePath = entry.sourcePath;
    const domainPath = `${mirrorRoot}/${entry.domainPath}`;
    const sourceBytes = fs.readFileSync(path.join(root, sourcePath));
    const domainBytes = fs.readFileSync(path.join(root, domainPath));
    const sourceNormalized = normalize(sourceBytes);
    const domainNormalized = normalize(domainBytes);
    const sourceBlob = git("rev-parse", `${sourceCommit}:${sourcePath}`);
    const domainBlob = git("rev-parse", `${sourceCommit}:${domainPath}`);
    const normalizedContentEqual = sourceNormalized.equals(domainNormalized);
    const gitBlobEqual = sourceBlob === domainBlob;

    entry.sourceSha256 = hash(sourceBytes);
    entry.domainSha256 = hash(domainBytes);
    entry.rawBytesEqual = sourceBytes.equals(domainBytes);
    entry.normalizedSha256 = hash(sourceNormalized);
    entry.normalizedContentEqual = normalizedContentEqual;

    allResults.push({
      kind,
      sourcePath,
      domainPath,
      sourceSha256: entry.sourceSha256,
      domainSha256: entry.domainSha256,
      sourceGitBlob: sourceBlob,
      domainGitBlob: domainBlob,
      rawBytesEqual: entry.rawBytesEqual,
      normalizedContentEqual,
      gitBlobEqual,
    });
  }
}

auditEntries(manifest.mirror.sourceFiles, "source");
auditEntries(manifest.mirror.testFiles, "test");

const override = manifest.mirror.domainOverride;
const overridePath = `${mirrorRoot}/${override.path}`;
const canonicalConfig = fs.readFileSync(path.join(root, "app", override.path));
const domainConfig = fs.readFileSync(path.join(root, overridePath));
const domainConfigText = domainConfig.toString("utf8");
const overridePreserved = domainConfigText.includes(override.canonicalUrl);
const overrideAudit = {
  path: override.path,
  canonicalUrl: override.canonicalUrl,
  preserved: overridePreserved,
  sourceSha256: hash(canonicalConfig),
  domainSha256: hash(domainConfig),
};
override.sha256 = overrideAudit.domainSha256;
override.appDefaultSha256 = overrideAudit.sourceSha256;
override.preserved = overridePreserved;

const normalizedParityFailures = allResults.filter((result) => !result.normalizedContentEqual);
const gitBlobParityFailures = allResults.filter((result) => !result.gitBlobEqual);
const rawParityFailures = allResults.filter((result) => !result.rawBytesEqual);
const audit = {
  schemaVersion: 1,
  status: normalizedParityFailures.length === 0 && gitBlobParityFailures.length === 0 && overridePreserved ? "PASS" : "FAIL",
  sourceCommit,
  sourceAppTree: currentAppTree,
  domainTree: currentMirrorTree,
  sourceFileCount: manifest.mirror.sourceFiles.length,
  testFileCount: manifest.mirror.testFiles.length,
  rawParityFailures: rawParityFailures.length,
  normalizedParityFailures: normalizedParityFailures.length,
  gitBlobParityFailures: gitBlobParityFailures.length,
  domainOverride: overrideAudit,
  mismatches: [...normalizedParityFailures, ...gitBlobParityFailures],
  files: allResults,
  limitations: [
    "Raw worktree bytes can differ because the canonical and domain folders use different line endings; committed Git blobs and normalized content are checked separately.",
    "This audit establishes source/mirror correspondence, not application correctness, visual fidelity, test success, or deployment state.",
  ],
};
fs.writeFileSync(auditPath, `${JSON.stringify(audit, null, 2)}\n`, "utf8");

const identity = manifest.sourceIdentity;
identity.parentCommit = sourceBaseCommit;
identity.sourceCommit = sourceCommit;
identity.acceptedInputCommit = "500d10fa5901be48d4ff877e608d65ba0e271bb9";
identity.acceptedInputAppTree = "ba0b709192367e1d12a796618f97801a8fcd5a70";
identity.resultingAppTree = currentAppTree;
identity.sourceBaseCommit = sourceBaseCommit;
identity.sourceBaseAppTree = "6ab180f831661e43cc035fe9d70eec67372dd708";
identity.governingPackets = [
  "docs/planning/reconciliation-packets/2026-10-16-pre-g7-31-mobile-home-framing.md",
  "docs/planning/reconciliation-packets/2026-10-16-pre-g7-30-perf-suite-trace-recapture.md",
  "docs/planning/reconciliation-packets/2026-10-16-pre-g7-29-full-suite-startup-trace.md",
  ...identity.governingPackets,
].filter((value, index, all) => all.indexOf(value) === index);
identity.visualCandidateEvidence = "deliveries/G7/preparation/maker-evidence/pre-g7-31/";
identity.formalAcceptance = "PRE-G7-31 is an unaccepted mobile-camera candidate. Browser capture, tests, build, independent audit, human visual review, and Parent ruling remain pending.";
identity.taskBranchParentCommit = taskPacketCommit;
identity.testSupportCommits = ["d86d3d68c34fcdff6319c7945c7d74e87ce81946", sourceCommit];
identity.validationReport = "deliveries/G7/preparation/maker-evidence/pre-g7-31/REPORT.md";
identity.packet = "PRE-G7-31";
manifest.mirror.resultingTree = currentMirrorTree;

manifest.mirror.audit = {
  status: audit.status,
  sourceFiles: manifest.mirror.sourceFiles.length,
  testFiles: manifest.mirror.testFiles.length,
  rawParityFailures: rawParityFailures.length,
  baseCommit: sourceCommit,
  readmeSha256: hash(fs.readFileSync(path.join(root, "yorayriniwnl.in", "README.md"))),
  evidence: "deliveries/G7/preparation/maker-evidence/pre-g7-31/source-mirror-parity-audit.json",
  normalizedParityFailures: normalizedParityFailures.length,
  gitBlobParityFailures: gitBlobParityFailures.length,
};

fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify({
  status: audit.status,
  sourceCommit,
  sourceAppTree: currentAppTree,
  domainTree: currentMirrorTree,
  sourceFiles: audit.sourceFileCount,
  testFiles: audit.testFileCount,
  rawParityFailures: audit.rawParityFailures,
  normalizedParityFailures: audit.normalizedParityFailures,
  gitBlobParityFailures: audit.gitBlobParityFailures,
  overridePreserved,
}, null, 2)}\n`);

if (audit.status !== "PASS") process.exitCode = 1;
