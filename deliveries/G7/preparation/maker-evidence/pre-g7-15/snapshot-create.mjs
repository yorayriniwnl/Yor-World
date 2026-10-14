import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const evidenceDir = path.join(root, "deliveries", "G7", "preparation", "maker-evidence", "pre-g7-15");
const sourceCommit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const appTree = execFileSync("git", ["rev-parse", "HEAD:app"], { encoding: "utf8" }).trim();
const snapshotRoot = fs.mkdtempSync(path.join(os.tmpdir(), "yor-world-pre-g7-15-verify-"));
const tracked = execFileSync("git", ["ls-files", "-z", "--", "app"], { encoding: "buffer" }).toString("utf8").split("\0").filter(Boolean);
const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const files = [];
for (const repoPath of tracked) {
  const relativePath = repoPath.slice("app/".length);
  const sourcePath = path.join(root, repoPath);
  const snapshotPath = path.join(snapshotRoot, relativePath);
  fs.mkdirSync(path.dirname(snapshotPath), { recursive: true });
  fs.copyFileSync(sourcePath, snapshotPath);
  const sourceBytes = fs.readFileSync(sourcePath);
  const snapshotBytes = fs.readFileSync(snapshotPath);
  files.push({
    path: relativePath.replaceAll(path.sep, "/"),
    sourceSha256: sha(sourceBytes),
    snapshotSha256: sha(snapshotBytes),
    match: sourceBytes.equals(snapshotBytes),
  });
}
const result = {
  purpose: "PRE-G7-15 physically copied tracked-app verification snapshot",
  sourceWorktree: root.replaceAll(path.sep, "/"),
  sourceCommit,
  appTree,
  snapshotApp: snapshotRoot,
  fileCount: files.length,
  hashFailures: files.filter((file) => !file.match).length,
  files,
};
result.status = result.hashFailures === 0 ? "PASS" : "FAIL";
fs.writeFileSync(path.join(evidenceDir, "attempt-01", "temp-snapshot-audit.json"), JSON.stringify(result, null, 2) + "\n", "utf8");
fs.writeFileSync(path.join(evidenceDir, "attempt-01", "temp-snapshot-location.txt"), snapshotRoot + "\n", "utf8");
console.log(JSON.stringify({
  status: result.status,
  sourceCommit,
  appTree,
  snapshotApp: snapshotRoot,
  fileCount: result.fileCount,
  hashFailures: result.hashFailures,
}, null, 2));
if (result.status !== "PASS") process.exitCode = 1;
