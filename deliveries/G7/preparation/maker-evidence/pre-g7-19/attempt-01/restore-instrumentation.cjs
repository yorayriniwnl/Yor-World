const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");

const evidenceRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(evidenceRoot, "../../../../..");
const baseline = JSON.parse(fs.readFileSync(path.join(evidenceRoot, "profiles/baseline-identity.json"), "utf8"));
const pairs = [
  { source: "app/tests/unit/boundaries.test.ts", snapshot: "input/source-base/app-boundaries.test.ts", baseline: baseline.appTest },
  { source: "yorayriniwnl.in/tests/unit/boundaries.test.ts", snapshot: "input/source-base/domain-boundaries.test.ts", baseline: baseline.domainMirror },
];
const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const records = [];
for (const pair of pairs) {
  const destination = path.join(repoRoot, pair.source);
  const snapshot = path.join(evidenceRoot, pair.snapshot);
  fs.copyFileSync(snapshot, destination);
  const bytes = fs.readFileSync(destination);
  const blob = spawnSync("git", ["hash-object", "--", pair.source], { cwd: repoRoot, encoding: "utf8" });
  if (blob.status !== 0) throw new Error(blob.stderr || `git hash-object failed: ${pair.source}`);
  records.push({
    path: pair.source,
    bytes: bytes.length,
    rawSha256: sha(bytes),
    gitBlob: blob.stdout.trim(),
    matchesBaseRaw: bytes.length === pair.baseline.bytes && sha(bytes) === pair.baseline.rawSha256,
    matchesBaseBlob: blob.stdout.trim() === pair.baseline.gitBlob,
  });
}
const receipt = {
  action: "restored temporary timing instrumentation from byte-exact pre-run source snapshots",
  paths: records,
  pairGitBlobsEqual: records[0].gitBlob === records[1].gitBlob,
  sourceCandidateUnchanged: records.every((entry) => entry.matchesBaseRaw && entry.matchesBaseBlob),
};
fs.writeFileSync(path.join(__dirname, "restore-run.json"), JSON.stringify(receipt, null, 2) + "\n");
process.stdout.write(JSON.stringify(receipt, null, 2) + "\n");
if (!receipt.sourceCandidateUnchanged || !receipt.pairGitBlobsEqual) process.exitCode = 1;
