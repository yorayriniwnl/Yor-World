const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const evidenceRoot = __dirname;
const repoRoot = path.resolve(evidenceRoot, "../../../../..");
const appRoot = path.join(repoRoot, "app");
const nodePath = process.execPath;
const nodeDirectory = path.dirname(nodePath);
const pnpmPath = "C:\\Users\\ayush\\AppData\\Local\\pnpm\\store\\v11\\links\\@\\pnpm\\9.15.9\\3d51f653a61d6f9b811790f44bb80b908ca8d24c424e6e53e491ea81b7f96a43\\node_modules\\pnpm\\bin\\pnpm.cjs";
const env = { ...process.env, PATH: `${nodeDirectory}${path.delimiter}${process.env.PATH || ""}` };

function git(args) {
  const result = spawnSync("git", args, { cwd: repoRoot, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || `git ${args.join(" ")} failed`);
  return result.stdout.trim();
}

if (process.version !== "v24.19.0") throw new Error(`Runner Node version mismatch: ${process.version}`);
const pnpmVersion = spawnSync(nodePath, [pnpmPath, "--version"], { env, encoding: "utf8" });
if (pnpmVersion.status !== 0 || pnpmVersion.stdout.trim() !== "9.15.9") {
  throw new Error(`Pinned pnpm version mismatch: ${pnpmVersion.stdout.trim()}`);
}
const resolvedChildNode = spawnSync("node", ["--version"], { env, encoding: "utf8" });
if (resolvedChildNode.status !== 0 || resolvedChildNode.stdout.trim() !== "v24.19.0") {
  throw new Error(`Pinned child Node mismatch: ${resolvedChildNode.stdout.trim()}`);
}

const results = [];
for (const name of ["lint", "typecheck"]) {
  const args = ["run", name];
  const startedAt = new Date();
  const started = process.hrtime.bigint();
  const result = spawnSync(nodePath, [pnpmPath, ...args], {
    cwd: appRoot,
    env,
    maxBuffer: 64 * 1024 * 1024,
  });
  const endedAt = new Date();
  const directory = path.join(evidenceRoot, name);
  const stdoutName = `${name}.stdout.log`;
  const stderrName = `${name}.stderr.log`;
  fs.writeFileSync(path.join(directory, stdoutName), result.stdout || Buffer.alloc(0));
  fs.writeFileSync(path.join(directory, stderrName), result.stderr || Buffer.alloc(0));
  const receipt = {
    command: `pnpm run ${name}`,
    argv: args,
    executable: nodePath,
    pnpm: pnpmPath,
    workingDirectory: appRoot,
    node: process.version,
    resolvedChildNode: resolvedChildNode.stdout.trim(),
    pnpmVersion: pnpmVersion.stdout.trim(),
    startedUtc: startedAt.toISOString(),
    endedUtc: endedAt.toISOString(),
    elapsedSeconds: Number(process.hrtime.bigint() - started) / 1e9,
    exitCode: result.status,
    signal: result.signal,
    error: result.error ? String(result.error) : null,
    stdout: `${name}/${stdoutName}`,
    stderr: `${name}/${stderrName}`,
  };
  fs.writeFileSync(path.join(directory, `${name}-run.json`), `${JSON.stringify(receipt, null, 2)}\n`);
  results.push(receipt);
}

const appDiff = spawnSync("git", ["diff", "--quiet", "HEAD", "--", "app"], { cwd: repoRoot });
const summary = {
  packet: "PRE-G7-20",
  sourceCommit: git(["rev-parse", "HEAD"]),
  appTree: git(["rev-parse", "HEAD:app"]),
  branch: git(["branch", "--show-current"]),
  appTrackedDiffEmpty: appDiff.status === 0,
  gates: results,
};
fs.writeFileSync(path.join(evidenceRoot, "quality-run-summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
if (appDiff.status !== 0 || results.some((result) => result.exitCode !== 0 || result.signal || result.error)) process.exitCode = 1;
