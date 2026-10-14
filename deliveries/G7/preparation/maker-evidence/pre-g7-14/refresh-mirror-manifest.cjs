const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const root = process.cwd();
const evidenceDir = 'deliveries/G7/preparation/maker-evidence/pre-g7-14';
const manifestPath = 'yorayriniwnl.in/source-delivery-manifest.json';
const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const sourceBaseCommit = 'a3459c158af880319269196f85c0c922ee86c5d6';
const acceptedAppTree = '23c7dac82746d7db84632e228efe3224736b9266';
const resultingAppTree = execFileSync('git', ['rev-parse', `${sourceCommit}:app`], { encoding: 'utf8' }).trim();
const parentCommit = '66132297bdcf3f699f07f3e5d5e299ebe558ac2f';
const sha = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const gitBlob = (spec) => execFileSync('git', ['show', spec]);
const normalize = (bytes) => Buffer.from(bytes.toString('utf8').replace(/\r\n/g, '\n'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const comparisons = [];
function updateEntry(entry) {
  const sourceBytes = gitBlob(`${sourceCommit}:${entry.sourcePath}`);
  const domainBytes = gitBlob(`${sourceCommit}:yorayriniwnl.in/${entry.domainPath}`);
  const sourceNormalized = normalize(sourceBytes);
  const domainNormalized = normalize(domainBytes);
  const rawBytesEqual = sourceBytes.equals(domainBytes);
  const normalizedContentEqual = sourceNormalized.equals(domainNormalized);
  Object.assign(entry, {
    sourceSha256: sha(sourceBytes),
    domainSha256: sha(domainBytes),
    rawBytesEqual,
    normalizedSha256: sha(sourceNormalized),
    normalizedContentEqual,
  });
  comparisons.push({ sourcePath: entry.sourcePath, domainPath: entry.domainPath, sourceSha256: entry.sourceSha256, domainSha256: entry.domainSha256, rawBytesEqual, normalizedContentEqual });
}
for (const entry of manifest.mirror.sourceFiles) updateEntry(entry);
const newTest = { sourcePath: 'app/tests/unit/entrance-coordinator.test.ts', domainPath: 'tests/unit/entrance-coordinator.test.ts' };
if (!manifest.mirror.testFiles.some((entry) => entry.sourcePath === newTest.sourcePath)) manifest.mirror.testFiles.push(newTest);
manifest.mirror.testFiles.sort((a, b) => a.sourcePath.localeCompare(b.sourcePath));
for (const entry of manifest.mirror.testFiles) updateEntry(entry);
const overridePath = manifest.mirror.domainOverride.path;
const overrideBytes = fs.readFileSync(path.join(root, 'yorayriniwnl.in', overridePath));
const overrideGitBytes = gitBlob(`${sourceCommit}:yorayriniwnl.in/${overridePath}`);
const overrideNormalizedBytes = normalize(overrideBytes);
const expectedOverrideSha = 'bcd4c0eb4681b707c2a6ead176ec38592693f4c8008390d25cddfe702140e530';
const appOverrideBytes = gitBlob(`${sourceCommit}:app/${overridePath}`);
Object.assign(manifest.mirror.domainOverride, {
  sha256: sha(overrideBytes),
  gitBlobSha256: sha(overrideGitBytes),
  normalizedSha256: sha(overrideNormalizedBytes),
  appDefaultSha256: sha(appOverrideBytes),
  preserved: sha(overrideBytes) === expectedOverrideSha && sha(overrideGitBytes) === sha(overrideNormalizedBytes) && overrideBytes.toString('utf8').includes(manifest.mirror.domainOverride.canonicalUrl),
});
Object.assign(manifest.sourceIdentity, {
  parentCommit,
  sourceCommit,
  acceptedInputCommit: sourceBaseCommit,
  acceptedInputAppTree: acceptedAppTree,
  resultingAppTree,
  sourceBaseCommit,
  sourceBaseAppTree: acceptedAppTree,
  governingPackets: [
    'docs/planning/reconciliation-packets/2026-10-14-pre-g7-13-anchor-articulation.md',
    'docs/planning/reconciliation-packets/2026-10-14-pre-g7-14-production-camera-endpoint.md',
  ],
});
const readmeBytes = gitBlob(`${sourceCommit}:yorayriniwnl.in/README.md`);
const failures = comparisons.filter((entry) => !entry.rawBytesEqual || !entry.normalizedContentEqual);
Object.assign(manifest.mirror.audit, {
  status: failures.length === 0 && manifest.mirror.domainOverride.preserved ? 'PASS' : 'FAIL',
  sourceFiles: manifest.mirror.sourceFiles.length,
  testFiles: manifest.mirror.testFiles.length,
  rawParityFailures: failures.length,
  baseCommit: sourceCommit,
  readmeSha256: sha(readmeBytes),
  evidence: `${evidenceDir}/final-mirror-audit.json`,
  comparisonBasis: `Git blob bytes at ${sourceCommit}`,
});
const audit = {
  status: manifest.mirror.audit.status,
  sourceCommit,
  resultingAppTree,
  acceptedInputCommit: sourceBaseCommit,
  acceptedInputAppTree: acceptedAppTree,
  sourceFiles: manifest.mirror.sourceFiles.length,
  testFiles: manifest.mirror.testFiles.length,
  rawParityFailures: failures.length,
  failures,
  domainOverride: manifest.mirror.domainOverride,
  comparisons,
};
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
fs.writeFileSync(path.join(evidenceDir, 'final-mirror-audit.json'), `${JSON.stringify(audit, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ status: audit.status, sourceCommit, resultingAppTree, sourceFiles: audit.sourceFiles, testFiles: audit.testFiles, rawParityFailures: audit.rawParityFailures, domainOverride: audit.domainOverride }, null, 2));
if (audit.status !== 'PASS') process.exitCode = 1;



\n