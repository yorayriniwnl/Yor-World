const fs = require('node:fs');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const hash = (b) => crypto.createHash('sha256').update(b).digest('hex');
const git = (args) => cp.execFileSync('git', args, { encoding: 'utf8' }).trim();
const root = process.cwd();
const base = 'f71d1df028f80637abb3e427040f0e0f5085179c';
const commit = git(['rev-parse', 'HEAD']);
const tree = git(['rev-parse', `${commit}^{tree}`]);
const appTree = git(['rev-parse', `${commit}:app`]);
const mirrors = [
  ['app/tests/unit/boundaries.test.ts', 'yorayriniwnl.in/tests/unit/boundaries.test.ts'],
  ['app/vitest.config.ts', 'yorayriniwnl.in/vitest.config.ts'],
].map(([source, mirror]) => {
  const a = fs.readFileSync(source), b = fs.readFileSync(mirror);
  const normalizedA = Buffer.from(a.toString('utf8').replace(/\r\n/g, '\n'), 'utf8');
  const normalizedB = Buffer.from(b.toString('utf8').replace(/\r\n/g, '\n'), 'utf8');
  const sourceGitBlob = git(['hash-object', source]);
  const mirrorGitBlob = git(['hash-object', mirror]);
  return { source, mirror, sourceBytes: a.length, mirrorBytes: b.length,
    sourceRawSha256: hash(a), mirrorRawSha256: hash(b),
    sourceNormalizedSha256: hash(normalizedA), mirrorNormalizedSha256: hash(normalizedB),
    normalizedBytesEqual: normalizedA.equals(normalizedB), sourceGitBlob, mirrorGitBlob,
    gitBlobsEqual: sourceGitBlob === mirrorGitBlob };
});
const manifest = 'yorayriniwnl.in/source-delivery-manifest.json';
const manifestBytes = fs.readFileSync(manifest);
const archivedManifest = fs.readFileSync('deliveries/G7/preparation/maker-evidence/pre-g7-17/input/pre-g7-16-final-source-delivery-manifest.json');
const manifestAudit = { path: manifest, bytes: manifestBytes.length, rawSha256: hash(manifestBytes), gitBlob: git(['hash-object', manifest]), byteEqualToArchivedAcceptedManifest: manifestBytes.equals(archivedManifest) };
const protectedInput = JSON.parse(fs.readFileSync('deliveries/G7/preparation/maker-evidence/pre-g7-17/input/pre-g7-16-protected-hash-audit.json', 'utf8'));
const protectedHashes = protectedInput.hashes.map((item) => {
  const bytes = fs.readFileSync(item.path);
  const rawSha256 = hash(bytes);
  const gitBlob = git(['hash-object', item.path]);
  return { path: item.path, bytes: bytes.length, rawSha256, gitBlob,
    matchesAcceptedSha256: rawSha256 === item.resultingSha256,
    matchesAcceptedGitBlob: gitBlob === item.finalGitBlob };
});
const before = fs.readFileSync('deliveries/G7/preparation/maker-evidence/pre-g7-17/attempt-03/source-path-set-before.txt', 'utf8').replace(/\r\n/g, '\n');
const after = fs.readFileSync('deliveries/G7/preparation/maker-evidence/pre-g7-17/attempt-04/source-path-set-after.txt', 'utf8').replace(/\r\n/g, '\n');
const testSurface = fs.readFileSync('deliveries/G7/preparation/maker-evidence/pre-g7-17/attempt-04/test-surface-parity.txt', 'utf8');
const report = { status: 'PASS', baseCommit: base, sourceCommit: commit, sourceTree: tree, appTree,
  changedPathsFromBase: git(['diff', '--name-only', base, commit]).split(/\r?\n/).filter(Boolean), mirrors,
  pathSet: { exactOutputEqual: before === after, beforeSha256: hash(Buffer.from(before)), afterSha256: hash(Buffer.from(after)), countLine: after.split('\n')[0],
    sortedPathSetSha256: after.split('\n')[1]?.split('=')[1], traversalPathListSha256: after.split('\n')[2]?.split('=')[1] },
  testSurfaceParity: { recorded: testSurface.trim().split(/\r?\n/).slice(1) },
  sourceDeliveryManifest: manifestAudit,
  protectedPaths: { acceptedInput: protectedInput.acceptedInputCommit, protectedPathCount: protectedHashes.length,
    allMatch: protectedHashes.every((x) => x.matchesAcceptedSha256 && x.matchesAcceptedGitBlob), hashes: protectedHashes },
};
report.status = mirrors.every((x) => x.normalizedBytesEqual && x.gitBlobsEqual) && report.pathSet.exactOutputEqual && manifestAudit.byteEqualToArchivedAcceptedManifest && report.protectedPaths.allMatch ? 'PASS' : 'FAIL';
const out = JSON.stringify(report, null, 2) + '\n';
fs.writeFileSync('deliveries/G7/preparation/maker-evidence/pre-g7-17/attempt-10/source-parity-and-protected-audit.json', out);
console.log(out);
if (report.status !== 'PASS') process.exit(2);
