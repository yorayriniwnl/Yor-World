import { spawn, spawnSync } from "node:child_process";
import { createWriteStream, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(process.cwd(), "..");
const evidenceDir = path.join(repoRoot, "deliveries/G7/preparation/maker-evidence/pre-g7-35");
const commandsDir = path.join(evidenceDir, "commands");
mkdirSync(commandsDir, { recursive: true });
const [name, ...args] = process.argv.slice(2);
if (!name || args.length === 0) throw new Error("Usage: run-pnpm-command.mjs <name> <pnpm args...>");

const corepackPath = "C:\\Program Files\\nodejs\\node_modules\\corepack\\dist\\corepack.js";
const env = { ...process.env, COREPACK_ENABLE_NETWORK: "0", COREPACK_DEFAULT_TO_LATEST: "0" };
delete env.NEXT_PUBLIC_PRE_G7_13_EVIDENCE;
if (name === "production-build") env.NEXT_PUBLIC_PRE_G7_13_EVIDENCE = "1";
const versionResult = spawnSync(process.execPath, [corepackPath, "pnpm", "--version"], { cwd: process.cwd(), env, encoding: "utf8" });
const pnpmVersion = (versionResult.stdout || "").trim();
const receipt = {
  name,
  requestedCommand: `pnpm ${args.join(" ")}`,
  actualLauncherCommand: `${process.execPath} ${corepackPath} pnpm ${args.join(" ")}`,
  cwd: process.cwd(),
  nodePath: process.execPath,
  nodeVersion: process.version,
  corepackPath,
  pnpmVersion,
  environment: {
    COREPACK_ENABLE_NETWORK: env.COREPACK_ENABLE_NETWORK,
    COREPACK_DEFAULT_TO_LATEST: env.COREPACK_DEFAULT_TO_LATEST,
    ...(name === "production-build" ? { NEXT_PUBLIC_PRE_G7_13_EVIDENCE: env.NEXT_PUBLIC_PRE_G7_13_EVIDENCE } : {}),
  },
  startedAt: new Date().toISOString(),
  endedAt: null,
  elapsedMs: null,
  exitCode: null,
  spawnError: null,
  stdout: `commands/${name}.stdout.txt`,
  stderr: `commands/${name}.stderr.txt`,
};
const receiptPath = path.join(commandsDir, `${name}.json`);
if (versionResult.status !== 0 || pnpmVersion !== "9.15.9") {
  receipt.endedAt = new Date().toISOString();
  receipt.exitCode = 1;
  receipt.spawnError = `Pinned pnpm check failed (status ${versionResult.status}, version ${pnpmVersion || "<empty>"}).`;
  writeFileSync(path.join(commandsDir, `${name}.stdout.txt`), versionResult.stdout || "", "utf8");
  writeFileSync(path.join(commandsDir, `${name}.stderr.txt`), versionResult.stderr || "", "utf8");
  writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  process.stderr.write(`${receipt.spawnError}\n`);
  process.exit(1);
}
const stdoutPath = path.join(commandsDir, `${name}.stdout.txt`);
const stderrPath = path.join(commandsDir, `${name}.stderr.txt`);
const stdoutFile = createWriteStream(stdoutPath);
const stderrFile = createWriteStream(stderrPath);
const started = Date.now();
const child = spawn(process.execPath, [corepackPath, "pnpm", ...args], { cwd: process.cwd(), env, stdio: ["ignore", "pipe", "pipe"] });
child.stdout.on("data", (chunk) => { stdoutFile.write(chunk); process.stdout.write(chunk); });
child.stderr.on("data", (chunk) => { stderrFile.write(chunk); process.stderr.write(chunk); });
child.on("error", (error) => { receipt.spawnError = String(error); });
child.on("close", (code) => {
  stdoutFile.end();
  stderrFile.end();
  receipt.endedAt = new Date().toISOString();
  receipt.elapsedMs = Date.now() - started;
  receipt.exitCode = code ?? 1;
  writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  process.exitCode = receipt.exitCode;
});
