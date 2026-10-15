const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const evidenceRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(evidenceRoot, "../../../../..");
const appRoot = path.join(repoRoot, "app");
const nodePath = process.execPath;
const nodeDirectory = path.dirname(nodePath);
const pnpmPath = "C:\\Users\\ayush\\AppData\\Local\\pnpm\\store\\v11\\links\\@\\pnpm\\9.15.9\\3d51f653a61d6f9b811790f44bb80b908ca8d24c424e6e53e491ea81b7f96a43\\node_modules\\pnpm\\bin\\pnpm.cjs";
const stdoutPath = path.join(__dirname, "install.stdout.log");
const stderrPath = path.join(__dirname, "install.stderr.log");
const receiptPath = path.join(__dirname, "install-run.json");
const env = { ...process.env, PATH: `${nodeDirectory}${path.delimiter}${process.env.PATH || ""}` };
const pnpmVersion = spawnSync(nodePath, [pnpmPath, "--version"], { env, encoding: "utf8" });
if (process.version !== "v24.19.0" || pnpmVersion.status !== 0 || pnpmVersion.stdout.trim() !== "9.15.9") {
  throw new Error(`Pinned toolchain mismatch: Node=${process.version}, pnpm=${pnpmVersion.stdout.trim()}`);
}
const command = [pnpmPath, "install", "--offline", "--frozen-lockfile"];
const startedAt = new Date();
const started = process.hrtime.bigint();
const result = spawnSync(nodePath, command, { cwd: appRoot, env, maxBuffer: 64 * 1024 * 1024 });
const endedAt = new Date();
const receipt = {
  purpose: "dependency setup only; not a lint/typecheck gate",
  command: "pnpm install --offline --frozen-lockfile",
  argv: ["install", "--offline", "--frozen-lockfile"],
  executable: nodePath,
  pnpm: pnpmPath,
  workingDirectory: appRoot,
  node: process.version,
  pnpmVersion: pnpmVersion.stdout.trim(),
  startedUtc: startedAt.toISOString(),
  endedUtc: endedAt.toISOString(),
  elapsedSeconds: Number(process.hrtime.bigint() - started) / 1e9,
  exitCode: result.status,
  signal: result.signal,
  error: result.error ? String(result.error) : null,
  stdout: "install.stdout.log",
  stderr: "install.stderr.log",
};
fs.writeFileSync(stdoutPath, result.stdout || Buffer.alloc(0));
fs.writeFileSync(stderrPath, result.stderr || Buffer.alloc(0));
fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
if (result.status !== 0) process.exitCode = result.status || 1;
