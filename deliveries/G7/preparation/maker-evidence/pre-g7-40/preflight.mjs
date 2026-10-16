import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const evidenceRoot = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(evidenceRoot, '../../../../../');
const sourceCommit = '4c3908b61d728babeaf67419d225c1f3978bb779';
const expectedAppTree = 'c0ba382dae8bd05f0cee339e40f98a24db40347d';
const expectedDomainTree = 'e9861f48ed2fdf96e7cf7f3dd495679d958f30e6';
const branchName = 'codex/pre-g7-40-production-shader-diagnostics-gate-20261016';
const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const appTree = git(['rev-parse', 'HEAD:app']);
const domainTree = git(['rev-parse', 'HEAD:yorayriniwnl.in']);
const buildBytes = fs.readFileSync(path.join(root, 'app/.next/BUILD_ID'));
const buildId = buildBytes.toString('utf8').trim();
const buildIdSha256 = sha256(buildBytes);
const appRuntimePath = 'app/src/features/world/WorldRuntime.ts';
const domainRuntimePath = 'yorayriniwnl.in/src/features/world/WorldRuntime.ts';
const appRuntime = fs.readFileSync(path.join(root, appRuntimePath));
const domainRuntime = fs.readFileSync(path.join(root, domainRuntimePath));
const runtimeAppBlobId = git(['rev-parse', `${sourceCommit}:${appRuntimePath}`]);
const runtimeDomainBlobId = git(['rev-parse', `${sourceCommit}:${domainRuntimePath}`]);
const runtimeNormalizedEqual = Buffer.from(appRuntime.toString('utf8').replace(/\r\n/g, '\n')).equals(
  Buffer.from(domainRuntime.toString('utf8').replace(/\r\n/g, '\n')),
);
const packagePaths = ['package.json', 'pnpm-lock.yaml', 'patches/three@0.180.0.patch'];
const packageParity = packagePaths.map((relativePath) => {
  const app = fs.readFileSync(path.join(root, 'app', relativePath));
  const domain = fs.readFileSync(path.join(root, 'yorayriniwnl.in', relativePath));
  return { path: relativePath, byteEqual: app.equals(domain), sha256: sha256(app), appBytes: app.byteLength, domainBytes: domain.byteLength };
});
const validation = JSON.parse(fs.readFileSync(path.join(evidenceRoot, 'validation-summary.json'), 'utf8'));
let noUncommittedProductSource = true;
try {
  execFileSync('git', ['diff', '--quiet', '--', 'app/', 'yorayriniwnl.in/'], { cwd: root, stdio: 'ignore' });
} catch {
  noUncommittedProductSource = false;
}
const remoteTip = git(['ls-remote', '--heads', 'origin', branchName]).split(/\s+/)[0] ?? '';
const runtimeParity = {
  normalizedEqual: runtimeNormalizedEqual,
  appBytes: appRuntime.byteLength,
  domainBytes: domainRuntime.byteLength,
  appSha256: sha256(appRuntime),
  domainSha256: sha256(domainRuntime),
  appBlobId: runtimeAppBlobId,
  domainBlobId: runtimeDomainBlobId,
  committedBlobEqual: runtimeAppBlobId === runtimeDomainBlobId,
};
const checks = {
  sourceCommit: git(['rev-parse', 'HEAD']) === sourceCommit,
  appTree: appTree === expectedAppTree,
  domainTree: domainTree === expectedDomainTree,
  remoteTip: remoteTip === sourceCommit,
  buildId: buildId.length > 0,
  buildIdSha256: /^[0-9a-f]{64}$/.test(buildIdSha256),
  nodeVersion: process.version === 'v24.19.0',
  pnpmVersion: validation.pnpmVersion === '9.15.9',
  validation: validation.checks.length === 3 && validation.checks.every((check) => check.exitCode === 0),
  packageParity: packageParity.every((item) => item.byteEqual),
  runtimeParity: runtimeParity.normalizedEqual && runtimeParity.committedBlobEqual,
  noUncommittedProductSource,
};
const result = {
  packet: 'PRE-G7-40',
  status: Object.values(checks).every(Boolean) ? 'PASS' : 'FAIL',
  sourceCommit,
  appTree,
  sourceCommitDomainTree: domainTree,
  buildId,
  buildIdSha256,
  nodeVersion: process.version,
  pnpmVersion: validation.pnpmVersion,
  remoteTip,
  packageParity,
  runtimeParity,
  validation,
  checks,
  disallowedStatus: [],
  browserCaptureStarted: false,
};
fs.writeFileSync(path.join(evidenceRoot, 'preflight.json'), `${JSON.stringify(result, null, 2)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (result.status !== 'PASS') process.exitCode = 1;
