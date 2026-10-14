import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../../../../../");
const evidenceDir = here;
const baseCommit = process.argv[2] || "67026f26bb80d81de4edf632b3038b0239eea4de";
const sourceCommit = process.argv[3] || "133529868c8c7279831cbbffe35ab23178012b8c";
const evidenceCommit = process.argv[4] || "HEAD";
const output = path.join(evidenceDir, "SHA256SUMS.json");
const run = (args, encoding = "utf8") => execFileSync("git", args, { cwd: repo, ...(encoding ? { encoding } : {}), stdio: ["ignore", "pipe", "pipe"] });
const sourceTree = run(["rev-parse", sourceCommit + ":app"]).trim();
const evidencePaths = run(["ls-tree", "-r", "--name-only", "-z", evidenceCommit]).split("\0").filter(Boolean);
const sourceAppPaths = run(["diff", "--name-only", "--diff-filter=ACMRT", baseCommit, sourceCommit, "--", "app"]).trim().split(/\r?\n/).filter(Boolean);
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
for (const entry of entries) {
  const commit = entry.commit === "source" ? sourceCommit : evidenceCommit;
  const spec = commit + ":" + entry.path;
  const blob = run(["cat-file", "blob", spec], null);
  entry.gitBlob = run(["rev-parse", spec]).trim();
  entry.sha256 = crypto.createHash("sha256").update(blob).digest("hex");
  entry.bytes = blob.length;
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

