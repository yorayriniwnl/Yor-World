const { readdirSync, readFileSync, statSync, existsSync } = require("node:fs");
const { resolve, relative, isAbsolute, join } = require("node:path");
const { createHash } = require("node:crypto");
const { spawnSync } = require("node:child_process");
const root = resolve(__dirname, "../../../../../");
const evidenceRoot = __dirname;
const inventoryPath = join(evidenceRoot, "evidence-inventory.json");
const inventory = JSON.parse(readFileSync(inventoryPath, "utf8"));
const errors = [];
let verified = 0;
for (const entry of [...inventory.entries, ...inventory.externalChecks]) {
  const rel = entry.path;
  if (isAbsolute(rel) || rel.split("/").includes("..")) { errors.push(`${rel}: unsafe path`); continue; }
  const abs = resolve(root, rel);
  if (!existsSync(abs)) { errors.push(`${rel}: missing`); continue; }
  const bytes = readFileSync(abs);
  const size = statSync(abs).size;
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const blob = spawnSync("git", ["hash-object", "--", rel], { cwd: root, encoding: "utf8" });
  if (blob.status !== 0) errors.push(`${rel}: git hash-object failed: ${blob.stderr}`);
  if (size !== entry.bytes) errors.push(`${rel}: size mismatch ${size} != ${entry.bytes}`);
  if (sha256 !== entry.rawSha256) errors.push(`${rel}: SHA-256 mismatch ${sha256} != ${entry.rawSha256}`);
  if (blob.stdout.trim() !== entry.gitBlob) errors.push(`${rel}: blob mismatch ${blob.stdout.trim()} != ${entry.gitBlob}`);
  verified++;
}
let jsonCount = 0;
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (entry.name.endsWith(".json")) {
      try { JSON.parse(readFileSync(path, "utf8")); jsonCount++; }
      catch (error) { errors.push(`${relative(root, path).replace(/\\/g, "/")}: strict JSON parse failed: ${error.message}`); }
    }
  }
}
walk(evidenceRoot);
const pathComparison = JSON.parse(readFileSync(join(evidenceRoot, "source-path-set-comparison.json"), "utf8"));
if (pathComparison.samePathSet !== true || pathComparison.addedOrMissingPaths !== 0 || pathComparison.currentCount !== 117) errors.push("source path list comparison did not pass");
const parity = JSON.parse(readFileSync(join(evidenceRoot, "mirror-parity.json"), "utf8"));
if (parity.testPairGitBlobsEqual !== true || parity.bothPairsMatchBaseBlobs !== true || parity.historicalManifestBlobIdentical !== true) errors.push("mirror or historical manifest parity did not pass");
const result = { status: errors.length ? "FAIL" : "PASS", verifiedEntries: verified, strictJsonFiles: jsonCount, errors };
process.stdout.write(JSON.stringify(result, null, 2) + "\n");
if (errors.length) process.exitCode = 1;