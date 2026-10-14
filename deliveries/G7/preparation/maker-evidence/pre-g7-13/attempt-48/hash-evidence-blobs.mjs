import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';

const evidenceRoot = 'deliveries/G7/preparation/maker-evidence/pre-g7-13/';
const inventoryPath = `${evidenceRoot}attempt-48/evidence-file-hashes.json`;
const listing = execFileSync('git', ['ls-files', '-s', '-z'], { encoding: 'buffer', maxBuffer: 128 * 1024 * 1024 });
const staged = [];

for (const record of listing.toString('utf8').split('\0')) {
  if (!record) continue;
  const tab = record.indexOf('\t');
  const metadata = record.slice(0, tab).split(' ');
  const path = record.slice(tab + 1);
  if (metadata[2] !== '0') continue;
  if (!path.startsWith(evidenceRoot)) continue;
  if (!/^deliveries\/G7\/preparation\/maker-evidence\/pre-g7-13\/attempt-(3[4-9]|4[0-8])\//.test(path)) continue;
  if (path === inventoryPath) continue;
  staged.push({ path, oid: metadata[1] });
}

const batchInput = Buffer.from(staged.map(({ oid }) => `${oid}\n`).join(''), 'ascii');
const batchOutput = execFileSync('git', ['cat-file', '--batch'], { input: batchInput, encoding: 'buffer', maxBuffer: 1024 * 1024 * 1024 });
const entries = [];
let offset = 0;

for (const item of staged) {
  const headerEnd = batchOutput.indexOf(0x0a, offset);
  if (headerEnd < 0) throw new Error(`Missing batch header for ${item.path}`);
  const header = batchOutput.toString('ascii', offset, headerEnd).split(' ');
  if (header[0] !== item.oid || header[1] !== 'blob') throw new Error(`Unexpected batch response for ${item.path}: ${header.join(' ')}`);
  const size = Number(header[2]);
  const contentStart = headerEnd + 1;
  const contentEnd = contentStart + size;
  if (batchOutput[contentEnd] !== 0x0a) throw new Error(`Invalid batch framing for ${item.path}`);
  const content = batchOutput.subarray(contentStart, contentEnd);
  entries.push({
    path: item.path,
    gitBlobOid: item.oid,
    sizeBytes: size,
    sha256: createHash('sha256').update(content).digest('hex'),
  });
  offset = contentEnd + 1;
}

const inventory = {
  generatedFrom: 'staged Git index blob bytes via git ls-files -s -z and git cat-file --batch',
  excluded: [inventoryPath],
  entryCount: entries.length,
  totalBytes: entries.reduce((sum, entry) => sum + entry.sizeBytes, 0),
  entries,
};
writeFileSync(inventoryPath, `${JSON.stringify(inventory, null, 2)}\n`);
process.stdout.write(`Wrote ${inventory.entryCount} staged-blob entries (${inventory.totalBytes} bytes) to ${inventoryPath}\n`);
