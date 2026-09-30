const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '../../../../..');
const dependencyRoot = fs.readFileSync(path.join(root, 'deliveries/W2/evidence/r2/dependency-temp-path.txt'), 'utf8').trim();
const validator = require(path.join(dependencyRoot, 'node_modules/gltf-validator'));

(async () => {
  const targetFile = 'deliveries/W1/revisions/W1-F1-r2/room-blockout.glb';
  const fullPath = path.join(root, targetFile);
  const bytes = fs.readFileSync(fullPath);
  const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');

  console.log(`Validating ${targetFile} (${bytes.length} bytes, SHA-256: ${sha256})...`);
  const validation = await validator.validateBytes(new Uint8Array(bytes), {
    uri: targetFile,
    maxIssues: 1000
  });

  const result = {
    timestamp: new Date().toISOString(),
    node: process.version,
    validatorVersion: validator.version(),
    targetFile,
    sha256,
    byteLength: bytes.length,
    validation
  };

  const outPath = path.join(__dirname, 'export-validation.json');
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n');
  console.log(`Validation finished: ${validation.issues.numErrors} errors, ${validation.issues.numWarnings} warnings.`);
  console.log(`Saved validation evidence to ${outPath}`);

  process.exitCode = validation.issues.numErrors > 0 ? 1 : 0;
})().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
