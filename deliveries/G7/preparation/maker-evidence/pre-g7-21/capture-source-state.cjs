const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");

const evidenceRoot = __dirname;
const repoRoot = path.resolve(evidenceRoot, "..", "..", "..", "..", "..");
const appRoot = path.join(repoRoot, "app");
const label = process.argv[2];
if (!label || process.argv.length !== 3) throw new Error("Pass one state label.");

function git(args) {
  return execFileSync("git", args, { cwd: repoRoot, encoding: "utf8" }).trimEnd();
}

const protectedPaths = [
  "app/package.json",
  "app/pnpm-lock.yaml",
  "app/next.config.ts",
  "app/tsconfig.json",
  "app/next-env.d.ts",
  "yorayriniwnl.in/source-delivery-manifest.json",
];

const protectedFiles = protectedPaths.map((relativePath) => {
  const absolutePath = path.join(repoRoot, relativePath);
  const bytes = fs.readFileSync(absolutePath);
  return {
    path: relativePath.replaceAll("\\", "/"),
    bytes: bytes.byteLength,
    rawSha256: crypto.createHash("sha256").update(bytes).digest("hex"),
    rawGitObjectHash: git(["hash-object", "--no-filters", "--", relativePath]),
    gitBlob: git(["rev-parse", `HEAD:${relativePath}`]),
  };
});

const receipt = {
  label,
  capturedAtUtc: new Date().toISOString(),
  branch: git(["branch", "--show-current"]),
  head: git(["rev-parse", "HEAD"]),
  sourceTree: git(["rev-parse", "HEAD^{tree}"]),
  appTree: git(["rev-parse", "HEAD:app"]),
  trackedChanges: git(["status", "--porcelain=v1", "--untracked-files=no"])
    .split(/\r?\n/)
    .filter(Boolean),
  trackedAppDiffPaths: git(["diff", "--name-only", "HEAD", "--", "app"])
    .split(/\r?\n/)
    .filter(Boolean),
  appNodeModulesPresent: fs.existsSync(path.join(appRoot, "node_modules")),
  appNextBuildOutputPresent: fs.existsSync(path.join(appRoot, ".next")),
  protectedFiles,
};

const outputPath = path.join(evidenceRoot, `${label}.json`);
fs.writeFileSync(outputPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
