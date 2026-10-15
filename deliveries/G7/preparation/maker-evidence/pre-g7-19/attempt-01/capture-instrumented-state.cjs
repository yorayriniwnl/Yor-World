const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");

const evidenceRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(evidenceRoot, "../../../../..");
const paths = ["app/tests/unit/boundaries.test.ts", "yorayriniwnl.in/tests/unit/boundaries.test.ts"];
const baseline = JSON.parse(fs.readFileSync(path.join(evidenceRoot, "profiles/baseline-identity.json"), "utf8"));
const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
function gitBlob(rel) {
  const run = spawnSync("git", ["hash-object", "--", rel], { cwd: repoRoot, encoding: "utf8" });
  if (run.status !== 0) throw new Error(run.stderr || `git hash-object failed: ${rel}`);
  return run.stdout.trim();
}
function fingerprint(abs) {
  const lines = fs.readFileSync(abs, "utf8").split(/\r?\n/);
  const declarations = lines.filter((line) => /^\s*(?:it|test|describe)(?:\.|\s*\()/.test(line)).map((line) => line.trim());
  const assertions = lines.filter((line) => /\bexpect\s*\(/.test(line)).map((line) => line.trim());
  return {
    declarationLineCount: declarations.length,
    declarationLinesSha256: sha(Buffer.from(declarations.join("\n") + "\n")),
    expectLineCount: assertions.length,
    expectLinesSha256: sha(Buffer.from(assertions.join("\n") + "\n")),
  };
}
const diff = spawnSync("git", ["diff", "--no-color", "--", ...paths], { cwd: repoRoot, maxBuffer: 16 * 1024 * 1024 });
if (diff.status !== 0) throw new Error(diff.stderr.toString("utf8"));
fs.writeFileSync(path.join(__dirname, "instrumentation.patch"), diff.stdout);
const sourceSnapshots = [];
for (let i = 0; i < paths.length; i++) {
  const bytes = fs.readFileSync(path.join(repoRoot, paths[i]));
  const snapshotPath = path.join(__dirname, `instrumented-${i === 0 ? "app" : "domain"}-boundaries.test.ts`);
  fs.writeFileSync(snapshotPath, bytes);
  sourceSnapshots.push({ path: paths[i], bytes: bytes.length, rawSha256: sha(bytes), gitBlob: gitBlob(paths[i]) });
}
const expectedNames = new Set(paths);
const names = spawnSync("git", ["diff", "--name-only", "--", ...paths], { cwd: repoRoot, encoding: "utf8" });
const changedPaths = names.stdout.trim().split(/\r?\n/).filter(Boolean);
const fingerprints = paths.map((rel) => fingerprint(path.join(repoRoot, rel)));
const baseFingerprints = [
  fingerprint(path.join(evidenceRoot, "input/source-base/app-boundaries.test.ts")),
  fingerprint(path.join(evidenceRoot, "input/source-base/domain-boundaries.test.ts")),
];
const declarationsAssertionsUnchanged = fingerprints.every((value, index) => {
  const original = baseFingerprints[index];
  return original &&
    value.declarationLineCount === original.declarationLineCount &&
    value.declarationLinesSha256 === original.declarationLinesSha256 &&
    value.expectLineCount === original.expectLineCount &&
    value.expectLinesSha256 === original.expectLinesSha256;
});
const receipt = {
  beforeGitBlobs: [baseline.appTest.gitBlob, baseline.domainMirror.gitBlob],
  instrumentedSnapshots: sourceSnapshots,
  pairedGitBlobsEqual: sourceSnapshots[0].gitBlob === sourceSnapshots[1].gitBlob,
  changedPaths,
  changedPathsAreExactPair: changedPaths.length === expectedNames.size && changedPaths.every((name) => expectedNames.has(name)),
  fingerprints,
  baseFingerprints,
  declarationsAssertionsUnchanged,
  patch: "attempt-01/instrumentation.patch",
  rawInstrumentedSnapshots: ["attempt-01/instrumented-app-boundaries.test.ts", "attempt-01/instrumented-domain-boundaries.test.ts"],
};
fs.writeFileSync(path.join(__dirname, "instrumentation-state.json"), JSON.stringify(receipt, null, 2) + "\n");
process.stdout.write(JSON.stringify(receipt, null, 2) + "\n");
if (!receipt.pairedGitBlobsEqual || !receipt.changedPathsAreExactPair || !receipt.declarationsAssertionsUnchanged) process.exitCode = 1;
