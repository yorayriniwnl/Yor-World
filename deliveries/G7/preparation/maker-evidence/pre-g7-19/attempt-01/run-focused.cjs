const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const evidenceRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(evidenceRoot, "../../../../..");
const appRoot = path.join(repoRoot, "app");
const nodePath = process.execPath;
const pnpmPath = "C:\\Users\\ayush\\AppData\\Local\\pnpm\\store\\v11\\links\\@\\pnpm\\9.15.9\\3d51f653a61d6f9b811790f44bb80b908ca8d24c424e6e53e491ea81b7f96a43\\node_modules\\pnpm\\bin\\pnpm.cjs";
const testName = "enforces integrated dependency boundaries: HTML shell stays free of 3D and browser features stay free of server imports";
const timingPath = path.join(__dirname, "timings.jsonl");
const stdoutPath = path.join(__dirname, "focused.stdout.log");
const stderrPath = path.join(__dirname, "focused.stderr.log");
const receiptPath = path.join(__dirname, "focused-run.json");
const startedAt = new Date();
const started = process.hrtime.bigint();
const args = [pnpmPath, "run", "test:unit", "--", "tests/unit/boundaries.test.ts", "-t", testName];
const result = spawnSync(nodePath, args, {
  cwd: appRoot,
  env: {
    ...process.env,
    PRE_G7_19_BOUNDARY_TIMING: "1",
    PRE_G7_19_BOUNDARY_TIMING_FILE: timingPath,
  },
  maxBuffer: 64 * 1024 * 1024,
});
const endedAt = new Date();
const receipt = {
  purpose: "the one PRE-G7-19 instrumented focused boundary diagnosis; not the default unit gate",
  command: "pnpm run test:unit -- tests/unit/boundaries.test.ts -t \"enforces integrated dependency boundaries: HTML shell stays free of 3D and browser features stay free of server imports\"",
  executable: nodePath,
  pnpm: pnpmPath,
  argv: args.slice(1),
  workingDirectory: appRoot,
  node: process.version,
  pnpmVersion: spawnSync(nodePath, [pnpmPath, "--version"], { encoding: "utf8" }).stdout.trim(),
  runnerPid: process.pid,
  startedUtc: startedAt.toISOString(),
  endedUtc: endedAt.toISOString(),
  elapsedSeconds: Number(process.hrtime.bigint() - started) / 1e9,
  exitCode: result.status,
  signal: result.signal,
  error: result.error ? String(result.error) : null,
  timingOutput: path.relative(evidenceRoot, timingPath).replace(/\\/g, "/"),
  stdout: path.relative(evidenceRoot, stdoutPath).replace(/\\/g, "/"),
  stderr: path.relative(evidenceRoot, stderrPath).replace(/\\/g, "/"),
};
fs.writeFileSync(stdoutPath, result.stdout || Buffer.alloc(0));
fs.writeFileSync(stderrPath, result.stderr || Buffer.alloc(0));
fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + "\n");
process.stdout.write(JSON.stringify(receipt, null, 2) + "\n");
if (result.status !== 0) process.exitCode = result.status || 1;
