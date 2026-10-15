import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const evidencePrefix = "deliveries/G7/preparation/maker-evidence/pre-g7-13/attempt-55/";
const inventoryPath = `${evidencePrefix}evidence-file-hashes.json`;
const allowedExact = new Set([
  "app/src/features/world/world.module.css",
  "yorayriniwnl.in/src/features/world/world.module.css",
  "yorayriniwnl.in/source-delivery-manifest.json",
]);
const stagedOutput = execFileSync("git", ["diff", "--cached", "--name-only", "-z"], { cwd: root });
const stagedPaths = stagedOutput.toString("utf8").split("\0").filter(Boolean);
const includedPaths = stagedPaths.filter((file) => file !== inventoryPath).sort();
const outOfScope = includedPaths.filter((file) => !allowedExact.has(file) && !file.startsWith(evidencePrefix));
if (outOfScope.length) throw new Error(`staged path outside PRE-G7-13E scope: ${outOfScope.join(", ")}`);

const indexOutput = execFileSync("git", ["ls-files", "-s", "-z"], { cwd: root, maxBuffer: 64 * 1024 * 1024 });
const indexEntries = new Map();
for (const entry of indexOutput.toString("utf8").split("\0").filter(Boolean)) {
  const tab = entry.indexOf("\t");
  const meta = entry.slice(0, tab).split(" ");
  const file = entry.slice(tab + 1);
  if (meta[2] === "0") indexEntries.set(file, { mode: meta[0], oid: meta[1] });
}
const missing = includedPaths.filter((file) => !indexEntries.has(file));
if (missing.length) throw new Error(`staged path missing index blob: ${missing.join(", ")}`);

const blobOids = includedPaths.map((file) => indexEntries.get(file).oid);
const batchInput = Buffer.from(`${blobOids.join("\n")}\n`, "utf8");
const batch = spawnSync("git", ["cat-file", "--batch"], { cwd: root, input: batchInput, maxBuffer: 1024 * 1024 * 1024 });
if (batch.error) throw batch.error;
if (batch.status !== 0) throw new Error(`git cat-file --batch failed: ${batch.stderr.toString("utf8")}`);

const rows = [];
let cursor = 0;
for (let index = 0; index < includedPaths.length; index += 1) {
  const headerEnd = batch.stdout.indexOf(0x0a, cursor);
  if (headerEnd < 0) throw new Error("truncated git cat-file batch header");
  const header = batch.stdout.subarray(cursor, headerEnd).toString("ascii").split(" ");
  const [oid, type, sizeText] = header;
  if (oid !== blobOids[index]) throw new Error(`cat-file returned unexpected blob for ${includedPaths[index]}`);
  if (type !== "blob") throw new Error(`expected blob for ${includedPaths[index]}, found ${type}`);
  const size = Number(sizeText);
  const start = headerEnd + 1;
  const end = start + size;
  const bytes = batch.stdout.subarray(start, end);
  if (bytes.length !== size) throw new Error(`truncated staged blob for ${includedPaths[index]}`);
  rows.push({ path: includedPaths[index], blobOid: oid, bytes: size, sha256: createHash("sha256").update(bytes).digest("hex") });
  cursor = end;
  if (batch.stdout[cursor] !== 0x0a) throw new Error(`missing batch separator after ${includedPaths[index]}`);
  cursor += 1;
}

const result = {
  status: "PASS",
  sourceCheckpoint: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  stagedPathCount: includedPaths.length,
  excludedSelf: inventoryPath,
  outOfScopePaths: outOfScope,
  entries: rows,
};
writeFileSync(path.join(root, inventoryPath), `${JSON.stringify(result, null, 2)}\n`, "utf8");
process.stdout.write(`status=PASS\nstagedPathCount=${includedPaths.length}\ninventory=${inventoryPath}\n`);
