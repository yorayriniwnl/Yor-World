import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const root = path.resolve(import.meta.dirname, '../../../../../');
const evidenceRoot = 'deliveries/G7/preparation/maker-evidence/pre-g7-32';
const inventoryPath = `${evidenceRoot}/evidence-inventory.json`;
const included = new Set([
  'yorayriniwnl.in/README.md',
  'yorayriniwnl.in/source-delivery-manifest.json'
]);

function walk(directory) {
  for (const entry of fs.readdirSync(path.join(root, directory), { withFileTypes: true })) {
    const relative = `${directory}/${entry.name}`;
    if (entry.isDirectory()) walk(relative);
    else if (relative !== inventoryPath) included.add(relative);
  }
}

walk(evidenceRoot);
const files = [...included].sort().map((relativePath) => {
  const absolutePath = path.join(root, relativePath);
  const bytes = fs.readFileSync(absolutePath);
  const git = spawnSync('git', ['rev-parse', `:${relativePath}`], { cwd: root, encoding: 'utf8' });
  if (git.status !== 0) throw new Error(`Missing staged Git blob for ${relativePath}: ${git.stderr}`);
  return {
    path: relativePath,
    byteLength: bytes.length,
    rawSha256: createHash('sha256').update(bytes).digest('hex'),
    gitBlobId: git.stdout.trim()
  };
});

const inventory = {
  packet: 'PRE-G7-32',
  validationSourceCommit: 'bd01478617b4166866f3f44196c56fc5add94acd',
  sourceAppTree: '3975e40c59a04b8696efa2ca3605eb37a0617165',
  inventoryExclusion: 'This inventory lists all other packet evidence files and both domain index files. It excludes only itself to avoid a self-referential hash.',
  totals: {
    artifactFiles: files.length,
    artifactBytes: files.reduce((sum, file) => sum + file.byteLength, 0)
  },
  files
};

fs.writeFileSync(path.join(root, inventoryPath), `${JSON.stringify(inventory, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ inventoryPath, ...inventory.totals }));
