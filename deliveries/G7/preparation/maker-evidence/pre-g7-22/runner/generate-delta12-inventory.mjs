import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const repositoryRoot = process.cwd();
const evidenceRoot = "deliveries/G7/preparation/maker-evidence/pre-g7-22/delta-12";
const inventoryRelativePath = evidenceRoot + "/delta-evidence-inventory.json";
const evidenceAbsolutePath = path.resolve(repositoryRoot, evidenceRoot);
const stagedListing = execFileSync("git", ["ls-files", "--stage", "--", evidenceRoot], { encoding: "utf8" });
const stagedOids = new Map();
for (const line of stagedListing.split(/\r?\n/)) {
  if (!line) continue;
  const tab = line.indexOf("\t");
  if (tab < 0) throw new Error("Unexpected git ls-files --stage row: " + line);
  const metadata = line.slice(0, tab).split(" ");
  const stagedPath = line.slice(tab + 1).replaceAll("\\", "/");
  stagedOids.set(stagedPath, { mode: metadata[0], oid: metadata[1] });
}

const stagedBlobOids = [...new Set([...stagedOids.values()].map(({ oid }) => oid))];
const blobRequest = Buffer.from(stagedBlobOids.join("\n") + "\n", "ascii");
const sizeListing = execFileSync("git", ["cat-file", "--batch-check"], {
  input: blobRequest,
  encoding: "utf8",
  maxBuffer: 16 * 1024 * 1024,
});
const blobSizes = new Map();
let totalBlobBytes = 0;
for (const line of sizeListing.split(/\r?\n/)) {
  if (!line) continue;
  const [oid, type, sizeText] = line.split(" ");
  const size = Number(sizeText);
  if (type !== "blob" || !Number.isSafeInteger(size) || size < 0) {
    throw new Error("Unexpected git cat-file --batch-check row: " + line);
  }
  blobSizes.set(oid, size);
  totalBlobBytes += size;
}
if (blobSizes.size !== stagedBlobOids.length) {
  throw new Error("Git did not report a size for every staged evidence blob");
}

// Read the staged Git objects in one batch. The buffer bound is computed from Git's exact
// object sizes, so full-resolution screenshots are included without relying on a small default.
const batchOutput = execFileSync("git", ["cat-file", "--batch"], {
  input: blobRequest,
  maxBuffer: totalBlobBytes + stagedBlobOids.length * 128 + 1024 * 1024,
});
const stagedBlobDigests = new Map();
let batchOffset = 0;
for (const expectedOid of stagedBlobOids) {
  const headerEnd = batchOutput.indexOf(0x0a, batchOffset);
  if (headerEnd < 0) throw new Error("Truncated git cat-file --batch header for " + expectedOid);
  const header = batchOutput.toString("ascii", batchOffset, headerEnd);
  const [actualOid, type, sizeText] = header.split(" ");
  const size = Number(sizeText);
  if (actualOid !== expectedOid || type !== "blob" || size !== blobSizes.get(expectedOid)) {
    throw new Error("Unexpected git cat-file --batch header: " + header);
  }
  const dataStart = headerEnd + 1;
  const dataEnd = dataStart + size;
  if (dataEnd >= batchOutput.length || batchOutput[dataEnd] !== 0x0a) {
    throw new Error("Truncated git cat-file --batch body for " + expectedOid);
  }
  const blob = batchOutput.subarray(dataStart, dataEnd);
  stagedBlobDigests.set(expectedOid, {
    bytes: size,
    sha256: createHash("sha256").update(blob).digest("hex"),
  });
  batchOffset = dataEnd + 1;
}
if (batchOffset !== batchOutput.length) throw new Error("Unexpected trailing bytes from git cat-file --batch");

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name))
    .flatMap((entry) => {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) return walk(absolute);
      if (!entry.isFile()) throw new Error("Unexpected non-file evidence artifact: " + absolute);
      return [absolute];
    });
}

const entries = walk(evidenceAbsolutePath)
  .map((absolute) => {
    const relativePath = path.relative(repositoryRoot, absolute).split(path.sep).join("/");
    if (relativePath === inventoryRelativePath) return null;
    const staged = stagedOids.get(relativePath);
    if (!staged) throw new Error("Evidence file must be staged before inventory generation: " + relativePath);
    const digest = stagedBlobDigests.get(staged.oid);
    if (!digest) throw new Error("No staged Git blob data for " + relativePath);
    return {
      path: relativePath.slice((evidenceRoot + "/").length),
      bytes: digest.bytes,
      sha256: digest.sha256,
      gitBlob: staged.oid,
      gitMode: staged.mode,
    };
  })
  .filter(Boolean)
  .sort((left, right) => left.path.localeCompare(right.path));

const inventory = {
  schemaVersion: 1,
  root: evidenceRoot + "/",
  sourceCommit: "500d10fa5901be48d4ff877e608d65ba0e271bb9",
  sourceTree: "c43d0cd59d888285c86f79176c255c961c946f57",
  appTree: "ba0b709192367e1d12a796618f97801a8fcd5a70",
  bindingCommit: "1c11a7b5b1407e5117f3b4a46a54424f4ae483da",
  inventoryExclusion: "delta-evidence-inventory.json (self-reference is impossible; all other evidence files are listed)",
  entryCount: entries.length,
  entries,
};
fs.writeFileSync(path.resolve(repositoryRoot, inventoryRelativePath), JSON.stringify(inventory, null, 2) + "\n", "utf8");
process.stdout.write("Inventory entries: " + entries.length + "\n");
