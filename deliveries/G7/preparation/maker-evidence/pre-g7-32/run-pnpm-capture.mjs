import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../../../..");
const appRoot = path.join(root, "app");
const node24 = "C:\\Users\\ayush\\AppData\\Local\\Temp\\yor-world-node-24.19.0\\unpacked\\node-v24.19.0-win-x64\\node.exe";
const corepack = "C:\\Program Files\\nodejs\\node_modules\\corepack\\dist\\corepack.js";
const evidenceEnv = {
  PRE_G7_13_EVIDENCE_MODE: "1",
  PRE_G7_13_REQUIRE_ISOLATED_EVIDENCE: "1",
  PRE_G7_13_EVIDENCE_DIR: path.join(here, "visual-run"),
  PRE_G7_13_EXPECTED_EVIDENCE_DIR: path.join(here, "visual-run"),
};
const performanceEvidenceDir = path.join(here, "performance");

const checks = {
  install: { args: ["install", "--offline", "--frozen-lockfile"], env: {} },
  unit: { args: ["run", "test:unit"], env: {} },
  lint: { args: ["run", "lint"], env: {} },
  typecheck: { args: ["run", "typecheck"], env: {} },
  integration_01: { args: ["run", "test:integration"], env: {} },
  integration_02: { args: ["run", "test:integration"], env: {} },
  build: { args: ["run", "build"], env: { NEXT_PUBLIC_PRE_G7_13_EVIDENCE: "1" } },
  composition_e2e: {
    args: ["exec", "playwright", "test", "tests/e2e/world-reference-composition.spec.ts"],
    env: evidenceEnv,
  },
  performance: {
    args: ["run", "test:performance", "--trace", "on"],
    env: { PORT: "3220", C3_EVIDENCE_DIR: performanceEvidenceDir },
  },
};

const name = process.argv[2];
const check = checks[name];
if (!check) {
  process.stderr.write(`Unknown check name: ${name ?? "(missing)"}\nAvailable: ${Object.keys(checks).join(", ")}\n`);
  process.exit(2);
}

const nodeVersion = spawnSync(node24, ["--version"], { cwd: root, encoding: "utf8" });
if (nodeVersion.status !== 0 || nodeVersion.stdout.trim() !== "v24.19.0") {
  throw new Error(`Pinned Node check failed: ${nodeVersion.stdout}${nodeVersion.stderr}`);
}
const pnpmVersion = spawnSync(node24, [corepack, "pnpm@9.15.9", "--version"], { cwd: root, encoding: "utf8" });
if (pnpmVersion.status !== 0 || pnpmVersion.stdout.trim() !== "9.15.9") {
  throw new Error(`Pinned pnpm check failed: ${pnpmVersion.stdout}${pnpmVersion.stderr}`);
}

const commandDir = path.join(here, "commands");
fs.mkdirSync(commandDir, { recursive: true });
if (name === "composition_e2e") fs.mkdirSync(evidenceEnv.PRE_G7_13_EVIDENCE_DIR, { recursive: true });
if (name === "performance") fs.mkdirSync(performanceEvidenceDir, { recursive: true });

const environment = { ...process.env };
const cleared = [
  "CI",
  "NODE_OPTIONS",
  "NEXT_TELEMETRY_DISABLED",
  "NEXT_PUBLIC_PRE_G7_13_EVIDENCE",
  "PORT",
  "C3_EVIDENCE_DIR",
  "PRE_G7_13_EVIDENCE_MODE",
  "PRE_G7_13_REQUIRE_ISOLATED_EVIDENCE",
  "PRE_G7_13_EVIDENCE_DIR",
  "PRE_G7_13_EXPECTED_EVIDENCE_DIR",
];
for (const key of cleared) delete environment[key];
environment.PATH = `${path.dirname(node24)}${path.delimiter}${environment.PATH ?? ""}`;
Object.assign(environment, check.env);

const stdoutPath = path.join(commandDir, `${name}.stdout.bin`);
const stderrPath = path.join(commandDir, `${name}.stderr.bin`);
const receiptPath = path.join(commandDir, `${name}.receipt.json`);
const startedAt = new Date().toISOString();
const started = Date.now();
const processResult = spawnSync(node24, [corepack, "pnpm@9.15.9", ...check.args], {
  cwd: appRoot,
  env: environment,
  encoding: "buffer",
  maxBuffer: 150 * 1024 * 1024,
  windowsHide: true,
});
const endedAt = new Date().toISOString();
const elapsedMs = Date.now() - started;
fs.writeFileSync(stdoutPath, processResult.stdout ?? Buffer.alloc(0));
fs.writeFileSync(stderrPath, processResult.stderr ?? Buffer.alloc(0));

const requestedCommand = `pnpm ${check.args.join(" ")}`;
const receipt = {
  name,
  requestedCommand,
  actualLauncherCommand: `"${node24}" "${corepack}" pnpm@9.15.9 ${check.args.join(" ")}`,
  cwd: appRoot,
  nodePath: node24,
  nodeVersion: nodeVersion.stdout.trim(),
  corepackPath: corepack,
  pnpmVersion: pnpmVersion.stdout.trim(),
  environment: check.env,
  clearedFromCaller: cleared,
  startedAt,
  endedAt,
  elapsedMs,
  exitCode: processResult.status ?? 1,
  spawnError: processResult.error?.message ?? null,
  stdout: path.relative(root, stdoutPath).replaceAll(path.sep, "/"),
  stderr: path.relative(root, stderrPath).replaceAll(path.sep, "/"),
};
fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify({ name, requestedCommand, exitCode: receipt.exitCode, elapsedMs, receipt: path.relative(root, receiptPath).replaceAll(path.sep, "/") }, null, 2)}\n`);
if (receipt.exitCode !== 0) process.exitCode = receipt.exitCode;
