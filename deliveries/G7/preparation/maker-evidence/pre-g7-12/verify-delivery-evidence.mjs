const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const repo = path.resolve(__dirname, "../../../../../");
const manifestPath = path.join(__dirname, "SHA256SUMS.json");
const evidenceCommit = process.argv[2] || "HEAD";
const run = (args, encoding = "utf8") => execFileSync("git", args, { cwd: repo, encoding, stdio: ["ignore", "pipe", "pipe"] });
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const failures = [];
for (const entry of manifest.entries) {
  const commit = entry.commit === "source" ? manifest.sourceCommit : evidenceCommit;
  const spec = commit + ":" + entry.path;
  try {
    const blob = run(["cat-file", "blob", spec], "buffer");
    const object = run(["rev-parse", spec]).trim();
    const hash = crypto.createHash("sha256").update(blob).digest("hex");
    if (object !== entry.gitBlob || hash !== entry.sha256 || blob.length !== entry.bytes) {
      failures.push({ path: entry.path, objectMatches: object === entry.gitBlob, sha256Matches: hash === entry.sha256, byteCountMatches: blob.length === entry.bytes });
    }
  } catch (error) {
    failures.push({ path: entry.path, missing: true, error: String(error.message || error).split(/\r?\n/)[0] });
  }
}
const paths = run(["ls-tree", "-r", "--name-only", "-z", evidenceCommit]).split("\0").filter(Boolean);
const expectedEvidence = new Set(manifest.entries.filter(e => e.commit === "evidence" && e.path.startsWith("deliveries/G7/preparation/maker-evidence/pre-g7-12/")).map(e => e.path));
const unexpectedEvidence = paths.filter(p => p.startsWith("deliveries/G7/preparation/maker-evidence/pre-g7-12/") && p !== manifest.excludedSelfReferentialFile && !expectedEvidence.has(p));
const missingEvidence = [...expectedEvidence].filter(p => !paths.includes(p));
if (unexpectedEvidence.length || missingEvidence.length) failures.push({ unexpectedEvidence, missingEvidence });
const result = {
  status: failures.length ? "FAIL" : "PASS",
  sourceCommit: manifest.sourceCommit,
  evidenceSnapshotCommit: manifest.evidenceSnapshotCommit,
  verifiedAgainstEvidenceCommit: evidenceCommit,
  entryCount: manifest.entries.length,
  failures
};
process.stdout.write(JSON.stringify(result, null, 2) + "\n");
if (failures.length) process.exitCode = 1;
