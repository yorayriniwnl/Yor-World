import { spawn } from "node:child_process";
import { createWriteStream, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const evidenceDir = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(evidenceDir, "../../../../..");
const appDir = process.argv[3] ? path.resolve(process.argv[3]) : path.join(repositoryRoot, "app");
const nodeHome = "C:\\Users\\ayush\\AppData\\Local\\YorWorldLocalHost\\runtime\\node-v24.19.0-win-x64";
const nodeExe = path.join(nodeHome, "node.exe");
const pnpmCli = "C:\\Users\\ayush\\AppData\\Roaming\\npm\\node_modules\\pnpm\\bin\\pnpm.cjs";

const jobs = {
  lint: { args: [pnpmCli, "run", "lint"], log: "lint.log" },
  typecheck: { args: [pnpmCli, "run", "typecheck"], log: "typecheck.log" },
  build: { args: [pnpmCli, "run", "build"], log: "build.log" },
  unit: { args: [pnpmCli, "run", "test:unit"], log: "unit.log" },
  unit15: {
    args: [pnpmCli, "exec", "vitest", "run", "--config", "vitest.config.ts", "--testTimeout=15000"],
    log: "unit-timeout-15s.log",
  },
  recovery: {
    args: [pnpmCli, "exec", "vitest", "run", "--config", "vitest.config.ts", "tests/unit/world-runtime-recovery.test.ts"],
    log: "focused-recovery.log",
  },
  integration: { args: [pnpmCli, "run", "test:integration"], log: "integration.log" },
  e2e: {
    args: [pnpmCli, "exec", "playwright", "test", "tests/e2e/world-fullscreen.spec.ts", "--project=chrome"],
    log: "world-fullscreen-e2e.log",
    env: {
      PORT: "3134",
      PRE_G7_11_EVIDENCE_DIR: evidenceDir,
      B5_EVIDENCE_DIR: evidenceDir,
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
  routecheck: {
    args: [pnpmCli, "exec", "playwright", "test", "tests/e2e/legacy-platform/project-routes.spec.ts", "--project=chrome", "--grep=unpublished candidate 'candidatex' returns 404 without leaking unverified data"],
    log: "routecheck-e2e.log",
    env: { PORT: "3135", B5_EVIDENCE_DIR: path.join(evidenceDir, "route-guards-final"), A2_EVIDENCE_DIR: path.join(evidenceDir, "route-guards-final"), NEXT_TELEMETRY_DISABLED: "1" },
  },
  publicShell: {
    args: [pnpmCli, "exec", "playwright", "test", "tests/e2e/public-shell.spec.ts", "--project=chrome"],
    log: "public-shell-e2e.log",
    env: {
      PORT: "3136",
      B5_EVIDENCE_DIR: path.join(evidenceDir, "public-shell"),
      W3_EVIDENCE_DIR: path.join(evidenceDir, "public-shell"),
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
};

const name = process.argv[2];
const job = jobs[name];
if (!job) {
  process.stderr.write(`Usage: run-validation.mjs ${Object.keys(jobs).join("|")} [app-dir]\n`);
  process.exit(2);
}

mkdirSync(evidenceDir, { recursive: true });
const logPath = path.join(evidenceDir, job.log);
const log = createWriteStream(logPath, { flags: "w" });
const env = {
  ...process.env,
  PATH: `${nodeHome};${process.env.PATH ?? ""}`,
  NEXT_TELEMETRY_DISABLED: "1",
  ...job.env,
};
const startedAt = new Date().toISOString();
const header = [
  `PRE-G7-11 validation: ${name}`,
  `Started: ${startedAt}`,
  `Node: ${process.version} (${process.execPath})`,
  `Command: ${JSON.stringify([nodeExe, ...job.args])}`,
  `CWD: ${appDir}`,
  `PATH[0]: ${nodeHome}`,
  "--- raw output ---",
  "",
].join("\n");
process.stdout.write(header);
log.write(header);

const child = spawn(nodeExe, job.args, { cwd: appDir, env, stdio: ["ignore", "pipe", "pipe"] });
child.stdout.on("data", (chunk) => { process.stdout.write(chunk); log.write(chunk); });
child.stderr.on("data", (chunk) => { process.stderr.write(chunk); log.write(chunk); });
child.on("error", (error) => {
  const message = `\nSPAWN ERROR: ${error.stack ?? error.message}\n`;
  process.stderr.write(message);
  log.write(message);
  log.end(() => process.exit(1));
});
child.on("close", (code, signal) => {
  const footer = `\n--- exit ---\nExit code: ${code ?? "null"}\nSignal: ${signal ?? "none"}\nFinished: ${new Date().toISOString()}\n`;
  process.stdout.write(footer);
  log.end(footer, () => { process.exitCode = code ?? 1; });
});
