import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(here, '../../../../../');
const reusedRoot = 'D:\\p33';
const sourceCommit = 'bd01478617b4166866f3f44196c56fc5add94acd';
const sourceAppTree = '3975e40c59a04b8696efa2ca3605eb37a0617165';
const sourceMirrorTree = '8c34adf791c678a4e9e8bfe90f92426026994e68';
const p33Head = '95e6dc912adff1cecb14bc1993d6620bcce696df';
const expectedBuildId = 'ksG7LoWL4qW1WtybQH4gz';
const expectedBuildIdSha256 = 'c09ccc6e505742ebb0f3fb6e8126e96296e209b46bc05ea584e56a0ea4baa138';
const node24 = 'C:\\Users\\ayush\\AppData\\Local\\Temp\\yor-world-node-24.19.0\\unpacked\\node-v24.19.0-win-x64\\node.exe';
const corepack = 'C:\\Program Files\\nodejs\\node_modules\\corepack\\dist\\corepack.js';
const outputRoot = path.join(here, 'commands');
fs.mkdirSync(outputRoot, { recursive: true });

function git(cwd, args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

function tool(executable, args, cwd) {
  return execFileSync(executable, args, { cwd, encoding: 'utf8', windowsHide: true }).trim();
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

const p34Head = git(repositoryRoot, ['rev-parse', 'HEAD']);
const p34BranchBase = git(repositoryRoot, ['merge-base', 'HEAD', p33Head]);
const p34AppTree = git(repositoryRoot, ['rev-parse', 'HEAD:app']);
const p34MirrorTree = git(repositoryRoot, ['rev-parse', 'HEAD:yorayriniwnl.in']);
const frozenAppTree = git(repositoryRoot, ['rev-parse', `${sourceCommit}:app`]);
const frozenMirrorTree = git(repositoryRoot, ['rev-parse', `${sourceCommit}:yorayriniwnl.in`]);
const p33AppTree = git(reusedRoot, ['rev-parse', 'HEAD:app']);
const p33MirrorTree = git(reusedRoot, ['rev-parse', 'HEAD:yorayriniwnl.in']);
const p34Status = git(repositoryRoot, ['status', '--porcelain', '--untracked-files=all'])
  .split(/\r?\n/).filter(Boolean);
const p34Unexpected = p34Status.filter((line) => !line.slice(3).replaceAll('\\', '/').startsWith('deliveries/G7/preparation/maker-evidence/pre-g7-34/'));
const p33HeadActual = git(reusedRoot, ['rev-parse', 'HEAD']);
const p33Status = git(reusedRoot, ['status', '--porcelain', '--untracked-files=all']).split(/\r?\n/).filter(Boolean);
const buildIdPath = path.join(reusedRoot, 'app/.next/BUILD_ID');
const buildIdBytes = fs.readFileSync(buildIdPath);
const buildId = buildIdBytes.toString('utf8').trim();
const buildIdSha256 = sha256(buildIdBytes);
const buildReceiptPath = path.join(reusedRoot, 'deliveries/G7/preparation/maker-evidence/pre-g7-33/commands/build.receipt.json');
const buildReceipt = JSON.parse(fs.readFileSync(buildReceiptPath, 'utf8'));
const p33Preflight = JSON.parse(fs.readFileSync(path.join(reusedRoot, 'deliveries/G7/preparation/maker-evidence/pre-g7-33/preflight.json'), 'utf8'));
const nodeVersion = tool(node24, ['--version'], repositoryRoot);
const pnpmVersion = tool(node24, [corepack, 'pnpm@9.15.9', '--version'], repositoryRoot);
const appNodeModulesPresent = fs.existsSync(path.join(reusedRoot, 'app/node_modules'));

const checks = {
  p34BranchBaseIsP33Evidence: p34BranchBase === p33Head,
  frozenSourceTreesMatch: frozenAppTree === sourceAppTree && frozenMirrorTree === sourceMirrorTree,
  currentCandidateAppAndInheritedMirrorMatch: p34AppTree === sourceAppTree
    && p34MirrorTree === p33MirrorTree && p33AppTree === sourceAppTree,
  p33WorktreeAtRecordedEvidenceCommit: p33HeadActual === p33Head,
  p33TrackedAndUntrackedPathsClean: p33Status.length === 0,
  p34NoUnexpectedPaths: p34Unexpected.length === 0,
  reusedBuildIdMatches: buildId === expectedBuildId && buildIdSha256 === expectedBuildIdSha256,
  reusedBuildReceiptPassed: buildReceipt.exitCode === 0 && buildReceipt.environment?.NEXT_PUBLIC_PRE_G7_13_EVIDENCE === '1',
  inheritedP33PreflightPassed: p33Preflight.status === 'PASS'
    && p33Preflight.sourceAndDomainMirrorPairs === 130
    && p33Preflight.sourceAndDomainMirrorBlobFailures === 0,
  pinnedNodeAndPnpm: nodeVersion === 'v24.19.0' && pnpmVersion === '9.15.9',
  reusedDependenciesPresent: appNodeModulesPresent,
};

const result = {
  status: Object.values(checks).every(Boolean) ? 'PASS' : 'FAIL',
  packet: 'PRE-G7-34',
  packetCommit: p34Head,
  packetBranchBase: p34BranchBase,
  expectedPacketBranchBase: p33Head,
  sourceCommit,
  currentAppTree: p34AppTree,
  expectedAppTree: sourceAppTree,
  sourceCommitDomainMirrorTree: frozenMirrorTree,
  inheritedCandidateDomainMirrorTree: p34MirrorTree,
  expectedInheritedCandidateDomainMirrorTree: p33MirrorTree,
  reusedWorktree: reusedRoot,
  reusedWorktreeHead: p33HeadActual,
  reusedBuildId: buildId,
  expectedBuildId,
  buildIdSha256,
  expectedBuildIdSha256,
  buildReceipt: path.relative(repositoryRoot, buildReceiptPath).replaceAll(path.sep, '/'),
  nodePath: node24,
  nodeVersion,
  corepackPath: corepack,
  pnpmVersion,
  reusedDependenciesPresent: appNodeModulesPresent,
  p33StatusEntries: p33Status,
  p34UnexpectedStatusEntries: p34Unexpected,
  checks,
};

fs.writeFileSync(path.join(here, 'preflight.json'), `${JSON.stringify(result, null, 2)}\n`, 'utf8');
const summary = JSON.stringify({ status: result.status, packetCommit: p34Head, sourceCommit, appTree: p34AppTree, mirrorTree: p34MirrorTree, reusedBuildId: buildId, checks }, null, 2);
fs.writeFileSync(path.join(outputRoot, 'preflight.stdout.txt'), `${summary}\n`, 'utf8');
fs.writeFileSync(path.join(outputRoot, 'preflight.stderr.txt'), '', 'utf8');
process.stdout.write(`${summary}\n`);
if (result.status !== 'PASS') process.exitCode = 1;
