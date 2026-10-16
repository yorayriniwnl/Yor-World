import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";

const configPath = path.resolve(process.argv[2] || "");
const config = JSON.parse(await readFile(configPath, "utf8"));
const outDir = path.resolve(config.outputDirectory);
await mkdir(outDir, { recursive: true });
const env = { ...process.env };
for (const key of config.unsetEnvironment || []) delete env[key];
for (const [key, value] of Object.entries(config.envOverrides || {})) env[key] = String(value);
if (config.pathPrepend) env.PATH = config.pathPrepend + path.delimiter + (env.PATH || "");
const startDate = new Date();
const start = performance.now();
const child = spawn(config.executable, config.args || [], {
  cwd: config.cwd,
  env,
  windowsHide: true,
  stdio: ["ignore", "pipe", "pipe"],
});
const out = [];
const err = [];
let spawnError = null;
child.stdout.on("data", chunk => out.push(Buffer.from(chunk)));
child.stderr.on("data", chunk => err.push(Buffer.from(chunk)));
child.on("error", error => { spawnError = error.message; });
const result = await new Promise(resolve => {
  child.on("close", (code, signal) => resolve({ code, signal }));
});
const endDate = new Date();
const stdout = Buffer.concat(out);
const stderr = Buffer.concat(err);
const output = async (suffix, bytes) => {
  const file = config.id + "." + suffix + ".bin";
  await writeFile(path.join(outDir, file), bytes);
  return {
    path: file,
    bytes: bytes.byteLength,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
};
const stdoutRecord = await output("stdout", stdout);
const stderrRecord = await output("stderr", stderr);
const relevantEnvironment = {};
for (const key of config.environmentKeys || []) {
  relevantEnvironment[key] = Object.hasOwn(env, key) ? env[key] : null;
}
const receipt = {
  schemaVersion: 1,
  id: config.id,
  displayCommand: config.displayCommand,
  executable: config.executable,
  args: config.args || [],
  executableVersion: process.version,
  processExecPath: process.execPath,
  workingDirectory: config.cwd,
  startedAtUtc: startDate.toISOString(),
  endedAtUtc: endDate.toISOString(),
  elapsedMilliseconds: Number((performance.now() - start).toFixed(3)),
  pathPrepend: config.pathPrepend || null,
  unsetEnvironment: config.unsetEnvironment || [],
  relevantEnvironment,
  exitCode: result.code,
  signal: result.signal,
  spawnError,
  stdout: stdoutRecord,
  stderr: stderrRecord,
};
await writeFile(path.join(outDir, config.id + ".receipt.json"), JSON.stringify(receipt, null, 2) + "\n");
process.stdout.write(JSON.stringify(receipt, null, 2) + "\n");
if (result.code !== 0 || spawnError) process.exitCode = result.code || 1;