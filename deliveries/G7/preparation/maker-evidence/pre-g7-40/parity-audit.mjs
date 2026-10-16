import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const evidenceRoot = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(evidenceRoot, '../../../../../');
const sourceCommit = '4c3908b61d728babeaf67419d225c1f3978bb779';
const manifestPath = 'yorayriniwnl.in/source-delivery-manifest.json';
const manifest = JSON.parse(fs.readFileSync(path.join(root, manifestPath), 'utf8'));
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const committedBlob = (relativePath) => git(['rev-parse', `${sourceCommit}:${relativePath}`]);

const sourcePairs = [...manifest.mirror.sourceFiles, ...manifest.mirror.testFiles].map((entry) => {
  const sourcePath = entry.sourcePath;
  const domainPath = `yorayriniwnl.in/${entry.domainPath}`;
  const sourceBytes = fs.readFileSync(path.join(root, sourcePath));
  const domainBytes = fs.readFileSync(path.join(root, domainPath));
  const sourceBlob = committedBlob(sourcePath);
  const domainBlob = committedBlob(domainPath);
  const normalizedEqual = Buffer.from(sourceBytes.toString('utf8').replace(/\r\n/g, '\n')).equals(
    Buffer.from(domainBytes.toString('utf8').replace(/\r\n/g, '\n')),
  );
  return {
    sourcePath,
    domainPath,
    normalizedEqual,
    sourceSha256: hash(sourceBytes),
    domainSha256: hash(domainBytes),
    sourceCommittedBlobId: sourceBlob,
    domainCommittedBlobId: domainBlob,
    committedBlobEqual: sourceBlob === domainBlob,
  };
});

const dependencyFiles = ['package.json', 'pnpm-lock.yaml', 'patches/three@0.180.0.patch'].map((relativePath) => {
  const sourcePath = `app/${relativePath}`;
  const domainPath = `yorayriniwnl.in/${relativePath}`;
  const sourceBytes = fs.readFileSync(path.join(root, sourcePath));
  const domainBytes = fs.readFileSync(path.join(root, domainPath));
  const sourceBlob = committedBlob(sourcePath);
  const domainBlob = committedBlob(domainPath);
  return {
    relativePath,
    byteLength: sourceBytes.byteLength,
    sourceSha256: hash(sourceBytes),
    domainSha256: hash(domainBytes),
    rawBytesEqual: sourceBytes.equals(domainBytes),
    sourceCommittedBlobId: sourceBlob,
    domainCommittedBlobId: domainBlob,
    committedBlobEqual: sourceBlob === domainBlob,
  };
});

const domainOverridePath = 'yorayriniwnl.in/src/config/public-base-url.ts';
const domainOverrideBytes = fs.readFileSync(path.join(root, domainOverridePath));
const appTree = git(['rev-parse', `${sourceCommit}:app`]);
const domainTree = git(['rev-parse', `${sourceCommit}:yorayriniwnl.in`]);
const failures = sourcePairs.filter((pair) => !pair.normalizedEqual || !pair.committedBlobEqual).length
  + dependencyFiles.filter((pair) => !pair.rawBytesEqual || !pair.committedBlobEqual).length;

const result = {
  packet: 'PRE-G7-40',
  status: failures === 0 ? 'PASS' : 'FAIL',
  sourceCommit,
  appTree,
  sourceCommitDomainTree: domainTree,
  sourceFilePairs: manifest.mirror.sourceFiles.length,
  testFilePairs: manifest.mirror.testFiles.length,
  normalizedSourceMirrorFailures: sourcePairs.filter((pair) => !pair.normalizedEqual).length,
  committedSourceMirrorBlobFailures: sourcePairs.filter((pair) => !pair.committedBlobEqual).length,
  dependencyFiles,
  domainOverride: {
    path: domainOverridePath,
    sha256: hash(domainOverrideBytes),
    canonicalUrl: 'https://yorayriniwnl.in',
    preserved: domainOverrideBytes.toString('utf8').includes('https://yorayriniwnl.in'),
  },
  sourcePairs,
};
if (!result.domainOverride.preserved) result.status = 'FAIL';

fs.writeFileSync(path.join(evidenceRoot, 'source-mirror-parity-audit.json'), `${JSON.stringify(result, null, 2)}\n`);
process.stdout.write(JSON.stringify({ status: result.status, sourceFilePairs: result.sourceFilePairs, testFilePairs: result.testFilePairs, normalizedSourceMirrorFailures: result.normalizedSourceMirrorFailures, committedSourceMirrorBlobFailures: result.committedSourceMirrorBlobFailures, dependencyFiles: dependencyFiles.length, appTree, domainTree }, null, 2) + '\n');
if (result.status !== 'PASS') process.exitCode = 1;
