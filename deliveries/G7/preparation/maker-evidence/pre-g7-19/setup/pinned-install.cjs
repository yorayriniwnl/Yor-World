const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const evidenceRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(evidenceRoot, "../../../../..");
const appRoot = path.join(repoRoot, "app");
const nodePath = process.execPath;
const pnpmPath = "C:\\Users\\ayush\\AppData\\Local\\pnpm\\store\\v11\\links\\@\\pnpm\\9.15.9\\3d51f653a61d6f9b811790f44bb80b908ca8d24c424e6e53e491ea81b7f96a43\\node_modules\\pnpm\\bin\\pnpm.cjs";
const stdoutPath = path.join(__dirname, "install.stdout.log");
const stderrPath = path.join(__dirname, "install.stderr.log");
const receiptPath = path.join(__dirname, "install-run.json");
const startedAt = new Date();
const started = process.hrtime.bigint();
const result = spawnSync(nodePath, [pnpmPath, "install", "--offline", "--frozen-lockfile"], {
  cwd: appRoot,
  env: process.env,
  maxBuffer: 32 * 1024 * 1024,
});
const ended = new Date();
const elapsedSeconds = Number(process.hrtime.bigint() - started) / 1e9;
fs.writeFileSync(stdoutPath, result.stdout || Buffer.alloc(0));
fs.writeFileSync(stderrPath, result.stderr || Buffer.alloc(0));
const receipt = {
  command: "pnpm install --offline --frozen-lockfile",
  invoker: `${nodePath} ${path.join(__dirname, "pinned-install.cjs")}`,
  executedAs: `${nodePath} ${pnpmPath} install --offline --frozen-lockfile`,
  workingDirectory: appRoot,
  node: process.version,
  pnpm: spawnSync(nodePath, [pnpmPath, "--version"], { encoding: "utf8" }).stdout.trim(),
  startedUtc: startedAt.toISOString(),
  endedUtc: ended.toISOString(),
  elapsedSeconds,
  exitCode: result.status,
  signal: result.signal,
  error: result.error ? String(result.error) : null,
  stdout: path.relative(evidenceRoot, stdoutPath).replace(/\\/g, "/"),
  stderr: path.relative(evidenceRoot, stderrPath).replace(/\\/g, "/"),
};
fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + "\n");
process.stdout.write(JSON.stringify(receipt, null, 2) + "\n");
if (result.status !== 0) process.exitCode = result.status || 1;
