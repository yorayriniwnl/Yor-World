const fs = require('node:fs');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const hash = (b) => crypto.createHash('sha256').update(b).digest('hex');
const git = (args) => cp.execFileSync('git', args, { encoding: 'utf8' }).trim();
function readTextAuto(path) {
  const b = fs.readFileSync(path);
  if (b.length >= 2 && b[0] === 0xff && b[1] === 0xfe) return b.subarray(2).toString('utf16le');
  if (b.length >= 3 && b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf) return b.subarray(3).toString('utf8');
  return b.toString('utf8');
}
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
const manifestAudit = { path: manifest, bytes: manifestBytes.length, rawWorktreeSha256: hash(manifestBytes),
  worktreeGitBlob: git(['hash-object', manifest]), baseGitBlob: git(['rev-parse', `${base}:${manifest}`]),
  finalGitBlob: git(['rev-parse', `${commit}:${manifest}`]), unchangedInGit: git(['rev-parse', `${base}:${manifest}`]) === git(['rev-parse', `${commit}:${manifest}`]) };
const priorExportPath = 'deliveries/G7/preparation/maker-evidence/pre-g7-17/input/pre-g7-16-final-source-delivery-manifest.json';
const priorExportBytes = fs.readFileSync(priorExportPath);
manifestAudit.separatePriorExport = { path: priorExportPath, bytes: priorExportBytes.length, rawSha256: hash(priorExportBytes), sameSnapshot: priorExportBytes.equals(manifestBytes) };
const protectedInput = JSON.parse(fs.readFileSync('deliveries/G7/preparation/maker-evidence/pre-g7-17/input/pre-g7-16-protected-hash-audit.json', 'utf8'));
const protectedHashes = protectedInput.hashes.map((item) => {
  const bytes = fs.readFileSync(item.path);
  const rawSha256 = hash(bytes);
  const gitBlob = git(['hash-object', item.path]);
  return { path: item.path, bytes: bytes.length, rawSha256, gitBlob,
    matchesAcceptedSha256: rawSha256 === item.resultingSha256,
    matchesAcceptedGitBlob: gitBlob === item.finalGitBlob };
});
const pathBeforeRaw = fs.readFileSync('deliveries/G7/preparation/maker-evidence/pre-g7-17/attempt-03/source-path-set-before.txt');
const pathAfterRaw = fs.readFileSync('deliveries/G7/preparation/maker-evidence/pre-g7-17/attempt-04/source-path-set-after.txt');
const before = readTextAuto('deliveries/G7/preparation/maker-evidence/pre-g7-17/attempt-03/source-path-set-before.txt').replace(/\r\n/g, '\n');
const after = readTextAuto('deliveries/G7/preparation/maker-evidence/pre-g7-17/attempt-04/source-path-set-after.txt').replace(/\r\n/g, '\n');
const pathSet = { decodedTextEqual: before === after,
  beforeEncoding: pathBeforeRaw[0] === 0xff && pathBeforeRaw[1] === 0xfe ? 'UTF-16LE with BOM' : 'other',
  afterEncoding: pathAfterRaw[0] === 0xef && pathAfterRaw[1] === 0xbb && pathAfterRaw[2] === 0xbf ? 'UTF-8 with BOM' : 'other',
  countLine: after.split('\n')[0], sortedPathSetSha256: after.split('\n')[1]?.split('=')[1],
  traversalPathListSha256: after.split('\n')[2]?.split('=')[1], rawOutputBytesDiffer: !pathBeforeRaw.equals(pathAfterRaw) };
const testSurface = fs.readFileSync('deliveries/G7/preparation/maker-evidence/pre-g7-17/attempt-04/test-surface-parity.txt', 'utf8');
const testSurfaceLines = testSurface.trim().split(/\r?\n/).slice(1);
const integrationConfigUnchanged = git(['rev-parse', `${base}:app/vitest.integration.config.ts`]) === git(['rev-parse', `${commit}:app/vitest.integration.config.ts`]);
const report = { status: 'PASS', baseCommit: base, sourceCommit: commit, sourceTree: tree, appTree,
  changedPathsFromBase: git(['diff', '--name-only', base, commit]).split(/\r?\n/).filter(Boolean), mirrors,
  pathSet, testSurfaceParity: { recorded: testSurfaceLines }, integrationConfigUnchanged,
  sourceDeliveryManifest: manifestAudit,
  protectedPaths: { acceptedInput: protectedInput.acceptedInputCommit, protectedPathCount: protectedHashes.length,
    allMatch: protectedHashes.every((x) => x.matchesAcceptedSha256 && x.matchesAcceptedGitBlob), hashes: protectedHashes },
  initialAuditDisposition: 'An earlier validator miscompared path-list files with different BOM/encoding and compared the current source manifest to a different archived PRE-G7-16 export. The failed output and correction rationale are preserved in sibling artifacts.' };
const expectedPathSet = pathSet.countLine.replace(/^\uFEFF/, '') === 'count=117' && pathSet.sortedPathSetSha256 === '41a41d3c89d684a322f5e81ae46ac472f06673f03e61f98d7f0ffa8e65a547e3' && pathSet.traversalPathListSha256 === 'd02064134564b5d071c611aa09d9457d87499b3ecaa41bbf3ecc5bfcc6975294';
const testsUnchanged = testSurfaceLines.includes('testDeclarationLinesMatch=true') && testSurfaceLines.includes('expectLinesMatch=true') && testSurfaceLines.includes('baselineExpectCount=30') && testSurfaceLines.includes('currentExpectCount=30');
report.status = mirrors.every((x) => x.normalizedBytesEqual && x.gitBlobsEqual) && pathSet.decodedTextEqual && expectedPathSet && testsUnchanged && manifestAudit.unchangedInGit && manifestAudit.worktreeGitBlob === manifestAudit.baseGitBlob && integrationConfigUnchanged && report.protectedPaths.allMatch ? 'PASS' : 'FAIL';
const out = JSON.stringify(report, null, 2) + '\n';
fs.writeFileSync('deliveries/G7/preparation/maker-evidence/pre-g7-17/attempt-10/source-parity-and-protected-audit-final.json', out);
console.log(JSON.stringify({status:report.status,sourceCommit:commit,sourceTree:tree,appTree,changedPaths:report.changedPathsFromBase,mirrorPairs:mirrors.map(x=>({source:x.source,sourceBytes:x.sourceBytes,mirrorBytes:x.mirrorBytes,normalizedBytesEqual:x.normalizedBytesEqual,gitBlobsEqual:x.gitBlobsEqual,gitBlob:x.sourceGitBlob})),pathSet,testSurfaceParity:testSurfaceLines,manifestAudit,protectedPathCount:protectedHashes.length,protectedAllMatch:report.protectedPaths.allMatch,integrationConfigUnchanged},null,2));
if(report.status!=='PASS')process.exit(2);
