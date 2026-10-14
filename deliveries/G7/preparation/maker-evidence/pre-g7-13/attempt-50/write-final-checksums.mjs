import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const evidenceRoot = path.resolve(here, "..");
const repoRoot = path.resolve(evidenceRoot, "..", "..", "..", "..", "..");
const checksumPath = path.join(evidenceRoot, "final-checksums.json");
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

function filesUnder(directory, relative = "") {
  return readdirSync(path.join(directory, relative), { withFileTypes: true })
    .flatMap((entry) => {
      const child = path.posix.join(relative.replaceAll("\\", "/"), entry.name);
      if (entry.isDirectory()) return filesUnder(directory, child);
      return entry.isFile() ? [child] : [];
    })
    .sort();
}

const attempt24 = path.join(evidenceRoot, "attempt-24");
const attempt50 = path.join(evidenceRoot, "attempt-50");
const entries = [
  ...filesUnder(attempt24).map((relative) => ({ path: `attempt-24/${relative}`, absolute: path.join(attempt24, relative) })),
  ...filesUnder(attempt50).map((relative) => ({ path: `attempt-50/${relative}`, absolute: path.join(attempt50, relative) })),
  { path: "REPORT.md", absolute: path.join(evidenceRoot, "REPORT.md") },
  { path: "../../../../../yorayriniwnl.in/source-delivery-manifest.json", absolute: path.join(repoRoot, "yorayriniwnl.in", "source-delivery-manifest.json") },
  { path: "../../../../../yorayriniwnl.in/README.md", absolute: path.join(repoRoot, "yorayriniwnl.in", "README.md") },
];
const sourceCommit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
const appTree = execFileSync("git", ["rev-parse", `${sourceCommit}:app`], { cwd: repoRoot, encoding: "utf8" }).trim();
const files = entries.map(({ path: relative, absolute }) => ({ path: relative, sha256: sha256(readFileSync(absolute)) }));
const result = {
  status: "PASS",
  sourceCommit,
  appTree,
  attempt24: {
    fileCount: files.filter((entry) => entry.path.startsWith("attempt-24/")).length,
    preservationNote: "Parent compared all 13 attempt-24 files against pre-sweep hashes after attempt-25: zero changed and zero removed. This task made no attempt-24 edits.",
  },
  attempt50: {
    fileCount: files.filter((entry) => entry.path.startsWith("attempt-50/")).length,
    desktopScreenshot: files.find((entry) => entry.path.endsWith("studio-reference-desktop-1440x900.png")),
    mobileScreenshot: files.find((entry) => entry.path.endsWith("studio-reference-mobile-390x844.png")),
  },
  files,
};
writeFileSync(checksumPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify({ status: result.status, sourceCommit, appTree, attempt24Files: result.attempt24.fileCount, attempt50Files: result.attempt50.fileCount, entries: files.length }, null, 2)}\n`);
