import { spawn } from 'node:child_process';
import { createWriteStream, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const helper = 'C:/Users/yoray/.codex-account1/plugins/cache/openai-curated-remote/sites/1.0.1/scripts/build-site.mjs';
const startedAt = new Date().toISOString();
const log = createWriteStream(path.join(here, 'evidence/build.log'));
const child = spawn(process.execPath, [helper], {
  cwd: path.join(here, 'source'),
  env: { ...process.env, NEXT_PUBLIC_BASE_URL: 'https://yor-world.deadlygamerayush5.chatgpt.site', NEXT_TELEMETRY_DISABLED: '1' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
for (const output of [child.stdout, child.stderr]) output.on('data', data => {
  log.write(data);
  process.stdout.write(data);
});
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('close', (code, signal) => {
  log.end();
  writeFileSync(path.join(here, 'evidence/build.json'), JSON.stringify({
    status: code === 0 && !signal ? 'PASS' : 'FAIL', exitCode: code, signal,
    startedAt, finishedAt: new Date().toISOString(), nodeVersion: process.version,
    helper, purpose: 'Fresh static-preview build; excludes API/admin backend; no G7 acceptance',
  }, null, 2) + '\n');
  process.exitCode = code ?? 1;
});
