const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const evidenceRoot = __dirname;
const repoRoot = path.resolve(evidenceRoot, "..", "..", "..", "..", "..");
const parentRoot = "C:\\Users\\ayush\\COddexxxxxxxxxxxxxxxx-parent-pre-g7-13";
const inputs = [
  ["input/AGENTS.md", "AGENTS.md"],
  ["input/START_HERE.md", "START_HERE.md"],
  ["input/PRE-G7-21-packet.md", "docs/planning/reconciliation-packets/2026-10-15-pre-g7-21-current-source-build-evidence.md"],
  ["input/PRE-G7-17-parent-ruling.md", "docs/planning/reviews/2026-10-15-pre-g7-17-parent-ruling.md"],
  ["input/PRE-G7-19-parent-acceptance.md", "docs/planning/reviews/2026-10-15-pre-g7-19-parent-acceptance.md"],
  ["input/PRE-G7-20-parent-acceptance.md", "docs/planning/reviews/2026-10-15-pre-g7-20-parent-acceptance.md"],
  ["input/PRE-G7-20-independent-audit.md", "docs/planning/reviews/2026-10-15-pre-g7-20-independent-audit.md"],
];

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

const provenance = {
  schemaVersion: 1,
  parentPacketCommit: "a6fd3bf6c245aa7207a6373baf3236e2560c710c",
  normalization: "Verified the evidence copy against the parent-worktree source bytes, then converted CRLF line endings to LF; UTF-8 text content was unchanged.",
  inputs: [],
};

for (const [evidencePath, parentPath] of inputs) {
  const evidenceAbsolute = path.join(evidenceRoot, ...evidencePath.split("/"));
  const parentAbsolute = path.join(parentRoot, parentPath);
  const sourceBytes = fs.readFileSync(parentAbsolute);
  const copiedBytes = fs.readFileSync(evidenceAbsolute);
  if (!sourceBytes.equals(copiedBytes)) {
    throw new Error(`Evidence copy does not match parent source bytes: ${evidencePath}`);
  }
  const sourceText = sourceBytes.toString("utf8");
  if (!Buffer.from(sourceText, "utf8").equals(sourceBytes)) {
    throw new Error(`Input is not round-trip UTF-8: ${evidencePath}`);
  }
  const normalizedBytes = Buffer.from(sourceText.replace(/\r\n/g, "\n"), "utf8");
  fs.writeFileSync(evidenceAbsolute, normalizedBytes);
  provenance.inputs.push({
    evidencePath,
    parentPath,
    sourceBytes: sourceBytes.byteLength,
    sourceRawSha256: sha256(sourceBytes),
    normalizedBytes: normalizedBytes.byteLength,
    normalizedRawSha256: sha256(normalizedBytes),
  });
}

const outputPath = path.join(evidenceRoot, "input-provenance.json");
fs.writeFileSync(outputPath, `${JSON.stringify(provenance, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(provenance, null, 2)}\n`);
