import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../../../');
const appRoot = path.join(root, 'app');
const node24 = 'C:\\Users\\ayush\\AppData\\Local\\Temp\\yor-world-node-24.19.0\\unpacked\\node-v24.19.0-win-x64\\node.exe';
const corepack = 'C:\\Program Files\\nodejs\\node_modules\\corepack\\dist\\corepack.js';
const expectedSource = 'bd01478617b4166866f3f44196c56fc5add94acd';
const expectedAppTree = '3975e40c59a04b8696efa2ca3605eb37a0617165';
const priorPreflightPath = path.join(here, '..', 'pre-g7-32', 'preflight.json');

function git(args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${result.stderr}`);
  return result.stdout.trim();
}

function tool(executable, args) {
  const result = spawnSync(executable, args, { cwd: root, encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) throw new Error(`${executable} ${args.join(' ')} failed: ${result.stderr}`);
  return result.stdout.trim();
}

const head = git(['rev-parse', 'HEAD']);
const currentAppTree = git(['rev-parse', 'HEAD:app']);
const sourceAppTree = git(['rev-parse', `${expectedSource}:app`]);
const nodeVersion = tool(node24, ['--version']);
const pnpmVersion = tool(node24, [corepack, 'pnpm@9.15.9', '--version']);
const status = git(['status', '--porcelain', '--untracked-files=all']).split(/\r?\n/).filter(Boolean);
const expectedEvidenceEntries = status.filter((line) => line.slice(3).replaceAll('\\', '/').startsWith('deliveries/G7/preparation/maker-evidence/pre-g7-33/'));
const unexpectedWorkingTreeEntries = status.filter((line) => !expectedEvidenceEntries.includes(line));
const productAndTrackedPathsClean = unexpectedWorkingTreeEntries.length === 0;
const prior = JSON.parse(fs.readFileSync(priorPreflightPath, 'utf8'));
const parity = prior.parityResults ?? [];
const treeLines = git(['ls-tree', '-r', 'HEAD', '--', 'app', 'yorayriniwnl.in']).split(/\r?\n/).filter(Boolean);
const blobs = new Map(treeLines.map((line) => {
  const tab = line.indexOf('\t');
  const metadata = line.slice(0, tab).split(' ');
  return [line.slice(tab + 1), metadata[2]];
}));
const parityFailures = parity.filter((pair) =>
  blobs.get(pair.sourcePath) !== pair.expectedSourceGitBlob ||
  blobs.get(pair.domainPath) !== pair.expectedDomainGitBlob
);
const appNodeModulesPresent = fs.existsSync(path.join(appRoot, 'node_modules'));

const result = {
  status: head && currentAppTree === expectedAppTree && sourceAppTree === expectedAppTree &&
    nodeVersion === 'v24.19.0' && pnpmVersion === '9.15.9' && productAndTrackedPathsClean &&
    prior.status === 'PASS' && parity.length === 130 && parityFailures.length === 0 ? 'PASS' : 'FAIL',
  packet: 'PRE-G7-33',
  packetCommit: head,
  sourceCommit: expectedSource,
  currentAppTree,
  expectedAppTree,
  sourceCommitAppTree: sourceAppTree,
  nodePath: node24,
  nodeVersion,
  corepackPath: corepack,
  pnpmVersion,
  productAndTrackedPathsClean,
  expectedEvidenceEntries,
  unexpectedWorkingTreeEntries,
  sourceAndDomainMirrorPairs: parity.length,
  sourceAndDomainMirrorBlobFailures: parityFailures.length,
  appNodeModulesPresent,
  offlineInstallRequired: !appNodeModulesPresent,
  issues: [
    ...(currentAppTree !== expectedAppTree ? ['Current app tree differs from frozen source tree.'] : []),
    ...(sourceAppTree !== expectedAppTree ? ['Frozen source commit does not resolve to expected app tree.'] : []),
    ...(nodeVersion !== 'v24.19.0' ? ['Pinned Node version mismatch.'] : []),
    ...(pnpmVersion !== '9.15.9' ? ['Pinned pnpm version mismatch.'] : []),
    ...(unexpectedWorkingTreeEntries.length ? ['Unexpected changes exist outside this packet evidence directory.'] : []),
    ...(prior.status !== 'PASS' || parity.length !== 130 || parityFailures.length ? ['Inherited source/mirror parity evidence failed revalidation.'] : []),
  ],
  parityFailures,
};

fs.writeFileSync(path.join(here, 'preflight.json'), `${JSON.stringify(result, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ status: result.status, sourceCommit: expectedSource, currentAppTree, parityPairs: parity.length, parityFailures: parityFailures.length, appNodeModulesPresent }));
if (result.status !== 'PASS') process.exitCode = 1;
