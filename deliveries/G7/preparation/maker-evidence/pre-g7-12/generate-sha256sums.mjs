import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../../../../../");
const baseCommit = process.argv[2] || "67026f26bb80d81de4edf632b3038b0239eea4de";
const sourceCommit = process.argv[3] || "133529868c8c7279831cbbffe35ab23178012b8c";
const evidenceCommit = process.argv[4] || "HEAD";
const output = path.join(here, "SHA256SUMS.json");
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

const sourceTree = gitText(["rev-parse", sourceCommit + ":app"]).trim();
const evidencePaths = gitText(["ls-tree", "-r", "--name-only", "-z", evidenceCommit]).split("\0").filter(Boolean);
const sourceAppPaths = gitText(["diff", "--name-only", "--diff-filter=ACMRT", baseCommit, sourceCommit, "--", "app"]).trim().split(/\r?\n/).filter(Boolean);
const requiredInputs = [
  "AGENTS.md",
  "START_HERE.md",
  "docs/planning/reconciliation-packets/2026-10-14-pre-g7-12-reference-composition.md",
  "docs/planning/reviews/2026-10-14-pre-g7-11-fullscreen-domain-acceptance.md",
  "docs/superpowers/specs/2026-09-30-yor-world-design.md",
  "docs/planning/art-and-experience.md",
  "docs/planning/validation-and-production.md",
  "references/manifest.json",
  "references/images/main-reference.png"
];
const unique = new Map();
for (const p of sourceAppPaths) unique.set("source:" + p, { path: p, commit: "source" });
unique.set("source:app/public/models/production-room-full.glb", { path: "app/public/models/production-room-full.glb", commit: "source" });
for (const p of requiredInputs) unique.set("evidence:" + p, { path: p, commit: "evidence" });
for (const p of evidencePaths) {
  if (p.startsWith("yorayriniwnl.in/")) unique.set("evidence:" + p, { path: p, commit: "evidence" });
  if (p.startsWith("deliveries/G7/preparation/maker-evidence/pre-g7-12/") && !p.endsWith("/SHA256SUMS.json")) {
    unique.set("evidence:" + p, { path: p, commit: "evidence" });
  }
}
const entries = [...unique.values()].sort((a, b) => a.path.localeCompare(b.path));
const sourceEntries = entries.filter(e => e.commit === "source");
const evidenceEntries = entries.filter(e => e.commit === "evidence");
const sourceBlobs = readBlobs(sourceCommit, sourceEntries.map(e => e.path));
const evidenceBlobs = readBlobs(evidenceCommit, evidenceEntries.map(e => e.path));
for (const entry of entries) {
  const spec = (entry.commit === "source" ? sourceCommit : evidenceCommit) + ":" + entry.path;
  const item = (entry.commit === "source" ? sourceBlobs : evidenceBlobs).get(spec);
  entry.gitBlob = item.object;
  entry.sha256 = crypto.createHash("sha256").update(item.blob).digest("hex");
  entry.bytes = item.blob.length;
}
const manifest = {
  format: "SHA-256 over exact Git blob content",
  baseCommit,
  sourceCommit,
  sourceTree,
  evidenceSnapshotCommit: evidenceCommit,
  excludedSelfReferentialFile: "deliveries/G7/preparation/maker-evidence/pre-g7-12/SHA256SUMS.json",
  coverage: {
    changedCanonicalAppFiles: sourceAppPaths.length,
    acceptedProductionGlbIncluded: true,
    boundReferenceAndPacketInputs: requiredInputs.length,
    domainMirrorFiles: evidencePaths.filter(p => p.startsWith("yorayriniwnl.in/")).length,
    makerEvidenceFiles: evidencePaths.filter(p => p.startsWith("deliveries/G7/preparation/maker-evidence/pre-g7-12/") && !p.endsWith("/SHA256SUMS.json")).length
  },
  entries
};
fs.writeFileSync(output, JSON.stringify(manifest, null, 2) + "\n", "utf8");
process.stdout.write(JSON.stringify({ status: "PASS_GENERATED", entries: entries.length, coverage: manifest.coverage, output: path.relative(repo, output) }, null, 2) + "\n");
