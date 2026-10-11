import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const appRoot = path.resolve(root, "verification", "app");
const target = path.resolve(appRoot, ".a1-r4-final-db-20261011");
const relative = path.relative(appRoot, target);
if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("Late fixture path escapes verification/app.");
const rootStatBefore = fs.lstatSync(target);
if (!rootStatBefore.isDirectory() || rootStatBefore.isSymbolicLink()) throw new Error("Late fixture root is not a regular directory.");

const entries = [];
function walk(dir) {
  for (const child of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const absolute = path.join(dir, child.name);
    const rel = path.relative(target, absolute).split(path.sep).join("/");
    const stat = fs.lstatSync(absolute);
    const common = {
      path: rel,
      createdAtUtc: stat.birthtime.toISOString(),
      modifiedAtUtc: stat.mtime.toISOString(),
    };
    if (child.isSymbolicLink()) {
      entries.push({ ...common, kind: "symlink", target: fs.readlinkSync(absolute) });
    } else if (child.isDirectory()) {
      entries.push({ ...common, kind: "directory" });
      walk(absolute);
    } else if (child.isFile()) {
      const bytes = fs.readFileSync(absolute);
      entries.push({
        ...common,
        kind: "file",
        bytes: bytes.length,
        sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
      });
    } else {
      entries.push({ ...common, kind: "other" });
    }
  }
}
walk(target);

const pidPath = path.join(target, "postmaster.pid");
const pidStat = fs.statSync(pidPath);
const pidBytes = fs.readFileSync(pidPath);
const pidText = pidBytes.toString("utf8");
const processQueryPath = path.join(root, "evidence", "r4-late-fixture-process-query.json");
const processQueryBytes = fs.readFileSync(processQueryPath);
const processQuery = JSON.parse(processQueryBytes.toString("utf8").replace(/^\uFEFF/, ""));
const fileEntries = entries.filter((entry) => entry.kind === "file");
const directoryEntries = entries.filter((entry) => entry.kind === "directory");
const symlinkEntries = entries.filter((entry) => entry.kind === "symlink");
const rootStatAfter = fs.lstatSync(target);
const stableDuringCapture = rootStatBefore.mtimeMs === rootStatAfter.mtimeMs;
const result = {
  capturedAtUtc: new Date().toISOString(),
  path: "verification/app/.a1-r4-final-db-20261011",
  attribution: "Unknown. This worker did not run a command that intentionally created this path. Its creation during the R4 turn is recorded; no matching live command line was found in the attached process query.",
  disposition: "Preserve; excluded from source/ and source.patch.",
  root: {
    createdAtUtc: rootStatBefore.birthtime.toISOString(),
    modifiedAtUtcBeforeCapture: rootStatBefore.mtime.toISOString(),
    modifiedAtUtcAfterCapture: rootStatAfter.mtime.toISOString(),
    stableDuringCapture,
  },
  inventory: {
    entryCount: entries.length,
    fileCount: fileEntries.length,
    directoryCount: directoryEntries.length,
    symlinkCount: symlinkEntries.length,
    totalFileBytes: fileEntries.reduce((sum, entry) => sum + entry.bytes, 0),
    canonicalEntriesSha256: crypto.createHash("sha256").update(JSON.stringify(entries)).digest("hex"),
    files: fileEntries,
    directories: directoryEntries,
    symlinks: symlinkEntries,
    otherEntries: entries.filter((entry) => entry.kind === "other"),
  },
  pglite: {
    pidPath: "verification/app/.a1-r4-final-db-20261011/postmaster.pid",
    sentinel: pidText.split(/\r?\n/, 1)[0].trim(),
    fullText: pidText,
    bytes: pidBytes.length,
    sha256: crypto.createHash("sha256").update(pidBytes).digest("hex"),
    createdAtUtc: pidStat.birthtime.toISOString(),
    modifiedAtUtc: pidStat.mtime.toISOString(),
  },
  processQuery: {
    path: "evidence/r4-late-fixture-process-query.json",
    sha256: crypto.createHash("sha256").update(processQueryBytes).digest("hex"),
    capturedAtUtc: processQuery.capturedAtUtc,
    matchingProcessCount: processQuery.matchingProcessCount,
    matchingProcesses: processQuery.matchingProcesses,
  },
};
fs.writeFileSync(path.join(root, "evidence", "r4-late-fixture-inventory.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  capturedAtUtc: result.capturedAtUtc,
  path: result.path,
  root: result.root,
  inventory: {
    entryCount: result.inventory.entryCount,
    fileCount: result.inventory.fileCount,
    directoryCount: result.inventory.directoryCount,
    symlinkCount: result.inventory.symlinkCount,
    totalFileBytes: result.inventory.totalFileBytes,
    canonicalEntriesSha256: result.inventory.canonicalEntriesSha256,
  },
  pglite: result.pglite,
  processQuery: result.processQuery,
}, null, 2));
