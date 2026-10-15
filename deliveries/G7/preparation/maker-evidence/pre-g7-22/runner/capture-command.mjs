import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const [outputDirectory, name, displayCommand, pnpmEntry, ...pnpmArgs] = process.argv.slice(2);
if (!outputDirectory || !name || !displayCommand || !pnpmEntry) {
  throw new Error("usage: capture-command.mjs <output-dir> <name> <display-command> <pnpm-entry> [pnpm-args...]");
}

fs.mkdirSync(outputDirectory, { recursive: true });
const startedAt = new Date();
const startedClock = process.hrtime.bigint();
const environment = { ...process.env };
const nodeDirectory = path.dirname(process.execPath);
environment.PATH = `${nodeDirectory}${path.delimiter}${environment.PATH ?? ""}`;
const relevantEnvironmentNames = [
  "NEXT_PUBLIC_PRE_G7_13_EVIDENCE",
  "PRE_G7_13_EVIDENCE_MODE",
  "PRE_G7_13_REQUIRE_ISOLATED_EVIDENCE",
  "PRE_G7_13_EVIDENCE_DIR",
  "PRE_G7_13_EXPECTED_EVIDENCE_DIR",
  "PORT",
];
const relevantEnvironment = Object.fromEntries(
  relevantEnvironmentNames
    .filter((key) => Object.hasOwn(environment, key))
    .map((key) => [key, environment[key]]),
);

const child = spawn(process.execPath, [pnpmEntry, ...pnpmArgs], {
  cwd: process.cwd(),
  env: environment,
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
  fs.writeFileSync(stdoutPath, stdout);
  fs.writeFileSync(stderrPath, stderr);
  const sha256 = (buffer) => createHash("sha256").update(buffer).digest("hex");
  const receipt = {
    displayCommand,
    executable: process.execPath,
    executableVersion: process.version,
    argv: [pnpmEntry, ...pnpmArgs],
    workingDirectory: process.cwd(),
    startedAtUtc: startedAt.toISOString(),
    endedAtUtc: endedAt.toISOString(),
    elapsedMilliseconds: Number(process.hrtime.bigint() - startedClock) / 1e6,
    exitCode,
    signal,
    spawnError: spawnError ? { name: spawnError.name, message: spawnError.message, code: spawnError.code } : null,
    relevantEnvironment,
    stdout: { path: path.basename(stdoutPath), bytes: stdout.length, sha256: sha256(stdout) },
    stderr: { path: path.basename(stderrPath), bytes: stderr.length, sha256: sha256(stderr) },
  };
  fs.writeFileSync(path.join(outputDirectory, `${name}.receipt.json`), `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  process.stdout.write(`${name}: exit=${exitCode} signal=${signal ?? "none"} elapsedMs=${receipt.elapsedMilliseconds.toFixed(0)}\n`);
  process.exitCode = exitCode ?? 1;
});
