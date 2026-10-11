import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const r4 = process.cwd();
const r3 = path.resolve(r4, "..", "r3");
const evidence = path.join(r4, "evidence");
const beforePath = path.join(evidence, "r3-before.json");
const afterPath = path.join(evidence, "r3-after.json");
const baseline = JSON.parse(fs.readFileSync(beforePath, "utf8"));
const current = JSON.parse(fs.readFileSync(afterPath, "utf8"));
const key = (entry) => `${entry.kind}:${entry.path}`;
const before = new Map(baseline.entries.map((entry) => [key(entry), entry]));
const now = new Map(current.entries.map((entry) => [key(entry), entry]));
const added = current.entries.filter((entry) => !before.has(key(entry)));
const removed = baseline.entries.filter((entry) => !now.has(key(entry)));
const changed = [];
for (const entry of current.entries) {
  const prior = before.get(key(entry));
  if (prior && entry.kind === "file" && (entry.bytes !== prior.bytes || entry.sha256 !== prior.sha256)) {
    const stat = fs.statSync(path.join(r3, entry.path));
    changed.push({
      path: entry.path,
      before: { bytes: prior.bytes, sha256: prior.sha256 },
      current: {
        bytes: entry.bytes,
        sha256: entry.sha256,
        createdAtUtc: stat.birthtime.toISOString(),
        modifiedAtUtc: stat.mtime.toISOString(),
      },
    });
  }
}

const baselineDirectCandidateChildren = new Set(baseline.entries
  .filter((entry) => entry.path.startsWith("candidate\\"))
  .map((entry) => entry.path.slice("candidate\\".length).split("\\")[0]));
const currentDirectCandidateChildren = fs.readdirSync(path.join(r3, "candidate"), { withFileTypes: true })
  .sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0);
const candidateChildMetadata = currentDirectCandidateChildren.map((child) => {
  const absolute = path.join(r3, "candidate", child.name);
  const stat = fs.statSync(absolute);
  const prefix = `candidate\\${child.name}`;
  const descendants = current.entries.filter((entry) => entry.path === prefix || entry.path.startsWith(`${prefix}\\`));
  const files = descendants.filter((entry) => entry.kind === "file");
  return {
    path: prefix,
    kind: child.isDirectory() ? "directory" : child.isSymbolicLink() ? "symlink" : "file",
    newSinceBaseline: !baselineDirectCandidateChildren.has(child.name),
    createdAtUtc: stat.birthtime.toISOString(),
    modifiedAtUtc: stat.mtime.toISOString(),
    fileCountIncludingDescendants: files.length,
    totalFileBytesIncludingDescendants: files.reduce((sum, entry) => sum + entry.bytes, 0),
  };
});
const rootEntriesBefore = baseline.entries.filter((entry) => !entry.path.includes("\\"));
const rootEntriesCurrent = current.entries.filter((entry) => !entry.path.includes("\\"));
const baselineRootNames = new Set(rootEntriesBefore.map((entry) => entry.path));
const rootMetadata = rootEntriesCurrent.map((entry) => {
  const absolute = path.join(r3, entry.path);
  const stat = fs.statSync(absolute);
  const descendants = current.entries.filter((candidate) => candidate.path === entry.path || candidate.path.startsWith(`${entry.path}\\`));
  const files = descendants.filter((candidate) => candidate.kind === "file");
  return {
    path: entry.path,
    kind: entry.kind,
    newSinceBaseline: !baselineRootNames.has(entry.path),
    createdAtUtc: stat.birthtime.toISOString(),
    modifiedAtUtc: stat.mtime.toISOString(),
    fileCountIncludingDescendants: files.length,
    totalFileBytesIncludingDescendants: files.reduce((sum, file) => sum + file.bytes, 0),
  };
});

const beforeBytes = fs.readFileSync(beforePath);
const afterBytes = fs.readFileSync(afterPath);
const processEvidencePath = path.join(evidence, "r3-process-query.json");
const processEvidenceBytes = fs.readFileSync(processEvidencePath);
const processEvidence = JSON.parse(processEvidenceBytes.toString("utf8").replace(/^\uFEFF/, ""));
const result = {
  capturedAtUtc: new Date().toISOString(),
  baselineEvidence: {
    path: "evidence/r3-before.json",
    sha256: crypto.createHash("sha256").update(beforeBytes).digest("hex"),
    capturedAtUtc: baseline.capturedAtUtc,
    entryCount: baseline.entryCount,
    fileCount: baseline.fileCount,
    totalFileBytes: baseline.totalFileBytes,
    inventorySha256: baseline.inventorySha256,
  },
  currentEvidence: {
    path: "evidence/r3-after.json",
    sha256: crypto.createHash("sha256").update(afterBytes).digest("hex"),
    capturedAtUtc: current.capturedAtUtc,
    entryCount: current.entryCount,
    fileCount: current.fileCount,
    totalFileBytes: current.totalFileBytes,
    entriesSha256: current.currentEntriesSha256,
  },
  addedEntryCount: added.length,
  removedEntryCount: removed.length,
  changedFileCount: changed.length,
  addedRootPaths: rootMetadata.filter((entry) => entry.newSinceBaseline).map((entry) => entry.path),
  rootMetadata,
  addedDirectChildrenUnderCandidate: candidateChildMetadata.filter((entry) => entry.newSinceBaseline),
  candidateDirectChildMetadata: candidateChildMetadata,
  changedFiles: changed,
  processEvidence: {
    path: "evidence/r3-process-query.json",
    sha256: crypto.createHash("sha256").update(processEvidenceBytes).digest("hex"),
    capturedAtUtc: processEvidence.capturedAtUtc,
    matchingProcessCount: processEvidence.matches.length,
    observation: "No matching live process was found at the recorded read-only process query.",
    attribution: "Current process state does not identify who created the newer candidate contents. Candidate root timestamps show growth after the baseline capture, but do not prove actor identity.",
  },
  r3MutationByThisVerification: "None; inventory operations opened and hashed files read-only. All comparison artifacts are written under the assigned R4 root.",
};
fs.writeFileSync(path.join(evidence, "r3-discrepancy.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  capturedAtUtc: result.capturedAtUtc,
  baseline: result.baselineEvidence,
  current: result.currentEvidence,
  addedEntryCount: result.addedEntryCount,
  removedEntryCount: result.removedEntryCount,
  changedFileCount: result.changedFileCount,
  addedRootPaths: result.addedRootPaths,
  rootMetadata: result.rootMetadata,
  addedDirectChildrenUnderCandidate: result.addedDirectChildrenUnderCandidate,
  r3MutationByThisVerification: result.r3MutationByThisVerification,
}, null, 2));
