import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../../../../../");
const manifestPath = path.join(here, "SHA256SUMS.json");
const evidenceCommit = process.argv[2] || "HEAD";
const run = (args, encoding = "utf8") => execFileSync("git", args, { cwd: repo, ...(encoding ? { encoding } : {}), maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const failures = [];
for (const entry of manifest.entries) {
  const commit = entry.commit === "source" ? manifest.sourceCommit : evidenceCommit;
  const spec = commit + ":" + entry.path;
  try {
    const blob = run(["cat-file", "blob", spec], null);
    const object = run(["rev-parse", spec], "utf8").trim();
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


