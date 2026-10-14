import { execFileSync } from "node:child_process";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

const root = process.cwd();
const evidenceRoot = path.join(root, "deliveries/G7/preparation/maker-evidence/pre-g7-15");
const sourceCommit = "8becac4ea3e9decc91ca2807e2004a0aa0407105";
const sourceTree = "26d4885d4c76233168baaea52c5a33aca1ede594";
const manifestPath = "yorayriniwnl.in/source-delivery-manifest.json";

function git(args, encoding = null) {
  return execFileSync("git", args, { cwd: root, encoding, maxBuffer: 64 * 1024 * 1024 });
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function normalizeLineEndings(bytes) {
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    const text = bytes.subarray(2).toString("utf16le").replace(/\r\n?/g, "\n");
    return Buffer.concat([bytes.subarray(0, 2), Buffer.from(text, "utf16le")]);
  }
  const text = bytes.toString("utf8");
  if (!Buffer.from(text, "utf8").equals(bytes)) return bytes;
  return Buffer.from(text.replace(/\r\n?/g, "\n"), "utf8");
}

function decodeLog(bytes) {
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) return bytes.subarray(2).toString("utf16le");
  return bytes.toString("utf8");
}

function ensure(condition, message) {
  if (!condition) throw new Error(message);
}

async function filesRecursively(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesRecursively(fullPath));
    else if (entry.isFile()) files.push(fullPath);
  }
  return files;
}

const parsedSourceTree = git(["rev-parse", `${sourceCommit}:app`], "utf8").trim();
ensure(parsedSourceTree === sourceTree, "Source app tree identity mismatch.");
const manifest = JSON.parse((await readFile(path.join(root, manifestPath))).toString("utf8"));
ensure(manifest.sourceIdentity.sourceCommit === sourceCommit, "Manifest sourceCommit mismatch.");
ensure(manifest.sourceIdentity.resultingAppTree === sourceTree, "Manifest resulting app tree mismatch.");
ensure(manifest.sourceIdentity.parentCommit === "315bedb791e9500b898ebe4d1e024f0f477f9d67", "Manifest parent packet commit mismatch.");
ensure(manifest.mirror.audit.status === "PASS", "Manifest parity audit is not PASS.");

const strictJsonFiles = [];
for (const filePath of [...await filesRecursively(evidenceRoot), path.join(root, manifestPath)]) {
  if (!filePath.toLowerCase().endsWith(".json")) continue;
  JSON.parse(await readFile(filePath, "utf8"));
  strictJsonFiles.push(path.relative(root, filePath).replaceAll("\\", "/"));
}

const attempt03 = path.join(evidenceRoot, "attempt-03");
const receipts = [
  { file: "focused-unit.log", exit: 0, contains: "14 passed (14)" },
  { file: "full-unit.log", exit: 0, contains: "327 passed (327)" },
  { file: "lint.log", exit: 0, contains: "EXIT_CODE=0" },
  { file: "typecheck.log", exit: 0, contains: "EXIT_CODE=0" },
  { file: "production-build.log", exit: 0, contains: "EXIT_CODE=0" },
  { file: "renderer-recovery-browser.log", exit: 0, contains: "20 passed (3.0m)" },
];
const checkedReceipts = [];
for (const receipt of receipts) {
  const text = decodeLog(await readFile(path.join(attempt03, receipt.file)));
  ensure(text.includes(`EXIT_CODE=${receipt.exit}`), `${receipt.file} exit receipt mismatch.`);
  ensure(text.includes(receipt.contains), `${receipt.file} expected pass detail missing.`);
  checkedReceipts.push({ ...receipt, validated: true });
}

for (const filePath of [
  path.join(attempt03, "full-integration.log"),
  path.join(evidenceRoot, "attempt-04", "full-integration-retry.log"),
]) {
  const text = decodeLog(await readFile(filePath));
  ensure(text.includes("EXIT_CODE=1"), `${path.basename(filePath)} should preserve its failure exit.`);
  ensure(text.includes("285 passed (286)"), `${path.basename(filePath)} should preserve 285/286 result.`);
  ensure(text.includes("Test timed out in 60000ms"), `${path.basename(filePath)} should preserve the default timeout failure.`);
}

const browserResults = JSON.parse(await readFile(path.join(attempt03, "browser-results.json"), "utf8"));
ensure(browserResults.stats.expected === 20 && browserResults.stats.unexpected === 0 && browserResults.stats.skipped === 0,
  "Final browser JSON receipt is not 20/20 passing.");
