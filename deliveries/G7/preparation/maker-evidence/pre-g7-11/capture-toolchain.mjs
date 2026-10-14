import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const evidenceRoot = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(evidenceRoot, "../../../../..");
const appRoot = path.join(repositoryRoot, "app");
const nodeHome = "C:\\Users\\ayush\\AppData\\Local\\YorWorldLocalHost\\runtime\\node-v24.19.0-win-x64";
const nodeExe = path.join(nodeHome, "node.exe");
const pnpmCli = "C:\\Users\\ayush\\AppData\\Roaming\\npm\\node_modules\\pnpm\\bin\\pnpm.cjs";
const env = { ...process.env, PATH: `${nodeHome};${process.env.PATH ?? ""}` };
const whereExe = path.join(process.env.WINDIR ?? "C:\\Windows", "System32", "where.exe");
const metadata = {
  capturedAt: new Date().toISOString(),
  cwd: appRoot,
  nodeExecutable: nodeExe,
  nodeVersion: execFileSync(nodeExe, ["--version"], { cwd: appRoot, env, encoding: "utf8" }).trim(),
  pnpmResolution: execFileSync(whereExe, ["pnpm"], { cwd: appRoot, env, encoding: "utf8" }).trim().split(/\r?\n/),
  effectivePnpmVersionFromAppRoot: execFileSync(nodeExe, [pnpmCli, "--version"], { cwd: appRoot, env, encoding: "utf8" }).trim(),
  requiredPnpmVersion: "9.15.9 (selected from app/package.json packageManager field)",
};
writeFileSync(path.join(evidenceRoot, "toolchain.json"), `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(metadata, null, 2)}\n`);
