import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const outPath = path.join(root, "deliveries/G7/preparation/maker-evidence/pre-g7-13/attempt-54/evidence-file-hashes.json");
const inventoryPath = "deliveries/G7/preparation/maker-evidence/pre-g7-13/attempt-54/evidence-file-hashes.json";
const attemptPrefixes = Array.from({ length: 6 }, (_, i) => `deliveries/G7/preparation/maker-evidence/pre-g7-13/attempt-${i + 49}/`);
const exactPaths = new Set([
  "app/src/features/world/ReferenceComposition.ts",
  "yorayriniwnl.in/src/features/world/ReferenceComposition.ts",
  "yorayriniwnl.in/source-delivery-manifest.json",
]);
const staged = execFileSync("git", ["ls-files", "--stage", "-z"], { cwd: root, maxBuffer: 1_000_000_000 });
const entries = staged.toString("utf8").split("\0").filter(Boolean).map((row) => {
  const tab = row.indexOf("\t");
  const [mode, oid, stage] = row.slice(0, tab).split(" ");
  return { mode, oid, stage: Number(stage), filePath: row.slice(tab + 1) };
}).filter((entry) => (exactPaths.has(entry.filePath) || attemptPrefixes.some((prefix) => entry.filePath.startsWith(prefix))) && entry.filePath !== inventoryPath).sort((a, b) => a.filePath.localeCompare(b.filePath));

if (entries.some((entry) => entry.stage !== 0 || entry.mode !== "100644" && entry.mode !== "100755")) {
  throw new Error("Expected ordinary stage-0 file entries only");
}
if (entries.length === 0) throw new Error("No staged candidate/evidence entries found");

const batch = spawnSync("git", ["cat-file", "--batch"], {
  cwd: root,
  input: Buffer.from(`${entries.map((entry) => entry.oid).join("\n")}\n`, "ascii"),
  maxBuffer: 1_000_000_000,
});
if (batch.status !== 0) throw new Error(`git cat-file --batch failed: ${batch.stderr?.toString("utf8")}`);

let offset = 0;
const outputEntries = [];
for (const entry of entries) {
  const newline = batch.stdout.indexOf(0x0a, offset);
  if (newline < 0) throw new Error(`Missing blob header for ${entry.filePath}`);
  const header = batch.stdout.subarray(offset, newline).toString("ascii").split(" ");
  const [oid, type, sizeText] = header;
  const size = Number(sizeText);
  if (oid !== entry.oid || type !== "blob" || !Number.isSafeInteger(size)) throw new Error(`Unexpected blob header for ${entry.filePath}`);
  const start = newline + 1;
  const end = start + size;
  const bytes = batch.stdout.subarray(start, end);
  if (bytes.length !== size) throw new Error(`Truncated blob for ${entry.filePath}`);
  const gitOid = createHash("sha1").update(`blob ${size}\0`).update(bytes).digest("hex");
  if (gitOid !== entry.oid) throw new Error(`Staged Git blob verification failed for ${entry.filePath}`);
  outputEntries.push({ path: entry.filePath, sizeBytes: size, sha256: createHash("sha256").update(bytes).digest("hex"), gitBlobOid: entry.oid });
  offset = end + 1;
}

const result = {
  status: "PASS",
  source: "staged Git index blobs read in one git cat-file --batch call",
  inventoryExcludesItself: true,
  entryCount: outputEntries.length,
  entries: outputEntries,
};
writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify({ status: result.status, entryCount: result.entryCount, output: path.relative(root, outPath) }, null, 2)}\n`);
