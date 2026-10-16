import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const evidenceRoot = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(evidenceRoot, '../../../../../');
const inventoryPath = path.join(evidenceRoot, 'evidence-inventory.json');
const extraPaths = [
  'docs/planning/reconciliation-packets/2026-10-16-pre-g7-39-program-parameter-query-diagnostic.md',
  'docs/planning/reconciliation-packets/2026-10-16-pre-g7-38-first-use-shader-info-log-fast-path.md',
  'docs/planning/reconciliation-packets/2026-10-16-pre-g7-37-shader-extension-capability-probe.md',
  'docs/planning/delegation-and-work-orders.md',
  'deliveries/G7/preparation/maker-evidence/pre-g7-38/REPORT.md',
  'deliveries/G7/preparation/maker-evidence/pre-g7-38/evidence-inventory.json',
  'deliveries/G7/preparation/maker-evidence/pre-g7-38/diagnostic-run/webgl-capability-diagnostic.json',
  'deliveries/G7/preparation/maker-evidence/pre-g7-37/REPORT.md',
  'deliveries/G7/preparation/maker-evidence/pre-g7-37/evidence-inventory.json',
  'deliveries/G7/preparation/maker-evidence/pre-g7-35/REPORT.md',
  'deliveries/G7/preparation/maker-evidence/pre-g7-35/build-id.json',
  'deliveries/G7/preparation/maker-evidence/pre-g7-35/commands/production-build.json',
  'app/package.json',
  'app/pnpm-lock.yaml',
  'app/patches/three@0.180.0.patch',
  'app/src/features/world/WorldRuntime.ts',
  'yorayriniwnl.in/package.json',
  'yorayriniwnl.in/pnpm-lock.yaml',
  'yorayriniwnl.in/patches/three@0.180.0.patch',
  'yorayriniwnl.in/src/features/world/WorldRuntime.ts',
  'yorayriniwnl.in/README.md',
  'yorayriniwnl.in/source-delivery-manifest.json',
];
const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();

if (process.argv.includes('--verify-tree')) {
  const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
  const mismatches = [];
  for (const file of inventory.files) {
    const bytes = fs.readFileSync(path.join(root, file.path));
    const rawSha256 = createHash('sha256').update(bytes).digest('hex');
    const worktreeBlobId = git(['hash-object', '--', file.path]);
    const committedBlobId = git(['rev-parse', `HEAD:${file.path}`]);
    if (bytes.byteLength !== file.byteLength || rawSha256 !== file.rawSha256 || worktreeBlobId !== file.gitBlobId || committedBlobId !== file.gitBlobId) {
      mismatches.push({ path: file.path, expectedBytes: file.byteLength, actualBytes: bytes.byteLength, expectedSha256: file.rawSha256, actualSha256: rawSha256, expectedGitBlobId: file.gitBlobId, worktreeBlobId, committedBlobId });
    }
  }
  const result = { status: mismatches.length ? 'FAIL' : 'PASS', verifiedFiles: inventory.files.length, artifactBytes: inventory.totals.artifactBytes, mismatches };
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (mismatches.length) process.exitCode = 1;
} else {
  function listFiles(dir) {
    const files = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const filePath = path.join(dir, entry.name);
      if (entry.isDirectory()) files.push(...listFiles(filePath));
      else if (entry.isFile() && filePath !== inventoryPath) files.push(filePath);
    }
    return files;
  }

  const preflight = JSON.parse(fs.readFileSync(path.join(evidenceRoot, 'preflight.json'), 'utf8'));
  const diagnostic = JSON.parse(fs.readFileSync(path.join(evidenceRoot, 'diagnostic-run/webgl-capability-diagnostic.json'), 'utf8'));
  const receipt = JSON.parse(fs.readFileSync(path.join(evidenceRoot, 'commands/webgl-probe.receipt.json'), 'utf8'));
  const paths = [...new Set([...listFiles(evidenceRoot).map((filePath) => path.relative(root, filePath)), ...extraPaths])].sort();
  const files = paths.map((relativePath) => {
    const normalizedPath = relativePath.replaceAll(path.sep, '/');
    const bytes = fs.readFileSync(path.join(root, relativePath));
    return { path: normalizedPath, byteLength: bytes.byteLength, rawSha256: createHash('sha256').update(bytes).digest('hex'), gitBlobId: git(['hash-object', '--', normalizedPath]) };
  });
  const inventory = {
    packet: 'PRE-G7-39',
    frozenPacket: 'PRE-G7-38',
    sourceCommit: preflight.sourceCommit,
    sourceAppTree: preflight.appTree,
    sourceCommitDomainTree: preflight.sourceCommitDomainTree,
    candidateDomainTree: preflight.candidateDomainTree,
    evidenceCommitParent: git(['rev-parse', 'HEAD']),
    buildId: preflight.buildId,
    buildIdSha256: preflight.buildIdSha256,
    browserVersion: diagnostic.browserVersion,
    captureExitCode: receipt.exitCode,
    captureCount: 1,
    inventoryExclusion: 'All P39 evidence, the failed and corrected preflight records, governing P38/P37 packets and reports, P38/P37 diagnostic evidence, source/build bindings, mirrored dependency files, runtime source context, and domain metadata are listed. This inventory excludes only itself to avoid a self-referential hash.',
    totals: { artifactFiles: files.length, artifactBytes: files.reduce((total, file) => total + file.byteLength, 0) },
    files,
  };
  fs.writeFileSync(inventoryPath, `${JSON.stringify(inventory, null, 2)}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify(inventory.totals)}\n`);
}
