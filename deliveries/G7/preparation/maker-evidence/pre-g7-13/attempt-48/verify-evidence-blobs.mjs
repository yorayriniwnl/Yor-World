import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const evidenceRoot = 'deliveries/G7/preparation/maker-evidence/pre-g7-13/';
const inventoryPath = `${evidenceRoot}attempt-48/evidence-file-hashes.json`;
const attemptPath = /^deliveries\/G7\/preparation\/maker-evidence\/pre-g7-13\/attempt-(3[4-9]|4[0-8])\//;
const inventory = JSON.parse(readFileSync(inventoryPath, 'utf8'));
const listing = execFileSync('git', ['ls-files', '-s', '-z'], { encoding: 'buffer', maxBuffer: 128 * 1024 * 1024 });
const staged = new Map();

for (const record of listing.toString('utf8').split('\0')) {
  if (!record) continue;
  const tab = record.indexOf('\t');
  const metadata = record.slice(0, tab).split(' ');
  const path = record.slice(tab + 1);
  if (metadata[2] === '0') staged.set(path, metadata[1]);
}

const expectedPaths = new Set([...staged.keys()].filter(path => attemptPath.test(path) && path !== inventoryPath));
if (inventory.excluded?.length !== 1 || inventory.excluded[0] !== inventoryPath) throw new Error('Inventory exclusion does not match the expected self-exclusion');
if (inventory.entryCount !== inventory.entries.length || inventory.entries.length !== expectedPaths.size) {
  throw new Error(`Entry count mismatch: inventory=${inventory.entries.length}, staged evidence=${expectedPaths.size}`);
}

const requested = [];
for (const entry of inventory.entries) {
  if (!expectedPaths.delete(entry.path)) throw new Error(`Unexpected or duplicate inventory path: ${entry.path}`);
  if (staged.get(entry.path) !== entry.gitBlobOid) throw new Error(`Staged Git blob OID mismatch: ${entry.path}`);
  requested.push(entry);
}
if (expectedPaths.size) throw new Error(`Missing inventory paths: ${[...expectedPaths].join(', ')}`);

const batchInput = Buffer.from(requested.map(entry => `${entry.gitBlobOid}\n`).join(''), 'ascii');
const batchOutput = execFileSync('git', ['cat-file', '--batch'], { input: batchInput, encoding: 'buffer', maxBuffer: 1024 * 1024 * 1024 });
let offset = 0;
let totalBytes = 0;

for (const entry of requested) {
  const headerEnd = batchOutput.indexOf(0x0a, offset);
  if (headerEnd < 0) throw new Error(`Missing batch header for ${entry.path}`);
  const header = batchOutput.toString('ascii', offset, headerEnd).split(' ');
  if (header[0] !== entry.gitBlobOid || header[1] !== 'blob') throw new Error(`Unexpected Git blob response for ${entry.path}`);
  const size = Number(header[2]);
  const contentStart = headerEnd + 1;
  const contentEnd = contentStart + size;
  if (batchOutput[contentEnd] !== 0x0a) throw new Error(`Invalid batch framing for ${entry.path}`);
  const content = batchOutput.subarray(contentStart, contentEnd);
  if (size !== entry.sizeBytes) throw new Error(`Byte size mismatch for ${entry.path}`);
  if (createHash('sha256').update(content).digest('hex') !== entry.sha256) throw new Error(`SHA-256 mismatch for ${entry.path}`);
  totalBytes += size;
  offset = contentEnd + 1;
}

if (totalBytes !== inventory.totalBytes) throw new Error(`Total byte count mismatch: computed=${totalBytes}, inventory=${inventory.totalBytes}`);
process.stdout.write(`PASS: verified ${requested.length} evidence blobs (${totalBytes} bytes) against the staged Git index; inventory excludes itself.\n`);
