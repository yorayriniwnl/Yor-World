import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = path.resolve(OUT, '../..');
const require = createRequire(path.join(ROOT, 'app/package.json'));
const validator = require('gltf-validator');
const files = [];
for (const file of fs.readdirSync(path.join(OUT, 'assets')).filter(name => name.endsWith('.glb')).sort()) {
  const bytes = fs.readFileSync(path.join(OUT, 'assets', file));
  const report = await validator.validateBytes(new Uint8Array(bytes), {uri: file});
  files.push({
    file: `assets/${file}`,
    bytes: bytes.length,
    sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
    report,
  });
}
const result = {
  command: 'node deliveries/FINISH-B1-R4/scripts/validate-glb-r1.mjs',
  tool: 'gltf-validator',
  version: require('gltf-validator/package.json').version,
  files,
  errors: files.reduce((sum, row) => sum + row.report.issues.numErrors, 0),
  warnings: files.reduce((sum, row) => sum + row.report.issues.numWarnings, 0),
};
fs.writeFileSync(path.join(OUT, 'evidence/gltf-validation-r1.json'), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({files: files.length, errors: result.errors, warnings: result.warnings}));
process.exitCode = result.errors || result.warnings ? 1 : 0;
