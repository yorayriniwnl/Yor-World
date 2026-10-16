import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const sourceCommit = process.argv[2] || "8ff3c929030c77208d31b937dc800e6ebdd2e6a2";
const baselineCommit = "500d10fa5901be48d4ff877e608d65ba0e271bb9";
const taskBranchParentCommit = "8dfda048a40349e49082b138ff17e024e944f66b";
const manifestPath = path.join(root, "yorayriniwnl.in", "source-delivery-manifest.json");
const auditPath = path.join(root, "deliveries/G7/preparation/maker-evidence/pre-g7-25/source/mirror-parity-audit.json");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const normalize = (buffer) => buffer.includes(0) ? buffer : Buffer.from(buffer.toString("utf8").replace(/\r\n?/g, "\n"));
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }).trim();

function walk(directory, relative = "") {
  return fs.readdirSync(path.join(root, directory, relative), { withFileTypes: true })
    .flatMap((entry) => {
      const child = path.posix.join(relative.replaceAll("\\", "/"), entry.name);
      if (entry.isDirectory()) return walk(directory, child);
      return entry.isFile() ? [child] : [];
    })
    .sort();
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const sourceObjects = new Map(
  git("ls-tree", "-r", "--full-tree", sourceCommit)
    .split(/\r?\n/)
    .flatMap((line) => {
      const match = /^\d+ blob ([0-9a-f]+)\t(.+)$/.exec(line);
      return match ? [[match[2], match[1]]] : [];
    }),
);
const sourceFiles = walk("app/src")
  .map((relative) => `src/${relative}`)
  .filter((relative) => relative !== "src/config/public-base-url.ts");
const testPaths = [...new Set([
  ...manifest.mirror.testFiles.map((entry) => entry.sourcePath.slice("app/".length)),
  "tests/integration/runtime/frozen-world-binding.test.ts",
  "tests/unit/low-quality-batch.test.ts",
  "tests/unit/static-batch-production-report.test.ts",
  "tests/performance/world.spec.ts",
])].sort();

function describePair(relative) {
  const sourcePath = `app/${relative}`;
  const domainPath = relative;
  const source = fs.readFileSync(path.join(root, ...sourcePath.split("/")));
  const domain = fs.readFileSync(path.join(root, "yorayriniwnl.in", ...domainPath.split("/")));
  const sourceNormalized = normalize(source);
  const domainNormalized = normalize(domain);
  const sourceGitBlob = sourceObjects.get(sourcePath);
  const domainGitBlob = sourceObjects.get(`yorayriniwnl.in/${domainPath}`);
  if (!sourceGitBlob || !domainGitBlob) throw new Error(`Committed Git blob is missing for ${sourcePath} or ${domainPath}`);
  return {
    entry: {
      sourcePath,
      domainPath,
      sourceSha256: sha256(source),
      domainSha256: sha256(domain),
      rawBytesEqual: source.equals(domain),
      normalizedSha256: sha256(sourceNormalized),
      normalizedContentEqual: sourceNormalized.equals(domainNormalized),
    },
    audit: {
      sourcePath,
      domainPath,
      sourceExists: true,
      domainExists: true,
      sourceGitBlob,
      domainGitBlob,
      gitBlobEqual: sourceGitBlob === domainGitBlob,
      sourceSha256: sha256(source),
      domainSha256: sha256(domain),
      rawBytesEqual: source.equals(domain),
      normalizedContentEqual: sourceNormalized.equals(domainNormalized),
    },
  };
}

const pairs = [...sourceFiles, ...testPaths].map(describePair);
const baselineAppTree = git("rev-parse", `${baselineCommit}:app`);
const resultingAppTree = git("rev-parse", `${sourceCommit}:app`);
const mismatches = pairs.map((pair) => pair.audit).filter((entry) => !entry.normalizedContentEqual || !entry.gitBlobEqual);
const rawParityFailures = pairs.filter((pair) => !pair.entry.rawBytesEqual).length;
const readmeSha256 = sha256(fs.readFileSync(path.join(root, "yorayriniwnl.in", "README.md")));

manifest.sourceIdentity = {
  ...manifest.sourceIdentity,
  parentCommit: baselineCommit,
  taskBranchParentCommit,
  sourceCommit,
  acceptedInputCommit: baselineCommit,
  acceptedInputAppTree: baselineAppTree,
  resultingAppTree,
  sourceBaseCommit: baselineCommit,
  sourceBaseAppTree: baselineAppTree,
  productionRuntimeSourceCommit: "3ad7e1c390cba7073229f008b38211c8e957c9dc",
  productionRuntimeAppTree: "202012f7d1ced70f6d5136d53d864288c52e022b",
  testSupportCommits: ["bf4a4859b2dac16cdba28b0a90b11e6341c4d99f", "8ff3c929030c77208d31b937dc800e6ebdd2e6a2"],
  governingPackets: [
    "docs/planning/reconciliation-packets/2026-10-16-pre-g7-25-surface-parity-correction.md",
    "docs/planning/reconciliation-packets/2026-10-16-pre-g7-24-surface-parameter-batching.md",
    "docs/planning/reconciliation-packets/2026-10-16-pre-g7-23-render-call-budget.md",
    "docs/planning/reconciliation-packets/2026-10-15-pre-g7-22-home-scene-reference-fidelity.md",
    "docs/planning/reconciliation-packets/2026-10-15-pre-g7-22-c1-evidence-build-flag.md",
    "docs/planning/validation-and-production.md",
  ],
  visualCandidateEvidence: "deliveries/G7/preparation/maker-evidence/pre-g7-25/",
  validationReport: "deliveries/G7/preparation/maker-evidence/pre-g7-25/REPORT.md",
  formalAcceptance: "PRE-G7-25 source candidate is unaccepted pending independent audit and parent ruling",
};

manifest.mirror.sourceFiles = sourceFiles.map((relative) => describePair(relative).entry);
manifest.mirror.testFiles = testPaths.map((relative) => describePair(relative).entry);
const domainOverridePath = "src/config/public-base-url.ts";
const domainOverride = fs.readFileSync(path.join(root, "yorayriniwnl.in", domainOverridePath));
const appDefault = fs.readFileSync(path.join(root, "app", domainOverridePath));
manifest.mirror.domainOverride = {
  ...manifest.mirror.domainOverride,
  sha256: sha256(domainOverride),
  appDefaultSha256: sha256(appDefault),
  preserved: true,
};
manifest.mirror.audit = {
  ...manifest.mirror.audit,
  status: mismatches.length ? "FAIL" : "PASS",
  sourceFiles: sourceFiles.length,
  testFiles: testPaths.length,
  rawParityFailures,
  gitBlobParityFailures: pairs.filter((pair) => !pair.audit.gitBlobEqual).length,
  normalizedParityFailures: mismatches.length,
  baseCommit: sourceCommit,
  readmeSha256,
  evidence: "deliveries/G7/preparation/maker-evidence/pre-g7-25/source/mirror-parity-audit.json",
};

const audit = {
  schemaVersion: 1,
  taskBranchParentCommit,
  sourceBaseCommit: baselineCommit,
  sourceCommit,
  acceptedInputAppTree: baselineAppTree,
  resultingAppTree,
  sourceFiles: pairs.map((pair) => pair.audit),
  sourceCount: sourceFiles.length,
  testCount: testPaths.length,
  rawParityFailures,
  gitBlobParityFailures: pairs.filter((pair) => !pair.audit.gitBlobEqual).length,
  normalizedParityFailures: mismatches,
  domainOverride: {
    path: domainOverridePath,
    canonicalUrl: "https://yorayriniwnl.in",
    sha256: sha256(domainOverride),
    appDefaultSha256: sha256(appDefault),
    sourceOverrideIsIntentionallyDifferent: !domainOverride.equals(appDefault),
  },
  status: mismatches.length ? "FAIL" : "PASS",
};

fs.mkdirSync(path.dirname(auditPath), { recursive: true });
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
fs.writeFileSync(auditPath, `${JSON.stringify(audit, null, 2)}\n`, "utf8");
process.stdout.write(`${audit.status}: ${pairs.length} committed source/mirror pairs; ${mismatches.length} Git blob or normalized content mismatches\n`);
if (mismatches.length) process.exitCode = 1;
