import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const evidenceRoot = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(evidenceRoot, '../../../../../');
const sourceCommit = 'ae0412fb4bfcf81b807ecd492a96cbd773c5005c';
const expectedAppTree = '7572fd8d082659251762ddb81416219a37800680';
const expectedDomainTree = '58721ce1ae7e8c3c84c0b959566c975932871f8c';
const expectedP38EvidenceDomainTree = '08e17ce6b032088101884db718de7ce3a60d5d06';
const expectedBuildId = 'ZU5S4uDGagmUivvV4xDKh';
const expectedBuildIdSha256 = '9a2f517f64d3d460f4d800276ea7a46bb9bb63740c5ea85ca0b77d1b74432240';
const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const appTree = git(['rev-parse', 'HEAD:app']);
const candidateDomainTree = git(['rev-parse', 'HEAD:yorayriniwnl.in']);
const sourceCommitAppTree = git(['rev-parse', `${sourceCommit}:app`]);
const sourceCommitDomainTree = git(['rev-parse', `${sourceCommit}:yorayriniwnl.in`]);
const buildIdBytes = fs.readFileSync(path.join(root, 'app/.next/BUILD_ID'));
const buildId = buildIdBytes.toString('utf8').trim();
const buildIdSha256 = sha256(buildIdBytes);
const probeScriptPath = path.join(evidenceRoot, 'probe-webgl-startup.mjs');
const runnerScriptPath = path.join(evidenceRoot, 'run-webgl-capability-probe.mjs');
const probeScriptSha256 = sha256(fs.readFileSync(probeScriptPath));
const runnerScriptSha256 = sha256(fs.readFileSync(runnerScriptPath));
const packagePaths = ['package.json', 'pnpm-lock.yaml', 'patches/three@0.180.0.patch'];
const packageParity = packagePaths.map((relativePath) => {
  const appBytes = fs.readFileSync(path.join(root, 'app', relativePath));
  const domainBytes = fs.readFileSync(path.join(root, 'yorayriniwnl.in', relativePath));
  return { path: relativePath, byteEqual: appBytes.equals(domainBytes), sha256: sha256(appBytes), appBytes: appBytes.byteLength, domainBytes: domainBytes.byteLength };
});
let noUncommittedProductSource = true;
try {
  execFileSync('git', ['diff', '--quiet', '--', 'app/', 'yorayriniwnl.in/'], { cwd: root, stdio: 'ignore' });
} catch {
  noUncommittedProductSource = false;
}
const branch = git(['branch', '--show-current']);
const remoteTip = git(['rev-parse', 'origin/codex/pre-g7-39-program-parameter-query-diagnostic-20261016']);
const checks = {
  sourceCommitExists: git(['cat-file', '-t', sourceCommit]) === 'commit',
  appTree: appTree === expectedAppTree && sourceCommitAppTree === expectedAppTree,
  domainTree: candidateDomainTree === expectedP38EvidenceDomainTree && sourceCommitDomainTree === expectedDomainTree,
  buildId: buildId === expectedBuildId,
  buildIdSha256: buildIdSha256 === expectedBuildIdSha256,
  packageParity: packageParity.every((item) => item.byteEqual),
  noUncommittedProductSource,
  branch: branch === 'codex/pre-g7-39-program-parameter-query-diagnostic-20261016',
  packetRemoteTip: remoteTip === git(['rev-parse', 'HEAD']),
};
const result = {
  packet: 'PRE-G7-39',
  status: Object.values(checks).every(Boolean) ? 'PASS' : 'FAIL',
  frozenPacket: 'PRE-G7-38',
  sourceCommit,
  appTree,
  sourceCommitDomainTree,
  candidateDomainTree,
  buildId,
  buildIdSha256,
  probeScriptSha256,
  runnerScriptSha256,
  nodeVersion: process.version,
  branch,
  packetRemoteTip: remoteTip,
  packageParity,
  checks,
  disallowedStatus: [],
  browserCaptureStarted: false,
};
fs.writeFileSync(path.join(evidenceRoot, 'preflight.json'), `${JSON.stringify(result, null, 2)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (result.status !== 'PASS') process.exitCode = 1;