const attempt02ReceiptPath = path.join(evidenceRoot, "attempt-02/focused-unit.log");
const attempt02Provenance = JSON.parse(await readFile(path.join(evidenceRoot, "attempt-02/receipt-provenance.json"), "utf8"));
const attempt02Receipt = await readFile(attempt02ReceiptPath);
ensure(attempt02Provenance.byteForByteCopyVerified === true
  && attempt02Provenance.bytes === attempt02Receipt.length
  && attempt02Provenance.sha256 === sha256(attempt02Receipt)
  && attempt02Provenance.classification.startsWith("Invalid;"),
"Recovered attempt-02 receipt provenance/hash mismatch or invalid classification missing.");
const location = (await readFile(path.join(evidenceRoot, "attempt-01/temp-snapshot-location.txt"), "utf8")).trim();
const trackedAppPaths = git(["ls-tree", "-r", "--name-only", `${sourceCommit}:app`], "utf8").trim().split(/\r?\n/).filter(Boolean);
const snapshotMismatches = [];
for (const relativePath of trackedAppPaths) {
  const expected = git(["show", `${sourceCommit}:app/${relativePath}`]);
  let actual;
  try {
    actual = await readFile(path.join(location, relativePath));
  } catch (error) {
    snapshotMismatches.push({ path: relativePath, reason: `missing: ${error.message}` });
    continue;
  }
  if (!expected.equals(actual)) {
    snapshotMismatches.push({ path: relativePath, expectedSha256: sha256(expected), actualSha256: sha256(actual) });
  }
}
const snapshotAudit = {
  status: snapshotMismatches.length === 0 ? "PASS" : "FAIL",
  sourceCommit,
  sourceTree,
  snapshotLocation: location,
  trackedAppFiles: trackedAppPaths.length,
  mismatches: snapshotMismatches,
};
await writeFile(path.join(evidenceRoot, "post-test-snapshot-audit.json"), `${JSON.stringify(snapshotAudit, null, 2)}\n`);
JSON.parse(await readFile(path.join(evidenceRoot, "post-test-snapshot-audit.json"), "utf8"));
ensure(snapshotAudit.status === "PASS", `Post-test snapshot parity failed for ${snapshotMismatches.length} file(s).`);

const finalValidation = {
  status: "PASS",
  sourceCommit,
  sourceTree,
  strictJsonFilesParsed: strictJsonFiles.length,
  strictJsonFiles,
  validatedReceipts: checkedReceipts,
  finalBrowserJson: {
    expected: browserResults.stats.expected,
    unexpected: browserResults.stats.unexpected,
    skipped: browserResults.stats.skipped,
  },
  finalDefaultIntegration: "FAIL twice; 285/286 with unchanged default 60,000 ms canonical-fixture timeout; both attempts retained",
  recoveredInvalidAttempt02Receipt: {
    status: "PASS: byte-for-byte archived and hash checked; test result remains invalid and excluded",
    bytes: attempt02Receipt.length,
    sha256: sha256(attempt02Receipt),
    sourcePath: attempt02Provenance.sourcePath,
  },
  snapshotAudit,
  deviceAndUserGpuChecks: "NOT RUN / NOT PROVIDED",
};
await writeFile(path.join(evidenceRoot, "final-validation.json"), `${JSON.stringify(finalValidation, null, 2)}\n`);
JSON.parse(await readFile(path.join(evidenceRoot, "final-validation.json"), "utf8"));

const allEvidenceFiles = (await filesRecursively(evidenceRoot))
  .filter((filePath) => !["evidence-inventory.json", "final-validation-final.log"].includes(path.basename(filePath)))
  .sort((a, b) => a.localeCompare(b));
