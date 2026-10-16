import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const repo = path.resolve(process.argv[2] ?? process.cwd());
const evidenceRoot = path.join(repo, 'deliveries/G7/preparation/maker-evidence/pre-g7-25/attempt-03');
const manifestPath = path.join(repo, 'yorayriniwnl.in/source-delivery-manifest.json');
const readmePath = path.join(repo, 'yorayriniwnl.in/README.md');
const outputPath = path.join(evidenceRoot, 'mirror-parity-audit-02.json');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const readJson = async (file) => {
  const bytes = await readFile(file);
  const text = bytes.toString('utf8');
  return JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);
};
const git = (...args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' }).trim();
const treeBlobs = new Map(git('ls-tree', '-r', '--full-tree', 'HEAD').split(/\r?\n/).filter(Boolean).map((line) => { const [entry, file] = line.split('\t'); return [file, entry.split(' ')[2]]; }));
const gitBlob = (file) => { const blob = treeBlobs.get(file); if (!blob) throw new Error('No committed blob for ' + file); return blob; };
const normalizeNewlines = (bytes) => Buffer.from(bytes.toString('utf8').replace(/\r\n/g, '\n'), 'utf8');
const rootHead = git('rev-parse', 'HEAD');
const rootTree = git('rev-parse', 'HEAD^{tree}');
const parentCommit = git('show', '-s', '--format=%P', 'HEAD').split(' ')[0];
const appTree = git('rev-parse', 'HEAD:app');
const mirrorTree = git('rev-parse', 'HEAD:yorayriniwnl.in');
const manifest = await readJson(manifestPath);
const originalSourceFiles = manifest.mirror.sourceFiles;
const originalTestFiles = manifest.mirror.testFiles;
const inspectPair = async (record, kind) => {
  const sourcePath = record.sourcePath;
  const domainPath = record.domainPath;
  const sourceFull = path.join(repo, sourcePath);
  const domainFull = path.join(repo, 'yorayriniwnl.in', domainPath);
  const [sourceBytes, domainBytes] = await Promise.all([readFile(sourceFull), readFile(domainFull)]);
  const sourceNormalized = normalizeNewlines(sourceBytes);
  const domainNormalized = normalizeNewlines(domainBytes);
  const sourceBlob = gitBlob(sourcePath);
  const domainBlob = gitBlob(`yorayriniwnl.in/${domainPath}`);
  const updated = {
    sourcePath,
    domainPath,
    sourceSha256: sha256(sourceBytes),
    domainSha256: sha256(domainBytes),
    sourceBytes: sourceBytes.length,
    domainBytes: domainBytes.length,
    rawBytesEqual: sourceBytes.equals(domainBytes),
    normalizedSha256: sha256(sourceNormalized),
    normalizedContentEqual: sourceNormalized.equals(domainNormalized),
    sourceGitBlob: sourceBlob,
    domainGitBlob: domainBlob,
    gitBlobEqual: sourceBlob === domainBlob,
  };
  return { kind, ...updated };
};
const sourceAuditRows = await Promise.all(originalSourceFiles.map((entry) => inspectPair(entry, 'source')));
const testAuditRows = await Promise.all(originalTestFiles.map((entry) => inspectPair(entry, 'test')));
const listedAssets = git('ls-files', '--', 'app/public/models', 'app/public/textures').split(/\r?\n/).filter(Boolean).sort();
const assetAuditRows = await Promise.all(listedAssets.map(async (sourcePath) => {
  const domainPath = sourcePath.slice('app/'.length);
  const domainGitPath = `yorayriniwnl.in/${domainPath}`;
  const [sourceBytes, domainBytes] = await Promise.all([
    readFile(path.join(repo, sourcePath)),
    readFile(path.join(repo, domainGitPath)),
  ]);
  const sourceBlob = gitBlob(sourcePath);
  const domainBlob = gitBlob(domainGitPath);
  return {
    sourcePath,
    domainPath,
    sourceSha256: sha256(sourceBytes),
    domainSha256: sha256(domainBytes),
    sourceBytes: sourceBytes.length,
    domainBytes: domainBytes.length,
    rawBytesEqual: sourceBytes.equals(domainBytes),
    sourceGitBlob: sourceBlob,
    domainGitBlob: domainBlob,
    gitBlobEqual: sourceBlob === domainBlob,
  };
}));
const sourceFiles = sourceAuditRows.map(({ kind, ...record }) => record);
const testFiles = testAuditRows.map(({ kind, ...record }) => record);
const rawParityFailures = [...sourceAuditRows, ...testAuditRows].filter((row) => !row.rawBytesEqual).length;
const normalizedParityFailures = [...sourceAuditRows, ...testAuditRows].filter((row) => !row.normalizedContentEqual).length;
const gitBlobParityFailures = [...sourceAuditRows, ...testAuditRows].filter((row) => !row.gitBlobEqual).length;
const assetRawParityFailures = assetAuditRows.filter((row) => !row.rawBytesEqual).length;
const assetGitBlobParityFailures = assetAuditRows.filter((row) => !row.gitBlobEqual).length;
const readmeBytes = await readFile(readmePath);
const overridePath = 'src/config/public-base-url.ts';
const overrideBytes = await readFile(path.join(repo, 'yorayriniwnl.in', overridePath));
const appOverrideBytes = await readFile(path.join(repo, 'app', overridePath));

manifest.sourceIdentity = {
  taskBranchParent: parentCommit,
  parentCommit,
  sourceCommit: rootHead,
  acceptedInputCommit: '500d10fa5901be48d4ff877e608d65ba0e271bb9',
  acceptedInputAppTree: 'ba0b709192367e1d12a796618f97801a8fcd5a70',
  resultingRootTree: rootTree,
  resultingAppTree: appTree,
  resultingMirrorTree: mirrorTree,
  sourceBaseCommit: '500d10fa5901be48d4ff877e608d65ba0e271bb9',
  sourceBaseAppTree: 'ba0b709192367e1d12a796618f97801a8fcd5a70',
  governingPackets: [
    'docs/planning/reconciliation-packets/2026-10-16-pre-g7-25-surface-parity-correction.md',
    'docs/planning/reconciliation-packets/2026-10-16-pre-g7-24-surface-parameter-batching.md',
    'docs/planning/reconciliation-packets/2026-10-16-pre-g7-23-render-call-budget.md',
    'docs/planning/reconciliation-packets/2026-10-15-pre-g7-22-home-scene-reference-fidelity.md',
    'docs/planning/validation-and-production.md',
  ],
  visualCandidateEvidence: 'deliveries/G7/preparation/maker-evidence/pre-g7-25/attempt-03/',
  formalAcceptance: 'pending independent exact-commit audit and parent acceptance; maker does not self-accept',
};
manifest.releaseStatus = {
  sourceDisposition: 'FAIL / unaccepted',
  independentAudit: { status: 'NOT RUN', expectedReviewer: 'GPT Plus #2' },
  parentAcceptance: 'PENDING',
  physicalDevicesAndScreenReaders: 'NOT RUN',
  mobileSoak: 'NOT RUN',
  servicesAndDeployment: 'NOT RUN',
};
manifest.mirror.sourceFiles = sourceFiles;
manifest.mirror.testFiles = testFiles;
manifest.mirror.assets = assetAuditRows;
manifest.mirror.domainOverride = {
  path: overridePath,
  canonicalUrl: 'https://yorayriniwnl.in',
  reason: 'Intentional domain-specific canonical metadata, robots, and sitemap origin.',
  sha256: sha256(overrideBytes),
  appDefaultSha256: sha256(appOverrideBytes),
  preserved: true,
};
delete manifest.mirror.audit;
manifest.mirror.parityAudit = {
  status: normalizedParityFailures === 0 && gitBlobParityFailures === 0 && assetRawParityFailures === 0 && assetGitBlobParityFailures === 0 ? 'PASS' : 'FAIL',
  sourceCommit: rootHead,
  taskBranchParent: parentCommit,
  rootTree,
  appTree,
  mirrorTree,
  sourceFiles: sourceFiles.length,
  testFiles: testFiles.length,
  assets: assetAuditRows.length,
  rawParityFailures,
  normalizedParityFailures,
  gitBlobParityFailures,
  assetRawParityFailures,
  assetGitBlobParityFailures,
  readmeSha256: sha256(readmeBytes),
  evidence: 'deliveries/G7/preparation/maker-evidence/pre-g7-25/attempt-03/mirror-parity-audit-02.json',
};
const fullAudit = {
  schemaVersion: 1,
  auditScope: 'source-to-domain mirror integrity only; not an independent product audit or acceptance',
  generatedAtUtc: new Date().toISOString(),
  source: { commit: rootHead, parentCommit, rootTree, appTree, mirrorTree },
  acceptedBase: { commit: '500d10fa5901be48d4ff877e608d65ba0e271bb9', appTree: 'ba0b709192367e1d12a796618f97801a8fcd5a70' },
  status: manifest.mirror.parityAudit.status,
  counts: { sourceFiles: sourceFiles.length, testFiles: testFiles.length, assets: assetAuditRows.length, rawParityFailures, normalizedParityFailures, gitBlobParityFailures, assetRawParityFailures, assetGitBlobParityFailures },
  newlineNormalization: 'For text source and test paths, compare UTF-8 bytes after replacing CRLF pairs with LF; no other normalization is applied.',
  sourceFiles: sourceAuditRows,
  testFiles: testAuditRows,
  assets: assetAuditRows,
  domainOverride: manifest.mirror.domainOverride,
  releaseStatus: manifest.releaseStatus,
};
await writeFile(outputPath, JSON.stringify(fullAudit, null, 2) + '\n', 'utf8');
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ status: fullAudit.status, counts: fullAudit.counts, sourceCommit: rootHead, appTree, mirrorTree, auditPath: outputPath, manifestPath, readmeSha256: sha256(readmeBytes), auditSha256: sha256(await readFile(outputPath)), manifestSha256: sha256(await readFile(manifestPath)) }, null, 2));

