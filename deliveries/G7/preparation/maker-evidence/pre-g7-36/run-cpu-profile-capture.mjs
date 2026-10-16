import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../../../');
const node24 = 'C:\\Users\\ayush\\AppData\\Local\\Temp\\yor-world-node-24.19.0\\unpacked\\node-v24.19.0-win-x64\\node.exe';
const corepack = 'C:\\Program Files\\nodejs\\node_modules\\corepack\\dist\\corepack.js';
const scriptPath = path.join(here, 'capture-startup-cpu-profile.mjs');
const commandDir = path.join(here, 'commands');
fs.mkdirSync(commandDir, { recursive: true });
const nodeVersion = spawnSync(node24, ['--version'], { cwd: root, encoding: 'utf8' });
const pnpmVersion = spawnSync(node24, [corepack, 'pnpm@9.15.9', '--version'], { cwd: 'D:\\p35\\app', encoding: 'utf8' });
if (nodeVersion.status !== 0 || nodeVersion.stdout.trim() !== 'v24.19.0') throw new Error('Pinned Node version check failed.');
if (pnpmVersion.status !== 0 || pnpmVersion.stdout.trim() !== '9.15.9') throw new Error('Pinned pnpm version check failed.');
const environment = { ...process.env };
const cleared = ['CI', 'NODE_OPTIONS', 'NEXT_TELEMETRY_DISABLED', 'NEXT_PUBLIC_PRE_G7_13_EVIDENCE', 'PORT', 'C3_EVIDENCE_DIR', 'PRE_G7_13_EVIDENCE_MODE', 'PRE_G7_13_REQUIRE_ISOLATED_EVIDENCE', 'PRE_G7_13_EVIDENCE_DIR', 'PRE_G7_13_EXPECTED_EVIDENCE_DIR'];
for (const key of cleared) delete environment[key];
environment.PATH = `${path.dirname(node24)}${path.delimiter}${environment.PATH ?? ''}`;
const startedAt = new Date().toISOString();
const started = Date.now();
const result = spawnSync(node24, [scriptPath], { cwd: root, env: environment, encoding: 'buffer', maxBuffer: 20 * 1024 * 1024, windowsHide: true });
const endedAt = new Date().toISOString();
const elapsedMs = Date.now() - started;
const stdoutPath = path.join(commandDir, 'cpu-profile.stdout.bin');
const stderrPath = path.join(commandDir, 'cpu-profile.stderr.bin');
fs.writeFileSync(stdoutPath, result.stdout ?? Buffer.alloc(0));
fs.writeFileSync(stderrPath, result.stderr ?? Buffer.alloc(0));
const receipt = {
  name: 'cpu-profile',
  requestedCommand: 'node deliveries/G7/preparation/maker-evidence/pre-g7-36/capture-startup-cpu-profile.mjs',
  actualLauncherCommand: `"${node24}" "${scriptPath}"`,
  cwd: root,
  nodePath: node24,
  nodeVersion: nodeVersion.stdout.trim(),
  corepackPath: corepack,
  pnpmVersion: pnpmVersion.stdout.trim(),
  serverAppRoot: 'D:/p35/app',
  serverEnvironment: { NEXT_PUBLIC_PRE_G7_13_EVIDENCE: 'cleared' },
  environment: {},
  clearedFromCaller: cleared,
  startedAt,
  endedAt,
  elapsedMs,
  exitCode: result.status ?? 1,
  spawnError: result.error?.message ?? null,
  stdout: path.relative(root, stdoutPath).replaceAll(path.sep, '/'),
  stderr: path.relative(root, stderrPath).replaceAll(path.sep, '/'),
};
fs.writeFileSync(path.join(commandDir, 'cpu-profile.receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify({ name: receipt.name, exitCode: receipt.exitCode, elapsedMs, receipt: path.relative(root, path.join(commandDir, 'cpu-profile.receipt.json')).replaceAll(path.sep, '/') }, null, 2)}\n`);
if (receipt.exitCode !== 0) process.exitCode = receipt.exitCode;
