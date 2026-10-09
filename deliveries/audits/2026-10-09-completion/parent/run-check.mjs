import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const auditRoot = import.meta.dirname;
const workspace = path.resolve(auditRoot, '../../../..');
const appRoot = path.join(workspace, 'app');
const name = process.argv[2];
const checks = {
  lint: ['eslint/bin/eslint.js', '.', '--max-warnings=0'],
  typecheck: ['typescript/bin/tsc', '--noEmit'],
  unit: ['vitest/vitest.mjs', 'run', '--config', 'vitest.config.ts', '--reporter=json', '--outputFile', path.join(auditRoot, 'unit-results.json')],
  integration: ['vitest/vitest.mjs', 'run', '--config', 'vitest.integration.config.ts', '--reporter=json', '--outputFile', path.join(auditRoot, 'integration-results.json')],
  build: ['next/dist/bin/next', 'build'],
  e2e: ['@playwright/test/cli.js', 'test', '--output', path.join(auditRoot, 'browser-output')],
  performance: ['@playwright/test/cli.js', 'test', '--config', 'playwright.performance.config.ts', '--output', path.join(auditRoot, 'performance-output')],
  gltf: ['../scripts/release/validate-gltf-assets.mjs', '--output', 'deliveries/audits/2026-10-09-completion/parent/gltf-validation.json'],
  composition: ['../scripts/release/check-release-composition.mjs', '--output', 'deliveries/audits/2026-10-09-completion/parent/release-composition.json'],
  budgets: ['../scripts/release/check-performance-budgets.mjs', '--benchmark-dir', auditRoot, '--output', 'deliveries/audits/2026-10-09-completion/parent/budget-validation.json'],
};
if (!checks[name]) throw new Error('Unknown audit check');
const [entry, ...args] = checks[name];
const executableEntry = entry.startsWith('../scripts/') ? path.resolve(appRoot, entry) : path.join(appRoot, 'node_modules', entry);
const executableArgs = [executableEntry, ...args];
const env = {
  ...process.env,
  NEXT_TELEMETRY_DISABLED: '1',
  CI: '1',
  B5_EVIDENCE_DIR: auditRoot,
  C3_EVIDENCE_DIR: auditRoot,
};
// Synthetic local browser testing only; this never proves live services.
if (['e2e', 'performance'].includes(name)) {
  env.PORT = name === 'e2e' ? '3233' : '3298';
  env.YOR_E2E_FIXTURE = '1';
  env.YOR_TEST_DATABASE_PATH = path.join(auditRoot, `${name}-fixture-db`);
  env.CONTACT_HASH_SECRET = 'completion-audit-synthetic-contact';
  env.QUOTA_HASH_SECRET = 'completion-audit-synthetic-quota';
}
const logFile = path.join(auditRoot, `${name}.log`);
const log = fs.createWriteStream(logFile);
const startedAt = new Date().toISOString();
const start = Date.now();
console.log(`Audit ${name} started ${startedAt}`);
const child = spawn(process.execPath, executableArgs, { cwd: appRoot, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
child.stdout.on('data', (chunk) => log.write(chunk));
child.stderr.on('data', (chunk) => log.write(chunk));
child.on('error', (error) => { log.write(error.stack); });
const result = await new Promise((resolve) => child.on('close', (code, signal) => resolve({ code, signal })));
await new Promise((resolve) => log.end(resolve));
const receipt = {
  name, command: [process.execPath, ...executableArgs], cwd: appRoot,
  startedAt, finishedAt: new Date().toISOString(), durationMs: Date.now() - start,
  exitCode: result.code, signal: result.signal,
  status: result.code === 0 ? 'PASS' : 'FAIL',
  log: path.relative(workspace, logFile),
  scope: 'Fresh local execution; browser backend is a synthetic embedded fixture, not production proof',
};
fs.writeFileSync(path.join(auditRoot, `${name}-receipt.json`), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify(receipt));
process.exitCode = result.code ?? 1;
