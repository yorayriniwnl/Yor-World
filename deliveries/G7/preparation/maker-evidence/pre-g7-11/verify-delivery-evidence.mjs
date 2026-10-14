import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const evidencePrefix = "deliveries/G7/preparation/maker-evidence/pre-g7-11/";
const committedRevision = process.argv[2];
const stagedPaths = execFileSync("git", ["diff", "--cached", "--name-only"], { encoding: "utf8" })
  .trim().split(/\r?\n/).filter(Boolean);
const staged = new Set(stagedPaths);
const allowed = (path) => path.startsWith(evidencePrefix)
  || path.startsWith("yorayriniwnl.in/src/")
  || path.startsWith("yorayriniwnl.in/tests/")
  || path === "yorayriniwnl.in/README.md"
  || path === "yorayriniwnl.in/source-delivery-manifest.json";

if (!committedRevision) {
  const outOfScope = stagedPaths.filter((path) => !allowed(path));
  if (outOfScope.length) throw new Error(`Out-of-scope staged paths:\n${outOfScope.join("\n")}`);
  process.stdout.write(`Staged scope PASS: ${stagedPaths.length} paths, no out-of-scope paths.\n`);
}

const sums = readFileSync(`${evidencePrefix}SHA256SUMS.txt`, "utf8").trim().split(/\r?\n/);
for (const line of sums) {
  const match = /^([0-9a-f]{64})  (.+)$/.exec(line);
  if (!match) throw new Error(`Malformed SHA256SUMS line: ${line}`);
  const [, expected, path] = match;
  const objectRef = committedRevision
    ? `${committedRevision}:${path}`
    : staged.has(path) ? `:${path}` : `HEAD:${path}`;
  const bytes = execFileSync("git", ["cat-file", "blob", objectRef], { maxBuffer: 64 * 1024 * 1024 });
  const actual = createHash("sha256").update(bytes).digest("hex");
  if (actual !== expected) throw new Error(`SHA-256 mismatch: ${path} expected ${expected} got ${actual}`);
}
process.stdout.write(`SHA256SUMS PASS: ${sums.length} entries verified against ${committedRevision ? `commit ${committedRevision}` : "staged Git blobs"}.\n`);
