import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const evidenceRoot = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(evidenceRoot, '../../../../../');
const inventoryPath = path.join(evidenceRoot, 'evidence-inventory.json');
const extraPaths = [
  'docs/planning/reconciliation-packets/2026-10-16-pre-g7-33-startup-stall-diagnosis.md',
  'docs/planning/delegation-and-work-orders.md',
];

function gitText(args) {
  return execFileSync('git', args, { cwd: repositoryRoot, encoding: 'utf8' }).trim();
}

if (process.argv.includes('--verify-tree')) {
  const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
  const mismatches = [];
  for (const file of inventory.files) {
    const bytes = fs.readFileSync(path.join(repositoryRoot, file.path));
    const rawSha256 = createHash('sha256').update(bytes).digest('hex');
    const worktreeBlobId = gitText(['hash-object', '--', file.path]);
    const committedBlobId = gitText(['rev-parse', `HEAD:${file.path}`]);
    if (bytes.byteLength !== file.byteLength || rawSha256 !== file.rawSha256
      || worktreeBlobId !== file.gitBlobId || committedBlobId !== file.gitBlobId) {
      mismatches.push({
        path: file.path,
        expectedBytes: file.byteLength,
        actualBytes: bytes.byteLength,
        expectedRawSha256: file.rawSha256,
        actualRawSha256: rawSha256,
        expectedGitBlobId: file.gitBlobId,
        worktreeBlobId,
        committedBlobId,
      });
    }
  }
  process.stdout.write(`${JSON.stringify({ status: mismatches.length ? 'FAIL' : 'PASS', verifiedFiles: inventory.files.length, mismatches }, null, 2)}\n`);
  if (mismatches.length) process.exitCode = 1;
} else {

function listFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...listFiles(absolutePath));
    else if (entry.isFile() && absolutePath !== inventoryPath) files.push(absolutePath);
  }
  return files;
}

const paths = [
  ...listFiles(evidenceRoot).map((absolutePath) => path.relative(repositoryRoot, absolutePath)),
  ...extraPaths,
].sort();

const files = paths.map((relativePath) => {
  const absolutePath = path.join(repositoryRoot, relativePath);
  const bytes = fs.readFileSync(absolutePath);
  const gitBlobId = execFileSync('git', ['hash-object', '--', relativePath], {
    cwd: repositoryRoot,
    encoding: 'utf8',
  }).trim();
  return {
    path: relativePath.replaceAll(path.sep, '/'),
    byteLength: bytes.byteLength,
    rawSha256: createHash('sha256').update(bytes).digest('hex'),
    gitBlobId,
  };
});

const inventory = {
  packet: 'PRE-G7-33',
  sourceCommit: 'bd01478617b4166866f3f44196c56fc5add94acd',
  sourceAppTree: '3975e40c59a04b8696efa2ca3605eb37a0617165',
  inventoryExclusion: 'All packet evidence files and the governing packet and delegation index are listed. This file excludes only itself to avoid a self-referential hash.',
  totals: {
    artifactFiles: files.length,
    artifactBytes: files.reduce((total, file) => total + file.byteLength, 0),
  },
  files,
};

fs.writeFileSync(inventoryPath, `${JSON.stringify(inventory, null, 2)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify(inventory.totals)}\n`);
}
