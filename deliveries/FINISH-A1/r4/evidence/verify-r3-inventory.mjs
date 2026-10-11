import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const r4 = process.cwd();
const r3 = path.resolve(r4, "..", "r3");
const baseline = JSON.parse(fs.readFileSync(path.join(r4, "evidence", "r3-before.json"), "utf8"));
const entries = [];

function walk(directory, prefix = "") {
  const children = fs.readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0);
  for (const child of children) {
    const relative = prefix ? `${prefix}\\${child.name}` : child.name;
    const absolute = path.join(directory, child.name);
    if (child.isDirectory()) {
      entries.push({ kind: "directory", path: relative });
      walk(absolute, relative);
    } else if (child.isFile()) {
      const bytes = fs.readFileSync(absolute);
      entries.push({ kind: "file", path: relative, bytes: bytes.length,
        sha256: crypto.createHash("sha256").update(bytes).digest("hex") });
    } else if (child.isSymbolicLink()) {
      entries.push({ kind: "symlink", path: relative, target: fs.readlinkSync(absolute) });
    } else {
      entries.push({ kind: "other", path: relative });
    }
  }
}

walk(r3);
const files = entries.filter((entry) => entry.kind === "file");
const currentEntriesSha256 = crypto.createHash("sha256").update(JSON.stringify(entries), "utf8").digest("hex");
const exactEntryMatch = JSON.stringify(entries) === JSON.stringify(baseline.entries);
const result = {
  path: "deliveries/FINISH-A1/r3",
  capturedAtUtc: new Date().toISOString(),
  entryCount: entries.length,
  fileCount: files.length,
  totalFileBytes: files.reduce((sum, entry) => sum + entry.bytes, 0),
  currentEntriesSha256,
  baselineInventorySha256: baseline.inventorySha256,
  exactEntryMatch,
  entries,
};
fs.writeFileSync(path.join(r4, "evidence", "r3-after.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
const integrity = {
  path: result.path,
  capturedAtUtc: result.capturedAtUtc,
  baseline: {
    entryCount: baseline.entryCount,
    fileCount: baseline.fileCount,
    totalFileBytes: baseline.totalFileBytes,
    inventorySha256: baseline.inventorySha256,
  },
  current: {
    entryCount: result.entryCount,
    fileCount: result.fileCount,
    totalFileBytes: result.totalFileBytes,
    entriesSha256: result.currentEntriesSha256,
  },
  comparison: exactEntryMatch ? "PASS: every path, type, byte length, and file SHA-256 matches the pre-write inventory" : "FAIL: inventory differs from the pre-write inventory",
  exactEntryMatch,
  note: "The current entries digest is SHA-256 of compact JSON.stringify(entries); the baseline inventory digest is preserved as recorded and is not assumed to use that same serialization.",
};
fs.writeFileSync(path.join(r4, "evidence", "r3-integrity.json"), `${JSON.stringify(integrity, null, 2)}\n`, "utf8");
console.log(JSON.stringify(integrity, null, 2));
if (!exactEntryMatch) process.exitCode = 1;
