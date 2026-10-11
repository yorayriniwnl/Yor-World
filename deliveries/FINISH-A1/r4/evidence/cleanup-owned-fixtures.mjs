import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const appBase = path.resolve(root, "verification", "app");
const names = [
  ".a1-e2e-fixture",
  ".a1-e2e-fixture-final",
  ".a1-e2e-fixture-final2",
  ".a1-e2e-r4-final-20261011",
  ".a1-e2e-workflow-debug",
  ".a1-e2e-workflow-final",
  ".a1-r4-combined-final-20261011",
  ".a1-r4-completion-isolated-20261011",
];

function inventory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let fileCount = 0;
  let totalBytes = 0;
  let symlinkCount = 0;
  for (const entry of entries) {
    const target = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) {
      symlinkCount += 1;
    } else if (entry.isDirectory()) {
      const child = inventory(target);
      fileCount += child.fileCount;
      totalBytes += child.totalBytes;
      symlinkCount += child.symlinkCount;
    } else if (entry.isFile()) {
      const stat = fs.statSync(target);
      fileCount += 1;
      totalBytes += stat.size;
    }
  }
  return { fileCount, totalBytes, symlinkCount };
}

const targets = names.map((name) => {
  const absolute = path.resolve(appBase, name);
  const relative = path.relative(appBase, absolute);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error(`Out-of-scope target: ${absolute}`);
  const stat = fs.lstatSync(absolute);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error(`Refusing non-directory or link target: ${absolute}`);
  const pidFile = path.join(absolute, "postmaster.pid");
  const pidSentinel = fs.existsSync(pidFile) ? fs.readFileSync(pidFile, "utf8").split(/\r?\n/, 1)[0].trim() : null;
  return {
    path: absolute,
    createdAtUtc: stat.birthtime.toISOString(),
    modifiedAtUtc: stat.mtime.toISOString(),
    ...inventory(absolute),
    pglitePidSentinel: pidSentinel,
    osProcessActive: false,
  };
});

if (targets.some((target) => target.pglitePidSentinel !== "-42")) {
  throw new Error("Scratch fixture PID sentinel changed; refusing cleanup.");
}

const receipt = {
  capturedAtUtc: new Date().toISOString(),
  scope: appBase,
  note: "Only worker-created E2E PGlite scratch directories; logs, screenshots, source, and all other paths preserved.",
  targets,
};
fs.writeFileSync(path.join(root, "evidence", "r4-scratch-fixture-cleanup.json"), `${JSON.stringify(receipt, null, 2)}\n`, "utf8");

for (const target of targets) {
  const absolute = path.resolve(target.path);
  const relative = path.relative(appBase, absolute);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error(`Second scope check failed: ${absolute}`);
  fs.rmSync(absolute, { recursive: true, force: true });
}

const remaining = names.filter((name) => fs.existsSync(path.join(appBase, name)));
if (remaining.length) throw new Error(`Cleanup incomplete: ${remaining.join(", ")}`);
console.log(JSON.stringify({ removedOwnedScratchDirectories: names.length, receipt: "evidence/r4-scratch-fixture-cleanup.json", paths: names }, null, 2));
