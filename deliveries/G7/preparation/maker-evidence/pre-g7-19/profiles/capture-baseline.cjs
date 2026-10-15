const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawnSync, execFileSync } = require("node:child_process");

const evidenceRoot = __dirname.replace(/[\\/]profiles$/, "");
const repoRoot = path.resolve(evidenceRoot, "../../../../..");
const appRoot = path.join(repoRoot, "app");
const hashBytes = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const gitBlob = (rel) => {
  const result = spawnSync("git", ["hash-object", "--", rel], { cwd: repoRoot, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || `git hash-object failed for ${rel}`);
  return result.stdout.trim();
};
function walk(root) {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(root, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}
function fileInfo(rel) {
  const bytes = fs.readFileSync(path.join(repoRoot, rel));
  return { path: rel, bytes: bytes.length, rawSha256: hashBytes(bytes), gitBlob: gitBlob(rel) };
}
function declarationsAndAssertions(absPath) {
  const lines = fs.readFileSync(absPath, "utf8").split(/\r?\n/);
  const declarations = lines.filter((line) => /^\s*(?:it|test|describe)(?:\.|\s*\()/.test(line));
  const assertions = lines.filter((line) => /\bexpect\s*\(/.test(line));
  return {
    declarationLineCount: declarations.length,
    declarationLinesSha256: hashBytes(Buffer.from(declarations.join("\n") + "\n")),
    expectLineCount: assertions.length,
    expectLinesSha256: hashBytes(Buffer.from(assertions.join("\n") + "\n")),
  };
}

const ordered = walk(path.join(appRoot, "src")).map((file) => path.relative(appRoot, file).replace(/\\/g, "/"));
const sorted = [...ordered].sort();
const previousPathAudit = JSON.parse(fs.readFileSync(path.join(evidenceRoot, "input/pre-g7-18/source-path-audit.json"), "utf8"));
const pathAudit = {
  count: ordered.length,
  sortedPathSetSha256: hashBytes(Buffer.from(sorted.join("\n") + "\n")),
  traversalPathListSha256: hashBytes(Buffer.from(ordered.join("\n") + "\n")),
  sameSortedPathsAsPreG717: JSON.stringify(sorted) === JSON.stringify(previousPathAudit.sortedPaths),
  sameTraversalPathsAsPreG718: JSON.stringify(ordered) === JSON.stringify(previousPathAudit.traversalPaths),
};
fs.writeFileSync(path.join(evidenceRoot, "profiles/source-path-set.json"), JSON.stringify(pathAudit, null, 2) + "\n");

const appRel = "app/tests/unit/boundaries.test.ts";
const domainRel = "yorayriniwnl.in/tests/unit/boundaries.test.ts";
const manifestRel = "yorayriniwnl.in/source-delivery-manifest.json";
const manifest = fileInfo(manifestRel);
const base = {
  branch: execFileSync("git", ["branch", "--show-current"], { cwd: repoRoot, encoding: "utf8" }).trim(),
  commit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim(),
  sourceTree: execFileSync("git", ["show", "-s", "--format=%T", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim(),
  appTree: execFileSync("git", ["rev-parse", "HEAD:app"], { cwd: repoRoot, encoding: "utf8" }).trim(),
  appTest: fileInfo(appRel),
  domainMirror: fileInfo(domainRel),
  testPairGitBlobsEqual: gitBlob(appRel) === gitBlob(domainRel),
  appTestFingerprint: declarationsAndAssertions(path.join(repoRoot, appRel)),
  domainTestFingerprint: declarationsAndAssertions(path.join(repoRoot, domainRel)),
  sourcePathSet: pathAudit,
  historicalManifest: {
    ...manifest,
    expectedBaseGitBlob: "a4a117eacc9ccecf5584a67c11be034723c143a8",
    matchesHistoricalBlob: manifest.gitBlob === "a4a117eacc9ccecf5584a67c11be034723c143a8",
  },
  evidenceInputSnapshots: {
    appTestMatchesBase: hashBytes(fs.readFileSync(path.join(evidenceRoot, "input/source-base/app-boundaries.test.ts"))) === fileInfo(appRel).rawSha256,
    domainTestMatchesBase: hashBytes(fs.readFileSync(path.join(evidenceRoot, "input/source-base/domain-boundaries.test.ts"))) === fileInfo(domainRel).rawSha256,
    historicalManifestMatchesBase: hashBytes(fs.readFileSync(path.join(evidenceRoot, "input/source-base/historical-source-delivery-manifest.json"))) === manifest.rawSha256,
  },
};
fs.writeFileSync(path.join(evidenceRoot, "profiles/baseline-identity.json"), JSON.stringify(base, null, 2) + "\n");
process.stdout.write(JSON.stringify({ commit: base.commit, sourceTree: base.sourceTree, appTree: base.appTree, pathAudit, testPairGitBlobsEqual: base.testPairGitBlobsEqual, historicalManifest: base.historicalManifest }, null, 2) + "\n");
