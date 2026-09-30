// Parent audit: read exports; write fresh evidence here, never into maker roots.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../../..');
const dependencyRoot = fs.readFileSync(path.join(root, 'deliveries/W2/evidence/r2/dependency-temp-path.txt'), 'utf8').trim();
const validator = require(path.join(dependencyRoot, 'node_modules/gltf-validator'));
(async () => {
  const result = { timestamp: new Date().toISOString(), node: process.version,
    argv: process.argv, cwd: process.cwd(), dependencyRoot, validatorVersion: validator.version(), files: [] };
  for (const file of ['deliveries/W1/room-blockout.glb', 'deliveries/W2/avatar-proof.glb', 'deliveries/W2/fixture-proof.glb']) {
    const bytes = fs.readFileSync(path.join(root, file));
    const validation = await validator.validateBytes(new Uint8Array(bytes), {uri: file, maxIssues: 1000});
    result.files.push({path: file, sha256: crypto.createHash('sha256').update(bytes).digest('hex'), validation});
  }
  fs.writeFileSync(path.join(__dirname, 'export-validation.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result.files.map(f => ({path: f.path, errors: f.validation.issues.numErrors,
    warnings: f.validation.issues.numWarnings})), null, 2));
  process.exitCode = result.files.some(f => f.validation.issues.numErrors) ? 1 : 0;
})().catch(error => { console.error(error); process.exitCode = 1; });
