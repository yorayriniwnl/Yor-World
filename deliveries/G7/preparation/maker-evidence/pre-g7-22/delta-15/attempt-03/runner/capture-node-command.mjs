import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const [name, script, ...args] = process.argv.slice(2);
if (!name || !script) throw new Error("usage: capture-node-command.mjs <name> <script> [args...]");
const outputDirectory = path.resolve("deliveries/G7/preparation/maker-evidence/pre-g7-22/delta-15/attempt-03/commands");
mkdirSync(outputDirectory, { recursive: true });
const startedAt = new Date();
const startedClock = process.hrtime.bigint();
const child = spawn(process.execPath, [path.resolve(script), ...args], {
  cwd: process.cwd(),
  env: process.env,
  windowsHide: true,
  stdio: ["ignore", "pipe", "pipe"],
});
const stdoutChunks = [];
const stderrChunks = [];
child.stdout.on("data", (chunk) => stdoutChunks.push(Buffer.from(chunk)));
child.stderr.on("data", (chunk) => stderrChunks.push(Buffer.from(chunk)));
let spawnError = null;
child.on("error", (error) => { spawnError = error; });
child.on("close", (exitCode, signal) => {
  const endedAt = new Date();
  const stdout = Buffer.concat(stdoutChunks);
  const stderr = Buffer.concat(stderrChunks);
  const stdoutPath = path.join(outputDirectory, `${name}.stdout.bin`);
  const stderrPath = path.join(outputDirectory, `${name}.stderr.bin`);
  writeFileSync(stdoutPath, stdout);
  writeFileSync(stderrPath, stderr);
  const digest = (value) => createHash("sha256").update(value).digest("hex");
  const receipt = {
    displayCommand: `node ${script} ${args.join(" ")}`,
    executable: process.execPath,
    executableVersion: process.version,
    argv: [path.resolve(script), ...args],
    workingDirectory: process.cwd(),
    startedAtUtc: startedAt.toISOString(),
    endedAtUtc: endedAt.toISOString(),
    elapsedMilliseconds: Number(process.hrtime.bigint() - startedClock) / 1e6,
    exitCode,
    signal,
    spawnError: spawnError ? { name: spawnError.name, message: spawnError.message, code: spawnError.code } : null,
    relevantEnvironment: {},
    stdout: { path: path.basename(stdoutPath), bytes: stdout.length, sha256: digest(stdout) },
    stderr: { path: path.basename(stderrPath), bytes: stderr.length, sha256: digest(stderr) },
  };
  writeFileSync(path.join(outputDirectory, `${name}.receipt.json`), `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  process.stdout.write(`${name}: exit=${exitCode} signal=${signal ?? "none"} elapsedMs=${receipt.elapsedMilliseconds.toFixed(0)}\n`);
  process.exitCode = exitCode ?? 1;
});
