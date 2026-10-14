import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..", "..", "..", "..", "..");
const appRoot = path.join(root, "app");
const domainRoot = path.join(root, "yorayriniwnl.in");
const manifestPath = path.join(domainRoot, "source-delivery-manifest.json");
const auditPath = path.join(here, "mirror-sync-audit.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const audit = JSON.parse(readFileSync(auditPath, "utf8"));

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const normalizedSha256 = (bytes) => sha256(Buffer.from(bytes.toString("utf8").replace(/\r\n?/g, "\n"), "utf8"));
const sourceCommit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
const resultingAppTree = execFileSync("git", ["rev-parse", `${sourceCommit}:app`], { cwd: root, encoding: "utf8" }).trim();
const baseCommit = execFileSync("git", ["rev-parse", `${sourceCommit}^`], { cwd: root, encoding: "utf8" }).trim();

if (audit.status !== "PASS" || audit.rawParityFailures !== 0 || audit.sourceFiles !== 117 || audit.testFiles !== 8) {
  throw new Error("The final mirror audit is not a complete 117-source/8-test PASS.");
}

function bindEntry(entry) {
  const sourceRelative = entry.sourcePath.replace(/^app\//, "");
  const sourceBytes = readFileSync(path.join(appRoot, sourceRelative));
  const domainBytes = readFileSync(path.join(domainRoot, entry.domainPath));
  if (!sourceBytes.equals(domainBytes)) throw new Error(`Raw mirror mismatch: ${entry.sourcePath}`);
  return {
    ...entry,
    normalizedSha256: normalizedSha256(sourceBytes),
    normalizedContentEqual: true,
  };
}

manifest.sourceIdentity = {
  ...manifest.sourceIdentity,
  parentCommit: baseCommit,
  sourceCommit,
  acceptedInputCommit: "cfdc744f69cd257c8ac0cbaad78b8805c48f20d5",
  acceptedInputAppTree: "915c26f4b9a1fa075614ea64959750f9e486187c",
  resultingAppTree,
  sourceBaseCommit: "133529868c8c7279831cbbffe35ab23178012b8c",
  sourceBaseAppTree: "06f2b4ad62f8022bc4f2d410d67ffa197316e6ab",
  governingPackets: [
    "docs/planning/reconciliation-packets/2026-10-14-pre-g7-13-anchor-articulation.md",
    "docs/planning/reconciliation-packets/2026-10-14-pre-g7-13-a1-hex-panel-shape.md",
  ],
  visualCandidateEvidence: "deliveries/G7/preparation/maker-evidence/pre-g7-13/attempt-50/",
  formalAcceptance: "pending independent audit; maker does not self-accept",
};

const domainOverridePath = "src/config/public-base-url.ts";
const domainOverrideBytes = readFileSync(path.join(domainRoot, domainOverridePath));
const appOverrideBytes = readFileSync(path.join(appRoot, domainOverridePath));
manifest.mirror = {
  ...manifest.mirror,
  sourceRoot: "app/",
  deliveryRoot: "yorayriniwnl.in/",
  sourceFiles: audit.sourceEntries.map(bindEntry),
  testFiles: audit.testEntries.map(bindEntry),
  domainOverride: {
    path: domainOverridePath,
    canonicalUrl: "https://yorayriniwnl.in",
    reason: "Intentional domain-specific canonical metadata, robots, and sitemap origin.",
    sha256: sha256(domainOverrideBytes),
    appDefaultSha256: sha256(appOverrideBytes),
    preserved: true,
  },
  audit: {
    status: "PASS",
    sourceFiles: audit.sourceFiles,
    testFiles: audit.testFiles,
    rawParityFailures: audit.rawParityFailures,
    baseCommit: sourceCommit,
    readmeSha256: sha256(readFileSync(path.join(domainRoot, "README.md"))),
    evidence: "deliveries/G7/preparation/maker-evidence/pre-g7-13/attempt-50/mirror-sync-audit.json",
  },
};

writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
const summary = {
  status: "PASS",
  sourceCommit,
  resultingAppTree,
  sourceFiles: manifest.mirror.sourceFiles.length,
  testFiles: manifest.mirror.testFiles.length,
  rawParityFailures: 0,
  domainOverridePreserved: manifest.mirror.domainOverride.preserved,
  domainOverrideSha256: manifest.mirror.domainOverride.sha256,
};
writeFileSync(path.join(here, "final-manifest-refresh.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
