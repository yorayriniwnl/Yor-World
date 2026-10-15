import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const repositoryRoot = process.cwd();
const manifestPath = path.join(repositoryRoot, "yorayriniwnl.in", "source-delivery-manifest.json");
const evidencePath = path.join(repositoryRoot, "deliveries", "G7", "preparation", "maker-evidence", "pre-g7-22", "source", "mirror-parity-audit.json");
const baseCommit = "fc64a18a7ec1d027fb0a33400c2fcd6288d6afbf";
const governingPackets = [
  "docs/planning/reconciliation-packets/2026-10-15-pre-g7-22-home-scene-reference-fidelity.md",
  "docs/planning/reconciliation-packets/2026-10-15-pre-g7-22-c1-evidence-build-flag.md",
];
const sourceCommit = process.argv[2] || null;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const normalize = (value) => value.toString("utf8").replace(/\r\n?/g, "\n");
const git = (...args) => execFileSync("git", args, { cwd: repositoryRoot, encoding: "utf8" }).trim();

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const results = [];
for (const entry of [...manifest.mirror.sourceFiles, ...manifest.mirror.testFiles]) {
  const sourceFile = path.join(repositoryRoot, ...entry.sourcePath.split("/"));
  const domainFile = path.join(repositoryRoot, "yorayriniwnl.in", ...entry.domainPath.split("/"));
  const sourceExists = fs.existsSync(sourceFile);
  const domainExists = fs.existsSync(domainFile);
  const result = {
    sourcePath: entry.sourcePath,
    domainPath: entry.domainPath,
    sourceExists,
    domainExists,
  };
  if (sourceExists && domainExists) {
    const sourceBytes = fs.readFileSync(sourceFile);
    const domainBytes = fs.readFileSync(domainFile);
    const sourceNormalized = normalize(sourceBytes);
    const domainNormalized = normalize(domainBytes);
    result.sourceSha256 = sha256(sourceBytes);
    result.domainSha256 = sha256(domainBytes);
    result.rawBytesEqual = sourceBytes.equals(domainBytes);
    result.normalizedSha256 = sha256(sourceNormalized);
    result.normalizedContentEqual = sourceNormalized === domainNormalized;
    if (sourceCommit) {
      result.sourceGitBlob = git("rev-parse", `${sourceCommit}:${entry.sourcePath}`);
      result.domainGitBlob = git("rev-parse", `${sourceCommit}:yorayriniwnl.in/${entry.domainPath}`);
      result.gitBlobEqual = result.sourceGitBlob === result.domainGitBlob;
    }
    entry.sourceSha256 = result.sourceSha256;
    entry.domainSha256 = result.domainSha256;
    entry.rawBytesEqual = result.rawBytesEqual;
    entry.normalizedSha256 = result.normalizedSha256;
    entry.normalizedContentEqual = result.normalizedContentEqual;
  }
  results.push(result);
}

const baseAppTree = git("rev-parse", `${baseCommit}:app`);
const resultingAppTree = sourceCommit ? git("rev-parse", `${sourceCommit}:app`) : null;
manifest.sourceIdentity = {
  ...manifest.sourceIdentity,
  parentCommit: baseCommit,
  sourceCommit,
  acceptedInputCommit: baseCommit,
  acceptedInputAppTree: baseAppTree,
  resultingAppTree,
  sourceBaseCommit: baseCommit,
  sourceBaseAppTree: baseAppTree,
  governingPackets,
  visualCandidateEvidence: "deliveries/G7/preparation/maker-evidence/pre-g7-22/",
  formalAcceptance: "pending independent exact-commit audit and parent acceptance; maker does not self-accept",
};
const domainOverride = manifest.mirror.domainOverride;
const domainOverrideFile = path.join(repositoryRoot, "yorayriniwnl.in", ...domainOverride.path.split("/"));
const appDefaultFile = path.join(repositoryRoot, "app", ...domainOverride.path.split("/"));
domainOverride.sha256 = sha256(fs.readFileSync(domainOverrideFile));
domainOverride.appDefaultSha256 = sha256(fs.readFileSync(appDefaultFile));
domainOverride.preserved = true;
const missingOrDifferent = results.filter((item) =>
  !item.sourceExists || !item.domainExists || !item.normalizedContentEqual || (sourceCommit && item.gitBlobEqual !== true),
);
const readmePath = path.join(repositoryRoot, "yorayriniwnl.in", "README.md");
const baseAudit = {
  sourceFiles: manifest.mirror.sourceFiles.length,
  testFiles: manifest.mirror.testFiles.length,
  rawParityFailures: results.filter((item) => item.sourceExists && item.domainExists && !item.rawBytesEqual).length,
  gitBlobParityFailures: sourceCommit ? results.filter((item) => item.gitBlobEqual !== true).length : null,
  normalizedParityFailures: missingOrDifferent.length,
  baseCommit: sourceCommit,
  readmeSha256: sha256(fs.readFileSync(readmePath)),
  evidence: "deliveries/G7/preparation/maker-evidence/pre-g7-22/source/mirror-parity-audit.json",
};
manifest.mirror.audit = {
  ...manifest.mirror.audit,
  status: missingOrDifferent.length ? "FAIL" : sourceCommit ? "PASS" : "PARITY_PASS_SOURCE_BINDING_PENDING",
  ...baseAudit,
};
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

const audit = {
  schemaVersion: 1,
  sourceBaseCommit: baseCommit,
  sourceCommit,
  acceptedInputAppTree: baseAppTree,
  resultingAppTree,
  sourceFiles: results,
  sourceCount: manifest.mirror.sourceFiles.length,
  testCount: manifest.mirror.testFiles.length,
  rawParityFailures: results.filter((item) => item.sourceExists && item.domainExists && !item.rawBytesEqual).length,
  gitBlobParityFailures: sourceCommit ? results.filter((item) => item.gitBlobEqual !== true).length : null,
  normalizedParityFailures: missingOrDifferent,
  domainOverride: {
    ...domainOverride,
    sourceOverrideIsIntentionallyDifferent: domainOverride.sha256 !== domainOverride.appDefaultSha256,
  },
  status: missingOrDifferent.length ? "FAIL" : sourceCommit ? "PASS" : "PARITY_PASS_SOURCE_BINDING_PENDING",
};
fs.mkdirSync(path.dirname(evidencePath), { recursive: true });
fs.writeFileSync(evidencePath, `${JSON.stringify(audit, null, 2)}\n`, "utf8");
process.stdout.write(`${audit.status}: ${results.length} manifest paths checked; ${missingOrDifferent.length} normalized parity failures\n`);
if (missingOrDifferent.length) process.exitCode = 1;