const previousInventory = JSON.parse(await readFile(path.join(evidenceRoot, "evidence-inventory.json"), "utf8"));
const previousEntries = new Map(previousInventory.files.map((entry) => [entry.path, entry]));
const preservedWorktreePaths = new Set([
  "deliveries/G7/preparation/maker-evidence/pre-g7-15/attempt-03/snapshot-sync.txt",
  "deliveries/G7/preparation/maker-evidence/pre-g7-15/attempt-04/fixture-idle-check.txt",
  "deliveries/G7/preparation/maker-evidence/pre-g7-15/input/pre-g7-14-maker-report.md",
]);
const inventory = {
  purpose: "Inventory of completed PRE-G7-15 maker evidence files; excludes itself and the active validator transcript.",
  hashBasis: {
    bytesAndSha256: "Raw Windows worktree bytes. The three previously audited CRLF/mixed-ending entries preserve their original inventory values and are checked against the current worktree.",
    worktreeBytesAndSha256: "Explicit raw worktree size and SHA-256 for every entry.",
    gitBlobObjectIdAndBytesAndSha256: "Git clean-filter blob from `git hash-object --path=<repo-path> -w <worktree-path>` and `git cat-file blob <object-id>`; the object ID is checked against staged/committed path blobs after staging.",
    lfNormalizedEqualsGitBlob: "Whether converting CRLF or CR to LF in the raw worktree bytes produces the exact Git blob bytes.",
  },
  sourceCommit,
  files: [],
};
const lineEndingOnlyDifferences = [];
let exactWorktreeBlobMatches = 0;
for (const filePath of allEvidenceFiles) {
  const relativePath = path.relative(root, filePath).replaceAll("\\", "/");
  const worktreeBytes = await readFile(filePath);
  const worktreeSha256 = sha256(worktreeBytes);
  const previous = previousEntries.get(relativePath);
  const preservePriorRawHash = preservedWorktreePaths.has(relativePath);
  if (preservePriorRawHash) {
    ensure(previous, `Prior worktree hash missing for line-ending entry ${relativePath}.`);
    ensure(previous.bytes === worktreeBytes.length && previous.sha256 === worktreeSha256,
      `Historical worktree hash changed for line-ending entry ${relativePath}.`);
  }
  const gitBlobObjectId = git(["hash-object", "-w", `--path=${relativePath}`, filePath], "utf8").trim();
  const gitBlobBytes = git(["cat-file", "blob", gitBlobObjectId]);
  const worktreeEqualsGitBlob = worktreeBytes.equals(gitBlobBytes);
  const lfNormalizedEqualsGitBlob = normalizeLineEndings(worktreeBytes).equals(gitBlobBytes);
  ensure(worktreeEqualsGitBlob || lfNormalizedEqualsGitBlob,
    `Worktree/Git blob content differs beyond line endings for ${relativePath}.`);
  if (worktreeEqualsGitBlob) exactWorktreeBlobMatches++;
  if (!worktreeEqualsGitBlob && lfNormalizedEqualsGitBlob) lineEndingOnlyDifferences.push(relativePath);
  if (preservePriorRawHash) {
    ensure(!worktreeEqualsGitBlob && lfNormalizedEqualsGitBlob,
      `Expected a line-ending-only worktree/Git mismatch for ${relativePath}.`);
  }
  inventory.files.push({
    path: relativePath,
    bytes: preservePriorRawHash ? previous.bytes : worktreeBytes.length,
    sha256: preservePriorRawHash ? previous.sha256 : worktreeSha256,
    worktreeBytes: worktreeBytes.length,
    worktreeSha256,
    gitBlobObjectId,
    gitBlobBytes: gitBlobBytes.length,
    gitBlobSha256: sha256(gitBlobBytes),
    worktreeEqualsGitBlob,
    lfNormalizedEqualsGitBlob,
  });
}
ensure([...preservedWorktreePaths].every((relativePath) => lineEndingOnlyDifferences.includes(relativePath)),
  "Expected all three known line-ending divergences to be recorded.");
inventory.audit = {
  status: "PASS",
  checkedEntries: inventory.files.length,
  exactWorktreeBlobMatches,
  lineEndingOnlyDifferenceCount: lineEndingOnlyDifferences.length,
  lineEndingOnlyDifferences,
  allRawWorktreeHashesVerified: true,
  allGitBlobHashesAndSizesVerified: true,
  allDifferencesAreLineEndings: true,
};
await writeFile(path.join(evidenceRoot, "evidence-inventory.json"), `${JSON.stringify(inventory, null, 2)}\n`);
const writtenInventory = JSON.parse(await readFile(path.join(evidenceRoot, "evidence-inventory.json"), "utf8"));
for (const entry of writtenInventory.files) {
  const worktreeBytes = await readFile(path.join(root, entry.path));
  ensure(worktreeBytes.length === entry.worktreeBytes && sha256(worktreeBytes) === entry.worktreeSha256,
    `Inventory worktree size/hash validation failed for ${entry.path}.`);
  const gitBlob = git(["cat-file", "blob", entry.gitBlobObjectId]);
  ensure(gitBlob.length === entry.gitBlobBytes && sha256(gitBlob) === entry.gitBlobSha256,
    `Inventory Git blob size/hash validation failed for ${entry.path}.`);
  ensure(worktreeBytes.equals(gitBlob) === entry.worktreeEqualsGitBlob
    && normalizeLineEndings(worktreeBytes).equals(gitBlob) === entry.lfNormalizedEqualsGitBlob,
  `Inventory byte comparison validation failed for ${entry.path}.`);
  ensure(entry.bytes === entry.worktreeBytes && entry.sha256 === entry.worktreeSha256,
    `Legacy worktree hash aliases are not preserved for ${entry.path}.`);
}
ensure(writtenInventory.audit.status === "PASS" && writtenInventory.audit.checkedEntries === writtenInventory.files.length,
  "Inventory audit summary does not match its entries.");

process.stdout.write(`${JSON.stringify({
  sourceCommit,
  strictJsonFiles: strictJsonFiles.length,
  checkedReceipts: checkedReceipts.length,
  browserExpected: browserResults.stats.expected,
  browserUnexpected: browserResults.stats.unexpected,
  snapshotFiles: trackedAppPaths.length,
  snapshotMismatches: snapshotMismatches.length,
  inventoryFiles: inventory.files.length,
  inventoryGitBlobChecks: inventory.files.length,
  inventoryLineEndingOnlyDifferences: lineEndingOnlyDifferences,
  recoveredAttempt02RawBytes: attempt02Receipt.length,
  recoveredAttempt02Sha256: sha256(attempt02Receipt),
  status: "PASS",
})}\n`);
