const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");

const evidenceRoot = __dirname;
const repoRoot = path.resolve(evidenceRoot, "..", "..", "..", "..", "..");
const stateFiles = [
  "source-state-before-install.json",
  "source-state-before-build.json",
  "source-state-after-build.json",
  "source-state-final.json",
];

function git(args) {
  return execFileSync("git", args, { cwd: repoRoot, encoding: "utf8" }).trimEnd();
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

for (const stateFile of stateFiles) {
  const statePath = path.join(evidenceRoot, stateFile);
  const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
  if (state.head !== "fc64a18a7ec1d027fb0a33400c2fcd6288d6afbf") {
    throw new Error(`Unexpected captured source head in ${stateFile}`);
  }
  for (const file of state.protectedFiles) {
    const absolutePath = path.join(repoRoot, file.path);
    const bytes = fs.readFileSync(absolutePath);
    const rawSha256 = sha256(bytes);
    const rawGitObjectHash = git(["hash-object", "--no-filters", "--", file.path]);
    const committedGitBlob = git(["rev-parse", `HEAD:${file.path}`]);
    if (bytes.byteLength !== file.bytes || rawSha256 !== file.rawSha256) {
      throw new Error(`Captured raw file identity changed: ${file.path}`);
    }
    if (file.rawGitObjectHash && file.rawGitObjectHash !== rawGitObjectHash) {
      throw new Error(`Raw Git object basis changed: ${file.path}`);
    }
    file.rawGitObjectHash = rawGitObjectHash;
    file.gitBlob = committedGitBlob;
  }
  fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

process.stdout.write(
  `${JSON.stringify({ result: "PASS", updatedStateFiles: stateFiles }, null, 2)}\n`,
);
