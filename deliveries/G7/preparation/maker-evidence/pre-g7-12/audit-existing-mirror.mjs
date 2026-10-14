import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../../');
const manifest = JSON.parse(readFileSync(path.join(root, 'yorayriniwnl.in/source-delivery-manifest.json'), 'utf8'));
const hash = (p) => createHash('sha256').update(readFileSync(p).toString('utf8').replace(/\r\n/g, '\n')).digest('hex');
const filesUnder = (base, current = base) => readdirSync(current, { withFileTypes: true }).flatMap((entry) => entry.isDirectory()
  ? filesUnder(base, path.join(current, entry.name))
  : [path.relative(base, path.join(current, entry.name)).replaceAll('\\', '/')]).sort();

const failures = [];
const rows = [...manifest.mirror.sourceFiles, ...manifest.mirror.testFiles];
for (const row of rows) {
  const sourceHash = hash(path.join(root, row.sourcePath));
  const domainHash = hash(path.join(root, 'yorayriniwnl.in', row.domainPath));
  if (sourceHash !== row.sourceSha256 || domainHash !== row.domainSha256 || sourceHash !== domainHash) failures.push(row.domainPath);
}

const override = manifest.mirror.domainOverride;
const overrideHash = hash(path.join(root, 'yorayriniwnl.in', override.path));
if (overrideHash !== override.sha256) failures.push(override.path);

const expectedSource = manifest.mirror.sourceFiles.map((row) => row.sourcePath.slice('app/src/'.length))
  .concat([override.path.slice('src/'.length)]).sort();
const expectedDomain = manifest.mirror.sourceFiles.map((row) => row.domainPath.slice('src/'.length))
  .concat([override.path.slice('src/'.length)]).sort();
const actualSource = filesUnder(path.join(root, 'app/src'));
const actualDomain = filesUnder(path.join(root, 'yorayriniwnl.in/src'));
const actualSourceTests = filesUnder(path.join(root, 'app/tests'));
const actualDomainTests = filesUnder(path.join(root, 'yorayriniwnl.in/tests'));
const sourceMissing = expectedSource.filter((file) => !actualSource.includes(file));
const sourceUnlisted = actualSource.filter((file) => !expectedSource.includes(file));
const domainMissing = expectedDomain.filter((file) => !actualDomain.includes(file));
const domainUnlisted = actualDomain.filter((file) => !expectedDomain.includes(file));
const testMissing = actualSourceTests.filter((file) => !actualDomainTests.includes(file));
const testUnlisted = actualDomainTests.filter((file) => !actualSourceTests.includes(file));
const testHashMismatches = actualSourceTests.filter((file) => actualDomainTests.includes(file)
  && hash(path.join(root, 'app/tests', file)) !== hash(path.join(root, 'yorayriniwnl.in/tests', file)));

const gitBlobMismatches = [];
for (const row of rows) {
  const blobs = execFileSync('git', ['hash-object', '--', row.sourcePath, path.join('yorayriniwnl.in', row.domainPath)], { cwd: root, encoding: 'utf8' }).trim().split(/\r?\n/);
  if (blobs.length !== 2 || blobs[0] !== blobs[1]) gitBlobMismatches.push(row.domainPath);
}

if (sourceMissing.length || sourceUnlisted.length || domainMissing.length || domainUnlisted.length
  || testMissing.length || testUnlisted.length || testHashMismatches.length) failures.push('inventory-or-test-parity');
if (gitBlobMismatches.length) failures.push('git-blob-parity');

const result = {
  status: failures.length ? 'FAIL' : 'PASS',
  baseHead: '67026f26bb80d81de4edf632b3038b0239eea4de',
  appTree: '915c26f4b9a1fa075614ea64959750f9e486187c',
  manifestSourceFiles: manifest.mirror.sourceFiles.length,
  manifestChangedTestRows: manifest.mirror.testFiles.length,
  sourceInventory: { expectedIncludingIntentionalOverride: expectedSource.length, actual: actualSource.length, missing: sourceMissing, unlisted: sourceUnlisted },
  domainInventory: { expectedIncludingIntentionalOverride: expectedDomain.length, actual: actualDomain.length, missing: domainMissing, unlisted: domainUnlisted },
  testInventory: { canonical: actualSourceTests.length, delivery: actualDomainTests.length, missing: testMissing, unlisted: testUnlisted, contentMismatches: testHashMismatches },
  override: { path: override.path, canonicalUrl: override.canonicalUrl, sha256: overrideHash },
  exactGitBlobParity: gitBlobMismatches.length === 0,
  gitBlobMismatches,
  failures,
};
console.log(JSON.stringify(result, null, 2));
process.exit(failures.length ? 1 : 0);
