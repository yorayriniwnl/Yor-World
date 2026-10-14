import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const cwd = process.cwd();
const evidenceRoot = "deliveries/G7/preparation/maker-evidence/pre-g7-13";
const prefix = `${evidenceRoot}/`;
const attemptRoot = `${evidenceRoot}/attempt-33`;
const reportPath = `${evidenceRoot}/REPORT.md`;
const inventoryPath = `${attemptRoot}/evidence-file-hashes.json`;

function gitBytes(args, input) {
  const result = spawnSync("git", args, {
    cwd,
    input,
    encoding: null,
    maxBuffer: 256 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr?.toString("utf8") ?? ""}`);
  }
  return result.stdout;
}

function nulRecords(bytes) {
  return bytes.toString("utf8").split("\0").filter(Boolean);
}

function indexEntries() {
  return nulRecords(gitBytes(["ls-files", "-s", "-z", "--", attemptRoot, reportPath])).map((row) => {
    const tab = row.indexOf("\t");
    if (tab < 0) throw new Error(`invalid git ls-files row: ${row}`);
    const [mode, oid, stage] = row.slice(0, tab).split(" ");
    const repoPath = row.slice(tab + 1);
    if (stage !== "0") throw new Error(`unexpected merge stage ${stage}: ${repoPath}`);
    return { mode, oid, repoPath };
  });
}

function commitEntries(ref) {
  return nulRecords(gitBytes(["ls-tree", "-r", "-z", ref, "--", attemptRoot, reportPath])).map((row) => {
    const tab = row.indexOf("\t");
    if (tab < 0) throw new Error(`invalid git ls-tree row: ${row}`);
    const [mode, type, oid] = row.slice(0, tab).split(" ");
    const repoPath = row.slice(tab + 1);
    if (type !== "blob") throw new Error(`unexpected Git object type ${type}: ${repoPath}`);
    return { mode, oid, repoPath };
  });
}

function readBlobs(entries) {
  const missingInventory = entries.filter((entry) => !entry.oid);
  if (missingInventory.length) throw new Error("a Git blob id is missing");
  const input = Buffer.from(entries.map((entry) => entry.oid).join("\n") + "\n", "utf8");
  const output = gitBytes(["cat-file", "--batch"], input);
  const blobs = new Map();
  let offset = 0;
  for (const entry of entries) {
    const headerEnd = output.indexOf(0x0a, offset);
    if (headerEnd < 0) throw new Error("truncated git cat-file header");
    const header = output.subarray(offset, headerEnd).toString("utf8").split(" ");
    if (header[0] !== entry.oid || header[1] !== "blob") throw new Error(`unexpected cat-file header: ${header.join(" ")}`);
    const size = Number(header[2]);
    if (!Number.isSafeInteger(size) || size < 0) throw new Error(`invalid blob size: ${header[2]}`);
    const start = headerEnd + 1;
    const end = start + size;
    if (end >= output.length || output[end] !== 0x0a) throw new Error(`truncated blob bytes for ${entry.repoPath}`);
    blobs.set(entry.oid, output.subarray(start, end));
    offset = end + 1;
  }
  return blobs;
}

function makeInventory(entries, blobs) {
  return entries
    .filter((entry) => entry.repoPath !== inventoryPath)
    .map((entry) => {
      if (!entry.repoPath.startsWith(prefix)) throw new Error(`path outside evidence root: ${entry.repoPath}`);
      const bytes = blobs.get(entry.oid);
      if (!bytes) throw new Error(`missing blob bytes: ${entry.repoPath}`);
      return {
        path: entry.repoPath.slice(prefix.length).replaceAll("\\", "/"),
        sizeBytes: bytes.byteLength,
        sha256: createHash("sha256").update(bytes).digest("hex"),
      };
    })
    .sort((a, b) => a.path.localeCompare(b.path));
}

function verify(actual, expected, source) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    const expectedByPath = new Map(expected.map((entry) => [entry.path, entry]));
    const actualByPath = new Map(actual.map((entry) => [entry.path, entry]));
    const allPaths = [...new Set([...expectedByPath.keys(), ...actualByPath.keys()])].sort();
    const errors = allPaths.filter((item) => JSON.stringify(actualByPath.get(item)) !== JSON.stringify(expectedByPath.get(item)));
    throw new Error(`${source} inventory mismatch (${errors.length} paths): ${errors.slice(0, 10).join(", ")}`);
  }
}

const mode = process.argv[2];
if (mode === "--write-index") {
  const entries = indexEntries();
  if (!entries.some((entry) => entry.repoPath === reportPath)
      || !entries.some((entry) => entry.repoPath === `${attemptRoot}/hash-evidence-blobs.mjs`)) {
    throw new Error("stage REPORT.md and this helper before building the inventory");
  }
  const blobs = readBlobs(entries.filter((entry) => entry.repoPath !== inventoryPath));
  const inventory = makeInventory(entries, blobs);
  writeFileSync(path.join(cwd, inventoryPath), `${JSON.stringify(inventory, null, 2)}\n`);
  process.stdout.write(`PASS wrote ${inventory.length} entries from Git index blob bytes; scope=attempt-33+REPORT.md; inventory excluded\n`);
} else if (mode === "--verify-index") {
  const entries = indexEntries();
  const blobs = readBlobs(entries);
  const actual = JSON.parse(blobs.get(entries.find((entry) => entry.repoPath === inventoryPath)?.oid)?.toString("utf8") ?? "null");
  const expected = makeInventory(entries, blobs);
  if (!Array.isArray(actual)) throw new Error("staged inventory blob missing or invalid");
  verify(actual, expected, "index");
  process.stdout.write(`PASS verified ${actual.length} entries against staged Git blob bytes\n`);
} else if (mode === "--verify-commit" && process.argv[3]) {
  const ref = process.argv[3];
  const entries = commitEntries(ref);
  const blobs = readBlobs(entries);
  const actual = JSON.parse(blobs.get(entries.find((entry) => entry.repoPath === inventoryPath)?.oid)?.toString("utf8") ?? "null");
  const expected = makeInventory(entries, blobs);
  if (!Array.isArray(actual)) throw new Error(`inventory blob missing in ${ref}`);
  verify(actual, expected, ref);
  process.stdout.write(`PASS verified ${actual.length} entries against ${ref} commit blob bytes\n`);
} else {
  throw new Error("usage: hash-evidence-blobs.mjs --write-index | --verify-index | --verify-commit <ref>");
}

