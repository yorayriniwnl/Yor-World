import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../../../');
const appRoot = path.join(root, 'app');
const node24 = 'C:\\Users\\ayush\\AppData\\Local\\Temp\\yor-world-node-24.19.0\\unpacked\\node-v24.19.0-win-x64\\node.exe';
const corepack = 'C:\\Program Files\\nodejs\\node_modules\\corepack\\dist\\corepack.js';
const checks = {
  install: { args: ['install', '--offline', '--frozen-lockfile'], env: {} },
  build: { args: ['run', 'build'], env: { NEXT_PUBLIC_PRE_G7_13_EVIDENCE: '1' } },
};
const name = process.argv[2];
const check = checks[name];
if (!check) throw new Error(`Unknown check ${name}; expected one of: ${Object.keys(checks).join(', ')}`);

const nodeVersion = spawnSync(node24, ['--version'], { cwd: root, encoding: 'utf8' });
const pnpmVersion = spawnSync(node24, [corepack, 'pnpm@9.15.9', '--version'], { cwd: root, encoding: 'utf8' });
if (nodeVersion.status !== 0 || nodeVersion.stdout.trim() !== 'v24.19.0') throw new Error('Pinned Node version check failed.');
if (pnpmVersion.status !== 0 || pnpmVersion.stdout.trim() !== '9.15.9') throw new Error('Pinned pnpm version check failed.');

const commandDir = path.join(here, 'commands');
fs.mkdirSync(commandDir, { recursive: true });
const environment = { ...process.env };
for (const key of ['CI', 'NODE_OPTIONS', 'NEXT_TELEMETRY_DISABLED', 'NEXT_PUBLIC_PRE_G7_13_EVIDENCE', 'PORT', 'C3_EVIDENCE_DIR']) delete environment[key];
environment.PATH = `${path.dirname(node24)}${path.delimiter}${environment.PATH ?? ''}`;
Object.assign(environment, check.env);

const startedAt = new Date().toISOString();
const started = Date.now();
const processResult = spawnSync(node24, [corepack, 'pnpm@9.15.9', ...check.args], {
  cwd: appRoot,
  env: environment,
  encoding: 'buffer',
  maxBuffer: 150 * 1024 * 1024,
  windowsHide: true,
});
const endedAt = new Date().toISOString();
const elapsedMs = Date.now() - started;
const stdoutPath = path.join(commandDir, `${name}.stdout.bin`);
const stderrPath = path.join(commandDir, `${name}.stderr.bin`);
fs.writeFileSync(stdoutPath, processResult.stdout ?? Buffer.alloc(0));
fs.writeFileSync(stderrPath, processResult.stderr ?? Buffer.alloc(0));
const receipt = {
  name,
  requestedCommand: `pnpm ${check.args.join(' ')}`,
  actualLauncherCommand: `"${node24}" "${corepack}" pnpm@9.15.9 ${check.args.join(' ')}`,
  cwd: appRoot,
  nodePath: node24,
  nodeVersion: nodeVersion.stdout.trim(),
  corepackPath: corepack,
  pnpmVersion: pnpmVersion.stdout.trim(),
  environment: check.env,
  startedAt,
  endedAt,
  elapsedMs,
  exitCode: processResult.status ?? 1,
  spawnError: processResult.error?.message ?? null,
  stdout: path.relative(root, stdoutPath).replaceAll(path.sep, '/'),
  stderr: path.relative(root, stderrPath).replaceAll(path.sep, '/'),
};
fs.writeFileSync(path.join(commandDir, `${name}.receipt.json`), `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ name, exitCode: receipt.exitCode, elapsedMs, receipt: path.relative(root, path.join(commandDir, `${name}.receipt.json`)).replaceAll(path.sep, '/') }));
if (receipt.exitCode !== 0) process.exitCode = receipt.exitCode;
