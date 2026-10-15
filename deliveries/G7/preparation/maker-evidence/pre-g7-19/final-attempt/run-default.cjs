const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");

const evidenceRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(evidenceRoot, "../../../../..");
const appRoot = path.join(repoRoot, "app");
const nodePath = process.execPath;
const pnpmPath = "C:\\Users\\ayush\\AppData\\Local\\pnpm\\store\\v11\\links\\@\\pnpm\\9.15.9\\3d51f653a61d6f9b811790f44bb80b908ca8d24c424e6e53e491ea81b7f96a43\\node_modules\\pnpm\\bin\\pnpm.cjs";
const nodeDirectory = path.dirname(nodePath);
const env = { ...process.env, PATH: `${nodeDirectory}${path.delimiter}${process.env.PATH || ""}` };
delete env.PRE_G7_19_BOUNDARY_TIMING;
delete env.PRE_G7_19_BOUNDARY_TIMING_FILE;
const resolvedNode = spawnSync("node", ["--version"], { env, encoding: "utf8" });
const pnpmVersion = spawnSync(nodePath, [pnpmPath, "--version"], { env, encoding: "utf8" });
if (resolvedNode.status !== 0 || resolvedNode.stdout.trim() !== "v24.19.0") {
  throw new Error(`Pinned Node is not first in PATH: ${resolvedNode.stdout || resolvedNode.stderr}`);
}
if (pnpmVersion.status !== 0 || pnpmVersion.stdout.trim() !== "9.15.9") {
  throw new Error(`Pinned pnpm version mismatch: ${pnpmVersion.stdout || pnpmVersion.stderr}`);
}
const args = [pnpmPath, "run", "test:unit"];
const stdoutPath = path.join(__dirname, "unit.stdout.log");
const stderrPath = path.join(__dirname, "unit.stderr.log");
const receiptPath = path.join(__dirname, "unit-run.json");
const startedAt = new Date();
const started = process.hrtime.bigint();
const result = spawnSync(nodePath, args, { cwd: appRoot, env, maxBuffer: 64 * 1024 * 1024 });
const endedAt = new Date();
const paths = ["app/tests/unit/boundaries.test.ts", "yorayriniwnl.in/tests/unit/boundaries.test.ts"];
function gitBlob(rel) {
  const run = spawnSync("git", ["hash-object", "--", rel], { cwd: repoRoot, encoding: "utf8" });
  if (run.status !== 0) throw new Error(run.stderr || `git hash-object failed: ${rel}`);
  return run.stdout.trim();
}
const receipt = {
  purpose: "the sole exact default PRE-G7-19 unit gate; no args, file filters, retries, or timeout overrides",
  command: "pnpm run test:unit",
  executable: nodePath,
  pnpm: pnpmPath,
  argv: args.slice(1),
  workingDirectory: appRoot,
  node: process.version,
  resolvedChildNode: resolvedNode.stdout.trim(),
  pnpmVersion: pnpmVersion.stdout.trim(),
  pathPrefix: nodeDirectory,
  instrumentationEnvironmentRemoved: !env.PRE_G7_19_BOUNDARY_TIMING && !env.PRE_G7_19_BOUNDARY_TIMING_FILE,
  runnerPid: process.pid,
  startedUtc: startedAt.toISOString(),
  endedUtc: endedAt.toISOString(),
  elapsedSeconds: Number(process.hrtime.bigint() - started) / 1e9,
  exitCode: result.status,
  signal: result.signal,
  error: result.error ? String(result.error) : null,
  testGitBlobs: paths.map((rel) => ({ path: rel, gitBlob: gitBlob(rel) })),
  stdout: "final-attempt/unit.stdout.log",
  stderr: "final-attempt/unit.stderr.log",
};
fs.writeFileSync(stdoutPath, result.stdout || Buffer.alloc(0));
fs.writeFileSync(stderrPath, result.stderr || Buffer.alloc(0));
fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + "\n");
process.stdout.write(JSON.stringify(receipt, null, 2) + "\n");
if (result.status !== 0) process.exitCode = result.status || 1;
