const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '../../..');
let validator;
try {
  validator = require('gltf-validator');
} catch (e) {
  validator = require('C:/Users/yoray/AppData/Local/Temp/yor-w2-r2-bd64528b2b4e4470ba732b54db7e00f7/node_modules/gltf-validator');
}

(async () => {
  const targets = [
    'deliveries/interaction-assets/runtime/interaction-assets.glb',
    'deliveries/interaction-assets/runtime/interaction-assets-mobile.glb'
  ];

  const results = [];
  let totalErrors = 0;
  let totalWarnings = 0;

  for (const targetFile of targets) {
    const fullPath = path.join(root, targetFile);
    const bytes = fs.readFileSync(fullPath);
    const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');

    console.log(`Validating ${targetFile} (${bytes.length} bytes, SHA-256: ${sha256})...`);
    const validation = await validator.validateBytes(new Uint8Array(bytes), {
      uri: targetFile,
      maxIssues: 1000
    });

    results.push({
      targetFile,
      byteLength: bytes.length,
      sha256,
      numErrors: validation.issues.numErrors,
      numWarnings: validation.issues.numWarnings,
      numInfos: validation.issues.numInfos,
      validation
    });

    totalErrors += validation.issues.numErrors;
    totalWarnings += validation.issues.numWarnings;
    console.log(`-> ${targetFile}: ${validation.issues.numErrors} errors, ${validation.issues.numWarnings} warnings`);
  }

  const output = {
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    validatorVersion: validator.version(),
    totalErrors,
    totalWarnings,
    results
  };

  const outPath = path.join(__dirname, 'export-validation.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2) + '\n');
  console.log(`Saved validation receipt to ${outPath}`);

  process.exitCode = totalErrors > 0 ? 1 : 0;
})().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
