// Read-only independent validation; maker evidence is never overwritten.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../../..');
const dependencyRoot = fs.readFileSync(path.join(root, 'deliveries/W2/evidence/r2/dependency-temp-path.txt'), 'utf8').trim();
const validator = require(path.join(dependencyRoot, 'node_modules/gltf-validator'));
const target = 'deliveries/W1/revisions/W1-F1-r2/room-blockout.glb';
const bytes = fs.readFileSync(path.join(root, target));
(async () => {
  const validation = await validator.validateBytes(new Uint8Array(bytes), { uri: target, maxIssues: 1000 });
  const result = { executedAtUtc: new Date().toISOString(), evidenceClass: 'PARENT EXECUTED',
    argv: process.argv, node: process.version, validatorVersion: validator.version(), target,
    sha256: crypto.createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length, validation };
  fs.writeFileSync(path.join(__dirname, 'w1-export-validation.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ sha256: result.sha256, errors: validation.issues.numErrors, warnings: validation.issues.numWarnings }));
  process.exitCode = validation.issues.numErrors ? 1 : 0;
})().catch(error => { console.error(error); process.exitCode = 1; });
