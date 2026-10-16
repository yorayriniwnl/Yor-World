import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const sourceCommit = '5c1e6aedb71d89d46ffc0ada8de522526290131c';
const frozenBase = 'bd01478617b4166866f3f44196c56fc5add94acd';
const evidenceDir = 'deliveries/G7/preparation/maker-evidence/pre-g7-35';
const manifest = JSON.parse(fs.readFileSync('yorayriniwnl.in/source-delivery-manifest.json','utf8'));
const sha = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const git = (args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const pairs = [...manifest.mirror.sourceFiles, ...manifest.mirror.testFiles];
const auditPairs = pairs.map((entry) => {
  const sourceBytes = fs.readFileSync(entry.sourcePath);
  const domainBytes = fs.readFileSync(path.join('yorayriniwnl.in', entry.domainPath));
  const normalizedSource = Buffer.from(sourceBytes.toString('utf8').replace(/\r\n/g, '\n'));
  const normalizedDomain = Buffer.from(domainBytes.toString('utf8').replace(/\r\n/g, '\n'));
  const sourceGitBlob = git(['hash-object', '--', entry.sourcePath]);
  const domainGitBlob = git(['hash-object', '--', path.join('yorayriniwnl.in', entry.domainPath)]);
  return {
    sourcePath: entry.sourcePath,
    domainPath: `yorayriniwnl.in/${entry.domainPath}`.replaceAll('\\','/'),
    sourceSha256: sha(sourceBytes),
    domainSha256: sha(domainBytes),
    sourceGitBlob,
    domainGitBlob,
    rawBytesEqual: sourceBytes.equals(domainBytes),
    normalizedContentEqual: normalizedSource.equals(normalizedDomain),
    normalizedSha256: sha(normalizedSource),
  };
});
const rawFailures = auditPairs.filter((x) => !x.rawBytesEqual).length;
const normalizedFailures = auditPairs.filter((x) => !x.normalizedContentEqual).length;
const gitBlobFailures = auditPairs.filter((x) => x.sourceGitBlob !== x.domainGitBlob).length;
const sourceTree = git(['rev-parse', `${sourceCommit}:app`]);
const domainTree = git(['rev-parse', `${sourceCommit}:yorayriniwnl.in`]);
const parityAudit = {
  packet: 'PRE-G7-35', sourceCommit, sourceAppTree: sourceTree, sourceCommitDomainMirrorTree: domainTree,
  sourceFiles: manifest.mirror.sourceFiles.length, testFiles: manifest.mirror.testFiles.length,
  pairCount: auditPairs.length, rawParityFailures: rawFailures, normalizedParityFailures: normalizedFailures,
  gitBlobParityFailures: gitBlobFailures, domainOverride: {
    path: 'yorayriniwnl.in/src/config/public-base-url.ts',
    sha256: sha(fs.readFileSync('yorayriniwnl.in/src/config/public-base-url.ts')),
    canonicalUrl: 'https://yorayriniwnl.in',
  },
  pairs: auditPairs,
};
fs.writeFileSync(path.join(evidenceDir, 'source-mirror-parity-audit.json'), `${JSON.stringify(parityAudit,null,2)}\n`, 'utf8');

const modelFiles = fs.readdirSync('app/public/models').filter((name) => name.endsWith('.glb')).sort();
const models = modelFiles.map((name) => {
  const relativePath = `app/public/models/${name}`;
  const bytes = fs.readFileSync(relativePath);
  const sourceBlob = git(['rev-parse', `${sourceCommit}:${relativePath}`]);
  const frozenBlob = git(['rev-parse', `${frozenBase}:${relativePath}`]);
  return { path: relativePath, byteLength: bytes.byteLength, sha256: sha(bytes), frozenBaseGitBlob: frozenBlob, sourceCommitGitBlob: sourceBlob, unchangedFromFrozenBase: frozenBlob === sourceBlob };
});
const modelsDoc = { packet: 'PRE-G7-35', sourceCommit, frozenBaseCommit: frozenBase, totalFiles: models.length, unchangedCount: models.filter(x=>x.unchangedFromFrozenBase).length, status: models.every(x=>x.unchangedFromFrozenBase)?'PASS':'FAIL', models };
fs.writeFileSync(path.join(evidenceDir,'frozen-model-hashes.json'), `${JSON.stringify(modelsDoc,null,2)}\n`, 'utf8');

const buildIdBytes = fs.readFileSync('app/.next/BUILD_ID');
const buildInfo = { packet:'PRE-G7-35', sourceCommit, buildId:buildIdBytes.toString('utf8').trim(), buildIdSha256:sha(buildIdBytes), byteLength:buildIdBytes.byteLength, status:'PASS' };
fs.writeFileSync(path.join(evidenceDir,'build-id.json'), `${JSON.stringify(buildInfo,null,2)}\n`, 'utf8');

if (normalizedFailures || gitBlobFailures || modelsDoc.status !== 'PASS') process.exitCode = 1;
process.stdout.write(JSON.stringify({pairCount:auditPairs.length,rawFailures,normalizedFailures,gitBlobFailures,modelCount:models.length,modelsUnchanged:modelsDoc.unchangedCount,sourceTree,domainTree,buildId:buildInfo.buildId},null,2)+'\n');
