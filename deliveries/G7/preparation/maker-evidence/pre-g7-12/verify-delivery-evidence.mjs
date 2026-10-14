import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../../../../../");
const manifestPath = path.join(here, "SHA256SUMS.json");
const evidenceCommit = process.argv[2] || "HEAD";
const gitText = args => execFileSync("git", args, { cwd: repo, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
function readBlobs(commit, paths) {
  if (!paths.length) return new Map();
  const specs = paths.map(p => commit + ":" + p);
  const bytes = execFileSync("git", ["cat-file", "--batch"], {
    cwd: repo,
    input: specs.join("\n") + "\n",
    maxBuffer: 512 * 1024 * 1024
  });
  const result = new Map();
  let cursor = 0;
  for (const spec of specs) {
    const newline = bytes.indexOf(10, cursor);
    if (newline < 0) throw new Error("Missing git cat-file header for " + spec);
    const [object, kind, sizeText] = bytes.subarray(cursor, newline).toString("utf8").split(" ");
    const size = Number(sizeText);
    if (kind !== "blob" || !Number.isSafeInteger(size)) throw new Error("Invalid blob header for " + spec);
    const start = newline + 1;
    const end = start + size;
    if (end >= bytes.length || bytes[end] !== 10) throw new Error("Truncated git blob for " + spec);
    result.set(spec, { object, blob: bytes.subarray(start, end) });
    cursor = end + 1;
  }
  if (cursor !== bytes.length) throw new Error("Unexpected trailing bytes from git cat-file");
  return result;
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const failures = [];
const sourceEntries = manifest.entries.filter(e => e.commit === "source");
const evidenceEntries = manifest.entries.filter(e => e.commit === "evidence");
const sourceBlobs = readBlobs(manifest.sourceCommit, sourceEntries.map(e => e.path));
const evidenceBlobs = readBlobs(evidenceCommit, evidenceEntries.map(e => e.path));
for (const entry of manifest.entries) {
  const commit = entry.commit === "source" ? manifest.sourceCommit : evidenceCommit;
  const spec = commit + ":" + entry.path;
  const item = (entry.commit === "source" ? sourceBlobs : evidenceBlobs).get(spec);
  if (!item) {
    failures.push({ path: entry.path, missing: true });
    continue;
  }
  const hash = crypto.createHash("sha256").update(item.blob).digest("hex");
  if (item.object !== entry.gitBlob || hash !== entry.sha256 || item.blob.length !== entry.bytes) {
    failures.push({ path: entry.path, objectMatches: item.object === entry.gitBlob, sha256Matches: hash === entry.sha256, byteCountMatches: item.blob.length === entry.bytes });
  }
}
const paths = gitText(["ls-tree", "-r", "--name-only", "-z", evidenceCommit]).split("\0").filter(Boolean);
const expectedEvidence = new Set(evidenceEntries.filter(e => e.path.startsWith("deliveries/G7/preparation/maker-evidence/pre-g7-12/")).map(e => e.path));
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
