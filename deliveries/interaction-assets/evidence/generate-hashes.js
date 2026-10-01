const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const baseDir = path.resolve(__dirname, '..');

function getFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    if (file === 'SHA256SUMS.txt' || file === 'manifest.json' || file.endsWith('.blend1')) continue;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(getFiles(fullPath));
    } else {
      results.push(fullPath);
    }
  }
  return results;
}

const files = getFiles(baseDir).sort();
const manifestEntries = [];
let sumsContent = '';

for (const file of files) {
  const relPath = path.relative(baseDir, file).replace(/\\/g, '/');
  const buffer = fs.readFileSync(file);
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');
  manifestEntries.push({
    path: relPath,
    bytes: buffer.length,
    sha256: hash
  });
  sumsContent += `${hash}  ${relPath}\n`;
}

fs.writeFileSync(path.join(baseDir, 'SHA256SUMS.txt'), sumsContent, 'utf8');

const manifest = {
  package: 'yor-world-interaction-assets',
  version: '1.0.0',
  timestamp: new Date().toISOString(),
  targetConsumer: 'C1',
  auditState: 'READY_FOR_GPT_2_AUDIT',
  filesCount: manifestEntries.length,
  files: manifestEntries
};

fs.writeFileSync(path.join(baseDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
console.log(`Generated SHA256SUMS.txt and manifest.json for ${manifestEntries.length} files.`);
