/**
 * glTF 2.0 Validation Tool for YOR WORLD FINISH-B1
 * Runs official Khronos glTF-Validator against all generated runtime .glb assets.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const DELIVERY_DIR = path.resolve(__dirname, '..');
const RUNTIME_DIR = path.join(DELIVERY_DIR, 'assets');
const EVIDENCE_DIR = path.join(DELIVERY_DIR, 'validator-logs');

let validator;
try {
  validator = require('gltf-validator');
} catch (e) {
  try {
    validator = require(path.resolve(DELIVERY_DIR, '../../app/node_modules/gltf-validator'));
  } catch (e2) {
    validator = require('gltf-validator');
  }
}

const targets = [
  'group-a-essential.glb',
  'group-b-props.glb',
  'on-demand-projects.glb',
  'production-room-full.glb',
  'mobile-room-lod.glb',
  'resident-production.glb',
  'fixture-production.glb'
];

async function runValidation() {
  console.log('='.repeat(80));
  console.log(`RUNNING KHRONOS glTF-VALIDATOR v${validator.version()}`);
  console.log('='.repeat(80));

  const results = [];
  let totalErrors = 0;
  let totalWarnings = 0;

  for (const filename of targets) {
    const fullPath = path.join(RUNTIME_DIR, filename);
    if (!fs.existsSync(fullPath)) {
      console.error(`ERROR: File not found: ${fullPath}`);
      continue;
    }

    const bytes = fs.readFileSync(fullPath);
    const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');

    console.log(`\nValidating ${filename} (${bytes.length.toLocaleString()} bytes, SHA-256: ${sha256})...`);
    const validation = await validator.validateBytes(new Uint8Array(bytes), {
      uri: filename,
      maxIssues: 1000
    });

    const numErrors = validation.issues.numErrors;
    const numWarnings = validation.issues.numWarnings;
    const numInfos = validation.issues.numInfos;

    console.log(`-> Result: ${numErrors} errors, ${numWarnings} warnings, ${numInfos} infos`);

    results.push({
      filename,
      byteLength: bytes.length,
      sha256,
      numErrors,
      numWarnings,
      numInfos,
      info: validation.info
    });

    totalErrors += numErrors;
    totalWarnings += numWarnings;
  }

  const report = {
    timestamp: new Date().toISOString(),
    validatorVersion: validator.version(),
    nodeVersion: process.version,
    totalErrors,
    totalWarnings,
    allPassed: totalErrors === 0 && totalWarnings === 0,
    results
  };

  const outPath = path.join(EVIDENCE_DIR, 'export-validation.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n');
  console.log(`\nSaved validation report: ${outPath}`);

  if (totalErrors > 0 || totalWarnings > 0) {
    console.error(`FAILED: ${totalErrors} errors, ${totalWarnings} warnings`);
    process.exit(1);
  } else {
    console.log('\nSUCCESS: ALL GLTF ASSETS PASSED WITH 0 ERRORS AND 0 WARNINGS!');
  }
}

runValidation().catch((err) => {
  console.error(err);
  process.exit(1);
});
